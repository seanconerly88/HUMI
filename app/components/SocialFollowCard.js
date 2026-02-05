import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  useWindowDimensions,
} from 'react-native';
import Icon from './Icon';

const INSTAGRAM_URL = 'https://instagram.com/humi_cigar_community';
const TIKTOK_URL = 'https://tiktok.com/@humi_cigar_community';

export default function SocialFollowCard() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const handleInstagramPress = () => {
    Linking.openURL(INSTAGRAM_URL);
  };

  const handleTikTokPress = () => {
    Linking.openURL(TIKTOK_URL);
  };

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={styles.header}>
        <Text style={styles.title}>Join the Community</Text>
      </View>

      <Text style={styles.description}>
        Follow us for cigar tips, community highlights, and exclusive content.
      </Text>

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleInstagramPress}
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, styles.instagramBg]}>
            <Icon name="logo-instagram" size={24} color="#fff" />
          </View>
          <Text style={styles.buttonText}>Instagram</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleTikTokPress}
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, styles.tiktokBg]}>
            <Icon name="logo-tiktok" size={24} color="#fff" />
          </View>
          <Text style={styles.buttonText}>TikTok</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.handle}>@humi_cigar_community</Text>
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
    alignItems: 'center',
  },
  containerDesktop: {
    maxWidth: 400,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  socialButton: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instagramBg: {
    backgroundColor: '#E4405F',
  },
  tiktokBg: {
    backgroundColor: '#000000',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  handle: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
});
