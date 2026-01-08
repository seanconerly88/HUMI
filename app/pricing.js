// app/pricing.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import Icon from './components/Icon';
import { Linking } from 'react-native';
import { auth } from '../config/firebaseConfig';

let InAppPurchases = null;
if (Platform.OS !== 'web') {
  InAppPurchases = require('expo-in-app-purchases');
}

const STRIPE_PRICE_IDS = {
  monthly: 'price_1Sn7RG8EMAXqcROYU5RIU2N6',
  yearly: 'price_1Sn7T08EMAXqcROYGK2fyp4V'
};

export default function PricingScreen({ onComplete }) {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [loading, setLoading] = useState(false);
  const [isIAPReady, setIsIAPReady] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a code');
      return;
    }

    setPromoLoading(true);
    setPromoError('');

    try {
      const code = promoCode.trim().toUpperCase();
      
      // TODO: Connect to Firestore/Stripe to validate promo codes
      // For now, show a placeholder message
      // Valid codes will be stored in Firestore with their effects:
      // - free_forever: Grant permanent premium access
      // - trial_30: 30-day free trial
      // - discount_50: 50% off first payment
      
      // Placeholder validation - will be replaced with real logic
      Alert.alert(
        'Coming Soon',
        'Promo code redemption will be available soon. Your code has been noted.',
        [{ text: 'OK', onPress: () => setShowPromoModal(false) }]
      );
      
      console.log('Promo code entered:', code);
      
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoError('Unable to validate code. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsIAPReady(true);
      return;
    }

    let purchaseListener;

    const setupIAP = async () => {
      try {
        await InAppPurchases.connectAsync();

        purchaseListener = InAppPurchases.setPurchaseListener(
          async ({ responseCode, results, errorCode }) => {
            console.log('Purchase update:', { responseCode, results, errorCode });

            if (responseCode === InAppPurchases.IAPResponseCode.OK) {
              for (const purchase of results) {
                if (!purchase.acknowledged) {
                  try {
                    console.log('Transaction Receipt:', purchase.transactionReceipt);
                    await InAppPurchases.finishTransactionAsync(purchase, false);
                    console.log('Purchase completed successfully');
                    onComplete();
                  } catch (ackError) {
                    console.error('Error finishing transaction:', ackError);
                  }
                }
              }
            } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
              console.log('User canceled the purchase');
            } else {
              console.error('Purchase failed:', errorCode);
              Alert.alert('Purchase Failed', 'Something went wrong with your purchase. Please try again.');
            }
            setLoading(false);
          }
        );

        setIsIAPReady(true);
        console.log('IAP initialized successfully');
      } catch (error) {
        console.error('Error initializing IAP:', error);
        Alert.alert('Error', 'Failed to initialize purchases. Please restart the app.');
      }
    };

    setupIAP();

    return () => {
      if (purchaseListener) {
        purchaseListener.remove();
      }
      if (InAppPurchases) {
        InAppPurchases.disconnectAsync().catch(e => console.warn('Error disconnecting IAP:', e));
      }
    };
  }, []);

  // Handle Stripe Checkout for web
  const handleStripeCheckout = async () => {
    try {
      setLoading(true);
      
      const priceId = selectedPlan === 'yearly' ? STRIPE_PRICE_IDS.yearly : STRIPE_PRICE_IDS.monthly;
      const user = auth.currentUser;
      
      // Get the base URL for redirects
      const baseUrl = window.location.origin;
      
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priceId,
          userId: user?.uid || '',
          email: user?.email || '',
          successUrl: `${baseUrl}/?success=true`,
          cancelUrl: `${baseUrl}/?canceled=true`
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Stripe checkout error:', error);
      Alert.alert(
        'Error',
        'Unable to start checkout. Please try again.',
        [{ text: 'OK' }]
      );
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    if (loading) return;

    // Use Stripe Checkout for web
    if (Platform.OS === 'web') {
      return handleStripeCheckout();
    }

    // Native IAP for iOS/Android
    try {
      setLoading(true);
      const productId = selectedPlan === 'yearly' ? 'yearly_2999' : 'monthly_599';

      if (!isIAPReady) {
        await InAppPurchases.connectAsync();
        setIsIAPReady(true);
      }

      const { responseCode, results } = await InAppPurchases.getProductsAsync([productId]);
      console.log('Products fetched:', { responseCode, results });

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results?.length > 0) {
        const product = results[0];

        Alert.alert(
          '3-Day Free Trial',
          `Free for 3 days, then ${selectedPlan === 'yearly' ? '$29.99/year' : '$5.99/month'
          }. Cancel at least 24 hours before the trial ends.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            {
              text: 'Continue',
              onPress: async () => {
                try {
                  await InAppPurchases.purchaseItemAsync(productId);
                  onComplete();
                } catch (purchaseError) {
                  Alert.alert('Error', 'Purchase failed. Please try again.');
                  setLoading(false);
                }
              }
            }
          ]
        );

      } else {
        throw new Error('Product not available or could not be fetched');
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      Alert.alert(
        'Error',
        'Unable to start trial. Please ensure you are signed in to the App Store and try again.'
      );
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Web Version',
        'Restore purchases is only available on iOS and Android.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLoading(true);
      if (!isIAPReady) {
        await InAppPurchases.connectAsync();
        setIsIAPReady(true);
      }

      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync(true);
      console.log('Restore results:', { responseCode, results });

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        if (results?.length > 0) {
          const validPurchases = results.filter(p => !p.acknowledged);
          if (validPurchases.length > 0) {
            await Promise.all(
              validPurchases.map(p => InAppPurchases.finishTransactionAsync(p, false))
            );
            Alert.alert('Success', 'Your purchases have been restored!');
            onComplete();
          } else {
            Alert.alert('Info', 'No purchases found to restore.');
          }
        } else {
          Alert.alert('Info', 'No purchases found to restore.');
        }
      } else {
        Alert.alert('Error', 'Could not retrieve purchase history.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases.');
    } finally {
      setLoading(false);
    }
  };

  return (
   <SafeAreaView style={styles.container}>
  <ScrollView contentContainerStyle={styles.scrollContent}>
    <View style={styles.header}>
      <Text style={styles.title}>Start your 3-day FREE trial to continue.</Text>
    </View>

    <View style={styles.timeline}>
      <View style={styles.timelineItem}>
        <View style={[styles.timelineIcon, { backgroundColor: '#8B4513' }]}>
          <Icon name="lock-open" size={20} color="white" />
        </View>
        <View style={styles.timelineContent}>
          <Text style={styles.timelineTitle}>Today</Text>
          <Text style={styles.timelineDescription}>
            Unlock all premium features like AI cigar scanning and more.
          </Text>
        </View>
      </View>

      <View style={styles.timelineItem}>
        <View style={[styles.timelineIcon, { backgroundColor: '#8B4513' }]}>
          <Icon name="notifications" size={20} color="white" />
        </View>
        <View style={styles.timelineContent}>
          <Text style={styles.timelineTitle}>In 2 Days</Text>
          <Text style={styles.timelineDescription}>
            We'll remind you before your trial ends.
          </Text>
        </View>
      </View>

      <View style={styles.timelineItem}>
        <View style={[styles.timelineIcon, { backgroundColor: '#333' }]}>
          <Icon name="card" size={20} color="white" />
        </View>
        <View style={styles.timelineContent}>
          <Text style={styles.timelineTitle}>Day 3</Text>
          <Text style={styles.timelineDescription}>
            Billing begins if not canceled.
          </Text>
        </View>
      </View>
    </View>

    <View style={styles.pricingContainer}>
      <TouchableOpacity
        style={[
          styles.pricingCard,
          selectedPlan === 'monthly' && styles.selectedCard,
        ]}
        onPress={() => setSelectedPlan('monthly')}
      >
        <View style={styles.radioContainer}>
          <View
            style={[
              styles.radio,
              selectedPlan === 'monthly' && styles.radioSelected,
            ]}
          />
        </View>
        <View style={styles.pricingContent}>
          <Text style={styles.planName}>Monthly</Text>
          <Text style={styles.planPrice}>$5.99/month</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.pricingCard,
          styles.yearlyCard,
          selectedPlan === 'yearly' && styles.selectedCard,
        ]}
        onPress={() => setSelectedPlan('yearly')}
      >
        <View style={styles.freeBadge}>
          <Text style={styles.freeBadgeText}>3 DAYS FREE</Text>
        </View>
        <View style={styles.radioContainer}>
          <View
            style={[
              styles.radio,
              selectedPlan === 'yearly' && styles.radioSelected,
            ]}
          />
        </View>
        <View style={styles.pricingContent}>
          <Text style={styles.planName}>Yearly</Text>
          <Text style={styles.planPrice}>$29.99/year</Text>
          <Text style={styles.planSubtext}>Save 58% - $2.49/month</Text>
        </View>
      </TouchableOpacity>
    </View>

    <View style={styles.noPaymentContainer}>
      <Icon name="checkmark" size={20} color="#8B4513" />
      <Text style={styles.noPaymentText}>No Ads - No Payment Now</Text>
    </View>

    <TouchableOpacity
      style={styles.startButton}
      onPress={handleStartTrial}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.startButtonText}>Start Free Trial</Text>
      )}
    </TouchableOpacity>

    <Text style={styles.footerText}>
      3 days free, then {selectedPlan === 'yearly'
        ? '$29.99/year'
        : '$5.99/month'}. Cancel anytime before trial ends.
    </Text>

    <TouchableOpacity
      onPress={handleRestorePurchases}
      style={{ marginTop: 16, alignItems: 'center' }}
      disabled={loading}
    >
      <Text style={{ color: '#8B4513', fontWeight: 'bold', fontSize: 16 }}>
        Restore Purchases
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() => setShowPromoModal(true)}
      style={styles.promoCodeLink}
    >
      <Icon name="gift-outline" size={18} color="#8B4513" />
      <Text style={styles.promoCodeLinkText}>Have a code?</Text>
    </TouchableOpacity>

    <View style={styles.legalLinksContainer}>
      <Text>
        <Text style={styles.legalLinkText} onPress={() => Linking.openURL('https://gethumi.co/privacy-policy')}>
          Privacy Policy
        </Text>
        <Text style={{ color: '#666' }}> | </Text>
        <Text style={styles.legalLinkText} onPress={() => Linking.openURL('https://gethumi.co/terms-and-conditions')}>
          Terms of Use
        </Text>
      </Text>
    </View>
  </ScrollView>

  <Modal
    visible={showPromoModal}
    transparent={true}
    animationType="fade"
    onRequestClose={() => setShowPromoModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Enter Your Code</Text>
          <TouchableOpacity onPress={() => {
            setShowPromoModal(false);
            setPromoCode('');
            setPromoError('');
          }}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.modalDescription}>
          Have a special code? Enter it below to unlock exclusive access.
        </Text>
        
        <TextInput
          style={styles.promoInput}
          placeholder="Enter code (e.g., CREATOR)"
          placeholderTextColor="#999"
          value={promoCode}
          onChangeText={(text) => {
            setPromoCode(text.toUpperCase());
            setPromoError('');
          }}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        
        {promoError ? (
          <Text style={styles.promoErrorText}>{promoError}</Text>
        ) : null}
        
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApplyPromoCode}
          disabled={promoLoading}
        >
          {promoLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.applyButtonText}>Apply Code</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
</SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    lineHeight: 36,
  },
  timeline: {
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  pricingContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  yearlyCard: {
    borderColor: '#8B4513',
    backgroundColor: '#f7f2e9',
  },
  selectedCard: {
    borderColor: '#8B4513',
    backgroundColor: '#f7f2e9',
  },
  freeBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  radioContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: 'white',
  },
  radioSelected: {
    borderColor: '#8B4513',
    backgroundColor: '#8B4513',
  },
  pricingContent: {
    paddingRight: 30,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 2,
  },
  planSubtext: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  noPaymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  noPaymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  legalLinksContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  legalLinkText: {
    color: '#8B4513',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  startButton: {
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  promoCodeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
    padding: 12,
  },
  promoCodeLinkText: {
    color: '#8B4513',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  promoInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
    letterSpacing: 2,
  },
  promoErrorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  applyButton: {
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
