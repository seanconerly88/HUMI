import React, { useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    ActivityIndicator,
    Platform,
    useWindowDimensions,
    TouchableOpacity,
    Modal,
    ScrollView,
    Alert,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { db, auth } from "../config/firebaseConfig";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    onSnapshot,
    getDocs,
    collectionGroup,
    Timestamp,
    getDoc,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    setDoc,
    addDoc,
    increment,
    serverTimestamp,
    runTransaction
} from "firebase/firestore";
import Icon from './components/Icon';
import Comments from './components/Comments';
import { getSubscription, isPremium as checkIsPremium } from '../src/services/subscriptionService';

export default function CigarStories() {
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isDesktop = isWeb && width >= 768;
    const cardWidth = isDesktop ? Math.min(500, width - 48) : width - 24;
    
    const PAGE_SIZE = 50;
    const userId = auth.currentUser?.uid || "test-user";
    const cutoff = useRef(new Date(Date.now() - 24 * 60 * 60 * 1000)).current;

    const [logs, setLogs] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [userReactions, setUserReactions] = useState({});
    const [expandedComments, setExpandedComments] = useState({});
    const [userIsPremium, setUserIsPremium] = useState(false);
    
    // Share in the Moment modal states
    const [insightModalVisible, setInsightModalVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [postInsights, setPostInsights] = useState(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [addingToHumidor, setAddingToHumidor] = useState(false);
    const [userHasAdded, setUserHasAdded] = useState({});

    const loadMoreLock = useRef(false);
    const viewedRef = useRef({});
    const logCache = useRef({});

    useEffect(() => {
        const checkPremiumStatus = async () => {
            if (userId && userId !== 'test-user') {
                const subscription = await getSubscription(userId);
                setUserIsPremium(checkIsPremium(subscription));
            }
        };
        checkPremiumStatus();
    }, [userId]);

    useEffect(() => {
        console.log("🔥 Public feed listener started...");

        const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const imagesRef = collection(db, "logsMomentsImages");

        const unsubImages = onSnapshot(
            query(
                imagesRef,
                where("isPublic", "==", true),
                where("createdAt", ">=", Timestamp.fromDate(cutoffDate)),
                orderBy("createdAt", "desc")
            ),

            async (snapshot) => {
                console.log("✅ Snapshot received. Count:", snapshot.size);

                const images = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                }));

                // Group images by logId
                const grouped = {};
                images.forEach((img) => {
                    if (!grouped[img.logId]) grouped[img.logId] = [];
                    grouped[img.logId].push(img);
                });

                // Build final feed directly from images data
                const finalFeed = await Promise.all(
                    Object.entries(grouped).map(async ([logId, imgs]) => {
                        const first = imgs[0];
                        let cigarName = first.fullName || "Unknown Cigar";

                        if (cigarName === "Unknown Cigar" && first.aiRawResponseSnapshot) {
                            try {
                                const aiData = JSON.parse(first.aiRawResponseSnapshot);
                                if (aiData.fullName) cigarName = aiData.fullName;
                            } catch { }
                        }

                        // Fetch reactions data for this post
                        const reactionsData = await getReactionsData(logId);

                        // Fetch adds count from postStats
                        let addsCount = 0;
                        try {
                            const statsRef = doc(db, 'postStats', logId);
                            const statsSnap = await getDoc(statsRef);
                            if (statsSnap.exists()) {
                                addsCount = statsSnap.data().adds || 0;
                            }
                        } catch (e) {
                            console.log('Error fetching adds count:', e);
                        }

                        return {
                            logId,
                            fullName: cigarName,
                            overall: first.overall ?? 0,
                            note: first.notes ?? '',
                            images: imgs,
                            likes: reactionsData.likes,
                            dislikes: reactionsData.dislikes,
                            userReaction: reactionsData.userReaction,
                            addsCount
                        };
                    })
                );

                console.log("✅ Final feed:", finalFeed);
                setLogs(finalFeed);
                setLoading(false);
            },

            (error) => {
                console.error("❌ Public feed fetch error:", error);
                setLoading(false);
            }
        );

        return () => unsubImages();
    }, []);

    // Function to get reactions data for a post
    const getReactionsData = async (logId) => {
        try {
            const reactionsRef = doc(db, "postReactions", logId);
            const reactionsSnap = await getDoc(reactionsRef);

            if (reactionsSnap.exists()) {
                const data = reactionsSnap.data();
                return {
                    likes: data.likes || 0,
                    dislikes: data.dislikes || 0,
                    userReaction: data.likedUsers?.includes(userId) ? 'like' :
                        data.dislikedUsers?.includes(userId) ? 'dislike' : null
                };
            }

            return { likes: 0, dislikes: 0, userReaction: null };
        } catch (error) {
            console.error("Error fetching reactions:", error);
            return { likes: 0, dislikes: 0, userReaction: null };
        }
    };

    // Handle like/dislike functionality
    const handleReaction = async (logId, reactionType) => {
        try {
            const reactionsRef = doc(db, "postReactions", logId);
            const reactionsSnap = await getDoc(reactionsRef);

            let currentData = { likes: 0, dislikes: 0, likedUsers: [], dislikedUsers: [] };
            if (reactionsSnap.exists()) {
                currentData = reactionsSnap.data();
            }

            const currentUserReaction =
                currentData.likedUsers?.includes(userId) ? 'like' :
                    currentData.dislikedUsers?.includes(userId) ? 'dislike' : null;

            let updateData = {};

            if (reactionType === 'like') {
                if (currentUserReaction === 'like') {
                    // User is removing their like
                    updateData = {
                        likes: (currentData.likes || 0) - 1,
                        likedUsers: arrayRemove(userId)
                    };
                } else {
                    // User is adding a like (or changing from dislike)
                    updateData = {
                        likes: (currentData.likes || 0) + 1,
                        likedUsers: arrayUnion(userId)
                    };

                    if (currentUserReaction === 'dislike') {
                        updateData.dislikes = (currentData.dislikes || 0) - 1;
                        updateData.dislikedUsers = arrayRemove(userId);
                    }
                }
            } else if (reactionType === 'dislike') {
                if (currentUserReaction === 'dislike') {
                    // User is removing their dislike
                    updateData = {
                        dislikes: (currentData.dislikes || 0) - 1,
                        dislikedUsers: arrayRemove(userId)
                    };
                } else {
                    // User is adding a dislike (or changing from like)
                    updateData = {
                        dislikes: (currentData.dislikes || 0) + 1,
                        dislikedUsers: arrayUnion(userId)
                    };

                    if (currentUserReaction === 'like') {
                        updateData.likes = (currentData.likes || 0) - 1;
                        updateData.likedUsers = arrayRemove(userId);
                    }
                }
            }

            // Update Firestore
            await setDoc(reactionsRef, updateData, { merge: true });

            // Update local state immediately for smooth UX
            setLogs(prevLogs =>
                prevLogs.map(log => {
                    if (log.logId === logId) {
                        const updatedLog = { ...log };

                        if (reactionType === 'like') {
                            if (currentUserReaction === 'like') {
                                updatedLog.likes = (updatedLog.likes || 0) - 1;
                                updatedLog.userReaction = null;
                            } else {
                                updatedLog.likes = (updatedLog.likes || 0) + 1;
                                updatedLog.userReaction = 'like';
                                if (currentUserReaction === 'dislike') {
                                    updatedLog.dislikes = (updatedLog.dislikes || 0) - 1;
                                }
                            }
                        } else if (reactionType === 'dislike') {
                            if (currentUserReaction === 'dislike') {
                                updatedLog.dislikes = (updatedLog.dislikes || 0) - 1;
                                updatedLog.userReaction = null;
                            } else {
                                updatedLog.dislikes = (updatedLog.dislikes || 0) + 1;
                                updatedLog.userReaction = 'dislike';
                                if (currentUserReaction === 'like') {
                                    updatedLog.likes = (updatedLog.likes || 0) - 1;
                                }
                            }
                        }

                        return updatedLog;
                    }
                    return log;
                })
            );

        } catch (error) {
            console.error("Error updating reaction:", error);
        }
    };

    // Fetch the original humidor entry with insights
    const fetchPostInsights = async (post) => {
        setLoadingInsights(true);
        setSelectedPost(post);
        setInsightModalVisible(true);
        
        try {
            const firstImage = post.images?.[0];
            let insights = null;
            let cigarData = {};
            
            // Get owner info - check both image level and if not found, use the logId pattern
            const ownerId = firstImage?.ownerId || firstImage?.userId || firstImage?.submittedBy;
            const logId = firstImage?.logId || post.logId;
            
            console.log('Fetching insights for:', { ownerId, logId, firstImage });
            
            // Try to fetch from owner's humidor log first (most reliable source)
            if (ownerId && logId) {
                try {
                    const logRef = doc(db, 'users', ownerId, 'logs', logId);
                    const logSnap = await getDoc(logRef);
                    
                    if (logSnap.exists()) {
                        const logData = logSnap.data();
                        console.log('Found owner log data:', logData);
                        insights = logData.insights || null;
                        cigarData = {
                            fullName: logData.fullName || post.fullName,
                            brand: logData.brand || logData.cigarBrand || '',
                            description: logData.description || logData.aiResponse || '',
                            originCountry: logData.originCountry || '',
                            wrapperType: logData.wrapperType || '',
                            strength: logData.strength || '',
                            commonNotes: logData.commonNotes || '',
                            recommendedPairings: logData.recommendedPairings || '',
                            imageUrl: logData.imageUrl || firstImage?.imageUrl || '',
                            aiRawResponseSnapshot: logData.aiRawResponseSnapshot || ''
                        };
                        
                        // Try to parse AI data for additional insights if not found
                        if (!insights && logData.aiRawResponseSnapshot) {
                            try {
                                const aiData = JSON.parse(logData.aiRawResponseSnapshot);
                                insights = aiData.insights || aiData.humiInsights || null;
                                // Fill in any missing data from AI response
                                if (!cigarData.brand) cigarData.brand = aiData.cigarBrand || '';
                                if (!cigarData.originCountry) cigarData.originCountry = aiData.originCountry || '';
                                if (!cigarData.wrapperType) cigarData.wrapperType = aiData.wrapperType || '';
                                if (!cigarData.strength) cigarData.strength = aiData.strength || '';
                                if (!cigarData.commonNotes) cigarData.commonNotes = aiData.commonNotes || '';
                                if (!cigarData.recommendedPairings) cigarData.recommendedPairings = aiData.recommendedPairings || '';
                            } catch (e) {
                                console.log('Error parsing AI data from log:', e);
                            }
                        }
                    }
                } catch (e) {
                    console.log('Could not fetch owner log:', e);
                }
            }
            
            // Fallback: try to get insights from the image's aiRawResponseSnapshot
            if (!insights && firstImage?.aiRawResponseSnapshot) {
                try {
                    const aiData = JSON.parse(firstImage.aiRawResponseSnapshot);
                    console.log('Parsed AI data from image:', aiData);
                    insights = aiData.insights || aiData.humiInsights || firstImage.insights || null;
                    cigarData = {
                        fullName: aiData.fullName || post.fullName,
                        brand: aiData.cigarBrand || cigarData.brand || '',
                        description: aiData.description || cigarData.description || '',
                        originCountry: aiData.originCountry || cigarData.originCountry || '',
                        wrapperType: aiData.wrapperType || cigarData.wrapperType || '',
                        strength: aiData.strength || cigarData.strength || '',
                        commonNotes: aiData.commonNotes || cigarData.commonNotes || '',
                        recommendedPairings: aiData.recommendedPairings || cigarData.recommendedPairings || '',
                        imageUrl: firstImage.imageUrl || cigarData.imageUrl || ''
                    };
                } catch (e) {
                    console.log('Error parsing AI data from image:', e);
                }
            }
            
            // Final fallback - use whatever data we have from the post/image
            if (!cigarData.fullName) {
                cigarData = {
                    fullName: post.fullName || firstImage?.fullName || 'Unknown Cigar',
                    brand: firstImage?.brand || '',
                    description: firstImage?.description || '',
                    originCountry: firstImage?.originCountry || '',
                    wrapperType: firstImage?.wrapperType || '',
                    strength: firstImage?.strength || '',
                    commonNotes: firstImage?.commonNotes || '',
                    recommendedPairings: firstImage?.recommendedPairings || '',
                    imageUrl: firstImage?.imageUrl || ''
                };
            }
            
            console.log('Final cigarData:', cigarData, 'insights:', insights);
            
            // Get the adds count for this post
            const statsRef = doc(db, 'postStats', post.logId);
            const statsSnap = await getDoc(statsRef);
            let addsCount = 0;
            let hasUserAdded = false;
            
            if (statsSnap.exists()) {
                const statsData = statsSnap.data();
                addsCount = statsData.adds || 0;
                hasUserAdded = statsData.addedUsers?.includes(userId) || false;
            }
            
            setPostInsights({
                ...cigarData,
                insights,
                addsCount,
                hasUserAdded
            });
            setUserHasAdded(prev => ({ ...prev, [post.logId]: hasUserAdded }));
            
        } catch (error) {
            console.error('Error fetching post insights:', error);
            setPostInsights({ insights: null, error: true });
        } finally {
            setLoadingInsights(false);
        }
    };
    
    // Add cigar to user's humidor
    const addToHumidor = async () => {
        if (!selectedPost || !postInsights) return;
        if (!auth.currentUser?.uid || userId === 'test-user') {
            Alert.alert('Sign In Required', 'Please sign in to add cigars to your humidor.');
            return;
        }
        
        // Check if already added (local state check first)
        if (userHasAdded[selectedPost.logId] || postInsights.hasUserAdded) {
            Alert.alert('Already Added', 'This cigar is already in your humidor.');
            return;
        }
        
        setAddingToHumidor(true);
        
        try {
            const statsRef = doc(db, 'postStats', selectedPost.logId);
            
            // Use a transaction to ensure atomic check-and-update
            const result = await runTransaction(db, async (transaction) => {
                const statsDoc = await transaction.get(statsRef);
                const statsData = statsDoc.exists() ? statsDoc.data() : { adds: 0, addedUsers: [] };
                
                // Server-side duplicate check within the transaction
                if (statsData.addedUsers?.includes(userId)) {
                    return { alreadyAdded: true };
                }
                
                // User hasn't added yet - proceed
                // Create a new log entry for the user
                const newLogEntry = {
                    fullName: postInsights.fullName || selectedPost.fullName,
                    brand: postInsights.brand || '',
                    line: '',
                    description: postInsights.description || '',
                    originCountry: postInsights.originCountry || '',
                    wrapperType: postInsights.wrapperType || '',
                    strength: postInsights.strength || '',
                    commonNotes: postInsights.commonNotes || '',
                    recommendedPairings: postInsights.recommendedPairings || '',
                    insights: postInsights.insights || '',
                    aiRawResponseSnapshot: postInsights.aiRawResponseSnapshot || '',
                    imageUrl: postInsights.imageUrl || '',
                    notes: '',
                    overall: null,
                    date: new Date(),
                    submittedDate: serverTimestamp(),
                    submittedBy: userId,
                    reviewed: false,
                    aiAccuracyFeedback: null,
                    userCorrected: false,
                    aiIdentified: true,
                    fromCatalog: false,
                    addedFromFeed: true,
                    sourceLogId: selectedPost.logId,
                    status: 'completed'
                };
                
                // Update the postStats atomically
                transaction.set(statsRef, {
                    adds: (statsData.adds || 0) + 1,
                    addedUsers: [...(statsData.addedUsers || []), userId],
                    lastAddedAt: serverTimestamp()
                }, { merge: true });
                
                return { alreadyAdded: false, newLogEntry };
            });
            
            // Check transaction result
            if (result.alreadyAdded) {
                Alert.alert('Already Added', 'This cigar is already in your humidor.');
                setUserHasAdded(prev => ({ ...prev, [selectedPost.logId]: true }));
                setPostInsights(prev => prev ? { ...prev, hasUserAdded: true } : prev);
                return;
            }
            
            // Save to user's logs (outside transaction since it's a new doc)
            await addDoc(collection(db, 'users', userId, 'logs'), result.newLogEntry);
            
            // Update local state
            setUserHasAdded(prev => ({ ...prev, [selectedPost.logId]: true }));
            setPostInsights(prev => prev ? { ...prev, addsCount: (prev.addsCount || 0) + 1, hasUserAdded: true } : prev);
            
            // Update the logs state to reflect the new adds count
            setLogs(prevLogs => 
                prevLogs.map(log => {
                    if (log.logId === selectedPost.logId) {
                        return { ...log, addsCount: (log.addsCount || 0) + 1 };
                    }
                    return log;
                })
            );
            
            Alert.alert('Added to Humidor!', `${postInsights.fullName || selectedPost.fullName} has been added to your humidor.`);
            
        } catch (error) {
            console.error('Error adding to humidor:', error);
            Alert.alert('Error', 'Failed to add cigar to your humidor. Please try again.');
        } finally {
            setAddingToHumidor(false);
        }
    };
    
    // Close the insight modal
    const closeInsightModal = () => {
        setInsightModalVisible(false);
        setSelectedPost(null);
        setPostInsights(null);
    };

    const loadMore = async () => {
        if (!lastDoc || loadingMore || loadMoreLock.current) return;

        loadMoreLock.current = true;
        setLoadingMore(true);

        try {
            const nextQuery = query(
                collection(db, "users", userId, "logs"),
                where("submittedDate", ">=", cutoff),
                orderBy("submittedDate", "desc"),
                startAfter(lastDoc),
                limit(PAGE_SIZE)
            );

            const snap = await getDocs(nextQuery);
            if (!snap.empty) {
                const more = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setLogs((prev) => [...prev, ...more]);
                setLastDoc(snap.docs[snap.docs.length - 1]);
            } else {
                setLastDoc(null);
            }
        } catch (err) {
            console.log("Pagination error:", err);
        }

        setLoadingMore(false);
        loadMoreLock.current = false;
    };

    const renderStoryCard = ({ item }) => {
        const { images, fullName, overall, logId, likes = 0, dislikes = 0, userReaction, note } = item;
        if (!images?.length) return null;

        const hasMultiple = images.length > 1;

        const renderSlide = (img) => (
            <View style={[styles.slide, { width: cardWidth }]}>
                <Image source={{ uri: img.imageUrl }} style={styles.image} />
                <View style={styles.overlay}>
                    <Text style={[styles.cigarName, isDesktop && webStyles.cigarName]}>{fullName}</Text>

                    {overall > 0 && (
                        <View style={styles.overallRating}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Icon
                                    key={star}
                                    name={star <= overall ? "star" : "star-outline"}
                                    size={isDesktop ? 24 : 22}
                                    color="#FFD700"
                                />
                            ))}
                        </View>
                    )}
                    {
                        note && (
                            <Text
                                style={{
                                    backgroundColor: "#333",
                                    color: "white",
                                    paddingVertical: 6,
                                    paddingHorizontal: 12,
                                    borderRadius: 10,
                                    fontSize: isDesktop ? 15 : 14,
                                    fontWeight: "500",
                                    alignSelf: "flex-start",
                                    overflow: "hidden",
                                    marginTop: 10
                                }}
                            >
                                {note}
                            </Text>
                        )
                    }

                    {
                        overall === 0 && (
                            <Text
                                style={{
                                    backgroundColor: "#b8860b",
                                    color: "white",
                                    paddingVertical: 4,
                                    paddingHorizontal: 10,
                                    borderRadius: 12,
                                    fontSize: 13,
                                    alignSelf: "flex-start",
                                    fontWeight: "600",
                                    overflow: "hidden"
                                }}
                            >
                                Not Yet Smoked
                            </Text>
                        )
                    }

                </View>
            </View>
        );

        return (
            <View style={[styles.card, isDesktop && { width: cardWidth, alignSelf: 'center' }]}>
                <View style={[styles.imageContainer, { width: cardWidth }]}>
                    {hasMultiple ? (
                        <Carousel
                            width={cardWidth}
                            height={isDesktop ? 450 : 400}
                            data={images}
                            keyExtractor={(img) => img.id}
                            renderItem={({ item: img }) => renderSlide(img)}
                            autoPlay
                            mode="horizontal"
                            autoPlayInterval={5000}
                        />
                    ) : (
                        <View style={[styles.singleWrapper, { width: cardWidth, height: isDesktop ? 450 : 400 }]}>
                            {renderSlide(images[0])}
                        </View>
                    )}
                </View>

                {/* Like/Dislike Buttons */}
                <View style={[styles.reactionContainer, isDesktop && webStyles.reactionContainer]}>
                    <TouchableOpacity
                        style={[
                            styles.reactionButton,
                            isDesktop && webStyles.reactionButton,
                            userReaction === 'like' && styles.reactionButtonActive
                        ]}
                        onPress={() => handleReaction(logId, 'like')}
                    >
                        <Icon
                            name="thumbs-up"
                            size={isDesktop ? 22 : 20}
                            color={userReaction === 'like' ? "#8B4513" : "#666"}
                        />
                        <Text style={[
                            styles.reactionCount,
                            isDesktop && webStyles.reactionCount,
                            userReaction === 'like' && styles.reactionCountActive
                        ]}>
                            {likes}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.reactionButton,
                            isDesktop && webStyles.reactionButton,
                            userReaction === 'dislike' && styles.reactionButtonActive
                        ]}
                        onPress={() => handleReaction(logId, 'dislike')}
                    >
                        <Icon
                            name="thumbs-down"
                            size={isDesktop ? 22 : 20}
                            color={userReaction === 'dislike' ? "#8B4513" : "#666"}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.commentToggle, isDesktop && webStyles.commentToggle]}
                        onPress={() => setExpandedComments(prev => ({
                            ...prev,
                            [logId]: !prev[logId]
                        }))}
                    >
                        <Icon
                            name="create-outline"
                            size={isDesktop ? 22 : 20}
                            color="#666"
                        />
                        <Text style={styles.commentToggleText}>
                            {expandedComments[logId] ? 'Hide' : 'Comments'}
                        </Text>
                    </TouchableOpacity>
                    
                    {/* Share in the Moment button */}
                    <TouchableOpacity
                        style={[styles.shareButton, isDesktop && webStyles.shareButton]}
                        onPress={() => fetchPostInsights(item)}
                    >
                        <Icon
                            name="flash-outline"
                            size={isDesktop ? 20 : 18}
                            color="#8B4513"
                        />
                        <Text style={styles.shareButtonText}>Share in the Moment</Text>
                    </TouchableOpacity>
                </View>
                
                {/* Social proof - adds count */}
                {item.addsCount > 0 && (
                    <View style={styles.addsCountContainer}>
                        <Icon name="add-circle-outline" size={14} color="#666" />
                        <Text style={styles.addsCountText}>
                            Added by {item.addsCount} {item.addsCount === 1 ? 'person' : 'people'}
                        </Text>
                    </View>
                )}

                {expandedComments[logId] && (
                    <Comments
                        postId={logId}
                        isPremium={userIsPremium}
                        onUpgradePress={() => console.log('Navigate to upgrade')}
                    />
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B4513" />
                <Text style={styles.loadingText}>Loading cigar stories...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, isDesktop && webStyles.header]}>
                <View style={isDesktop ? webStyles.headerContent : undefined}>
                    <Text style={[styles.headerText, isDesktop && webStyles.headerText]}>Recent Humi Moments</Text>
                    {isDesktop && (
                        <Text style={webStyles.headerSubtext}>See what the community is smoking</Text>
                    )}
                </View>
                <TouchableOpacity style={styles.addButton}>
                    {/* <Icon name="add-circle" size={32} color="white" /> */}
                </TouchableOpacity>
            </View>

            <FlatList
                data={logs}
                keyExtractor={(item) => item?.logId}
                renderItem={renderStoryCard}
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={isDesktop ? webStyles.listContent : undefined}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={[styles.footer, isDesktop && webStyles.footer]}>
                            <ActivityIndicator color="#8B4513" />
                            <Text style={styles.footerText}>Loading more stories...</Text>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={[styles.emptyContainer, isDesktop && webStyles.emptyContainer]}>
                        <Icon name="images-outline" size={isDesktop ? 80 : 64} color="#CCC" />
                        <Text style={[styles.emptyText, isDesktop && webStyles.emptyText]}>No cigar stories yet</Text>
                        <Text style={[styles.emptySubtext, isDesktop && webStyles.emptySubtext]}>
                            Share your first cigar to start the story!
                        </Text>
                    </View>
                }
            />
            
            {/* Share in the Moment Modal */}
            <Modal
                visible={insightModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={closeInsightModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDesktop && webStyles.modalContent]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Share in the Moment</Text>
                            <TouchableOpacity onPress={closeInsightModal} style={styles.closeButton}>
                                <Icon name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        
                        {loadingInsights ? (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator size="large" color="#8B4513" />
                                <Text style={styles.loadingText}>Loading insights...</Text>
                            </View>
                        ) : postInsights ? (
                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                {/* Cigar Image */}
                                {postInsights.imageUrl && (
                                    <Image 
                                        source={{ uri: postInsights.imageUrl }} 
                                        style={styles.modalImage}
                                        resizeMode="cover"
                                    />
                                )}
                                
                                {/* Cigar Name */}
                                <Text style={styles.modalCigarName}>
                                    {postInsights.fullName || selectedPost?.fullName || 'Unknown Cigar'}
                                </Text>
                                
                                {/* Brand */}
                                {postInsights.brand && (
                                    <Text style={styles.modalBrand}>{postInsights.brand}</Text>
                                )}
                                
                                {/* Quick Stats */}
                                <View style={styles.quickStatsRow}>
                                    {postInsights.originCountry && (
                                        <View style={styles.statBadge}>
                                            <Icon name="globe-outline" size={14} color="#8B4513" />
                                            <Text style={styles.statBadgeText}>{postInsights.originCountry}</Text>
                                        </View>
                                    )}
                                    {postInsights.strength && (
                                        <View style={styles.statBadge}>
                                            <Icon name="flash-outline" size={14} color="#8B4513" />
                                            <Text style={styles.statBadgeText}>{postInsights.strength}</Text>
                                        </View>
                                    )}
                                    {postInsights.wrapperType && (
                                        <View style={styles.statBadge}>
                                            <Icon name="leaf-outline" size={14} color="#8B4513" />
                                            <Text style={styles.statBadgeText}>{postInsights.wrapperType}</Text>
                                        </View>
                                    )}
                                </View>
                                
                                {/* HUMI Insights */}
                                {postInsights.insights && (
                                    <View style={styles.insightsSection}>
                                        <Text style={styles.insightsLabel}>HUMI Insights</Text>
                                        <Text style={styles.insightsText}>{postInsights.insights}</Text>
                                    </View>
                                )}
                                
                                {/* Description */}
                                {postInsights.description && !postInsights.insights && (
                                    <View style={styles.insightsSection}>
                                        <Text style={styles.insightsLabel}>About This Cigar</Text>
                                        <Text style={styles.insightsText}>{postInsights.description}</Text>
                                    </View>
                                )}
                                
                                {/* Tasting Notes */}
                                {postInsights.commonNotes && (
                                    <View style={styles.insightsSection}>
                                        <Text style={styles.insightsLabel}>Tasting Notes</Text>
                                        <Text style={styles.insightsText}>{postInsights.commonNotes}</Text>
                                    </View>
                                )}
                                
                                {/* Pairings */}
                                {postInsights.recommendedPairings && (
                                    <View style={styles.insightsSection}>
                                        <Text style={styles.insightsLabel}>Recommended Pairings</Text>
                                        <Text style={styles.insightsText}>{postInsights.recommendedPairings}</Text>
                                    </View>
                                )}
                                
                                {/* Social proof in modal */}
                                {postInsights.addsCount > 0 && (
                                    <View style={styles.modalAddsCount}>
                                        <Icon name="people-outline" size={16} color="#666" />
                                        <Text style={styles.modalAddsText}>
                                            {postInsights.addsCount} {postInsights.addsCount === 1 ? 'person has' : 'people have'} added this to their humidor
                                        </Text>
                                    </View>
                                )}
                                
                                {/* Add This button */}
                                <TouchableOpacity
                                    style={[
                                        styles.addThisButton,
                                        (postInsights.hasUserAdded || userHasAdded[selectedPost?.logId]) && styles.addThisButtonDisabled
                                    ]}
                                    onPress={addToHumidor}
                                    disabled={addingToHumidor || postInsights.hasUserAdded || userHasAdded[selectedPost?.logId]}
                                >
                                    {addingToHumidor ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (postInsights.hasUserAdded || userHasAdded[selectedPost?.logId]) ? (
                                        <>
                                            <Icon name="checkmark-circle" size={20} color="#fff" />
                                            <Text style={styles.addThisButtonText}>Added to Your Humidor</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="add-circle-outline" size={20} color="#fff" />
                                            <Text style={styles.addThisButtonText}>Add This to My Humidor</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        ) : (
                            <View style={styles.modalLoading}>
                                <Text style={styles.errorText}>Unable to load cigar details</Text>
                            </View>
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
        backgroundColor: "#F8F5F2",
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#8B4513',
        paddingTop: 50,
    },
    headerText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
    },
    addButton: {
        padding: 4,
    },
    card: {
        backgroundColor: "#fff",
        marginBottom: 20,
        borderRadius: 16,
        overflow: "hidden",
        elevation: 2,
        display: 'flex',
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
    },
    imageContainer: {
        width: "100%",
        alignItems: "center",
        paddingHorizontal: 12,
    },
    slide: {
        width: "100%",
        height: 400,
        backgroundColor: "#000",
        alignItems: "center",
        marginTop: 10,
    },
    image: {
        width: "100%",
        height: "100%",
    },
    overlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingVertical: 20,
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    cigarName: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 10,
        lineHeight: 22,
    },
    overallRating: {
        flexDirection: "row",
        alignItems: "center",
    },
    singleWrapper: {
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#000",
        marginTop: 10,
    },
    // Reaction Styles
    reactionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        width: '100%',
        gap: 8,
    },
    reactionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#f8f8f8',
    },
    reactionButtonActive: {
        backgroundColor: '#8B451311',
        borderColor: '#8B4513',
        borderWidth: 1,
    },
    reactionCount: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    reactionCountActive: {
        color: '#8B4513',
        fontWeight: '600',
    },
    commentToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#f8f8f8',
        borderRadius: 20,
    },
    commentToggleText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#666',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8F5F2",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#8B7D6B",
    },
    footer: {
        padding: 20,
        alignItems: "center",
    },
    footerText: {
        marginTop: 8,
        fontSize: 14,
        color: "#8B7D6B",
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#8B7D6B",
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: "#A89B8C",
        marginTop: 8,
        textAlign: "center",
    },
    // Share in the Moment styles
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#8B451315',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#8B4513',
    },
    shareButtonText: {
        marginLeft: 4,
        fontSize: 12,
        color: '#8B4513',
        fontWeight: '600',
    },
    addsCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    addsCountText: {
        marginLeft: 6,
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    modalLoading: {
        padding: 40,
        alignItems: 'center',
    },
    modalBody: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    modalImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 16,
    },
    modalCigarName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    modalBrand: {
        fontSize: 16,
        color: '#8B4513',
        marginBottom: 12,
    },
    quickStatsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f7f2e9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    statBadgeText: {
        fontSize: 13,
        color: '#5a4a3a',
    },
    insightsSection: {
        marginBottom: 16,
        backgroundColor: '#f9f9f9',
        padding: 16,
        borderRadius: 12,
    },
    insightsLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B4513',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    insightsText: {
        fontSize: 15,
        color: '#444',
        lineHeight: 22,
    },
    modalAddsCount: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    modalAddsText: {
        fontSize: 14,
        color: '#666',
    },
    addThisButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8B4513',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 30,
        marginTop: 16,
        marginBottom: 20,
        gap: 8,
    },
    addThisButtonDisabled: {
        backgroundColor: '#4CAF50',
    },
    addThisButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        fontSize: 16,
        color: '#999',
    },
});

const webStyles = StyleSheet.create({
    header: {
        paddingHorizontal: 40,
        paddingTop: 24,
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: 'column',
    },
    headerText: {
        fontSize: 28,
    },
    headerSubtext: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 4,
    },
    listContent: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    cigarName: {
        fontSize: 20,
    },
    reactionContainer: {
        justifyContent: 'flex-start',
        paddingVertical: 16,
    },
    reactionButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    reactionCount: {
        fontSize: 15,
    },
    commentToggle: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    footer: {
        paddingVertical: 30,
    },
    emptyContainer: {
        paddingVertical: 120,
    },
    emptyText: {
        fontSize: 22,
        marginTop: 20,
    },
    emptySubtext: {
        fontSize: 16,
        marginTop: 10,
    },
    shareButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    modalContent: {
        maxWidth: 600,
        marginHorizontal: 'auto',
        borderRadius: 24,
        marginBottom: 40,
    },
});