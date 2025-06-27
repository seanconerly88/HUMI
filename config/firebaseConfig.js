// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import { getStorage, ref, getMetadata } from 'firebase/storage';

// ✅ Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyAHIxDHG84cjPMbrUnE2jq5hyRbvjS7BEs',
  authDomain: 'humi-75da3.firebaseapp.com',
  projectId: 'humi-75da3',
  storageBucket: 'humi-75da3.appspot.com',
  messagingSenderId: '733393371524',
  appId: '1:733393371524:web:208b91d8fa144a2f66ddd1'
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app,'gs://humi-75da3.firebasestorage.app');

// ✅ Diagnostic check function
export const checkFirebaseStatus = async () => {
  try {
    const currentUser = auth.currentUser;
    console.log("Current user:", currentUser ? `Signed in as ${currentUser.uid}` : "Not signed in");

    // Check Firestore
    const testQuery = query(collection(db, '_connection_test'), limit(1));
    await getDocs(testQuery);
    console.log("Firestore connection successful");

    // Check Storage
    const testRef = ref(storage, '_connection_test');
    await getMetadata(testRef).catch(() => {});
    console.log("Storage connection successful");

    return true;
  } catch (error) {
    console.error("Firebase status check failed:", error);
    return false;
  }
};

// ✅ Export services
export { app, auth, db, storage };
