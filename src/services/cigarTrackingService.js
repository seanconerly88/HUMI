import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

const generateCigarId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `HUMI-${result}`;
};

const normalizeName = (name) => {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

export const trackCigarLog = async (cigarName, cigarBrand) => {
  try {
    if (!cigarName) return null;

    const normalizedName = normalizeName(cigarName);
    const normalizedBrand = normalizeName(cigarBrand || '');

    const cigarsRef = collection(db, 'cigars');
    const q = query(
      cigarsRef,
      where('normalizedName', '==', normalizedName),
      where('normalizedBrand', '==', normalizedBrand)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'cigars', existingDoc.id), {
        logCount: increment(1),
        lastLoggedAt: serverTimestamp(),
      });
      return existingDoc.data().cigarId;
    }

    const cigarId = generateCigarId();
    await addDoc(cigarsRef, {
      cigarId,
      name: cigarName.trim(),
      brand: (cigarBrand || '').trim(),
      normalizedName,
      normalizedBrand,
      logCount: 1,
      createdAt: serverTimestamp(),
      lastLoggedAt: serverTimestamp(),
    });

    return cigarId;
  } catch (error) {
    console.error('Error tracking cigar:', error);
    return null;
  }
};

export const decrementCigarLog = async (oldCigarId) => {
  try {
    if (!oldCigarId) return;

    const cigarsRef = collection(db, 'cigars');
    const q = query(cigarsRef, where('cigarId', '==', oldCigarId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      const currentCount = existingDoc.data().logCount || 1;
      await updateDoc(doc(db, 'cigars', existingDoc.id), {
        logCount: currentCount > 1 ? increment(-1) : 1,
      });
    }
  } catch (error) {
    console.error('Error decrementing cigar log:', error);
  }
};
