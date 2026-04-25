import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts, lightColors } from '../../src/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { getPulse, getPulseComments, addPulseComment, deletePulse } from '../../src/api/pulse';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTheme } from '../../src/context/ThemeContext';
import { createPulseAliasSeed, getPulseAlias } from '../../src/utils/pulseAlias';
import { ICONS } from '../../src/constants/icons';

const GHOST_COLORS = [
    '#A154F2', '#7C3AED', '#9333EA', '#C084FC', '#6D28D9',
    '#8B5CF6', '#A78BFA', '#B794F4', '#A855F7', '#D8B4FE',
];

const PULSE_ICON_WHITE = ICONS.pulse.white;

function getGhostColor(id: string, index?: number): string {
    const hash = (id + (index ?? '')).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return GHOST_COLORS[hash % GHOST_COLORS.length];
}

function timeAgo(date: string, t: (key: any) => string, language: 'en' | 'tr' | 'ka'): string {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return t('just_now');
    if (diff < 3600) return t('minute_ago').replace('{{count}}', String(Math.floor(diff / 60)));
    if (diff < 86400) return t('hour_ago').replace('{{count}}', String(Math.floor(diff / 3600)));
    if (diff < 604800) return t('day_ago').replace('{{count}}', String(Math.floor(diff / 86400)));

    const localeMap = {
        en: 'en-US',
        tr: 'tr-TR',
        ka: 'ka-GE',
    };
    return d.toLocaleDateString(localeMap[language]);
}

