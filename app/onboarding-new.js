// app/onboarding-new.js  — HUMI Onboarding v3 (emotional journey)
// Steps: 0=welcome 1=Q1-duration 2=Q2-fave 3=Q3-memory 4=Q4-tracking
//        5=Q5-flavors 6=Q6-pairings 7=Q7-gap 8=Q8-source
//        9=how-it-works 10=lineup 11=loading 12=result+celebrate 13=trial

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, SafeAreaView,
  ScrollView, Dimensions, Animated, TextInput, Image, Platform,
  KeyboardAvoidingView, Modal,
} from 'react-native';
import Icon from './components/Icon';
import StogieSkoolWelcomeModal from './components/StogieSkoolWelcomeModal';
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { grantWelcomeTrial, ONBOARDING_PROMO_CODES, WELCOME_TRIAL_DAYS } from '../src/services/subscriptionService';

// ─── Brand tokens ─────────────────────────────────────────────────────────
const BROWN  = '#8B4513';
const GOLD   = '#C4781A';
const CREAM  = '#faf7f3';
const LIGHT  = '#f7f2e9';
const BORDER = '#e0d5c8';
const DARK   = '#1A1A1A';
const MUTED  = '#666666';
const WHITE  = '#ffffff';

const CONFETTI_COLORS = ['#8B4513','#C9983A','#E8C97B','#DEB887','#A0522D','#f7f2e9'];

// ─── Cigar data (for demo lineup) ─────────────────────────────────────────
const CIGARS = [
  {
    id: 'padron',
    name: 'Padron 1964 Anniversary',
    vitola: 'Hermoso · Natural',
    country: 'Nicaragua · Full',
    image: require('../assets/cigars/padron1964.jpg'),
    humiBlurb: "Few cigars command the reverence of the Padron 1964 Anniversary Series. Born to celebrate the brand's founding year, this Hermoso natural is a masterclass in Nicaraguan tobacco — rich, complex, and impeccably constructed. Expect a slow, even burn that reveals layers of dark chocolate, espresso, and cedar, with a finish that lingers long after the last draw.",
    commonNotes: ['Dark Chocolate','Espresso','Cedar','Leather','Earth','Subtle Sweetness'],
    peopleSaying: "Consistently ranked among the top cigars in the world, aficionados describe the 1964 as \"the benchmark everything else is measured against.\" One enthusiast wrote: \"I've smoked everything. Nothing touches a box-pressed 1964 in great condition.\"",
    recommendedPairings: 'Añejo Rum — The caramel and vanilla notes beautifully complement the chocolate and earth. Alternatively, a single-origin dark roast coffee or a dram of Speyside Scotch brings out the cedar and subtle sweetness.',
  },
  {
    id: 'opusx',
    name: 'Arturo Fuente Opus X',
    vitola: 'Fuente Fuente · Robusto',
    country: 'Dominican Republic · Full',
    image: require('../assets/cigars/opusx.jpg'),
    humiBlurb: "The Opus X is the cigar that made the world take Dominican tobacco seriously. When Carlos Fuente Jr. first released it in 1995, nobody believed a Dominican puro could compete with Cuban standards. He proved them wrong. Floral, spicy, impossibly complex — this is a unicorn that smokers spend their entire lives chasing.",
    commonNotes: ['Red Pepper','Cedar','Floral','Cream','Nutmeg','Dark Fruit'],
    peopleSaying: "The Opus X has a cult following unlike any other cigar on the market. Enthusiasts describe the experience as \"discovering cigars for the first time, all over again.\" One longtime aficionado: \"Every time I think I've found something better, I light an Opus X and it resets the scale.\"",
    recommendedPairings: 'Single Malt Scotch — particularly an Islay expression, where the peat smoke mirrors the complexity. A fine cognac or aged Armagnac also works beautifully, letting the floral and fruity notes breathe alongside the spirit.',
  },
  {
    id: 'behike',
    name: 'Cohiba Behike 52',
    vitola: 'Corona Gorda · Cuban',
    country: 'Cuba · Medium-Full',
    image: require('../assets/cigars/behike.png'),
    humiBlurb: "The Behike is Habanos S.A.'s ultimate statement — a blend incorporating Medio Tiempo leaves found in fewer than 10% of tobacco plants worldwide. Silky, nuanced, and undeniably elegant, the Behike 52 is everything Cuba wants you to believe about its tobacco.",
    commonNotes: ['Milk Chocolate','Cinnamon','Hay','White Pepper','Cream','Dried Fruit'],
    peopleSaying: "Cohiba devotees consider the Behike the pinnacle of the lineup — more refined than the Siglo VI, more complex than the Espléndido. Collectors with pristine aged examples describe it as \"the truest expression of Cuban terroir you can smoke today.\"",
    recommendedPairings: 'Havana Club 7-Year rum enhances the natural sweetness perfectly. For a bolder contrast, a well-aged Calvados or fine champagne cuts through the creaminess with just the right acidity.',
  },
];

const LOADING_STAGES = [
  'Sending to HUMI...',
  'Analyzing cigar band...',
  'Matching against database...',
  'Building flavor profile...',
  'Gathering community notes...',
];

const SOURCE_OPTIONS = [
  { id: 'instagram', label: 'Instagram',           icon: 'logo-instagram' },
  { id: 'tiktok',   label: 'TikTok',               icon: 'musical-notes-outline' },
  { id: 'website',  label: 'Website',              icon: 'globe-outline' },
  { id: 'friend',   label: 'Referred by a friend', icon: 'people-outline' },
  { id: 'other',    label: 'Other',                icon: 'ellipsis-horizontal-outline' },
];

// Q1 — smoking duration → maps to expertise
const DURATION_OPTIONS = [
  { id: 'just_starting', label: 'Just getting started',                  expertise: 'beginner' },
  { id: 'under_year',    label: 'Less than a year',                      expertise: 'beginner' },
  { id: 'one_three',     label: '1–3 years',                             expertise: 'experienced' },
  { id: 'three_five',    label: '3–5 years',                             expertise: 'experienced' },
  { id: 'five_plus',     label: '5+ years — been around the smoke a long time', expertise: 'aficionado' },
];

// Q3 — memory pain
const MEMORY_OPTIONS = [
  { id: 'yes_often',     label: "Yes — happens more than I'd like" },
  { id: 'once_twice',    label: 'Once or twice' },
  { id: 'not_yet',       label: "Not yet, but I can see it happening" },
  { id: 'always_remember', label: 'I always remember what I smoke' },
];

