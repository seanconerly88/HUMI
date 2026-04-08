// app/components/BrandSpotlightPlayer.js
// Full-screen story player for Brand Spotlight.
// On web: renders as a true fixed portal into document.body — no React Native layout involved.
// Tap right half = next, tap left half = previous. Auto-advances on end.

import React, { useState, useRef, useEffect, createElement } from 'react';
import { Platform, StyleSheet, View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';

// ── Web portal renderer ───────────────────────────────────────────────────────
let createPortal = null;
if (Platform.OS === 'web') {
  try { createPortal = require('react-dom').createPortal; } catch (_) {}
}

const VideoEl = (props) => createElement('video', props);

// ── Player inner content (shared between web portal and native) ───────────────
function PlayerContent({ spotlight, currentIdx, progress, onClose, onNext, onPrev, videoRef }) {
  const accent = spotlight.accentColor || '#C4781A';
  const video  = spotlight.videos[currentIdx];

  return (
    <>
      {/* Video */}
      <VideoEl
        key={video.url}
        ref={videoRef}
        src={video.url}
        autoPlay
        playsInline
        loop={false}
        onEnded={onNext}
        onTimeUpdate={(e) => {
          const el = e.target;
          if (el.duration) progress.set(el.currentTime / el.duration);
        }}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          objectFit: 'contain', backgroundColor: '#000',
        }}
      />

      {/* Top gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 200,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Bottom gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 320,
        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Progress bar */}
      <div style={{
        position: 'absolute', top: 48, left: 16, right: 16,
        display: 'flex', gap: 4, pointerEvents: 'none',
      }}>
        {spotlight.videos.map((_, i) => {
          const fill = i < currentIdx ? 100 : i === currentIdx ? Math.round(progress.val * 100) : 0;
          return (
            <div key={i} style={{
              flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.28)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                width: fill + '%', height: '100%',
                backgroundColor: accent, borderRadius: 2,
                transition: fill === 0 || fill === 100 ? 'none' : 'width 0.5s linear',
              }} />
            </div>
          );
        })}
      </div>

      {/* Brand badge + name */}
      <div style={{
        position: 'absolute', top: 64, left: 16,
        display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, backgroundColor: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: '#fff', fontWeight: 700,
        }}>✦</div>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: 0.3 }}>
          {spotlight.brandName}
        </span>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 58, right: 16,
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: 'rgba(0,0,0,0.55)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 16, fontWeight: 600,
          zIndex: 10,
        }}
      >✕</button>

      {/* Bottom text */}
      <div style={{
        position: 'absolute', bottom: 44, left: 20, right: 20,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
      }}>
        <div style={{
          alignSelf: 'flex-start',
          backgroundColor: accent,
          borderRadius: 20, padding: '4px 10px',
          fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: 1.4,
        }}>
          BRAND SPOTLIGHT
        </div>
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.65)',
          borderRadius: 10, padding: '10px 14px',
        }}>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>
            {video.title}
          </div>
          {video.subtitle && (
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>
              {video.subtitle}
            </div>
          )}
        </div>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {spotlight.videos.map((_, i) => (
            <div key={i} style={{
              height: 6, borderRadius: 3,
              width: i === currentIdx ? 18 : 6,
              backgroundColor: i === currentIdx ? accent : 'rgba(255,255,255,0.35)',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>
      </div>

      {/* Tap zones */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
        <div style={{ width: '30%', height: '100%', cursor: 'pointer' }} onClick={onPrev} />
        <div style={{ flex: 1, height: '100%', cursor: 'pointer' }} onClick={onNext} />
      </div>
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function BrandSpotlightPlayer({ spotlight, startIndex = 0, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [progVal, setProgVal]        = useState(0);
  const videoRef = useRef(null);

  // progress as a ref-like object so PlayerContent can set it
  const progress = { val: progVal, set: setProgVal };

  useEffect(() => {
    setProgVal(0);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentIdx]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, []);

  const goNext  = () => currentIdx < spotlight.videos.length - 1 ? setCurrentIdx(i => i + 1) : onClose?.();
  const goPrev  = () => currentIdx > 0 && setCurrentIdx(i => i - 1);

  // ── Web: render as a true fixed portal into body ──────────────────────────
  if (Platform.OS === 'web' && createPortal) {
    const portalContent = (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#000', zIndex: 999999,
        overflow: 'hidden',
      }}>
        <PlayerContent
          spotlight={spotlight}
          currentIdx={currentIdx}
          progress={progress}
          onClose={onClose}
          onNext={goNext}
          onPrev={goPrev}
          videoRef={videoRef}
        />
      </div>
    );
    return createPortal(portalContent, document.body);
  }

  // ── Native fallback ───────────────────────────────────────────────────────
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 40 }}>
          {spotlight.videos[currentIdx].title}
        </Text>
      </View>
    </View>
  );
}
