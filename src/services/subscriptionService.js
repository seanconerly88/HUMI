import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export const SUBSCRIPTION_STATUS = {
  FREE: 'free',
  TRIAL: 'trial',
  ACTIVE: 'active',
  CANCELED: 'canceled',
  EXPIRED: 'expired'
};

export const PLAN_TYPES = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};

export async function getSubscription(userId) {
  if (!userId) return null;
  
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : null;
    
    if (userData?.userType === 'legacy' && userData?.subscriptionStatus === 'legacy_lifetime') {
      return { status: SUBSCRIPTION_STATUS.ACTIVE, plan: 'lifetime', isLegacy: true };
    }

    const subRef = doc(db, 'users', userId, 'subscription', 'current');
    const subDoc = await getDoc(subRef);
    
    if (subDoc.exists()) {
      const data = subDoc.data();
      
      if (data.status === SUBSCRIPTION_STATUS.ACTIVE) {
        if (data.endDate) {
          const endDate = data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate);
          if (endDate < new Date()) {
            return { ...data, status: SUBSCRIPTION_STATUS.EXPIRED };
          }
        }
        return data;
      }
      
      if (data.status === SUBSCRIPTION_STATUS.TRIAL && data.trialEndDate) {
        const trialEnd = data.trialEndDate.toDate ? data.trialEndDate.toDate() : new Date(data.trialEndDate);
        if (trialEnd < new Date()) {
          return { ...data, status: SUBSCRIPTION_STATUS.EXPIRED };
        }
        return data;
      }
    }
    
    if (userData?.subscriptionStatus === 'trial' && userData?.trialEndDate) {
      const trialEnd = new Date(userData.trialEndDate);
      if (trialEnd > new Date()) {
        return { 
          status: SUBSCRIPTION_STATUS.TRIAL, 
          trialEndDate: trialEnd,
          userType: userData.userType,
          promoCode: userData.promoCodeUsed
        };
      } else {
        return { status: SUBSCRIPTION_STATUS.EXPIRED, expiredAt: trialEnd };
      }
    }
    
    return { status: SUBSCRIPTION_STATUS.FREE };
  } catch (error) {
    console.error('Error getting subscription:', error);
    return { status: SUBSCRIPTION_STATUS.FREE };
  }
}

export async function startTrial(userId, plan) {
  if (!userId) throw new Error('User ID required');
  
  const now = new Date();
  const trialEndDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  
  const subscriptionData = {
    status: SUBSCRIPTION_STATUS.TRIAL,
    plan: plan || PLAN_TYPES.YEARLY,
    startDate: serverTimestamp(),
    trialEndDate: trialEndDate,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  const subRef = doc(db, 'users', userId, 'subscription', 'current');
  await setDoc(subRef, subscriptionData);
  
  return subscriptionData;
}

export async function activateSubscription(userId, plan, stripeSubscriptionId) {
  if (!userId) throw new Error('User ID required');
  
  const now = new Date();
  const endDate = plan === PLAN_TYPES.YEARLY 
    ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const subscriptionData = {
    status: SUBSCRIPTION_STATUS.ACTIVE,
    plan: plan,
    startDate: serverTimestamp(),
    endDate: endDate,
    stripeSubscriptionId: stripeSubscriptionId || null,
    updatedAt: serverTimestamp()
  };
  
  const subRef = doc(db, 'users', userId, 'subscription', 'current');
  await setDoc(subRef, subscriptionData, { merge: true });
  
  return subscriptionData;
}

export async function cancelSubscription(userId) {
  if (!userId) throw new Error('User ID required');
  
  const subRef = doc(db, 'users', userId, 'subscription', 'current');
  await updateDoc(subRef, {
    status: SUBSCRIPTION_STATUS.CANCELED,
    canceledAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export function isPremium(subscription) {
  if (!subscription) return false;
  return subscription.status === SUBSCRIPTION_STATUS.TRIAL || 
         subscription.status === SUBSCRIPTION_STATUS.ACTIVE;
}
