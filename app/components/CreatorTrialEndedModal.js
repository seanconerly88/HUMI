import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Icon from './Icon';
import UpgradeModal from './UpgradeModal';

export default function CreatorTrialEndedModal({ visible, onContinueFree, onUpgrade }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleUpgradePress = () => {
    setShowUpgradeModal(true);
  };

  const handleUpgradeSuccess = () => {
    setShowUpgradeModal(false);
    if (onUpgrade) {
      onUpgrade();
    }
  };

  return (
    <>
      <Modal
        visible={visible && !showUpgradeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={onContinueFree}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.iconContainer}>
              <Icon name="gift-outline" size={48} color="#8B4513" />
            </View>

            <Text style={styles.headline}>Your Creator Trial Has Ended</Text>
            
            <Text style={styles.message}>
              Thank you for being part of the HUMI Creator community! Your 7-day trial has concluded. Continue enjoying HUMI on the free tier, or upgrade to Premium for the full experience.
            </Text>

            <View style={styles.comparisonSection}>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>AI Scans</Text>
                <View style={styles.comparisonValues}>
                  <Text style={styles.freeValue}>5/month</Text>
                  <Icon name="arrow-forward" size={14} color="#ccc" />
                  <Text style={styles.premiumValue}>Unlimited</Text>
                </View>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Comments</Text>
                <View style={styles.comparisonValues}>
                  <Text style={styles.freeValue}>10/month</Text>
                  <Icon name="arrow-forward" size={14} color="#ccc" />
                  <Text style={styles.premiumValue}>Unlimited</Text>
                </View>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>HUMI Insights</Text>
                <View style={styles.comparisonValues}>
                  <Text style={styles.freeValue}>Limited</Text>
                  <Icon name="arrow-forward" size={14} color="#ccc" />
                  <Text style={styles.premiumValue}>Full Access</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgradePress}>
              <Icon name="diamond-outline" size={20} color="white" />
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.continueButton} onPress={onContinueFree}>
              <Text style={styles.continueButtonText}>Continue with Free</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              You can upgrade anytime from your profile settings.
            </Text>
          </View>
        </View>
      </Modal>

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgradeSuccess={handleUpgradeSuccess}
        triggerReason="creator_trial_ended"
      />
    </>
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
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f7f2e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headline: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  comparisonSection: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  comparisonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  comparisonValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  freeValue: {
    fontSize: 13,
    color: '#999',
  },
  premiumValue: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '600',
  },
  upgradeButton: {
    backgroundColor: '#8B4513',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  continueButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    width: '100%',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});
