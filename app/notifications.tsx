import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors, spacing, fonts, radii } from '../src/constants/theme';
import { getNotifications, markAsRead } from '../src/api/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../src/context/NotificationContext';
import { useRouter } from 'expo-router';

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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.black} />
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
                            style={[styles.card, !item.read && styles.unread]}
                            onPress={() => handleMarkRead(item)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBlock, !item.read && styles.iconBlockUnread]}>
                                <Ionicons
                                    name={iconName as any}
                                    size={18}
                                    color={item.read ? colors.gray400 : colors.black}
                                />
                            </View>
                            <View style={styles.info}>
                                <Text style={[styles.title, !item.read && styles.titleUnread]}>
                                    {item.title}
                                </Text>
                                <Text style={styles.body} numberOfLines={2}>{item.message}</Text>
                                <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                            </View>
                            {!item.read && <View style={styles.dot} />}
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🔔</Text>
                        <Text style={styles.emptyTitle}>All caught up</Text>
                        <Text style={styles.emptySub}>You'll see notifications here</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        backgroundColor: colors.white,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray200,
        gap: 14,
    },
    unread: {
        backgroundColor: colors.gray50,
    },
    iconBlock: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBlockUnread: {
        backgroundColor: colors.gray200,
    },
    info: { flex: 1 },
    title: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray600,
    },
    titleUnread: {
        fontFamily: fonts.semibold,
        color: colors.black,
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
        backgroundColor: colors.black,
    },
    emptyContainer: { alignItems: 'center', paddingTop: 120, paddingHorizontal: spacing.xl },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.black },
    emptySub: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, marginTop: 4 },
});
