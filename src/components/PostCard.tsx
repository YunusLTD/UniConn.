import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert, Modal, FlatList, Animated, Clipboard, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ICONS } from '../constants/icons';
import { Skeleton } from './ShadowLoader';
import { useRouter } from 'expo-router';
import { votePost, deletePost, repostPost, savePost, unsavePost } from '../api/posts';
import { submitReport } from '../api/reports';
import { useAuth } from '../context/AuthContext';
import { useVideoPlayer, VideoView } from 'expo-video';
import ActionModal, { ActionOption } from './ActionModal';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { formatTimeAgo } from '../utils/localization';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '../utils/haptics';
import { POST_METRICS_CHANGED_EVENT } from '../utils/postMetrics';
import PostShareModal from './PostShareModal';

const { width } = Dimensions.get('window');
const GRID_GAP = 2;
const STAT_SWIPE_DISTANCE = 14;
const STAT_SWIPE_DURATION = 180;

const formatMetricCount = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
    return String(value);
};

// MediaGrid
const MediaCarousel = ({ media, types, onImagePress, hideNavigation, router, postId }: { media: string[], types: string[], onImagePress: (index: number) => void, hideNavigation: boolean, router: any, postId: string }) => {
    const { colors: themeColors } = useTheme();
    const scrollX = useRef(new Animated.Value(0)).current;
    
    // Calculate width: screen width - left column (avatar+gap) - card padding
    const containerWidth = width - (spacing.lg * 2) - 44 - 12;
    const itemWidth = containerWidth * 0.92; // "Big half" / mostly full width
    const gap = 10;

    if (!media || media.length === 0) return null;

    const handlePress = (index: number) => {
        if (!hideNavigation) {
            router.push(`/post/${postId}`);
        } else {
            onImagePress(index);
        }
    };

    const renderItem = ({ item, index }: { item: string, index: number }) => (
        <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => handlePress(index)}
            style={{
                width: media.length === 1 ? containerWidth : itemWidth,
                height: 320,
                marginRight: index === media.length - 1 ? 0 : gap,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: themeColors.elevated,
            }}
        >
            <Image source={{ uri: item }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
            {types[index] === 'video' && (
                <View style={styles.videoOverlay}>
                    <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
                </View>
            )}
            {media.length > 1 && (
                <View style={styles.carouselBadge}>
                    <Text style={styles.carouselBadgeText}>{index + 1}/{media.length}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={{ marginTop: 10 }}>
            <FlatList
                data={media}
                renderItem={renderItem}
                keyExtractor={(_, i) => i.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={itemWidth + gap}
                decelerationRate="fast"
                snapToAlignment="start"
                contentContainerStyle={{ paddingRight: media.length > 1 ? 20 : 0 }}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
            />
            
            {media.length > 1 && (
                <View style={styles.dotContainer}>
                    {media.map((_, i) => {
                        const opacity = scrollX.interpolate({
                            inputRange: [(i - 1) * (itemWidth + gap), i * (itemWidth + gap), (i + 1) * (itemWidth + gap)],
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        const scale = scrollX.interpolate({
                            inputRange: [(i - 1) * (itemWidth + gap), i * (itemWidth + gap), (i + 1) * (itemWidth + gap)],
                            outputRange: [0.8, 1.2, 0.8],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View 
                                key={i} 
                                style={[styles.dot, { opacity, transform: [{ scale }], backgroundColor: themeColors.gray400 }]} 
                            />
                        );
                    })}
                </View>
            )}
        </View>
    );
};

// ─── MediaViewerItem ───
const MediaViewerItem = ({ url, type }: { url: string, type: string }) => {
    if (type === 'video') {
        const player = useVideoPlayer(url, p => {
            p.loop = true;
            p.play();
        });
        return (
            <View style={styles.viewerPage}>
                <VideoView 
                    player={player} 
                    style={styles.viewerImage} 
                    contentFit="contain"
                    nativeControls={false}
                />
            </View>
        );
    }
    return (
        <View style={styles.viewerPage}>
            <Image 
                source={{ uri: url, cache: 'force-cache' }} 
                style={styles.viewerImage} 
                resizeMode="contain" 
            />
        </View>
    );
};

const AnimatedStatNumber = ({ value, style }: { value: number; style: any }) => {
    const [baseValue, setBaseValue] = useState<number>(value);
    const [targetValue, setTargetValue] = useState<number | null>(null);
    const [direction, setDirection] = useState<1 | -1>(1);
    const progress = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const currentlyVisible = targetValue ?? baseValue;
        if (value === currentlyVisible) return;

        const nextDirection: 1 | -1 = value > currentlyVisible ? 1 : -1;
        setDirection(nextDirection);
        setBaseValue(currentlyVisible);
        setTargetValue(value);

        progress.stopAnimation(() => {
            progress.setValue(0);
            Animated.timing(progress, {
                toValue: 1,
                duration: STAT_SWIPE_DURATION,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (!finished) return;
                setBaseValue(value);
                setTargetValue(null);
                progress.setValue(0);
            });
        });
    }, [baseValue, progress, targetValue, value]);

    if (targetValue === null) {
        return (
            <View style={styles.animatedStatWrap}>
                <Text style={style}>{baseValue}</Text>
            </View>
        );
    }

    const outTo = direction === 1 ? -STAT_SWIPE_DISTANCE : STAT_SWIPE_DISTANCE;
    const inFrom = direction === 1 ? STAT_SWIPE_DISTANCE : -STAT_SWIPE_DISTANCE;

    const outgoingTranslateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, outTo],
    });
    const incomingTranslateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [inFrom, 0],
    });
    const outgoingOpacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });
    const incomingOpacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <View style={styles.animatedStatWrap}>
            <Animated.Text
                style={[
                    style,
                    {
                        opacity: outgoingOpacity,
                        transform: [{ translateY: outgoingTranslateY }],
                    },
                ]}
            >
                {baseValue}
            </Animated.Text>
            <Animated.Text
                style={[
                    style,
                    styles.animatedStatOverlay,
                    {
                        opacity: incomingOpacity,
                        transform: [{ translateY: incomingTranslateY }],
                    },
                ]}
            >
                {targetValue}
            </Animated.Text>
        </View>
    );
};

