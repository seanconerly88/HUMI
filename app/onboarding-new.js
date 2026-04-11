// app/onboarding-new.js  — HUMI Onboarding v2
// Steps: 0=welcome 1=expertise 2=interests 3=source 4=how-it-works 5=scan-choice 6=lineup 7=loading 8=result+celebrate 9=trial

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, SafeAreaView,
  ScrollView, Dimensions, Animated, TextInput, Image, Platform,
} from 'react-native';
import Icon from './components/Icon';
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { grantWelcomeTrial } from '../src/services/subscriptionService';

// ─── Brand tokens ─────────────────────────────────────────────────────────
const BROWN  = '#8B4513';
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
  { id: 'instagram', label: 'Instagram',          icon: 'logo-instagram' },
  { id: 'tiktok',   label: 'TikTok',              icon: 'musical-notes-outline' },
  { id: 'website',  label: 'Website',             icon: 'globe-outline' },
  { id: 'friend',   label: 'Referred by a friend',icon: 'people-outline' },
  { id: 'other',    label: 'Other',               icon: 'ellipsis-horizontal-outline' },
];

const HOW_STEPS = [
  { icon: 'camera-outline',   title: 'Take a photo',       body: 'Point your phone at any cigar band and snap a picture.' },
  { icon: 'flash-outline',    title: 'HUMI identifies it', body: 'Our AI matches it against thousands of cigars instantly.' },
  { icon: 'book-outline',     title: 'Get the full story', body: 'Tasting notes, pairings, and what the community is saying.' },
];

const expertiseLevels = [
  { id: 'beginner',    title: 'Beginner',    description: 'New to cigars or smoke occasionally',               icon: 'leaf-outline' },
  { id: 'experienced', title: 'Experienced', description: 'Familiar with various cigars and smoke regularly',  icon: 'star-half-outline' },
  { id: 'aficionado',  title: 'Aficionado',  description: 'Deep knowledge of cigars, regions, and profiles',  icon: 'trophy-outline' },
];

const interestOptions = [
  { id: 'collection', title: 'Building a Collection', icon: 'albums-outline' },
  { id: 'pairings',   title: 'Pairings',              icon: 'wine-outline' },
  { id: 'culture',    title: 'History & Culture',     icon: 'book-outline' },
  { id: 'flavors',    title: 'Flavor Profiles',       icon: 'color-palette-outline' },
  { id: 'insider',    title: 'Insider Knowledge',     icon: 'trophy-outline' },
];

// ─── Shared helpers ────────────────────────────────────────────────────────
function ProgressBar({ total, current }) {
  return (
    <View style={s.progressRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[s.progressSeg, i <= current && s.progressSegOn]} />
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

// ─── Step 0: Welcome ───────────────────────────────────────────────────────
function WelcomeStep({ onNext }) {
  const { fade, slide } = useFadeSlide();
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.centeredWrap}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], alignItems: 'center' }}>
          <View style={s.logoBox}><Text style={s.logoText}>HUMI</Text></View>
          <Text style={s.h1}>Welcome to HUMI</Text>
          <Text style={s.brandSub}>The Digital Cigar Lounge</Text>
          <Text style={s.tagline}>Join the fastest growing cigar community in the world</Text>
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

