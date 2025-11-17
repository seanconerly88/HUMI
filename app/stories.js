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
    doc
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

    const loadMoreLock = useRef(false);
    const viewedRef = useRef({});
    const logCache = useRef({}); // ✅ prevents duplicate Firestore reads

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
                const finalFeed = Object.entries(grouped).map(([logId, imgs]) => {
                    // Since fullName + overall are now saved inside logsMomentsImages
                    const first = imgs[0];

                    let cigarName = first.fullName || "Unknown Cigar";

                    // Try to parse AI content if needed
                    if (cigarName === "Unknown Cigar" && first.aiRawResponseSnapshot) {
                        try {
                            const aiData = JSON.parse(first.aiRawResponseSnapshot);
                            if (aiData.fullName) cigarName = aiData.fullName;
                        } catch { }
                    }

                    return {
                        logId,
                        fullName: cigarName,
                        overall: first.overall ?? 0,
                        images: imgs,
                    };
                });

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
    console.log(logs)
    const renderStoryCard = ({ item }) => {
        const { images, fullName, overall } = item;
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
                            keyExtractor={(img) => img.id}  // ✅ unique per slide
                            renderItem={({ item: img }) => renderSlide(img)}
                            autoPlay
                            autoPlayInterval={5000}
                        />
                    ) : (
                        <View style={styles.singleWrapper}>
                            {renderSlide(images[0])}
                        </View>
                    )}
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
                <TouchableOpacity
                    style={styles.addButton}
                >
                    <Ionicons name="add-circle" size={32} color="#8B4513" />
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
    headerTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: "#2C1810",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#8B7D6B",
    },
    card: {
        backgroundColor: "#fff",
        marginBottom: 20,
        borderRadius: 16,
        overflow: "hidden",
        elevation: 2,
        display: 'flex',
        alignItems: 'center'
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

    infoCard: {
        flexDirection: "column",
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
    metaContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        paddingBottom: 12,
    },
    userContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    username: {
        fontSize: 14,
        fontWeight: "500",
        color: "#8B4513",
        marginLeft: 6,
    },
    date: {
        fontSize: 12,
        color: "#8B7D6B",
    },
    description: {
        fontSize: 14,
        color: "#5D4037",
        lineHeight: 20,
        paddingHorizontal: 16,
        paddingBottom: 16,
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
    imageContainer: {
        width: "100%",
        alignItems: "center",
        paddingHorizontal: 12,   // ✅ equal spacing both sides
    },

    carouselFix: {
        borderRadius: 16,
        overflow: "hidden",
    },

    singleWrapper: {
        width: width - 24,        // ✅ matches carousel width
        height: 400,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#000",  // ✅ consistent visual baseline
        marginTop: 10,
    },

});