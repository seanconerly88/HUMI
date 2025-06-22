// services/userStats.js
import { db } from '../../config/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

export async function updateUserStats(userId, cigarData) {
  try {
    if (!userId) {
      console.warn('No userId provided to updateUserStats');
      return null;
    }
    
    // Get stats reference
    const statsRef = collection(db, 'users', userId, 'stats');
    const statsSnapshot = await getDocs(statsRef);
    
    // Get or create stats document
    let statsDoc;
    let statsId;
    let statsData;
    
    if (statsSnapshot.empty) {
      // Create new stats document if none exists
      statsData = {
        log_count: 1,
        consecutive_days_logged: 1,
        logs_in_7_days: 1,
        total_rating: cigarData.overall || 0,
        body_counts: {},
        countries: [],
        shapes: [],
        wrapper_origins: {},
        binder_origins: {},
        pairings: [],
        unique_pairings: [],
        past_logs: 0,
        bands_earned: 0
      };
      
      // Initialize body count if body type exists
      if (cigarData.body) {
        statsData.body_counts[cigarData.body] = 1;
      }
      
      // Add country if exists
      if (cigarData.country) {
        statsData.countries.push(cigarData.country);
      }
      
      // Create new stats doc
      const newStatsRef = doc(collection(db, 'users', userId, 'stats'));
      await setDoc(newStatsRef, statsData);
      statsId = newStatsRef.id;
      statsData.docId = statsId; // Save the doc ID in the stats data
    } else {
      // Update existing stats
      statsDoc = statsSnapshot.docs[0];
      statsId = statsDoc.id;
      statsData = statsDoc.data();
      statsData.docId = statsId; // Ensure we have the docId
      
      // Update basic counts
      statsData.log_count = (statsData.log_count || 0) + 1;
      statsData.total_rating = (statsData.total_rating || 0) + (cigarData.overall || 0);
      
      // Update body counts
      if (cigarData.body) {
        if (!statsData.body_counts) statsData.body_counts = {};
        statsData.body_counts[cigarData.body] = (statsData.body_counts[cigarData.body] || 0) + 1;
      }
      
      // Update country tracking
      if (cigarData.country) {
        if (!statsData.countries) statsData.countries = [];
        if (!statsData.countries.includes(cigarData.country)) {
          statsData.countries.push(cigarData.country);
        }
      }
      
      // Update the stats document
      await updateDoc(doc(db, 'users', userId, 'stats', statsId), statsData);
    }
    
    return statsData;
  } catch (error) {
    console.error("Error updating user stats:", error);
    // Don't throw the error, just return null to prevent blocking the main flow
    return null;
  }
}

// For V1, we're not using the band system, so this function is simplified
async function checkForNewBands(userId, statsData) {
  console.log('Band checks disabled for V1');
  return [];
}

export default { updateUserStats };