import React, { useEffect, useState, useRef } from "react";
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
    collectionGroup,
    Timestamp,
    getDoc,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    setDoc
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function CigarStories() {
    const PAGE_SIZE = 50;
    const userId = auth.currentUser?.uid || "test-user";
    const cutoff = useRef(new Date(Date.now() - 24 * 60 * 60 * 1000)).current;

    const [logs, setLogs] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [userReactions, setUserReactions] = useState({}); // Track user reactions per post

    const loadMoreLock = useRef(false);
    const viewedRef = useRef({});
    const logCache = useRef({});

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

                        return {
                            logId,
                            fullName: cigarName,
                            overall: first.overall ?? 0,
                            note: first.notes ?? '',
                            images: imgs,
                            likes: reactionsData.likes,
                            dislikes: reactionsData.dislikes,
                            userReaction: reactionsData.userReaction
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
            <View style={styles.slide}>
                <Image source={{ uri: img.imageUrl }} style={styles.image} />
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
                    {
                        note && (
                            <Text
                                style={{
                                    backgroundColor: "#333",
                                    color: "white",
                                    paddingVertical: 6,
                                    paddingHorizontal: 12,
                                    borderRadius: 10,
                                    fontSize: 14,
                                    fontWeight: "500",
                                    alignSelf: "flex-start",
                                    overflow: "hidden",
                                    marginTop:10
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
            <View style={styles.card}>
                <View style={styles.imageContainer}>
                    {hasMultiple ? (
                        <Carousel
                            width={width - 24}
                            height={400}
                            data={images}
                            keyExtractor={(img) => img.id}
                            renderItem={({ item: img }) => renderSlide(img)}
                            autoPlay
                            mode="horizontal"
                            autoPlayInterval={5000}
                        />
                    ) : (
                        <View style={styles.singleWrapper}>
                            {renderSlide(images[0])}
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
                    loadingMore ? (
                        <View style={styles.footer}>
                            <ActivityIndicator color="#8B4513" />
                            <Text style={styles.footerText}>Loading more stories...</Text>
                        </View>
                    ) : null
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
        width: width - 24,
        height: 400,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#000",
        marginTop: 10,
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
});