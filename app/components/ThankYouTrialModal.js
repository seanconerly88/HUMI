import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions
} from 'react-native';
import Icon from './Icon';

const { width: screenWidth } = Dimensions.get('window');

const TRIAL_BENEFITS = [
  { 
    icon: 'scan-outline', 
    title: 'Unlimited AI Scans', 
    description: 'Scan as many cigars as you want',
    highlight: true 
  },
  { 
    icon: 'chatbubbles-outline', 
    title: 'Unlimited Comments', 
    description: 'Join every conversation',
    highlight: true 
  },
  { 
    icon: 'bulb-outline', 
    title: 'HUMI Insights', 
    description: 'Get detailed cigar recommendations' 
  },
  { 
    icon: 'analytics-outline', 
    title: 'Advanced Analytics', 
    description: 'Track your smoking journey' 
  },
  { 
    icon: 'headset-outline', 
    title: 'Priority Support', 
    description: 'Get help when you need it' 
  },
  { 
    icon: 'rocket-outline', 
    title: 'Early Access', 
    description: 'Be first to try new features' 
  }
];

export default function ThankYouTrialModal({ visible, onComplete, trialDays = 5 }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onComplete}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Icon name="gift" size={48} color="#8B4513" />
              </View>
              <Text style={styles.headline}>Thank You!</Text>
              <Text style={styles.subheadline}>
                You've been upgraded to Premium for {trialDays} days
              </Text>
            </View>

            <View style={styles.messageBox}>
              <Text style={styles.messageText}>
                As a thank you for being part of the HUMI community, we're giving you full access to all Premium features. Enjoy!
              </Text>
            </View>

            <View style={styles.benefitsSection}>
              <Text style={styles.benefitsTitle}>Here's what you can do now:</Text>
              
              {TRIAL_BENEFITS.map((benefit, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.benefitRow,
                    benefit.highlight && styles.benefitRowHighlight
                  ]}
                >
                  <View style={[
                    styles.benefitIcon,
                    benefit.highlight && styles.benefitIconHighlight
                  ]}>
                    <Icon 
                      name={benefit.icon} 
                      size={22} 
                      color={benefit.highlight ? 'white' : '#8B4513'} 
                    />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={[
                      styles.benefitTitle,
                      benefit.highlight && styles.benefitTitleHighlight
                    ]}>
                      {benefit.title}
                    </Text>
                    <Text style={styles.benefitDescription}>
                      {benefit.description}
                    </Text>
                  </View>
                  {benefit.highlight && (
                    <View style={styles.unlimitedBadge}>
                      <Text style={styles.unlimitedBadgeText}>UNLIMITED</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.trialInfo}>
              <Icon name="time-outline" size={18} color="#666" />
              <Text style={styles.trialInfoText}>
                Your trial ends in {trialDays} days. We'll remind you before it expires.
              </Text>
            </View>

            <TouchableOpacity style={styles.ctaButton} onPress={onComplete}>
              <Text style={styles.ctaButtonText}>Start Exploring</Text>
              <Icon name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } : {}),
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 24,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 420,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f7f2e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 18,
    color: '#8B4513',
    textAlign: 'center',
    fontWeight: '600',
  },
  messageBox: {
    backgroundColor: '#f7f2e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  messageText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    textAlign: 'center',
  },
  benefitsSection: {
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#fafafa',
  },
  benefitRowHighlight: {
    backgroundColor: '#f7f2e9',
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitIconHighlight: {
    backgroundColor: '#8B4513',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  benefitTitleHighlight: {
    color: '#8B4513',
  },
  benefitDescription: {
    fontSize: 13,
    color: '#666',
  },
  unlimitedBadge: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unlimitedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 20,
  },
  trialInfoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  ctaButton: {
    backgroundColor: '#8B4513',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
