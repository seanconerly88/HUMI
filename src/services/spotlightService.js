// src/services/spotlightService.js
// Fetches brand spotlight partner data via the proxy (admin SDK) — bypasses
// Firestore client security rules so all users reliably see partner content.

let cache = null;

async function loadSpotlights() {
  if (cache) return cache;
  try {
    const res = await fetch('/api/spotlights');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    cache = json.spotlights || [];
    return cache;
  } catch (e) {
    console.warn('spotlightService: failed to load', e.message);
    return [];
  }
}

/**
 * Given any name string from a cigar (brand, fullName, cigarName, etc.),
 * returns the matching spotlight object or null.
 */
export async function getSpotlightForBrand(name) {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();
  const spotlights = await loadSpotlights();
  return spotlights.find(s =>
    s.matchNames?.some(m => normalized.includes(m) || m.includes(normalized))
  ) || null;
}

/** Clear cache (useful after admin updates) */
export function clearSpotlightCache() {
  cache = null;
}
