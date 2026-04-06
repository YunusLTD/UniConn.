import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, TextInput } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getConversations } from '../../src/api/messages';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ShadowLoader from '../../src/components/ShadowLoader';
import { useLanguage } from '../../src/context/LanguageContext';
import { deleteConversation } from '../../src/api/messages';
import ActionModal from '../../src/components/ActionModal';

export default function MessagesScreen() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [longPressedConv, setLongPressedConv] = useState<any>(null);
    const router = useRouter();
    const { user, onlineUsers } = useAuth();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();

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

    const filteredConversations = conversations.filter(conv => {
        if (!searchQuery.trim()) return true;
        const otherParticipant = conv.participants?.find((p: any) => p.user_id !== user?.id);
        const name = conv.type === 'direct' ? (otherParticipant?.profiles?.name || '') : (conv.name || '');
        const username = otherParticipant?.profiles?.username || '';
        return (
            name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            username.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const handleDeleteConversation = async (id: string) => {
        try {
            await deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            setLongPressedConv(null);
        } catch (e) {
            console.log('Error deleting conversation', e);
        }
    };

    const content = loading ? (
        <ShadowLoader type="messages" />
    ) : (
        <FlatList
            data={filteredConversations}
            ListHeaderComponent={
                <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.searchBar, { backgroundColor: isDark ? colors.surface : colors.gray50 }]}>
                        <Ionicons name="search" size={20} color={colors.gray400} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.black }]}
                            placeholder={t('search_messages_placeholder')}
                            placeholderTextColor={colors.gray400}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={colors.gray400} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            }
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
                const otherParticipant = item.participants?.find((p: any) => p.user_id !== user?.id);
                const isOnline = otherParticipant && onlineUsers.includes(otherParticipant.user_id);
                const rawDisplayName = item.type === 'direct' ? (otherParticipant?.profiles?.name || t('user_fallback')) : item.name || t('group_fallback');
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
                        onLongPress={() => item.type === 'direct' && setLongPressedConv(item)}
                        activeOpacity={0.7}
                    >
                        <View>
                            <View style={[styles.avatar, { backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border }]}>
                                {avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                                ) : (
                                    <Text style={[styles.avatarText, { color: colors.black }]}>{initials}</Text>
                                )}
                            </View>
                            {isOnline && <View style={[styles.onlineBadge, { borderColor: colors.surface }]} />}
                        </View>
                        <View style={styles.info}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={[styles.name, { color: colors.black }]}>{displayName}</Text>
                                {item.type === 'direct' && (otherParticipant?.profiles?.is_admin || displayName === 'UniConn Platform') && (
                                    <MaterialCommunityIcons name="check-decagram" size={16} color="#00A3FF" />
                                )}
                            </View>
                            <Text style={[styles.lastMsg, { color: colors.gray500 }]} numberOfLines={1}>
                                {(() => {
                                    if (!item.last_message) return t('no_messages_yet');
                                    
                                    const isSharedPost = item.last_message.content?.includes('https://uni-platform.app/post/');
                                    if (isSharedPost) {
                                        const isMine = item.last_message.sender_id === user?.id;
                                        const sender = item.participants?.find((p: any) => p.user_id === item.last_message.sender_id);
                                        const firstName = sender?.profiles?.name?.split(' ')[0] || t('user_fallback');
                                        return isMine ? t('you_shared_post') : t('someone_shared_post').replace('{{name}}', firstName);
                                    }
                                    
                                    return item.last_message.content || (item.last_message.media_type === 'video' ? `🎥 ${t('video_label')}` : `📷 ${t('photo_label')}`);
                                })()}
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
                    <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('no_conversations')}</Text>
                    <Text style={[styles.emptySub, { color: colors.gray500 }]}>{t('start_chatting_sub')}</Text>
                </View>
            }
        />
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ 
                headerTitle: t('messages_header'),
                headerBackTitle: '',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.black,
                headerShadowVisible: false
            }} />
            {content}
            
            <ActionModal
                visible={!!longPressedConv}
                onClose={() => setLongPressedConv(null)}
                title={t('conversation_options')}
                options={[
                    { 
                        label: t('clear_history'), 
                        icon: 'trash-outline', 
                        destructive: true, 
                        onPress: () => handleDeleteConversation(longPressedConv.id) 
                    }
                ]}
            />
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
    searchContainer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 22,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 15,
        padding: 0,
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
