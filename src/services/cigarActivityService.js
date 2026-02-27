import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export const recordCigarActivity = async ({ userId, logId, cigarId, cigarName, brand, overall, notes, submittedDate }) => {
  try {
    if (!userId || !cigarName) return null;

    const sub = submittedDate instanceof Date ? submittedDate : new Date();

    const activityData = {
      userId,
      logId: logId || null,
      cigarId: cigarId || null,
      cigarName: cigarName.trim(),
      brand: (brand || '').trim(),
      overall: overall ?? null,
      notes: (notes || '').trim(),
      submittedDate: sub,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'cigar_activity'), activityData);
    console.log('📊 Cigar activity recorded:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error recording cigar activity:', error);
    return null;
  }
};

export const updateCigarActivity = async ({ userId, logId, cigarName, overall, notes }) => {
  try {
    if (!userId) return;

    let q;
    if (logId) {
      q = query(
        collection(db, 'cigar_activity'),
        where('userId', '==', userId),
        where('logId', '==', logId)
      );
    } else if (cigarName) {
      q = query(
        collection(db, 'cigar_activity'),
        where('userId', '==', userId),
        where('cigarName', '==', cigarName.trim())
      );
    } else {
      return;
    }

    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const targetDoc = logId
      ? snapshot.docs[0]
      : snapshot.docs.sort((a, b) => {
          const aDate = a.data().createdAt?.toDate?.() || new Date(0);
          const bDate = b.data().createdAt?.toDate?.() || new Date(0);
          return bDate - aDate;
        })[0];

    const updateData = {};
    if (overall !== undefined) updateData.overall = overall;
    if (notes !== undefined) updateData.notes = (notes || '').trim();
    updateData.updatedAt = serverTimestamp();

    await updateDoc(targetDoc.ref, updateData);
    console.log('📊 Cigar activity updated:', targetDoc.id);
  } catch (error) {
    console.error('Error updating cigar activity:', error);
  }
};

export const deleteCigarActivity = async ({ userId, logId, cigarName }) => {
  try {
    if (!userId) return;

    let q;
    if (logId) {
      q = query(
        collection(db, 'cigar_activity'),
        where('userId', '==', userId),
        where('logId', '==', logId)
      );
    } else if (cigarName) {
      q = query(
        collection(db, 'cigar_activity'),
        where('userId', '==', userId),
        where('cigarName', '==', cigarName.trim())
      );
    } else {
      return;
    }

    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
    console.log('📊 Cigar activity deleted for:', logId || cigarName);
  } catch (error) {
    console.error('Error deleting cigar activity:', error);
  }
};
