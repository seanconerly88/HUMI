// app/onboarding-new.js
// NEW ONBOARDING v2 - "WOW First" flow
// Steps: 0=welcome, 1=expertise, 2=interests, 3=cigar_lineup, 4=scan_result, 5=celebration, 6=trial_reveal

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import Icon from './components/Icon';
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { grantWelcomeTrial } from '../src/services/subscriptionService';

const { width: screenWidth } = Dimensions.get('window');

// ─── HUMI Brand Colors (only use these) ────────────────────────────────────
const BROWN = '#8B4513';
const CREAM = '#faf7f3';
const LIGHT_BG = '#f7f2e9';
const DARK = '#1A1A1A';
const MUTED = '#666666';
const BORDER = '#e0d5c8';
const WHITE = '#ffffff';

// ─── Cigar Lineup Data ─────────────────────────────────────────────────────
const CIGARS = [
  {
    id: 'padron',
    name: 'Padron 1964 Anniversary',
    vitola: 'Hermoso · Natural',
    country: 'Nicaragua',
    strength: 'Full',
    emoji: '🟤',
    tagline: 'The benchmark everything else is measured against',
    humiBlurb:
      "Few cigars command the reverence of the Padron 1964 Anniversary Series. Born to celebrate the brand's founding year, this Hermoso natural is a masterclass in Nicaraguan tobacco — rich, complex, and impeccably constructed. Expect a slow, even burn that reveals layer upon layer of dark chocolate, espresso, and cedar, with a finish that lingers long after the last draw.",
    commonNotes: ['Dark Chocolate', 'Espresso', 'Cedar', 'Leather', 'Earth', 'Subtle Sweetness'],
    peopleSaying:
      "Consistently ranked among the top cigars in the world, aficionados describe the 1964 as \"the benchmark everything else is measured against.\" Many cite its flawless construction and complexity as the reason they keep returning. One enthusiast wrote: \"I've smoked everything. Nothing touches a box-pressed 1964 in great condition.\"",
    recommendedPairings:
      'Añejo Rum — The caramel and vanilla notes beautifully complement the chocolate and earth. Alternatively, a single-origin dark roast coffee or a dram of Speyside Scotch brings out the cedar and subtle sweetness in the finish.',
  },
  {
    id: 'opusx',
    name: 'Arturo Fuente Opus X',
    vitola: 'Fuente Fuente · Robusto',
    country: 'Dominican Republic',
    strength: 'Full',
    emoji: '🔴',
    tagline: 'The Dominican puro that changed everything',
    humiBlurb:
      "The Opus X is the cigar that made the world take Dominican tobacco seriously. When Carlos Fuente Jr. first released it in 1995, nobody believed a Dominican puro could compete with Cuban standards. He proved them wrong. Floral, spicy, and impossibly complex with a creamy texture — this is a unicorn that smokers spend their entire lives chasing.",
    commonNotes: ['Red Pepper', 'Cedar', 'Floral', 'Cream', 'Nutmeg', 'Dark Fruit'],
    peopleSaying:
      "The Opus X has a cult following unlike any other cigar on the market. Collectors hoard boxes like investment assets. Enthusiasts describe the experience as \"discovering cigars for the first time, all over again.\" One longtime aficionado put it simply: \"Every time I think I've found something better, I light an Opus X and it resets the scale.\"",
    recommendedPairings:
      'Single Malt Scotch — particularly an Islay expression, where the peat smoke mirrors the complexity. A fine cognac or aged Armagnac also works beautifully, letting the floral and fruity notes breathe alongside the spirit.',
  },
  {
    id: 'behike',
    name: 'Cohiba Behike 52',
    vitola: 'Corona Gorda · Cuban',
    country: 'Cuba',
    strength: 'Medium-Full',
    emoji: '🟡',
    tagline: "Cuba's most coveted expression — period",
    humiBlurb:
      "The Behike is Habanos S.A.'s ultimate statement — a blend incorporating Medio Tiempo leaves found in fewer than 10% of tobacco plants worldwide. Released in 2010 as a hyped limited edition and later a permanent line, the Behike 52 is everything Cuba wants you to believe about its tobacco: silky, nuanced, and undeniably elegant.",
    commonNotes: ['Milk Chocolate', 'Cinnamon', 'Hay', 'White Pepper', 'Cream', 'Dried Fruit'],
    peopleSaying:
      "Cohiba devotees consider the Behike the pinnacle of the lineup — more refined than the Siglo VI, more complex than the Espléndido. Collectors who've had pristine examples aged five or more years describe it as \"the truest expression of Cuban terroir you can smoke today.\"",
    recommendedPairings:
      'Havana Club 7-Year rum is the most traditional pairing and enhances the natural sweetness perfectly. For a bolder contrast, a well-aged Calvados or fine champagne cuts through the creaminess with just the right acidity.',
  },
];

