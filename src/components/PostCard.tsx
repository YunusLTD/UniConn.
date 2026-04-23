import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert, Modal, FlatList, Animated, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
const MediaGrid = ({ media, types, onImagePress, hideNavigation, router, postId }: { media: string[], types: string[], onImagePress: (index: number) => void, hideNavigation: boolean, router: any, postId: string }) => {
    const count = media.length;
    if (count === 0) return null;

    const handlePress = (index: number) => {
        if (!hideNavigation) {
            router.push(`/post/${postId}`);
        } else {
            onImagePress(index);
        }
    };

    const renderItem = (url: string, index: number, style: any) => (
        <TouchableOpacity key={index} style={[styles.gridItem, style]} activeOpacity={0.9} onPress={() => handlePress(index)}>
            <Image source={{ uri: url }} style={styles.gridImage} />
            {types[index] === 'video' && (
                <View style={styles.videoOverlay}>
                    <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.9)" />
                </View>
            )}
            {count > 4 && index === 3 && (
                <View style={styles.moreOverlay}>
                    <Text style={styles.moreText}>+{count - 4}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    if (count === 1) {
        return (
            <TouchableOpacity style={styles.singleContainer} activeOpacity={0.9} onPress={() => handlePress(0)}>
                <Image source={{ uri: media[0] }} style={styles.singleImage} />
                {types[0] === 'video' && (
                    <View style={styles.videoOverlay}>
                        <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    if (count === 2) {
        return (
            <View style={[styles.gridRow, { height: 220 }]}>
                {media.slice(0, 2).map((url, i) => renderItem(url, i, { flex: 1 }))}
            </View>
        );
    }

    if (count === 3) {
        return (
            <View style={[styles.gridRow, { height: 280 }]}>
                {renderItem(media[0], 0, { flex: 2 })}
                <View style={{ flex: 1, gap: GRID_GAP }}>
                    {renderItem(media[1], 1, { flex: 1 })}
                    {renderItem(media[2], 2, { flex: 1 })}
                </View>
            </View>
        );
    }

    return (
        <View style={{ height: 280, gap: GRID_GAP }}>
            <View style={[styles.gridRow, { flex: 1 }]}>
                {renderItem(media[0], 0, { flex: 1 })}
                {renderItem(media[1], 1, { flex: 1 })}
            </View>
            <View style={[styles.gridRow, { flex: 1 }]}>
                {renderItem(media[2], 2, { flex: 1 })}
                {renderItem(media[3], 3, { flex: 1 })}
            </View>
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
function PostCard({ post, showDelete = false, onDelete, onSaveChange, hideNavigation = false }: { post: any, showDelete?: boolean, onDelete?: (id: string) => void, onSaveChange?: (id: string, isSaved: boolean) => void, hideNavigation?: boolean }) {
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
        const name = post.profiles?.name || 'Anonymous';
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
        Alert.alert('Delete Post', 'Remove this post permanently?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await deletePost(post.id);
                        if (onDelete) onDelete(post.id);
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete post.');
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

        setIsSaved(optimisticValue);
        if (onSaveChange) onSaveChange(post.id, optimisticValue);

        try {
            const res = previousValue ? await unsavePost(post.id) : await savePost(post.id);
            const serverValue = typeof res?.data?.is_saved === 'boolean'
                ? res.data.is_saved
                : optimisticValue;

            setIsSaved(serverValue);
            if (onSaveChange) onSaveChange(post.id, serverValue);
            showToast({
                title: t('success'),
                message: serverValue ? 'Post saved' : 'Post removed from saved',
                type: 'success'
            });
        } catch (e) {
            setIsSaved(previousValue);
            if (onSaveChange) onSaveChange(post.id, previousValue);
            Alert.alert('Error', previousValue ? 'Failed to unsave post.' : 'Failed to save post.');
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
        { label: t('share_option'), icon: 'share-outline', onPress: handleShare },
        { label: t('copy_link_option'), icon: 'link-outline', onPress: handleCopyLink },
        { label: t('report_option'), icon: 'flag-outline', onPress: handleReport },
    ];

    if (isOwner) {
        actionOptions.unshift(
            { label: t('delete_label'), icon: 'trash-outline', onPress: handleDelete, destructive: true }
        );
        
        // 3-hour limit for editing posts
        const canEdit = new Date().getTime() - new Date(post.created_at).getTime() < 3 * 60 * 60 * 1000;
        if (canEdit) {
            actionOptions.unshift(
                { label: t('edit_post_option'), icon: 'create-outline', onPress: handleEdit }
            );
        }
    }

    const reportOptions: ActionOption[] = [
        { label: t('inappropriate_content_option'), icon: 'alert-circle-outline', onPress: () => sendReport('inappropriate') },
        { label: t('harassment_option'), icon: 'hand-left-outline', onPress: () => sendReport('harassment') },
        { label: t('spam_option'), icon: 'ban-outline', onPress: () => sendReport('spam') },
    ];

    useEffect(() => {
        const { DeviceEventEmitter } = require('react-native');
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

        const { DeviceEventEmitter } = require('react-native');
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

        setHasReposted(nextHasReposted);
        setRepostCount(nextRepostCount);
        setInteractionCount(nextInteractionCount);

        const { DeviceEventEmitter } = require('react-native');
        DeviceEventEmitter.emit(POST_METRICS_CHANGED_EVENT, {
            postId: post.id,
            repost_count: nextRepostCount,
            interaction_count: nextInteractionCount,
            has_reposted: nextHasReposted,
        });

        hapticLight();

        try {
            const res = await repostPost(post.id);
            if (res.data) {
                setHasReposted(!!res.data.has_reposted);
                setRepostCount(res.data.repost_count ?? nextRepostCount);
                setInteractionCount(res.data.interaction_count ?? nextInteractionCount);
                DeviceEventEmitter.emit(POST_METRICS_CHANGED_EVENT, {
                    postId: post.id,
                    repost_count: res.data.repost_count ?? nextRepostCount,
                    interaction_count: res.data.interaction_count ?? nextInteractionCount,
                    has_reposted: !!res.data.has_reposted,
                });
            }
        } catch (e) {
            setHasReposted(hasReposted);
            setRepostCount(repostCount);
            setInteractionCount(interactionCount);
            DeviceEventEmitter.emit(POST_METRICS_CHANGED_EVENT, {
                postId: post.id,
                repost_count: repostCount,
                interaction_count: interactionCount,
                has_reposted: hasReposted,
            });
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
    const commentCount = Number(post.comments?.[0]?.count || 0);

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
                        ) : (
                            <Text style={[styles.avatarText, { color: themeColors.gray500 }]}>{initials}</Text>
                        )}
                    </TouchableOpacity>
                    <View style={[styles.threadLine, { backgroundColor: themeColors.border }]} />
                </View>

                <View style={styles.rightCol}>
                    {/* Repost indicator (shown for profile feed when backend flags reposted_by_user) */}
                    {post.reposted_by_user && (
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
                            <View style={styles.nameRow}>
                                <TouchableOpacity 
                                    onPress={() => post.user_id && !post.is_anonymous && router.push(`/user/${post.user_id}`)}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                >
                                    <Text style={[styles.name, { color: themeColors.black }]}>{post.profiles?.name || 'Anonymous'}</Text>
                                    {!!(post.profiles?.is_admin || post.profiles?.name === 'UniConn Platform') && (
                                        <MaterialCommunityIcons name="check-decagram" size={16} color="#00A3FF" />
                                    )}
                                </TouchableOpacity>
                                {!!isOwner && (
                                    <View style={[styles.youBadge, { backgroundColor: themeColors.elevated }]}>
                                        <Text style={[styles.youText, { color: themeColors.blue }]}>{t('you_badge')}</Text>
                                    </View>
                                )}
                                <Text style={[styles.dot, { color: themeColors.gray400 }]}>·</Text>
                                <Text style={[styles.time, { color: themeColors.gray400 }]}>{formatTimeAgo(post.created_at, t, language, true)}</Text>
                                {isEdited && (
                                    <>
                                        <Text style={[styles.dot, { color: themeColors.gray400 }]}>·</Text>
                                        <Text style={[styles.time, { color: themeColors.gray400, fontSize: 11 }]}>{t('edited_label')}</Text>
                                    </>
                                )}
                            </View>
                            {!!post.communities?.name && (
                                <Text style={[styles.communityTag, { color: themeColors.gray500 }]}>
                                    {post.communities.is_official 
                                        ? (post.universities?.name || post.communities.name.replace(/ community/gi, ''))
                                        : post.communities.name.replace(/ community/gi, '')}
                                </Text>
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
                        ) : null}
                    </TouchableOpacity>

                    {/* view count displayed in header; removed from card to avoid duplication */}

                    {/* Media */}
                    {media.length > 0 && (
                        <View style={[styles.mediaContainer, { backgroundColor: themeColors.elevated }]}>
                            <MediaGrid media={media} types={media_types} onImagePress={openViewer} hideNavigation={hideNavigation} router={router} postId={post.id} />
                        </View>
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
                                        source={{ uri: 'https://img.icons8.com/?size=100&id=101309&format=png&color=000000' }}
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
                                        source={{ uri: 'https://img.icons8.com/?size=100&id=102257&format=png&color=000000' }}
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
                                    source={{ uri: 'https://img.icons8.com/?size=100&id=qQuXyol28a94&format=png&color=000000' }}
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
                                    source={{ uri: 'https://img.icons8.com/?size=100&id=hUfhD6Fe5WgZ&format=png&color=000000' }}
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
    },
    dot: {
        fontFamily: fonts.regular,
        fontSize: 12,
    },
    time: {
        fontFamily: fonts.regular,
        fontSize: 12,
    },
    communityTag: {
        fontFamily: fonts.regular,
        fontSize: 11,
        marginTop: 1,
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
    gridRow: {
        flexDirection: 'row',
        gap: GRID_GAP,
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
    youBadge: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
        marginLeft: 2,
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
