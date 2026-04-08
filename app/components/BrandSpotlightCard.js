// app/components/BrandSpotlightCard.js
// The teaser strip shown below the scan result when a brand partnership exists.
// Tapping any thumbnail launches the full-screen BrandSpotlightPlayer.

import React, { useState, createElement } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import BrandSpotlightPlayer from './BrandSpotlightPlayer';

const VideoThumb = (props) => createElement('video', props);

export default function BrandSpotlightCard({ spotlight }) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const accent = spotlight.accentColor || '#C4781A';

  const openAt = (i) => {
    setStartIndex(i);
    setPlayerOpen(true);
  };

  return (
    <>
      <View style={s.card}>
        {/* Header */}
        <View style={s.header}>
          <View style={[s.headerDot, { backgroundColor: accent }]} />
          <Text style={[s.headerLabel, { color: accent }]}>
            {spotlight.brandName.toUpperCase()} BRAND STORY
          </Text>
        </View>

        <Text style={s.tagline}>{spotlight.tagline}</Text>

        {/* Video thumbnails */}
        <View style={s.thumbRow}>
          {spotlight.videos.map((video, i) => (
            <TouchableOpacity
              key={video.id}
              style={s.thumbWrap}
              onPress={() => openAt(i)}
              activeOpacity={0.85}
            >
              {/* Video poster / thumbnail */}
              <View style={s.thumbVideo}>
                {Platform.OS === 'web' ? (
                  <VideoThumb
                    src={video.url}
                    muted
                    playsInline
                    preload="metadata"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 10,
                      display: 'block',
                      pointerEvents: 'none',
                    }}
                  />
                ) : (
                  <View style={[s.thumbVideo, { backgroundColor: '#1a1a1a' }]} />
                )}
                {/* Play overlay */}
                <View style={s.playOverlay} pointerEvents="none">
                  <View style={[s.playBtn, { backgroundColor: accent }]}>
                    <Text style={s.playTxt}>▶</Text>
                  </View>
                </View>
              </View>
              <Text style={s.thumbTitle} numberOfLines={2}>{video.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.tapHint}>Tap any video to watch full screen</Text>
      </View>

      {/* Full-screen player */}
      {playerOpen && (
        <BrandSpotlightPlayer
          spotlight={spotlight}
          startIndex={startIndex}
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
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#2a2218',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6,
  },
  headerDot: {
    width: 7, height: 7, borderRadius: 3.5,
  },
  headerLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.4,
  },
  tagline: {
    color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18,
    marginBottom: 14,
  },
  thumbRow: {
    flexDirection: 'row', gap: 10,
  },
  thumbWrap: {
    flex: 1, gap: 7,
  },
  thumbVideo: {
    width: '100%', aspectRatio: 9 / 16,
    borderRadius: 10, backgroundColor: '#1a1710',
    overflow: 'hidden', position: 'relative',
  },
  playOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  playBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  playTxt: {
    color: '#fff', fontSize: 13, marginLeft: 2,
  },
  thumbTitle: {
    color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600',
    lineHeight: 15, textAlign: 'center',
  },
  tapHint: {
    color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center',
    marginTop: 12,
  },
});
