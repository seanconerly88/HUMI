import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  useWindowDimensions,
  Linking,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from './components/Icon';
import { auth, db } from '../config/firebaseConfig';
import {
  doc, setDoc, getDoc, deleteDoc,
  collection, addDoc, getDocs, serverTimestamp,
} from 'firebase/firestore';

const RADIUS_OPTIONS = [5, 10, 25, 50];

const AUTHORIZED_RETAILERS = {
  'My Father': ['my father', 'garcia & garcia', 'myfathercigars'],
  'Padron': ['padron'],
  'Davidoff': ['davidoff'],
  'Arturo Fuente': ['fuente', 'arturo fuente'],
  'Oliva': ['oliva cigar'],
};

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function StarRating({ rating, count }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={s.starRow}>
      <Text style={s.starFilled}>{'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(empty)}</Text>
      <Text style={s.ratingText}>{rating.toFixed(1)}</Text>
      {count ? <Text style={s.ratingCount}>({count.toLocaleString()})</Text> : null}
    </View>
  );
}

function PillTag({ label, color = '#8B4513', bg = '#fef3ea' }) {
  return (
    <View style={[s.pill, { backgroundColor: bg, borderColor: color + '40' }]}>
      <Text style={[s.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export default function LoungesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [favorites, setFavorites] = useState({});
  const [checkinCounts, setCheckinCounts] = useState({});
  const [aiSummaries, setAiSummaries] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [checkinPlace, setCheckinPlace] = useState(null);
  const [checkinCigar, setCheckinCigar] = useState('');
  const [checkinVibe, setCheckinVibe] = useState(null);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'lounge_favorites'));
      const map = {};
      snap.forEach(d => { map[d.id] = d.data(); });
      setFavorites(map);
    } catch (e) {}
  };

  const toggleFavorite = async (place) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const ref = doc(db, 'users', uid, 'lounge_favorites', place.id);
    if (favorites[place.id]) {
      await deleteDoc(ref);
      setFavorites(prev => { const n = { ...prev }; delete n[place.id]; return n; });
    } else {
      const data = {
        name: place.displayName?.text || '',
        address: place.formattedAddress || '',
        rating: place.rating || null,
        savedAt: new Date().toISOString(),
      };
      await setDoc(ref, data);
      setFavorites(prev => ({ ...prev, [place.id]: data }));
    }
  };

  const doSearch = useCallback(async (lat, lng, query) => {
    setLoading(true);
    setResults([]);
    setHasSearched(true);
    try {
      const radiusMeters = radiusMiles * 1609.34;
      const textQuery = (query || searchText).trim()
        ? `cigar lounge ${(query || searchText).trim()}`
        : 'cigar lounge cigar bar tobacco shop';

      const resp = await fetch('/api/lounges/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textQuery, lat, lng, radiusMeters }),
      });
      const data = await resp.json();
      let places = data.places || [];

      if (lat && lng) {
        places.forEach(p => {
          if (p.location) {
            p._miles = haversine(lat, lng, p.location.latitude, p.location.longitude);
          }
        });
        places.sort((a, b) => (a._miles || 999) - (b._miles || 999));
      }

      setResults(places);
      loadCheckinCounts(places.map(p => p.id));
    } catch (e) {
      console.error('[Lounges] search error:', e);
    }
    setLoading(false);
  }, [radiusMiles, searchText]);

  const handleGPS = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      Alert.alert('Location unavailable', 'Please search by city or zip code.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setGpsLoading(false);
        doSearch(latitude, longitude, '');
      },
      () => {
        setGpsLoading(false);
        Alert.alert('Location', 'Could not get your location. Try searching by city or zip code.');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleTextSearch = () => {
    if (!searchText.trim()) return;
    doSearch(userLocation?.lat, userLocation?.lng, searchText);
  };

  const loadCheckinCounts = async (placeIds) => {
    const counts = {};
    await Promise.all(placeIds.map(async (pid) => {
      try {
        const snap = await getDoc(doc(db, 'lounge_meta', pid));
        if (snap.exists()) counts[pid] = snap.data().checkinCount || 0;
      } catch (e) {}
    }));
    setCheckinCounts(prev => ({ ...prev, ...counts }));
  };

  const fetchAISummary = async (place) => {
    if (aiSummaries[place.id] !== undefined || aiLoading[place.id]) return;
    setAiLoading(prev => ({ ...prev, [place.id]: true }));

    try {
      const cacheSnap = await getDoc(doc(db, 'lounge_summaries', place.id));
      if (cacheSnap.exists() && cacheSnap.data().summary) {
        setAiSummaries(prev => ({ ...prev, [place.id]: cacheSnap.data().summary }));
        setAiLoading(prev => ({ ...prev, [place.id]: false }));
        return;
      }

      const revResp = await fetch('/api/lounges/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: place.id }),
      });
      const revData = await revResp.json();
      const reviews = (revData.reviews || [])
        .slice(0, 5)
        .map(r => r.text?.text || r.originalText?.text || '')
        .filter(Boolean);

      if (!reviews.length) {
        setAiSummaries(prev => ({ ...prev, [place.id]: null }));
        setAiLoading(prev => ({ ...prev, [place.id]: false }));
        return;
      }

      const aiResp = await fetch('/api/lounges/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: place.id, placeName: place.displayName?.text, reviews }),
      });
      const aiData = await aiResp.json();
      const summary = aiData.summary || null;
      setAiSummaries(prev => ({ ...prev, [place.id]: summary }));

      if (summary) {
        await setDoc(doc(db, 'lounge_summaries', place.id), {
          summary, name: place.displayName?.text, cachedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      setAiSummaries(prev => ({ ...prev, [place.id]: null }));
    }
    setAiLoading(prev => ({ ...prev, [place.id]: false }));
  };

  const submitCheckin = async () => {
    if (!checkinPlace) return;
    setCheckinSubmitting(true);
    const uid = auth.currentUser?.uid;
    try {
      await addDoc(collection(db, 'lounge_checkins'), {
        placeId: checkinPlace.id,
        placeName: checkinPlace.displayName?.text || '',
        placeAddress: checkinPlace.formattedAddress || '',
        userId: uid,
        userEmail: auth.currentUser?.email || '',
        cigar: checkinCigar.trim() || null,
        vibe: checkinVibe,
        checkedInAt: serverTimestamp(),
      });

      const metaRef = doc(db, 'lounge_meta', checkinPlace.id);
      const metaSnap = await getDoc(metaRef);
      const current = metaSnap.exists() ? (metaSnap.data().checkinCount || 0) : 0;
      await setDoc(metaRef, {
        checkinCount: current + 1,
        name: checkinPlace.displayName?.text || '',
      }, { merge: true });

      setCheckinCounts(prev => ({ ...prev, [checkinPlace.id]: (prev[checkinPlace.id] || 0) + 1 }));
      setCheckinPlace(null);
      setCheckinCigar('');
      setCheckinVibe(null);
    } catch (e) {
      console.error('[Check-in] error:', e);
    }
    setCheckinSubmitting(false);
  };

  const getPhotoUrl = (place) => {
    const photo = place.photos?.[0];
    if (!photo?.name || !MAPS_KEY) return null;
    return `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=600&key=${MAPS_KEY}`;
  };

  const getPills = (place) => {
    const types = (place.types || []).map(t => t.toLowerCase());
    const pills = [];
    if (types.includes('bar') || types.includes('night_club')) pills.push({ label: 'Full Bar', color: '#7B3A8C' });
    if (types.includes('restaurant')) pills.push({ label: 'Full Menu', color: '#2E7D32' });
    if (types.some(t => t.includes('tobacco') || t.includes('cigar'))) pills.push({ label: 'Tobacco Shop', color: '#8B4513' });
    if (place.priceLevel >= 3) pills.push({ label: 'Upscale', color: '#B8860B' });
    if (types.includes('cafe')) pills.push({ label: 'Café Vibes', color: '#5D4037' });
    return pills;
  };

  const getAuthorizedBrands = (place) => {
    const name = (place.displayName?.text || '').toLowerCase();
    return Object.entries(AUTHORIZED_RETAILERS)
      .filter(([, keywords]) => keywords.some(k => name.includes(k)))
      .map(([brand]) => brand);
  };

  const isOpenNow = (place) => {
    return place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow ?? null;
  };

  const openDirections = (place) => {
    const addr = encodeURIComponent(place.formattedAddress || place.displayName?.text || '');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${addr}`;
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  const callPlace = (place) => {
    const phone = place.nationalPhoneNumber;
    if (!phone) return;
    const url = `tel:${phone.replace(/\D/g, '')}`;
    if (Platform.OS === 'web') window.open(url);
    else Linking.openURL(url);
  };

  const cardWidth = isDesktop ? Math.min(680, width - 64) : width - 32;

  const renderCard = (place) => {
    const isExpanded = expandedId === place.id;
    const isFav = !!favorites[place.id];
    const openStatus = isOpenNow(place);
    const photoUrl = getPhotoUrl(place);
    const pills = getPills(place);
    const brands = getAuthorizedBrands(place);
    const count = checkinCounts[place.id] || 0;
    const summary = aiSummaries[place.id];
    const summaryLoading = !!aiLoading[place.id];

    return (
      <View key={place.id} style={[s.card, { width: cardWidth }]}>
        <View style={s.cardInner}>
          {/* Photo + Favorite star */}
          <View style={s.photoWrap}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={s.photo} resizeMode="cover" />
            ) : (
              <View style={[s.photo, s.photoPlaceholder]}>
                <Icon name="location-outline" size={32} color="#c8b89a" />
              </View>
            )}
            <TouchableOpacity
              style={s.favBtn}
              onPress={() => toggleFavorite(place)}
              activeOpacity={0.75}
            >
              <Text style={[s.favStar, isFav && s.favStarActive]}>
                {isFav ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
            {openStatus !== null && (
              <View style={[s.openBadge, openStatus ? s.openBadgeOpen : s.openBadgeClosed]}>
                <Text style={s.openBadgeText}>{openStatus ? 'Open' : 'Closed'}</Text>
              </View>
            )}
          </View>

          {/* Main info */}
          <View style={s.infoWrap}>
            <Text style={s.placeName} numberOfLines={2}>{place.displayName?.text || 'Cigar Lounge'}</Text>
            <Text style={s.placeAddr} numberOfLines={2}>{place.formattedAddress}</Text>

            <View style={s.metaRow}>
              <StarRating rating={place.rating} count={place.userRatingCount} />
              {place._miles != null && (
                <Text style={s.distText}>{place._miles.toFixed(1)} mi away</Text>
              )}
            </View>

            {/* Pills row */}
            {(pills.length > 0 || brands.length > 0) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsRow}>
                {pills.map(p => (
                  <PillTag key={p.label} label={p.label} color={p.color} />
                ))}
                {brands.map(b => (
                  <PillTag key={b} label={`✓ ${b}`} color="#1B5E20" bg="#e8f5e9" />
                ))}
              </ScrollView>
            )}

            {/* Check-in count */}
            {count > 0 && (
              <Text style={s.humiCount}>
                🔥 {count} HUMI {count === 1 ? 'member has' : 'members have'} been here
              </Text>
            )}

            {/* AI Summary — loads when card is expanded */}
            {isExpanded && (
              <View style={s.aiWrap}>
                {summaryLoading ? (
                  <View style={s.aiLoadRow}>
                    <ActivityIndicator size="small" color="#8B4513" />
                    <Text style={s.aiLoadText}>Analyzing reviews...</Text>
                  </View>
                ) : summary ? (
                  <Text style={s.aiText}>{summary}</Text>
                ) : summary === null ? (
                  <Text style={s.aiNone}>No reviews to analyze yet.</Text>
                ) : null}
              </View>
            )}

            {/* Action buttons */}
            <View style={s.actionsRow}>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => {
                  const next = isExpanded ? null : place.id;
                  setExpandedId(next);
                  if (next) fetchAISummary(place);
                }}
              >
                <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={15} color="#8B4513" />
                <Text style={s.actionBtnText}>{isExpanded ? 'Less' : 'Reviews'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.actionBtn} onPress={() => openDirections(place)}>
                <Icon name="navigate-outline" size={15} color="#8B4513" />
                <Text style={s.actionBtnText}>Directions</Text>
              </TouchableOpacity>

              {place.nationalPhoneNumber && (
                <TouchableOpacity style={s.actionBtn} onPress={() => callPlace(place)}>
                  <Icon name="call-outline" size={15} color="#8B4513" />
                  <Text style={s.actionBtnText}>Call</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[s.actionBtn, s.checkinBtn]}
                onPress={() => setCheckinPlace(place)}
              >
                <Icon name="checkmark-circle-outline" size={15} color="#fff" />
                <Text style={[s.actionBtnText, { color: '#fff' }]}>Check In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Cigar Lounges</Text>
        <Text style={s.headerSub}>Find your next smoke spot</Text>
      </View>

      {/* Search bar */}
      <View style={[s.searchWrap, isDesktop && s.searchWrapDesktop]}>
        <View style={s.searchRow}>
          <View style={s.searchInputWrap}>
            <Icon name="search-outline" size={18} color="#999" />
            <TextInput
              style={s.searchInput}
              placeholder="City, zip code, or name..."
              placeholderTextColor="#bbb"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleTextSearch}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Icon name="close-circle" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={s.searchBtn}
            onPress={handleTextSearch}
            activeOpacity={0.8}
          >
            <Text style={s.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={s.gpsBtn}
          onPress={handleGPS}
          activeOpacity={0.8}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color="#8B4513" />
          ) : (
            <Icon name="locate-outline" size={18} color="#8B4513" />
          )}
          <Text style={s.gpsBtnText}>
            {gpsLoading ? 'Finding you...' : 'Use My Location'}
          </Text>
        </TouchableOpacity>

        {/* Radius pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.radiusRow}>
          {RADIUS_OPTIONS.map(r => (
            <TouchableOpacity
              key={r}
              style={[s.radiusPill, radiusMiles === r && s.radiusPillActive]}
              onPress={() => setRadiusMiles(r)}
            >
              <Text style={[s.radiusPillText, radiusMiles === r && s.radiusPillTextActive]}>
                {r} mi
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results */}
      <ScrollView
        contentContainerStyle={[s.list, isDesktop && s.listDesktop]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading && (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color="#8B4513" />
            <Text style={s.loadingText}>Finding lounges...</Text>
          </View>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>🚬</Text>
            <Text style={s.emptyTitle}>No lounges found</Text>
            <Text style={s.emptySub}>Try expanding the radius or a different search term.</Text>
          </View>
        )}

        {!loading && !hasSearched && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>📍</Text>
            <Text style={s.emptyTitle}>Find your next spot</Text>
            <Text style={s.emptySub}>Search by city, zip code, or tap "Use My Location" to discover cigar lounges nearby.</Text>
          </View>
        )}

        {results.map(place => renderCard(place))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Check-in Modal */}
      <Modal
        visible={!!checkinPlace}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckinPlace(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalOverlay}
        >
          <TouchableOpacity
            style={s.modalBackdrop}
            activeOpacity={1}
            onPress={() => setCheckinPlace(null)}
          />
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Check In</Text>
            <Text style={s.modalSubtitle} numberOfLines={2}>
              {checkinPlace?.displayName?.text}
            </Text>

            <Text style={s.modalLabel}>What are you smoking? (optional)</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g. Cohiba Behike 54"
              placeholderTextColor="#bbb"
              value={checkinCigar}
              onChangeText={setCheckinCigar}
            />

            <Text style={s.modalLabel}>How's the vibe?</Text>
            <View style={s.vibeRow}>
              {[
                { emoji: '🔥', label: 'Loved it', val: 'loved' },
                { emoji: '👍', label: 'Solid', val: 'solid' },
                { emoji: '😐', label: 'Meh', val: 'meh' },
              ].map(v => (
                <TouchableOpacity
                  key={v.val}
                  style={[s.vibeBtn, checkinVibe === v.val && s.vibeBtnActive]}
                  onPress={() => setCheckinVibe(checkinVibe === v.val ? null : v.val)}
                >
                  <Text style={s.vibeEmoji}>{v.emoji}</Text>
                  <Text style={[s.vibeLabel, checkinVibe === v.val && s.vibeLabelActive]}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.checkinSubmitBtn, checkinSubmitting && { opacity: 0.6 }]}
              onPress={submitCheckin}
              disabled={checkinSubmitting}
              activeOpacity={0.8}
            >
              {checkinSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.checkinSubmitText}>Check In ✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setCheckinPlace(null)} style={s.modalCancel}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9f7f4' },
  header: {
    backgroundColor: '#8B4513',
    paddingTop: Platform.OS === 'web' ? 20 : 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  searchWrap: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchWrapDesktop: { paddingHorizontal: 32 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 12,
    gap: 8, borderWidth: 1, borderColor: '#e8e8e8',
  },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#333', outlineStyle: 'none' },
  searchBtn: {
    backgroundColor: '#8B4513', borderRadius: 12,
    paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#8B4513', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start',
  },
  gpsBtnText: { color: '#8B4513', fontWeight: '600', fontSize: 13 },
  radiusRow: { marginTop: 10, flexDirection: 'row' },
  radiusPill: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1.5, borderColor: '#ddd', marginRight: 8, backgroundColor: '#fff',
  },
  radiusPillActive: { backgroundColor: '#8B4513', borderColor: '#8B4513' },
  radiusPillText: { fontSize: 13, color: '#777', fontWeight: '600' },
  radiusPillTextActive: { color: '#fff' },

  list: { padding: 16, alignItems: 'center' },
  listDesktop: { paddingHorizontal: 32 },
  loadingWrap: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 15, color: '#888' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#444', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#f0ebe3', overflow: 'hidden',
  },
  cardInner: { flexDirection: 'column' },

  photoWrap: { position: 'relative', width: '100%', height: 180 },
  photo: { width: '100%', height: 180 },
  photoPlaceholder: {
    backgroundColor: '#f5ede3', alignItems: 'center', justifyContent: 'center',
  },
  favBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  favStar: { fontSize: 22, color: 'rgba(255,255,255,0.75)' },
  favStarActive: { color: '#FFD700' },
  openBadge: {
    position: 'absolute', bottom: 10, left: 10,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  openBadgeOpen: { backgroundColor: 'rgba(27,94,32,0.88)' },
  openBadgeClosed: { backgroundColor: 'rgba(183,28,28,0.88)' },
  openBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  infoWrap: { padding: 14 },
  placeName: { fontSize: 17, fontWeight: '800', color: '#222', marginBottom: 2 },
  placeAddr: { fontSize: 12, color: '#888', marginBottom: 8, lineHeight: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starFilled: { color: '#F9A825', fontSize: 14, letterSpacing: -1 },
  ratingText: { fontSize: 13, color: '#555', fontWeight: '600' },
  ratingCount: { fontSize: 12, color: '#aaa' },
  distText: { fontSize: 12, color: '#8B4513', fontWeight: '600' },

  pillsRow: { flexDirection: 'row', marginBottom: 8 },
  pill: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    marginRight: 6, borderWidth: 1,
  },
  pillText: { fontSize: 11, fontWeight: '700' },

  humiCount: { fontSize: 12, color: '#8B4513', fontWeight: '600', marginBottom: 8 },

  aiWrap: {
    backgroundColor: '#faf7f3', borderRadius: 10, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: '#f0e6d3',
  },
  aiLoadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiLoadText: { fontSize: 13, color: '#888' },
  aiText: { fontSize: 13, color: '#444', lineHeight: 20, fontStyle: 'italic' },
  aiNone: { fontSize: 13, color: '#bbb', fontStyle: 'italic' },

  actionsRow: {
    flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: '#8B4513', borderRadius: 10,
    paddingVertical: 7, paddingHorizontal: 12,
  },
  actionBtnText: { fontSize: 12, color: '#8B4513', fontWeight: '700' },
  checkinBtn: { backgroundColor: '#8B4513', borderColor: '#8B4513' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#222', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#8B4513', fontWeight: '600', marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
  modalInput: {
    backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: '#333', marginBottom: 16,
    borderWidth: 1, borderColor: '#eee',
  },
  vibeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  vibeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#eee', backgroundColor: '#fafafa',
  },
  vibeBtnActive: { borderColor: '#8B4513', backgroundColor: '#fef3ea' },
  vibeEmoji: { fontSize: 24, marginBottom: 4 },
  vibeLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
  vibeLabelActive: { color: '#8B4513' },
  checkinSubmitBtn: {
    backgroundColor: '#8B4513', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
  },
  checkinSubmitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalCancel: { alignItems: 'center', paddingVertical: 8 },
  modalCancelText: { color: '#aaa', fontSize: 14 },
});
