import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert, Modal, SafeAreaView, FlatList, Animated, Share } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { votePost, deletePost } from '../api/posts';
import { useAuth } from '../context/AuthContext';
import { useVideoPlayer, VideoView } from 'expo-video';

let Haptics: any;
try {
    Haptics = require('expo-haptics');
} catch (e) {
    // Haptics not installed yet
}

const { width } = Dimensions.get('window');
const GRID_GAP = 2;

function timeAgo(dateStr: string) {
    const now = new Date();
    const diff = now.getTime() - new Date(dateStr).getTime();
    if (diff < 0) return 'now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString();
}

// ─── MediaGrid ───
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
                <VideoView player={player} style={styles.viewerImage} />
            </View>
        );
    }
    return (
        <View style={styles.viewerPage}>
            <Image source={{ uri: url }} style={styles.viewerImage} resizeMode="contain" />
        </View>
    );
};

// ─── PostCard ───
export default function PostCard({ post, showDelete = false, onDelete, hideNavigation = false }: { post: any, showDelete?: boolean, onDelete?: (id: string) => void, hideNavigation?: boolean }) {
    const router = useRouter();
    const { user } = useAuth();
    const [myVote, setMyVote] = useState<number | null>(post.my_vote);
    const [voteCount, setVoteCount] = useState<number>(post.vote_count || 0);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const initial = post.profiles?.name?.[0]?.toUpperCase() || '?';

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

    const handleVote = async (value: number) => {
        // 1. Optimistic Update
        const oldVote = myVote || 0;
        const newVote = oldVote === value ? 0 : value; // Toggle off if clicking current vote
        const countDiff = newVote - oldVote;

        setMyVote(newVote);
        setVoteCount(prev => prev + countDiff);

        // Feedback
        if (Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        animateVote(value === 1 ? 'up' : 'down');

        try {
            // 2. API Call
            const res = await votePost(post.id, value);

            // 3. Confirm with Server
            if (res.data) {
                setMyVote(res.data.my_vote);
                // Note: We don't necessarily update voteCount here unless the server returns the absolute total score
                // as setVoteCount(res.data.vote_count). Assuming the local calc is safe.
            }
        } catch (e) {
            // 4. Rollback on Error
            setMyVote(oldVote);
            setVoteCount(prev => prev - countDiff);
            console.error('Vote error', e);
        }
    };

    const media = (post.media_urls && post.media_urls.length > 0)
        ? post.media_urls
        : (post.image_url ? [post.image_url] : []);
    const media_types = (post.media_types && post.media_types.length > 0)
        ? post.media_types
        : (post.image_url ? ['image'] : []);
    const handleShare = async () => {
        try {
            const shareUrl = `https://uni-platform.app/post/${post.id}`;
            await Share.share({
                title: 'Check out this post on Uni!',
                message: `${post.content || 'Check out this post!'}\n\nView more on Uni Hub: ${shareUrl}`,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    return (
        <View style={styles.card}>
            {/* Thread line + avatar */}
            <View style={styles.row}>
                <View style={styles.leftCol}>
                    <TouchableOpacity
                        style={styles.avatar}
                        onPress={() => post.user_id && !post.is_anonymous && router.push(`/user/${post.user_id}`)}
                        activeOpacity={0.8}
                    >
                        {post.profiles?.avatar_url ? (
                            <Image source={{ uri: post.profiles.avatar_url }} style={styles.avatarImg} />
                        ) : (
                            <Text style={styles.avatarText}>{initial}</Text>
                        )}
                    </TouchableOpacity>
                    {/* Vertical thread line */}
                    <View style={styles.threadLine} />
                </View>

                <View style={styles.rightCol}>
                    {/* Author info */}
                    <View style={styles.authorRow}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.nameRow}>
                                <TouchableOpacity onPress={() => post.user_id && !post.is_anonymous && router.push(`/user/${post.user_id}`)}>
                                    <Text style={styles.name}>{post.profiles?.name || 'Anonymous'}</Text>
                                </TouchableOpacity>
                                {isOwner && (
                                    <View style={styles.youBadge}>
                                        <Text style={styles.youText}>you</Text>
                                    </View>
                                )}
                                <Text style={styles.dot}>·</Text>
                                <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
                            </View>
                            {post.communities?.name && (
                                <Text style={styles.communityTag}>{post.communities.name}</Text>
                            )}
                        </View>
                        {isOwner && showDelete && (
                            <TouchableOpacity onPress={handleDelete} hitSlop={8}>
                                <Ionicons name="trash-outline" size={16} color={colors.gray400} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Content */}
                    <TouchableOpacity
                        onPress={() => router.push(`/post/${post.id}`)}
                        activeOpacity={0.8}
                        disabled={hideNavigation}
                    >
                        {post.content ? (
                            <Text style={styles.content}>
                                {post.content.split(/(@\w+)/g).map((part: string, i: number) => {
                                    if (part.startsWith('@')) {
                                        return (
                                            <Text
                                                key={i}
                                                style={{ color: '#007AFF', fontWeight: '600' }}
                                                onPress={() => router.push(`/username/${part.slice(1)}` as any)}
                                            >
                                                {part}
                                            </Text>
                                        );
                                    }
                                    return <Text key={i}>{part}</Text>;
                                })}
                            </Text>
                        ) : null}
                    </TouchableOpacity>

                    {/* Media */}
                    {media.length > 0 && (
                        <View style={styles.mediaContainer}>
                            <MediaGrid media={media} types={media_types} onImagePress={openViewer} hideNavigation={hideNavigation} router={router} postId={post.id} />
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <View style={styles.voteContainer}>
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
                                            { tintColor: myVote === 1 ? colors.blue : colors.gray500 }
                                        ]}
                                    />
                                </Animated.View>
                            </TouchableOpacity>

                            <Text style={[
                                styles.voteCountText,
                                myVote === 1 && { color: colors.blue },
                                myVote === -1 && { color: colors.danger }
                            ]}>
                                {voteCount}
                            </Text>

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
                                            { tintColor: myVote === -1 ? colors.danger : colors.gray500 }
                                        ]}
                                    />
                                </Animated.View>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/post/${post.id}`)} hitSlop={6} disabled={hideNavigation}>
                            <Ionicons name="chatbubble-outline" size={18} color={colors.gray500} />
                            {(post.comments?.[0]?.count || 0) > 0 && (
                                <Text style={styles.actionCount}>{post.comments[0].count}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} hitSlop={6} onPress={handleShare}>
                            <Ionicons name="paper-plane-outline" size={18} color={colors.gray500} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Image Viewer Modal */}
            <Modal visible={viewerVisible} transparent={true} animationType="fade" onRequestClose={() => setViewerVisible(false)}>
                <View style={styles.viewerContainer}>
                    <SafeAreaView style={styles.viewerSafeArea}>
                        <View style={styles.viewerHeader}>
                            <TouchableOpacity onPress={() => setViewerVisible(false)} hitSlop={10} style={styles.viewerClose}>
                                <Ionicons name="close" size={28} color={colors.white} />
                            </TouchableOpacity>
                            <Text style={styles.viewerCount}>{viewerIndex + 1} / {media.length}</Text>
                        </View>
                        <FlatList
                            data={media}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            initialScrollIndex={viewerIndex}
                            getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
                            onMomentumScrollEnd={(e) => {
                                const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                                setViewerIndex(newIndex);
                            }}
                            keyExtractor={(_, index) => index.toString()}
                            renderItem={({ item, index }) => (
                                <MediaViewerItem url={item} type={media_types[index]} />
                            )}
                        />
                    </SafeAreaView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray200,
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
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: colors.gray200,
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: colors.gray600,
    },
    threadLine: {
        width: 1.5,
        flex: 1,
        backgroundColor: colors.gray200,
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
        color: colors.black,
    },
    dot: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.gray400,
    },
    time: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.gray400,
    },
    communityTag: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: colors.gray500,
        marginTop: 1,
    },
    content: {
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.gray800,
        lineHeight: 21,
        marginTop: 6,
    },
    mediaContainer: {
        marginTop: 10,
        borderRadius: radii.md,
        overflow: 'hidden',
        backgroundColor: colors.gray100,
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
        color: colors.white,
        fontFamily: fonts.bold,
        fontSize: 20,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 24,
        alignItems: 'center',
    },
    voteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray50,
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
    voteCountText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: colors.gray600,
        minWidth: 20,
        textAlign: 'center',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
    },
    actionCount: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.gray500,
    },
    viewerContainer: {
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
        left: spacing.lg,
        zIndex: 10,
    },
    viewerCount: {
        fontFamily: fonts.semibold,
        fontSize: 15,
        color: colors.white,
    },
    viewerPage: {
        width,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerImage: {
        width: '100%',
        height: '100%',
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
        color: colors.blue,
        includeFontPadding: false,
    },
});
