import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import Icon, { TabIcon } from './Icon';

const { width: screenWidth } = Dimensions.get('window');

const FEATURE_CARDS = [
  {
    id: 1,
    tabIcon: 'lounge-outline',
    title: 'Your Lounge',
    subtitle: 'Home base for everything cigar',
    body: "Welcome to your personal cigar lounge — a place to kick back, catch up on your latest smokes, and discover something new.\n\nFrom Cigar of the Week picks to AI-curated content tailored just for you, there's always something fresh waiting.",
    footer: "Pull up a chair. You're home.",
    cta: null
  },
  {
    id: 2,
    tabIcon: 'events-outline',
    title: 'Events',
    subtitle: 'Never miss a good time',
    body: "Discover local and national cigar events happening near you.\n\nFrom intimate herf nights to major festivals, we've got you covered. Browse by date, register with a tap, and connect with the community in person.",
    footer: "Great cigars are better together.",
    cta: null
  },
  {
    id: 3,
    tabIcon: 'stories-outline',
    title: 'HUMI Feed',
    subtitle: 'Share the moment',
    body: "This is where the community comes alive. Share your smokes in real-time, see what others are enjoying, and connect over your shared passion.\n\nLike a post, drop a comment, or add someone else's cigar straight to your Humidor — it's that easy.",
    footer: "Real moments. Real enthusiasts.",
    cta: null
  },
  {
    id: 4,
    tabIcon: 'cigar-box-outline',
    title: 'Your Humidor',
    subtitle: 'AI does the work, you enjoy the smoke',
    body: "Snap a photo and let AI take care of the details while you relax.\n\nJust sit back and enjoy the research that AI does for you in seconds. And when you're done, give the AI a thumbs up to help us make the experience even better!",
    footer: "Your collection. Curated by AI.",
    cta: "Log Your First Cigar"
  }
];

const FeatureIntroModal = ({ visible, onComplete, onLogFirstCigar }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  // Reset to first card when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      translateX.setValue(0);
      cardOpacity.setValue(1);
    }
  }, [visible]);

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const handleStateChange = ({ nativeEvent }) => {
    if (nativeEvent.state === State.END) {
      const { translationX: tx, velocityX } = nativeEvent;
      
      const threshold = screenWidth * 0.25;
      const shouldAdvance = tx < -threshold || velocityX < -500;
      const shouldGoBack = tx > threshold || velocityX > 500;

      if (shouldAdvance && currentIndex < FEATURE_CARDS.length - 1) {
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: -screenWidth,
            duration: 200,
            useNativeDriver: true
          }),
          Animated.timing(cardOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true
          })
        ]).start(() => {
          setCurrentIndex(prev => prev + 1);
          translateX.setValue(screenWidth);
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 50,
              friction: 8
            }),
            Animated.timing(cardOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true
            })
          ]).start();
        });
      } else if (shouldGoBack && currentIndex > 0) {
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: screenWidth,
            duration: 200,
            useNativeDriver: true
          }),
          Animated.timing(cardOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true
          })
        ]).start(() => {
          setCurrentIndex(prev => prev - 1);
          translateX.setValue(-screenWidth);
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 50,
              friction: 8
            }),
            Animated.timing(cardOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true
            })
          ]).start();
        });
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8
        }).start();
      }
    }
  };

  const goToNext = () => {
    if (currentIndex < FEATURE_CARDS.length - 1) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -screenWidth,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        })
      ]).start(() => {
        setCurrentIndex(prev => prev + 1);
        translateX.setValue(screenWidth);
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8
          }),
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true
          })
        ]).start();
      });
    }
  };

  const handleCTA = () => {
    const currentCard = FEATURE_CARDS[currentIndex];
    if (currentCard.cta) {
      onLogFirstCigar();
    } else {
      goToNext();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentCard = FEATURE_CARDS[currentIndex];
  const isLastCard = currentIndex === FEATURE_CARDS.length - 1;

  const renderCard = () => (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateX }],
          opacity: cardOpacity
        }
      ]}
    >
      <View style={styles.iconContainer}>
        <TabIcon name={currentCard.tabIcon} size={48} color="#8B4513" />
      </View>
      
      <Text style={styles.title}>{currentCard.title}</Text>
      <Text style={styles.subtitle}>{currentCard.subtitle}</Text>
      
      <Text style={styles.body}>{currentCard.body}</Text>
      
      {currentCard.footer && (
        <Text style={styles.footer}>{currentCard.footer}</Text>
      )}
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
          
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleStateChange}
          >
            <Animated.View style={styles.cardContainer}>
              {renderCard()}
            </Animated.View>
          </PanGestureHandler>
          
          <View style={styles.bottomSection}>
            <View style={styles.dotsContainer}>
              {FEATURE_CARDS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentIndex && styles.dotActive
                  ]}
                />
              ))}
            </View>
            
            <TouchableOpacity
              style={[styles.ctaButton, isLastCard && styles.ctaButtonPrimary]}
              onPress={handleCTA}
              activeOpacity={0.8}
            >
              <Text style={[styles.ctaText, isLastCard && styles.ctaTextPrimary]}>
                {currentCard.cta || 'Next'}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.swipeHint}>Swipe to explore</Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(248, 248, 248, 0.95)',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' },
      default: {}
    })
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20
  },
  skipButton: {
    padding: 8
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)'
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 69, 19, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
    textAlign: 'center',
    marginBottom: 16
  },
  footer: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    marginTop: 8
  },
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: 24
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 24
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4
  },
  dotActive: {
    backgroundColor: '#8B4513',
    width: 24
  },
  ctaButton: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B4513',
    marginBottom: 16
  },
  ctaButtonPrimary: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513'
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8B4513'
  },
  ctaTextPrimary: {
    color: '#fff'
  },
  swipeHint: {
    fontSize: 13,
    color: '#999',
    marginTop: 4
  }
});

export default FeatureIntroModal;
