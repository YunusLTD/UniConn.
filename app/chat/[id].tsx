import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image, Modal, Clipboard, PanResponder, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getMessages, sendMessage, getConversation, markConversationRead, deleteMessage } from '../../src/api/messages';
import { uploadMultipleMedia } from '../../src/api/upload';
import { markReadByReference } from '../../src/api/notifications';
import { useNotifications } from '../../src/context/NotificationContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/api/supabase';
import ShadowLoader from '../../src/components/ShadowLoader';
import ActionModal from '../../src/components/ActionModal';
import { getCommunityMembers } from '../../src/api/communities';

const SwipeableMessage = ({ children, onSwipe }: any) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const hapticTriggered = useRef(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponderCapture: (_, gesture) => {
                return Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
            },
            onPanResponderMove: (_, gesture) => {
                if (gesture.dx > 0) {
                    translateX.setValue(Math.min(gesture.dx, 80));
                    opacity.setValue(Math.min(gesture.dx / 40, 1));

                    if (gesture.dx > 40 && !hapticTriggered.current) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        hapticTriggered.current = true;
                    } else if (gesture.dx <= 40) {
                        hapticTriggered.current = false;
                    }
                }
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx > 40) {
                    onSwipe();
                }
                hapticTriggered.current = false;
                Animated.parallel([
                    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 50, friction: 7 }),
                    Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true })
                ]).start();
            },
            onPanResponderTerminate: () => {
                hapticTriggered.current = false;
                Animated.parallel([
                    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true })
                ]).start();
            },
        })
    ).current;

    return (
        <View style={{ flex: 1, position: 'relative' }}>
            <Animated.View style={[styles.swipeIndicator, { opacity, transform: [{ translateX: Animated.subtract(translateX, 40) }] }]}>
                <Ionicons name="return-up-back-outline" size={20} color={colors.gray500} />
            </Animated.View>
            <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
                {children}
            </Animated.View>
        </View>
    );
};

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
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [peerTyping, setPeerTyping] = useState(false);
    const [replyTo, setReplyTo] = useState<any>(null);
    const [taggingSearch, setTaggingSearch] = useState<string | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [showingActions, setShowingActions] = useState<any>(null);
    const typingTimeoutRef = useRef<any>(null);
    const flatListRef = useRef<FlatList>(null);
    const textInputRef = useRef<TextInput>(null);
    const channelRef = useRef<any>(null);
    const insets = useSafeAreaInsets();

    const loadMessages = async (convId: string) => {
        try {
            const res = await getMessages(convId);
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
            if (res?.data) {
                setConversation(res.data);
                
                // If the ID we requested was different from the conversation ID (e.g. it was a userId)
                // we should load messages for the actual conversation ID now
                const realId = res.data.id;
                if (realId !== id) {
                    await loadMessages(realId);
                } else {
                    await loadMessages(id as string);
                }

                // If this is a community chat, load members for tagging
                const communityId = res.data.communities?.[0]?.id || res.data.community_id;
                if (communityId) {
                    const membersRes = await getCommunityMembers(communityId);
                    if (membersRes?.data) setMembers(membersRes.data);
                }
            }
        } catch (e) {
            console.log('Error loading conversation', e);
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            await loadConversation();
            setLoading(false);

            try {
                // ... notifications logic ...
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
                    const newMessage = payload.new;
                    if (newMessage.sender_id === user?.id) return;
                    
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMessage.id)) return prev;
                        if (!newMessage.profiles) {
                            const member = members.find(m => m.user_id === newMessage.sender_id);
                            if (member) newMessage.profiles = member.profiles;
                        }
                        if (newMessage.reply_to_message_id && !newMessage.reply_to) {
                            const original = prev.find(m => m.id === newMessage.reply_to_message_id);
                            if (original) newMessage.reply_to = original;
                        }
                        return [...prev, newMessage];
                    });
                    setTimeout(() => flatListRef.current?.scrollToEnd(), 200);

                    if (newMessage.sender_id !== user?.id) {
                        markReadByReference('message', id as string).then(() => refreshUnreadCount()).catch(() => { });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${id}`,
                },
                (payload) => {
                    const updatedMessage = payload.new;
                    setMessages(prev => prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m));
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
            if (conversation?.id) {
                loadMessages(conversation.id);
                loadConversation();
            }
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
            reply_to: replyTo,
            profiles: { name: user?.name, avatar_url: user?.profile?.avatar_url },
            media_url_local: media,
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setInput('');
        setMediaUri(null);
        setReplyTo(null); // Clear reply state immediately after building optimistic message
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

        // Broadcast to Peer
        channelRef.current?.send({
            type: 'broadcast',
            event: 'new_msg',
            payload: optimisticMessage
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
            const res = await sendMessage(id as string, content, uploadedUrl, mediaType, replyTo?.id);
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

    const handleDeleteMessage = async (messageId: string) => {
        try {
            // Optimistic update
            setMessages(prev => prev.map(m => 
                m.id === messageId 
                    ? { ...m, deleted_at: new Date().toISOString(), content: 'This message was deleted', media_url: null } 
                    : m
            ));
            setShowingActions(null);
            
            await deleteMessage(messageId);
        } catch (e) {
            console.log('Error deleting message', e);
            alert('Failed to delete message');
            // Revert on error? Or just reload
            loadMessages(conversation?.id || id as string);
        }
    };

    const handleInputChange = (text: string) => {
        setInput(text);
        
        // Tagging logic
        const lastWord = text.split(' ').pop();
        if (lastWord?.startsWith('@')) {
            setTaggingSearch(lastWord.substring(1));
        } else {
            setTaggingSearch(null);
        }

        if (text.length > 0) {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: user?.id }
            });
        }
    };

    const handleSelectTag = (username: string) => {
        const words = input.split(' ');
        words[words.length - 1] = '@' + username + ' ';
        setInput(words.join(' '));
        setTaggingSearch(null);
        setTimeout(() => textInputRef.current?.focus(), 50);
    };

    const filteredMembers = useMemo(() => {
        if (taggingSearch === null) return [];
        
        // Combine community members and conversation participants for tagging
        const participantSuggestions = conversation?.participants?.map((p: any) => ({
            user_id: p.user_id,
            profiles: p.profiles
        })) || [];
        
        const combined = [...participantSuggestions, ...members];
        
        // Deduplicate by user_id
        const unique = Array.from(new Map(combined.map(item => [item.profiles?.username || item.user_id, item])).values());
        
        return unique.filter((m: any) => {
            const matchesSearch = 
                m.profiles?.username?.toLowerCase().includes(taggingSearch.toLowerCase()) ||
                m.profiles?.name?.toLowerCase().includes(taggingSearch.toLowerCase());
            return matchesSearch && m.user_id !== user?.id;
        });
    }, [taggingSearch, members, conversation?.participants, user?.id]);

    const otherParticipant = conversation?.participants?.find((p: any) => p.user_id !== user?.id);
    const isOnline = otherParticipant && onlineUsers.includes(otherParticipant.user_id);
    const rawDisplayName = conversation?.type === 'direct' ? (otherParticipant?.profiles?.name || 'User') : conversation?.name || 'Group';
    const displayName = rawDisplayName.replace(/Community/gi, '').replace(/University/gi, '').trim();

    if (loading) {
        return <ShadowLoader type="chat" />;
    }

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

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: () => (
                    <TouchableOpacity
                        onPress={() => conversation?.type === 'direct' && otherParticipant?.user_id && router.push(`/user/${otherParticipant.user_id}`)}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                        {(() => {
                            const avatarUrl = conversation?.type === 'direct' ? otherParticipant?.profiles?.avatar_url : (conversation?.communities?.[0]?.logo_url || conversation?.communities?.[0]?.image_url);
                            if (avatarUrl) {
                                return <Image source={{ uri: avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} />;
                            }
                            const initials = (() => {
                                const parts = displayName.split(' ').filter((p: string) => p.length > 0);
                                if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                                return displayName.substring(0, 2).toUpperCase();
                            })();
                            return (
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.black, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: colors.white, fontSize: 13, fontFamily: fonts.bold }}>{initials}</Text>
                                </View>
                            );
                        })()}
                        <View style={{ alignItems: 'flex-start' }}>
                            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.black }} numberOfLines={1}>{displayName}</Text>
                            {conversation?.type === 'direct' && (
                                <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: isOnline ? '#34C759' : colors.gray500 }}>
                                    {getLastSeenText(otherParticipant?.profiles?.last_seen_at)}
                                </Text>
                            )}
                        </View>
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
                    const isDeleted = !!item.deleted_at;
                    const isMine = item.sender_id === user?.id;
                    const isReply = !!(item.reply_to && item.reply_to.id);
                    
                    const handleLongPress = () => {
                        if (isDeleted) return; // Can't act on deleted messages
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        setShowingActions(item);
                    };

                    const handleReply = (msg: any) => {
                        if (msg.deleted_at) return;
                        setReplyTo(msg);
                        setTimeout(() => textInputRef.current?.focus(), 100);
                    };

                    const renderContent = (content: string, isMine: boolean, isDeleted: boolean) => {
                        if (isDeleted) {
                            return <Text style={styles.deletedText}>This message was deleted</Text>;
                        }
                        if (!content) return null;
                        const parts = content.split(/(@\w+)/g);
                        return parts.map((part, i) => {
                            if (part.startsWith('@')) {
                                const username = part.substring(1);
                                return (
                                    <Text 
                                        key={i} 
                                        style={[styles.mention, isMine && styles.myMention]}
                                        onPress={() => router.push(`/user/${username}`)}
                                    >
                                        {part}
                                    </Text>
                                );
                            }
                            return <Text key={i}>{part}</Text>;
                        });
                    };

                    return (
                        <SwipeableMessage onSwipe={() => !isDeleted && handleReply(item)}>
                            <View style={[styles.bubbleWrap, isMine ? styles.myBubbleWrap : styles.theirBubbleWrap]}>
                                <TouchableOpacity 
                                    onLongPress={handleLongPress}
                                    delayLongPress={400}
                                    activeOpacity={isDeleted ? 1 : 0.9}
                                    style={[
                                        styles.bubble, 
                                        isMine ? styles.myBubble : styles.theirBubble,
                                        isDeleted && styles.deletedBubble
                                    ]}
                                >
                                {!isMine && conversation?.type === 'group' && (
                                    <TouchableOpacity onPress={() => !isDeleted && item.sender_id && router.push(`/user/${item.sender_id}`)}>
                                        <Text style={styles.senderName}>{item.profiles?.name}</Text>
                                    </TouchableOpacity>
                                )}

                                {isReply && item.reply_to && (
                                    <View style={[styles.replyPreview, isMine ? styles.myReplyPreview : styles.theirReplyPreview]}>
                                        <Text style={styles.replyName} numberOfLines={1}>{item.reply_to.profiles?.name || 'User'}</Text>
                                        <Text style={styles.replyText} numberOfLines={2}>{item.reply_to.content || (item.reply_to.media_url ? '📷 Media' : '')}</Text>
                                    </View>
                                )}

                                {item.media_url && (
                                    item.media_type === 'video' ? (
                                        <View style={styles.mediaPlaceholder}>
                                            <Ionicons name="play-circle" size={48} color={colors.white} />
                                        </View>
                                    ) : (
                                        <TouchableOpacity onPress={() => setPreviewImage(item.media_url_local || item.media_url)} activeOpacity={0.9}>
                                            <Image 
                                                source={{ uri: item.media_url_local || item.media_url, cache: 'force-cache' }} 
                                                style={styles.attachedMedia} 
                                            />
                                        </TouchableOpacity>
                                    )
                                )}

                                {!!(item.content || isDeleted) && (
                                    <Text style={[styles.messageText, isMine && styles.myText, isDeleted && styles.deletedText]}>
                                        {renderContent(item.content, isMine, isDeleted)}
                                    </Text>
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
                            </TouchableOpacity>
                        </View>
                        </SwipeableMessage>
                    );
                }}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
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
                {taggingSearch !== null && filteredMembers.length > 0 && (
                    <View style={styles.taggingList} key="tagging-list-container">
                        <FlatList
                            data={filteredMembers}
                            keyExtractor={m => m.profiles?.username || m.user_id}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.memberTag} 
                                    onPress={() => item.profiles?.username && handleSelectTag(item.profiles.username)}
                                    activeOpacity={0.7}
                                >
                                    {item.profiles?.avatar_url ? (
                                        <Image source={{ uri: item.profiles.avatar_url }} style={styles.tagAvatar} />
                                    ) : (
                                        <View style={[styles.tagAvatar, { backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' }]}>
                                            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.gray600 }}>
                                                {(() => {
                                                    const name = item.profiles?.name || item.profiles?.username || '?';
                                                    const parts = name.split(' ').filter((p: string) => p.length > 0);
                                                    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                                                    return name.substring(0, 2).toUpperCase();
                                                })()}
                                            </Text>
                                        </View>
                                    )}
                                    <View>
                                        <Text style={styles.tagName}>{item.profiles?.name || 'User'}</Text>
                                        <Text style={styles.tagUsername}>@{item.profiles?.username || 'user'}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            keyboardShouldPersistTaps="always"
                        />
                    </View>
                )}

                {replyTo && (
                    <View style={styles.replyBar} key={replyTo.id}>
                        <View style={styles.replyBarContent}>
                            <View style={styles.replyIndicator} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.replyName}>{replyTo.profiles?.name || 'User'}</Text>
                                <Text style={styles.replyPreviewText} numberOfLines={1}>
                                    {replyTo.content || (replyTo.media_url ? '📷 Media' : '')}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={10}>
                            <Ionicons name="close-circle" size={20} color={colors.gray400} />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                    <TouchableOpacity onPress={pickMedia} style={styles.attachBtn}>
                        <Ionicons name="camera-outline" size={24} color={colors.gray500} />
                    </TouchableOpacity>
                    <View style={styles.inputContainer}>
                        <TextInput
                            ref={textInputRef}
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

            {/* Image Preview Modal */}
            <Modal visible={!!previewImage} transparent={true} animationType="fade">
                <View style={styles.modalBg}>
                    <TouchableOpacity style={styles.closePreview} onPress={() => setPreviewImage(null)}>
                        <Ionicons name="close" size={30} color={colors.white} />
                    </TouchableOpacity>
                    {previewImage && (
                        <Image 
                            source={{ uri: previewImage, cache: 'force-cache' }} 
                            style={styles.fullImage} 
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            <ActionModal
                visible={!!showingActions}
                onClose={() => setShowingActions(null)}
                options={[
                    { label: 'Reply', icon: 'return-up-back-outline', onPress: () => { 
                        setReplyTo(showingActions); 
                        setShowingActions(null); 
                        setTimeout(() => textInputRef.current?.focus(), 100);
                    } },
                    { label: 'Copy Text', icon: 'copy-outline', onPress: () => { if(showingActions.content) Clipboard.setString(showingActions.content); setShowingActions(null); } },
                    ...(showingActions?.sender_id === user?.id ? [
                        { label: 'Delete Message', icon: 'trash-outline', destructive: true, onPress: () => handleDeleteMessage(showingActions.id) }
                    ] : []),
                ]}
                title="Message Options"
            />
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
    deletedText: { fontStyle: 'italic', color: colors.gray400 },
    deletedBubble: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.gray200 },
    mention: { color: '#00A3FF', fontFamily: fonts.bold },
    myMention: { color: colors.white, fontFamily: fonts.bold },
    senderName: { fontFamily: fonts.bold, fontSize: 11, color: colors.gray500, marginBottom: 4 },
    timestampRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4 },
    timestamp: { fontFamily: fonts.regular, fontSize: 10, color: colors.gray400 },
    myTimestamp: { color: 'rgba(255,255,255,0.7)' },
    attachedMedia: { width: 240, height: 180, borderRadius: 12, marginBottom: 8 },
    mediaPlaceholder: { width: 240, height: 180, borderRadius: 12, marginBottom: 8, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },

    replyPreview: { 
        paddingLeft: 8, 
        borderLeftWidth: 3, 
        borderLeftColor: '#00A3FF', 
        backgroundColor: 'rgba(0,0,0,0.05)', 
        borderRadius: 4, 
        marginBottom: 8,
        paddingVertical: 4
    },
    myReplyPreview: { backgroundColor: 'rgba(255,255,255,0.1)', borderLeftColor: colors.white },
    theirReplyPreview: { backgroundColor: colors.gray50, borderLeftColor: colors.black },
    replyName: { fontFamily: fonts.bold, fontSize: 12, color: '#00A3FF' },
    replyText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500 },

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

    replyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: colors.white,
        borderTopWidth: 0.5,
        borderTopColor: colors.gray100,
        gap: 12
    },
    replyBarContent: { flex: 1, flexDirection: 'row', gap: 10 },
    replyIndicator: { width: 4, backgroundColor: '#00A3FF', borderRadius: 2 },
    replyPreviewText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500 },

    taggingList: {
        maxHeight: 200,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.gray100
    },
    memberTag: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray50
    },
    tagAvatar: { width: 32, height: 32, borderRadius: 16 },
    tagName: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
    tagUsername: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400 },

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
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    closePreview: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
    fullImage: { width: '100%', height: '80%' },
    swipeIndicator: {
        position: 'absolute',
        top: '50%',
        left: 20,
        marginTop: -10,
        zIndex: -1,
    },
});
