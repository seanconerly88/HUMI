/**
 * HUMI Cloud Functions
 *
 * Deploy:
 *   firebase deploy --only functions --project humi-75da3
 *   (or just: firebase deploy --only functions if .firebaserc is present)
 *
 * Required permissions (Firebase service account):
 *   - Firestore read/write on the `users` collection
 *   - Firebase Auth read (listUsers, getUser)
 *
 * The `expireStaleTrials` function runs daily at midnight UTC and downgrades
 * any user whose trialEndDate has passed but whose subscriptionStatus is still
 * "trial". It writes the same fields as scripts/expireStaleTrials.js:
 *   subscriptionStatus: "expired"
 *   tier: "free"
 *   trialExpiredAt: <ISO timestamp>
 *
 * The `sendReEngagementWebhooks` function runs every 6 hours and fires a
 * webhook to GoHighLevel for users who:
 *   - Have been inactive for more than 72 hours
 *   - Have at least one cigar in their humidor (users/{userId}/logs)
 *   - Have NOT received a re-engagement webhook in the last 7 days
 *
 * Webhook URL is stored in Firestore at: config/reEngagement → webhookUrl
 * To update the URL, edit that document in the Firebase console — no redeploy needed.
 */

'use strict';

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * Runs daily at midnight UTC.
 * Finds all users where subscriptionStatus == "trial" and trialEndDate < now,
 * then batch-updates them to expired/free.
 */
exports.expireStaleTrials = onSchedule('0 0 * * *', async () => {
  const now = new Date();
  const nowIso = now.toISOString();

  console.log(`[expireStaleTrials] Starting run at ${nowIso}`);

  const snapshot = await db.collection('users')
    .where('subscriptionStatus', '==', 'trial')
    .get();

  if (snapshot.empty) {
    console.log('[expireStaleTrials] No trial users found. Exiting.');
    return;
  }

  console.log(`[expireStaleTrials] ${snapshot.size} user(s) with subscriptionStatus="trial". Checking trialEndDate...`);

  const stale = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.trialEndDate) return;

    let trialEnd;
    if (data.trialEndDate.toDate) {
      trialEnd = data.trialEndDate.toDate();
    } else {
      trialEnd = new Date(data.trialEndDate);
    }

    if (!isNaN(trialEnd.getTime()) && trialEnd < now) {
      stale.push({ ref: doc.ref, email: data.email || doc.id });
    }
  });

  if (stale.length === 0) {
    console.log('[expireStaleTrials] No stale trials found — all active trials are still within their window.');
    return;
  }

  console.log(`[expireStaleTrials] ${stale.length} stale trial(s) to expire. Writing batches...`);

  const BATCH_SIZE = 500;
  let totalUpdated = 0;

  for (let i = 0; i < stale.length; i += BATCH_SIZE) {
    const chunk = stale.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(({ ref }) => {
      batch.update(ref, {
        subscriptionStatus: 'expired',
        tier: 'free',
        trialExpiredAt: nowIso,
      });
    });
    await batch.commit();
    totalUpdated += chunk.length;
    console.log(`[expireStaleTrials] Committed batch of ${chunk.length} (total so far: ${totalUpdated})`);
  }

  console.log(`[expireStaleTrials] Done. ${totalUpdated} user(s) expired.`);
});

/**
 * Runs every 6 hours.
 *
 * For each user who:
 *   1. Has been inactive for more than 72 hours (checks Firebase Auth
 *      metadata.lastSignInTime, falls back to lastActiveAt on the user doc)
 *   2. Has at least one cigar log in users/{userId}/logs
 *   3. Has NOT had a re-engagement webhook sent in the last 7 days
 *      (checked via lastReEngagementSentAt on the user doc)
 *
 * ...it POSTs a webhook to GoHighLevel with the most recently added cigar's
 * brand, name, and image URL, then stamps lastReEngagementSentAt on the user doc.
 *
 * Errors for individual users are logged but do not abort the batch.
 *
 * Webhook URL is read from Firestore at config/reEngagement → webhookUrl
 */
