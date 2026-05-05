export const STRENGTH_SCORES: Record<string, number> = {
  'Mild': 1,
  'Mild to Medium': 2,
  'Medium': 3,
  'Medium to Full': 4,
  'Full': 5,
};

export const STRENGTH_LABELS = ['Mild', 'Mild-Med', 'Medium', 'Med-Full', 'Full'];

export type ProfileTier = 'Gentleman' | 'Traditionalist' | 'Craftsman';

export const TIER_CONFIG: Record<ProfileTier, { color: string; accent: string; blurb: string }> = {
  Gentleman: {
    color: '#4A7C6F',
    accent: '#6BAE9E',
    blurb: 'Ease over edge. Lighter smokes chosen with intention — every cigar deliberate, never just a reach.',
  },
  Traditionalist: {
    color: '#8B4513',
    accent: '#C4894F',
    blurb: "The benchmark. Medium strength isn't the safe choice — it's the standard.",
  },
  Craftsman: {
    color: '#5c2d0e',
    accent: '#8B4513',
    blurb: 'Bold and deliberate. Every smoke is a conviction, not a habit.',
  },
};

export function getTier(avg: number): ProfileTier {
  if (avg <= 2.4) return 'Gentleman';
  if (avg <= 3.5) return 'Traditionalist';
  return 'Craftsman';
}

export function getNextMilestone(logCount: number): number {
  if (logCount < 5) return 5;
  if (logCount < 10) return 10;
  return (Math.floor(logCount / 10) + 1) * 10;
}

export function getCurrentMilestoneReached(logCount: number): number {
  if (logCount < 5) return 0;
  if (logCount < 10) return 5;
  return Math.floor(logCount / 10) * 10;
}

const PLATFORM_AVG_RATING = 3.8;

export function getGraderInfo(userAvg: number): { line: string } {
  const diff = PLATFORM_AVG_RATING - userAvg;
  const pct = Math.round(Math.min(Math.max(50 + diff * 28, 5), 95));

  if (pct >= 55) {
    return { line: `tougher than ${pct}% of HUMI users` };
  } else if (pct >= 42) {
    return { line: `in line with most HUMI users` };
  } else {
    return { line: `more generous than ${100 - pct}% of HUMI users` };
  }
}

export interface FlavorEntry {
  name: string;
  count: number;
}

export interface BrandEntry {
  name: string;
  count: number;
}

export interface SmokingProfileData {
  logCount: number;
  smokedCount: number;
  avgRating: number;
  strengthAvg: number;
  tier: ProfileTier | null;
  topFlavors: FlavorEntry[];
  topBrands: BrandEntry[];
  nextMilestone: number;
  currentMilestone: number;
  rawNotes: string[];
  commonFlavors: string;
}

// ── Strength normalizer ────────────────────────────────────────────────────────
// The AI returns inconsistent casing/phrasing. Map everything to canonical keys.
function normalizeStrength(raw: string): string {
  const s = (raw || '').trim().toLowerCase().replace(/-/g, ' ');
  if (s === 'mild') return 'Mild';
  if (s === 'mild to medium' || s === 'mild medium' || s === 'mild med') return 'Mild to Medium';
  if (s === 'medium') return 'Medium';
  if (s === 'medium to full' || s === 'medium full' || s === 'med full') return 'Medium to Full';
  if (s === 'full' || s === 'full bodied' || s === 'full body') return 'Full';
  return '';
}

// ── Brand extractor ────────────────────────────────────────────────────────────
// Most logs have brand: "" — the only name data is fullName (e.g. "Liga Privada No. 9").
// Check known multi-word brand prefixes first, then fall back to first word.
const KNOWN_MULTI_WORD_BRANDS = [
  'La Aroma de Cuba',
  'La Aroma De Cuba',
  'Joya de Nicaragua',
  'Flor de las Antillas',
  'Flor de San Andres',
  'El Septimo',
  'Liga Privada',
  'My Father',
  'Arturo Fuente',
  'H. Upmann',
  'Alec Bradley',
  'EP Carrillo',
  'Rocky Patel',
  'La Aurora',
  'La Flor Dominicana',
  'Crowned Heads',
  'Cavalier Genève',
  'Cavalier Geneve',
  'Herrera Esteli',
  'Feral Flying Pig',
  'Drew Estate',
  'East India',
  'Factory Smokes',
  'Las Calaveras',
  'Lampert Cigars',
  'Litto Gomez',
  'Red Meat Lovers',
  'Knuckle Sandwich',
  'Fuente Fuente',
  'Fuente Opus',
  'The Tabernacle',
  'Nica Rustica',
  'Timeless Supreme',
];

function extractBrandFromLog(l: any): string {
  const explicit = (l.brand || '').trim();
  if (explicit) return explicit;

  const fullName = (l.fullName || '').trim();
  if (!fullName) return '';

  const lower = fullName.toLowerCase();
  for (const b of KNOWN_MULTI_WORD_BRANDS) {
    if (lower.startsWith(b.toLowerCase())) return b;
  }

  return fullName.split(' ')[0] || fullName;
}

export function computeSmokingProfile(logs: any[]): SmokingProfileData {
  const logCount = logs.length;

  const ratedLogs = logs.filter(
    (l) => l.overall && typeof l.overall === 'number' && l.overall > 0
  );
  const smokedCount = ratedLogs.length;
  const avgRating =
    smokedCount > 0
      ? Math.round(
          (ratedLogs.reduce((sum: number, l: any) => sum + l.overall, 0) / smokedCount) * 10
        ) / 10
      : 0;

  const scoredLogs = logs.filter((l) => {
    const norm = normalizeStrength(l.strength || '');
    return norm && STRENGTH_SCORES[norm];
  });
  const strengthAvg =
    scoredLogs.length > 0
      ? scoredLogs.reduce(
          (sum: number, l: any) => sum + STRENGTH_SCORES[normalizeStrength(l.strength)],
          0
        ) / scoredLogs.length
      : 0;

  const tier = strengthAvg > 0 && logCount >= 5 ? getTier(strengthAvg) : null;

  const noteFreq: Record<string, number> = {};
  logs.forEach((l) => {
    const raw = l.commonNotes || '';
    if (raw) {
      raw
        .split(',')
        .map((n: string) => n.trim().toLowerCase())
        .filter(Boolean)
        .forEach((note: string) => {
          noteFreq[note] = (noteFreq[note] || 0) + 1;
        });
    }
  });
  const topFlavors = Object.entries(noteFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count,
    }));

  const brandFreq: Record<string, number> = {};
  logs.forEach((l) => {
    const brand = extractBrandFromLog(l);
    if (brand) brandFreq[brand] = (brandFreq[brand] || 0) + 1;
  });
  const topBrands = Object.entries(brandFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  const rawNotes = logs
    .map((l) => l.notes || '')
    .filter(Boolean)
    .slice(0, 20);

  const commonFlavors = topFlavors.map((f) => f.name).join(', ');

  return {
    logCount,
    smokedCount,
    avgRating,
    strengthAvg,
    tier,
    topFlavors,
    topBrands,
    nextMilestone: getNextMilestone(logCount),
    currentMilestone: getCurrentMilestoneReached(logCount),
    rawNotes,
    commonFlavors,
  };
}
