// app/components/BrandSpotlightPlayer.js
// Full-screen vertical story player for Brand Spotlight partnerships.
// Tap right = advance, tap left = back, swipe down = close, auto-advances.

import React, { useState, useRef, useEffect, createElement } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform, Dimensions,
} from 'react-native';

const VideoEl = (props) => createElement('video', props);
const { width: SW, height: SH } = Dimensions.get('window');

export default function BrandSpotlightPlayer({ spotlight, startIndex = 0, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0); // 0–1 for current video
  const slideAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef(null);
  const progressInterval = useRef(null);

  const video = spotlight.videos[currentIdx];
  const total = spotlight.videos.length;

  // Slide up on mount
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1, friction: 22, tension: 180, useNativeDriver: true,
    }).start();
  }, []);

  // Reset progress when video index changes
  useEffect(() => {
    setProgress(0);
    clearInterval(progressInterval.current);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentIdx]);

  const goNext = () => {
    if (currentIdx < total - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      handleClose();
    }
  };

  const goPrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1);
    }
  };

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 0, duration: 260, useNativeDriver: true,
    }).start(() => onClose?.());
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SH, 0],
  });

  const accent = spotlight.accentColor || '#C4781A';

  return (
    <Animated.View style={[s.root, { transform: [{ translateY }] }]}>

      {/* Video layer */}
      <View style={s.videoWrap}>
        {Platform.OS === 'web' ? (
          <VideoEl
            key={video.url}
            ref={videoRef}
            src={video.url}
            autoPlay
            playsInline
            muted={false}
            loop={false}
            onEnded={goNext}
            onTimeUpdate={(e) => {
              const el = e.target;
              if (el.duration) setProgress(el.currentTime / el.duration);
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              backgroundColor: '#000',
            }}
          />
        ) : (
          <View style={[s.videoWrap, { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: '#fff', opacity: 0.5 }}>Video player</Text>
          </View>
        )}
      </View>

      {/* Dark gradient overlays */}
      <View style={s.gradientTop} pointerEvents="none" />
      <View style={s.gradientBottom} pointerEvents="none" />

      {/* Top bar: progress + brand */}
      <View style={s.topBar} pointerEvents="none">
        {/* Progress segments */}
        <View style={s.progressRow}>
          {spotlight.videos.map((_, i) => {
            const fill = i < currentIdx ? 1 : i === currentIdx ? progress : 0;
            return (
              <View key={i} style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${fill * 100}%`, backgroundColor: accent }]} />
              </View>
            );
          })}
        </View>

        {/* Brand identity */}
        <View style={s.brandRow}>
          <View style={[s.brandBadge, { backgroundColor: accent }]}>
            <Text style={s.brandBadgeTxt}>✦</Text>
          </View>
          <Text style={s.brandName}>{spotlight.brandName}</Text>
        </View>
      </View>

      {/* Close button */}
      <TouchableOpacity style={s.closeBtn} onPress={handleClose} hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}>
        <Text style={s.closeTxt}>✕</Text>
      </TouchableOpacity>

      {/* Video title at bottom */}
      <View style={s.bottomBar} pointerEvents="none">
        {spotlight.tagline ? (
          <Text style={[s.spotlightLabel, { color: accent }]}>BRAND SPOTLIGHT</Text>
        ) : null}
        <Text style={s.videoTitle}>{video.title}</Text>
        {video.subtitle ? <Text style={s.videoSubtitle}>{video.subtitle}</Text> : null}
        <View style={s.dotRow}>
          {spotlight.videos.map((_, i) => (
            <View key={i} style={[s.dot, i === currentIdx && { backgroundColor: accent, width: 18 }]} />
          ))}
        </View>
      </View>

      {/* Tap zones — invisible, cover full screen */}
      <View style={s.tapZones} pointerEvents="box-none">
        <TouchableOpacity style={s.tapLeft} onPress={goPrev} activeOpacity={1} />
        <TouchableOpacity style={s.tapRight} onPress={goNext} activeOpacity={1} />
      </View>

    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000',
    zIndex: 9999,
  },
  videoWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  gradientTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 180,
    pointerEvents: 'none',
    backgroundColor: 'transparent',
  },
  gradientBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 220,
    pointerEvents: 'none',
    backgroundColor: 'transparent',
  },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingHorizontal: 16,
    gap: 12,
  },
  progressRow: {
    flexDirection: 'row', gap: 4,
  },
  progressTrack: {
    flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 2,
  },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2,
  },
  brandBadge: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  brandBadgeTxt: {
    color: '#fff', fontSize: 13, fontWeight: '700',
  },
  brandName: {
    color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 38,
    right: 18,
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  closeTxt: {
    color: '#fff', fontSize: 15, fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 52 : 36,
    gap: 6,
  },
  spotlightLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
  },
  videoTitle: {
    color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 32,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8,
  },
  videoSubtitle: {
    color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20,
  },
  dotRow: {
    flexDirection: 'row', gap: 5, marginTop: 4,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  tapZones: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
  },
  tapLeft: {
    width: '30%', height: '100%',
  },
  tapRight: {
    flex: 1, height: '100%',
  },
});
