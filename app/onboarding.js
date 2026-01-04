// app/onboarding.js
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
  Alert,
  Animated,
  Platform
} from 'react-native';
import Icon from './components/Icon';
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const { width: screenWidth } = Dimensions.get('window');

const expertiseLevels = [
  { id: 'beginner', title: 'Beginner', description: 'New to cigars or smoke occasionally', icon: 'leaf-outline' },
  { id: 'experienced', title: 'Experienced', description: 'Familiar with various cigars and smoke regularly', icon: 'star-half-outline' },
  { id: 'aficionado', title: 'Aficionado', description: 'Deep knowledge of cigars, regions, and profiles', icon: 'trophy-outline' }
];

const interestOptions = [
  { id: 'flavors', title: 'Flavor Profiles', description: 'Discover new tastes and notes', icon: 'color-palette-outline' },
  { id: 'collection', title: 'Collection', description: 'Build a collection of rare or unique cigars', icon: 'albums-outline' },
  { id: 'pairings', title: 'Pairings', description: 'Find the perfect drink or food pairing', icon: 'wine-outline' },
  { id: 'culture', title: 'History & Culture', description: 'Learn about cigar heritage and traditions', icon: 'book-outline' },
  { id: 'insider', title: 'Insider Knowledge', description: 'Awards, rankings & maker connections', icon: 'trophy-outline' }
];

const frequencyOptions = [
  { id: 'occasional', title: 'Special Occasions', description: 'A few times a year', icon: 'calendar-outline' },
  { id: 'weekly', title: 'Weekly', description: 'Once or twice a week', icon: 'time-outline' },
  { id: 'regular', title: 'Regular', description: 'Several times a week', icon: 'repeat-outline' }
];

const genderOptions = [
  { id: 'male', title: 'Male', description: '', icon: 'male-outline' },
  { id: 'female', title: 'Female', description: '', icon: 'female-outline' },
  { id: 'other', title: 'Prefer not to say', description: '', icon: 'person-outline' }
];

const STRIPE_PRICE_IDS = {
  monthly: 'price_1Si5scFToJGJFWPADiZtDgIw',
  yearly: 'price_1Si5tVFToJGJFWPARlJoPIZw'
};

