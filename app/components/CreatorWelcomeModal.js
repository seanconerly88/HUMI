import React, { useState, useRef } from 'react';
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
import Icon from './Icon';

const { width: screenWidth } = Dimensions.get('window');

const CARD_DATA = [
  {
    id: 1,
    headline: "Built by enthusiasts, for enthusiasts",
    emoji: "🔥",
    body: "HUMI was born because nothing like it existed.\n\nWe're cigar lovers who wanted a better way to track, discover, and share our passion — so we built it ourselves.\n\nWelcome to a community that gets it.",
    footer: "Made with love and a lot of smoke."
  },
  {
    id: 2,
    headline: "AI that enhances your experience",
    emoji: null,
    body: null,
    bullets: [
      { icon: "camera-outline", text: "Snap a photo, instantly identify any cigar" },
      { icon: "sparkles-outline", text: "Get tasting notes, pairings, and history" },
      { icon: "library-outline", text: "Build your personal digital humidor" },
      { icon: "people-outline", text: "Connect with fellow enthusiasts" }
    ],
    footer: "Smart technology meets timeless tradition."
  },
  {
    id: 3,
    headline: "7 days on us",
    emoji: "🎁",
    body: "As a creator, you get a full week of HUMI Premium — completely free.\n\nNo credit card required.\nNo strings attached.\nJust pure, premium access.\n\nWe're excited to have you. Enjoy the journey.",
    footer: null,
    cta: "Start Your Free Week"
  }
];

const CreatorWelcomeModal = ({ visible, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

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

      if (shouldAdvance && currentIndex < CARD_DATA.length - 1) {
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
          tension: 100,
          friction: 10
        }).start();
      }
    }
  };

  const goToNext = () => {
    if (currentIndex < CARD_DATA.length - 1) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -screenWidth,
          duration: 250,
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

  const card = CARD_DATA[currentIndex];
  const isLastCard = currentIndex === CARD_DATA.length - 1;

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
      {card.emoji && (
        <Text style={styles.emoji}>{card.emoji}</Text>
      )}
      
      <Text style={styles.headline}>{card.headline}</Text>
      
      {card.body && (
        <Text style={styles.body}>{card.body}</Text>
      )}
      
      {card.bullets && (
        <View style={styles.bulletsContainer}>
          {card.bullets.map((bullet, index) => (
            <View key={index} style={styles.bulletRow}>
              <Icon name={bullet.icon} size={20} color="#8B4513" />
              <Text style={styles.bulletText}>{bullet.text}</Text>
            </View>
          ))}
        </View>
      )}
      
      {card.footer && (
        <Text style={styles.footer}>{card.footer}</Text>
      )}
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <GestureHandlerRootView style={styles.gestureRoot}>
          <View style={styles.container}>
            <View style={styles.dotsContainer}>
              {CARD_DATA.map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.dot,
                    index === currentIndex && styles.dotActive
                  ]} 
                />
              ))}
            </View>
            
            <PanGestureHandler
              onGestureEvent={handleGestureEvent}
              onHandlerStateChange={handleStateChange}
            >
              <Animated.View style={styles.cardWrapper}>
                {renderCard()}
              </Animated.View>
            </PanGestureHandler>
            
            <View style={styles.navigation}>
              {isLastCard ? (
                <TouchableOpacity 
                  style={styles.ctaButton} 
                  onPress={onComplete}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ctaText}>{card.cta}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.nextButton} 
                  onPress={goToNext}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextText}>Continue</Text>
                  <Icon name="chevron-forward" size={20} color="#8B4513" />
                </TouchableOpacity>
              )}
            </View>
            
            {!isLastCard && (
              <Text style={styles.swipeHint}>Swipe to navigate</Text>
            )}
          </View>
        </GestureHandlerRootView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  gestureRoot: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center'
  },
  container: {
    width: '100%',
    alignItems: 'center'
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  },
  dotActive: {
    backgroundColor: '#8B4513',
    width: 24
  },
  cardWrapper: {
    width: '100%'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    minHeight: 380,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20
      }
    })
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
    color: '#444',
    textAlign: 'center'
  },
  bulletsContainer: {
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 8
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12
  },
  bulletText: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  footer: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%'
  },
  navigation: {
    marginTop: 32,
    width: '100%',
    alignItems: 'center'
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 30,
    gap: 8
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  ctaButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%'
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center'
  },
  swipeHint: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 16
  }
});

export default CreatorWelcomeModal;
