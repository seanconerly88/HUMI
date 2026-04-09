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
  Platform,
  useWindowDimensions,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import Icon from './components/Icon';
import useBetaTester from '../src/hooks/useBetaTester';
import { auth, db, storage } from '../config/firebaseConfig';
import {
  doc, setDoc, getDoc, deleteDoc, updateDoc,
  collection, addDoc, getDocs, serverTimestamp,
  query, where, orderBy, limit,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const RADIUS_OPTIONS = [5, 10, 25, 50];

const IS_PREVIEW = Platform.OS === 'web' && typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('preview') === 'lounges';

const AUTHORIZED_RETAILERS = {
  'My Father': ['my father', 'garcia & garcia', 'myfathercigars'],
  'Padron': ['padron'],
  'Davidoff': ['davidoff'],
  'Arturo Fuente': ['fuente', 'arturo fuente'],
  'Oliva': ['oliva cigar'],
};

const VIBE_OPTIONS = [
  { emoji: '🔥', label: 'Love it', val: 'loved' },
  { emoji: '👍', label: 'Solid',   val: 'solid' },
  { emoji: '😐', label: 'Meh',     val: 'meh'   },
];

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

export default function LoungesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const fileInputRef = useRef(null);
  const celebScale = useRef(new Animated.Value(0)).current;
  const isBeta = useBetaTester();

  // Tab
  const [activeTab, setActiveTab] = useState('search');

  // Search
  const [searchText, setSearchText]   = useState('');
  const [results, setResults]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [hasSearched, setHasSearched] = useState(false);
  const [photoIndices, setPhotoIndices] = useState({});

  // Spot data
  const [favorites, setFavorites]         = useState({});
  const [checkinCounts, setCheckinCounts] = useState({});
  const [aiSummaries, setAiSummaries]     = useState({});
  const [aiLoading, setAiLoading]         = useState({});

  // My Spots
  const [myCheckins, setMyCheckins]           = useState([]);
  const [myCheckinsLoading, setMyCheckinsLoading] = useState(false);

  // Check-in modal (step 1 — simple)
  const [checkinPlace, setCheckinPlace]     = useState(null);
  const [checkinNote, setCheckinNote]       = useState('');
  const [checkinVibe, setCheckinVibe]       = useState(null);
  const [checkinPhoto, setCheckinPhoto]     = useState(null); // { uri, file }
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);

  // Celebration + cigar linker (step 2)
  const [celebData, setCelebData]           = useState(null); // { checkInId, place }
  const [celebScreen, setCelebScreen]       = useState('celebrate'); // 'celebrate' | 'link'
  const [humidorCigars, setHumidorCigars]   = useState([]);
  const [humidorLoading, setHumidorLoading] = useState(false);
  const [selectedCigar, setSelectedCigar]   = useState(null);
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  // ── Effects ───────────────────────────────────────────────────

  useEffect(() => { loadFavorites(); }, []);

  useEffect(() => {
    if (activeTab === 'my_spots') loadMyCheckins();
  }, [activeTab]);

  useEffect(() => {
    if (results.length > 0) results.forEach(p => fetchAISummary(p));
  }, [results]); // eslint-disable-line

  useEffect(() => {
    if (celebData && celebScreen === 'celebrate') {
      // Bounce in — useNativeDriver: false is required for web
      Animated.spring(celebScale, { toValue: 1, useNativeDriver: false, bounciness: 18 }).start();
      // Auto-advance to cigar linker after 1.8s
      const t = setTimeout(() => {
        loadHumidorCigars();
        setCelebScreen('link');
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [celebData, celebScreen]); // eslint-disable-line

  // ── Data loaders ──────────────────────────────────────────────

  const loadFavorites = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'lounge_favorites'));
      const map = {};
      snap.forEach(d => { map[d.id] = d.data(); });
      setFavorites(map);
    } catch (_) {}
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
      setMyCheckins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (_) {}
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
      setHumidorCigars(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.fullName || c.cigarName)
      );
    } catch (_) { setHumidorCigars([]); }
    setHumidorLoading(false);
  };

  // ── Favorites ─────────────────────────────────────────────────

  const toggleFavorite = async (place) => {
    const pid = place.id || place.placeId;
    const uid = auth.currentUser?.uid;

    // Always update local state immediately for instant visual feedback
    if (favorites[pid]) {
      setFavorites(prev => { const n = { ...prev }; delete n[pid]; return n; });
    } else {
      const data = {
        placeId: pid,
        name: place.displayName?.text || place.name || '',
        address: place.formattedAddress || place.address || '',
        rating: place.rating || null,
        savedAt: new Date().toISOString(),
      };
      setFavorites(prev => ({ ...prev, [pid]: data }));
    }

    // Persist to Firestore only when signed in
    if (!uid) return;
    const fref = doc(db, 'users', uid, 'lounge_favorites', pid);
    try {
      if (favorites[pid]) {
        await deleteDoc(fref);
      } else {
        const data = {
          placeId: pid,
          name: place.displayName?.text || place.name || '',
          address: place.formattedAddress || place.address || '',
          rating: place.rating || null,
          savedAt: new Date().toISOString(),
        };
        await setDoc(fref, data);
      }
    } catch (_) {}
  };

  // ── Search ────────────────────────────────────────────────────

  const doSearch = useCallback(async (lat, lng, queryStr) => {
    setLoading(true);
    setResults([]);
    setHasSearched(true);
    try {
      const radiusMeters = radiusMiles * 1609.34;
      const textQuery = (queryStr || searchText).trim()
        ? `cigar lounge ${(queryStr || searchText).trim()}`
        : 'cigar lounge cigar bar tobacco shop';
      const resp = await fetch('/api/lounges/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textQuery, lat, lng, radiusMeters }),
      });
      let places = (await resp.json()).places || [];
      if (lat && lng) {
        places.forEach(p => {
          if (p.location) p._miles = haversine(lat, lng, p.location.latitude, p.location.longitude);
        });
        places.sort((a, b) => (a._miles || 999) - (b._miles || 999));
      }
      setResults(places);
      loadCheckinCounts(places.map(p => p.id));
    } catch (e) { console.error('[Lounges] search error:', e); }
    setLoading(false);
  }, [radiusMiles, searchText]);

  const handleGPS = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      Alert.alert('Location unavailable', 'Please search by city or zip code.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
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

  const loadCheckinCounts = async (placeIds) => {
    const counts = {};
    await Promise.all(placeIds.map(async (pid) => {
      try {
        const snap = await getDoc(doc(db, 'lounge_meta', pid));
        if (snap.exists()) counts[pid] = snap.data().checkinCount || 0;
      } catch (_) {}
    }));
    setCheckinCounts(prev => ({ ...prev, ...counts }));
  };

  const fetchAISummary = async (place) => {
    if (aiSummaries[place.id] !== undefined || aiLoading[place.id]) return;
    setAiLoading(prev => ({ ...prev, [place.id]: true }));
    try {
      const cacheSnap = await getDoc(doc(db, 'lounge_summaries', place.id));
      const cacheData = cacheSnap.exists() ? cacheSnap.data() : null;
      const ageDays = cacheData?.cachedAt
        ? (Date.now() - new Date(cacheData.cachedAt).getTime()) / 86400000
        : Infinity;
      if (cacheData?.summary && ageDays < 30 && !/cozy/i.test(cacheData.summary)) {
        setAiSummaries(prev => ({ ...prev, [place.id]: cacheData.summary }));
        setAiLoading(prev => ({ ...prev, [place.id]: false }));
        return;
      }
    } catch (_) {}
    try {
      const revResp = await fetch('/api/lounges/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: place.id }),
      });
      const reviews = ((await revResp.json()).reviews || [])
        .slice(0, 5).map(r => r.text?.text || r.originalText?.text || '').filter(Boolean);
      if (!reviews.length) {
        setAiSummaries(prev => ({ ...prev, [place.id]: place.generativeSummary?.overview?.text || null }));
        setAiLoading(prev => ({ ...prev, [place.id]: false }));
        return;
      }
      const aiResp = await fetch('/api/lounges/ai-summary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: place.id, placeName: place.displayName?.text, reviews }),
      });
      const summary = (await aiResp.json()).summary || null;
      setAiSummaries(prev => ({ ...prev, [place.id]: summary }));
      if (summary) {
        try {
          await setDoc(doc(db, 'lounge_summaries', place.id), {
            summary, name: place.displayName?.text, cachedAt: new Date().toISOString(),
          });
        } catch (_) {}
      }
    } catch (_) {
      setAiSummaries(prev => ({ ...prev, [place.id]: null }));
    }
    setAiLoading(prev => ({ ...prev, [place.id]: false }));
  };

  // ── Check-in: Step 1 ──────────────────────────────────────────

  const openCheckin = (place) => {
    setCheckinPlace(place);
    setCheckinNote('');
    setCheckinVibe(null);
    setCheckinPhoto(null);
  };

  const pickCheckinPhoto = () => {
    if (Platform.OS === 'web' && fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCheckinPhoto({ uri: URL.createObjectURL(file), file });
  };

  const submitCheckin = async () => {
    if (!checkinPlace) return;
    setCheckinSubmitting(true);
    const uid = auth.currentUser?.uid;

    // Preview mode or not signed in — show full celebration flow without Firestore
    if (!uid) {
      const place = checkinPlace;
      const pid = place.id || place.placeId;
      setCheckinCounts(prev => ({ ...prev, [pid]: (prev[pid] || 0) + 1 }));
      setCheckinPlace(null);
      celebScale.setValue(0);
      setCelebScreen('celebrate');
      setSelectedCigar(null);
      setCelebData({ checkInId: 'preview_' + Date.now(), place });
      setCheckinSubmitting(false);
      return;
    }

    try {
      let photoUrl = null;
      if (checkinPhoto?.file) {
        try {
          const sref = storageRef(storage, `checkin_photos/${uid}/${Date.now()}.jpg`);
          await uploadBytes(sref, checkinPhoto.file);
          photoUrl = await getDownloadURL(sref);
        } catch (_) {}
      }

      const pid = checkinPlace.id || checkinPlace.placeId;
      const docRef = await addDoc(collection(db, 'lounge_checkins'), {
        placeId: pid,
        placeName: checkinPlace.displayName?.text || checkinPlace.name || '',
        placeAddress: checkinPlace.formattedAddress || checkinPlace.address || '',
        userId: uid,
        userEmail: auth.currentUser?.email || '',
        note: checkinNote.trim() || null,
        photoUrl,
        vibe: checkinVibe,
        cigar: null,
        cigarBrand: null,
        cigarImage: null,
        humidorLogId: null,
        checkedInAt: serverTimestamp(),
      });

      // Bump global count
      const metaRef = doc(db, 'lounge_meta', pid);
      const metaSnap = await getDoc(metaRef);
      const current = metaSnap.exists() ? (metaSnap.data().checkinCount || 0) : 0;
      await setDoc(metaRef, {
        checkinCount: current + 1,
        name: checkinPlace.displayName?.text || checkinPlace.name || '',
      }, { merge: true });

      setCheckinCounts(prev => ({ ...prev, [pid]: (prev[pid] || 0) + 1 }));

      // Move to celebration
      const place = checkinPlace;
      setCheckinPlace(null);
      celebScale.setValue(0);
      setCelebScreen('celebrate');
      setSelectedCigar(null);
      setCelebData({ checkInId: docRef.id, place });
    } catch (e) {
      console.error('[Check-in] error:', e);
    }
    setCheckinSubmitting(false);
  };

  // ── Check-in: Step 2 — Link cigar ────────────────────────────

  const linkCigar = async () => {
    if (!selectedCigar || !celebData) return;
    setLinkSubmitting(true);
    try {
      const cigarName = selectedCigar.fullName || selectedCigar.cigarName || '';
      await updateDoc(doc(db, 'lounge_checkins', celebData.checkInId), {
        cigar: cigarName,
        cigarBrand: selectedCigar.cigarBrand || null,
        cigarImage: selectedCigar.image || null,
        humidorLogId: selectedCigar.id,
        cigarLinkedAt: serverTimestamp(),
      });
      if (activeTab === 'my_spots') loadMyCheckins();
    } catch (_) {}
    closeCelebration();
    setLinkSubmitting(false);
  };

  const skipCigarLink = () => {
    if (activeTab === 'my_spots') loadMyCheckins();
    closeCelebration();
  };

  const closeCelebration = () => {
    setCelebData(null);
    setCelebScreen('celebrate');
    setSelectedCigar(null);
    setHumidorCigars([]);
  };

  // ── Render helpers ────────────────────────────────────────────

  const getPhotoUrls = (place, max = 6) => {
    if (!MAPS_KEY || !place.photos?.length) return [];
    return place.photos.slice(0, max).map(
      p => `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=800&key=${MAPS_KEY}`
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
      .filter(([, kw]) => kw.some(k => name.includes(k)))
      .map(([brand]) => brand);
  };

  const isOpenNow = (place) =>
    place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow ?? null;

  const openDirections = (addr) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  const callPlace = (place) => {
    const phone = place.nationalPhoneNumber;
    if (!phone) return;
    const url = `tel:${phone.replace(/\D/g, '')}`;
    // Use location.href for tel: on web — window.open() causes Safari to go blank
    if (Platform.OS === 'web') window.location.href = url;
    else Linking.openURL(url);
  };

  const cardWidth = isDesktop ? Math.min(680, width - 64) : width - 32;

  // ── Render: Search result card ────────────────────────────────

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
          <View style={s.photoWrap}>
            {photoUrls.length > 0 ? (
              <ScrollView
                horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                style={{ width: cardWidth, height: 220 }}
                onScroll={e => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                  setPhotoIndices(prev => ({ ...prev, [place.id]: idx }));
                }}
              >
                {photoUrls.map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={{ width: cardWidth, height: 220 }} resizeMode="cover" />
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
            <TouchableOpacity style={s.favBtn} onPress={() => toggleFavorite(place)} activeOpacity={0.75}>
              <Icon name={isFav ? 'star' : 'star-outline'} size={20} color={isFav ? '#FFD700' : 'rgba(255,255,255,0.85)'} />
            </TouchableOpacity>
            {photoUrls.length > 1 && (
              <View style={s.dotsRow}>
                {photoUrls.map((_, i) => (
                  <View key={i} style={[s.dot, i === activePhotoIdx && s.dotActive]} />
                ))}
              </View>
            )}
          </View>

          <View style={s.infoWrap}>
            <Text style={s.placeName} numberOfLines={2}>{place.displayName?.text || 'Cigar Spot'}</Text>
            <Text style={s.placeAddr} numberOfLines={2}>{place.formattedAddress}</Text>
            <View style={s.metaRow}>
              <StarRating rating={place.rating} count={place.userRatingCount} />
              {place._miles != null && <Text style={s.distText}>{place._miles.toFixed(1)} mi away</Text>}
            </View>
            {(pills.length > 0 || brands.length > 0) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsRow}>
                {pills.map(p => <PillTag key={p.label} label={p.label} color={p.color} />)}
                {brands.map(b => <PillTag key={b} label={`✓ ${b}`} color="#1B5E20" bg="#e8f5e9" />)}
              </ScrollView>
            )}
            {count > 0 && (
              <Text style={s.humiCount}>🔥 {count} HUMI {count === 1 ? 'member has' : 'members have'} been here</Text>
            )}
            <View style={s.aiWrap}>
              {summaryLoading ? (
                <View style={s.aiLoadRow}>
                  <ActivityIndicator size="small" color="#8B4513" />
                  <Text style={s.aiLoadText}>Reading the reviews...</Text>
                </View>
              ) : summary ? (
                <>
                  <View style={s.aiLabelRow}>
                    <Text style={s.aiLabel}>✦ HUMI Says</Text>
                    <Text style={s.aiAttribution}>Based on Google Reviews</Text>
                  </View>
                  <Text style={s.aiText}>{summary}</Text>
                </>
              ) : summary === null ? (
                <Text style={s.aiNone}>No reviews to analyze yet — be the first to check in!</Text>
              ) : null}
            </View>
            <View style={s.actionsRow}>
              <TouchableOpacity style={s.actionBtn} onPress={() => openDirections(place.formattedAddress)}>
                <Icon name="navigate-outline" size={15} color="#8B4513" />
                <Text style={s.actionBtnText}>Directions</Text>
              </TouchableOpacity>
              {place.nationalPhoneNumber && (
                <TouchableOpacity style={s.actionBtn} onPress={() => callPlace(place)}>
                  <Icon name="call-outline" size={15} color="#8B4513" />
                  <Text style={s.actionBtnText}>Call</Text>
                </TouchableOpacity>
              )}
              {(isBeta || IS_PREVIEW) ? (
                <TouchableOpacity style={[s.actionBtn, s.checkinBtn]} onPress={() => openCheckin(place)}>
                  <Icon name="checkmark-circle-outline" size={15} color="#fff" />
                  <Text style={[s.actionBtnText, { color: '#fff' }]}>Check In</Text>
                </TouchableOpacity>
              ) : (
                <View style={[s.actionBtn, s.checkinBtn, { opacity: 0.45 }]}>
                  <Icon name="time-outline" size={15} color="#fff" />
                  <Text style={[s.actionBtnText, { color: '#fff' }]}>Coming Soon</Text>
                </View>
              )}
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
      <ScrollView contentContainerStyle={[s.list, isDesktop && s.listDesktop]} showsVerticalScrollIndicator={false}>
        {/* Saved */}
        <View style={[s.mySection, { width: cardWidth }]}>
          <Text style={s.mySectionTitle}>⭐ Saved Spots</Text>
          {favList.length === 0 ? (
            <View style={s.myEmptyBox}>
              <Text style={s.myEmptyText}>Tap the star on any spot to save it here for quick access.</Text>
            </View>
          ) : favList.map(([favId, fav]) => (
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
                <TouchableOpacity style={s.mySpotBtn} onPress={() => openDirections(fav.address)}>
                  <Icon name="navigate-outline" size={15} color="#8B4513" />
                </TouchableOpacity>
                {(isBeta || IS_PREVIEW) && (
                  <TouchableOpacity
                    style={[s.mySpotBtn, { backgroundColor: '#8B4513', borderColor: '#8B4513' }]}
                    onPress={() => openCheckin({ id: favId, placeId: favId, displayName: { text: fav.name }, formattedAddress: fav.address })}
                  >
                    <Icon name="checkmark-circle-outline" size={15} color="#fff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.mySpotBtn} onPress={() => toggleFavorite({ id: favId, ...fav })}>
                  <Icon name="star" size={15} color="#FFD700" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Check-in history */}
        <View style={[s.mySection, { width: cardWidth }]}>
          <Text style={s.mySectionTitle}>📍 Your Check-Ins</Text>
          {myCheckinsLoading ? (
            <ActivityIndicator color="#8B4513" style={{ marginVertical: 20 }} />
          ) : myCheckins.length === 0 ? (
            <View style={s.myEmptyBox}>
              <Text style={s.myEmptyText}>Your check-ins will appear here once you visit a spot.</Text>
            </View>
          ) : myCheckins.map(ci => {
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
                  {/* Linked cigar from humidor */}
                  {ci.cigar ? (
                    <View style={s.myCheckinCigarRow}>
                      {ci.cigarImage ? (
                        <Image source={{ uri: ci.cigarImage }} style={s.myCheckinCigarThumb} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 14 }}>🚬</Text>
                      )}
                      <View>
                        <Text style={s.myCheckinCigarName} numberOfLines={1}>{ci.cigar}</Text>
                        {ci.cigarBrand ? <Text style={s.myCheckinCigarBrand}>{ci.cigarBrand}</Text> : null}
                      </View>
                    </View>
                  ) : null}
                  {ci.note ? <Text style={s.myCheckinNote} numberOfLines={2}>{ci.note}</Text> : null}
                  {dateStr ? <Text style={s.myCheckinDate}>{dateStr}</Text> : null}
                </View>
              </View>
            );
          })}
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
          <View style={s.tabToggle}>
            {[
              { key: 'search',   icon: 'search-outline', label: 'Search'   },
              { key: 'my_spots', icon: 'star-outline',   label: 'My Spots' },
            ].map(t => (
              <TouchableOpacity
                key={t.key}
                style={[s.tabBtn, activeTab === t.key && s.tabBtnActive]}
                onPress={() => setActiveTab(t.key)}
              >
                <Icon name={t.icon} size={14} color={activeTab === t.key ? '#8B4513' : 'rgba(255,255,255,0.7)'} />
                <Text style={[s.tabBtnText, activeTab === t.key && s.tabBtnTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Search view */}
      {activeTab === 'search' && (
        <>
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
                  onSubmitEditing={() => doSearch(userLocation?.lat, userLocation?.lng, searchText)}
                  returnKeyType="search"
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Icon name="close-circle" size={18} color="#ccc" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={s.searchBtn} onPress={() => doSearch(userLocation?.lat, userLocation?.lng, searchText)} activeOpacity={0.8}>
                <Text style={s.searchBtnText}>Search</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.gpsBtn} onPress={handleGPS} activeOpacity={0.8} disabled={gpsLoading}>
              {gpsLoading ? <ActivityIndicator size="small" color="#8B4513" /> : <Icon name="locate-outline" size={18} color="#8B4513" />}
              <Text style={s.gpsBtnText}>{gpsLoading ? 'Finding you...' : 'Use My Location'}</Text>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.radiusRow}>
              {RADIUS_OPTIONS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[s.radiusPill, radiusMiles === r && s.radiusPillActive]}
                  onPress={() => setRadiusMiles(r)}
                >
                  <Text style={[s.radiusPillText, radiusMiles === r && s.radiusPillTextActive]}>{r} mi</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

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

      {/* My Spots view */}
      {activeTab === 'my_spots' && renderMySpots()}

      {/* Hidden file input (web) */}
      {Platform.OS === 'web' && (
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      )}

      {/* ── Check-in Overlay (Step 1) ── */}
      {!!checkinPlace && (
        <View style={s.overlayFullScreen}>
          <TouchableOpacity style={s.overlayBackdrop} activeOpacity={1} onPress={() => setCheckinPlace(null)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Check In</Text>
              <Text style={s.modalSubtitle} numberOfLines={2}>
                {checkinPlace?.displayName?.text || checkinPlace?.name}
              </Text>

              {/* Location photo */}
              <TouchableOpacity style={checkinPhoto ? s.photoPreviewWrap : s.photoPickBtn} onPress={pickCheckinPhoto} activeOpacity={0.8}>
                {checkinPhoto ? (
                  <>
                    <Image source={{ uri: checkinPhoto.uri }} style={s.photoPreview} resizeMode="cover" />
                    <View style={s.photoEditBadge}>
                      <Icon name="camera-outline" size={14} color="#fff" />
                    </View>
                  </>
                ) : (
                  <>
                    <Icon name="camera-outline" size={24} color="#8B4513" />
                    <Text style={s.photoPickText}>Add a photo</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Note */}
              <TextInput
                style={s.noteInput}
                placeholder="How's it going here? (optional)"
                placeholderTextColor="#bbb"
                value={checkinNote}
                onChangeText={setCheckinNote}
                multiline
                numberOfLines={2}
              />

              {/* Vibe */}
              <Text style={s.modalLabel}>How's the vibe?</Text>
              <View style={s.vibeRow}>
                {VIBE_OPTIONS.map(v => (
                  <TouchableOpacity
                    key={v.val}
                    style={[s.vibeBtn, checkinVibe === v.val && s.vibeBtnActive]}
                    onPress={() => setCheckinVibe(checkinVibe === v.val ? null : v.val)}
                    activeOpacity={0.75}
                  >
                    <Text style={s.vibeEmoji}>{v.emoji}</Text>
                    <Text style={[s.vibeLabel, checkinVibe === v.val && s.vibeLabelActive]}>{v.label}</Text>
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
                  : <Text style={s.checkinSubmitText}>Check In</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setCheckinPlace(null)} style={s.modalCancel} activeOpacity={0.7}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* ── Celebration (Step 2a) ── */}
      {!!celebData && celebScreen === 'celebrate' && (
        <View style={s.celebFullScreen}>
          <Animated.View style={[s.celebCard, { transform: [{ scale: celebScale }] }]}>
            <Text style={s.celebEmoji}>🎉</Text>
            <Text style={s.celebTitle}>You're checked in!</Text>
            <Text style={s.celebPlace} numberOfLines={2}>
              {celebData?.place?.displayName?.text || celebData?.place?.name}
            </Text>
            <Text style={s.celebSub}>Finding your humidor...</Text>
            <ActivityIndicator color="#8B4513" style={{ marginTop: 8 }} />
          </Animated.View>
        </View>
      )}

      {/* ── Cigar Linker (Step 2b) ── */}
      {!!celebData && celebScreen === 'link' && (
        <View style={s.overlayFullScreen}>
          <TouchableOpacity style={s.overlayBackdrop} activeOpacity={1} onPress={skipCigarLink} />
          <View style={s.linkCard}>
              <Text style={s.linkTitle}>What are you smoking?</Text>
              <Text style={s.linkSub}>Tag a cigar from your humidor and it'll be tied to this check-in forever.</Text>

              {humidorLoading ? (
                <View style={s.humidorLoadRow}>
                  <ActivityIndicator color="#8B4513" />
                  <Text style={s.humidorLoadText}>Loading your humidor...</Text>
                </View>
              ) : humidorCigars.length === 0 ? (
                <View style={s.humidorEmptyBox}>
                  <Text style={s.humidorEmptyText}>No cigars in your humidor yet. Scan a band to add your first one.</Text>
                </View>
              ) : (
                <ScrollView style={s.humidorList} showsVerticalScrollIndicator={false}>
                  {humidorCigars.map(cigar => {
                    const name = cigar.fullName || cigar.cigarName || '';
                    const brand = cigar.cigarBrand || '';
                    const isSelected = selectedCigar?.id === cigar.id;
                    return (
                      <TouchableOpacity
                        key={cigar.id}
                        style={[s.humidorItem, isSelected && s.humidorItemSelected]}
                        onPress={() => setSelectedCigar(isSelected ? null : cigar)}
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
                          <Text style={[s.humidorItemName, isSelected && { color: '#8B4513' }]} numberOfLines={1}>{name}</Text>
                          {brand ? <Text style={s.humidorItemBrand}>{brand}</Text> : null}
                        </View>
                        {isSelected && <Icon name="checkmark-circle" size={22} color="#8B4513" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {selectedCigar && (
                <TouchableOpacity
                  style={[s.checkinSubmitBtn, { marginTop: 16 }, linkSubmitting && { opacity: 0.6 }]}
                  onPress={linkCigar}
                  disabled={linkSubmitting}
                >
                  {linkSubmitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.checkinSubmitText}>Tag This Cigar</Text>}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={s.modalCancel} onPress={skipCigarLink} activeOpacity={0.7}>
                <Text style={s.modalCancelText}>Skip for now</Text>
              </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5ede3' },

  // ── Header ──────────────────────────────────────────────────
  header: {
    backgroundColor: '#8B4513',
    paddingTop: Platform.OS === 'web' ? 24 : 58,
    paddingBottom: 20,
    paddingHorizontal: 22,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 27, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 3, fontStyle: 'italic' },

  tabToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12, padding: 4, gap: 3,
  },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 9 },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  tabBtnTextActive: { color: '#7A3B10' },

  // ── Search area ─────────────────────────────────────────────
  searchWrap: { backgroundColor: '#faf7f3', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0d5c8' },
  searchWrapDesktop: { paddingHorizontal: 32 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12,
    gap: 8, borderWidth: 1.5, borderColor: '#e0d5c8',
    shadowColor: '#8B4513', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  searchInput: { flex: 1, height: 46, fontSize: 15, color: '#333', outlineStyle: 'none' },
  searchBtn: { backgroundColor: '#8B4513', borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', height: 46 },
  searchBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#8B4513', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  gpsBtnText: { color: '#8B4513', fontWeight: '700', fontSize: 13 },
  radiusRow: { marginTop: 10, flexDirection: 'row' },
  radiusPill: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, borderWidth: 1.5, borderColor: '#d4c4b0', marginRight: 8, backgroundColor: '#fff' },
  radiusPillActive: { backgroundColor: '#8B4513', borderColor: '#8B4513' },
  radiusPillText: { fontSize: 13, color: '#888', fontWeight: '600' },
  radiusPillTextActive: { color: '#fff' },

  // ── List ────────────────────────────────────────────────────
  list: { padding: 16, alignItems: 'center' },
  listDesktop: { paddingHorizontal: 32 },
  loadingWrap: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 15, color: '#888' },
  emptyWrap: { alignItems: 'center', paddingVertical: 70, paddingHorizontal: 36 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: '#3d2510', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9c7b62', textAlign: 'center', lineHeight: 21 },

  // ── Card ────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 20,
    shadowColor: '#7A3B10', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 5,
    borderWidth: 1, borderColor: '#e8ddd0', overflow: 'hidden',
  },
  cardInner: { flexDirection: 'column' },
  photoWrap: { position: 'relative', width: '100%', height: 230, overflow: 'hidden' },
  photoPlaceholder: { backgroundColor: '#ede0cc', alignItems: 'center', justifyContent: 'center' },
  dotsRow: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 8, height: 8, borderRadius: 4 },
  favBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.40)', borderRadius: 20,
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  },
  openBadge: { position: 'absolute', bottom: 12, left: 12, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  openBadgeOpen: { backgroundColor: 'rgba(20,90,26,0.90)' },
  openBadgeClosed: { backgroundColor: 'rgba(160,20,20,0.88)' },
  openBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // ── Card info section ────────────────────────────────────────
  infoWrap: { padding: 16, backgroundColor: '#fffbf5' },
  placeName: { fontSize: 18, fontWeight: '900', color: '#1a1a1a', marginBottom: 3, letterSpacing: 0.1 },
  placeAddr: { fontSize: 12, color: '#9a8878', marginBottom: 9, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, color: '#444', fontWeight: '800', marginRight: 2 },
  ratingCount: { fontSize: 12, color: '#bbb' },
  distText: {
    fontSize: 11, color: '#7A3B10', fontWeight: '800',
    backgroundColor: '#fef3ea', borderRadius: 12,
    paddingHorizontal: 9, paddingVertical: 3, overflow: 'hidden',
  },
  pillsRow: { flexDirection: 'row', marginBottom: 10 },
  pill: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, marginRight: 6, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  humiCount: {
    fontSize: 12, color: '#7A3B10', fontWeight: '800',
    backgroundColor: '#fde8d2', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 12, overflow: 'hidden',
  },
  aiWrap: {
    backgroundColor: '#faf7f3', borderRadius: 12, padding: 13, marginBottom: 12,
    borderWidth: 1, borderColor: '#e8ddd0',
    borderLeftWidth: 3, borderLeftColor: '#8B4513',
  },
  aiLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  aiLabel: { fontSize: 10, fontWeight: '900', color: '#8B4513', letterSpacing: 1.4, textTransform: 'uppercase' },
  aiAttribution: { fontSize: 10, color: '#b09a84', fontStyle: 'italic' },
  aiLoadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiLoadText: { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
  aiText: { fontSize: 13.5, color: '#3d2510', lineHeight: 22 },
  aiNone: { fontSize: 13, color: '#ccc', fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#8B4513', borderRadius: 20,
    paddingVertical: 9, paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  actionBtnText: { fontSize: 12, color: '#8B4513', fontWeight: '700' },
  checkinBtn: { backgroundColor: '#8B4513', borderColor: '#8B4513' },

  // My Spots
  mySection: { marginBottom: 28, alignSelf: 'center' },
  mySectionTitle: { fontSize: 15, fontWeight: '900', color: '#3d2510', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  myEmptyBox: {
    backgroundColor: '#fffbf5', borderRadius: 16, padding: 22,
    borderWidth: 1, borderColor: '#e8ddd0', alignItems: 'center',
  },
  myEmptyText: { fontSize: 14, color: '#b09a84', textAlign: 'center', lineHeight: 21 },
  mySpotCard: {
    backgroundColor: '#fffbf5', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#e8ddd0',
    shadowColor: '#7A3B10', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  mySpotName: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 2 },
  mySpotAddr: { fontSize: 12, color: '#9a8878' },
  mySpotActions: { flexDirection: 'row', gap: 8 },
  mySpotBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#8B4513', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  myCheckinCard: {
    backgroundColor: '#fffbf5', borderRadius: 16, padding: 14,
    flexDirection: 'row', gap: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#e8ddd0',
    shadowColor: '#7A3B10', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  myCheckinPhoto: { width: 64, height: 64, borderRadius: 12 },
  myCheckinTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  myCheckinPlace: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', flex: 1, marginRight: 8 },
  myCheckinVibe: { fontSize: 20 },
  myCheckinCigarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7,
    backgroundColor: '#faf7f3', borderRadius: 10, padding: 8,
    borderWidth: 1, borderColor: '#e8ddd0',
    borderLeftWidth: 3, borderLeftColor: '#8B4513',
  },
  myCheckinCigarThumb: { width: 34, height: 34, borderRadius: 7 },
  myCheckinCigarName: { fontSize: 12, fontWeight: '800', color: '#3d2510' },
  myCheckinCigarBrand: { fontSize: 11, color: '#9a8878' },
  myCheckinNote: { fontSize: 13, color: '#5a4a3a', marginTop: 4, lineHeight: 19 },
  myCheckinDate: { fontSize: 11, color: '#c0a88a', marginTop: 6, fontStyle: 'italic' },

  // Check-in overlay
  overlayFullScreen: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, justifyContent: 'flex-end',
  },
  overlayBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(30,10,0,0.55)',
  },
  modalCard: {
    backgroundColor: '#fffbf5', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 44,
    borderTopWidth: 3, borderTopColor: '#C4781A',
  },
  modalTitle: { fontSize: 23, fontWeight: '900', color: '#1a1a1a', marginBottom: 4, letterSpacing: 0.2 },
  modalSubtitle: { fontSize: 14, color: '#8B4513', fontWeight: '700', marginBottom: 18, fontStyle: 'italic' },
  modalLabel: { fontSize: 12, fontWeight: '900', color: '#7A3B10', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },

  photoPickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#c8b89a', borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 16, marginBottom: 16, backgroundColor: '#faf7f3',
  },
  photoPickText: { fontSize: 14, fontWeight: '700', color: '#8B4513' },
  photoPreviewWrap: { borderRadius: 14, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  photoPreview: { width: '100%', height: 150, borderRadius: 14 },
  photoEditBadge: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, padding: 7,
  },

  noteInput: {
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: '#333', marginBottom: 18,
    borderWidth: 1.5, borderColor: '#e0d5c8', minHeight: 64, textAlignVertical: 'top',
  },
  vibeRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  vibeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#e0d5c8', backgroundColor: '#fff',
  },
  vibeBtnActive: { borderColor: '#8B4513', backgroundColor: '#fef3ea', borderWidth: 2 },
  vibeEmoji: { fontSize: 26, marginBottom: 5 },
  vibeLabel: { fontSize: 11, color: '#9a8878', fontWeight: '700' },
  vibeLabelActive: { color: '#7A3B10' },
  checkinSubmitBtn: {
    backgroundColor: '#8B4513', borderRadius: 20, paddingVertical: 17,
    alignItems: 'center', marginBottom: 12,
    shadowColor: '#8B4513', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  checkinSubmitText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { color: '#b09a84', fontSize: 14 },

  // Celebration
  celebFullScreen: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, backgroundColor: 'rgba(30,10,0,0.65)',
    justifyContent: 'center', alignItems: 'center',
  },
  celebCard: {
    backgroundColor: '#fffbf5', borderRadius: 28, padding: 40,
    alignItems: 'center', marginHorizontal: 28,
    borderWidth: 2, borderColor: '#C4781A',
    shadowColor: '#7A3B10', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12,
  },
  celebEmoji: { fontSize: 62, marginBottom: 14 },
  celebTitle: { fontSize: 26, fontWeight: '900', color: '#1a1a1a', marginBottom: 6, textAlign: 'center', letterSpacing: 0.3 },
  celebPlace: { fontSize: 15, color: '#8B4513', fontWeight: '700', textAlign: 'center', marginBottom: 18, fontStyle: 'italic' },
  celebSub: { fontSize: 13, color: '#b09a84' },

  // Cigar linker
  linkCard: {
    backgroundColor: '#fffbf5', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 44, position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: '80%', borderTopWidth: 3, borderTopColor: '#C4781A',
  },
  linkTitle: { fontSize: 21, fontWeight: '900', color: '#1a1a1a', marginBottom: 6, letterSpacing: 0.2 },
  linkSub: { fontSize: 13, color: '#9a8878', lineHeight: 20, marginBottom: 18 },
  humidorLoadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20 },
  humidorLoadText: { fontSize: 13, color: '#b09a84' },
  humidorEmptyBox: { backgroundColor: '#faf7f3', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#e8ddd0' },
  humidorEmptyText: { fontSize: 13, color: '#b09a84', textAlign: 'center', lineHeight: 21 },
  humidorList: { maxHeight: 260 },
  humidorItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14,
    marginBottom: 7, borderWidth: 1.5, borderColor: '#e8ddd0', backgroundColor: '#fff',
  },
  humidorItemSelected: { borderColor: '#8B4513', borderWidth: 2, backgroundColor: '#fef3ea' },
  humidorThumb: { width: 46, height: 46, borderRadius: 10 },
  humidorThumbEmpty: { backgroundColor: '#ede0cc', alignItems: 'center', justifyContent: 'center' },
  humidorItemName: { fontSize: 13, fontWeight: '800', color: '#1a1a1a' },
  humidorItemBrand: { fontSize: 11, color: '#9a8878', marginTop: 2 },
});
