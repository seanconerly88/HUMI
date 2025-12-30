// App.js
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, db } from './config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import * as Updates from 'expo-updates';
import PricingScreen from './app/pricing';
import Constants from 'expo-constants';

// Import screens
import LoginScreen from './app/login';
import OnboardingScreen from './app/onboarding';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import SmokeShotsScreen from './app/smokshots';
import PWAInstallPrompt from './app/pwaInstallPrompt';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check if running as installed PWA (standalone mode)
function isRunningAsPWA() {
  if (Platform.OS !== 'web') return true; // Native apps don't need PWA prompt
  try {
    // Check if running in standalone mode (installed as PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = window.navigator.standalone === true;
    return isStandalone || isIOSStandalone;
  } catch (e) {
    return false;
  }
}
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Stack = createNativeStackNavigator();

// Subscription service
import { getSubscription, startTrial, isPremium } from './src/services/subscriptionService';

// DEV MODE: Set to true to skip login during development
const DEV_BYPASS_AUTH = false;

// Check for Stripe checkout session_id in URL (web only)
function getStripeSessionId() {
  if (Platform.OS !== 'web') return { sessionId: null, canceled: false };
  try {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const canceled = params.get('canceled') === 'true';
    if (sessionId || canceled) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    return { sessionId, canceled };
  } catch (e) {
    return { sessionId: null, canceled: false };
  }
}

// Verify Stripe session server-side (SECURE - requires userId match)
async function verifyStripeSession(sessionId, userId) {
  try {
    const response = await fetch('/api/stripe/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error verifying Stripe session:', error);
    return { verified: false, error: error.message };
  }
}

