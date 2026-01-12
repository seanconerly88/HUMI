import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PWAInstallPromptProps {
  onContinue: () => void;
}

function PWAInstallPrompt({ onContinue }: PWAInstallPromptProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  const features = [
    { icon: '👥', text: 'Join the Fastest Growing Cigar Community' },
    { icon: '🤖', text: 'AI-Powered Cigar Recognition' },
    { icon: '💎', text: 'Expert Recommendations & Reviews' },
    { icon: '📚', text: 'Track Your Personal Collection' },
  ];

  const instructions = [
    { step: 1, text: 'Tap the Share button', icon: '↗️' },
    { step: 2, text: 'Scroll and tap "Add to Home Screen"', icon: '📱' },
    { step: 3, text: 'Tap "Add" to join the community', icon: '✓' },
  ];

  const ContainerComponent = Platform.OS === 'web' ? View : SafeAreaView;
  const containerStyle = Platform.OS === 'web' 
    ? [styles.container, { minHeight: '100vh' as any, height: '100%' as any }]
    : styles.container;

  if (showInstructions) {
    return (
      <ContainerComponent style={containerStyle}>
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>HUMI</Text>
              </View>
            </View>

            <Text style={styles.title}>Get Access to the Community</Text>
            <Text style={styles.subtitle}>3 Quick Steps</Text>

            <View style={styles.instructionsList}>
              {instructions.map((instruction) => (
                <View key={instruction.step} style={styles.instructionItem}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNumber}>{instruction.step}</Text>
                  </View>
                  <View style={styles.instructionTextContainer}>
                    <Text style={styles.instructionText}>
                      {instruction.text}
                    </Text>
                    {instruction.step === 1 && (
                      <Ionicons name="share-outline" size={20} color="#8B4513" style={{ marginLeft: 2 }} />
                    )}
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowInstructions(false)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipLink}
              onPress={onContinue}
            >
              <Text style={styles.skipLinkText}>Continue without installing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ContainerComponent>
    );
  }

  return (
    <ContainerComponent style={containerStyle}>
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>HUMI</Text>
            </View>
          </View>

          <Text style={styles.welcomeLabel}>WELCOME TO</Text>
          <Text style={styles.title}>HUMI</Text>
          <Text style={styles.tagline}>The Digital Cigar Lounge</Text>
          <Text style={styles.description}>
            Connect with fellow cigar enthusiasts, discover new favorites, and build your personal collection.
          </Text>

          <View style={styles.featuresList}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setShowInstructions(true)}
          >
            <Text style={styles.primaryButtonText}>Join the Community</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            The fastest growing cigar community in the world
          </Text>

          <TouchableOpacity
            style={styles.skipLink}
            onPress={onContinue}
          >
            <Text style={styles.skipLinkText}>Continue in browser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ContainerComponent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.08)',
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 72,
    height: 72,
    backgroundColor: '#8B4513',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  welcomeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B4513',
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c2c2c',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featuresList: {
    width: '100%',
    marginBottom: 24,
    backgroundColor: '#fafaf8',
    borderRadius: 16,
    padding: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#3c3c3c',
    flex: 1,
  },
  instructionsList: {
    width: '100%',
    marginBottom: 24,
    backgroundColor: '#fafaf8',
    borderRadius: 16,
    padding: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 14,
    color: '#3c3c3c',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  backButton: {
    backgroundColor: '#e8e8e4',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 28,
    width: '100%',
    marginBottom: 16,
  },
  backButtonText: {
    color: '#3c3c3c',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  skipLink: {
    padding: 8,
  },
  skipLinkText: {
    color: '#888',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});

export default PWAInstallPrompt;
