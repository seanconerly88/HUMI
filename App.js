// App.js
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, db } from './config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import * as Updates from 'expo-updates';

// Import screens
import LoginScreen from './app/login';
import OnboardingScreen from './app/onboarding';
import MainTabNavigator from './src/navigation/MainTabNavigator';


export default function App() {
  console.log('App component initialized');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [authUser, setAuthUser] = useState(null);

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
        console.log('Auth state changed:', user ? `User signed in: ${user.uid} (initialized: ${authInitialized})` : 'No user (initialized: ' + authInitialized + ')');
        
        // Mark that we've received at least one auth state update
        authInitialized = true;
        
        if (user) {
          // Store the user object for later use
          setAuthUser(user);
          
          try {
            console.log('Attempting to access Firestore...');
            const userDocRef = doc(db, 'users', user.uid);
            
            try {
              const userDoc = await getDoc(userDocRef);
              console.log('Firestore access successful, document exists:', userDoc.exists());
              
              const newUserState = !userDoc.exists() || !userDoc.data()?.onboardingCompleted;
              console.log('Is new user:', newUserState);
              
              setIsNewUser(newUserState);
              setIsAuthenticated(true);
            } catch (docError) {
              console.error('Error getting document:', docError);
              console.log('Treating as new user due to document error');
              setIsNewUser(true);
              setIsAuthenticated(true);
            }
          } catch (dbError) {
            console.error('Firestore access error:', dbError);
            console.log('Treating as new user due to database error');
            setIsNewUser(true);
            setIsAuthenticated(true);
          }
        } else {
          console.log('No user, showing login screen');
          setAuthUser(null);
          setIsAuthenticated(false);
          setIsNewUser(false);
        }
      } catch (error) {
        console.error('Auth handler error:', error);
        setError(`Authentication error: ${error.message}`);
        setIsAuthenticated(false);
      } finally {
        // Only set initializing to false if we've received at least one auth state update
        if (authInitialized) {
          console.log('Initialization complete - setting initializing to false');
          setInitializing(false);
        }
      }
    });
    
    return () => {
      console.log('Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  // Simple login callback
  const handleLogin = () => {
    console.log('Login callback triggered');
    setIsAuthenticated(true);
  };

  // Onboarding completion handler
  const handleOnboardingComplete = () => {
    console.log('Onboarding complete callback triggered');
    try {
      setIsNewUser(false);
      console.log('isNewUser set to false, should render main app now');
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

  // Main render logic
  if (!isAuthenticated) {
    console.log('Rendering login screen');
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (isNewUser) {
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
      <NavigationContainer>
        <MainTabNavigator />
      </NavigationContainer>
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