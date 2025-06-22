import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function HumidorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const action = params?.action;
  
  const [logs, setLogs] = useState([
    { 
      id: '1', 
      date: '2025-04-28', 
      cigarName: 'Montecristo No. 2', 
      rating: 4, 
      firstThird: 3,
      secondThird: 4,
      finish: 5,
      overall: 4,
      notes: 'Excellent draw, cedar and coffee notes',
      image: 'https://via.placeholder.com/300x150?text=Montecristo+No.+2',
      aiResponse: 'This appears to be a Montecristo No. 2, a premium Cuban cigar with a distinctive piramide (torpedo) shape. Known for its medium to full body profile, it typically features notes of wood, coffee, and mild spice. The band shows the classic Montecristo design with the fleur-de-lis symbol.'
    },
    { 
      id: '2', 
      date: '2025-04-25', 
      cigarName: 'Cohiba Robusto', 
      rating: 5, 
      firstThird: 5,
      secondThird: 4,
      finish: 5,
      overall: 5,
      notes: 'Perfect burn, complex flavors',
      image: 'https://via.placeholder.com/300x150?text=Cohiba+Robusto',
      aiResponse: 'This appears to be a Cohiba Robusto, a premium Cuban cigar with the distinctive yellow and black Cohiba band. This vitola is known for its 4.8 x 50 size and tends to deliver a medium to full-bodied smoking experience with notes of earth, cocoa, and subtle spice. The wrapper has a rich Colorado-Maduro color.'
    },
  ]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCigar, setSelectedCigar] = useState(null);
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState('');

  // Use useEffect to handle navigation params
  useEffect(() => {
    if (action === 'add') {
      setModalVisible(true);
    }
  }, [action]);
  
  // Cigar band images
  const cigarBands = [
    { id: '1', name: 'The Weekender', image: 'https://via.placeholder.com/200x100?text=The+Weekender' },
    { id: '2', name: 'Daily Draw', image: 'https://via.placeholder.com/200x100?text=Daily+Draw' },
    { id: '3', name: 'First Ash', image: 'https://via.placeholder.com/200x100?text=First+Ash' },
    { id: '4', name: 'The Don', image: 'https://via.placeholder.com/200x100?text=The+Don' },
  ];

  const pickImage = async () => {
    // Simplified for demo
    setImage('https://via.placeholder.com/300x300?text=Selected+Cigar');
  };
  
  const uploadImage = async () => {
    // This would handle the actual upload and saving to the log
    // For now, we'll just close the modal and add a dummy entry
    
    setModalVisible(false);
    setImage(null);
    
    // Add new entry to the log
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      cigarName: 'New Cigar Entry',
      rating: 3,
      firstThird: 3,
      secondThird: 3,
      finish: 3,
      overall: 3,
      notes: 'Added from the Humidor screen',
      image: 'https://via.placeholder.com/300x150?text=New+Cigar',
      aiResponse: 'This appears to be a premium hand-rolled cigar with a Colorado wrapper. The construction appears excellent with a smooth wrapper and well-formed cap. Based on the visible characteristics, this could be a medium to full-bodied cigar with notes of earth, wood, and possibly some sweetness.'
    };
    
    setLogs([newEntry, ...logs]);
  };

  const openDetailView = (cigar) => {
    setSelectedCigar(cigar);
    setDetailModalVisible(true);
  };

  const renderRatingStars = (rating) => {
    return (
      <View style={styles.ratingContainer}>
        {[...Array(5)].map((_, i) => (
          <Ionicons 
            key={i}
            name={i < rating ? "star" : "star-outline"} 
            size={16} 
            color="#8B4513" 
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Your Humidor</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle" size={32} color="#8B4513" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.logItem}
            onPress={() => openDetailView(item)}
          >
            <View style={styles.logItemContent}>
              <Image 
                source={{ uri: item.image }} 
                style={styles.thumbnailImage} 
                resizeMode="cover"
              />
              <View style={styles.logItemText}>
                <Text style={styles.date}>{item.date}</Text>
                <Text style={styles.cigarName}>{item.cigarName}</Text>
                {renderRatingStars(item.overall)}
                <Text style={styles.notes}>{item.notes}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      
      {/* Add Cigar Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Cigar</Text>
            
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                <Ionicons name="camera" size={40} color="#8B4513" />
                <Text style={styles.imagePickerText}>Capture Cigar</Text>
              </TouchableOpacity>
            )}
            
            {/* Add input fields for cigar details here */}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => {
                  setModalVisible(false);
                  setImage(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]}
                onPress={uploadImage}
                disabled={!image}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Cigar Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        {selectedCigar && (
          <View style={styles.modalContainer}>
            <View style={styles.detailModalContent}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setDetailModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#8B4513" />
              </TouchableOpacity>
              
              <ScrollView style={styles.detailScroll}>
                <Image 
                  source={{ uri: selectedCigar.image }} 
                  style={styles.detailImage} 
                  resizeMode="cover"
                />
                
                <Text style={styles.detailCigarName}>{selectedCigar.cigarName}</Text>
                <Text style={styles.detailDate}>{selectedCigar.date}</Text>
                
                <View style={styles.aiResponseContainer}>
                  <Text style={styles.aiResponseTitle}>AI Analysis</Text>
                  <Text style={styles.aiResponseText}>{selectedCigar.aiResponse}</Text>
                </View>
                
                <View style={styles.ratingsContainer}>
                  <Text style={styles.ratingsTitle}>Your Ratings</Text>
                  
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>First Third:</Text>
                    {renderRatingStars(selectedCigar.firstThird)}
                  </View>
                  
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>Second Third:</Text>
                    {renderRatingStars(selectedCigar.secondThird)}
                  </View>
                  
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>Finish:</Text>
                    {renderRatingStars(selectedCigar.finish)}
                  </View>
                  
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>Overall:</Text>
                    {renderRatingStars(selectedCigar.overall)}
                  </View>
                </View>
                
                <View style={styles.notesContainer}>
                  <Text style={styles.notesTitle}>Your Notes</Text>
                  <Text style={styles.notesText}>{selectedCigar.notes}</Text>
                </View>
                
                <View style={styles.badgesContainer}>
                  <Text style={styles.badgesTitle}>Badges Earned</Text>
                  <View style={styles.badgesList}>
                    {cigarBands.map((band) => (
                      <View key={band.id} style={styles.badgeItem}>
                        <Image source={{ uri: band.image }} style={styles.badgeImage} />
                        <Text style={styles.badgeName}>{band.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#8B4513',
    paddingTop: 50, // Extra padding for status bar
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 2,
  },
  logItem: {
    backgroundColor: 'white',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  logItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  logItemText: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  cigarName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  notes: {
    marginTop: 4,
    color: '#555',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  detailModalContent: {
    width: '90%',
    height: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  detailScroll: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 20,
  },
  imagePicker: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#8B4513',
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerText: {
    marginTop: 10,
    color: '#8B4513',
    fontWeight: '500',
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 16,
  },
  detailCigarName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  detailDate: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  aiResponseContainer: {
    backgroundColor: '#f7f2e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  aiResponseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
  },
  aiResponseText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  ratingsContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  ratingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabel: {
    width: 100,
    fontSize: 14,
    color: '#555',
  },
  notesContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  badgesContainer: {
    marginBottom: 20,
  },
  badgesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  badgesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  badgeItem: {
    width: '45%',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeImage: {
    width: 120,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    width: '45%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontWeight: 'bold',
    color: '#555',
  },
  saveButton: {
    backgroundColor: '#8B4513',
  },
  buttonText: {
    fontWeight: 'bold',
    color: 'white',
  },
});