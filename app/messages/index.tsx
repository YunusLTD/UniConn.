import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getConversations } from '../../src/api/messages';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ShadowLoader from '../../src/components/ShadowLoader';

export default function MessagesScreen() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { user, onlineUsers } = useAuth();
    const { colors } = useTheme();

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
                const rawDisplayName = item.type === 'direct' ? (otherParticipant?.profiles?.name || 'User') : item.name || 'Group';
                const displayName = rawDisplayName
                    .replace(/[💬]/g, '')
                    .replace(/Community/gi, '')
                    .replace(/University/gi, '')
                    .replace(/\(Chat\)/gi, '')
                    .replace(/\(Community Chat\)/gi, '')
                    .trim();
                const avatarUrl = item.type === 'direct' ? otherParticipant?.profiles?.avatar_url : item.community?.image_url;
                
                const initials = (() => {
                    const parts = displayName.split(' ').filter((p: string) => p.length > 0);
                    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                    return displayName.substring(0, 2).toUpperCase();
                })();

                return (
                    <TouchableOpacity
                        style={[styles.card, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
                        onPress={() => router.push(`/chat/${item.id}` as any)}
                        activeOpacity={0.7}
                    >
                        <View>
                            <View style={[styles.avatar, { backgroundColor: colors.gray900 }]}>
                                {avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                                ) : (
                                    <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>{initials}</Text>
                                )}
                            </View>
                            {isOnline && <View style={[styles.onlineBadge, { borderColor: colors.surface }]} />}
                        </View>
                        <View style={styles.info}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={[styles.name, { color: colors.black }]}>{displayName}</Text>
                                {(otherParticipant?.profiles?.is_admin || displayName === 'UniConn Platform') && (
                                    <MaterialCommunityIcons name="check-decagram" size={16} color="#00A3FF" />
                                )}
                            </View>
                            <Text style={[styles.lastMsg, { color: colors.gray500 }]} numberOfLines={1}>
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
                    <Text style={[styles.emptyTitle, { color: colors.black }]}>No conversations</Text>
                    <Text style={[styles.emptySub, { color: colors.gray500 }]}>Start chatting with your community members</Text>
                </View>
            }
        />
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ 
                title: 'Messages', 
                headerBackTitle: '',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.black
            }} />
            {content}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        gap: 14,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontFamily: fonts.semibold,
        fontSize: 17,
    },
    info: { flex: 1 },
    name: {
        fontFamily: fonts.semibold,
        fontSize: 15,
    },
    lastMsg: {
        fontFamily: fonts.regular,
        fontSize: 13,
        marginTop: 2,
    },
    unreadBadge: {
        backgroundColor: '#FF3B30',
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontFamily: fonts.bold,
    },
    emptyContainer: { alignItems: 'center', paddingTop: 120, paddingHorizontal: spacing.xl },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 20 },
    emptySub: { fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', marginTop: 4 },
    onlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#34C759',
        borderWidth: 2,
    },
});

