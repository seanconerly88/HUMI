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
    Alert,
    Modal,
} from "react-native";
import LoadingScreen from './components/LoadingScreen';
import Carousel from "react-native-reanimated-carousel";
import { SwipeListView } from 'react-native-swipe-list-view';
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
    Timestamp,
    getDoc,
    doc,
    arrayUnion,
    arrayRemove,
    setDoc,
    addDoc,
    serverTimestamp,
    runTransaction
} from "firebase/firestore";
import Icon from './components/Icon';
import Comments from './components/Comments';
import UpgradeModal from './components/UpgradeModal';
import { getSubscription, isPremium as checkIsPremium, isOnActiveTrial as checkIsOnTrial } from '../src/services/subscriptionService';
import { isSuperAdmin, softDeletePost } from '../src/services/adminService';
import { DEV_MODE_ENABLED, mockFeedPosts } from '../src/services/devModeData';

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
    const [userIsOnTrial, setUserIsOnTrial] = useState(false);
    
    const [addingToHumidor, setAddingToHumidor] = useState({});
    const [userHasAdded, setUserHasAdded] = useState({});
    
    const [isAdmin, setIsAdmin] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showHumidorGate, setShowHumidorGate] = useState(false);

    const loadMoreLock = useRef(false);
    const viewedRef = useRef({});
    const logCache = useRef({});

    useEffect(() => {
        if (DEV_MODE_ENABLED) {
            setUserIsPremium(true);
            setUserIsOnTrial(false);
            return;
        }
        const checkPremiumStatus = async () => {
            if (userId && userId !== 'test-user') {
                const subscription = await getSubscription(userId);
                setUserIsPremium(checkIsPremium(subscription));
                setUserIsOnTrial(checkIsOnTrial(subscription));
            }
        };
        checkPremiumStatus();
    }, [userId]);

    useEffect(() => {
        if (!DEV_MODE_ENABLED) setIsAdmin(isSuperAdmin());
    }, [userId]);

    useEffect(() => {
        if (DEV_MODE_ENABLED) {
            setLogs(mockFeedPosts);
            setLoading(false);
            return;
        }
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

                const now = new Date();
                const images = snapshot.docs
                    .map((d) => ({
                        id: d.id,
                        ...d.data(),
                    }))
                    .filter((img) => {
                        // Filter out posts that aren't visible yet (3-min delay)
                        if (img.visibleAt) {
                            const visibleTime = img.visibleAt.toDate ? img.visibleAt.toDate() : new Date(img.visibleAt);
                            if (visibleTime > now) return false;
                        }
                        // Filter out Unknown Cigar posts
                        const cigarName = img.fullName || '';
                        if (cigarName === 'Unknown Cigar' || cigarName === '') {
                            return false;
                        }
                        return true;
                    });

                const grouped = {};
                images.forEach((img) => {
                    if (!grouped[img.logId]) grouped[img.logId] = [];
                    grouped[img.logId].push(img);
                });

                const finalFeed = await Promise.all(
                    Object.entries(grouped).map(async ([logId, imgs]) => {
                        const first = imgs[0];
                        let cigarName = first.fullName || "Unknown Cigar";
                        let insights = first.insights || null;
                        let humiBlurb = first.humiBlurb || first.description || '';
                        let cigarData = {
                            brand: first.brand || '',
                            description: first.description || '',
                            humiBlurb: humiBlurb,
                            peopleSaying: first.peopleSaying || '',
                            originCountry: first.originCountry || '',
                            wrapperType: first.wrapperType || '',
                            strength: first.strength || '',
                            commonNotes: first.commonNotes || '',
                            recommendedPairings: first.recommendedPairings || '',
                        };

                        if (first.aiRawResponseSnapshot) {
                            try {
                                const aiData = JSON.parse(first.aiRawResponseSnapshot);
                                if (cigarName === "Unknown Cigar" && aiData.fullName) {
                                    cigarName = aiData.fullName;
                                }
                                if (!insights) {
                                    insights = aiData.insights || aiData.humiInsights || aiData.summary || null;
                                }
                                if (!humiBlurb && aiData.humiBlurb) {
                                    humiBlurb = aiData.humiBlurb;
                                }
                                cigarData = {
                                    brand: aiData.cigarBrand || cigarData.brand || '',
                                    description: aiData.humiBlurb || aiData.description || cigarData.description || '',
                                    humiBlurb: humiBlurb || aiData.humiBlurb || aiData.description || '',
                                    peopleSaying: aiData.peopleSaying || cigarData.peopleSaying || '',
                                    originCountry: aiData.originCountry || cigarData.originCountry || '',
                                    wrapperType: aiData.wrapperType || cigarData.wrapperType || '',
                                    strength: aiData.strength || cigarData.strength || '',
                                    commonNotes: aiData.commonNotes || cigarData.commonNotes || '',
                                    recommendedPairings: aiData.recommendedPairings || cigarData.recommendedPairings || '',
                                };
                            } catch { }
                        }
                        
                        if (!insights && cigarData.humiBlurb) {
                            insights = cigarData.humiBlurb;
                        } else if (!insights && cigarData.description) {
                            insights = cigarData.description;
                        }

                        const reactionsData = await getReactionsData(logId);

                        let addsCount = 0;
                        let hasUserAdded = false;
                        try {
                            const statsRef = doc(db, 'postStats', logId);
                            const statsSnap = await getDoc(statsRef);
                            if (statsSnap.exists()) {
                                const statsData = statsSnap.data();
                                addsCount = statsData.adds || 0;
                                hasUserAdded = statsData.addedUsers?.includes(userId) || false;
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
                            addsCount,
                            hasUserAdded,
                            insights,
                            ...cigarData
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
                    updateData = {
                        likes: (currentData.likes || 0) - 1,
                        likedUsers: arrayRemove(userId)
                    };
                } else {
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
                    updateData = {
                        dislikes: (currentData.dislikes || 0) - 1,
                        dislikedUsers: arrayRemove(userId)
                    };
                } else {
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

            await setDoc(reactionsRef, updateData, { merge: true });

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

    const showAlert = (title, message) => {
        if (Platform.OS === 'web') {
            alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const addToHumidorInline = async (item) => {
        const currentUserId = auth.currentUser?.uid;
        
        if (!currentUserId) {
            showAlert('Sign In Required', 'Please sign in to add cigars to your humidor.');
            return;
        }
        
        if (userHasAdded[item.logId] || item.hasUserAdded) {
            showAlert('Already Added', 'This cigar is already in your humidor.');
            return;
        }
        
        setAddingToHumidor(prev => ({ ...prev, [item.logId]: true }));
        
        try {
            const newLogEntry = {
                fullName: item.fullName || 'Unknown Cigar',
                brand: item.brand || '',
                line: '',
                description: item.humiBlurb || item.description || '',
                humiBlurb: item.humiBlurb || item.description || '',
                peopleSaying: item.peopleSaying || '',
                originCountry: item.originCountry || '',
                wrapperType: item.wrapperType || '',
                strength: item.strength || '',
                commonNotes: item.commonNotes || '',
                recommendedPairings: item.recommendedPairings || '',
                insights: item.insights || '',
                imageUrl: item.images?.[0]?.imageUrl || '',
                notes: '',
                overall: null,
                date: new Date(),
                submittedDate: serverTimestamp(),
                submittedBy: currentUserId,
                reviewed: false,
                aiAccuracyFeedback: null,
                userCorrected: false,
                aiIdentified: true,
                fromCatalog: false,
                addedFromFeed: true,
                sourceLogId: item.logId,
                status: 'completed'
            };
            
            await addDoc(collection(db, 'users', currentUserId, 'logs'), newLogEntry);
            
            setUserHasAdded(prev => ({ ...prev, [item.logId]: true }));
            setLogs(prevLogs => 
                prevLogs.map(log => {
                    if (log.logId === item.logId) {
                        return { ...log, addsCount: (log.addsCount || 0) + 1, hasUserAdded: true };
                    }
                    return log;
                })
            );
            
            showAlert('Added to Humidor!', `${item.fullName} has been added to your humidor.`);
            
        } catch (error) {
            console.error('Error adding to humidor:', error);
            showAlert('Error', 'Failed to add cigar to your humidor. Please try again.');
        } finally {
            setAddingToHumidor(prev => ({ ...prev, [item.logId]: false }));
        }
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

    const openDeleteModal = (item) => {
        setPostToDelete(item);
        setShowDeleteModal(true);
    };

    const handleDeletePost = async () => {
        if (!postToDelete) return;
        
        setIsDeleting(true);
        try {
            const imagesToDelete = postToDelete.images || [];
            for (const img of imagesToDelete) {
                if (img.id) {
                    await softDeletePost(img.id);
                }
            }
            
            setLogs(prev => prev.filter(log => log.logId !== postToDelete.logId));
            setShowDeleteModal(false);
            setPostToDelete(null);
            
            if (Platform.OS === 'web') {
                window.alert('Post removed from feed');
            } else {
                Alert.alert('Success', 'Post removed from feed');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            if (Platform.OS === 'web') {
                window.alert('Failed to delete post. Please try again.');
            } else {
                Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
        }
        setIsDeleting(false);
    };

    const renderHiddenItem = ({ item }) => (
        <View style={adminStyles.rowBack}>
            <TouchableOpacity
                style={adminStyles.deleteBtn}
                onPress={() => openDeleteModal(item)}
                activeOpacity={0.8}
            >
                <Icon name="trash" size={20} color="#fff" />
                <Text style={adminStyles.deleteText}>Delete</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStoryCard = ({ item }) => {
        const { images, fullName, overall, logId, likes = 0, dislikes = 0, userReaction, note } = item;
        if (!images?.length) return null;

        const hasMultiple = images.length > 1;
        const isAdded = userHasAdded[logId] || item.hasUserAdded;
        const isAdding = addingToHumidor[logId];

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
                    {note && (
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
                    )}

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

                {(item.humiBlurb || item.insights) ? (
                    <View style={styles.inlineInsightsContainer}>
                        <Text style={styles.insightsLabel}>✦ HUMI Says</Text>
                        <Text style={styles.insightsText}>{item.humiBlurb || item.insights}</Text>
                    </View>
                ) : null}

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
                    
                    <TouchableOpacity
                        style={[
                            styles.addToHumiButton,
                            isAdded && styles.addToHumiButtonAdded
                        ]}
                        onPress={() => {
                            if (!userIsPremium && !userIsOnTrial) {
                                setShowHumidorGate(true);
                            } else {
                                addToHumidorInline(item);
                            }
                        }}
                        disabled={isAdding || isAdded}
                    >
                        {isAdding ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : isAdded ? (
                            <>
                                <Icon name="checkmark-circle" size={16} color="#fff" />
                                <Text style={styles.addToHumiButtonText}>Added</Text>
                            </>
                        ) : (
                            <>
                                <Icon name="add-circle-outline" size={16} color="#fff" />
                                <Text style={styles.addToHumiButtonText}>Add to my HUMI</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
                
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
                        onUpgradePress={() => setShowUpgradeModal(true)}
                    />
                )}
            </View>
        );
    };

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, isDesktop && webStyles.header]}>
                <Text style={styles.headerText}>HUMI</Text>
            </View>

            {isAdmin ? (
                <SwipeListView
                    data={logs}
                    keyExtractor={(item) => item?.logId}
                    renderItem={renderStoryCard}
                    renderHiddenItem={renderHiddenItem}
                    rightOpenValue={-90}
                    disableRightSwipe
                    closeOnRowOpen={true}
                    closeOnRowPress={true}
                    closeOnScroll={true}
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
            ) : (
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
            )}

            <Modal
                transparent
                visible={showDeleteModal}
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={adminStyles.modalOverlay}>
                    <View style={adminStyles.modalBox}>
                        <Text style={adminStyles.modalTitle}>Remove Post</Text>
                        <Text style={adminStyles.modalText}>
                            This will remove the post from the feed for all users. This action cannot be undone.
                        </Text>
                        <View style={adminStyles.modalButtons}>
                            <TouchableOpacity
                                style={adminStyles.cancelBtn}
                                onPress={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                            >
                                <Text style={adminStyles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={adminStyles.confirmDeleteBtn}
                                onPress={handleDeletePost}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={adminStyles.confirmDeleteBtnText}>Remove</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Premium Humidor Gate Modal */}
            <Modal
                transparent
                visible={showHumidorGate}
                animationType="fade"
                onRequestClose={() => setShowHumidorGate(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 28, maxWidth: 340, width: '100%', alignItems: 'center' }}>
                        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#f5f0eb', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <Icon name="library" size={28} color="#8B4513" />
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 6, textAlign: 'center' }}>Build Your Collection</Text>
                        <Text style={{ fontSize: 14, color: '#666', lineHeight: 21, textAlign: 'center', marginBottom: 20 }}>
                            Save cigars from the feed to your personal humidor, track what you've smoked, and build a collection you can look back on. This is a HUMI Premium feature.
                        </Text>
                        <TouchableOpacity
                            style={{ backgroundColor: '#8B4513', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 10 }}
                            onPress={() => { setShowHumidorGate(false); setShowUpgradeModal(true); }}
                        >
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>See Premium Plans</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowHumidorGate(false)}>
                            <Text style={{ color: '#999', fontSize: 14, marginTop: 4 }}>Not now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Upgrade Modal - shown when comment limit is reached */}
            <UpgradeModal
                visible={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                onUpgradeSuccess={async () => {
                    setShowUpgradeModal(false);
                    const subscription = await getSubscription(userId);
                    setUserIsPremium(checkIsPremium(subscription));
                    setUserIsOnTrial(checkIsOnTrial(subscription));
                }}
                triggerReason="comment_limit"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f9f9f9",
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
        fontWeight: '900',
        letterSpacing: 3,
        color: 'white',
        textAlign: 'center',
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
    inlineInsightsContainer: {
        backgroundColor: '#faf7f3',
        padding: 14,
        marginHorizontal: 12,
        marginTop: 10,
        marginBottom: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#efe5d5',
        width: '92%',
        alignSelf: 'center',
    },
    insightBlock: {
        marginBottom: 8,
    },
    insightsLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#8B4513',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    insightsText: {
        fontSize: 13.5,
        color: '#444',
        lineHeight: 21,
    },
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
    addToHumiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B4513',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    addToHumiButtonAdded: {
        backgroundColor: '#4CAF50',
    },
    addToHumiButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f9f9f9",
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
});

const adminStyles = StyleSheet.create({
    rowBack: {
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingRight: 15,
        marginBottom: 30,
    },
    deleteBtn: {
        alignItems: 'center',
        backgroundColor: '#dc3545',
        justifyContent: 'center',
        width: 80,
        height: '90%',
        borderRadius: 12,
        flexDirection: 'column',
        gap: 4,
    },
    deleteText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(248, 248, 248, 0.92)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 0,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } : {}),
    },
    modalBox: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        padding: 24,
        paddingBottom: 40,
        width: '100%',
        maxWidth: 420,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        borderBottomWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#666',
        fontWeight: '600',
    },
    confirmDeleteBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#dc3545',
        alignItems: 'center',
    },
    confirmDeleteBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
});