export default function PulseDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { t, language } = useLanguage();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [pulse, setPulse] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [sending, setSending] = useState(false);
    const aliasSeedRef = useRef(createPulseAliasSeed());

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [pulseRes, commentsRes] = await Promise.all([
                getPulse(id as string),
                getPulseComments(id as string),
            ]);
            if (pulseRes?.data) setPulse(pulseRes.data);
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
                // Show reply like a third person until re-entering
                setComments(prev => [...prev, { ...res.data, is_mine: false }]);
                setCommentText('');
            }
        } catch (e) {
            Alert.alert(t('error'), t('pulse_comment_failed'));
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(t('pulse_delete_title'), t('pulse_delete_are_you_sure'), [
            { text: t('cancel_label'), style: 'cancel' },
            {
                text: t('delete_label'), style: 'destructive', onPress: async () => {
                    try {
                        await deletePulse(id as string);
                        router.back();
                    } catch (e) {
                        Alert.alert(t('error'), t('pulse_failed_to_delete'));
                    }
                }
            }
        ]);
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <Stack.Screen options={{
                    title: t('pulse_title'),
                    headerBackTitle: '',
                    headerStyle: { backgroundColor: colors.surface },
                    headerTitleStyle: { color: colors.black },
                    headerTintColor: colors.black,
                }} />
                <ActivityIndicator size="small" color={colors.gray500} />
            </View>
        );
    }

    if (!pulse) {
        return (
            <View style={styles.centered}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <Stack.Screen options={{
                    title: t('pulse_not_found_title'),
                    headerBackTitle: '',
                    headerStyle: { backgroundColor: colors.surface },
                    headerTitleStyle: { color: colors.black },
                    headerTintColor: colors.black,
                }} />
                <Text style={styles.errorText}>{t('pulse_removed_message')}</Text>
            </View>
        );
    }

    const ghostColor = getGhostColor(pulse.id);
    const postAlias = pulse.is_mine ? t('pulse_you_anonymous') : getPulseAlias(pulse.id, aliasSeedRef.current);

    const CommentItem = ({ item, index }: { item: any; index: number }) => {
        const commentColor = getGhostColor(item.id, index);
        const commentAlias = item.is_mine ? t('pulse_you_anonymous') : getPulseAlias(item.id, aliasSeedRef.current);

        return (
            <View style={styles.commentCard}>
                <View style={[styles.commentAvatar, { backgroundColor: commentColor }]}>
                    <Ionicons name="person" size={12} color={lightColors.background} />
                </View>
                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{commentAlias}</Text>
                        <Text style={styles.commentTime}>{timeAgo(item.created_at, t, language)}</Text>
                    </View>
                    <Text style={styles.commentText}>{item.content}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack.Screen options={{
                title: t('pulse_title'),
                headerBackTitle: '',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: colors.surface },
                headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
                headerTintColor: colors.black,
                headerRight: () => pulse.is_mine ? (
                    <TouchableOpacity onPress={handleDelete} style={{ padding: 8 }}>
                        <Ionicons name="trash-outline" size={20} color={colors.black} />
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
                            <View style={styles.betaBanner}>
                                <Ionicons name="information-circle-outline" size={16} color={accentColor} />
                                <Text style={styles.betaText}>{t('pulse_beta_notice')}</Text>
                            </View>

                            <View style={styles.postHeader}>
                                <View style={[styles.ghostAvatar, { backgroundColor: ghostColor }]}>
                                    <Image source={PULSE_ICON_WHITE} style={styles.ghostIcon} />
                                </View>
                                <View style={styles.postHeaderInfo}>
                                    <Text style={styles.anonLabel}>{postAlias}</Text>
                                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                        <Text style={styles.timestamp}>{timeAgo(pulse.created_at, t, language)}</Text>
                                        {pulse.is_edited && (
                                            <>
                                                <Text style={[styles.timestamp, { fontSize: 10 }]}>·</Text>
                                                <Text style={[styles.timestamp, { fontSize: 11 }]}>{t('edited_label')}</Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.postContent}>{pulse.content}</Text>

                            {pulse.image_url && (
                                <Image source={{ uri: pulse.image_url }} style={styles.postImage} />
                            )}

                            <View style={styles.infoBar}>
                                <View />
                                <View style={styles.commentCountPill}>
                                    <Ionicons name="chatbubble-outline" size={16} color={colors.gray500} />
                                    <Text style={styles.commentCountText}>
                                        {comments.length > 0
                                            ? `${comments.length} ${comments.length === 1 ? t('reply') : t('replies')}`
                                            : t('replies')}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.commentsHeader}>
                                <Text style={styles.commentsTitle}>{t('pulse_replies_header')}</Text>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyComments}>
                            <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.gray400} />
                            <Text style={styles.emptyCommentsText}>{t('no_replies_yet')}</Text>
                        </View>
                    }
                />

                <View style={styles.inputBar}>
                    <View style={styles.inputAvatar}>
                        <Ionicons name="person" size={14} color={lightColors.background} />
                    </View>
                    <TextInput
                        style={styles.commentInput}
                        value={commentText}
                        onChangeText={setCommentText}
                        placeholder={t('pulse_reply_placeholder')}
                        placeholderTextColor={colors.gray400}
                        multiline
                        maxLength={300}
                    />
                    <TouchableOpacity
                        onPress={handleComment}
                        disabled={!commentText.trim() || sending}
                        style={[styles.sendBtn, (!commentText.trim() || sending) && { opacity: 0.4 }]}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={lightColors.background} />
                        ) : (
                            <Ionicons name="send" size={18} color={lightColors.background} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const accentColor = '#A154F2';

const createStyles = (colors: typeof lightColors, isDark: boolean) => {
    const page = colors.background;
    const panel = colors.surface;
    const panelSoft = colors.elevated;
    const accent = accentColor;

    return StyleSheet.create({
        container: { flex: 1, backgroundColor: page },
        centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: page },
        errorText: { fontFamily: fonts.regular, fontSize: 16, color: colors.gray500, paddingHorizontal: spacing.lg, textAlign: 'center' },

        postSection: {
            margin: spacing.md,
            padding: spacing.lg,
            backgroundColor: panel,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
        },
        betaBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: panelSoft,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        betaText: {
            flex: 1,
            fontFamily: fonts.medium,
            fontSize: 12,
            color: colors.gray600,
            lineHeight: 16,
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
        ghostIcon: {
            width: 22,
            height: 22,
        },
        postHeaderInfo: {
            marginLeft: 14,
            flex: 1,
        },
        anonLabel: {
            fontFamily: fonts.bold,
            fontSize: 16,
            color: colors.black,
        },
        timestamp: {
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.gray500,
            marginTop: 2,
        },
        postContent: {
            fontFamily: fonts.regular,
            fontSize: 17,
            color: colors.black,
            lineHeight: 27,
        },
        postImage: {
            width: '100%',
            height: 220,
            borderRadius: 16,
            marginTop: 16,
            backgroundColor: panelSoft,
        },
        infoBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 20,
            paddingTop: 16,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
        },
        commentCountPill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: panelSoft,
            borderRadius: 20,
        },
        commentCountText: {
            fontFamily: fonts.semibold,
            fontSize: 14,
            color: colors.gray600,
        },
        commentsHeader: {
            marginTop: 20,
        },
        commentsTitle: {
            fontFamily: fonts.bold,
            fontSize: 17,
            color: colors.black,
        },

        commentCard: {
            flexDirection: 'row',
            marginHorizontal: spacing.md,
            marginBottom: 10,
            paddingHorizontal: spacing.md,
            paddingVertical: 14,
            backgroundColor: panel,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
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
            color: colors.black,
        },
        commentTime: {
            fontFamily: fonts.regular,
            fontSize: 11,
            color: colors.gray500,
        },
        commentText: {
            fontFamily: fonts.regular,
            fontSize: 15,
            color: colors.black,
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
            color: colors.gray500,
        },

        inputBar: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: spacing.lg,
            paddingVertical: 12,
            paddingBottom: Platform.OS === 'ios' ? 28 : 12,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            gap: 10,
        },
        inputAvatar: {
            width: 32,
            height: 32,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 4,
            backgroundColor: accent,
        },
        commentInput: {
            flex: 1,
            backgroundColor: panelSoft,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontFamily: fonts.regular,
            fontSize: 15,
            color: colors.black,
            maxHeight: 100,
            borderWidth: 1,
            borderColor: colors.border,
        },
        sendBtn: {
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: accent,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 2,
        },
    });
};
