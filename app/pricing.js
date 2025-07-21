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

export default function PricingScreen({ onComplete }) {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [loading, setLoading] = useState(false);

  // Set up listener for purchase results
  useEffect(() => {
    const purchaseListener = InAppPurchases.setPurchaseListener(
      ({ responseCode, results, errorCode }) => {
        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          results.forEach(async (purchase) => {
            if (!purchase.acknowledged) {
              console.log('✅ Purchase successful');
              await InAppPurchases.finishTransactionAsync(purchase, false);
              onComplete(); // Unlock app
            }
          });
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('User canceled purchase.');
        } else {
          console.warn('Purchase failed with code:', errorCode);
          Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
        }
      }
    );

    return () => {
      purchaseListener.remove();
    };
  }, []);

  const handleStartTrial = async () => {
    try {
      setLoading(true);
      const productId = selectedPlan === 'yearly' ? 'yearly_2999' : 'monthly_599';
      await InAppPurchases.connectAsync();
      const { responseCode, results } = await InAppPurchases.getProductsAsync([productId]);

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results.length > 0) {
        await InAppPurchases.purchaseItemAsync(productId);
      } else {
        Alert.alert('Error', 'Product not available.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    } finally {
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
                Unlock all the app's features like AI cigar scanning and more.
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
                You'll be charged unless you cancel anytime before.
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
              <Text style={styles.planPrice}>$5.99/mo</Text>
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
              <Text style={styles.planPrice}>$2.49/mo</Text>
              <Text style={styles.planSubtext}>$29.99 billed annually</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* No Payment Due */}
        <View style={styles.noPaymentContainer}>
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
          3 days free, then{' '}
          {selectedPlan === 'yearly'
            ? '$29.99 per year ($2.49/mo)'
            : '$5.99 per month'}
        </Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 2,
  },
  planSubtext: {
    fontSize: 12,
    color: '#666',
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
  startButton: {
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
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
  },
});