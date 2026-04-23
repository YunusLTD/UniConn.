import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Image, Alert, DeviceEventEmitter } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts, radii } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { deleteComment, getMyComments } from '../src/api/posts';
import { formatTimeAgo } from '../src/utils/localization';
import { POST_COMMENT_COUNT_CHANGED_EVENT } from '../src/utils/postCommentCount';

export default function MyRepliesScreen() {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const router = useRouter();
    const [replies, setReplies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const res = await getMyComments();
            setReplies(res?.data || []);
        } catch (e) {
            setReplies([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const handleDeleteReply = (item: any) => {
        Alert.alert(t('delete_comment_title'), t('delete_comment_confirm'), [
            { text: t('cancel_label'), style: 'cancel' },
            {
                text: t('delete_label'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteComment(item.post_id, item.id);
                        setReplies(prev => prev.filter(reply => reply.id !== item.id));
                        DeviceEventEmitter.emit(POST_COMMENT_COUNT_CHANGED_EVENT, { postId: item.post_id, delta: -1 });
                    } catch (e) {
                        Alert.alert(t('error'), t('failed_to_delete_comment'));
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ title: t('replies_title') }} />
                <ActivityIndicator size="small" color={colors.black} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: t('replies_title') }} />
            <FlatList
                data={replies}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadData();
                        }}
                        tintColor={colors.black}
                    />
                }
                renderItem={({ item }) => {
                    const post = Array.isArray(item.posts) ? item.posts[0] : item.posts;
                    const author = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                    const authorInitial = author?.name?.[0]?.toUpperCase() || 'U';

                    return (
                        <View style={[styles.replyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.replyHeader}>
                                <View style={styles.replyAuthorRow}>
                                    <View style={[styles.avatar, { backgroundColor: colors.background }]}>
                                        {author?.avatar_url ? (
                                            <Image source={{ uri: author.avatar_url }} style={styles.avatarImage} />
                                        ) : (
                                            <Text style={[styles.avatarText, { color: colors.gray600 }]}>{authorInitial}</Text>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.authorName, { color: colors.black }]}>{author?.name || t('user_fallback')}</Text>
                                        <Text style={[styles.replyMeta, { color: colors.gray500 }]}>
                                            {formatTimeAgo(item.created_at, t, language, false)}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteReply(item)} hitSlop={8}>
                                        <Ionicons name="ellipsis-horizontal" size={18} color={colors.gray500} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/post/${item.post_id}`)}>
                                <Text style={[styles.replyContent, { color: colors.black }]}>{item.content}</Text>

                                {post ? (
                                    <View style={[styles.postPreview, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                        <Text style={[styles.previewLabel, { color: colors.gray500 }]}>{t('post_tab')}</Text>
                                        <Text style={[styles.previewText, { color: colors.black }]} numberOfLines={2}>
                                            {post.content || t('post_header')}
                                        </Text>
                                    </View>
                                ) : null}
                            </TouchableOpacity>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="chatbubble-ellipses-outline" size={52} color={colors.gray300} />
                        <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('replies_empty_title')}</Text>
                        <Text style={[styles.emptySub, { color: colors.gray500 }]}>
                            {t('replies_empty_sub')}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: 120,
    },
    emptyTitle: {
        marginTop: 14,
        fontFamily: fonts.bold,
        fontSize: 18,
    },
    emptySub: {
        marginTop: 6,
        textAlign: 'center',
        fontFamily: fonts.regular,
        fontSize: 14,
        lineHeight: 20,
    },
    replyCard: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        padding: spacing.lg,
        borderRadius: 18,
        borderWidth: 1,
    },
    replyHeader: {
        marginBottom: spacing.sm,
    },
    replyAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 15,
    },
    authorName: {
        fontFamily: fonts.semibold,
        fontSize: 14,
    },
    replyMeta: {
        marginTop: 2,
        fontFamily: fonts.regular,
        fontSize: 12,
    },
    replyContent: {
        fontFamily: fonts.regular,
        fontSize: 15,
        lineHeight: 21,
    },
    postPreview: {
        marginTop: spacing.md,
        borderWidth: 1,
        borderRadius: radii.lg,
        padding: spacing.md,
    },
    previewLabel: {
        fontFamily: fonts.medium,
        fontSize: 12,
        marginBottom: 4,
    },
    previewText: {
        fontFamily: fonts.regular,
        fontSize: 13,
        lineHeight: 18,
    },
});
