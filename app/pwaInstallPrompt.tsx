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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PWAInstallPromptProps {
  onContinue: () => void;
}

function PWAInstallPrompt({ onContinue }: PWAInstallPromptProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  const features = [
    { icon: '🤖', text: 'AI-Powered Cigar Analysis' },
    { icon: '👥', text: 'Cigar Community' },
    { icon: '💎', text: 'Expert Recommendations' },
    { icon: '📚', text: 'Personal Collection Tracking' },
  ];

  const instructions = [
    { step: 1, text: 'Click the Share button', icon: '↗️' },
    { step: 2, text: 'Scroll down to "Add to Home Screen"', icon: '📱' },
    { step: 3, text: 'Click "Add"', icon: '✓' },
  ];

  if (showInstructions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>HUMI</Text>
              </View>
            </View>

            <Text style={styles.title}>Add HUMI to Your Home Screen</Text>
            <Text style={styles.subtitle}>3 Easy Steps</Text>

            <View style={styles.instructionsList}>
              {instructions.map((instruction) => (
                <View key={instruction.step} style={styles.instructionItem}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNumber}>{instruction.step}</Text>
                  </View>
                  <Text style={styles.instructionText}>{instruction.text}</Text>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>HUMI</Text>
            </View>
          </View>

          <Text style={styles.title}>Welcome to HUMI</Text>
          <Text style={styles.description}>
            Your personal cigar companion with AI expertise. Install to unlock the full experience.
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
            <Text style={styles.primaryButtonText}>Show Instructions</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Join thousands of cigar enthusiasts discovering their perfect smoke
          </Text>

          <TouchableOpacity
            style={styles.skipLink}
            onPress={onContinue}
          >
            <Text style={styles.skipLinkText}>Continue in browser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#2d2d44',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: '#8B4513',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 30,
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  featuresList: {
    width: '100%',
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
  },
  instructionsList: {
    width: '100%',
    marginBottom: 30,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#444',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 15,
  },
  skipLink: {
    padding: 10,
  },
  skipLinkText: {
    color: '#8B4513',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default PWAInstallPrompt;
