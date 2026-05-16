// app/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator, Linking, Modal, Alert, Platform, useWindowDimensions } from 'react-native';
import Icon from './components/Icon';
import COTWTeaser from './components/COTWTeaser';
import ReferralCard from './components/ReferralCard';
import SocialFollowCard from './components/SocialFollowCard';
import PremiumNudgeCard from './components/PremiumNudgeCard';
import SmokingProfileSection from './components/SmokingProfileSection';
import UpgradeModal from './components/UpgradeModal';
import FeatureIntroModal from './components/FeatureIntroModal';
import LoadingScreen from './components/LoadingScreen';
import TrialEndedModal from './components/TrialEndedModal';
import PromoTrialEndedModal from './components/PromoTrialEndedModal';
import ThankYouTrialModal from './components/ThankYouTrialModal';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebaseConfig';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { DEV_MODE_ENABLED } from '../src/services/devModeData';
import {
  checkUserTrialStatus,
  grantWelcomeTrial,
  acknowledgeTrialExpiry,
  acknowledgePromoTrialExpiry,
  markThankYouSeen,
  activateSubscription,
} from '../src/services/subscriptionService';

// Type definitions
type CigarLog = {
  id: string;
  cigarName: string;
  imageUrl: string;
  dateDisplay: string;
  overall: number;
};

type Stats = {
  totalCigars: number;
  avgRating: number;
};

