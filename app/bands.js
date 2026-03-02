import React, { useState } from 'react';
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
  },
  {
    id: 'the-don',
    name: 'The Don',
    description: 'Earned by logging 25 cigars in your personal humidor.',
    earnedDate: 'January 28, 2026',
    image: '/the-don.png',
  },
  {
    id: 'the-weekender',
    name: 'The Weekender',
    description: 'Unlocked for logging cigars on 4 consecutive weekends.',
    earnedDate: 'March 1, 2026',
    image: '/the-weekender.png',
  },
];

const LOCKED_BANDS = [
  { name: 'First Light', hint: 'Every journey starts somewhere' },
  { name: 'The Connoisseur', hint: 'For the refined palate' },
  { name: 'Ring Gauge', hint: 'Consistency is key' },
];

export default function BandsScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= 768;
  const [expandedBand, setExpandedBand] = useState(null);

  const cardWidth = isDesktop ? Math.min(440, width - 48) : width - 32;

  const renderBandCard = (band) => {
    const isExpanded = expandedBand === band.id;

    return (
      <TouchableOpacity
        key={band.id}
        style={styles.bandCard}
        onPress={() => setExpandedBand(isExpanded ? null : band.id)}
        activeOpacity={0.9}
      >
        <View style={styles.bandDisplayArea}>
          <View style={styles.bandGlow} />
          <Image
            source={{ uri: band.image }}
            style={[styles.bandImage, { width: cardWidth * 0.85 }]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.bandNameRow}>
          <View style={styles.nameLine} />
          <Text style={styles.bandName}>{band.name}</Text>
          <View style={styles.nameLine} />
        </View>

        {isExpanded ? (
          <View style={styles.expandedInfo}>
            <Text style={styles.bandDescription}>{band.description}</Text>
            <View style={styles.earnedPill}>
              <Icon name="checkmark-circle" size={14} color="#C9A96E" />
              <Text style={styles.earnedText}>Earned {band.earnedDate}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.tapHint}>Tap to view</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <View style={isDesktop ? styles.headerInner : undefined}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Trophy Case</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{MOCK_BANDS.length}/{MOCK_BANDS.length + LOCKED_BANDS.length}</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Bands earned through your HUMI journey</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_BANDS.map((band) => renderBandCard(band))}

        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingTitle}>Coming Up</Text>
          <Text style={styles.upcomingSubtitle}>Keep going to unlock these</Text>

          {LOCKED_BANDS.map((band) => (
            <View key={band.name} style={styles.lockedCard}>
              <View style={styles.lockedIconWrap}>
                <Icon name="ribbon-outline" size={24} color="rgba(201,169,110,0.4)" />
              </View>
              <View style={styles.lockedInfo}>
                <Text style={styles.lockedName}>{band.name}</Text>
                <Text style={styles.lockedHint}>{band.hint}</Text>
              </View>
              <Icon name="lock-closed" size={14} color="rgba(255,255,255,0.25)" />
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1410',
  },
  header: {
    backgroundColor: '#1a1410',
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,169,110,0.15)',
  },
  headerDesktop: {
    paddingTop: 20,
    alignItems: 'center',
  },
  headerInner: {
    maxWidth: 440,
    width: '100%',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#C9A96E',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(201,169,110,0.15)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.25)',
  },
  countText: {
    color: '#C9A96E',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  scrollContentDesktop: {
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  bandCard: {
    marginBottom: 28,
    alignItems: 'center',
  },
  bandDisplayArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    width: '100%',
  },
  bandGlow: {
    position: 'absolute',
    width: '70%',
    height: 40,
    bottom: 4,
    backgroundColor: 'rgba(201,169,110,0.08)',
    borderRadius: 100,
    ...(Platform.OS === 'web' ? { filter: 'blur(20px)' } : {}),
  },
  bandImage: {
    height: 120,
  },
  bandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    width: '80%',
  },
  nameLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(201,169,110,0.2)',
  },
  bandName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C9A96E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tapHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  expandedInfo: {
    marginTop: 12,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bandDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 20,
    textAlign: 'center',
  },
  earnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(201,169,110,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.2)',
  },
  earnedText: {
    fontSize: 12,
    color: '#C9A96E',
    fontWeight: '600',
  },
  upcomingSection: {
    marginTop: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(201,169,110,0.1)',
  },
  upcomingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  upcomingSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.15)',
    marginTop: 2,
    marginBottom: 16,
  },
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  lockedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(201,169,110,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedInfo: {
    marginLeft: 14,
    flex: 1,
  },
  lockedName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
  },
  lockedHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.15)',
    marginTop: 2,
    fontStyle: 'italic',
  },
});
