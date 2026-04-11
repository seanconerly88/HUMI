// app/components/UnknownCigarModal.js
// Shown when HUMI cannot confidently identify a scanned cigar (Tier 3 < 50% confidence,
// or when a Tier 2 "Possible Match" user taps "Nope, not right").
// Photo is NOT saved to the humidor when this modal appears.
// All interactions here are tracked in the 'unknownScans' Firestore collection.

import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, Image,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import Icon from '../components/Icon';

const BROWN  = '#8B4513';
const CREAM  = '#faf7f3';
const LIGHT  = '#f7f2e9';
const BORDER = '#e0d5c8';
const DARK   = '#1A1A1A';
const MUTED  = '#666666';
const WHITE  = '#ffffff';
const AMBER  = '#C4781A';

export default function UnknownCigarModal({
  visible,
  imageUri,
  possibleName,
  onAddManually,
  onScanAgain,
  onSkip,
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onSkip}
      statusBarTranslucent
    >
      <View style={s.root}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity style={s.skipBtn} onPress={onSkip}>
              <Icon name="close" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Icon */}
          <View style={s.iconWrap}>
            <Text style={s.iconEmoji}>🔍</Text>
          </View>

          {/* Headline */}
          <Text style={s.headline}>HUMI Couldn't{'\n'}Place This One</Text>

          {/* Subline */}
          <Text style={s.sub}>
            {possibleName
              ? `We thought it might be "${possibleName}" but couldn't confirm. This band isn't in our catalog yet.`
              : `This band isn't in our catalog yet — but your scan helps us grow.`}
          </Text>

          {/* Scanned photo */}
          {imageUri ? (
            <View style={s.photoWrap}>
              <Image source={{ uri: imageUri }} style={s.photo} resizeMode="cover" />
              <View style={s.photoBadge}>
                <Text style={s.photoBadgeTxt}>Your scan</Text>
              </View>
            </View>
          ) : null}

          {/* Divider */}
          <View style={s.divider} />

          {/* What happens next */}
          <Text style={s.sectionLabel}>What would you like to do?</Text>

          {/* Actions */}
          <TouchableOpacity style={s.primaryBtn} onPress={onAddManually} activeOpacity={0.85}>
            <Icon name="create-outline" size={18} color={WHITE} />
            <Text style={s.primaryBtnTxt}>Add Manually</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={onScanAgain} activeOpacity={0.85}>
            <Icon name="camera-outline" size={18} color={BROWN} />
            <Text style={s.secondaryBtnTxt}>Scan Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.ghostBtn} onPress={onSkip} activeOpacity={0.7}>
            <Text style={s.ghostBtnTxt}>Skip for Now</Text>
          </TouchableOpacity>

          {/* Footer note */}
          <Text style={s.footerNote}>
            Every unrecognized scan is logged so we can improve HUMI's catalog over time.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CREAM,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  skipBtn: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 16,
  },
  iconWrap: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 18,
  },
  iconEmoji: {
    fontSize: 52,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: DARK,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  sub: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  photoWrap: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: LIGHT,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  photoBadgeTxt: {
    fontSize: 11,
    color: WHITE,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: BROWN,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: BROWN,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  primaryBtnTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: WHITE,
  },
  secondaryBtn: {
    backgroundColor: WHITE,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  secondaryBtnTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: BROWN,
  },
  ghostBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  ghostBtnTxt: {
    fontSize: 14,
    color: MUTED,
    fontWeight: '500',
  },
  footerNote: {
    fontSize: 11.5,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 12,
  },
});
