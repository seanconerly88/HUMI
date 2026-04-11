import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Dimensions, Animated, Platform,
} from 'react-native';
import Icon from './Icon';

const { width: screenWidth } = Dimensions.get('window');

const GOLD  = '#C4781A';
const DARK  = '#1a1a1a';
const WHITE = '#ffffff';

const CARDS = [
  {
    id: 1,
    icon: 'school-outline',
    headline: 'Welcome, Stogie School',
    body: 'Your Stogie School 2026 code has been validated.\n\nYou\'ve unlocked 14 days of full HUMI Premium — on us.\n\nLearn, smoke, and explore with everything the app has to offer.',
    footer: 'Class is now in session.',
  },
  {
    id: 2,
    headline: 'Your 14 days includes',
    bullets: [
      { icon: 'infinite-outline',   text: 'Unlimited AI cigar scans' },
      { icon: 'star-outline',       text: 'Full tasting notes & flavor profiles' },
      { icon: 'people-outline',     text: 'What the community is saying' },
      { icon: 'map-outline',        text: 'Smoke Spots — find cigar lounges near you' },
      { icon: 'trophy-outline',     text: 'Your complete smoking profile' },
    ],
    footer: 'No credit card. No commitment.',
    cta: 'Scan Your First Cigar',
  },
];

export default function StogieSkoolWelcomeModal({ visible, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  const animateTo = (nextIndex) => {
    const direction = nextIndex > currentIndex ? -1 : 1;
    Animated.parallel([
      Animated.timing(translateX, { toValue: direction * screenWidth, duration: 220, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setCurrentIndex(nextIndex);
      translateX.setValue(-direction * screenWidth);
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    if (currentIndex < CARDS.length - 1) animateTo(currentIndex + 1);
  };

  const card = CARDS[currentIndex];
  const isLast = currentIndex === CARDS.length - 1;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.dotsRow}>
          {CARDS.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>

        <Animated.View style={[styles.card, { transform: [{ translateX }], opacity: cardOpacity }]}>
          {card.icon && (
            <View style={styles.iconCircle}>
              <Icon name={card.icon} size={36} color={GOLD} />
            </View>
          )}

          <Text style={styles.headline}>{card.headline}</Text>

          {card.body && <Text style={styles.body}>{card.body}</Text>}

          {card.bullets && (
            <View style={styles.bulletList}>
              {card.bullets.map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Icon name={b.icon} size={19} color={GOLD} />
                  <Text style={styles.bulletTxt}>{b.text}</Text>
                </View>
              ))}
            </View>
          )}

          {card.footer && (
            <Text style={styles.footer}>{card.footer}</Text>
          )}
        </Animated.View>

        <View style={styles.nav}>
          {isLast ? (
            <TouchableOpacity style={styles.ctaBtn} onPress={onComplete} activeOpacity={0.85}>
              <Icon name="scan-outline" size={20} color={WHITE} style={{ marginRight: 8 }} />
              <Text style={styles.ctaTxt}>{card.cta}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
              <Text style={styles.nextTxt}>Continue</Text>
              <Icon name="chevron-forward" size={19} color={GOLD} />
            </TouchableOpacity>
          )}
        </View>

        {!isLast && <Text style={styles.swipeHint}>Tap continue to keep reading</Text>}
        {isLast && <View style={styles.swipeHintSpacer} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(248,248,248,0.96)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 0,
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' },
      default: {},
    }),
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: `rgba(196,120,26,0.25)`,
  },
  dotActive: {
    backgroundColor: GOLD, width: 24,
  },
  card: {
    backgroundColor: DARK,
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 32,
    paddingBottom: 44,
    width: '100%',
    maxWidth: 480,
    minHeight: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GOLD,
    borderBottomWidth: 0,
    ...Platform.select({
      web: { boxShadow: `0 -4px 24px rgba(196,120,26,0.22)` },
      default: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 10,
      },
    }),
  },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(196,120,26,0.14)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  headline: {
    fontSize: 23, fontWeight: '800', color: GOLD,
    textAlign: 'center', marginBottom: 18, letterSpacing: -0.3,
  },
  body: {
    fontSize: 15, lineHeight: 25, color: '#d8d8d8', textAlign: 'center',
  },
  bulletList: {
    width: '100%', paddingHorizontal: 4, marginTop: 6,
  },
  bulletRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, gap: 13,
  },
  bulletTxt: {
    fontSize: 15, color: '#e0e0e0', flex: 1,
  },
  footer: {
    fontSize: 13, color: '#777', fontStyle: 'italic',
    textAlign: 'center', marginTop: 24, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(196,120,26,0.25)',
    width: '100%',
  },
  nav: {
    width: '100%', maxWidth: 480,
    paddingHorizontal: 24, paddingVertical: 24,
    backgroundColor: DARK,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 32,
    backgroundColor: 'rgba(196,120,26,0.14)',
    borderRadius: 30, gap: 8,
    borderWidth: 1, borderColor: 'rgba(196,120,26,0.3)',
  },
  nextTxt: { fontSize: 16, fontWeight: '600', color: GOLD },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
    paddingVertical: 17, borderRadius: 14,
    gap: 8,
  },
  ctaTxt: { fontSize: 17, fontWeight: '800', color: WHITE },
  swipeHint: {
    fontSize: 13, color: 'rgba(196,120,26,0.45)',
    paddingBottom: 16, backgroundColor: DARK, width: '100%',
    textAlign: 'center', maxWidth: 480,
  },
  swipeHintSpacer: {
    height: 16, backgroundColor: DARK, width: '100%', maxWidth: 480,
  },
});
