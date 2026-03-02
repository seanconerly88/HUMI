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

export default function BandsScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= 768;
  const [selectedBand, setSelectedBand] = useState(null);

  const renderBandCard = (band, index) => {
    const isSelected = selectedBand === band.id;

    return (
      <TouchableOpacity
        key={band.id}
        style={[
          styles.bandCard,
          isDesktop && styles.bandCardDesktop,
          isSelected && styles.bandCardSelected,
        ]}
        onPress={() => setSelectedBand(isSelected ? null : band.id)}
        activeOpacity={0.85}
      >
        <View style={styles.bandImageContainer}>
          <Image
            source={{ uri: band.image }}
            style={[styles.bandImage, isDesktop && styles.bandImageDesktop]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.bandInfo}>
          <Text style={styles.bandName}>{band.name}</Text>
          {isSelected && (
            <View style={styles.bandDetails}>
              <Text style={styles.bandDescription}>{band.description}</Text>
              <View style={styles.earnedRow}>
                <Icon name="calendar-outline" size={14} color="#8B4513" />
                <Text style={styles.earnedDate}>{band.earnedDate}</Text>
              </View>
            </View>
          )}
          {!isSelected && (
            <Text style={styles.tapHint}>Tap to view details</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <View style={isDesktop ? styles.headerContentDesktop : undefined}>
          <Text style={[styles.headerTitle, isDesktop && styles.headerTitleDesktop]}>Your Bands</Text>
          <Text style={styles.headerSubtitle}>Your collection of achievements</Text>
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
        <View style={[styles.statsRow, isDesktop && styles.statsRowDesktop]}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{MOCK_BANDS.length}</Text>
            <Text style={styles.statLabel}>Bands Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>

        <View style={[styles.sectionHeader, isDesktop && styles.sectionHeaderDesktop]}>
          <Icon name="ribbon" size={18} color="#8B4513" />
          <Text style={styles.sectionTitle}>Earned Bands</Text>
        </View>

        <View style={isDesktop ? styles.bandsGridDesktop : undefined}>
          {MOCK_BANDS.map((band, index) => renderBandCard(band, index))}
        </View>

        <View style={[styles.lockedSection, isDesktop && styles.lockedSectionDesktop]}>
          <View style={styles.lockedHeader}>
            <Icon name="lock-closed" size={16} color="#bbb" />
            <Text style={styles.lockedTitle}>Locked Bands</Text>
          </View>
          <Text style={styles.lockedSubtitle}>Keep smoking and logging to unlock more</Text>

          {['First Light', 'The Connoisseur', 'Ring Gauge'].map((name) => (
            <View key={name} style={styles.lockedCard}>
              <View style={styles.lockedImagePlaceholder}>
                <Icon name="ribbon-outline" size={32} color="#ddd" />
              </View>
              <View style={styles.lockedInfo}>
                <Text style={styles.lockedName}>{name}</Text>
                <Text style={styles.lockedHint}>???</Text>
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
  headerContentDesktop: {
    maxWidth: 600,
    width: '100%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerTitleDesktop: {
    fontSize: 28,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  scrollContentDesktop: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statsRowDesktop: {
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0ebe5',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#8B4513',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionHeaderDesktop: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.3,
  },
  bandsGridDesktop: {},
  bandCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0ebe5',
  },
  bandCardDesktop: {
    marginBottom: 16,
  },
  bandCardSelected: {
    borderColor: '#8B4513',
    borderWidth: 1.5,
  },
  bandImageContainer: {
    backgroundColor: '#faf7f3',
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  bandImage: {
    width: '100%',
    height: 140,
  },
  bandImageDesktop: {
    height: 180,
  },
  bandInfo: {
    padding: 16,
  },
  bandName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  tapHint: {
    fontSize: 12,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 4,
  },
  bandDetails: {
    marginTop: 10,
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
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  earnedDate: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '600',
  },
  lockedSection: {
    marginTop: 24,
  },
  lockedSectionDesktop: {
    marginTop: 28,
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  lockedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#bbb',
    letterSpacing: 0.3,
  },
  lockedSubtitle: {
    fontSize: 13,
    color: '#ccc',
    marginBottom: 14,
  },
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0ebe5',
    opacity: 0.6,
  },
  lockedImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f0eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedInfo: {
    marginLeft: 14,
    flex: 1,
  },
  lockedName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
  lockedHint: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 2,
  },
});
