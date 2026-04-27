/**
 * Backfill Check-in Location Data
 *
 * One-time script to populate `latitude`, `longitude`, `city`, `state`, `country`
 * on all existing `lounge_checkins` documents that are missing these fields.
 * Also updates the corresponding `lounge_meta` document for each place.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_JSON='<json>' \
 *   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY='<key>' \
 *   node scripts/backfillCheckinLocations.js
 *
 * The script uses the Google Places Details API (legacy) to resolve placeId → coordinates
 * and address_components. It only calls the API once per unique placeId and caches results.
 *
 * Safe to re-run: documents that already have `latitude` are skipped.
 */

const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!MAPS_KEY) {
  console.error('ERROR: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is required');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Per-placeId cache so we only hit the API once per unique location
const placeCache = new Map();

async function fetchPlaceDetails(placeId) {
  if (placeCache.has(placeId)) return placeCache.get(placeId);

  const url = `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=geometry,address_components` +
    `&key=${MAPS_KEY}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status !== 'OK') {
      console.warn(`  Places API returned status ${data.status} for placeId ${placeId}`);
      placeCache.set(placeId, null);
      return null;
    }

    const result = data.result;
    const lat = result.geometry?.location?.lat ?? null;
    const lng = result.geometry?.location?.lng ?? null;
    let city = null, state = null, country = null;

    for (const comp of result.address_components || []) {
      const types = comp.types || [];
      if (types.includes('locality')) city = comp.long_name || null;
      else if (types.includes('administrative_area_level_1')) state = comp.short_name || null;
      else if (types.includes('country')) country = comp.short_name || null;
    }

    const details = { latitude: lat, longitude: lng, city, state, country };
    placeCache.set(placeId, details);
    return details;
  } catch (err) {
    console.warn(`  Places API fetch error for placeId ${placeId}:`, err.message);
    placeCache.set(placeId, null);
    return null;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function backfill() {
  console.log('Fetching all lounge_checkins documents...');
  const snapshot = await db.collection('lounge_checkins').get();
  const totalDocs = snapshot.size;
  console.log(`Total lounge_checkins documents: ${totalDocs}\n`);

  let skipped = 0;
  let attempted = 0;
  let backfilled = 0;
  let failed = 0;

  // Track which lounge_meta docs we've already updated this run
  const metaUpdated = new Set();

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    // Skip if already has location data
    if (data.latitude != null) {
      skipped++;
      continue;
    }

    const placeId = data.placeId;
    if (!placeId) {
      console.warn(`  [${docSnap.id}] No placeId — skipping`);
      skipped++;
      continue;
    }

    attempted++;

    // Throttle to avoid hitting API rate limits (50 QPS)
    if (attempted > 1) await sleep(25);

    const details = await fetchPlaceDetails(placeId);
    if (!details) {
      console.warn(`  [${docSnap.id}] Could not resolve placeId ${placeId} — skipping`);
      failed++;
      continue;
    }

    const { latitude, longitude, city, state, country } = details;

    try {
      await docSnap.ref.update({ latitude, longitude, city, state, country });
      backfilled++;

      // Update lounge_meta for this placeId (once per unique placeId per run)
      if (!metaUpdated.has(placeId)) {
        metaUpdated.add(placeId);
        const metaRef = db.collection('lounge_meta').doc(placeId);
        const metaSnap = await metaRef.get();
        const existingMeta = metaSnap.exists ? metaSnap.data() : {};
        const metaUpdate = {};
        if (latitude !== null && existingMeta.latitude == null) metaUpdate.latitude = latitude;
        if (longitude !== null && existingMeta.longitude == null) metaUpdate.longitude = longitude;
        if (city && !existingMeta.city) metaUpdate.city = city;
        if (state && !existingMeta.state) metaUpdate.state = state;
        if (country && !existingMeta.country) metaUpdate.country = country;
        if (Object.keys(metaUpdate).length > 0) {
          await metaRef.set(metaUpdate, { merge: true });
        }
      }

      if (backfilled % 50 === 0) {
        console.log(`  Progress: ${backfilled} backfilled so far...`);
      }
    } catch (err) {
      console.error(`  [${docSnap.id}] Write error:`, err.message);
      failed++;
    }
  }

  console.log('\n── Backfill Complete ────────────────────────────');
  console.log(`  Total lounge_checkins documents : ${totalDocs}`);
  console.log(`  Already had location data (skipped): ${skipped}`);
  console.log(`  Attempted to backfill        : ${attempted}`);
  console.log(`  Successfully backfilled      : ${backfilled}`);
  console.log(`  Failed (API or write error)  : ${failed}`);
  console.log(`  Unique lounge_meta docs updated: ${metaUpdated.size}`);
  console.log('─────────────────────────────────────────────────');

  process.exit(0);
}

backfill().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
