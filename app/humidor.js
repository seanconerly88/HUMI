import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, Image, ScrollView, TextInput, KeyboardAvoidingView, Platform, Switch, useWindowDimensions } from 'react-native';
import Icon from './components/Icon';
import LoadingScreen from './components/LoadingScreen';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeCigarImage } from './services/openai';
import { Alert, ActivityIndicator } from 'react-native';
import { auth, db, storage } from '../config/firebaseConfig';
import { collection, addDoc, getDocs, getDoc, query, orderBy, where, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateUserStats } from './services/userStats';
import { trackCigarLog, decrementCigarLog } from '../src/services/cigarTrackingService';
import { recordCigarActivity, updateCigarActivity, deleteCigarActivity } from '../src/services/cigarActivityService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import BandWonModal from './components/BandWonModal';
import { checkForNewBands } from './services/bands';
import * as ImageManipulator from "expo-image-manipulator";
import { SwipeListView } from 'react-native-swipe-list-view';
import { canUserScan, incrementScanCount, getScanUsageInfo, FREE_SCAN_LIMIT } from '../src/services/scanUsageService';
import { getSubscription, isPremium as checkIsPremium, isOnActiveTrial as checkIsOnTrial } from '../src/services/subscriptionService';
import UpgradeModal from './components/UpgradeModal';
import ScanResultModal from './components/ScanResultModal';
import { DEV_MODE_ENABLED, mockCigarLogs } from '../src/services/devModeData';

