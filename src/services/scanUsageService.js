import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

const FREE_TIER_SCAN_LIMIT = 5;

export async function getMonthlyScanCount(userId) {
  if (!userId) return 0;
  
  try {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageRef = doc(db, 'users', userId, 'usage', monthKey);
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) {
      return 0;
    }
    
    return usageDoc.data().scanCount || 0;
  } catch (error) {
    console.error('Error getting scan count:', error);
    return 0;
  }
}

export async function incrementScanCount(userId) {
  if (!userId) return;
  
  try {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageRef = doc(db, 'users', userId, 'usage', monthKey);
    
    await setDoc(usageRef, {
      scanCount: increment(1),
      lastScanAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error incrementing scan count:', error);
  }
}

export async function canUserScan(userId, isPremiumUser) {
  if (isPremiumUser) return { canScan: true, remaining: Infinity };
  
  const count = await getMonthlyScanCount(userId);
  const remaining = Math.max(0, FREE_TIER_SCAN_LIMIT - count);
  
  return {
    canScan: count < FREE_TIER_SCAN_LIMIT,
    remaining,
    used: count,
    limit: FREE_TIER_SCAN_LIMIT
  };
}

export async function recordScan(userId, isPremiumUser) {
  if (!userId) {
    throw new Error('User ID required');
  }
  
  const scanCheck = await canUserScan(userId, isPremiumUser);
  if (!scanCheck.canScan) {
    throw new Error('SCAN_LIMIT_REACHED');
  }
  
  await incrementScanCount(userId);
  
  return {
    success: true,
    remaining: scanCheck.remaining - 1
  };
}

export async function getScanUsageInfo(userId, isPremiumUser) {
  if (isPremiumUser) {
    return {
      isPremium: true,
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      canScan: true
    };
  }
  
  const count = await getMonthlyScanCount(userId);
  const remaining = Math.max(0, FREE_TIER_SCAN_LIMIT - count);
  
  return {
    isPremium: false,
    used: count,
    limit: FREE_TIER_SCAN_LIMIT,
    remaining,
    canScan: count < FREE_TIER_SCAN_LIMIT
  };
}

export const FREE_SCAN_LIMIT = FREE_TIER_SCAN_LIMIT;
