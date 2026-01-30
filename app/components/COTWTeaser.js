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
  const [confirmedVote, setConfirmedVote] = useState(null); // Persisted vote from Firestore
  const [selectedBrand, setSelectedBrand] = useState(null); // Local selection (can change freely)
  const [userVoteChecked, setUserVoteChecked] = useState(false);
  const [votes, setVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Wait for Firebase auth to be ready before doing anything
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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
    console.log('[COTW] Loading voting data...');
    try {
      const userId = user?.uid;
      
      // Reset states when loading for a different/new user
      setConfirmedVote(null);
      setSelectedBrand(null);
      setUserVoteChecked(false);
      setSaveError(null);
      setSaveSuccess(false);
      
      // Load community vote totals
      const votesRef = doc(db, 'cotw_voting', 'inaugural_poll');
      const votesDoc = await getDoc(votesRef);
      
      if (votesDoc.exists()) {
        const data = votesDoc.data();
        console.log('[COTW] Poll data loaded:', data);
        setVotes(data.votes || {});
      } else {
        console.log('[COTW] No poll document exists yet');
      }
      
      // Check if current user has already voted
      if (userId) {
        const userVoteRef = doc(db, 'cotw_voting', 'inaugural_poll', 'user_votes', userId);
        const userVoteDoc = await getDoc(userVoteRef);
        if (userVoteDoc.exists()) {
          const savedBrandId = userVoteDoc.data().brandId;
          console.log('[COTW] User has existing vote:', savedBrandId);
          setConfirmedVote(savedBrandId);
          setSelectedBrand(savedBrandId);
        } else {
          console.log('[COTW] User has not voted yet');
        }
      }
      setUserVoteChecked(true);
    } catch (error) {
      console.error('[COTW] Error loading voting data:', error);
      setUserVoteChecked(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle brand selection (local only - no save yet)
  const handleSelect = (brandId) => {
    if (confirmedVote || saving) return; // Already voted or saving
    console.log('[COTW] Brand selected:', brandId);
    setSelectedBrand(brandId);
    setSaveError(null);
    setSaveSuccess(false);
  };

  // Save the vote using Firestore transaction for reliability
  const handleSaveVote = async () => {
    const userId = user?.uid;
    if (!userId || !selectedBrand || saving) return;
    
    console.log('[COTW] Saving vote for:', selectedBrand);
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      const votesRef = doc(db, 'cotw_voting', 'inaugural_poll');
      const userVoteRef = doc(db, 'cotw_voting', 'inaugural_poll', 'user_votes', userId);
      
      // Use transaction to atomically update vote counts and user vote
      await runTransaction(db, async (transaction) => {
        const votesDoc = await transaction.get(votesRef);
        
        // Check if user already voted (prevent double voting)
        const userVoteDoc = await transaction.get(userVoteRef);
        if (userVoteDoc.exists()) {
          throw new Error('You have already voted');
        }
        
        // Get current votes or initialize
        let currentVotes = {};
        if (votesDoc.exists()) {
          currentVotes = votesDoc.data().votes || {};
        }
        
        // Increment the selected brand count
        currentVotes[selectedBrand] = (currentVotes[selectedBrand] || 0) + 1;
        
        // Update or create the poll document (use merge to preserve other metadata)
        transaction.set(votesRef, { votes: currentVotes }, { merge: true });
        
        // Save user's vote record
        transaction.set(userVoteRef, {
          brandId: selectedBrand,
          votedAt: new Date().toISOString(),
          userEmail: user?.email || ''
        });
        
        console.log('[COTW] Transaction successful, new votes:', currentVotes);
        return currentVotes;
      });
      
      // Mark as confirmed and reload data
      setConfirmedVote(selectedBrand);
      setSaveSuccess(true);
      
      // Reload to get fresh totals
      const votesDoc = await getDoc(votesRef);
      if (votesDoc.exists()) {
        setVotes(votesDoc.data().votes || {});
        console.log('[COTW] Reloaded votes after save:', votesDoc.data().votes);
      }
      
    } catch (error) {
      console.error('[COTW] Error saving vote:', error);
      setSaveError(error.message || 'Failed to save vote. Please try again.');
    } finally {
      setSaving(false);
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
        <Text style={styles.revealDateText}>Selection revealed February 2nd</Text>
      </View>
      
      <Text style={styles.pollSubtitle}>
        {confirmedVote 
          ? 'Thanks for voting! Results update in real-time.' 
          : selectedBrand 
            ? 'Tap Save to lock in your vote'
            : 'Tap a brand to select, then save your vote'}
      </Text>
      
      <View style={styles.brandsContainer}>
        {BRANDS.map((brand) => {
          const percentage = getPercentage(brand.id);
          const isConfirmed = confirmedVote === brand.id;
          const isSelected = selectedBrand === brand.id;
          
          return (
            <Pressable
              key={brand.id}
              style={({ pressed }) => [
                styles.brandItem,
                isSelected && styles.brandItemSelected,
                confirmedVote && !isConfirmed && styles.brandItemVoted,
                pressed && !confirmedVote && styles.brandItemPressed
              ]}
              onPress={() => handleSelect(brand.id)}
              disabled={!!confirmedVote || saving}
            >
              <View style={styles.brandHeader}>
                <Text style={[
                  styles.brandName,
                  isSelected && styles.brandNameSelected
                ]}>
                  {brand.name}
                </Text>
                {confirmedVote && (
                  <Text style={[
                    styles.percentage,
                    isConfirmed && styles.percentageSelected
                  ]}>
                    {percentage}%
                  </Text>
                )}
              </View>
              
              {confirmedVote && (
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar,
                      { width: `${percentage}%` },
                      isConfirmed && styles.progressBarSelected
                    ]} 
                  />
                </View>
              )}
              
              {isConfirmed && (
                <View style={styles.yourVoteBadge}>
                  <Icon name="checkmark-circle" size={14} color="#8B4513" />
                  <Text style={styles.yourVoteText}>Your vote</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      
      {/* Save Button - shows when brand selected but not yet confirmed */}
      {selectedBrand && !confirmedVote && user && (
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveVote}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Vote</Text>
            </>
          )}
        </TouchableOpacity>
      )}
      
      {/* Auth required message for non-authenticated users */}
      {selectedBrand && !confirmedVote && !user && (
        <View style={styles.authMessage}>
          <Icon name="lock-closed" size={16} color="#888" />
          <Text style={styles.authMessageText}>Sign in to save your vote</Text>
        </View>
      )}
      
      {/* Success message */}
      {saveSuccess && (
        <View style={styles.successMessage}>
          <Icon name="checkmark-circle" size={16} color="#28a745" />
          <Text style={styles.successText}>Vote saved successfully!</Text>
        </View>
      )}
      
      {/* Error message */}
      {saveError && (
        <View style={styles.errorMessage}>
          <Icon name="alert-circle" size={16} color="#dc3545" />
          <Text style={styles.errorText}>{saveError}</Text>
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B4513',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  successText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    fontWeight: '500',
  },
  authMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  authMessageText: {
    fontSize: 14,
    color: '#888',
  },
});
