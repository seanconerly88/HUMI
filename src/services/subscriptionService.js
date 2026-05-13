import { doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
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

    if (userData?.subscriptionStatus === 'lifetime' || userData?.lifetimeAccess === true) {
      return { status: SUBSCRIPTION_STATUS.ACTIVE, plan: 'lifetime', userType: userData.userType };
    }

    const subRef = doc(db, 'users', userId, 'subscription', 'current');
    const subDoc = await getDoc(subRef);
    
    if (subDoc.exists()) {
      const data = subDoc.data();
      
      if (data.status === 'lifetime') {
        return { status: SUBSCRIPTION_STATUS.ACTIVE, plan: 'lifetime', userType: userData?.userType };
      }
      
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

// Check if user is specifically on an active trial (for distinguishing from paid premium)
export function isOnActiveTrial(subscription) {
  if (!subscription) return false;
  return subscription.status === SUBSCRIPTION_STATUS.TRIAL;
}

export const WELCOME_TRIAL_DAYS = 7;

// Promo codes that extend the onboarding trial during registration (URL ?code= param).
// These are validated here so onboarding-new.js can apply them without importing UpgradeModal.
export const ONBOARDING_PROMO_CODES = {
  'SS2026':          { days: 14,  source: 'promo_ss2026',    userType: 'stogie_skool' },
  'INNERCIRCLE2026': { days: 365, source: 'innercircle2026', userType: 'inner_circle' },
};

// VIP bypass codes — skip payment entirely, grant time-limited access, show personalized welcome.
// Keyed by normalized code (spaces stripped, uppercase).
export const VIP_BYPASS_CODES = {
  'GTT2026': {
    firestoreDocId: 'GTT2026',
    durationHours: 48,
  },
  'CREATOR2026': {
    firestoreDocId: 'CREATOR2026',
    durationHours: 168,
  },
};

// Normalize a code string to match VIP_BYPASS_CODES keys (strip spaces, uppercase)
export function normalizeVipCode(raw) {
  return raw.replace(/\s+/g, '').toUpperCase();
}

// Redeem a VIP bypass code via backend API (Admin SDK bypasses Firestore security rules).
// Returns { success: true } or throws with a user-facing message.
export async function redeemVipCode(rawCode, userId) {
  if (!userId) throw new Error('Not signed in');

  const key = normalizeVipCode(rawCode);
  if (!VIP_BYPASS_CODES[key]) throw new Error('Code not recognised');

  const res = await fetch('/api/vip/redeem-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: rawCode.trim(), userId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not apply code. Please try again.');
  return { success: true, endDate: new Date(data.endDate) };
}

export async function grantWelcomeTrial(userId, source = 'onboarding', overrideDays = null) {
  if (!userId) throw new Error('User ID required');
  
  const trialDays = overrideDays ?? WELCOME_TRIAL_DAYS;
  const now = new Date();
  const trialEndDate = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    tier: 'premium',
    subscriptionStatus: 'trial',
    trialStartDate: now.toISOString(),
    trialEndDate: trialEndDate.toISOString(),
    welcomeTrialGranted: true,
    welcomeTrialSource: source,
    welcomeTrialGrantedAt: now.toISOString()
  }, { merge: true });
  
  const subRef = doc(db, 'users', userId, 'subscription', 'current');
  await setDoc(subRef, {
    status: SUBSCRIPTION_STATUS.TRIAL,
    plan: 'welcome_trial',
    startDate: serverTimestamp(),
    trialEndDate: trialEndDate,
    trialDays: trialDays,
    source: source,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return { trialEndDate, trialDays };
}

export async function checkUserTrialStatus(userId) {
  if (!userId) return { needsTrial: false, trialExpired: false, showThankYou: false, promoTrialExpired: false };
  
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : null;
    
    if (!userData) return { needsTrial: false, trialExpired: false, showThankYou: false, promoTrialExpired: false };
    
    if (userData.userType === 'legacy' || userData.subscriptionStatus === 'lifetime' || userData.lifetimeAccess === true) {
      return { needsTrial: false, trialExpired: false, showThankYou: false, promoTrialExpired: false, isPremium: true };
    }
    
    // Check if user was upgraded from creator to inner_circle and needs to see the welcome modal
    if (userData.userType === 'inner_circle' && userData.upgradedFromCreator && !userData.innerCircleWelcomeSeen) {
      return { 
        needsTrial: false, 
        trialExpired: false, 
        showThankYou: false, 
        promoTrialExpired: false,
        showInnerCircleUpgrade: true,
        isPremium: true 
      };
    }
    
    // Check for Creator/LSV trial expiration (stored on user doc, not subscription subcollection)
    if ((userData.userType === 'creator' || userData.userType === 'lsv') && userData.trialEndDate) {
      const trialEnd = new Date(userData.trialEndDate);
      if (trialEnd < new Date()) {
        const hasAcknowledgedExpiry = userData.promoTrialExpiryAcknowledged === true;
        return { 
          needsTrial: false, 
          trialExpired: false,
          promoTrialExpired: !hasAcknowledgedExpiry,
          promoTrialType: userData.userType,
          showThankYou: false,
          isPremium: false 
        };
      }
      // Promo trial is still active
      return { needsTrial: false, trialExpired: false, showThankYou: false, promoTrialExpired: false, isPremium: true };
    }
    
    const subRef = doc(db, 'users', userId, 'subscription', 'current');
    const subDoc = await getDoc(subRef);
    
    if (subDoc.exists()) {
      const subData = subDoc.data();
      if (subData.status === SUBSCRIPTION_STATUS.ACTIVE) {
        // Show the premium welcome experience the first time any account becomes active,
        // regardless of how it got there (Stripe payment, admin grant, promo, etc.).
        const hasSeenWelcome = userData?.innerCircleWelcomeSeen === true || userData?.premiumWelcomeSeen === true;
        if (!hasSeenWelcome) {
          return { needsTrial: false, trialExpired: false, showThankYou: false, promoTrialExpired: false, isPremium: true, showInnerCircleUpgrade: true };
        }
        return { needsTrial: false, trialExpired: false, showThankYou: false, promoTrialExpired: false, isPremium: true };
      }
      
      if (subData.status === SUBSCRIPTION_STATUS.TRIAL && subData.trialEndDate) {
        const trialEnd = subData.trialEndDate.toDate ? subData.trialEndDate.toDate() : new Date(subData.trialEndDate);
        if (trialEnd < new Date()) {
          const hasAcknowledgedExpiry = userData.trialExpiryAcknowledged === true;
          return { 
            needsTrial: false, 
            trialExpired: !hasAcknowledgedExpiry, 
            promoTrialExpired: false,
            showThankYou: false,
            isPremium: false 
          };
        }
        return { needsTrial: false, trialExpired: false, showThankYou: false, promoTrialExpired: false, isPremium: true };
      }
    }
    
    if (userData.welcomeTrialGranted) {
      if (userData.trialEndDate) {
        const trialEnd = new Date(userData.trialEndDate);
        if (trialEnd < new Date()) {
          const hasAcknowledgedExpiry = userData.trialExpiryAcknowledged === true;
          return { 
            needsTrial: false, 
            trialExpired: !hasAcknowledgedExpiry, 
            promoTrialExpired: false,
            showThankYou: false,
            isPremium: false 
          };
        }
      }
      return { needsTrial: false, trialExpired: false, showThankYou: false, promoTrialExpired: false, isPremium: true };
    }
    
    // Grant trial to any existing user who hasn't received a trial yet
    // This includes legacy users who may not have completed onboarding
    // But NOT promo code users (current or expired) - they already had their promo trial
    const promoUserTypes = ['creator', 'expired_creator', 'lsv', 'expired_lsv'];
    if (!userData.welcomeTrialGranted && !promoUserTypes.includes(userData.userType)) {
      const hasSeenThankYou = userData.welcomeTrialThankYouSeen === true;
      return { 
        needsTrial: true, 
        trialExpired: false, 
        promoTrialExpired: false,
        showThankYou: !hasSeenThankYou,
        isPremium: false 
      };
    }
    
    return { needsTrial: false, trialExpired: false, showThankYou: false, promoTrialExpired: false, isPremium: false };
  } catch (error) {
    console.error('Error checking trial status:', error);
    return { needsTrial: false, trialExpired: false, showThankYou: false, promoTrialExpired: false, isPremium: false };
  }
}

export async function acknowledgeTrialExpiry(userId) {
  if (!userId) return;
  
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    trialExpiryAcknowledged: true,
    trialExpiryAcknowledgedAt: new Date().toISOString()
  }, { merge: true });
}

