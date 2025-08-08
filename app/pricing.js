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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as InAppPurchases from 'expo-in-app-purchases';
import { Linking } from 'react-native';

export default function PricingScreen({ onComplete }) {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [loading, setLoading] = useState(false);
  const [isIAPReady, setIsIAPReady] = useState(false);

  // Initialize IAP and set up purchase listener
  useEffect(() => {
    let purchaseListener;
    
    const setupIAP = async () => {
      try {
        // Connect to IAP service
        await InAppPurchases.connectAsync();
        
        // Set up purchase listener
        purchaseListener = InAppPurchases.setPurchaseListener(
          async ({ responseCode, results, errorCode }) => {
            console.log('Purchase update:', { responseCode, results, errorCode });
            
            if (responseCode === InAppPurchases.IAPResponseCode.OK) {
              for (const purchase of results) {
                if (!purchase.acknowledged) {
                  try {
                    await InAppPurchases.finishTransactionAsync(purchase, false);
                    console.log('Purchase completed successfully');
                    onComplete(); // Unlock app
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
      InAppPurchases.disconnectAsync().catch(e => console.warn('Error disconnecting IAP:', e));
    };
  }, []);

  const handleStartTrial = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const productId = selectedPlan === 'yearly' ? 'yearly_2999' : 'monthly_5999';
      
      // Ensure IAP is ready
      if (!isIAPReady) {
        await InAppPurchases.connectAsync();
        setIsIAPReady(true);
      }

      // Get product details
      const { responseCode, results } = await InAppPurchases.getProductsAsync([productId]);
      console.log('Products fetched:', { responseCode, results });
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results?.length > 0) {
        const product = results[0];
        
        Alert.alert(
          'Start 3-Day Free Trial',
          `You'll get 3 days of free access to all premium features. After the trial, your subscription will automatically continue for ${
            selectedPlan === 'yearly' ? '$29.99/year' : '$5.99/month'
          } unless canceled at least 24 hours before the trial ends.\n\nPayment will be charged to your iTunes account.`,
          [
            { 
              text: 'Cancel', 
              style: 'cancel',
              onPress: () => setLoading(false)
            },
            { 
              text: 'Continue', 
              onPress: async () => {
                try {
                  console.log('Initiating purchase for:', productId);
                  await InAppPurchases.purchaseItemAsync(productId);
                } catch (purchaseError) {
                  console.error('Purchase initiation failed:', purchaseError);
                  Alert.alert('Error', 'Failed to start purchase. Please try again.');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Start your 3-day FREE trial to continue.</Text>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineIcon, { backgroundColor: '#8B4513' }]}>
              <Ionicons name="lock-open" size={20} color="white" />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Today</Text>
              <Text style={styles.timelineDescription}>
                Unlock all the app's premium features like AI cigar scanning and more.
              </Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={[styles.timelineIcon, { backgroundColor: '#8B4513' }]}>
              <Ionicons name="notifications" size={20} color="white" />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>In 2 Days - Reminder</Text>
              <Text style={styles.timelineDescription}>
                We'll send you a reminder that your trial is ending soon.
              </Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={[styles.timelineIcon, { backgroundColor: '#333' }]}>
              <Ionicons name="card" size={20} color="white" />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>In 3 Days - Billing Starts</Text>
              <Text style={styles.timelineDescription}>
                Your {selectedPlan === 'yearly' ? '$29.99 annual' : '$5.99 monthly'} subscription will begin unless canceled before trial ends.
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing Cards */}
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
              <Text style={styles.planSubtext}>Billed monthly</Text>
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
              <Text style={styles.planSubtext}>Save 58% • $2.49/month</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Feature List */}
        <View style={styles.noPaymentContainer}>
            <Ionicons name="checkmark" size={20} color="#8B4513" />
            <Text style={styles.noPaymentText}>Zero Ads Forever!</Text>
        </View>
        <View style={[styles.noPaymentContainer, { marginTop: -12 }]}>
            <Ionicons name="checkmark" size={20} color="#8B4513" />
            <Text style={styles.noPaymentText}>No Payment Due Now</Text>
        </View>

        {/* Start Trial Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartTrial}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.startButtonText}>Start My 3-Day Free Trial</Text>
          )}
        </TouchableOpacity>

        {/* Footer Text */}
        <Text style={styles.footerText}>
          3 days free, then {selectedPlan === 'yearly' 
            ? '$29.99 billed annually' 
            : '$5.99 billed monthly'}. Cancel anytime before trial ends to avoid charges.
          {"\n\n"}Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.
        </Text>

        {/* Restore Purchases Button */}
        <TouchableOpacity
          onPress={async () => {
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
                    Alert.alert('Info', 'No active purchases found to restore.');
                  }
                } else {
                  Alert.alert('Info', 'No previous purchases found.');
                }
              } else {
                Alert.alert('Error', 'Could not retrieve purchase history. Please try again.');
              }
            } catch (error) {
              console.error('Restore error:', error);
              Alert.alert('Error', 'Failed to restore purchases. Please try again.');
            } finally {
              setLoading(false);
            }
          }}
          style={{ marginTop: 16, alignItems: 'center' }}
          disabled={loading}
        >
          <Text style={{ color: '#8B4513', fontWeight: 'bold', fontSize: 16 }}>
            Restore Purchases
          </Text>
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
    marginBottom: 40,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
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
});