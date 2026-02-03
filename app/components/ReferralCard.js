import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Share,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from './Icon';
import { auth } from '../../config/firebaseConfig';
import { getUserReferralCode, getUserReferralStats } from '../../src/services/referralService';

export default function ReferralCard() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  
  const [referralCode, setReferralCode] = useState(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        setLoading(false);
        return;
      }

      const code = await getUserReferralCode(userId);
      setReferralCode(code);

      const stats = await getUserReferralStats(userId);
      setReferralCount(stats.referralCount || 0);
    } catch (error) {
      console.error('[ReferralCard] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!referralCode) return;
    
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(referralCode);
      } else {
        const Clipboard = require('expo-clipboard');
        await Clipboard.setStringAsync(referralCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[ReferralCard] Error copying:', error);
    }
  };

  const handleShare = async () => {
    if (!referralCode) return;

    const message = `Join me in the Digital Cigar Lounge! Use my code ${referralCode} to get 10% off your first year. Download HUMI: https://humi.app`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'Join HUMI - Digital Cigar Lounge',
            text: message,
          });
        } else {
          await navigator.clipboard.writeText(message);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } else {
        await Share.share({
          message: message,
        });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[ReferralCard] Error sharing:', error);
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        <ActivityIndicator size="small" color="#8B4513" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={styles.header}>
        <Icon name="people" size={24} color="#8B4513" />
        <Text style={styles.title}>Grow the Lounge</Text>
      </View>

      <Text style={styles.description}>
        Share HUMI with friends. They save 10% on their first year — you get a free month.
      </Text>

      <View style={styles.codeContainer}>
        <Text style={styles.codeLabel}>Your Code:</Text>
        <View style={styles.codeRow}>
          <Text style={styles.code}>{referralCode || '---'}</Text>
          <TouchableOpacity 
            style={styles.copyButton} 
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            <Icon 
              name={copied ? "checkmark" : "copy"} 
              size={18} 
              color={copied ? "#22c55e" : "#8B4513"} 
            />
            <Text style={[styles.copyText, copied && styles.copiedText]}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {referralCount > 0 && (
        <View style={styles.statsContainer}>
          <Icon name="gift" size={16} color="#666" />
          <Text style={styles.statsText}>
            Friends Invited: {referralCount}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.shareButton}
        onPress={handleShare}
        activeOpacity={0.8}
      >
        <Icon name="share-social" size={20} color="#fff" />
        <Text style={styles.shareButtonText}>Share with Friends</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0e6d3',
  },
  containerDesktop: {
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  codeContainer: {
    backgroundColor: '#faf8f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  code: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0d6c8',
    gap: 6,
  },
  copyText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
  },
  copiedText: {
    color: '#22c55e',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B4513',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
