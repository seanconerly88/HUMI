// app/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator, Linking, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebaseConfig';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where } from 'firebase/firestore';
import { WebView } from 'react-native-webview';
import { signOut } from 'firebase/auth';

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
};

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  // Handle different YouTube URL formats
  let videoId = null;
  
  // Regular YouTube URLs
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  // YouTube Shorts URLs
  const shortsRegExp = /^.*((youtu.be\/)|(shorts\/))([^#&?]*).*/;
  const shortsMatch = url.match(shortsRegExp);
  
  if (match && match[2].length === 11) {
    // Standard YouTube video
    videoId = match[2];
  } else if (shortsMatch && shortsMatch[4]) {
    // YouTube Shorts
    videoId = shortsMatch[4];
  }
  
  return videoId;
};

export default function HomeScreen() {
  const navigation = useNavigation();
  
  // Initialize with empty arrays and objects
  const [recentCigars, setRecentCigars] = useState<CigarLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCigars: 0,
    avgRating: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>('Cigar Enthusiast');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [videoModalVisible, setVideoModalVisible] = useState<boolean>(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);


  
  // In the fetchUserData function, update the recommendations query
const fetchUserData = async () => {
  try {
    setLoading(true);
    
    // Get current user ID - ensure there's always a user ID
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
      
      // Query recommendations collection
      const recsRef = collection(db, 'recommendations');
      const recsQuery = query(
        recsRef,
        where('experienceLevel', '==', expertiseLevel),
        limit(10)
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
            link: data.link || '#'
          };
        });
        
        // Select random recommendations
        const randomRecs = [];
        const maxRecs = Math.min(3, allRecs.length);
        
        while (randomRecs.length < maxRecs && allRecs.length > 0) {
          const randomIndex = Math.floor(Math.random() * allRecs.length);
          randomRecs.push(allRecs[randomIndex]);
          allRecs.splice(randomIndex, 1);
        }
        
        setRecommendations(randomRecs);
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
        
        // Local image path priority logic (as you correctly implemented)
        const imageDisplayUrl = (data.localImageFilePath && data.localImageFilePath.startsWith('file://')) 
                                  ? data.localImageFilePath 
                                  : (data.imageUrl && data.imageUrl.trim().length > 0 
                                      ? data.imageUrl 
                                      : 'https://via.placeholder.com/100?text=Cigar');
        
        return {
          id: logDoc.id,
          cigarName: String(data.fullName || data.cigarName || 'Unknown Cigar'),
          imageUrl: imageDisplayUrl,
          dateDisplay: formatDate(data.submittedDate?.toDate ? 
            data.submittedDate.toDate() : new Date()),
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
            if (data.overall && typeof data.overall === 'number') {
                overallTotalRatingSum += data.overall;
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
      
    const avgRating = overallTotalCigars > 0 ? Number((overallTotalRatingSum / overallTotalCigars).toFixed(1)) : 0;
    
    setStats({
      totalCigars: overallTotalCigars,
      avgRating: avgRating
    });

    setLoading(false);
  } catch (error) {
    console.error('Error fetching data:', error);
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
  
  const handleRecommendationPress = (recommendation: Recommendation) => {
    const videoId = getYouTubeVideoId(recommendation.link);
    
    if (videoId) {
      // YouTube video - open in our custom player
      setCurrentVideoId(videoId);
      setVideoModalVisible(true);
    } else {
      // Regular link - open in browser
      Linking.openURL(recommendation.link);
    }
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
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>HUMI</Text>
        {/* Removed search and notification icons */}
        <TouchableOpacity onPress={handleLogout}>
          <Text style={{color:'white', fontSize:15}}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome back, {userName}
          </Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
        </View>
        
        {/* Stats Overview - Only showing 2 stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalCigars}</Text>
            <Text style={styles.statLabel}>Cigars Logged</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.avgRating}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
        
        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={navigateToHumidor}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.activityCardContainer}>
          {recentCigars.length > 0 ? (
            recentCigars.map((cigar) => (
              <TouchableOpacity 
                key={cigar.id} 
                style={styles.activityCard}
                // @ts-ignore
                onPress={() => navigation.navigate('Humidor', { id: cigar.id })}
              >
                <Image 
                  source={{ uri: cigar.imageUrl }}
                  style={styles.activityImage}
                />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{cigar.cigarName}</Text>
                  <Text style={styles.activityDate}>{cigar.dateDisplay}</Text>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons 
                        key={star}
                        name={star <= cigar.overall ? "star" : "star-outline"} 
                        size={16} 
                        color="#8B4513" 
                      />
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No cigars logged yet</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={navigateToAddCigar}
              >
                <Text style={styles.emptyStateButtonText}>Add Your First Cigar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Recommendations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended For You</Text>
        </View>
        
        <ScrollView 
          horizontal={true} 
          style={styles.recommendationsContainer} 
          showsHorizontalScrollIndicator={false}
        >
          {recommendations.map((rec, index) => (
            <TouchableOpacity 
              key={index.toString()}
              style={styles.recommendationCard}
              onPress={() => handleRecommendationPress(rec)}
            >
              <View style={styles.recommendationImageContainer}>
                {getYouTubeVideoId(rec.link) && (
                  <View style={styles.playButtonOverlay}>
                    <Ionicons name="play-circle" size={40} color="#8B4513" />
                  </View>
                )}
                <Ionicons
                  name={(rec.icon as any) || "document-outline"}
                  size={40}
                  color="#8B4513"
                />
              </View>
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
              <Text style={styles.recommendationSubtitle}>{rec.subtitle || rec.category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
      
      {/* YouTube Video Modal */}
      <Modal
        transparent={true}
        visible={videoModalVisible}
        animationType="fade"
        onRequestClose={() => setVideoModalVisible(false)}
      >
        <View style={styles.videoModalContainer}>
          <View style={styles.videoModalContent}>
            <View style={styles.videoModalHeader}>
              <Text style={styles.videoModalTitle}>HUMI</Text>
              <TouchableOpacity onPress={() => setVideoModalVisible(false)}>
                <Text style={styles.returnButton}>Return to HUMI</Text>
              </TouchableOpacity>
            </View>
            
            {currentVideoId && (
              <WebView
                source={{ uri: `https://www.youtube.com/embed/${currentVideoId}?autoplay=1` }}
                style={styles.webView}
                allowsFullscreenVideo={true}
                javaScriptEnabled={true}
              />
            )}
            
            <View style={styles.humiWatermark}>
              <Text style={styles.watermarkText}>HUMI</Text>
            </View>
          </View>
        </View>
      </Modal>
      
      <TouchableOpacity 
        style={styles.quickAddButton}
        onPress={navigateToAddCigar}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
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
});