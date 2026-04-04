import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
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
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { refreshUnreadCount } = useNotifications();

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getNotifications();
            if (res?.data) {
                // For debugging: show everything first to verify visibility
                setNotifications(res.data);
                return res.data;
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
            const clearAndLoad = async () => {
                const refreshedData = await loadData();
                if (mounted && refreshedData.length > 0) {
                    try {
                        await markAllAsRead();
                        setNotifications(refreshedData.map((n: any) => ({ ...n, read: true })));
                        refreshUnreadCount();
                    } catch (e) {
                        console.log('[Activity] Error clearing', e);
                    }
                }
            };
            clearAndLoad();
            return () => { mounted = false; };
        }, [])
    );

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
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Activity' }} />
            <FlatList
                data={notifications}
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
                                isUnread && { backgroundColor: isDark ? colors.gray800 : colors.gray50 }
                            ]}
                            onPress={() => handleMarkRead(item)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.iconBlock, 
                                { backgroundColor: isDark ? colors.gray800 : colors.gray100 },
                                isUnread && { backgroundColor: isDark ? colors.gray700 : colors.gray200 }
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
                                    {item.title}
                                </Text>
                                <Text style={[styles.body, { color: colors.gray500 }]} numberOfLines={2}>
                                    {item.message}
                                </Text>
                                <Text style={[styles.time, { color: colors.gray400 }]}>
                                    {timeAgo(item.created_at)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-outline" size={64} color={colors.gray200} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up</Text>
                        <Text style={[styles.emptySub, { color: colors.gray500 }]}>You'll see activity notifications here</Text>
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
    emptyTitle: { fontFamily: fonts.bold, fontSize: 20 },
    emptySub: { fontFamily: fonts.regular, fontSize: 14, marginTop: 4 },
});