// ─── PostCard ───
function PostCard({ post, showDelete = false, onDelete, onSaveChange, hideNavigation = false, hideCommunity = false }: { post: any, showDelete?: boolean, onDelete?: (id: string) => void, onSaveChange?: (id: string, isSaved: boolean) => void, hideNavigation?: boolean, hideCommunity?: boolean }) {
    const router = useRouter();
    const { colors: themeColors } = useTheme();
    const { t, language } = useLanguage();
    const { showToast } = useToast();

    const renderContentWithMentions = (content: string) => {
        if (!content) return null;
        const parts = content.split(/(@[\w.-]+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);
                return (
                    <Text
                        key={index}
                        style={{ color: themeColors.blue, fontFamily: fonts.semibold }}
                        onPress={() => router.push(`/user/${username}`)}
                    >
                        {part}
                    </Text>
                );
            }
            return <Text key={index} style={{ color: themeColors.text }}>{part}</Text>;
        });
    };
    const { user } = useAuth();
    const [myVote, setMyVote] = useState<number | null>(post.my_vote);
    const [voteCount, setVoteCount] = useState<number>(post.vote_count || 0);
    const [repostCount, setRepostCount] = useState<number>(post.repost_count || 0);
    const [viewCount, setViewCount] = useState<number>(post.view_count || 0);
    const [interactionCount, setInteractionCount] = useState<number>(post.interaction_count || 0);
    const [hasReposted, setHasReposted] = useState<boolean>(!!post.has_reposted);
    const [isSaved, setIsSaved] = useState<boolean>(!!post.is_saved);

    useEffect(() => {
        setMyVote(post.my_vote);
        setVoteCount(post.vote_count || 0);
        setRepostCount(post.repost_count || 0);
        setViewCount(post.view_count || 0);
        setInteractionCount(post.interaction_count || 0);
        setHasReposted(!!post.has_reposted);
        setIsSaved(!!post.is_saved);
    }, [post.my_vote, post.vote_count, post.repost_count, post.view_count, post.interaction_count, post.has_reposted, post.is_saved]);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [actionVisible, setActionVisible] = useState(false);
    const [reportReasonVisible, setReportReasonVisible] = useState(false);
    const initials = (() => {
        const name = post.profiles?.name || '';
        const parts = name.split(' ').filter((p: string) => p.length > 0);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    })();

    // Animation values
    const upScale = React.useRef(new Animated.Value(1)).current;
    const downScale = React.useRef(new Animated.Value(1)).current;

    const animateVote = (type: 'up' | 'down') => {
        const value = type === 'up' ? upScale : downScale;
        Animated.sequence([
            Animated.timing(value, { toValue: 1.4, duration: 100, useNativeDriver: true }),
            Animated.spring(value, { toValue: 1, friction: 4, useNativeDriver: true })
        ]).start();
    };

    const openViewer = (index: number) => {
        setViewerIndex(index);
        setViewerVisible(true);
    };

    const isOwner = user?.id === post.user_id;

    const [isVoting, setIsVoting] = useState(false);
    const [isReposting, setIsReposting] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);

    // Hydration Animation
    const [isHydrated, setIsHydrated] = useState(!!post.profiles?.name);
    const hydratedAnim = useRef(new Animated.Value(post.profiles?.name ? 1 : 0)).current;

    useEffect(() => {
        if (post.profiles?.name && !isHydrated) {
            setIsHydrated(true);
            Animated.timing(hydratedAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }
    }, [post.profiles?.name]);

    const isEdited = !!post.is_edited;

    const handleMenu = () => {
        hapticLight();
        setActionVisible(true);
    };

    const handleCopyLink = () => {
        const shareUrl = `https://uni-platform.app/post/${post.id}`;
        Clipboard.setString(shareUrl);
        Alert.alert(t('link_copied_title'), t('post_link_copied'));
    };

    const handleReport = () => {
        setReportReasonVisible(true);
    };

    const sendReport = async (reason: string) => {
        try {
            await submitReport({ target_type: 'post', target_id: post.id, reason });
            hapticSuccess();
            setReportReasonVisible(false);
            if (onDelete) onDelete(post.id);

            Alert.alert(
                'Reported',
                'Thank you. We will review this post.'
            );
        } catch (e) {
            console.log('Report error', e);
            Alert.alert('Error', 'Failed to submit report. Please try again.');
        }
    };

    const handleDelete = () => {
        Alert.alert(t('delete_label') || 'Delete Post', t('clear_history_confirm')?.replace('{{count}}', '1') || 'Remove this post permanently?', [
            { text: t('cancel_label') || 'Cancel', style: 'cancel' },
            {
                text: t('delete_label') || 'Delete', style: 'destructive',
                onPress: async () => {
                    const actionId = Math.random().toString(36).substring(7);
                    DeviceEventEmitter.emit('action_status', { id: actionId, type: 'delete', status: 'processing' });
                    try {
                        await deletePost(post.id);
                        if (onDelete) onDelete(post.id);
                        DeviceEventEmitter.emit('action_status', { id: actionId, type: 'delete', status: 'success' });
                    } catch (e: any) {
                        DeviceEventEmitter.emit('action_status', { id: actionId, type: 'delete', status: 'error', message: e.message || 'Failed to delete' });
                    }
                }
            }
        ]);
    };

    const handleShare = async () => {
        setShareModalVisible(true);
    };

    const handleSaveToggle = async () => {
        hapticLight();
        setActionVisible(false);
        const previousValue = isSaved;
        const optimisticValue = !previousValue;
        const actionId = Math.random().toString(36).substring(7);
        const type = optimisticValue ? 'save' : 'unsave';

        setIsSaved(optimisticValue);
        if (onSaveChange) onSaveChange(post.id, optimisticValue);
        DeviceEventEmitter.emit('action_status', { id: actionId, type, status: 'processing' });

        try {
            const res = previousValue ? await unsavePost(post.id) : await savePost(post.id);
            const serverValue = typeof res?.data?.is_saved === 'boolean'
                ? res.data.is_saved
                : optimisticValue;

            setIsSaved(serverValue);
            if (onSaveChange) onSaveChange(post.id, serverValue);
            DeviceEventEmitter.emit('action_status', { id: actionId, type, status: 'success' });
        } catch (e: any) {
            setIsSaved(previousValue);
            if (onSaveChange) onSaveChange(post.id, previousValue);
            DeviceEventEmitter.emit('action_status', { id: actionId, type, status: 'error', message: e.message || 'Failed to save' });
        }
    };

    const handleEdit = () => {
        setActionVisible(false);
        router.push({ 
            pathname: '/create-post', 
            params: { 
                edit: 'true', 
                postId: post.id 
            } 
        });
    };

    const actionOptions: ActionOption[] = [
        { label: isSaved ? 'Unsave' : t('save'), icon: isSaved ? 'bookmark' : 'bookmark-outline', onPress: handleSaveToggle },
        { label: t('share_option'), icon: ICONS.share, onPress: handleShare },
        { label: t('report_option'), icon: ICONS.report, onPress: handleReport },
    ];

    if (isOwner) {
        actionOptions.unshift(
            { label: t('delete_label'), icon: ICONS.delete, onPress: handleDelete, destructive: true }
        );
        
        // 3-hour limit for editing posts
        const canEdit = new Date().getTime() - new Date(post.created_at).getTime() < 3 * 60 * 60 * 1000;
        if (canEdit) {
            actionOptions.unshift(
                { label: t('edit_post_option'), icon: ICONS.edit, onPress: handleEdit }
            );
        }
    }

    const reportOptions: ActionOption[] = [
        { label: t('inappropriate_content_option'), icon: 'alert-circle-outline', onPress: () => sendReport('inappropriate') },
        { label: t('harassment_option'), icon: 'hand-left-outline', onPress: () => sendReport('harassment') },
        { label: t('spam_option'), icon: 'ban-outline', onPress: () => sendReport('spam') },
    ];

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('postVoted', (data: any) => {
            if (data.postId === post.id) {
                setMyVote(data.myVote);
                setVoteCount(data.voteCount);
                if (typeof data.interactionCount === 'number') {
                    setInteractionCount(data.interactionCount);
                }
            }
        });
        const metricsSub = DeviceEventEmitter.addListener(POST_METRICS_CHANGED_EVENT, (data: any) => {
            if (data.postId === post.id) {
                if (typeof data.repost_count === 'number') {
                    setRepostCount(data.repost_count);
                }
                if (typeof data.view_count === 'number') {
                    setViewCount(data.view_count);
                }
                if (typeof data.interaction_count === 'number') {
                    setInteractionCount(data.interaction_count);
                }
                if (typeof data.has_reposted === 'boolean') {
                    setHasReposted(data.has_reposted);
                }
            }
        });
        return () => {
            sub.remove();
            metricsSub.remove();
        };
    }, [post.id]);

    const handleVote = async (value: number) => {
        if (isVoting) return;
        setIsVoting(true);

        // 1. Optimistic Update
        const oldVote = myVote || 0;
        const newVote = oldVote === value ? 0 : value; // Toggle off if clicking current vote
        const countDiff = newVote - oldVote;
        const newVoteCount = voteCount + countDiff;
        let nextInteractionCount = interactionCount;
        if (oldVote === 0 && newVote !== 0) nextInteractionCount += 1;
        if (oldVote !== 0 && newVote === 0) nextInteractionCount = Math.max(0, nextInteractionCount - 1);

        setMyVote(newVote);
        setVoteCount(newVoteCount);
        setInteractionCount(nextInteractionCount);

        DeviceEventEmitter.emit('postVoted', {
            postId: post.id,
            myVote: newVote,
            voteCount: newVoteCount,
            interactionCount: nextInteractionCount,
        });

        // Feedback
        hapticMedium();
        animateVote(value === 1 ? 'up' : 'down');

        try {
            // 2. API Call
            const res = await votePost(post.id, value);

            // 3. Confirm with Server
            if (res.data) {
                setMyVote(res.data.my_vote);
                setVoteCount(res.data.vote_count ?? newVoteCount);
                setInteractionCount(res.data.interaction_count ?? nextInteractionCount);
                DeviceEventEmitter.emit('postVoted', {
                    postId: post.id,
                    myVote: res.data.my_vote,
                    voteCount: res.data.vote_count ?? newVoteCount,
                    interactionCount: res.data.interaction_count ?? nextInteractionCount,
                });
            }
        } catch (e) {
            // 4. Rollback on Error
            setMyVote(oldVote);
            setVoteCount(voteCount);
            setInteractionCount(interactionCount);
            DeviceEventEmitter.emit('postVoted', {
                postId: post.id,
                myVote: oldVote === 0 ? null : oldVote,
                voteCount,
                interactionCount,
            });
            console.error('Vote error', e);
        } finally {
            setIsVoting(false);
        }
    };

    const handleRepost = async () => {
        if (isReposting) return;
        setIsReposting(true);

        const nextHasReposted = !hasReposted;
        const nextRepostCount = Math.max(0, repostCount + (nextHasReposted ? 1 : -1));
        const nextInteractionCount = Math.max(0, interactionCount + (nextHasReposted ? 1 : -1));
        const actionId = Math.random().toString(36).substring(7);

        setHasReposted(nextHasReposted);
        setRepostCount(nextRepostCount);
        setInteractionCount(nextInteractionCount);

        DeviceEventEmitter.emit(POST_METRICS_CHANGED_EVENT, {
            postId: post.id,
            repost_count: nextRepostCount,
            interaction_count: nextInteractionCount,
            has_reposted: nextHasReposted,
        });
        DeviceEventEmitter.emit('action_status', { id: actionId, type: 'repost', status: 'processing' });

        hapticLight();

        try {
            const res = await repostPost(post.id);
            if (res.data) {
                const finalHasReposted = !!res.data.has_reposted;
                setHasReposted(finalHasReposted);
                setRepostCount(res.data.repost_count ?? nextRepostCount);
                setInteractionCount(res.data.interaction_count ?? nextInteractionCount);
                DeviceEventEmitter.emit(POST_METRICS_CHANGED_EVENT, {
                    postId: post.id,
                    repost_count: res.data.repost_count ?? nextRepostCount,
                    interaction_count: res.data.interaction_count ?? nextInteractionCount,
                    has_reposted: finalHasReposted,
                });
                DeviceEventEmitter.emit('action_status', { id: actionId, type: 'repost', status: 'success' });
            }
        } catch (e: any) {
            setHasReposted(hasReposted);
            setRepostCount(repostCount);
            setInteractionCount(interactionCount);
            DeviceEventEmitter.emit(POST_METRICS_CHANGED_EVENT, {
                postId: post.id,
                repost_count: repostCount,
                interaction_count: interactionCount,
                has_reposted: hasReposted,
            });
            DeviceEventEmitter.emit('action_status', { id: actionId, type: 'repost', status: 'error', message: e.message || 'Failed' });
            console.error('Repost error', e);
        } finally {
            setIsReposting(false);
        }
    };

    const media = (post.media_urls && post.media_urls.length > 0)
        ? post.media_urls
        : (post.image_url ? [post.image_url] : []);
    const media_types = (post.media_types && post.media_types.length > 0)
        ? post.media_types
        : (post.image_url ? ['image'] : []);
    const commentCount = Number(post.comments_count || post.comments?.[0]?.count || 0);

    return (
        <View style={[styles.card, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
            {/* Thread line + avatar */}
            <View style={styles.row}>
                <View style={styles.leftCol}>
                    <TouchableOpacity
                        style={[styles.avatar, { backgroundColor: themeColors.elevated, borderColor: themeColors.border }]}
                        onPress={() => post.user_id && !post.is_anonymous && router.push(`/user/${post.user_id}`)}
                        activeOpacity={0.8}
                    >
                        {post.profiles?.avatar_url ? (
                            <Image source={{ uri: post.profiles.avatar_url }} style={styles.avatarImg} />
                        ) : post.profiles?.name ? (
                            <Text style={[styles.avatarText, { color: themeColors.gray500 }]}>{initials}</Text>
                        ) : (
                            <Skeleton width="100%" height="100%" borderRadius={20} />
                        )}
                    </TouchableOpacity>
                    <View style={[styles.threadLine, { backgroundColor: themeColors.border }]} />
                </View>

                <View style={styles.rightCol}>
                    {/* Repost indicator */}
                    {(post.reposted_by_user || post.reposted_at) && (
                        <View style={styles.repostedRow} pointerEvents="none">
                            <View style={[styles.repostedBadge, { backgroundColor: themeColors.elevated, borderColor: themeColors.border }]}>
                                <Ionicons name="repeat" size={12} color={themeColors.gray500} />
                                <Text style={[styles.repostedBadgeText, { color: themeColors.gray500 }]}>
                                    {t('reposted_label') || 'Reposted'}
                                </Text>
                            </View>
                            <Text style={[styles.repostedText, { color: themeColors.gray500 }]}>
                                {formatTimeAgo(post.reposted_at || post._display_time || post.created_at, t, language, true)}
                            </Text>
                        </View>
                    )}
                    {/* Author info */}
                    <View style={styles.authorRow}>
                        <View style={{ flex: 1 }}>
                            {!!post.profiles?.name ? (
                                <Animated.View style={{ opacity: hydratedAnim }}>
                                    <View style={styles.nameRow}>
                                        <TouchableOpacity 
                                            onPress={() => post.user_id && !post.is_anonymous && router.push(`/user/${post.user_id}`)}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}
                                        >
                                            <Text style={[styles.name, { color: themeColors.black }]} numberOfLines={1}>{post.profiles.name}</Text>
                                            {!!(post.profiles.is_admin || post.profiles.name === 'UniConn Platform') && (
                                                <MaterialCommunityIcons name="check-decagram" size={15} color="#00A3FF" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.metaRow}>
                                        {!hideCommunity && !!post.communities?.name && (
                                            <>
                                                <Text style={[styles.communityName, { color: themeColors.gray500, flexShrink: 1 }]} numberOfLines={1}>
                                                    {post.communities.is_official 
                                                        ? (post.communities.universities?.name || post.communities.name.replace(/ community/gi, ''))
                                                        : post.communities.name.replace(/ community/gi, '')}
                                                </Text>
                                                <Text style={[styles.dot, { color: themeColors.gray400 }]}>·</Text>
                                            </>
                                        )}
                                        <Text style={[styles.time, { color: themeColors.gray400 }]}>{formatTimeAgo(post.created_at, t, language, true)}</Text>
                                        {isEdited && (
                                            <>
                                                <Text style={[styles.dot, { color: themeColors.gray400 }]}>·</Text>
                                                <Text style={[styles.time, { color: themeColors.gray400, fontSize: 11 }]}>{t('edited_label')}</Text>
                                            </>
                                        )}
                                    </View>
                                </Animated.View>
                            ) : (
                                <View style={{ gap: 6, marginTop: 4 }}>
                                    <Skeleton width="40%" height={12} borderRadius={6} />
                                    <Skeleton width="20%" height={10} borderRadius={5} />
                                </View>
                            )}
                        </View>
                        <TouchableOpacity onPress={handleMenu} hitSlop={8} style={styles.menuBtn}>
                            <Ionicons name="ellipsis-horizontal" size={18} color={themeColors.gray400} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <TouchableOpacity
                        onPress={() => router.push(`/post/${post.id}`)}
                        activeOpacity={0.8}
                        disabled={hideNavigation}
                    >
                        {post.content ? (
                            <Text style={[styles.content, { color: themeColors.black }, hideNavigation && styles.contentSmall]}> 
                                {renderContentWithMentions(post.content)}
                            </Text>
                        ) : (
                            <View style={{ gap: 8, marginTop: 10, marginBottom: 12 }}>
                                <Skeleton width="100%" height={16} borderRadius={4} />
                                <Skeleton width="80%" height={16} borderRadius={4} />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* view count displayed in header; removed from card to avoid duplication */}

                    {/* Media */}
                    {media.length > 0 && (
                        <MediaCarousel media={media} types={media_types} onImagePress={openViewer} hideNavigation={hideNavigation} router={router} postId={post.id} />
                    )}

                    {/* metrics are shown in post header; hide here to avoid duplication */}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <View style={[styles.voteContainer, { backgroundColor: themeColors.elevated }]}>
                            <TouchableOpacity
                                style={styles.voteBtn}
                                onPress={() => handleVote(1)}
                                hitSlop={10}
                            >
                                <Animated.View style={{ transform: [{ scale: upScale }] }}>
                                    <Image
                                        source={ICONS.camera}
                                        style={[
                                            styles.voteIcon,
                                            { tintColor: myVote === 1 ? themeColors.blue : themeColors.gray500 }
                                        ]}
                                    />
                                </Animated.View>
                            </TouchableOpacity>

                            <AnimatedStatNumber
                                value={voteCount}
                                style={[
                                    styles.voteCountText,
                                    { color: themeColors.gray600 },
                                    myVote === 1 && { color: themeColors.blue },
                                    myVote === -1 && { color: themeColors.danger }
                                ]}
                            />

                            <TouchableOpacity
                                style={styles.voteBtn}
                                onPress={() => handleVote(-1)}
                                hitSlop={10}
                            >
                                <Animated.View style={{ transform: [{ scale: downScale }] }}>
                                    <Image
                                        source={ICONS.image}
                                        style={[
                                            styles.voteIcon,
                                            { tintColor: myVote === -1 ? themeColors.danger : themeColors.gray500 }
                                        ]}
                                    />
                                </Animated.View>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/post/${post.id}`)} hitSlop={6} disabled={hideNavigation}>
                            <Ionicons name="chatbubble-outline" size={16} color={themeColors.gray500} />
                            {commentCount > 0 && (
                                <AnimatedStatNumber
                                    value={commentCount}
                                    style={[styles.actionCount, { color: themeColors.gray500 }]}
                                />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} hitSlop={6} onPress={handleRepost} disabled={isReposting}>
                            <View style={styles.actionImageContainer}>
                                <Image
                                    source={ICONS.send}
                                    style={[styles.actionImage, { tintColor: hasReposted ? themeColors.blue : themeColors.gray500 }]}
                                />
                            </View>
                            {repostCount > 0 && (
                                <AnimatedStatNumber
                                    value={repostCount}
                                    style={[styles.actionCount, { color: hasReposted ? themeColors.blue : themeColors.gray500 }]}
                                />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} hitSlop={6} onPress={handleShare}>
                            <View style={styles.actionImageContainer}>
                                <Image
                                    source={ICONS.attachment}
                                    style={[styles.actionImage, { tintColor: themeColors.gray500, width: 22, height: 22 }]}
                                />
                            </View>
                        </TouchableOpacity>

                    </View>
                </View>
            </View>

            {/* Image Viewer Modal */}
            <Modal
                visible={viewerVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                presentationStyle="overFullScreen"
                onRequestClose={() => setViewerVisible(false)}
            >
                <View style={styles.viewerContainer}>
                    <SafeAreaView style={styles.viewerSafeArea}>
                        <View style={styles.viewerHeader}>
                            <TouchableOpacity onPress={() => setViewerVisible(false)} style={styles.viewerClose}>
                                <Ionicons name="close" size={28} color="white" />
                            </TouchableOpacity>
                            {media.length > 1 && (
                                <Text style={styles.viewerCount}>{viewerIndex + 1} / {media.length}</Text>
                            )}
                        </View>
                        <FlatList
                            data={media}
                            renderItem={({ item, index }) => (
                                <MediaViewerItem url={item} type={media_types[index]} />
                            )}
                            keyExtractor={(_, i) => i.toString()}
                            horizontal
                            pagingEnabled
                            initialScrollIndex={viewerIndex}
                            getItemLayout={(_, index) => ({
                                length: width,
                                offset: width * index,
                                index,
                            })}
                            onMomentumScrollEnd={(e) => {
                                const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                                setViewerIndex(newIndex);
                            }}
                            showsHorizontalScrollIndicator={false}
                        />
                    </SafeAreaView>
                </View>
            </Modal>

            {/* Actions Bottom Sheet */}
            <ActionModal
                visible={actionVisible}
                onClose={() => setActionVisible(false)}
                options={actionOptions}
                title={t('post_options_title')}
            />

            {/* Report Reasons Sheet */}
            <ActionModal
                visible={reportReasonVisible}
                onClose={() => setReportReasonVisible(false)}
                options={reportOptions}
                title={t('why_reporting_title')}
            />

            <PostShareModal
                visible={shareModalVisible}
                onClose={() => setShareModalVisible(false)}
                post={post}
            />
        </View>
    );
}

export default React.memo(PostCard, (prevProps, nextProps) => {
    return prevProps.post.id === nextProps.post.id &&
           prevProps.post.content === nextProps.post.content &&
           prevProps.post.updated_at === nextProps.post.updated_at &&
           prevProps.post.is_edited === nextProps.post.is_edited &&
           prevProps.post.my_vote === nextProps.post.my_vote &&
           prevProps.post.vote_count === nextProps.post.vote_count &&
           prevProps.post.view_count === nextProps.post.view_count &&
           prevProps.post.repost_count === nextProps.post.repost_count &&
           prevProps.post.interaction_count === nextProps.post.interaction_count &&
           prevProps.post.has_reposted === nextProps.post.has_reposted &&
           prevProps.post.is_saved === nextProps.post.is_saved &&
           prevProps.post.comments?.[0]?.count === nextProps.post.comments?.[0]?.count &&
           prevProps.post.profiles?.name === nextProps.post.profiles?.name &&
           prevProps.post.profiles?.avatar_url === nextProps.post.profiles?.avatar_url &&
           prevProps.hideNavigation === nextProps.hideNavigation;
});

const styles = StyleSheet.create({
    card: {
        borderBottomWidth: 0.5,
    },
    row: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingTop: 14,
        paddingBottom: 4,
    },
    leftCol: {
        alignItems: 'center',
        width: 44,
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 0.5,
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 15,
    },
    threadLine: {
        width: 1.5,
        flex: 1,
        marginTop: 8,
        borderRadius: 1,
        minHeight: 12,
    },
    rightCol: {
        flex: 1,
        paddingBottom: 14,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    name: {
        fontFamily: fonts.semibold,
        fontSize: 14,
        flexShrink: 1,
    },
    communityName: {
        fontFamily: fonts.medium,
        fontSize: 12,
        flexShrink: 1,
    },
    dot: {
        fontFamily: fonts.regular,
        fontSize: 12,
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    time: {
        fontFamily: fonts.regular,
        fontSize: 12,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 3,
    },
    communityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 0.5,
    },
    communityBadgeText: {
        fontFamily: fonts.medium,
        fontSize: 10,
    },
    youBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 9,
        color: '#00A3FF',
        textTransform: 'uppercase',
    },
    content: {
        fontFamily: fonts.regular,
        fontSize: 15,
        lineHeight: 21,
        marginTop: 6,
    },
    contentSmall: {
        fontSize: 14,
        lineHeight: 20,
    },
    repostedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    repostedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    repostedBadgeText: {
        fontFamily: fonts.semibold,
        fontSize: 11,
    },
    repostedText: {
        fontFamily: fonts.medium,
        fontSize: 12,
    },
    
    mediaContainer: {
        marginTop: 10,
        borderRadius: radii.md,
        overflow: 'hidden',
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginTop: 12,
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metricText: {
        fontFamily: fonts.medium,
        fontSize: 12,
    },
    carouselBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    carouselBadgeText: {
        color: 'white',
        fontSize: 10,
        fontFamily: fonts.bold,
    },
    dotContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        gap: 6,
    },
    gridItem: {
        position: 'relative',
        overflow: 'hidden',
    },
    gridImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    singleContainer: {
        width: '100%',
        aspectRatio: 4 / 3,
    },
    singleImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreText: {
        color: '#FFFFFF',
        fontFamily: fonts.bold,
        fontSize: 20,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 20,
        alignItems: 'center',
    },
    voteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radii.full,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    voteBtn: {
        padding: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    voteIcon: {
        width: 20,
        height: 20,
    },
    actionImage: {
        width: 20,
        height: 20,
        resizeMode: 'contain',
    },
    actionImageContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    voteCountText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        minWidth: 20,
        textAlign: 'center',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
    },
    actionCount: {
        fontFamily: fonts.medium,
        fontSize: 13,
    },
    animatedStatWrap: {
        overflow: 'hidden',
        justifyContent: 'center',
        minHeight: 18,
    },
    animatedStatOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
    viewerContainer: {
        ...StyleSheet.absoluteFillObject,
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
    },
    viewerSafeArea: {
        flex: 1,
    },
    viewerHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        position: 'relative',
    },
    viewerClose: {
        position: 'absolute',
        right: spacing.lg,
        top: spacing.xxl + spacing.lg,
        zIndex: 10,
    },
    viewerCount: {
        fontFamily: fonts.semibold,
        fontSize: 15,
        color: '#FFFFFF',
    },
    viewerPage: {
        width,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
    },
    youText: {
        fontFamily: fonts.medium,
        fontSize: 10,
        includeFontPadding: false,
    },
    trailingActionBtn: {
        marginLeft: 'auto',
    },
    menuBtn: {
        padding: 4,
        marginLeft: 8,
    },
});
