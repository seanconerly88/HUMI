// app/preview-spotlight.js
// Preview screen for Brand Spotlight — accessible at ?preview=spotlight
// Shows the experience as it would appear after a scan result.
// NOT wired into production navigation.

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import BrandSpotlightCard from './components/BrandSpotlightCard';

// ── Guido Cigars spotlight config ─────────────────────────────────────────────
// This data will eventually live in Firestore under brandSpotlights/guido-cigars
export const GUIDO_SPOTLIGHT = {
  brandKey: 'guido-cigars',
  brandName: 'Guido Cigars',
  tagline: 'Three chapters from the people behind the band.',
  accentColor: '#C4781A',
  thumbnail: '/brand-images/guido-thumbnail.png',
  videos: [
    {
      id: 'evolution',
      title: 'The Evolution',
      subtitle: 'How a family passion became a brand.',
      url: '/brand-videos/guido-evolution.mp4',
    },
    {
      id: 'the-box',
      title: 'The Box',
      subtitle: 'Every detail on the box tells a story.',
      url: '/brand-videos/guido-the-box.mp4',
    },
    {
      id: 'the-goal',
      title: 'The Goal',
      subtitle: 'Where Guido Cigars is headed.',
      url: '/brand-videos/guido-the-goal.mp4',
    },
  ],
};

// ── Simulated scan result — FREE user view ────────────────────────────────────
// Free users only see the cigar name + their uploaded photo.
// No HUMI Says, no tasting notes, no pairings.
// Cigar name only uses what the database returns — no hallucinated details.
function MockScanResultFree() {
  return (
    <View style={m.scanCard}>
      <View style={m.badge}>
        <Text style={m.badgeDot}>●</Text>
        <Text style={m.badgeTxt}>HUMI Found It</Text>
      </View>

      {/* Photo placeholder — in-app this is the user's uploaded photo */}
      <View style={m.photoPlaceholder}>
        <Text style={m.photoPlaceholderTxt}>📷 Your photo</Text>
      </View>

      {/* Name only — exactly as it comes from the database */}
      <Text style={m.cigarName}>Guido Cigars</Text>
      <Text style={m.freeNote}>
        Upgrade to Premium to unlock HUMI Says, tasting notes, pairings & more.
      </Text>
    </View>
  );
}

// ── Simulated scan result — PREMIUM user view ─────────────────────────────────
function MockScanResultPremium() {
  return (
    <View style={m.scanCard}>
      <View style={m.badge}>
        <Text style={m.badgeDot}>●</Text>
        <Text style={m.badgeTxt}>HUMI Found It</Text>
      </View>

      <View style={m.photoPlaceholder}>
        <Text style={m.photoPlaceholderTxt}>📷 Your photo</Text>
      </View>

      <Text style={m.cigarName}>Guido Cigars</Text>

      {/* HUMI Says */}
      <View style={m.blurbCard}>
        <Text style={m.blurbLabel}>HUMI SAYS</Text>
        <Text style={m.blurbBody}>
          A bold Nicaraguan puro with a silky Colorado wrapper. Dark espresso, dry cedar,
          and a long peppery finish. Strength is firmly medium-full — built for the patient smoker.
        </Text>
      </View>

      {/* Tasting Notes */}
      <View style={m.sectionCard}>
        <Text style={m.blurbLabel}>TASTING NOTES</Text>
        <View style={m.tagsRow}>
          {['Dark Espresso', 'Dry Cedar', 'Black Pepper', 'Leather', 'Dark Chocolate'].map(tag => (
            <View key={tag} style={m.tag}>
              <Text style={m.tagTxt}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Two column row */}
      <View style={m.twoCol}>
        {/* What People Are Saying */}
        <View style={[m.sectionCard, { flex: 2, marginRight: 6 }]}>
          <Text style={m.blurbLabel}>PEOPLE SAY</Text>
          <Text style={m.quoteBody}>"Smooth draw, great construction. Burns slow and even."</Text>
          <Text style={m.quoteAttr}>— HUMI Community</Text>
        </View>
        {/* Pairings */}
        <View style={[m.sectionCard, { flex: 1 }]}>
          <Text style={m.blurbLabel}>PAIRS WITH</Text>
          <Text style={m.pairingTxt}>Añejo Rum</Text>
          <Text style={m.pairingTxt}>Espresso</Text>
          <Text style={m.pairingTxt}>Dark Ale</Text>
        </View>
      </View>
    </View>
  );
}

// ── Preview screen ────────────────────────────────────────────────────────────
export default function SpotlightPreview() {
  return (
    <View style={s.root}>
      <View style={s.previewBar}>
        <Text style={s.previewTxt}>PREVIEW — Brand Spotlight Experience</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* FREE USER VIEW */}
        <Text style={s.sectionLabel}>Free User — scan result + Brand Spotlight</Text>
        <Text style={s.sectionNote}>Free users see name + photo only. No HUMI Says.</Text>
        <MockScanResultFree />
        <BrandSpotlightCard spotlight={GUIDO_SPOTLIGHT} />

        <View style={s.divider} />

        {/* PREMIUM USER VIEW */}
        <Text style={s.sectionLabel}>Premium User — scan result + Brand Spotlight</Text>
        <Text style={s.sectionNote}>Premium users see full HUMI Says content.</Text>
        <MockScanResultPremium />
        <BrandSpotlightCard spotlight={GUIDO_SPOTLIGHT} />

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5ede3' },
  previewBar: {
    backgroundColor: '#8B4513',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  previewTxt: {
    color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#8B4513',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3, marginTop: 6, opacity: 0.8,
  },
  sectionNote: {
    fontSize: 11, color: '#8B4513', opacity: 0.55, marginBottom: 8,
  },
  divider: {
    height: 1, backgroundColor: '#e8ddd0', marginVertical: 28,
  },
});

const m = StyleSheet.create({
  scanCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E8F5E9', alignSelf: 'flex-start',
    paddingVertical: 3, paddingHorizontal: 9, borderRadius: 9, marginBottom: 10,
  },
  badgeDot: { color: '#2E7D32', fontSize: 8 },
  badgeTxt: { color: '#2E7D32', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  photoPlaceholder: {
    width: '100%', height: 180, borderRadius: 12,
    backgroundColor: '#f0ece6', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  photoPlaceholderTxt: { fontSize: 14, color: '#bbb' },
  cigarName: {
    fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 6,
  },
  freeNote: {
    fontSize: 12, color: '#8B4513', opacity: 0.7, lineHeight: 17,
  },
  blurbCard: {
    backgroundColor: '#faf7f3', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e8ddd0', marginTop: 6,
  },
  blurbLabel: {
    fontSize: 10, fontWeight: '800', color: '#8B4513', letterSpacing: 1.2, marginBottom: 6,
  },
  blurbBody: {
    fontSize: 14, color: '#444', lineHeight: 21,
  },
  sectionCard: {
    backgroundColor: '#faf7f3', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#e8ddd0', marginTop: 8,
  },
  tagsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2,
  },
  tag: {
    backgroundColor: '#efe8df', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagTxt: {
    fontSize: 11, color: '#5a3a1a', fontWeight: '600',
  },
  twoCol: {
    flexDirection: 'row', marginTop: 0,
  },
  quoteBody: {
    fontSize: 12, color: '#444', lineHeight: 18, fontStyle: 'italic', marginBottom: 4,
  },
  quoteAttr: {
    fontSize: 10, color: '#999', fontWeight: '600',
  },
  pairingTxt: {
    fontSize: 12, color: '#444', lineHeight: 20,
  },
});
