import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Image, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import Icon from './components/Icon';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebaseConfig';
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { DEV_MODE_ENABLED } from '../src/services/devModeData';

const VALID_PROMO_CODES = {
  'CREATOR2026': { type: 'trial', days: 7, userType: 'creator', description: '7-day free trial' },
  'INNERCIRCLE2026': { type: 'lifetime', userType: 'inner_circle', description: 'Lifetime premium access' }
};

export default function ProfileScreen() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [userData, setUserData] = useState({
    totalCigars: 0,
    badges: 0,
    avgRating: 0,
    countries: 0
  });
  const [loading, setLoading] = useState(true);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const navigation = useNavigation();

  // Delete account = cancel subscription + remove Firebase Auth user. Content stays in Firebase.
  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not signed in');

      const idToken = await user.getIdToken();
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, idToken }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete account');
      }

      // Sign out locally — the Auth user is already deleted server-side, so the
      // client's session is invalid. signOut clears it cleanly and the RootNavigator
      // bounces back to the login screen.
      try { await signOut(auth); } catch (e) { /* user already gone server-side */ }

      setShowDeleteModal(false);
    } catch (err) {
      console.error('Delete account error:', err);
      setDeleteError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserData();
    });
    return unsubscribe;
  }, [navigation]);

  // Function to get how the user signed in
  const getSignInMethodName = () => {
    const provider = auth.currentUser?.providerData?.[0]?.providerId;
    
    switch(provider) {
      case 'password':
        return 'Email & Password';
      case 'google.com':
        return 'Google';
      case 'apple.com':
        return 'Apple';
      default:
        return provider || 'Unknown';
    }
  };

  // Function to get a display name for the user
  const getUserDisplayName = () => {
    // First try to use the display name
    if (auth.currentUser?.displayName) {
      return auth.currentUser.displayName;
    }
    
    // If no display name, try to use the email (first part)
    if (auth.currentUser?.email) {
      return auth.currentUser.email.split('@')[0];
    }
    
    // Fallback
    return "Cigar Enthusiast";
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);

      if (DEV_MODE_ENABLED) {
        setUserData({ totalCigars: 3, badges: 1, avgRating: 91.7, countries: 2 });
        setLoading(false);
        return;
      }

      const userId = auth.currentUser?.uid || 'test-user';
      const statsRef = collection(db, 'users', userId, 'stats');
      const statsSnapshot = await getDocs(statsRef);
      
      if (!statsSnapshot.empty) {
        const statsData = statsSnapshot.docs[0].data();
        const countriesCount = statsData.countries?.length || 0;
        
        setUserData({
          totalCigars: statsData.log_count || 0,
          badges: statsData.bands_earned || 0,
          avgRating: statsData.total_rating && statsData.log_count ? 
            parseFloat((statsData.total_rating / statsData.log_count).toFixed(1)) : 0,
          countries: countriesCount
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
    }
  };
  
  // Check if user signed in with email/password (for change password button)
  const isEmailPasswordUser = auth.currentUser?.providerData?.some(p => p.providerId === 'password');

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a code');
      return;
    }

    setPromoLoading(true);
    setPromoError('');
    setPromoSuccess('');

    try {
      const code = promoCode.trim().toUpperCase();
      const promoConfig = VALID_PROMO_CODES[code];
      
      if (!promoConfig) {
        setPromoError('Invalid code. Please check and try again.');
        setPromoLoading(false);
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setPromoError('Please sign in to use a promo code.');
        setPromoLoading(false);
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : {};

      if (userData.promoCodeUsed) {
        setPromoError('You have already used a promo code.');
        setPromoLoading(false);
        return;
      }

      if (promoConfig.type === 'lifetime') {
        await setDoc(userDocRef, {
          tier: 'premium',
          userType: promoConfig.userType,
          promoCodeUsed: code,
          promoCodeAppliedAt: serverTimestamp(),
          lifetimeAccess: true,
          updatedAt: serverTimestamp()
        }, { merge: true });

        const subRef = doc(db, 'users', user.uid, 'subscription', 'current');
        await setDoc(subRef, {
          status: 'lifetime',
          tier: 'premium',
          promoCode: code,
          createdAt: serverTimestamp()
        });

        setPromoSuccess('Lifetime premium access activated!');
        setPromoCode('');
      } else if (promoConfig.type === 'trial') {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + promoConfig.days);

        await setDoc(userDocRef, {
          tier: 'premium',
          userType: promoConfig.userType,
          promoCodeUsed: code,
          promoCodeAppliedAt: serverTimestamp(),
          trialEndDate: trialEnd,
          updatedAt: serverTimestamp()
        }, { merge: true });

        const subRef = doc(db, 'users', user.uid, 'subscription', 'current');
        await setDoc(subRef, {
          status: 'trial',
          tier: 'premium',
          promoCode: code,
          trialEndDate: trialEnd,
          createdAt: serverTimestamp()
        });

        setPromoSuccess(`${promoConfig.days}-day trial activated!`);
        setPromoCode('');
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
      setPromoError('Something went wrong. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Your Profile</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: auth.currentUser?.photoURL || 'https://via.placeholder.com/150?text=HUMI' }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.editAvatarButton}>
              <Icon name="camera" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{getUserDisplayName()}</Text>
          <Text style={styles.userStat}>Cigar Enthusiast</Text>

          {/* Replace statsRow with a single centered stat box */}
          <View style={styles.statsRowCentered}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userData.totalCigars}</Text>
              <Text style={styles.statLabel}>Cigars Logged</Text>
              <Text style={styles.ctaText}>Keep logging cigars to unlock your flavor profile</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Account Information</Text>
        </View>
        
        <View style={styles.settingsSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>
              {auth.currentUser?.email || "Not available"}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sign-in Method</Text>
            <Text style={styles.infoValue}>{getSignInMethodName()}</Text>
          </View>
          
          {isEmailPasswordUser && (
            <TouchableOpacity 
              style={styles.button}
              onPress={() => {
                // Add password reset functionality here
                Alert.alert("Coming Soon", "Password reset feature coming in a future update!");
              }}
            >
              <Text style={styles.buttonText}>Change Password</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Preferences</Text>
        </View>
        
        <View style={styles.settingsSection}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>Switch to dark theme</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#d3d3d3", true: "#8B4513" }}
              thumbColor={darkMode ? "#f5f5f5" : "#f5f5f5"}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Get alerts about new features</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#d3d3d3", true: "#8B4513" }}
              thumbColor={notifications ? "#f5f5f5" : "#f5f5f5"}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Private Account</Text>
              <Text style={styles.settingDescription}>Only you can see your cigars</Text>
            </View>
            <Switch
              value={privateAccount}
              onValueChange={setPrivateAccount}
              trackColor={{ false: "#d3d3d3", true: "#8B4513" }}
              thumbColor={privateAccount ? "#f5f5f5" : "#f5f5f5"}
            />
          </View>
        </View>
        
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Support</Text>
        </View>
        
        <View style={styles.settingsSection}>
          <TouchableOpacity 
            style={styles.supportRow}
            onPress={() => {
              setPromoCode('');
              setPromoError('');
              setPromoSuccess('');
              setShowPromoModal(true);
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="gift-outline" size={20} color="#8B4513" style={{ marginRight: 10 }} />
              <Text style={[styles.supportLabel, { color: '#8B4513', fontWeight: '600' }]}>Coupon Codes</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#8B4513" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.supportRow}>
            <Text style={styles.supportLabel}>Help Center</Text>
            <Icon name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.supportRow}>
            <Text style={styles.supportLabel}>Contact Us</Text>
            <Icon name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.supportRow}>
            <Text style={styles.supportLabel}>Privacy Policy</Text>
            <Icon name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.supportRow}>
            <Text style={styles.supportLabel}>Terms of Service</Text>
            <Icon name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={async () => {
            try {
              await signOut(auth);
              // The RootNavigator will handle navigation based on auth state
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }}
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => { setDeleteError(''); setShowDeleteModal(true); }}
        >
          <Text style={styles.deleteAccountButtonText}>Delete Account & Cancel Subscription</Text>
        </TouchableOpacity>
        <Text style={styles.deleteAccountHelper}>
          Deleting your account cancels your HUMI subscription. You won't be billed again.
        </Text>

        <Text style={styles.versionText}>HUMI v1.0.9</Text>
      </ScrollView>

      <Modal
        visible={showPromoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPromoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.promoModalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowPromoModal(false)}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            <Icon name="gift-outline" size={48} color="#8B4513" />
            <Text style={styles.promoModalTitle}>Coupon Codes</Text>
            <Text style={styles.promoModalSubtitle}>
              Enter a promo code to unlock premium features
            </Text>

            <TextInput
              style={styles.promoInput}
              placeholder="Enter code"
              placeholderTextColor="#999"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {promoError ? (
              <Text style={styles.promoErrorText}>{promoError}</Text>
            ) : null}

            {promoSuccess ? (
              <Text style={styles.promoSuccessText}>{promoSuccess}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.promoApplyButton, promoLoading && { opacity: 0.7 }]}
              onPress={handleApplyPromoCode}
              disabled={promoLoading}
            >
              {promoLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.promoApplyButtonText}>Apply Code</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account confirmation — makes the trade-off explicit: deleting the
          account is the same action as canceling the subscription. */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !deleteLoading && setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <Icon name="warning-outline" size={44} color="#d9534f" />
            <Text style={styles.deleteModalTitle}>Delete your HUMI account?</Text>

            <View style={styles.deleteModalBulletList}>
              <Text style={styles.deleteModalBullet}>• Your subscription will be canceled immediately</Text>
              <Text style={styles.deleteModalBullet}>• You will not be billed again — ever</Text>
              <Text style={styles.deleteModalBullet}>• You'll lose access to premium features right away</Text>
              <Text style={styles.deleteModalBullet}>• Your account login will be removed permanently</Text>
            </View>

            <Text style={styles.deleteModalFinePrint}>
              This cannot be undone. Deleting your account and canceling your subscription are the same action.
            </Text>

            {deleteError ? (
              <Text style={styles.deleteModalError}>{deleteError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.deleteConfirmButton, deleteLoading && { opacity: 0.7 }]}
              onPress={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.deleteConfirmButtonText}>Yes, Delete My Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteCancelButton}
              onPress={() => setShowDeleteModal(false)}
              disabled={deleteLoading}
            >
              <Text style={styles.deleteCancelButtonText}>Keep My Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    padding: 16,
    backgroundColor: '#8B4513',
    paddingTop: 50, // Extra padding for status bar
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e1e1e1',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8B4513',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  userStat: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionTitle: {
    padding: 16,
    backgroundColor: '#f7f2e9',
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  settingsSection: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#8B4513',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  supportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  supportLabel: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    margin: 20,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#d9534f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteAccountButton: {
    marginHorizontal: 20,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9534f',
  },
  deleteAccountButtonText: {
    color: '#d9534f',
    fontWeight: '600',
    fontSize: 15,
  },
  deleteAccountHelper: {
    marginHorizontal: 20,
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 17,
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 24,
    width: '88%',
    maxWidth: 420,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteModalBulletList: {
    alignSelf: 'stretch',
    marginBottom: 14,
  },
  deleteModalBullet: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 4,
  },
  deleteModalFinePrint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 17,
  },
  deleteModalError: {
    color: '#d9534f',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteConfirmButton: {
    backgroundColor: '#d9534f',
    borderRadius: 8,
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteConfirmButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  deleteCancelButton: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  deleteCancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  versionText: {
    textAlign: 'center',
    color: '#999',
    marginBottom: 30,
  },
  statsRowCentered: {
  flexDirection: 'row',
  justifyContent: 'center',
  width: '100%',
  marginTop: 20,
  },
  ctaText: {
  marginTop: 6,
  fontSize: 12,
  color: '#666',
  textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  promoModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  promoModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  promoModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  promoInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  promoErrorText: {
    color: '#d9534f',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  promoSuccessText: {
    color: '#5cb85c',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  promoApplyButton: {
    backgroundColor: '#8B4513',
    borderRadius: 8,
    padding: 14,
    width: '100%',
    alignItems: 'center',
  },
  promoApplyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
