import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../src/context/NotificationContext';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import ShadowLoader from '../../src/components/ShadowLoader';
import FriendRequestBanner from '../../src/components/FriendRequestBanner';
import { markAllAsRead, getNotifications, markAsRead } from '../../src/api/notifications';
import { useCallback } from 'react';
import { useLanguage } from '../../src/context/LanguageContext';
import { buildLocalizedNotificationMessage, buildLocalizedNotificationTitle, formatTimeAgo } from '../../src/utils/localization';


const NOTIF_ICONS: Record<string, string> = {
    message: 'chatbubble-outline',
    post: 'document-text-outline',
    like: 'heart-outline',
    post_upvote: 'arrow-up-circle-outline',
    comment: 'chatbubble-ellipses-outline',
    comment_reply: 'chatbubbles-outline',
    anonymous_upvote: 'arrow-up-circle-outline',
    anonymous_comment: 'chatbubbles-outline',
    friend_request: 'person-add-outline',
    friend_accept: 'person-outline',
    friend_accepted: 'people-outline',
    community_request: 'people-outline',
    community_approval: 'checkmark-circle-outline',
    community_decline: 'close-circle-outline',
    community_marketplace_item: 'cart-outline',
    community_event: 'calendar-outline',
    event_interest: 'calendar-outline',
    event_rsvp: 'calendar-outline',
    community_job: 'briefcase-outline',
    community_poll: 'stats-chart-outline',
    system: 'notifications-outline',
};

export default function ActivityScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t, language } = useLanguage();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    const { refreshUnreadCount } = useNotifications();
    const visibleNotifications = notifications.filter((item) => item?.type !== 'message');

    const loadData = async (categoryParam?: string) => {
        try {
            setLoading(true);
            const cat = categoryParam !== undefined ? categoryParam : filter;
            const res = await getNotifications(cat === 'all' ? undefined : cat);
            if (res?.data) {
                const filtered = res.data.filter((item: any) => item?.type !== 'message');
                setNotifications(filtered);
                return filtered;
            }
            return [];
        } catch (e) {
            console.log('[Activity] Error loading notifications', e);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            let mounted = true;

            // Load fresh notifications when entering the tab (respect current filter)
            loadData(filter);

            return () => {
                mounted = false;
                // Mark everything as read silently in the background ONLY when leaving the screen
                markAllAsRead().then(() => {
                    refreshUnreadCount();
                }).catch((e) => {
                    console.log('[Activity] Error marking as read on leave', e);
                });
            };
        }, [])
    );

    const handleSelectFilter = async (key: string) => {
        setFilter(key);
        await loadData(key === 'all' ? undefined : key);
    };

    const handleMarkRead = async (notification: any) => {
        const { id, read, type, reference_id } = notification;

        try {
            if (!read) {
                await markAsRead(id);
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
                refreshUnreadCount();
            }

            // Navigation
            if (type === 'message' || type.includes('mention')) {
                router.push(`/chat/${reference_id}` as any);
            } else if (type.includes('post') || type.includes('comment') || type.includes('upvote')) {
                router.push(`/post/${reference_id}` as any);
            } else if (type.includes('event')) {
                router.push(`/events/${reference_id}` as any);
            } else if (type.includes('poll')) {
                router.push(`/polls/${reference_id}` as any);
            } else if (type.includes('marketplace')) {
                router.push(`/marketplace/${reference_id}` as any);
            } else if (type.includes('job')) {
                router.push(`/jobs/detail/${reference_id}` as any);
            } else if (type.includes('community_request')) {
                router.push(`/community/${reference_id}/members` as any);
            } else if (type.startsWith('community_')) {
                router.push(`/community/${reference_id}` as any);
            } else if (type === 'friend_request') {
                router.push('/friends/requests');
            } else if (type.includes('friend_')) {
                router.push(`/user/${reference_id}`);
            }
        } catch (e) {
            console.log('Error handling notification click:', e);
        }
    };

    if (loading && notifications.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
                <Stack.Screen options={{ title: t('activity_header') }} />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: t('activity_header') }} />
            <View style={[styles.filterContainer, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                >
                    {[
                        { key: 'all', label: t('notif_filter_all') },
                        { key: 'upvotes', label: t('notif_filter_upvotes') },
                        { key: 'comments', label: t('notif_filter_comments') },
                        { key: 'friend_request', label: t('notif_filter_friend_requests') },
                        { key: 'pulse', label: t('notif_filter_pulse') },
                        { key: 'poll', label: t('notif_filter_poll') },
                        { key: 'mentions', label: t('notif_filter_mentions') },
                    ].map(f => (
                        <TouchableOpacity
                            key={f.key}
                            style={[
                                styles.filterPill, 
                                { borderColor: colors.border },
                                filter === f.key && { backgroundColor: colors.black, borderColor: colors.black }
                            ]}
                            onPress={() => handleSelectFilter(f.key)}
                        >
                            <Text style={[
                                styles.filterText, 
                                { color: filter === f.key ? colors.white : colors.gray500 },
                                filter === f.key && { fontFamily: fonts.semibold }
                            ]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <FlatList
                data={visibleNotifications}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const iconName = NOTIF_ICONS[item.type] || 'notifications-outline';
                    const isUnread = !item.read;

                    return (
                        <TouchableOpacity
                            style={[
                                styles.card,
                                { backgroundColor: colors.surface, borderBottomColor: colors.border },
                                isUnread && { backgroundColor: colors.gray50 }
                            ]}
                            onPress={() => handleMarkRead(item)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.iconBlock,
                                { backgroundColor: colors.gray100 },
                                isUnread && { backgroundColor: colors.gray200 }
                            ]}>
                                <Ionicons
                                    name={iconName as any}
                                    size={18}
                                    color={isUnread ? colors.text : colors.gray400}
                                />
                            </View>
                            <View style={styles.info}>
                                <Text style={[
                                    styles.title,
                                    { color: colors.gray600 },
                                    isUnread && { fontFamily: fonts.semibold, color: colors.text }
                                ]}>
                                    {buildLocalizedNotificationTitle(item, language) || item.title}
                                </Text>
                                <Text style={[styles.body, { color: colors.gray500 }]} numberOfLines={2}>
                                    {buildLocalizedNotificationMessage(item, language)}
                                </Text>
                                <Text style={[styles.time, { color: colors.gray400 }]}>
                                    {formatTimeAgo(item.created_at, t, language)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-outline" size={64} color={colors.gray200} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('all_caught_up_activity')}</Text>
                        <Text style={[styles.emptySub, { color: colors.gray500 }]}>{t('activity_empty_sub')}</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        gap: 14,
    },
    iconBlock: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: { flex: 1 },
    title: {
        fontFamily: fonts.regular,
        fontSize: 14,
    },
    body: {
        fontFamily: fonts.regular,
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16,
    },
    time: {
        fontFamily: fonts.regular,
        fontSize: 11,
        marginTop: 4,
    },
    emptyContainer: { alignItems: 'center', paddingTop: 120, paddingHorizontal: spacing.xl },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 20, textAlign: 'center' },
    emptySub: { fontFamily: fonts.regular, fontSize: 14, marginTop: 4, textAlign: 'center' },
    filterContainer: { borderBottomWidth: StyleSheet.hairlineWidth },
    filterRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: 14, gap: 8 },
    filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    filterText: { fontFamily: fonts.medium, fontSize: 13 },
});
