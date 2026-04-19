import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, DeviceEventEmitter, Animated } from 'react-native';
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
import ShadowLoader from '../../src/components/ShadowLoader';
import FriendRequestBanner from '../../src/components/FriendRequestBanner';
import { getStoryFeed } from '../../src/api/stories';
import { useAuth } from '../../src/context/AuthContext';
import StoryViewer from '../../src/components/StoryViewer';
import { LinearGradient } from 'expo-linear-gradient';
import { POST_COMMENT_COUNT_CHANGED_EVENT, applyPostCommentCountChange } from '../../src/utils/postCommentCount';
import { useLanguage } from '../../src/context/LanguageContext';

export default function HomeScreen() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const momentSharedText = language === 'tr' ? 'An paylaşıldı' : language === 'ka' ? 'მომენტი გაზიარდა' : 'Moment shared';
    const [posts, setPosts] = useState<any[]>([]);
    const [stories, setStories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingStories, setLoadingStories] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [initialStoryUserIndex, setInitialStoryUserIndex] = useState(0);

    // Success Toast State
    const [showToast, setShowToast] = useState(false);
    const toastAnim = useRef(new Animated.Value(100)).current;

    const loadFeed = async (pageNum = 1, isRefresh = false, batchSize = 15) => {
        try {
            if (isRefresh && pageNum === 1) setLoading(true);

            const response = await getFeed(pageNum, batchSize);
            if (response?.data) {
                if (isRefresh && pageNum === 1) {
                    setPosts(response.data);
                } else {
                    setPosts(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const newPosts = response.data.filter((p: any) => !existingIds.has(p.id));
                        return [...prev, ...newPosts];
                    });
                }
                setHasMore(response.data.length >= batchSize);
            }
            return response;
        } catch (e) {
            console.log('Failed to fetch feed', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadStories = async () => {
        try {
            setLoadingStories(true);
            const res = await getStoryFeed();
            if (res?.data?.feed) {
                setStories(res.data.feed);
            }
        } catch (e) {
            console.log('Failed to load stories', e);
        } finally {
            setLoadingStories(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            const triggerProgressiveFill = async () => {
                // Kick off 3 items + stories immediately (parallel)
                loadFeed(1, true, 3);
                loadStories();

                // Then fetch 5 more to fill the screen (AFTER exactly 100ms)
                setTimeout(async () => {
                    await loadFeed(1, false, 5);
                    setPage(1);
                }, 100);
            };

            triggerProgressiveFill();
        }, [])
    );

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('postCreated', () => {
            setRefreshing(true);
            loadFeed(1, true);
        });

        const storySub = DeviceEventEmitter.addListener('storyPosted', () => {
            loadStories();
            // Show Success Toast
            setShowToast(true);
            Animated.spring(toastAnim, { 
                toValue: 0, 
                tension: 80, 
                friction: 12, 
                useNativeDriver: true 
            }).start();
            
            // Hide after 3s
            setTimeout(() => {
                Animated.timing(toastAnim, { 
                    toValue: 100, 
                    duration: 500, 
                    useNativeDriver: true 
                }).start(() => {
                    setShowToast(false);
                });
            }, 3000);
        });

        const storyDelSub = DeviceEventEmitter.addListener('storyDeleted', () => {
            loadStories();
        });

        const profileSub = DeviceEventEmitter.addListener('profileUpdated', (updates) => {
            if (!currentUser) return;
            setPosts(prev => prev.map(p => {
                if (p.user_id === currentUser.id) {
                    return { ...p, profiles: { ...p.profiles, name: updates.name, avatar_url: updates.avatar_url } };
                }
                return p;
            }));
        });

        const voteSub = DeviceEventEmitter.addListener('postVoted', (data) => {
            setPosts(prev => prev.map(p => {
                if (p.id === data.postId) {
                    return { ...p, my_vote: data.myVote, vote_count: data.voteCount };
                }
                return p;
            }));
        });

        const updateSub = DeviceEventEmitter.addListener('postUpdated', (data) => {
            setPosts(prev => prev.map(p => {
                if (p.id !== data.postId) return p;

                const localPatch = {
                    ...p,
                    content: data.content ?? p.content,
                    updated_at: data.updated_at ?? new Date().toISOString(),
                    is_edited: true,
                };

                // Some edit endpoints return partial payloads or no body at all.
                // Always apply the local patch first so the user sees the edit immediately.
                if (data.updatedPost && typeof data.updatedPost === 'object') {
                    return {
                        ...localPatch,
                        ...data.updatedPost,
                        content: data.updatedPost.content ?? localPatch.content,
                        updated_at: data.updatedPost.updated_at ?? localPatch.updated_at,
                        is_edited: data.updatedPost.is_edited ?? true,
                    };
                }

                return localPatch;
            }));
        });

        const commentCountSub = DeviceEventEmitter.addListener(POST_COMMENT_COUNT_CHANGED_EVENT, (data) => {
            if (!data?.postId) return;
            setPosts(prev => prev.map(p => applyPostCommentCountChange(p, data)));
        });

        return () => {
            sub.remove();
            storySub.remove();
            profileSub.remove();
            voteSub.remove();
            updateSub.remove();
            commentCountSub.remove();
        }
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(1);
        loadFeed(1, true);
        loadStories();
    };

    const handleLoadMore = () => {
        if (!loading && hasMore && posts.length > 0) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadFeed(nextPage, false, 5);
        }
    };

    const handleItemDelete = (id: string) => {
        setPosts(prev => prev.filter(item => item.id !== id));
    };

    const renderItem = ({ item }: { item: any }) => {
        const type = String(item.feed_type || '').toLowerCase();
        switch (type) {
            case 'event': return <EventCard event={item} onDelete={handleItemDelete} />;
            case 'poll': return <PollCard poll={item} onDelete={handleItemDelete} />;
            case 'job': return <JobCard job={item} onDelete={handleItemDelete} />;
            case 'market': return <MarketCard item={item} onDelete={handleItemDelete} />;
            default: return <PostCard post={item} onDelete={handleItemDelete} />;
        }
    };

    const renderStoriesHeader = () => {
        if (loadingStories && stories.length === 0) {
            return <ShadowLoader type="stories" />;
        }

        const myStoryIndex = stories.findIndex(s => s.user_id === currentUser?.id || s.user?.id === currentUser?.id);
        const myStory = myStoryIndex !== -1 ? stories[myStoryIndex] : null;
        const otherStories = stories.filter(s => s.user_id !== currentUser?.id && s.user?.id !== currentUser?.id);

        return (
            <View style={[styles.storiesContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <FlatList
                    horizontal
                    data={[{ id: 'me' }, ...otherStories]}
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
                                    onPress={() => {
                                        if (myStory) {
                                            setInitialStoryUserIndex(myStoryIndex);
                                            setViewerVisible(true);
                                        } else {
                                            router.push('/story-upload');
                                        }
                                    }}
                                    onAddPress={() => router.push('/story-upload')}
                                />
                            );
                        }

                        const originalIndex = stories.findIndex(s => s.id === item.id);
                        return (
                            <StoryCircle
                                id={item.id}
                                title={item.user?.name || t('friends')}
                                image_url={item.user?.avatar_url}
                                isUnread={item.all_viewed === false}
                                isAdmin={item.is_admin}
                                onPress={() => {
                                    setInitialStoryUserIndex(originalIndex);
                                    setViewerVisible(true);
                                }}
                            />
                        );
                    }}
                    contentContainerStyle={styles.storiesList}
                />
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={posts}
                keyExtractor={item => `${item.feed_type}_${item.id}`}
                renderItem={renderItem}
                ListHeaderComponent={
                    <>
                        {renderStoriesHeader()}
                        <FriendRequestBanner variant="feed" />
                    </>
                }
                refreshing={refreshing}
                onRefresh={handleRefresh}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={2.5}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={11}
                ListFooterComponent={
                    (loading || hasMore) ? (
                        <ShadowLoader type="feed" />
                    ) : null
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={
                    loading && posts.length === 0 ? (
                        <View style={{ paddingTop: 0 }}>
                            <ShadowLoader type="feed" />
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.gray300} style={{ marginBottom: spacing.md }} />
                            <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('empty_feed')}</Text>
                            <Text style={[styles.emptyBody, { color: colors.gray600 }]}>
                                {t('share_with_campus')}
                            </Text>
                            <TouchableOpacity
                                style={[styles.exploreBtn, { backgroundColor: colors.black }]}
                                onPress={() => router.push('/create-post')}
                            >
                                <Text style={[styles.exploreBtnText, { color: colors.white }]}>{t('new_post')}</Text>
                            </TouchableOpacity>
                        </View>
                    )
                }
            />

            <StoryViewer
                visible={viewerVisible}
                stories={stories}
                initialUserIndex={initialStoryUserIndex}
                onClose={() => setViewerVisible(false)}
            />

            {/* Success Toast Pill */}
            {showToast && (
                <Animated.View style={[styles.successToast, { transform: [{ translateY: toastAnim }] }]}>
                    <View style={[styles.toastContent, { backgroundColor: colors.success }]}>
                        <Ionicons name="checkmark-circle" size={20} color="white" />
                        <Text style={styles.toastText}>{momentSharedText}</Text>
                    </View>
                </Animated.View>
            )}
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
    successToast: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 999,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    toastText: {
        color: 'white',
        fontFamily: fonts.bold,
        fontSize: 14,
    },
});
