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
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const expertiseLevels = [
  { id: 'beginner', title: 'Beginner', description: 'New to cigars or smoke occasionally' },
  { id: 'experienced', title: 'Experienced', description: 'Familiar with various cigars and smoke regularly' },
  { id: 'aficionado', title: 'Aficionado', description: 'Deep knowledge of cigars, regions, and profiles' }
];

const interestOptions = [
  { id: 'flavors', title: 'Flavor Profiles', description: 'Discover new tastes and notes' },
  { id: 'collection', title: 'Collection', description: 'Build a collection of rare or unique cigars' },
  { id: 'pairings', title: 'Pairings', description: 'Find the perfect drink or food pairing' },
  { id: 'culture', title: 'History & Culture', description: 'Learn about cigar heritage and traditions' }
];

const frequencyOptions = [
  { id: 'occasional', title: 'Special Occasions', description: 'A few times a year' },
  { id: 'weekly', title: 'Weekly', description: 'Once or twice a week' },
  { id: 'regular', title: 'Regular', description: 'Several times a week' }
];

// ⭐ NEW: Strength preference options
const strengthOptions = [
  { id: 'mild', title: 'Mild', description: 'Smooth, creamy, subtle flavors' },
  { id: 'medium', title: 'Medium', description: 'Balanced, developing complexity' },
  { id: 'full', title: 'Full-Bodied', description: 'Bold, intense, rich flavors' },
  { id: 'not-sure', title: 'Not Sure', description: 'Still discovering my preference' }
];
// ⭐ END NEW

// ⭐ NEW: Smoke Reveal Screen Component
const SmokeRevealScreen = ({ palateProfile, onContinue }) => {
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const smokeParticles = useRef(
    Array.from({ length: 12 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      translateX: new Animated.Value((Math.random() - 0.5) * 100)
    }))
  ).current;

  useEffect(() => {
    // Animate smoke particles first
    const smokeAnimations = smokeParticles.map((particle, index) => 
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.parallel([
          Animated.timing(particle.opacity, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true
          }),
          Animated.timing(particle.translateY, {
            toValue: -150,
            duration: 1500,
            useNativeDriver: true
          })
        ]),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        })
      ])
    );

    // After smoke starts, reveal the card
    Animated.sequence([
      Animated.delay(800),
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        })
      ])
    ]).start();

    Animated.parallel(smokeAnimations).start();
  }, []);

  return (
    <SafeAreaView style={styles.smokeRevealContainer}>
      {/* Smoke particles */}
      {smokeParticles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.smokeParticle,
            {
              opacity: particle.opacity,
              transform: [
                { translateY: particle.translateY },
                { translateX: particle.translateX }
              ]
            }
          ]}
        />
      ))}

      {/* Profile Card */}
      <Animated.View
        style={[
          styles.profileCard,
          {
            opacity: cardOpacity,
            transform: [{ scale: cardScale }]
          }
        ]}
      >
        <Text style={styles.profileRevealTitle}>Your Palate Profile</Text>
        <Text style={styles.profileTierName}>{palateProfile}</Text>
        <Text style={styles.profileRevealSubtext}>
          Your personalized cigar journey begins
        </Text>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={onContinue}
        >
          <Text style={styles.continueButtonText}>See My Full Profile</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};
// ⭐ END NEW

