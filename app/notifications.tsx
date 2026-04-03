import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { spacing, fonts, radii } from '../src/constants/theme';
import { getNotifications, markAsRead } from '../src/api/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../src/context/NotificationContext';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';

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
};

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { colors, isDark } = useTheme();

    const { refreshUnreadCount } = useNotifications();

    const loadData = async () => {
        try {
            const res = await getNotifications();
            if (res?.data) setNotifications(res.data);
        } catch (e) {
            console.log('Error loading notifications', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

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
            } else if ((type === 'post' || type === 'post_upvote' || type === 'comment' || type === 'comment_reply' || type === 'post_mention' || type.includes('mention')) && reference_id) {
                router.push(`/post/${reference_id}` as any);
            }
        } catch (e) {
            console.log('Error handling notification click:', e);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="small" color={colors.black} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                                { backgroundColor: colors.surface, borderBottomColor: colors.border },
                                !item.read && { backgroundColor: isDark ? '#1A1A1A' : colors.gray50 }
                            ]}
                            onPress={() => handleMarkRead(item)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.iconBlock, 
                                { backgroundColor: isDark ? '#262626' : colors.gray100 },
                                !item.read && { backgroundColor: isDark ? '#333333' : colors.gray200 }
                            ]}>
                                <Ionicons
                                    name={iconName as any}
                                    size={18}
                                    color={item.read ? colors.gray400 : colors.text}
                                />
                            </View>
                            <View style={styles.info}>
                                <Text style={[styles.title, { color: colors.gray600 }, !item.read && [styles.titleUnread, { color: colors.black }]]}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.body, { color: colors.gray500 }]} numberOfLines={2}>{item.message}</Text>
                                <Text style={[styles.time, { color: colors.gray400 }]}>{timeAgo(item.created_at)}</Text>
                            </View>
                            {!item.read && <View style={[styles.dot, { backgroundColor: colors.black }]} />}
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
    titleUnread: {
        fontFamily: fonts.semibold,
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
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    emptyContainer: { alignItems: 'center', paddingTop: 120, paddingHorizontal: spacing.xl },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 20 },
    emptySub: { fontFamily: fonts.regular, fontSize: 14, marginTop: 4 },
});
