import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  Dimensions
} from 'react-native';
import Icon from './Icon';
import EmbeddedCheckoutModal from '../../components/EmbeddedCheckoutModal';
import CreatorWelcomeModal from './CreatorWelcomeModal';
import InnerCircleWelcomeModal from './InnerCircleWelcomeModal';
import LSVWelcomeModal from './LSVWelcomeModal';
import StogieSkoolWelcomeModal from './StogieSkoolWelcomeModal';
import { auth, db } from '../../config/firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { validateReferralCode, recordReferral } from '../../src/services/referralService';
import { activateSubscription } from '../../src/services/subscriptionService';

const { width: screenWidth } = Dimensions.get('window');

const STRIPE_PRICE_IDS = {
  monthly: 'price_1Sn7RG8EMAXqcROYU5RIU2N6',
  yearly: 'price_1Sn7T08EMAXqcROYGK2fyp4V'
};

const VALID_PROMO_CODES = {
  'CREATOR2026':    { type: 'trial',    days: 7,  userType: 'creator' },
  'INNERCIRCLE2026':{ type: 'lifetime',           userType: 'inner_circle' },
  'LSV2026':        { type: 'trial',    days: 7,  userType: 'lsv' },
  'SS2026':         { type: 'trial',    days: 14, userType: 'stogie_skool' },
};

