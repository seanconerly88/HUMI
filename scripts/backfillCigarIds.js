const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const generateCigarId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `HUMI-${result}`;
};

const normalizeName = (name) => {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

async function backfillCigarIds() {
  try {
    console.log('Starting cigar ID backfill...\n');

    const cigarMap = {};
    let totalLogs = 0;
    let logsUpdated = 0;

    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users\n`);

    for (const userDoc of usersSnapshot.docs) {
      const logsSnapshot = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('logs')
        .get();

      for (const logDoc of logsSnapshot.docs) {
        totalLogs++;
        const data = logDoc.data();
        const fullName = data.fullName || '';
        const brand = data.brand || '';

        if (!fullName) continue;

        const key = `${normalizeName(fullName)}|||${normalizeName(brand)}`;

        if (!cigarMap[key]) {
          cigarMap[key] = {
            cigarId: generateCigarId(),
            name: fullName.trim(),
            brand: brand.trim(),
            normalizedName: normalizeName(fullName),
            normalizedBrand: normalizeName(brand),
            logCount: 0,
            logs: [],
          };
        }

        cigarMap[key].logCount++;
        cigarMap[key].logs.push({
          userId: userDoc.id,
          logId: logDoc.id,
        });
      }
    }

    const uniqueCigars = Object.keys(cigarMap).length;
    console.log(`Found ${totalLogs} total logs across all users`);
    console.log(`Identified ${uniqueCigars} unique cigars\n`);

    const skipCigarsCreation = process.argv.includes('--logs-only');

    if (!skipCigarsCreation) {
      console.log('Clearing any existing cigars collection...');
      const existingCigars = await db.collection('cigars').get();
      if (!existingCigars.empty) {
        let delBatch = db.batch();
        let delCount = 0;
        for (const d of existingCigars.docs) {
          delBatch.delete(d.ref);
          delCount++;
          if (delCount >= 400) {
            await delBatch.commit();
            delBatch = db.batch();
            delCount = 0;
          }
        }
        if (delCount > 0) await delBatch.commit();
        console.log(`  Cleared ${existingCigars.size} existing entries`);
      }

      console.log('Creating cigars collection entries...');
      let cigarBatch = db.batch();
      let batchCount = 0;

      for (const key of Object.keys(cigarMap)) {
        const cigar = cigarMap[key];
        const docRef = db.collection('cigars').doc();
        cigarBatch.set(docRef, {
          cigarId: cigar.cigarId,
          name: cigar.name,
          brand: cigar.brand,
          normalizedName: cigar.normalizedName,
          normalizedBrand: cigar.normalizedBrand,
          logCount: cigar.logCount,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoggedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchCount++;

        if (batchCount >= 400) {
          await cigarBatch.commit();
          console.log(`  Committed batch of ${batchCount} cigars`);
          cigarBatch = db.batch();
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await cigarBatch.commit();
        console.log(`  Committed final batch of ${batchCount} cigars`);
      }
    } else {
      console.log('Skipping cigars collection creation (--logs-only mode)');
      console.log('Looking up existing cigarIds from cigars collection...');
      const existingCigars = await db.collection('cigars').get();
      const existingMap = {};
      existingCigars.forEach((d) => {
        const data = d.data();
        const k = `${data.normalizedName}|||${data.normalizedBrand}`;
        existingMap[k] = data.cigarId;
      });
      for (const key of Object.keys(cigarMap)) {
        if (existingMap[key]) {
          cigarMap[key].cigarId = existingMap[key];
        }
      }
      console.log(`  Matched ${Object.keys(existingMap).length} existing cigars`);
    }

    console.log(`\nUpdating user logs with cigarId...`);

    let logBatch = db.batch();
    let logBatchCount = 0;

    for (const key of Object.keys(cigarMap)) {
      const cigar = cigarMap[key];

      for (const logRef of cigar.logs) {
        const ref = db
          .collection('users')
          .doc(logRef.userId)
          .collection('logs')
          .doc(logRef.logId);
        logBatch.update(ref, { cigarId: cigar.cigarId });
        logBatchCount++;
        logsUpdated++;

        if (logBatchCount >= 400) {
          await logBatch.commit();
          console.log(`  Updated ${logsUpdated}/${totalLogs} logs...`);
          logBatch = db.batch();
          logBatchCount = 0;
        }
      }
    }

    if (logBatchCount > 0) {
      await logBatch.commit();
    }

    console.log(`\nBackfill complete!`);
    console.log(`  Unique cigars created: ${uniqueCigars}`);
    console.log(`  User logs updated: ${logsUpdated}/${totalLogs}`);

    console.log('\nTop 10 most logged cigars:');
    const sorted = Object.values(cigarMap).sort((a, b) => b.logCount - a.logCount);
    sorted.slice(0, 10).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} (${c.brand || 'Unknown brand'}) - ${c.logCount} logs - ${c.cigarId}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Backfill error:', error);
    process.exit(1);
  }
}

backfillCigarIds();
