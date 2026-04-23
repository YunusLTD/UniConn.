import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image, Modal, Clipboard, PanResponder, Animated, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, Stack, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import NetInfo from '@react-native-community/netinfo';
import { spacing, fonts, radii, colors } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getConversation, markConversationRead, deleteMessage, editMessage, toggleMessageReaction } from '../../src/api/messages';
import { markReadByReference } from '../../src/api/notifications';
import { useNotifications } from '../../src/context/NotificationContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/api/supabase';
import ShadowLoader, { Skeleton } from '../../src/components/ShadowLoader';
import { useLanguage } from '../../src/context/LanguageContext';
// ActionModal replaced with inline contextual popup
import { getCommunityMembers } from '../../src/api/communities';
import SharedPostCard from '../../src/components/SharedPostCard';
import SharedStoryCard from '../../src/components/SharedStoryCard';
import { useVideoPlayer, VideoView } from 'expo-video';
import { applyIncomingRealtimeMessage, applyUpdatedRealtimeMessage, drainOutbox, queueOptimisticMessage, retryFailedMessage, syncConversationMessages } from '../../src/chat/chatSync';
import { chatStore } from '../../src/chat/chatStore';

const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
// Toggle reaction UI/server interactions while we ship this version
const ENABLE_REACTIONS = false;
const SEND_MESSAGE_SOUND = require('../../assets/sounds/message-sent.wav');

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

const getReactionGroups = (message: any) => {
    const reactions = Array.isArray(message?.reactions) ? message.reactions : [];
    const groups = new Map<string, { emoji: string; count: number; userIds: string[] }>();

    reactions.forEach((reaction: any) => {
        const key = reaction?.emoji || '';
        if (!key) return;
        const existing = groups.get(key);
        if (existing) {
            existing.count += 1;
            if (reaction?.user_id) existing.userIds.push(reaction.user_id);
            return;
        }

        groups.set(key, {
            emoji: key,
            count: 1,
            userIds: reaction?.user_id ? [reaction.user_id] : [],
        });
    });

    return Array.from(groups.values());
};

const getProfileSignature = (profile: any) => JSON.stringify({
    name: profile?.name || null,
    username: profile?.username || null,
    avatar_url: profile?.avatar_url || null,
    is_admin: !!profile?.is_admin,
});

const pickLatestTimestamp = (currentValue?: string | null, incomingValue?: string | null) => {
    if (!incomingValue) return currentValue ?? null;
    if (!currentValue) return incomingValue;

    return new Date(incomingValue).getTime() >= new Date(currentValue).getTime()
        ? incomingValue
        : currentValue;
};

const mergeParticipantLists = (primaryParticipants: any[] = [], cachedParticipants: any[] = []) => {
    const byUserId = new Map<string, any>();

    for (const participant of primaryParticipants) {
        if (!participant?.user_id) continue;
        byUserId.set(participant.user_id, participant);
    }

    for (const participant of cachedParticipants) {
        if (!participant?.user_id) continue;

        const existing = byUserId.get(participant.user_id);
        if (!existing) {
            byUserId.set(participant.user_id, participant);
            continue;
        }

        byUserId.set(participant.user_id, {
            ...existing,
            ...participant,
            profiles: {
                ...(existing.profiles || {}),
                ...(participant.profiles || {}),
            },
            last_read_at: pickLatestTimestamp(existing.last_read_at, participant.last_read_at),
        });
    }

    return Array.from(byUserId.values());
};