// ⭐ NEW: Full Palate Profile Screen Component
const PalateProfileScreen = ({ 
  palateProfile, 
  expertise, 
  interests, 
  frequency, 
  strength,
  onComplete 
}) => {
  // Generate dynamic content based on tier
  const getProfileContent = () => {
    const interestText = interests.map(i => {
      switch(i) {
        case 'flavors': return 'exploring nuanced tasting notes';
        case 'pairings': return 'the perfect complement to fine spirits';
        case 'culture': return 'the heritage and craftsmanship behind each blend';
        case 'collection': return 'rare and limited releases';
        default: return '';
      }
    }).filter(Boolean).join(', ');

    const strengthText = {
      'mild': 'smooth, creamy profiles with subtle complexity',
      'medium': 'balanced blends with developing layers',
      'full': 'bold, intense experiences',
      'not-sure': 'discovering what resonates with your palate'
    }[strength] || 'a variety of flavor profiles';

    const frequencyText = {
      'occasional': 'occasional',
      'weekly': 'weekly',
      'regular': 'regular'
    }[frequency] || '';

    let recommendations = [];
    let pairings = [];
    let learning = [];

    // Tier-specific content
    switch(palateProfile) {
      case 'The Curious Explorer':
        recommendations = ['Arturo Fuente Hemingway', 'Macanado Cafe', 'Ashton Classic'];
        pairings = ['Light coffee or tea', 'Sparkling water', 'Mild beer'];
        learning = ['How to properly cut a cigar', 'Understanding flavor notes', 'Cigar etiquette basics'];
        break;
      
      case 'The Smooth Specialist':
        recommendations = ['Davidoff Signature', 'Ashton Classic', 'Griffin\'s Classic'];
        pairings = ['Champagne or white wine', 'Light coffee', 'Delicate cheeses'];
        learning = ['Aging mild cigars', 'Connecticut wrapper variations', 'Pairing fundamentals'];
        break;
      
      case 'The Flavor Connoisseur':
        recommendations = ['Padron 1964', 'My Father Le Bijou', 'Oliva Serie V'];
        pairings = ['Aged rum or bourbon', 'Dark roast coffee', 'Dark chocolate'];
        learning = ['Understanding tobacco terroir', 'Blending complexity', 'Advanced tasting techniques'];
        break;
      
      case 'The Elegant Expert':
        recommendations = ['Davidoff Millennium', 'Arturo Fuente Opus X', 'Ashton ESG'];
        pairings = ['Vintage champagne', 'Single malt scotch', 'Gourmet pairings'];
        learning = ['Rare Connecticut leaves', 'Vintage cigar collecting', 'Regional exclusives'];
        break;
      
      case 'The Total Titan':
        recommendations = ['Liga Privada No. 9', 'Padron 1926 Maduro', 'My Father Limited Edition'];
        pairings = ['Aged scotch or cognac', 'Espresso', 'Artisan chocolate'];
        learning = ['Limited edition releases', 'Advanced aging techniques', 'Regional exclusives hunting'];
        break;
    }

    return {
      analysis: `You are ${expertise === 'beginner' ? 'beginning your journey' : expertise === 'experienced' ? 'developing your expertise' : 'a seasoned aficionado'} in the world of premium cigars.\n\nAs a ${frequencyText} enthusiast, you ${frequency === 'occasional' ? 'savor each experience thoughtfully' : frequency === 'weekly' ? 'appreciate the ritual and discovery' : 'live and breathe the cigar lifestyle'}.\n\nYour interest in ${interestText} shapes your unique journey.\n\nYour preference for ${strengthText} defines your palate.`,
      recommendations,
      pairings,
      learning
    };
  };

  const content = getProfileContent();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.profileScrollView}>
        <View style={styles.profileHeader}>
          <Text style={styles.profileHeaderTitle}>Your Palate Profile</Text>
          <Text style={styles.profileTierNameLarge}>{palateProfile}</Text>
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.profileSectionTitle}>📊 Your Preferences</Text>
          <Text style={styles.profilePreferenceText}>• {expertise.charAt(0).toUpperCase() + expertise.slice(1)} level</Text>
          <Text style={styles.profilePreferenceText}>• {frequency.charAt(0).toUpperCase() + frequency.slice(1)} frequency</Text>
          <Text style={styles.profilePreferenceText}>• Prefers {strength === 'not-sure' ? 'exploring all strengths' : strength + ' cigars'}</Text>
          <Text style={styles.profilePreferenceText}>• Interested in {interests.join(', ')}</Text>
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.profileSectionTitle}>🎯 AI Analysis</Text>
          <Text style={styles.profileAnalysisText}>{content.analysis}</Text>
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.profileSectionTitle}>🔥 Start With These</Text>
          {content.recommendations.map((rec, index) => (
            <Text key={index} style={styles.profileListItem}>• {rec}</Text>
          ))}
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.profileSectionTitle}>🥃 Pair With</Text>
          {content.pairings.map((pair, index) => (
            <Text key={index} style={styles.profileListItem}>• {pair}</Text>
          ))}
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.profileSectionTitle}>📚 Learn About</Text>
          {content.learning.map((learn, index) => (
            <Text key={index} style={styles.profileListItem}>• {learn}</Text>
          ))}
        </View>

        <TouchableOpacity
          style={styles.startCollectionButton}
          onPress={onComplete}
        >
          <Text style={styles.startCollectionButtonText}>Start Your Collection</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