const TierComparisonScreen = ({ onSelectFree, onSelectPremium, isWide }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);

  const handleStripeCheckout = async () => {
    try {
      setLoading(true);
      
      const priceId = selectedPlan === 'yearly' ? STRIPE_PRICE_IDS.yearly : STRIPE_PRICE_IDS.monthly;
      const user = auth.currentUser;
      
      const baseUrl = Platform.OS === 'web' ? window.location.origin : '';
      
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priceId,
          userId: user?.uid || '',
          email: user?.email || '',
          successUrl: `${baseUrl}/?success=true`,
          cancelUrl: `${baseUrl}/?canceled=true`
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.url && Platform.OS === 'web') {
        // Use window.open for PWA compatibility on iOS Safari
        const checkoutWindow = window.open(data.url, '_blank');
        if (!checkoutWindow) {
          // Fallback if popup blocked
          window.location.href = data.url;
        }
        setLoading(false);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Stripe checkout error:', error);
      Alert.alert('Error', 'Unable to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const freeFeatures = [
    { text: '5 AI scans per month', included: true },
    { text: '10 comments per month', included: true },
    { text: 'View community feed', included: true },
    { text: 'Basic humidor tracking', included: true },
    { text: 'Unlimited AI scans', included: false },
    { text: 'Unlimited comments', included: false },
    { text: 'Insider Knowledge & awards', included: false },
    { text: 'Advanced analytics', included: false },
  ];

  const premiumFeatures = [
    { text: 'Unlimited AI scans', included: true },
    { text: 'Unlimited comments', included: true },
    { text: 'View community feed', included: true },
    { text: 'Full humidor features', included: true },
    { text: 'Insider Knowledge & awards', included: true },
    { text: 'Advanced analytics', included: true },
    { text: 'Priority support', included: true },
    { text: 'Early access to new features', included: true },
  ];

  const FeatureRow = ({ text, included }) => (
    <View style={tierStyles.featureRow}>
      <Icon 
        name={included ? 'checkmark' : 'close'} 
        size={16} 
        color={included ? '#4CAF50' : '#ccc'} 
      />
      <Text style={[tierStyles.featureText, !included && tierStyles.featureTextDisabled]}>
        {text}
      </Text>
    </View>
  );

  if (isWide) {
    return (
      <View style={tierStyles.container}>
        <View style={tierStyles.content}>
          <Text style={tierStyles.title}>Choose Your Experience</Text>
          <Text style={tierStyles.subtitle}>You can always upgrade later</Text>
          
          <View style={tierStyles.cardsRow}>
            <View style={tierStyles.tierCard}>
              <Text style={tierStyles.tierName}>Free</Text>
              <Text style={tierStyles.tierPrice}>$0</Text>
              <Text style={tierStyles.tierPeriod}>forever</Text>
              
              <View style={tierStyles.featuresList}>
                {freeFeatures.map((feature, idx) => (
                  <FeatureRow key={idx} text={feature.text} included={feature.included} />
                ))}
              </View>
              
              <TouchableOpacity style={tierStyles.freeButton} onPress={onSelectFree}>
                <Text style={tierStyles.freeButtonText}>Continue Free</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[tierStyles.tierCard, tierStyles.premiumCard]}>
              <View style={tierStyles.popularBadge}>
                <Text style={tierStyles.popularBadgeText}>BEST VALUE</Text>
              </View>
              <Text style={tierStyles.tierName}>Premium</Text>
              <Text style={tierStyles.tierPrice}>$5.99</Text>
              <Text style={tierStyles.tierPeriod}>per month</Text>
              <Text style={tierStyles.yearlyOption}>or $29.99/year (save 58%)</Text>
              
              <View style={tierStyles.featuresList}>
                {premiumFeatures.map((feature, idx) => (
                  <FeatureRow key={idx} text={feature.text} included={feature.included} />
                ))}
              </View>
              
              <TouchableOpacity style={tierStyles.premiumButton} onPress={onSelectPremium}>
                <Text style={tierStyles.premiumButtonText}>Go Premium</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={tierStyles.container}>
      <ScrollView contentContainerStyle={tierStyles.scrollContent}>
        <Text style={tierStyles.titleMobile}>Choose Your Experience</Text>
        <Text style={tierStyles.subtitleMobile}>You can always upgrade later</Text>
        
        <View style={[tierStyles.tierCardMobile, tierStyles.premiumCardMobile]}>
          <View style={tierStyles.popularBadgeMobile}>
            <Text style={tierStyles.popularBadgeText}>PREMIUM</Text>
          </View>
          <Text style={tierStyles.tierNameMobile}>Premium</Text>
          
          <View style={tierStyles.toggleContainer}>
            <TouchableOpacity
              style={[tierStyles.toggleButton, selectedPlan === 'monthly' && tierStyles.toggleButtonActive]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <Text style={[tierStyles.toggleText, selectedPlan === 'monthly' && tierStyles.toggleTextActive]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[tierStyles.toggleButton, selectedPlan === 'yearly' && tierStyles.toggleButtonActive]}
              onPress={() => setSelectedPlan('yearly')}
            >
              <Text style={[tierStyles.toggleText, selectedPlan === 'yearly' && tierStyles.toggleTextActive]}>Yearly</Text>
            </TouchableOpacity>
          </View>
          
          {selectedPlan === 'monthly' ? (
            <>
              <Text style={tierStyles.tierPriceMobile}>$5.99<Text style={tierStyles.tierPeriodMobile}>/month</Text></Text>
              <TouchableOpacity onPress={() => setSelectedPlan('yearly')}>
                <Text style={tierStyles.yearlyHintMobile}>Switch to yearly and save 58%!</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={tierStyles.tierPriceMobile}>$29.99<Text style={tierStyles.tierPeriodMobile}>/year</Text></Text>
              <View style={tierStyles.savingsBadge}>
                <Text style={tierStyles.savingsText}>Best Value - Save 58%!</Text>
              </View>
            </>
          )}
          
          <View style={tierStyles.featuresListMobile}>
            <FeatureRow text="Unlimited AI scans" included={true} />
            <FeatureRow text="Unlimited comments" included={true} />
            <FeatureRow text="Insider Knowledge & awards" included={true} />
            <FeatureRow text="Advanced analytics" included={true} />
          </View>
          
          <TouchableOpacity 
            style={tierStyles.premiumButtonMobile} 
            onPress={handleStripeCheckout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={tierStyles.premiumButtonText}>
                {selectedPlan === 'yearly' ? 'Go Premium - Best Deal!' : 'Go Premium'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={tierStyles.tierCardMobile}>
          <Text style={tierStyles.tierNameMobile}>Free</Text>
          <Text style={tierStyles.tierPriceMobile}>$0</Text>
          
          <View style={tierStyles.featuresListMobile}>
            <FeatureRow text="5 AI scans per month" included={true} />
            <FeatureRow text="10 comments per month" included={true} />
            <FeatureRow text="View community feed" included={true} />
            <FeatureRow text="Basic humidor tracking" included={true} />
          </View>
          
          <TouchableOpacity style={tierStyles.freeButtonMobile} onPress={onSelectFree}>
            <Text style={tierStyles.freeButtonTextMobile}>Continue Free</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const tierStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 24,
    maxWidth: 800,
  },
  tierCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    width: 340,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  premiumCard: {
    borderColor: '#8B4513',
    borderWidth: 2,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#8B4513',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tierName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  tierPrice: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 8,
  },
  tierPeriod: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  yearlyOption: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 24,
  },
  featuresList: {
    width: '100%',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#333',
  },
  featureTextDisabled: {
    color: '#ccc',
  },
  freeButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#8B4513',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    width: '100%',
  },
  freeButtonText: {
    color: '#8B4513',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  premiumButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    width: '100%',
  },
  premiumButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  titleMobile: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleMobile: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  tierCardMobile: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  premiumCardMobile: {
    borderColor: '#8B4513',
    borderWidth: 2,
    position: 'relative',
  },
  popularBadgeMobile: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#8B4513',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierNameMobile: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
  },
  tierPriceMobile: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
    marginTop: 8,
  },
  tierPeriodMobile: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#666',
  },
  yearlyOptionMobile: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 16,
  },
  yearlyHintMobile: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 16,
    textDecorationLine: 'underline',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    padding: 4,
    marginVertical: 16,
    alignSelf: 'center',
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  toggleButtonActive: {
    backgroundColor: '#8B4513',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
  },
  savingsBadge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 16,
  },
  savingsText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  featuresListMobile: {
    marginBottom: 20,
  },
  premiumButtonMobile: {
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    borderRadius: 30,
  },
  freeButtonMobile: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#8B4513',
    paddingVertical: 16,
    borderRadius: 30,
  },
  freeButtonTextMobile: {
    color: '#8B4513',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});