export default function HumidorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const action = route.params?.action;
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const numColumns = isDesktop ? (width >= 1200 ? 3 : 2) : 1;
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
  const [showAccuracyConfirmModal, setShowAccuracyConfirmModal] = useState(false);
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
  const [aiFallbackMessage, setAiFallbackMessage] = useState(null); // Show AI errors on screen
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

  // Scan limit and upgrade modal state
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [userIsOnTrial, setUserIsOnTrial] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [scanResultCigar, setScanResultCigar] = useState(null);
  const [scanResultVisible, setScanResultVisible] = useState(false);
  const [scansRemaining, setScansRemaining] = useState(FREE_SCAN_LIMIT);

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


  const openImagePreview = (image) => {
    const url = typeof image === 'string' ? image : (image?.imageUrl || image?.uri || image);
    setPreviewImage(url);
    setPreviewVisible(true);
  };


  const deleteLog = async () => {
    if (!logToDelete) return;

    try {
      const userId = auth.currentUser?.uid;
      const docRef = doc(db, "users", userId, "logs", logToDelete.id);

      // Delete from Firestore
      await deleteDoc(docRef);

      await deleteCigarActivity({ userId, logId: logToDelete.id, cigarName: logToDelete.cigarName || logToDelete.fullName });

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
    if (DEV_MODE_ENABLED) {
      setUserIsPremium(true);
      setUserIsOnTrial(false);
      setScansRemaining(99);
      return;
    }

    const checkUserStatus = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      try {
        const subscription = await getSubscription(userId);
        const isPremium = checkIsPremium(subscription);
        const isOnTrial = checkIsOnTrial(subscription);
        setUserIsPremium(isPremium);
        setUserIsOnTrial(isOnTrial);
        
        const scanInfo = await getScanUsageInfo(userId, isPremium, isOnTrial);
        setScansRemaining(scanInfo.remaining);
      } catch (error) {
        console.error('Error checking user status:', error);
      }
    };
    
    checkUserStatus();
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
      setImage(null);
      pickImage();
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
        // Record successful scan for usage tracking (only on first image of batch)
        if (index === 0 && !userIsPremium) {
          await incrementScanCount(userId);
          // Update remaining scans display
          const scanInfo = await getScanUsageInfo(userId, userIsPremium);
          setScansRemaining(scanInfo.remaining);
        }

        // Show visible banner if AI failed (Alert.alert doesn't work on iOS PWA)
        if (aiAnalysisResult.isFallback) {
          console.log('⚠️ AI Fallback triggered:', aiAnalysisResult.errorMessage);
          setAiFallbackMessage(aiAnalysisResult.errorMessage || 'Could not identify cigar. You can enter the name manually.');
        } else {
          setAiFallbackMessage(null);
        }
        
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

          if (aiAnalysisResult.peopleSaying) {
            setHumiInsights({ summary: aiAnalysisResult.peopleSaying, hasReviews: true });
          } else if (cigarName || cigarBrand) {
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

      if (DEV_MODE_ENABLED) {
        setLogs(mockCigarLogs);
        setLoading(false);
        return;
      }

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
            date: data.submittedDate?.toDate
              ? data.submittedDate.toDate().toISOString().split('T')[0]
              : (typeof data.submittedDate === 'string'
                ? new Date(data.submittedDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]),
            cigarName: data.fullName || 'Unknown Cigar',
            overall: data.overall ?? null,
            notes: data.notes || '',
            insights: data.insights || '',
            humiBlurb: data.humiBlurb || data.description || '',
            peopleSaying: data.peopleSaying || '',
            image: imageUri,
            description: data.humiBlurb || data.description || (data.aiRawResponseSnapshot || ''),
            commonNotes: data.commonNotes || '',
            recommendedPairings: data.recommendedPairings || '',
            additionalImages: data?.additionalImages || [],
            status: 'completed'
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

      let humiInsights = aiAnalysisResult.peopleSaying || "";
      if (!humiInsights) {
        try {
          const insights = await getHumiInsights(cigarName, cigarBrand);
          humiInsights = insights.summary;
        } catch (err) {
          humiInsights = "Unable to fetch insights at this time.";
        }
      }

      // 3️⃣ Update Firestore log
      const cigarRef = doc(db, "users", userId, "logs", cigarId);

      const updatedData = {
        fullName: cigarName,
        brand: cigarBrand || aiAnalysisResult.cigarBrand || "",
        line: aiAnalysisResult.cigarLine || "",
        description: aiAnalysisResult.humiBlurb || aiAnalysisResult.description || aiAnalysisResult.bandDescription || "",
        humiBlurb: aiAnalysisResult.humiBlurb || aiAnalysisResult.description || "",
        peopleSaying: aiAnalysisResult.peopleSaying || "",
        aiResponse: aiAnalysisResult.humiBlurb || aiAnalysisResult.description || "",
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

      const oldLogSnap = await getDoc(cigarRef);
      const oldCigarIdValue = oldLogSnap.exists() ? oldLogSnap.data().cigarId : null;

      await updateDoc(cigarRef, updatedData);

      const reanalyzedCigarId = await trackCigarLog(cigarName, cigarBrand || aiAnalysisResult.cigarBrand);
      if (reanalyzedCigarId) {
        await updateDoc(cigarRef, { cigarId: reanalyzedCigarId });
        if (oldCigarIdValue && oldCigarIdValue !== reanalyzedCigarId) {
          await decrementCigarLog(oldCigarIdValue);
        }
      }

      // 4️⃣ Update all logsMomentsImages for this logId
      const imgsQuery = query(
        collection(db, "logsMomentsImages"),
        where("logId", "==", cigarId),
        where("ownerId", "==", userId) // only images owned by current user
      );

      const imgsSnap = await getDocs(imgsQuery);
      const batch = writeBatch(db);

      imgsSnap.forEach((docSnap) => {
        batch.update(docSnap.ref, { 
          fullName: cigarName, 
          updatedAt: new Date(),
          visibleAt: new Date(Date.now() + 3 * 60 * 1000)
        });
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

  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);

  // Check scan limit before allowing scan
  const checkScanLimitAndProceed = async (proceedCallback) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert('Sign In Required', 'Please sign in to scan cigars.');
      return;
    }

    try {
      const scanCheck = await canUserScan(userId, userIsPremium);
      setScansRemaining(scanCheck.remaining);
      
      if (!scanCheck.canScan) {
        // User has hit their limit - show upgrade modal
        setShowUpgradeModal(true);
        return;
      }
      
      // User can scan - proceed
      proceedCallback();
    } catch (error) {
      console.error('Error checking scan limit:', error);
      // Allow scan on error to not block users
      proceedCallback();
    }
  };

  // Called when user successfully upgrades
  const handleUpgradeSuccess = async () => {
    setShowUpgradeModal(false);
    // Refresh user status
    const userId = auth.currentUser?.uid;
    if (userId) {
      const subscription = await getSubscription(userId);
      const isPremium = checkIsPremium(subscription);
      setUserIsPremium(isPremium);
      setScansRemaining(Infinity);
    }
  };

  const pickImage = async () => {
    // Check scan limit first
    await checkScanLimitAndProceed(() => {
      if (Platform.OS === 'web') {
        // On web, show a custom modal for image source selection
        setImagePickerModalVisible(true);
      } else {
        // On native, use Alert
        Alert.alert(
          "Add Cigar Image",
          "Choose image source",
          [
            {
              text: "Camera",
              onPress: () => handleCameraCapture()
            },
            {
              text: "Photo Library",
              onPress: () => handleLibraryPick()
            },
            {
              text: "Cancel",
              style: "cancel"
            }
          ]
        );
      }
    });
  };

  const handleCameraCapture = async () => {
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
  };

  const handleLibraryPick = async () => {
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
  };

  const handleImageResult = async (result) => {
    setImagePickerModalVisible(false); // Close picker modal if open
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const pickedImageUri = result.assets[0].uri;
      console.log("📸 Image picked:", pickedImageUri);

      // On web, skip file system operations
      if (Platform.OS === 'web') {
        try {
          const compressed = await ImageManipulator.manipulateAsync(
            pickedImageUri,
            [{ resize: { width: 800 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          console.log("✅ Image compressed:", compressed.uri);
          setImageWithRef(compressed.uri);
        } catch (err) {
          console.error("🚨 Error preparing image:", err);
          setImageWithRef(pickedImageUri);
        }
        setModalVisible(true);
        return;
      }

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
      const logEntryData = {
        brand: aiAnalysisResult.cigarBrand || '',
        line: aiAnalysisResult.cigarLine || '',
        fullName: cigarName,
        description: aiAnalysisResult.humiBlurb || aiAnalysisResult.description || '',
        humiBlurb: aiAnalysisResult.humiBlurb || aiAnalysisResult.description || '',
        peopleSaying: aiAnalysisResult.peopleSaying || '',
        aiResponse: aiAnalysisResult.humiBlurb || aiAnalysisResult.description || '',
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

      const trackedCigarId = await trackCigarLog(cigarName, aiAnalysisResult.cigarBrand);
      if (trackedCigarId) logEntryData.cigarId = trackedCigarId;

      // Save to Firestore
      const userLogDocRef = await addDoc(collection(db, 'users', userId, 'logs'), logEntryData);
      console.log('Cigar saved to Firebase:', userLogDocRef.id);

      recordCigarActivity({ userId, logId: userLogDocRef.id, cigarId: logEntryData.cigarId, cigarName, brand: aiAnalysisResult.cigarBrand || '', overall: null, notes: '', submittedDate: logEntryData.submittedDate });

      // Also save image to logsMomentsImages for Feed display (so other users can see it)
      if (firebaseImageUrl) {
        try {
          await addDoc(collection(db, 'logsMomentsImages'), {
            imageUrl: firebaseImageUrl,
            ownerId: userId,
            logId: userLogDocRef.id,
            fullName: cigarName,
            overall: null,
            note: '',
            isPublic: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            visibleAt: new Date(Date.now() + 3 * 60 * 1000),
            insights: humiInsights,
            humiBlurb: aiAnalysisResult.humiBlurb || aiAnalysisResult.description || '',
            peopleSaying: aiAnalysisResult.peopleSaying || '',
            aiRawResponseSnapshot: JSON.stringify(aiAnalysisResult),
            description: aiAnalysisResult.humiBlurb || aiAnalysisResult.description || '',
            commonNotes: aiAnalysisResult.commonNotes || '',
            recommendedPairings: aiAnalysisResult.recommendedPairings || '',
            brand: aiAnalysisResult.cigarBrand || '',
          });
          console.log('✅ Image saved to logsMomentsImages (visible in 3 min)');
        } catch (momentsError) {
          console.error('Could not save to logsMomentsImages:', momentsError);
        }
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

        const offlineCigarEntry = {
          ...logEntryData,
          localImageUri: imageUri,
          imageUrl: '',
          pendingUpload: true,
          offlineId: tempId,
          savedAt: new Date().toISOString()
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

  const withOverallTimeout = (promise, timeoutMs, label) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`)), timeoutMs)
      ),
    ]);
  };

  const processSingleCigarInBackground = async (tempId, imageUri) => {
    try {
      const userId = auth.currentUser?.uid || "test-user";

      setProcessingStatus(prev => ({
        ...prev,
        [tempId]: 'Identifying cigar...'
      }));

      const aiAnalysisResult = await withOverallTimeout(
        analyzeCigarImage(imageUri, userId),
        75000,
        'Cigar analysis'
      );

      if (aiAnalysisResult && aiAnalysisResult.isFallback) {
        console.error('🚨 Scan failed with error:', aiAnalysisResult.errorMessage);
        const errorDetail = aiAnalysisResult.errorMessage || 'Unknown error';
        setLogs(prev => prev.map(log =>
          log.id === tempId
            ? { ...log, status: 'error', cigarName: 'Scan Failed', description: errorDetail }
            : log
        ));
        setBackgroundProcessing(prev => prev.filter(id => id !== tempId));
        setProcessingStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[tempId];
          return newStatus;
        });
        setAiFallbackMessage(`Scan error: ${errorDetail}`);
        return;
      }

      if (aiAnalysisResult) {
        const cigarBrand = aiAnalysisResult.cigarBrand?.trim() || "";
        const cigarName = aiAnalysisResult.fullName?.trim() || aiAnalysisResult.cigarLine?.trim() || "Unknown Cigar";

        let humiInsights = aiAnalysisResult.peopleSaying || '';
        if (!humiInsights) {
          try {
            const insights = await getHumiInsights(cigarName, cigarBrand);
            humiInsights = insights.summary;
          } catch (error) {
            console.error('Error fetching insights:', error);
            humiInsights = 'Unable to fetch insights at this time.';
          }
        }

        const savedCigarId = await saveProcessedCigarToFirebase({
          imageUri,
          aiAnalysisResult,
          cigarName,
          humiInsights,
          userId,
          tempId
        });

        const processedCigar = {
          id: savedCigarId,
          cigarName: cigarName,
          date: new Date().toISOString().split('T')[0],
          status: 'completed',
          image: imageUri,
          aiResponse: aiAnalysisResult?.humiBlurb || aiAnalysisResult?.description,
          description: aiAnalysisResult?.humiBlurb || aiAnalysisResult?.description,
          humiBlurb: aiAnalysisResult?.humiBlurb || aiAnalysisResult?.description || '',
          peopleSaying: aiAnalysisResult?.peopleSaying || '',
          commonNotes: aiAnalysisResult?.commonNotes || '',
          recommendedPairings: aiAnalysisResult?.recommendedPairings || '',
          overall: null,
          notes: '',
          insights: humiInsights,
          additionalImages: [],
          isPublic: true
        };

        setLogs(prev => prev.map(log =>
          log.id === tempId ? processedCigar : log
        ));

        // 🎉 Show celebration reveal immediately after scan completes
        setScanResultCigar(processedCigar);
        setScanResultVisible(true);

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
      const isTimeout = error.message?.includes('timed out') || error.name === 'AbortError';
      setLogs(prev => prev.map(log =>
        log.id === tempId
          ? { ...log, status: 'error', cigarName: isTimeout ? 'Scan Timed Out' : 'Processing Error' }
          : log
      ));
      setBackgroundProcessing(prev => prev.filter(id => id !== tempId));
      setProcessingStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[tempId];
        return newStatus;
      });
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
        description: parsedAiData.humiBlurb || catalogData.description || parsedAiData.description || '',
        humiBlurb: parsedAiData.humiBlurb || catalogData.description || parsedAiData.description || '',
        peopleSaying: parsedAiData.peopleSaying || '',
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
        imageUrl: firebaseImageUrlAttempt,
        localImageFilePath: localImageToSave,
        reviewed: false,
        aiAccuracyFeedback: aiAccuracyFeedback,
        userCorrected: showNameEditField || (finalCigarName !== (parsedAiData.fullName || '')),
        aiIdentified: !!(parsedAiData.cigarBrand || parsedAiData.fullName) && !parsedAiData.aiError,
        fromCatalog: !!(catalogSnapshot && !catalogSnapshot.empty),
        aiRawResponseSnapshot: JSON.stringify(cleanedAiResponse),
        insights: humiInsights
      };

      const trackedCigarId2 = await trackCigarLog(finalCigarName, catalogData.brand || parsedAiData.cigarBrand);
      if (trackedCigarId2) logEntryData.cigarId = trackedCigarId2;

      const userLogDocRef = await addDoc(collection(db, 'users', userId, 'logs'), logEntryData);
      console.log('Successfully saved to Firebase user logs:', userLogDocRef.id);
      successfullySavedOnline = true;

      recordCigarActivity({ userId, logId: userLogDocRef.id, cigarId: logEntryData.cigarId, cigarName: finalCigarName, brand: catalogData.brand || parsedAiData.cigarBrand || '', overall: newCigar.overall, notes: newCigar.notes || '', submittedDate: logEntryData.submittedDate });

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
          date: new Date(),
          submittedDate: new Date(),
          localImageUri: localImageToSave,
          imageUrl: '',
          submittedBy: auth.currentUser?.uid || 'test-user',
          pendingUpload: true,
          offlineId: `offline-${Date.now()}`,
          savedAt: new Date(),
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

  // Check if AI accuracy confirmation is needed
  const needsAccuracyConfirmation = () => {
    return selectedCigar?.aiIdentified === true && selectedCigar?.reviewed === false;
  };

  // Handle close/save with confirmation check
  const handleDetailModalClose = () => {
    if (needsAccuracyConfirmation()) {
      setShowAccuracyConfirmModal(true);
    } else {
      setDetailModalVisible(false);
    }
  };

  // Handle accuracy confirmation - Yes (correct reading)
  const handleAccuracyConfirmYes = async () => {
    setShowAccuracyConfirmModal(false);
    // Mark as reviewed in Firestore first
    const userId = auth.currentUser?.uid;
    const logId = selectedCigar?.id;
    if (userId && logId) {
      try {
        const logRef = doc(db, 'users', userId, 'logs', logId);
        await updateDoc(logRef, {
          reviewed: true,
          updatedAt: serverTimestamp(),
        });
        // Update local state so subsequent saves know it's reviewed
        setSelectedCigar(prev => ({ ...prev, reviewed: true }));
      } catch (e) {
        console.log('Error marking as reviewed:', e);
      }
    }
    // Now proceed with save (which may post to feed)
    saveDetailChanges();
  };

  // Handle accuracy confirmation - No (incorrect reading)
  const handleAccuracyConfirmNo = () => {
    setShowAccuracyConfirmModal(false);
    setDetailModalVisible(false);
    // Open Fix Issue flow
    setResultModal(true);
    setNewCigar({ cigarName: selectedCigar?.cigarName });
    setImage(selectedCigar?.image);
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
      overall:cigar?.overall,
      notes:cigar?.notes
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
          <Icon
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
    const logId = editedCigar.id;
    const hadImagesToUpload = additionalImages.length > 0; // Track before clearing
    setStatus("Saving...");
    // disable uploads while processing
    const rating = selectedCigar?.overall || 0;
    const notes = selectedCigar?.notes?.trim() || "";

    if (rating || notes) {
      if (!rating) {
        setError("Please select a rating.");
        setImagesUploading(false)
        setStatus("");

        return;
      }
      if (!notes) {
        setError("Please enter notes for your rating.");
        setImagesUploading(false)
        setStatus("");
        return;
      }
      setError("");
    }

    try {
      // Fetch the owner's log to get insights data (owner can read their own log)
      let logData = {};
      try {
        const logRef = doc(db, 'users', userId, 'logs', logId);
        const logSnap = await getDoc(logRef);
        if (logSnap.exists()) {
          logData = logSnap.data();
          console.log('📌 Fetched log data for insights:', { 
            hasInsights: !!logData.insights, 
            hasAiSnapshot: !!logData.aiRawResponseSnapshot 
          });
        }
      } catch (e) {
        console.log('Could not fetch log for insights:', e);
      }

      const updatedData = {
        fullName: editedCigar.cigarName || "Unknown Cigar",
        overall: editedCigar.overall ?? null,
        notes: editedCigar.notes || "",
        updatedAt: serverTimestamp(),
      };

      // Save rating and notes to the user's log document (this was missing!)
      const logRef = doc(db, 'users', userId, 'logs', logId);
      await updateDoc(logRef, {
        overall: editedCigar.overall ?? null,
        notes: editedCigar.notes || "",
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Rating and notes saved to log document');

      updateCigarActivity({ userId, logId, cigarName: editedCigar.cigarName, overall: editedCigar.overall, notes: editedCigar.notes });

      // Data to include for Feed display (so other users can see insights)
      // Only include fields that have actual values to avoid overwriting existing data
      const insightsData = {};
      if (logData.insights) insightsData.insights = logData.insights;
      if (logData.humiBlurb) insightsData.humiBlurb = logData.humiBlurb;
      if (logData.peopleSaying) insightsData.peopleSaying = logData.peopleSaying;
      if (logData.aiRawResponseSnapshot) insightsData.aiRawResponseSnapshot = logData.aiRawResponseSnapshot;
      if (logData.description) insightsData.description = logData.description;
      if (logData.commonNotes) insightsData.commonNotes = logData.commonNotes;
      if (logData.recommendedPairings) insightsData.recommendedPairings = logData.recommendedPairings;
      if (logData.brand) insightsData.brand = logData.brand;

      // 1️⃣ Update all existing images for this logId (owned by user) - include insights data
      const q = query(
        collection(db, "logsMomentsImages"),
        where("logId", "==", logId),
        where("ownerId", "==", userId)
      );

      const imgsSnap = await getDocs(q);
      const batch = writeBatch(db);

      imgsSnap.forEach((docSnap) => {
        batch.update(docSnap.ref, { ...updatedData, ...insightsData });
      });

      await batch.commit();

      // 2️⃣ Delete removed images
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

      // 3️⃣ Upload new images (if any)
      if (additionalImages.length > 0) {
        setImagesUploading(true);
        // Alert.alert(
        //   "Uploading Images",
        //   "Your images are uploading in the background..."
        // );

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
              fullName: editedCigar?.cigarName,
              overall: editedCigar?.overall,
              note: editedCigar.notes,
              isPublic: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              // Include insights data for Feed display (fetched from owner's log)
              ...insightsData,
            });
            setImagesUploading(false)
            console.log("✅ Image uploaded:", downloadURL);
          } catch (err) {
            setImagesUploading(false)
            console.error("❌ Error uploading image:", err);
          }
        });

        // Wait until all uploads are finished
        await Promise.all(uploadPromises);
        console.log("✅ All HUMI Moments uploaded successfully");
        Alert.alert("Success", "HUMI Moment saved!");
      } else {
        // No images to upload, just show details updated
        setImagesUploading(false)
        Alert.alert("Success", "Details updated successfully");
      }

      // 4️⃣ Update UI instantly
      setSelectedCigar((prev) => ({ ...prev, ...updatedData }));
      setLogs((prev) =>
        prev.map((log) =>
          log.id === editedCigar.id ? { ...log, ...updatedData } : log
        )
      );

      // 5️⃣ Reset temporary states and refresh images BEFORE closing modal
      setAdditionalImages([]);
      setImagesToDelete([]);
      
      // Refresh images to show newly uploaded moments
      if (hadImagesToUpload) {
        await fetchOwnerImages(logId);
      }
      
      // Close modal after refresh is complete
      setDetailModalVisible(false);
    } catch (error) {
      console.error("❌ Error saving changes:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setStatus("");
      setImagesUploading(false);
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
          const { pendingUpload, offlineId, savedAt, ...cigarData } = cigar;

          const syncCigarId = await trackCigarLog(cigarData.fullName, cigarData.brand);
          if (syncCigarId) cigarData.cigarId = syncCigarId;

          const syncLogRef = await addDoc(collection(db, 'users', userId, 'logs'), cigarData);

          recordCigarActivity({ userId, logId: syncLogRef.id, cigarId: cigarData.cigarId, cigarName: cigarData.fullName, brand: cigarData.brand || '', overall: cigarData.overall, notes: cigarData.notes || '', submittedDate: cigarData.submittedDate || cigarData.date });

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

      // Call backend proxy for Brave Search (API key stays on server)
      // Use absolute URL for PWA compatibility across different domains
      const baseUrl = Platform.OS === 'web' ? window.location.origin : '';
      const braveController = new AbortController();
      const braveTimer = setTimeout(() => braveController.abort(), 15000);
      const response = await fetch(`${baseUrl}/api/brave/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
        signal: braveController.signal,
      });
      clearTimeout(braveTimer);

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

      const chatController = new AbortController();
      const chatTimer = setTimeout(() => chatController.abort(), 30000);
      const aiResponse = await fetch(`${baseUrl}/api/openai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: synthesisPrompt,
          userId: auth.currentUser?.uid || 'anonymous',
          model: "gpt-4o-mini",
          maxTokens: 200,
        }),
        signal: chatController.signal,
      });
      clearTimeout(chatTimer);

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `OpenAI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const summary = aiData.content || "Unable to analyze reviews at this time.";

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
    return <LoadingScreen />;
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
        console.log(`Picked image URI: ${asset.uri}`);
        
        // On web, FileSystem.getInfoAsync doesn't work for blob URLs
        // Skip size check on web or use asset.fileSize if available
        if (Platform.OS !== 'web') {
          try {
            const fileInfo = await FileSystem.getInfoAsync(asset.uri);
            console.log(`Image size: ${fileInfo.size} bytes (${(fileInfo.size / (1024 * 1024)).toFixed(2)} MB)`);

            if (fileInfo.size > 2 * 1024 * 1024) { // 2 MB
              Alert.alert(
                'Image too large',
                'Please select an image under 2 MB.'
              );
              continue; // skip this image
            }
          } catch (e) {
            console.log('Could not get file info:', e);
          }
        } else if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
          // Web: use asset.fileSize if available
          Alert.alert(
            'Image too large',
            'Please select an image under 2 MB.'
          );
          continue;
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
    const remainingSlots = 5 - totalImages;

    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', 'You can only add up to 5 HUMI Moments');
      return;
    }

    // On web/PWA, Alert.alert() with button callbacks doesn't work properly
    // Directly launch the image library picker instead
    if (Platform.OS === 'web') {
      pickAdditionalImages('library', remainingSlots);
      return;
    }

    // On native (iOS/Android), show the action sheet
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
        {isDesktop && !isProcessing && (
          <TouchableOpacity
            style={styles.desktopDeleteBtn}
            onPress={(e) => {
              e.stopPropagation();
              openDeleteModal(item);
            }}
            activeOpacity={0.7}
          >
            <Icon name="trash-outline" size={16} color="#999" />
          </TouchableOpacity>
        )}
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
            setImage(null);
            pickImage();
          }}
        >
          <Icon name="add-circle" size={32} color="#8B4513" />
        </TouchableOpacity>
      </View>

      {/* Image Picker Modal for Web */}
      <Modal
        transparent
        visible={imagePickerModalVisible}
        animationType="fade"
        onRequestClose={() => setImagePickerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Icon name="camera" size={44} color="#8B4513" />
            <Text style={styles.modalTitle}>Add Cigar Image</Text>
            <Text style={styles.modalMessage}>Choose how to add your cigar photo</Text>
            
            <View style={{ width: '100%', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.emptyStateButton, { marginBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                onPress={() => {
                  setImagePickerModalVisible(false);
                  handleCameraCapture();
                }}
              >
                <Icon name="camera" size={20} color="#fff" />
                <Text style={[styles.emptyStateButtonText, { marginLeft: 8 }]}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.emptyStateButton, { marginBottom: 0, backgroundColor: '#5D4037', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                onPress={() => {
                  setImagePickerModalVisible(false);
                  handleLibraryPick();
                }}
              >
                <Icon name="images" size={20} color="#fff" />
                <Text style={[styles.emptyStateButtonText, { marginLeft: 8 }]}>Choose from Library</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.cancelBtn, { marginTop: 8 }]}
                onPress={() => setImagePickerModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {logs.length > 0 ? (
        isDesktop ? (
          <FlatList
            data={logs}
            keyExtractor={(item) => item.id}
            renderItem={renderFrontItem}
            numColumns={numColumns}
            key={numColumns}
            contentContainerStyle={styles.desktopGrid}
            columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          />
        ) : (
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
        )
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
            <Icon name="trash-outline" size={44} color="#D32F2F" />

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

      {/* AI Accuracy Confirmation Modal */}
      <Modal
        transparent
        visible={showAccuracyConfirmModal}
        animationType="fade"
        onRequestClose={() => setShowAccuracyConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Icon name="help-circle-outline" size={44} color="#8B4513" />

            <Text style={styles.modalTitle}>Did we get it right?</Text>
            <Text style={[styles.modalMessage, { fontWeight: '600', color: '#333', marginBottom: 8 }]}>
              {selectedCigar?.cigarName}
            </Text>
            <Text style={styles.modalMessage}>
              Is this the correct cigar identification?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: '#8B4513', borderWidth: 1 }]}
                onPress={handleAccuracyConfirmNo}
              >
                <Text style={[styles.cancelText, { color: '#8B4513' }]}>No, Fix It</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmDeleteBtn, { backgroundColor: '#8B4513' }]}
                onPress={handleAccuracyConfirmYes}
              >
                <Text style={styles.confirmDeleteText}>Yes, Correct</Text>
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
                  <Icon name="camera" size={40} color="#8B4513" />
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

              {/* AI Error Banner - visible on mobile */}
              {aiFallbackMessage && (
                <View style={{
                  backgroundColor: '#FFF3CD',
                  borderColor: '#856404',
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 15,
                }}>
                  <Text style={{ color: '#856404', fontWeight: '600', marginBottom: 4 }}>AI Recognition Issue</Text>
                  <Text style={{ color: '#856404', fontSize: 13 }}>{aiFallbackMessage}</Text>
                  <TouchableOpacity 
                    onPress={() => setAiFallbackMessage(null)}
                    style={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <Text style={{ color: '#856404', fontSize: 18 }}>×</Text>
                  </TouchableOpacity>
                </View>
              )}

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
                    <Icon name="image-outline" size={50} color="#cccccc" />
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
        onRequestClose={handleDetailModalClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDetailModalClose}
          >
            <Icon name="close" size={24} color="#8B4513" />
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

                  {/* AFTER SMOKED: Show experience/moments section at top */}
                  {(selectedCigar?.overall || isRating) && (
                    <>
                      {/* Your Experience Card - Rating + Notes + Moments */}
                      <View style={styles.ratingCard}>
                        <Text style={styles.cardTitle}>Your Experience</Text>
                        <Text style={styles.cardDate}>{selectedCigar?.date}</Text>
                        
                        {/* Rating Stars */}
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => updateCigarRating(star)}>
                              <Icon
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
                          <Text style={{ color: "red", marginTop: 6 }}>{error}</Text>
                        ) : null}
                        <Text style={styles.charCount}>{selectedCigar.notes?.length || 0}/120</Text>

                        {/* HUMI Moments Section - inside experience card */}
                        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 16 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={[styles.additionalImagesTitle, { marginTop: 0, marginBottom: 0, lineHeight: 20 }]}>
                              HUMI Moments ({(momentsImages?.length || 0) + additionalImages.length}/5)
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 16, fontWeight: '500' }}>{!isPublic ? "Private" : "Public"}</Text>
                              <TouchableOpacity onPress={() => setShowTooltip(true)}>
                                <Icon name="information-circle-outline" size={20} color="#8B4513" />
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
                          </View>
                          {showTooltip && (
                            <View style={styles.tooltipOverlay}>
                              <View style={styles.tooltipBox}>
                                <Text style={styles.tooltipText}>
                                  {!isPublic ? "Images will remain private." : "Images will be added to Moments Feed."}
                                </Text>
                                <TouchableOpacity onPress={() => setShowTooltip(false)}>
                                  <Text style={styles.tooltipClose}>Got it</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                          {imagesloading ? (
                            <ActivityIndicator size="large" />
                          ) : (
                            <View style={styles.additionalImagesGrid}>
                              {loading ? (
                                <ActivityIndicator size="large" color="#8B4513" style={{ marginVertical: 20 }} />
                              ) : (
                                <>
                                  {[...(momentsImages?.slice(0, 5) || []), ...(additionalImages?.slice(0, 5) || [])]
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
                                            <Icon name="close" size={16} color="white" />
                                          </TouchableOpacity>
                                        </TouchableOpacity>
                                      );
                                    })}
                                  {((momentsImages?.length || 0) + (additionalImages?.length || 0)) < 5 && (
                                    <TouchableOpacity style={styles.addImageButton} onPress={showImageSourceOptions}>
                                      <Icon name="add" size={24} color="#8B4513" />
                                      <Text style={styles.addImageText}>Add pictures of your moments with this Cigar</Text>
                                    </TouchableOpacity>
                                  )}
                                </>
                              )}
                            </View>
                          )}
                        </View>
                      </View>
                    </>
                  )}

                  {/* HUMI Blurb - premium/trial only */}
                  {(userIsPremium || userIsOnTrial) && (selectedCigar?.humiBlurb || selectedCigar?.description) ? (
                    <View style={styles.aiResponseContainer}>
                      <Text style={styles.aiResponseText}>
                        {(() => {
                          const blurb = selectedCigar?.humiBlurb || selectedCigar?.description || '';
                          try {
                            const parsed = JSON.parse(blurb);
                            return parsed?.humiBlurb || parsed?.description || blurb;
                          } catch (e) {
                            return blurb;
                          }
                        })()}
                      </Text>
                    </View>
                  ) : null}

                  {/* Premium Section: Tasting Notes + What People Are Saying + Pairings */}
                  {(selectedCigar?.commonNotes || selectedCigar?.peopleSaying || selectedCigar?.insights || selectedCigar?.recommendedPairings) ? (
                    (userIsPremium || userIsOnTrial) ? (
                      /* Premium/trial users see everything */
                      <View style={{ marginTop: 12, gap: 12 }}>
                        {selectedCigar?.commonNotes ? (
                          <View>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B4513', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Tasting Notes</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {selectedCigar.commonNotes.split(',').map((note, idx) => (
                                <View key={idx} style={{ backgroundColor: '#f5f0eb', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: '#e0d5c9' }}>
                                  <Text style={{ fontSize: 13, color: '#5a3e2b', fontWeight: '500' }}>{note.trim()}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        ) : null}
                        {(selectedCigar?.peopleSaying || selectedCigar?.insights) ? (
                          <View style={{ backgroundColor: '#f5f0eb', borderRadius: 12, padding: 14 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B4513', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>What People Are Saying</Text>
                            <Text style={{ fontSize: 14, color: '#333', lineHeight: 21 }}>
                              {(() => {
                                const text = selectedCigar?.peopleSaying || selectedCigar?.insights || '';
                                try {
                                  const parsed = JSON.parse(text);
                                  return parsed?.peopleSaying || parsed?.insights || text;
                                } catch (e) {
                                  return text;
                                }
                              })()}
                            </Text>
                          </View>
                        ) : null}
                        {selectedCigar?.recommendedPairings ? (
                          <View style={{ backgroundColor: '#f5f0eb', borderRadius: 12, padding: 14 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B4513', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Pairs Well With</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {selectedCigar.recommendedPairings.split(',').map((pairing, idx) => (
                                <View key={idx} style={{ backgroundColor: '#fff', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: '#e0d5c9' }}>
                                  <Text style={{ fontSize: 13, color: '#5a3e2b', fontWeight: '500' }}>{pairing.trim()}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      /* Free users: blurred placeholder for the whole premium section */
                      <View style={{ marginTop: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                          <Icon name="lock-closed" size={13} color="#8B4513" />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#8B4513', textTransform: 'uppercase', letterSpacing: 0.5 }}>Premium Content</Text>
                        </View>
                        <View style={{ position: 'relative' }}>
                          <View style={{ gap: 12,
                            ...(Platform.OS === 'web' ? { filter: 'blur(5px)', WebkitFilter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' } : {}) }}>
                            {/* Tasting notes placeholder */}
                            <View style={{ opacity: Platform.OS === 'web' ? 1 : 0.18 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B4513', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Tasting Notes</Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {['earth', 'spice', 'leather', 'cedar'].map((note, idx) => (
                                  <View key={idx} style={{ backgroundColor: '#f5f0eb', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: '#e0d5c9' }}>
                                    <Text style={{ fontSize: 13, color: '#5a3e2b', fontWeight: '500' }}>{note}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                            {/* What People Are Saying placeholder */}
                            <View style={{ backgroundColor: '#f5f0eb', borderRadius: 12, padding: 14, opacity: Platform.OS === 'web' ? 1 : 0.18 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B4513', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>What People Are Saying</Text>
                              <Text style={{ fontSize: 14, color: '#5a3e2b', lineHeight: 20 }} numberOfLines={3}>
                                Cigar lovers consistently praise the draw and construction on this one. The cedar and spice notes come through beautifully from start to finish.
                              </Text>
                            </View>
                            {/* Pairs Well With placeholder */}
                            <View style={{ backgroundColor: '#f5f0eb', borderRadius: 12, padding: 14, opacity: Platform.OS === 'web' ? 1 : 0.18 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B4513', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Pairs Well With</Text>
                              <View style={{ flexDirection: 'row', gap: 8 }}>
                                <View style={{ backgroundColor: '#fff', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: '#e0d5c9' }}><Text style={{ fontSize: 13, color: '#5a3e2b' }}>Bourbon</Text></View>
                                <View style={{ backgroundColor: '#fff', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: '#e0d5c9' }}><Text style={{ fontSize: 13, color: '#5a3e2b' }}>Espresso</Text></View>
                                <View style={{ backgroundColor: '#fff', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: '#e0d5c9' }}><Text style={{ fontSize: 13, color: '#5a3e2b' }}>Dark Chocolate</Text></View>
                              </View>
                            </View>
                          </View>
                          {Platform.OS !== 'web' && (
                            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(249,245,240,0.88)', borderRadius: 12 }} />
                          )}
                        </View>
                      </View>
                    )
                  ) : null}

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
                }}>
                  {/* Smoke & Rate — available to ALL users when unrated */}
                  {!(selectedCigar?.overall || isRating) && (
                    <TouchableOpacity
                      onPress={() => setIsRating(true)}
                      style={{
                        width: '100%',
                        backgroundColor: '#8B4513',
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Smoke & Rate</Text>
                    </TouchableOpacity>
                  )}
                  {/* Unlock with Premium — secondary, for free users with locked content */}
                  {!(userIsPremium || userIsOnTrial) && (selectedCigar?.commonNotes || selectedCigar?.peopleSaying || selectedCigar?.insights || selectedCigar?.recommendedPairings) && (
                    <TouchableOpacity
                      onPress={() => setShowUpgradeModal(true)}
                      style={{
                        width: '100%',
                        borderWidth: 1.5,
                        borderColor: '#8B4513',
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <Icon name="lock-open" size={15} color="#8B4513" />
                      <Text style={{ color: '#8B4513', fontWeight: '700', fontSize: 14 }}>Unlock with Premium</Text>
                    </TouchableOpacity>
                  )}
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
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
                    onPress={() => {
                      if (needsAccuracyConfirmation()) {
                        setShowAccuracyConfirmModal(true);
                      } else {
                        saveDetailChanges();
                      }
                    }}
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
              <Icon name="close" size={36} color="#8B4513" />
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

      {/* Upgrade Modal - shown when scan limit is reached */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgradeSuccess={handleUpgradeSuccess}
        triggerReason="scan_limit"
        scansRemaining={scansRemaining}
      />

      {/* 🎉 Scan celebration modal — fires after every successful scan */}
      <ScanResultModal
        visible={scanResultVisible}
        cigar={scanResultCigar}
        isPremium={userIsPremium || userIsOnTrial}
        onClose={() => setScanResultVisible(false)}
        onRate={() => {
          setScanResultVisible(false);
          if (scanResultCigar) {
            setTimeout(() => openDetailView(scanResultCigar), 300);
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
  desktopGrid: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    ...Platform.select({
      web: {
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
      }
    })
  },
  columnWrapper: {
    justifyContent: 'flex-start',
  },
  desktopDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
    padding: 6,
    zIndex: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  logItem: {
    backgroundColor: 'white',
    padding: 12,
    marginHorizontal: 8,
    marginTop: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    ...Platform.select({
      web: {
        flex: 1,
        maxWidth: '100%',
      }
    })
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
    backgroundColor: "rgba(248, 248, 248, 0.92)",
    justifyContent: "flex-end",
    alignItems: "center",
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } : {}),
  },
  modalBox: {
    width: "94%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 25,
    paddingBottom: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
    backgroundColor: "rgba(248, 248, 248, 0.95)",
    justifyContent: "flex-end",
    alignItems: "center",
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' } : {}),
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
