// firestore-service.js
import { getFirestore } from 'firebase/firestore';
import firebaseApp from './firebase-config';

export const db = getFirestore(firebaseApp);