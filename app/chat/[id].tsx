import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image, Modal, Clipboard, PanResponder, Animated, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { spacing, fonts, radii, colors } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getMessages, sendMessage, getConversation, markConversationRead, deleteMessage } from '../../src/api/messages';
import { uploadMultipleMedia } from '../../src/api/upload';
import { markReadByReference } from '../../src/api/notifications';
import { useNotifications } from '../../src/context/NotificationContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/api/supabase';
import ShadowLoader from '../../src/components/ShadowLoader';
import { useLanguage } from '../../src/context/LanguageContext';
// ActionModal replaced with inline contextual popup
import { getCommunityMembers } from '../../src/api/communities';
import SharedPostCard from '../../src/components/SharedPostCard';
import { useVideoPlayer, VideoView } from 'expo-video';

const VideoPreview = ({ uri, onLoading }: { uri: string, onLoading: (loading: boolean) => void }) => {
    const player = useVideoPlayer(uri, p => {
        p.loop = true;
        p.play();
    });

    useEffect(() => {
        onLoading(true);
        const sub = player.addListener('statusChange', (status) => {
            if (status === 'readyToPlay') {
                onLoading(false);
            }
        });
        return () => sub.remove();
    }, [player]);

    return (
        <VideoView 
            player={player} 
            style={{ width: '100%', height: '80%' }} 
            contentMode="contain"
        />
    );
};

const SwipeableMessage = ({ children, onSwipe }: any) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const hapticTriggered = useRef(false);

    const { colors, isDark } = useTheme();

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
                if (gesture.dx > 30 || (gesture.dx > 10 && gesture.vx > 0.5)) {
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

const MessageItem = React.memo(({
    item,
    user,
    colors,
    isDark,
    fonts,
    onLongPress,
    onReply,
    otherParticipant,
    conversation,
    isDissolving,
    dissolveAnim,
    router,
    setPreviewMedia,
    isHidden
}: any) => {
    const bubbleRef = useRef<View>(null);
    const isMine = item.sender_id === user?.id;
    const isReply = !!(item.reply_to && item.reply_to.id);

    const handleLongPress = () => {
        if (bubbleRef.current) {
            bubbleRef.current.measureInWindow((x, y, width, height) => {
                // Return screen-relative coordinates for the popup
                onLongPress(item, { left: x, top: y, width, height });
            });
        }
    };

    const renderContent = (content: string, isMine: boolean) => {
        if (!content) return null;
        const parts = content.split(/(@\w+)/g);
        return parts.map((part: string, i: number) => {
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
        <SwipeableMessage onSwipe={() => onReply(item)}>
            <Animated.View style={[styles.bubbleWrap, isMine ? styles.myBubbleWrap : styles.theirBubbleWrap,
            isHidden && { opacity: 0 },
            isDissolving && {
                opacity: dissolveAnim,
                transform: [
                    { scale: dissolveAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                    { translateY: dissolveAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) },
                ],
            },
            ]}>
                <TouchableOpacity
                    ref={bubbleRef}
                    onLongPress={handleLongPress}
                    delayLongPress={400}
                    activeOpacity={0.9}
                    style={[
                        styles.bubble,
                        isMine ? { backgroundColor: isDark ? '#A154F2' : '#00A3FF', borderBottomRightRadius: 4 } : { backgroundColor: colors.white, borderBottomLeftRadius: 4, borderWidth: 0.5, borderColor: colors.border },
                    ]}
                >
                    {!isMine && conversation?.type === 'group' && (
                        <TouchableOpacity onPress={() => item.sender_id && router.push(`/user/${item.sender_id}`)}>
                            <Text style={[styles.senderName, { color: colors.gray500 }]}>{item.profiles?.name}</Text>
                        </TouchableOpacity>
                    )}

                    {isReply && item.reply_to && (
                        <View style={[styles.replyPreview, isMine ? { backgroundColor: 'rgba(255,255,255,0.1)', borderLeftColor: '#FFFFFF' } : { backgroundColor: isDark ? '#1A1A1A' : colors.gray50, borderLeftColor: colors.black }]}>
                            <Text style={[styles.replyName, { color: isMine ? '#A5F3FC' : (isDark ? '#3AB2FF' : '#00A3FF') }]} numberOfLines={1}>{item.reply_to.profiles?.name || 'User'}</Text>
                            <Text style={[styles.replyText, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.gray500 }]} numberOfLines={2}>{item.reply_to.content || (item.reply_to.media_url ? '📷 Media' : '')}</Text>
                        </View>
                    )}

                    {item.media_url && (
                         item.media_type === 'video' ? (
                            <TouchableOpacity onPress={() => setPreviewMedia({ uri: item.media_url_local || item.media_url, type: 'video' })} activeOpacity={0.9}>
                                <View style={styles.mediaPlaceholder}>
                                    <Ionicons name="play-circle" size={48} color={colors.white} />
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => setPreviewMedia({ uri: item.media_url_local || item.media_url, type: 'image' })} activeOpacity={0.9}>
                                <Image
                                    source={{ uri: item.media_url_local || item.media_url, cache: 'force-cache' }}
                                    style={styles.attachedMedia}
                                />
                            </TouchableOpacity>
                        )
                    )}

                    {(() => {
                        const postLinkMatch = item.content?.match(/https:\/\/uni-platform.app\/post\/([0-9a-fA-F-]{36})/);
                        if (postLinkMatch) {
                            const postId = postLinkMatch[1];
                            return <SharedPostCard postId={postId} isMine={isMine} />;
                        }
                        return null;
                    })()}

                    {(() => {
                        if (!item.content) return null;
                        const hasPostShare = item.content.includes('https://uni-platform.app/post/');
                        const isAutoShare = hasPostShare && item.content.startsWith('Check out this post:');

                        if (isAutoShare) return null;

                        let displayContent = item.content;
                        if (hasPostShare) {
                            displayContent = displayContent.replace(/https:\/\/uni-platform.app\/post\/([0-9a-fA-F-]{36})/, '').trim();
                        }

                        if (!displayContent) return null;

                        return (
                            <Text style={[styles.messageText, { color: isMine ? '#FFFFFF' : colors.black }]}>
                                {renderContent(displayContent, isMine)}
                            </Text>
                        );
                    })()}

                    <View style={styles.timestampRow}>
                        <Text style={[styles.timestamp, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.gray400 }]}>
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
            </Animated.View>
        </SwipeableMessage>
    );
});