// ─── Step 1: Expertise ─────────────────────────────────────────────────────
function ExpertiseStep({ expertise, setExpertise, onNext, onBack }) {
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <BackBtn onPress={onBack} />
        <ProgressBar total={4} current={0} />
        <Text style={s.h2}>What's your experience level?</Text>
        <Text style={s.sub}>Choose one option</Text>
        <View style={s.optList}>
          {expertiseLevels.map(opt => (
            <TouchableOpacity key={opt.id}
              style={[s.optCard, expertise === opt.id && s.optCardOn]}
              onPress={() => setExpertise(opt.id)}>
              <View style={[s.optIcon, expertise === opt.id && s.optIconOn]}>
                <Icon name={opt.icon} size={20} color={expertise === opt.id ? WHITE : BROWN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.optTitle, expertise === opt.id && { color: BROWN }]}>{opt.title}</Text>
                <Text style={s.optDesc}>{opt.description}</Text>
              </View>
              {expertise === opt.id && <Icon name="checkmark-circle" size={19} color={BROWN} />}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.btn} onPress={onNext}><Text style={s.btnTxt}>Continue</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 2: Interests ─────────────────────────────────────────────────────
function InterestsStep({ interests, toggle, onNext, onBack }) {
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <BackBtn onPress={onBack} />
        <ProgressBar total={4} current={1} />
        <Text style={s.h2}>What interests you about cigars?</Text>
        <Text style={s.sub}>Select all that apply</Text>
        <View style={s.chipGrid}>
          {interestOptions.map(opt => {
            const on = interests.includes(opt.id);
            return (
              <TouchableOpacity key={opt.id} style={[s.chip, on && s.chipOn]} onPress={() => toggle(opt.id)}>
                <Icon name={opt.icon} size={17} color={on ? WHITE : BROWN} />
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{opt.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={[s.btn, interests.length === 0 && s.btnOff]} onPress={onNext} disabled={!interests.length}>
          <Text style={s.btnTxt}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 3: Source attribution ────────────────────────────────────────────
function SourceStep({ source, setSource, otherText, setOtherText, onNext, onBack }) {
  const { fade, slide } = useFadeSlide();
  const showOther = source === 'other';
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <BackBtn onPress={onBack} />
        <ProgressBar total={4} current={2} />
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
          <Text style={s.h2}>Where did you find us?</Text>
          <Text style={s.sub}>This helps us know where our community comes from</Text>
          <View style={s.optList}>
            {SOURCE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.id}
                style={[s.optCard, source === opt.id && s.optCardOn]}
                onPress={() => setSource(opt.id)}>
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
        <TouchableOpacity
          style={[s.btn, (!source || (showOther && !otherText.trim())) && s.btnOff]}
          onPress={onNext}
          disabled={!source || (showOther && !otherText.trim())}>
          <Text style={s.btnTxt}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 4: How HUMI Works ────────────────────────────────────────────────
function HowItWorksStep({ onNext, onBack }) {
  const { fade, slide } = useFadeSlide();
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <BackBtn onPress={onBack} />
        <ProgressBar total={4} current={3} />
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
          <View style={s.howHeader}>
            <Icon name="scan-outline" size={28} color={BROWN} />
            <Text style={s.h2}>How HUMI works</Text>
          </View>
          <Text style={s.sub}>Three steps to knowing everything about any cigar</Text>
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

// ─── Step 5: Scan Choice ───────────────────────────────────────────────────
function ScanChoiceStep({ onHaveCigar, onNoCigar, onBack }) {
  const { fade, slide } = useFadeSlide();
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <BackBtn onPress={onBack} />
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1, justifyContent: 'center' }}>
          <View style={s.scanIconWrap}>
            <Icon name="camera-outline" size={40} color={BROWN} />
          </View>
          <Text style={[s.h2, { textAlign: 'center' }]}>Ready to scan?</Text>
          <Text style={[s.sub, { textAlign: 'center', marginBottom: 36 }]}>
            Do you have a cigar nearby — or want us to walk you through a demo first?
          </Text>
          <TouchableOpacity style={s.choiceCard} onPress={onHaveCigar}>
            <View style={s.choiceIconWrap}>
              <Icon name="camera-outline" size={24} color={BROWN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.choiceTitle}>I have a cigar</Text>
              <Text style={s.choiceBody}>Use my camera or photo library to scan it now</Text>
            </View>
            <Icon name="chevron-forward-outline" size={20} color={MUTED} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.choiceCard, { marginTop: 12 }]} onPress={onNoCigar}>
            <View style={s.choiceIconWrap}>
              <Icon name="play-circle-outline" size={24} color={BROWN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.choiceTitle}>Show me how it works</Text>
              <Text style={s.choiceBody}>Walk me through a demo scan with a famous cigar</Text>
            </View>
            <Icon name="chevron-forward-outline" size={20} color={MUTED} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 6: Demo cigar lineup ─────────────────────────────────────────────
function LineupStep({ onSelect, onBack }) {
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);
  const { fade, slide } = useFadeSlide();

  const handleSend = () => {
    if (!selected || sending) return;
    setSending(true);
    setTimeout(() => onSelect(selected), 350);
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.stepWrap}>
        <BackBtn onPress={onBack} />
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1 }}>
          <Text style={s.h2}>Pick a cigar to scan</Text>
          <Text style={s.sub}>These are three of the world's most celebrated cigars. Tap one.</Text>
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

// ─── Step 7: Loading animation ─────────────────────────────────────────────
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

// ─── Step 8: Result + Celebration ─────────────────────────────────────────
function ResultStep({ cigar, onComplete }) {
  const [phase, setPhase]             = useState('celebrate'); // celebrate | scroll
  const [visibleNotes, setVisibleNotes] = useState(0);

  // Card entrance
  const cardScale = useRef(new Animated.Value(0.6)).current;
  const cardFade  = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Confetti particles — 18 evenly spaced
  const PARTICLE_COUNT = 18;
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle    = (i / PARTICLE_COUNT) * Math.PI * 2;
      const dist     = 90 + (i % 3) * 30;
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        x:     new Animated.Value(0),
        y:     new Animated.Value(0),
        op:    new Animated.Value(0),
        sc:    new Animated.Value(0),
      };
    })
  ).current;

  useEffect(() => {
    // Flash white
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.55, duration: 120, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0,    duration: 350, useNativeDriver: true }),
    ]).start();

    // Card springs in
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(cardFade,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Confetti burst
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

    // Note reveals after 800ms
    const noteTimer = setTimeout(() => {
      let count = 0;
      const ni = setInterval(() => {
        count++;
        setVisibleNotes(count);
        if (count >= cigar.commonNotes.length) clearInterval(ni);
      }, 160);
    }, 800);

    // Auto-advance celebrate → scroll after 2.2s
    const scrollTimer = setTimeout(() => setPhase('scroll'), 2200);

    return () => { clearTimeout(noteTimer); clearTimeout(scrollTimer); };
  }, []);

  if (phase === 'celebrate') {
    return (
      <SafeAreaView style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        {/* Flash overlay */}
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: WHITE, opacity: flashAnim, zIndex: 10 }]} pointerEvents="none" />

        {/* Confetti particles */}
        <View style={s.confettiOrigin} pointerEvents="none">
          {particles.map((p, i) => (
            <Animated.View key={i} style={[
              s.particle,
              { backgroundColor: p.color,
                opacity: p.op,
                transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.sc }] }
            ]} />
          ))}
        </View>

        {/* Card bounce */}
        <Animated.View style={[s.celebCard, { transform: [{ scale: cardScale }], opacity: cardFade }]}>
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

  // Full scroll result
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

