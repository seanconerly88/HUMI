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

// ─── Date-gated content ────────────────────────────────────────────────────
// Returns 'april' on/after April 1 2026, otherwise 'march'
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
    body: [
      'Ernesto Perez-Carrillo has been on an absolute tear, and the Allegiance might be his boldest statement yet. Built in his Tabacalera La Alianza factory in the Dominican Republic, this cigar features a lush Ecuadorian Habano wrapper that delivers a golden, toasty sweetness from the first light. Expect layers of roasted almond, baking spice, and a creamy cedar finish that lingers long after the final draw.',
      'Medium-to-full in body, the Allegiance is approachable enough for someone stepping up from milder smokes, while rewarding experienced palates with nuance and balance. The green-and-gold band signals something special — and the cigar lives up to the presentation. If you haven\'t explored E.P. Carrillo yet, this is your invitation.',
    ],
  },
  april: {
    month:    'APRIL 2026',
    name:     'My Father Blue',
    subtitle: 'Honduras · Connecticut Broadleaf Rosado',
    trackId:  'my_father_blue_april',
    link:     'https://www.cigarsinternational.com/s/my+father+blue',
    image:    require('../../assets/my-father-blue.png'),
    body: [
      'Every once in a while, a cigar comes along that marks an inflection point — something so different, so memorable, it changes the conversation. Enter My Father Blue, the first-ever blend released from the Garcia family\'s newly opened factory in El Paraíso, Honduras. Wrapped in a lush Connecticut Broadleaf Rosado, it features a Honduran binder and Corojo and Criollo fillers from Finca La Opulencia, the Garcia family\'s first Honduran farm.',
      'If the classic My Father Nicaraguan blends are a bourbon, the Blue is a finely aged Scotch — complex and refined, packed with cedar, honey, earth, and fruit, yet silky enough you\'d almost call it mild. Don Pepín García himself described the Honduran leaf as "like a Cuban cigar from the good times." Try it and see if you agree.',
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

    // Track click in background
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
            style={styles.cigarImage}
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
