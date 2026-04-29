import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Platform } from 'react-native';

const useNative = Platform.OS !== 'web';

// mode='full'   → logo fades in (new users, first load)
// mode='static' → logo immediately visible, no animation (returning users)
const LoadingScreen = ({ mode = 'full' }) => {
  const logoOpacity = useRef(new Animated.Value(mode === 'static' ? 1 : 0)).current;
  const logoY       = useRef(new Animated.Value(mode === 'static' ? 0 : 8)).current;

  useEffect(() => {
    if (mode === 'static') return;
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: useNative,
        }),
        Animated.timing(logoY, {
          toValue: 0,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: useNative,
        }),
      ]).start();
    }, 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoY }] }}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf7f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
});

export default LoadingScreen;
