// app/components/BrandSpotlightCard.js
// Entry card shown below a scan result when a brand partnership exists.
// Single hero thumbnail → tap → full-screen story player.

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Platform,
} from 'react-native';
import BrandSpotlightPlayer from './BrandSpotlightPlayer';

export default function BrandSpotlightCard({ spotlight }) {
  const [playerOpen, setPlayerOpen] = useState(false);

  const accent = spotlight.accentColor || '#C4781A';
  const videoCount = spotlight.videos.length;

  return (
    <>
      <View style={s.card}>
        {/* Header row */}
        <View style={s.header}>
          <View style={[s.dot, { backgroundColor: accent }]} />
          <Text style={[s.headerLabel, { color: accent }]}>
            {spotlight.brandName.toUpperCase()} · BRAND STORY
          </Text>
        </View>

        <Text style={s.tagline}>{spotlight.tagline}</Text>

        {/* Hero thumbnail — tap to play */}
        <TouchableOpacity
          style={s.heroWrap}
          onPress={() => setPlayerOpen(true)}
          activeOpacity={0.9}
          delayPressIn={80}
        >
          {spotlight.thumbnail ? (
            <Image
              source={{ uri: spotlight.thumbnail }}
              style={s.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[s.heroImage, { backgroundColor: '#1a1710' }]} />
          )}

          {/* Dark scrim so play button always shows */}
          <View style={s.heroScrim} />

          {/* Play button */}
          <View style={s.playCircle}>
            <View style={[s.playBg, { backgroundColor: accent }]}>
              <Text style={s.playArrow}>▶</Text>
            </View>
          </View>

          {/* Video count badge */}
          <View style={[s.countBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Text style={s.countTxt}>{videoCount} Videos</Text>
          </View>
        </TouchableOpacity>

        <Text style={s.tapHint}>Tap to watch · Swipe through all {videoCount} chapters</Text>

        {/* Socials — only render if any social field is populated */}
        {(spotlight.socials?.instagram || spotlight.socials?.tiktok || spotlight.socials?.website) && (
          <View style={s.socialsRow}>
            <Text style={s.socialsLabel}>FOLLOW</Text>
            {spotlight.socials.instagram ? (
              <TouchableOpacity
                style={s.socialPill}
                onPress={() => Platform.OS === 'web' && window.open(`https://instagram.com/${spotlight.socials.instagram.replace('@','')}`, '_blank')}
              >
                <Text style={s.socialPillTxt}>Instagram</Text>
              </TouchableOpacity>
            ) : null}
            {spotlight.socials.tiktok ? (
              <TouchableOpacity
                style={s.socialPill}
                onPress={() => Platform.OS === 'web' && window.open(`https://tiktok.com/@${spotlight.socials.tiktok.replace('@','')}`, '_blank')}
              >
                <Text style={s.socialPillTxt}>TikTok</Text>
              </TouchableOpacity>
            ) : null}
            {spotlight.socials.website ? (
              <TouchableOpacity
                style={s.socialPill}
                onPress={() => Platform.OS === 'web' && window.open(spotlight.socials.website, '_blank')}
              >
                <Text style={s.socialPillTxt}>Website</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {/* Full-screen player */}
      {playerOpen && (
        <BrandSpotlightPlayer
          spotlight={spotlight}
          startIndex={0}
          onClose={() => setPlayerOpen(false)}
        />
      )}
    </>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#0f0d0b',
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#2a2218',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5,
  },
  dot: {
    width: 7, height: 7, borderRadius: 3.5,
  },
  headerLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.4,
  },
  tagline: {
    color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 18, marginBottom: 12,
  },
  heroWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 12,
  },
  heroScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  playCircle: {
    alignItems: 'center', justifyContent: 'center',
  },
  playBg: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  playArrow: {
    color: '#fff', fontSize: 22, marginLeft: 4,
  },
  countBadge: {
    position: 'absolute', bottom: 10, right: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  countTxt: {
    color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3,
  },
  tapHint: {
    color: 'rgba(255,255,255,0.28)', fontSize: 10,
    textAlign: 'center', marginTop: 10,
  },
  socialsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  socialsLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginRight: 2,
  },
  socialPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  socialPillTxt: {
    color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600',
  },
});
