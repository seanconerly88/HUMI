import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated, Platform } from 'react-native';

const ROTATING_WORDS = ['enjoy', 'remember', 'relax with'];

const LoadingScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const wordFadeAnim = useRef(new Animated.Value(1)).current;
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(wordFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(wordFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
      }, 200);
    }, 1200);

    return () => clearInterval(interval);
  }, [wordFadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.taglineContainer}>
          <Text style={styles.taglineLine1}>Where cigar people go to</Text>
          <View style={styles.line2Container}>
            <View style={styles.rotatingWordBox}>
              <Animated.Text 
                style={[styles.rotatingWord, { opacity: wordFadeAnim }]}
                numberOfLines={1}
              >
                {ROTATING_WORDS[wordIndex]}
              </Animated.Text>
            </View>
            <Text style={styles.taglineLine2}>their cigars</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  taglineContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  taglineLine1: {
    fontSize: 23,
    color: '#8B4513',
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  line2Container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingWordBox: {
    width: 115,
    height: 30,
    justifyContent: 'center',
    alignItems: 'flex-end',
    overflow: 'hidden',
    marginRight: 5,
  },
  rotatingWord: {
    fontSize: 23,
    color: '#C4884A',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  taglineLine2: {
    fontSize: 23,
    color: '#8B4513',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

export default LoadingScreen;
