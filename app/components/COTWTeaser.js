import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Image,
  Linking,
} from 'react-native';
import Icon from './Icon';
import { auth, db } from '../../config/firebaseConfig';
import { doc, setDoc, increment } from 'firebase/firestore';

const CIGAR = {
  month:    'JUNE 2026',
  name:     'Padrón Black PB-99',
  subtitle: 'Nicaragua · Gordo Extra · 6¾" × 60',
  trackId:  'padron_black_pb99',
  link:     'https://www.neptunecigar.com/cigars/padron-black-pb-99-natural-63-4--60',
  image:    require('../../assets/padron-black-pb99.jpg'),
  imageTransform: [],
  body: [
    'José Orlando Padrón founded his company in Miami in 1964 with $600 and a dream. He passed away in 2017, but the family didn\'t let his 99th birthday go unmarked. Unveiled at the 2025 PCA Trade Show and shipping to shops shortly after, the PB-99 is a 6¾" × 60 Gordo Extra — the largest cigar in the Padrón Black series — hand-rolled by the factory\'s most skilled torcedores from exclusive reserves of Nicaraguan tobacco aged specifically for this line.',
    'Pick it up and you\'ll feel the weight before you even cut it: over 26 grams of tightly packed leaf, a dark and oily wrapper rough to the touch like coarse sandpaper. Light it and the first third opens with dense espresso, black pepper, and mineral earth — serious and deliberate, demanding your full attention. The middle mellows into dark cocoa and aged cedar with a dry, smoky sweetness underneath. By the final third, leather and roasted nuts close it out with a long, satisfying finish. Plan for nearly three hours.',
    'Jorge Padrón positioned the Black line between the legendary 1926 Serie and the Family Reserve — not quite the pinnacle, but unquestionably in that conversation. At $44 a cigar, it\'s an occasion smoke. The fact that it honors a man who built one of the most respected names in cigars from nothing makes it worth every minute.',
  ],
};

export default function COTWTeaser() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const isMobile  = width < 600;

  const handleGetYours = () => {
    if (Platform.OS === 'web') {
      window.open(CIGAR.link, '_blank');
    } else {
      Linking.openURL(CIGAR.link);
    }

    const trackClick = async () => {
      try {
        const userId   = auth.currentUser?.uid || 'anonymous';
        const clickRef = doc(db, 'cotm_clicks', CIGAR.trackId);
        await setDoc(clickRef, {
          totalClicks:   increment(1),
          lastClickedAt: new Date().toISOString(),
        }, { merge: true });
        const userClickRef = doc(db, 'cotm_clicks', CIGAR.trackId, 'users', userId);
        await setDoc(userClickRef, {
          clickedAt: new Date().toISOString(),
          userEmail: auth.currentUser?.email || 'anonymous',
        }, { merge: true });
      } catch (error) {
        console.error('[COTM] Error tracking click:', error);
      }
    };
    trackClick();
  };

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{CIGAR.month}</Text>
      </View>

      <View style={styles.header}>
        <Icon name="trophy" size={28} color="#D4AF37" />
        <Text style={styles.title}>Cigar of the Month</Text>
      </View>

      <View style={[styles.contentRow, isMobile && styles.contentRowMobile]}>
        <View style={[styles.imageContainer, isMobile && styles.imageContainerMobile]}>
          <Image
            source={CIGAR.image}
            style={[styles.cigarImage, { transform: CIGAR.imageTransform }]}
            resizeMode="contain"
          />
        </View>

        <View style={[styles.writeupContainer, isMobile && styles.writeupContainerMobile]}>
          <Text style={styles.cigarName}>{CIGAR.name}</Text>
          <Text style={styles.cigarSubtitle}>{CIGAR.subtitle}</Text>
          {CIGAR.body.map((para, i) => (
            <Text key={i} style={styles.writeup}>{para}</Text>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.ctaButton} onPress={handleGetYours} activeOpacity={0.8}>
        <Text style={styles.ctaButtonText}>Get Yours</Text>
        <Icon name="open-outline" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0e6d3',
  },
  containerDesktop: {
    maxWidth: 700,
    alignSelf: 'center',
    marginHorizontal: 0,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#8B4513',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 20,
  },
  contentRowMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  imageContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageContainerMobile: {
    width: '100%',
    height: 260,
    marginBottom: 16,
  },
  cigarImage: {
    width: '100%',
    height: '100%',
  },
  writeupContainer: {
    flex: 1,
  },
  writeupContainerMobile: {
    width: '100%',
  },
  cigarName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  cigarSubtitle: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '500',
    marginBottom: 12,
  },
  writeup: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 12,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B4513',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
