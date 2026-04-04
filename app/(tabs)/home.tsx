import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getFeed } from '../../src/api/feed';
import PostCard from '../../src/components/PostCard';
import EventCard from '../../src/components/EventCard';
import PollCard from '../../src/components/PollCard';
import JobCard from '../../src/components/JobCard';
import MarketCard from '../../src/components/MarketCard';
import StoryCircle from '../../src/components/StoryCircle';
import ShadowLoader, { Skeleton } from '../../src/components/ShadowLoader';
import FriendRequestBanner from '../../src/components/FriendRequestBanner';
import { getStoryFeed } from '../../src/api/stories';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import StoryViewer from '../../src/components/StoryViewer';

export default function HomeScreen() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { colors } = useTheme();
    const [posts, setPosts] = useState<any[]>([]);
    const [stories, setStories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [initialStoryUserIndex, setInitialStoryUserIndex] = useState(0);

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

    const loadStories = async () => {
        try {
            const res = await getStoryFeed();
            if (res?.data?.feed) {
                setStories(res.data.feed);
            }
        } catch (e) {
            console.log('Failed to load stories', e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadFeed(1, true);
            loadStories();
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
        loadStories();
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

    const renderStoriesHeader = () => (
        <View style={[styles.storiesContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <FlatList
                horizontal
                data={[{ id: 'me' }, ...stories]}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => {
                    if (item.id === 'me') {
                        return (
                            <StoryCircle
                                id="me"
                                isMe
                                title={currentUser?.name || 'Me'}
                                image_url={currentUser?.profile?.avatar_url}
                                onPress={() => router.push('/story-upload')}
                            />
                        );
                    }
                    return (
                        <StoryCircle
                            id={item.id}
                            title={item.user?.name || 'Friend'}
                            image_url={item.user?.avatar_url || item.stories?.[0]?.media_url}
                            media_type={item.stories?.[0]?.media_type}
                            onPress={() => {
                                setInitialStoryUserIndex(index - 1);
                                setViewerVisible(true);
                            }}
                        />
                    );
                }}
                contentContainerStyle={styles.storiesList}
            />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={posts}
                keyExtractor={item => `${item.feed_type}_${item.id}`}
                renderItem={renderItem}
                ListHeaderComponent={
                    <>
                        <FriendRequestBanner />
                        {renderStoriesHeader()}
                    </>
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
                        <Text style={[styles.emptyTitle, { color: colors.black }]}>Be the first to speak!</Text>
                        <Text style={[styles.emptyBody, { color: colors.gray600 }]}>
                            Start the conversation on your campus. Share a thought, ask a question, or post a meme.
                        </Text>
                        <TouchableOpacity
                            style={[styles.exploreBtn, { backgroundColor: colors.black }]}
                            onPress={() => router.push('/create-post')}
                        >
                            <Text style={[styles.exploreBtnText, { color: colors.white }]}>Start your first post</Text>
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

            <StoryViewer 
                visible={viewerVisible} 
                stories={stories}
                initialUserIndex={initialStoryUserIndex}
                onClose={() => setViewerVisible(false)} 
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        marginBottom: spacing.sm,
    },
    emptyBody: {
        fontFamily: fonts.regular,
        fontSize: 15,
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
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 24,
    },
    exploreBtnText: {
        fontFamily: fonts.semibold,
        fontSize: 15,
    },
    storiesContainer: {
        paddingVertical: spacing.md,
        borderBottomWidth: 0.5,
    },
    storiesList: {
        paddingHorizontal: spacing.md,
    },
});
