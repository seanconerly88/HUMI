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
    
    const [addingToHumidor, setAddingToHumidor] = useState({});
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
                        let cigarData = {
                            brand: first.brand || '',
                            description: first.description || '',
                            originCountry: first.originCountry || '',
                            wrapperType: first.wrapperType || '',
                            strength: first.strength || '',
                            commonNotes: first.commonNotes || '',
                            recommendedPairings: first.recommendedPairings || '',
                        };

                        // Debug insights availability
                        console.log('📋 Post insights check:', { 
                            logId, 
                            hasDirectInsights: !!first.insights,
                            directInsights: first.insights?.substring(0, 50),
                            hasAiSnapshot: !!first.aiRawResponseSnapshot
                        });
                        
                        if ((cigarName === "Unknown Cigar" || !insights) && first.aiRawResponseSnapshot) {
                            try {
                                const aiData = JSON.parse(first.aiRawResponseSnapshot);
                                if (aiData.fullName) cigarName = aiData.fullName;
                                // Note: insights come from separate getHumiInsights call, not from AI response
                                // but check anyway in case it was stored there
                                if (!insights) {
                                    insights = aiData.insights || aiData.humiInsights || aiData.summary || null;
                                    console.log('📋 Fallback insights from AI:', insights?.substring(0, 50));
                                }
                                cigarData = {
                                    brand: aiData.cigarBrand || cigarData.brand || '',
                                    description: aiData.description || cigarData.description || '',
                                    originCountry: aiData.originCountry || cigarData.originCountry || '',
                                    wrapperType: aiData.wrapperType || cigarData.wrapperType || '',
                                    strength: aiData.strength || cigarData.strength || '',
                                    commonNotes: aiData.commonNotes || cigarData.commonNotes || '',
                                    recommendedPairings: aiData.recommendedPairings || cigarData.recommendedPairings || '',
                                };
                            } catch { }
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
        console.log('🔵 Add to Humidor clicked:', { 
            logId: item.logId, 
            fullName: item.fullName,
            currentUserId: auth.currentUser?.uid,
            userId: userId
        });
        
        if (!auth.currentUser?.uid || userId === 'test-user') {
            console.log('❌ Not authenticated or test user');
            showAlert('Sign In Required', 'Please sign in to add cigars to your humidor.');
            return;
        }
        
        if (userHasAdded[item.logId] || item.hasUserAdded) {
            console.log('❌ Already added');
            showAlert('Already Added', 'This cigar is already in your humidor.');
            return;
        }
        
        console.log('✅ Starting add process...');
        setAddingToHumidor(prev => ({ ...prev, [item.logId]: true }));
        
        try {
            const statsRef = doc(db, 'postStats', item.logId);
            
            const result = await runTransaction(db, async (transaction) => {
                const statsDoc = await transaction.get(statsRef);
                const statsData = statsDoc.exists() ? statsDoc.data() : { adds: 0, addedUsers: [] };
                
                if (statsData.addedUsers?.includes(userId)) {
                    return { alreadyAdded: true };
                }
                
                const newLogEntry = {
                    fullName: item.fullName,
                    brand: item.brand || '',
                    line: '',
                    description: item.description || '',
                    originCountry: item.originCountry || '',
                    wrapperType: item.wrapperType || '',
                    strength: item.strength || '',
                    commonNotes: item.commonNotes || '',
                    recommendedPairings: item.recommendedPairings || '',
                    insights: item.insights || '',
                    imageUrl: item.images[0]?.imageUrl || '',
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
                    sourceLogId: item.logId,
                    status: 'completed'
                };
                
                transaction.set(statsRef, {
                    adds: (statsData.adds || 0) + 1,
                    addedUsers: [...(statsData.addedUsers || []), userId],
                    lastAddedAt: serverTimestamp()
                }, { merge: true });
                
                return { alreadyAdded: false, newLogEntry };
            });
            
            if (result.alreadyAdded) {
                showAlert('Already Added', 'This cigar is already in your humidor.');
                setUserHasAdded(prev => ({ ...prev, [item.logId]: true }));
                return;
            }
            
            console.log('📝 Adding to user logs:', userId);
            const newDocRef = await addDoc(collection(db, 'users', userId, 'logs'), result.newLogEntry);
            console.log('✅ Added successfully with ID:', newDocRef.id);
            
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
            console.error('❌ Error adding to humidor:', error);
            console.error('Error details:', error.message, error.code);
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

                    {overall === 0 && (
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

                {(item.insights || item.commonNotes || item.recommendedPairings) && (
                    <View style={styles.inlineInsightsContainer}>
                        {item.insights && (
                            <View style={styles.insightBlock}>
                                <Text style={styles.insightsLabel}>HUMI Insights</Text>
                                <Text style={styles.insightsText}>{item.insights}</Text>
                            </View>
                        )}
                        {item.commonNotes && (
                            <View style={styles.insightBlock}>
                                <Text style={styles.insightsLabel}>Tasting Notes</Text>
                                <Text style={styles.insightsText}>{item.commonNotes}</Text>
                            </View>
                        )}
                        {item.recommendedPairings && (
                            <View style={styles.insightBlock}>
                                <Text style={styles.insightsLabel}>Pairings</Text>
                                <Text style={styles.insightsText}>{item.recommendedPairings}</Text>
                            </View>
                        )}
                    </View>
                )}

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
                            color={userReaction === 'like' ? "#6A4B3A" : "#666"}
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
                            color={userReaction === 'dislike' ? "#6A4B3A" : "#666"}
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
                        onPress={() => addToHumidorInline(item)}
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
                        onUpgradePress={() => console.log('Navigate to upgrade')}
                    />
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6A4B3A" />
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
                            <ActivityIndicator color="#6A4B3A" />
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
        backgroundColor: '#6A4B3A',
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
    inlineInsightsContainer: {
        backgroundColor: '#f8f5f2',
        padding: 12,
        marginHorizontal: 12,
        marginTop: 8,
        borderRadius: 8,
        width: '100%',
        maxWidth: 'calc(100% - 24px)',
    },
    insightBlock: {
        marginBottom: 8,
    },
    insightsLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6A4B3A',
        marginBottom: 4,
    },
    insightsText: {
        fontSize: 13,
        color: '#444',
        lineHeight: 18,
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
        backgroundColor: '#6A4B3A11',
        borderColor: '#6A4B3A',
        borderWidth: 1,
    },
    reactionCount: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    reactionCountActive: {
        color: '#6A4B3A',
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
        backgroundColor: '#6A4B3A',
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
