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
        toValue: 40, // Adjust based on your spacing
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
        toValue: 40, // Adjust based on your spacing
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
      
      <View style={styles.progressContainer}>
        {[0, 1, 2].map(step => (
          <View 
            key={step} 
            style={[
              styles.progressDot,
              styles.activeDot // All dots active on final screen
            ]}
          />
        ))}
      </View>
      
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
          
          {/* Connecting Line 1 */}
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
          
          {/* Connecting Line 2 */}
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
        
        {/* Start Button */}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prefsComplete, setPrefsComplete] = useState(false);
  
  // Check if we have a valid user when component mounts
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
      // Get the current user ID directly from Firebase Auth
      const userId = auth.currentUser?.uid;
      console.log('Current user ID in onboarding:', userId);
      
      if (!userId) {
        const errMsg = 'Not authenticated. Please sign in again.';
        console.error(errMsg);
        Alert.alert('Error', errMsg);
        return;
      }

      console.log('Attempting to write to Firestore path:', `users/${userId}`);
      
      // Create a simpler data object with primitive values 
      const userData = {
        expertise: expertise,
        interests: interests,
        frequency: frequency,
        onboardingCompleted: true,
        // Use serverTimestamp instead of new Date() for better Firestore compatibility
        createdAt: serverTimestamp()
      };
      
      console.log('Preparing to save data:', JSON.stringify(userData));
      
      try {
        // Get reference to the document
        const userDocRef = doc(db, 'users', userId);
        
        // Save the data
        await setDoc(userDocRef, userData, { merge: true });
        console.log('Firestore write successful');
        
        // Move to quick start guide
        setPrefsComplete(true);
        setCurrentStep(3);
      } catch (firestoreError) {
        console.error('Firestore write error details:', firestoreError.code, firestoreError.message);
        
        // Show more detailed error to user
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
      default:
        return null;
    }
  };

  // If there's an error, show it
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

  // Show Quick Start Guide as the final step
  if (currentStep === 3) {
    return <QuickStartGuide onComplete={onComplete} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Tell Us About Yourself</Text>
      </View>
      
      <View style={styles.progressContainer}>
        {[0, 1, 2].map(step => (
          <View 
            key={step} 
            style={[
              styles.progressDot,
              currentStep >= step && styles.activeDot
            ]}
          />
        ))}
      </View>
      
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
    marginLeft: 25, // Center of the circle
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
});