// Q4 — tracking method
const TRACKING_OPTIONS = [
  { id: 'dont',          label: "I don't, really" },
  { id: 'mental_note',   label: 'Mental note — which means I usually forget' },
  { id: 'photos',        label: 'I take photos on my phone' },
  { id: 'write_down',    label: 'I write it down somewhere' },
  { id: 'system',        label: 'I have a system that actually works' },
];

// Q5 — flavors (multi-select) — individual pills for rich, exploratory feel
const FLAVOR_OPTIONS = [
  'Chocolate',
  'Cocoa',
  'Dark Chocolate',
  'Pepper',
  'Spice',
  'Cedar',
  'Woody',
  'Coffee',
  'Espresso',
  'Earthy',
  'Leather',
  'Creamy',
  'Smooth',
  'Fruity',
  'Sweet',
  'Nutty',
  'Almond',
  'Floral',
  'Honey',
  'Toasty',
];

// Q6 — pairings (multi-select) — varied label lengths break up the uniform grid
const PAIRING_OPTIONS = [
  { label: 'Bourbon',                       addsPairings: true },
  { label: 'Scotch',                         addsPairings: true },
  { label: 'Rum',                            addsPairings: true },
  { label: 'Wine',                           addsPairings: true },
  { label: 'Cognac & Brandy',               addsPairings: true },
  { label: 'Mezcal',                         addsPairings: true },
  { label: 'Tequila',                        addsPairings: true },
  { label: 'Beer',                           addsPairings: true },
  { label: 'Coffee',                         addsPairings: true },
  { label: 'Espresso',                       addsPairings: true },
  { label: 'Cold Brew',                      addsPairings: true },
  { label: 'Sparkling Water',               addsPairings: true },
  { label: 'Dark Chocolate',                addsPairings: true },
  { label: 'Just the cigar, nothing else',  addsPairings: false },
  { label: 'Other',                          addsPairings: true },
  { label: "Haven't explored pairings yet", addsPairings: false },
];

// Q7 — knowledge gap (single-select) → maps to interests
const GAP_OPTIONS = [
  { label: 'How to identify what I\'m smoking',    interests: ['insider'] },
  { label: 'Where to find great spots to smoke',   interests: ['insider'] },
  { label: 'How to build a collection or humidor', interests: ['collection'] },
  { label: 'The history and craft behind the brands', interests: ['culture'] },
  { label: 'How to identify good pairings',        interests: ['pairings'] },
  { label: 'How to trust my own palate',           interests: ['flavors'] },
  { label: 'All of the above, honestly',           interests: ['insider','collection','culture','pairings','flavors'] },
];

// ─── Shared helpers ────────────────────────────────────────────────────────
const TOTAL_Q = 8; // Q1–Q8 shown in progress bar

function ProgressBar({ current }) {
  return (
    <View style={s.progressRow}>
      {Array.from({ length: TOTAL_Q }).map((_, i) => (
        <View key={i} style={[s.progressSeg, i < current && s.progressSegOn]} />
      ))}
    </View>
  );
}

function useFadeSlide(enabled = true) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    if (!enabled) return;
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);
  return { fade, slide };
}

function BackBtn({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.backBtn}>
      <Icon name="chevron-back-outline" size={24} color={BROWN} />
    </TouchableOpacity>
  );
}

function StepHeader({ onBack }) {
  return (
    <View style={s.stepHeader}>
      <TouchableOpacity onPress={onBack} style={s.stepHeaderBack}>
        <Icon name="chevron-back-outline" size={24} color={BROWN} />
      </TouchableOpacity>
      <Text style={s.stepHeaderBrand}>HUMI</Text>
    </View>
  );
}

// ─── Screen 0: Welcome ─────────────────────────────────────────────────────
function WelcomeStep({ onNext }) {
  const { fade, slide } = useFadeSlide();
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.centeredWrap}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], alignItems: 'center' }}>
          <View style={s.logoBox}><Text style={s.logoText}>HUMI</Text></View>
          <Text style={s.h1}>Welcome to HUMI</Text>
          <Text style={s.brandSub}>The Digital Cigar Lounge</Text>
          <Text style={s.tagline}>Know more. Remember everything. Smoke better.</Text>
        </Animated.View>
        <Animated.View style={{ opacity: fade, width: '100%' }}>
          <TouchableOpacity style={s.btn} onPress={onNext}>
            <Text style={s.btnTxt}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Q1: Smoking duration → expertise ─────────────────────────────────────
