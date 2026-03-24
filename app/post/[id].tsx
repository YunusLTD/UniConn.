import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image as RNImage } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getPost, getComments, addComment } from '../../src/api/posts';
import { Ionicons } from '@expo/vector-icons';
import PostCard from '../../src/components/PostCard';
import ShadowLoader from '../../src/components/ShadowLoader';

function timeAgo(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
}

export default function PostScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);
    const insets = useSafeAreaInsets();

    const loadData = async () => {
        try {
            const [postRes, commentRes] = await Promise.all([
                getPost(id as string),
                getComments(id as string),
            ]);
            if (postRes?.data) setPost(postRes.data);
            if (commentRes?.data) setComments(buildCommentList(commentRes.data));
        } catch (e) {
            console.log('Error loading post', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [id]);

    const buildCommentList = (flatComments: any[]) => {
        const map = new Map();
        const roots: any[] = [];
        flatComments.forEach(c => map.set(c.id, { ...c, children: [] }));
        flatComments.forEach(c => {
            if (c.parent_id) {
                const parent = map.get(c.parent_id);
                if (parent) parent.children.push(map.get(c.id));
                else roots.push(map.get(c.id)); // Orphaned reply, treat as root
            } else {
                roots.push(map.get(c.id));
            }
        });

        const flattenTree = (nodes: any[], depth = 0): any[] => {
            const result: any[] = [];
            nodes.forEach(n => {
                result.push({ ...n, depth });
                if (n.children && n.children.length) {
                    result.push(...flattenTree(n.children, depth + 1));
                }
            });
            return result;
        };

        return flattenTree(roots);
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setSubmitting(true);
        try {
            await addComment(id as string, newComment, replyingTo?.id);
            setNewComment('');
            setReplyingTo(null);
            const commentRes = await getComments(id as string);
            if (commentRes?.data) setComments(buildCommentList(commentRes.data));
        } catch (e) {
            console.log('Error adding comment', e);
            alert('Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = (commentId: string, authorName: string) => {
        setReplyingTo({ id: commentId, name: authorName });
    };

    const cancelReply = () => {
        setReplyingTo(null);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* @ts-ignore - headerBackTitleVisible exists in runtime but may not be in current types */}
            <Stack.Screen options={{ title: 'Post', headerBackTitle: '', headerBackTitleVisible: false }} />

            {loading ? (
                <ShadowLoader />
            ) : !post ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>Post not found</Text>
                </View>
            ) : (
                <FlatList
                    data={comments}
                    keyExtractor={item => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                        const initial = item.profiles?.name?.[0]?.toUpperCase() || '?';
                        const marginLeft = Math.min(item.depth * 32, 64); // Cap indent
                        return (
                            <View style={[styles.commentCard, { paddingLeft: spacing.lg + marginLeft }]}>
                                <TouchableOpacity
                                    onPress={() => item.user_id && router.push(`/user/${item.user_id}`)}
                                    style={[styles.commentAvatar, item.depth > 0 && { width: 24, height: 24, borderRadius: 12 }]}
                                >
                                    {item.profiles?.avatar_url ? (
                                        <RNImage source={{ uri: item.profiles.avatar_url }} style={styles.commentAvatarImg} />
                                    ) : (
                                        <Text style={[styles.commentAvatarText, item.depth > 0 && { fontSize: 10 }]}>{initial}</Text>
                                    )}
                                </TouchableOpacity>
                                <View style={styles.commentBody}>
                                    <View style={styles.commentHeader}>
                                        <TouchableOpacity onPress={() => item.user_id && router.push(`/user/${item.user_id}`)}>
                                            <Text style={styles.commentAuthor}>{item.profiles?.name || 'Unknown'}</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                                    </View>
                                    <Text style={styles.commentContent}>{item.content}</Text>
                                    <View style={styles.commentActions}>
                                        <TouchableOpacity onPress={() => handleReply(item.id, item.profiles?.name || 'Unknown')}>
                                            <Text style={styles.replyBtnText}>Reply</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                    ListHeaderComponent={
                        <>
                            <PostCard post={post} hideNavigation={true} />
                            <View style={styles.repliesHeader}>
                                <Text style={styles.repliesLabel}>
                                    {comments.length > 0 ? `${comments.length} ${comments.length === 1 ? 'reply' : 'replies'}` : 'Replies'}
                                </Text>
                            </View>
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyComments}>
                            <Text style={styles.emptyText}>No replies yet. Be the first.</Text>
                        </View>
                    }
                />
            )}

            {!loading && post && (
                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                    {replyingTo && (
                        <View style={styles.replyingToBanner}>
                            <Text style={styles.replyingToText}>Replying to {replyingTo.name}</Text>
                            <TouchableOpacity onPress={cancelReply} hitSlop={10}>
                                <Ionicons name="close-circle" size={18} color={colors.gray500} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputBar}>
                        <TextInput
                            style={styles.commentInput}
                            placeholder={replyingTo ? `Reply to ${replyingTo.name}…` : "Write a comment…"}
                            placeholderTextColor={colors.gray400}
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, !newComment.trim() && { opacity: 0.3 }]}
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
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    errorText: { fontFamily: fonts.regular, fontSize: 15, color: colors.gray500 },

    repliesHeader: {
        paddingHorizontal: spacing.lg,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray200,
        backgroundColor: colors.white,
    },
    repliesLabel: {
        fontFamily: fonts.semibold,
        fontSize: 13,
        color: colors.gray500,
    },

    commentCard: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        backgroundColor: colors.white,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray100,
        gap: 12,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    commentAvatarText: {
        fontFamily: fonts.semibold,
        fontSize: 12,
        color: colors.gray600,
    },
    commentBody: { flex: 1 },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    commentAuthor: {
        fontFamily: fonts.semibold,
        fontSize: 13,
        color: colors.black,
    },
    commentTime: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: colors.gray400,
    },
    commentContent: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray700,
        lineHeight: 20,
        marginTop: 3,
    },
    commentActions: {
        marginTop: 6,
        flexDirection: 'row',
    },
    replyBtnText: {
        fontFamily: fonts.semibold,
        fontSize: 12,
        color: colors.gray500,
    },

    emptyComments: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray400,
    },

    inputContainer: {
        backgroundColor: colors.white,
        borderTopWidth: 0.5,
        borderTopColor: colors.gray200,
    },
    replyingToBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 8,
        backgroundColor: colors.gray50,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray200,
    },
    replyingToText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.gray600,
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
        color: colors.black,
        backgroundColor: colors.gray50,
        borderRadius: radii.xl,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 120,
        minHeight: 40,
        paddingTop: Platform.OS === 'ios' ? 12 : 10,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    commentAvatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 100,
    },
});
