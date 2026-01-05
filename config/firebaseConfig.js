// firebaseConfig.js (Platform-aware Firebase configuration)
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import { getStorage, ref, getMetadata } from 'firebase/storage';
import { Platform } from 'react-native';

// Firebase config (loaded from environment variables)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Platform-aware auth initialization
let auth;
if (Platform.OS === 'web') {
  const { getAuth, browserLocalPersistence, setPersistence } = require('firebase/auth');
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch(console.error);
} else {
  const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

// Initialize Firestore with long polling for Safari PWA compatibility
const db = initializeFirestore(app, {
  experimentalForceLongPolling: Platform.OS === 'web',
  experimentalAutoDetectLongPolling: true,
});
const storage = getStorage(app, 'gs://humi-75da3.firebasestorage.app');

// Diagnostic check function (minimal logging for security)
export const checkFirebaseStatus = async () => {
  try {
    const currentUser = auth.currentUser;
    const testQuery = query(collection(db, '_connection_test'), limit(1));
    await getDocs(testQuery);
    const testRef = ref(storage, '_connection_test');
    await getMetadata(testRef).catch(() => {});
    return true;
  } catch (error) {
    return false;
  }
};

// Export all
export { app, auth, db, storage };