// ⭐ END NEW

// Quick Start Guide component
const QuickStartGuide = ({ onComplete }) => {
  // Animation values
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const fadeAnim3 = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  
  // Line heights
  const line1Height = useRef(new Animated.Value(0)).current;
  const line2Height = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Sequence the animations
    Animated.sequence([
      // Step 1
      Animated.timing(fadeAnim1, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Line 1
      Animated.timing(line1Height, {
        toValue: 40,
        duration: 400,
        useNativeDriver: false,
      }),
      // Step 2
      Animated.timing(fadeAnim2, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Line 2
      Animated.timing(line2Height, {
        toValue: 40,
        duration: 400,
        useNativeDriver: false,
      }),
      // Step 3
      Animated.timing(fadeAnim3, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Button fade in
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>How to Use HUMI</Text>
      </View>
      
      {/* ⭐ MODIFIED: Updated progress dots to 4 */}
      <View style={styles.progressContainer}>
        {[0, 1, 2, 3].map(step => (
          <View 
            key={step} 
            style={[
              styles.progressDot,
              styles.activeDot
            ]}
          />
        ))}
      </View>
      {/* ⭐ END MODIFIED */}
      
      <View style={styles.quickStartContainer}>
        <View style={styles.stepsContainer}>
          {/* Step 1 */}
          <Animated.View style={[styles.stepRow, { opacity: fadeAnim1 }]}>
            <View style={styles.iconCircle}>
              <Ionicons name="leaf-outline" size={24} color="#8B4513" />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepHeading}><Text style={styles.boldText}>Choose</Text> your Stick</Text>
            </View>
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.connectingLine, 
              { height: line1Height }
            ]} 
          />
          
          {/* Step 2 */}
          <Animated.View style={[styles.stepRow, { opacity: fadeAnim2 }]}>
            <View style={styles.iconCircle}>
              <Ionicons name="camera-outline" size={24} color="#8B4513" />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepHeading}><Text style={styles.boldText}>Capture</Text> with a photo</Text>
            </View>
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.connectingLine, 
              { height: line2Height }
            ]} 
          />
          
          {/* Step 3 */}
          <Animated.View style={[styles.stepRow, { opacity: fadeAnim3 }]}>
            <View style={styles.iconCircle}>
              <Ionicons name="bookmark-outline" size={24} color="#8B4513" />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepHeading}><Text style={styles.boldText}>Collect</Text> your memories</Text>
            </View>
          </Animated.View>
        </View>
        
        <Animated.View style={[styles.buttonContainer, { opacity: buttonAnim }]}>
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={onComplete}
          >
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
  
  // ⭐ NEW: Strength and profile state
  const [strength, setStrength] = useState('mild');
  const [palateProfile, setPalateProfile] = useState('');
  // ⭐ END NEW
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prefsComplete, setPrefsComplete] = useState(false);
  
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
      // ⭐ NEW: Strength selection
      case 'strength': return strength === id;
      // ⭐ END NEW
      default: return false;
    }
  };

  // ⭐ NEW: Calculate palate profile based on expertise + strength
  const calculatePalateProfile = () => {
    let profile;

    if (expertise === 'beginner') {
      profile = 'The Curious Explorer';
    }
    else if (expertise === 'experienced' && strength === 'mild') {
      profile = 'The Smooth Specialist';
    }
    else if (expertise === 'experienced') {
      profile = 'The Flavor Connoisseur';
    }
    else if (expertise === 'aficionado' && strength === 'mild') {
      profile = 'The Elegant Expert';
    }
    else {
      profile = 'The Total Titan';
    }

    return profile;
  };
  // ⭐ END NEW

  // ⭐ MODIFIED: Updated to save strength and calculate profile
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
      
      // Calculate the palate profile
      const calculatedProfile = calculatePalateProfile();
      setPalateProfile(calculatedProfile);
      
      const userData = {
        expertise: expertise,
        interests: interests,
        frequency: frequency,
        strength: strength, // ⭐ NEW: Save strength
        palateProfile: calculatedProfile, // ⭐ NEW: Save calculated profile
        onboardingCompleted: true,
        createdAt: serverTimestamp()
      };
      
      console.log('Preparing to save data:', JSON.stringify(userData));
      
      try {
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, userData, { merge: true });
        console.log('Firestore write successful');
        
        // Move to smoke reveal
        setPrefsComplete(true);
        setCurrentStep(4); // ⭐ MODIFIED: Changed from 3 to 4
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
  // ⭐ END MODIFIED

  // ⭐ MODIFIED: Updated to handle new step count
  const handleNext = async () => {
    if (currentStep < 3) { // ⭐ MODIFIED: Changed from 2 to 3
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 3) { // ⭐ MODIFIED: Changed from 2 to 3
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
  // ⭐ END MODIFIED

  // ⭐ MODIFIED: Added case for strength preference (step 3)
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's your experience level?</Text>
            {expertiseLevels.map(level => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.optionCard,
                  isSelected('expertise', level.id) && styles.selectedCard
                ]}
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
                style={[
                  styles.optionCard,
                  isSelected('interest', option.id) && styles.selectedCard
                ]}
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
                style={[
                  styles.optionCard,
                  isSelected('frequency', option.id) && styles.selectedCard
                ]}
                onPress={() => setFrequency(option.id)}
              >
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      // ⭐ NEW: Step 3 - Strength Preference
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What strength do you prefer?</Text>
            {strengthOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  isSelected('strength', option.id) && styles.selectedCard
                ]}
                onPress={() => setStrength(option.id)}
              >
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      // ⭐ END NEW
      default:
        return null;
    }
  };
  // ⭐ END MODIFIED

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => setError(null)}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ⭐ NEW: Show Smoke Reveal Screen (Step 4)
  if (currentStep === 4) {
    return (
      <SmokeRevealScreen 
        palateProfile={palateProfile}
        onContinue={() => setCurrentStep(5)}
      />
    );
  }
  // ⭐ END NEW

  // ⭐ NEW: Show Full Profile Screen (Step 5)
  if (currentStep === 5) {
    return (
      <PalateProfileScreen
        palateProfile={palateProfile}
        expertise={expertise}
        interests={interests}
        frequency={frequency}
        strength={strength}
        onComplete={onComplete}
      />
    );
  }
  // ⭐ END NEW

  // ⭐ MODIFIED: Changed from currentStep === 3 to 6
  if (currentStep === 6) {
    return <QuickStartGuide onComplete={onComplete} />;
  }
  // ⭐ END MODIFIED

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Tell Us About Yourself</Text>
      </View>
      
      {/* ⭐ MODIFIED: Updated progress dots from [0,1,2] to [0,1,2,3] */}
      <View style={styles.progressContainer}>
        {[0, 1, 2, 3].map(step => (
          <View 
            key={step} 
            style={[
              styles.progressDot,
              currentStep >= step && styles.activeDot
            ]}
          />
        ))}
      </View>
      {/* ⭐ END MODIFIED */}
      
      <ScrollView style={styles.scrollView}>
        {renderStepContent()}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={handleNext}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.nextButtonText}>
              {/* ⭐ MODIFIED: Changed from currentStep < 2 to currentStep < 3 */}
              {currentStep < 3 ? 'Next' : 'Reveal My Profile'}
              {/* ⭐ END MODIFIED */}
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
  // Quick Start Guide styles
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
  
  // ⭐ NEW: Smoke Reveal Screen Styles
  smokeRevealContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  smokeParticle: {
    position: 'absolute',
    bottom: '50%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#666',
    opacity: 0.3,
  },
  profileCard: {
    backgroundColor: '#f7f2e9',
    borderRadius: 16,
    padding: 32,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileRevealTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    letterSpacing: 1,
  },
  profileTierName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 16,
    textAlign: 'center',
  },
  profileRevealSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  continueButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // ⭐ END NEW

  // ⭐ NEW: Full Profile Screen Styles
  profileScrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#8B4513',
    padding: 24,
    paddingTop: 50,
    alignItems: 'center',
  },
  profileHeaderTitle: {
    fontSize: 18,
    color: '#f7f2e9',
    marginBottom: 8,
    letterSpacing: 1,
  },
  profileTierNameLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  profileSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 12,
  },
  profilePreferenceText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
    lineHeight: 22,
  },
  profileAnalysisText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  profileListItem: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  startCollectionButton: {
    backgroundColor: '#8B4513',
    margin: 16,
    marginTop: 8,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  startCollectionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  // ⭐ END NEW
});