type Recommendation = {
  id: string;
  title: string;
  subtitle: string;
  category?: string;
  icon?: string;
  link: string;
  featured?: boolean;
  priority?: number;
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= 768;

  // Initialize with empty arrays and objects
  const [recentCigars, setRecentCigars] = useState<CigarLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCigars: 0,
    avgRating: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>('Cigar Enthusiast');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userExpertise, setUserExpertise] = useState<string>('beginner');
  const [showFeatureIntro, setShowFeatureIntro] = useState(false);
  const [featureIntroChecked, setFeatureIntroChecked] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTriggerReason, setUpgradeTriggerReason] = useState('general');
  const [nudgeRefreshKey, setNudgeRefreshKey] = useState(0);
  const [showTrialEndedModal, setShowTrialEndedModal] = useState(false);
  const [showPromoTrialEndedModal, setShowPromoTrialEndedModal] = useState(false);
  const [promoTrialType, setPromoTrialType] = useState<string>('creator');
  const [showThankYouTrialModal, setShowThankYouTrialModal] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);

  const trialCheckDoneRef = useRef(false);

  console.log('HomeScreen mounted, isWeb:', isWeb, 'isDesktop:', isDesktop);

  const openSupport = () => Linking.openURL('https://gethumi.co/humi-support');

  // Account deletion lives in the Profile screen (Delete Account & Cancel Subscription).
  // It cancels every active Stripe subscription server-side before removing Auth, so it
  // must be the single entry point — do not add a local delete path here.




  const fetchUserData = async () => {
    try {
      setLoading(true);

      if (DEV_MODE_ENABLED) {
        setUserName('HUMI Tester');
        setRecentCigars([
          { id: 'dev-1', cigarName: 'Padrón 1964 Anniversary Series Maduro', imageUrl: '', dateDisplay: 'Today', overall: 95 },
          { id: 'dev-2', cigarName: 'Arturo Fuente Opus X', imageUrl: '', dateDisplay: 'Yesterday', overall: 92 },
          { id: 'dev-3', cigarName: 'Oliva Serie V Melanio', imageUrl: '', dateDisplay: '2 days ago', overall: 88 },
        ]);
        setStats({ totalCigars: 3, avgRating: 92 });
        setRecommendations([
          { id: 'rec1', title: 'How to Cut a Torpedo', subtitle: 'Tips & Tricks', icon: 'cut-outline', link: '#' },
          { id: 'rec2', title: 'Perfect Whiskey Pairings', subtitle: 'Lifestyle', icon: 'wine-outline', link: '#' },
        ]);
        setLoading(false);
        setFeatureIntroChecked(true);
        return;
      }

      const userId = auth.currentUser?.uid || 'test-user';

      // First, get the user document to access expertise level
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnapshot = await getDoc(userDocRef);
        const userData = userDocSnapshot.data();

        // Set user name
        if (userData && userData.name) {
          setUserName(userData.name);
        } else if (auth.currentUser?.displayName) {
          setUserName(auth.currentUser.displayName);
        } else if (auth.currentUser?.email) {
          setUserName(auth.currentUser.email.split('@')[0]);
        } else {
          setUserName('Cigar Enthusiast');
        }

        // Get expertise level for recommendations
        const expertiseLevel = userData?.expertise || 'beginner';
        setUserExpertise(expertiseLevel);

        // Query recommendations collection
        const recsRef = collection(db, 'recommendations');
        const recsQuery = query(
          recsRef,
          where('experienceLevel', '==', expertiseLevel),
          limit(15)
        );

        const recsSnapshot = await getDocs(recsQuery);

        // Process recommendations
        if (!recsSnapshot.empty) {
          const allRecs = recsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || 'Recommendation',
              subtitle: data.subtitle || '',
              category: data.category || '',
              icon: data.icon || 'document-outline',
              link: data.link || '#',
              featured: data.featured || false,
              priority: data.priority || 999
            };
          });

          // Separate featured and regular content
          const featuredRecs = allRecs.filter(rec => rec.featured).sort((a, b) => (a.priority || 999) - (b.priority || 999));
          const regularRecs = allRecs.filter(rec => !rec.featured);

          // Check if beginner has seen featured content before
          const hasSeenFeatured = userData?.hasSeenFeaturedContent || false;

          let selectedRecs: Recommendation[] = [];

          if (expertiseLevel === 'beginner' && !hasSeenFeatured && featuredRecs.length >= 2) {
            // First time beginner: show 2 featured items + 1 random regular
            selectedRecs = [...featuredRecs.slice(0, 2)];
            if (regularRecs.length > 0) {
              const randomIndex = Math.floor(Math.random() * regularRecs.length);
              selectedRecs.push(regularRecs[randomIndex]);
            }
            
            // Mark that they've seen featured content
            const userDocRef = doc(db, 'users', userId);
            setDoc(userDocRef, { hasSeenFeaturedContent: true }, { merge: true }).catch(console.error);
          } else {
            // Regular rotation: mix featured and regular content randomly
            const combinedRecs = [...allRecs];
            const maxRecs = Math.min(3, combinedRecs.length);

            while (selectedRecs.length < maxRecs && combinedRecs.length > 0) {
              const randomIndex = Math.floor(Math.random() * combinedRecs.length);
              selectedRecs.push(combinedRecs[randomIndex]);
              combinedRecs.splice(randomIndex, 1);
            }
          }

          setRecommendations(selectedRecs);
        }
      } catch (error) {
        console.error('Error fetching user data or recommendations:', error);
        // Fallback recommendations
        setRecommendations([
          {
            id: 'rec1',
            title: 'How to Cut a Torpedo',
            subtitle: 'Tips & Tricks',
            icon: 'cut-outline',
            link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          },
          {
            id: 'rec2',
            title: 'Perfect Whiskey Pairings',
            subtitle: 'Lifestyle',
            icon: 'wine-outline',
            link: 'https://example.com/articles/whiskey-pairings'
          },
          {
            id: 'rec3',
            title: 'Upcoming Cigar Events',
            subtitle: 'Community',
            icon: 'calendar-outline',
            link: 'https://example.com/events'
          }
        ]);
      }

      // Get cigar logs from user's logs subcollection
      const cigarLogsRef = collection(db, 'users', userId, 'logs');

      // Query for the 3 MOST RECENT logs for display in "Recent Activity"
      const recentLogsQuery = query(
        cigarLogsRef,
        orderBy('submittedDate', 'desc'),
        limit(3)
      );
      const recentLogsSnapshot = await getDocs(recentLogsQuery);

      if (!recentLogsSnapshot.empty) {
        const recentCigarsData = recentLogsSnapshot.docs.map(logDoc => {
          const data = logDoc.data();

          // Firebase image priority logic
          const imageDisplayUrl = (data.imageUrl && data.imageUrl.trim().length > 0)
            ? data.imageUrl   // 👈 use Firebase URL first
            : (data.localImageFilePath && data.localImageFilePath.startsWith('file://'))
              ? data.localImageFilePath // fallback to local file
              : 'https://via.placeholder.com/100?text=Cigar'; // default


          return {
            id: logDoc.id,
            cigarName: String(data.fullName || data.cigarName || 'Unknown Cigar'),
            imageUrl: imageDisplayUrl,
            dateDisplay: formatDate(data.submittedDate?.toDate
              ? data.submittedDate.toDate()
              : (typeof data.submittedDate === 'string'
                ? new Date(data.submittedDate)
                : new Date())),
            overall: Number(data.overall || 0),
          };
        });
        setRecentCigars(recentCigarsData);
      } else {
        setRecentCigars([]); // Ensure it's an empty array if no recent logs
      }

      // Query for ALL logs to calculate accurate total stats
      let overallTotalCigars = 0;
      let overallTotalRatingSum = 0;
      let ratedCigarsCount = 0;
      try {
        // Check user document first if you store aggregated stats there (more efficient)
        const userDocForStats = doc(db, 'users', userId);
        const userStatsSnapshot = await getDoc(userDocForStats);
        if (userStatsSnapshot.exists()) {
          const uData = userStatsSnapshot.data();
          if (uData && typeof uData.totalCigars === 'number' && typeof uData.avgRating === 'number') {
            overallTotalCigars = uData.totalCigars;
            // If avgRating is stored, we can use it directly or derive sum if needed
            // For simplicity, if totalCigars and avgRating are stored, we can use them directly for stats.
            // If only totalCigars is stored, we still need to sum ratings from all logs for avg.
            // Let's assume for now we'll calculate from all logs if not directly available.
          }
        }

        // If not available on user doc or to ensure accuracy, query all logs
        // This can be omitted if you reliably update totalCigars and avgRating on the user document elsewhere
        const allLogsQuery = query(cigarLogsRef); // No limit, get all
        const allLogsSnapshot = await getDocs(allLogsQuery);

        overallTotalCigars = allLogsSnapshot.size; // Get the true total count
        allLogsSnapshot.forEach(logDoc => {
          const data = logDoc.data();
          // Only count cigars that have a rating towards the average
          if (data.overall && typeof data.overall === 'number' && data.overall > 0) {
            overallTotalRatingSum += data.overall;
            ratedCigarsCount++; // Increment our new counter
          }
        });

      } catch (statQueryError) {
        console.error("Error querying all logs for stats:", statQueryError);
        // Fallback: if querying all logs fails, stats might remain 0 or based on recent.
        // For robustness, if recentLogsSnapshot exists, we could use its count as a minimal fallback.
        if (overallTotalCigars === 0 && !recentLogsSnapshot.empty) {
          overallTotalCigars = recentLogsSnapshot.size;
          recentLogsSnapshot.docs.forEach(logDoc => {
            const data = logDoc.data();
            if (data.overall && typeof data.overall === 'number') {
              overallTotalRatingSum += data.overall;
            }
          });
        }
      }

      const avgRating = ratedCigarsCount > 0 ? Number((overallTotalRatingSum / ratedCigarsCount).toFixed(1)) : 0;

      setStats({
        totalCigars: overallTotalCigars,
        avgRating: avgRating
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Add a focus listener so the screen refreshes when navigated to
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserData(); // Re-fetch data when screen comes into focus
    });

    return unsubscribe;
  }, [navigation]);

  // Check if user should see the feature intro (after onboarding)
  useEffect(() => {
    const checkFeatureIntro = async () => {
      if (loading || featureIntroChecked) return;
      
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          setFeatureIntroChecked(true);
          return;
        }

        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Show feature intro only if user completed onboarding but hasn't seen the intro yet
          if (userData?.onboardingCompleted && !userData?.hasSeenFeatureIntro) {
            setShowFeatureIntro(true);
          }
        }
      } catch (error) {
        console.error('Error checking feature intro:', error);
      }
      
      setFeatureIntroChecked(true);
    };

    checkFeatureIntro();
  }, [loading, featureIntroChecked]);

  // Handle Stripe checkout redirect (fallback for when embedded checkout redirects instead of using onComplete)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const params = new URLSearchParams(window.location.search);
    const checkoutComplete = params.get('checkout_complete');
    const sessionId = params.get('session_id');
    if (checkoutComplete === 'true' && sessionId) {
      // Clean the URL immediately so this doesn't fire again on refresh
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      fetch('/api/stripe/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId })
      })
        .then(r => r.json())
        .then(async (data) => {
          if (data.verified) {
            await activateSubscription(userId, data.plan, data.subscriptionId);
            await setDoc(doc(db, 'users', userId), {
              tier: 'premium',
              subscriptionStatus: 'active',
              stripeSubscriptionId: data.subscriptionId || null,
              subscribedAt: new Date().toISOString(),
              plan: data.plan
            }, { merge: true });
            fetchUserData();
            console.log('[index] Checkout redirect: subscription activated for', userId);
          }
        })
        .catch(err => console.error('[index] Checkout redirect verify error:', err));
    }
  }, []);

  // Check trial status once per session after loading completes
  useEffect(() => {
    if (loading || trialCheckDoneRef.current || DEV_MODE_ENABLED) return;

    const runTrialCheck = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      trialCheckDoneRef.current = true;

      try {
        const status = await checkUserTrialStatus(userId);

        if (status.needsTrial) {
          await grantWelcomeTrial(userId, 'home_screen');
          if (status.showThankYou) {
            setShowThankYouTrialModal(true);
          }
        } else if (status.trialExpired) {
          // Acknowledge immediately so modal never reappears on next session open
          await acknowledgeTrialExpiry(userId);
          setShowTrialEndedModal(true);
        } else if (status.promoTrialExpired) {
          const pType = status.promoTrialType || 'creator';
          // Acknowledge immediately so modal never reappears on next session open
          await acknowledgePromoTrialExpiry(userId, pType);
          setPromoTrialType(pType);
          setShowPromoTrialEndedModal(true);
        }

        // Check if trial is active but ending soon (≤ 2 days)
        if (status.isPremium && !status.trialExpired && !status.promoTrialExpired) {
          let trialEnd: Date | null = null;

          const subRef = doc(db, 'users', userId, 'subscription', 'current');
          const subDoc = await getDoc(subRef);
          if (subDoc.exists()) {
            const subData = subDoc.data();
            if (subData.status === 'trial' && subData.trialEndDate) {
              trialEnd = subData.trialEndDate.toDate
                ? subData.trialEndDate.toDate()
                : new Date(subData.trialEndDate);
            }
          }

          if (!trialEnd) {
            const userRef = doc(db, 'users', userId);
            const userDocSnap = await getDoc(userRef);
            if (userDocSnap.exists()) {
              const ud = userDocSnap.data();
              if (ud?.trialEndDate) {
                trialEnd = new Date(ud.trialEndDate);
              }
            }
          }

          if (trialEnd) {
            const msLeft = trialEnd.getTime() - Date.now();
            const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
            if (daysLeft <= 2 && daysLeft > 0) {
              setTrialDaysRemaining(daysLeft);
            }
          }
        }
      } catch (err) {
        console.error('Trial status check error:', err);
      }
    };

    runTrialCheck();
  }, [loading]);

  // Handle feature intro completion
  const handleFeatureIntroComplete = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, {
          hasSeenFeatureIntro: true,
          featureIntroSeenAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error marking feature intro as seen:', error);
    }
    setShowFeatureIntro(false);
  };

  // Handle "Log Your First Cigar" button
  const handleLogFirstCigar = async () => {
    await handleFeatureIntroComplete();
    // Navigate to Humidor with action to open add cigar modal
    // @ts-ignore
    navigation.navigate('Humidor', { action: 'add' });
  };

  // Helper function to format dates
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 86400000) return 'Today';
    if (diff < 172800000) return 'Yesterday';
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
    return date.toLocaleDateString();
  };

  const navigateToHumidor = () => {
    // @ts-ignore
    navigation.navigate('Humidor');
  };

  const navigateToAddCigar = () => {
    // @ts-ignore
    navigation.navigate('Humidor', { action: 'add' });
  };

  const handleNudgeUpgradePress = (reason: string) => {
    setUpgradeTriggerReason(reason);
    setShowUpgradeModal(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('Signed out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 20 }]}>
        <Icon name="alert-circle" size={48} color="#8B4513" />
        <Text style={{ marginTop: 10, color: '#333', fontSize: 18, fontWeight: 'bold' }}>Something went wrong</Text>
        <Text style={{ marginTop: 5, color: '#666', textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity 
          onPress={() => { setError(null); setLoading(true); fetchUserData(); }}
          style={{ marginTop: 20, backgroundColor: '#8B4513', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
        >
          <Text style={{ color: 'white' }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('HomeScreen rendering content, recentCigars:', recentCigars.length, 'recommendations:', recommendations.length);

  return (
    <View style={[styles.container, { backgroundColor: '#f9f9f9' }]}>
      <View style={[styles.header, isDesktop ? webStyles.header : undefined]}>
        <View style={isDesktop ? webStyles.headerContent : undefined}>
          <Text style={[styles.headerText, isDesktop && webStyles.headerText]}>HUMI</Text>
          {isDesktop && (
            <Text style={webStyles.tagline}>Your Digital Cigar Lounge</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Icon name="menu" size={isDesktop ? 32 : 28} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={isDesktop ? webStyles.scrollContent : undefined}>
        <View style={isDesktop ? webStyles.mainContent : undefined}>
          {/* Welcome Section */}
          <View style={[styles.welcomeSection, isDesktop && webStyles.welcomeSection]}>
            <Text style={[styles.welcomeText, isDesktop && webStyles.welcomeText]}>
              Welcome back, {userName}
            </Text>
            <Text style={[styles.dateText, isDesktop && webStyles.dateText]}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>

          {/* Smoking Profile Section — directly beneath welcome header */}
          <SmokingProfileSection userId={auth.currentUser?.uid || ''} />

          {/* Trial Ending Soon Banner */}
          {trialDaysRemaining !== null && (
            <TouchableOpacity
              onPress={() => { setUpgradeTriggerReason('trial_ending_soon'); setShowUpgradeModal(true); }}
              style={{
                backgroundColor: '#FFF3CD',
                borderWidth: 1,
                borderColor: '#FBBF24',
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 16,
                marginHorizontal: 16,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Icon name="time" size={18} color="#92400E" />
              <Text style={{ flex: 1, fontSize: 13, color: '#92400E', fontWeight: '500' }}>
                Your trial ends {trialDaysRemaining === 1 ? 'tomorrow' : `in ${trialDaysRemaining} days`}. Tap to upgrade and keep Premium.
              </Text>
              <Icon name="chevron-forward" size={16} color="#92400E" />
            </TouchableOpacity>
          )}

          {/* Premium Nudge Card */}
          <PremiumNudgeCard onUpgradePress={handleNudgeUpgradePress} refreshKey={nudgeRefreshKey} />

          {/* Desktop Add Button */}
          {isDesktop && (
            <TouchableOpacity
              style={[webStyles.desktopAddButton, { marginHorizontal: 16, marginBottom: 4 }]}
              onPress={navigateToAddCigar}
            >
              <Icon name="add" size={24} color="white" />
              <Text style={webStyles.desktopAddButtonText}>Log New Cigar</Text>
            </TouchableOpacity>
          )}

          {/* Recent Activity */}
          <View style={[styles.sectionHeader, isDesktop && webStyles.sectionHeader]}>
            <Text style={[styles.sectionTitle, isDesktop && webStyles.sectionTitle]}>Recent Activity</Text>
            <TouchableOpacity onPress={navigateToHumidor}>
              <Text style={[styles.seeAllText, isDesktop && webStyles.seeAllText]}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.activityCardContainer, isDesktop && webStyles.activityCardContainer]}>
            {recentCigars.length > 0 ? (
              recentCigars.map((cigar) => (
                <TouchableOpacity
                  key={cigar.id}
                  style={[styles.activityCard, isDesktop && webStyles.activityCard]}
                  // @ts-ignore
                  onPress={() => navigation.navigate('Humidor', { id: cigar.id })}
                >
                  <Image
                    source={{ uri: cigar.imageUrl }}
                    style={[styles.activityImage, isDesktop && webStyles.activityImage]}
                  />
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityTitle, isDesktop && webStyles.activityTitle]}>{cigar.cigarName}</Text>
                    <Text style={styles.activityDate}>{cigar.dateDisplay}</Text>
                    {cigar.overall > 0 ? (
                      <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon
                            key={star}
                            name={star <= cigar.overall ? "star" : "star-outline"}
                            size={isDesktop ? 18 : 16}
                            color="#8B4513"
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.notRatedText}>Not Yet Rated</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.emptyState, isDesktop && webStyles.emptyState]}>
                <Text style={[styles.emptyStateText, isDesktop && webStyles.emptyStateText]}>No cigars logged yet</Text>
                <TouchableOpacity
                  style={[styles.emptyStateButton, isDesktop && webStyles.emptyStateButton]}
                  onPress={navigateToAddCigar}
                >
                  <Text style={styles.emptyStateButtonText}>Add Your First Cigar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Cigar of the Month */}
          <COTWTeaser />

          {/* Recommendations */}
          <View style={[styles.sectionHeader, isDesktop && webStyles.sectionHeader]}>
            <Text style={[styles.sectionTitle, isDesktop && webStyles.sectionTitle]}>
              Recommended for {userExpertise === 'beginner' ? 'Beginner Enthusiasts' : userExpertise === 'experienced' ? 'Experienced Enthusiasts' : 'Aficionados'}
            </Text>
          </View>

          {isDesktop ? (
            <View style={webStyles.recommendationsGrid}>
              {recommendations.map((rec, index) => (
                <TouchableOpacity
                  key={index.toString()}
                  style={[webStyles.recommendationCardGrid, rec.featured && styles.featuredCard]}
                  onPress={() => Linking.openURL(rec.link)}
                >
                  {rec.featured && (
                    <View style={styles.featuredBadge}>
                      <Icon name="star" size={16} color="#fff" />
                    </View>
                  )}
                  <View style={webStyles.recommendationImageContainerGrid}>
                    {rec.link.includes('youtube.com') || rec.link.includes('youtu.be') || rec.link.includes('instagram.com') ? (
                      <Icon name="play-circle" size={48} color="#8B4513" />
                    ) : (
                      <Icon
                        name={(rec.icon as any) || "document-outline"}
                        size={48}
                        color="#8B4513"
                      />
                    )}
                  </View>
                  <Text style={webStyles.recommendationTitleGrid}>{rec.title}</Text>
                  <Text style={webStyles.recommendationSubtitleGrid}>{rec.subtitle || rec.category}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal={true}
              style={styles.recommendationsContainer}
              showsHorizontalScrollIndicator={false}
            >
              {recommendations.map((rec, index) => (
                <TouchableOpacity
                  key={index.toString()}
                  style={[styles.recommendationCard, rec.featured && styles.featuredCard]}
                  onPress={() => Linking.openURL(rec.link)}
                >
                  {rec.featured && (
                    <View style={styles.featuredBadge}>
                      <Icon name="star" size={16} color="#fff" />
                    </View>
                  )}
                  <View style={styles.recommendationImageContainer}>
                    {rec.link.includes('youtube.com') || rec.link.includes('youtu.be') || rec.link.includes('instagram.com') ? (
                      <Icon name="play-circle" size={40} color="#8B4513" />
                    ) : (
                      <Icon
                        name={(rec.icon as any) || "document-outline"}
                        size={40}
                        color="#8B4513"
                      />
                    )}
                  </View>
                  <Text style={styles.recommendationTitle}>{rec.title}</Text>
                  <Text style={styles.recommendationSubtitle}>{rec.subtitle || rec.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Referral Card */}
          <ReferralCard />

          {/* Social Follow Card */}
          <SocialFollowCard />
        </View>
      </ScrollView>

      {/* Only show floating button on mobile */}
      {!isDesktop && (
        <TouchableOpacity
          style={styles.quickAddButton}
          onPress={navigateToAddCigar}
        >
          <Icon name="add" size={30} color="white" />
        </TouchableOpacity>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            {/* Menu Header */}
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>HUMI</Text>
              <TouchableOpacity 
                onPress={() => setMenuVisible(false)}
                style={styles.menuCloseButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Divider */}
            <View style={styles.menuDivider} />
            
            {/* Menu Items */}
            <TouchableOpacity 
              onPress={() => { setMenuVisible(false); navigation.getParent()?.navigate('SmokeShots' as never); }} 
              style={styles.menuItem}
            >
              <View style={styles.menuIconContainer}>
                <Icon name="images" size={22} color="#8B4513" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Your Photos</Text>
                <Text style={styles.menuItemSubtext}>Your cigar photo gallery</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => { setMenuVisible(false); navigation.getParent()?.navigate('Events' as never); }} 
              style={styles.menuItem}
            >
              <View style={styles.menuIconContainer}>
                <Icon name="calendar" size={22} color="#8B4513" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Events</Text>
                <Text style={styles.menuItemSubtext}>Upcoming cigar events</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => { setMenuVisible(false); navigation.getParent()?.navigate('Profile' as never); }} 
              style={styles.menuItem}
            >
              <View style={styles.menuIconContainer}>
                <Icon name="person-outline" size={22} color="#8B4513" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Profile & Settings</Text>
                <Text style={styles.menuItemSubtext}>Manage your account</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={openSupport} style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <Icon name="help-circle-outline" size={22} color="#8B4513" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Support</Text>
                <Text style={styles.menuItemSubtext}>Get help & feedback</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            {/* Divider */}
            <View style={styles.menuDivider} />
            
            <TouchableOpacity onPress={handleLogout} style={styles.menuItem}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#f5f5f5' }]}>
                <Icon name="log-out-outline" size={22} color="#666" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: '#666' }]}>Log Out</Text>
              </View>
            </TouchableOpacity>
            
            {/* Account deletion moved to the Profile screen — it now safely cancels
                the user's Stripe subscription before removing the Auth user. */}

            {/* Version */}
            <Text style={styles.menuVersion}>HUMI v1.0.9</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Feature Intro Modal - shows for new users after onboarding */}
      <FeatureIntroModal
        visible={showFeatureIntro}
        onComplete={handleFeatureIntroComplete}
        onLogFirstCigar={handleLogFirstCigar}
      />

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgradeSuccess={() => { setShowUpgradeModal(false); setNudgeRefreshKey(k => k + 1); }}
        triggerReason={upgradeTriggerReason}
      />

      {/* Trial Ended Modal - for welcome trial expiry */}
      {/* Acknowledgement already written to Firestore in useEffect; handlers just dismiss and refresh UI */}
      <TrialEndedModal
        visible={showTrialEndedModal}
        onContinueFree={() => setShowTrialEndedModal(false)}
        onUpgrade={() => {
          setShowTrialEndedModal(false);
          setNudgeRefreshKey(k => k + 1);
        }}
      />

      {/* Promo Trial Ended Modal - for creator/LSV trial expiry */}
      {/* Acknowledgement already written to Firestore in useEffect; handlers just dismiss and refresh UI */}
      <PromoTrialEndedModal
        visible={showPromoTrialEndedModal}
        promoType={promoTrialType}
        onContinueFree={() => setShowPromoTrialEndedModal(false)}
        onUpgrade={() => {
          setShowPromoTrialEndedModal(false);
          setNudgeRefreshKey(k => k + 1);
        }}
      />

      {/* Thank You Trial Modal - for newly granted trials */}
      <ThankYouTrialModal
        visible={showThankYouTrialModal}
        trialDays={5}
        onComplete={async () => {
          setShowThankYouTrialModal(false);
          await markThankYouSeen(auth.currentUser?.uid || '');
        }}
      />

    </View>
  );
}

// Update styles to include new components and adjust for two-stat layout
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#8B4513',
    paddingTop: 50, // Extra padding for status bar
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  welcomeSection: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', // Updated to space evenly for 2 cards
    padding: 16,
  },
  statCard: {
    width: '45%', // Updated width for 2 cards
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#8B4513',
  },
  activityCardContainer: {
    paddingHorizontal: 16,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  activityImage: {
    width: 80,
    height: 80,
  },
  activityContent: {
    flex: 1,
    padding: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  activityDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
  },
  recommendationsContainer: {
    paddingLeft: 16,
    paddingBottom: 30,
  },
  recommendationCard: {
    width: 180,
    backgroundColor: 'white',
    borderRadius: 10,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
    padding: 12,
  },
  recommendationImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    height: 80,
    position: 'relative',
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recommendationSubtitle: {
    fontSize: 12,
    color: '#8B4513',
  },
  featuredCard: {
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#8B4513',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  quickAddButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#8B4513',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Video Modal Styles
  videoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContent: {
    width: '90%',
    height: '70%',
    backgroundColor: 'black',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  videoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#8B4513',
  },
  videoModalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  returnButton: {
    color: 'white',
    fontWeight: 'bold',
    padding: 8,
  },
  webView: {
    flex: 1,
    backgroundColor: 'black',
  },
  humiWatermark: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    opacity: 0.5,
  },
  watermarkText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notRatedText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    letterSpacing: 2,
  },
  menuCloseButton: {
    padding: 4,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0e6d3',
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#faf5ef',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuItemSubtext: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  menuVersion: {
    textAlign: 'center',
    color: '#bbb',
    fontSize: 12,
    marginTop: 20,
  },
});

const webStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'column',
  },
  headerText: {
    fontSize: 32,
  },
  tagline: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  scrollContent: {
    alignItems: 'center',
  },
  mainContent: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 40,
  },
  welcomeSection: {
    paddingVertical: 30,
    paddingHorizontal: 0,
  },
  welcomeText: {
    fontSize: 32,
  },
  dateText: {
    fontSize: 18,
  },
  twoColumnLayout: {
    flexDirection: 'row',
    gap: 32,
  },
  leftColumn: {
    width: 280,
    flexShrink: 0,
  },
  rightColumn: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 36,
  },
  statLabel: {
    fontSize: 14,
  },
  desktopAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  desktopAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionHeader: {
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 22,
  },
  seeAllText: {
    fontSize: 16,
  },
  activityCardContainer: {
    gap: 16,
    marginBottom: 32,
    paddingHorizontal: 0,
  },
  activityCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
  },
  activityImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  activityTitle: {
    fontSize: 18,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    margin: 0,
  },
  emptyStateText: {
    fontSize: 18,
  },
  emptyStateButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  recommendationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 40,
  },
  recommendationCardGrid: {
    width: 220,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationImageContainerGrid: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    marginBottom: 16,
  },
  recommendationTitleGrid: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  recommendationSubtitleGrid: {
    fontSize: 14,
    color: '#8B4513',
  },
});
