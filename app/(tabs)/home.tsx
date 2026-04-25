import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, DeviceEventEmitter, Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getFeedCore, enrichFeed } from '../../src/api/feed';
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
import { POST_METRICS_CHANGED_EVENT, applyPostMetricsChange } from '../../src/utils/postMetrics';
import { useLanguage } from '../../src/context/LanguageContext';

export default function HomeScreen() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { colors } = useTheme();
    const { t } = useLanguage();
    const momentSharedText = t('moment_shared');
    const [posts, setPosts] = useState<any[]>([]);
    const [stories, setStories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingStories, setLoadingStories] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [initialStoryUserIndex, setInitialStoryUserIndex] = useState(0);

    // Success Toast State
    const [showToast, setShowToast] = useState(false);
    const toastAnim = useRef(new Animated.Value(100)).current;

    const loadFeed = async (isRefresh = false, batchSize = 15, currentCursor: string | null = null) => {
        try {
            if (isRefresh) setLoading(true);

            const targetCursor = isRefresh ? null : currentCursor;
            const response = await getFeedCore(targetCursor || undefined, batchSize);

            if (response?.data) {
                const newPosts = response.data;

                // 1. Initial Render (Instant)
                setPosts(prev => {
                    const mappedNewPosts = newPosts.map((newP: any) => {
                        const existingP = prev.find((p: any) => p.id === newP.id);
                        if (existingP) {
                            return {
                                ...newP,
                                profiles: existingP.profiles || newP.profiles,
                                communities: existingP.communities || newP.communities,
                                my_vote: existingP.my_vote !== undefined ? existingP.my_vote : newP.my_vote,
                                has_reposted: existingP.has_reposted !== undefined ? existingP.has_reposted : newP.has_reposted,
                                is_saved: existingP.is_saved !== undefined ? existingP.is_saved : newP.is_saved,
                            };
                        }
                        return newP;
                    });

                    if (isRefresh) {
                        return mappedNewPosts;
                    } else {
                        const existingIds = new Set(prev.map((p: any) => p.id));
                        const filtered = mappedNewPosts.filter((p: any) => !existingIds.has(p.id));
                        return [...prev, ...filtered];
                    }
                });

                if (newPosts.length > 0) {
                    setCursor(newPosts[newPosts.length - 1].created_at);
                }
                setHasMore(newPosts.length >= batchSize);

                // 2. Hydration (Enrichment)
                const pIds = newPosts.filter((p: any) => p.feed_type === 'post').map((p: any) => p.id);
                const pollIds = newPosts.filter((p: any) => p.feed_type === 'poll').map((p: any) => p.id);
                const eventIds = newPosts.filter((p: any) => p.feed_type === 'event').map((p: any) => p.id);
                const allIds = newPosts.map((p: any) => p.id);

                const userIds = [...new Set(newPosts.map((p: any) => p.user_id).filter(Boolean))] as string[];
                const commIds = [...new Set(newPosts.map((p: any) => p.community_id).filter(Boolean))] as string[];

                if (allIds.length > 0) {
                    enrichFeed(pIds, userIds, commIds, pollIds, eventIds).then(enrichRes => {
                        if (!enrichRes) return;
                        const profilesMap = Object.fromEntries(enrichRes.profiles?.map((p: any) => [p.id, p]) || []);
                        const commsMap = Object.fromEntries(enrichRes.communities?.map((c: any) => [c.id, c]) || []);
                        const votesMap = Object.fromEntries(enrichRes.myVotes?.map((v: any) => [v.post_id, v.value]) || []);
                        const repostsSet = new Set(enrichRes.myReposts?.map((r: any) => r.post_id) || []);
                        const savesSet = new Set(enrichRes.mySaves?.map((s: any) => s.post_id) || []);
                        
                        // Poll data
                        const pollOptionsMap = enrichRes.pollOptions?.reduce((acc: any, opt: any) => {
                            if (!acc[opt.poll_id]) acc[opt.poll_id] = [];
                            acc[opt.poll_id].push(opt);
                            return acc;
                        }, {});
                        const myPollVotesMap = Object.fromEntries(enrichRes.myPollVotes?.map((v: any) => [v.poll_id, v.option_id]) || []);
                        const pollCountsMap = Object.fromEntries(enrichRes.pollVotesCounts?.map((c: any) => [c.poll_id, c.vote_count]) || []);
                        const pollOptionCountsMap = Object.fromEntries(enrichRes.pollOptionCounts?.map((c: any) => [c.option_id, c.votes_count]) || []);

                        // Event data
                        const eventInterestMap = Object.fromEntries(enrichRes.eventInterests?.map((i: any) => [i.event_id, i.status]) || []);
                        const eventCountsMap = Object.fromEntries(enrichRes.eventInterestedCounts?.map((c: any) => [c.event_id, c.interest_count]) || []);

                        // Content maps
                        const postContentMap = Object.fromEntries(enrichRes.postData?.map((d: any) => [d.id, d]) || []);
                        const pollContentMap = Object.fromEntries(enrichRes.pollData?.map((d: any) => [d.id, d]) || []);
                        const eventContentMap = Object.fromEntries(enrichRes.eventData?.map((d: any) => [d.id, d]) || []);

                        setPosts(prev => prev.map(p => {
                            if (allIds.includes(p.id)) {
                                const base = {
                                    ...p,
                                    profiles: p.is_anonymous ? { name: 'Anonymous Student', avatar_url: null } : (profilesMap[p.user_id] || p.profiles),
                                    communities: commsMap[p.community_id] || p.communities,
                                };

                                if (p.feed_type === 'poll') {
                                    const pollD = pollContentMap[p.id];
                                    const rawOptions = pollOptionsMap?.[p.id] || [];
                                    const enrichedOptions = rawOptions.map((opt: any) => ({
                                        ...opt,
                                        votes_count: pollOptionCountsMap[opt.id] || 0
                                    }));

                                    return {
                                        ...base,
                                        question: pollD?.question || p.content,
                                        options: enrichedOptions,
                                        my_vote: myPollVotesMap[p.id] || null,
                                        vote_count: pollCountsMap[p.id] || 0,
                                    };
                                }
                                
                                if (p.feed_type === 'event') {
                                    const eventD = eventContentMap[p.id];
                                    return {
                                        ...base,
                                        title: eventD?.title || p.content,
                                        description: eventD?.description || p.description,
                                        start_time: eventD?.start_time || p.start_time,
                                        end_time: eventD?.end_time || p.end_time,
                                        image_url: eventD?.image_url || p.image_url,
                                        location: eventD?.location || p.location,
                                        is_interested: eventInterestMap[p.id] === 'going',
                                        interested_count: eventCountsMap[p.id] || 0,
                                    };
                                }

                                const postD = postContentMap[p.id];
                                return {
                                    ...base,
                                    content: postD?.content || p.content,
                                    image_url: postD?.image_url || p.image_url,
                                    media_urls: postD?.media_urls || p.media_urls,
                                    media_types: postD?.media_types || p.media_types,
                                    type: postD?.type || p.type,
                                    comments_count: postD?.comments_count || p.comments_count,
                                    vote_count: postD?.vote_count || p.vote_count,
                                    repost_count: postD?.repost_count || p.repost_count,
                                    view_count: postD?.view_count || p.view_count,
                                    interaction_count: postD?.interaction_count || p.interaction_count,
                                    my_vote: votesMap[p.id] || null,
                                    has_reposted: repostsSet.has(p.id),
                                    is_saved: savesSet.has(p.id),
                                };
                            }
                            return p;
                        }));
                    }).catch(e => console.error('Enrichment failed', e));
                }
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

    useEffect(() => {
        const triggerProgressiveFill = async () => {
            loadFeed(true, 3);
            loadStories();
        };
        triggerProgressiveFill();
    }, []);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('postCreated', () => {
            setRefreshing(true);
            loadFeed(true);
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
                    return {
                        ...p,
                        my_vote: data.myVote,
                        vote_count: data.voteCount,
                        interaction_count: typeof data.interactionCount === 'number' ? data.interactionCount : p.interaction_count,
                    };
                }
                return p;
            }));
        });

        const metricsSub = DeviceEventEmitter.addListener(POST_METRICS_CHANGED_EVENT, (data) => {
            setPosts(prev => prev.map(p => applyPostMetricsChange(p, data)));
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
            metricsSub.remove();
            updateSub.remove();
            commentCountSub.remove();
        }
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        loadFeed(true);
        loadStories();
    };

    const handleLoadMore = () => {
        if (!loading && hasMore && posts.length > 0) {
            loadFeed(false, 5, cursor);
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
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
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
