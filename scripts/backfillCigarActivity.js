const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function backfillCigarActivity() {
  try {
    console.log('Starting cigar_activity backfill...\n');

    const existingActivity = await db.collection('cigar_activity').get();
    if (!existingActivity.empty) {
      console.log(`Found ${existingActivity.size} existing activity records.`);
      const clearFlag = process.argv.includes('--clear');
      if (clearFlag) {
        console.log('Clearing existing cigar_activity collection...');
        let delBatch = db.batch();
        let delCount = 0;
        for (const d of existingActivity.docs) {
          delBatch.delete(d.ref);
          delCount++;
          if (delCount >= 400) {
            await delBatch.commit();
            delBatch = db.batch();
            delCount = 0;
          }
        }
        if (delCount > 0) await delBatch.commit();
        console.log(`  Cleared ${existingActivity.size} records.\n`);
      } else {
        console.log('Use --clear flag to wipe and rebuild. Exiting.\n');
        process.exit(0);
      }
    }

    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users\n`);

    let totalLogs = 0;
    let activityCreated = 0;
    let skipped = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const logsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('logs')
        .get();

      for (const logDoc of logsSnapshot.docs) {
        totalLogs++;
        const data = logDoc.data();
        const cigarName = (data.fullName || '').trim();

        if (!cigarName) {
          skipped++;
          continue;
        }

        let submittedDate;
        if (data.submittedDate && data.submittedDate.toDate) {
          submittedDate = data.submittedDate.toDate();
        } else if (typeof data.submittedDate === 'string') {
          submittedDate = new Date(data.submittedDate);
        } else if (data.date && data.date.toDate) {
          submittedDate = data.date.toDate();
        } else if (typeof data.date === 'string') {
          submittedDate = new Date(data.date);
        } else {
          submittedDate = new Date();
        }

        const activityData = {
          userId,
          logId: logDoc.id,
          cigarId: data.cigarId || null,
          cigarName,
          brand: (data.brand || '').trim(),
          overall: data.overall ?? null,
          notes: (data.notes || '').trim(),
          submittedDate: admin.firestore.Timestamp.fromDate(submittedDate),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = db.collection('cigar_activity').doc();
        batch.set(docRef, activityData);
        batchCount++;
        activityCreated++;

        if (batchCount >= 400) {
          await batch.commit();
          console.log(`  Committed batch — ${activityCreated} records created so far...`);
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`\nBackfill complete!`);
    console.log(`  Total logs scanned: ${totalLogs}`);
    console.log(`  Activity records created: ${activityCreated}`);
    console.log(`  Skipped (no name): ${skipped}`);

    const verifySnapshot = await db.collection('cigar_activity').limit(5).get();
    console.log(`\nSample records:`);
    verifySnapshot.forEach((d) => {
      const data = d.data();
      console.log(`  ${data.cigarName} | Rating: ${data.overall || 'none'} | Notes: ${(data.notes || 'none').substring(0, 50)} | Date: ${data.submittedDate?.toDate?.().toISOString().split('T')[0] || 'unknown'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Backfill error:', error);
    process.exit(1);
  }
}

backfillCigarActivity();