export async function markThankYouSeen(userId) {
  if (!userId) return;
  
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    welcomeTrialThankYouSeen: true,
    welcomeTrialThankYouSeenAt: new Date().toISOString()
  }, { merge: true });
}

export async function acknowledgePromoTrialExpiry(userId, promoType = 'creator') {
  if (!userId) return;
  
  const userRef = doc(db, 'users', userId);
  const expiredUserType = promoType === 'lsv' ? 'expired_lsv' : 'expired_creator';
  
  await setDoc(userRef, {
    promoTrialExpiryAcknowledged: true,
    promoTrialExpiryAcknowledgedAt: new Date().toISOString(),
    tier: 'free',
    subscriptionStatus: 'expired',
    previousUserType: promoType,
    userType: expiredUserType
  }, { merge: true });
}

export async function markInnerCircleWelcomeSeen(userId) {
  if (!userId) return;
  
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    innerCircleWelcomeSeen: true,
    innerCircleWelcomeSeenAt: new Date().toISOString()
  }, { merge: true });
}

export async function shouldShowFeedbackSurvey(userId) {
  if (!userId) return false;
  
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    
    // Never show again once they've seen it
    if (userData.feedbackSurveyShownAt) return false;

    const now = new Date();

    // Must have joined at least 2 days ago
    const createdAt = userData.createdAt
      ? (userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt))
      : null;
    if (!createdAt || (now - createdAt) / (1000 * 60 * 60 * 24) < 2) return false;

    // Must have seen the Spots announcement, and it must have been at least 24h ago
    // This gives users time to actually try Spots before we ask for feedback
    const spotsShownAt = userData.spotsAnnouncementShownAt
      ? new Date(userData.spotsAnnouncementShownAt)
      : null;
    if (!spotsShownAt) return false;
    if ((now - spotsShownAt) / (1000 * 60 * 60) < 24) return false;

    return true;
  } catch (error) {
    console.error('Error checking feedback survey eligibility:', error);
    return false;
  }
}