const LOADING_STAGES = [
  'Sending to HUMI...',
  'Analyzing cigar band...',
  'Matching against database...',
  'Building flavor profile...',
  'Gathering community notes...',
];

const expertiseLevels = [
  { id: 'beginner', title: 'Beginner', description: 'New to cigars or smoke occasionally', icon: 'leaf-outline' },
  { id: 'experienced', title: 'Experienced', description: 'Familiar with various cigars and smoke regularly', icon: 'star-half-outline' },
  { id: 'aficionado', title: 'Aficionado', description: 'Deep knowledge of cigars, regions, and profiles', icon: 'trophy-outline' },
];

const interestOptions = [
  { id: 'collection', title: 'Building a Collection', icon: 'albums-outline' },
  { id: 'pairings', title: 'Pairings', icon: 'wine-outline' },
  { id: 'culture', title: 'History & Culture', icon: 'book-outline' },
  { id: 'flavors', title: 'Flavor Profiles', icon: 'color-palette-outline' },
  { id: 'insider', title: 'Insider Knowledge', icon: 'trophy-outline' },
];

// ─── Step 0: Welcome ──────────────────────────────────────────────────────
function WelcomeStep({ onNext }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.welcomeWrap}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>HUMI</Text>
          </View>
          <Text style={s.welcomeTitle}>Welcome to HUMI</Text>
          <Text style={s.welcomeSub}>The Digital Cigar Lounge</Text>
          <Text style={s.welcomeTagline}>Join the fastest growing cigar community in the world</Text>
        </Animated.View>
        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          <TouchableOpacity style={s.btn} onPress={onNext}>
            <Text style={s.btnText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 1: Expertise ───────────────────────────────────────────────────
function ExpertiseStep({ expertise, setExpertise, onNext, onBack }) {
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Icon name="chevron-back-outline" size={24} color={BROWN} />
        </TouchableOpacity>
        <ProgressBar total={2} current={0} />
        <Text style={s.stepTitle}>What's your experience level?</Text>
        <Text style={s.stepSub}>Choose one option</Text>
        <View style={s.optionList}>
          {expertiseLevels.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[s.optionCard, expertise === opt.id && s.optionCardOn]}
              onPress={() => setExpertise(opt.id)}
            >
              <View style={[s.optionIcon, expertise === opt.id && s.optionIconOn]}>
                <Icon name={opt.icon} size={22} color={expertise === opt.id ? WHITE : BROWN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.optionTitle, expertise === opt.id && { color: BROWN }]}>{opt.title}</Text>
                <Text style={s.optionDesc}>{opt.description}</Text>
              </View>
              {expertise === opt.id && <Icon name="checkmark-circle" size={20} color={BROWN} />}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.btn} onPress={onNext}>
          <Text style={s.btnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 2: Interests ───────────────────────────────────────────────────
function InterestsStep({ interests, toggleInterest, onNext, onBack }) {
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Icon name="chevron-back-outline" size={24} color={BROWN} />
        </TouchableOpacity>
        <ProgressBar total={2} current={1} />
        <Text style={s.stepTitle}>What interests you about cigars?</Text>
        <Text style={s.stepSub}>Select all that apply</Text>
        <View style={s.chipGrid}>
          {interestOptions.map(opt => {
            const on = interests.includes(opt.id);
            return (
              <TouchableOpacity
                key={opt.id}
                style={[s.chip, on && s.chipOn]}
                onPress={() => toggleInterest(opt.id)}
              >
                <Icon name={opt.icon} size={18} color={on ? WHITE : BROWN} />
                <Text style={[s.chipText, on && s.chipTextOn]}>{opt.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[s.btn, interests.length === 0 && s.btnDisabled]}
          onPress={onNext}
          disabled={interests.length === 0}
        >
          <Text style={s.btnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 3: Cigar Lineup ─────────────────────────────────────────────────
function CigarLineupStep({ onSelect, onBack }) {
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSend = () => {
    if (!selected) return;
    setSending(true);
    setTimeout(() => onSelect(selected), 400);
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Icon name="chevron-back-outline" size={24} color={BROWN} />
        </TouchableOpacity>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }}>
          <View style={s.scanHeaderRow}>
            <Icon name="scan-outline" size={20} color={BROWN} />
            <Text style={s.scanHeaderText}>Pick a cigar to scan</Text>
          </View>
          <Text style={s.stepSub}>Tap one from the lineup, then send it to HUMI</Text>

          <View style={s.lineupList}>
            {CIGARS.map((cigar, i) => {
              const isOn = selected?.id === cigar.id;
              return (
                <TouchableOpacity
                  key={cigar.id}
                  style={[s.lineupCard, isOn && s.lineupCardOn]}
                  onPress={() => setSelected(cigar)}
                  activeOpacity={0.8}
                >
                  <View style={s.lineupNum}>
                    <Text style={[s.lineupNumText, isOn && { color: WHITE }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.lineupName, isOn && { color: BROWN }]} numberOfLines={1}>{cigar.name}</Text>
                    <Text style={s.lineupVitola}>{cigar.vitola}</Text>
                    <Text style={s.lineupCountry}>{cigar.country} · {cigar.strength}</Text>
                  </View>
                  {isOn && (
                    <View style={s.lineupCheck}>
                      <Icon name="checkmark" size={16} color={WHITE} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        <TouchableOpacity
          style={[s.sendBtn, (!selected || sending) && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!selected || sending}
        >
          <Icon name="paper-plane-outline" size={18} color={WHITE} style={{ marginRight: 8 }} />
          <Text style={s.btnText}>Send to HUMI</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 4: Scan Loading → Result ───────────────────────────────────────
function ScanResultStep({ cigar, onComplete }) {
  const [phase, setPhase] = useState('loading');
  const [stageIdx, setStageIdx] = useState(0);
  const [visibleNotes, setVisibleNotes] = useState(0);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const resultFade = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(30)).current;
  const spinLoop = useRef(null);
  const pulseLoop = useRef(null);

  useEffect(() => {
    // Spin ring
    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1100, useNativeDriver: true })
    );
    spinLoop.current.start();

    // Pulse outer ring
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 850, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 850, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();

    // Advance loading stages
    let idx = 0;
    const stageTimer = setInterval(() => {
      idx++;
      if (idx < LOADING_STAGES.length) setStageIdx(idx);
    }, 900);

    // Show result after 5 seconds
    const resultTimer = setTimeout(() => {
      clearInterval(stageTimer);
      spinLoop.current?.stop();
      pulseLoop.current?.stop();
      setPhase('result');
      Animated.parallel([
        Animated.timing(resultFade, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(resultSlide, { toValue: 0, duration: 550, useNativeDriver: true }),
      ]).start();
    }, 5000);

    return () => {
      clearInterval(stageTimer);
      clearTimeout(resultTimer);
      spinLoop.current?.stop();
      pulseLoop.current?.stop();
    };
  }, []);

  // Reveal tasting notes one at a time once result appears
  useEffect(() => {
    if (phase !== 'result') return;
    let count = 0;
    const noteTimer = setInterval(() => {
      count++;
      setVisibleNotes(count);
      if (count >= cigar.commonNotes.length) clearInterval(noteTimer);
    }, 180);
    return () => clearInterval(noteTimer);
  }, [phase]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (phase === 'loading') {
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.loadingWrap}>
          <Animated.View style={[s.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
          <Animated.View style={[s.spinRing, { transform: [{ rotate: spin }] }]} />
          <View style={s.scanCenter}>
            <Icon name="scan-outline" size={32} color={BROWN} />
          </View>
          <Text style={s.loadingTitle}>HUMI is analyzing...</Text>
          <Text style={s.loadingStage}>{LOADING_STAGES[stageIdx]}</Text>
          <Text style={s.loadingCigarName}>{cigar.name}</Text>
          <View style={s.loadingDots}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[s.dot, stageIdx > i && s.dotOn]} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: CREAM }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: resultFade, transform: [{ translateY: resultSlide }] }}>

          {/* Header */}
          <View style={s.resultHeader}>
            <View style={s.matchBadge}>
              <Icon name="checkmark-circle" size={13} color="#2E7D32" />
              <Text style={s.matchText}>Match Found</Text>
            </View>
            <Text style={s.resultName}>{cigar.name}</Text>
            <Text style={s.resultVitola}>{cigar.vitola} · {cigar.strength}</Text>
            <Text style={s.resultCountry}>{cigar.country}</Text>
          </View>

          {/* HUMI Says */}
          <View style={s.card}>
            <Text style={s.cardLabel}>HUMI Says</Text>
            <Text style={s.cardBody}>{cigar.humiBlurb}</Text>
          </View>

          {/* Tasting Notes */}
          <View style={s.card}>
            <Text style={s.cardLabel}>Tasting Notes</Text>
            <View style={s.notesRow}>
              {cigar.commonNotes.map((note, i) => (
                <View
                  key={note}
                  style={[
                    s.noteChip,
                    { opacity: i < visibleNotes ? 1 : 0 },
                  ]}
                >
                  <Text style={s.noteText}>{note}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* People Saying */}
          <View style={s.card}>
            <Text style={s.cardLabel}>What People Are Saying</Text>
            <Text style={s.cardBody}>{cigar.peopleSaying}</Text>
          </View>

          {/* Pairings */}
          <View style={s.card}>
            <Text style={s.cardLabel}>Pairs Well With</Text>
            <Text style={s.cardBody}>{cigar.recommendedPairings}</Text>
          </View>

        </Animated.View>
      </ScrollView>

      <View style={s.resultBar}>
        <TouchableOpacity style={s.btn} onPress={onComplete}>
          <Text style={s.btnText}>That's incredible — let's go</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 5: Celebration ──────────────────────────────────────────────────
function CelebrationStep({ onNext }) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.celebWrap}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={{ fontSize: 60, marginBottom: 24 }}>🥂</Text>
          <Text style={s.celebTitle}>Welcome to the Lounge.</Text>
          <Text style={s.celebSub}>
            You just scanned your first cigar.{'\n'}That's what HUMI is all about.
          </Text>
          <Text style={s.celebBody}>
            Every cigar you smoke gets its own profile — logged, rated, and remembered in your personal digital humidor.
          </Text>
        </Animated.View>
        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          <TouchableOpacity style={s.btn} onPress={onNext}>
            <Text style={s.btnText}>What's next?</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 6: Trial Reveal ─────────────────────────────────────────────────
function TrialRevealStep({ onComplete }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const features = [
    { icon: 'infinite-outline', text: 'Unlimited AI cigar scans' },
    { icon: 'star-outline', text: 'Full tasting notes & flavor profiles' },
    { icon: 'people-outline', text: 'What the community is saying' },
    { icon: 'trophy-outline', text: 'Your complete smoking profile' },
    { icon: 'calendar-outline', text: 'Events & Cigar of the Month' },
  ];

  return (
    <SafeAreaView style={[s.screen, s.trialScreen]}>
      <View style={s.trialWrap}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center', width: '100%' }}>
          <View style={s.trialBadge}>
            <Text style={s.trialBadgeText}>7 DAYS FREE</Text>
          </View>
          <Text style={s.trialTitle}>You've unlocked{'\n'}HUMI Premium</Text>
          <Text style={s.trialSub}>No credit card. No commitment.{'\n'}Just the full experience for 7 days.</Text>

          <View style={s.featureList}>
            {features.map(f => (
              <View key={f.text} style={s.featureRow}>
                <View style={s.featureIconWrap}>
                  <Icon name={f.icon} size={17} color={BROWN} />
                </View>
                <Text style={s.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          <TouchableOpacity style={s.trialBtn} onPress={onComplete}>
            <Text style={s.trialBtnText}>Enter the Lounge</Text>
          </TouchableOpacity>
          <Text style={s.trialNote}>
            After 7 days, enjoy 5 free scans/month — or upgrade anytime to keep premium.
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Shared: Progress Bar ─────────────────────────────────────────────────
function ProgressBar({ total, current }) {
  return (
    <View style={s.progressRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[s.progressSeg, i <= current && s.progressSegOn]} />
      ))}
    </View>
  );
}

// ─── Main Controller ──────────────────────────────────────────────────────
export default function OnboardingNew({ onComplete, demoMode = false }) {
  const [step, setStep] = useState(0);
  const [expertise, setExpertise] = useState('experienced');
  const [interests, setInterests] = useState(['flavors']);
  const [selectedCigar, setSelectedCigar] = useState(null);

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => Math.max(0, s - 1));

  const handleCigarSelect = (cigar) => {
    setSelectedCigar(cigar);
    setStep(4);
  };

  const handleFinish = async () => {
    if (demoMode) {
      setStep(0);
      setSelectedCigar(null);
      return;
    }
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        await setDoc(doc(db, 'users', userId), {
          expertise,
          interests,
          onboardingCompleted: true,
          createdAt: serverTimestamp(),
        }, { merge: true });
        await grantWelcomeTrial(userId, 'onboarding_v2');
      }
    } catch (e) {
      console.error('Onboarding save error:', e);
    }
    onComplete?.();
  };

  switch (step) {
    case 0: return <WelcomeStep onNext={next} />;
    case 1: return <ExpertiseStep expertise={expertise} setExpertise={setExpertise} onNext={next} onBack={back} />;
    case 2: return <InterestsStep interests={interests} toggleInterest={id => setInterests(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id])} onNext={next} onBack={back} />;
    case 3: return <CigarLineupStep onSelect={handleCigarSelect} onBack={back} />;
    case 4: return selectedCigar ? <ScanResultStep cigar={selectedCigar} onComplete={() => setStep(5)} /> : null;
    case 5: return <CelebrationStep onNext={() => setStep(6)} />;
    case 6: return <TrialRevealStep onComplete={handleFinish} />;
    default: return <WelcomeStep onNext={next} />;
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  // Welcome
  welcomeWrap: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: BROWN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: BROWN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: 4,
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: DARK,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: 16,
    fontWeight: '600',
    color: BROWN,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeTagline: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 21,
  },

  // Steps
  stepWrap: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 36,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  progressSeg: {
    height: 3,
    flex: 1,
    borderRadius: 2,
    backgroundColor: BORDER,
  },
  progressSegOn: {
    backgroundColor: BROWN,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: DARK,
    marginBottom: 6,
  },
  stepSub: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 24,
    lineHeight: 20,
  },

  // Expertise options
  optionList: {
    flex: 1,
    gap: 10,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: BORDER,
    gap: 12,
  },
  optionCardOn: {
    borderColor: BROWN,
    backgroundColor: LIGHT_BG,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: LIGHT_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconOn: {
    backgroundColor: BROWN,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: MUTED,
  },

  // Interest chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    flex: 1,
    alignContent: 'flex-start',
    marginBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: BORDER,
  },
  chipOn: {
    backgroundColor: BROWN,
    borderColor: BROWN,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK,
  },
  chipTextOn: {
    color: WHITE,
  },

  // Cigar lineup
  scanHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  scanHeaderText: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK,
  },
  lineupList: {
    flex: 1,
    gap: 10,
    marginBottom: 16,
  },
  lineupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: BORDER,
    gap: 14,
  },
  lineupCardOn: {
    borderColor: BROWN,
    backgroundColor: LIGHT_BG,
  },
  lineupNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LIGHT_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineupNumText: {
    fontSize: 14,
    fontWeight: '700',
    color: BROWN,
  },
  lineupName: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
    marginBottom: 2,
  },
  lineupVitola: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 1,
  },
  lineupCountry: {
    fontSize: 11,
    color: MUTED,
    opacity: 0.8,
  },
  lineupCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BROWN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    backgroundColor: BROWN,
    borderRadius: 13,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  pulseRing: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 2,
    borderColor: BROWN,
    opacity: 0.2,
  },
  spinRing: {
    position: 'absolute',
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: BROWN,
  },
  scanCenter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: LIGHT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
  },
  loadingTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: DARK,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingStage: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 6,
    minHeight: 18,
  },
  loadingCigarName: {
    fontSize: 12,
    color: BROWN,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BORDER,
  },
  dotOn: {
    backgroundColor: BROWN,
  },

  // Scan result
  resultHeader: {
    backgroundColor: BROWN,
    padding: 26,
    paddingTop: 48,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  matchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  resultName: {
    fontSize: 22,
    fontWeight: '800',
    color: WHITE,
    marginBottom: 5,
    lineHeight: 28,
  },
  resultVitola: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 2,
  },
  resultCountry: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  card: {
    margin: 14,
    marginTop: 0,
    marginBottom: 10,
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: BROWN,
    letterSpacing: 1.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  cardBody: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  notesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  noteChip: {
    backgroundColor: LIGHT_BG,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 18,
  },
  noteText: {
    fontSize: 12,
    color: BROWN,
    fontWeight: '600',
  },
  resultBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: CREAM,
    padding: 18,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  // Celebration
  celebWrap: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  celebTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: DARK,
    textAlign: 'center',
    marginBottom: 12,
  },
  celebSub: {
    fontSize: 16,
    color: BROWN,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 16,
  },
  celebBody: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Trial
  trialScreen: {
    backgroundColor: BROWN,
  },
  trialWrap: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 56,
    paddingBottom: 44,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BROWN,
  },
  trialBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  trialBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: 2,
  },
  trialTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: WHITE,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 38,
  },
  trialSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  featureList: {
    width: '100%',
    gap: 13,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    color: WHITE,
    fontWeight: '500',
    flex: 1,
  },
  trialBtn: {
    backgroundColor: WHITE,
    borderRadius: 13,
    padding: 17,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  trialBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: BROWN,
  },
  trialNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Shared
  btn: {
    backgroundColor: BROWN,
    borderRadius: 13,
    padding: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
    width: '100%',
  },
  btnDisabled: {
    opacity: 0.38,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: WHITE,
  },
});
