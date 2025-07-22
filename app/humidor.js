import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, Image, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeCigarImage } from './services/openai';
import { Alert, ActivityIndicator } from 'react-native';
import { auth, db, storage } from '../config/firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateUserStats } from './services/userStats';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import BandWonModal from './components/BandWonModal';
import { checkForNewBands } from './services/bands';


export default function HumidorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const action = route.params?.action;
  const [logs, setLogs] = useState([]);
  const [editedCigar, setEditedCigar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bandWonModalVisible, setBandWonModalVisible] = useState(false);
  const [earnedBand, setEarnedBand] = useState(null);
  const [pendingBands, setPendingBands] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [aiAccuracyFeedback, setAiAccuracyFeedback] = useState(null); // 'up', 'down', or null
  const [showNameEditField, setShowNameEditField] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [processingModal, setProcessingModal] = useState(false);
  const [resultModal, setResultModal] = useState(false);
  const [selectedCigar, setSelectedCigar] = useState(null);
  const [image, setImage] = useState(null);
  const imageRef = useRef(null);
  const setImageWithRef = (uri) => {
    setImage(uri);
    imageRef.current = uri;
  };

  const [status, setStatus] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Taking the first puff...');
  const [loadingInterval, setLoadingInterval] = useState(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // New cigar entry form state
  const [newCigar, setNewCigar] = useState({
    cigarName: '',
    notes: '',
    overall: null
  });

  // Cigar band images (will be replaced with Firebase data later)
  const [cigarBands, setCigarBands] = useState([]);

  const cigarCaptureTips = [
    "Pro tip: Remove cellophane and focus on the band for best results",
    "Best results come from cigars without cellophane and bands in focus",
    "Like a sommelier needs a clear glass, our AI needs a clear view - no cellophane please",
    "Cigar wisdom: Remove the cellophane and show the band clearly for best results"
  ];

  // Helper function to convert blob to base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const selectRandomTip = () => {
    const randomIndex = Math.floor(Math.random() * cigarCaptureTips.length);
    setCurrentTipIndex(randomIndex);
  };


  // Load logs from Firebase when component mounts
  useEffect(() => {
    fetchCigarLogs();
    fetchUserBands();
  }, []);

  // Update when a cigar is selected for detail view
  useEffect(() => {
    if (selectedCigar) {
      setEditedCigar({ ...selectedCigar });
    }
  }, [selectedCigar]);

  // Also handle navigation params
  useEffect(() => {
    if (action === 'add') {
      setModalVisible(true);
    }
  }, [action]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (loadingInterval) {
        clearInterval(loadingInterval);
      }
    };
  }, [loadingInterval]);

  const fetchCigarLogs = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid || 'test-user';
      let combinedLogs = [];

      // Fetch from Firebase
      try {
        const logsRef = collection(db, 'users', userId, 'logs');
        const q = query(logsRef, orderBy('submittedDate', 'desc'));
        const querySnapshot = await getDocs(q);
        const firebaseLogs = querySnapshot.docs.map(doc => {
          const data = doc.data();
          let imageUri = 'https://via.placeholder.com/300x150?text=No+Image'; // Default

          // Priority: 1. Persistent Local File, 2. Firebase URL, 3. Placeholder
          if (data.localImageFilePath && data.localImageFilePath.startsWith('file://')) {
            imageUri = data.localImageFilePath;
          } else if (data.imageUrl && data.imageUrl.trim().length > 0) {
            imageUri = data.imageUrl;
          }

          return {
            id: doc.id,
            date: data.submittedDate?.toDate ? data.submittedDate.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            cigarName: data.fullName || 'Unknown Cigar',
            overall: data.overall || 0,
            notes: data.notes || '',
            image: imageUri, // Use the determined image URI
            aiResponse: data.description || (data.aiRawResponseSnapshot || '') // Fallback to raw if description is empty
          };
        });
        combinedLogs.push(...firebaseLogs);
      } catch (firebaseError) {
        console.error('Error fetching from Firebase:', firebaseError);
      }

      // Fetch from AsyncStorage (Offline Logs)
      try {
        const offlineCigarsJson = await AsyncStorage.getItem('offlineCigars');
        if (offlineCigarsJson) {
          let offlineCigars = JSON.parse(offlineCigarsJson);
          if (!Array.isArray(offlineCigars)) offlineCigars = []; // Ensure it's an array

          const offlineLogsMapped = offlineCigars.map(cigar => {
            let imageUri = 'https://via.placeholder.com/300x150?text=No+Image'; // Default
            if (cigar.localImageUri && cigar.localImageUri.startsWith('file://')) {
              imageUri = cigar.localImageUri;
            }
            return {
              id: cigar.offlineId,
              date: cigar.date ? new Date(cigar.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              cigarName: cigar.fullName || cigar.cigarName || 'Unknown Offline Cigar',
              overall: cigar.overall || 0,
              notes: cigar.notes || '',
              image: imageUri,
              aiResponse: cigar.description || (cigar.aiRawResponseSnapshot || ''),
              isOffline: true
            };
          });
          combinedLogs.push(...offlineLogsMapped);
        }
      } catch (offlineError) {
        console.error('Error fetching offline cigars:', offlineError);
      }

      combinedLogs.sort((a, b) => new Date(b.date || b.submittedDate) - new Date(a.date || a.submittedDate));
      setLogs(combinedLogs);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load cigar logs. Please try again.');
    }
  };

  // Handle AI accuracy feedback
  const handleAiFeedback = async (feedbackType) => {
    setAiAccuracyFeedback(feedbackType);

    if (feedbackType === 'down') {
      // Show the editable field when thumbs down
      setShowNameEditField(true);

      // Clear the cigar name to encourage user input
      setNewCigar({
        ...newCigar,
        cigarName: ''
      });
    }
  };

  // Function to reanalyze with corrected name
  const reanalyzeWithCorrectedName = async () => {
    if (!newCigar.cigarName || !image) return;

    setIsReanalyzing(true);

    try {
      const userId = auth.currentUser?.uid || 'test-user';

      // We're keeping the same image but sending a prompt hint with the corrected name
      const aiAnalysis = await analyzeCigarImage(image, userId, newCigar.cigarName);

      if (aiAnalysis) {
        setAiResponse(aiAnalysis);
        setIsReanalyzing(false);
      } else {
        setIsReanalyzing(false);
      }
    } catch (error) {
      console.error('Reanalysis error:', error);
      setIsReanalyzing(false);
    }
  };

  // Fetch user bands
  const fetchUserBands = async () => {
    try {
      const userId = auth.currentUser?.uid || 'test-user';
      const bandsRef = collection(db, 'users', userId, 'bands');
      const snapshot = await getDocs(bandsRef);

      if (!snapshot.empty) {
        const bands = await Promise.all(snapshot.docs.map(async (doc) => {
          const data = doc.data();
          // Get image URL from Firebase Storage
          try {
            const imageUrl = await getDownloadURL(ref(storage, `bands/${data.id}.png`));
            return {
              id: data.id,
              name: data.name,
              image: imageUrl
            };
          } catch (error) {
            console.error(`Error getting band image for ${data.id}:`, error);
            return {
              id: data.id,
              name: data.name,
              image: 'https://via.placeholder.com/200x100?text=' + data.name
            };
          }
        }));

        setCigarBands(bands);
      }
    } catch (error) {
      console.error('Error fetching bands:', error);
    }
  };

  const pickImage = async () => {
    // Ask user to choose camera or gallery
    Alert.alert(
      "Add Cigar Image",
      "Choose image source",
      [
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera permission is required');
              return;
            }

            let result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

            handleImageResult(result);
          }
        },
        {
          text: "Photo Library",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Media library permission is required');
              return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

            handleImageResult(result);
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const handleImageResult = async (result) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const pickedImageUri = result.assets[0].uri;
      console.log("Image picked:", pickedImageUri);

      try {
        // --- START: Force copy to persistent storage ---
        const filename = pickedImageUri.split('/').pop() || `cigar_${Date.now()}.jpg`; // Basic unique name
        const localPersistentUri = `${FileSystem.documentDirectory}${filename.replace(/[^a-zA-Z0-9._-]/g, '')}`; // Sanitize filename

        // Delete if it somehow already exists to prevent issues with copyAsync if overwriting is problematic
        const existingInfo = await FileSystem.getInfoAsync(localPersistentUri);
        if (existingInfo.exists) {
          await FileSystem.deleteAsync(localPersistentUri);
        }

        await FileSystem.copyAsync({ from: pickedImageUri, to: localPersistentUri });
        console.log("Image copied to persistent store for immediate use:", localPersistentUri);
        setImageWithRef(localPersistentUri); // Use this persistent URI for state and ref
        // --- END: Force copy to persistent storage ---
      } catch (copyError) {
        console.error("Error copying image to persistent storage in handleImageResult:", copyError);
        setImageWithRef(pickedImageUri); // Fallback to original picker URI if copy fails
        Alert.alert("Image Error", "Could not prepare image for analysis. Please try again.");
        return; // Stop if we can't prepare the image
      }

      setModalVisible(true); // Show the "Add New Cigar" modal
    }
  };

  // Handle AI analysis with loading messages
  const processImageWithAI = async () => {
    if (!image) return;

    setModalVisible(false);
    setProcessingModal(true);
    startLoadingMessages();

    try {
      const userId = auth.currentUser?.uid || 'test-user';
      const aiAnalysisResult = await analyzeCigarImage(image, userId); // Already a JS object
      console.log("Ai Response 123", aiAnalysisResult)

      if (loadingInterval) {
        clearInterval(loadingInterval);
        setLoadingInterval(null);
      }

      if (aiAnalysisResult) {
        setAiResponse(aiAnalysisResult); // Store AI result directly

        const bestMatch = aiAnalysisResult.fullName || aiAnalysisResult.cigarBrand || '';

        if (bestMatch) {
          aiAnalysisResult.cigarBrand = bestMatch.brand;
          aiAnalysisResult.cigarLine = bestMatch.line;
        }

        const cigarNameFromAI =
          aiAnalysisResult.fullName || aiAnalysisResult.cigarBrand || 'New Cigar Entry';

        setNewCigar({
          ...newCigar,
          cigarName: cigarNameFromAI,
        });

        setAiAccuracyFeedback(null);
        setShowNameEditField(false);
        setProcessingModal(false);
        setResultModal(true);
      } else {
        console.error('AI analysis returned null/empty string unexpectedly');
        if (loadingInterval) clearInterval(loadingInterval);
        setProcessingModal(false);
        setModalVisible(true);
        Alert.alert(
          'Error',
          'Failed to analyze image. No response from AI. Please try again.'
        );
      }
    } catch (error) {
      console.error('AI analysis process error:', error);
      if (loadingInterval) clearInterval(loadingInterval);
      setProcessingModal(false);
      setModalVisible(true);
      Alert.alert(
        'Error',
        'An error occurred while analyzing the image. Please try again.'
      );
    }
  };


  // Rotating loading messages
  const startLoadingMessages = () => {
    const messages = [
      "Taking the first puff...",
      "Savoring the flavor...",
      "Detecting tobacco notes...",
      "Analyzing cigar band...",
      "Identifying origin...",
      "Measuring ring gauge...",
      "Consulting our aficionado AI...",
      "Cross-referencing with known brands...",
      "Finalizing your cigar profile...",
      "Analyzing wrapper characteristics...",
      "Evaluating strength profile...",
      "Determining ideal pairings...",
      "Perfecting your tasting notes..."
    ];
    let index = 0;

    // Clear any existing interval
    if (loadingInterval) clearInterval(loadingInterval);

    // Set initial message
    setLoadingMessage(messages[0]);

    // Rotate through messages
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 2500);

    setLoadingInterval(interval);
  };

  const uploadCigar = async () => {
    if (isSaving) return;

    if (!newCigar.cigarName || newCigar.cigarName.trim() === "" || newCigar.cigarName.trim() === "New Cigar Entry") {
      Alert.alert('Missing Name', 'Please provide a name for the cigar before saving.');
      return;
    }
    // 'image' state should now hold the persistent local URI
    if (!image) {
      Alert.alert('Save Failed', 'No image was selected or the image reference is missing.');
      return;
    }

    setIsSaving(true);
    setStatus('Saving...');

    let successfullySavedOnline = false;
    // 'image' state IS our localImagePersistenceUri because handleImageResult now ensures it's a persistent copy
    const localImageToSave = image;

    try {
      const userId = auth.currentUser?.uid || 'test-user';
      let parsedAiData = {};
      try {
        if (aiResponse) {
          // parsedAiData = JSON.parse(aiResponse);
          parsedAiData = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;

        } else {
          parsedAiData = { fullName: "", description: "No AI response available.", aiError: true };
        }
      } catch (e) {
        console.error('Could not parse stored aiResponse for saving:', e, aiResponse);
        parsedAiData = { fullName: newCigar.cigarName, description: "AI data parsing failed.", aiError: true };
      }

      const finalCigarName = newCigar.cigarName.trim();
      let firebaseImageUrlAttempt = ''; // Attempt to get Firebase URL

      // --- Try to upload to Firebase Storage (silently on failure) ---
      if (imageRef.current) { // imageRef.current should also be the persistent local URI
        try {
          console.log('Attempting to upload image from URI to Firebase:', imageRef.current);
          const response = await fetch(imageRef.current);
          const blob = await response.blob();
          const firebaseFilename = `cigars/${userId}/${Date.now()}_${finalCigarName.replace(/\s+/g, '_')}.jpg`;
          const storageImageRef = ref(storage, firebaseFilename);
          await uploadBytes(storageImageRef, blob);
          firebaseImageUrlAttempt = await getDownloadURL(storageImageRef);
          console.log('Image uploaded successfully to Firebase Storage. URL:', firebaseImageUrlAttempt);
        } catch (imageUploadError) {
          console.error('Firebase Storage upload failed (will proceed with local image path):', imageUploadError);
          firebaseImageUrlAttempt = ''; // Ensure it's empty if Firebase upload fails
          // NO ALERT HERE - per your request for silent Firebase attempt
        }
      } else {
        console.warn('imageRef.current is null for Firebase upload. This should not happen if image state is set.');
      }
      // --- End Firebase Storage Upload Attempt ---

      let catalogData = {};
      let catalogSnapshot = null;
      try {
        if (parsedAiData.cigarBrand && parsedAiData.cigarLine) {
          const catalogCollectionRef = collection(db, 'cigarCatalog');
          const q = query(catalogCollectionRef, where('brand', '==', parsedAiData.cigarBrand || ''), where('line', '==', parsedAiData.cigarLine || ''));
          catalogSnapshot = await getDocs(q);
          if (!catalogSnapshot.empty) {
            catalogData = catalogSnapshot.docs[0].data();
          }
        }
      } catch (catalogError) {
        console.error('Error checking cigar catalog:', catalogError);
      }

      function deepRemoveUndefined(obj) {
        if (Array.isArray(obj)) {
          return obj.map(deepRemoveUndefined);
        } else if (obj && typeof obj === 'object') {
          return Object.fromEntries(
            Object.entries(obj)
              .filter(([_, v]) => v !== undefined)
              .map(([k, v]) => [k, deepRemoveUndefined(v)])
          );
        }
        return obj;
      }

      const cleanedAiResponse = deepRemoveUndefined(
        typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse
      );


      const logEntryData = {
        brand: catalogData.brand || parsedAiData.cigarBrand || '',
        line: catalogData.line || parsedAiData.cigarLine || '',
        fullName: finalCigarName,
        description: catalogData.description || parsedAiData.description || (parsedAiData.bandDescription || ''),
        originCountry: catalogData.originCountry || parsedAiData.originCountry || '',
        wrapperType: catalogData.wrapperType || parsedAiData.wrapperType || '',
        strength: catalogData.strength || parsedAiData.strength || '',
        commonNotes: catalogData.commonNotes || parsedAiData.commonNotes || '',
        recommendedPairings: catalogData.recommendedPairings || parsedAiData.recommendedPairings || '',
        notes: newCigar.notes || '',
        overall: typeof newCigar.overall === 'number' ? newCigar.overall : null,
        date: new Date(),
        submittedDate: new Date(),
        submittedBy: userId,
        imageUrl: firebaseImageUrlAttempt, // Store the Firebase URL (empty if failed)
        localImageFilePath: localImageToSave, // ALWAYS store the persistent local file path
        reviewed: false,
        aiAccuracyFeedback: aiAccuracyFeedback,
        userCorrected: showNameEditField || (finalCigarName !== (parsedAiData.fullName || '')),
        aiIdentified: !!(parsedAiData.cigarBrand || parsedAiData.fullName) && !parsedAiData.aiError,
        fromCatalog: !!(catalogSnapshot && !catalogSnapshot.empty),
        aiRawResponseSnapshot: JSON.stringify(cleanedAiResponse)
      };

      const userLogDocRef = await addDoc(collection(db, 'users', userId, 'logs'), logEntryData);
      console.log('Successfully saved to Firebase user logs:', userLogDocRef.id);
      successfullySavedOnline = true;

      if (!catalogData.brand && parsedAiData.cigarBrand) {
        try {
          const pendingCigarData = { ...logEntryData, userLogId: userLogDocRef.id };
          delete pendingCigarData.notes; delete pendingCigarData.overall;
          await addDoc(collection(db, 'pendingCigars'), pendingCigarData);
        } catch (pendingError) { console.error('Failed to add to pendingCigars:', pendingError); }
      }

      try {
        const statsLogData = { cigarName: finalCigarName, overall: newCigar.overall, body: logEntryData.strength, country: logEntryData.originCountry, submittedDate: logEntryData.submittedDate };
        await updateUserStats(userId, statsLogData);
      } catch (statsError) { console.error('Error updating user stats:', statsError); }

    } catch (firebaseError) {
      console.error('Firebase save to user logs failed OR other critical error in upload process:', firebaseError);
      Alert.alert('Save Error', 'Could not save your cigar to the cloud. It will be saved locally for now.');
      try {
        const existingOfflineCigarsJson = await AsyncStorage.getItem('offlineCigars');
        let existingOfflineCigars = existingOfflineCigarsJson ? JSON.parse(existingOfflineCigarsJson) : [];
        // Add this check to ensure it's an array
        if (!Array.isArray(existingOfflineCigars)) {
          console.warn("Corrupted offlineCigars data in uploadCigar, resetting to empty array.");
          existingOfflineCigars = [];
        }

        // Prepare data for offline storage (similar to logEntryData but ensure localImagePersistenceUri is used)
        // Reparse AI data for offline log, or use what was prepared for logEntryData
        let offlineParsedAiData = {};
        try {
          offlineParsedAiData = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
        } catch { /* ignore */ }


        const cleanedAiResponse = deepRemoveUndefined(
          typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse
        );


        const offlineCigarEntry = {
          brand: offlineParsedAiData.cigarBrand || newCigar.cigarName.split(' ')[0] || '',
          line: offlineParsedAiData.cigarLine || '',
          fullName: newCigar.cigarName.trim(),
          description: offlineParsedAiData.description || (offlineParsedAiData.bandDescription || ''),
          notes: newCigar.notes || '',
          overall: newCigar.overall ?? null,
          date: new Date().toISOString(),
          submittedDate: new Date().toISOString(),
          localImageUri: localImageToSave, // Use the persistent local URI
          imageUrl: '',
          submittedBy: auth.currentUser?.uid || 'test-user',
          pendingUpload: true,
          offlineId: `offline-${Date.now()}`,
          savedAt: new Date().toISOString(),
          aiRawResponseSnapshot: JSON.stringify(cleanedAiResponse)
        };
        existingOfflineCigars.push(offlineCigarEntry);
        await AsyncStorage.setItem('offlineCigars', JSON.stringify(existingOfflineCigars));
        console.log('Cigar saved offline to AsyncStorage due to Firebase error.');
      } catch (offlineError) {
        console.error('Failed to save cigar offline to AsyncStorage:', offlineError);
        Alert.alert('Critical Save Error', 'Could not save your cigar to the cloud or locally. Please try again.');
      }
    } finally {
      setIsSaving(false);
      setStatus('');
      if (successfullySavedOnline) {
        Alert.alert('Cigar Saved!', `${newCigar.cigarName} has been added to your humidor.`);
      }
      setResultModal(false);
      setImage(null);
      imageRef.current = null;
      setAiResponse('');
      setNewCigar({ cigarName: '', notes: '', overall: null });
      setAiAccuracyFeedback(null);
      setShowNameEditField(false);
      fetchCigarLogs();
    }
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

  // Update rating
  const updateCigarRating = (rating) => {
    // Update the edited cigar state
    setEditedCigar(prev => ({
      ...prev,
      overall: rating
    }));

    // Update the displayed cigar state for immediate UI feedback
    setSelectedCigar(prev => ({
      ...prev,
      overall: rating
    }));
  };

  // Update notes
  const updateCigarNotes = (notes) => {
    // Update the edited cigar state
    setEditedCigar(prev => ({
      ...prev,
      notes: notes
    }));

    // Update the displayed cigar state for immediate UI feedback
    setSelectedCigar(prev => ({
      ...prev,
      notes: notes
    }));
  };

  // Save changes to Firebase
  const saveDetailChanges = async () => {
    if (!editedCigar) return;

    try {
      const userId = auth.currentUser?.uid || 'test-user';

      // Show saving indicator
      setStatus('Saving changes...');

      // Create an object with ONLY the fields to update
      const updateData = {
        overall: editedCigar.overall || 0,
        notes: editedCigar.notes || ''
      };

      // Reference to the document
      const cigarRef = doc(db, 'users', userId, 'logs', editedCigar.id);

      // Update the document
      await updateDoc(cigarRef, updateData);

      // Update the local list
      setLogs(prevLogs =>
        prevLogs.map(log =>
          log.id === editedCigar.id
            ? { ...log, ...updateData }
            : log
        )
      );

      // Show success message
      Alert.alert('Success', 'Your changes have been saved');

      // Reset status
      setStatus('');

      // Close the modal
      setDetailModalVisible(false);
    } catch (error) {
      setStatus('');
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  // Add this function somewhere in your component
  const syncOfflineCigars = async () => {
    try {
      const offlineCigarsJson = await AsyncStorage.getItem('offlineCigars');

      if (!offlineCigarsJson) return; // No offline cigars to sync

      const offlineCigars = JSON.parse(offlineCigarsJson);

      if (offlineCigars.length === 0) return; // No offline cigars to sync

      const userId = auth.currentUser?.uid || 'test-user';
      const successfullySynced = [];

      // Try to sync each offline cigar
      for (const cigar of offlineCigars) {
        try {
          // Remove offline-specific fields
          const { pendingUpload, offlineId, savedAt, ...cigarData } = cigar;

          // Add to Firestore
          await addDoc(collection(db, 'users', userId, 'logs'), cigarData);

          // Mark as successfully synced
          successfullySynced.push(offlineId);
        } catch (error) {
          console.error(`Failed to sync offline cigar ${cigar.offlineId}:`, error);
        }
      }

      // Remove successfully synced cigars from offline storage
      if (successfullySynced.length > 0) {
        const remainingCigars = offlineCigars.filter(
          cigar => !successfullySynced.includes(cigar.offlineId)
        );

        await AsyncStorage.setItem('offlineCigars', JSON.stringify(remainingCigars));

        // Refresh logs to show synced cigars
        fetchCigarLogs();
      }
    } catch (error) {
      console.error('Error syncing offline cigars:', error);
    }
  };

  const cacheImage = async (uri) => {
    try {
      // Skip if already a local file or no uri provided
      if (!uri || uri.startsWith('file://') || uri.includes('placeholder')) {
        return uri;
      }

      // Create a unique filename based on the URI
      const filename = uri.split('/').pop();
      const localUri = `${FileSystem.documentDirectory}${filename}`;

      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        return localUri; // Return local URI if already cached
      }

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(uri, localUri);
      if (downloadResult.status === 200) {
        return localUri;
      }

      return uri; // Return original if download failed
    } catch (error) {
      console.error('Error caching image:', error);
      return uri; // Return original on error
    }
  };

  // Call this in useEffect or when app comes online
  useEffect(() => {
    syncOfflineCigars();
  }, []);

  // Form input handlers
  const updateRating = (field, value) => {
    setNewCigar({
      ...newCigar,
      [field]: value
    });
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
        <Text style={styles.headerText}>Your Humidor</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setModalVisible(true);
            setImage(null);
          }}
        >
          <Ionicons name="add-circle" size={32} color="#8B4513" />
        </TouchableOpacity>
      </View>

      {logs.length > 0 ? (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.logItem}
              onPress={() => openDetailView(item)}
            >
              <View style={styles.logItemContent}>
                {/* Update the Image component */}
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
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No cigars logged yet</Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={pickImage}
          >
            <Text style={styles.emptyStateButtonText}>Add Your First Cigar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Simple Add Cigar Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.simpleModalContent}>
            <Text style={styles.modalTitle}>Add New Cigar</Text>

            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                  <Ionicons name="camera" size={40} color="#8B4513" />
                  <Text style={styles.imagePickerText}>Capture Cigar</Text>
                </TouchableOpacity>
                <Text style={styles.tipText}>{cigarCaptureTips[currentTipIndex]}</Text>
              </View>
            )}


            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setImage(null);
                  selectRandomTip();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  isSaving && styles.disabledButton
                ]}
                onPress={image ? processImageWithAI : pickImage}
                disabled={isSaving}
              >
                <Text style={styles.buttonText}>
                  {isSaving ? 'Processing...' : (image ? 'Analyze' : 'Pick Image')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Processing Modal with Loading Wheel */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={processingModal}
        onRequestClose={() => { }}
      >
        <View style={styles.processingModalContainer}>
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color="#8B4513" />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* Result Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={resultModal}
        onRequestClose={() => {
          setResultModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.modalContainer}>
            <View style={styles.resultModalContent}>
              <Text style={styles.modalTitle}>Cigar Details</Text>

              <ScrollView
                style={styles.resultScroll}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* All your existing modal content here */}
                {image ? (
                  <Image
                    key={image}
                    source={{ uri: image }}
                    style={styles.resultImage}
                    onError={(e) => console.log('Image load error in ResultModal:', e.nativeEvent.error, 'URI was:', image)}
                  />
                ) : (
                  <View style={{ alignItems: 'center', marginVertical: 20, height: styles.resultImage.height || 200, justifyContent: 'center', backgroundColor: '#f0f0f0', borderRadius: styles.resultImage.borderRadius || 8 }}>
                    <Ionicons name="image-outline" size={50} color="#cccccc" />
                    <Text style={{ color: '#cccccc' }}>No image preview</Text>
                  </View>
                )}

                {/* Name field */}
                {!showNameEditField ? (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Cigar Name</Text>
                    <TextInput
                      style={styles.input}
                      value={newCigar.cigarName}
                      onChangeText={(text) => setNewCigar({ ...newCigar, cigarName: text })}
                      placeholder="AI suggested name / Enter cigar name"
                    />
                  </View>
                ) : (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Correct Cigar Name</Text>
                    <TextInput
                      style={[styles.input, styles.highlightedInput]}
                      value={newCigar.cigarName}
                      onChangeText={(text) => setNewCigar({ ...newCigar, cigarName: text })}
                      placeholder="Enter the correct cigar name"
                      autoFocus={true}
                    />
                  </View>
                )}

                {/* Rest of form content */}
                {/* Thumbs up/down feedback */}
                {!showNameEditField && aiResponse && (
                  <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackLabel}>Is this identification correct?</Text>
                    <View style={styles.feedbackButtons}>
                      <TouchableOpacity
                        style={[styles.feedbackButton, aiAccuracyFeedback === 'up' && styles.feedbackButtonActive]}
                        onPress={() => handleAiFeedback('up')}
                      >
                        <Ionicons name="thumbs-up" size={24} color={aiAccuracyFeedback === 'up' ? "#fff" : "#8B4513"} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.feedbackButton, aiAccuracyFeedback === 'down' && styles.feedbackButtonActive]}
                        onPress={() => handleAiFeedback('down')}
                      >
                        <Ionicons name="thumbs-down" size={24} color={aiAccuracyFeedback === 'down' ? "#fff" : "#8B4513"} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* AI Analysis */}
                {!showNameEditField && aiResponse && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>AI Analysis</Text>
                    <Text style={styles.aiAnalysisText}>
                      {(() => {
                        if (!aiResponse) return "No AI analysis available.";
                        try {
                          const parsedData = JSON.parse(aiResponse);
                          if (parsedData.aiError && parsedData.description && parsedData.description.toLowerCase().includes("error")) {
                            return parsedData.description;
                          }
                          return parsedData.description || "AI analysis data is incomplete.";
                        } catch (e) {
                          return aiResponse.description?.substring(0, 300) + (aiResponse.description?.length > 300 ? '...' : '');
                        }
                      })()}
                    </Text>
                  </View>
                )}

                {/* Reanalyzing indicator */}
                {isReanalyzing && (
                  <View style={styles.reanalyzingContainer}>
                    <ActivityIndicator size="small" color="#8B4513" />
                    <Text style={styles.reanalyzingText}>Updating analysis...</Text>
                  </View>
                )}

                {/* Notes */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Your Notes (60 chars max)</Text>
                  <TextInput
                    style={styles.input}
                    value={newCigar.notes}
                    onChangeText={(text) => {
                      if (text.length <= 60) {
                        setNewCigar({ ...newCigar, notes: text })
                      }
                    }}
                    placeholder="Enter your tasting notes"
                    maxLength={60}
                    multiline={false}
                  />
                  <Text style={styles.charCount}>{newCigar.notes?.length || 0}/60</Text>
                </View>

                {/* Rating */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Overall Rating</Text>
                  <View style={styles.ratingInput}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <TouchableOpacity
                        key={rating}
                        onPress={() => updateRating('overall', rating)}
                      >
                        <Ionicons
                          name={rating <= (newCigar.overall || 0) ? "star" : "star-outline"}
                          size={30}
                          color="#8B4513"
                          style={styles.ratingStar}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setResultModal(false);
                    setImage(null);
                    imageRef.current = null;
                    setAiResponse('');
                    setAiAccuracyFeedback(null);
                    setShowNameEditField(false);
                    setNewCigar({ cigarName: '', notes: '', overall: null });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                {showNameEditField ? (
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton, (!newCigar.cigarName || isReanalyzing) && styles.disabledButton]}
                    onPress={() => {
                      if (newCigar.cigarName && !isReanalyzing) {
                        setShowNameEditField(false);
                        reanalyzeWithCorrectedName();
                      }
                    }}
                    disabled={!newCigar.cigarName || isReanalyzing}
                  >
                    <Text style={styles.buttonText}>{isReanalyzing ? "Updating..." : "Update AI"}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton, (!newCigar.cigarName || isSaving) && styles.disabledButton]}
                    onPress={uploadCigar}
                    disabled={!newCigar.cigarName || isSaving}
                  >
                    <Text style={styles.buttonText}>{isSaving ? "Saving..." : "Save"}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>


      {/* Cigar Detail Modal - FIXED VERSION */}
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

              <ScrollView
                style={styles.detailScroll}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.detailCigarName}>{selectedCigar.cigarName}</Text>
                <Text style={styles.detailDate}>{selectedCigar.date}</Text>

                {selectedCigar?.image ? (
                  <Image source={{ uri: selectedCigar.image }} style={styles.detailImage} resizeMode="cover" />
                ) : null}


                {selectedCigar.aiResponse ? (
                  <View style={styles.aiResponseContainer}>
                    <Text style={styles.aiResponseTitle}>AI Analysis</Text>
                    <Text style={styles.aiResponseText}>
                      {(() => {
                        try {
                          const parsedData = JSON.parse(selectedCigar.aiResponse);
                          return parsedData.description || selectedCigar.aiResponse;
                        } catch (e) {
                          return selectedCigar.aiResponse;
                        }
                      })()}
                    </Text>
                  </View>
                ) : null}

                {/* EDITABLE RATING */}
                <View style={styles.ratingsContainer}>
                  <Text style={styles.ratingsTitle}>Your Rating</Text>
                  <View style={styles.overallRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => updateCigarRating(star)}
                      >
                        <Ionicons
                          name={star <= selectedCigar.overall ? "star" : "star-outline"}
                          size={30}
                          color="#8B4513"
                          style={{ marginHorizontal: 5 }}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* EDITABLE NOTES */}
                <View style={styles.notesContainer}>
                  <Text style={styles.notesTitle}>Your Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={selectedCigar.notes}
                    onChangeText={(text) => updateCigarNotes(text)}
                    placeholder="Add your tasting notes here..."
                    multiline={true}
                    maxLength={60}
                  />
                  <Text style={styles.charCount}>
                    {selectedCigar.notes?.length || 0}/60
                  </Text>
                </View>

                {/* SAVE BUTTON */}
                <TouchableOpacity
                  style={styles.saveChangesButton}
                  onPress={saveDetailChanges}
                >
                  <Text style={styles.saveChangesButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
      {/* Band Won Modal */}
      <BandWonModal
        visible={bandWonModalVisible}
        band={earnedBand}
        onClose={() => {
          setBandWonModalVisible(false);

          // Show next band if there are more
          if (pendingBands.length > 0) {
            setTimeout(() => {
              const nextBands = [...pendingBands];
              const nextBand = nextBands.shift();

              setEarnedBand(nextBand);
              setPendingBands(nextBands);
              setBandWonModalVisible(true);
            }, 500);
          }
        }}
      />
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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
    width: 120,
    height: 120,
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
  statusText: {
    marginBottom: 12,
    color: '#8B4513',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  simpleModalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
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
    textAlign: 'center',
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
    alignSelf: 'center',
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
    alignSelf: 'center',
  },
  detailImage: {
    width: '100%',
    height: 250,
    borderRadius: 10,
    marginBottom: 16,
    marginTop: 16,
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
  formContainer: {
    width: '100%',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  ratingInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
  },
  ratingStar: {
    marginRight: 8,
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
  disabledButton: {
    backgroundColor: '#d3d3d3',
    opacity: 0.7,
  },
  buttonText: {
    fontWeight: 'bold',
    color: 'white',
  },
  processingModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  processingContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '500',
  },
  resultModalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  resultScroll: {
    width: '100%',
    flex: 1,
  },
  resultImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },
  aiAnalysisText: {
    padding: 12,
    backgroundColor: '#f7f2e9',
    borderRadius: 8,
    color: '#333',
    fontSize: 14,
  },
  overallRating: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  charCount: {
    alignSelf: 'flex-end',
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  overallRating: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  notesInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
    color: '#333',
  },
  saveChangesButton: {
    backgroundColor: '#8B4513',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveChangesButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Add to your styles object
  feedbackContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  feedbackLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  feedbackButton: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 50,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  feedbackButtonActive: {
    backgroundColor: '#8B4513',
  },
  highlightedInput: {
    backgroundColor: '#fff8e6',
    borderColor: '#8B4513',
    borderWidth: 2,
  },
  reanalyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    padding: 8,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 20,
    fontStyle: 'italic'
  },
  reanalyzingText: {
    marginLeft: 10,
    color: '#8B4513',
    fontSize: 14,
  }
});
