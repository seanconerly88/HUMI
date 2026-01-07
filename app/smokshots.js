import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  Modal, 
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Alert
} from 'react-native';
import Icon from './components/Icon';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebaseConfig';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

export default function SmokeShotsScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [downloading, setDownloading] = useState(false);
  
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const numColumns = isDesktop ? 4 : 3;
  const photoSize = (width - (numColumns + 1) * 8) / numColumns;

  useEffect(() => {
    fetchAllPhotos();
  }, []);

  const fetchAllPhotos = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) {
        setLoading(false);
        return;
      }

      const allPhotos = [];

      // 1. Fetch initial cigar photos from user's logs
      const logsRef = collection(db, 'users', userId, 'logs');
      const logsQuery = query(logsRef, orderBy('submittedDate', 'desc'));
      const logsSnapshot = await getDocs(logsQuery);
      
      logsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.imageUrl) {
          allPhotos.push({
            id: `log-${doc.id}`,
            imageUrl: data.imageUrl,
            localImageFilePath: data.localImageFilePath,
            cigarName: data.fullName || data.brand || 'Unknown Cigar',
            date: data.submittedDate?.toDate?.() || new Date(data.submittedDate),
            type: 'initial',
            logId: doc.id
          });
        }
      });

      // 2. Fetch moments images from logsMomentsImages
      const momentsRef = collection(db, 'logsMomentsImages');
      const momentsQuery = query(
        momentsRef, 
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const momentsSnapshot = await getDocs(momentsQuery);
      
      momentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.imageUrl) {
          allPhotos.push({
            id: `moment-${doc.id}`,
            imageUrl: data.imageUrl,
            cigarName: data.fullName || 'Cigar Moment',
            date: data.createdAt?.toDate?.() || new Date(),
            type: 'moment',
            note: data.note || '',
            logId: data.logId
          });
        }
      });

      // Sort by date (newest first)
      allPhotos.sort((a, b) => b.date - a.date);
      
      setPhotos(allPhotos);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching photos:', error);
      setLoading(false);
    }
  };

  const downloadPhoto = async (photo) => {
    try {
      setDownloading(true);
      
      if (Platform.OS === 'web') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
        
        if (isIOS && (isPWA || isSafari)) {
          if (navigator.share && navigator.canShare) {
            try {
              const response = await fetch(photo.imageUrl);
              const blob = await response.blob();
              const file = new File([blob], `smokeshot-${Date.now()}.jpg`, { type: 'image/jpeg' });
              
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                  files: [file],
                  title: photo.cigarName || 'Smoke Shot'
                });
                setDownloading(false);
                return;
              }
            } catch (shareError) {
              if (shareError.name !== 'AbortError') {
                console.log('Share failed, falling back to instructions');
              } else {
                setDownloading(false);
                return;
              }
            }
          }
          Alert.alert(
            'Save Photo',
            'Tap and hold the image, then select "Save to Photos" from the menu.',
            [{ text: 'OK' }]
          );
        } else {
          const link = document.createElement('a');
          link.href = photo.imageUrl;
          link.download = `smokeshot-${photo.cigarName.replace(/\s+/g, '-')}-${Date.now()}.jpg`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          Alert.alert('Success', 'Photo download started!');
        }
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant photo library access to save images.');
          setDownloading(false);
          return;
        }

        const filename = `smokeshot-${Date.now()}.jpg`;
        const fileUri = FileSystem.documentDirectory + filename;
        
        const downloadResult = await FileSystem.downloadAsync(
          photo.imageUrl,
          fileUri
        );

        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        Alert.alert('Saved!', 'Photo saved to your camera roll.');
      }
      
      setDownloading(false);
    } catch (error) {
      console.error('Error downloading photo:', error);
      Alert.alert('Error', 'Failed to download photo. Please try again.');
      setDownloading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderPhoto = ({ item }) => (
    <TouchableOpacity 
      style={[styles.photoContainer, { width: photoSize, height: photoSize }]}
      onPress={() => setSelectedPhoto(item)}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.photo}
        resizeMode="cover"
      />
      {item.type === 'moment' && (
        <View style={styles.momentBadge}>
          <Icon name="camera" size={12} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Smoke Shots</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={styles.loadingText}>Loading your photos...</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="images" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Photos Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start logging cigars and capturing moments to build your gallery!
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.photoCount}>{photos.length} photos</Text>
          <FlatList
            data={photos}
            renderItem={renderPhoto}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key={numColumns}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Photo Viewer Modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedPhoto(null)}
            >
              <Icon name="close" size={28} color="white" />
            </TouchableOpacity>

            {selectedPhoto && (
              <>
                <Image 
                  source={{ uri: selectedPhoto.imageUrl }} 
                  style={styles.fullImage}
                  resizeMode="contain"
                />
                
                <View style={styles.photoInfo}>
                  <Text style={styles.photoName}>{selectedPhoto.cigarName}</Text>
                  <Text style={styles.photoDate}>{formatDate(selectedPhoto.date)}</Text>
                  {selectedPhoto.note ? (
                    <Text style={styles.photoNote}>"{selectedPhoto.note}"</Text>
                  ) : null}
                  <View style={styles.typeBadge}>
                    <Icon 
                      name={selectedPhoto.type === 'moment' ? 'camera' : 'scan'} 
                      size={14} 
                      color="#8B4513" 
                    />
                    <Text style={styles.typeText}>
                      {selectedPhoto.type === 'moment' ? 'Moment' : 'Initial Scan'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.downloadButton}
                  onPress={() => downloadPhoto(selectedPhoto)}
                  disabled={downloading}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Icon name="download" size={20} color="white" />
                      <Text style={styles.downloadText}>Download Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#8B4513',
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  photoCount: {
    padding: 12,
    paddingLeft: 16,
    color: '#666',
    fontSize: 14,
  },
  gridContainer: {
    padding: 4,
  },
  photoContainer: {
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  momentBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(139, 69, 19, 0.8)',
    borderRadius: 12,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentDesktop: {
    maxWidth: 700,
    maxHeight: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullImage: {
    width: '100%',
    height: '60%',
    borderRadius: 12,
  },
  photoInfo: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  photoName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  photoDate: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 6,
  },
  photoNote: {
    fontSize: 14,
    color: '#ccc',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  typeText: {
    color: '#ddd',
    marginLeft: 6,
    fontSize: 12,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B4513',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 24,
  },
  downloadText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
