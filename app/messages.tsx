import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { colors, spacing, fonts, radii } from '../src/constants/theme';
import { getConversations } from '../src/api/messages';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import ShadowLoader from '../src/components/ShadowLoader';

export default function MessagesScreen() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { user, onlineUsers } = useAuth();

    const loadData = async () => {
        try {
            const res = await getConversations();
            if (res?.data) setConversations(res.data);
        } catch (e) {
            console.log('Error loading conversations', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    const content = loading ? (
        <ShadowLoader type="messages" />
    ) : (
        <FlatList
            data={conversations}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
                const otherParticipant = item.participants?.find((p: any) => p.user_id !== user?.id);
                const isOnline = otherParticipant && onlineUsers.includes(otherParticipant.user_id);
                const displayName = item.type === 'direct' ? (otherParticipant?.profiles?.name || 'User') : item.name || 'Group';
                const initial = displayName.charAt(0).toUpperCase();

                return (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => router.push(`/chat/${item.id}` as any)}
                        activeOpacity={0.7}
                    >
                        <View>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{initial}</Text>
                            </View>
                            {isOnline && <View style={styles.onlineBadge} />}
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.name}>{displayName}</Text>
                            <Text style={styles.lastMsg} numberOfLines={1}>
                                {item.last_message
                                    ? (item.last_message.content || (item.last_message.media_type === 'video' ? '🎥 Video' : '📷 Photo'))
                                    : 'No messages yet'}
                            </Text>
                        </View>
                        {item.unread_count > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{item.unread_count}</Text>
                            </View>
                        )}
                        <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                    </TouchableOpacity>
                );
            }}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>💬</Text>
                    <Text style={styles.emptyTitle}>No conversations</Text>
                    <Text style={styles.emptySub}>Start chatting with your community members</Text>
                </View>
            }
        />
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Messages', headerBackTitle: '' }} />
            {content}
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
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.gray900,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontFamily: fonts.semibold,
        fontSize: 17,
        color: colors.white,
    },
    info: { flex: 1 },
    name: {
        fontFamily: fonts.semibold,
        fontSize: 15,
        color: colors.black,
    },
    lastMsg: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: colors.gray500,
        marginTop: 2,
    },
    unreadBadge: {
        backgroundColor: '#FF3B30', // System red
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: colors.white,
        fontSize: 11,
        fontFamily: fonts.bold,
    },
    emptyContainer: { alignItems: 'center', paddingTop: 120, paddingHorizontal: spacing.xl },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.black },
    emptySub: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, textAlign: 'center', marginTop: 4 },
    onlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#34C759',
        borderWidth: 2,
        borderColor: colors.white,
    },
});
