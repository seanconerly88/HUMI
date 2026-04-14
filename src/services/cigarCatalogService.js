/**
 * cigarCatalogService — Enrichment write to the shared `cigarCatalog` collection.
 *
 * Canonical schema (cigarCatalog/{brand-line-slug}):
 *   brand              {string}  - exact brand key from AI result
 *   line               {string}  - cigar line; derived from fullName when absent
 *   fullName           {string}  - "[Brand] [Line]" as returned by scan
 *   strength           {string}  - "mild" | "mild-medium" | "medium" | "medium-full" | "full"
 *   originCountry      {string}  - country of origin (maps to task field "origin")
 *   wrapperType        {string}  - wrapper leaf type (maps to task field "wrapper")
 *   commonNotes        {string}  - comma-separated tasting notes (maps to task field "tasting notes")
 *   recommendedPairings{string}  - comma-separated pairings (maps to task field "pairings")
 *   scanCount          {number}  - total times this cigar has been scanned platform-wide
 *   enrichedAt         {Timestamp} - last update timestamp
 *   createdAt          {Timestamp} - first write timestamp
 *
 * Field naming uses camelCase descriptors matching the AI response contract.
 * Downstream recommendation consumers should use these canonical field names.
 */

import { Platform } from 'react-native';
import { auth } from '../../config/firebaseConfig';

const getApiBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.API_BASE_URL || 'https://app.gethumi.co';
};

function extractLineFromFullName(fullName, brand) {
  if (!fullName || !brand) return '';
  const trimmedBrand = brand.trim();
  const trimmedFull = fullName.trim();
  if (trimmedFull.toLowerCase().startsWith(trimmedBrand.toLowerCase())) {
    return trimmedFull.slice(trimmedBrand.length).trim();
  }
  return '';
}


export async function upsertCigarCatalog(aiResult, userId) {
  try {
    if (!userId) return;

    const user = auth.currentUser;
    if (!user || user.uid !== userId) return;

    let idToken;
    try {
      idToken = await user.getIdToken();
    } catch (tokenErr) {
      console.warn('📚 cigarCatalog: could not get ID token, skipping');
      return;
    }

    const cigarBrand = aiResult.cigarBrand || '';
    const fullName = aiResult.fullName || '';
    const cigarLine = aiResult.cigarLine || extractLineFromFullName(fullName, cigarBrand);

    const body = {
      userId,
      idToken,
      cigarBrand,
      cigarLine,
      fullName,
      strength: aiResult.strength || '',
      originCountry: aiResult.originCountry || '',
      wrapperType: aiResult.wrapperType || '',
      commonNotes: aiResult.commonNotes || '',
      recommendedPairings: aiResult.recommendedPairings || '',
    };

    const apiBase = getApiBaseUrl();
    const response = await fetch(`${apiBase}/api/catalog/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn(`📚 cigarCatalog upsert failed (${response.status}):`, err.error || 'unknown');
      return;
    }

    const data = await response.json();
    console.log(`📚 cigarCatalog upsert: ${data.status} (key: ${data.key || 'n/a'})`);
  } catch (error) {
    console.warn('📚 cigarCatalog upsert error (non-blocking):', error.message);
  }
}
