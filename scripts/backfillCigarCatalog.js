/**
 * Cigar Catalog Backfill Script
 *
 * One-time script to populate `cigarCatalog` from all existing user logs.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_JSON='<json>' node scripts/backfillCigarCatalog.js
 *
 * Verification after running:
 *   - Check console output for "Aggregated N unique cigar catalog entries"
 *   - Inspect sample entries printed at the end (key, fullName, scanCount)
 *   - In Firestore console: cigarCatalog collection should have normalized-key docs
 *     with brand, line, fullName, strength, originCountry, scanCount, enrichedAt
 *   - Re-running is safe: existing docs are merged (not overwritten), scanCount accumulates
 */

const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const UNKNOWN_CIGAR_KEY = 'unknown-cigar';

function normalizeCatalogKey(brand, line) {
  const raw = [brand, line]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return raw || null;
}

function deriveLine(brand, line, fullName) {
  if (line) return line;
  if (!fullName || !brand) return '';
  if (fullName.toLowerCase().startsWith(brand.toLowerCase())) {
    return fullName.slice(brand.length).trim();
  }
  return '';
}

function mergeEntry(existing, incoming) {
  const merged = { ...existing };
  const fields = ['brand', 'line', 'fullName', 'strength', 'originCountry', 'wrapperType', 'commonNotes', 'recommendedPairings'];
  for (const field of fields) {
    if (!merged[field] && incoming[field]) {
      merged[field] = incoming[field];
    }
  }
  merged.scanCount = (merged.scanCount || 0) + 1;
  return merged;
}

async function backfillCigarCatalog() {
  try {
    console.log('Starting cigarCatalog backfill...\n');

    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users\n`);

    const catalogMap = new Map();
    let totalLogs = 0;
    let skipped = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      let logsSnapshot;
      try {
        logsSnapshot = await db.collection('users').doc(userId).collection('logs').get();
      } catch (err) {
        console.warn(`  Skipping user ${userId}: ${err.message}`);
        continue;
      }

      for (const logDoc of logsSnapshot.docs) {
        totalLogs++;
        const data = logDoc.data();

        const brand = (data.brand || '').trim();
        const rawLine = (data.line || '').trim();
        const fullName = (data.fullName || '').trim();

        if (!fullName && !brand) {
          skipped++;
          continue;
        }

        const line = deriveLine(brand, rawLine, fullName);
        // Prefer brand+line slug; fall back to fullName slug to avoid brand-only collisions
        const key = line
          ? normalizeCatalogKey(brand, line)
          : (normalizeCatalogKey('', fullName) || normalizeCatalogKey(brand, ''));
        if (!key || key === UNKNOWN_CIGAR_KEY) {
          skipped++;
          continue;
        }

        if (!brand && fullName.toLowerCase() === 'unknown cigar') {
          skipped++;
          continue;
        }

        const incoming = {
          brand,
          line,
          fullName,
          strength: data.strength || '',
          originCountry: data.originCountry || '',
          wrapperType: data.wrapperType || '',
          commonNotes: data.commonNotes || '',
          recommendedPairings: data.recommendedPairings || '',
        };

        if (catalogMap.has(key)) {
          catalogMap.set(key, mergeEntry(catalogMap.get(key), incoming));
        } else {
          catalogMap.set(key, { ...incoming, scanCount: 1 });
        }
      }
    }

    console.log(`Aggregated ${catalogMap.size} unique cigar catalog entries from ${totalLogs} logs (${skipped} skipped)\n`);
    console.log('Writing to cigarCatalog collection...');

    const now = admin.firestore.FieldValue.serverTimestamp();
    let written = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (const [key, entry] of catalogMap.entries()) {
      const docRef = db.collection('cigarCatalog').doc(key);
      const snap = await docRef.get();

      let finalEntry;
      if (snap.exists) {
        const existing = snap.data();
        finalEntry = mergeEntry(existing, entry);
        finalEntry.scanCount = (existing.scanCount || 0) + entry.scanCount;
        finalEntry.enrichedAt = now;
      } else {
        finalEntry = { ...entry, enrichedAt: now, createdAt: now };
      }

      batch.set(docRef, finalEntry, { merge: false });
      batchCount++;
      written++;

      if (batchCount >= 400) {
        await batch.commit();
        console.log(`  Committed batch — ${written} entries written so far...`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`\nBackfill complete!`);
    console.log(`  Total logs scanned: ${totalLogs}`);
    console.log(`  Unique catalog entries written: ${written}`);
    console.log(`  Skipped (no name/key): ${skipped}`);

    const sample = await db.collection('cigarCatalog').limit(5).get();
    console.log('\nSample catalog entries:');
    sample.forEach((d) => {
      const data = d.data();
      console.log(`  [${d.id}] ${data.fullName || data.brand} | scans: ${data.scanCount} | strength: ${data.strength || 'n/a'} | origin: ${data.originCountry || 'n/a'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Backfill error:', error);
    process.exit(1);
  }
}

backfillCigarCatalog();
