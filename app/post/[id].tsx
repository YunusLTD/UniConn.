import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image as RNImage, Alert, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter, useNavigation } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getPost, getComments, addComment, deleteComment, recordPostView } from '../../src/api/posts';
import { Ionicons } from '@expo/vector-icons';
import PostCard from '../../src/components/PostCard';
import ShadowLoader from '../../src/components/ShadowLoader';
import { getCommunityMembers } from '../../src/api/communities';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import {
    POST_COMMENT_COUNT_CHANGED_EVENT,
    applyPostCommentCountChange,
    getCommentTotalFromResponse,
} from '../../src/utils/postCommentCount';
import { applyPostMetricsChange, POST_METRICS_CHANGED_EVENT } from '../../src/utils/postMetrics';
import { hapticLight } from '../../src/utils/haptics';
import { MessageItemSkeleton } from '../../src/components/ShadowLoader';

function timeAgo(dateStr: string, t: (key: any) => string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('just_now');
    if (mins < 60) return t('minute_ago').replace('{{count}}', String(mins));
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('hour_ago').replace('{{count}}', String(hrs));
    const days = Math.floor(hrs / 24);
    if (days < 7) return t('day_ago').replace('{{count}}', String(days));
    return d.toLocaleDateString();
}

const formatMetricCount = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
    return String(value);
};


