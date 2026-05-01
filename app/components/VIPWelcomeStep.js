// app/components/VIPWelcomeStep.js
// Personalized welcome card shown after a VIP bypass code is redeemed.
// No payment, no trial counter — just a warm, elegant greeting.

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, Image,
} from 'react-native';

const BROWN  = '#8B4513';
const CREAM  = '#faf7f3';
const LIGHT  = '#f2ece3';
const DARK   = '#1A1A1A';
const MUTED  = '#888888';
const WHITE  = '#ffffff';
const GOLD   = '#C4781A';

export default function VIPWelcomeStep({ onComplete }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={v.screen}>
      <View style={v.outer}>
        <Animated.View style={[v.card, { opacity: fade, transform: [{ translateY: slide }] }]}>

          {/* HUMI mark */}
          <View style={v.humiMark}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={v.humiLogo}
              resizeMode="contain"
            />
          </View>

          {/* Divider above greeting */}
          <View style={v.topRule} />

          {/* The greeting */}
          <Text style={v.greetSmall}>Greetings,</Text>
          <Text style={v.greetLarge}>Mr. Johnson.</Text>

          {/* Divider below greeting */}
          <View style={v.rule} />

          {/* Welcome body */}
          <Text style={v.body}>
            Welcome to HUMI — your complimentary, one-of-a-kind experience. This access was created just for you.
          </Text>

          <Text style={v.body}>
            Explore the Digital Cigar Lounge: log and rate cigars, scan bands with AI, find Smoke Spots near you, and discover what the community is saying.
          </Text>

          <View style={v.noteRow}>
            <View style={v.noteLine} />
            <Text style={v.note}>
              Sean is genuinely excited about what we can build together.
            </Text>
            <View style={v.noteLine} />
          </View>

          {/* Access note */}
          <View style={v.accessBadge}>
            <Text style={v.accessTxt}>✦  48-hour complimentary access  ✦</Text>
          </View>

          {/* CTA */}
          <TouchableOpacity style={v.cta} onPress={onComplete} activeOpacity={0.85}>
            <Text style={v.ctaTxt}>Enter the App  →</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const v = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },
  outer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: WHITE,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 10,
  },

  humiMark: {
    marginBottom: 20,
    alignItems: 'center',
  },
  humiLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },

  topRule: {
    width: 48,
    height: 1,
    backgroundColor: BROWN,
    opacity: 0.25,
    marginBottom: 20,
  },

  greetSmall: {
    fontSize: 22,
    fontWeight: '400',
    color: BROWN,
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 4,
  },
  greetLarge: {
    fontSize: 42,
    fontWeight: '800',
    color: BROWN,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 48,
    marginBottom: 22,
  },

  rule: {
    width: '100%',
    height: 1,
    backgroundColor: '#e8ddd0',
    marginBottom: 22,
  },

  body: {
    fontSize: 15,
    color: '#3a3530',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  noteLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0d5c8',
  },
  note: {
    fontSize: 13,
    color: BROWN,
    fontStyle: 'italic',
    textAlign: 'center',
    flex: 3,
    lineHeight: 20,
  },

  accessBadge: {
    marginBottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(139,69,19,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,69,19,0.18)',
  },
  accessTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: BROWN,
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  cta: {
    backgroundColor: BROWN,
    borderRadius: 14,
    paddingVertical: 17,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
    shadowColor: BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: 0.2,
  },
});
