// src/services/spotlightService.js
// Fetches brand spotlight partner data from Firestore.
// Cached in memory after first fetch — one network call per app session.

import { db } from '../../config/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

let cache = null; // Array of spotlight docs

async function loadSpotlights() {
  if (cache) return cache;
  try {
    const snap = await getDocs(
      query(collection(db, 'brandSpotlights'), where('active', '==', true))
    );
    cache = snap.docs.map(d => d.data());
    return cache;
  } catch (e) {
    console.warn('spotlightService: failed to load', e.message);
    return [];
  }
}

/**
 * Given a brand name string (from scan result or humidor log),
 * returns the matching spotlight object or null.
 */
export async function getSpotlightForBrand(brandName) {
  if (!brandName) return null;
  const normalized = brandName.toLowerCase().trim();
  const spotlights = await loadSpotlights();
  return spotlights.find(s =>
    s.matchNames?.some(m => normalized.includes(m) || m.includes(normalized))
  ) || null;
}

/** Clear cache (useful after admin updates) */
export function clearSpotlightCache() {
  cache = null;
}
