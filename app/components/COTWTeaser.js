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

const CIGAR_LINK = 'https://www.cigarsinternational.com/p/my-father-blue-honduras/2062764/';

export default function COTWTeaser() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const isMobile = width < 600;

  const handleGetYours = () => {
    // Open link immediately (before any async work) to avoid popup blocker
    if (Platform.OS === 'web') {
      window.open(CIGAR_LINK, '_blank');
    } else {
      Linking.openURL(CIGAR_LINK);
    }

    // Track click in background (don't await)
    const trackClick = async () => {
      try {
        const userId = auth.currentUser?.uid || 'anonymous';
        const clickRef = doc(db, 'cotm_clicks', 'my_father_blue');
        
        await setDoc(clickRef, {
          totalClicks: increment(1),
          lastClickedAt: new Date().toISOString(),
        }, { merge: true });

        const userClickRef = doc(db, 'cotm_clicks', 'my_father_blue', 'users', userId);
        await setDoc(userClickRef, {
          clickedAt: new Date().toISOString(),
          userEmail: auth.currentUser?.email || 'anonymous',
        }, { merge: true });

        console.log('[COTM] Click tracked for My Father Blue');
      } catch (error) {
        console.error('[COTM] Error tracking click:', error);
      }
    };
    
    trackClick();
  };

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>FEBRUARY 2025</Text>
      </View>
      
      <View style={styles.header}>
        <Icon name="trophy" size={28} color="#D4AF37" />
        <Text style={styles.title}>Cigar of the Month</Text>
      </View>

      <View style={[styles.contentRow, isMobile && styles.contentRowMobile]}>
        <View style={[styles.imageContainer, isMobile && styles.imageContainerMobile]}>
          <Image
            source={require('../../assets/my-father-blue.png')}
            style={styles.cigarImage}
            resizeMode="contain"
          />
        </View>

        <View style={[styles.writeupContainer, isMobile && styles.writeupContainerMobile]}>
          <Text style={styles.cigarName}>My Father Blue</Text>
          <Text style={styles.cigarSubtitle}>Honduras • CT Broadleaf Rosado</Text>
          
          <Text style={styles.writeup}>
            The first blend from My Father's newly-opened Honduras factory marks a meaningful 
            milestone for the Garcia family. Wrapped in a Connecticut Broadleaf Rosado with 
            Corojo and Criollo long-fillers from their Finca La Opulencia farm, this box-pressed 
            cigar delivers surprising smoothness with layers of cedar, honey, earth, and fruit.
          </Text>
          
          <Text style={styles.writeup}>
            Medium-bodied yet complex, it's approachable enough for newer enthusiasts while 
            offering the depth seasoned smokers appreciate. The blue packaging honors the 
            Honduran flag, and the Roman numerals mark 2025—the year of its distinguished debut.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={handleGetYours}
        activeOpacity={0.8}
      >
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
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainerMobile: {
    width: '100%',
    marginBottom: 16,
  },
  cigarImage: {
    width: 120,
    height: 280,
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
