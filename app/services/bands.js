// app/services/bands.js
import { db } from '../../config/firebaseConfig';
import { doc, collection, writeBatch, getDoc, getDocs, query, where } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import bandRules from '../../assets/bandRules.json';

const storage = getStorage();

// List of all possible bands
const BAND_LIST = [
  { id: 'the-weekender', name: 'The Weekender' },
  { id: 'daily-draw', name: 'Daily Draw' },
  { id: 'first-ash', name: 'First Ash' },
  { id: 'consigliere', name: 'Consigliere' },
  { id: 'mild-mood', name: 'Mild Mood' },
  { id: 'smooth-talker', name: 'Smooth Talker' }
];

// Get bands with Firebase Storage URLs
export async function getBands(userId = null) {
  try {
    // Create array to track which bands the user has earned
    let earnedBandIds = [];
    
    // If userId provided, get their earned bands
    if (userId) {
      const userBandsRef = collection(db, 'users', userId, 'bands');
      const bandsSnapshot = await getDocs(userBandsRef);
      
      earnedBandIds = bandsSnapshot.docs.map(doc => doc.id);
    }
    
    // Get all bands with Firebase Storage URLs
    const bandsWithUrls = await Promise.all(
      BAND_LIST.map(async (band) => {
        try {
          // Get image URL from Firebase Storage
          const imageUrl = await getDownloadURL(
            ref(storage, `bands/${band.id}.png`)
          );
          
          return {
            ...band,
            image: imageUrl,
            earned: earnedBandIds.includes(band.id)
          };
        } catch (error) {
          console.error(`Error loading band image for ${band.id}:`, error);
          // Return band with placeholder if image fails to load
          return {
            ...band,
            image: 'https://via.placeholder.com/200x100?text=' + band.name,
            earned: earnedBandIds.includes(band.id)
          };
        }
      })
    );
    
    return bandsWithUrls;
  } catch (error) {
    console.error("Error getting bands:", error);
    return [];
  }
}

export async function checkForNewBands(userId, userData) {
  try {
    const unlockedBands = [];

    // Check each band rule
    for (const band of bandRules) {
      // Skip bands the user already has
      const bandRef = doc(db, 'users', userId, 'bands', band.id);
      const bandDoc = await getDoc(bandRef);
      
      if (bandDoc.exists()) {
        continue;
      }
      
      // Check if criteria met
      let meetsCriteria = false;
      
      if (band.trigger) {
        const { field, operator, value } = band.trigger;
        const userValue = userData[field];
        
        if (operator === ">=") {
          meetsCriteria = userValue >= value;
        } else if (operator === "==") {
          meetsCriteria = userValue === value;
        }
        // Add other operators as needed
      }
      
      if (meetsCriteria) {
        unlockedBands.push(band);
      }
    }

    // Save newly unlocked bands to user's collection
    if (unlockedBands.length > 0) {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', userId);

      unlockedBands.forEach(band => {
        const bandRef = doc(collection(userRef, 'bands'), band.id);
        batch.set(bandRef, { 
          id: band.id,
          name: band.name,
          description: band.description,
          type: band.type,
          earnedDate: new Date()
        });
      });

      await batch.commit();
    }

    return unlockedBands;
  } catch (error) {
    console.error("Error checking for new bands:", error);
    return [];
  }
}

// Export both functions
export default { checkForNewBands, getBands };