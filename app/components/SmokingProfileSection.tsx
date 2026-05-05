import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import type { DimensionValue, ViewStyle } from 'react-native';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import {
  computeSmokingProfile,
  getCurrentMilestoneReached,
  getGraderInfo,
  TIER_CONFIG,
  SmokingProfileData,
  ProfileTier,
} from '../utils/smokingProfile';

interface Props {
  userId: string;
}

interface VoiceData {
  words: string[];
  text: string;
  milestone: number;
  generatedAt: string;
}

interface TierCache {
  tier: ProfileTier;
  strengthAvg: number;
  milestone: number;
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
// Uses CSS conic-gradient on web (the only supported platform right now).
// `background` is a web-only CSS shorthand with no React Native equivalent;
// the cast to unknown is deliberate and documented here.
const DONUT_SIZE = 110;
const INNER_SIZE = 68;

function DonutChart({ segments }: { segments: Array<{ color: string; pct: number }> }) {
  if (Platform.OS !== 'web') {
    return (
      <View
        style={{
          width: DONUT_SIZE,
          height: DONUT_SIZE,
          borderRadius: DONUT_SIZE / 2,
          backgroundColor: '#8B4513',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: INNER_SIZE,
            height: INNER_SIZE,
            borderRadius: INNER_SIZE / 2,
            backgroundColor: 'white',
          }}
        />
      </View>
    );
  }

  let cum = 0;
  const parts = segments.map((seg) => {
    const part = `${seg.color} ${cum.toFixed(1)}% ${(cum + seg.pct).toFixed(1)}%`;
    cum += seg.pct;
    return part;
  });
  // `from -90deg` starts at 12 o'clock instead of the CSS default 3 o'clock
  const conicGrad = `conic-gradient(from -90deg, ${parts.join(', ')})`;

  const webDonutStyle = {
    background: conicGrad,
  } as unknown as ViewStyle;

  return (
    <View
      style={[
        {
          width: DONUT_SIZE,
          height: DONUT_SIZE,
          borderRadius: DONUT_SIZE / 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
        webDonutStyle,
      ]}
    >
      <View
        style={{
          width: INNER_SIZE,
          height: INNER_SIZE,
          borderRadius: INNER_SIZE / 2,
          backgroundColor: 'white',
        }}
      />
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SmokingProfileSection({ userId }: Props) {
  const [profile, setProfile] = useState<SmokingProfileData | null>(null);
  const [voice, setVoice] = useState<VoiceData | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Always compute fresh stats from live log data
      const logsSnap = await getDocs(collection(db, 'users', userId, 'logs'));
      const logs = logsSnap.docs.map((d) => d.data());
      const freshStats = computeSmokingProfile(logs);

      if (freshStats.logCount < 5) {
        setProfile(freshStats);
        return;
      }

      // Milestone-gate the tier: only recompute when a new milestone is crossed
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      const cachedTier: TierCache | undefined = userDoc.data()?.smokingProfileCache;
      const currentMilestone = getCurrentMilestoneReached(freshStats.logCount);

      let displayTier = freshStats.tier;
      let displayStrengthAvg = freshStats.strengthAvg;

      if (cachedTier && cachedTier.milestone >= currentMilestone) {
        // Use the milestone-stable tier until the next milestone is crossed
        displayTier = cachedTier.tier;
        displayStrengthAvg = cachedTier.strengthAvg;
      } else {
        // New milestone reached — persist the freshly computed tier
        const newCache: TierCache = {
          tier: freshStats.tier as ProfileTier,
          strengthAvg: freshStats.strengthAvg,
          milestone: currentMilestone,
        };
        setDoc(userDocRef, { smokingProfileCache: newCache }, { merge: true }).catch(console.error);
      }

      const finalProfile: SmokingProfileData = {
        ...freshStats,
        tier: displayTier,
        strengthAvg: displayStrengthAvg,
      };
      setProfile(finalProfile);

      loadOrGenerateVoice(finalProfile, userDoc.data()?.smokingVoice, currentMilestone);
    } catch (e) {
      console.error('SmokingProfileSection load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadOrGenerateVoice = async (
    data: SmokingProfileData,
    cached: VoiceData | undefined,
    currentMilestone: number
  ) => {
    if (cached && cached.milestone >= currentMilestone) {
      setVoice(cached);
      return;
    }

    setVoiceLoading(true);
    try {
      const res = await fetch('/api/openai/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          notes: data.rawNotes,
          tier: data.tier || 'Traditionalist',
          commonFlavors: data.commonFlavors,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        const newVoice: VoiceData = {
          words: result.words || [],
          text: result.text || '',
          milestone: currentMilestone,
          generatedAt: new Date().toISOString(),
        };
        setVoice(newVoice);
        const userDocRef = doc(db, 'users', userId);
        setDoc(userDocRef, { smokingVoice: newVoice }, { merge: true }).catch(console.error);
      }
    } catch (voiceErr) {
      console.error('Voice generation error:', voiceErr);
    } finally {
      setVoiceLoading(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="small" color="#8B4513" />
      </View>
    );
  }

  if (!profile) return null;

  // ── Locked State (< 5 logs) ────────────────────────────────────────────────
  if (profile.logCount < 5) {
    const remaining = 5 - profile.logCount;
    const pct: DimensionValue = `${(profile.logCount / 5) * 100}%`;
    return (
      <View style={s.card}>
        <View style={s.lockedHeader}>
          <Text style={s.lockEmoji}>🔒</Text>
          <Text style={s.lockedTitle}>Your Smoking Profile</Text>
          <Text style={s.lockedSub}>
            Log {remaining} more cigar{remaining !== 1 ? 's' : ''} to unlock
          </Text>
        </View>

        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: pct }]} />
        </View>
        <Text style={s.progressLbl}>{profile.logCount} / 5 cigars logged</Text>

        <View style={s.teaserGrid}>
          {['Strength Profile', 'Flavor DNA', 'Your Voice'].map((label) => (
            <View key={label} style={s.teaserCell}>
              <Text style={s.teaserCellLbl}>{label}</Text>
              <Text style={s.teaserDots}>• • •</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── Active State (≥ 5 logs) ────────────────────────────────────────────────
  const {
    tier,
    strengthAvg,
    avgRating,
    logCount,
    smokedCount,
    topFlavors,
    topBrands,
    nextMilestone,
  } = profile;

  const cfg = TIER_CONFIG[(tier as ProfileTier) || 'Traditionalist'];
  const grader = getGraderInfo(avgRating);

  // Progress bar only shown for 5–9 logs (the first milestone window)
  const showProgressBar = logCount < 10;
  const progressPct: DimensionValue = `${Math.min(((logCount - 5) / 5) * 100, 100)}%`;

  const totalFlavors = topFlavors.reduce((sum, f) => sum + f.count, 0);
  const flavorColors = ['#5c2d0e', '#8B4513', '#C4894F'];
  const totalBrands = topBrands.reduce((sum, b) => sum + b.count, 0);

  // Strength indicator position (percentage along the meter bar)
  const strengthPct: DimensionValue = `${Math.min(Math.max(((strengthAvg - 1) / 4) * 100, 3), 97)}%`;

  // Donut segments (proportional to flavor count)
  const donutSegments = topFlavors.map((f, i) => ({
    color: flavorColors[i],
    pct: totalFlavors > 0 ? (f.count / totalFlavors) * 100 : 33.33,
  }));

  return (
    <View style={s.card}>
      {/* Tier header */}
      <View style={[s.tierHeader, { borderLeftColor: cfg.color }]}>
        <Text style={[s.tierName, { color: cfg.color }]}>{tier}</Text>
        <Text style={s.tierBlurb}>{cfg.blurb}</Text>
      </View>

      {/* Strength meter — linear gradient light→dark matching approved mockup */}
      <View style={s.section}>
        <Text style={s.sectionLbl}>STRENGTH PROFILE</Text>
        <View style={s.strengthWrap}>
          {/* Gradient bar: web uses CSS background, native falls back to plain fill */}
          <View
            style={[
              s.strengthTrack,
              Platform.OS === 'web'
                ? ({ background: 'linear-gradient(to right, #d4b896, #a0602a, #5c2d0e)' } as unknown as ViewStyle)
                : { backgroundColor: '#8B4513' },
            ]}
          />
          {/* Circle indicator positioned along the bar */}
          <View style={[s.strIndicator, { left: strengthPct }]} />
        </View>
        <View style={s.strLabelRow}>
          {(['Gentleman', 'Traditionalist', 'Craftsman'] as const).map((lbl) => (
            <Text key={lbl} style={s.strLabelTxt}>{lbl}</Text>
          ))}
        </View>
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Text style={[s.statNum, { color: cfg.color }]}>{logCount}</Text>
          <Text style={s.statLbl}>Logged</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNum, { color: cfg.color }]}>{smokedCount}</Text>
          <Text style={s.statLbl}>Smoked</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNum, { color: cfg.color }]}>
            {avgRating > 0 ? `${avgRating}/5` : '—'}
          </Text>
          <Text style={s.statLbl}>Avg Rating</Text>
        </View>
      </View>

      {avgRating > 0 && <Text style={s.graderLine}>{grader.line}</Text>}

      {/* First-window progress bar: only shown for logs 5–9 */}
      {showProgressBar && (
        <View style={s.milestoneWrap}>
          <View style={s.milestoneLblRow}>
            <Text style={s.milestoneLbl}>Next milestone</Text>
            <Text style={s.milestoneNum}>
              {logCount} / {nextMilestone}
            </Text>
          </View>
          <View style={s.progressTrack}>
            <View
              style={[s.progressFill, { width: progressPct, backgroundColor: cfg.color }]}
            />
          </View>
        </View>
      )}

      {/* Flavor profile: donut chart + pills */}
      {topFlavors.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLbl}>FLAVOR PROFILE</Text>
          <View style={s.flavorRow}>
            <DonutChart segments={donutSegments} />
            <View style={s.flavorPills}>
              {topFlavors.map((f, i) => (
                <View
                  key={f.name}
                  style={[
                    s.flavorPill,
                    {
                      backgroundColor: flavorColors[i] + '18',
                      borderColor: flavorColors[i] + '55',
                    },
                  ]}
                >
                  <View style={[s.flavorDot, { backgroundColor: flavorColors[i] }]} />
                  <Text style={[s.flavorPillTxt, { color: flavorColors[i] }]}>{f.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Top brands */}
      {topBrands.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLbl}>TOP BRANDS</Text>
          {topBrands.map((brand, i) => {
            const brandPct: DimensionValue = `${totalBrands > 0 ? (brand.count / totalBrands) * 100 : 50}%`;
            return (
              <View key={brand.name} style={s.brandRow}>
                <Text style={[s.brandRank, { color: cfg.color }]}>#{i + 1}</Text>
                <View style={s.brandInfo}>
                  <View style={s.brandTopRow}>
                    <Text style={s.brandName}>{brand.name}</Text>
                    <Text style={s.brandCount}>
                      {brand.count} {brand.count === 1 ? 'cigar' : 'cigars'}
                    </Text>
                  </View>
                  <View style={s.brandTrack}>
                    <View
                      style={[s.brandFill, { width: brandPct, backgroundColor: cfg.accent }]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Your Voice */}
      <View style={[s.section, s.voiceSection]}>
        <Text style={s.sectionLbl}>YOUR VOICE</Text>
        {voiceLoading ? (
          <View style={s.voiceLoading}>
            <ActivityIndicator size="small" color={cfg.color} />
            <Text style={s.voiceLoadingTxt}>Analyzing your notes…</Text>
          </View>
        ) : voice && (voice.words.length > 0 || voice.text) ? (
          <>
            <View style={s.voiceChips}>
              {voice.words.map((word) => (
                <View key={word} style={[s.voiceChip, { borderColor: cfg.color + '44' }]}>
                  <Text style={[s.voiceChipTxt, { color: cfg.color }]}>"{word}"</Text>
                </View>
              ))}
            </View>
            {voice.text ? <Text style={s.voiceInsight}>{voice.text}</Text> : null}
          </>
        ) : (
          <Text style={s.voiceEmpty}>Keep logging cigars — your voice is forming.</Text>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  loadingContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  // Locked
  lockedHeader: { alignItems: 'center', paddingVertical: 8, marginBottom: 16 },
  lockEmoji: { fontSize: 28, marginBottom: 8 },
  lockedTitle: { fontSize: 18, fontWeight: '700', color: '#2c1810', marginBottom: 4 },
  lockedSub: { fontSize: 14, color: '#8B6B5A' },
  teaserGrid: { flexDirection: 'row', gap: 8, marginTop: 16 },
  teaserCell: {
    flex: 1,
    backgroundColor: '#f5ede7',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  teaserCellLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B6B5A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  teaserDots: { fontSize: 16, color: '#c4a090', letterSpacing: 4 },

  // Progress bar (locked state + 5–9 window)
  progressTrack: {
    height: 6,
    backgroundColor: '#ede5de',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: 6, backgroundColor: '#8B4513', borderRadius: 3 },
  progressLbl: { fontSize: 11, color: '#8B6B5A', textAlign: 'center', marginBottom: 4 },

  // Tier header
  tierHeader: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 18 },
  tierName: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  tierBlurb: { fontSize: 13, color: '#555', lineHeight: 19, fontStyle: 'italic' },

  // Section
  section: { marginTop: 18 },
  sectionLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a08070',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Strength meter
  strengthWrap: { position: 'relative', marginBottom: 4 },
  strengthTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  strIndicator: {
    position: 'absolute',
    top: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#5c2d0e',
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  strLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  strLabelTxt: { fontSize: 9, color: '#a08070', flex: 1, textAlign: 'center' },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    marginTop: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0e8e0',
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 11, color: '#999', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#e8ddd6' },
  graderLine: {
    fontSize: 12,
    color: '#8B6B5A',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },

  // Milestone (5–9 only)
  milestoneWrap: { marginTop: 16 },
  milestoneLblRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  milestoneLbl: { fontSize: 12, color: '#888' },
  milestoneNum: { fontSize: 12, color: '#555', fontWeight: '600' },

  // Flavor profile
  flavorRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  flavorPills: { flex: 1, gap: 8 },
  flavorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    alignSelf: 'flex-start',
  },
  flavorDot: { width: 6, height: 6, borderRadius: 3 },
  flavorPillTxt: { fontSize: 12, fontWeight: '600' },

  // Top brands
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  brandRank: { fontSize: 13, fontWeight: '800', width: 24 },
  brandInfo: { flex: 1 },
  brandTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  brandName: { fontSize: 13, fontWeight: '600', color: '#333' },
  brandCount: { fontSize: 11, color: '#999' },
  brandTrack: { height: 4, backgroundColor: '#ede5de', borderRadius: 2, overflow: 'hidden' },
  brandFill: { height: 4, borderRadius: 2 },

  // Your Voice
  voiceSection: { backgroundColor: '#faf7f4', borderRadius: 10, padding: 14, marginTop: 18 },
  voiceLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  voiceLoadingTxt: { fontSize: 13, color: '#888', fontStyle: 'italic' },
  voiceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  voiceChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'white',
  },
  voiceChipTxt: { fontSize: 12, fontWeight: '600', fontStyle: 'italic' },
  voiceInsight: { fontSize: 13, color: '#444', lineHeight: 20 },
  voiceEmpty: { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
});
