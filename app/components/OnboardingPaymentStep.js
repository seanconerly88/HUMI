// app/components/OnboardingPaymentStep.js
// Onboarding step 14 — collects payment method via Stripe Payment Element.
// Surfaces Apple Pay / Google Pay when available; falls back to card form.
// Creates a Stripe subscription with trial period — no charge until trial ends.

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { auth } from '../../config/firebaseConfig';
import { ONBOARDING_PROMO_CODES, WELCOME_TRIAL_DAYS } from '../../src/services/subscriptionService';
import Icon from './Icon';

const BROWN  = '#8B4513';
const GOLD   = '#C4781A';
const CREAM  = '#faf7f3';
const LIGHT  = '#f7f2e9';
const BORDER = '#e0d5c8';
const DARK   = '#1A1A1A';
const MUTED  = '#666666';
const WHITE  = '#ffffff';

const STRIPE_MONTHLY_PRICE_ID = 'price_1Sn7RG8EMAXqcROYU5RIU2N6';

// Stripe instance loaded once
let _stripePromise = null;
function getStripe(publishableKey) {
  if (!_stripePromise) _stripePromise = loadStripe(publishableKey);
  return _stripePromise;
}

// ─── Stripe appearance ─────────────────────────────────────────────────────
const STRIPE_APPEARANCE = {
  theme: 'stripe',
  variables: {
    colorPrimary: BROWN,
    colorBackground: WHITE,
    colorText: DARK,
    colorDanger: '#df1b41',
    borderRadius: '12px',
    fontSizeBase: '15px',
    spacingUnit: '4px',
  },
  rules: {
    '.Tab': { border: '1px solid #e0d5c8', boxShadow: 'none' },
    '.Tab:hover': { color: BROWN },
    '.Tab--selected': { borderColor: BROWN, boxShadow: `0 0 0 1px ${BROWN}` },
    '.Input': { border: '1.5px solid #e0d5c8', boxShadow: 'none', padding: '13px 14px' },
    '.Input:focus': { borderColor: BROWN, boxShadow: `0 0 0 1.5px ${BROWN}` },
    '.Label': { fontWeight: '600', color: DARK },
  },
};

