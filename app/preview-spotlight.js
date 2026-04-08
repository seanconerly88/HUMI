// app/preview-spotlight.js
// Preview screen for Brand Spotlight — accessible at ?preview=spotlight
// Shows the CORRECT two-step UX flow:
//   Step 1 → Scan result: Brand Spotlight badge teaser (no videos)
//   Step 2 → Humidor detail: full Brand Spotlight card with videos at the bottom

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import BrandSpotlightBadge from './components/BrandSpotlightBadge';
import BrandSpotlightCard from './components/BrandSpotlightCard';

// ── Guido Cigars spotlight config ─────────────────────────────────────────────
export const GUIDO_SPOTLIGHT = {
  brandKey: 'guido-cigars',
  brandName: 'Guido Cigars',
  tagline: 'Three chapters from the people behind the band.',
  accentColor: '#C4781A',
  thumbnail: 'https://storage.googleapis.com/humi-75da3.firebasestorage.app/brand-spotlights/guido-cigars/thumbnail.png',
  videos: [
    {
      id: 'evolution',
      title: 'The Evolution',
      subtitle: 'How a family passion became a brand.',
      url: 'https://storage.googleapis.com/humi-75da3.firebasestorage.app/brand-spotlights/guido-cigars/evolution.mp4',
    },
    {
      id: 'the-box',
      title: 'The Box',
      subtitle: 'Every detail on the box tells a story.',
      url: 'https://storage.googleapis.com/humi-75da3.firebasestorage.app/brand-spotlights/guido-cigars/the-box.mp4',
    },
    {
      id: 'the-goal',
      title: 'The Goal',
      subtitle: 'Where Guido Cigars is headed.',
      url: 'https://storage.googleapis.com/humi-75da3.firebasestorage.app/brand-spotlights/guido-cigars/the-goal.mp4',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Scan result card
// Shows the Brand Spotlight badge — teaser only, no videos.
// Free and premium users both see this badge; the difference is the content
// above it (free = name only, premium = name + HUMI Says).
// ─────────────────────────────────────────────────────────────────────────────

function ScanResultFree() {
  return (
    <View style={m.card}>
      <View style={m.foundBadge}>
        <Text style={m.foundDot}>●</Text>
        <Text style={m.foundTxt}>HUMI Found It</Text>
      </View>
      <View style={m.photo}><Text style={m.photoTxt}>📷 Your photo</Text></View>
      <Text style={m.cigarName}>Guido Cigars</Text>
      <Text style={m.freeNote}>
        Upgrade to Premium to unlock HUMI Says, tasting notes & more.
      </Text>
      {/* Brand Spotlight badge — same for free and premium */}
      <BrandSpotlightBadge
        brandName="Guido Cigars"
        accentColor={GUIDO_SPOTLIGHT.accentColor}
      />
    </View>
  );
}

function ScanResultPremium() {
  return (
    <View style={m.card}>
      <View style={m.foundBadge}>
        <Text style={m.foundDot}>●</Text>
        <Text style={m.foundTxt}>HUMI Found It</Text>
      </View>
      <View style={m.photo}><Text style={m.photoTxt}>📷 Your photo</Text></View>
      <Text style={m.cigarName}>Guido Cigars</Text>
      <View style={m.blurbCard}>
        <Text style={m.sectionLbl}>HUMI SAYS</Text>
        <Text style={m.blurbBody}>
          A bold Nicaraguan puro with a silky Colorado wrapper. Dark espresso,
          dry cedar, and a long peppery finish. Medium-full strength — built for
          the patient smoker.
        </Text>
      </View>
      {/* Brand Spotlight badge */}
      <BrandSpotlightBadge
        brandName="Guido Cigars"
        accentColor={GUIDO_SPOTLIGHT.accentColor}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Humidor detail view
// Full cigar info + Brand Spotlight card with videos at the bottom.
// ─────────────────────────────────────────────────────────────────────────────

function HumidorDetailPremium() {
  return (
    <View style={m.card}>
      <View style={m.photo}><Text style={m.photoTxt}>📷 Your photo</Text></View>
      <Text style={m.cigarName}>Guido Cigars</Text>
      <Text style={m.logDate}>Logged April 8, 2026</Text>

      {/* HUMI Says */}
      <View style={m.blurbCard}>
        <Text style={m.sectionLbl}>HUMI SAYS</Text>
        <Text style={m.blurbBody}>
          A bold Nicaraguan puro with a silky Colorado wrapper. Dark espresso,
          dry cedar, and a long peppery finish. Medium-full strength — built for
          the patient smoker.
        </Text>
      </View>

      {/* Tasting Notes */}
      <View style={m.sectionCard}>
        <Text style={m.sectionLbl}>TASTING NOTES</Text>
        <View style={m.tagsRow}>
          {['Dark Espresso', 'Dry Cedar', 'Black Pepper', 'Leather', 'Dark Chocolate'].map(t => (
            <View key={t} style={m.tag}><Text style={m.tagTxt}>{t}</Text></View>
          ))}
        </View>
      </View>

      {/* People Say + Pairings */}
      <View style={m.twoCol}>
        <View style={[m.sectionCard, { flex: 2, marginRight: 6 }]}>
          <Text style={m.sectionLbl}>PEOPLE SAY</Text>
          <Text style={m.quoteBody}>"Smooth draw, great construction. Burns slow and even."</Text>
          <Text style={m.quoteAttr}>— HUMI Community</Text>
        </View>
        <View style={[m.sectionCard, { flex: 1 }]}>
          <Text style={m.sectionLbl}>PAIRS WITH</Text>
          <Text style={m.pairingTxt}>Añejo Rum</Text>
          <Text style={m.pairingTxt}>Espresso</Text>
          <Text style={m.pairingTxt}>Dark Ale</Text>
        </View>
      </View>

      {/* ── Brand Spotlight lives here, at the bottom of the humidor detail ── */}
      <BrandSpotlightCard spotlight={GUIDO_SPOTLIGHT} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview screen — renders both steps with clear labels
// ─────────────────────────────────────────────────────────────────────────────

export default function SpotlightPreview() {
  return (
    <View style={s.root}>
      <View style={s.bar}>
        <Text style={s.barTxt}>PREVIEW — Brand Spotlight Experience</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── STEP 1 ── */}
        <View style={s.stepHeader}>
          <View style={s.stepPill}><Text style={s.stepNum}>STEP 1</Text></View>
          <Text style={s.stepTitle}>Scan Result</Text>
        </View>
        <Text style={s.stepNote}>
          User scans a Guido cigar. They see the result card with a Brand Spotlight
          badge at the bottom telling them something is waiting in their Humidor.
        </Text>

        <Text style={s.variantLabel}>Free user</Text>
        <ScanResultFree />

        <Text style={[s.variantLabel, { marginTop: 16 }]}>Premium user</Text>
        <ScanResultPremium />

        <View style={s.divider} />

        {/* ── STEP 2 ── */}
        <View style={s.stepHeader}>
          <View style={s.stepPill}><Text style={s.stepNum}>STEP 2</Text></View>
          <Text style={s.stepTitle}>Humidor Detail</Text>
        </View>
        <Text style={s.stepNote}>
          User opens their Humidor, taps the cigar they just logged. Full detail
          view — HUMI Says, tasting notes, pairings — and the Brand Spotlight card
          with videos sits at the bottom. Tap the thumbnail to watch.
        </Text>

        <Text style={s.variantLabel}>Premium user (full detail view)</Text>
        <HumidorDetailPremium />

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5ede3' },
  bar: {
    backgroundColor: '#8B4513',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 12, paddingHorizontal: 20, alignItems: 'center',
  },
  barTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  content: { padding: 16, paddingTop: 20 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  stepPill: {
    backgroundColor: '#8B4513', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  stepNum: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  stepTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  stepNote: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 14 },
  variantLabel: {
    fontSize: 10, fontWeight: '700', color: '#8B4513',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6, opacity: 0.7,
  },
  divider: { height: 1, backgroundColor: '#e8ddd0', marginVertical: 28 },
});

const m = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  foundBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E8F5E9', alignSelf: 'flex-start',
    paddingVertical: 3, paddingHorizontal: 9, borderRadius: 9, marginBottom: 10,
  },
  foundDot: { color: '#2E7D32', fontSize: 8 },
  foundTxt: { color: '#2E7D32', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  photo: {
    width: '100%', height: 180, borderRadius: 12,
    backgroundColor: '#f0ece6', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  photoTxt: { fontSize: 14, color: '#bbb' },
  cigarName: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  logDate: { fontSize: 12, color: '#999', marginBottom: 10 },
  freeNote: { fontSize: 12, color: '#8B4513', opacity: 0.7, lineHeight: 17 },
  blurbCard: {
    backgroundColor: '#faf7f3', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e8ddd0', marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#faf7f3', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#e8ddd0', marginTop: 8,
  },
  sectionLbl: {
    fontSize: 10, fontWeight: '800', color: '#8B4513', letterSpacing: 1.2, marginBottom: 6,
  },
  blurbBody: { fontSize: 14, color: '#444', lineHeight: 21 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: {
    backgroundColor: '#efe8df', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagTxt: { fontSize: 11, color: '#5a3a1a', fontWeight: '600' },
  twoCol: { flexDirection: 'row', marginTop: 0 },
  quoteBody: { fontSize: 12, color: '#444', lineHeight: 18, fontStyle: 'italic', marginBottom: 4 },
  quoteAttr: { fontSize: 10, color: '#999', fontWeight: '600' },
  pairingTxt: { fontSize: 12, color: '#444', lineHeight: 20 },
});
