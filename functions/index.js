/**
 * HUMI Cloud Functions
 *
 * Deploy:
 *   firebase deploy --only functions
 *
 * Required permissions (Firebase service account):
 *   - Firestore read/write on the `users` collection
 *
 * The `expireStaleTrials` function runs daily at midnight UTC and downgrades
 * any user whose trialEndDate has passed but whose subscriptionStatus is still
 * "trial". It writes the same fields as scripts/expireStaleTrials.js:
 *   subscriptionStatus: "expired"
 *   tier: "free"
 *   trialExpiredAt: <ISO timestamp>
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
