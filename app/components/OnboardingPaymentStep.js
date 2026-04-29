// app/components/OnboardingPaymentStep.js
// Two-section paywall: branded top + plan bottom.
// Stripe Payment Element slides up in a modal when user taps CTA.

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView,
  Image, Animated, Dimensions,
} from 'react-native';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { auth } from '../../config/firebaseConfig';
import { ONBOARDING_PROMO_CODES, WELCOME_TRIAL_DAYS } from '../../src/services/subscriptionService';
import Icon from './Icon';

const BROWN  = '#8B4513';
const GOLD   = '#C4781A';
const CREAM  = '#faf7f3';
const DARK   = '#1A1A1A';
const MUTED  = '#888888';
const WHITE  = '#ffffff';
const BORDER = '#e0d5c8';

const STRIPE_MONTHLY_PRICE_ID = 'price_1Sn7RG8EMAXqcROYU5RIU2N6';
const SCREEN_H = Dimensions.get('window').height;

const TESTIMONIALS = [
  { name: 'Marcus T.', quote: 'Finally an app that actually knows cigars. The AI scanning is scarily accurate — identified my Padróns every time.', stars: 5 },
  { name: 'James R.', quote: 'The humidor tracker alone is worth it. I know exactly what I have and when I smoked it. Game changer.', stars: 5 },
  { name: 'Derek L.', quote: 'Found three new Smoke Spots within five miles of my house I never knew existed. My weekends are ruined now.', stars: 5 },
];

// Stripe singleton
let _stripePromise = null;
function getStripe(key) {
  if (!_stripePromise) _stripePromise = loadStripe(key);
  return _stripePromise;
}

const STRIPE_APPEARANCE = {
  theme: 'stripe',
  variables: {
    colorPrimary: BROWN, colorBackground: WHITE, colorText: DARK,
    colorDanger: '#df1b41', borderRadius: '12px', fontSizeBase: '15px',
  },
  rules: {
    '.Tab': { border: '1px solid #e0d5c8', boxShadow: 'none' },
    '.Tab--selected': { borderColor: BROWN, boxShadow: `0 0 0 1px ${BROWN}` },
    '.Input': { border: '1.5px solid #e0d5c8', boxShadow: 'none', padding: '13px 14px' },
    '.Input:focus': { borderColor: BROWN, boxShadow: `0 0 0 1.5px ${BROWN}` },
  },
};

