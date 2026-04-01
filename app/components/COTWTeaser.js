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

function getActiveCigar() {
  const now = new Date();
  const aprilFirst = new Date('2026-04-01T00:00:00');
  return now >= aprilFirst ? 'april' : 'march';
}

const CIGARS = {
  march: {
    month:    'MARCH 2026',
    name:     'E.P. Carrillo Allegiance',
    subtitle: 'Dominican Republic · Ecuadorian Habano',
    trackId:  'ep_carrillo_allegiance',
    link:     'https://www.cigarsinternational.com/p/e-p-carrillo-allegiance/2051086/',
    image:    require('../../assets/ep-carrillo-allegiance.jpg'),
    imageTransform: [{ rotate: '-90deg' }],
    body: [
      'Ernesto Perez-Carrillo has been on an absolute tear, and the Allegiance might be his boldest statement yet. Built in his Tabacalera La Alianza factory in the Dominican Republic, this cigar features a lush Ecuadorian Habano wrapper that delivers a golden, toasty sweetness from the first light. Expect layers of roasted almond, baking spice, and a creamy cedar finish that lingers long after the final draw.',
      'Medium-to-full in body, the Allegiance is approachable enough for someone stepping up from milder smokes, while rewarding experienced palates with nuance and balance. The green-and-gold band signals something special — and the cigar lives up to the presentation. If you haven\'t explored E.P. Carrillo yet, this is your invitation.',
    ],
  },
  april: {
    month:    'APRIL 2026',
    name:     'My Father Le Bijou 1922',
    subtitle: 'Nicaragua · Habano Oscuro',
    trackId:  'my_father_le_bijou_1922',
    link:     'https://www.cigarsinternational.com/p/my-father-le-bijou-1922-cigars/1411599/',
    image:    require('../../assets/my-father-les-bijoux-1922.png'),
    imageTransform: [{ rotate: '90deg' }, { scale: 1.4 }],
    body: [
      'When Pepín García named this cigar "Le Bijou" — French for "The Jewel" — he wasn\'t being modest. He was paying tribute to his father, Bienvenido García, born in 1922, and the result is arguably the most decorated cigar in modern premium history. Introduced in 2009 and rolled entirely from tobacco grown on the García family\'s private farms in Nicaragua\'s Jalapa and Estelí valleys, this is a true family puro through and through.',
      'The dark, oily Habano Oscuro wrapper — a rare pelo de oro varietal once considered the ancestor of modern corojo, and notoriously difficult to grow — sets the tone from the moment it\'s in your hand. Light it and you\'re met with a signature Pepín pepper blast that quickly gives way to rich dark chocolate, espresso, and black cherry sweetness. Through the middle, vanilla and cream emerge alongside a tiramisu-like quality that few cigars in the world can match. The final third delivers earthy cedar and lingering coffee, closing with a long, smoky finish.',
      'Cigar Aficionado named it the #1 Cigar of the Year in 2015 with a 97-point rating — the second time the García family claimed that title. If there\'s a jewel in the crown of Nicaraguan tobacco, this is it.',
    ],
  },
};

export default function COTWTeaser() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const isMobile  = width < 600;

  const cigar = CIGARS[getActiveCigar()];

  const handleGetYours = () => {
    if (Platform.OS === 'web') {
      window.open(cigar.link, '_blank');
    } else {
      Linking.openURL(cigar.link);
    }

    const trackClick = async () => {
      try {
        const userId   = auth.currentUser?.uid || 'anonymous';
        const clickRef = doc(db, 'cotm_clicks', cigar.trackId);
        await setDoc(clickRef, {
          totalClicks:   increment(1),
          lastClickedAt: new Date().toISOString(),
        }, { merge: true });
        const userClickRef = doc(db, 'cotm_clicks', cigar.trackId, 'users', userId);
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
        <Text style={styles.badgeText}>{cigar.month}</Text>
      </View>

      <View style={styles.header}>
        <Icon name="trophy" size={28} color="#D4AF37" />
        <Text style={styles.title}>Cigar of the Month</Text>
      </View>

      <View style={[styles.contentRow, isMobile && styles.contentRowMobile]}>
        <View style={[styles.imageContainer, isMobile && styles.imageContainerMobile]}>
          <Image
            source={cigar.image}
            style={[styles.cigarImage, { transform: cigar.imageTransform }]}
            resizeMode="contain"
          />
        </View>

        <View style={[styles.writeupContainer, isMobile && styles.writeupContainerMobile]}>
          <Text style={styles.cigarName}>{cigar.name}</Text>
          <Text style={styles.cigarSubtitle}>{cigar.subtitle}</Text>
          {cigar.body.map((para, i) => (
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
    width: 160,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageContainerMobile: {
    width: '100%',
    height: 300,
    marginBottom: 16,
  },
  cigarImage: {
    width: 280,
    height: 160,
    transform: [{ rotate: '-90deg' }],
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
