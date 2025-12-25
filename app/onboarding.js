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
  { id: 'culture', title: 'History & Culture', description: 'Learn about cigar heritage and traditions', icon: 'book-outline' }
];

const frequencyOptions = [
  { id: 'occasional', title: 'Special Occasions', description: 'A few times a year', icon: 'calendar-outline' },
  { id: 'weekly', title: 'Weekly', description: 'Once or twice a week', icon: 'time-outline' },
  { id: 'regular', title: 'Regular', description: 'Several times a week', icon: 'repeat-outline' }
];

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
        {[0, 1, 2].map(step => (
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
  console.log('OnboardingScreen rendered, onComplete prop:', typeof onComplete);
  
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
    console.log('Current user in onboarding:', currentUser?.uid || 'No user');
    
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
      default: return false;
    }
  };

  const saveUserPreferences = async () => {
    try {
      const userId = auth.currentUser?.uid;
      console.log('Current user ID in onboarding:', userId);
      
      if (!userId) {
        const errMsg = 'Not authenticated. Please sign in again.';
        console.error(errMsg);
        Alert.alert('Error', errMsg);
        return;
      }

      console.log('Attempting to write to Firestore path:', `users/${userId}`);
      
      const userData = {
        expertise: expertise,
        interests: interests,
        frequency: frequency,
        onboardingCompleted: true,
        createdAt: serverTimestamp()
      };
      
      console.log('Preparing to save data:', JSON.stringify(userData));
      
      try {
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, userData, { merge: true });
        console.log('Firestore write successful');
        setPrefsComplete(true);
        setCurrentStep(3);
      } catch (firestoreError) {
        console.error('Firestore write error details:', firestoreError.code, firestoreError.message);
        
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
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
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

  const renderWebStepContent = () => {
    const stepData = [
      { title: "What's your experience level?", options: expertiseLevels, type: 'expertise', value: expertise, onSelect: setExpertise },
      { title: "What interests you about cigars?", options: interestOptions, type: 'interest', value: interests, onSelect: toggleInterest },
      { title: "How often do you enjoy cigars?", options: frequencyOptions, type: 'frequency', value: frequency, onSelect: setFrequency }
    ];

    const current = stepData[currentStep];

    return (
      <View style={webStyles.container}>
        <View style={webStyles.content}>
          <View style={webStyles.progressBar}>
            {[0, 1, 2].map(step => (
              <View key={step} style={webStyles.progressStep}>
                <View style={[webStyles.progressCircle, currentStep >= step && webStyles.progressCircleActive]}>
                  <Text style={[webStyles.progressNumber, currentStep >= step && webStyles.progressNumberActive]}>
                    {step + 1}
                  </Text>
                </View>
                {step < 2 && (
                  <View style={[webStyles.progressLine, currentStep > step && webStyles.progressLineActive]} />
                )}
              </View>
            ))}
          </View>

          <Text style={webStyles.title}>{current.title}</Text>
          <Text style={webStyles.subtitle}>
            {currentStep === 1 ? 'Select all that apply' : 'Choose one option'}
          </Text>

          <View style={webStyles.optionsGrid}>
            {current.options.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  webStyles.optionCard,
                  isSelected(current.type, option.id) && webStyles.optionCardSelected
                ]}
                onPress={() => current.onSelect(option.id)}
              >
                <View style={[
                  webStyles.optionIcon,
                  isSelected(current.type, option.id) && webStyles.optionIconSelected
                ]}>
                  <Icon 
                    name={option.icon} 
                    size={28} 
                    color={isSelected(current.type, option.id) ? '#fff' : '#8B4513'} 
                  />
                </View>
                <Text style={webStyles.optionTitle}>{option.title}</Text>
                <Text style={webStyles.optionDescription}>{option.description}</Text>
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
                  {currentStep < 2 ? 'Continue' : 'Get Started'}
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

  if (currentStep === 3) {
    return <QuickStartGuide onComplete={onComplete} isWide={isWide} />;
  }

  if (isWide) {
    return renderWebStepContent();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Tell Us About Yourself</Text>
      </View>
      
      <View style={styles.progressContainer}>
        {[0, 1, 2].map(step => (
          <View key={step} style={[styles.progressDot, currentStep >= step && styles.activeDot]} />
        ))}
      </View>
      
      <ScrollView style={styles.scrollView}>
        {renderStepContent()}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep < 2 ? 'Next' : 'Get Started'}
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
  header: {
    padding: 16,
    backgroundColor: '#8B4513',
    paddingTop: 50,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d3d3d3',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#8B4513',
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
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
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  content: {
    width: '100%',
    maxWidth: 800,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleActive: {
    backgroundColor: '#8B4513',
  },
  progressNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  progressNumberActive: {
    color: '#fff',
  },
  progressLine: {
    width: 80,
    height: 3,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#8B4513',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 40,
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