export default function UpgradeModal({ 
  visible, 
  onClose, 
  onUpgradeSuccess,
  triggerReason = 'general',
  scansRemaining = 0,
  commentsRemaining = 0
}) {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCreatorWelcome, setShowCreatorWelcome] = useState(false);
  const [showInnerCircleWelcome, setShowInnerCircleWelcome] = useState(false);
  const [showLSVWelcome, setShowLSVWelcome] = useState(false);
  const [showStogieSkoolWelcome, setShowStogieSkoolWelcome] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeReferralCode, setActiveReferralCode] = useState(null);
  const [referralApplied, setReferralApplied] = useState(false);

  const user = auth.currentUser;

  const getHeadline = () => {
    switch (triggerReason) {
      case 'scan_limit':
        return "You've Used All Your Scans";
      case 'comment_limit':
        return "You've Reached Your Comment Limit";
      default:
        return "Upgrade to HUMI Premium";
    }
  };

  const getSubheadline = () => {
    switch (triggerReason) {
      case 'scan_limit':
        return "Unlock unlimited AI-powered cigar scanning";
      case 'comment_limit':
        return "Join the conversation without limits";
      default:
        return "Get the full HUMI experience";
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a code');
      return;
    }

    setPromoLoading(true);
    setPromoError('');

    try {
      const code = promoCode.trim().toUpperCase();
      
      if (code.startsWith('HUMI-')) {
        const validation = await validateReferralCode(code);
        if (!validation.valid) {
          setPromoError(validation.error);
          setPromoLoading(false);
          return;
        }
        
        setActiveReferralCode(code);
        setReferralApplied(true);
        setSelectedPlan('yearly');
        setPromoError('');
        setShowPromoInput(false);
        setPromoLoading(false);
        return;
      }
      
      const promoConfig = VALID_PROMO_CODES[code];
      
      if (!promoConfig) {
        setPromoError('Invalid code. Please check and try again.');
        setPromoLoading(false);
        return;
      }

      if (!user) {
        setPromoError('Please sign in to use a promo code.');
        setPromoLoading(false);
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : {};

      if (userData.promoCodeUsed) {
        setPromoError('You have already used a promo code.');
        setPromoLoading(false);
        return;
      }

      // Block promo codes for legacy users or paid subscribers
      // Allow promo codes for welcome trial users (they can upgrade via promo)
      if (userData.userType === 'legacy') {
        setPromoError('You already have premium access!');
        setPromoLoading(false);
        return;
      }

      const subRef = doc(db, 'users', user.uid, 'subscription', 'current');
      const subDoc = await getDoc(subRef);
      if (subDoc.exists()) {
        const subData = subDoc.data();
        // Block only active paid subscriptions, not welcome trials
        if (subData.status === 'active') {
          setPromoError('You already have an active subscription.');
          setPromoLoading(false);
          return;
        }
      }

      // Block if user already has lifetime access (from INNERCIRCLE2026)
      if (userData.userType === 'inner_circle' || userData.subscriptionStatus === 'lifetime') {
        setPromoError('You already have lifetime premium access!');
        setPromoLoading(false);
        return;
      }

      if (promoConfig.type === 'trial') {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + promoConfig.days);

        await setDoc(userDocRef, {
          userType: promoConfig.userType,
          tier: 'premium',
          subscriptionStatus: 'trial',
          trialStartDate: new Date().toISOString(),
          trialEndDate: trialEndDate.toISOString(),
          promoCodeUsed: code,
          promoCodeAppliedAt: new Date().toISOString()
        }, { merge: true });

        // Notify GHL so creator attribution is tracked immediately
        fetch('/api/promo/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.uid,
            email: user?.email,
            code,
            userType: promoConfig.userType,
            trialDays: promoConfig.days,
            accessType: 'trial',
            timestamp: new Date().toISOString()
          })
        }).catch(() => {});
        
        setShowPromoInput(false);
        setPromoCode('');
        
        if (promoConfig.userType === 'lsv') {
          setShowLSVWelcome(true);
        } else if (promoConfig.userType === 'stogie_skool') {
          setShowStogieSkoolWelcome(true);
        } else {
          setShowCreatorWelcome(true);
        }
      } else if (promoConfig.type === 'lifetime') {
        await setDoc(userDocRef, {
          userType: promoConfig.userType,
          tier: 'premium',
          subscriptionStatus: 'lifetime',
          lifetimeGrantedAt: new Date().toISOString(),
          promoCodeUsed: code,
          promoCodeAppliedAt: new Date().toISOString()
        }, { merge: true });

        // Notify GHL for lifetime grants too
        fetch('/api/promo/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.uid,
            email: user?.email,
            code,
            userType: promoConfig.userType,
            accessType: 'lifetime',
            timestamp: new Date().toISOString()
          })
        }).catch(() => {});
        
        setShowPromoInput(false);
        setPromoCode('');
        setShowInnerCircleWelcome(true);
      }
      
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoError('Unable to apply code. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleUpgrade = () => {
    setShowCheckoutModal(true);
  };

  const handleCheckoutSuccess = async (sessionId) => {
    setShowCheckoutModal(false);
    
    // Verify payment server-side and write subscription to Firestore
    if (sessionId && user) {
      try {
        const verifyRes = await fetch('/api/stripe/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, userId: user.uid })
        });
        const verifyData = await verifyRes.json();
        
        if (verifyData.verified) {
          // Write subscription to Firestore
          await activateSubscription(user.uid, verifyData.plan, verifyData.subscriptionId);
          // Also update top-level user doc so userType/tier are consistent
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            tier: 'premium',
            subscriptionStatus: 'active',
            stripeSubscriptionId: verifyData.subscriptionId || null,
            subscribedAt: new Date().toISOString(),
            plan: verifyData.plan || selectedPlan
          }, { merge: true });
          console.log('[UpgradeModal] Subscription activated for', user.uid, verifyData.plan);
        } else {
          console.warn('[UpgradeModal] verify-session returned not verified:', verifyData);
        }
      } catch (error) {
        console.error('[UpgradeModal] Error verifying session / writing subscription:', error);
      }
    } else if (!sessionId) {
      console.warn('[UpgradeModal] No sessionId received from checkout - cannot verify payment');
    }
    
    if (activeReferralCode && user) {
      try {
        await recordReferral(activeReferralCode, user.uid, user.email);
        console.log('[UpgradeModal] Referral recorded:', activeReferralCode);
      } catch (error) {
        console.error('[UpgradeModal] Error recording referral:', error);
      }
    }
    
    if (onUpgradeSuccess) {
      onUpgradeSuccess();
    }
    onClose();
  };

  const handleCheckoutClose = () => {
    setShowCheckoutModal(false);
  };

  const handleCreatorWelcomeComplete = () => {
    setShowCreatorWelcome(false);
    if (onUpgradeSuccess) {
      onUpgradeSuccess();
    }
    onClose();
  };

  const handleInnerCircleWelcomeComplete = () => {
    setShowInnerCircleWelcome(false);
    if (onUpgradeSuccess) {
      onUpgradeSuccess();
    }
    onClose();
  };

  const handleLSVWelcomeComplete = () => {
    setShowLSVWelcome(false);
    if (onUpgradeSuccess) {
      onUpgradeSuccess();
    }
    onClose();
  };

  const handleStogieSkoolWelcomeComplete = () => {
    setShowStogieSkoolWelcome(false);
    if (onUpgradeSuccess) {
      onUpgradeSuccess();
    }
    onClose();
  };

  const currentPriceId = selectedPlan === 'yearly' ? STRIPE_PRICE_IDS.yearly : STRIPE_PRICE_IDS.monthly;

  const premiumBenefits = [
    { icon: 'scan-outline', text: 'Unlimited AI Cigar Scans', highlight: triggerReason === 'scan_limit' },
    { icon: 'chatbubbles-outline', text: 'Unlimited Comments', highlight: triggerReason === 'comment_limit' },
    { icon: 'bulb-outline', text: 'HUMI Insights & Recommendations', highlight: false },
    { icon: 'analytics-outline', text: 'Advanced Analytics', highlight: false },
    { icon: 'headset-outline', text: 'Priority Support', highlight: false },
    { icon: 'rocket-outline', text: 'Early Access to New Features', highlight: false }
  ];

  return (
    <>
      <Modal
        visible={visible && !showCheckoutModal && !showCreatorWelcome && !showInnerCircleWelcome && !showLSVWelcome && !showStogieSkoolWelcome}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <ScrollView 
              style={styles.scrollView} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>

              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Icon name="diamond-outline" size={40} color="#8B4513" />
                </View>
                <Text style={styles.headline}>{getHeadline()}</Text>
                <Text style={styles.subheadline}>{getSubheadline()}</Text>
              </View>

              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsTitle}>Premium Includes:</Text>
                {premiumBenefits.map((benefit, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.benefitRow,
                      benefit.highlight && styles.benefitRowHighlight
                    ]}
                  >
                    <Icon 
                      name={benefit.icon} 
                      size={20} 
                      color={benefit.highlight ? '#8B4513' : '#666'} 
                    />
                    <Text style={[
                      styles.benefitText,
                      benefit.highlight && styles.benefitTextHighlight
                    ]}>
                      {benefit.text}
                    </Text>
                    {benefit.highlight && (
                      <View style={styles.highlightBadge}>
                        <Text style={styles.highlightBadgeText}>UNLOCK</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.pricingSection}>
                <TouchableOpacity
                  style={[
                    styles.planCard,
                    selectedPlan === 'monthly' && styles.planCardSelected,
                  ]}
                  onPress={() => setSelectedPlan('monthly')}
                >
                  <View style={styles.radioContainer}>
                    <View style={[
                      styles.radio,
                      selectedPlan === 'monthly' && styles.radioSelected,
                    ]} />
                  </View>
                  <View style={styles.planDetails}>
                    <Text style={styles.planName}>Monthly</Text>
                    <Text style={styles.planPrice}>$5.99/month</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.planCard,
                    selectedPlan === 'yearly' && styles.planCardSelected,
                  ]}
                  onPress={() => setSelectedPlan('yearly')}
                >
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>{referralApplied ? '10% OFF' : 'BEST VALUE'}</Text>
                  </View>
                  <View style={styles.radioContainer}>
                    <View style={[
                      styles.radio,
                      selectedPlan === 'yearly' && styles.radioSelected,
                    ]} />
                  </View>
                  <View style={styles.planDetails}>
                    <Text style={styles.planName}>Yearly</Text>
                    {referralApplied ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.planPrice, { textDecorationLine: 'line-through', color: '#999' }]}>$29.99</Text>
                        <Text style={[styles.planPrice, { color: '#22c55e' }]}>$26.99/year</Text>
                      </View>
                    ) : (
                      <Text style={styles.planPrice}>$29.99/year</Text>
                    )}
                    <Text style={styles.planSubtext}>{referralApplied ? 'Referral discount applied!' : 'Save 58% - Just $2.49/month'}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleUpgrade}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.upgradeButtonText}>
                    Upgrade Now
                  </Text>
                )}
              </TouchableOpacity>

              {!showPromoInput ? (
                <TouchableOpacity
                  style={styles.promoLink}
                  onPress={() => setShowPromoInput(true)}
                >
                  <Icon name="gift-outline" size={18} color="#8B4513" />
                  <Text style={styles.promoLinkText}>Have a promo code?</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.promoSection}>
                  <View style={styles.promoInputRow}>
                    <TextInput
                      style={styles.promoInput}
                      placeholder="Enter code"
                      placeholderTextColor="#999"
                      value={promoCode}
                      onChangeText={(text) => {
                        setPromoCode(text.toUpperCase());
                        setPromoError('');
                      }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.applyButton}
                      onPress={handleApplyPromoCode}
                      disabled={promoLoading}
                    >
                      {promoLoading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.applyButtonText}>Apply</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {promoError ? (
                    <Text style={styles.promoErrorText}>{promoError}</Text>
                  ) : null}
                  <TouchableOpacity onPress={() => {
                    setShowPromoInput(false);
                    setPromoCode('');
                    setPromoError('');
                  }}>
                    <Text style={styles.cancelPromoText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.maybeLaterButton} onPress={onClose}>
                <Text style={styles.maybeLaterText}>Maybe Later</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <EmbeddedCheckoutModal
        visible={showCheckoutModal}
        onClose={handleCheckoutClose}
        onSuccess={handleCheckoutSuccess}
        priceId={currentPriceId}
        userId={user?.uid}
        email={user?.email}
        planName={selectedPlan === 'yearly' ? 'HUMI Premium Yearly' : 'HUMI Premium Monthly'}
        referralCode={activeReferralCode}
      />

      <CreatorWelcomeModal 
        visible={showCreatorWelcome} 
        onComplete={handleCreatorWelcomeComplete} 
      />

      <InnerCircleWelcomeModal 
        visible={showInnerCircleWelcome} 
        onComplete={handleInnerCircleWelcomeComplete} 
      />

      <LSVWelcomeModal 
        visible={showLSVWelcome} 
        onComplete={handleLSVWelcomeComplete} 
      />

      <StogieSkoolWelcomeModal
        visible={showStogieSkoolWelcome}
        onComplete={handleStogieSkoolWelcomeComplete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } : {}),
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f7f2e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headline: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  benefitsSection: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  benefitRowHighlight: {
    backgroundColor: '#f7f2e9',
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  benefitText: {
    fontSize: 15,
    color: '#444',
    marginLeft: 12,
    flex: 1,
  },
  benefitTextHighlight: {
    color: '#8B4513',
    fontWeight: '600',
  },
  highlightBadge: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  highlightBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pricingSection: {
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#8B4513',
    backgroundColor: '#f7f2e9',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: '#8B4513',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  saveBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  radioContainer: {
    marginRight: 14,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: 'white',
  },
  radioSelected: {
    borderColor: '#8B4513',
    backgroundColor: '#8B4513',
  },
  planDetails: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  planSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  promoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  promoLinkText: {
    color: '#8B4513',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 6,
  },
  promoSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  promoInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    backgroundColor: '#f9f9f9',
    letterSpacing: 1,
    textAlign: 'center',
  },
  applyButton: {
    backgroundColor: '#8B4513',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  promoErrorText: {
    color: '#d32f2f',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  cancelPromoText: {
    color: '#666',
    fontSize: 14,
    paddingVertical: 8,
  },
  maybeLaterButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  maybeLaterText: {
    color: '#999',
    fontSize: 15,
  },
});
