import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, Image, ScrollView, TextInput, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeCigarImage, BRAVE_API_KEY, OPENAI_API_KEY } from './services/openai';
import { Alert, ActivityIndicator } from 'react-native';
import { auth, db, storage } from '../config/firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateUserStats } from './services/userStats';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import BandWonModal from './components/BandWonModal';
import { checkForNewBands } from './services/bands';
import * as ImageManipulator from "expo-image-manipulator";
import { SwipeListView } from 'react-native-swipe-list-view';

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
  const [humiInsights, setHumiInsights] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [processingModal, setProcessingModal] = useState(false);
  const [resultModal, setResultModal] = useState(false);
  const [selectedCigar, setSelectedCigar] = useState(null);
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [imagesToDelete, setImagesToDelete] = useState([]); // Images to delete from Firebase on save
  const imageRef = useRef(null);
  const setImageWithRef = (uri) => {
    setImage(uri);
    imageRef.current = uri;
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);
  const [status, setStatus] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Taking the first puff...');
  const [loadingInterval, setLoadingInterval] = useState(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isRating, setIsRating] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  // Replace single image state with multiple images
  const [selectedImages, setSelectedImages] = useState([]);
  const [processingQueue, setProcessingQueue] = useState([]);
  const [currentlyProcessing, setCurrentlyProcessing] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]); // For the 3 extra images in detail view
  const [isPublic, setIsPublic] = useState(selectedCigar?.isPublic ?? true);

  // Add these states
  const [backgroundProcessing, setBackgroundProcessing] = useState([]); // Track processing cigars
  const [processingStatus, setProcessingStatus] = useState({}); // Individual cigar processing status
  // Remove this line: const [image, setImage] = useState(null);
  // New cigar entry form state
  const [newCigar, setNewCigar] = useState({
    cigarName: '',
    cigarBrand: '',
    notes: '',
    overall: null
  });


  const [momentsImages, setMomentsImages] = useState([]);
  const [imagesloading, setImagesLoading] = useState(true);
  // Cigar band images (will be replaced with Firebase data later)
  const [cigarBands, setCigarBands] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);


  const cigarCaptureTips = [
    "Pro tip: Remove cellophane and focus on the band for best results",
    "Best results come from cigars without cellophane and bands in focus",
    "Like a sommelier needs a clear glass, our AI needs a clear view - no cellophane please",
    "Cigar wisdom: Remove the cellophane and show the band clearly for best results"
  ];


  const openDeleteModal = (item) => {
    setLogToDelete(item);
    setShowDeleteModal(true);
  };


  const openImagePreview = (imgUri) => {
    setPreviewImage(imgUri);
    setPreviewVisible(true);
  };


  const deleteLog = async () => {
    if (!logToDelete) return;

    try {
      const userId = auth.currentUser?.uid;
      const docRef = doc(db, "users", userId, "logs", logToDelete.id);

      // Delete from Firestore
      await deleteDoc(docRef);

      // If image exists in Storage, delete it
      if (logToDelete.image && logToDelete.image.includes("firebase")) {
        const imgRef = ref(storage, logToDelete.image);
        await deleteObject(imgRef).catch(() => { });
      }

      // Remove from local UI list
      setLogs(prev => prev.filter(log => log.id !== logToDelete.id));

      setShowDeleteModal(false);
      setLogToDelete(null);
    } catch (err) {
      console.error("Delete error:", err);
      setShowDeleteModal(false);
    }
  };


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

  const fetchOwnerImages = async (logId) => {
    if (!auth.currentUser?.uid) return;

    setImagesLoading(true);

    try {
      const imagesRef = collection(db, "logsMomentsImages");
      const q = query(
        imagesRef,
        where("ownerId", "==", auth.currentUser.uid),
        where("logId", "==", logId),     // ✅ added filter
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const images = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setMomentsImages(images);

    } catch (error) {
      console.error("Error fetching owner's images:", error);
    } finally {
      setImagesLoading(false);
    }
  };


  // Load logs from Firebase when component mounts
  useEffect(() => {
    fetchCigarLogs();
    // fetchUserBands();
  }, []);

  useEffect(() => {
    if (detailModalVisible) {
      setIsRating(false);
    }
  }, [detailModalVisible]);

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

  // NEW: Process queue in background
  useEffect(() => {
    if (processingQueue.length > 0 && !currentlyProcessing) {
      processNextInQueue();
    }
  }, [processingQueue, currentlyProcessing]);

  // NEW: Check if all images are processed
  useEffect(() => {
    if (processingQueue.length === 0 && selectedImages.length > 0) {
      const allProcessed = selectedImages.every(img =>
        img.status === 'completed' || img.status === 'error'
      );

      if (allProcessed) {
        if (loadingInterval) {
          clearInterval(loadingInterval);
          setLoadingInterval(null);
        }
        setProcessingModal(false);
        setResultModal(true);
      }
    }
  }, [processingQueue, selectedImages]);


  // NEW: Process queue in background
  const processNextInQueue = async () => {
    if (processingQueue.length === 0) return;

    const nextItem = processingQueue[0];
    setCurrentlyProcessing(nextItem);

    try {
      await processSingleImage(nextItem.image, nextItem.index);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setProcessingQueue(prev => prev.slice(1));
      setCurrentlyProcessing(null);
    }
  };

  // NEW: Process single image
  const processSingleImage = async (imageUri, index) => {
    try {
      const userId = auth.currentUser?.uid || "test-user";

      // Update image status to processing
      setSelectedImages(prev => prev.map((img, i) =>
        i === index ? { ...img, status: 'processing' } : img
      ));

      const aiAnalysisResult = await analyzeCigarImage(imageUri, userId);

      if (aiAnalysisResult) {
        setSelectedImages(prev => prev.map((img, i) =>
          i === index ? { ...img, status: 'completed', aiResponse: aiAnalysisResult } : img
        ));


        // Use first completed image for main form
        if (index === 0) {
          setAiResponse(aiAnalysisResult);
          const cigarBrand = aiAnalysisResult.cigarBrand?.trim() || "";
          const cigarName = aiAnalysisResult.fullName?.trim() || aiAnalysisResult.cigarLine?.trim() || "";
          const safeName = cigarName || "Unknown Cigar";

          setNewCigar({ ...newCigar, cigarName: safeName });

          if (cigarName || cigarBrand) {
            getHumiInsights(safeName, cigarBrand).then(setHumiInsights);
          }
        }
      }
    } catch (error) {
      setSelectedImages(prev => prev.map((img, i) =>
        i === index ? { ...img, status: 'error' } : img
      ));
    }
  };

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
          let imageUri = 'https://via.placeholder.com/300x150?text=No+Image';
          if (data.imageUrl && data.imageUrl.trim().length > 0) {
            imageUri = data.imageUrl;
          } else if (data.localImageFilePath && data.localImageFilePath.startsWith('file://')) {
            imageUri = data.localImageFilePath;
          }

          return {
            id: doc.id,
            date: data.submittedDate?.toDate ? data.submittedDate.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            cigarName: data.fullName || 'Unknown Cigar',
            overall: data.overall ?? null,
            notes: data.notes || '',
            insights: data.insights || '',
            image: imageUri,
            description: data.description || (data.aiRawResponseSnapshot || ''),
            additionalImages: data?.additionalImages || [],
            status: 'completed' // Mark as completed from Firebase
          };
        });
        combinedLogs.push(...firebaseLogs);
      } catch (firebaseError) {
        console.error('Error fetching from Firebase:', firebaseError);
      }

      // Keep any background processing items that haven't completed yet
      const processingItems = logs.filter(log =>
        backgroundProcessing.includes(log.id) &&
        !combinedLogs.some(firebaseLog => firebaseLog.id === log.id)
      );

      combinedLogs = [...processingItems, ...combinedLogs];

      combinedLogs.sort((a, b) => new Date(b.date || b.submittedDate) - new Date(a.date || a.submittedDate));
      setLogs(combinedLogs);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLoading(false);
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

  const reanalyzeCigarInBackground = async (cigarId, imageUri, correctName, correctBrand = "") => {
    try {
      const userId = auth.currentUser?.uid || "test-user";

      console.log(correctName, 'direct ');

      // Show status on UI card
      setProcessingStatus(prev => ({
        ...prev,
        [cigarId]: "Identifying cigar..."
      }));

      // 1️⃣ Run AI with corrected name
      const aiAnalysisResult = await analyzeCigarImage(
        imageUri,
        userId,
        correctName,
        true // reanalyze mode
      );

      if (!aiAnalysisResult) {
        setLogs(prev =>
          prev.map(log =>
            log.id === cigarId
              ? { ...log, status: "error", cigarName: "Reanalysis Failed" }
              : log
          )
        );
        setBackgroundProcessing(prev => prev.filter(id => id !== cigarId));
        return;
      }

      // Force AI name to corrected one
      const cigarName = correctName.trim();
      const cigarBrand = correctBrand.trim();

      // 2️⃣ Get HUMI insights
      let humiInsights = "";
      try {
        const insights = await getHumiInsights(cigarName, cigarBrand);
        humiInsights = insights.summary;
      } catch (err) {
        humiInsights = "Unable to fetch insights at this time.";
      }

      // 3️⃣ Update Firestore log
      const cigarRef = doc(db, "users", userId, "logs", cigarId);

      const updatedData = {
        fullName: cigarName,
        brand: cigarBrand || aiAnalysisResult.cigarBrand || "",
        line: aiAnalysisResult.cigarLine || "",
        description: aiAnalysisResult.description || aiAnalysisResult.bandDescription,
        aiResponse: aiAnalysisResult.description || "",
        originCountry: aiAnalysisResult.originCountry || "",
        wrapperType: aiAnalysisResult.wrapperType || "",
        strength: aiAnalysisResult.strength || "",
        commonNotes: aiAnalysisResult.commonNotes || "",
        recommendedPairings: aiAnalysisResult.recommendedPairings || "",
        insights: humiInsights,
        aiRawResponseSnapshot: JSON.stringify(aiAnalysisResult),
        reviewed: false,
        userCorrected: true,
        updatedAt: new Date(),
        status: "completed"
      };

      await updateDoc(cigarRef, updatedData);

      // 4️⃣ Update all logsMomentsImages for this logId
      const imgsQuery = query(
        collection(db, "logsMomentsImages"),
        where("logId", "==", cigarId),
        where("ownerId", "==", userId) // only images owned by current user
      );

      const imgsSnap = await getDocs(imgsQuery);
      const batch = writeBatch(db);

      imgsSnap.forEach((docSnap) => {
        batch.update(docSnap.ref, { fullName: cigarName, updatedAt: new Date() });
      });

      await batch.commit();

      // 5️⃣ Update UI card
      const finalCigar = {
        id: cigarId,
        cigarName,
        date: new Date().toISOString().split("T")[0],
        image: imageUri,
        status: "completed",
        ...updatedData
      };

      setLogs(prev =>
        prev.map(log => (log.id === cigarId ? finalCigar : log))
      );

      // 6️⃣ Clear loading state
      setBackgroundProcessing(prev => prev.filter(id => id !== cigarId));
      setProcessingStatus(prev => {
        const newState = { ...prev };
        delete newState[cigarId];
        return newState;
      });

    } catch (error) {
      console.error("Reanalysis background error:", error);

      setLogs(prev =>
        prev.map(log =>
          log.id === cigarId
            ? { ...log, status: "error", cigarName: "Reanalysis Error" }
            : log
        )
      );
      setBackgroundProcessing(prev => prev.filter(id => id !== cigarId));
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
              // REMOVE these two lines to allow only 1 image selection
              // allowsMultipleSelection: true,
              // selectionLimit: 3
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
      console.log("📸 Image picked:", pickedImageUri);

      try {
        // --- STEP 1: Compress image before storing ---
        const compressed = await ImageManipulator.manipulateAsync(
          pickedImageUri,
          [{ resize: { width: 800 } }], // keep aspect ratio, shrink to max 800px width
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // 70% quality
        );
        console.log("✅ Image compressed:", compressed.uri);

        // --- STEP 2: Copy compressed image into persistent storage ---
        const filename =
          pickedImageUri.split("/").pop() || `cigar_${Date.now()}.jpg`;
        const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, "");
        const localPersistentUri = `${FileSystem.documentDirectory}${sanitizedName}`;

        // If file exists, delete first (avoid overwrite errors)
        const existingInfo = await FileSystem.getInfoAsync(localPersistentUri);
        if (existingInfo.exists) {
          await FileSystem.deleteAsync(localPersistentUri);
        }

        await FileSystem.copyAsync({
          from: compressed.uri, // ✅ use compressed image instead of original
          to: localPersistentUri,
        });

        console.log("💾 Image copied to persistent store:", localPersistentUri);

        // --- STEP 3: Use compressed persistent image ---
        setImageWithRef(localPersistentUri); // state + ref will now point to compressed image

      } catch (err) {
        console.error("🚨 Error preparing image:", err);
        setImageWithRef(pickedImageUri); // fallback to original
        Alert.alert("Image Error", "Could not prepare image. Please try again.");
        return;
      }

      setModalVisible(true); // Show the "Add New Cigar" modal
    }
  };

  // Modified processImageWithAI to work in background
  const processImageWithAI = async () => {
    if (!image) return;
    const tempCigarId = `temp-${Date.now()}`;
    const cigarData = {
      id: tempCigarId,
      image: image,
      cigarName: 'Processing...',
      date: new Date().toISOString().split('T')[0],
      status: 'processing',
      progress: 'Analyzing image...',
      overall: null,
      notes: '',
      insights: '',
      additionalImages: []
    };

    // Add to logs immediately
    setLogs(prev => [cigarData, ...prev]);
    startLoadingMessages()
    setBackgroundProcessing(prev => [...prev, tempCigarId]);
    setProcessingStatus(prev => ({
      ...prev,
      [tempCigarId]: 'Analyzing image...'
    }));

    setModalVisible(false);
    setImage(null); // Clear the image state since we're processing

    // Start background processing (will automatically save to Firebase)
    processSingleCigarInBackground(tempCigarId, image);
  };

  // Add cleanup function for items that failed to process
  const cleanupFailedProcessing = () => {
    setLogs(prev => prev.filter(log =>
      !backgroundProcessing.includes(log.id) || log.status !== 'processing'
    ));
  };

  // Call this periodically or on app start
  useEffect(() => {
    // Clean up any stale processing items on component mount
    const cleanupStaleItems = setTimeout(() => {
      setLogs(prev => prev.filter(log =>
        !log.id.startsWith('temp-') || log.status === 'completed'
      ));
    }, 5000);

    return () => clearTimeout(cleanupStaleItems);
  }, []);

  const saveProcessedCigarToFirebase = async ({ imageUri, aiAnalysisResult, cigarName, humiInsights, userId, tempId }) => {
    // Declare logEntryData outside try block so it's available in catch
    let logEntryData = null;

    try {
      let firebaseImageUrl = '';
      const localImageToSave = imageUri;

      // Upload image to Firebase Storage
      try {
        console.log('Uploading image to Firebase Storage:', imageUri);
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const firebaseFilename = `cigars/${userId}/${Date.now()}_${cigarName.replace(/\s+/g, '_')}.jpg`;
        const storageImageRef = ref(storage, firebaseFilename);
        await uploadBytes(storageImageRef, blob);
        firebaseImageUrl = await getDownloadURL(storageImageRef);
        console.log('Image uploaded successfully:', firebaseImageUrl);
      } catch (imageUploadError) {
        console.error('Firebase Storage upload failed:', imageUploadError);
        firebaseImageUrl = '';
      }

      // Prepare cigar data for Firestore
      logEntryData = {
        brand: aiAnalysisResult.cigarBrand || '',
        line: aiAnalysisResult.cigarLine || '',
        fullName: cigarName,
        description: aiAnalysisResult.description || (aiAnalysisResult.bandDescription || ''),
        aiResponse: aiAnalysisResult.description || (aiAnalysisResult.bandDescription || ''),
        originCountry: aiAnalysisResult.originCountry || '',
        wrapperType: aiAnalysisResult.wrapperType || '',
        strength: aiAnalysisResult.strength || '',
        commonNotes: aiAnalysisResult.commonNotes || '',
        recommendedPairings: aiAnalysisResult.recommendedPairings || '',
        notes: '',
        overall: null,
        date: new Date(),
        submittedDate: new Date(),
        submittedBy: userId,
        imageUrl: firebaseImageUrl,
        localImageFilePath: localImageToSave,
        reviewed: false,
        aiAccuracyFeedback: null,
        userCorrected: false,
        aiIdentified: !!(aiAnalysisResult.cigarBrand || aiAnalysisResult.fullName),
        fromCatalog: false,
        aiRawResponseSnapshot: JSON.stringify(aiAnalysisResult),
        insights: humiInsights,
        additionalImages: [],
        status: 'completed'
      };

      // Save to Firestore - user's personal logs
      const userLogDocRef = await addDoc(collection(db, 'users', userId, 'logs'), logEntryData);
      console.log('Cigar saved to personal logs:', userLogDocRef.id);

      // ⚠️ CRITICAL: ALSO SAVE TO PUBLIC COLLECTION for stories.js
      if (firebaseImageUrl) { // Only save if we have an image URL
        const publicImageDocRef = doc(collection(db, "logsMomentsImages"));
        const publicImageData = {
          // Required fields for stories.js
          logId: publicImageDocRef.id, // Use this ID as logId for stories.js
          image: firebaseImageUrl, // image field (used in stories.js renderSlide)
          imageUrl: firebaseImageUrl, // imageUrl field
          fullName: cigarName,
          cigarName: cigarName,

          // Public feed required fields
          isPublic: true, // ⚠️ MUST be true to appear in public feed
          userId: userId,
          userName: userId, // You might want to store actual user name

          // AI data for stories.js
          aiRawResponseSnapshot: JSON.stringify(aiAnalysisResult),
          overall: 0, // Default for new cigars
          notes: '',

          // Timestamps - CRITICAL for ordering in stories.js
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastUpdated: serverTimestamp(), // 🔥 Most important for stories.js ordering

          // Additional metadata
          originCountry: aiAnalysisResult.originCountry || '',
          wrapperType: aiAnalysisResult.wrapperType || '',
          strength: aiAnalysisResult.strength || '',
          description: aiAnalysisResult.description || ''
        };

        await setDoc(publicImageDocRef, publicImageData);
        console.log('✅ Saved to public collection (logsMomentsImages):', publicImageDocRef.id);

        // Also create initial reactions document for this post
        const reactionsRef = doc(db, "postReactions", publicImageDocRef.id);
        await setDoc(reactionsRef, {
          likes: 0,
          dislikes: 0,
          likedUsers: [],
          dislikedUsers: []
        });
        console.log('✅ Created reactions document for post:', publicImageDocRef.id);
      }

      // Update user stats
      try {
        const statsLogData = {
          cigarName: cigarName,
          overall: null,
          body: logEntryData.strength,
          country: logEntryData.originCountry,
          submittedDate: logEntryData.submittedDate
        };
        await updateUserStats(userId, statsLogData);
      } catch (statsError) {
        console.error('Error updating user stats:', statsError);
      }

      return userLogDocRef.id;

    } catch (error) {
      console.error('Error saving processed cigar to Firebase:', error);

      // Fallback: Save to offline storage
      try {
        const existingOfflineCigarsJson = await AsyncStorage.getItem('offlineCigars');
        let existingOfflineCigars = existingOfflineCigarsJson ? JSON.parse(existingOfflineCigarsJson) : [];
        if (!Array.isArray(existingOfflineCigars)) {
          existingOfflineCigars = [];
        }

        // Use logEntryData if available, otherwise create basic data
        const offlineCigarEntry = logEntryData ? {
          ...logEntryData,
          localImageUri: imageUri,
          imageUrl: '',
          pendingUpload: true,
          offlineId: tempId,
          savedAt: new Date().toISOString()
        } : {
          // Basic data if logEntryData wasn't created yet
          fullName: cigarName,
          description: aiAnalysisResult?.description || '',
          originCountry: aiAnalysisResult?.originCountry || '',
          wrapperType: aiAnalysisResult?.wrapperType || '',
          strength: aiAnalysisResult?.strength || '',
          notes: '',
          overall: null,
          date: new Date().toISOString(),
          submittedDate: new Date().toISOString(),
          submittedBy: userId,
          imageUrl: '',
          localImageFilePath: imageUri,
          localImageUri: imageUri,
          pendingUpload: true,
          offlineId: tempId,
          savedAt: new Date().toISOString(),
          aiRawResponseSnapshot: JSON.stringify(aiAnalysisResult || {}),
          insights: humiInsights || '',
          status: 'pending'
        };

        existingOfflineCigars.push(offlineCigarEntry);
        await AsyncStorage.setItem('offlineCigars', JSON.stringify(existingOfflineCigars));
        console.log('Cigar saved offline due to Firebase error');

        return tempId; // Return temp ID for offline storage
      } catch (offlineError) {
        console.error('Failed to save cigar offline:', offlineError);
        throw error;
      }
    }
  };

  // Background processing function
  const processSingleCigarInBackground = async (tempId, imageUri) => {
    try {
      const userId = auth.currentUser?.uid || "test-user";

      setProcessingStatus(prev => ({
        ...prev,
        [tempId]: 'Identifying cigar...'
      }));

      const aiAnalysisResult = await analyzeCigarImage(imageUri, userId);

      if (aiAnalysisResult) {
        const cigarBrand = aiAnalysisResult.cigarBrand?.trim() || "";
        const cigarName = aiAnalysisResult.fullName?.trim() || aiAnalysisResult.cigarLine?.trim() || "Unknown Cigar";

        // Get HUMI insights
        let humiInsights = '';
        try {
          const insights = await getHumiInsights(cigarName, cigarBrand);
          humiInsights = insights.summary;
        } catch (error) {
          console.error('Error fetching insights:', error);
          humiInsights = 'Unable to fetch insights at this time.';
        }

        // Save to Firebase immediately
        const savedCigarId = await saveProcessedCigarToFirebase({
          imageUri,
          aiAnalysisResult,
          cigarName,
          humiInsights,
          userId,
          tempId
        });

        // Update the log with real Firebase ID and data
        const processedCigar = {
          id: savedCigarId, // Use the real Firebase ID
          cigarName: cigarName,
          date: new Date().toISOString().split('T')[0],
          status: 'completed',
          image: imageUri,
          aiResponse: aiAnalysisResult?.description,
          description: aiAnalysisResult?.description,
          overall: null,
          notes: '',
          insights: humiInsights,
          additionalImages: [],
          isPublic: true
        };

        // Replace temporary log with permanent one
        setLogs(prev => prev.map(log =>
          log.id === tempId ? processedCigar : log
        ));

        // Remove from processing queue
        setBackgroundProcessing(prev => prev.filter(id => id !== tempId));
        setProcessingStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[tempId];
          return newStatus;
        });

      } else {
        setLogs(prev => prev.map(log =>
          log.id === tempId
            ? { ...log, status: 'error', cigarName: 'Analysis Failed' }
            : log
        ));
        setBackgroundProcessing(prev => prev.filter(id => id !== tempId));
      }
    } catch (error) {
      console.error("Background processing error:", error);
      setLogs(prev => prev.map(log =>
        log.id === tempId
          ? { ...log, status: 'error', cigarName: 'Processing Error' }
          : log
      ));
      setBackgroundProcessing(prev => prev.filter(id => id !== tempId));
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
        aiRawResponseSnapshot: JSON.stringify(cleanedAiResponse),
        insights: humiInsights
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
        // After successful upload, update the log item
        setLogs(prev => prev.map(log =>
          log.id === newCigar?.tempId
            ? { ...log, id: newFirebaseId, status: 'saved' }
            : log
        ));
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

  // Update the openDetailView function
  const openDetailView = (cigar) => {
    console.log(cigar, 'hoya jy')
    if (backgroundProcessing.includes(cigar.id)) {
      Alert.alert('Still Processing', 'Please wait for the AI analysis to complete.');
      return;
    }
    fetchOwnerImages(cigar?.id)
    setSelectedCigar({
      ...cigar,
      additionalImages: cigar.additionalImages,
      overall: cigar?.overall,
      notes: cigar?.notes
    });
    // setNewCigar({notes})
    setAdditionalImages([]);
    setImagesToDelete([]);
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
    const userId = auth.currentUser?.uid;
    setStatus("Saving...");

    const rating = editedCigar.overall || 0;
    const notes = editedCigar.notes?.trim() || "";
    const cigarName = editedCigar.cigarName || "Unknown Cigar";

    const hasRatingChanged = rating !== selectedCigar?.overall;
    const hasNotesChanged = notes !== selectedCigar?.notes;

    // if (hasRatingChanged || hasNotesChanged) {
    //   if (hasRatingChanged && !rating) {
    //     setError("Please select a rating.");
    //     setImagesUploading(false);
    //     setStatus("");
    //     return;
    //   }
    //   if (hasNotesChanged && !notes) {
    //     setError("Please enter notes for your rating.");
    //     setImagesUploading(false);
    //     setStatus("");
    //     return;
    //   }
    // }

    setError("");

    try {
      const logId = editedCigar.id;

      // 🔥 COMPLETE updated data object
      const updatedData = {
        fullName: cigarName,
        cigarName: cigarName, // Add both fields for compatibility
        notes: notes,
        overall: rating > 0 ? rating : null,
        updatedAt: serverTimestamp(),
        // Add these for immediate stories feed update
        lastUpdated: serverTimestamp(), // New field for stories sorting
      };

      // Add image if it exists
      if (editedCigar?.image) {
        updatedData.image = editedCigar.image;
      }

      // 1️⃣ Update ALL existing images for this logId (owned by user)
      const q = query(
        collection(db, "logsMomentsImages"),
        where("logId", "==", logId),
        where("ownerId", "==", userId)
      );

      const imgsSnap = await getDocs(q);
      const batch = writeBatch(db);

      if (!imgsSnap.empty) {
        imgsSnap.forEach((docSnap) => {
          batch.update(docSnap.ref, {
            ...updatedData,
            // Ensure all stories-related fields are updated
            notes: notes,
            overall: rating > 0 ? rating : null,
            fullName: cigarName,
            cigarName: cigarName,
            updatedAt: serverTimestamp(),
            // 🔥 Force update for stories feed
            lastUpdated: serverTimestamp()
          });
        });
        await batch.commit();
      }

      // 2️⃣ Delete removed images
      if (imagesToDelete.length > 0) {
        const deletePromises = imagesToDelete.map(async (imageDoc) => {
          try {
            const storageRef = ref(storage, imageDoc.imageUrl);
            await deleteObject(storageRef);
            await deleteDoc(doc(db, "logsMomentsImages", imageDoc.id));
          } catch (err) {
            console.error("❌ Error deleting image:", err);
          }
        });

        await Promise.all(deletePromises);
      }

      // 3️⃣ Upload new images
      if (additionalImages.length > 0) {
        setImagesUploading(true);

        const uploadPromises = additionalImages.map(async (image) => {
          try {
            const response = await fetch(image.uri);
            const blob = await response.blob();

            const filename = `cigars/${userId}/additional_${Date.now()}_${Math.random()}.jpg`;
            const storageRef = ref(storage, filename);

            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);

            await addDoc(collection(db, "logsMomentsImages"), {
              imageUrl: downloadURL,
              ownerId: userId,
              logId: logId,
              fullName: cigarName,
              overall: rating > 0 ? rating : null,
              notes: notes,
              image: editedCigar?.image,
              isPublic: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastUpdated: serverTimestamp() // 🔥 New field
            });
            console.log("✅ Image uploaded:", downloadURL);
          } catch (err) {
            console.error("❌ Error uploading image:", err);
          }
        });

        await Promise.all(uploadPromises);
        setImagesUploading(false);
      } else {
        setImagesUploading(false);
      }

      // 4️⃣ Update the main log document
      try {
        const logDocRef = doc(db, "users", userId, "logs", logId);
        await updateDoc(logDocRef, {
          fullName: cigarName,
          notes: notes,
          overall: rating > 0 ? rating : null,
          updatedAt: serverTimestamp(),
          lastUpdated: serverTimestamp() // 🔥 New field
        });
      } catch (err) {
        console.log("Note: Log document might not exist in 'logs' collection");
      }

      // 5️⃣ Update UI instantly
      setSelectedCigar((prev) => ({
        ...prev,
        ...updatedData,
        overall: rating,
        notes: notes,
        cigarName: cigarName
      }));

      setLogs((prev) =>
        prev.map((log) =>
          log.id === editedCigar.id ? {
            ...log,
            ...updatedData,
            overall: rating,
            notes: notes,
            cigarName: cigarName
          } : log
        )
      );

      // 6️⃣ Reset temporary states
      setAdditionalImages([]);
      setImagesToDelete([]);

      Alert.alert(
        "Success",
        additionalImages.length > 0
          ? "Details and images updated successfully"
          : "Details updated successfully"
      );

    } catch (error) {
      console.error("❌ Error saving changes:", error);
      Alert.alert("Error", "Failed to save changes");
    } finally {
      setStatus("");
      setImagesUploading(false);
      if (additionalImages.length > 0) {
        fetchOwnerImages(editedCigar?.id);
      }
    }
  };


  const togglePublicStatus = async (value) => {
    try {
      setIsPublic(value); // Optimistically update UI

      const q = query(
        collection(db, 'logsMomentsImages'),
        where('logId', '==', selectedCigar.id),
        where('ownerId', '==', auth.currentUser.uid)
      );

      const snapshot = await getDocs(q);

      // if (snapshot.empty) {
      //   Alert.alert("Info", "No images found to update.");
      //   return;
      // }

      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnap => {
        const ref = doc(db, 'logsMomentsImages', docSnap.id);
        batch.update(ref, { isPublic: value, updatedAt: new Date() });
      });

      await batch.commit();
      console.log('✅ All images updated for log:', selectedCigar.id);

    } catch (err) {
      // Revert UI toggle on error
      setIsPublic(!value);
      console.error('❌ Error updating images:', err);
      Alert.alert("Error", "Failed to update public status. Please try again.");
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


  // Call this in useEffect or when app comes online
  useEffect(() => {
    syncOfflineCigars();
  }, []);



  const getHumiInsights = async (cigarName, brand = "") => {
    try {
      const searchQuery = brand
        ? `${brand} ${cigarName} cigar review`
        : `${cigarName} cigar review`;

      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
          searchQuery
        )}&count=10`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-Subscription-Token": BRAVE_API_KEY,
          },
        }
      );

      if (!response.ok) throw new Error(`Brave API error: ${response.status}`);

      const searchData = await response.json();
      const reviewContent = [];

      if (searchData.web?.results) {
        searchData.web.results.slice(0, 10).forEach((r) => {
          if (r.description) reviewContent.push(r.description);
          if (r.extra_snippets) reviewContent.push(...r.extra_snippets);
        });
      }

      if (searchData.discussions?.results) {
        searchData.discussions.results.slice(0, 5).forEach((d) => {
          if (d.data?.body) reviewContent.push(d.data.body);
        });
      }

      if (reviewContent.length === 0) {
        return {
          summary:
            "There doesn't seem to be much activity online about this cigar yet. You might be one of the first to weigh in! Rate it here in the app when you're ready to share your experience.",
          hasReviews: false,
        };
      }

      const synthesisPrompt = `Summarize the reviews and comments about this cigar and create a 2-3 sentence, 40 words or less, summary in a casual yet sophisticated tone like a friend did some research for you online:

${reviewContent.join("\n\n")}

Instructions:
- Write like a friend that's a cigar aficionado that's trying to help you get clarity on what people say about this cigar
- Don't talk about the cigar, keep it to reviews, comments, trends, etc
- Highlight trends or averages without sounding too technical
- Mention overall sentiment (positive/negative/mixed) without using the word "Overall"
- Keep it concise but insightful
- Sound like "My friend HUMI just went the extra mile for me" - but dont say the word "HUMI"
- 40 words or less

Return only the 2-3 sentence summary, 40 words or less, nothing else.`;

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: synthesisPrompt }],
          max_tokens: 200,
        }),
      });

      if (!aiResponse.ok) throw new Error(`OpenAI API error: ${aiResponse.status}`);

      const aiData = await aiResponse.json();
      const summary =
        aiData.choices?.[0]?.message?.content ||
        "Unable to analyze reviews at this time.";

      return { summary, hasReviews: true };
    } catch (error) {
      console.error("Error getting HUMI Insights:", error);
      return {
        summary:
          "There doesn't seem to be much activity online about this cigar yet. You might be one of the first to weigh in! Rate it here in the app when you're ready to share your experience.",
        hasReviews: false,
      };
    }
  };


  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  // Function to pick additional images for existing cigar

  const pickAdditionalImages = async (source, limit = 1) => {
    let result;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }

      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required');
        return;
      }

      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: limit > 1,
        selectionLimit: limit
      });
    }

    if (!result.canceled && result.assets) {
      const newImages = [];

      for (const asset of result.assets.slice(0, limit)) {
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);

        console.log(`Picked image URI: ${asset.uri}`);
        console.log(`Image size: ${fileInfo.size} bytes (${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB)`);

        if (fileInfo.size > 2 * 1024 * 1024) { // 2 MB
          Alert.alert(
            'Image too large',
            'Please select an image under 2 MB.'
          );
          continue; // skip this image
        }

        newImages.push({
          uri: asset.uri,
          id: Date.now() + Math.random()
        });
      }

      if (newImages.length > 0) {
        setAdditionalImages(prev => [...prev, ...newImages]);
      }
    }
  };



  // Function to remove additional image
  // Function to remove additional image from local state only
  const removeAdditionalImage = (image, isNew = false) => {
    if (isNew) {
      setAdditionalImages(prev => prev.filter(i => i.uri !== image.uri));
    } else {
      setImagesToDelete(prev => [...prev, image]);
      setMomentsImages(prev => prev.filter(img => img.id !== image.id));
      setSelectedCigar(prev => ({
        ...prev,
        additionalImages: prev.additionalImages.filter(url => url !== image.imageUrl)
      }));
    }
  };



  // Function to save additional images with the cigar
  // const saveAdditionalImages = async () => {
  //   if (additionalImages.length === 0) return;

  //   try {
  //     const userId = auth.currentUser?.uid;
  //     // Upload each additional image to Firebase Storage
  //     const uploadedUrls = [];

  //     for (const image of additionalImages) {
  //       const response = await fetch(image.uri);
  //       const blob = await response.blob();
  //       const filename = `cigars/${userId}/additional_${Date.now()}_${Math.random()}.jpg`;
  //       const storageRef = ref(storage, filename);

  //       await uploadBytes(storageRef, blob);
  //       const downloadURL = await getDownloadURL(storageRef);
  //       uploadedUrls.push(downloadURL);
  //     }

  //     // Update the cigar document with additional images
  //     const cigarRef = doc(db, 'users', userId, 'logs', selectedCigar.id);
  //     await updateDoc(cigarRef, {
  //       additionalImages: uploadedUrls,
  //       updatedAt: new Date()
  //     });

  //     Alert.alert('Success', 'HUMI Moments saved!');
  //   } catch (error) {
  //     console.error('Error saving additional images:', error);
  //     Alert.alert('Error', 'Failed to save HUMI Moments');
  //   }
  // };

  // Function to show image source options
  const showImageSourceOptions = () => {
    const existingImagesCount = selectedCigar?.additionalImages?.length || 0;
    const newImagesCount = additionalImages.length;
    const totalImages = existingImagesCount + newImagesCount;
    const remainingSlots = 5;

    // if (remainingSlots <= 0) {
    //   Alert.alert('Limit Reached', 'You can only add up to 3 HUMI Moments');
    //   return;
    // }

    Alert.alert(
      "Add Photo",
      "Choose image source",
      [
        {
          text: "Take Photo",
          onPress: () => pickAdditionalImages('camera', remainingSlots)
        },
        {
          text: "Choose from Library",
          onPress: () => pickAdditionalImages('library', remainingSlots)
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  // Update the renderItem in FlatList
  // const renderLogItem = ({ item }) => {
  //   const isProcessing = backgroundProcessing.includes(item.id);
  //   const statusText = processingStatus[item.id] || 'Processing...';

  //   return (
  //     <TouchableOpacity
  //       style={[
  //         styles.logItem,
  //         isProcessing && styles.processingLogItem
  //       ]}
  //       onPress={() => !isProcessing && openDetailView(item)}
  //       disabled={isProcessing}
  //     >
  //       <View style={styles.logItemContent}>
  //         <Image
  //           source={{ uri: item.image }}
  //           style={[
  //             styles.thumbnailImage,
  //             isProcessing && styles.processingImage
  //           ]}
  //           resizeMode="cover"
  //         />

  //         <View style={styles.logItemText}>
  //           <Text style={styles.date}>{item.date}</Text>
  //           <Text style={styles.cigarName}>
  //             {isProcessing ? statusText : item.cigarName}
  //           </Text>

  //           {isProcessing ? (
  //             <View style={styles.processingIndicator}>
  //               <ActivityIndicator size="small" color="#8B4513" />
  //               <Text style={styles.processingText}>{statusText}</Text>
  //             </View>
  //           ) : item.overall ? (
  //             renderRatingStars(item.overall)
  //           ) : (
  //             <TouchableOpacity
  //               style={styles.smokeThisButton}
  //               onPress={() => openDetailView(item)}
  //             >
  //               <Text style={styles.smokeThisButtonText}>Smoke This</Text>
  //             </TouchableOpacity>
  //           )}

  //           <Text style={styles.notes} numberOfLines={1}>
  //             {item.notes || (isProcessing ? loadingMessage : '')}
  //           </Text>
  //         </View>
  //       </View>
  //     </TouchableOpacity>
  //   );
  // };

  const renderHiddenItem = ({ item }) => (
    <View style={styles.rowBack}>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => openDeleteModal(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );



  const renderFrontItem = ({ item }) => {
    const isProcessing = backgroundProcessing.includes(item.id);
    const statusText = processingStatus[item.id] || 'Processing...';

    return (
      <TouchableOpacity
        style={[
          styles.logItem,
          isProcessing && styles.processingLogItem
        ]}
        onPress={() => !isProcessing && openDetailView(item)}
        disabled={isProcessing}
        activeOpacity={0.9}
      >
        <View style={styles.logItemContent}>
          <Image
            source={{ uri: item.image }}
            style={[
              styles.thumbnailImage,
              isProcessing && styles.processingImage
            ]}
            resizeMode="cover"
          />

          <View style={styles.logItemText}>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.cigarName}>
              {isProcessing ? statusText : item.cigarName}
            </Text>

            {isProcessing ? (
              <View style={styles.processingIndicator}>
                <ActivityIndicator size="small" color="#8B4513" />
                <Text style={styles.processingText}>{statusText}</Text>
              </View>
            ) : item.overall ? (
              renderRatingStars(item.overall)
            ) : (
              <TouchableOpacity
                style={styles.smokeThisButton}
                onPress={() => openDetailView(item)}
              >
                <Text style={styles.smokeThisButtonText}>Smoke This</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.notes} numberOfLines={1}>
              {item.notes || (isProcessing ? loadingMessage : '')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };


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
        <SwipeListView
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderFrontItem}
          renderHiddenItem={renderHiddenItem}
          rightOpenValue={-80}
          disableRightSwipe
          previewRowKey={'0'}
          previewOpenValue={-40}
          previewOpenDelay={300}
          closeOnRowOpen={true}
          closeOnRowPress={true}
          closeOnScroll={true}
          closeOnRowBeginSwipe={true}
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

      <Modal
        transparent
        visible={showDeleteModal}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="trash-outline" size={44} color="#D32F2F" />

            <Text style={styles.modalTitle}>Delete Log?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to permanently delete this cigar log?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={deleteLog}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


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
                  {isSaving ? 'Processing...' : (image ? 'Send to HUMI' : 'Pick Image')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Processing Modal with Loading Wheel */}
      {/* <Modal
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
      </Modal> */}

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
          <View style={[styles.modalContainer, { justifyContent: 'center', alignItems: 'center' }]}>
            <View style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
              margin: 20,
              width: '90%',
              maxHeight: '80%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>Cigar Details</Text>

              <ScrollView
                style={{ maxHeight: 400 }}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {image ? (
                  <Image
                    source={{ uri: image }}
                    style={{ width: '100%', height: 150, borderRadius: 8, marginBottom: 15 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{
                    alignItems: 'center',
                    height: 150,
                    justifyContent: 'center',
                    backgroundColor: '#f0f0f0',
                    borderRadius: 8,
                    marginBottom: 15
                  }}>
                    <Ionicons name="image-outline" size={50} color="#cccccc" />
                    <Text style={{ color: '#cccccc' }}>No image preview</Text>
                  </View>
                )}

                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 5 }}>Correct Cigar Name</Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#ddd',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      backgroundColor: '#f9f9f9'
                    }}
                    value={newCigar.cigarName}
                    onChangeText={(text) => setNewCigar({ ...newCigar, cigarName: text })}
                    placeholder="Enter the correct cigar name"
                    autoFocus={true}
                  />
                </View>

                {/* <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 5 }}>Correct Brand Name</Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#ddd',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      backgroundColor: '#f9f9f9'
                    }}
                    value={newCigar.cigarBrand}
                    onChangeText={(text) => setNewCigar({ ...newCigar, cigarBrand: text })}
                    placeholder="Enter the correct cigar brand name"
                  />
                </View> */}
              </ScrollView>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 15,
                paddingTop: 15,
                borderTopWidth: 1,
                borderTopColor: '#eee'
              }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    marginRight: 10,
                    padding: 15,
                    backgroundColor: '#f0f0f0',
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
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
                  <Text style={{ color: '#666', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    marginLeft: 10,
                    padding: 15,
                    backgroundColor: (!newCigar.cigarName || isReanalyzing) ? '#ccc' : '#8B4513',
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    const startCardLoading = (cigar) => {
                      const cigarId = cigar.id; // dynamic ✅

                      // 1. Update the specific card in logs
                      setLogs(prev =>
                        prev.map(log =>
                          log.id === cigarId
                            ? { ...log, status: "processing", progress: "Reanalyzing..." }
                            : log
                        )
                      );

                      // 2. Start loading messages
                      startLoadingMessages();

                      // 3. Track as background item
                      setBackgroundProcessing(prev => [...prev, cigarId]);

                      // 4. Set card processing status
                      setProcessingStatus(prev => ({
                        ...prev,
                        [cigarId]: "Reanalyzing..."
                      }));
                    };
                    startCardLoading(selectedCigar);
                    reanalyzeCigarInBackground(
                      selectedCigar.id,
                      selectedCigar.image,
                      newCigar.cigarName,
                      newCigar.cigarBrand
                    );
                    setResultModal(false);
                  }}
                  disabled={!newCigar.cigarName || isReanalyzing}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {isReanalyzing ? "Updating..." : "Update AI"}
                  </Text>
                </TouchableOpacity>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setDetailModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#8B4513" />
          </TouchableOpacity>
          {selectedCigar && (
            <View style={styles.modalContainer}>
              <View style={styles.detailModalContent}>
                <ScrollView
                  style={styles.detailScroll}
                  contentContainerStyle={{ paddingBottom: 80 }} // Increased padding to accommodate sticky bar
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.detailCigarName}>{selectedCigar?.cigarName}</Text>

                  {selectedCigar?.image ? (
                    <Image source={{ uri: selectedCigar?.image }} style={styles.detailImage} resizeMode="cover" />
                  ) : null}

                  {/* Additional Images Section */}
                  <View style={styles.additionalImagesContainer}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 6,
                        marginBottom: 10
                      }}
                    >
                      {/* Left Side: Title */}
                      <View style={{ justifyContent: 'center' }}>
                        <Text
                          style={[
                            styles.additionalImagesTitle,
                            { marginTop: 0, marginBottom: 0, lineHeight: 20 },
                          ]}
                        >
                          HUMI Moments ({(momentsImages?.length || 0) + additionalImages.length}/5)
                        </Text>
                      </View>

                      {/* Right Side: Public label + Toggle */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 16, fontWeight: '500' }}>{!isPublic ? "Private" : "Public"}</Text>
                        <TouchableOpacity onPress={() => setShowTooltip(true)}>
                          <Ionicons name="information-circle-outline" size={20} color="#8B4513" />
                        </TouchableOpacity>
                        <Switch
                          value={isPublic}
                          onValueChange={togglePublicStatus}
                          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                          trackColor={{ true: '#8B4513', false: '#ccc' }}
                          thumbColor="#fff"
                          disabled={(momentsImages?.length || 0) + additionalImages.length === 0}
                        />
                      </View>

                      {/* Tooltip Modal */}
                      {showTooltip && (
                        <View style={styles.tooltipOverlay}>
                          <View style={styles.tooltipBox}>
                            <Text style={styles.tooltipText}>
                              {!isPublic
                                ? "Images will remain private."
                                : "Images will be added to Moments Feed."}
                            </Text>
                            <TouchableOpacity onPress={() => setShowTooltip(false)}>
                              <Text style={styles.tooltipClose}>Got it</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>

                    {imagesloading ? (
                      <View>
                        <ActivityIndicator size={"large"} />
                      </View>
                    ) : (
                      <View style={styles.additionalImagesGrid}>
                        {loading ? (
                          <ActivityIndicator size="large" color="#8B4513" style={{ marginVertical: 20 }} />
                        ) : (
                          <>
                            {/* Combine existing and new images, limit total to 3 */}
                            {[
                              ...(momentsImages?.slice(0, 5) || []),
                              ...(additionalImages?.slice(0, 5) || []),
                            ]
                              .slice(0, 5)
                              .map((image) => {
                                const isNew = !!image.uri;
                                const imageUrl = isNew ? image.uri : image.imageUrl;

                                return (
                                  <TouchableOpacity
                                    key={image.id || image.uri}
                                    style={styles.additionalImageItem}
                                    onPress={() => openImagePreview(image)}
                                    activeOpacity={0.8}
                                  >
                                    <Image source={{ uri: imageUrl }} style={styles.additionalImage} />
                                    <TouchableOpacity
                                      style={styles.removeImageButton}
                                      onPress={() => removeAdditionalImage(image, isNew)}
                                    >
                                      <Ionicons name="close" size={16} color="white" />
                                    </TouchableOpacity>
                                  </TouchableOpacity>
                                );
                              })}

                            {/* Add button if total images are less than 3 */}
                            {((momentsImages?.length || 0) + (additionalImages?.length || 0)) < 5 && (
                              <TouchableOpacity
                                style={styles.addImageButton}
                                onPress={showImageSourceOptions}
                              >
                                <Ionicons name="add" size={24} color="#8B4513" />
                                <Text style={styles.addImageText}>Add pictures of your moments with this Cigar</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                      </View>
                    )}
                  </View>

                  {selectedCigar?.description ? (
                    <View style={styles.aiResponseContainer}>
                      <Text style={styles.aiResponseTitle}>HUMI Story</Text>
                      <Text style={styles.aiResponseText}>
                        {(() => {
                          try {
                            const parsedData = JSON.parse(selectedCigar?.description);
                            return parsedData?.description || selectedCigar?.description;
                          } catch (e) {
                            return selectedCigar?.description;
                          }
                        })()}
                      </Text>
                    </View>
                  ) : null}

                  {selectedCigar?.insights ? (
                    <View style={styles.aiResponseContainer}>
                      <Text style={styles.aiResponseTitle}>HUMI Insights</Text>
                      <Text style={styles.aiResponseText}>
                        {(() => {
                          try {
                            const parsedData = JSON.parse(selectedCigar?.insights);
                            return parsedData.insights || selectedCigar?.insights;
                          } catch (e) {
                            return selectedCigar?.insights;
                          }
                        })()}
                      </Text>
                    </View>
                  ) : null}

                  {/* If cigar IS RATED, or user has clicked "Smoke & Rate" */}
                  {(selectedCigar?.overall || isRating) ? (
                    <View style={styles.ratingCard}>
                      <Text style={styles.cardTitle}>Your Feedback</Text>
                      <Text style={styles.cardDate}>{selectedCigar?.date}</Text>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity key={star} onPress={() => updateCigarRating(star)}>
                            <Ionicons
                              name={star <= (selectedCigar?.overall || 0) ? "star" : "star-outline"}
                              size={34}
                              color="#b8860b"
                              style={styles.starIcon}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.notesLabel}>Notes</Text>

                      <TextInput
                        style={styles.notesInput}
                        value={selectedCigar?.notes}
                        onChangeText={(text) => updateCigarNotes(text)}
                        placeholder="Describe your flavor experience..."
                        multiline={true}
                        maxLength={120}
                      />

                      {error ? (
                        <Text style={{ color: "red", marginTop: 6 }}>
                          {error}
                        </Text>
                      ) : null}

                      <Text style={styles.charCount}>
                        {selectedCigar.notes?.length || 0}/120
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.rateButton}
                      onPress={() => setIsRating(true)}
                    >
                      <Text style={styles.rateButtonText}>Smoke & Rate</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {/* STICKY BOTTOM BAR */}
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  borderTopWidth: 1,
                  borderTopColor: '#e0e0e0',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {/* Fix Issue Button */}
                  <TouchableOpacity
                    onPress={() => {
                      setDetailModalVisible(false);
                      setResultModal(true);
                      setNewCigar({ cigarName: editedCigar?.cigarName });
                      setImage(editedCigar?.image);
                    }}
                    disabled={status !== ''}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: 'white',
                      paddingVertical: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#8B4513',
                      marginRight: 8,
                    }}
                  >
                    <MaterialCommunityIcons name="auto-fix" size={24} color="#8B4513" />
                    <Text style={{ color: '#8B4513', marginLeft: 10, fontWeight: '600', fontSize: 16 }}>
                      Fix Issue
                    </Text>
                  </TouchableOpacity>

                  {/* Save Button */}
                  <TouchableOpacity
                    onPress={saveDetailChanges}
                    disabled={status !== ''}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#8B4513',
                      paddingVertical: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      marginLeft: 8,
                    }}
                  >
                    {status !== '' && <ActivityIndicator size="small" color="white" />}
                    {imagesUploading ? (
                      <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                        Uploading
                      </Text>
                    ) : (
                      <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                        {status !== '' ? status : 'Save'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>

        <Modal
          visible={previewVisible}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPreviewVisible(false)}
            >
              <Ionicons name="close" size={36} color="#8B4513" />
            </TouchableOpacity>
            <Image
              source={{ uri: previewImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
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
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  }
  ,
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
    marginTop: 20
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
  ratingCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d6c2a6',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4a2f16',
    marginBottom: 12,
    textAlign: 'center',
  },

  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },

  starIcon: {
    marginHorizontal: 6,
  },

  notesLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a2f16',
    marginBottom: 8,
  },

  notesInput: {
    backgroundColor: '#f7f2e9',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#3b2b1c',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#d6c2a6',
  },

  charCount: {
    textAlign: 'right',
    color: '#8a6e4a',
    marginTop: 6,
    fontSize: 12,
  },

  rateButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },

  rateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  cardDate: {
    fontSize: 13,
    color: '#8a6e4a',
    textAlign: 'center',
    marginBottom: 14,
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
    height: '90%',
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
  },
  smokeThisButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  smokeThisButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  additionalImagesContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  additionalImagesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  additionalImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 4, // Add consistent gap between items

  },
  additionalImageItem: {
    width: '48%',
    height: 140,
    marginBottom: 8,
    position: 'relative',
    padding: 3
  },
  additionalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: '48%',
    height: 140,
    borderWidth: 2,
    borderColor: '#8B4513',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    marginLeft: 4
  },
  addImageText: {
    marginTop: 4,
    color: '#8B4513',
    fontSize: 12,
    textAlign: 'center',
    padding: 10
  },
  tooltipOverlay: {
    position: 'absolute',
    top: -25,
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  tooltipBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    width: '80%',
    borderWidth: 1,
    borderColor: '#d6c2a6',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },

  tooltipText: {
    color: '#4a2f16',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },

  tooltipClose: {
    color: '#8B4513',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },

  processingLogItem: {
    opacity: 1,
    backgroundColor: '#ecebeb',
  },
  processingImage: {
    opacity: 0.6,
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  processingText: {
    fontSize: 12,
    color: '#8B4513',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginTop: 6,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#ddd",
    marginRight: 10,
  },
  cancelText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  confirmDeleteBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#D32F2F",
  },
  confirmDeleteText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  rowBack: {
    flex: 1,
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    paddingRight: 20,
    opacity: 0.9
  },

  deleteBtn: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  deleteText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalImage: {
    width: "100%",
    height: "90%",
  },

  closeButton: {
    position: "absolute",
    top: 60,
    right: 35,
    zIndex: 100,
  },

});