export default function PostScreen() {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const { user } = useAuth();
    const params = useLocalSearchParams();
    const { id } = params;
    const postId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();

    // Initialize post from params if available to show it immediately
    const initialPost = useMemo(() => {
        if (params.post && typeof params.post === 'string') {
            try {
                return JSON.parse(params.post);
            } catch (e) {
                return null;
            }
        }
        return null;
    }, [params.post]);

    const [post, setPost] = useState<any>(initialPost);
    const [commentTree, setCommentTree] = useState<any[]>([]);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(!initialPost);
    const [commentsLoading, setCommentsLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [taggingSearch, setTaggingSearch] = useState<string | null>(null);
    const insets = useSafeAreaInsets();

    const loadData = async () => {
        if (!postId) {
            setLoading(false);
            setCommentsLoading(false);
            return;
        }

        try {
            // Fetch post and comments in parallel
            const [postRes, commentRes] = await Promise.all([
                getPost(postId),
                getComments(postId),
            ]);

            if (postRes?.data) {
                const totalComments = getCommentTotalFromResponse(commentRes);
                setPost(applyPostCommentCountChange(postRes.data, { postId: postRes.data.id, count: totalComments }));
                loadMembers(postRes.data.community_id);

                if (user?.id) {
                    const viewRes = await recordPostView(postId);
                    if (viewRes?.data) {
                        const metricsPayload = {
                            postId,
                            view_count: viewRes.data.view_count,
                        };
                        setPost((prev: any) => prev ? applyPostMetricsChange(prev, metricsPayload) : prev);
                        DeviceEventEmitter.emit(POST_METRICS_CHANGED_EVENT, metricsPayload);
                    }
                }
            } else if (!post) {
                setPost(null);
            }

            if (commentRes?.data) {
                setCommentTree(buildCommentTree(commentRes.data));
            }
        } catch (e) {
            console.log('Error loading post', e);
        } finally {
            setLoading(false);
            setCommentsLoading(false);
        }
    };

    const loadMembers = async (communityId: string) => {
        if (!communityId) return;
        try {
            const res = await getCommunityMembers(communityId);
            if (res?.data) {
                console.log('Loaded members for tagging:', res.data.length);
                setMembers(res.data);
            }
        } catch (e) {
            console.log('Failed to load members for tagging', e);
        }
    };

    useEffect(() => { loadData(); }, [id, user?.id]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getFlattenedVisible = useMemo(() => {
        const result: any[] = [];
        const process = (nodes: any[], depth = 0) => {
            nodes.forEach(node => {
                result.push({ ...node, depth });
                if (expandedIds.has(node.id) && node.children && node.children.length > 0) {
                    process(node.children, depth + 1);
                }
            });
        };
        process(commentTree);
        return result;
    }, [commentTree, expandedIds]);

    // view count is shown just under the post text in PostCard for post detail view
    const navigation = useNavigation();

    useEffect(() => {
        if (!post) return;
        navigation.setOptions({
            headerTitle: t('post_header')
        });
    }, [navigation, post]);

    const buildCommentTree = (flatComments: any[]) => {
        const map = new Map();
        const roots: any[] = [];
        flatComments.forEach(c => map.set(c.id, { ...c, children: [] }));
        flatComments.forEach(c => {
            if (c.parent_id) {
                const parent = map.get(c.parent_id);
                if (parent) parent.children.push(map.get(c.id));
                else roots.push(map.get(c.id));
            } else {
                roots.push(map.get(c.id));
            }
        });

        const sortNodes = (nodes: any[]) => {
            nodes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            nodes.forEach(n => {
                if (n.children?.length) sortNodes(n.children);
            });
        };
        sortNodes(roots);
        return roots;
    };

    const renderContentWithMentions = (content: string) => {
        if (!content) return null;
        const parts = content.split(/(@\w+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);
                return (
                    <Text
                        key={index}
                        style={{ color: colors.blue, fontFamily: fonts.semibold }}
                        onPress={() => router.push(`/user/${username}`)}
                    >
                        {part}
                    </Text>
                );
            }
            return <Text key={index}>{part}</Text>;
        });
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !postId) return;
        
        const actionId = Math.random().toString(36).substring(7);
        const commentContent = newComment;
        const parentId = replyingTo?.id;
        
        hapticLight();
        DeviceEventEmitter.emit('action_status', { 
            id: actionId, 
            type: 'send', 
            status: 'processing',
            title: t('replying') || 'Replying...' 
        });
        
        // Optimistic Comment Object
        const optimisticComment = {
            id: 'temp-' + Date.now(),
            content: commentContent,
            created_at: new Date().toISOString(),
            user_id: user?.id,
            parent_id: parentId,
            profiles: {
                name: user?.name || user?.profile?.name || user?.email?.split('@')[0] || 'Me',
                avatar_url: user?.profile?.avatar_url,
            },
            children: []
        };

        // Apply Optimistic Update
        setCommentTree(prev => {
            if (!parentId) return [optimisticComment, ...prev];
            
            const newTree = JSON.parse(JSON.stringify(prev));
            const addToParent = (nodes: any[]): boolean => {
                for (let node of nodes) {
                    if (node.id === parentId) {
                        node.children = [optimisticComment, ...(node.children || [])];
                        return true;
                    }
                    if (node.children?.length && addToParent(node.children)) return true;
                }
                return false;
            };
            addToParent(newTree);
            return newTree;
        });

        if (parentId) {
            setExpandedIds(prev => new Set(prev).add(parentId));
        }

        setNewComment('');
        setReplyingTo(null);

        try {
            await addComment(postId, commentContent, parentId);
            const commentRes = await getComments(postId);
            if (commentRes?.data) setCommentTree(buildCommentTree(commentRes.data));
            const nextCount = getCommentTotalFromResponse(commentRes);
            const payload = { postId, count: nextCount };
            const nextInteractionCount = Number(post?.interaction_count || 0) + 1;
            setPost((prev: any) => {
                if (!prev) return prev;
                return applyPostMetricsChange(
                    applyPostCommentCountChange(prev, payload),
                    { postId, interaction_count: nextInteractionCount }
                );
            });
            DeviceEventEmitter.emit(POST_COMMENT_COUNT_CHANGED_EVENT, payload);
            DeviceEventEmitter.emit(POST_METRICS_CHANGED_EVENT, {
                postId,
                interaction_count: nextInteractionCount,
            });
            DeviceEventEmitter.emit('action_status', { 
                id: actionId, 
                type: 'send', 
                status: 'success',
                title: t('replied') || 'Replied' 
            });
        } catch (e: any) {
            console.error('Add comment error:', e);
            DeviceEventEmitter.emit('action_status', { id: actionId, type: 'send', status: 'error', message: e.message || 'Failed to post' });
            // Refresh tree to remove optimistic comment on error
            const commentRes = await getComments(postId);
            if (commentRes?.data) setCommentTree(buildCommentTree(commentRes.data));
        }
    };

    const handleReply = (commentId: string, authorName: string) => {
        setReplyingTo({ id: commentId, name: authorName });
    };

    const cancelReply = () => {
        setReplyingTo(null);
    };

    const handleDeleteComment = (commentId: string) => {
        Alert.alert(t('delete_comment_title'), t('delete_comment_confirm'), [
            { text: t('cancel_label'), style: 'cancel' },
            { 
                text: t('delete_label'), 
                style: 'destructive', 
                onPress: async () => {
                    if (!postId) return;
                    const actionId = Math.random().toString(36).substring(7);
                    DeviceEventEmitter.emit('action_status', { id: actionId, type: 'delete', status: 'processing' });

                    try {
                        await deleteComment(postId, commentId);
                        const commentRes = await getComments(postId);
                        if (commentRes?.data) setCommentTree(buildCommentTree(commentRes.data));
                        const nextCount = getCommentTotalFromResponse(commentRes);
                        const payload = { postId, count: nextCount };
                        const nextInteractionCount = Math.max(0, Number(post?.interaction_count || 0) - 1);
                        setPost((prev: any) => {
                            if (!prev) return prev;
                            return applyPostMetricsChange(
                                applyPostCommentCountChange(prev, payload),
                                { postId, interaction_count: nextInteractionCount }
                            );
                        });
                        DeviceEventEmitter.emit(POST_COMMENT_COUNT_CHANGED_EVENT, payload);
                        DeviceEventEmitter.emit(POST_METRICS_CHANGED_EVENT, {
                            postId,
                            interaction_count: nextInteractionCount,
                        });
                        DeviceEventEmitter.emit('action_status', { id: actionId, type: 'delete', status: 'success' });
                    } catch (e: any) {
                        console.error('Delete comment error:', e);
                        DeviceEventEmitter.emit('action_status', { id: actionId, type: 'delete', status: 'error', message: e.message || 'Failed' });
                    }
                } 
            }
        ]);
    };

    const handleInputChange = (text: string) => {
        setNewComment(text);
        const parts = text.split(/\s/);
        const lastWord = parts[parts.length - 1];
        if (lastWord.startsWith('@')) {
            setTaggingSearch(lastWord.substring(1));
        } else {
            setTaggingSearch(null);
        }
    };

    const handleSelectTag = (username: string) => {
        const words = newComment.split(' ');
        words.pop(); // Remove the partial tag
        const prefix = words.length > 0 ? words.join(' ') + ' ' : '';
        setNewComment(prefix + '@' + username + ' ');
        setTaggingSearch(null);
    };

    const filteredMembers = taggingSearch !== null 
        ? members.filter(m => {
            const search = taggingSearch.toLowerCase();
            const username = m.profiles?.username?.toLowerCase() || '';
            const name = m.profiles?.name?.toLowerCase() || '';
            return username.includes(search) || name.includes(search);
        }).slice(0, 8)
        : [];

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* @ts-ignore - headerBackTitleVisible exists in runtime but may not be in current types */}
            <Stack.Screen options={{ title: t('post_header'), headerBackTitle: '', headerBackTitleVisible: false }} />

            {loading ? (
                <ShadowLoader />
            ) : !post ? (
                <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                    <Text style={[styles.errorText, { color: colors.gray500 }]}>{t('post_not_found')}</Text>
                </View>
            ) : (
                <FlatList
                    data={commentsLoading ? [] : getFlattenedVisible}
                    keyExtractor={item => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }) => {
                        const initial = item.profiles?.name?.[0]?.toUpperCase() || '?';
                        const isLast = index === getFlattenedVisible.length - 1;
                        const isExpanded = expandedIds.has(item.id);
                        const hasChildren = item.children && item.children.length > 0;
                        const hasNextInThread = !isLast && getFlattenedVisible[index + 1].depth >= item.depth;
                        const paddingLeft = spacing.lg + Math.min(item.depth * 32, 64);

                        return (
                            <View style={[styles.commentCard, { paddingLeft, backgroundColor: colors.surface }]}>
                                <View style={styles.commentLeftCol}>
                                    <TouchableOpacity
                                        onPress={() => item.user_id && router.push(`/user/${item.user_id}`)}
                                        style={[
                                            styles.commentAvatar, 
                                            { backgroundColor: colors.elevated }, 
                                            item.depth > 0 && { width: 24, height: 24, borderRadius: 12, marginTop: 4 }
                                        ]}
                                    >
                                        {item.profiles?.avatar_url ? (
                                            <RNImage source={{ uri: item.profiles.avatar_url }} style={styles.commentAvatarImg} />
                                        ) : (
                                            <Text style={[styles.commentAvatarText, { color: colors.gray600 }, item.depth > 0 && { fontSize: 10 }]}>{initial}</Text>
                                        )}
                                    </TouchableOpacity>
                                    {(hasNextInThread || (hasChildren && !isExpanded)) && <View style={[styles.commentThreadLine, { backgroundColor: colors.border }]} />}
                                </View>
                                
                                <TouchableOpacity 
                                    style={styles.commentBody} 
                                    onLongPress={() => item.user_id === user?.id && handleDeleteComment(item.id)}
                                    activeOpacity={0.7}
                                    delayLongPress={500}
                                >
                                    <View style={styles.commentHeader}>
                                        <TouchableOpacity onPress={() => item.user_id && router.push(`/user/${item.user_id}`)}>
                                            <Text style={[styles.commentAuthor, { color: colors.black }]}>{item.profiles?.name || t('unknown_user')}</Text>
                                        </TouchableOpacity>
                                        <Text style={[styles.commentTime, { color: colors.gray400 }]}>{timeAgo(item.created_at, t)}</Text>
                                    </View>
                                    <Text style={[styles.commentContent, { color: colors.black }]}>
                                        {renderContentWithMentions(item.content)}
                                    </Text>
                                    <View style={styles.commentActions}>
                                        <TouchableOpacity 
                                            style={[styles.commentActionBtn, { backgroundColor: colors.elevated }]} 
                                            onPress={() => handleReply(item.id, item.profiles?.name || t('unknown_user'))}
                                        >
                                            <Ionicons name="chatbubble-outline" size={12} color={colors.gray500} />
                                            <Text style={[styles.replyBtnText, { color: colors.gray600 }]}>{t('reply')}</Text>
                                        </TouchableOpacity>

                                        {hasChildren && (
                                            <TouchableOpacity 
                                                style={[styles.commentActionBtn, { backgroundColor: colors.elevated }]} 
                                                onPress={() => toggleExpand(item.id)}
                                            >
                                                <Text style={[styles.replyBtnText, { color: colors.gray600 }]}>
                                                    {isExpanded ? t('hide_replies') : `${item.children.length} ${item.children.length === 1 ? t('reply') : t('replies')}`}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                    ListHeaderComponent={
                        <>
                            <PostCard post={post} hideNavigation={true} />
                            <View style={[styles.repliesHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                                <Text style={[styles.repliesLabel, { color: colors.gray500 }]}>
                                    {getFlattenedVisible.length > 0 ? `${getFlattenedVisible.length} ${getFlattenedVisible.length === 1 ? t('reply') : t('replies')}` : t('replies')}
                                </Text>
                            </View>
                            {commentsLoading && (
                                <View style={{ paddingBottom: 10 }}>
                                    {[1, 2, 3].map(i => <MessageItemSkeleton key={i} />)}
                                </View>
                            )}
                        </>
                    }
                    ListEmptyComponent={
                        !commentsLoading ? (
                            <View style={styles.emptyComments}>
                                <Text style={[styles.emptyText, { color: colors.gray400 }]}>{t('no_replies_yet')}</Text>
                            </View>
                        ) : null
                    }
                />
            )}

            {!loading && post && (
                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                    {taggingSearch !== null && filteredMembers.length > 0 && (
                        <View style={[styles.taggingList, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                            <FlatList
                                data={filteredMembers}
                                keyExtractor={m => m.profiles.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={[styles.memberTag, { borderBottomColor: colors.border }]} onPress={() => handleSelectTag(item.profiles.username || item.profiles.name?.replace(/\s/g, ''))}>
                                        {item.profiles.avatar_url ? (
                                            <RNImage source={{ uri: item.profiles.avatar_url }} style={styles.tagAvatar} />
                                        ) : (
                                            <View style={[styles.tagAvatar, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                                                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.gray600 }}>{item.profiles.name?.[0]?.toUpperCase() || '?'}</Text>
                                            </View>
                                        )}
                                        <View>
                                            <Text style={[styles.tagName, { color: colors.black }]}>{item.profiles.name}</Text>
                                            {item.profiles.username && <Text style={[styles.tagUsername, { color: colors.gray400 }]}>@{item.profiles.username}</Text>}
                                        </View>
                                    </TouchableOpacity>
                                )}
                                keyboardShouldPersistTaps="always"
                            />
                        </View>
                    )}
                    {replyingTo && (
                        <View style={[styles.replyingToBanner, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                            <Text style={[styles.replyingToText, { color: colors.gray600 }]}>{t('replying_to')} {replyingTo.name}</Text>
                            <TouchableOpacity onPress={cancelReply} hitSlop={10}>
                                <Ionicons name="close-circle" size={18} color={colors.gray500} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputBar}>
                        <TextInput
                            style={[styles.commentInput, { color: colors.black, backgroundColor: colors.background, borderColor: colors.border }]}
                            placeholder={replyingTo ? `${t('reply')} ${replyingTo.name}…` : t('write_comment_placeholder')}
                            placeholderTextColor={colors.gray400}
                            value={newComment}
                            onChangeText={handleInputChange}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, { backgroundColor: colors.black }, !newComment.trim() && { opacity: 0.3 }]}
                            onPress={handleAddComment}
                            disabled={submitting || !newComment.trim()}
                            hitSlop={8}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                                <Ionicons name="arrow-up" size={18} color={colors.white} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontFamily: fonts.regular, fontSize: 15 },
    repliesHeader: {
        paddingHorizontal: spacing.lg,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
    },
    repliesLabel: {
        fontFamily: fonts.semibold,
        fontSize: 13,
    },
    commentCard: {
        flexDirection: 'row',
        paddingRight: spacing.lg,
        paddingTop: 12,
        paddingBottom: 4,
        gap: 12,
    },
    commentLeftCol: {
        alignItems: 'center',
        width: 32,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    commentThreadLine: {
        width: 1.5,
        flex: 1,
        marginTop: 4,
        borderRadius: 1,
    },
    commentAvatarText: {
        fontFamily: fonts.semibold,
        fontSize: 12,
    },
    commentBody: { 
        flex: 1,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    commentAuthor: {
        fontFamily: fonts.semibold,
        fontSize: 14,
    },
    commentTime: {
        fontFamily: fonts.regular,
        fontSize: 12,
    },
    commentContent: {
        fontFamily: fonts.regular,
        fontSize: 15,
        lineHeight: 20,
        marginTop: 4,
    },
    commentActions: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 12,
    },
    commentActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    replyBtnText: {
        fontFamily: fonts.semibold,
        fontSize: 11,
    },
    emptyComments: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        fontFamily: fonts.regular,
        fontSize: 14,
    },
    inputContainer: {
        borderTopWidth: 0.5,
    },
    replyingToBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 8,
        borderBottomWidth: 0.5,
    },
    replyingToText: {
        fontFamily: fonts.medium,
        fontSize: 12,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.lg,
        paddingTop: 10,
        gap: 10,
    },
    commentInput: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 15,
        borderRadius: radii.xl,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 120,
        minHeight: 40,
        paddingTop: Platform.OS === 'ios' ? 12 : 10,
        borderWidth: 1,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    commentAvatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 100,
    },
    taggingList: {
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        maxHeight: 250,
        borderTopWidth: 1,
    },
    memberTag: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 0.5,
    },
    tagAvatar: { width: 32, height: 32, borderRadius: 16 },
    tagName: { fontFamily: fonts.bold, fontSize: 14 },
    tagUsername: { fontFamily: fonts.regular, fontSize: 12 },
});
