import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { getBands } from './services/bands';

export default function VaultScreen() {
  const navigation = useNavigation();
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBand, setSelectedBand] = useState(null);

  useEffect(() => {
    fetchBands();
  }, []);

  // Add refresh on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBands();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchBands = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid || 'test-user';
      
      // Use the existing getBands function which already includes image URLs
      const userBands = await getBands(userId);
      
      // Filter to only show earned bands
      const earnedBands = userBands.filter(band => band.earned);
      
      setBands(earnedBands);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bands:', error);
      setLoading(false);
    }
  };

  const openBandDetails = (band) => {
    setSelectedBand(band);
  };

  const closeBandDetails = () => {
    setSelectedBand(null);
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
        <Text style={styles.headerText}>Your Band Vault</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {bands.length > 0 ? (
          <View style={styles.bandsGrid}>
            {bands.map(band => (
              <TouchableOpacity 
                key={band.id} 
                style={styles.bandCard}
                onPress={() => openBandDetails(band)}
              >
                <Image 
                  source={{ uri: band.image }} 
                  style={styles.bandImage} 
                  resizeMode="contain"
                />
                <Text style={styles.bandName}>{band.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No bands earned yet</Text>
            <Text style={styles.emptyStateSubtext}>Log cigars to earn band achievements</Text>
          </View>
        )}
      </ScrollView>

      {/* Band Detail Modal */}
      {selectedBand && (
        <Modal
          transparent={true}
          visible={!!selectedBand}
          animationType="fade"
          onRequestClose={closeBandDetails}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={closeBandDetails}
              >
                <Ionicons name="close" size={24} color="#8B4513" />
              </TouchableOpacity>
              
              <View style={styles.bandDetailContainer}>
                <Image 
                  source={{ uri: selectedBand.image }} 
                  style={styles.bandDetailImage} 
                  resizeMode="contain"
                />
                <Text style={styles.bandDetailName}>{selectedBand.name}</Text>
                <Text style={styles.bandDetailDescription}>
                  {selectedBand.description || "A unique achievement in your cigar journey."}
                </Text>
                {selectedBand.earnedDate && (
                  <Text style={styles.bandDetailDate}>
                    Earned on {new Date(selectedBand.earnedDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  content: {
    padding: 16,
  },
  bandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bandCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bandImage: {
    width: '100%',
    height: 80,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  bandName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Modal styles
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeModalButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  bandDetailContainer: {
    alignItems: 'center',
    width: '100%',
  },
  bandDetailImage: {
    width: '100%',
    height: 120,
    marginBottom: 16,
  },
  bandDetailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 12,
    textAlign: 'center',
  },
  bandDetailDescription: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  bandDetailDate: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  }
});