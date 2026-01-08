/**
 * Tag Legacy Users Script
 * 
 * This script marks all existing users in Firebase as "Legacy" users.
 * Legacy users came from the Apple App Store before the community pivot.
 * 
 * To run this script:
 * 1. Make sure FIREBASE_SERVICE_ACCOUNT_JSON secret is set
 * 2. Run: node scripts/tagLegacyUsers.js
 * 
 * What it does:
 * - Fetches all users from the 'users' collection
 * - Adds { userType: 'legacy', legacyTaggedAt: timestamp } to each user
 * - Sets { tier: 'premium', subscriptionStatus: 'legacy_lifetime' } for lifetime access
 * - Does NOT overwrite existing data, only merges new fields
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountJson) {
    console.error('ERROR: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
    console.log('');
    console.log('To set it:');
    console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
    console.log('2. Click "Generate new private key"');
    console.log('3. Copy the JSON content and set it as FIREBASE_SERVICE_ACCOUNT_JSON in Replit Secrets');
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error.message);
    process.exit(1);
  }
}

async function tagLegacyUsers() {
  console.log('='.repeat(60));
  console.log('HUMI Legacy User Tagging Script');
  console.log('='.repeat(60));
  console.log('');

  initializeFirebase();
  const db = admin.firestore();

  try {
    console.log('Fetching all users from Firestore...');
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('No users found in the database.');
      return;
    }

    console.log(`Found ${usersSnapshot.size} users to tag as Legacy.`);
    console.log('');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    const batchSize = 500; // Firestore batch limit
    let currentBatch = db.batch(); // Create first batch
    let currentBatchCount = 0;
    let totalBatches = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Skip if already tagged as legacy
      if (userData.userType === 'legacy') {
        console.log(`  SKIP: ${userId} (already tagged as legacy)`);
        skipCount++;
        continue;
      }

      try {
        const userRef = db.collection('users').doc(userId);
        
        currentBatch.set(userRef, {
          userType: 'legacy',
          legacyTaggedAt: admin.firestore.FieldValue.serverTimestamp(),
          tier: 'premium',
          subscriptionStatus: 'legacy_lifetime',
          legacyWelcomeSeen: false // Track if they've seen the welcome modal
        }, { merge: true });

        currentBatchCount++;
        successCount++;
        console.log(`  TAG: ${userId} -> Legacy (lifetime premium)`);

        // Commit batch every 500 documents and create a new one
        if (currentBatchCount >= batchSize) {
          await currentBatch.commit();
          totalBatches++;
          console.log(`  Committed batch ${totalBatches} (${currentBatchCount} users)`);
          currentBatchCount = 0;
          currentBatch = db.batch(); // Create fresh batch after commit
        }
      } catch (error) {
        console.error(`  ERROR: ${userId} - ${error.message}`);
        errorCount++;
      }
    }

    // Commit remaining documents
    if (currentBatchCount > 0) {
      await currentBatch.commit();
      totalBatches++;
      console.log(`  Committed final batch (${currentBatchCount} users)`);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Total users found: ${usersSnapshot.size}`);
    console.log(`  Successfully tagged: ${successCount}`);
    console.log(`  Already tagged (skipped): ${skipCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log('');
    console.log('Legacy users will see the welcome modal on their next login.');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
tagLegacyUsers();