exports.sendReEngagementWebhooks = onSchedule('0 */6 * * *', async () => {
    const now = new Date();
    const nowIso = now.toISOString();

    const configDoc = await db.collection('config').doc('reEngagement').get();
    const webhookUrl = configDoc.exists ? configDoc.data().webhookUrl : null;
    if (!webhookUrl) {
      console.error('[sendReEngagementWebhooks] webhookUrl not found in config/reEngagement. Aborting.');
      return;
    }

    console.log(`[sendReEngagementWebhooks] Starting run at ${nowIso}`);

    const INACTIVE_THRESHOLD_MS = 72 * 60 * 60 * 1000;
    const RESEND_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      console.log('[sendReEngagementWebhooks] No users found. Exiting.');
      return;
    }

    console.log(`[sendReEngagementWebhooks] Checking ${usersSnapshot.size} user(s)...`);

    let sent = 0;
    let skipped = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      try {
        // ── 1. Fetch Firebase Auth record (authoritative source for email and
        //       last sign-in time). A single getUser call is reused for both.
        let authUser = null;
        try {
          authUser = await admin.auth().getUser(userId);
        } catch (authErr) {
          console.warn(`[sendReEngagementWebhooks] Could not fetch Auth record for ${userId}:`, authErr.message);
        }

        // Email must come from Firebase Auth — skip if unavailable.
        const email = authUser && authUser.email ? authUser.email : null;
        if (!email) {
          console.warn(`[sendReEngagementWebhooks] No Auth email for user ${userId} — skipping.`);
          skipped++;
          continue;
        }

        // ── 2. Determine last active time ─────────────────────────────────────
        let lastActive = null;

        // Primary: Firebase Auth metadata.lastSignInTime
        if (authUser && authUser.metadata && authUser.metadata.lastSignInTime) {
          const parsed = new Date(authUser.metadata.lastSignInTime);
          if (!isNaN(parsed.getTime())) {
            lastActive = parsed;
          }
        }

        // Fallback: lastActiveAt field on the user doc (also used when
        // lastSignInTime is absent or parses to an invalid date)
        if (!lastActive && userData.lastActiveAt) {
          lastActive = userData.lastActiveAt.toDate
            ? userData.lastActiveAt.toDate()
            : new Date(userData.lastActiveAt);
        }

        // If we still have no last-active time, skip conservatively
        if (!lastActive || isNaN(lastActive.getTime())) {
          skipped++;
          continue;
        }

        // ── 3. Check inactivity threshold (72 hours) ──────────────────────────
        const inactiveMs = now - lastActive;
        if (inactiveMs < INACTIVE_THRESHOLD_MS) {
          skipped++;
          continue;
        }

        // ── 4. Check re-engagement cooldown (7 days) ──────────────────────────
        if (userData.lastReEngagementSentAt) {
          const lastSent = userData.lastReEngagementSentAt.toDate
            ? userData.lastReEngagementSentAt.toDate()
            : new Date(userData.lastReEngagementSentAt);

          if (!isNaN(lastSent.getTime()) && (now - lastSent) < RESEND_COOLDOWN_MS) {
            skipped++;
            continue;
          }
        }

        // ── 5. Fetch most recently added cigar log ────────────────────────────
        const logsRef = db.collection('users').doc(userId).collection('logs');
        const logsSnapshot = await logsRef
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();

        if (logsSnapshot.empty) {
          // No cigars in humidor — skip
          skipped++;
          continue;
        }

        const logData = logsSnapshot.docs[0].data();
        const brand = logData.brand || logData.cigarBrand || '';
        const cigarName = logData.fullName || logData.cigarName || '';
        const imageUrl = logData.imageUrl || null;

        // ── 6. Build and fire the GoHighLevel webhook payload ─────────────────
        const payload = {
          email,
          userId,
          brand,
          cigarName,
        };
        if (imageUrl) {
          payload.imageUrl = imageUrl;
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`GHL webhook returned ${response.status}: ${body}`);
        }

        // ── 7. Stamp lastReEngagementSentAt on success ────────────────────────
        await userDoc.ref.update({
          lastReEngagementSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        sent++;
        console.log(`[sendReEngagementWebhooks] Sent webhook for ${userId} (${email}) — cigar: "${cigarName}" by "${brand}"`);

      } catch (err) {
        console.error(`[sendReEngagementWebhooks] Error processing user ${userId}:`, err.message || err);
      }
    }

    console.log(`[sendReEngagementWebhooks] Done. Sent: ${sent}, Skipped: ${skipped}.`);
  }
);
