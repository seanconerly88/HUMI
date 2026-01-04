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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const expertiseLevels = [
  { id: 'beginner', title: 'Beginner', description: 'New to cigars or smoke occasionally', icon: 'leaf-outline' },
  { id: 'experienced', title: 'Experienced', description: 'Familiar with various cigars and smoke regularly', icon: 'star-half-outline' },
  { id: 'aficionado', title: 'Aficionado', description: 'Deep knowledge of cigars, regions, and profiles', icon: 'trophy-outline' }
];

const interestOptions = [
  { id: 'collection', title: 'Building a Collection', icon: 'albums-outline' },
  { id: 'pairings', title: 'Pairings', icon: 'wine-outline' },
  { id: 'culture', title: 'History & Culture', icon: 'book-outline' },
  { id: 'flavors', title: 'Flavor Profiles', icon: 'color-palette-outline' },
  { id: 'insider', title: 'Insider Knowledge', icon: 'trophy-outline' }
];

const frequencyOptions = [
  { id: 'occasional', title: 'Special Occasions', description: 'A few times a year', icon: 'calendar-outline' },
  { id: 'weekly', title: 'Weekly', description: 'Once or twice a week', icon: 'time-outline' },
  { id: 'regular', title: 'Regular', description: 'Several times a week', icon: 'repeat-outline' }
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
        const checkoutWindow = window.open(data.url, '_blank');
        if (!checkoutWindow) {
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

const CommunityGuide = ({ onComplete, isWide }) => {
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const fadeAnim3 = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim1 = useRef(new Animated.Value(0.8)).current;
  const scaleAnim2 = useRef(new Animated.Value(0.8)).current;
  const scaleAnim3 = useRef(new Animated.Value(0.8)).current;
  
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim1, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim1, { toValue: 1, friction: 6, useNativeDriver: true })
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(fadeAnim2, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim2, { toValue: 1, friction: 6, useNativeDriver: true })
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(fadeAnim3, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim3, { toValue: 1, friction: 6, useNativeDriver: true })
      ]),
      Animated.delay(300),
      Animated.timing(buttonAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const steps = [
    { icon: 'add-circle-outline', title: 'Add Your First Cigar', subtitle: 'Scan or search to start your collection' },
    { icon: 'newspaper-outline', title: 'Explore the Feed', subtitle: 'See what the community is smoking' },
    { icon: 'people-outline', title: 'Connect With Your People', subtitle: 'Find fellow enthusiasts' }
  ];

  if (isWide) {
    return (
      <View style={communityStyles.container}>
        <View style={communityStyles.content}>
          <Text style={communityStyles.title}>Welcome to the Community</Text>
          <Text style={communityStyles.subtitle}>Here's how to get started</Text>
          
          <View style={communityStyles.stepsRow}>
            {steps.map((step, index) => {
              const fadeAnims = [fadeAnim1, fadeAnim2, fadeAnim3];
              const scaleAnims = [scaleAnim1, scaleAnim2, scaleAnim3];
              return (
                <Animated.View 
                  key={index}
                  style={[
                    communityStyles.stepCard, 
                    { opacity: fadeAnims[index], transform: [{ scale: scaleAnims[index] }] }
                  ]}
                >
                  <View style={communityStyles.stepNumber}>
                    <Text style={communityStyles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={communityStyles.stepIconCircle}>
                    <Icon name={step.icon} size={36} color="#8B4513" />
                  </View>
                  <Text style={communityStyles.stepTitle}>{step.title}</Text>
                  <Text style={communityStyles.stepSubtitle}>{step.subtitle}</Text>
                </Animated.View>
              );
            })}
          </View>
          
          <Animated.View style={{ opacity: buttonAnim }}>
            <TouchableOpacity style={communityStyles.startButton} onPress={onComplete}>
              <Text style={communityStyles.startButtonText}>Let's Go</Text>
              <Icon name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={communityStyles.mobileContainer}>
      <View style={communityStyles.mobileContent}>
        <View style={communityStyles.mobileHeader}>
          <Text style={communityStyles.mobileTitle}>Welcome to the Community</Text>
          <Text style={communityStyles.mobileSubtitle}>Here's how to get the most out of HUMI</Text>
        </View>
        
        <View style={communityStyles.mobileSteps}>
          {steps.map((step, index) => {
            const fadeAnims = [fadeAnim1, fadeAnim2, fadeAnim3];
            const scaleAnims = [scaleAnim1, scaleAnim2, scaleAnim3];
            return (
              <Animated.View 
                key={index}
                style={[
                  communityStyles.mobileStepCard, 
                  { opacity: fadeAnims[index], transform: [{ scale: scaleAnims[index] }] }
                ]}
              >
                <View style={communityStyles.mobileStepNumber}>
                  <Text style={communityStyles.mobileStepNumberText}>{index + 1}</Text>
                </View>
                <View style={communityStyles.mobileStepIcon}>
                  <Icon name={step.icon} size={28} color="#8B4513" />
                </View>
                <View style={communityStyles.mobileStepText}>
                  <Text style={communityStyles.mobileStepTitle}>{step.title}</Text>
                  <Text style={communityStyles.mobileStepSubtitle}>{step.subtitle}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
        
        <Animated.View style={[communityStyles.mobileButtonContainer, { opacity: buttonAnim }]}>
          <TouchableOpacity style={communityStyles.mobileStartButton} onPress={onComplete}>
            <Text style={communityStyles.mobileStartButtonText}>Let's Go</Text>
            <Icon name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const communityStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 900,
    alignItems: 'center',
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
    marginBottom: 48,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 48,
  },
  stepCard: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
  },
  stepNumber: {
    position: 'absolute',
    top: -12,
    left: -12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f7f2e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  mobileContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  mobileHeader: {
    alignItems: 'center',
    paddingTop: 32,
  },
  mobileTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  mobileSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  mobileSteps: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  mobileStepCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mobileStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mobileStepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  mobileStepIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f7f2e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mobileStepText: {
    flex: 1,
  },
  mobileStepTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  mobileStepSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  mobileButtonContainer: {
    paddingVertical: 24,
  },
  mobileStartButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 18,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mobileStartButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 80;

const SwipeableOnboardingCards = ({ 
  currentIndex, 
  totalSteps, 
  onNext, 
  onBack, 
  onIndexChange,
  canProceed = true,
  loading = false,
  nextLabel = 'Continue',
  cards = []
}) => {
  const scrollViewRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(screenWidth);
  const [containerHeight, setContainerHeight] = useState(screenHeight);
  const pageWidth = containerWidth;
  const cardHeight = containerHeight - HEADER_HEIGHT - FOOTER_HEIGHT;
  
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: currentIndex * pageWidth, animated: true });
    }
  }, [currentIndex, pageWidth]);

  const handleLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerWidth(width);
    setContainerHeight(height);
  };

  const handleMomentumScrollEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / pageWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalSteps) {
      onIndexChange(newIndex);
    }
  };

  return (
    <View style={cardStyles.cardWrapper} onLayout={handleLayout}>
      <View style={cardStyles.progressContainer}>
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={[
              cardStyles.progressDot,
              idx <= currentIndex && cardStyles.progressDotActive
            ]}
            onPress={() => onIndexChange(idx)}
          />
        ))}
      </View>
      
      <Text style={cardStyles.swipeHint}>Swipe to navigate</Text>
      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={{ height: cardHeight }}
      >
        {cards.map((CardComponent, idx) => (
          <View key={idx} style={[cardStyles.pageContainer, { width: pageWidth, height: cardHeight }]}>
            <View style={[cardStyles.card, { minHeight: cardHeight - 40 }]}>
              <View style={cardStyles.cardContent}>
                {CardComponent}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      
      <View style={cardStyles.cardFooter}>
        {currentIndex > 0 ? (
          <TouchableOpacity style={cardStyles.backButton} onPress={onBack}>
            <Icon name="chevron-back" size={20} color="#8B4513" />
            <Text style={cardStyles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
        
        <TouchableOpacity 
          style={[cardStyles.nextButton, !canProceed && cardStyles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!canProceed || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={cardStyles.nextButtonText}>{nextLabel}</Text>
              <Icon name="chevron-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const cardStyles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    backgroundColor: '#f5f0eb',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    height: HEADER_HEIGHT - 20,
    paddingTop: 16,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e0d5c8',
  },
  progressDotActive: {
    backgroundColor: '#8B4513',
  },
  swipeHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#aaa',
    height: 20,
    fontStyle: 'italic',
  },
  pageContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

const WelcomeCard = () => (
  <View style={welcomeStyles.container}>
    <View style={welcomeStyles.logoContainer}>
      <View style={welcomeStyles.logo}>
        <Text style={welcomeStyles.logoText}>HUMI</Text>
      </View>
    </View>
    
    <Text style={welcomeStyles.title}>Welcome to HUMI</Text>
    <Text style={welcomeStyles.subtitle}>The Digital Cigar Lounge</Text>
    
    <View style={welcomeStyles.taglineContainer}>
      <Text style={welcomeStyles.tagline}>
        Join the fastest growing cigar community in the world
      </Text>
    </View>
    
    <View style={welcomeStyles.featuresContainer}>
      <View style={welcomeStyles.featureRow}>
        <View style={welcomeStyles.featureIcon}>
          <Icon name="camera-outline" size={22} color="#8B4513" />
        </View>
        <Text style={welcomeStyles.featureText}>AI-powered cigar recognition</Text>
      </View>
      <View style={welcomeStyles.featureRow}>
        <View style={welcomeStyles.featureIcon}>
          <Icon name="people-outline" size={22} color="#8B4513" />
        </View>
        <Text style={welcomeStyles.featureText}>Connect with enthusiasts</Text>
      </View>
      <View style={welcomeStyles.featureRow}>
        <View style={welcomeStyles.featureIcon}>
          <Icon name="albums-outline" size={22} color="#8B4513" />
        </View>
        <Text style={welcomeStyles.featureText}>Build your personal collection</Text>
      </View>
    </View>
  </View>
);

const welcomeStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8B4513',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  taglineContainer: {
    backgroundColor: '#f7f2e9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 32,
  },
  tagline: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 26,
  },
  featuresContainer: {
    width: '100%',
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f7f2e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
});

const ExpertiseCard = ({ expertise, setExpertise }) => (
  <View style={expertiseStyles.container}>
    <Text style={expertiseStyles.title}>Tell Us About Yourself</Text>
    <Text style={expertiseStyles.subtitle}>What's your cigar experience?</Text>
    
    <View style={expertiseStyles.optionsContainer}>
      {expertiseLevels.map((level) => (
        <TouchableOpacity
          key={level.id}
          style={[
            expertiseStyles.option,
            expertise === level.id && expertiseStyles.optionSelected
          ]}
          onPress={() => setExpertise(level.id)}
        >
          <View style={[
            expertiseStyles.optionIcon,
            expertise === level.id && expertiseStyles.optionIconSelected
          ]}>
            <Icon 
              name={level.icon} 
              size={26} 
              color={expertise === level.id ? '#fff' : '#8B4513'} 
            />
          </View>
          <View style={expertiseStyles.optionText}>
            <Text style={[
              expertiseStyles.optionTitle,
              expertise === level.id && expertiseStyles.optionTitleSelected
            ]}>
              {level.title}
            </Text>
            <Text style={expertiseStyles.optionDescription}>{level.description}</Text>
          </View>
          {expertise === level.id && (
            <View style={expertiseStyles.checkmark}>
              <Icon name="checkmark" size={18} color="#8B4513" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
    
    <View style={expertiseStyles.footnoteContainer}>
      <Text style={expertiseStyles.footnote}>
        We use this to tailor content suggestions to help you enjoy your cigars
      </Text>
    </View>
  </View>
);

const expertiseStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: '#e8e0d8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  optionSelected: {
    backgroundColor: '#faf7f3',
    borderColor: '#8B4513',
    shadowColor: '#8B4513',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5efe8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIconSelected: {
    backgroundColor: '#8B4513',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: '#8B4513',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f7f2e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footnoteContainer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  footnote: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

const InterestsCard = ({ interests, toggleInterest }) => (
  <View style={interestsStyles.container}>
    <Text style={interestsStyles.title}>What Draws You In?</Text>
    <Text style={interestsStyles.subtitle}>Select all that interest you</Text>
    
    <View style={interestsStyles.optionsContainer}>
      {interestOptions.map((option) => {
        const isSelected = interests.includes(option.id);
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              interestsStyles.option,
              isSelected && interestsStyles.optionSelected
            ]}
            onPress={() => toggleInterest(option.id)}
          >
            <View style={[
              interestsStyles.optionIcon,
              isSelected && interestsStyles.optionIconSelected
            ]}>
              <Icon 
                name={option.icon} 
                size={22} 
                color={isSelected ? '#fff' : '#8B4513'} 
              />
            </View>
            <Text style={[
              interestsStyles.optionTitle,
              isSelected && interestsStyles.optionTitleSelected
            ]}>
              {option.title}
            </Text>
            {isSelected && (
              <View style={interestsStyles.checkBadge}>
                <Icon name="checkmark" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
    
    <View style={interestsStyles.footnoteContainer}>
      <Text style={interestsStyles.footnote}>
        This helps our AI tailor responses to what you enjoy most about cigars
      </Text>
    </View>
  </View>
);

const interestsStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  option: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e8e0d8',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  optionSelected: {
    backgroundColor: '#faf7f3',
    borderColor: '#8B4513',
    shadowColor: '#8B4513',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5efe8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionIconSelected: {
    backgroundColor: '#8B4513',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  optionTitleSelected: {
    color: '#8B4513',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footnoteContainer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  footnote: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

export default function OnboardingScreen({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [expertise, setExpertise] = useState('beginner');
  const [interests, setInterests] = useState(['flavors']);
  const [frequency, setFrequency] = useState('occasional');
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
        onboardingCompleted: true,
        createdAt: serverTimestamp()
      };
      
      try {
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, userData, { merge: true });
        setPrefsComplete(true);
        setCurrentStep(3);
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
    if (currentStep === 0) {
      setCurrentStep(1);
    } else if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
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

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
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

  if (currentStep === 3) {
    return (
      <TierComparisonScreen 
        onSelectFree={() => setCurrentStep(4)} 
        onSelectPremium={() => setCurrentStep(4)} 
        isWide={isWide} 
      />
    );
  }

  if (currentStep === 4) {
    return <CommunityGuide onComplete={onComplete} isWide={isWide} />;
  }

  if (isWide) {
    return renderWebOnboarding();
  }

  const getNextLabel = () => {
    if (currentStep === 0) return "Get Started";
    if (currentStep === 2) return "Continue";
    return "Continue";
  };

  const canProceed = () => {
    if (currentStep === 2) return interests.length > 0;
    return true;
  };

  const handleIndexChange = (newIndex) => {
    setCurrentStep(newIndex);
  };

  const cards = [
    <WelcomeCard key="welcome" />,
    <ExpertiseCard key="expertise" expertise={expertise} setExpertise={setExpertise} />,
    <InterestsCard key="interests" interests={interests} toggleInterest={toggleInterest} />
  ];

  return (
    <SwipeableOnboardingCards
      currentIndex={currentStep}
      totalSteps={3}
      onNext={handleNext}
      onBack={handleBack}
      onIndexChange={handleIndexChange}
      canProceed={canProceed()}
      loading={loading}
      nextLabel={getNextLabel()}
      cards={cards}
    />
  );

  function renderWebOnboarding() {
    const stepData = [
      { title: "Welcome to HUMI", subtitle: "The Digital Cigar Lounge" },
      { title: "What's your experience level?", subtitle: "Choose one option" },
      { title: "What interests you about cigars?", subtitle: "Select all that apply" }
    ];

    const current = stepData[currentStep];

    return (
      <View style={webStyles.container}>
        <View style={webStyles.content}>
          <View style={webStyles.progressBar}>
            {[0, 1, 2].map(step => (
              <View key={step} style={webStyles.progressStep}>
                <View style={[webStyles.progressSegment, currentStep >= step && webStyles.progressSegmentActive]} />
              </View>
            ))}
          </View>

          {currentStep === 0 ? (
            <View style={webStyles.welcomeContainer}>
              <View style={webStyles.logoBox}>
                <Text style={webStyles.logoText}>HUMI</Text>
              </View>
              <Text style={webStyles.title}>Welcome to HUMI</Text>
              <Text style={webStyles.subtitle}>The Digital Cigar Lounge</Text>
              <Text style={webStyles.tagline}>Join the fastest growing cigar community in the world</Text>
            </View>
          ) : (
            <>
              <Text style={webStyles.title}>{current.title}</Text>
              <Text style={webStyles.subtitle}>{current.subtitle}</Text>

              <View style={webStyles.optionsGrid}>
                {currentStep === 1 && expertiseLevels.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      webStyles.optionCard,
                      expertise === option.id && webStyles.optionCardSelected
                    ]}
                    onPress={() => setExpertise(option.id)}
                  >
                    <View style={[
                      webStyles.optionIcon,
                      expertise === option.id && webStyles.optionIconSelected
                    ]}>
                      <Icon 
                        name={option.icon} 
                        size={28} 
                        color={expertise === option.id ? '#fff' : '#8B4513'} 
                      />
                    </View>
                    <Text style={webStyles.optionTitle}>{option.title}</Text>
                    <Text style={webStyles.optionDescription}>{option.description}</Text>
                  </TouchableOpacity>
                ))}
                {currentStep === 2 && interestOptions.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      webStyles.optionCard,
                      interests.includes(option.id) && webStyles.optionCardSelected
                    ]}
                    onPress={() => toggleInterest(option.id)}
                  >
                    <View style={[
                      webStyles.optionIcon,
                      interests.includes(option.id) && webStyles.optionIconSelected
                    ]}>
                      <Icon 
                        name={option.icon} 
                        size={28} 
                        color={interests.includes(option.id) ? '#fff' : '#8B4513'} 
                      />
                    </View>
                    <Text style={webStyles.optionTitle}>{option.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={webStyles.navigationButtons}>
            {currentStep > 0 && (
              <TouchableOpacity 
                style={webStyles.backButton} 
                onPress={handleBack}
              >
                <Text style={webStyles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={webStyles.nextButton} onPress={handleNext}>
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={webStyles.nextButtonText}>
                  {currentStep === 0 ? 'Get Started' : currentStep < 2 ? 'Continue' : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
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
});

const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
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
    maxWidth: 200,
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
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
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
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
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
    backgroundColor: '#fff',
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
});
