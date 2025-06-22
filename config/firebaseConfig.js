import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, indexedDBLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAHIxDHG84cjPMbrUnE2jq5hyRbvjS7BEs',
  authDomain: 'humi-75da3.firebaseapp.com',
  projectId: 'humi-75da3',
  storageBucket: 'humi-75da3.appspot.com',
  messagingSenderId: '733393371524',
  appId: '1:733393371524:web:208b91d8fa144a2f66ddd1'
};

// Initialize Firebase with diagnostic logging
console.log('Initializing Firebase with config:', JSON.stringify({
  ...firebaseConfig,
  apiKey: '[HIDDEN]' // Don't log full API key
}));

let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Initialize with a fallback empty config if there was an error
  app = initializeApp({});
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);


// Add Firestore settings to ensure connection to the right region
const firestoreSettings = {
  host: 'firestore.googleapis.com',
  ssl: true,
  // Add local persistence for Firestore too
  cacheSizeBytes: 50000000, // 50MB cache
};

try {
  db.settings(firestoreSettings);
  console.log('Firestore settings applied');
} catch (settingsError) {
  console.error('Error applying Firestore settings:', settingsError);
}

// Add diagnostics function that can be called from App.js if needed
export const checkFirebaseStatus = async () => {
  try {
    // Check auth
    const currentUser = auth.currentUser;
    console.log("Current user:", currentUser ? `Signed in as ${currentUser.uid}` : "Not signed in");
    
    // Check Firestore connection
    const checkRef = db.collection('_connection_test');
    await checkRef.limit(1).get();
    console.log("Firestore connection successful");
    
    // Check Storage
    const testRef = storage.ref('_connection_test');
    await testRef.getMetadata().catch(() => {}); // Ignore error if file doesn't exist
    console.log("Storage connection successful");
    
    return true;
  } catch (error) {
    console.error("Firebase status check failed:", error);
    return false;
  }
};

export { app };