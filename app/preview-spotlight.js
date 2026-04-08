// app/preview-spotlight.js
// Preview screen for Brand Spotlight — accessible at ?preview=spotlight
// Shows the experience as it would appear after a scan result.
// NOT wired into production navigation.

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import BrandSpotlightCard from './components/BrandSpotlightCard';

// ── Guido Cigars spotlight data ───────────────────────────────────────────────
export const GUIDO_SPOTLIGHT = {
  brandKey: 'guido-cigars',
  brandName: 'Guido Cigars',
  tagline: 'Three chapters from the people behind the band.',
  accentColor: '#C4781A',
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

// ── Simulated scan result card ────────────────────────────────────────────────
function MockScanResult() {
  return (
    <View style={m.scanCard}>
      {/* HUMI Found It badge */}
      <View style={m.badge}>
        <Text style={m.badgeDot}>●</Text>
        <Text style={m.badgeTxt}>HUMI Found It</Text>
      </View>

      <Text style={m.cigarName}>Guido Cigars No. 5</Text>
      <Text style={m.cigarDate}>2026-04-08</Text>

      <View style={m.blurbCard}>
        <Text style={m.blurbLabel}>HUMI SAYS</Text>
        <Text style={m.blurbBody}>
          A bold Nicaraguan puro with a silky Colorado wrapper, the Guido No. 5
          delivers dark espresso, dry cedar, and a long, peppery finish. Strength
          lands firmly in the medium-full range — built for the patient smoker.
        </Text>
      </View>
    </View>
  );
}

// ── Preview screen ────────────────────────────────────────────────────────────
export default function SpotlightPreview() {
  return (
    <View style={s.root}>
      {/* Preview label */}
      <View style={s.previewBar}>
        <Text style={s.previewTxt}>PREVIEW — Brand Spotlight Experience</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Context: what the user sees first (scan result) */}
        <Text style={s.sectionLabel}>Scan result card (unchanged)</Text>
        <MockScanResult />

        {/* Brand spotlight card appears below */}
        <Text style={s.sectionLabel}>Brand Spotlight — appears below scan result</Text>
        <BrandSpotlightCard spotlight={GUIDO_SPOTLIGHT} />

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f5ede3',
  },
  previewBar: {
    backgroundColor: '#8B4513',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  previewTxt: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B4513',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
    opacity: 0.7,
  },
});

// Mock scan result styles
const m = StyleSheet.create({
  scanCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 9,
    marginBottom: 10,
  },
  badgeDot: { color: '#2E7D32', fontSize: 8 },
  badgeTxt: { color: '#2E7D32', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  cigarName: {
    fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 2,
  },
  cigarDate: {
    fontSize: 12, color: '#999', marginBottom: 14,
  },
  blurbCard: {
    backgroundColor: '#faf7f3',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e8ddd0',
  },
  blurbLabel: {
    fontSize: 10, fontWeight: '800', color: '#8B4513',
    letterSpacing: 1.2, marginBottom: 6,
  },
  blurbBody: {
    fontSize: 14, color: '#444', lineHeight: 21,
  },
});
