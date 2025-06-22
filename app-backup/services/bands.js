// app/services/bands.js
import { db } from '../../config/firebaseConfig';
import { doc, collection, writeBatch } from 'firebase/firestore';
import bandRules from '../../assets/bandRules.json';
import { Asset } from 'expo-asset';

// Define band images
const bandImages = {
  'the-weekender': 'https://via.placeholder.com/200x100?text=The+Weekender',
  'daily-draw': 'https://via.placeholder.com/200x100?text=Daily+Draw',
  'first-ash': 'https://via.placeholder.com/200x100?text=First+Ash',
  'the-don': 'https://via.placeholder.com/200x100?text=The+Don',
};

// Add a function to get all bands for display in the vault
export function getBands() {
  return [
    { id: '1', name: 'The Weekender', image: bandImages['the-weekender'] },
    { id: '2', name: 'Daily Draw', image: bandImages['daily-draw'] },
    { id: '3', name: 'First Ash', image: bandImages['first-ash'] },
    { id: '4', name: 'The Don', image: bandImages['the-don'] },
  ];
}

export async function checkForNewBands(userId, userData) {
  const unlockedBands = [];

  bandRules.forEach(band => {
    const meetsCriteria = band.criteria.every(criterion => {
      const userValue = userData[criterion.key];
      return userValue >= criterion.value;
    });

    if (meetsCriteria) {
      unlockedBands.push(band);
    }
  });

  if (unlockedBands.length > 0) {
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);

    unlockedBands.forEach(band => {
      const bandRef = doc(collection(userRef, 'bands'), band.id);
      batch.set(bandRef, { ...band, earned: true });
    });

    await batch.commit();
  }

  return unlockedBands;
}

// Export both functions
export default { checkForNewBands, getBands };