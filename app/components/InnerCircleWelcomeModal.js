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
    headline: "Welcome to the Inner Circle",
    emoji: "🎖️",
    body: "Congratulations — you've been invited to join an exclusive group of cigar enthusiasts.\n\nThe Inner Circle is reserved for those who truly appreciate the art and culture of cigars.\n\nYou're now part of something special.",
    footer: "Few are chosen. You made the cut."
  },
  {
    id: 2,
    headline: "Premium access, forever",
    emoji: null,
    body: null,
    bullets: [
      { icon: "infinite-outline", text: "Unlimited AI-powered cigar scans" },
      { icon: "chatbubbles-outline", text: "Unlimited comments in the community" },
      { icon: "trophy-outline", text: "Exclusive voting on Cigar of the Week" },
      { icon: "shield-checkmark-outline", text: "Early access to new features" }
    ],
    footer: "All the benefits. No limitations."
  },
  {
    id: 3,
    headline: "You'll never be charged",
    emoji: "✨",
    body: "As an Inner Circle member, you enjoy lifetime Premium access — completely free.\n\nNo subscription fees. Ever.\n\nThis is our way of saying thank you for being part of HUMI from the beginning.",
    footer: null,
    cta: "Enter the Inner Circle"
  }
];

const InnerCircleWelcomeModal = ({ visible, onComplete }) => {
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
              <Icon name={bullet.icon} size={20} color="#D4AF37" />
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
                  <Icon name="chevron-forward" size={20} color="#D4AF37" />
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
    backgroundColor: 'rgba(248, 248, 248, 0.95)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 0,
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' },
      default: {}
    })
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
    backgroundColor: 'rgba(212, 175, 55, 0.3)'
  },
  dotActive: {
    backgroundColor: '#D4AF37',
    width: 24
  },
  cardWrapper: {
    width: '100%'
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 32,
    paddingBottom: 40,
    width: '100%',
    minHeight: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderBottomWidth: 0,
    ...Platform.select({
      web: {
        boxShadow: '0 -4px 20px rgba(212, 175, 55, 0.2)'
      },
      default: {
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10
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
    color: '#D4AF37',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
    color: '#e0e0e0',
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
    color: '#e0e0e0',
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
    borderTopColor: 'rgba(212, 175, 55, 0.3)',
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
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderRadius: 30,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)'
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4AF37'
  },
  ctaButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%'
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center'
  },
  swipeHint: {
    fontSize: 13,
    color: 'rgba(212, 175, 55, 0.5)',
    marginTop: 16
  }
});

export default InnerCircleWelcomeModal;
