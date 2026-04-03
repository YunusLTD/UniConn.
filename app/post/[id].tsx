import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image as RNImage } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getPost, getComments, addComment, deleteComment } from '../../src/api/posts';
import { Ionicons } from '@expo/vector-icons';
import PostCard from '../../src/components/PostCard';
import ShadowLoader from '../../src/components/ShadowLoader';
import { getCommunityMembers } from '../../src/api/communities';
import { useAuth } from '../../src/context/AuthContext';
import { Alert } from 'react-native';

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
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [taggingSearch, setTaggingSearch] = useState<string | null>(null);
    const insets = useSafeAreaInsets();

    const loadData = async () => {
        try {
            const [postRes, commentRes] = await Promise.all([
                getPost(id as string),
                getComments(id as string),
            ]);
            if (postRes?.data) {
                setPost(postRes.data);
                loadMembers(postRes.data.community_id);
            }
            if (commentRes?.data) setComments(buildCommentList(commentRes.data));
        } catch (e) {
            console.log('Error loading post', e);
        } finally {
            setLoading(false);
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

    const handleDeleteComment = (commentId: string) => {
        Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: async () => {
                    try {
                        await deleteComment(id as string, commentId);
                        const commentRes = await getComments(id as string);
                        if (commentRes?.data) setComments(buildCommentList(commentRes.data));
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete comment');
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
            <Stack.Screen options={{ title: 'Post', headerBackTitle: '', headerBackTitleVisible: false }} />

            {loading ? (
                <ShadowLoader />
            ) : !post ? (
                <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                    <Text style={[styles.errorText, { color: colors.gray500 }]}>Post not found</Text>
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
                            <View style={[styles.commentCard, { paddingLeft: spacing.lg + marginLeft, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                                <TouchableOpacity
                                    onPress={() => item.user_id && router.push(`/user/${item.user_id}`)}
                                    style={[styles.commentAvatar, { backgroundColor: colors.background }, item.depth > 0 && { width: 24, height: 24, borderRadius: 12 }]}
                                >
                                    {item.profiles?.avatar_url ? (
                                        <RNImage source={{ uri: item.profiles.avatar_url }} style={styles.commentAvatarImg} />
                                    ) : (
                                        <Text style={[styles.commentAvatarText, { color: colors.gray600 }, item.depth > 0 && { fontSize: 10 }]}>{initial}</Text>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.commentBody} 
                                    onLongPress={() => item.user_id === user?.id && handleDeleteComment(item.id)}
                                    activeOpacity={0.7}
                                    delayLongPress={500}
                                >
                                    <View style={styles.commentHeader}>
                                        <TouchableOpacity onPress={() => item.user_id && router.push(`/user/${item.user_id}`)}>
                                            <Text style={[styles.commentAuthor, { color: colors.black }]}>{item.profiles?.name || 'Unknown'}</Text>
                                        </TouchableOpacity>
                                        <Text style={[styles.commentTime, { color: colors.gray400 }]}>{timeAgo(item.created_at)}</Text>
                                    </View>
                                    <Text style={[styles.commentContent, { color: colors.gray700 }]}>
                                        {renderContentWithMentions(item.content)}
                                    </Text>
                                    <View style={styles.commentActions}>
                                        <TouchableOpacity onPress={() => handleReply(item.id, item.profiles?.name || 'Unknown')}>
                                            <Text style={[styles.replyBtnText, { color: colors.gray500 }]}>Reply</Text>
                                        </TouchableOpacity>
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
                                    {comments.length > 0 ? `${comments.length} ${comments.length === 1 ? 'reply' : 'replies'}` : 'Replies'}
                                </Text>
                            </View>
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyComments}>
                            <Text style={[styles.emptyText, { color: colors.gray400 }]}>No replies yet. Be the first.</Text>
                        </View>
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
                            <Text style={[styles.replyingToText, { color: colors.gray600 }]}>Replying to {replyingTo.name}</Text>
                            <TouchableOpacity onPress={cancelReply} hitSlop={10}>
                                <Ionicons name="close-circle" size={18} color={colors.gray500} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputBar}>
                        <TextInput
                            style={[styles.commentInput, { color: colors.black, backgroundColor: colors.background, borderColor: colors.border }]}
                            placeholder={replyingTo ? `Reply to ${replyingTo.name}…` : "Write a comment…"}
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
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        gap: 12,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    commentAvatarText: {
        fontFamily: fonts.semibold,
        fontSize: 12,
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
    },
    commentTime: {
        fontFamily: fonts.regular,
        fontSize: 11,
    },
    commentContent: {
        fontFamily: fonts.regular,
        fontSize: 14,
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
