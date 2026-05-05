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
  month:    'MAY 2026',
  name:     'Oliva Serie V',
  subtitle: 'Nicaragua · Sun-Grown · Full-Bodied',
  trackId:  'oliva_serie_v',
  link:     'https://www.cigarsinternational.com/product/oliva-serie-v/1OB-PM.html',
  image:    require('../../assets/oliva-serie-v.webp'),
  imageTransform: [],
  body: [
    'The numbers don\'t lie: the Oliva Serie V is the most smoked cigar on HUMI so far in 2026. Not a limited edition, not a hyped release — just a cigar that keeps ending up in hands because it keeps delivering. The Oliva family has been growing tobacco since Melanio Oliva worked the fields of Pinar del Río, Cuba in 1886. When revolution forced the family from Cuba in 1964 and again from Nicaragua in 1979, they kept farming. The Serie V is what that century of stubbornness produced — a full Nicaraguan puro built entirely from leaves grown on Oliva\'s own estates in Jalapa and Estelí.',
    'The wrapper is sun-grown Nicaraguan — deep brown, slightly toothy, with the kind of natural oil that tells you what\'s coming. Light it and the first third opens with a wave of dark chocolate and black pepper that\'s bold without being aggressive. Cedar and roasted espresso develop through the middle, and by the final third a natural sweetness emerges that rounds everything out. Construction is flawless. The burn is straight. The draw is effortless. An hour and a half of exactly what a full-bodied Nicaraguan should be.',
    'Cigar Aficionado awarded the Serie V Melanio Figurado 96 points and named it the #1 Cigar of the Year in 2014 — but the standard Serie V is what aficionados actually reach for, month after month, because it delivers that same DNA at an honest price. Your fellow HUMI members have made their preference clear. Now you know why.',
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
