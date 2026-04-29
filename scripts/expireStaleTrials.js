/**
 * Expire Stale Trials — One-Time Cleanup Script
 *
 * Finds all users where subscriptionStatus == "trial" and trialEndDate is in
 * the past, then downgrades them to subscriptionStatus: "expired", tier: "free".
 *
 * Usage:
 *   node scripts/expireStaleTrials.js            # live run (writes to Firestore)
 *   node scripts/expireStaleTrials.js --dry-run  # preview only, no writes
 *
 * Requirements:
 *   FIREBASE_SERVICE_ACCOUNT_JSON must be set in the environment.
 *
 * Expected output (dry-run):
 *   [DRY RUN] Would expire: user@example.com  trialEndDate=2026-02-01
 *   ...
 *   Summary: 65 stale trials found, 0 updated (dry run).
 *
 * Expected output (live):
 *   Expired: user@example.com  trialEndDate=2026-02-01
 *   ...
 *   Summary: 65 stale trials found, 65 updated.
 */

'use strict';

const admin = require('firebase-admin');

const isDryRun = process.argv.includes('--dry-run');

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceAccountJson) {
  console.error('Error: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch (e) {
  console.error('Error: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function expireStaleTrials() {
  console.log('='.repeat(60));
  console.log('HUMI — Expire Stale Trials' + (isDryRun ? ' [DRY RUN]' : ''));
  console.log('='.repeat(60));

  const now = new Date();

  const snapshot = await db.collection('users')
    .where('subscriptionStatus', '==', 'trial')
    .get();

  if (snapshot.empty) {
    console.log('No users with subscriptionStatus="trial" found.');
    console.log('Summary: 0 stale trials found, 0 updated.');
    return;
  }

  console.log(`Found ${snapshot.size} user(s) with subscriptionStatus="trial". Checking trialEndDate...\n`);

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

    if (isNaN(trialEnd.getTime())) return;
    if (trialEnd < now) {
      stale.push({ ref: doc.ref, email: data.email || doc.id, trialEndDate: trialEnd.toISOString() });
    }
  });

  if (stale.length === 0) {
    console.log('No stale trials found — all active trials are still within their window.');
    console.log('Summary: 0 stale trials found, 0 updated.');
    return;
  }

  const nowIso = now.toISOString();
  let updatedCount = 0;

  const BATCH_SIZE = 500;
  for (let i = 0; i < stale.length; i += BATCH_SIZE) {
    const chunk = stale.slice(i, i + BATCH_SIZE);
    if (!isDryRun) {
      const batch = db.batch();
      chunk.forEach(({ ref }) => {
        batch.update(ref, {
          subscriptionStatus: 'expired',
          tier: 'free',
          trialExpiredAt: nowIso,
        });
      });
      await batch.commit();
    }
    chunk.forEach(({ email, trialEndDate }) => {
      const prefix = isDryRun ? '[DRY RUN] Would expire:' : 'Expired:';
      console.log(`  ${prefix} ${email}  trialEndDate=${trialEndDate}`);
    });
    updatedCount += chunk.length;
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Stale trials found:  ${stale.length}`);
  console.log(`  Updated:             ${isDryRun ? 0 : updatedCount} (${isDryRun ? 'dry run' : 'live'})`);
  console.log('='.repeat(60));
}

expireStaleTrials()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
