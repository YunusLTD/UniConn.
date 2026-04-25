import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getConversations } from '../../src/api/messages';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import ShadowLoader from '../../src/components/ShadowLoader';
import { useLanguage } from '../../src/context/LanguageContext';
import { deleteConversation } from '../../src/api/messages';
import ActionModal from '../../src/components/ActionModal';
import { chatStore } from '../../src/chat/chatStore';
import { drainOutbox } from '../../src/chat/chatSync';
import { hapticSelection } from '../../src/utils/haptics';

const stripLegacyGroupChatSuffix = (value: string) =>
    value
        .replace(/\s*\((community\s+)?chat\)\s*$/gi, '')
        .replace(/\s*\(community\s+hub\)\s*$/gi, '')
        .replace(/\s+community\s*$/i, '')
        .trim();

const getAvatarLabel = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '?';

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
        const first = Array.from(words[0])[0] || '';
        const second = Array.from(words[1])[0] || '';
        return (first + second).toUpperCase();
    }

    return Array.from(trimmed).slice(0, 2).join('').toUpperCase() || '?';
};

const getConversationTimestamp = (conversation: any) =>
    new Date(conversation?.last_message?.created_at || conversation?.created_at || 0).getTime();

const normalizeConversationList = (items: any[]) => {
    if (!Array.isArray(items)) return [];

    const byId = new Map<string, any>();
    const fallbackItems: any[] = [];

    for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        const conversationId = typeof item.id === 'string' ? item.id : '';
        if (!conversationId) {
            fallbackItems.push(item);
            continue;
        }

        const existing = byId.get(conversationId);
        if (!existing || getConversationTimestamp(item) >= getConversationTimestamp(existing)) {
            byId.set(conversationId, item);
        }
    }

    return [...byId.values(), ...fallbackItems].sort((left, right) => {
        return getConversationTimestamp(right) - getConversationTimestamp(left);
    });
};