// ─── Payment sheet (inside Stripe Elements) ─────────────────────────────────
// Uses PaymentRequestButton (Apple Pay / Google Pay) as primary path.
// Falls back to PaymentElement (card form) if native pay is unavailable.
function PaymentSheet({ onSuccess, onClose, trialDays, clientSecret }) {
  const stripe   = useStripe();
  const elements = useElements();

  // null = checking, true = available, false = not available
  const [nativeReady, setNativeReady]   = useState(null);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [busy, setBusy]                 = useState(false);
  const [err, setErr]                   = useState(null);

  useEffect(() => {
    if (!stripe || !clientSecret) return;

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: { label: 'Due today', amount: 0 },
      displayItems: [
        { label: `HUMI Premium — ${trialDays}-day free trial`, amount: 0 },
        { label: 'Then $9.99/mo (cancel anytime)', amount: 0 },
      ],
    });

    // When Face ID / Touch ID / Google Pay completes, confirm the SetupIntent
    pr.on('paymentmethod', async (ev) => {
      const { error } = await stripe.confirmSetup({
        clientSecret,
        confirmParams: { payment_method: ev.paymentMethod.id },
        redirect: 'if_required',
      });
      if (error) { ev.complete('fail'); setErr(error.message); }
      else        { ev.complete('success'); onSuccess(); }
    });

    pr.canMakePayment().then(result => {
      if (result) { setPaymentRequest(pr); setNativeReady(true); }
      else        { setNativeReady(false); }
    });
  }, [stripe, clientSecret]);

  // Card form submit (fallback for non-Apple/Google Pay browsers)
  const submitCard = async () => {
    if (!stripe || !elements) return;
    setBusy(true); setErr(null);
    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: typeof window !== 'undefined' ? window.location.href : 'https://app.gethumi.co',
      },
      redirect: 'if_required',
    });
    if (error) { setErr(error.message || 'Payment failed. Try again.'); setBusy(false); }
    else onSuccess();
  };

  return (
    <View style={sh.sheet}>
      <View style={sh.handle} />

      {/* Checking Apple Pay / Google Pay availability */}
      {nativeReady === null && (
        <View style={sh.checkingWrap}>
          <ActivityIndicator color={BROWN} />
          <Text style={sh.checkingTxt}>Setting up secure payment...</Text>
        </View>
      )}

      {/* ── Native pay path (Apple Pay / Google Pay) ── */}
      {nativeReady === true && (
        <>
          <Text style={sh.sheetTitle}>Start your free trial</Text>
          <Text style={sh.sheetSub}>
            $0 today — {trialDays} days free, then $9.99/mo.{'\n'}Cancel any time before your trial ends.
          </Text>

          {paymentRequest && (
            <View style={sh.prWrap}>
              <PaymentRequestButtonElement
                options={{
                  paymentRequest,
                  style: {
                    paymentRequestButton: {
                      type: 'default',
                      theme: 'light',
                      height: '56px',
                    },
                  },
                }}
              />
            </View>
          )}

          {!!err && (
            <View style={sh.errRow}>
              <Icon name="alert-circle-outline" size={14} color="#c0392b" />
              <Text style={sh.errTxt}>{err}</Text>
            </View>
          )}

          <TouchableOpacity onPress={onClose} style={sh.sheetCancel}>
            <Text style={sh.sheetCancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Card fallback (no Apple/Google Pay available) ── */}
      {nativeReady === false && (
        <>
          <Text style={sh.sheetTitle}>Add payment method</Text>
          <Text style={sh.sheetSub}>No charge for {trialDays} days. Cancel anytime before then.</Text>

          <View style={sh.elementWrap}>
            <PaymentElement
              options={{
                layout: 'accordion',
                wallets: { applePay: 'never', googlePay: 'never' },
              }}
            />
          </View>

          {!!err && (
            <View style={sh.errRow}>
              <Icon name="alert-circle-outline" size={14} color="#c0392b" />
              <Text style={sh.errTxt}>{err}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[sh.sheetBtn, busy && { opacity: 0.55 }]}
            onPress={submitCard}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color={WHITE} />
              : <Text style={sh.sheetBtnTxt}>Start my {trialDays}-day free trial</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={sh.sheetCancel}>
            <Text style={sh.sheetCancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── Testimonial dot indicator ───────────────────────────────────────────────
function Dots({ count, active }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[ps.dot, i === active && ps.dotActive]} />
      ))}
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function OnboardingPaymentStep({ onComplete, appliedPromoCode, onPromoApplied }) {
  const promoConfig = appliedPromoCode ? ONBOARDING_PROMO_CODES[appliedPromoCode] : null;
  const trialDays   = promoConfig ? promoConfig.days : WELCOME_TRIAL_DAYS;

  const [stripe, setStripe]             = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [subscriptionId, setSubId]      = useState(null);
  const [phase, setPhase]               = useState('loading');
  const [initError, setInitError]       = useState(null);

  const [showSheet, setShowSheet]       = useState(false);
  const [showPromo, setShowPromo]       = useState(false);
  const [codeInput, setCodeInput]       = useState('');
  const [promoError, setPromoError]     = useState('');

  // Testimonial carousel
  const [tIdx, setTIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTIdx(i => (i + 1) % TESTIMONIALS.length), 3800);
    return () => clearInterval(t);
  }, []);

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!isWeb) return;
    init();
  }, [trialDays]);

  const init = async () => {
    setPhase('loading');
    setInitError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not signed in');
      const [keyRes, subRes] = await Promise.all([
        fetch('/api/stripe/publishable-key'),
        fetch('/api/stripe/create-trial-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId: STRIPE_MONTHLY_PRICE_ID, userId: user.uid, email: user.email, trialDays }),
        }),
      ]);
      const { publishableKey } = await keyRes.json();
      const subData = await subRes.json();
      if (subData.error) throw new Error(subData.error);
      setStripe(await getStripe(publishableKey));
      setClientSecret(subData.clientSecret);
      setSubId(subData.subscriptionId);
      setPhase('ready');
    } catch (e) {
      setInitError(e.message || 'Could not load payment. Please try again.');
      setPhase('error');
    }
  };

  const handlePaymentSuccess = async () => {
    setShowSheet(false);
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
    } catch (e) { console.error('Save sub error:', e.message); }
    onComplete?.({ skipTrialGrant: true });
  };

  const trialEndDate = (() => {
    const d = new Date(); d.setDate(d.getDate() + trialDays);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  })();

  const applyPromo = () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) { setPromoError('Enter a code first'); return; }
    if (!ONBOARDING_PROMO_CODES[code]) { setPromoError('Code not recognised'); return; }
    onPromoApplied?.(code);
    setShowPromo(false); setCodeInput(''); setPromoError('');
  };

  if (!isWeb) {
    return <View style={ps.unavailableWrap}><Text style={ps.unavailableTxt}>Payment is available on the web app.</Text></View>;
  }

  const ctaReady = phase === 'ready';

  return (
    <View style={{ flex: 1, backgroundColor: WHITE }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── TOP: Brown branded section ── */}
        <View style={ps.top}>
          {/* Logo */}
          <Image source={require('../../assets/images/icon.png')} style={ps.logo} resizeMode="contain" />

          <Text style={ps.headline}>Your lounge{'\n'}awaits.</Text>
          <Text style={ps.tagline}>Join thousands of cigar enthusiasts on HUMI</Text>

          {/* Testimonial card */}
          <View style={ps.testimonialCard}>
            <Text style={ps.testimonialName}>{TESTIMONIALS[tIdx].name}</Text>
            <Text style={ps.testimonialQuote}>"{TESTIMONIALS[tIdx].quote}"</Text>
            <View style={{ flexDirection: 'row', gap: 3, marginTop: 10 }}>
              {[1,2,3,4,5].map(s => <Text key={s} style={ps.star}>★</Text>)}
            </View>
          </View>
          <Dots count={TESTIMONIALS.length} active={tIdx} />
        </View>

        {/* ── BOTTOM: White plan section ── */}
        <View style={ps.bottom}>

          {/* Premium badge */}
          <View style={[ps.pill, promoConfig && ps.pillPromo]}>
            {promoConfig && <Icon name="sparkles-outline" size={11} color={GOLD} />}
            <Text style={[ps.pillTxt, promoConfig && ps.pillTxtPromo]}>
              {promoConfig ? `✦ ${appliedPromoCode} APPLIED` : 'HUMI PREMIUM'}
            </Text>
            {promoConfig && <Icon name="sparkles-outline" size={11} color={GOLD} />}
          </View>

          <Text style={ps.planHead}>
            {trialDays} days free.{'\n'}Cancel anytime.
          </Text>
          <Text style={ps.planSub}>
            No charge until {trialEndDate}.{'\n'}Then just $9.99/mo — cancel whenever.
          </Text>

          {/* CTA button */}
          {phase === 'saving' ? (
            <View style={ps.ctaWrap}>
              <ActivityIndicator color={WHITE} />
              <Text style={ps.savingTxt}>Activating your trial...</Text>
            </View>
          ) : phase === 'error' ? (
            <View style={{ width: '100%', alignItems: 'center', gap: 10 }}>
              <Text style={ps.errTxt}>{initError}</Text>
              <TouchableOpacity style={ps.cta} onPress={init}>
                <Text style={ps.ctaTxt}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : !ctaReady ? (
            <View style={ps.cta}>
              <ActivityIndicator color={WHITE} />
            </View>
          ) : (
            <TouchableOpacity style={ps.cta} onPress={() => setShowSheet(true)}>
              <Text style={ps.ctaTxt}>Start my {trialDays}-day free trial  →</Text>
            </TouchableOpacity>
          )}

          {/* Promo code link */}
          {!promoConfig ? (
            <TouchableOpacity onPress={() => { setCodeInput(''); setPromoError(''); setShowPromo(true); }} style={ps.promoLink}>
              <Text style={ps.promoLinkTxt}>Have a promo code?</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={ps.legal}>
            By starting your trial you agree to our Terms of Service.{'\n'}
            Cancel before {trialEndDate} and you won't be charged.
          </Text>
        </View>
      </ScrollView>

      {/* ── Payment sheet modal ── */}
      <Modal visible={showSheet} transparent animationType="slide" onRequestClose={() => setShowSheet(false)}>
        <TouchableOpacity style={sh.backdrop} activeOpacity={1} onPress={() => setShowSheet(false)} />
        {stripe && clientSecret ? (
          <Elements stripe={stripe} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
            <PaymentSheet onSuccess={handlePaymentSuccess} onClose={() => setShowSheet(false)} trialDays={trialDays} clientSecret={clientSecret} />
          </Elements>
        ) : null}
      </Modal>

      {/* ── Promo code modal ── */}
      <Modal visible={showPromo} transparent animationType="fade" onRequestClose={() => setShowPromo(false)}>
        <KeyboardAvoidingView style={ps.promoOuter} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowPromo(false)} activeOpacity={1} />
          <View style={ps.promoCard}>
            <Text style={ps.promoTitle}>Enter your promo code</Text>
            <TextInput
              style={ps.promoInput}
              placeholder="e.g. SS2026"
              placeholderTextColor={MUTED}
              value={codeInput}
              onChangeText={t => { setCodeInput(t); setPromoError(''); }}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
            {!!promoError && <Text style={ps.promoErr}>{promoError}</Text>}
            <TouchableOpacity style={ps.promoApply} onPress={applyPromo}>
              <Text style={ps.promoApplyTxt}>Apply Code</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPromo(false)} style={{ alignItems: 'center', paddingTop: 14 }}>
              <Text style={{ fontSize: 14, color: MUTED }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  unavailableWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  unavailableTxt:  { fontSize: 15, color: MUTED },

  // Top section
  top: {
    backgroundColor: BROWN,
    paddingTop: 56,
    paddingBottom: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  logo: { width: 72, height: 72, borderRadius: 16, marginBottom: 20 },
  headline: {
    fontSize: 36, fontWeight: '800', color: WHITE,
    textAlign: 'center', lineHeight: 44, marginBottom: 10,
  },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.72)', textAlign: 'center', marginBottom: 24 },

  testimonialCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  testimonialName:  { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 8 },
  testimonialQuote: { fontSize: 14, color: '#444', lineHeight: 22 },
  star: { fontSize: 16, color: '#F5A623' },

  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: WHITE, width: 18 },

  // Bottom section
  bottom: {
    backgroundColor: WHITE,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 48,
    alignItems: 'center',
    flex: 1,
  },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(139,69,19,0.10)', paddingVertical: 6, paddingHorizontal: 16,
    borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(139,69,19,0.20)',
  },
  pillPromo:    { backgroundColor: 'rgba(196,120,26,0.10)', borderColor: 'rgba(196,120,26,0.40)' },
  pillTxt:      { fontSize: 11, fontWeight: '800', color: BROWN, letterSpacing: 1.5 },
  pillTxtPromo: { color: GOLD },

  planHead: {
    fontSize: 28, fontWeight: '800', color: DARK,
    textAlign: 'center', lineHeight: 36, marginBottom: 12,
  },
  planSub: {
    fontSize: 14, color: MUTED, textAlign: 'center',
    lineHeight: 22, marginBottom: 28,
  },

  cta: {
    backgroundColor: BROWN, borderRadius: 14, paddingVertical: 18,
    paddingHorizontal: 24, alignItems: 'center', width: '100%',
    shadowColor: BROWN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 10, elevation: 5, marginBottom: 16,
    minHeight: 58, justifyContent: 'center',
  },
  ctaTxt: { fontSize: 16, fontWeight: '800', color: WHITE },

  ctaWrap: {
    backgroundColor: BROWN, borderRadius: 14, paddingVertical: 18,
    paddingHorizontal: 24, alignItems: 'center', width: '100%',
    flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 16,
  },
  savingTxt: { color: WHITE, fontWeight: '600', fontSize: 15 },
  errTxt:    { color: '#c0392b', fontSize: 13, textAlign: 'center' },

  promoLink:    { alignItems: 'center', paddingVertical: 10 },
  promoLinkTxt: { fontSize: 14, color: BROWN, fontWeight: '600' },

  legal: {
    fontSize: 11, color: MUTED, textAlign: 'center',
    lineHeight: 17, marginTop: 20, paddingHorizontal: 8,
  },

  promoOuter: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 28,
  },
  promoCard: {
    width: '100%', backgroundColor: WHITE, borderRadius: 18, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 12,
  },
  promoTitle: { fontSize: 17, fontWeight: '800', color: DARK, marginBottom: 16, textAlign: 'center' },
  promoInput: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 11,
    paddingVertical: 13, paddingHorizontal: 14, fontSize: 16,
    color: DARK, backgroundColor: CREAM, letterSpacing: 1, marginBottom: 6,
  },
  promoErr:   { fontSize: 12, color: '#c0392b', textAlign: 'center', marginBottom: 8 },
  promoApply: { backgroundColor: BROWN, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  promoApplyTxt: { fontSize: 15, fontWeight: '700', color: WHITE },
});

const sh = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: SCREEN_H * 0.88,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD',
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: DARK, marginBottom: 6 },
  sheetSub:   { fontSize: 13, color: MUTED, marginBottom: 20, lineHeight: 20 },
  elementWrap:{ width: '100%', marginBottom: 16 },
  errRow:     { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12, marginBottom: 12 },
  errTxt:     { fontSize: 13, color: '#c0392b', flex: 1 },
  sheetBtn:   {
    backgroundColor: BROWN, borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', width: '100%', marginBottom: 12,
  },
  sheetBtnTxt:    { fontSize: 15, fontWeight: '800', color: WHITE },
  sheetCancel:    { alignItems: 'center', paddingVertical: 8 },
  sheetCancelTxt: { fontSize: 14, color: MUTED },
});
