import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated, Image } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { getPulse, votePulse, getPulseComments, addPulseComment, deletePulse } from '../../src/api/pulse';
import { useRouter } from 'expo-router';

const GHOST_GRADIENTS = [
    '#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a',
    '#a18cd1', '#fccb90', '#e0c3fc', '#ff6b6b', '#54a0ff',
    '#5f27cd', '#01a3a4', '#f368e0', '#ff9f43', '#0abde3',
];

function getColor(id: string, index?: number): string {
    const hash = (id + (index ?? '')).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return GHOST_GRADIENTS[hash % GHOST_GRADIENTS.length];
}

function timeAgo(date: string): string {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PulseDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [pulse, setPulse] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [sending, setSending] = useState(false);
    const bounceAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [pulseRes, commentsRes] = await Promise.all([
                getPulse(id as string),
                getPulseComments(id as string),
            ]);
            if (pulseRes?.data) {
                setPulse(pulseRes.data);
            }
            if (commentsRes?.data) setComments(commentsRes.data);
        } catch (e) {
            console.log('Error loading pulse', e);
        } finally {
            setLoading(false);
        }
    };



    const handleComment = async () => {
        if (!commentText.trim() || sending) return;
        setSending(true);
        try {
            const res = await addPulseComment(id as string, commentText.trim());
            if (res?.data) {
                setComments(prev => [...prev, res.data]);
                setCommentText('');
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to post comment');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert('Delete Pulse', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await deletePulse(id as string);
                        router.back();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete');
                    }
                }
            }
        ]);
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <StatusBar style="light" />
                <Stack.Screen options={{ title: 'The Pulse', headerBackTitle: '', headerStyle: { backgroundColor: '#0f0f1a' }, headerTitleStyle: { color: 'white' }, headerTintColor: 'white' }} />
                <ActivityIndicator size="small" color="white" />
            </View>
        );
    }

    if (!pulse) {
        return (
            <View style={styles.centered}>
                <StatusBar style="light" />
                <Stack.Screen options={{ title: 'Not Found', headerBackTitle: '', headerStyle: { backgroundColor: '#0f0f1a' }, headerTitleStyle: { color: 'white' }, headerTintColor: 'white' }} />
                <Text style={styles.errorText}>This confession has been removed.</Text>
            </View>
        );
    }

    const ghostColor = getColor(pulse.id);

    const CommentItem = ({ item, index }: { item: any; index: number }) => {
        const commentColor = getColor(item.id, index);
        return (
            <View style={styles.commentCard}>
                <View style={[styles.commentAvatar, { backgroundColor: commentColor }]}>
                    <Ionicons name="person" size={12} color="white" />
                </View>
                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>
                            {item.is_mine ? 'You (anonymous)' : `Anon #${index + 1}`}
                        </Text>
                        <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                    </View>
                    <Text style={styles.commentText}>{item.content}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{
                title: 'The Pulse',
                headerBackTitle: '',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#0f0f1a' },
                headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16, color: 'white' },
                headerTintColor: 'white',
                headerRight: () => pulse.is_mine ? (
                    <TouchableOpacity onPress={handleDelete} style={{ padding: 8 }}>
                        <Ionicons name="trash-outline" size={20} color="white" />
                    </TouchableOpacity>
                ) : null,
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={90}
            >
                <FlatList
                    data={comments}
                    keyExtractor={item => item.id}
                    renderItem={({ item, index }) => <CommentItem item={item} index={index} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListHeaderComponent={
                        <View style={styles.postSection}>
                            {/* Post Header */}
                            <View style={styles.postHeader}>
                                <View style={[styles.ghostAvatar, { backgroundColor: ghostColor }]}>
                                    <Ionicons name="eye-off" size={22} color="white" />
                                </View>
                                <View style={styles.postHeaderInfo}>
                                    <Text style={styles.anonLabel}>Anonymous Student</Text>
                                    <Text style={styles.timestamp}>{timeAgo(pulse.created_at)}</Text>
                                </View>
                            </View>

                            {/* Content */}
                            <Text style={styles.postContent}>{pulse.content}</Text>

                            {/* Image */}
                            {pulse.image_url && (
                                <Image source={{ uri: pulse.image_url }} style={styles.postImage} />
                            )}

                            {/* Bottom Info Bar: Replies */}
                            <View style={styles.voteBar}>
                                <View />
                                <View style={styles.commentCountPill}>
                                    <Ionicons name="chatbubble-outline" size={16} color={colors.gray500} />
                                    <Text style={styles.commentCountText}>{comments.length} replies</Text>
                                </View>
                            </View>

                            {/* Comments Section Header */}
                            <View style={styles.commentsHeader}>
                                <Text style={styles.commentsTitle}>Anonymous Replies</Text>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyComments}>
                            <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.gray300} />
                            <Text style={styles.emptyCommentsText}>No replies yet. Be the first!</Text>
                        </View>
                    }
                />

                {/* Comment Input */}
                <View style={styles.inputBar}>
                    <View style={[styles.inputAvatar, { backgroundColor: '#A154F2' }]}>
                        <Ionicons name="person" size={14} color="white" />
                    </View>
                    <TextInput
                        style={styles.commentInput}
                        value={commentText}
                        onChangeText={setCommentText}
                        placeholder="Reply anonymously..."
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        multiline
                        maxLength={300}
                    />
                    <TouchableOpacity
                        onPress={handleComment}
                        disabled={!commentText.trim() || sending}
                        style={[styles.sendBtn, (!commentText.trim() || sending) && { opacity: 0.4 }]}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Ionicons name="send" size={18} color="white" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
    errorText: { fontFamily: fonts.regular, fontSize: 16, color: "rgba(255,255,255,0.5)" },

    postSection: {
        padding: spacing.lg,
        borderBottomWidth: 8,
        borderBottomColor: 'rgba(255,255,255,0.02)',
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    ghostAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    postHeaderInfo: {
        marginLeft: 14,
    },
    anonLabel: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: 'white',
    },
    timestamp: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: '#8F9BB3',
        marginTop: 2,
    },
    postContent: {
        fontFamily: fonts.regular,
        fontSize: 18,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 28,
    },
    postImage: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        marginTop: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    voteBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    voteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 28,
        paddingHorizontal: 6,
        paddingVertical: 4,
        gap: 2,
    },
    voteBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    upvotedBtn: { backgroundColor: 'rgba(16,185,129,0.15)' },
    downvotedBtn: { backgroundColor: 'rgba(239,68,68,0.15)' },
    scoreText: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: '#E0E0E0',
        minWidth: 40,
        textAlign: 'center',
    },
    commentCountPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
    },
    commentCountText: {
        fontFamily: fonts.semibold,
        fontSize: 14,
        color: '#E0E0E0',
    },
    commentsHeader: {
        marginTop: 20,
    },
    commentsTitle: {
        fontFamily: fonts.bold,
        fontSize: 17,
        color: 'white',
    },

    commentCard: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
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
    commentContent: { flex: 1 },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    commentAuthor: {
        fontFamily: fonts.semibold,
        fontSize: 13,
        color: '#E0E0E0',
    },
    commentTime: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: '#8F9BB3',
    },
    commentText: {
        fontFamily: fonts.regular,
        fontSize: 15,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 22,
    },

    emptyComments: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyCommentsText: {
        fontFamily: fonts.regular,
        fontSize: 15,
        color: 'rgba(255,255,255,0.4)',
    },

    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.lg,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#0f0f1a',
        gap: 10,
    },
    inputAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: 'white',
        maxHeight: 100,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    sendBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#A154F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
});
