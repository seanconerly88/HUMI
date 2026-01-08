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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CARD_DATA = [
  {
    id: 1,
    headline: "Thanks for sticking with Humi",
    emoji: "🤝",
    body: "You're seeing this because you came with us from Apple.\n\nEverything you've logged — your cigars, notes, ratings, and history — is right where you left it.\n\nNothing lost. Nothing reset.",
    footer: "Same Humi. Just evolving."
  },
  {
    id: 2,
    headline: "Humi is becoming a community",
    emoji: null,
    body: null,
    bullets: [
      { icon: "chatbubble-outline", text: "Comment on the HUMI Feed" },
      { icon: "add-circle-outline", text: "Add other members' cigars to your humidor" },
      { icon: "calendar-outline", text: "Discover community events" },
      { icon: "people-outline", text: "More social features coming soon" }
    ],
    footer: "This is Humi moving from a great AI tool → a shared cigar experience."
  },
  {
    id: 3,
    headline: "You're paid for life",
    emoji: "🥃",
    body: "Because you followed Humi from the Apple App Store to our new community platform, your membership is locked in — forever.\n\nNo renewals.\nNo surprise charges.\nNo subscriptions. Ever.\n\nThis is our way of saying thank you for believing early.",
    footer: null,
    cta: "Enter the Humi Community"
  }
];

const LegacyWelcomeModal = ({ visible, onComplete }) => {
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
      
      // Determine if swipe should advance card
      const threshold = screenWidth * 0.25;
      const shouldAdvance = tx < -threshold || velocityX < -500;
      const shouldGoBack = tx > threshold || velocityX > 500;

      if (shouldAdvance && currentIndex < CARD_DATA.length - 1) {
        // Animate out to left, then change card
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
        // Animate out to right, then go back
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
        // Snap back
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
            {/* Progress dots */}
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
            
            {/* Card content with gesture handler */}
            <PanGestureHandler
              onGestureEvent={handleGestureEvent}
              onHandlerStateChange={handleStateChange}
            >
              <Animated.View style={styles.cardWrapper}>
                {renderCard()}
              </Animated.View>
            </PanGestureHandler>
            
            {/* Navigation */}
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
            
            {/* Swipe hint */}
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

export default LegacyWelcomeModal;
