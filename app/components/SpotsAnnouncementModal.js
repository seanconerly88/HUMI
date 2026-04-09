import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import Icon from './Icon';

const BULLETS = [
  {
    icon: 'search-outline',
    title: 'Find cigar-friendly spots near you',
    body: 'Search by city or zip to discover lounges, bars, and tobacco shops wherever you are.',
  },
  {
    icon: 'checkmark-circle-outline',
    title: 'Check in and log what you\'re smoking',
    body: 'Record your visit, add a vibe, snap a photo, and link it directly to a cigar in your humidor.',
  },
  {
    icon: 'star-outline',
    title: 'Build your personal spot list',
    body: 'Star your favorites so they\'re always one tap away next time you\'re looking for a place to light up.',
  },
];

export default function SpotsAnnouncementModal({ visible, onExplore, onDismiss }) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(60);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <Animated.View style={[s.card, { transform: [{ translateY: slideAnim }] }]}>

          {/* Header */}
          <View style={s.header}>
            <View style={s.iconWrap}>
              <Icon name="lounges" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.eyebrow}>New Feature</Text>
              <Text style={s.title}>Smoke Spots</Text>
            </View>
          </View>

          <Text style={s.subtitle}>
            Your digital cigar lounge just got a map. Here's what's new:
          </Text>

          {/* Bullets */}
          {BULLETS.map((b, i) => (
            <View key={i} style={s.bullet}>
              <View style={s.bulletIcon}>
                <Icon name={b.icon} size={18} color="#8B4513" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.bulletTitle}>{b.title}</Text>
                <Text style={s.bulletBody}>{b.body}</Text>
              </View>
            </View>
          ))}

          {/* CTAs */}
          <TouchableOpacity style={s.primaryBtn} onPress={onExplore} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>Explore Spots</Text>
            <Icon name="arrow-forward-outline" size={16} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={onDismiss} style={s.dismissLink} activeOpacity={0.7}>
            <Text style={s.dismissText}>Maybe later</Text>
          </TouchableOpacity>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingHorizontal: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 20,
    marginBottom: 16,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#8B4513',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B4513',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: 0.2,
  },

  subtitle: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 20,
  },

  // Bullets
  bullet: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  bulletIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fdf3ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  bulletTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 3,
  },
  bulletBody: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: '#8B4513',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dismissLink: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
  },
  dismissText: {
    fontSize: 14,
    color: '#aaa',
  },
});