// ─── Payment form (uses Stripe hooks — must be inside <Elements>) ───────────
function PaymentForm({ onSuccess, trialDays }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: typeof window !== 'undefined' ? window.location.href : 'https://app.gethumi.co',
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment setup failed. Please try again.');
      setSubmitting(false);
    } else {
      onSuccess();
    }
  };

  return (
    <View style={{ width: '100%' }}>
      <View style={ps.paymentElementWrap}>
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </View>

      {!!error && (
        <View style={ps.errorBanner}>
          <Icon name="alert-circle-outline" size={15} color="#c0392b" />
          <Text style={ps.errorTxt}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[ps.ctaBtn, submitting && ps.ctaBtnOff]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color={WHITE} />
          : <Text style={ps.ctaBtnTxt}>Start my {trialDays}-day free trial</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
// ─── Mock payment form (preview mode only) ────────────────────────────────
function MockPaymentForm({ onSuccess, trialDays }) {
  return (
    <View style={{ width: '100%' }}>
      {/* Mock card input that looks like Stripe's UI */}
      <View style={ps.mockFormWrap}>
        <View style={ps.mockTabRow}>
          <View style={ps.mockTabActive}><Text style={ps.mockTabActiveTxt}>Card</Text></View>
          <View style={ps.mockTab}><Text style={ps.mockTabTxt}>Google Pay</Text></View>
        </View>
        <View style={ps.mockField}>
          <Text style={ps.mockFieldLabel}>Card number</Text>
          <Text style={ps.mockFieldValue}>4242  4242  4242  4242</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={[ps.mockField, { flex: 1 }]}>
            <Text style={ps.mockFieldLabel}>Expiry</Text>
            <Text style={ps.mockFieldValue}>12 / 28</Text>
          </View>
          <View style={[ps.mockField, { flex: 1 }]}>
            <Text style={ps.mockFieldLabel}>CVC</Text>
            <Text style={ps.mockFieldValue}>•••</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={ps.ctaBtn} onPress={onSuccess}>
        <Text style={ps.ctaBtnTxt}>Start my {trialDays}-day free trial</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function OnboardingPaymentStep({
  onComplete,
  appliedPromoCode,
  onPromoApplied,
  previewMode = false,
}) {
  const promoConfig = appliedPromoCode ? ONBOARDING_PROMO_CODES[appliedPromoCode] : null;
  const trialDays   = promoConfig ? promoConfig.days : WELCOME_TRIAL_DAYS;

  const [stripe, setStripe]                   = useState(null);
  const [clientSecret, setClientSecret]       = useState(null);
  const [subscriptionId, setSubscriptionId]   = useState(null);
  const [phase, setPhase]                     = useState(previewMode ? 'preview' : 'loading'); // loading | ready | saving | error | preview
  const [initError, setInitError]             = useState(null);
  const [showPromoModal, setShowPromoModal]   = useState(false);
  const [codeInput, setCodeInput]             = useState('');
  const [promoError, setPromoError]           = useState('');

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!isWeb || previewMode) return;
    initStripeAndSubscription();
  }, [trialDays]);

  const initStripeAndSubscription = async () => {
    setPhase('loading');
    setInitError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not signed in');

      // Load publishable key + Stripe instance in parallel with subscription creation
      const [keyRes, subRes] = await Promise.all([
        fetch('/api/stripe/publishable-key'),
        fetch('/api/stripe/create-trial-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId: STRIPE_MONTHLY_PRICE_ID,
            userId: user.uid,
            email: user.email || undefined,
            trialDays,
          }),
        }),
      ]);

      const { publishableKey } = await keyRes.json();
      const subData = await subRes.json();

      if (subData.error) throw new Error(subData.error);

      const stripeInstance = await getStripe(publishableKey);

      setStripe(stripeInstance);
      setClientSecret(subData.clientSecret);
      setSubscriptionId(subData.subscriptionId);
      setPhase('ready');
    } catch (e) {
      console.error('Payment init error:', e.message);
      setInitError(e.message || 'Could not load payment options. Please try again.');
      setPhase('error');
    }
  };

  const handlePaymentSuccess = async () => {
    setPhase('saving');
    try {
      const user = auth.currentUser;
      if (user && subscriptionId) {
        await fetch('/api/stripe/save-trial-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionId, userId: user.uid }),
        });
      }
    } catch (e) {
      console.error('Save subscription error:', e.message);
    }
    onComplete?.({ skipTrialGrant: true });
  };

  const openPromoModal  = () => { setCodeInput(''); setPromoError(''); setShowPromoModal(true); };
  const closePromoModal = () => { setShowPromoModal(false); setCodeInput(''); setPromoError(''); };

  const handleApplyPromo = () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) { setPromoError('Enter a code first'); return; }
    const config = ONBOARDING_PROMO_CODES[code];
    if (!config) { setPromoError('Code not recognised — check the spelling and try again'); return; }
    onPromoApplied?.(code);
    closePromoModal();
  };

  const trialEndDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + trialDays);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  })();

  const features = [
    { icon: 'infinite-outline', text: 'Unlimited AI cigar scans' },
    { icon: 'star-outline',     text: 'Full flavor profiles & tasting notes' },
    { icon: 'people-outline',   text: 'What the community is saying' },
    { icon: 'map-outline',      text: 'Smoke Spots — cigar-friendly venues near you' },
    { icon: 'trophy-outline',   text: 'Your complete smoking profile' },
  ];

  if (!isWeb) {
    return (
      <View style={ps.unavailableWrap}>
        <Text style={ps.unavailableTxt}>Payment is available on the web app.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: CREAM }}>
      <ScrollView
        contentContainerStyle={ps.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Trial badge */}
        <View style={[ps.badge, promoConfig && ps.badgePromo]}>
          {promoConfig && <Icon name="sparkles-outline" size={12} color={GOLD} />}
          <Text style={[ps.badgeTxt, promoConfig && ps.badgeTxtPromo]}>
            {trialDays} DAYS FREE
          </Text>
          {promoConfig && <Icon name="sparkles-outline" size={12} color={GOLD} />}
        </View>

        {/* Headline */}
        <Text style={ps.headline}>
          Your personal{'\n'}cigar experience{'\n'}starts today
        </Text>
        <Text style={ps.sub}>
          Everything free for {trialDays} days.{'\n'}No charge until {trialEndDate}. Cancel anytime.
        </Text>

        {/* Feature list */}
        <View style={ps.features}>
          {features.map(f => (
            <View key={f.text} style={ps.featureRow}>
              <View style={[ps.featureIcon, promoConfig && ps.featureIconPromo]}>
                <Icon name={f.icon} size={15} color={promoConfig ? GOLD : BROWN} />
              </View>
              <Text style={ps.featureTxt}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={ps.divider} />

        {/* Payment area */}
        {(phase === 'loading' || phase === 'saving') && (
          <View style={ps.phaseCenter}>
            <ActivityIndicator size="small" color={BROWN} />
            <Text style={ps.phaseTxt}>
              {phase === 'saving' ? 'Activating your trial...' : 'Setting up your trial...'}
            </Text>
          </View>
        )}

        {phase === 'error' && (
          <View style={ps.errorWrap}>
            <Text style={ps.errorWrapTxt}>{initError}</Text>
            <TouchableOpacity style={ps.retryBtn} onPress={initStripeAndSubscription}>
              <Text style={ps.retryBtnTxt}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {previewMode && (
          <MockPaymentForm onSuccess={() => onComplete?.({})} trialDays={trialDays} />
        )}

        {!previewMode && phase === 'ready' && stripe && clientSecret && (
          <Elements
            stripe={stripe}
            options={{ clientSecret, appearance: STRIPE_APPEARANCE }}
          >
            <PaymentForm onSuccess={handlePaymentSuccess} trialDays={trialDays} />
          </Elements>
        )}

        {/* Promo code */}
        {!promoConfig ? (
          <TouchableOpacity onPress={openPromoModal} style={ps.promoLink}>
            <Text style={ps.promoLinkTxt}>Have a promo code?</Text>
          </TouchableOpacity>
        ) : (
          <View style={ps.promoApplied}>
            <Icon name="checkmark-circle" size={16} color={GOLD} />
            <Text style={ps.promoAppliedTxt}>
              Code {appliedPromoCode} applied · {trialDays}-day trial
            </Text>
          </View>
        )}

        <Text style={ps.legalTxt}>
          By starting your trial you agree to our Terms of Service.{'\n'}
          Cancel before {trialEndDate} and you won't be charged.
        </Text>
      </ScrollView>

      {/* Promo modal */}
      <Modal visible={showPromoModal} transparent animationType="fade" onRequestClose={closePromoModal}>
        <KeyboardAvoidingView
          style={ps.modalOuter}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closePromoModal} activeOpacity={1} />
          <View style={ps.modalCard}>
            <Text style={ps.modalTitle}>Enter your promo code</Text>
            <TextInput
              style={ps.modalInput}
              placeholder="e.g. SS2026"
              placeholderTextColor={MUTED}
              value={codeInput}
              onChangeText={t => { setCodeInput(t); setPromoError(''); }}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
            {!!promoError && <Text style={ps.modalErr}>{promoError}</Text>}
            <TouchableOpacity style={ps.modalApplyBtn} onPress={handleApplyPromo}>
              <Text style={ps.modalApplyTxt}>Apply Code</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={closePromoModal} style={ps.modalCancel}>
              <Text style={ps.modalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const ps = StyleSheet.create({
  scroll: {
    paddingHorizontal: 26,
    paddingTop: 52,
    paddingBottom: 48,
    alignItems: 'center',
  },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(139,69,19,0.10)', paddingVertical: 6, paddingHorizontal: 18,
    borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(139,69,19,0.22)',
  },
  badgePromo:    { backgroundColor: 'rgba(196,120,26,0.12)', borderColor: 'rgba(196,120,26,0.45)' },
  badgeTxt:      { fontSize: 11, fontWeight: '800', color: BROWN, letterSpacing: 2 },
  badgeTxtPromo: { color: GOLD },

  headline: {
    fontSize: 32, fontWeight: '800', color: DARK,
    textAlign: 'center', lineHeight: 40, marginBottom: 14,
  },
  sub: {
    fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },

  features:        { width: '100%', gap: 13, marginBottom: 28 },
  featureRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon:     { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(139,69,19,0.10)', alignItems: 'center', justifyContent: 'center' },
  featureIconPromo:{ backgroundColor: 'rgba(196,120,26,0.12)' },
  featureTxt:      { fontSize: 14, color: DARK, fontWeight: '500', flex: 1 },

  divider: { width: '100%', height: 1, backgroundColor: BORDER, marginBottom: 24 },

  phaseCenter: { alignItems: 'center', paddingVertical: 28, gap: 10, width: '100%' },
  phaseTxt:    { fontSize: 13, color: MUTED },

  errorWrap:    { alignItems: 'center', paddingVertical: 20, width: '100%' },
  errorWrapTxt: { fontSize: 14, color: '#c0392b', textAlign: 'center', marginBottom: 16 },
  retryBtn:     { backgroundColor: BROWN, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  retryBtnTxt:  { color: WHITE, fontWeight: '700', fontSize: 15 },

  paymentElementWrap: { width: '100%', marginBottom: 16 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12, marginBottom: 12, width: '100%',
  },
  errorTxt: { fontSize: 13, color: '#c0392b', flex: 1 },

  ctaBtn: {
    backgroundColor: BROWN, borderRadius: 14, padding: 18,
    alignItems: 'center', width: '100%',
    shadowColor: BROWN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24, shadowRadius: 10, elevation: 5, marginBottom: 16,
  },
  ctaBtnOff: { opacity: 0.55 },
  ctaBtnTxt: { fontSize: 16, fontWeight: '800', color: WHITE },

  promoLink:      { alignItems: 'center', paddingVertical: 10 },
  promoLinkTxt:   { fontSize: 14, color: BROWN, fontWeight: '600' },
  promoApplied:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(196,120,26,0.10)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginTop: 4 },
  promoAppliedTxt:{ fontSize: 14, fontWeight: '600', color: GOLD },

  legalTxt: {
    fontSize: 11, color: MUTED, textAlign: 'center',
    lineHeight: 17, marginTop: 18, paddingHorizontal: 8,
  },

  unavailableWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  unavailableTxt:  { fontSize: 15, color: MUTED },

  mockFormWrap: {
    width: '100%', borderWidth: 1.5, borderColor: BORDER, borderRadius: 12,
    overflow: 'hidden', marginBottom: 16, backgroundColor: WHITE,
  },
  mockTabRow:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  mockTabActive:    { paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: BROWN },
  mockTabActiveTxt: { fontSize: 14, fontWeight: '700', color: BROWN },
  mockTab:          { paddingVertical: 12, paddingHorizontal: 20 },
  mockTabTxt:       { fontSize: 14, color: MUTED },
  mockField:        { padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  mockFieldLabel:   { fontSize: 11, fontWeight: '600', color: MUTED, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 },
  mockFieldValue:   { fontSize: 15, color: DARK, fontFamily: 'monospace' },

  modalOuter: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%', backgroundColor: WHITE, borderRadius: 18, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 12,
  },
  modalTitle:     { fontSize: 17, fontWeight: '800', color: DARK, marginBottom: 16, textAlign: 'center' },
  modalInput:     { borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, paddingVertical: 13, paddingHorizontal: 14, fontSize: 16, color: DARK, backgroundColor: CREAM, letterSpacing: 1, marginBottom: 6 },
  modalErr:       { fontSize: 12, color: '#c0392b', textAlign: 'center', marginBottom: 8 },
  modalApplyBtn:  { backgroundColor: BROWN, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  modalApplyTxt:  { fontSize: 15, fontWeight: '700', color: WHITE },
  modalCancel:    { alignItems: 'center', paddingTop: 14 },
  modalCancelTxt: { fontSize: 14, color: MUTED },
});
