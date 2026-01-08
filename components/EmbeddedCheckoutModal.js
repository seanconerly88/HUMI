import React, { useState, useCallback, useEffect } from 'react';
import { View, Modal, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import Icon from '../app/components/Icon';

const EmbeddedCheckoutModal = ({ 
  visible, 
  onClose, 
  onSuccess, 
  priceId, 
  userId, 
  email,
  planName = 'Premium'
}) => {
  const [stripeLoading, setStripeLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stripe, setStripe] = useState(null);

  const loadStripeInstance = async () => {
    try {
      setStripeLoading(true);
      setError(null);
      
      const response = await fetch('/api/stripe/publishable-key');
      
      if (!response.ok) {
        throw new Error('Payment system is temporarily unavailable');
      }
      
      const data = await response.json();
      
      if (!data.publishableKey) {
        throw new Error('Payment configuration is incomplete');
      }
      
      const stripeInstance = await loadStripe(data.publishableKey);
      setStripe(stripeInstance);
      setStripeLoading(false);
    } catch (err) {
      console.error('Failed to load Stripe:', err);
      setError(err.message || 'Failed to initialize payment system');
      setStripeLoading(false);
    }
  };

  useEffect(() => {
    if (visible && !stripe && !error) {
      loadStripeInstance();
    }
  }, [visible]);

  const fetchClientSecret = useCallback(async () => {
    const response = await fetch('/api/stripe/create-embedded-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        priceId,
        userId,
        email
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.clientSecret;
  }, [priceId, userId, email]);

  const handleComplete = useCallback(() => {
    if (onSuccess) {
      onSuccess();
    }
  }, [onSuccess]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Join the HUMI Community</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {error ? (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={48} color="#dc3545" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => {
                setStripe(null);
                setError(null);
                loadStripeInstance();
              }}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : !stripe || stripeLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B4513" />
              <Text style={styles.loadingText}>Loading payment form...</Text>
            </View>
          ) : (
            <View style={styles.checkoutContainer}>
              <EmbeddedCheckoutProvider
                stripe={stripe}
                options={{ 
                  fetchClientSecret,
                  onComplete: handleComplete
                }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'visible',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  closeButton: {
    padding: 4
  },
  checkoutContainer: {
    flex: 1,
    minHeight: 500,
    maxHeight: '100%',
    padding: 16,
    overflow: 'scroll'
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24
  },
  retryButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default EmbeddedCheckoutModal;
