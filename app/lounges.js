import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { auth, db, storage } from '../config/firebaseConfig';
import {
  doc, setDoc, getDoc, deleteDoc,
  collection, addDoc, getDocs, serverTimestamp,
  query, where, orderBy, limit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  return (
    <View style={s.starRow}>
      <Text style={s.ratingText}>{rating.toFixed(1)}</Text>
      {[1, 2, 3, 4, 5].map(i => (
        <Icon
          key={i}
          name={rating >= i ? 'star' : rating >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={14}
          color="#F9A825"
        />
      ))}
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

const VIBE_OPTIONS = [
  { emoji: '🔥', label: 'Loved it', val: 'loved' },
  { emoji: '👍', label: 'Solid', val: 'solid' },
  { emoji: '😐', label: 'Meh', val: 'meh' },
];

export default function LoungesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const fileInputRef = useRef(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('search');

  // Search state
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [hasSearched, setHasSearched] = useState(false);
  const [photoIndices, setPhotoIndices] = useState({});

  // Spot data
  const [favorites, setFavorites] = useState({});
  const [checkinCounts, setCheckinCounts] = useState({});
  const [aiSummaries, setAiSummaries] = useState({});
  const [aiLoading, setAiLoading] = useState({});

  // My Spots
  const [myCheckins, setMyCheckins] = useState([]);
  const [myCheckinsLoading, setMyCheckinsLoading] = useState(false);

  // Check-in modal
  const [checkinPlace, setCheckinPlace] = useState(null);
  const [checkinMode, setCheckinMode] = useState('humidor'); // 'humidor' | 'scan' | 'type'
  const [checkinCigar, setCheckinCigar] = useState('');
  const [checkinVibe, setCheckinVibe] = useState(null);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [checkinPhoto, setCheckinPhoto] = useState(null); // { uri, file }
  const [selectedHumidorCigar, setSelectedHumidorCigar] = useState(null);
  const [humidorCigars, setHumidorCigars] = useState([]);
  const [humidorLoading, setHumidorLoading] = useState(false);

  const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    if (activeTab === 'my_spots') {
      loadMyCheckins();
    }
  }, [activeTab]);

  useEffect(() => {
    if (checkinPlace) {
      loadHumidorCigars();
      setCheckinMode('humidor');
      setCheckinCigar('');
      setCheckinVibe(null);
      setCheckinPhoto(null);
      setSelectedHumidorCigar(null);
    }
  }, [checkinPlace]);

  // Auto-fetch AI summaries for all results
  useEffect(() => {
    if (results.length > 0) {
      results.forEach(p => fetchAISummary(p));
    }
  }, [results]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data loading ──────────────────────────────────────────────

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

  const loadMyCheckins = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setMyCheckinsLoading(true);
    try {
      const q = query(
        collection(db, 'lounge_checkins'),
        where('userId', '==', uid),
        orderBy('checkedInAt', 'desc'),
        limit(30)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyCheckins(items);
    } catch (e) {}
    setMyCheckinsLoading(false);
  };

  const loadHumidorCigars = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setHumidorCigars([]); return; }
    setHumidorLoading(true);
    try {
      const q = query(
        collection(db, 'users', uid, 'logs'),
        orderBy('submittedDate', 'desc'),
        limit(40)
      );
      const snap = await getDocs(q);
      const cigars = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.fullName || c.cigarName);
      setHumidorCigars(cigars);
    } catch (e) {
      setHumidorCigars([]);
    }
    setHumidorLoading(false);
  };

  // ── Favorites ─────────────────────────────────────────────────

  const toggleFavorite = async (place) => {
    const uid = auth.currentUser?.uid;
    if (!uid) { Alert.alert('Sign in required', 'Sign in to save smoke spots.'); return; }
    const placeId = place.id || place.placeId;
    const ref = doc(db, 'users', uid, 'lounge_favorites', placeId);
    if (favorites[placeId]) {
      setFavorites(prev => { const n = { ...prev }; delete n[placeId]; return n; });
      try { await deleteDoc(ref); } catch (e) {}
    } else {
      const data = {
        placeId,
        name: place.displayName?.text || place.name || '',
        address: place.formattedAddress || place.address || '',
        rating: place.rating || null,
        savedAt: new Date().toISOString(),
      };
      setFavorites(prev => ({ ...prev, [placeId]: data }));
      try { await setDoc(ref, data); } catch (e) {}
    }
  };

  // ── Search ────────────────────────────────────────────────────

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
      const cacheData = cacheSnap.exists() ? cacheSnap.data() : null;
      const cacheAgeDays = cacheData?.cachedAt
        ? (Date.now() - new Date(cacheData.cachedAt).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;
      if (cacheData?.summary && cacheAgeDays < 30) {
        setAiSummaries(prev => ({ ...prev, [place.id]: cacheData.summary }));
        setAiLoading(prev => ({ ...prev, [place.id]: false }));
        return;
      }
    } catch (_) {}

    try {
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
        const googleSummary = place.generativeSummary?.overview?.text || null;
        setAiSummaries(prev => ({ ...prev, [place.id]: googleSummary }));
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
        try {
          await setDoc(doc(db, 'lounge_summaries', place.id), {
            summary, name: place.displayName?.text, cachedAt: new Date().toISOString(),
          });
        } catch (_) {}
      }
    } catch (e) {
      setAiSummaries(prev => ({ ...prev, [place.id]: null }));
    }
    setAiLoading(prev => ({ ...prev, [place.id]: false }));
  };

  // ── Check-in ──────────────────────────────────────────────────

  const pickCheckinPhoto = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uri = URL.createObjectURL(file);
    setCheckinPhoto({ uri, file });
  };

  const submitCheckin = async () => {
    if (!checkinPlace) return;
    setCheckinSubmitting(true);
    const uid = auth.currentUser?.uid;

    try {
      let photoUrl = null;

      // Upload photo if selected
      if (checkinPhoto?.file && uid) {
        try {
          const filename = `checkin_photos/${uid}/${Date.now()}.jpg`;
          const storageRef = ref(storage, filename);
          await uploadBytes(storageRef, checkinPhoto.file);
          photoUrl = await getDownloadURL(storageRef);
        } catch (_) {}
      }

      // Resolve cigar name from the selected mode
      const cigarName = checkinMode === 'humidor' && selectedHumidorCigar
        ? (selectedHumidorCigar.fullName || selectedHumidorCigar.cigarName)
        : checkinMode === 'type'
        ? checkinCigar.trim() || null
        : checkinCigar.trim() || null;

      const placeId = checkinPlace.id || checkinPlace.placeId;
      await addDoc(collection(db, 'lounge_checkins'), {
        placeId,
        placeName: checkinPlace.displayName?.text || checkinPlace.name || '',
        placeAddress: checkinPlace.formattedAddress || checkinPlace.address || '',
        userId: uid,
        userEmail: auth.currentUser?.email || '',
        cigar: cigarName,
        cigarBrand: selectedHumidorCigar?.cigarBrand || null,
        humidorLogId: selectedHumidorCigar?.id || null,
        photoUrl,
        vibe: checkinVibe,
        checkedInAt: serverTimestamp(),
      });

      const metaRef = doc(db, 'lounge_meta', placeId);
      const metaSnap = await getDoc(metaRef);
      const current = metaSnap.exists() ? (metaSnap.data().checkinCount || 0) : 0;
      await setDoc(metaRef, {
        checkinCount: current + 1,
        name: checkinPlace.displayName?.text || checkinPlace.name || '',
      }, { merge: true });

      setCheckinCounts(prev => ({ ...prev, [placeId]: (prev[placeId] || 0) + 1 }));

      // Refresh my check-ins if on My Spots tab
      if (activeTab === 'my_spots') loadMyCheckins();

      setCheckinPlace(null);
    } catch (e) {
      console.error('[Check-in] error:', e);
    }
    setCheckinSubmitting(false);
  };

  // ── Render helpers ────────────────────────────────────────────

  const getPhotoUrls = (place, max = 6) => {
    if (!MAPS_KEY || !place.photos?.length) return [];
    return place.photos.slice(0, max).map(
      photo => `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&key=${MAPS_KEY}`
    );
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

  const isOpenNow = (place) =>
    place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow ?? null;

  const openDirections = (addrOrPlace) => {
    const addr = typeof addrOrPlace === 'string'
      ? addrOrPlace
      : addrOrPlace.formattedAddress || addrOrPlace.address || addrOrPlace.displayName?.text || '';
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
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

  const openCheckinForFavorite = (favData, favId) => {
    setCheckinPlace({
      id: favId,
      placeId: favId,
      displayName: { text: favData.name },
      formattedAddress: favData.address,
      name: favData.name,
      address: favData.address,
    });
  };

  const cardWidth = isDesktop ? Math.min(680, width - 64) : width - 32;

  // ── Render: Search card ───────────────────────────────────────

  const renderCard = (place) => {
    const isFav = !!favorites[place.id];
    const openStatus = isOpenNow(place);
    const photoUrls = getPhotoUrls(place);
    const pills = getPills(place);
    const brands = getAuthorizedBrands(place);
    const count = checkinCounts[place.id] || 0;
    const summary = aiSummaries[place.id];
    const summaryLoading = !!aiLoading[place.id];
    const activePhotoIdx = photoIndices[place.id] || 0;

    return (
      <View key={place.id} style={[s.card, { width: cardWidth }]}>
        <View style={s.cardInner}>

          {/* Photo carousel */}
          <View style={s.photoWrap}>
            {photoUrls.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                style={{ width: cardWidth, height: 220 }}
                onScroll={e => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                  setPhotoIndices(prev => ({ ...prev, [place.id]: idx }));
                }}
              >
                {photoUrls.map((url, i) => (
                  <Image
                    key={i}
                    source={{ uri: url }}
                    style={{ width: cardWidth, height: 220 }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={[{ width: '100%', height: 220 }, s.photoPlaceholder]}>
                <Icon name="location-outline" size={40} color="#c8b89a" />
              </View>
            )}

            {openStatus !== null && (
              <View style={[s.openBadge, openStatus ? s.openBadgeOpen : s.openBadgeClosed]}>
                <Text style={s.openBadgeText}>{openStatus ? 'Open' : 'Closed'}</Text>
              </View>
            )}

            {/* Favorite star */}
            <TouchableOpacity
              style={s.favBtn}
              onPress={() => toggleFavorite(place)}
              activeOpacity={0.75}
            >
              <Icon
                name={isFav ? 'star' : 'star-outline'}
                size={20}
                color={isFav ? '#FFD700' : 'rgba(255,255,255,0.85)'}
              />
            </TouchableOpacity>

            {photoUrls.length > 1 && (
              <View style={s.dotsRow}>
                {photoUrls.map((_, i) => (
                  <View key={i} style={[s.dot, i === activePhotoIdx && s.dotActive]} />
                ))}
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

            {(pills.length > 0 || brands.length > 0) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsRow}>
                {pills.map(p => <PillTag key={p.label} label={p.label} color={p.color} />)}
                {brands.map(b => <PillTag key={b} label={`✓ ${b}`} color="#1B5E20" bg="#e8f5e9" />)}
              </ScrollView>
            )}

            {count > 0 && (
              <Text style={s.humiCount}>
                🔥 {count} HUMI {count === 1 ? 'member has' : 'members have'} been here
              </Text>
            )}

            <View style={s.aiWrap}>
              {summaryLoading ? (
                <View style={s.aiLoadRow}>
                  <ActivityIndicator size="small" color="#8B4513" />
                  <Text style={s.aiLoadText}>Reading the reviews...</Text>
                </View>
              ) : summary ? (
                <>
                  <Text style={s.aiLabel}>✦ HUMI Says</Text>
                  <Text style={s.aiText}>{summary}</Text>
                </>
              ) : summary === null ? (
                <Text style={s.aiNone}>No reviews to analyze yet — be the first to check in!</Text>
              ) : null}
            </View>

            <View style={s.actionsRow}>
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

  // ── Render: My Spots ──────────────────────────────────────────

  const renderMySpots = () => {
    const favList = Object.entries(favorites);

    return (
      <ScrollView
        contentContainerStyle={[s.list, isDesktop && s.listDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* Saved Spots */}
        <View style={[s.mySection, { width: cardWidth }]}>
          <Text style={s.mySectionTitle}>⭐ Saved Spots</Text>
          {favList.length === 0 ? (
            <View style={s.myEmptyBox}>
              <Text style={s.myEmptyText}>
                Tap the star on any spot to save it here for quick access.
              </Text>
            </View>
          ) : (
            favList.map(([favId, fav]) => (
              <View key={favId} style={s.mySpotCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.mySpotName} numberOfLines={1}>{fav.name}</Text>
                  <Text style={s.mySpotAddr} numberOfLines={1}>{fav.address}</Text>
                  {fav.rating ? (
                    <View style={[s.starRow, { marginTop: 4 }]}>
                      <Text style={s.ratingText}>{fav.rating.toFixed(1)}</Text>
                      <Icon name="star" size={13} color="#F9A825" />
                    </View>
                  ) : null}
                </View>
                <View style={s.mySpotActions}>
                  <TouchableOpacity
                    style={s.mySpotBtn}
                    onPress={() => openDirections(fav.address)}
                  >
                    <Icon name="navigate-outline" size={15} color="#8B4513" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.mySpotBtn, { backgroundColor: '#8B4513', borderColor: '#8B4513' }]}
                    onPress={() => openCheckinForFavorite(fav, favId)}
                  >
                    <Icon name="checkmark-circle-outline" size={15} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.mySpotBtn}
                    onPress={() => toggleFavorite({ id: favId, ...fav })}
                  >
                    <Icon name="star" size={15} color="#FFD700" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Check-in History */}
        <View style={[s.mySection, { width: cardWidth }]}>
          <Text style={s.mySectionTitle}>📍 Your Check-Ins</Text>
          {myCheckinsLoading ? (
            <ActivityIndicator color="#8B4513" style={{ marginVertical: 20 }} />
          ) : myCheckins.length === 0 ? (
            <View style={s.myEmptyBox}>
              <Text style={s.myEmptyText}>
                Your check-ins will appear here once you visit a spot.
              </Text>
            </View>
          ) : (
            myCheckins.map(ci => {
              const vibeObj = VIBE_OPTIONS.find(v => v.val === ci.vibe);
              const dateStr = ci.checkedInAt?.toDate
                ? ci.checkedInAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';
              return (
                <View key={ci.id} style={s.myCheckinCard}>
                  {ci.photoUrl && (
                    <Image source={{ uri: ci.photoUrl }} style={s.myCheckinPhoto} resizeMode="cover" />
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={s.myCheckinTop}>
                      <Text style={s.myCheckinPlace} numberOfLines={1}>{ci.placeName}</Text>
                      {vibeObj && <Text style={s.myCheckinVibe}>{vibeObj.emoji}</Text>}
                    </View>
                    {ci.cigar ? (
                      <Text style={s.myCheckinCigar}>🚬 {ci.cigar}</Text>
                    ) : null}
                    {dateStr ? <Text style={s.myCheckinDate}>{dateStr}</Text> : null}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ── Main render ───────────────────────────────────────────────

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>Smoke Spots</Text>
            <Text style={s.headerSub}>Light up somewhere new</Text>
          </View>
          {/* Tab toggle */}
          <View style={s.tabToggle}>
            <TouchableOpacity
              style={[s.tabBtn, activeTab === 'search' && s.tabBtnActive]}
              onPress={() => setActiveTab('search')}
            >
              <Icon name="search-outline" size={15} color={activeTab === 'search' ? '#8B4513' : 'rgba(255,255,255,0.7)'} />
              <Text style={[s.tabBtnText, activeTab === 'search' && s.tabBtnTextActive]}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tabBtn, activeTab === 'my_spots' && s.tabBtnActive]}
              onPress={() => setActiveTab('my_spots')}
            >
              <Icon name="star-outline" size={15} color={activeTab === 'my_spots' ? '#8B4513' : 'rgba(255,255,255,0.7)'} />
              <Text style={[s.tabBtnText, activeTab === 'my_spots' && s.tabBtnTextActive]}>My Spots</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {activeTab === 'search' && (
        <>
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
              <TouchableOpacity style={s.searchBtn} onPress={handleTextSearch} activeOpacity={0.8}>
                <Text style={s.searchBtnText}>Search</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.gpsBtn} onPress={handleGPS} activeOpacity={0.8} disabled={gpsLoading}>
              {gpsLoading
                ? <ActivityIndicator size="small" color="#8B4513" />
                : <Icon name="locate-outline" size={18} color="#8B4513" />}
              <Text style={s.gpsBtnText}>{gpsLoading ? 'Finding you...' : 'Use My Location'}</Text>
            </TouchableOpacity>

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
                <Text style={s.loadingText}>Finding spots...</Text>
              </View>
            )}
            {!loading && hasSearched && results.length === 0 && (
              <View style={s.emptyWrap}>
                <Text style={s.emptyIcon}>🚬</Text>
                <Text style={s.emptyTitle}>No spots found</Text>
                <Text style={s.emptySub}>Try expanding the radius or a different search term.</Text>
              </View>
            )}
            {!loading && !hasSearched && (
              <View style={s.emptyWrap}>
                <Text style={s.emptyIcon}>📍</Text>
                <Text style={s.emptyTitle}>Find your next spot</Text>
                <Text style={s.emptySub}>Search by city, zip code, or tap "Use My Location" to find smoke spots near you.</Text>
              </View>
            )}
            {results.map(place => renderCard(place))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}

      {activeTab === 'my_spots' && renderMySpots()}

      {/* Hidden file input for web photo picker */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}

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
              {checkinPlace?.displayName?.text || checkinPlace?.name}
            </Text>

            {/* Cigar mode tabs */}
            <Text style={s.modalLabel}>What are you smoking?</Text>
            <View style={s.modeTabs}>
              {[
                { key: 'humidor', icon: 'albums-outline', label: 'My Humidor' },
                { key: 'scan', icon: 'camera-outline', label: 'Smoke Shot' },
                { key: 'type', icon: 'create-outline', label: 'Type It' },
              ].map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[s.modeTab, checkinMode === m.key && s.modeTabActive]}
                  onPress={() => setCheckinMode(m.key)}
                >
                  <Icon name={m.icon} size={16} color={checkinMode === m.key ? '#8B4513' : '#aaa'} />
                  <Text style={[s.modeTabText, checkinMode === m.key && s.modeTabTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Humidor picker */}
            {checkinMode === 'humidor' && (
              <View style={s.humidorPicker}>
                {humidorLoading ? (
                  <View style={s.humidorLoading}>
                    <ActivityIndicator size="small" color="#8B4513" />
                    <Text style={s.humidorLoadingText}>Loading your humidor...</Text>
                  </View>
                ) : humidorCigars.length === 0 ? (
                  <View style={s.humidorEmpty}>
                    <Text style={s.humidorEmptyText}>
                      No cigars in your humidor yet. Scan a band to add one, or type it in below.
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={s.humidorList} showsVerticalScrollIndicator={false}>
                    {humidorCigars.map(cigar => {
                      const name = cigar.fullName || cigar.cigarName || '';
                      const brand = cigar.cigarBrand || '';
                      const isSelected = selectedHumidorCigar?.id === cigar.id;
                      return (
                        <TouchableOpacity
                          key={cigar.id}
                          style={[s.humidorItem, isSelected && s.humidorItemSelected]}
                          onPress={() => setSelectedHumidorCigar(isSelected ? null : cigar)}
                          activeOpacity={0.7}
                        >
                          {cigar.image ? (
                            <Image source={{ uri: cigar.image }} style={s.humidorThumb} resizeMode="cover" />
                          ) : (
                            <View style={[s.humidorThumb, s.humidorThumbEmpty]}>
                              <Text style={{ fontSize: 16 }}>🚬</Text>
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={[s.humidorItemName, isSelected && { color: '#8B4513' }]} numberOfLines={1}>
                              {name}
                            </Text>
                            {brand ? <Text style={s.humidorItemBrand} numberOfLines={1}>{brand}</Text> : null}
                          </View>
                          {isSelected && <Icon name="checkmark-circle" size={20} color="#8B4513" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Scan / Smoke Shot */}
            {checkinMode === 'scan' && (
              <View style={s.scanWrap}>
                {checkinPhoto ? (
                  <View style={s.photoPreviewWrap}>
                    <Image source={{ uri: checkinPhoto.uri }} style={s.photoPreview} resizeMode="cover" />
                    <TouchableOpacity style={s.photoRemoveBtn} onPress={() => setCheckinPhoto(null)}>
                      <Icon name="close-circle" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={s.photoPickBtn} onPress={pickCheckinPhoto}>
                    <Icon name="camera-outline" size={28} color="#8B4513" />
                    <Text style={s.photoPickText}>Add a Smoke Shot</Text>
                    <Text style={s.photoPickSub}>A photo from this moment</Text>
                  </TouchableOpacity>
                )}
                <TextInput
                  style={[s.modalInput, { marginTop: 12 }]}
                  placeholder="What are you smoking? (optional)"
                  placeholderTextColor="#bbb"
                  value={checkinCigar}
                  onChangeText={setCheckinCigar}
                />
              </View>
            )}

            {/* Type it */}
            {checkinMode === 'type' && (
              <TextInput
                style={s.modalInput}
                placeholder="e.g. Cohiba Behike 54"
                placeholderTextColor="#bbb"
                value={checkinCigar}
                onChangeText={setCheckinCigar}
              />
            )}

            {/* Vibe */}
            <Text style={[s.modalLabel, { marginTop: 16 }]}>How's the vibe?</Text>
            <View style={s.vibeRow}>
              {VIBE_OPTIONS.map(v => (
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
              {checkinSubmitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.checkinSubmitText}>Check In ✓</Text>}
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  tabToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10, padding: 3, gap: 2,
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
  },
  tabBtnActive: { backgroundColor: '#fff' },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  tabBtnTextActive: { color: '#8B4513' },

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
  photoWrap: { position: 'relative', width: '100%', height: 220, overflow: 'hidden' },
  photoPlaceholder: { backgroundColor: '#f5ede3', alignItems: 'center', justifyContent: 'center' },
  dotsRow: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 8, height: 8, borderRadius: 4 },
  favBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
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
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, color: '#555', fontWeight: '700', marginRight: 2 },
  ratingCount: { fontSize: 12, color: '#aaa' },
  distText: { fontSize: 12, color: '#8B4513', fontWeight: '600' },
  pillsRow: { flexDirection: 'row', marginBottom: 8 },
  pill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  humiCount: { fontSize: 12, color: '#8B4513', fontWeight: '600', marginBottom: 8 },
  aiWrap: {
    backgroundColor: '#faf7f3', borderRadius: 10, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: '#efe5d5',
  },
  aiLabel: {
    fontSize: 10, fontWeight: '800', color: '#8B4513',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 5,
  },
  aiLoadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiLoadText: { fontSize: 13, color: '#999', fontStyle: 'italic' },
  aiText: { fontSize: 13.5, color: '#444', lineHeight: 21 },
  aiNone: { fontSize: 13, color: '#bbb', fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: '#8B4513', borderRadius: 10,
    paddingVertical: 7, paddingHorizontal: 12,
  },
  actionBtnText: { fontSize: 12, color: '#8B4513', fontWeight: '700' },
  checkinBtn: { backgroundColor: '#8B4513', borderColor: '#8B4513' },

  // My Spots
  mySection: { marginBottom: 24, alignSelf: 'center' },
  mySectionTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 12 },
  myEmptyBox: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: '#f0ebe3',
  },
  myEmptyText: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  mySpotCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 10, borderWidth: 1, borderColor: '#f0ebe3',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  mySpotName: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 2 },
  mySpotAddr: { fontSize: 12, color: '#888' },
  mySpotActions: { flexDirection: 'row', gap: 8 },
  mySpotBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#8B4513', alignItems: 'center', justifyContent: 'center',
  },
  myCheckinCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', gap: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#f0ebe3',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  myCheckinPhoto: { width: 56, height: 56, borderRadius: 8 },
  myCheckinTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  myCheckinPlace: { fontSize: 14, fontWeight: '700', color: '#222', flex: 1, marginRight: 8 },
  myCheckinVibe: { fontSize: 18 },
  myCheckinCigar: { fontSize: 13, color: '#555', marginTop: 3 },
  myCheckinDate: { fontSize: 11, color: '#aaa', marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '90%',
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#222', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#8B4513', fontWeight: '600', marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
  modalInput: {
    backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: '#333', marginBottom: 4,
    borderWidth: 1, borderColor: '#eee',
  },

  modeTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeTab: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#eee', backgroundColor: '#fafafa', gap: 4,
  },
  modeTabActive: { borderColor: '#8B4513', backgroundColor: '#fef3ea' },
  modeTabText: { fontSize: 11, fontWeight: '700', color: '#aaa' },
  modeTabTextActive: { color: '#8B4513' },

  humidorPicker: { marginBottom: 4 },
  humidorLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 },
  humidorLoadingText: { fontSize: 13, color: '#999' },
  humidorEmpty: {
    backgroundColor: '#f9f7f4', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#eee',
  },
  humidorEmptyText: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  humidorList: { maxHeight: 200 },
  humidorItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
    marginBottom: 6, borderWidth: 1.5, borderColor: '#eee', backgroundColor: '#fafafa',
  },
  humidorItemSelected: { borderColor: '#8B4513', backgroundColor: '#fef3ea' },
  humidorThumb: { width: 40, height: 40, borderRadius: 8 },
  humidorThumbEmpty: { backgroundColor: '#f0ebe3', alignItems: 'center', justifyContent: 'center' },
  humidorItemName: { fontSize: 13, fontWeight: '700', color: '#333' },
  humidorItemBrand: { fontSize: 11, color: '#888', marginTop: 2 },

  scanWrap: { marginBottom: 4 },
  photoPickBtn: {
    borderWidth: 1.5, borderColor: '#e0d5c8', borderStyle: 'dashed',
    borderRadius: 14, padding: 24, alignItems: 'center', gap: 6,
    backgroundColor: '#faf7f3',
  },
  photoPickText: { fontSize: 15, fontWeight: '700', color: '#8B4513' },
  photoPickSub: { fontSize: 12, color: '#aaa' },
  photoPreviewWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  photoPreview: { width: '100%', height: 180, borderRadius: 14 },
  photoRemoveBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14,
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
