const admin = require('firebase-admin');

if (!admin.apps.length) {
  const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({ credential: admin.credential.cert(svc) });
}
const db = admin.firestore();

// Sorted longest-first so "La Flor Dominicana" beats "La Flor"
const KNOWN_MULTI_WORD_BRANDS = [
  // 4+ word brands
  'La Aroma de Cuba',
  'La Aroma De Cuba',
  'La Gloria Cubana',
  'La Perla Habana',
  'La Herencia Cubana',
  'La Bella Viktoria',
  'La Flor Dominicana',
  'Joya de Nicaragua',
  'Flor de las Antillas',
  'Flor de San Andres',
  // 3-word brands
  'Romeo y Julieta',
  'Romeo Y Julieta',
  'West Tampa Tobacco',
  'Victor Sinclair',
  'Latitude Zero',
  'Leaf By Oscar',
  'Leaf by Oscar',
  "Man O' War",
  'Man O War',
  'Crowned Heads',
  'Las Calaveras',
  'Las Cabrillas',
  'Red Meat Lovers',
  'Knuckle Sandwich',
  'Feral Flying Pig',
  'East India',
  'Factory Smokes',
  'Lampert Cigars',
  'Fuente Fuente',
  'The Tabernacle',
  'The Edge',
  'Nica Rustica',
  'Timeless Supreme',
  'Drew Estate',
  'AJ Fernandez',
  'A.J. Fernandez',
  'Mark Twain',
  'San Cristobal',
  'Don Pepin',
  'Don Carlos',
  'Ave Maria',
  'Gran Habano',
  'Black Works',
  'Aging Room',
  'Southern Draw',
  'Casa Torano',
  'Casa Magna',
  // 2-word brands
  'El Septimo',
  'Liga Privada',
  'Liga Pravada',
  'My Father',
  'Arturo Fuente',
  'H. Upmann',
  'E.P. Carrillo',
  'EP Carrillo',
  'Alec Bradley',
  'Rocky Patel',
  'Herrera Esteli',
  'Cavalier Genève',
  'Cavalier Geneve',
  'Zino Platinum',
  'Litto Gomez',
  'Leather Rose',
  'Room 101',
  'Oliva Serie',
  'La Galera',
  'La Faraona',
  'La Aurora',
  'La Palina',
  'La Ramona',
  'La Historia',
  'La Imperiosa',
  'La Instructora',
  'La Duena',
  'La Amistad',
  'Last Call',
  'Latitude Zero',
  'Leaf By',
  'Deadwood Tobacco',
];

const SKIP_VALUES = new Set([
  'n/a', 'na', 'unknown', 'none', '', 'tbd', 'test',
  'undefined', 'null', 'unknown cigar', 'no name',
]);

const ARTICLE_PREFIXES = new Set(['la', 'las', 'el', 'los', 'le', 'de', 'the', 'my', 'di']);

function cleanFullName(raw) {
  let s = (raw || '').trim();
  // Remove size annotations like (6.0" x 52)
  s = s.replace(/\s*\(\s*\d+[\d.]*\s*[""x].*?\)/gi, '').trim();
  // Remove trailing vitola labels after dash
  s = s.replace(/\s*-\s*(Toro|Robusto|Churchill|Gordo|Belicoso|Torpedo|Lonsdale|Corona|Lancero|Perfecto|Magnum|Presidente|Figurado)\s*$/i, '').trim();
  return s;
}

function extractBrand(fullName) {
  if (!fullName || !fullName.trim()) return null;

  const raw = fullName.trim();
  const rawLower = raw.toLowerCase();

  // Skip garbage values (check before cleaning)
  if (SKIP_VALUES.has(rawLower)) return null;
  if (rawLower.startsWith('n/a') || rawLower === 'unknown cigar') return null;

  // Check known brands against RAW string first (before stripping "by")
  // so "Leaf by Oscar" matches before the "by" is stripped
  for (const b of KNOWN_MULTI_WORD_BRANDS) {
    if (rawLower.startsWith(b.toLowerCase())) return b;
  }

  // Now clean: strip "by [Maker]" suffix (brand comes BEFORE "by")
  let cleaned = cleanFullName(raw);
  cleaned = cleaned.replace(/\s+by\s+.+$/i, '').trim();
  const cleanedLower = cleaned.toLowerCase();

  if (SKIP_VALUES.has(cleanedLower)) return null;

  // Re-check known brands against cleaned string
  for (const b of KNOWN_MULTI_WORD_BRANDS) {
    if (cleanedLower.startsWith(b.toLowerCase())) return b;
  }

  const words = cleaned.split(/\s+/);
  // Article/preposition prefix → take first 2 words
  if (words.length >= 2 && ARTICLE_PREFIXES.has(words[0].toLowerCase())) {
    return words[0] + ' ' + words[1];
  }

  const first = words[0] || null;
  // Skip single-word junk
  if (first && SKIP_VALUES.has(first.toLowerCase())) return null;

  return first;
}

