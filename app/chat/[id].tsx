import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getMessages, sendMessage, getConversation, markConversationRead } from '../../src/api/messages';
import { uploadMultipleMedia } from '../../src/api/upload';
import { markReadByReference } from '../../src/api/notifications';
import { useNotifications } from '../../src/context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/api/supabase';
import ShadowLoader from '../../src/components/ShadowLoader';

export default function ChatScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user, onlineUsers } = useAuth();
    const { refreshUnreadCount } = useNotifications();
    const [messages, setMessages] = useState<any[]>([]);
    const [conversation, setConversation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [peerTyping, setPeerTyping] = useState(false);
    const typingTimeoutRef = useRef<any>(null);
    const flatListRef = useRef<FlatList>(null);
    const channelRef = useRef<any>(null);
    const insets = useSafeAreaInsets();

    const loadMessages = async () => {
        try {
            const res = await getMessages(id as string);
            if (res?.data) {
                setMessages(res.data.reverse());
            }
        } catch (e) {
            console.log('Error loading messages', e);
        }
    };

    const loadConversation = async () => {
        try {
            const res = await getConversation(id as string);
            if (res?.data) setConversation(res.data);
        } catch (e) {
            console.log('Error loading conversation', e);
        }
    };

    useEffect(() => {
        const init = async () => {
            await Promise.allSettled([loadConversation(), loadMessages()]);
            setLoading(false);

            try {
                await markReadByReference('message', id as string);
                await markConversationRead(id as string);
                refreshUnreadCount();
            } catch (e) {
                console.log('Failed to clear notifications', e);
            }
        };
        init();

        // ─── Realtime: Messages ───
        const channel = supabase
            .channel(`conversation:${id}`, {
                config: {
                    broadcast: { self: false } // We handle our own optimistic updates
                }
            })
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${id}`,
                },
                (payload) => {
                    console.log('Realtime: New message (DB Insert)', payload);
                    const newMessage = payload.new;
                    setMessages(prev => {
                        // Remove optimistic version
                        const filtered = prev.filter(m =>
                            !(m.isOptimistic && m.content === newMessage.content && m.sender_id === newMessage.sender_id)
                        );
                        if (filtered.find(m => m.id === newMessage.id)) return filtered;
                        return [...filtered, newMessage];
                    });
                    setTimeout(() => flatListRef.current?.scrollToEnd(), 200);

                    // Mark as read immediately if current chat
                    if (newMessage.sender_id !== user?.id) {
                        markReadByReference('message', id as string).then(() => refreshUnreadCount()).catch(() => { });
                    }
                }
            )
            .on(
                'broadcast',
                { event: 'typing' },
                (payload) => {
                    if (payload.payload.user_id !== user?.id) {
                        setPeerTyping(true);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 3000);
                    }
                }
            )
            .on(
                'broadcast',
                { event: 'read' },
                (payload) => {
                    if (payload.payload.user_id !== user?.id) {
                        setConversation((prev: any) => {
                            if (!prev) return prev;
                            return {
                                ...prev,
                                participants: prev.participants.map((p: any) =>
                                    p.user_id === payload.payload.user_id
                                        ? { ...p, last_read_at: new Date().toISOString() }
                                        : p
                                )
                            };
                        });
                    }
                }
            )
            .on(
                'broadcast',
                { event: 'new_msg' },
                (payload) => {
                    console.log('Realtime: New message (Broadcast)', payload);
                    const newMessage = payload.payload;
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMessage.id)) return prev;
                        // For broadcast, we set isOptimistic false because it's 'live' from peer
                        return [...prev, { ...newMessage, isOptimistic: false }];
                    });
                    setTimeout(() => flatListRef.current?.scrollToEnd(), 200);

                    // Mark as read immediately if current chat
                    if (newMessage.sender_id !== user?.id) {
                        try {
                            markReadByReference('message', id as string);
                            markConversationRead(id as string);
                            refreshUnreadCount();
                            channelRef.current?.send({
                                type: 'broadcast',
                                event: 'read',
                                payload: { user_id: user?.id }
                            });
                        } catch (e) { }
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime: Chat Broadcast/DB connected');
                }
            });

        channelRef.current = channel;

        const syncRead = async () => {
            try {
                await markConversationRead(id as string);
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'read',
                    payload: { user_id: user?.id }
                });
            } catch (e) { }
        };

        const interval = setInterval(() => {
            loadMessages();
            loadConversation();
        }, 10000);

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, [id]);

    const pickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setMediaUri(result.assets[0].uri);
        }
    };

    const handleSend = async () => {
        if ((!input.trim() && !mediaUri) || sending) return;

        const content = input.trim();
        const media = mediaUri;
        const tempId = Date.now().toString();

        const optimisticMessage = {
            id: tempId,
            content: content,
            sender_id: user?.id,
            media_url: media,
            media_type: media?.endsWith('.mp4') ? 'video' : 'image',
            created_at: new Date().toISOString(),
            isOptimistic: true,
            media_url_local: media,
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setInput('');
        setMediaUri(null);
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

        // Broadcast to Peer
        channelRef.current?.send({
            type: 'broadcast',
            event: 'new_msg',
            payload: {
                ...optimisticMessage,
                profiles: { name: user?.name, avatar_url: user?.profile?.university_id } // placeholder mapping
            }
        });

        setSending(true);
        try {
            let uploadedUrl;
            let mediaType;
            if (media) {
                const isVideo = media.endsWith('.mp4') || media.endsWith('.mov');
                const uploadRes = await uploadMultipleMedia([{ uri: media, type: isVideo ? 'video' : 'image' }]);
                if (uploadRes && uploadRes.length > 0) {
                    uploadedUrl = uploadRes[0].url;
                    mediaType = isVideo ? 'video' : 'image';
                }
            }
            const res = await sendMessage(id as string, content, uploadedUrl, mediaType);
            if (res?.data) {
                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, ...res.data, isOptimistic: false } : m));
            }
        } catch (e) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            console.log('Error sending message', e);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return <ShadowLoader type="chat" />;
    }

    const otherParticipant = conversation?.participants?.find((p: any) => p.user_id !== user?.id);
    const isOnline = otherParticipant && onlineUsers.includes(otherParticipant.user_id);
    const displayName = conversation?.type === 'direct' ? (otherParticipant?.profiles?.name || 'User') : conversation?.name || 'Group';

    const getLastSeenText = (lastSeen: string | null) => {
        if (isOnline) return 'Online';
        if (!lastSeen) return 'Offline';
        const date = new Date(lastSeen);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 3) return 'Online';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const handleInputChange = (text: string) => {
        setInput(text);
        if (text.length > 0) {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: user?.id }
            });
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: () => (
                    <TouchableOpacity
                        onPress={() => conversation?.type === 'direct' && otherParticipant?.user_id && router.push(`/user/${otherParticipant.user_id}`)}
                        activeOpacity={0.7}
                        style={{ alignItems: 'center' }}
                    >
                        <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.black }}>{displayName}</Text>
                        {conversation?.type === 'direct' && (
                            <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: isOnline ? '#34C759' : colors.gray500 }}>
                                {getLastSeenText(otherParticipant?.profiles?.last_seen_at)}
                            </Text>
                        )}
                    </TouchableOpacity>
                ),
                headerBackTitle: '',
                headerTintColor: colors.black,
            }} />

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => {
                    const isMine = item.sender_id === user?.id;
                    return (
                        <View style={[styles.bubbleWrap, isMine ? styles.myBubbleWrap : styles.theirBubbleWrap]}>
                            <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                                {!isMine && conversation?.type === 'group' && (
                                    <TouchableOpacity onPress={() => item.sender_id && router.push(`/user/${item.sender_id}`)}>
                                        <Text style={styles.senderName}>{item.profiles?.name}</Text>
                                    </TouchableOpacity>
                                )}

                                {item.media_url && (
                                    item.media_type === 'video' ? (
                                        <View style={styles.mediaPlaceholder}>
                                            <Ionicons name="play-circle" size={48} color={colors.white} />
                                        </View>
                                    ) : (
                                        <Image source={{ uri: item.media_url_local || item.media_url }} style={styles.attachedMedia} />
                                    )
                                )}

                                {!!item.content && (
                                    <Text style={[styles.messageText, isMine && styles.myText]}>{item.content}</Text>
                                )}

                                <View style={styles.timestampRow}>
                                    <Text style={[styles.timestamp, isMine && styles.myTimestamp]}>
                                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    {item.isOptimistic ? (
                                        <Ionicons
                                            name="time-outline"
                                            size={10}
                                            color={isMine ? 'rgba(255,255,255,0.6)' : colors.gray400}
                                            style={{ marginLeft: 4 }}
                                        />
                                    ) : (
                                        isMine && otherParticipant?.last_read_at && new Date(item.created_at) <= new Date(otherParticipant.last_read_at) && (
                                            <Ionicons
                                                name="checkmark-done"
                                                size={12}
                                                color="rgba(255,255,255,0.8)"
                                                style={{ marginLeft: 4 }}
                                            />
                                        )
                                    )}
                                </View>
                            </View>
                        </View>
                    );
                }}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                showsVerticalScrollIndicator={false}
            />

            {mediaUri && (
                <View style={styles.mediaPreviewContainer}>
                    <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />
                    <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setMediaUri(null)}>
                        <Ionicons name="close-circle" size={24} color={colors.white} />
                    </TouchableOpacity>
                </View>
            )}
            {peerTyping && (
                <View style={styles.typingWrap}>
                    <Text style={styles.typingText}>{displayName} is typing...</Text>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                    <TouchableOpacity onPress={pickMedia} style={styles.attachBtn}>
                        <Ionicons name="camera-outline" size={24} color={colors.gray500} />
                    </TouchableOpacity>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, { maxHeight: 120 }]}
                            placeholder="Message..."
                            value={input}
                            onChangeText={handleInputChange}
                            multiline
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.sendBtn, !input.trim() && !mediaUri && styles.sendBtnDisabled]}
                        onPress={handleSend}
                    >
                        <Ionicons name="arrow-up" size={20} color={colors.white} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    listContent: { paddingHorizontal: 16, paddingVertical: 12 },

    bubbleWrap: { marginVertical: 4, flexDirection: 'row' },
    myBubbleWrap: { justifyContent: 'flex-end' },
    theirBubbleWrap: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '85%', padding: 12, borderRadius: 20 },
    myBubble: { backgroundColor: colors.black, borderBottomRightRadius: 4 },
    theirBubble: { backgroundColor: colors.white, borderBottomLeftRadius: 4, borderWidth: 0.5, borderColor: colors.gray100 },
    messageText: { fontFamily: fonts.regular, fontSize: 15, color: colors.black, lineHeight: 21 },
    myText: { color: colors.white },
    senderName: { fontFamily: fonts.bold, fontSize: 11, color: colors.gray500, marginBottom: 4 },
    timestampRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4 },
    timestamp: { fontFamily: fonts.regular, fontSize: 10, color: colors.gray400 },
    myTimestamp: { color: 'rgba(255,255,255,0.7)' },
    attachedMedia: { width: 240, height: 180, borderRadius: 12, marginBottom: 8 },
    mediaPlaceholder: { width: 240, height: 180, borderRadius: 12, marginBottom: 8, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },

    typingWrap: { paddingHorizontal: 20, paddingVertical: 8 },
    typingText: { fontFamily: fonts.medium, fontSize: 12, color: colors.gray500, fontStyle: 'italic' },

    mediaPreviewContainer: {
        padding: 10,
        backgroundColor: colors.white,
        borderTopWidth: 0.5,
        borderTopColor: colors.gray200,
        flexDirection: 'row',
    },
    mediaPreview: {
        width: 80,
        height: 80,
        borderRadius: radii.sm,
    },
    removeMediaBtn: {
        position: 'absolute',
        top: 2,
        left: 70,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
    },

    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        backgroundColor: colors.white,
        borderTopWidth: 0.5,
        borderTopColor: colors.gray200,
        gap: 8,
    },
    attachBtn: { height: 40, width: 40, justifyContent: 'center', alignItems: 'center' },
    inputContainer: {
        flex: 1,
        backgroundColor: colors.gray100,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 40,
        justifyContent: 'center',
    },
    input: { fontFamily: fonts.regular, fontSize: 15, color: colors.black, padding: 0 },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    sendBtnDisabled: { backgroundColor: colors.gray200 },
});
