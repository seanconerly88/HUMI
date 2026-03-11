import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Platform,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import Icon from './components/Icon';

const MOCK_BANDS = [
  {
    id: 'smooth-talker',
    name: 'Smooth Talker',
    description: 'Awarded for sharing your first tasting note with the community.',
    earnedDate: 'February 15, 2026',
    image: '/smooth-talker.png',
    earned: true,
  },
  {
    id: 'the-don',
    name: 'The Don',
    description: 'Earned by logging 25 cigars in your personal humidor.',
    earnedDate: 'January 28, 2026',
    image: '/the-don.png',
    earned: true,
  },
  {
    id: 'the-weekender',
    name: 'The Weekender',
    description: 'Unlocked for logging cigars on 4 consecutive weekends.',
    earnedDate: 'March 1, 2026',
    image: '/the-weekender.png',
    earned: true,
  },
  {
    id: 'first-light',
    name: 'First Light',
    description: 'Every journey starts somewhere.',
    earnedDate: null,
    image: null,
    earned: false,
  },
  {
    id: 'the-connoisseur',
    name: 'The Connoisseur',
    description: 'For the refined palate.',
    earnedDate: null,
    image: null,
    earned: false,
  },
];

export default function BandsScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= 768;
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const stageWidth = isDesktop ? Math.min(480, width - 48) : width;
  const activeBand = MOCK_BANDS[activeIndex];

  const handleScroll = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / stageWidth);
    setActiveIndex(Math.max(0, Math.min(index, MOCK_BANDS.length - 1)));
  };

  const goToIndex = (index) => {
    scrollRef.current?.scrollTo({ x: index * stageWidth, animated: true });
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <View style={isDesktop ? styles.headerInner : undefined}>
          <Text style={styles.headerTitle}>Bands</Text>
          <Text style={styles.headerSubtitle}>
            {MOCK_BANDS.filter(b => b.earned).length} of {MOCK_BANDS.length} earned
          </Text>
        </View>
      </View>

      <View style={[styles.stageContainer, isDesktop && styles.stageContainerDesktop]}>

        {/* Fixed podium — never moves */}
        <View style={styles.podiumWrap} pointerEvents="none">
          <Image
            source={{ uri: '/podium.png' }}
            style={styles.podiumImage}
            resizeMode="contain"
          />
        </View>

        {/* Bands scroll over the podium */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={[styles.bandScroller, { width: stageWidth }]}
          contentContainerStyle={{ alignItems: 'flex-end' }}
          snapToInterval={stageWidth}
          decelerationRate="fast"
        >
          {MOCK_BANDS.map((band) => (
            <View key={band.id} style={[styles.bandSlide, { width: stageWidth }]}>
              {band.earned && band.image ? (
                <Image
                  source={{ uri: band.image }}
                  style={styles.bandImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.lockedBandPlaceholder}>
                  <Icon name="lock-closed" size={32} color="rgba(139,69,19,0.25)" />
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {MOCK_BANDS.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goToIndex(i)}>
              <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Info panel below the podium */}
      <View style={[styles.infoPanel, isDesktop && styles.infoPanelDesktop]}>
        {activeBand.earned ? (
          <>
            <Text style={styles.bandName}>{activeBand.name}</Text>
            <Text style={styles.bandDescription}>{activeBand.description}</Text>
            <View style={styles.earnedPill}>
              <Icon name="checkmark-circle" size={14} color="#8B4513" />
              <Text style={styles.earnedText}>Earned {activeBand.earnedDate}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.bandName, styles.lockedBandName]}>{activeBand.name}</Text>
            <Text style={[styles.bandDescription, styles.lockedBandDescription]}>{activeBand.description}</Text>
            <View style={styles.lockedPill}>
              <Icon name="lock-closed" size={13} color="#bbb" />
              <Text style={styles.lockedPillText}>Not yet earned</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: '#8B4513',
    paddingTop: Platform.OS === 'web' ? 16 : 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerDesktop: {
    paddingTop: 16,
    alignItems: 'center',
  },
  headerInner: {
    maxWidth: 480,
    width: '100%',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  stageContainer: {
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0ebe5',
    paddingBottom: 12,
    height: 300,
    overflow: 'hidden',
  },
  stageContainerDesktop: {
    alignSelf: 'center',
    width: 480,
  },
  podiumWrap: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  podiumImage: {
    width: '55%',
    height: 110,
  },
  bandScroller: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 2,
  },
  bandSlide: {
    height: 300,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 80,
  },
  bandImage: {
    width: '85%',
    height: 100,
    ...(Platform.OS === 'web' ? { mixBlendMode: 'multiply' } : {}),
  },
  lockedBandPlaceholder: {
    width: '85%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.4,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    gap: 6,
    zIndex: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e0d5c9',
  },
  dotActive: {
    backgroundColor: '#8B4513',
    width: 18,
  },
  infoPanel: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0ebe5',
  },
  infoPanelDesktop: {
    maxWidth: 480,
    alignSelf: 'center',
    width: 'calc(100% - 32px)',
  },
  bandName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  lockedBandName: {
    color: '#bbb',
  },
  bandDescription: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },
  lockedBandDescription: {
    color: '#ccc',
    fontStyle: 'italic',
  },
  earnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: '#f5f0eb',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  earnedText: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '600',
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: '#fafafa',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  lockedPillText: {
    fontSize: 12,
    color: '#bbb',
    fontWeight: '600',
  },
});