// ── Test suite ────────────────────────────────────────────────────────────────
const tests = [
  ["The Edge Square",                         "The Edge"],
  ["Man O' War Ruination",                    "Man O' War"],
  ["N/A",                                     null],
  ["Unknown Cigar",                           null],
  ["La Flor Dominicana ORO",                  "La Flor Dominicana"],
  ["La Aroma de Cuba El Jefe",                "La Aroma de Cuba"],
  ["La Flor Dominicana (LFD) Double Ligero",  "La Flor Dominicana"],
  ["West Tampa Tobacco Co. White",            "West Tampa Tobacco"],
  ["Leaf by Oscar Sumatra",                   "Leaf by Oscar"],
  ["YAGUA by J.C. Newman Toro",               "YAGUA"],
  ["Leather Rose by Drew Estate",             "Leather Rose"],
  ["La Aurora 1903 Cameroon",                 "La Aurora"],
  ["Fuente Fuente Opus X",                    "Fuente Fuente"],
  ["Plasencia Alma Fuerte",                   "Plasencia"],
  ["Liga Privada H99",                        "Liga Privada"],
  ["Joya de Nicaragua Antano Gran Reserva",   "Joya de Nicaragua"],
  ["My Father The Judge",                     "My Father"],
  ["Padron 1964 Anniversary Series",          "Padron"],
  ["Alec Bradley Magic Toast",                "Alec Bradley"],
  ["Romeo Y Julieta Maduro Reserve",          "Romeo Y Julieta"],
  ["E.P. Carrillo Essence Honduras",          "E.P. Carrillo"],
  ["AJ Fernandez New World",                  "AJ Fernandez"],
  ["Mark Twain The Pen",                      "Mark Twain"],
];

console.log('=== TEST SUITE ===');
let passed = 0;
tests.forEach(([input, expected]) => {
  const got = extractBrand(input);
  const ok = got === expected;
  if (ok) passed++;
  console.log(ok ? '✓' : '✗', JSON.stringify(input), '->', got, ok ? '' : '(expected: ' + JSON.stringify(expected) + ')');
});
console.log(passed + '/' + tests.length + ' tests passed\n');

// ── Dry run or live run ───────────────────────────────────────────────────────
const DRY_RUN = process.argv[2] !== '--write';

async function run() {
  console.log(DRY_RUN ? '=== DRY RUN (pass --write to commit) ===' : '=== LIVE WRITE ===');

  const usersSnap = await db.collection('users').get();
  console.log('Users:', usersSnap.size);

  let totalLogs = 0;
  let skipped = 0;
  let alreadySet = 0;
  let wouldWrite = 0;
  let noFullName = 0;
  const sampleWrites = [];
  const firstWordFallbacks = {};

  const batches = [];
  let currentBatch = db.batch();
  let batchCount = 0;

  for (const userDoc of usersSnap.docs) {
    const logsSnap = await userDoc.ref.collection('logs').get();
    totalLogs += logsSnap.size;

    for (const logDoc of logsSnap.docs) {
      const data = logDoc.data();

      if (data.brand && data.brand.trim()) {
        alreadySet++;
        continue;
      }

      if (!data.fullName || !data.fullName.trim()) {
        noFullName++;
        continue;
      }

      const brand = extractBrand(data.fullName);

      if (!brand) {
        skipped++;
        continue;
      }

      wouldWrite++;
      if (sampleWrites.length < 15) {
        sampleWrites.push({ fullName: data.fullName, brand });
      }

      // Track first-word fallbacks for review
      const usedKnown = KNOWN_MULTI_WORD_BRANDS.some(b =>
        data.fullName.toLowerCase().startsWith(b.toLowerCase())
      );
      if (!usedKnown && brand.indexOf(' ') === -1) {
        firstWordFallbacks[brand] = (firstWordFallbacks[brand] || 0) + 1;
      }

      if (!DRY_RUN) {
        currentBatch.update(logDoc.ref, { brand });
        batchCount++;
        if (batchCount === 499) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          batchCount = 0;
        }
      }
    }
  }

  if (!DRY_RUN && batchCount > 0) batches.push(currentBatch);

  console.log('\nResults:');
  console.log('  Total logs scanned:', totalLogs);
  console.log('  Already had brand:', alreadySet);
  console.log('  No fullName to parse:', noFullName);
  console.log('  Skipped (N/A / junk):', skipped);
  console.log('  Would write / wrote:', wouldWrite);

  console.log('\nSample writes:');
  sampleWrites.forEach(s => console.log('  ', JSON.stringify(s.fullName), '->', s.brand));

  console.log('\nTop first-word fallbacks (single-word brands, for review):');
  Object.entries(firstWordFallbacks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .forEach(([b, c]) => console.log('  ', b, 'x', c));

  if (!DRY_RUN) {
    console.log('\nCommitting', batches.length, 'batches...');
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      process.stdout.write('.');
    }
    console.log('\nDone! ' + wouldWrite + ' logs updated.');
  }
}

run().catch(console.error);
