// firebaseConfig.js (Platform-aware Firebase configuration)
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import { getStorage, ref, getMetadata } from 'firebase/storage';
import { Platform } from 'react-native';

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyAHIxDHG84cjPMbrUnE2jq5hyRbvjS7BEs',
  authDomain: 'humi-75da3.firebaseapp.com',
  projectId: 'humi-75da3',
  storageBucket: 'humi-75da3.appspot.com',
  messagingSenderId: '733393371524',
  appId: '1:733393371524:web:208b91d8fa144a2f66ddd1',
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

// Initialize Firestore & Storage
const db = getFirestore(app);
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
