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

  const contentWidth = isDesktop ? Math.min(500, width - 48) : width;

  const renderBandCard = (band) => {
    const isExpanded = expandedBand === band.id;

    return (
      <TouchableOpacity
        key={band.id}
        style={[styles.bandCard, isExpanded && styles.bandCardExpanded]}
        onPress={() => setExpandedBand(isExpanded ? null : band.id)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: band.image }}
          style={styles.bandImage}
          resizeMode="contain"
        />

        <Text style={styles.bandName}>{band.name}</Text>

        {isExpanded ? (
          <View style={styles.expandedInfo}>
            <Text style={styles.bandDescription}>{band.description}</Text>
            <View style={styles.earnedRow}>
              <Icon name="checkmark-circle" size={14} color="#8B4513" />
              <Text style={styles.earnedDate}>Earned {band.earnedDate}</Text>
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
          <Text style={styles.headerTitle}>Bands</Text>
          {isDesktop && (
            <Text style={styles.headerSubtitle}>Your trophy case</Text>
          )}
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
        <View style={styles.progressRow}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>{MOCK_BANDS.length} of {MOCK_BANDS.length + LOCKED_BANDS.length} earned</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(MOCK_BANDS.length / (MOCK_BANDS.length + LOCKED_BANDS.length)) * 100}%` }]} />
          </View>
        </View>

        {MOCK_BANDS.map((band) => renderBandCard(band))}

        <View style={styles.lockedSection}>
          <View style={styles.lockedLabelRow}>
            <Icon name="lock-closed" size={14} color="#bbb" />
            <Text style={styles.lockedLabel}>Up Next</Text>
          </View>

          {LOCKED_BANDS.map((band) => (
            <View key={band.name} style={styles.lockedCard}>
              <View style={styles.lockedIcon}>
                <Icon name="ribbon-outline" size={22} color="#ccc" />
              </View>
              <View style={styles.lockedInfo}>
                <Text style={styles.lockedName}>{band.name}</Text>
                <Text style={styles.lockedHint}>{band.hint}</Text>
              </View>
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
    maxWidth: 500,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  scrollContentDesktop: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  progressRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0ebe5',
  },
  progressInfo: {
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f0ebe5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#8B4513',
    borderRadius: 3,
  },
  bandCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0ebe5',
  },
  bandCardExpanded: {
    borderColor: '#8B4513',
  },
  bandImage: {
    width: '90%',
    height: 110,
    marginBottom: 12,
  },
  bandName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.3,
  },
  tapHint: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 4,
  },
  expandedInfo: {
    marginTop: 10,
    alignItems: 'center',
  },
  bandDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  earnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#f5f0eb',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  earnedDate: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '600',
  },
  lockedSection: {
    marginTop: 8,
  },
  lockedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  lockedLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#bbb',
    letterSpacing: 0.3,
  },
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0ebe5',
    opacity: 0.6,
  },
  lockedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f0eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedInfo: {
    marginLeft: 12,
    flex: 1,
  },
  lockedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  lockedHint: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
    fontStyle: 'italic',
  },
});