// ── Spots Announcement ────────────────────────────────────────────────────────

export async function shouldShowSpotsAnnouncement(userId) {
  if (!userId) return false;
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return false;
    const data = userDoc.data();
    // Show once — never again after first view
    return !data.spotsAnnouncementShownAt;
  } catch (error) {
    console.error('Error checking spots announcement:', error);
    return false;
  }
}

export async function markSpotsAnnouncementSeen(userId) {
  if (!userId) return;
  try {
    await updateDoc(doc(db, 'users', userId), {
      spotsAnnouncementShownAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error marking spots announcement seen:', error);
  }
}

export async function updateLastActiveAt(userId) {
  if (!userId) return;
  
  try {
    const now = new Date();
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : null;
    
    const updates = { lastActiveAt: now.toISOString() };
    
    if (userData && !userData.feedbackSurveyShownAt) {
      const prevLastActiveAt = userData.lastActiveAt
        ? (userData.lastActiveAt.toDate ? userData.lastActiveAt.toDate() : new Date(userData.lastActiveAt))
        : null;
      
      const daysSinceLast = prevLastActiveAt
        ? (now - prevLastActiveAt) / (1000 * 60 * 60 * 24)
        : null;
      
      const wasAwayLongTime = daysSinceLast !== null && daysSinceLast >= 10;
      
      if (wasAwayLongTime && !userData.returnStartedAt) {
        updates.returnStartedAt = now.toISOString();
        updates.lastActiveBeforeReturn = userData.lastActiveAt;
      }
    }
    
    await setDoc(userRef, updates, { merge: true });
  } catch (error) {
    console.error('Error updating lastActiveAt:', error);
  }
}

export async function markFeedbackSurveyShown(userId) {
  if (!userId) return;
  
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      feedbackSurveyShownAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error writing feedbackSurveyShownAt:', error);
  }
}

export async function submitFeedbackSurvey(userId, { email, rating, comment, outcome }) {
  const now = new Date();
  const webhookUrl = process.env.EXPO_PUBLIC_FEEDBACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('EXPO_PUBLIC_FEEDBACK_WEBHOOK_URL is not set — skipping webhook POST');
  }
  
  const payload = {
    userId,
    email: email ?? null,
    rating: rating ?? null,
    comment: comment ?? null,
    outcome,
    createdAt: now.toISOString()
  };
  
  try {
    await addDoc(collection(db, 'feedbackSurveys'), {
      ...payload,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error writing feedbackSurveys document:', error);
  }
  
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      feedbackSurveyShownAt: now.toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error writing feedbackSurveyShownAt to user doc:', error);
  }
  
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Error POSTing to CRM webhook:', error);
    }
  }
}
