import { db, auth } from '../../config/firebaseConfig';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  increment,
  serverTimestamp 
} from 'firebase/firestore';

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `HUMI-${code}`;
}

export async function getUserReferralCode(userId) {
  if (!userId) return null;
  
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && userDoc.data().referralCode) {
      return userDoc.data().referralCode;
    }
    
    let newCode = generateReferralCode();
    let attempts = 0;
    
    while (attempts < 10) {
      const codeRef = doc(db, 'referral_codes', newCode);
      const codeDoc = await getDoc(codeRef);
      
      if (!codeDoc.exists()) {
        await setDoc(codeRef, {
          ownerId: userId,
          ownerEmail: auth.currentUser?.email || '',
          createdAt: serverTimestamp()
        });
        
        await updateDoc(userRef, {
          referralCode: newCode,
          referralCount: 0
        });
        
        return newCode;
      }
      
      newCode = generateReferralCode();
      attempts++;
    }
    
    throw new Error('Could not generate unique referral code');
  } catch (error) {
    console.error('[Referral] Error getting/creating referral code:', error);
    throw error;
  }
}

export async function validateReferralCode(code) {
  if (!code || !code.startsWith('HUMI-')) {
    return { valid: false, error: 'Invalid referral code format' };
  }
  
  try {
    const codeRef = doc(db, 'referral_codes', code.toUpperCase());
    const codeDoc = await getDoc(codeRef);
    
    if (!codeDoc.exists()) {
      return { valid: false, error: 'Referral code not found' };
    }
    
    const codeData = codeDoc.data();
    
    if (codeData.ownerId === auth.currentUser?.uid) {
      return { valid: false, error: 'You cannot use your own referral code' };
    }
    
    return { 
      valid: true, 
      referrerId: codeData.ownerId,
      referrerEmail: codeData.ownerEmail
    };
  } catch (error) {
    console.error('[Referral] Error validating code:', error);
    return { valid: false, error: 'Error validating code' };
  }
}

export async function recordReferral(referralCode, referredUserId, referredEmail) {
  try {
    const validation = await validateReferralCode(referralCode);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const referralRef = doc(collection(db, 'referrals'));
    await setDoc(referralRef, {
      referralCode: referralCode.toUpperCase(),
      referrerId: validation.referrerId,
      referrerEmail: validation.referrerEmail,
      referredUserId: referredUserId,
      referredEmail: referredEmail,
      createdAt: serverTimestamp(),
      discountApplied: false,
      referrerRewarded: false,
      status: 'pending'
    });
    
    return { 
      success: true, 
      referralId: referralRef.id,
      referrerId: validation.referrerId
    };
  } catch (error) {
    console.error('[Referral] Error recording referral:', error);
    return { success: false, error: 'Error recording referral' };
  }
}

export async function markReferralComplete(referralId, updates = {}) {
  try {
    const referralRef = doc(db, 'referrals', referralId);
    await updateDoc(referralRef, {
      ...updates,
      completedAt: serverTimestamp(),
      status: 'completed'
    });
    
    const referralDoc = await getDoc(referralRef);
    if (referralDoc.exists()) {
      const { referrerId } = referralDoc.data();
      const userRef = doc(db, 'users', referrerId);
      await updateDoc(userRef, {
        referralCount: increment(1)
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Referral] Error marking referral complete:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserReferralStats(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { referralCode: null, referralCount: 0 };
    }
    
    const data = userDoc.data();
    return {
      referralCode: data.referralCode || null,
      referralCount: data.referralCount || 0
    };
  } catch (error) {
    console.error('[Referral] Error getting referral stats:', error);
    return { referralCode: null, referralCount: 0 };
  }
}

export async function checkUserHasUsedReferral(userId) {
  try {
    const q = query(
      collection(db, 'referrals'),
      where('referredUserId', '==', userId),
      where('status', '==', 'completed')
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('[Referral] Error checking referral usage:', error);
    return false;
  }
}