const QuickStartGuide = ({ onComplete, isWide }) => {
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const fadeAnim3 = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const line1Height = useRef(new Animated.Value(0)).current;
  const line2Height = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim1, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(line1Height, { toValue: 40, duration: 400, useNativeDriver: false }),
      Animated.timing(fadeAnim2, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(line2Height, { toValue: 40, duration: 400, useNativeDriver: false }),
      Animated.timing(fadeAnim3, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(buttonAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  if (isWide) {
    return (
      <View style={webStyles.container}>
        <View style={webStyles.content}>
          <Text style={webStyles.title}>You're All Set!</Text>
          <Text style={webStyles.subtitle}>Here's how to get started with HUMI</Text>
          
          <View style={webStyles.stepsRow}>
            <Animated.View style={[webStyles.stepCard, { opacity: fadeAnim1 }]}>
              <View style={webStyles.stepIconCircle}>
                <Icon name="leaf-outline" size={32} color="#8B4513" />
              </View>
              <Text style={webStyles.stepNumber}>1</Text>
              <Text style={webStyles.stepTitle}>Choose Your Stick</Text>
              <Text style={webStyles.stepDescription}>Pick a cigar from your collection or try something new</Text>
            </Animated.View>
            
            <Animated.View style={[webStyles.stepCard, { opacity: fadeAnim2 }]}>
              <View style={webStyles.stepIconCircle}>
                <Icon name="camera-outline" size={32} color="#8B4513" />
              </View>
              <Text style={webStyles.stepNumber}>2</Text>
              <Text style={webStyles.stepTitle}>Capture with a Photo</Text>
              <Text style={webStyles.stepDescription}>Our AI will identify the cigar and pull up all the details</Text>
            </Animated.View>
            
            <Animated.View style={[webStyles.stepCard, { opacity: fadeAnim3 }]}>
              <View style={webStyles.stepIconCircle}>
                <Icon name="bookmark-outline" size={32} color="#8B4513" />
              </View>
              <Text style={webStyles.stepNumber}>3</Text>
              <Text style={webStyles.stepTitle}>Collect Your Memories</Text>
              <Text style={webStyles.stepDescription}>Rate, review, and build your personal humidor</Text>
            </Animated.View>
          </View>
          
          <Animated.View style={[webStyles.buttonContainer, { opacity: buttonAnim }]}>
            <TouchableOpacity style={webStyles.startButton} onPress={onComplete}>
              <Text style={webStyles.startButtonText}>Start Your Collection</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>How to Use HUMI</Text>
      </View>
      
      <View style={styles.progressContainer}>
        {[0, 1, 2, 3, 4].map(step => (
          <View key={step} style={[styles.progressDot, styles.activeDot]} />
        ))}
      </View>
      
      <View style={styles.quickStartContainer}>
        <View style={styles.stepsContainer}>
          <Animated.View style={[styles.stepRow, { opacity: fadeAnim1 }]}>
            <View style={styles.iconCircle}>
              <Icon name="leaf-outline" size={24} color="#8B4513" />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepHeading}><Text style={styles.boldText}>Choose</Text> your Stick</Text>
            </View>
          </Animated.View>
          
          <Animated.View style={[styles.connectingLine, { height: line1Height }]} />
          
          <Animated.View style={[styles.stepRow, { opacity: fadeAnim2 }]}>
            <View style={styles.iconCircle}>
              <Icon name="camera-outline" size={24} color="#8B4513" />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepHeading}><Text style={styles.boldText}>Capture</Text> with a photo</Text>
            </View>
          </Animated.View>
          
          <Animated.View style={[styles.connectingLine, { height: line2Height }]} />
          
          <Animated.View style={[styles.stepRow, { opacity: fadeAnim3 }]}>
            <View style={styles.iconCircle}>
              <Icon name="bookmark-outline" size={24} color="#8B4513" />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepHeading}><Text style={styles.boldText}>Collect</Text> your memories</Text>
            </View>
          </Animated.View>
        </View>
        
        <Animated.View style={[styles.buttonContainer, { opacity: buttonAnim }]}>
          <TouchableOpacity style={styles.nextButton} onPress={onComplete}>
            <Text style={styles.nextButtonText}>Start Your Collection</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default function OnboardingScreen({ onComplete }) {
  
  const [currentStep, setCurrentStep] = useState(0);
  const [expertise, setExpertise] = useState('beginner'); 
  const [interests, setInterests] = useState(['flavors']); 
  const [frequency, setFrequency] = useState('occasional');
  const [gender, setGender] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prefsComplete, setPrefsComplete] = useState(false);
  const [dimensions, setDimensions] = useState({ width: screenWidth });

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleResize = () => {
        setDimensions({ width: Dimensions.get('window').width });
      };
      const subscription = Dimensions.addEventListener('change', handleResize);
      return () => subscription?.remove();
    }
  }, []);

  const isWide = Platform.OS === 'web' && dimensions.width > 768;
  
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('No authenticated user found. Please log in again.');
    }
  }, []);

  const toggleInterest = (id) => {
    if (interests.includes(id)) {
      setInterests(interests.filter(i => i !== id));
    } else {
      setInterests([...interests, id]);
    }
  };

  const isSelected = (type, id) => {
    switch (type) {
      case 'expertise': return expertise === id;
      case 'interest': return interests.includes(id);
      case 'frequency': return frequency === id;
      case 'gender': return gender === id;
      default: return false;
    }
  };

  const saveUserPreferences = async () => {
    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert('Error', 'Not authenticated. Please sign in again.');
        return;
      }
      
      const userData = {
        expertise: expertise,
        interests: interests,
        frequency: frequency,
        gender: gender,
        onboardingCompleted: true,
        createdAt: serverTimestamp()
      };
      
      try {
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, userData, { merge: true });
        setPrefsComplete(true);
        setCurrentStep(4);
      } catch (firestoreError) {
        
        if (firestoreError.code === 'permission-denied') {
          Alert.alert('Error', 'Permission denied. Please check your Firestore rules.');
        } else {
          Alert.alert('Database Error', `Could not save your preferences: ${firestoreError.message}`);
        }
        
        throw firestoreError;
      }
    } catch (error) {
      console.error("Error in saveUserPreferences:", error);
      setError(error.message);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    }
  };

  const handleNext = async () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 3) {
      setLoading(true);
      try {
        await saveUserPreferences();
      } catch (e) {
        console.error('Error in handleNext:', e);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderWebStepContent = () => {
    const stepData = [
      { title: "What's your experience level?", options: expertiseLevels, type: 'expertise', value: expertise, onSelect: setExpertise },
      { title: "What interests you about cigars?", options: interestOptions, type: 'interest', value: interests, onSelect: toggleInterest },
      { title: "How often do you enjoy cigars?", options: frequencyOptions, type: 'frequency', value: frequency, onSelect: setFrequency },
      { title: "How should we address you?", options: genderOptions, type: 'gender', value: gender, onSelect: setGender }
    ];

    const current = stepData[currentStep];

    const isCompactStep = current.options.length > 4;
    
    return (
      <View style={webStyles.container}>
        <View style={webStyles.content}>
          <View style={webStyles.progressBar}>
            {[0, 1, 2, 3, 4].map(step => (
              <View key={step} style={webStyles.progressStep}>
                <View style={[webStyles.progressSegment, currentStep >= step && webStyles.progressSegmentActive]} />
              </View>
            ))}
          </View>

          <Text style={[webStyles.title, isCompactStep && webStyles.titleCompact]}>{current.title}</Text>
          <Text style={[webStyles.subtitle, isCompactStep && webStyles.subtitleCompact]}>
            {currentStep === 1 ? 'Select all that apply' : 'Choose one option'}
          </Text>

          <View style={[webStyles.optionsGrid, isCompactStep && webStyles.optionsGridCompact]}>
            {current.options.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  webStyles.optionCard,
                  isCompactStep && webStyles.optionCardCompact,
                  isSelected(current.type, option.id) && webStyles.optionCardSelected
                ]}
                onPress={() => current.onSelect(option.id)}
              >
                <View style={[
                  webStyles.optionIcon,
                  isCompactStep && webStyles.optionIconCompact,
                  isSelected(current.type, option.id) && webStyles.optionIconSelected
                ]}>
                  <Icon 
                    name={option.icon} 
                    size={isCompactStep ? 26 : 28} 
                    color={isSelected(current.type, option.id) ? '#fff' : '#8B4513'} 
                  />
                </View>
                <Text style={[webStyles.optionTitle, isCompactStep && webStyles.optionTitleCompact]}>{option.title}</Text>
                <Text style={[webStyles.optionDescription, isCompactStep && webStyles.optionDescriptionCompact]}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={webStyles.navigationButtons}>
            {currentStep > 0 && (
              <TouchableOpacity 
                style={webStyles.backButton} 
                onPress={() => setCurrentStep(currentStep - 1)}
              >
                <Text style={webStyles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={webStyles.nextButton} onPress={handleNext}>
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={webStyles.nextButtonText}>
                  {currentStep < 3 ? 'Continue' : 'Get Started'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's your experience level?</Text>
            {expertiseLevels.map(level => (
              <TouchableOpacity
                key={level.id}
                style={[styles.optionCard, isSelected('expertise', level.id) && styles.selectedCard]}
                onPress={() => setExpertise(level.id)}
              >
                <Text style={styles.optionTitle}>{level.title}</Text>
                <Text style={styles.optionDescription}>{level.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What interests you about cigars?</Text>
            {interestOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, isSelected('interest', option.id) && styles.selectedCard]}
                onPress={() => toggleInterest(option.id)}
              >
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>How often do you enjoy cigars?</Text>
            {frequencyOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, isSelected('frequency', option.id) && styles.selectedCard]}
                onPress={() => setFrequency(option.id)}
              >
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>How should we address you?</Text>
            {genderOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, isSelected('gender', option.id) && styles.selectedCard]}
                onPress={() => setGender(option.id)}
              >
                <View style={styles.genderOptionRow}>
                  <Icon name={option.icon} size={24} color={isSelected('gender', option.id) ? '#fff' : '#8B4513'} />
                  <Text style={[styles.optionTitle, { marginLeft: 12, marginBottom: 0 }]}>{option.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  if (error) {
    return (
      <SafeAreaView style={isWide ? webStyles.container : styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => setError(null)}>
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (currentStep === 4) {
    return (
      <TierComparisonScreen 
        onSelectFree={() => setCurrentStep(5)} 
        onSelectPremium={() => {
          setCurrentStep(5);
        }} 
        isWide={isWide} 
      />
    );
  }

  if (currentStep === 5) {
    return <QuickStartGuide onComplete={onComplete} isWide={isWide} />;
  }

  if (isWide) {
    return renderWebStepContent();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mobileHeader}>
        <View style={styles.progressRow}>
          {[0, 1, 2, 3, 4].map(step => (
            <View key={step} style={[styles.progressDotSmall, currentStep >= step && styles.activeDotSmall]} />
          ))}
        </View>
        <Text style={styles.mobileHeaderText}>Tell Us About Yourself</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderStepContent()}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep < 3 ? 'Next' : 'Get Started'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  mobileHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  progressDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d0d0d0',
  },
  activeDotSmall: {
    backgroundColor: '#8B4513',
  },
  mobileHeaderText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  header: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#8B4513',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
  },
  activeDot: {
    backgroundColor: '#8B4513',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stepContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCard: {
    borderColor: '#8B4513',
    borderWidth: 2,
    backgroundColor: '#f7f2e9',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  genderOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  nextButton: {
    backgroundColor: '#8B4513',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#8B4513',
    padding: 10,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  errorButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  quickStartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  stepsContainer: {
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 300,
    marginBottom: 40,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f7f2e9',
    borderWidth: 2,
    borderColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepHeading: {
    fontSize: 18,
    color: '#333',
  },
  boldText: {
    fontWeight: 'bold',
  },
  connectingLine: {
    width: 2,
    backgroundColor: '#8B4513',
    marginLeft: 25,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
});

const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 700,
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
    width: '100%',
    maxWidth: 300,
  },
  progressStep: {
    flex: 1,
  },
  progressSegment: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  progressSegmentActive: {
    backgroundColor: '#8B4513',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 28,
  },
  optionCard: {
    width: 180,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#8B4513',
    backgroundColor: '#f7f2e9',
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f7f2e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionIconSelected: {
    backgroundColor: '#8B4513',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 26,
    marginBottom: 4,
  },
  subtitleCompact: {
    marginBottom: 20,
  },
  optionsGridCompact: {
    gap: 16,
    marginBottom: 32,
  },
  optionCardCompact: {
    width: 170,
    padding: 18,
  },
  optionIconCompact: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 10,
  },
  optionTitleCompact: {
    fontSize: 15,
    marginBottom: 4,
  },
  optionDescriptionCompact: {
    fontSize: 12,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  backButtonText: {
    color: '#8B4513',
    fontWeight: 'bold',
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 48,
  },
  stepCard: {
    width: 200,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  stepIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f7f2e9',
    borderWidth: 2,
    borderColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B4513',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
