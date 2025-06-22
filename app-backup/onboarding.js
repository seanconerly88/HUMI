// app/onboarding.js
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [expertise, setExpertise] = useState('beginner'); // Set default to enable button
  const [interests, setInterests] = useState(['flavors']); // Set default to enable button
  const [frequency, setFrequency] = useState('occasional'); // Set default to enable button
  const [loading, setLoading] = useState(false);

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

  const handleNext = async () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      setLoading(true);
      
      // Simulate saving data
      setTimeout(() => {
        setLoading(false);
        router.replace('/');
      }, 1500);
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
});