// auth-service.js
import { getAuth } from 'firebase/auth';
import firebaseApp from './firebase-config';

export const auth = getAuth(firebaseApp);