export default function ChatScreen() {
    const { id, title } = useLocalSearchParams();
    const router = useRouter();
    const { user, onlineUsers } = useAuth();
    const { refreshUnreadCount } = useNotifications();
    const [messages, setMessages] = useState<any[]>([]);
    const [conversation, setConversation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [previewMedia, setPreviewMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
    const [isMediaLoading, setIsMediaLoading] = useState(false);
    const [peerTyping, setPeerTyping] = useState(false);
    const [replyTo, setReplyTo] = useState<any>(null);
    const [taggingSearch, setTaggingSearch] = useState<string | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [showingActions, setShowingActions] = useState<any>(null);
    const [bubbleLayout, setBubbleLayout] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const deleteAnims = useRef<Map<string, Animated.Value>>(new Map()).current;
    const typingTimeoutRef = useRef<any>(null);
    const flatListRef = useRef<FlatList>(null);
    const textInputRef = useRef<TextInput>(null);
    const channelRef = useRef<any>(null);
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();

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
                
                return realId;
            }
        } catch (e) {
            console.log('Error loading conversation', e);
            setLoading(false);
        }
        return id as string;
    };

    useEffect(() => {
        const init = async () => {
            const realId = await loadConversation();
            setLoading(false);

            try {
                // ... notifications logic ...
                await markReadByReference('message', realId);
                await markConversationRead(realId);
                refreshUnreadCount();
            } catch (e) {
                console.log('Failed to clear notifications', e);
            }

            // ─── Realtime: Messages ───
            // MUST bind to realId, otherwise navigating by userId breaks subscriptions!
            const channel = supabase
                .channel(`conversation:${realId}`, {
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
                        filter: `conversation_id=eq.${realId}`,
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
                        // Connect reply_to manually if it's in our local state but not hydrated
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
                    filter: `conversation_id=eq.${realId}`,
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
                    const newMessage = payload.payload;
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMessage.id)) return prev;
                        return [...prev, { ...newMessage, isOptimistic: false }];
                    });
                    setTimeout(() => flatListRef.current?.scrollToEnd(), 200);

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
                    console.log('Realtime: Chat Broadcast/DB connected for', realId);
                }
            });

            channelRef.current = channel;
        };

        init();

        const syncRead = async () => {
            try {
                await markConversationRead(conversation?.id || id as string);
                if (channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'read',
                        payload: { user_id: user?.id }
                    });
                }
            } catch (e) { }
        };

        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const content = input.trim();
        const media = mediaUri;
        const isMedia = !!media;
        
        // Use a real UUID for both local state, broadcast and DB to ensure perfect sync
        const messageUUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        const optimisticMessage = {
            id: messageUUID,
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
        setReplyTo(null); 
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

        // Instant Broadcast to Peer for ultra-low latency
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'new_msg',
                payload: optimisticMessage
            });
        }

        if (isMedia) setSending(true);
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
            
            // Validate UUID syntax for replyTo.id.
            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            const validReplyId = (replyTo?.id && isUUID(replyTo.id)) ? replyTo.id : undefined;

            const res = await sendMessage(conversation?.id || (id as string), content, uploadedUrl, mediaType, validReplyId, messageUUID);
            if (res?.data) {
                setMessages(prev => prev.map(m => m.id === messageUUID ? { ...m, ...res.data, isOptimistic: false } : m));
            }
        } catch (e) {
            setMessages(prev => prev.filter(m => m.id !== messageUUID));
            console.log('Error sending message', e);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const getDeleteAnim = (msgId: string) => {
        if (!deleteAnims.has(msgId)) {
            deleteAnims.set(msgId, new Animated.Value(1));
        }
        return deleteAnims.get(msgId)!;
    };

    const handleDeleteMessage = async (messageId: string) => {
        setShowingActions(null);
        setBubbleLayout(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Start dust-dissolve animation
        const anim = getDeleteAnim(messageId);
        setDeletingIds(prev => new Set(prev).add(messageId));

        Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
        }).start(async () => {
            // Remove from local state after animation completes
            setMessages(prev => prev.filter(m => m.id !== messageId));
            setDeletingIds(prev => { const n = new Set(prev); n.delete(messageId); return n; });
            deleteAnims.delete(messageId);

            try {
                await deleteMessage(messageId);
            } catch (e) {
                console.log('Error deleting message', e);
                alert('Failed to delete message');
                loadMessages(conversation?.id || id as string);
            }
        });
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

        if (text.length > 0 && channelRef.current) {
            channelRef.current.send({
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
    const isPlatform = otherParticipant?.profiles?.is_admin || displayName === 'UniConn Platform';

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <Stack.Screen options={{
                    headerStyle: { backgroundColor: colors.background },
                    headerTitle: title ? title as string : '',
                    headerShown: true,
                    headerShadowVisible: false,
                    headerBackTitle: '',
                    headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
                    headerTintColor: colors.black,
                }} />
                <ShadowLoader type="chat" />
            </View>
        );
    }

    const getLastSeenText = (lastSeen: string | null) => {
        if (isOnline) return t('online');
        if (!lastSeen) return t('offline');
        const date = new Date(lastSeen);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 3) return t('online');
        if (mins < 60) return `${mins}${t('time_m')} ${t('time_ago')}`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}${t('time_h')} ${t('time_ago')}`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}${t('time_d')} ${t('time_ago')}`;
        return date.toLocaleDateString();
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                headerStyle: { backgroundColor: colors.background },
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
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: colors.black, fontSize: 13, fontFamily: fonts.bold }}>{initials}</Text>
                                </View>
                            );
                        })()}
                        <View style={{ alignItems: 'flex-start' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.black }} numberOfLines={1}>{displayName}</Text>
                                {isPlatform && (
                                    <MaterialCommunityIcons name="check-decagram" size={16} color="#00A3FF" />
                                )}
                            </View>
                            {conversation?.type === 'direct' && (
                                <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: isOnline ? '#34C759' : colors.gray500 }}>
                                    {isPlatform ? t('system_account') : getLastSeenText(otherParticipant?.profiles?.last_seen_at)}
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
                    if (item.deleted_at && !deletingIds.has(item.id)) return null;
                    return (
                        <MessageItem
                            item={item}
                            user={user}
                            colors={colors}
                            isDark={isDark}
                            fonts={fonts}
                            conversation={conversation}
                            otherParticipant={otherParticipant}
                            otherParticipantId={otherParticipant?.user_id}
                            onLongPress={(msg: any, layout: any) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setBubbleLayout(layout);
                                setShowingActions(msg);
                            }}
                            onReply={(msg: any) => {
                                setReplyTo(msg);
                                setTimeout(() => textInputRef.current?.focus(), 100);
                            }}
                            isDissolving={deletingIds.has(item.id)}
                            dissolveAnim={getDeleteAnim(item.id)}
                            router={router}
                            setPreviewMedia={setPreviewMedia}
                            isHidden={showingActions?.id === item.id}
                        />
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
                    <Text style={[styles.typingText, { color: colors.gray500 }]}>{displayName} {t('chat_typing')}</Text>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {taggingSearch !== null && filteredMembers.length > 0 && (
                    <View style={[styles.taggingList, { backgroundColor: colors.surface, borderTopColor: colors.border }]} key="tagging-list-container">
                        <FlatList
                            data={filteredMembers}
                            keyExtractor={m => m.profiles?.username || m.user_id}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={[styles.memberTag, { borderBottomColor: colors.border }]} 
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
                                        <Text style={[styles.tagName, { color: colors.black }]}>{item.profiles?.name || 'User'}</Text>
                                        <Text style={[styles.tagUsername, { color: colors.gray400 }]}>@{item.profiles?.username || 'user'}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            keyboardShouldPersistTaps="always"
                        />
                    </View>
                )}

                {replyTo && (
                    <View style={[styles.replyBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]} key={replyTo.id}>
                        <View style={styles.replyBarContent}>
                            <View style={styles.replyIndicator} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.replyName, { color: isDark ? '#3AB2FF' : '#00A3FF' }]}>{replyTo.profiles?.name || 'User'}</Text>
                                <Text style={[styles.replyPreviewText, { color: colors.gray500 }]} numberOfLines={1}>
                                    {replyTo.content || (replyTo.media_url ? '📷 Media' : '')}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={10}>
                            <Ionicons name="close-circle" size={20} color={colors.gray400} />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.md), backgroundColor: colors.background, borderTopColor: colors.border }]}>
                    {isPlatform ? (
                        <View style={{ flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }}>
                            <View style={styles.platformNotice}>
                                <Text style={styles.platformNoticeText}>{t('system_only_message')}</Text>
                            </View>
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity onPress={pickMedia} style={styles.attachBtn}>
                                <Ionicons name="camera-outline" size={24} color={colors.gray500} />
                            </TouchableOpacity>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1A1A1A' : colors.gray100 }]}>
                                <TextInput
                                    ref={textInputRef}
                                    style={[styles.input, { maxHeight: 120, color: colors.black }]}
                                    placeholder={t('chat_message_placeholder')}
                                    placeholderTextColor={colors.gray400}
                                    value={input}
                                    onChangeText={handleInputChange}
                                    multiline
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.sendBtn, { backgroundColor: colors.black }, (!input.trim() && !mediaUri) && { backgroundColor: isDark ? '#262626' : colors.gray200 }]}
                                onPress={handleSend}
                                disabled={!input.trim() && !mediaUri || sending}
                            >
                                <Ionicons name="arrow-up" size={20} color={colors.white} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* Media Preview Modal */}
            <Modal visible={!!previewMedia} transparent={true} animationType="fade">
                <View style={styles.modalBg}>
                    <TouchableOpacity 
                        style={styles.closePreview} 
                        onPress={() => {
                            setPreviewMedia(null);
                            setIsMediaLoading(false);
                        }}
                    >
                        <Ionicons name="close" size={30} color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    {isMediaLoading && (
                        <View style={StyleSheet.absoluteFill}>
                            <ActivityIndicator size="large" color="#FFFFFF" style={{ flex: 1 }} />
                        </View>
                    )}

                    {previewMedia && (
                        previewMedia.type === 'video' ? (
                            <VideoPreview 
                                uri={previewMedia.uri} 
                                onLoading={(l: boolean) => setIsMediaLoading(l)} 
                            />
                        ) : (
                            <Image 
                                source={{ uri: previewMedia.uri, cache: 'force-cache' }} 
                                style={styles.fullImage} 
                                resizeMode="contain"
                                onLoadStart={() => setIsMediaLoading(true)}
                                onLoadEnd={() => setIsMediaLoading(false)}
                            />
                        )
                    )}
                </View>
            </Modal>

            <Modal visible={!!showingActions} transparent animationType="fade" onRequestClose={() => { setShowingActions(null); setBubbleLayout(null); }}>
                {/* Full screen container */}
                <View style={{ flex: 1 }}>
                    {/* Dark overlay - blurs all other messages */}
                    <TouchableOpacity 
                        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} 
                        activeOpacity={1} 
                        onPress={() => { setShowingActions(null); setBubbleLayout(null); }}
                    />

                    {showingActions && bubbleLayout && (() => {
                        const actIsMine = showingActions.sender_id === user?.id;
                        const screenH = Dimensions.get('window').height;
                        const menuItemCount = actIsMine ? 3 : 2;
                        const menuH = menuItemCount * 48 + 8;
                        const spaceBelow = screenH - (bubbleLayout.top + bubbleLayout.height);
                        const menuBelow = spaceBelow > menuH + 24;

                        return (
                            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                                {/* Selected message bubble clone at exact position */}
                                <View style={{
                                    position: 'absolute',
                                    top: bubbleLayout.top,
                                    left: bubbleLayout.left,
                                    width: bubbleLayout.width,
                                    height: bubbleLayout.height,
                                }}>
                                    <View style={[
                                        styles.bubble,
                                        { maxWidth: '100%' }, // Don't re-apply 85% restriction on the clone
                                        actIsMine
                                            ? { backgroundColor: isDark ? '#A154F2' : '#00A3FF', borderBottomRightRadius: 4, alignSelf: 'flex-end' }
                                            : { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 0.5, borderColor: colors.border, alignSelf: 'flex-start' },
                                    ]}>
                                        {/* Reply preview */}
                                        {showingActions.reply_to && (
                                            <View style={[styles.replyPreview, actIsMine ? { backgroundColor: 'rgba(255,255,255,0.1)', borderLeftColor: '#FFFFFF' } : { backgroundColor: isDark ? '#1A1A1A' : colors.gray50, borderLeftColor: colors.black }]}>
                                                <Text style={[styles.replyName, { color: actIsMine ? '#A5F3FC' : (isDark ? '#3AB2FF' : '#00A3FF') }]} numberOfLines={1}>{showingActions.reply_to.profiles?.name || 'User'}</Text>
                                                <Text style={[styles.replyText, { color: actIsMine ? 'rgba(255,255,255,0.7)' : colors.gray500 }]} numberOfLines={2}>{showingActions.reply_to.content || '📷 Media'}</Text>
                                            </View>
                                        )}

                                        {/* Media */}
                                        {showingActions.media_url && (
                                            showingActions.media_type === 'video' ? (
                                                <View style={styles.mediaPlaceholder}>
                                                    <Ionicons name="play-circle" size={48} color={colors.white} />
                                                </View>
                                            ) : (
                                                <Image source={{ uri: showingActions.media_url_local || showingActions.media_url }} style={styles.attachedMedia} />
                                            )
                                        )}

                                        {(() => {
                                            const postLinkMatch = showingActions.content?.match(/https:\/\/uni-platform.app\/post\/([0-9a-fA-F-]{36})/);
                                            if (postLinkMatch) {
                                                const postId = postLinkMatch[1];
                                                return <SharedPostCard postId={postId} isMine={actIsMine} />;
                                            }
                                            return null;
                                        })()}

                                        {/* Text content */}
                                        {(() => {
                                            if (!showingActions.content) return null;
                                            const hasPostShare = showingActions.content.includes('https://uni-platform.app/post/');
                                            const isAutoShare = hasPostShare && showingActions.content.startsWith('Check out this post:');
                                            
                                            if (isAutoShare) return null;
                                            
                                            let displayContent = showingActions.content;
                                            if (hasPostShare) {
                                                displayContent = displayContent.replace(/https:\/\/uni-platform.app\/post\/([0-9a-fA-F-]{36})/, '').trim();
                                            }
                                            
                                            if (!displayContent) return null;

                                            // Mentions rendering
                                            const parts = displayContent.split(/(@\w+)/g);
                                            const rendered = parts.map((part: string, i: number) => {
                                                if (part.startsWith('@')) {
                                                    return <Text key={i} style={[styles.mention, actIsMine && styles.myMention]}>{part}</Text>;
                                                }
                                                return <Text key={i}>{part}</Text>;
                                            });

                                            return (
                                                <Text style={[styles.messageText, { color: actIsMine ? '#FFFFFF' : colors.black }]}>
                                                    {rendered}
                                                </Text>
                                            );
                                        })()}

                                        {/* Timestamp and status */}
                                        <View style={styles.timestampRow}>
                                            <Text style={[styles.timestamp, { color: actIsMine ? 'rgba(255,255,255,0.7)' : colors.gray400 }]}>
                                                {new Date(showingActions.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                            {showingActions.isOptimistic ? (
                                                <Ionicons name="time-outline" size={10} color={actIsMine ? 'rgba(255,255,255,0.6)' : colors.gray400} style={{ marginLeft: 4 }} />
                                            ) : (
                                                actIsMine && otherParticipant?.last_read_at && new Date(showingActions.created_at) <= new Date(otherParticipant.last_read_at) && (
                                                    <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.8)" style={{ marginLeft: 4 }} />
                                                )
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* Context menu directly below (or above) the bubble */}
                                <Animated.View style={[
                                    styles.contextMenu,
                                    { 
                                        backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
                                        // Simple appear animation
                                        opacity: 1, 
                                        transform: [{ scale: 1 }] 
                                    },
                                    menuBelow
                                        ? { top: bubbleLayout.top + bubbleLayout.height + 12 }
                                        : { top: bubbleLayout.top - menuH - 12 },
                                    actIsMine ? { right: 16 } : { left: 16 },
                                ]}>
                                    <TouchableOpacity 
                                        style={styles.contextOption} 
                                        onPress={() => { setReplyTo(showingActions); setShowingActions(null); setBubbleLayout(null); setTimeout(() => textInputRef.current?.focus(), 100); }}
                                    >
                                        <Ionicons name="return-up-back-outline" size={18} color={isDark ? '#E0E0E0' : '#333'} />
                                        <Text style={[styles.contextOptionText, { color: isDark ? '#E0E0E0' : '#333' }]}>{t('chat_reply')}</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.contextDivider, { backgroundColor: isDark ? '#404040' : '#F0F0F0' }]} />
                                    <TouchableOpacity 
                                        style={styles.contextOption} 
                                        onPress={() => { if(showingActions?.content) Clipboard.setString(showingActions.content); setShowingActions(null); setBubbleLayout(null); }}
                                    >
                                        <Ionicons name="copy-outline" size={18} color={isDark ? '#E0E0E0' : '#333'} />
                                        <Text style={[styles.contextOptionText, { color: isDark ? '#E0E0E0' : '#333' }]}>{t('chat_copy')}</Text>
                                    </TouchableOpacity>
                                    {actIsMine && (
                                        <>
                                            <View style={[styles.contextDivider, { backgroundColor: isDark ? '#404040' : '#F0F0F0' }]} />
                                            <TouchableOpacity 
                                                style={styles.contextOption} 
                                                onPress={() => handleDeleteMessage(showingActions.id)}
                                            >
                                                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                                                <Text style={[styles.contextOptionText, { color: '#FF3B30' }]}>{t('chat_delete')}</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </Animated.View>
                            </View>
                        );
                    })()}
                </View>
            </Modal>
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
    platformNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.gray50,
        padding: 14,
        borderRadius: radii.lg,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.gray100,
        marginHorizontal: spacing.md,
        marginBottom: spacing.lg,
    },
    platformNoticeText: {
        flex: 1,
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.gray600,
        lineHeight: 18,
        textAlign: 'center',
    },
    // Contextual popup styles (WhatsApp/IG style)
    contextOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    contextMenu: {
        position: 'absolute',
        minWidth: 160,
        borderRadius: 14,
        paddingVertical: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    contextOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    contextOptionText: {
        fontFamily: fonts.medium,
        fontSize: 15,
    },
    contextDivider: {
        height: 0.5,
        marginHorizontal: 12,
    },
});