export default function MessagesScreen() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [longPressedConv, setLongPressedConv] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [clearing, setClearing] = useState(false);
    const router = useRouter();
    const { user, onlineUsers } = useAuth();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const safeConversations = normalizeConversationList(conversations);

    const loadLocalData = useCallback(async () => {
        if (!user?.id) return;
        try {
            const cached = normalizeConversationList(await chatStore.getConversationList(user.id));
            if (cached.length) {
                setConversations(cached);
                setLoading(false);
            }
        } catch (e) {
            console.log('Error loading local conversations', e);
        }
    }, [user?.id]);

    const loadData = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            const res = await getConversations();
            const nextConversations = normalizeConversationList(res?.data);
            setConversations(nextConversations);
            if (nextConversations.length) {
                await chatStore.upsertConversationList(user.id, nextConversations);
            }
        } catch (e) {
            console.log('Error loading conversations', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadLocalData();
    }, [loadLocalData]);

    useEffect(() => {
        if (!user?.id) return;

        const unsubscribe = chatStore.subscribe(async () => {
            const cached = normalizeConversationList(await chatStore.getConversationList(user.id));
            setConversations(cached);
        });

        return unsubscribe;
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            loadLocalData();
            loadData();
            drainOutbox().catch(() => { });
            const interval = setInterval(() => {
                loadData();
                drainOutbox().catch(() => { });
            }, 30000);
            return () => clearInterval(interval);
        }, [loadData, loadLocalData])
    );

    const filteredConversations = safeConversations.filter(conv => {
        if (!conv || typeof conv !== 'object') return false;
        if (!conv.last_message) return false; // Do not show cleared/empty chats
        if (!searchQuery.trim()) return true;
        const otherParticipant = conv.participants?.find((p: any) => p.user_id !== user?.id);
        const name = String(conv.type === 'direct' ? (otherParticipant?.profiles?.name || '') : (conv.name || ''));
        const username = String(otherParticipant?.profiles?.username || '');
        return (
            name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            username.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const handleDeleteConversation = async (id: string) => {
        try {
            await deleteConversation(id);
            await chatStore.clearConversation(id);
            setConversations(prev => normalizeConversationList(prev.filter(c => c?.id !== id)));
            setLongPressedConv(null);
        } catch (e) {
            console.log('Error deleting conversation', e);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleClearSelected = async () => {
        if (selectedIds.size === 0) return;
        
        Alert.alert(
            t('clear_history') || 'Clear History',
            t('clear_history_confirm', { count: selectedIds.size }) || `Are you sure you want to clear the history of ${selectedIds.size} chat(s)?`,
            [
                { text: t('cancel_label') || 'Cancel', style: 'cancel' },
                { 
                    text: t('clear') || 'Clear', 
                    style: 'destructive',
                    onPress: async () => {
                        setClearing(true);
                        try {
                            const ids = Array.from(selectedIds);
                            await Promise.all(ids.map(async (id) => {
                                await deleteConversation(id);
                                await chatStore.clearConversation(id);
                            }));
                            setConversations(prev => normalizeConversationList(prev.filter(c => !ids.includes(c?.id))));
                            setSelectedIds(new Set());
                            setIsEditing(false);
                        } catch (e) {
                            console.log('Error deleting conversations', e);
                        } finally {
                            setClearing(false);
                        }
                    }
                }
            ]
        );
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
            keyExtractor={(item, index) => String(item?.id ?? `conversation-${index}`)}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
                if (!item || typeof item !== 'object') return null;
                const otherParticipant = item.participants?.find((p: any) => p.user_id !== user?.id);
                const otherParticipantId = typeof otherParticipant?.user_id === 'string' ? otherParticipant.user_id : '';
                const isOnline = !!otherParticipantId && onlineUsers.includes(otherParticipantId);
                const rawDisplayName = String(
                    item.type === 'direct'
                        ? (otherParticipant?.profiles?.name || t('user_fallback'))
                        : (item.name || t('group_fallback'))
                );
                const displayName = stripLegacyGroupChatSuffix(rawDisplayName) || t(item.type === 'direct' ? 'user_fallback' : 'group_fallback');
                const avatarUrl = item.type === 'direct' ? otherParticipant?.profiles?.avatar_url : item.community?.image_url;
                const conversationId = typeof item.id === 'string' ? item.id : '';
                const initials = getAvatarLabel(displayName);

                return (
                    <TouchableOpacity
                        style={[styles.card, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
                        onPress={() => {
                            if (!conversationId) return;
                            if (isEditing) {
                                toggleSelection(conversationId);
                            } else {
                                router.push({
                                    pathname: '/chat/[id]',
                                    params: { id: conversationId }
                                });
                            }
                        }}
                        delayLongPress={200}
                        onLongPress={() => {
                            if (!isEditing) {
                                hapticSelection();
                                setLongPressedConv(item);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        {isEditing && (
                            <View style={[styles.checkbox, { borderColor: selectedIds.has(conversationId) ? '#00A3FF' : colors.gray300, backgroundColor: selectedIds.has(conversationId) ? '#00A3FF' : 'transparent' }]}>
                                {selectedIds.has(conversationId) && <Ionicons name="checkmark" size={14} color="#FFF" />}
                            </View>
                        )}
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
                                    
                                    if (item.last_message.sync_status === 'sending' || item.last_message.sync_status === 'queued') {
                                        return (
                                            <Text style={{ fontStyle: 'italic', color: colors.gray400 }}>
                                                {t('sending_indicator') || 'Sending...'}
                                            </Text>
                                        );
                                    }
                                    if (item.last_message.sync_status === 'failed') {
                                        return (
                                            <Text style={{ color: '#FF3B30' }}>
                                                ⚠️ {t('send_failed') || 'Failed to send'}
                                            </Text>
                                        );
                                    }
                                    
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
                headerShadowVisible: false,
                headerRight: () => filteredConversations.length > 0 ? (
                    <View style={{ marginRight: 4 }}>
                        <TouchableOpacity style={{ backgroundColor: 'transparent', padding: 4 }} onPress={() => { setIsEditing(!isEditing); setSelectedIds(new Set()); }} hitSlop={10}>
                            {isEditing ? (
                                <Text style={{ color: '#00A3FF', fontFamily: fonts.semibold, fontSize: 16 }}>
                                    {t('done_label') || 'Done'}
                                </Text>
                            ) : (
                                <Feather name="more-horizontal" size={24} color={colors.black} />
                            )}
                        </TouchableOpacity>
                    </View>
                ) : null
            }} />
            {content}
            
            {!isEditing && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: isDark ? '#262626' : colors.primary, bottom: Math.max(insets.bottom + spacing.md, 20) }]}
                    onPress={() => router.push('/friends/list')}
                    accessibilityLabel={t('start_new_message')}
                >
                    <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
            )}

            {isEditing && (
                <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <Text style={[styles.selectionText, { color: colors.black }]}>
                        {selectedIds.size > 0 
                            ? t('items_selected', { count: selectedIds.size }) || `${selectedIds.size} selected`
                            : t('none_selected') || 'None selected'}
                    </Text>
                    <TouchableOpacity 
                        style={[styles.clearBtn, { opacity: (clearing || selectedIds.size === 0) ? 0.5 : 1 }]}
                        onPress={handleClearSelected}
                        disabled={clearing || selectedIds.size === 0}
                    >
                        {clearing ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.clearBtnText}>
                                {t('delete_label') || 'Delete'} {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
            
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
    fab: {
        position: 'absolute',
        right: 16,
        borderRadius: 28,
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: 16,
        borderTopWidth: 0.5,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    selectionText: { fontFamily: fonts.semibold, fontSize: 16 },
    clearBtn: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    clearBtnText: {
        color: '#FFF',
        fontFamily: fonts.bold,
        fontSize: 14,
    }
});
