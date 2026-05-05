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

  const scoredLogs = logs.filter((l) => l.strength && STRENGTH_SCORES[l.strength]);
  const strengthAvg =
    scoredLogs.length > 0
      ? scoredLogs.reduce((sum: number, l: any) => sum + STRENGTH_SCORES[l.strength], 0) /
        scoredLogs.length
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
    if (l.brand && l.brand.trim()) {
      const key = l.brand.trim();
      brandFreq[key] = (brandFreq[key] || 0) + 1;
    }
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