const VideoPreview = ({ uri, onLoading }: { uri: string, onLoading: (loading: boolean) => void }) => {
    const player = useVideoPlayer(uri, p => {
        p.loop = true;
        p.play();
    });

    useEffect(() => {
        onLoading(true);
        const sub = player.addListener('statusChange', ({ status }) => {
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
            contentFit="contain"
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
    onRetry,
    onToggleReaction,
    otherParticipant,
    conversation,
    isDissolving,
    dissolveAnim,
    router,
    setPreviewMedia,
    isHidden,
    currentUserId,
    replyingLabel,
    editedLabel,
}: any) => {
    const [isMediaLoadingLocal, setIsMediaLoadingLocal] = useState(false);
    const bubbleRef = useRef<View>(null);
    const isMine = item.sender_id === user?.id;
    const isReply = !!(item.reply_to && item.reply_to.id);
    const reactionGroups = getReactionGroups(item);

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
                            <Text style={[styles.replyContextLabel, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.gray500 }]}>{replyingLabel}</Text>
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
                                <View style={{ position: 'relative' }}>
                                    <Image
                                        source={{ uri: item.media_url_local || item.media_url, cache: 'force-cache' }}
                                        style={styles.attachedMedia}
                                        onLoadStart={() => setIsMediaLoadingLocal(true)}
                                        onLoadEnd={() => setIsMediaLoadingLocal(false)}
                                    />
                                    {isMediaLoadingLocal && (
                                        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                                            <Skeleton width={240} height={180} borderRadius={12} />
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )
                    )}

                    {(() => {
                        const postLinkMatch = item.content?.match(/https:\/\/uni-platform.app\/post\/([0-9a-fA-F-]{36})/);
                        const storyLinkMatch = item.content?.match(/https:\/\/uni-platform.app\/story\/([0-9a-fA-F-]{36})/);
                        
                        if (postLinkMatch) {
                            const postId = postLinkMatch[1];
                            return <SharedPostCard postId={postId} isMine={isMine} />;
                        }
                        // Story card disabled for now
                        /*
                        if (storyLinkMatch) {
                            const storyId = storyLinkMatch[1];
                            return <SharedStoryCard storyId={storyId} isMine={isMine} />;
                        }
                        */
                        return null;
                    })()}

                    {(() => {
                        if (!item.content) return null;
                        const hasPostShare = item.content.includes('https://uni-platform.app/post/');
                        const hasStoryShare = item.content.includes('https://uni-platform.app/story/');
                        
                        const isAutoShare = (hasPostShare && item.content.startsWith('Check out this post:')) || 
                                           (hasStoryShare && item.content.startsWith('Check out this story:'));

                        if (isAutoShare) return null;

                        let displayContent = item.content;
                        if (hasPostShare) {
                            displayContent = displayContent.replace(/https:\/\/uni-platform.app\/post\/([0-9a-fA-F-]{36})/, '').trim();
                        }
                        if (hasStoryShare) {
                            displayContent = displayContent.replace(/https:\/\/uni-platform.app\/story\/([0-9a-fA-F-]{36})/, '').trim();
                        }

                        if (!displayContent) return null;

                        return (
                            <Text style={[styles.messageText, { color: isMine ? '#FFFFFF' : colors.black }]}>
                                {renderContent(displayContent, isMine)}
                            </Text>
                        );
                    })()}

                    {ENABLE_REACTIONS && !!reactionGroups.length && (
                        <View style={styles.reactionsRow}>
                            {reactionGroups.map((reaction) => {
                                const reactedByMe = reaction.userIds.includes(currentUserId);
                                return (
                                    <TouchableOpacity
                                        key={`${item.id}-${reaction.emoji}`}
                                        style={[
                                            styles.reactionChip,
                                            reactedByMe
                                                ? { backgroundColor: isMine ? 'rgba(255,255,255,0.18)' : '#E8F4FF', borderColor: isMine ? 'rgba(255,255,255,0.28)' : '#A8D7FF' }
                                                : { backgroundColor: isMine ? 'rgba(255,255,255,0.1)' : colors.gray50, borderColor: isMine ? 'rgba(255,255,255,0.12)' : colors.border },
                                        ]}
                                        activeOpacity={0.85}
                                        onPress={() => onToggleReaction(item, reaction.emoji)}
                                    >
                                        <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                                        <Text style={[styles.reactionCount, { color: isMine ? '#FFFFFF' : colors.black }]}>{reaction.count}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    <View style={styles.timestampRow}>
                        <Text style={[styles.timestamp, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.gray400 }]}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {item.is_edited && (
                            <Text style={[styles.editedLabel, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.gray400 }]}>
                                {editedLabel}
                            </Text>
                        )}
                        {item.sync_status === 'failed' ? (
                            <>
                                <Ionicons
                                    name="alert-circle"
                                    size={12}
                                    color="#FF3B30"
                                />
                                <TouchableOpacity onPress={() => onRetry(item)} hitSlop={8}>
                                    <Ionicons
                                        name="refresh"
                                        size={12}
                                        color="#FF3B30"
                                    />
                                </TouchableOpacity>
                            </>
                        ) : item.isOptimistic ? (
                            <Ionicons
                                name="time-outline"
                                size={12}
                                color={isMine ? 'rgba(255,255,255,0.75)' : colors.gray400}
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
    const [resolvedConversationId, setResolvedConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [previewMedia, setPreviewMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
    const [isMediaLoading, setIsMediaLoading] = useState(false);
    const [peerTyping, setPeerTyping] = useState(false);
    const [replyTo, setReplyTo] = useState<any>(null);
    const [editingMessage, setEditingMessage] = useState<any>(null);
    const [taggingSearch, setTaggingSearch] = useState<string | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [isViewportReady, setIsViewportReady] = useState(false);
    const [showingActions, setShowingActions] = useState<any>(null);
    const [bubbleLayout, setBubbleLayout] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const deleteAnims = useRef<Map<string, Animated.Value>>(new Map()).current;
    const typingTimeoutRef = useRef<any>(null);
    const flatListRef = useRef<FlatList>(null);
    const textInputRef = useRef<TextInput>(null);
    const channelRef = useRef<any>(null);
    const messagesRef = useRef<any[]>([]);
    const membersRef = useRef<any[]>([]);
    const conversationRef = useRef<any>(null);
    const sendSoundRef = useRef<Audio.Sound | null>(null);
    const isNearBottomRef = useRef(true);
    const hasCompletedInitialScrollRef = useRef(false);
    const pendingImmediateScrollRef = useRef(false);
    const initialPositionAttemptsRef = useRef(0);
    const syncStateRef = useRef<{ conversationId: string | null; promise: Promise<void> | null }>({
        conversationId: null,
        promise: null,
    });
    const lastReadMarkRef = useRef<{ conversationId: string | null; at: number }>({
        conversationId: null,
        at: 0,
    });
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const routeConversationId = Array.isArray(id) ? id[0] : id;
    const routeTitle = Array.isArray(title) ? title[0] : title;

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        membersRef.current = members;
    }, [members]);

    useEffect(() => {
        conversationRef.current = conversation;
    }, [conversation]);

    useEffect(() => {
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: false,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
        }).catch(() => { });

        return () => {
            if (sendSoundRef.current) {
                sendSoundRef.current.unloadAsync().catch(() => { });
                sendSoundRef.current = null;
            }
        };
    }, []);

    const areMessagesEquivalent = useCallback((a: any[], b: any[]) => {
        if (a === b) return true;
        if (a.length !== b.length) return false;

        for (let index = 0; index < a.length; index += 1) {
            const left = a[index];
            const right = b[index];
            const leftReactionSignature = JSON.stringify((left?.reactions || []).map((reaction: any) => `${reaction.id}:${reaction.emoji}:${reaction.user_id}`));
            const rightReactionSignature = JSON.stringify((right?.reactions || []).map((reaction: any) => `${reaction.id}:${reaction.emoji}:${reaction.user_id}`));
            const leftProfileSignature = getProfileSignature(left?.profiles);
            const rightProfileSignature = getProfileSignature(right?.profiles);
            const leftReplyProfileSignature = getProfileSignature(left?.reply_to?.profiles);
            const rightReplyProfileSignature = getProfileSignature(right?.reply_to?.profiles);

            if (
                left?.id !== right?.id ||
                left?.created_at !== right?.created_at ||
                left?.content !== right?.content ||
                left?.deleted_at !== right?.deleted_at ||
                left?.sync_status !== right?.sync_status ||
                left?.media_url !== right?.media_url ||
                left?.media_url_local !== right?.media_url_local ||
                left?.is_edited !== right?.is_edited ||
                left?.reply_to?.id !== right?.reply_to?.id ||
                leftProfileSignature !== rightProfileSignature ||
                leftReplyProfileSignature !== rightReplyProfileSignature ||
                leftReactionSignature !== rightReactionSignature
            ) {
                return false;
            }
        }

        return true;
    }, []);

    const refreshLocalMessages = useCallback(async (conversationId: string) => {
        const cachedMessages = await chatStore.loadConversationMessages(conversationId);
        setMessages((previous) => (areMessagesEquivalent(previous, cachedMessages) ? previous : cachedMessages));
        return cachedMessages;
    }, [areMessagesEquivalent]);

    const playSendSound = useCallback(async () => {
        try {
            if (!sendSoundRef.current) {
                const { sound } = await Audio.Sound.createAsync(SEND_MESSAGE_SOUND, { shouldPlay: false, volume: 0.45 });
                sendSoundRef.current = sound;
            }

            await sendSoundRef.current.setPositionAsync(0);
            await sendSoundRef.current.playAsync();
        } catch (error) {
            console.log('Send sound failed', error);
        }
    }, []);

    const scrollToBottom = useCallback((delay = 120) => {
        setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, delay);
    }, []);

    const jumpToBottom = useCallback((delay = 0) => {
        setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }, delay);
    }, []);

    const settleInitialBottomPosition = useCallback(() => {
        if (loading || !pendingImmediateScrollRef.current || !messages.length) return;

        jumpToBottom(0);
        initialPositionAttemptsRef.current += 1;

        if (initialPositionAttemptsRef.current < 6) {
            requestAnimationFrame(() => {
                settleInitialBottomPosition();
            });
            return;
        }

        pendingImmediateScrollRef.current = false;
        initialPositionAttemptsRef.current = 0;
        setIsViewportReady(true);
    }, [jumpToBottom, loading, messages.length]);

    useEffect(() => {
        if (!loading && pendingImmediateScrollRef.current && messages.length) {
            settleInitialBottomPosition();
        }
    }, [loading, messages.length, settleInitialBottomPosition]);

    useEffect(() => {
        const unsubscribe = chatStore.subscribe((conversationId) => {
            if (!resolvedConversationId || conversationId !== resolvedConversationId) return;
            refreshLocalMessages(conversationId).catch(() => { });
        });

        return unsubscribe;
    }, [refreshLocalMessages, resolvedConversationId]);

    const syncConversationState = useCallback(async (conversationId: string) => {
        let syncError: unknown = null;

        try {
            await syncConversationMessages(conversationId);
        } catch (error) {
            syncError = error;
        }

        try {
            await drainOutbox();
        } catch (error) {
            if (!syncError) syncError = error;
        }

        await refreshLocalMessages(conversationId);

        if (syncError) {
            throw syncError;
        }
    }, [refreshLocalMessages]);

    const runConversationSync = useCallback((conversationId: string) => {
        const existing = syncStateRef.current;
        if (existing.conversationId === conversationId && existing.promise) {
            return existing.promise;
        }

        const promise = syncConversationState(conversationId)
            .finally(() => {
                if (syncStateRef.current.promise === promise) {
                    syncStateRef.current = { conversationId: null, promise: null };
                }
            });

        syncStateRef.current = { conversationId, promise };
        return promise;
    }, [syncConversationState]);

    const markConversationSeen = useCallback(async (conversationId: string, options?: { notifyUnread?: boolean; broadcastRead?: boolean }) => {
        const now = Date.now();
        const previous = lastReadMarkRef.current;
        if (previous.conversationId === conversationId && now - previous.at < 1500) {
            return;
        }

        lastReadMarkRef.current = { conversationId, at: now };
        const readAt = new Date().toISOString();

        if (user?.id) {
            await chatStore.updateParticipantReadState(conversationId, user.id, readAt);
            await chatStore.updateConversationListUnread(user.id, conversationId, 0);
            setConversation((prev: any) => {
                if (!prev) return prev;
                const participants = Array.isArray(prev.participants) ? prev.participants : [];
                const hasCurrentUser = participants.some((participant: any) => participant.user_id === user.id);
                return {
                    ...prev,
                    participants: hasCurrentUser
                        ? participants.map((participant: any) =>
                            participant.user_id === user.id
                                ? { ...participant, last_read_at: pickLatestTimestamp(participant.last_read_at, readAt) }
                                : participant
                        )
                        : participants.concat({ user_id: user.id, last_read_at: readAt, profiles: null })
                };
            });
        }

        await Promise.all([
            markReadByReference('message', conversationId),
            markConversationRead(conversationId),
        ]);

        if (options?.broadcastRead && channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'read',
                payload: { user_id: user?.id }
            });
        }

        if (options?.notifyUnread !== false) {
            await refreshUnreadCount();
        }
    }, [refreshUnreadCount, user?.id]);

    const enrichRealtimeMessage = useCallback((message: any) => {
        const enriched = {
            ...message,
            conversation_id: message.conversation_id || resolvedConversationId,
        };

        if (!enriched.profiles) {
            const fromMembers = membersRef.current.find((member: any) => member.user_id === enriched.sender_id);
            const fromParticipants = conversationRef.current?.participants?.find((participant: any) => participant.user_id === enriched.sender_id);
            enriched.profiles = fromMembers?.profiles || fromParticipants?.profiles || null;
        }

        if (enriched.reply_to_message_id && !enriched.reply_to) {
            const original = messagesRef.current.find((item) => item.id === enriched.reply_to_message_id);
            if (original) enriched.reply_to = original;
        }

        return enriched;
    }, [resolvedConversationId]);

    const loadConversation = useCallback(async () => {
        try {
            const res = await getConversation(String(routeConversationId ?? id ?? ''));
            if (res?.data) {
                const realId = res.data.id;
                const remoteParticipants = Array.isArray(res.data.participants) ? res.data.participants : [];
                await chatStore.upsertConversationParticipants(realId, remoteParticipants);
                const cachedParticipants = await chatStore.getConversationParticipants(realId);
                const mergedConversation = {
                    ...res.data,
                    participants: mergeParticipantLists(remoteParticipants, cachedParticipants),
                };

                await chatStore.upsertConversation(mergedConversation);
                setConversation(mergedConversation);
                await refreshLocalMessages(realId);

                const communityId = mergedConversation.community?.id || mergedConversation.communities?.[0]?.id || mergedConversation.community_id;
                if (communityId) {
                    const membersRes = await getCommunityMembers(communityId);
                    if (membersRes?.data) setMembers(membersRes.data);
                } else {
                    setMembers([]);
                }

                return realId;
            }
        } catch (e) {
            console.log('Error loading conversation', e);
        }
        return String(routeConversationId ?? id ?? '');
    }, [id, refreshLocalMessages, routeConversationId]);

    useEffect(() => {
        let isActive = true;

        const init = async () => {
            setLoading(true);
            setIsViewportReady(false);
            setResolvedConversationId(null);
            setMessages([]);
            hasCompletedInitialScrollRef.current = false;
            isNearBottomRef.current = true;
            pendingImmediateScrollRef.current = false;
            initialPositionAttemptsRef.current = 0;
            const initialConversationId = routeConversationId ? String(routeConversationId) : null;

            if (initialConversationId) {
                const cachedConversation = await chatStore.getConversation(initialConversationId);
                if (cachedConversation) {
                    setConversation(cachedConversation);
                }

                const cachedMessages = await refreshLocalMessages(initialConversationId);
                if (cachedMessages.length) {
                    hasCompletedInitialScrollRef.current = true;
                    pendingImmediateScrollRef.current = true;
                } else {
                    setIsViewportReady(true);
                }
                if (isActive) {
                    setLoading(false);
                }
            }

            const realId = await loadConversation();
            if (!isActive) return;

            setResolvedConversationId(realId);
            if (realId !== initialConversationId) {
                const cachedMessages = await refreshLocalMessages(realId);
                if (cachedMessages.length) {
                    hasCompletedInitialScrollRef.current = true;
                    pendingImmediateScrollRef.current = true;
                } else {
                    setIsViewportReady(true);
                }
            }
            if (isActive) setLoading(false);

            try {
                await markConversationSeen(realId, { notifyUnread: true, broadcastRead: true });
            } catch (e) {
                console.log('Failed to clear notifications', e);
            }

            void runConversationSync(realId)
                .then(() => {
                    if (!hasCompletedInitialScrollRef.current) {
                        hasCompletedInitialScrollRef.current = true;
                        scrollToBottom();
                    }
                    setIsViewportReady(true);
                })
                .catch((error) => {
                    console.log('Initial chat sync failed', error);
                    setIsViewportReady(true);
                });
        };

        init();

        return () => {
            isActive = false;
        };
    }, [loadConversation, markConversationSeen, refreshLocalMessages, routeConversationId, runConversationSync, scrollToBottom]);

    useEffect(() => {
        if (!resolvedConversationId) return;

        const channel = supabase
            .channel(`conversation:${resolvedConversationId}`, {
                config: {
                    broadcast: { self: false }
                }
            })
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${resolvedConversationId}`,
                },
                async (payload) => {
                    const incoming = enrichRealtimeMessage(payload.new);
                    await applyIncomingRealtimeMessage(incoming);
                    await runConversationSync(resolvedConversationId);
                    await refreshLocalMessages(resolvedConversationId);
                    setIsViewportReady(true);
                    if (incoming.sender_id === user?.id || isNearBottomRef.current) {
                        scrollToBottom();
                    }

                    if (incoming.sender_id !== user?.id) {
                        markConversationSeen(resolvedConversationId, { notifyUnread: true, broadcastRead: true }).catch(() => { });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${resolvedConversationId}`,
                },
                async (payload) => {
                    const updatedMessage = enrichRealtimeMessage(payload.new);
                    await applyUpdatedRealtimeMessage(updatedMessage);
                    await refreshLocalMessages(resolvedConversationId);
                    setIsViewportReady(true);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'message_reactions',
                    filter: `conversation_id=eq.${resolvedConversationId}`,
                },
                async (payload) => {
                    if (!ENABLE_REACTIONS) return;
                    const reactionPayload = payload.eventType === 'DELETE' ? payload.old : payload.new;
                    await chatStore.applyReactionEvent(payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE', reactionPayload);
                    await refreshLocalMessages(resolvedConversationId);
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
                async (payload) => {
                    if (payload.payload.user_id !== user?.id) {
                        const readAt = new Date().toISOString();
                        await chatStore.updateParticipantReadState(resolvedConversationId, payload.payload.user_id, readAt);
                        setConversation((prev: any) => {
                            if (!prev) return prev;
                            const participants = Array.isArray(prev.participants) ? prev.participants : [];
                            const hasParticipant = participants.some((participant: any) => participant.user_id === payload.payload.user_id);
                            return {
                                ...prev,
                                participants: hasParticipant
                                    ? participants.map((participant: any) =>
                                        participant.user_id === payload.payload.user_id
                                            ? { ...participant, last_read_at: pickLatestTimestamp(participant.last_read_at, readAt) }
                                            : participant
                                    )
                                    : participants.concat({ user_id: payload.payload.user_id, last_read_at: readAt, profiles: null })
                            };
                        });
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime: Chat connected for', resolvedConversationId);
                    void runConversationSync(resolvedConversationId)
                        .catch((error) => {
                            console.log('Realtime resync failed', error);
                        });
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            if (channelRef.current === channel) channelRef.current = null;
        };
    }, [enrichRealtimeMessage, markConversationSeen, refreshLocalMessages, resolvedConversationId, runConversationSync, scrollToBottom, user?.id]);

    useFocusEffect(
        useCallback(() => {
            if (!resolvedConversationId) return undefined;

            let isActive = true;

            void (async () => {
                try {
                    await runConversationSync(resolvedConversationId);
                    await markConversationSeen(resolvedConversationId, { notifyUnread: true, broadcastRead: true });
                } catch (error) {
                    console.log('Focus sync failed', error);
                }
            })();

            const interval = setInterval(() => {
                if (!isActive) return;

                void (async () => {
                    try {
                        await runConversationSync(resolvedConversationId);
                        await markConversationSeen(resolvedConversationId, { notifyUnread: false, broadcastRead: false });
                    } catch (error) {
                        console.log('Foreground chat sync failed', error);
                    }
                })();
            }, 4000);

            return () => {
                isActive = false;
                clearInterval(interval);
            };
        }, [markConversationSeen, resolvedConversationId, runConversationSync])
    );

    useEffect(() => {
        if (!resolvedConversationId) return;

        const unsubscribe = NetInfo.addEventListener((state) => {
            if (state.isConnected && state.isInternetReachable !== false) {
                void runConversationSync(resolvedConversationId)
                    .catch((error) => {
                        console.log('Reconnect sync failed', error);
                    });
            }
        });

        return unsubscribe;
    }, [resolvedConversationId, runConversationSync]);

    const pickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: false,
            quality: 0.9,
        });

        if (!result.canceled) {
            setMediaUri(result.assets[0].uri);
        }
    };

    const handleSend = async () => {
        if ((!input.trim() && !mediaUri) || sending || !resolvedConversationId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (editingMessage) {
            const nextContent = input.trim();
            if (!nextContent) return;

            const previousMessage = editingMessage;
            setSending(true);
            setEditingMessage(null);
            setInput('');

            try {
                await chatStore.updateLocalMessage(previousMessage.id, (message) => ({
                    ...message,
                    content: nextContent,
                    is_edited: true,
                }));
                await refreshLocalMessages(resolvedConversationId);

                const response = await editMessage(previousMessage.id, nextContent);
                if (response?.data) {
                    await chatStore.upsertMessages([{ ...response.data, sync_status: 'sent', is_local_only: false }]);
                    await refreshLocalMessages(resolvedConversationId);
                }
            } catch (e) {
                console.log('Error editing message', e);
                await chatStore.updateLocalMessage(previousMessage.id, (message) => ({
                    ...message,
                    content: previousMessage.content,
                    is_edited: previousMessage.is_edited || false,
                }));
                await refreshLocalMessages(resolvedConversationId);
                setEditingMessage(previousMessage);
                setInput(nextContent);
            } finally {
                setSending(false);
            }
            return;
        }

        const content = input.trim() || null;
        const media = mediaUri;
        const isMedia = !!media;

        setInput('');
        setMediaUri(null);
        setReplyTo(null);

        if (isMedia) setSending(true);
        try {
            const optimisticId = await queueOptimisticMessage({
                conversationId: resolvedConversationId,
                senderId: user?.id,
                senderProfile: {
                    name: user?.name,
                    avatar_url: user?.profile?.avatar_url,
                    username: user?.profile?.username,
                },
                content,
                mediaUri: media,
                replyTo,
            });
            if (optimisticId) {
                await refreshLocalMessages(resolvedConversationId);
                void playSendSound();
            }
            scrollToBottom(100);
        } catch (e) {
            console.log('Error sending message', e);
        } finally {
            setSending(false);
            await refreshLocalMessages(resolvedConversationId);
        }
    };

    const handleRetryMessage = useCallback(async (message: any) => {
        if (!resolvedConversationId) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            await retryFailedMessage(resolvedConversationId, message.id);
        } catch (error) {
            console.log('Retry message failed', error);
        } finally {
            await refreshLocalMessages(resolvedConversationId);
        }
    }, [refreshLocalMessages, resolvedConversationId]);

    const handleToggleReaction = useCallback(async (message: any, emoji: string) => {
        // Reactions temporarily disabled
        if (!ENABLE_REACTIONS) {
            setShowingActions(null);
            setBubbleLayout(null);
            return;
        }

        Haptics.selectionAsync();
        setShowingActions(null);
        setBubbleLayout(null);

        try {
            const response = await toggleMessageReaction(message.id, emoji);
            if (response?.data) {
                await chatStore.upsertMessages([{ ...response.data, sync_status: 'sent', is_local_only: false }]);
                if (resolvedConversationId) {
                    await refreshLocalMessages(resolvedConversationId);
                }
            }
        } catch (error) {
            console.log('Toggle reaction failed', error);
        }
    }, [refreshLocalMessages, resolvedConversationId]);

    const beginEditMessage = useCallback((message: any) => {
        setEditingMessage(message);
        setReplyTo(null);
        setInput(message.content || '');
        setShowingActions(null);
        setBubbleLayout(null);
        setTimeout(() => textInputRef.current?.focus(), 100);
    }, []);

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
                await chatStore.markMessageDeleted(messageId);
                if (resolvedConversationId) {
                    await refreshLocalMessages(resolvedConversationId);
                }
            } catch (e) {
                console.log('Error deleting message', e);
                alert('Failed to delete message');
                if (resolvedConversationId) {
                    refreshLocalMessages(resolvedConversationId).catch(() => { });
                }
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

    const handleListScroll = useCallback((event: any) => {
        const { contentOffset } = event.nativeEvent;
        isNearBottomRef.current = contentOffset.y < 120;
    }, []);

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

    const renderedMessages = useMemo(() => [...messages].reverse(), [messages]);

    const otherParticipant = conversation?.participants?.find((p: any) => p.user_id !== user?.id);
    const isOnline = otherParticipant && onlineUsers.includes(otherParticipant.user_id);
    const rawDisplayName = conversation?.type === 'direct'
        ? (otherParticipant?.profiles?.name || routeTitle || 'User')
        : conversation?.name || routeTitle || 'Group';
    const displayName = stripLegacyGroupChatSuffix(rawDisplayName);
    const isPlatform = otherParticipant?.profiles?.is_admin || displayName === 'UniConn Platform';

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <Stack.Screen options={{
                    headerStyle: { backgroundColor: colors.background },
                    headerTitle: routeTitle || '',
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
                            const avatarUrl = conversation?.type === 'direct'
                                ? otherParticipant?.profiles?.avatar_url
                                : (
                                    conversation?.community?.logo_url ||
                                    conversation?.community?.image_url ||
                                    conversation?.communities?.[0]?.logo_url ||
                                    conversation?.communities?.[0]?.image_url
                                );
                            if (avatarUrl) {
                                return <Image source={{ uri: avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} />;
                            }
                            const initials = getAvatarLabel(displayName);
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
                data={renderedMessages}
                inverted
                style={!isViewportReady && renderedMessages.length ? { opacity: 0 } : undefined}
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
                                setEditingMessage(null);
                                setReplyTo(msg);
                                setTimeout(() => textInputRef.current?.focus(), 100);
                            }}
                            onRetry={handleRetryMessage}
                            onToggleReaction={handleToggleReaction}
                            isDissolving={deletingIds.has(item.id)}
                            dissolveAnim={getDeleteAnim(item.id)}
                            router={router}
                            setPreviewMedia={setPreviewMedia}
                            isHidden={showingActions?.id === item.id}
                            currentUserId={user?.id}
                            replyingLabel={t('replying_to')}
                            editedLabel={t('edited_label')}
                        />
                    );
                }}
                contentContainerStyle={styles.listContent}
                onLayout={() => {
                    if (pendingImmediateScrollRef.current || !isViewportReady) {
                        settleInitialBottomPosition();
                    }
                }}
                onContentSizeChange={() => {
                    if (pendingImmediateScrollRef.current || !isViewportReady) {
                        settleInitialBottomPosition();
                    }
                }}
                onScroll={handleListScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            />

            {mediaUri && (
                <View
                    style={[
                        styles.mediaPreviewContainer,
                        {
                            backgroundColor: isDark ? '#121212' : colors.white,
                            borderTopColor: isDark ? colors.border : colors.gray200,
                        }
                    ]}
                >
                    <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />
                    <TouchableOpacity
                        style={[
                            styles.removeMediaBtn,
                            {
                                backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.92)',
                            }
                        ]}
                        onPress={() => setMediaUri(null)}
                        hitSlop={8}
                    >
                        <Ionicons name="close-circle" size={24} color={isDark ? colors.white : colors.black} />
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
                                <Text style={[styles.replyContextLabel, { color: colors.gray500 }]}>{t('replying_to')}</Text>
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

                {editingMessage && (
                    <View style={[styles.replyBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]} key={`editing-${editingMessage.id}`}>
                        <View style={styles.replyBarContent}>
                            <View style={[styles.replyIndicator, { backgroundColor: '#FF9F0A' }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.replyContextLabel, { color: colors.gray500 }]}>{t('edit_label')}</Text>
                                <Text style={[styles.replyPreviewText, { color: colors.gray500 }]} numberOfLines={1}>
                                    {editingMessage.content || ''}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => { setEditingMessage(null); setInput(''); }} hitSlop={10}>
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
                            <TouchableOpacity onPress={pickMedia} style={styles.attachBtn} disabled={!!editingMessage}>
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
                                <Ionicons name={editingMessage ? 'checkmark' : 'arrow-up'} size={20} color={colors.white} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* Media Preview Modal */}
            <Modal visible={!!previewMedia} transparent={true} animationType="fade">
                <View style={styles.modalBg}>
                    <TouchableOpacity 
                        style={[
                            styles.closePreview,
                            {
                                padding: 8,
                                borderRadius: 18,
                                backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.9)',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.gray200,
                                right: 20,
                                top: 60,
                                position: 'absolute',
                                zIndex: 20,
                            }
                        ]}
                        onPress={() => {
                            setPreviewMedia(null);
                            setIsMediaLoading(false);
                        }}
                    >
                        <Ionicons name="close" size={22} color={isDark ? colors.white : colors.black} />
                    </TouchableOpacity>
                    
                    {isMediaLoading && (
                        <View style={StyleSheet.absoluteFill}>
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Skeleton width="90%" height="80%" borderRadius={12} />
                            </View>
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
                        const canEditAction = actIsMine && !!showingActions?.content && !showingActions?.media_url && !showingActions?.deleted_at && showingActions?.sync_status === 'sent';
                        const screenH = Dimensions.get('window').height;
                        const menuItemCount = actIsMine ? (canEditAction ? 4 : 3) : 2;
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
                                                <Text style={[styles.replyContextLabel, { color: actIsMine ? 'rgba(255,255,255,0.7)' : colors.gray500 }]}>{t('replying_to')}</Text>
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
                                            const storyLinkMatch = showingActions.content?.match(/https:\/\/uni-platform.app\/story\/([0-9a-fA-F-]{36})/);
                                            
                                            if (postLinkMatch) {
                                                const postId = postLinkMatch[1];
                                                return <SharedPostCard postId={postId} isMine={actIsMine} />;
                                            }
                                            /*
                                            if (storyLinkMatch) {
                                                const storyId = storyLinkMatch[1];
                                                return <SharedStoryCard storyId={storyId} isMine={actIsMine} />;
                                            }
                                            */
                                            return null;
                                        })()}

                                        {/* Text content */}
                                        {(() => {
                                            if (!showingActions.content) return null;
                                            const hasPostShare = showingActions.content.includes('https://uni-platform.app/post/');
                                            const hasStoryShare = showingActions.content.includes('https://uni-platform.app/story/');
                                            
                                            const isAutoShare = (hasPostShare && showingActions.content.startsWith('Check out this post:')) ||
                                                                (hasStoryShare && showingActions.content.startsWith('Check out this story:'));
                                            
                                            if (isAutoShare) return null;
                                            
                                            let displayContent = showingActions.content;
                                            if (hasPostShare) {
                                                displayContent = displayContent.replace(/https:\/\/uni-platform.app\/post\/([0-9a-fA-F-]{36})/, '').trim();
                                            }
                                            if (hasStoryShare) {
                                                displayContent = displayContent.replace(/https:\/\/uni-platform.app\/story\/([0-9a-fA-F-]{36})/, '').trim();
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
                                            {showingActions.is_edited && (
                                                <Text style={[styles.editedLabel, { color: actIsMine ? 'rgba(255,255,255,0.7)' : colors.gray400 }]}>
                                                    {t('edited_label')}
                                                </Text>
                                            )}
                                            {showingActions.sync_status === 'failed' ? (
                                                <>
                                                    <Ionicons name="alert-circle" size={12} color="#FF3B30" />
                                                    <TouchableOpacity onPress={() => handleRetryMessage(showingActions)} hitSlop={8}>
                                                        <Ionicons name="refresh" size={12} color="#FF3B30" />
                                                    </TouchableOpacity>
                                                </>
                                            ) : showingActions.isOptimistic ? (
                                                <Ionicons
                                                    name="time-outline"
                                                    size={12}
                                                    color={actIsMine ? 'rgba(255,255,255,0.75)' : colors.gray400}
                                                    style={{ marginLeft: 4 }}
                                                />
                                            ) : (
                                                actIsMine && otherParticipant?.last_read_at && new Date(showingActions.created_at) <= new Date(otherParticipant.last_read_at) && (
                                                    <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.8)" style={{ marginLeft: 4 }} />
                                                )
                                            )}
                                        </View>

                                        {ENABLE_REACTIONS && !!getReactionGroups(showingActions).length && (
                                            <View style={styles.reactionsRow}>
                                                {getReactionGroups(showingActions).map((reaction) => {
                                                    const reactedByMe = !!user?.id && reaction.userIds.includes(user.id);
                                                    return (
                                                        <TouchableOpacity
                                                            key={`action-${showingActions.id}-${reaction.emoji}`}
                                                            style={[
                                                                styles.reactionChip,
                                                                reactedByMe
                                                                    ? { backgroundColor: actIsMine ? 'rgba(255,255,255,0.18)' : '#E8F4FF', borderColor: actIsMine ? 'rgba(255,255,255,0.28)' : '#A8D7FF' }
                                                                    : { backgroundColor: actIsMine ? 'rgba(255,255,255,0.1)' : colors.gray50, borderColor: actIsMine ? 'rgba(255,255,255,0.12)' : colors.border },
                                                            ]}
                                                            activeOpacity={0.85}
                                                            onPress={() => handleToggleReaction(showingActions, reaction.emoji)}
                                                        >
                                                            <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                                                            <Text style={[styles.reactionCount, { color: actIsMine ? '#FFFFFF' : colors.black }]}>{reaction.count}</Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Context menu directly below (or above) the bubble */}
                                {ENABLE_REACTIONS && (
                                    <View
                                        style={[
                                            styles.reactionPickerRow,
                                            menuBelow
                                                ? { top: bubbleLayout.top + bubbleLayout.height - 42 }
                                                : { top: bubbleLayout.top - menuH - 62 },
                                            actIsMine ? { right: 16 } : { left: 16 },
                                            { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF' },
                                        ]}
                                    >
                                        {DEFAULT_REACTIONS.map((emoji) => (
                                            <TouchableOpacity
                                                key={`picker-${emoji}`}
                                                style={styles.reactionPickerButton}
                                                onPress={() => handleToggleReaction(showingActions, emoji)}
                                            >
                                                <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                <Animated.View style={[
                                    styles.contextMenu,
                                    { 
                                        backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
                                        // Simple appear animation
                                        opacity: 1, 
                                        transform: [{ scale: 1 }] 
                                    },
                                    menuBelow
                                        ? { top: bubbleLayout.top + bubbleLayout.height + 56 }
                                        : { top: bubbleLayout.top - menuH - 76 },
                                    actIsMine ? { right: 16 } : { left: 16 },
                                ]}>
                                    <TouchableOpacity 
                                        style={styles.contextOption} 
                                        onPress={() => { setEditingMessage(null); setReplyTo(showingActions); setShowingActions(null); setBubbleLayout(null); setTimeout(() => textInputRef.current?.focus(), 100); }}
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
                                    {canEditAction && (
                                        <>
                                            <View style={[styles.contextDivider, { backgroundColor: isDark ? '#404040' : '#F0F0F0' }]} />
                                            <TouchableOpacity
                                                style={styles.contextOption}
                                                onPress={() => beginEditMessage(showingActions)}
                                            >
                                                <Ionicons name="create-outline" size={18} color={isDark ? '#E0E0E0' : '#333'} />
                                                <Text style={[styles.contextOptionText, { color: isDark ? '#E0E0E0' : '#333' }]}>{t('edit_label')}</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
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
    replyContextLabel: { fontFamily: fonts.medium, fontSize: 11, marginBottom: 2 },
    editedLabel: { fontFamily: fonts.medium, fontSize: 10 },
    reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    reactionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    reactionEmoji: { fontSize: 13 },
    reactionCount: { fontFamily: fonts.medium, fontSize: 12 },

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
    fullImage: { width: '100%', height: '100%' },
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
    sendingLabel: { fontFamily: fonts.medium, fontSize: 10, fontStyle: 'italic' },
    reactionPickerRow: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 10,
        gap: 2,
    },
    reactionPickerButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reactionPickerEmoji: { fontSize: 20 },
});