export default function App() {
  console.log('App component initialized');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [showPWAPrompt, setShowPWAPrompt] = useState(!isRunningAsPWA());
  // Freemium model: no paywall, users get 5 free uploads/month
  // Premium status is checked when they try to upload


  // // Add update checking functionality
  // useEffect(() => {
  //   const checkForUpdates = async () => {
  //     try {
  //       console.log("Checking for updates...");
  //       const update = await Updates.checkForUpdateAsync();
  //       if (update.isAvailable) {
  //         console.log("Update available, downloading...");
  //         await Updates.fetchUpdateAsync();
  //         console.log("Update downloaded, restarting app...");
  //         // Alert the user before reloading (optional)
  //         setUpdateAvailable(true);
  //         setTimeout(async () => {
  //           await Updates.reloadAsync();
  //         }, 2000); // Give user 2 seconds to see the message
  //       } else {
  //         console.log("No updates available");
  //       }
  //     } catch (error) {
  //       console.error("Error checking for updates:", error);
  //     }
  //   };

  //   // Only check for updates if not initializing
  //   if (!initializing) {
  //     // checkForUpdates();
  //   }
  // }, [initializing]);


  useEffect(() => {
    console.log('Setting up auth listener...');
    let authInitialized = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        console.log('Auth state changed:', user ? `User signed in: ${user.uid}` : 'No user');

        authInitialized = true;

        if (user) {
          setAuthUser(user);

          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            const newUserState = !userDoc.exists() || !userDoc.data()?.onboardingCompleted;
            setIsNewUser(newUserState);
            setIsAuthenticated(true);

            // ✅ Save login status
            await AsyncStorage.setItem('isLoggedIn', 'true');
          } catch (docError) {
            console.error('Error getting document:', docError);
            setIsNewUser(true);
            setIsAuthenticated(true);
            await AsyncStorage.setItem('isLoggedIn', 'true');
          }
        } else {
          // No user logged in
          setAuthUser(null);
          setIsAuthenticated(false);
          setIsNewUser(false);

          // ✅ Clear login status
          await AsyncStorage.removeItem('isLoggedIn');
        }
      } catch (error) {
        console.error('Auth handler error:', error);
        setError(`Authentication error: ${error.message}`);
        setIsAuthenticated(false);
        await AsyncStorage.removeItem('isLoggedIn');
      } finally {
        if (authInitialized) {
          setInitializing(false);
        }
      }
    });

    // On first mount, check AsyncStorage to display splash/loading properly
    const checkStorageLogin = async () => {
      const stored = await AsyncStorage.getItem('isLoggedIn');
      if (stored === 'true') {
        console.log('User was previously logged in');
        setIsAuthenticated(true); // this is just fallback until onAuthStateChanged kicks in
      }
    };

    checkStorageLogin();

    return () => {
      console.log('Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  // Freemium model: subscription check happens when user tries to upload
  // Handle Stripe checkout return (if user upgrades from within the app)
  useEffect(() => {
    async function handleStripeReturn() {
      if (!authUser) return;
      
      const { sessionId } = getStripeSessionId();
      if (sessionId) {
        console.log('Verifying Stripe session server-side...');
        const verification = await verifyStripeSession(sessionId, authUser.uid);
        
        if (verification.verified) {
          console.log('Stripe session verified, subscription activated:', verification);
          await startTrial(authUser.uid, verification.plan || 'yearly');
        } else {
          console.error('Stripe session verification failed:', verification.error);
        }
      }
    }
    
    if (isAuthenticated && authUser && !initializing) {
      handleStripeReturn();
    }
  }, [authUser, isAuthenticated, initializing]);

  const handleLogin = async () => {
    console.log('Login callback triggered');

    try {
      await AsyncStorage.setItem('isLoggedIn', 'true');
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to save login status:', error);
    }
  };

  // Onboarding completion handler
  const handleOnboardingComplete = () => {
    console.log('Onboarding complete callback triggered');
    try {
      setIsNewUser(false);
      console.log('isNewUser set to false, going to main app');
    } catch (error) {
      console.error('Error in onboarding completion handler:', error);
      setError(`Onboarding completion error: ${error.message}`);
    }
  };

  console.log('Current app state:', {
    isAuthenticated,
    isNewUser,
    initializing,
    hasAuthUser: !!authUser,
    authUserId: authUser?.uid
  });

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#8B4513' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={{ color: 'white', marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  if (updateAvailable) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#8B4513' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={{ color: 'white', marginTop: 10, textAlign: 'center', padding: 20 }}>
          Updating app to latest version...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#8B4513', padding: 20 }}>
        <Text style={{ color: 'white', fontSize: 18, marginBottom: 10 }}>Something went wrong</Text>
        <Text style={{ color: 'white', textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity
          style={{ marginTop: 20, padding: 10, backgroundColor: 'white', borderRadius: 5 }}
          onPress={() => setError(null)}
        >
          <Text style={{ color: '#8B4513' }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main render logic - Freemium: no paywall, straight to main app
  
  // Show PWA install prompt for first-time web visitors (not in standalone mode)
  if (showPWAPrompt && !isAuthenticated && !DEV_BYPASS_AUTH && Platform.OS === 'web') {
    console.log('Rendering PWA install prompt');
    return <PWAInstallPrompt onContinue={() => setShowPWAPrompt(false)} />;
  }
  
  if (!isAuthenticated && !DEV_BYPASS_AUTH) {
    console.log('Rendering login screen');
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (isNewUser && !DEV_BYPASS_AUTH) {
    console.log('Rendering onboarding screen');
    try {
      return (
        <View style={{ flex: 1 }}>
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </View>
      );
    } catch (error) {
      console.error('Error rendering onboarding screen:', error);
      setError(`Onboarding render error: ${error.message}`);
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#8B4513', padding: 20 }}>
          <Text style={{ color: 'white', fontSize: 18, marginBottom: 10 }}>Onboarding Error</Text>
          <Text style={{ color: 'white', textAlign: 'center' }}>{error?.message}</Text>
        </View>
      );
    }
  }

  console.log('Rendering main app');
  try {
    return (
      <GestureHandlerRootView style={{ flex: 1, height: '100%', width: '100%' }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="SmokeShots" component={SmokeShotsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>

    );
  } catch (error) {
    console.error('Error rendering main app:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#8B4513', padding: 20 }}>
        <Text style={{ color: 'white', fontSize: 18, marginBottom: 10 }}>Main App Error</Text>
        <Text style={{ color: 'white', textAlign: 'center' }}>{error?.message}</Text>
      </View>
    );
  }
}
