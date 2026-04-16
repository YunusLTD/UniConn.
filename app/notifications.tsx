import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { spacing, fonts, radii } from '../src/constants/theme';
import { getNotifications, markAsRead } from '../src/api/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../src/context/NotificationContext';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { useFocusEffect } from '@react-navigation/native';
import { buildLocalizedNotificationMessage, buildLocalizedNotificationTitle } from '../src/utils/localization';

function timeAgo(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString();
}

const NOTIF_ICONS: Record<string, string> = {
    message: 'chatbubble-outline',
    post: 'document-text-outline',
    like: 'heart-outline',
    post_upvote: 'arrow-up-circle-outline',
    comment: 'chatbubble-ellipses-outline',
    comment_reply: 'return-up-back-outline',
    post_mention: 'at-outline',
    message_mention: 'at-outline',
    poll_vote: 'stats-chart-outline',
    community_poll: 'stats-chart-outline',
    friend_request: 'person-add-outline',
    friend_accept: 'person-outline',
    community_request: 'people-outline',
    community_approval: 'checkmark-circle-outline',
    community_decline: 'close-circle-outline',
    system: 'notifications-outline',
};

export default function NotificationsScreen() {
    const { colors, isDark } = useTheme();
    const { t, language } = useLanguage();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { refreshUnreadCount } = useNotifications();

    const loadData = async () => {
        try {
            const res = await getNotifications();
            if (res?.data) {
                // Show all notifications for now to ensure visibility
                setNotifications(res.data);
            }
        } catch (e) {
            console.log('Error loading notifications', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const handleMarkRead = async (notification: any) => {
        const { id, read, type, reference_id } = notification;

        try {
            // Only make API call if not already read
            if (!read) {
                await markAsRead(id);
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
                refreshUnreadCount();
            }

            // Navigate to content
            if ((type === 'message' || type === 'message_mention') && reference_id) {
                router.push(`/chat/${reference_id}` as any);
            } else if ((type === 'poll_vote' || type === 'community_poll') && reference_id) {
                router.push(`/polls/${reference_id}` as any);
            } else if ((type === 'post' || type === 'post_upvote' || type === 'comment' || type === 'comment_reply' || type === 'post_mention' || type.includes('mention')) && reference_id) {
                router.push(`/post/${reference_id}` as any);
            } else if (type === 'community_request' && reference_id) {
                router.push(`/community/${reference_id}/members` as any);
            } else if (type.startsWith('community_') && reference_id) {
                 router.push(`/community/${reference_id}` as any);
            }
        } catch (e) {
            console.log('Error handling notification click:', e);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.text} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={notifications}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const iconName = NOTIF_ICONS[item.type] || 'notifications-outline';
                    return (
                        <TouchableOpacity
                            style={[
                                styles.card, 
                                !item.read && styles.cardUnread
                            ]}
                            onPress={() => handleMarkRead(item)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.iconBlock, 
                                !item.read && styles.iconBlockUnread
                            ]}>
                                <Ionicons
                                    name={iconName as any}
                                    size={18}
                                    color={item.read ? colors.gray400 : colors.text}
                                />
                            </View>
                            <View style={styles.info}>
                                <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={1}>
                                    {buildLocalizedNotificationTitle(item, language) || (item.title.startsWith('New in ') ? `${t('New in ')}${item.title.replace('New in ', '')}` : (t(item.title as any) || item.title))}
                                </Text>
                                <Text style={styles.body} numberOfLines={2}>{buildLocalizedNotificationMessage(item, language)}</Text>
                                <Text style={styles.time}>{(() => {
                                    const d = new Date(item.created_at);
                                    const now = new Date();
                                    const diff = now.getTime() - d.getTime();
                                    const mins = Math.floor(diff / 60000);
                                    if (mins < 1) return t('notif_now');
                                    if (mins < 60) return `${mins}${t('time_m')}`;
                                    const hrs = Math.floor(mins / 60);
                                    if (hrs < 24) return `${hrs}${t('time_h')}`;
                                    const days = Math.floor(hrs / 24);
                                    if (days < 7) return `${days}${t('time_d')}`;
                                    return d.toLocaleDateString();
                                })()}</Text>
                            </View>
                            {!item.read && <View style={styles.dot} />}
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-outline" size={64} color={colors.gray200} />
                        <Text style={styles.emptyTitle}>{t('notif_all_caught_up')}</Text>
                        <Text style={styles.emptySub}>{t('notif_updates_here')}</Text>
                    </View>
                }
            />
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
        gap: 14,
    },
    cardUnread: {
        backgroundColor: isDark ? colors.gray50 : '#F3F4F6', // Slight accent for unread
    },
    iconBlock: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDark ? '#262626' : colors.gray100,
    },
    iconBlockUnread: {
        backgroundColor: isDark ? '#333333' : colors.gray200,
    },
    info: { flex: 1 },
    title: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray600,
    },
    titleUnread: {
        fontFamily: fonts.semibold,
        color: colors.text,
    },
    body: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.gray500,
        marginTop: 2,
        lineHeight: 16,
    },
    time: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: colors.gray400,
        marginTop: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.blue,
    },
    emptyContainer: { alignItems: 'center', paddingTop: 120, paddingHorizontal: 40 },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginTop: 16 },
    emptySub: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, marginTop: 4, textAlign: 'center' },
});
