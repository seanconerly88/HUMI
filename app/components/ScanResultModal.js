// app/components/ScanResultModal.js
// The "boom" celebration that fires every time a real cigar scan completes.
// Phase 1 (celebrate): flash + confetti burst + spring card bounce
// Phase 2 (result):    full scrollable result — humiBlurb, notes chips, pairings, "What People Are Saying"

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Image, Platform,
} from 'react-native';
import Icon from '../components/Icon';

// ── Brand tokens ──────────────────────────────────────────────────────────
const BROWN  = '#8B4513';
const CREAM  = '#faf7f3';
const LIGHT  = '#f7f2e9';
const BORDER = '#e0d5c8';
const DARK   = '#1A1A1A';
const MUTED  = '#666666';
const WHITE  = '#ffffff';
const CONFETTI_COLORS = ['#8B4513','#C9983A','#E8C97B','#DEB887','#A0522D','#f7f2e9','#D4956A'];

const PARTICLE_COUNT = 20;

function parseNotes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw.split(',').map(n => n.trim()).filter(Boolean);
}

export default function ScanResultModal({ visible, cigar, onClose, onRate, isPremium = false }) {
  const [phase, setPhase] = useState('celebrate');   // celebrate | result

  // Celebration animations
  const flashAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.55)).current;
  const cardFade  = useRef(new Animated.Value(0)).current;
  const [visibleNotes, setVisibleNotes] = useState(0);

  // Confetti particles (fixed angles so no Math.random in render)
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const dist  = 80 + (i % 4) * 22;
      return {
        tx:    Math.cos(angle) * dist,
        ty:    Math.sin(angle) * dist,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        x:     new Animated.Value(0),
        y:     new Animated.Value(0),
        op:    new Animated.Value(0),
        sc:    new Animated.Value(0),
      };
    })
  ).current;

  useEffect(() => {
    if (!visible || !cigar) return;

    // Reset everything
    setPhase('celebrate');
    setVisibleNotes(0);
    flashAnim.setValue(0);
    cardScale.setValue(0.55);
    cardFade.setValue(0);
    particles.forEach(p => { p.x.setValue(0); p.y.setValue(0); p.op.setValue(0); p.sc.setValue(0); });

    // Flash
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.6, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0,   duration: 380, useNativeDriver: true }),
    ]).start();

    // Card spring
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 75, useNativeDriver: true }),
      Animated.timing(cardFade,  { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();

    // Confetti burst
    Animated.parallel(
      particles.map(p =>
        Animated.parallel([
          Animated.sequence([
            Animated.timing(p.op, { toValue: 1, duration: 80,  useNativeDriver: true }),
            Animated.timing(p.op, { toValue: 0, duration: 500, delay: 120, useNativeDriver: true }),
          ]),
          Animated.timing(p.x, { toValue: p.tx, duration: 620, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: p.ty, duration: 620, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(p.sc, { toValue: 1, duration: 160, useNativeDriver: true }),
            Animated.timing(p.sc, { toValue: 0, duration: 320, delay: 100, useNativeDriver: true }),
          ]),
        ])
      )
    ).start();

    // Tasting note reveal after 900ms
    const noteTimer = setTimeout(() => {
      const notes = parseNotes(cigar?.commonNotes);
      let count = 0;
      const ni = setInterval(() => {
        count++;
        setVisibleNotes(count);
        if (count >= notes.length) clearInterval(ni);
      }, 180);
    }, 900);

    // Auto-advance to full result after 5s
    const phaseTimer = setTimeout(() => setPhase('result'), 5000);

    return () => { clearTimeout(noteTimer); clearTimeout(phaseTimer); };
  }, [visible, cigar]);

  if (!cigar) return null;

  const notes = parseNotes(cigar.commonNotes);

  // ─── Phase 1: Celebration ─────────────────────────────────────────────
  const CelebrationView = (
    <View style={s.celebWrap}>
      {/* Flash */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: WHITE, opacity: flashAnim, zIndex: 20 }]} pointerEvents="none" />

      {/* Close button */}
      <TouchableOpacity style={s.closeBtn} onPress={onClose}>
        <Icon name="close" size={20} color={MUTED} />
      </TouchableOpacity>

      {/* Confetti origin */}
      <View style={s.confettiOrigin} pointerEvents="none">
        {particles.map((p, i) => (
          <Animated.View key={i} style={[s.particle, {
            backgroundColor: p.color,
            opacity: p.op,
            transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.sc }],
          }]} />
        ))}
      </View>

      {/* Bouncing card */}
      <Animated.View style={[s.celebCard, { transform: [{ scale: cardScale }], opacity: cardFade }]}>
        {/* Match badge */}
        <View style={s.matchBadge}>
          <Icon name="checkmark-circle" size={12} color="#2E7D32" />
          <Text style={s.matchTxt}>HUMI Found It</Text>
        </View>

        {/* Cigar photo if available */}
        {cigar.image ? (
          <Image source={{ uri: cigar.image }} style={s.celebImg} resizeMode="cover" />
        ) : null}

        <Text style={s.celebName}>{cigar.cigarName}</Text>

        {isPremium && notes.length > 0 && (
          <View style={s.notesRow}>
            {notes.slice(0, 4).map((n, i) => (
              <View key={n} style={[s.noteChip, { opacity: i < visibleNotes ? 1 : 0 }]}>
                <Text style={s.noteTxt}>{n}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.celebHint}>{isPremium ? 'Scroll for your full profile →' : 'Tap to rate this cigar →'}</Text>
      </Animated.View>
    </View>
  );

  // ─── Phase 2: Full Result ─────────────────────────────────────────────
  const ResultView = (
    <View style={s.resultWrap}>
      {/* Header */}
      <View style={s.resultHeader}>
        <TouchableOpacity style={s.resultClose} onPress={onClose}>
          <Icon name="close" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={s.matchBadge2}>
          <Icon name="checkmark-circle" size={12} color="#2E7D32" />
          <Text style={s.matchTxt}>HUMI Found It</Text>
        </View>
        <Text style={s.resultName}>{cigar.cigarName}</Text>
        {cigar.date ? <Text style={s.resultDate}>{cigar.date}</Text> : null}
      </View>

      <ScrollView style={s.resultScroll} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Cigar photo */}
        {cigar.image ? (
          <Image source={{ uri: cigar.image }} style={s.resultImg} resizeMode="cover" />
        ) : null}

        {isPremium ? (
          <>
            {/* HUMI Says */}
            {cigar.humiBlurb ? (
              <View style={s.card}>
                <Text style={s.cardLabel}>HUMI Says</Text>
                <Text style={s.cardBody}>{cigar.humiBlurb}</Text>
              </View>
            ) : null}

            {/* Tasting Notes */}
            {notes.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardLabel}>Tasting Notes</Text>
                <View style={s.notesRow}>
                  {notes.map(n => (
                    <View key={n} style={s.noteChip}><Text style={s.noteTxt}>{n}</Text></View>
                  ))}
                </View>
              </View>
            )}

            {/* What People Are Saying */}
            {cigar.peopleSaying ? (
              <View style={s.card}>
                <Text style={s.cardLabel}>What People Are Saying</Text>
                <Text style={s.cardBody}>{cigar.peopleSaying}</Text>
              </View>
            ) : null}

            {/* Recommended Pairings */}
            {cigar.recommendedPairings ? (
              <View style={s.card}>
                <Text style={s.cardLabel}>Pairs Well With</Text>
                <Text style={s.cardBody}>{cigar.recommendedPairings}</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {/* Bottom action bar */}
      <View style={s.actionBar}>
        <TouchableOpacity style={s.rateBtn} onPress={onRate}>
          <Icon name="star-outline" size={17} color={WHITE} />
          <Text style={s.rateBtnTxt}>Rate this cigar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.doneBtn} onPress={onClose}>
          <Text style={s.doneBtnTxt}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: CREAM }}>
        {phase === 'celebrate' ? CelebrationView : ResultView}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  // Celebration phase
  celebWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM },
  closeBtn:      { position: 'absolute', top: 50, right: 20, zIndex: 30, padding: 8, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 16 },
  confettiOrigin:{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 0, height: 0, zIndex: 10 },
  particle:      { position: 'absolute', width: 11, height: 11, borderRadius: 6 },
  celebCard: {
    backgroundColor: WHITE, borderRadius: 22, padding: 22,
    marginHorizontal: 24, width: '84%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13, shadowRadius: 24, elevation: 12,
    alignItems: 'flex-start',
  },
  matchBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 9, marginBottom: 12, alignSelf: 'flex-start' },
  matchTxt:      { fontSize: 10, fontWeight: '700', color: '#2E7D32', letterSpacing: 0.4 },
  celebImg:      { width: '100%', height: 140, borderRadius: 10, marginBottom: 13, backgroundColor: LIGHT },
  celebName:     { fontSize: 19, fontWeight: '800', color: DARK, marginBottom: 10, lineHeight: 24 },
  notesRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  noteChip:      { backgroundColor: LIGHT, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 16 },
  noteTxt:       { fontSize: 11, color: BROWN, fontWeight: '600' },
  celebHint:     { fontSize: 11, color: BROWN, fontWeight: '600', opacity: 0.72 },

  // Result phase
  resultWrap:    { flex: 1, backgroundColor: CREAM },
  resultHeader:  { backgroundColor: BROWN, paddingTop: Platform.OS === 'ios' ? 58 : 40, paddingBottom: 22, paddingHorizontal: 22 },
  resultClose:   { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 36, right: 18, padding: 6, zIndex: 2 },
  matchBadge2:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 9, marginBottom: 10, alignSelf: 'flex-start' },
  resultName:    { fontSize: 22, fontWeight: '800', color: WHITE, lineHeight: 28, marginBottom: 4 },
  resultDate:    { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  resultScroll:  { flex: 1 },
  resultImg:     { width: '100%', height: 200, backgroundColor: LIGHT },
  card:          { margin: 13, marginBottom: 9, backgroundColor: WHITE, borderRadius: 13, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardLabel:     { fontSize: 10, fontWeight: '700', color: BROWN, letterSpacing: 1.2, marginBottom: 9, textTransform: 'uppercase' },
  cardBody:      { fontSize: 14, color: '#444', lineHeight: 22 },

  // Action bar
  actionBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER, padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 18, flexDirection: 'row', gap: 10 },
  rateBtn:       { flex: 1, backgroundColor: BROWN, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  rateBtnTxt:    { fontSize: 14, fontWeight: '700', color: WHITE },
  doneBtn:       { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  doneBtnTxt:    { fontSize: 14, fontWeight: '600', color: MUTED },
});
