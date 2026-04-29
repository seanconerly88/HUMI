import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing, Platform } from 'react-native';

const LINES = [
  { text: 'Know more.',           color: '#8B4513' },
  { text: 'Remember everything.', color: '#8B4513' },
  { text: 'Smoke better.',        color: '#A0652A' },
];

const useNative = Platform.OS !== 'web';

const LoadingScreen = () => {
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoY        = useRef(new Animated.Value(8)).current;

  const line1Opacity = useRef(new Animated.Value(0)).current;
  const line1Y       = useRef(new Animated.Value(16)).current;
  const line2Opacity = useRef(new Animated.Value(0)).current;
  const line2Y       = useRef(new Animated.Value(16)).current;
  const line3Opacity = useRef(new Animated.Value(0)).current;
  const line3Y       = useRef(new Animated.Value(16)).current;

  const animateIn = (opacity, y) => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: useNative,
      }),
      Animated.timing(y, {
        toValue: 0,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: useNative,
      }),
    ]).start();
  };

  useEffect(() => {
    const t0 = setTimeout(() => animateIn(logoOpacity,  logoY),  300);
    const t1 = setTimeout(() => animateIn(line1Opacity, line1Y), 900);
    const t2 = setTimeout(() => animateIn(line2Opacity, line2Y), 2300);
    const t3 = setTimeout(() => animateIn(line3Opacity, line3Y), 3700);
    return () => [t0, t1, t2, t3].forEach(clearTimeout);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ translateY: logoY }] }]}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.linesWrap}>
        {[
          [line1Opacity, line1Y],
          [line2Opacity, line2Y],
          [line3Opacity, line3Y],
        ].map(([opacity, y], i) => (
          <Animated.Text
            key={LINES[i].text}
            style={[
              styles.line,
              { color: LINES[i].color, opacity, transform: [{ translateY: y }] },
            ]}
          >
            {LINES[i].text}
          </Animated.Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf7f3',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  logoWrap: {
    marginBottom: 44,
  },
  logo: {
    width: 110,
    height: 110,
  },
  linesWrap: {
    alignItems: 'center',
  },
  line: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 12,
  },
});

export default LoadingScreen;
