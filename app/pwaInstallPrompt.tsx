import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

// Capture the browser's install prompt as early as possible — before any user interaction.
// This must be module-level so it fires before React even mounts.
let deferredInstallPrompt: any = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });
}

function detectPlatform() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function isAlreadyInstalled() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

interface PWAInstallPromptProps {
  onContinue: () => void;
}

export default function PWAInstallPrompt({ onContinue }: PWAInstallPromptProps) {
  const platform = detectPlatform();
  const [androidPromptAvailable, setAndroidPromptAvailable] = useState(!!deferredInstallPrompt);
  const [installed, setInstalled] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const isMobile = screenWidth < 768;

  useEffect(() => {
    // If already running as installed PWA, skip this screen entirely
    if (isAlreadyInstalled()) {
      onContinue();
      return;
    }

    // Poll briefly — on Android the event sometimes fires just after mount
    const timer = setTimeout(() => {
      if (deferredInstallPrompt) setAndroidPromptAvailable(true);
    }, 500);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setTimeout(onContinue, 1200);
    });

    return () => clearTimeout(timer);
  }, []);

  // ── Android: trigger native prompt immediately ──────────────────────────
  const handleAndroidInstall = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      setAndroidPromptAvailable(false);
      if (outcome === 'accepted') {
        // appinstalled event will handle onContinue
      } else {
        // User dismissed — let them continue anyway
        onContinue();
      }
    } else {
      // Prompt not available (already installed, or browser doesn't support)
      onContinue();
    }
  };

  const ContainerComponent = Platform.OS === 'web' ? View : SafeAreaView;
  const containerStyle: any = Platform.OS === 'web'
    ? [styles.container, { minHeight: '100vh' }]
    : styles.container;

  const features = [
    { icon: '👥', text: 'Join the Fastest Growing Cigar Community' },
    { icon: '🤖', text: 'AI-Powered Cigar Recognition' },
    { icon: '💎', text: 'Expert Recommendations & Reviews' },
    { icon: '📚', text: 'Track Your Personal Collection' },
  ];

  // ── iOS: collapsed 2-step instructions ─────────────────────────────────
  if (platform === 'ios' && showIOSSteps) {
    return (
      <ContainerComponent style={containerStyle}>
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>HUMI</Text>
            </View>

            <Text style={styles.title}>Save to Your Home Screen</Text>
            <Text style={styles.subtitle}>Two taps and you're in</Text>

            {/* Step 1 */}
            <View style={styles.iosStep}>
              <View style={styles.stepBadge}><Text style={styles.stepNumber}>1</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.iosStepText}>
                  Tap the{' '}
                  <Text style={styles.iosStepBold}>Share</Text>
                  {' '}button at the bottom of your screen
                </Text>
                {/* Visual indicator */}
                <View style={styles.iosShareVisual}>
                  <View style={styles.browserBar}>
                    <View style={styles.browserBarDot} />
                    <View style={[styles.browserBarDot, { backgroundColor: '#fbbf24' }]} />
                    <View style={[styles.browserBarDot, { backgroundColor: '#34d399' }]} />
                    <View style={styles.browserUrlBar} />
                  </View>
                  <View style={styles.browserBottomBar}>
                    <Ionicons name="chevron-back" size={20} color="#999" />
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    <View style={styles.shareButtonHighlight}>
                      <Ionicons name="share-outline" size={22} color="#8B4513" />
                    </View>
                    <Ionicons name="book-outline" size={20} color="#999" />
                    <Ionicons name="copy-outline" size={20} color="#999" />
                  </View>
                </View>
              </View>
            </View>

            {/* Step 2 */}
            <View style={[styles.iosStep, { marginTop: 16 }]}>
              <View style={styles.stepBadge}><Text style={styles.stepNumber}>2</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.iosStepText}>
                  Tap{' '}
                  <Text style={styles.iosStepBold}>"Add to Home Screen"</Text>
                  {' '}then tap{' '}
                  <Text style={styles.iosStepBold}>Add</Text>
                </Text>
                <View style={styles.addToHomeChip}>
                  <Ionicons name="add-circle-outline" size={18} color="#8B4513" />
                  <Text style={styles.addToHomeChipText}>Add to Home Screen</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.skipLink} onPress={onContinue}>
              <Text style={styles.skipLinkText}>Skip — continue in browser</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ContainerComponent>
    );
  }

  // ── Main welcome screen ─────────────────────────────────────────────────
  return (
    <ContainerComponent style={containerStyle}>
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>HUMI</Text>
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

          {installed ? (
            <View style={styles.installedBadge}>
              <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
              <Text style={styles.installedText}>Added to Home Screen!</Text>
            </View>
          ) : platform === 'android' && androidPromptAvailable ? (
            /* Android: one button tap = native dialog */
            <TouchableOpacity style={styles.primaryButton} onPress={handleAndroidInstall}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Add to Home Screen</Text>
            </TouchableOpacity>
          ) : platform === 'ios' ? (
            /* iOS: button goes to the 2-step visual guide */
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowIOSSteps(true)}>
              <Text style={styles.primaryButtonText}>Join the Community</Text>
            </TouchableOpacity>
          ) : (
            /* Desktop / other — just continue */
            <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
              <Text style={styles.primaryButtonText}>Open HUMI</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.footerText}>
            The fastest growing cigar community in the world
          </Text>

          {!isMobile && (
            <TouchableOpacity style={styles.skipLink} onPress={onContinue}>
              <Text style={styles.skipLinkText}>Continue in browser</Text>
            </TouchableOpacity>
          )}

          {(platform === 'android' && !androidPromptAvailable) || platform === 'other' ? null : null}
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
  logo: {
    width: 72,
    height: 72,
    backgroundColor: '#8B4513',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
  primaryButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    width: '100%',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
  installedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  installedText: {
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 15,
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
    marginTop: 4,
  },
  skipLinkText: {
    color: '#888',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  // iOS instruction styles
  iosStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  stepNumber: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  iosStepText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 10,
  },
  iosStepBold: {
    fontWeight: '700',
    color: '#8B4513',
  },
  // Simulated Safari bottom bar
  iosShareVisual: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 4,
  },
  browserBar: {
    backgroundColor: '#f2f2f7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  browserBarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff5f57',
  },
  browserUrlBar: {
    flex: 1,
    height: 14,
    backgroundColor: '#ddd',
    borderRadius: 4,
    marginLeft: 4,
  },
  browserBottomBar: {
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  shareButtonHighlight: {
    backgroundColor: 'rgba(139,69,19,0.12)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1.5,
    borderColor: '#8B4513',
  },
  addToHomeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fafaf8',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0d5c9',
    alignSelf: 'flex-start',
  },
  addToHomeChipText: {
    color: '#8B4513',
    fontWeight: '600',
    fontSize: 13,
  },
});
