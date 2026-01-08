import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from './Icon';
import { auth, db } from '../../config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';

const BRANDS = [
  { id: 'oliva', name: 'Oliva' },
  { id: 'ep_carrillo', name: 'EP Carrillo' },
  { id: 'my_father', name: 'My Father' },
  { id: 'perdomo', name: 'Perdomo' },
  { id: 'montecristo', name: 'Montecristo' },
];

export default function COTWTeaser() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [votes, setVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  // Wait for Firebase auth to be ready before doing anything
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.uid || 'not logged in');
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Load voting data only after auth is ready
  useEffect(() => {
    if (authReady) {
      loadVotingData();
    }
  }, [authReady, user?.uid]);

  const loadVotingData = async () => {
    console.log('Loading voting data...');
    try {
      const userId = user?.uid;
      console.log('Loading for userId:', userId);
      
      const votesRef = doc(db, 'cotw_voting', 'inaugural_poll');
      const votesDoc = await getDoc(votesRef);
      
      if (votesDoc.exists()) {
        console.log('Votes data:', votesDoc.data());
        setVotes(votesDoc.data().votes || {});
      } else {
        console.log('No votes document exists yet');
      }
      
      if (userId) {
        const userVoteRef = doc(db, 'cotw_voting', 'inaugural_poll', 'user_votes', userId);
        const userVoteDoc = await getDoc(userVoteRef);
        if (userVoteDoc.exists()) {
          console.log('User already voted for:', userVoteDoc.data().brandId);
          setUserVote(userVoteDoc.data().brandId);
        } else {
          console.log('User has not voted yet');
        }
      }
    } catch (error) {
      console.error('Error loading voting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (brandId) => {
    console.log('handleVote called with brandId:', brandId);
    const userId = user?.uid;
    console.log('Current userId:', userId);
    console.log('Current userVote:', userVote);
    console.log('Current voting state:', voting);
    
    if (!userId) {
      console.log('User not authenticated - cannot vote');
      return;
    }
    if (userVote) {
      console.log('User has already voted - blocking');
      return;
    }
    if (voting) {
      console.log('Already voting in progress - blocking');
      return;
    }
    
    // OPTIMISTIC UPDATE: Show the vote immediately for instant feedback
    setUserVote(brandId);
    setVotes(prev => ({
      ...prev,
      [brandId]: (prev[brandId] || 0) + 1
    }));
    setVoting(true);
    
    try {
      const votesRef = doc(db, 'cotw_voting', 'inaugural_poll');
      const userVoteRef = doc(db, 'cotw_voting', 'inaugural_poll', 'user_votes', userId);
      
      await runTransaction(db, async (transaction) => {
        const userVoteDoc = await transaction.get(userVoteRef);
        
        if (userVoteDoc.exists()) {
          throw new Error('User has already voted');
        }
        
        const votesDoc = await transaction.get(votesRef);
        
        if (!votesDoc.exists()) {
          transaction.set(votesRef, {
            votes: { [brandId]: 1 },
            createdAt: new Date().toISOString(),
            status: 'active'
          });
        } else {
          const currentVotes = votesDoc.data().votes || {};
          transaction.update(votesRef, {
            [`votes.${brandId}`]: (currentVotes[brandId] || 0) + 1
          });
        }
        
        transaction.set(userVoteRef, {
          brandId,
          votedAt: new Date().toISOString(),
          userEmail: user?.email || ''
        });
      });
      
      console.log('Vote saved successfully!');
      // Vote already shown optimistically - no need to update again
      
    } catch (error) {
      console.error('Error voting:', error);
      // Revert optimistic update on error
      setUserVote(null);
      setVotes(prev => ({
        ...prev,
        [brandId]: Math.max((prev[brandId] || 1) - 1, 0)
      }));
      // Reload fresh data from server
      await loadVotingData();
    } finally {
      setVoting(false);
    }
  };

  const getTotalVotes = () => {
    return Object.values(votes).reduce((sum, count) => sum + count, 0);
  };

  const getPercentage = (brandId) => {
    const total = getTotalVotes();
    if (total === 0) return 0;
    return Math.round(((votes[brandId] || 0) / total) * 100);
  };

  if (loading) {
    return (
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>COMING SOON</Text>
      </View>
      
      <View style={styles.header}>
        <Icon name="trophy" size={28} color="#D4AF37" />
        <Text style={styles.title}>Cigar of the Week</Text>
      </View>
      
      <Text style={styles.description}>
        Discover hidden gems and iconic smokes curated just for you. Add them to your Humidor, 
        explore where to buy, and expand your palate beyond the usual.
      </Text>
      
      <View style={styles.divider} />
      
      <Text style={styles.pollTitle}>
        Help us choose the first-ever HUMI COTW brand!
      </Text>
      
      <View style={styles.revealDateContainer}>
        <Icon name="calendar" size={16} color="#8B4513" />
        <Text style={styles.revealDateText}>Selection revealed January 12th</Text>
      </View>
      
      <Text style={styles.pollSubtitle}>
        {userVote ? 'Thanks for voting! Results update in real-time.' : 'Tap to cast your vote'}
      </Text>
      
      <View style={styles.brandsContainer}>
        {BRANDS.map((brand) => {
          const percentage = getPercentage(brand.id);
          const isSelected = userVote === brand.id;
          
          return (
            <Pressable
              key={brand.id}
              style={({ pressed }) => [
                styles.brandItem,
                isSelected && styles.brandItemSelected,
                userVote && !isSelected && styles.brandItemVoted,
                pressed && !userVote && styles.brandItemPressed
              ]}
              onPress={() => handleVote(brand.id)}
              disabled={!!userVote || voting}
            >
              <View style={styles.brandHeader}>
                <Text style={[
                  styles.brandName,
                  isSelected && styles.brandNameSelected
                ]}>
                  {brand.name}
                </Text>
                {userVote && (
                  <Text style={[
                    styles.percentage,
                    isSelected && styles.percentageSelected
                  ]}>
                    {percentage}%
                  </Text>
                )}
              </View>
              
              {userVote && (
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar,
                      { width: `${percentage}%` },
                      isSelected && styles.progressBarSelected
                    ]} 
                  />
                </View>
              )}
              
              {isSelected && (
                <View style={styles.yourVoteBadge}>
                  <Icon name="checkmark-circle" size={14} color="#8B4513" />
                  <Text style={styles.yourVoteText}>Your vote</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      
      {voting && (
        <View style={styles.votingOverlay}>
          <ActivityIndicator size="small" color="#8B4513" />
          <Text style={styles.votingText}>Recording your vote...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0e6d3',
  },
  containerDesktop: {
    maxWidth: 600,
    alignSelf: 'center',
    marginHorizontal: 0,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#8B4513',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  pollTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  revealDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf5ef',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  revealDateText: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: 6,
  },
  pollSubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  brandsContainer: {
    gap: 10,
  },
  brandItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  brandItemSelected: {
    backgroundColor: '#faf5ef',
    borderColor: '#8B4513',
    borderWidth: 2,
  },
  brandItemVoted: {
    opacity: 0.8,
  },
  brandItemPressed: {
    backgroundColor: '#e8e0d5',
    transform: [{ scale: 0.98 }],
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  brandNameSelected: {
    color: '#8B4513',
    fontWeight: '600',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  percentageSelected: {
    color: '#8B4513',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e8e8e8',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#c4a574',
    borderRadius: 3,
  },
  progressBarSelected: {
    backgroundColor: '#8B4513',
  },
  yourVoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  yourVoteText: {
    fontSize: 12,
    color: '#8B4513',
    marginLeft: 4,
    fontWeight: '500',
  },
  votingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  votingText: {
    marginLeft: 8,
    color: '#8B4513',
    fontSize: 13,
  },
});
