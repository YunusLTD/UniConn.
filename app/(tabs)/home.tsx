import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts } from '../../src/constants/theme';
import { getFeed } from '../../src/api/feed';
import PostCard from '../../src/components/PostCard';
import EventCard from '../../src/components/EventCard';
import PollCard from '../../src/components/PollCard';
import JobCard from '../../src/components/JobCard';
import MarketCard from '../../src/components/MarketCard';
import ShadowLoader, { Skeleton } from '../../src/components/ShadowLoader';
import FriendRequestBanner from '../../src/components/FriendRequestBanner';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
    const router = useRouter();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const loadFeed = async (pageNum = 1, isRefresh = false) => {
        try {
            const response = await getFeed(pageNum, 10);
            if (response?.data) {
                if (isRefresh) {
                    setPosts(response.data);
                } else {
                    setPosts(prev => [...prev, ...response.data]);
                }
                setHasMore(response.data.length === 10);
            }
        } catch (e) {
            console.log('Failed to fetch feed', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            // Only refresh if we already had data or if it's the first load
            // This ensures immediate update when coming back from Create Post
            loadFeed(1, true);
        }, [])
    );

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('postCreated', () => {
            setRefreshing(true);
            loadFeed(1, true);
        });
        return () => sub.remove();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(1);
        loadFeed(1, true);
    };

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadFeed(nextPage);
        }
    };

    const handleItemDelete = (id: string) => {
        setPosts(prev => prev.filter(item => item.id !== id));
    };

    if (loading && page === 1) {
        return <ShadowLoader />;
    }

    const renderItem = ({ item }: { item: any }) => {
        const type = String(item.feed_type || '').toLowerCase();

        switch (type) {
            case 'event': return <EventCard event={item} onDelete={handleItemDelete} />;
            case 'poll': return <PollCard poll={item} onDelete={handleItemDelete} />;
            case 'job': return <JobCard job={item} onDelete={handleItemDelete} />;
            case 'market': return <MarketCard item={item} />;
            default: return <PostCard post={item} onDelete={handleItemDelete} />;
        }
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={posts}
                keyExtractor={item => `${item.feed_type}_${item.id}`}
                renderItem={renderItem}
                ListHeaderComponent={
                    <View style={{ marginBottom: spacing.md }}>
                        <FriendRequestBanner />
                    </View>
                }
                refreshing={refreshing}
                onRefresh={handleRefresh}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.gray300} style={{ marginBottom: spacing.md }} />
                        <Text style={styles.emptyTitle}>Be the first to speak!</Text>
                        <Text style={styles.emptyBody}>
                            Start the conversation on your campus. Share a thought, ask a question, or post a meme.
                        </Text>
                        <TouchableOpacity
                            style={styles.exploreBtn}
                            onPress={() => router.push('/create-post')}
                        >
                            <Text style={styles.exploreBtnText}>Start your first post</Text>
                        </TouchableOpacity>
                    </View>
                }
                ListFooterComponent={
                    hasMore && posts.length > 0 ? (
                        <View style={styles.footer}>
                            <Skeleton width={100} height={10} borderRadius={5} />
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 120,
        paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: colors.black,
        marginBottom: spacing.sm,
    },
    emptyBody: {
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.gray500,
        textAlign: 'center',
        marginHorizontal: 32,
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    footer: {
        paddingVertical: spacing.xl,
        alignItems: 'center',
    },
    exploreBtn: {
        backgroundColor: colors.black,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 24,
    },
    exploreBtnText: {
        fontFamily: fonts.semibold,
        color: colors.white,
        fontSize: 15,
    },
});
