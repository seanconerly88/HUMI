// app/onboarding-new.js
// NEW ONBOARDING v2 - "WOW First" flow
// Steps: 0=welcome, 1=expertise, 2=interests, 3=cigar_choice, 4=scan_experience, 5=celebration, 6=trial_reveal

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import Icon from './components/Icon';
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { grantWelcomeTrial } from '../src/services/subscriptionService';

const { width: screenWidth } = Dimensions.get('window');
const BROWN = '#5C2E00';
const GOLD = '#C9A96E';
const CREAM = '#FAF7F2';
const DARK = '#1A1A1A';
const MUTED = '#8B7355';

// ─── Padron 1964 Demo Data ─────────────────────────────────────────────────
const PADRON_1964 = {
  name: 'Padron 1964 Anniversary Series',
  vitola: 'Hermoso',
  wrapper: 'Natural Nicaraguan',
  strength: 'Full',
  country: 'Nicaragua',
  humiBlurb:
    'Few cigars command the reverence of the Padron 1964 Anniversary Series. Born to celebrate the brand\'s founding year, this Hermoso is a masterclass in Nicaraguan tobacco — rich, complex, and impeccably constructed. Expect a slow, even burn that reveals layer upon layer of dark chocolate, espresso, and cedar, with a finish that lingers long after the last draw.',
  commonNotes: ['Dark Chocolate', 'Espresso', 'Cedar', 'Leather', 'Earth', 'Subtle Sweetness'],
  peopleSaying:
    'Consistently ranked among the top cigars in the world, aficionados describe the 1964 as "the benchmark everything else is measured against." Many cite its flawless construction and complexity as the reason they keep returning. One enthusiast wrote: "I\'ve smoked everything. Nothing touches a box-pressed 1964 in great condition."',
  recommendedPairings:
    'Añejo Rum — The caramel and vanilla notes beautifully complement the chocolate and earth of this cigar. Alternatively, a single-origin dark roast coffee or a dram of Speyside Scotch brings out the cedar and subtle sweetness in the finish.',
};

