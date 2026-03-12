import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Icon from './Icon';
import { auth } from '../../config/firebaseConfig';
import { getSubscription, isPremium } from '../../src/services/subscriptionService';
import { DEV_MODE_ENABLED } from '../../src/services/devModeData';

const NUDGE_MESSAGE = "There's more to every cigar. Unlock AI flavor analysis, pairing recommendations, and tasting insights with Premium.";

export default function PremiumNudgeCard({ onUpgradePress, refreshKey = 0 }) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkEligibility();
  }, [refreshKey]);

  const checkEligibility = async () => {
    try {
      if (DEV_MODE_ENABLED) {
        setVisible(true);
        setLoading(false);
        return;
      }

      const userId = auth.currentUser?.uid;
      if (!userId) {
        setLoading(false);
        return;
      }

      const subscription = await getSubscription(userId);

      if (isPremium(subscription) || subscription?.plan === 'lifetime') {
        setVisible(false);
        setLoading(false);
        return;
      }

      setVisible(true);
      setLoading(false);
    } catch (error) {
      console.error('[PremiumNudgeCard] Error checking eligibility:', error);
      setLoading(false);
    }
  };

  if (loading || !visible) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.container, isDesktop && styles.containerDesktop]}
      onPress={() => onUpgradePress && onUpgradePress('general')}
      activeOpacity={0.85}
    >
      <View style={styles.accentBar} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="bulb-outline" size={22} color="#8B4513" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>HUMI Premium</Text>
          </View>
        </View>

        <Text style={styles.message}>{NUDGE_MESSAGE}</Text>

        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>See what's included</Text>
          <Icon name="arrow-forward" size={16} color="#8B4513" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0e6d3',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  containerDesktop: {
    maxWidth: 400,
  },
  accentBar: {
    width: 4,
    backgroundColor: '#8B4513',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  content: {
    flex: 1,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#faf5ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  message: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 14,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
  },
});
