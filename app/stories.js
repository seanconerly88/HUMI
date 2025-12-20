import React, { useEffect, useState, useRef,useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
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
    setDoc
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function CigarStories() {
    const MIN_RECORDS = 10;
    const PAGE_SIZE = 50;
    const userId = auth.currentUser?.uid || "test-user";

    const [logs, setLogs] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMorePastRecords, setHasMorePastRecords] = useState(true);
    const [pastLastDoc, setPastLastDoc] = useState(null);
    const [isAllCaughtUp, setIsAllCaughtUp] = useState(false);

    const loadMoreLock = useRef(false);
    const viewedRef = useRef({});
    const logCache = useRef({});

    useEffect(() => {
        console.log("🔥 Public feed listener started...");
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const imagesRef = collection(db, "logsMomentsImages");

            // First, fetch recent images (last 24 hours)
            const recentImagesQuery = query(
                imagesRef,
                where("isPublic", "==", true),
                where("createdAt", ">=", Timestamp.fromDate(cutoffDate)),
                orderBy("createdAt", "desc"),
                limit(PAGE_SIZE)
            );

            const recentSnap = await getDocs(recentImagesQuery);
            console.log("✅ Recent images count:", recentSnap.size);

            let recentImages = recentSnap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));

            // Group by logId for recent images
            const recentGrouped = {};
            recentImages.forEach((img) => {
                if (!recentGrouped[img.logId]) recentGrouped[img.logId] = [];
                recentGrouped[img.logId].push(img);
            });

            const recentFeed = await Promise.all(
                Object.entries(recentGrouped).map(async ([logId, imgs]) => {
                    return await processLogItem(logId, imgs);
                })
            );

            // 🔥 CHECK: If no recent images, get random 10 from past
            if (recentFeed.length === 0) {
                console.log("📥 No recent images, fetching random 10 from past...");
                const randomPastImages = await fetchRandomPastImages(10);

                if (randomPastImages.length > 0) {
                    setLogs(randomPastImages);
                    setupRealtimeListener(cutoffDate, randomPastImages);
                } else {
                    // If no past images either, show empty state
                    setLogs([]);
                }
            } else if (recentFeed.length < MIN_RECORDS) {
                // If we have some recent but not enough, fetch more past to reach MIN_RECORDS
                const needed = MIN_RECORDS - recentFeed.length;
                console.log(`📥 Need ${needed} more records, fetching past...`);

                const pastImages = await fetchPastImages(needed, null);

                // Combine recent and past images
                const combinedFeed = [...recentFeed, ...pastImages];
                setLogs(combinedFeed);

                // Set up listener for real-time updates
                setupRealtimeListener(cutoffDate, combinedFeed);
            } else {
                setLogs(recentFeed);
                setupRealtimeListener(cutoffDate, recentFeed);
            }

            setLoading(false);

        } catch (error) {
            console.error("❌ Initial data fetch error:", error);
            setLoading(false);
        }
    };

    // 🔥 NEW FUNCTION: Fetch random past images
    const fetchRandomPastImages = async (count) => {
        try {
            const imagesRef = collection(db, "logsMomentsImages");
            const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // First, get total count of past images
            const countQuery = query(
                imagesRef,
                where("isPublic", "==", true),
                where("createdAt", "<", Timestamp.fromDate(cutoffDate))
            );

            const countSnap = await getDocs(countQuery);
            const totalPastImages = countSnap.size;

            if (totalPastImages === 0) {
                console.log("📭 No past images available");
                return [];
            }

            // If we have fewer images than requested, adjust count
            const actualCount = Math.min(count, totalPastImages);

            // Get random documents by using random offsets
            const randomPromises = [];
            const seenLogIds = new Set();

            for (let i = 0; i < actualCount * 2; i++) { // Try more to ensure we get enough unique logs
                if (seenLogIds.size >= actualCount) break;

                // Create a query with random offset
                const randomPastQuery = query(
                    imagesRef,
                    where("isPublic", "==", true),
                    where("createdAt", "<", Timestamp.fromDate(cutoffDate)),
                    orderBy("createdAt", "desc"),
                    limit(20) // Get a batch to choose from
                );

                randomPromises.push(getDocs(randomPastQuery));
            }

            const randomSnaps = await Promise.all(randomPromises);

            // Collect all images
            const allPastImages = [];
            randomSnaps.forEach(snap => {
                if (snap.empty) return;
                snap.docs.forEach(doc => {
                    allPastImages.push({ id: doc.id, ...doc.data() });
                });
            });

            // Shuffle and select unique logs
            const shuffled = [...allPastImages].sort(() => 0.5 - Math.random());
            const selectedImages = [];

            for (const img of shuffled) {
                if (!seenLogIds.has(img.logId)) {
                    seenLogIds.add(img.logId);
                    selectedImages.push(img);

                    if (selectedImages.length >= actualCount) break;
                }
            }

            // Group selected images by logId
            const selectedGrouped = {};
            selectedImages.forEach((img) => {
                if (!selectedGrouped[img.logId]) selectedGrouped[img.logId] = [];
                selectedGrouped[img.logId].push(img);
            });

            // Process the selected images
            const randomFeed = await Promise.all(
                Object.entries(selectedGrouped).map(async ([logId, imgs]) => {
                    const processedItem = await processLogItem(logId, imgs);
                    return { ...processedItem, isPast: true, isRandom: true };
                })
            );

            console.log(`🎲 Fetched ${randomFeed.length} random past images`);
            return randomFeed;

        } catch (error) {
            console.error("❌ Random past images fetch error:", error);
            return [];
        }
    };

    // Update the existing fetchPastImages function to handle random fetching
    const fetchPastImages = async (limitCount, lastDocument) => {
        try {
            const imagesRef = collection(db, "logsMomentsImages");
            const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

            let pastQuery;
            if (lastDocument) {
                pastQuery = query(
                    imagesRef,
                    where("isPublic", "==", true),
                    where("createdAt", "<", Timestamp.fromDate(cutoffDate)),
                    orderBy("createdAt", "desc"),
                    startAfter(lastDocument),
                    limit(limitCount)
                );
            } else {
                pastQuery = query(
                    imagesRef,
                    where("isPublic", "==", true),
                    where("createdAt", "<", Timestamp.fromDate(cutoffDate)),
                    orderBy("createdAt", "desc"),
                    limit(limitCount)
                );
            }

            const pastSnap = await getDocs(pastQuery);

            if (pastSnap.empty) {
                setHasMorePastRecords(false);
                return [];
            }

            // Update last document for pagination
            if (pastSnap.docs.length > 0) {
                setPastLastDoc(pastSnap.docs[pastSnap.docs.length - 1]);
            }

            // If we got fewer than requested, there might be no more
            if (pastSnap.docs.length < limitCount) {
                setHasMorePastRecords(false);
            }

            // Group past images
            const pastGrouped = {};
            pastSnap.docs.forEach((d) => {
                const img = { id: d.id, ...d.data() };
                if (!pastGrouped[img.logId]) pastGrouped[img.logId] = [];
                pastGrouped[img.logId].push(img);
            });

            const pastFeed = await Promise.all(
                Object.entries(pastGrouped).map(async ([logId, imgs]) => {
                    const processedItem = await processLogItem(logId, imgs);
                    return { ...processedItem, isPast: true };
                })
            );

            return pastFeed;

        } catch (error) {
            console.error("❌ Past images fetch error:", error);
            return [];
        }
    };

    const setupRealtimeListener = (initialFeed) => {
        console.log("🔥 Setting up real-time listener for ALL updates");

        const imagesRef = collection(db, "logsMomentsImages");

        const unsubImages = onSnapshot(
            query(
                imagesRef,
                where("isPublic", "==", true),
                orderBy("lastUpdated", "desc"), // 🔥 NEW: Track by lastUpdated
                limit(100)
            ),
            async (snapshot) => {
                console.log("🔄 Real-time update received. Count:", snapshot.size);

                const images = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                }));

                // Group by logId
                const grouped = {};
                images.forEach((img) => {
                    if (!grouped[img.logId]) grouped[img.logId] = [];
                    grouped[img.logId].push(img);
                });

                // Process ALL images (not just recent)
                const realtimeFeed = await Promise.all(
                    Object.entries(grouped).map(async ([logId, imgs]) => {
                        return await processLogItem(logId, imgs);
                    })
                );

                // 🔥 IMMEDIATELY update state with ALL posts
                setLogs(realtimeFeed);
            },
            (error) => {
                console.error("❌ Public feed real-time error:", error);
            }
        );

        return unsubImages;
    };

    const processLogItem = async (logId, imgs) => {
        // 🔥 Sort by lastUpdated (most recent first), fallback to updatedAt or createdAt
        const sortedImgs = [...imgs].sort((a, b) => {
            const aTime = a.lastUpdated?.toDate?.() || a.updatedAt?.toDate?.() || a.createdAt?.toDate?.();
            const bTime = b.lastUpdated?.toDate?.() || b.updatedAt?.toDate?.() || b.createdAt?.toDate?.();
            return bTime - aTime; // Descending
        });

        const mostRecent = sortedImgs[0]; // Use most recently updated image

        // 🔥 Extract feature image
        const featureImage = mostRecent.image
            ? {
                id: `feature-${logId}`,
                url: mostRecent.image,
                isFeature: true,
            }
            : null;

        // 🔥 Prepare combined images
        const combinedImages = featureImage
            ? [featureImage, ...sortedImgs]
            : sortedImgs;

        // 🔥 Get data from MOST RECENT image (which has the latest updates)
        let cigarName = mostRecent.fullName || mostRecent.cigarName || "Unknown Cigar";
        let overall = mostRecent.overall ?? 0;
        let note = mostRecent.notes ?? '';

        // Fallback to AI data if needed
        if (cigarName === "Unknown Cigar" && mostRecent.aiRawResponseSnapshot) {
            try {
                const aiData = JSON.parse(mostRecent.aiRawResponseSnapshot);
                if (aiData.fullName) cigarName = aiData.fullName;
            } catch { }
        }

        // Fetch reactions
        const reactionsData = await getReactionsData(logId);

        // Use most recent timestamp for sorting
        const recentTimestamp = mostRecent.lastUpdated || mostRecent.updatedAt || mostRecent.createdAt;

        return {
            logId,
            fullName: cigarName,
            overall: overall,
            note: note,
            images: combinedImages,
            likes: reactionsData.likes,
            dislikes: reactionsData.dislikes,
            userReaction: reactionsData.userReaction,
            createdAt: recentTimestamp,
            updatedAt: mostRecent.updatedAt,
            lastUpdated: mostRecent.lastUpdated, // 🔥 NEW
            isRecent: true
        };
    };

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

    // Fixed handleReaction function
    const handleReaction = async (logId, reactionType) => {
        try {
            const reactionsRef = doc(db, "postReactions", logId);
            const reactionsSnap = await getDoc(reactionsRef);

            const currentData = reactionsSnap.exists() ? reactionsSnap.data() : {
                likes: 0,
                dislikes: 0,
                likedUsers: [],
                dislikedUsers: []
            };

            const currentUserReaction =
                currentData.likedUsers?.includes(userId) ? 'like' :
                    currentData.dislikedUsers?.includes(userId) ? 'dislike' : null;

            // Create a copy of current data for updates
            const updateData = {
                likes: currentData.likes || 0,
                dislikes: currentData.dislikes || 0,
                likedUsers: [...(currentData.likedUsers || [])],
                dislikedUsers: [...(currentData.dislikedUsers || [])]
            };

            // Remove user from opposite reaction array first
            if (reactionType === 'like') {
                // If user already liked, remove like
                if (currentUserReaction === 'like') {
                    updateData.likes = Math.max(0, updateData.likes - 1);
                    updateData.likedUsers = updateData.likedUsers.filter(id => id !== userId);
                } else {
                    // If user is adding a new like
                    updateData.likes = updateData.likes + 1;
                    updateData.likedUsers.push(userId);

                    // If user previously disliked, remove dislike
                    if (currentUserReaction === 'dislike') {
                        updateData.dislikes = Math.max(0, updateData.dislikes - 1);
                        updateData.dislikedUsers = updateData.dislikedUsers.filter(id => id !== userId);
                    }
                }
            } else if (reactionType === 'dislike') {
                // If user already disliked, remove dislike
                if (currentUserReaction === 'dislike') {
                    updateData.dislikes = Math.max(0, updateData.dislikes - 1);
                    updateData.dislikedUsers = updateData.dislikedUsers.filter(id => id !== userId);
                } else {
                    // If user is adding a new dislike
                    updateData.dislikes = updateData.dislikes + 1;
                    updateData.dislikedUsers.push(userId);

                    // If user previously liked, remove like
                    if (currentUserReaction === 'like') {
                        updateData.likes = Math.max(0, updateData.likes - 1);
                        updateData.likedUsers = updateData.likedUsers.filter(id => id !== userId);
                    }
                }
            }

            // Update Firestore
            await setDoc(reactionsRef, updateData, { merge: true });

            // Update local state immediately for smooth UX
            setLogs(prevLogs =>
                prevLogs.map(log => {
                    if (log.logId === logId) {
                        return {
                            ...log,
                            likes: updateData.likes,
                            dislikes: updateData.dislikes,
                            userReaction: updateData.likedUsers.includes(userId) ? 'like' :
                                updateData.dislikedUsers.includes(userId) ? 'dislike' : null
                        };
                    }
                    return log;
                })
            );

        } catch (error) {
            console.error("Error updating reaction:", error);
        }
    };

    const loadMore = async () => {
        if (!hasMorePastRecords || loadingMore || loadMoreLock.current) {
            setIsAllCaughtUp(true);
            return;
        }

        loadMoreLock.current = true;
        setLoadingMore(true);

        try {
            const morePastImages = await fetchPastImages(5, pastLastDoc);

            if (morePastImages.length > 0) {
                // Filter out duplicates
                const existingLogIds = logs.map(log => log.logId);
                const newImages = morePastImages.filter(img => !existingLogIds.includes(img.logId));

                if (newImages.length > 0) {
                    setLogs(prev => [...prev, ...newImages]);
                } else {
                    setHasMorePastRecords(false);
                    setIsAllCaughtUp(true);
                }
            } else {
                setHasMorePastRecords(false);
                setIsAllCaughtUp(true);
            }
        } catch (err) {
            console.log("Pagination error:", err);
            setHasMorePastRecords(false);
            setIsAllCaughtUp(true);
        }

        setLoadingMore(false);
        loadMoreLock.current = false;
    };

    const ImageSlide = React.memo(({ img, fullName, overall, note }) => {
        const [imageError, setImageError] = useState(false);
        const [imageLoading, setImageLoading] = useState(true);
        const imageUrl = img.imageUrl || img.url;
        const imageRef = useRef(null);

        // Validate URL format (fast check)
        const isValidUrl = useMemo(() => {
            if (!imageUrl || typeof imageUrl !== 'string') return false;

            // Quick validation - check if it's a valid URL pattern
            return imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
        }, [imageUrl]);

        // Don't render if invalid URL format
        if (!isValidUrl) {
            return null;
        }

        return (
            <View style={styles.slide}>
                <Image
                    ref={imageRef}
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    onLoadStart={() => setImageLoading(true)}
                    onLoad={() => setImageLoading(false)}
                    onLoadEnd={() => setImageLoading(false)}
                    onError={() => {
                        setImageError(true);
                        setImageLoading(false);
                    }}
                    progressiveRenderingEnabled={true}
                />

                {/* Loading overlay */}
                {imageLoading && (
                    <View style={styles.imageLoadingOverlay}>
                        <ActivityIndicator size="small" color="#8B4513" />
                    </View>
                )}

                {/* Error overlay - shows if image fails to load */}
                {imageError && (
                    <View style={styles.imageErrorOverlay}>
                        <Ionicons name="image-outline" size={50} color="#999" />
                        <Text style={styles.errorText}>Image not available</Text>
                    </View>
                )}

                {/* Info overlay (only show if image loaded successfully) */}
                {!imageError && (
                    <View style={styles.overlay}>
                        <Text style={styles.cigarName}>{fullName}</Text>
                        {overall > 0 && (
                            <View style={styles.overallRating}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Ionicons
                                        key={star}
                                        name={star <= overall ? "star" : "star-outline"}
                                        size={22}
                                        color="#FFD700"
                                    />
                                ))}
                            </View>
                        )}
                        {note && (
                            <Text style={styles.noteText} numberOfLines={2}>
                                {note}
                            </Text>
                        )}
                        {overall === 0 && (
                            <Text style={styles.notSmokedText}>
                                Not Yet Smoked
                            </Text>
                        )}
                    </View>
                )}
            </View>
        );
    });

    const renderStoryCard = ({ item }) => {
        const { images, fullName, overall, logId, likes = 0, dislikes = 0, userReaction, note, isPast } = item;

        // Quick filter for valid URLs (fast check)
        const validImages = images?.filter(img => {
            const imageUrl = img.imageUrl || img.url;
            return imageUrl &&
                typeof imageUrl === 'string' &&
                (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
        }) || [];

        // Don't render this card at all if no potentially valid images
        if (validImages.length === 0) {
            return null;
        }

        const hasMultiple = validImages.length > 1;

        return (
            <View style={styles.card}>
                <View style={styles.carouselWrapper}>
                    {hasMultiple ? (
                        <Carousel
                            width={width - 32}
                            height={450}
                            data={validImages}
                            keyExtractor={(img, index) => img.id || `img-${logId}-${index}`}
                            renderItem={({ item: img, index }) => (
                                <View style={styles.slideContainer}>
                                    <ImageSlide
                                        img={img}
                                        fullName={fullName}
                                        overall={overall}
                                        note={note}
                                        key={`slide-${logId}-${index}`}
                                    />
                                </View>
                            )}
                            autoPlay={validImages.length > 1}
                            mode="horizontal"
                            autoPlayInterval={5000}
                            style={styles.carousel}
                            pagingEnabled={true}
                        />
                    ) : (
                        <View style={styles.singleSlideContainer}>
                            <ImageSlide
                                img={validImages[0]}
                                fullName={fullName}
                                overall={overall}
                                note={note}
                            />
                        </View>
                    )}
                </View>

                {/* Like/Dislike Buttons */}
                <View style={styles.reactionContainer}>
                    <TouchableOpacity
                        style={[
                            styles.reactionButton,
                            userReaction === 'like' && styles.reactionButtonActive
                        ]}
                        onPress={() => handleReaction(logId, 'like')}
                    >
                        <Ionicons
                            name="thumbs-up"
                            size={20}
                            color={userReaction === 'like' ? "#8B4513" : "#666"}
                        />
                        <Text style={[
                            styles.reactionCount,
                            userReaction === 'like' && styles.reactionCountActive
                        ]}>
                            {likes}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.reactionButton,
                            userReaction === 'dislike' && styles.reactionButtonActive
                        ]}
                        onPress={() => handleReaction(logId, 'dislike')}
                    >
                        <Ionicons
                            name="thumbs-down"
                            size={20}
                            color={userReaction === 'dislike' ? "#8B4513" : "#666"}
                        />
                        <Text style={[
                            styles.reactionCount,
                            userReaction === 'dislike' && styles.reactionCountActive
                        ]}>
                            {dislikes}
                        </Text>
                    </TouchableOpacity>
                </View>
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
            <View style={styles.header}>
                <Text style={styles.headerText}>Recent Humi Moments</Text>
                <TouchableOpacity style={styles.addButton}>
                    {/* <Ionicons name="add-circle" size={32} color="white" /> */}
                </TouchableOpacity>
            </View>

            <FlatList
                data={logs}
                keyExtractor={(item) => item?.logId}
                renderItem={renderStoryCard}
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                    <View style={styles.footer}>
                        {loadingMore ? (
                            <>
                                <ActivityIndicator color="#8B4513" />
                                <Text style={styles.footerText}>Loading more stories...</Text>
                            </>
                        ) : isAllCaughtUp ? (
                            <View style={styles.caughtUpContainer}>
                                <Ionicons name="checkmark-circle" size={24} color="#8B4513" />
                                <Text style={styles.caughtUpText}>You're all caught up!</Text>
                            </View>
                        ) : null
                        }
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="images-outline" size={64} color="#CCC" />
                        <Text style={styles.emptyText}>No cigar stories yet</Text>
                        <Text style={styles.emptySubtext}>
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
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 16,
        overflow: "hidden",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    carouselWrapper: {
        borderRadius: 16,
        overflow: "hidden", // This clips the carousel to rounded corners
        backgroundColor: "#fff", // Ensure background matches card
    },
    slideContainer: {
        width: "100%",
        height: "100%",
    },

    // Container for single image (non-carousel)
    singleSlideContainer: {
        width: "100%",
        height: 450,
    },

    singleImageContainer: {
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#fff"
    },

    slide: {
        width: "100%",
        height: 450,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
    },

    image: {
        width: "100%",
        height: "100%",
        borderRadius: 10, // Slightly smaller radius than frame
    },

    overlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingVertical: 20,
        backgroundColor: "rgba(0,0,0,0.45)",
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
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
        width: width,
        height: 450,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#000",
        // marginTop: 10,
    },
    // Reaction Styles
    reactionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        width: '100%',
    },
    reactionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 12,
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
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
    },
    caughtUpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: '#FFF8DC', // Light wheat background
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#8B4513',
        marginHorizontal: 20,
        marginBottom: 20,
    },
    caughtUpText: {
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '600',
        color: '#8B4513',
    },
    pastBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(139, 69, 19, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 10,
    },
    pastBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    slide: {
        width: "100%",
        height: 450,
        backgroundColor: "#000", // Changed from red to black
        alignItems: "center",
        justifyContent: "center",
    },

    imageLoading: {
        width: "100%",
        height: "100%",
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F5F2',
    },

    // Add these new styles:
    noteText: {
        backgroundColor: "#333",
        color: "white",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        fontSize: 14,
        fontWeight: "500",
        alignSelf: "flex-start",
        marginTop: 10,
    },

    notSmokedText: {
        backgroundColor: "#b8860b",
        color: "white",
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        fontSize: 13,
        alignSelf: "flex-start",
        fontWeight: "600",
    },
    slide: {
        width: "100%",
        height: 450,
        backgroundColor: "#000",
        position: 'relative', // Important for overlay positioning
    },

    image: {
        width: "100%",
        height: "100%",
    },

    // Loading overlay
    imageLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },

    // Error overlay
    imageErrorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },

    errorText: {
        marginTop: 10,
        fontSize: 14,
        color: '#666',
    },

    overlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingVertical: 20,
        backgroundColor: "rgba(0,0,0,0.45)",
        zIndex: 2,
    },

});