// ─── Step 9: Trial reveal ──────────────────────────────────────────────────
function TrialStep({ onComplete }) {
  const { fade, slide } = useFadeSlide();
  const features = [
    { icon: 'infinite-outline',  text: 'Unlimited AI cigar scans' },
    { icon: 'star-outline',      text: 'Full tasting notes & flavor profiles' },
    { icon: 'people-outline',    text: 'What the community is saying' },
    { icon: 'trophy-outline',    text: 'Your complete smoking profile' },
    { icon: 'map-outline',       text: 'Smoke Spots — find cigar-friendly spots near you' },
  ];
  return (
    <SafeAreaView style={[s.screen, { backgroundColor: BROWN }]}>
      <View style={s.trialWrap}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], alignItems: 'center', width: '100%' }}>
          <View style={s.trialBadge}><Text style={s.trialBadgeTxt}>7 DAYS FREE</Text></View>
          <Text style={s.trialH}>You've unlocked{'\n'}HUMI Premium</Text>
          <Text style={s.trialSub}>No credit card. No commitment.{'\n'}Just the full experience for 7 days.</Text>
          <View style={s.featureList}>
            {features.map(f => (
              <View key={f.text} style={s.featureRow}>
                <View style={s.featureIcon}><Icon name={f.icon} size={16} color={BROWN} /></View>
                <Text style={s.featureTxt}>{f.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
        <Animated.View style={{ opacity: fade, width: '100%' }}>
          <TouchableOpacity style={s.trialBtn} onPress={onComplete}>
            <Text style={s.trialBtnTxt}>Enter the Lounge</Text>
          </TouchableOpacity>
          <Text style={s.trialNote}>After 7 days, enjoy 5 free scans/month — or upgrade anytime to keep premium.</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Back button helper ─────────────────────────────────────────────────────
function BackBtn({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.backBtn}>
      <Icon name="chevron-back-outline" size={24} color={BROWN} />
    </TouchableOpacity>
  );
}

// ─── Main controller ───────────────────────────────────────────────────────
export default function OnboardingNew({ onComplete, demoMode = false }) {
  const [step,       setStep]      = useState(0);
  const [expertise,  setExpertise] = useState('experienced');
  const [interests,  setInterests] = useState(['flavors']);
  const [source,     setSource]    = useState(null);
  const [otherText,  setOtherText] = useState('');
  const [cigar,      setCigar]     = useState(null);

  const go   = n => setStep(n);
  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => Math.max(0, s - 1));

  const toggle = id => setInterests(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  const handleHaveCigar = async () => {
    // In real app: save prefs, grant trial, enter app — user scans from humidor
    await finishAndEnter();
  };

  const handleNoCigar = () => go(6);

  const handleLineupSelect = cigar => { setCigar(cigar); go(7); };

  const finishAndEnter = async () => {
    if (demoMode) { setStep(0); setCigar(null); return; }
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        await setDoc(doc(db, 'users', userId), {
          expertise, interests,
          referralSource: source === 'other' ? otherText : source,
          onboardingCompleted: true,
          createdAt: serverTimestamp(),
        }, { merge: true });
        await grantWelcomeTrial(userId, 'onboarding_v2');
      }
    } catch (e) { console.error('Onboarding save error:', e); }
    onComplete?.();
  };

  switch (step) {
    case 0: return <WelcomeStep onNext={next} />;
    case 1: return <ExpertiseStep expertise={expertise} setExpertise={setExpertise} onNext={next} onBack={back} />;
    case 2: return <InterestsStep interests={interests} toggle={toggle} onNext={next} onBack={back} />;
    case 3: return <SourceStep source={source} setSource={setSource} otherText={otherText} setOtherText={setOtherText} onNext={next} onBack={back} />;
    case 4: return <HowItWorksStep onNext={next} onBack={back} />;
    case 5: return <ScanChoiceStep onHaveCigar={handleHaveCigar} onNoCigar={handleNoCigar} onBack={back} />;
    case 6: return <LineupStep onSelect={handleLineupSelect} onBack={back} />;
    case 7: return <LoadingStep cigar={cigar} onComplete={() => go(8)} />;
    case 8: return <ResultStep cigar={cigar} onComplete={() => go(9)} />;
    case 9: return <TrialStep onComplete={finishAndEnter} />;
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

  stepWrap:   { flex: 1, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 36 },
  backBtn:    { padding: 8, marginLeft: -8, marginBottom: 2, alignSelf: 'flex-start' },
  progressRow:{ flexDirection: 'row', gap: 5, marginBottom: 26 },
  progressSeg:{ height: 3, flex: 1, borderRadius: 2, backgroundColor: BORDER },
  progressSegOn: { backgroundColor: BROWN },
  h2:         { fontSize: 25, fontWeight: '800', color: DARK, marginBottom: 6 },
  sub:        { fontSize: 14, color: MUTED, marginBottom: 24, lineHeight: 20 },

  optList:    { gap: 11, marginBottom: 28 },
  optCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 12, padding: 15, borderWidth: 2, borderColor: BORDER, gap: 12 },
  optCardOn:  { borderColor: BROWN, backgroundColor: LIGHT },
  optIcon:    { width: 44, height: 44, borderRadius: 22, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center' },
  optIconOn:  { backgroundColor: BROWN },
  optTitle:   { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 2 },
  optDesc:    { fontSize: 12, color: MUTED },

  chipGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignContent: 'flex-start', marginBottom: 28 },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 22, backgroundColor: WHITE, borderWidth: 2, borderColor: BORDER },
  chipOn:     { backgroundColor: BROWN, borderColor: BROWN },
  chipTxt:    { fontSize: 13, fontWeight: '600', color: DARK },
  chipTxtOn:  { color: WHITE },

  textInput: {
    borderWidth: 1.5, borderColor: BROWN, borderRadius: 10,
    padding: 12, fontSize: 14, color: DARK, backgroundColor: WHITE,
    marginTop: 10,
  },

  howHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  howList:     { gap: 14, marginBottom: 20, flex: 1 },
  howCard:     { flexDirection: 'row', alignItems: 'flex-start', gap: 13, backgroundColor: WHITE, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
  howNum:      { width: 24, height: 24, borderRadius: 12, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  howNumTxt:   { fontSize: 12, fontWeight: '800', color: WHITE },
  howIconCircle:{ width: 42, height: 42, borderRadius: 21, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center' },
  howTitle:    { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 2 },
  howBody:     { fontSize: 12, color: MUTED, lineHeight: 18 },
  howCallout:  { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, backgroundColor: LIGHT, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: BROWN },
  howCalloutTxt:{ fontSize: 13, fontWeight: '600', color: BROWN },

  scanIconWrap:{ width: 90, height: 90, borderRadius: 45, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  choiceCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 14, padding: 16, borderWidth: 2, borderColor: BORDER, gap: 13 },
  choiceIconWrap:{ width: 44, height: 44, borderRadius: 22, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center' },
  choiceTitle: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 2 },
  choiceBody:  { fontSize: 12, color: MUTED },

  lineupCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 14, padding: 12, borderWidth: 2, borderColor: BORDER, gap: 12 },
  lineupCardOn:{ borderColor: BROWN, backgroundColor: LIGHT },
  cigarThumb:  { width: 48, height: 100, borderRadius: 6 },
  lineupName:  { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 3 },
  lineupVitola:{ fontSize: 12, color: MUTED, marginBottom: 2 },
  lineupCountry:{ fontSize: 11, color: MUTED, opacity: 0.75 },
  lineupCheck: { width: 26, height: 26, borderRadius: 13, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center' },
  sendBtn:     { backgroundColor: BROWN, borderRadius: 13, padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: BROWN, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 9, elevation: 4 },

  loadWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  pulseRing:   { position: 'absolute', width: 134, height: 134, borderRadius: 67, borderWidth: 2, borderColor: BROWN, opacity: 0.18 },
  spinRing:    { position: 'absolute', width: 106, height: 106, borderRadius: 53, borderWidth: 3, borderColor: 'transparent', borderTopColor: BROWN },
  scanCenter:  { width: 74, height: 74, borderRadius: 37, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 42 },
  loadTitle:   { fontSize: 18, fontWeight: '700', color: DARK, marginBottom: 8, textAlign: 'center' },
  loadStage:   { fontSize: 13, color: MUTED, textAlign: 'center', marginBottom: 6, minHeight: 18 },
  loadCigar:   { fontSize: 12, color: BROWN, fontWeight: '600', textAlign: 'center', marginBottom: 20, opacity: 0.8 },
  loadDots:    { flexDirection: 'row', gap: 6 },
  dot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: BORDER },
  dotOn:       { backgroundColor: BROWN },

  // Celebration
  confettiOrigin:{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 0, height: 0, zIndex: 5 },
  particle:    { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  celebCard:   {
    backgroundColor: WHITE, borderRadius: 20, padding: 24, alignItems: 'flex-start',
    marginHorizontal: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 10, width: '85%',
  },
  celebCigarName:{ fontSize: 20, fontWeight: '800', color: DARK, marginBottom: 4, marginTop: 10 },
  celebVitola:   { fontSize: 13, color: MUTED, marginBottom: 14 },
  celebNotesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  celebHint:     { fontSize: 12, color: BROWN, fontWeight: '600', opacity: 0.8 },

  // Full result
  resultHeader:{ backgroundColor: BROWN, padding: 24, paddingTop: 44 },
  matchBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 9, marginBottom: 11, alignSelf: 'flex-start' },
  matchTxt:    { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  resultName:  { fontSize: 21, fontWeight: '800', color: WHITE, marginBottom: 5, lineHeight: 27 },
  resultVitola:{ fontSize: 13, color: 'rgba(255,255,255,0.72)', fontWeight: '500', marginBottom: 2 },
  resultCountry:{ fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  card:        { margin: 13, marginBottom: 9, backgroundColor: WHITE, borderRadius: 12, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  cardLabel:   { fontSize: 10, fontWeight: '700', color: BROWN, letterSpacing: 1.3, marginBottom: 9, textTransform: 'uppercase' },
  cardBody:    { fontSize: 14, color: '#444', lineHeight: 22 },
  notesRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  noteChip:    { backgroundColor: LIGHT, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 16 },
  noteTxt:     { fontSize: 12, color: BROWN, fontWeight: '600' },
  resultBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: CREAM, padding: 17, paddingBottom: 30, borderTopWidth: 1, borderTopColor: BORDER },

  // Trial
  trialWrap:   { flex: 1, paddingHorizontal: 26, paddingTop: 54, paddingBottom: 42, alignItems: 'center', justifyContent: 'space-between', backgroundColor: BROWN },
  trialBadge:  { backgroundColor: 'rgba(255,255,255,0.16)', paddingVertical: 5, paddingHorizontal: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  trialBadgeTxt:{ fontSize: 11, fontWeight: '800', color: WHITE, letterSpacing: 2 },
  trialH:      { fontSize: 29, fontWeight: '800', color: WHITE, textAlign: 'center', marginBottom: 12, lineHeight: 37 },
  trialSub:    { fontSize: 13, color: 'rgba(255,255,255,0.72)', textAlign: 'center', lineHeight: 21, marginBottom: 30 },
  featureList: { width: '100%', gap: 12 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 11 },
  featureIcon: { width: 33, height: 33, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  featureTxt:  { fontSize: 14, color: WHITE, fontWeight: '500', flex: 1 },
  trialBtn:    { backgroundColor: WHITE, borderRadius: 13, padding: 17, alignItems: 'center', marginBottom: 11, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 4 },
  trialBtnTxt: { fontSize: 16, fontWeight: '800', color: BROWN },
  trialNote:   { fontSize: 11, color: 'rgba(255,255,255,0.48)', textAlign: 'center', lineHeight: 16 },

  // Shared
  btn:    { backgroundColor: BROWN, borderRadius: 13, padding: 17, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: BROWN, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 9, elevation: 4, width: '100%' },
  btnOff: { opacity: 0.38 },
  btnTxt: { fontSize: 15, fontWeight: '700', color: WHITE },
});