function DurationStep({ value, setValue, onNext, onBack }) {
  const { fade, slide } = useFadeSlide();
  const handleSelect = id => {
    setValue(id);
    setTimeout(onNext, 200);
  };
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <StepHeader onBack={onBack} />
        <ProgressBar current={1} />
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
          <Text style={s.h2}>How long have you been smoking cigars?</Text>
          <View style={s.optList}>
            {DURATION_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.id}
                style={[s.optCard, value === opt.id && s.optCardOn]}
                onPress={() => handleSelect(opt.id)}>
                <Text style={[s.optTitle, { flex: 1 }, value === opt.id && { color: BROWN }]}>{opt.label}</Text>
                {value === opt.id && <Icon name="checkmark-circle" size={19} color={BROWN} />}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Q2: Favorite cigar (open text, skippable) ────────────────────────────
function FavoriteCigarStep({ value, setValue, onNext, onSkip, onBack }) {
  const { fade, slide } = useFadeSlide();
  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.stepWrap}>
          <StepHeader onBack={onBack} />
          <ProgressBar current={2} />
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
            <Text style={s.h2}>What's your go-to cigar or brand, if you have one?</Text>
            <Text style={s.sub}>This helps us personalize your experience</Text>
            <TextInput
              style={s.textInputLarge}
              placeholder="e.g. Padron, Fuente, Cohiba…"
              placeholderTextColor={MUTED}
              value={value}
              onChangeText={setValue}
              returnKeyType="done"
              autoFocus={false}
            />
          </Animated.View>
          <TouchableOpacity style={s.btn} onPress={onNext} disabled={!value.trim()}>
            <Text style={[s.btnTxt, !value.trim() && { opacity: 0.5 }]}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={s.skipLink}>
            <Text style={s.skipLinkTxt}>Still figuring it out →</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Q3: Memory pain ──────────────────────────────────────────────────────
function MemoryPainStep({ value, setValue, onNext, onBack }) {
  const { fade, slide } = useFadeSlide();
  const handleSelect = id => {
    setValue(id);
    setTimeout(onNext, 200);
  };
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <StepHeader onBack={onBack} />
        <ProgressBar current={3} />
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
          <Text style={s.h2}>Have you ever enjoyed a cigar and later forgotten what it was?</Text>
          <Text style={s.sub}>Be honest — it happens to the best of us</Text>
          <View style={s.optList}>
            {MEMORY_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.id}
                style={[s.optCard, value === opt.id && s.optCardOn]}
                onPress={() => handleSelect(opt.id)}>
                <Text style={[s.optTitle, { flex: 1 }, value === opt.id && { color: BROWN }]}>{opt.label}</Text>
                {value === opt.id && <Icon name="checkmark-circle" size={19} color={BROWN} />}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Q4: Tracking method ──────────────────────────────────────────────────
function TrackingStep({ value, setValue, onNext, onBack }) {
  const { fade, slide } = useFadeSlide();
  const handleSelect = id => {
    setValue(id);
    setTimeout(onNext, 200);
  };
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <StepHeader onBack={onBack} />
        <ProgressBar current={4} />
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
          <Text style={s.h2}>How do you keep track of cigars you've enjoyed?</Text>
          <View style={s.optList}>
            {TRACKING_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.id}
                style={[s.optCard, value === opt.id && s.optCardOn]}
                onPress={() => handleSelect(opt.id)}>
                <Text style={[s.optTitle, { flex: 1 }, value === opt.id && { color: BROWN }]}>{opt.label}</Text>
                {value === opt.id && <Icon name="checkmark-circle" size={19} color={BROWN} />}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Q5: Flavors (multi-select) ───────────────────────────────────────────
function FlavorsStep({ selected, toggle, onNext, onBack }) {
  const { fade, slide } = useFadeSlide();
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <StepHeader onBack={onBack} />
        <ProgressBar current={5} />
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
          <Text style={s.h2}>What flavors pull you in when you smoke?</Text>
          <Text style={s.sub}>Select all that apply</Text>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.chipGrid}>
            {FLAVOR_OPTIONS.map(label => {
              const on = selected.includes(label);
              return (
                <TouchableOpacity key={label} style={[s.chip, on && s.chipOn]} onPress={() => toggle(label)}>
                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
        <TouchableOpacity
          style={[s.btn, selected.length === 0 && s.btnOff]}
          onPress={onNext}
          disabled={selected.length === 0}>
          <Text style={s.btnTxt}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Q6: Pairings (multi-select) ──────────────────────────────────────────
function PairingsStep({ selected, toggle, otherText, onOtherTextChange, onNext, onBack }) {
  const { fade, slide } = useFadeSlide();
  const otherSelected = selected.includes('Other');
  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.stepWrap}>
          <StepHeader onBack={onBack} />
          <ProgressBar current={6} />
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
            <Text style={s.h2}>Do you have a go-to cigar pairing?</Text>
            <Text style={s.sub}>Select all that apply</Text>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.chipGrid}>
              {PAIRING_OPTIONS.map(opt => {
                const on = selected.includes(opt.label);
                return (
                  <TouchableOpacity key={opt.label} style={[s.chip, on && s.chipOn]} onPress={() => toggle(opt.label)}>
                    <Text style={[s.chipTxt, on && s.chipTxtOn]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {otherSelected && (
              <TextInput
                style={[s.textInputLarge, { marginTop: 12, marginBottom: 4 }]}
                placeholder="What else do you pair with? e.g. Tea, Sparkling water…"
                placeholderTextColor={MUTED}
                value={otherText}
                onChangeText={onOtherTextChange}
                autoFocus
                returnKeyType="done"
              />
            )}
          </Animated.View>
          <TouchableOpacity
            style={[s.btn, selected.length === 0 && s.btnOff]}
            onPress={onNext}
            disabled={selected.length === 0}>
            <Text style={s.btnTxt}>Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Q7: Knowledge gap (single-select → interests) ────────────────────────
function KnowledgeGapStep({ value, setValue, onNext, onBack }) {
  const { fade, slide } = useFadeSlide();
  const handleSelect = label => {
    setValue(label);
    setTimeout(onNext, 200);
  };
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <StepHeader onBack={onBack} />
        <ProgressBar current={7} />
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
          <Text style={s.h2}>What's the one thing you wish you knew more about when it comes to cigars?</Text>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
            {GAP_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.label}
                style={[s.optCard, value === opt.label && s.optCardOn]}
                onPress={() => handleSelect(opt.label)}>
                <Text style={[s.optTitle, { flex: 1 }, value === opt.label && { color: BROWN }]}>{opt.label}</Text>
                {value === opt.label && <Icon name="checkmark-circle" size={19} color={BROWN} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Q8: Source attribution ────────────────────────────────────────────────
function SourceStep({ source, setSource, otherText, setOtherText, onNext, onBack }) {
  const { fade, slide } = useFadeSlide();
  const showOther = source === 'other';
  const handleSelect = id => {
    setSource(id);
    if (id !== 'other') setTimeout(onNext, 200);
  };
  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.stepWrap}>
          <StepHeader onBack={onBack} />
          <ProgressBar current={8} />
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
            <Text style={s.h2}>Where did you find us?</Text>
            <Text style={s.sub}>This helps us know where our community comes from</Text>
            <View style={s.optList}>
              {SOURCE_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.id}
                  style={[s.optCard, source === opt.id && s.optCardOn]}
                  onPress={() => handleSelect(opt.id)}>
                  <View style={[s.optIcon, source === opt.id && s.optIconOn]}>
                    <Icon name={opt.icon} size={19} color={source === opt.id ? WHITE : BROWN} />
                  </View>
                  <Text style={[s.optTitle, { flex: 1 }, source === opt.id && { color: BROWN }]}>{opt.label}</Text>
                  {source === opt.id && <Icon name="checkmark-circle" size={19} color={BROWN} />}
                </TouchableOpacity>
              ))}
            </View>
            {showOther && (
              <TextInput
                style={s.textInput}
                placeholder="Tell us where you heard about HUMI..."
                placeholderTextColor={MUTED}
                value={otherText}
                onChangeText={setOtherText}
                autoFocus
              />
            )}
          </Animated.View>
          {showOther && (
            <TouchableOpacity
              style={[s.btn, !otherText.trim() && s.btnOff]}
              onPress={onNext}
              disabled={!otherText.trim()}>
              <Text style={s.btnTxt}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── How HUMI Works (rewritten copy echoing pain points) ──────────────────
const HOW_STEPS = [
  {
    icon: 'camera-outline',
    title: 'Forget what you\'re smoking? Point your camera.',
    body: 'Snap the band. HUMI identifies it instantly — no guessing, no forgotten names.',
  },
  {
    icon: 'albums-outline',
    title: 'Want to remember every great cigar? It\'s all in your Vault.',
    body: 'Every scan you make is saved automatically. Your full history, right in your pocket.',
  },
  {
    icon: 'map-outline',
    title: 'Need a spot? We\'ve got you.',
    body: 'Discover cigar-friendly lounges and spots near you, rated by the community.',
  },
];

function HowItWorksStep({ onNext, onBack }) {
  const { fade, slide } = useFadeSlide();
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <StepHeader onBack={onBack} />
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
          <View style={s.howHeader}>
            <Icon name="scan-outline" size={28} color={BROWN} />
            <Text style={s.h2}>How HUMI works</Text>
          </View>
          <Text style={s.sub}>Three direct answers to what you just told us</Text>
          <View style={s.howList}>
            {HOW_STEPS.map((step, i) => (
              <View key={step.title} style={s.howCard}>
                <View style={s.howNum}><Text style={s.howNumTxt}>{i + 1}</Text></View>
                <View style={s.howIconCircle}>
                  <Icon name={step.icon} size={26} color={BROWN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.howTitle}>{step.title}</Text>
                  <Text style={s.howBody}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={s.howCallout}>
            <Icon name="sparkles-outline" size={16} color={BROWN} />
            <Text style={s.howCalloutTxt}>Let's scan your first cigar right now</Text>
          </View>
        </Animated.View>
        <TouchableOpacity style={s.btn} onPress={onNext}>
          <Text style={s.btnTxt}>Let's do it →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Demo cigar lineup ─────────────────────────────────────────────────────
function LineupStep({ onSelect, onBack }) {
  const [selected, setSelected] = useState(null);
  const [sending,  setSending]  = useState(false);
  const { fade, slide } = useFadeSlide();

  const handleSend = () => {
    if (!selected || sending) return;
    setSending(true);
    setTimeout(() => onSelect(selected), 350);
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <StepHeader onBack={onBack} />
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
          <Text style={s.h2}>Pick a cigar to scan</Text>
          <Text style={s.sub}>Let's show you what HUMI can tell you about a cigar — pick one.</Text>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
            {CIGARS.map((cigar) => {
              const on = selected?.id === cigar.id;
              return (
                <TouchableOpacity key={cigar.id}
                  style={[s.lineupCard, on && s.lineupCardOn]}
                  onPress={() => setSelected(cigar)}
                  activeOpacity={0.85}>
                  <Image source={cigar.image} style={s.cigarThumb} resizeMode="contain" />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.lineupName, on && { color: BROWN }]}>{cigar.name}</Text>
                    <Text style={s.lineupVitola}>{cigar.vitola}</Text>
                    <Text style={s.lineupCountry}>{cigar.country}</Text>
                  </View>
                  {on && (
                    <View style={s.lineupCheck}>
                      <Icon name="checkmark" size={15} color={WHITE} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
        <View style={{ paddingTop: 12 }}>
          <TouchableOpacity
            style={[s.sendBtn, (!selected || sending) && s.btnOff]}
            onPress={handleSend} disabled={!selected || sending}>
            <Icon name="paper-plane-outline" size={17} color={WHITE} />
            <Text style={[s.btnTxt, { marginLeft: 8 }]}>Send to HUMI</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Loading animation ─────────────────────────────────────────────────────
function LoadingStep({ cigar, onComplete }) {
  const [stageIdx, setStageIdx] = useState(0);
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinRef   = useRef(null);
  const pulseRef  = useRef(null);

  useEffect(() => {
    spinRef.current = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1100, useNativeDriver: true })
    );
    spinRef.current.start();
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();

    let idx = 0;
    const stageTimer = setInterval(() => {
      idx++;
      if (idx < LOADING_STAGES.length) setStageIdx(idx);
    }, 900);
    const doneTimer = setTimeout(() => {
      clearInterval(stageTimer);
      spinRef.current?.stop();
      pulseRef.current?.stop();
      onComplete();
    }, 5000);
    return () => { clearInterval(stageTimer); clearTimeout(doneTimer); spinRef.current?.stop(); pulseRef.current?.stop(); };
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.loadWrap}>
        <Animated.View style={[s.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
        <Animated.View style={[s.spinRing,  { transform: [{ rotate: spin }] }]} />
        <View style={s.scanCenter}><Icon name="scan-outline" size={30} color={BROWN} /></View>
        <Text style={s.loadTitle}>HUMI is analyzing...</Text>
        <Text style={s.loadStage}>{LOADING_STAGES[stageIdx]}</Text>
        <Text style={s.loadCigar}>{cigar?.name}</Text>
        <View style={s.loadDots}>
          {[0,1,2,3].map(i => <View key={i} style={[s.dot, stageIdx > i && s.dotOn]} />)}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Result + Celebration ──────────────────────────────────────────────────
function ResultStep({ cigar, onComplete }) {
  const [phase, setPhase]               = useState('celebrate');
  const [visibleNotes, setVisibleNotes] = useState(0);

  const cardScale = useRef(new Animated.Value(0.6)).current;
  const cardFade  = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  const PARTICLE_COUNT = 18;
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const dist  = 90 + (i % 3) * 30;
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        op: new Animated.Value(0),
        sc: new Animated.Value(0),
      };
    })
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.55, duration: 120, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0,    duration: 350, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(cardFade,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const confettiAnims = particles.map(p =>
      Animated.parallel([
        Animated.sequence([
          Animated.timing(p.op, { toValue: 1, duration: 80,  useNativeDriver: true }),
          Animated.timing(p.op, { toValue: 0, duration: 450, delay: 150, useNativeDriver: true }),
        ]),
        Animated.timing(p.x,  { toValue: p.tx, duration: 600, useNativeDriver: true }),
        Animated.timing(p.y,  { toValue: p.ty, duration: 600, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(p.sc, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.timing(p.sc, { toValue: 0, duration: 300, delay: 120, useNativeDriver: true }),
        ]),
      ])
    );
    Animated.parallel(confettiAnims).start();

    const noteTimer = setTimeout(() => {
      let count = 0;
      const ni = setInterval(() => {
        count++;
        setVisibleNotes(count);
        if (count >= cigar.commonNotes.length) clearInterval(ni);
      }, 160);
    }, 800);

    const scrollTimer = setTimeout(() => setPhase('scroll'), 2200);

    return () => { clearTimeout(noteTimer); clearTimeout(scrollTimer); };
  }, []);

  if (phase === 'celebrate') {
    return (
      <SafeAreaView style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: WHITE, opacity: flashAnim, zIndex: 10 }]} pointerEvents="none" />

        <View style={s.confettiOrigin} pointerEvents="none">
          {particles.map((p, i) => (
            <Animated.View key={i} style={[
              s.particle,
              { backgroundColor: p.color, opacity: p.op, transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.sc }] },
            ]} />
          ))}
        </View>

        <Animated.View style={[s.celebCard, { opacity: cardFade, transform: [{ scale: cardScale }] }]}>
          <View style={s.matchBadge}>
            <Icon name="checkmark-circle" size={13} color="#2E7D32" />
            <Text style={s.matchTxt}>Match Found</Text>
          </View>
          <Text style={s.celebCigarName}>{cigar.name}</Text>
          <Text style={s.celebVitola}>{cigar.vitola}</Text>
          <View style={s.celebNotesRow}>
            {cigar.commonNotes.slice(0, 3).map(n => (
              <View key={n} style={s.noteChip}><Text style={s.noteTxt}>{n}</Text></View>
            ))}
          </View>
          <Text style={s.celebHint}>Scroll for your full profile →</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: CREAM }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={s.resultHeader}>
          <View style={s.matchBadge}>
            <Icon name="checkmark-circle" size={13} color="#2E7D32" />
            <Text style={s.matchTxt}>Match Found</Text>
          </View>
          <Text style={s.resultName}>{cigar.name}</Text>
          <Text style={s.resultVitola}>{cigar.vitola}</Text>
          <Text style={s.resultCountry}>{cigar.country}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>HUMI Says</Text>
          <Text style={s.cardBody}>{cigar.humiBlurb}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>Tasting Notes</Text>
          <View style={s.notesRow}>
            {cigar.commonNotes.map((n, i) => (
              <View key={n} style={[s.noteChip, { opacity: i < visibleNotes ? 1 : 0 }]}>
                <Text style={s.noteTxt}>{n}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>What People Are Saying</Text>
          <Text style={s.cardBody}>{cigar.peopleSaying}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>Pairs Well With</Text>
          <Text style={s.cardBody}>{cigar.recommendedPairings}</Text>
        </View>
      </ScrollView>

      <View style={s.resultBar}>
        <TouchableOpacity style={s.btn} onPress={onComplete}>
          <Text style={s.btnTxt}>That's incredible — let's go  →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Trial reveal ──────────────────────────────────────────────────────────
function TrialStep({ onComplete, appliedPromoCode, onPromoApplied }) {
  const { fade, slide } = useFadeSlide();
  const [showPromoModal,       setShowPromoModal]       = useState(false);
  const [showStogieSkoolCards, setShowStogieSkoolCards] = useState(false);
  const [codeInput,            setCodeInput]            = useState('');
  const [promoError,           setPromoError]           = useState('');

  const promoConfig = appliedPromoCode ? ONBOARDING_PROMO_CODES[appliedPromoCode] : null;
  const trialDays   = promoConfig ? promoConfig.days : WELCOME_TRIAL_DAYS;

  const openPromoModal  = () => { setCodeInput(''); setPromoError(''); setShowPromoModal(true); };
  const closePromoModal = () => { setShowPromoModal(false); setCodeInput(''); setPromoError(''); };

  const handleApply = () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) { setPromoError('Enter a code first'); return; }
    const config = ONBOARDING_PROMO_CODES[code];
    if (!config) { setPromoError('Code not recognised — check the spelling and try again'); return; }
    onPromoApplied(code);
    setShowPromoModal(false);
    setCodeInput('');
    setPromoError('');
    if (config.userType === 'stogie_skool') setShowStogieSkoolCards(true);
  };

  const features = [
    { icon: 'infinite-outline',  text: 'Unlimited AI cigar scans' },
    { icon: 'star-outline',      text: 'Full tasting notes & flavor profiles' },
    { icon: 'people-outline',    text: 'What the community is saying' },
    { icon: 'trophy-outline',    text: 'Your complete smoking profile' },
    { icon: 'map-outline',       text: 'Smoke Spots — find cigar-friendly spots near you' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: BROWN }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: BROWN }}>
      <View style={s.trialWrap}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], alignItems: 'center', width: '100%' }}>

          {promoConfig ? (
            <View style={s.promoBadge}>
              <Icon name="sparkles-outline" size={13} color={GOLD} />
              <Text style={s.promoBadgeTxt}>{trialDays} DAYS UNLOCKED</Text>
              <Icon name="sparkles-outline" size={13} color={GOLD} />
            </View>
          ) : (
            <View style={s.trialBadge}>
              <Text style={s.trialBadgeTxt}>{trialDays} DAYS FREE</Text>
            </View>
          )}

          <Text style={s.trialH}>
            {promoConfig ? `Welcome to\nHUMI Premium` : `You've unlocked\nHUMI Premium`}
          </Text>

          <Text style={s.trialSub}>
            {promoConfig
              ? `Your code was applied — ${trialDays} full days of Premium are waiting for you.`
              : `No credit card. No commitment.\nJust the full experience for ${trialDays} days.`}
          </Text>

          {promoConfig && (
            <View style={s.promoAppliedBanner}>
              <Icon name="checkmark-circle" size={18} color={GOLD} />
              <Text style={s.promoAppliedTxt}>Code {appliedPromoCode} · {trialDays}-day trial ready</Text>
            </View>
          )}

          <View style={s.featureList}>
            {features.map(f => (
              <View key={f.text} style={s.featureRow}>
                <View style={[s.featureIcon, promoConfig && s.featureIconGold]}>
                  <Icon name={f.icon} size={16} color={promoConfig ? GOLD : BROWN} />
                </View>
                <Text style={s.featureTxt}>{f.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fade, width: '100%' }}>
          <TouchableOpacity style={[s.trialBtn, promoConfig && s.trialBtnPromo]} onPress={onComplete}>
            <Text style={[s.trialBtnTxt, promoConfig && s.trialBtnTxtPromo]}>Enter the Lounge</Text>
          </TouchableOpacity>

          {!promoConfig && (
            <TouchableOpacity onPress={openPromoModal} style={s.promoLink}>
              <Text style={s.promoLinkTxt}>Have a promo code?</Text>
            </TouchableOpacity>
          )}

          <Text style={s.trialNote}>
            After {trialDays} days, enjoy 5 free scans/month — or upgrade anytime to keep premium.
          </Text>
        </Animated.View>
      </View>

      <Modal visible={showPromoModal} transparent animationType="fade" onRequestClose={closePromoModal}>
        <KeyboardAvoidingView
          style={s.promoModalOuter}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closePromoModal} activeOpacity={1} />
          <View style={s.promoModalCard}>
            <Text style={s.promoModalTitle}>Enter your promo code</Text>
            <TextInput
              style={s.promoModalInput}
              placeholder="e.g. HUMI123"
              placeholderTextColor={MUTED}
              value={codeInput}
              onChangeText={t => { setCodeInput(t); setPromoError(''); }}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
            {!!promoError && <Text style={s.promoModalErr}>{promoError}</Text>}
            <TouchableOpacity style={s.promoModalApplyBtn} onPress={handleApply}>
              <Text style={s.promoModalApplyTxt}>Apply Code</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={closePromoModal} style={s.promoModalCancel}>
              <Text style={s.promoModalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <StogieSkoolWelcomeModal
        visible={showStogieSkoolCards}
        onComplete={onComplete}
        ctaLabel="Enter the Lounge"
      />
    </SafeAreaView>
    </View>
  );
}

// ─── Main controller ───────────────────────────────────────────────────────
export default function OnboardingNew({ onComplete, demoMode = false, pendingPromoCode = null }) {
  const [step,             setStep]           = useState(0);

  // Q1 → expertise
  const [durationId,       setDurationId]     = useState(null);
  // Q2 → favoriteCigar
  const [favoriteCigar,    setFavoriteCigar]  = useState('');
  // Q3 → memoryPain
  const [memoryPain,       setMemoryPain]     = useState(null);
  // Q4 → trackingMethod
  const [trackingMethod,   setTrackingMethod] = useState(null);
  // Q5 → flavorPreferences (labels)
  const [flavorPrefs,      setFlavorPrefs]    = useState([]);
  // Q6 → pairingPreferences (labels) + free-text for "Other"
  const [pairingPrefs,      setPairingPrefs]      = useState([]);
  const [otherPairingText,  setOtherPairingText]  = useState('');
  // Q7 → knowledgeGap (label)
  const [knowledgeGap,     setKnowledgeGap]   = useState(null);
  // Q8 → referralSource
  const [source,           setSource]         = useState(null);
  const [otherText,        setOtherText]      = useState('');

  const [cigar,            setCigar]          = useState(null);
  const [onboardingPromo,  setOnboardingPromo]= useState(pendingPromoCode);

  const go   = n => setStep(n);
  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => Math.max(0, s - 1));

  const toggleFlavor  = label => setFlavorPrefs(p => p.includes(label) ? p.filter(x => x !== label) : [...p, label]);
  const togglePairing = label => setPairingPrefs(p => p.includes(label) ? p.filter(x => x !== label) : [...p, label]);

  const handleLineupSelect = selected => { setCigar(selected); go(11); };

  // Derive expertise from Q1 selection
  const getExpertise = () => {
    if (!durationId) return 'beginner';
    const opt = DURATION_OPTIONS.find(o => o.id === durationId);
    return opt ? opt.expertise : 'beginner';
  };

  // Build interests array from Q5 + Q6 + Q7
  const buildInterests = () => {
    const set = new Set();

    // Q5: any flavor selection adds 'flavors'
    if (flavorPrefs.length > 0) set.add('flavors');

    // Q6: pairings that have addsPairings=true
    const hasPairingInterest = pairingPrefs.some(label => {
      const opt = PAIRING_OPTIONS.find(p => p.label === label);
      return opt?.addsPairings;
    });
    if (hasPairingInterest) set.add('pairings');

    // Q7: map knowledge gap label to interest tags
    if (knowledgeGap) {
      const gapOpt = GAP_OPTIONS.find(o => o.label === knowledgeGap);
      if (gapOpt) gapOpt.interests.forEach(i => set.add(i));
    }

    return Array.from(set);
  };

  const finishAndEnter = async () => {
    if (demoMode) { setStep(0); setCigar(null); return; }
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        const promoConfig = onboardingPromo ? ONBOARDING_PROMO_CODES[onboardingPromo] : null;
        const expertise   = getExpertise();
        const interests   = buildInterests();

        const userFields = {
          expertise,
          interests,
          referralSource: source === 'other' ? otherText : source,
          // new fields
          favoriteCigar:      favoriteCigar.trim() || null,
          memoryPain:         memoryPain || null,
          trackingMethod:     trackingMethod || null,
          flavorPreferences:  flavorPrefs,
          pairingPreferences: pairingPrefs.map(l =>
            l === 'Other' && otherPairingText.trim() ? otherPairingText.trim() : l
          ),
          knowledgeGap:       knowledgeGap || null,
          onboardingCompleted: true,
          createdAt: serverTimestamp(),
        };
        if (promoConfig) {
          userFields.promoCodeUsed       = onboardingPromo;
          userFields.promoCodeAppliedAt  = new Date().toISOString();
          userFields.userType            = promoConfig.userType;
          if (promoConfig.userType === 'stogie_skool') {
            userFields.stogieSkoolWelcomeSeen     = true;
            userFields.stogieSkoolWelcomeSeenAt   = new Date().toISOString();
          }
        }
        await setDoc(doc(db, 'users', userId), userFields, { merge: true });
        const trialSource = promoConfig ? promoConfig.source : 'onboarding_v3';
        const trialDays   = promoConfig ? promoConfig.days  : null;
        await grantWelcomeTrial(userId, trialSource, trialDays);
      }
    } catch (e) { console.error('Onboarding save error:', e); }
    onComplete?.();
  };

  switch (step) {
    case 0:  return <WelcomeStep onNext={next} />;
    case 1:  return <DurationStep value={durationId} setValue={setDurationId} onNext={next} onBack={back} />;
    case 2:  return <FavoriteCigarStep value={favoriteCigar} setValue={setFavoriteCigar} onNext={next} onSkip={next} onBack={back} />;
    case 3:  return <MemoryPainStep value={memoryPain} setValue={setMemoryPain} onNext={next} onBack={back} />;
    case 4:  return <TrackingStep value={trackingMethod} setValue={setTrackingMethod} onNext={next} onBack={back} />;
    case 5:  return <FlavorsStep selected={flavorPrefs} toggle={toggleFlavor} onNext={next} onBack={back} />;
    case 6:  return <PairingsStep selected={pairingPrefs} toggle={togglePairing} otherText={otherPairingText} onOtherTextChange={setOtherPairingText} onNext={next} onBack={back} />;
    case 7:  return <KnowledgeGapStep value={knowledgeGap} setValue={setKnowledgeGap} onNext={next} onBack={back} />;
    case 8:  return <SourceStep source={source} setSource={setSource} otherText={otherText} setOtherText={setOtherText} onNext={next} onBack={back} />;
    case 9:  return <HowItWorksStep onNext={() => go(10)} onBack={back} />;
    case 10: return <LineupStep onSelect={handleLineupSelect} onBack={() => go(9)} />;
    case 11: return <LoadingStep cigar={cigar} onComplete={() => go(12)} />;
    case 12: return <ResultStep cigar={cigar} onComplete={() => go(13)} />;
    case 13: return <TrialStep onComplete={finishAndEnter} appliedPromoCode={onboardingPromo} onPromoApplied={setOnboardingPromo} />;
    default: return <WelcomeStep onNext={next} />;
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },

  centeredWrap: {
    flex: 1, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 48,
    alignItems: 'center', justifyContent: 'center', gap: 52,
  },
  logoBox: {
    width: 96, height: 96, borderRadius: 22, backgroundColor: BROWN,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
    shadowColor: BROWN, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 14, elevation: 8,
  },
  logoText:   { fontSize: 28, fontWeight: '800', color: WHITE, letterSpacing: 4 },
  h1:         { fontSize: 34, fontWeight: '800', color: DARK,  textAlign: 'center', marginBottom: 10 },
  brandSub:   { fontSize: 16, fontWeight: '600', color: BROWN, textAlign: 'center', marginBottom: 14, letterSpacing: 0.6 },
  tagline:    { fontSize: 15, color: MUTED, textAlign: 'center', lineHeight: 22 },

  stepWrap:    { flex: 1, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 36 },
  backBtn:     { padding: 8, marginLeft: -8, marginBottom: 2, alignSelf: 'flex-start' },

  stepHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, marginLeft: -8 },
  stepHeaderBack:  { padding: 8 },
  stepHeaderBrand: { fontSize: 13, fontWeight: '800', color: BROWN, letterSpacing: 3, opacity: 0.45 },
  progressRow: { flexDirection: 'row', gap: 5, marginBottom: 26 },
  progressSeg: { height: 3, flex: 1, borderRadius: 2, backgroundColor: BORDER },
  progressSegOn: { backgroundColor: BROWN },
  h2:          { fontSize: 24, fontWeight: '800', color: DARK, marginBottom: 18 },
  sub:         { fontSize: 14, color: MUTED, marginBottom: 28, lineHeight: 20, marginTop: -8 },

  optList:     { gap: 11, marginBottom: 20 },
  optCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 12, padding: 15, borderWidth: 2, borderColor: BORDER, gap: 12 },
  optCardOn:   { borderColor: BROWN, backgroundColor: LIGHT },
  optIcon:     { width: 44, height: 44, borderRadius: 22, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center' },
  optIconOn:   { backgroundColor: BROWN },
  optTitle:    { fontSize: 15, fontWeight: '600', color: DARK },
  optDesc:     { fontSize: 12, color: MUTED },

  chipGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignContent: 'flex-start', paddingBottom: 8 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24, backgroundColor: WHITE, borderWidth: 2, borderColor: BORDER },
  chipOn:      { backgroundColor: BROWN, borderColor: BROWN },
  chipTxt:     { fontSize: 15, fontWeight: '600', color: DARK },
  chipTxtOn:   { color: WHITE },

  textInput: {
    borderWidth: 1.5, borderColor: BROWN, borderRadius: 10,
    padding: 12, fontSize: 14, color: DARK, backgroundColor: WHITE,
    marginTop: 10,
  },
  textInputLarge: {
    borderWidth: 1.5, borderColor: BROWN, borderRadius: 12,
    padding: 16, fontSize: 16, color: DARK, backgroundColor: WHITE,
    marginTop: 8, minHeight: 56,
  },
  skipLink:    { alignItems: 'center', paddingTop: 14 },
  skipLinkTxt: { fontSize: 14, color: BROWN, fontWeight: '600' },

  howHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  howList:      { gap: 14, marginBottom: 20, flex: 1 },
  howCard:      { flexDirection: 'row', alignItems: 'flex-start', gap: 13, backgroundColor: WHITE, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
  howNum:       { width: 24, height: 24, borderRadius: 12, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  howNumTxt:    { fontSize: 12, fontWeight: '800', color: WHITE },
  howIconCircle:{ width: 42, height: 42, borderRadius: 21, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center' },
  howTitle:     { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 4 },
  howBody:      { fontSize: 12, color: MUTED, lineHeight: 18 },
  howCallout:   { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, backgroundColor: LIGHT, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: BROWN },
  howCalloutTxt:{ fontSize: 13, fontWeight: '600', color: BROWN },

  lineupCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 14, padding: 12, borderWidth: 2, borderColor: BORDER, gap: 12 },
  lineupCardOn: { borderColor: BROWN, backgroundColor: LIGHT },
  cigarThumb:   { width: 48, height: 100, borderRadius: 6 },
  lineupName:   { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 3 },
  lineupVitola: { fontSize: 12, color: MUTED, marginBottom: 2 },
  lineupCountry:{ fontSize: 11, color: MUTED, opacity: 0.75 },
  lineupCheck:  { width: 26, height: 26, borderRadius: 13, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center' },
  sendBtn:      { backgroundColor: BROWN, borderRadius: 13, padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: BROWN, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 9, elevation: 4 },

  loadWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  pulseRing:  { position: 'absolute', width: 134, height: 134, borderRadius: 67, borderWidth: 2, borderColor: BROWN, opacity: 0.18 },
  spinRing:   { position: 'absolute', width: 106, height: 106, borderRadius: 53, borderWidth: 3, borderColor: 'transparent', borderTopColor: BROWN },
  scanCenter: { width: 74, height: 74, borderRadius: 37, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 42 },
  loadTitle:  { fontSize: 18, fontWeight: '700', color: DARK, marginBottom: 8, textAlign: 'center' },
  loadStage:  { fontSize: 13, color: MUTED, textAlign: 'center', marginBottom: 6, minHeight: 18 },
  loadCigar:  { fontSize: 12, color: BROWN, fontWeight: '600', textAlign: 'center', marginBottom: 20, opacity: 0.8 },
  loadDots:   { flexDirection: 'row', gap: 6 },
  dot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: BORDER },
  dotOn:      { backgroundColor: BROWN },

  confettiOrigin: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 0, height: 0, zIndex: 5 },
  particle:       { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  celebCard: {
    backgroundColor: WHITE, borderRadius: 20, padding: 24, alignItems: 'flex-start',
    marginHorizontal: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 10, width: '85%',
  },
  celebCigarName: { fontSize: 20, fontWeight: '800', color: DARK, marginBottom: 4, marginTop: 10 },
  celebVitola:    { fontSize: 13, color: MUTED, marginBottom: 14 },
  celebNotesRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  celebHint:      { fontSize: 12, color: BROWN, fontWeight: '600', opacity: 0.8 },

  resultHeader: { backgroundColor: BROWN, padding: 24, paddingTop: 44 },
  matchBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 9, marginBottom: 11, alignSelf: 'flex-start' },
  matchTxt:     { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  resultName:   { fontSize: 21, fontWeight: '800', color: WHITE, marginBottom: 5, lineHeight: 27 },
  resultVitola: { fontSize: 13, color: 'rgba(255,255,255,0.72)', fontWeight: '500', marginBottom: 2 },
  resultCountry:{ fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  card:         { margin: 13, marginBottom: 9, backgroundColor: WHITE, borderRadius: 12, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  cardLabel:    { fontSize: 10, fontWeight: '700', color: BROWN, letterSpacing: 1.3, marginBottom: 9, textTransform: 'uppercase' },
  cardBody:     { fontSize: 14, color: '#444', lineHeight: 22 },
  notesRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  noteChip:     { backgroundColor: LIGHT, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 16 },
  noteTxt:      { fontSize: 12, color: BROWN, fontWeight: '600' },
  resultBar:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: CREAM, padding: 17, paddingBottom: 30, borderTopWidth: 1, borderTopColor: BORDER },

  trialWrap:    { flex: 1, paddingHorizontal: 26, paddingTop: 54, paddingBottom: 42, alignItems: 'center', justifyContent: 'space-between', backgroundColor: BROWN },
  trialBadge:   { backgroundColor: 'rgba(255,255,255,0.16)', paddingVertical: 5, paddingHorizontal: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  trialBadgeTxt:{ fontSize: 11, fontWeight: '800', color: WHITE, letterSpacing: 2 },
  trialH:       { fontSize: 29, fontWeight: '800', color: WHITE, textAlign: 'center', marginBottom: 12, lineHeight: 37 },
  trialSub:     { fontSize: 13, color: 'rgba(255,255,255,0.72)', textAlign: 'center', lineHeight: 21, marginBottom: 16 },
  featureList:  { width: '100%', gap: 12 },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: 11 },
  featureIcon:  { width: 33, height: 33, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  featureTxt:   { fontSize: 14, color: WHITE, fontWeight: '500', flex: 1 },
  trialBtn:     { backgroundColor: WHITE, borderRadius: 13, padding: 17, alignItems: 'center', marginBottom: 11, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 4 },
  trialBtnTxt:  { fontSize: 16, fontWeight: '800', color: BROWN },
  trialNote:    { fontSize: 11, color: 'rgba(255,255,255,0.48)', textAlign: 'center', lineHeight: 16, marginTop: 10 },

  promoBadge:         { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(196,120,26,0.22)', paddingVertical: 7, paddingHorizontal: 18, borderRadius: 20, marginBottom: 16, borderWidth: 1.5, borderColor: GOLD },
  promoBadgeTxt:      { fontSize: 12, fontWeight: '800', color: GOLD, letterSpacing: 1.8 },
  promoAppliedBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(196,120,26,0.18)', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, marginBottom: 22, alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(196,120,26,0.45)' },
  promoAppliedTxt:    { fontSize: 14, fontWeight: '700', color: GOLD },
  featureIconGold:    { backgroundColor: 'rgba(196,120,26,0.22)' },
  trialBtnPromo:      { borderWidth: 2, borderColor: GOLD },
  trialBtnTxtPromo:   { color: BROWN },
  promoLink:          { alignItems: 'center', paddingVertical: 10 },
  promoLinkTxt:       { fontSize: 14, color: 'rgba(255,255,255,0.75)', textDecorationLine: 'underline' },

  promoModalOuter:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 28 },
  promoModalCard:     { width: '100%', backgroundColor: WHITE, borderRadius: 18, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12 },
  promoModalTitle:    { fontSize: 17, fontWeight: '800', color: DARK, marginBottom: 16, textAlign: 'center' },
  promoModalInput:    { borderWidth: 1.5, borderColor: BORDER, borderRadius: 11, paddingVertical: 13, paddingHorizontal: 14, fontSize: 16, color: DARK, backgroundColor: CREAM, letterSpacing: 1, marginBottom: 6 },
  promoModalErr:      { fontSize: 12, color: '#c0392b', textAlign: 'center', marginBottom: 8 },
  promoModalApplyBtn: { backgroundColor: BROWN, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  promoModalApplyTxt: { fontSize: 15, fontWeight: '700', color: WHITE },
  promoModalCancel:   { alignItems: 'center', paddingTop: 14 },
  promoModalCancelTxt:{ fontSize: 14, color: MUTED },

  btn:    { backgroundColor: BROWN, borderRadius: 13, padding: 17, alignItems: 'center', shadowColor: BROWN, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 9, elevation: 4 },
  btnTxt: { fontSize: 16, fontWeight: '800', color: WHITE },
  btnOff: { opacity: 0.45 },
});
