// app/components/BrandSpotlightPlayer.js
// Full-screen story player for Brand Spotlight partnerships.
// Uses position:fixed on web so it truly covers the full viewport
// regardless of scroll position or parent container.

import React, { useState, useRef, useEffect, createElement } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform, Dimensions,
} from 'react-native';

const VideoEl = (props) => createElement('video', props);

export default function BrandSpotlightPlayer({ spotlight, startIndex = 0, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [progress, setProgress]     = useState(0);
  const slideAnim  = useRef(new Animated.Value(0)).current;
  const videoRef   = useRef(null);
  const swipeStart = useRef(null);

  const { height: VH } = Dimensions.get('window');
  const video  = spotlight.videos[currentIdx];
  const total  = spotlight.videos.length;
  const accent = spotlight.accentColor || '#C4781A';

  // ── Lock body scroll on web while player is open ──────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, []);

  // ── Slide-up entrance animation ───────────────────────────────────────────
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1, friction: 22, tension: 180, useNativeDriver: true,
    }).start();
  }, []);

  // ── Reload video whenever index changes ───────────────────────────────────
  useEffect(() => {
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentIdx]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = () => currentIdx < total - 1 ? setCurrentIdx(i => i + 1) : handleClose();
  const goPrev = () => currentIdx > 0 && setCurrentIdx(i => i - 1);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 0, duration: 240, useNativeDriver: true,
    }).start(() => onClose?.());
  };

  // ── Swipe detection (web touch events) ────────────────────────────────────
  const onTouchStart = (e) => {
    swipeStart.current = e.nativeEvent?.pageX ?? e.touches?.[0]?.clientX ?? null;
  };
  const onTouchEnd = (e) => {
    if (swipeStart.current === null) return;
    const endX = e.nativeEvent?.pageX ?? e.changedTouches?.[0]?.clientX ?? null;
    if (endX === null) return;
    const delta = swipeStart.current - endX;
    if (Math.abs(delta) > 40) delta > 0 ? goNext() : goPrev();
    swipeStart.current = null;
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1], outputRange: [VH, 0],
  });

  // ── Root style — fixed on web, absolute on native ─────────────────────────
  const rootStyle = Platform.OS === 'web'
    ? {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#000',
        zIndex: 99999,
        transform: [{ translateY }],
      }
    : [s.rootNative, { transform: [{ translateY }] }];

  return (
    <Animated.View style={rootStyle}>

      {/* ── Video ── */}
      <View style={StyleSheet.absoluteFill}>
        {Platform.OS === 'web' ? (
          <VideoEl
            key={video.url}
            ref={videoRef}
            src={video.url}
            autoPlay
            playsInline
            loop={false}
            onEnded={goNext}
            onTimeUpdate={(e) => {
              const el = e.target;
              if (el.duration) setProgress(el.currentTime / el.duration);
            }}
            style={{
              width: '100%', height: '100%',
              objectFit: 'contain',
              display: 'block',
              backgroundColor: '#000',
            }}
          />
        ) : (
          <View style={{ flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', opacity: 0.4 }}>Video</Text>
          </View>
        )}
      </View>

      {/* ── Gradients — raw divs so CSS gradient works on web ── */}
      {Platform.OS === 'web' && (
        <>
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, height: 200,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
            pointerEvents: 'none', zIndex: 1,
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, height: 300,
            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)',
            pointerEvents: 'none', zIndex: 1,
          }} />
        </>
      )}

      {/* ── Progress bar ── */}
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

      {/* ── Brand row ── */}
      <View style={s.brandRow}>
        <View style={[s.brandBadge, { backgroundColor: accent }]}>
          <Text style={s.brandBadgeTxt}>✦</Text>
        </View>
        <Text style={s.brandName}>{spotlight.brandName}</Text>
      </View>

      {/* ── Close button ── */}
      <TouchableOpacity style={s.closeBtn} onPress={handleClose} hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}>
        <Text style={s.closeTxt}>✕</Text>
      </TouchableOpacity>

      {/* ── Bottom text — solid dark pill so it's always readable ── */}
      <View style={s.bottomBar}>
        <View style={[s.labelPill, { backgroundColor: accent }]}>
          <Text style={s.labelPillTxt}>BRAND SPOTLIGHT</Text>
        </View>
        <View style={s.titlePill}>
          <Text style={s.videoTitle}>{video.title}</Text>
          {video.subtitle ? <Text style={s.videoSubtitle}>{video.subtitle}</Text> : null}
        </View>
        <View style={s.dotRow}>
          {spotlight.videos.map((_, i) => (
            <View key={i} style={[
              s.dot,
              { backgroundColor: i === currentIdx ? accent : 'rgba(255,255,255,0.35)' },
              i === currentIdx && { width: 18 },
            ]} />
          ))}
        </View>
      </View>

      {/* ── Tap + swipe gesture layer (full screen) ── */}
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onResponderGrant={onTouchStart}
        onResponderRelease={onTouchEnd}
      >
        <TouchableOpacity style={{ width: '30%', height: '100%' }} onPress={goPrev} activeOpacity={1} />
        <TouchableOpacity style={{ flex: 1, height: '100%' }} onPress={goNext} activeOpacity={1} />
      </View>

    </Animated.View>
  );
}

const SAFE_TOP = Platform.OS === 'ios' ? 58 : 42;
const SAFE_BOT = Platform.OS === 'ios' ? 52 : 36;

const s = StyleSheet.create({
  rootNative: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000', zIndex: 99999,
  },
  progressRow: {
    position: 'absolute', top: SAFE_TOP, left: 16, right: 16,
    flexDirection: 'row', gap: 4, zIndex: 10,
  },
  progressTrack: {
    flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 2,
  },
  brandRow: {
    position: 'absolute', top: SAFE_TOP + 14, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10,
  },
  brandBadge: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  brandBadgeTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  brandName: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  closeBtn: {
    position: 'absolute', top: SAFE_TOP + 10, right: 18,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', zIndex: 11,
  },
  closeTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bottomBar: {
    position: 'absolute', bottom: SAFE_BOT, left: 20, right: 20,
    gap: 8, zIndex: 10,
  },
  labelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  labelPillTxt: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  titlePill: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, gap: 4,
  },
  videoTitle: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28 },
  videoSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19 },
  dotRow: { flexDirection: 'row', gap: 5, paddingLeft: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