const LOADING_STAGES = [
  'Analyzing cigar band...',
  'Matching against database...',
  'Building flavor profile...',
  'Gathering community notes...',
  'Almost ready...',
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
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.fullScreen}>
      <View style={s.welcomeContainer}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>HUMI</Text>
          </View>
          <Text style={s.welcomeTitle}>Welcome to HUMI</Text>
          <Text style={s.welcomeSubtitle}>The Digital Cigar Lounge</Text>
          <Text style={s.welcomeTagline}>
            Join the fastest growing cigar community in the world
          </Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          <TouchableOpacity style={s.primaryBtn} onPress={onNext}>
            <Text style={s.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 1: Expertise ───────────────────────────────────────────────────
function ExpertiseStep({ expertise, setExpertise, onNext, onBack }) {
  return (
    <SafeAreaView style={s.fullScreen}>
      <View style={s.stepContainer}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Icon name="chevron-back-outline" size={24} color={BROWN} />
        </TouchableOpacity>
        <View style={s.progressRow}>
          {[0, 1].map(i => (
            <View key={i} style={[s.progressDot, i === 0 && s.progressDotActive]} />
          ))}
        </View>
        <Text style={s.stepTitle}>What's your experience level?</Text>
        <Text style={s.stepSubtitle}>Choose one option</Text>

        <View style={s.optionsList}>
          {expertiseLevels.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[s.optionCard, expertise === opt.id && s.optionCardSelected]}
              onPress={() => setExpertise(opt.id)}
            >
              <View style={[s.optionIcon, expertise === opt.id && s.optionIconSelected]}>
                <Icon name={opt.icon} size={24} color={expertise === opt.id ? '#fff' : BROWN} />
              </View>
              <View style={s.optionText}>
                <Text style={[s.optionTitle, expertise === opt.id && s.optionTitleSelected]}>{opt.title}</Text>
                <Text style={s.optionDesc}>{opt.description}</Text>
              </View>
              {expertise === opt.id && (
                <Icon name="checkmark-circle" size={22} color={BROWN} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={onNext}>
          <Text style={s.primaryBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 2: Interests ───────────────────────────────────────────────────
function InterestsStep({ interests, toggleInterest, onNext, onBack }) {
  return (
    <SafeAreaView style={s.fullScreen}>
      <View style={s.stepContainer}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Icon name="chevron-back-outline" size={24} color={BROWN} />
        </TouchableOpacity>
        <View style={s.progressRow}>
          {[0, 1].map(i => (
            <View key={i} style={[s.progressDot, i <= 1 && s.progressDotActive]} />
          ))}
        </View>
        <Text style={s.stepTitle}>What interests you about cigars?</Text>
        <Text style={s.stepSubtitle}>Select all that apply</Text>

        <View style={s.interestGrid}>
          {interestOptions.map(opt => {
            const selected = interests.includes(opt.id);
            return (
              <TouchableOpacity
                key={opt.id}
                style={[s.interestChip, selected && s.interestChipSelected]}
                onPress={() => toggleInterest(opt.id)}
              >
                <Icon name={opt.icon} size={20} color={selected ? '#fff' : BROWN} />
                <Text style={[s.interestChipText, selected && s.interestChipTextSelected]}>{opt.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, interests.length === 0 && s.primaryBtnDisabled]}
          onPress={onNext}
          disabled={interests.length === 0}
        >
          <Text style={s.primaryBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 3: Cigar Choice ─────────────────────────────────────────────────
function CigarChoiceStep({ onHasCigar, onNoCigar, onBack }) {
  return (
    <SafeAreaView style={s.fullScreen}>
      <View style={s.stepContainer}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Icon name="chevron-back-outline" size={24} color={BROWN} />
        </TouchableOpacity>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={s.cigarIconCircle}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
          </View>
          <Text style={s.stepTitle}>Let's do your first scan</Text>
          <Text style={[s.stepSubtitle, { textAlign: 'center', marginBottom: 40 }]}>
            HUMI uses AI to instantly identify any cigar and build you a full tasting profile.
          </Text>

          <TouchableOpacity style={s.primaryBtn} onPress={onHasCigar}>
            <Icon name="camera-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.primaryBtnText}>I have a cigar — scan it</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={onNoCigar}>
            <Icon name="play-circle-outline" size={20} color={BROWN} style={{ marginRight: 8 }} />
            <Text style={s.secondaryBtnText}>Show me how it works</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 4: Scan Experience ──────────────────────────────────────────────
function ScanExperienceStep({ isDemo, onComplete }) {
  const [phase, setPhase] = useState('loading'); // loading | result
  const [loadingStage, setLoadingStage] = useState(0);
  const [visibleNotes, setVisibleNotes] = useState(0);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const resultFade = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Spin animation
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();

    // Pulse on the outer ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // Cycle through loading stages
    let stage = 0;
    const stageInterval = setInterval(() => {
      stage++;
      if (stage < LOADING_STAGES.length) {
        setLoadingStage(stage);
      }
    }, 900);

    // After 4.5s, show result
    const resultTimer = setTimeout(() => {
      clearInterval(stageInterval);
      setPhase('result');
      Animated.parallel([
        Animated.timing(resultFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(resultSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 4600);

    return () => {
      clearInterval(stageInterval);
      clearTimeout(resultTimer);
    };
  }, []);

  // Reveal tasting notes one by one after result appears
  useEffect(() => {
    if (phase === 'result') {
      let count = 0;
      const noteTimer = setInterval(() => {
        count++;
        setVisibleNotes(count);
        if (count >= PADRON_1964.commonNotes.length) clearInterval(noteTimer);
      }, 200);
      return () => clearInterval(noteTimer);
    }
  }, [phase]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (phase === 'loading') {
    return (
      <SafeAreaView style={s.fullScreen}>
        <View style={s.loadingContainer}>
          <Animated.View style={[s.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
          <Animated.View style={[s.spinnerRing, { transform: [{ rotate: spin }] }]} />
          <View style={s.scanIconCenter}>
            <Icon name="scan-outline" size={36} color={BROWN} />
          </View>

          <Text style={s.loadingTitle}>Analyzing your cigar...</Text>
          <Text style={s.loadingStage}>{LOADING_STAGES[loadingStage]}</Text>

          <View style={s.loadingDots}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[s.dot, loadingStage > i && s.dotActive]} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Result phase
  return (
    <SafeAreaView style={[s.fullScreen, { backgroundColor: CREAM }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: resultFade, transform: [{ translateY: resultSlide }] }}>

          {/* Result header */}
          <View style={s.resultHeader}>
            <View style={s.matchBadge}>
              <Icon name="checkmark-circle" size={14} color="#2E7D32" />
              <Text style={s.matchBadgeText}>Match Found</Text>
            </View>
            <Text style={s.resultName}>{PADRON_1964.name}</Text>
            <Text style={s.resultVitola}>{PADRON_1964.vitola} · {PADRON_1964.wrapper} · {PADRON_1964.strength}</Text>
          </View>

          {/* humiBlurb */}
          <View style={s.blurbCard}>
            <Text style={s.blurbLabel}>HUMI Says</Text>
            <Text style={s.blurbText}>{PADRON_1964.humiBlurb}</Text>
          </View>

          {/* Tasting Notes */}
          <View style={s.sectionCard}>
            <Text style={s.sectionLabel}>Tasting Notes</Text>
            <View style={s.notesGrid}>
              {PADRON_1964.commonNotes.map((note, i) => (
                <Animated.View
                  key={note}
                  style={[
                    s.noteChip,
                    { opacity: i < visibleNotes ? 1 : 0, transform: [{ scale: i < visibleNotes ? 1 : 0.8 }] },
                  ]}
                >
                  <Text style={s.noteChipText}>{note}</Text>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* People Saying */}
          <View style={s.sectionCard}>
            <Text style={s.sectionLabel}>What People Are Saying</Text>
            <Text style={s.sectionBody}>{PADRON_1964.peopleSaying}</Text>
          </View>

          {/* Pairings */}
          <View style={s.sectionCard}>
            <Text style={s.sectionLabel}>Pairs Well With</Text>
            <Text style={s.sectionBody}>{PADRON_1964.recommendedPairings}</Text>
          </View>

        </Animated.View>
      </ScrollView>

      {/* CTA */}
      <View style={s.resultCTABar}>
        <TouchableOpacity style={s.primaryBtn} onPress={onComplete}>
          <Text style={s.primaryBtnText}>That's incredible — let's go!</Text>
          <Icon name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 5: Celebration ──────────────────────────────────────────────────
function CelebrationStep({ onNext }) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.fullScreen}>
      <View style={s.celebContainer}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: fadeAnim, alignItems: 'center' }}>
          <View style={s.celebIcon}>
            <Text style={{ fontSize: 56 }}>🥂</Text>
          </View>
          <Text style={s.celebTitle}>Welcome to the Lounge.</Text>
          <Text style={s.celebSubtitle}>
            You just scanned your first cigar.{'\n'}That's what HUMI is all about.
          </Text>
          <Text style={s.celebBody}>
            Every cigar you smoke gets its own profile — logged, rated, and remembered forever in your digital humidor.
          </Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          <TouchableOpacity style={s.primaryBtn} onPress={onNext}>
            <Text style={s.primaryBtnText}>What's next?</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 6: Trial Reveal ─────────────────────────────────────────────────
function TrialRevealStep({ onComplete }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const features = [
    { icon: 'infinite-outline', text: 'Unlimited AI cigar scans' },
    { icon: 'star-outline', text: 'Full tasting notes & pairings' },
    { icon: 'people-outline', text: 'What the community is saying' },
    { icon: 'trophy-outline', text: 'Your complete smoking profile' },
    { icon: 'calendar-outline', text: 'Events & Cigar of the Month' },
  ];

  return (
    <SafeAreaView style={[s.fullScreen, { backgroundColor: BROWN }]}>
      <View style={s.trialContainer}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center', width: '100%' }}>
          <View style={s.trialBadge}>
            <Text style={s.trialBadgeText}>7 DAYS FREE</Text>
          </View>
          <Text style={s.trialTitle}>You've unlocked{'\n'}HUMI Premium</Text>
          <Text style={s.trialSubtitle}>No credit card. No commitment.{'\n'}Just the full experience for 7 days.</Text>

          <View style={s.trialFeatureList}>
            {features.map(f => (
              <View key={f.text} style={s.trialFeatureRow}>
                <View style={s.trialFeatureIcon}>
                  <Icon name={f.icon} size={18} color={GOLD} />
                </View>
                <Text style={s.trialFeatureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          <TouchableOpacity style={s.trialBtn} onPress={onComplete}>
            <Text style={s.trialBtnText}>Enter the Lounge</Text>
            <Icon name="arrow-forward" size={18} color={BROWN} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
          <Text style={s.trialDisclaimer}>
            After 7 days, enjoy 5 free scans/month on the free tier — or upgrade anytime to keep premium.
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Main Onboarding Controller ───────────────────────────────────────────
export default function OnboardingNew({ onComplete, demoMode = false }) {
  const [step, setStep] = useState(0);
  const [expertise, setExpertise] = useState('experienced');
  const [interests, setInterests] = useState(['flavors']);
  const [useDemo, setUseDemo] = useState(false);

  const goNext = () => setStep(s => s + 1);
  const goBack = () => setStep(s => Math.max(0, s - 1));

  const handleCigarChoice = (hasReal) => {
    // In demo mode or if user picks "show me", use simulated scan
    // In production, hasReal would open camera
    setUseDemo(!hasReal || demoMode);
    setStep(4);
  };

  const handleScanComplete = () => setStep(5);
  const handleCelebrationNext = () => setStep(6);

  const handleTrialComplete = async () => {
    if (demoMode) {
      // In demo, just loop back to step 0
      setStep(0);
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
    case 0:
      return <WelcomeStep onNext={goNext} />;
    case 1:
      return (
        <ExpertiseStep
          expertise={expertise}
          setExpertise={setExpertise}
          onNext={goNext}
          onBack={goBack}
        />
      );
    case 2:
      return (
        <InterestsStep
          interests={interests}
          toggleInterest={(id) => {
            setInterests(prev =>
              prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
          }}
          onNext={goNext}
          onBack={goBack}
        />
      );
    case 3:
      return (
        <CigarChoiceStep
          onHasCigar={() => handleCigarChoice(true)}
          onNoCigar={() => handleCigarChoice(false)}
          onBack={goBack}
        />
      );
    case 4:
      return <ScanExperienceStep isDemo={useDemo || demoMode} onComplete={handleScanComplete} />;
    case 5:
      return <CelebrationStep onNext={handleCelebrationNext} />;
    case 6:
      return <TrialRevealStep onComplete={handleTrialComplete} />;
    default:
      return <WelcomeStep onNext={goNext} />;
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  // Welcome
  welcomeContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoBox: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: BROWN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: BROWN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 4,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: DARK,
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 17,
    color: GOLD,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 20,
  },
  welcomeTagline: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Steps
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    backgroundColor: '#E0D4C3',
  },
  progressDotActive: {
    backgroundColor: BROWN,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: DARK,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: MUTED,
    marginBottom: 32,
  },

  // Expertise options
  optionsList: {
    flex: 1,
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#EDE0D0',
    gap: 14,
  },
  optionCardSelected: {
    borderColor: BROWN,
    backgroundColor: '#FDF5EC',
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5EDE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: {
    backgroundColor: BROWN,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: BROWN,
  },
  optionDesc: {
    fontSize: 13,
    color: MUTED,
  },

  // Interest chips
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    flex: 1,
    alignContent: 'flex-start',
    marginBottom: 24,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#EDE0D0',
  },
  interestChipSelected: {
    backgroundColor: BROWN,
    borderColor: BROWN,
  },
  interestChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK,
  },
  interestChipTextSelected: {
    color: '#fff',
  },

  // Cigar choice
  cigarIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5EDE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  // Loading / Scan
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CREAM,
    paddingHorizontal: 40,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: GOLD,
    opacity: 0.4,
  },
  spinnerRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: BROWN,
  },
  scanIconCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5EDE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK,
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingStage: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 24,
    minHeight: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0D4C3',
  },
  dotActive: {
    backgroundColor: BROWN,
  },

  // Scan result
  resultHeader: {
    backgroundColor: BROWN,
    padding: 28,
    paddingTop: 52,
    alignItems: 'flex-start',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  resultName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 30,
  },
  resultVitola: {
    fontSize: 13,
    color: GOLD,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  blurbCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  blurbLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  blurbText: {
    fontSize: 15,
    color: DARK,
    lineHeight: 24,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  sectionBody: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noteChip: {
    backgroundColor: '#F5EDE0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  noteChipText: {
    fontSize: 13,
    color: BROWN,
    fontWeight: '600',
  },
  resultCTABar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: CREAM,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#EDE0D0',
  },

  // Celebration
  celebContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  celebIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F5EDE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  celebTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: DARK,
    textAlign: 'center',
    marginBottom: 14,
  },
  celebSubtitle: {
    fontSize: 17,
    color: BROWN,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 26,
    marginBottom: 20,
  },
  celebBody: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Trial reveal
  trialContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BROWN,
  },
  trialBadge: {
    backgroundColor: GOLD,
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 20,
  },
  trialBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: BROWN,
    letterSpacing: 2,
  },
  trialTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 40,
  },
  trialSubtitle: {
    fontSize: 15,
    color: GOLD,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
  },
  trialFeatureList: {
    width: '100%',
    gap: 14,
    marginBottom: 8,
  },
  trialFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  trialFeatureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201,169,110,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialFeatureText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
  },
  trialBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  trialBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: BROWN,
  },
  trialDisclaimer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Shared buttons
  primaryBtn: {
    backgroundColor: BROWN,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    width: '100%',
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: BROWN,
    width: '100%',
    marginTop: 12,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: BROWN,
  },
});
