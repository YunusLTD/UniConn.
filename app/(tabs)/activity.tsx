import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../src/context/NotificationContext';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
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
    anonymous_upvote: 'arrow-up-circle-outline',
    comment: 'chatbubble-ellipses-outline',
    comment_reply: 'chatbubbles-outline',
    anonymous_comment: 'chatbubbles-outline',
    friend_request: 'person-add-outline',
    friend_accepted: 'people-outline',
    community_join_request: 'shield-outline',
    community_marketplace_item: 'cart-outline',
    community_event: 'calendar-outline',
    event_interest: 'calendar-outline',
    event_rsvp: 'calendar-outline',
    community_job: 'briefcase-outline',
    community_poll: 'stats-chart-outline',
};

export default function ActivityScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { refreshUnreadCount } = useNotifications();

    const loadData = async () => {
        try {
            const res = await getNotifications();
            if (res?.data) {
                // Filter out message notifications from the Activity tab
                setNotifications(res.data.filter((n: any) => n.type !== 'message'));
            }
        } catch (e) {
            console.log('Error loading notifications', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            const clearAndLoad = async () => {
                await loadData();
                try {
                    // Optimized: Mark all as read as soon as they view the tab
                    await markAllAsRead();
                    setNotifications(prev => prev.map(n => ({...n, read: true})));
                    refreshUnreadCount();
                } catch (e) {
                    console.log('Error clearing notifications', e);
                }
            };
            clearAndLoad();
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
            if (type === 'message' && reference_id) {
                router.push(`/chat/${reference_id}` as any);
            } else if (
                (type.includes('post') || type.includes('comment') || type.includes('upvote') || type.includes('reply')) 
                && reference_id
            ) {
                router.push(`/post/${reference_id}` as any);
            } else if (type.includes('event') && reference_id) {
                router.push(`/events/${reference_id}` as any);
            } else if (type.includes('marketplace') && reference_id) {
                router.push(`/marketplace/${reference_id}` as any);
            } else if (type.includes('job') && reference_id) {
                router.push(`/jobs/category/all` as any); // fallback for jobs
            } else if (type.includes('poll') && reference_id) {
                router.push(`/polls/${reference_id}` as any);
            } else if (type === 'friend_request') {
                router.push('/friends/requests');
            } else if (type === 'friend_accepted' && reference_id) {
                router.push(`/user/${reference_id}`);
            }
        } catch (e) {
            console.log('Error handling notification click:', e);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Activity' }} />
                <ShadowLoader type="messages" />
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
                ListHeaderComponent={<FriendRequestBanner />}
                refreshControl={
                    <RefreshControl 
                        refreshing={loading} 
                        onRefresh={loadData} 
                        tintColor={colors.primary}
                    />
                }
                renderItem={({ item }) => {
                    const iconName = NOTIF_ICONS[item.type] || 'notifications-outline';
                    return (
                        <TouchableOpacity
                            style={[styles.card, { backgroundColor: colors.surface, borderBottomColor: colors.border }, !item.read && { backgroundColor: isDark ? colors.gray800 : colors.gray50 }]}
                            onPress={() => handleMarkRead(item)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBlock, { backgroundColor: isDark ? colors.gray800 : colors.gray100 }, !item.read && { backgroundColor: isDark ? colors.gray700 : colors.gray200 }]}>
                                <Ionicons
                                    name={iconName as any}
                                    size={18}
                                    color={item.read ? colors.gray400 : colors.black}
                                />
                            </View>
                            <View style={styles.info}>
                                <Text style={[styles.title, { color: colors.gray600 }, !item.read && { fontFamily: fonts.semibold, color: colors.black }]}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.body, { color: colors.gray500 }]} numberOfLines={2}>{item.message}</Text>
                                <Text style={[styles.time, { color: colors.gray400 }]}>{timeAgo(item.created_at)}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🔔</Text>
                        <Text style={[styles.emptyTitle, { color: colors.black }]}>All caught up</Text>
                        <Text style={[styles.emptySub, { color: colors.gray500 }]}>You'll see notifications here</Text>
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
