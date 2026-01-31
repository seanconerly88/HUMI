import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Platform,
} from 'react-native';
import Icon from './Icon';

const { width: screenWidth } = Dimensions.get('window');

const WELCOME_SLIDES = [
  {
    id: '1',
    icon: 'home-outline',
    title: 'Welcome, Neighbor!',
    subtitle: 'Lakeshore Village Community',
    description: 'Thank you for being part of our amazing community. As a LSV resident, you get 7 days of full HUMI Premium access.',
  },
  {
    id: '2',
    icon: 'scan-outline',
    title: 'Unlimited AI Scans',
    subtitle: 'Identify Any Cigar',
    description: 'Snap a photo of any cigar and let our AI identify it instantly. Log your smokes, build your collection, and discover new favorites.',
  },
  {
    id: '3',
    icon: 'people-outline',
    title: 'Join the Community',
    subtitle: 'Share Your Experience',
    description: 'Connect with fellow enthusiasts, share your cigar moments in the feed, and explore events happening near you.',
  },
];

export default function LSVWelcomeModal({ visible, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < WELCOME_SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      onComplete();
    }
  };

  const renderSlide = ({ item, index }) => (
    <View style={[styles.slide, { width: screenWidth > 500 ? 400 : screenWidth - 48 }]}>
      <View style={styles.iconContainer}>
        <Icon name={item.icon} size={48} color="#2E7D32" />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {WELCOME_SLIDES.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentIndex && styles.activeDot,
          ]}
        />
      ))}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onComplete}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Icon name="leaf-outline" size={16} color="white" />
              <Text style={styles.badgeText}>LSV EXCLUSIVE</Text>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={WELCOME_SLIDES}
            renderItem={renderSlide}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            style={styles.slideList}
          />

          {renderDots()}

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex < WELCOME_SLIDES.length - 1 ? 'Continue' : 'Start Exploring'}
            </Text>
            <Icon name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>

          <Text style={styles.trialNote}>
            Your 7-day premium trial starts now
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } : {}),
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  slideList: {
    flexGrow: 0,
  },
  slide: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
  },
  slideSubtitle: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  slideDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  activeDot: {
    backgroundColor: '#2E7D32',
    width: 24,
  },
  nextButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  trialNote: {
    fontSize: 13,
    color: '#888',
    marginTop: 16,
    textAlign: 'center',
  },
});
