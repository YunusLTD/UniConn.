import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Animated, Easing, TouchableOpacity, View, Text, Image, StyleSheet, DeviceEventEmitter } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from './AuthContext';
import { updateProfile } from '../api/users';
import { getUnreadCount } from '../api/notifications';
import { supabase } from '../api/supabase';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import { getConversation } from '../api/messages';
import { fonts, spacing } from '../constants/theme';
import { hapticLight } from '../utils/haptics';
import { POST_COMMENT_COUNT_CHANGED_EVENT } from '../utils/postCommentCount';

Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        const data = notification.request.content?.data || {};
        const isMessage = data?.type === 'message';

        return {
            shouldShowAlert: !isMessage,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: !isMessage,
            shouldShowList: true,
        };
    },
});

type NotificationContextType = {
    unreadCount: number;
    messageUnreadCount: number;
    activityUnreadCount: number;
    pulseUnreadCount: number;
    requestPermissions: () => Promise<void>;
    refreshUnreadCount: () => Promise<void>;
};

type MessageBannerData = {
    conversationId: string;
    title: string;
    body: string;
    avatarUrl?: string;
};

type BannerSource = 'realtime_push' | 'realtime_notifications' | 'realtime_messages';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [counts, setCounts] = useState({ total: 0, messages: 0, activity: 0, pulse: 0 });
    const [messageBanner, setMessageBanner] = useState<MessageBannerData | null>(null);
    const { token, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);
    const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastBannerRef = useRef<{ signature: string; shownAt: number } | null>(null);
    const bannerSourceRef = useRef<BannerSource>('realtime_messages');
    const previousSourceRef = useRef<BannerSource | null>(null);
    const userConversationIdsRef = useRef<Set<string>>(new Set());
    const bannerTranslate = useRef(new Animated.Value(-160)).current;
    const bannerOpacity = useRef(new Animated.Value(0)).current;
    const activeBanner = messageBanner;

    const fetchUnreadCount = useCallback(async () => {
        if (!token) return;
        try {
            const res = await getUnreadCount();
            if (res?.data) {
                const nextCounts = {
                    total: res.data.total || 0,
                    messages: res.data.messages || 0,
                    activity: res.data.activity || 0,
                    pulse: res.data.pulse || 0
                };
                setCounts((prev) => (
                    prev.total === nextCounts.total &&
                    prev.messages === nextCounts.messages &&
                    prev.activity === nextCounts.activity &&
                    prev.pulse === nextCounts.pulse
                ) ? prev : nextCounts);
            }
        } catch (e) {
            console.log('Error fetching unread count:', e);
        }
    }, [token]);

    const registerForPushNotificationsAsync = useCallback(async () => {
        if (!Device.isDevice) return;

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') return;

            const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
            const expoPushToken = await Notifications.getExpoPushTokenAsync({ projectId });
            const pushToken = expoPushToken.data;

            if (user && token) {
                await updateProfile({ push_token: pushToken } as any);
            }
        } catch (e) {
            console.log('Push notification registration skipped or failed:', e.message || e);
        }
    }, [token, user]);

    const isOnMessagingScreen = useCallback(() => {
        if (!pathname) return false;
        return pathname.startsWith('/chat') || pathname.startsWith('/messages');
    }, [pathname]);

    const hideMessageBanner = useCallback(() => {
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        Animated.parallel([
            Animated.timing(bannerTranslate, {
                toValue: -160,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(bannerOpacity, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            })
        ]).start(() => setMessageBanner(null));
    }, [bannerOpacity, bannerTranslate]);

    const hydrateConversationMeta = useCallback(async (conversationId: string) => {
        try {
            const res = await getConversation(conversationId);
            if (!res?.data) return;
            const convo = res.data;
            const other = convo.participants?.find((p: any) => p.user_id !== user?.id);
            const title = convo.type === 'direct'
                ? (other?.profiles?.name || t('new_message'))
                : (convo.name || convo.community?.name || t('group_chat'));
            const avatarUrl = convo.type === 'direct'
                ? other?.profiles?.avatar_url
                : (convo.community?.image_url || convo.communities?.[0]?.image_url || convo.communities?.[0]?.logo_url);
            setMessageBanner(prev => {
                if (!prev || prev.conversationId !== conversationId) return prev;
                return { ...prev, title, avatarUrl };
            });
        } catch (e) {
            console.log('Failed to hydrate conversation meta', e);
        }
    }, [t, user?.id]);

    const setBannerSource = useCallback((source: BannerSource, reason: string) => {
        bannerSourceRef.current = source;
        if (previousSourceRef.current !== source) {
            previousSourceRef.current = source;
            console.log(`[MessageBanner] source=${source} reason=${reason}`);
        }
    }, []);

    const showMessageBanner = useCallback((data: Partial<MessageBannerData> & { conversationId?: string; source?: BannerSource }) => {
        if (!data.conversationId) return;
        if (isOnMessagingScreen()) return;

        const source = data.source || bannerSourceRef.current;
        setBannerSource(source, 'banner_shown');

        const normalizedTitle = (data.title || '')
            .replace(/^Message from\s+/i, '')
            .trim() || t('new_message');
        const normalizedBody = (data.body || '').trim() || t('you_received_a_new_message');
        const signature = `${data.conversationId}:${normalizedTitle}:${normalizedBody}`;

        if (lastBannerRef.current?.signature === signature && Date.now() - lastBannerRef.current.shownAt < 1500) {
            return;
        }

        lastBannerRef.current = { signature, shownAt: Date.now() };

        const bannerPayload: MessageBannerData = {
            conversationId: data.conversationId,
            title: normalizedTitle,
            body: normalizedBody,
            avatarUrl: data.avatarUrl,
        };

        setMessageBanner(bannerPayload);
        hydrateConversationMeta(data.conversationId);
        hapticLight();

        Animated.parallel([
            Animated.timing(bannerTranslate, {
                toValue: 0,
                duration: 240,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(bannerOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start();

        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        bannerTimer.current = setTimeout(hideMessageBanner, 4500);
    }, [bannerOpacity, bannerTranslate, hideMessageBanner, hydrateConversationMeta, isOnMessagingScreen, setBannerSource, t]);

    const handleRealtimeMessage = useCallback((payload: any) => {
        const msg = payload.new;
        if (!msg || msg.sender_id === user?.id) return;
        if (msg.deleted_at) return;

        // Optimistically bump message unread count
        setCounts(prev => ({
            ...prev,
            messages: prev.messages + 1,
            total: prev.total + 1,
        }));

        // Track this conversation for future messages
        if (msg.conversation_id) {
            userConversationIdsRef.current.add(msg.conversation_id);
        }

        if (isOnMessagingScreen()) return;

        const body = (msg.content || '').trim()
            || (msg.media_type === 'video' ? t('video_label') : msg.media_url ? t('photo_label') : t('you_received_a_new_message'));

        setBannerSource('realtime_messages', 'messages_table_insert');
        showMessageBanner({
            conversationId: msg.conversation_id,
            title: undefined,
            body,
            source: 'realtime_messages',
        });
    }, [isOnMessagingScreen, setBannerSource, showMessageBanner, t, user?.id]);

    useEffect(() => {
        if (messageBanner && isOnMessagingScreen()) {
            hideMessageBanner();
        }
    }, [hideMessageBanner, isOnMessagingScreen, messageBanner, pathname]);

    useEffect(() => {
        if (token && user) {
            fetchUnreadCount();
            registerForPushNotificationsAsync();

            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                fetchUnreadCount();

                const data = (notification.request.content?.data || {}) as Record<string, any>;
                const conversationId = typeof data?.reference_id === 'string' ? data.reference_id : undefined;
                if (data?.type === 'message' && conversationId) {
                    setBannerSource('realtime_push', 'foreground_push_received');
                    showMessageBanner({
                        conversationId,
                        title: notification.request.content.title ?? undefined,
                        body: notification.request.content.body ?? undefined,
                        source: 'realtime_push',
                    });
                }
            });

            responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                const data = response.notification.request.content.data;
                if (data?.type === 'message' && data.reference_id) {
                    hideMessageBanner();
                    router.push(`/chat/${data.reference_id}` as any);
                } else if ((data?.type === 'poll_vote' || data?.type === 'community_poll') && data.reference_id) {
                    router.push(`/polls/${data.reference_id}` as any);
                } else if (data?.reference_id) {
                    router.push(`/post/${data.reference_id}` as any);
                }
            });

            const channel = supabase
                .channel(`notifications:user:${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log('New notification received via realtime:', payload.new);
                        fetchUnreadCount();
                        // Message banners are now handled by the messages channel below
                    }
                )
                .subscribe();

            // Direct messages realtime channel — fires for every new message
            const messagesChannel = supabase
                .channel(`messages:realtime:${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                    },
                    (payload) => {
                        const msg = payload.new;
                        if (!msg || msg.sender_id === user.id) return;
                        // Only process if this is a conversation the user belongs to
                        // The notification insert from backend confirms membership,
                        // but we also check our known set
                        if (userConversationIdsRef.current.size > 0 && !userConversationIdsRef.current.has(msg.conversation_id)) {
                            // Not a known conversation — could be new; refresh to check
                            fetchUnreadCount();
                            return;
                        }
                        handleRealtimeMessage(payload);
                    }
                )
                .subscribe();

            const commentsChannel = supabase
                .channel(`comments:counts:${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'comments',
                    },
                    (payload) => {
                        const postId = payload.new?.post_id;
                        if (!postId || payload.new?.user_id === user.id) return;
                        DeviceEventEmitter.emit(POST_COMMENT_COUNT_CHANGED_EVENT, { postId, delta: 1 });
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table: 'comments',
                    },
                    (payload) => {
                        const postId = payload.old?.post_id;
                        if (!postId || payload.old?.user_id === user.id) return;
                        DeviceEventEmitter.emit(POST_COMMENT_COUNT_CHANGED_EVENT, { postId, delta: -1 });
                    }
                )
                .subscribe();

            return () => {
                notificationListener.current?.remove();
                responseListener.current?.remove();
                supabase.removeChannel(channel);
                supabase.removeChannel(messagesChannel);
                supabase.removeChannel(commentsChannel);
                hideMessageBanner();
            };
        }
    }, [token, user, showMessageBanner, hideMessageBanner, setBannerSource, handleRealtimeMessage]);

    useEffect(() => {
        if (token) {
            const interval = setInterval(fetchUnreadCount, 60000);
            return () => clearInterval(interval);
        }
    }, [token]);

    // Seed known conversation IDs so the messages channel can filter
    useEffect(() => {
        if (!token || !user?.id) return;
        (async () => {
            try {
                const { getConversations } = await import('../api/messages');
                const res = await getConversations();
                const conversations = Array.isArray(res?.data) ? res.data : [];
                const ids = new Set<string>();
                conversations.forEach((c: any) => { if (c?.id) ids.add(c.id); });
                userConversationIdsRef.current = ids;
                console.log(`[MessageRT] Seeded ${ids.size} conversation IDs`);
            } catch (e) {
                console.log('[MessageRT] Failed to seed conversation IDs', e);
            }
        })();
    }, [token, user?.id]);

    const contextValue = useMemo(() => ({
            unreadCount: counts.total,
            messageUnreadCount: counts.messages,
            activityUnreadCount: counts.activity,
            pulseUnreadCount: counts.pulse,
            requestPermissions: registerForPushNotificationsAsync,
            refreshUnreadCount: fetchUnreadCount
        }), [counts.activity, counts.messages, counts.pulse, counts.total, fetchUnreadCount, registerForPushNotificationsAsync]);

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            {activeBanner && (
                <Animated.View
                    pointerEvents="box-none"
                    style={[
                        styles.bannerWrap,
                        {
                            paddingTop: Math.max(insets.top, spacing.sm),
                            transform: [{ translateY: bannerTranslate }],
                            opacity: bannerOpacity,
                        }
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            hideMessageBanner();
                            router.push(`/chat/${activeBanner.conversationId}` as any);
                        }}
                        style={[
                            styles.banner,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                shadowColor: isDark ? '#000' : '#000',
                            }
                        ]}
                    >
                        {activeBanner.avatarUrl ? (
                            <Image source={{ uri: activeBanner.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View
                                style={[
                                    styles.avatar,
                                    { backgroundColor: isDark ? colors.elevated : colors.gray100, borderColor: colors.border }
                                ]}
                            >
                                <Text style={{ color: colors.black, fontFamily: fonts.bold }}>
                                    {activeBanner.title.substring(0, 1).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <View style={styles.metaRow}>
                                <View
                                    style={[
                                        styles.messagePill,
                                        { backgroundColor: isDark ? 'rgba(96,165,250,0.2)' : 'rgba(59,130,246,0.12)' }
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.messagePillText,
                                            { color: colors.blue }
                                        ]}
                                    >
                                        {t('message')}
                                    </Text>
                                </View>
                                <Text style={[styles.bannerMeta, { color: colors.gray500 }]} numberOfLines={1}>
                                    {t('just_now')}
                                </Text>
                            </View>
                            <Text style={[styles.bannerTitle, { color: colors.black }]} numberOfLines={1}>
                                {activeBanner.title || t('new_message')}
                            </Text>
                            <Text style={[styles.bannerBody, { color: colors.gray500 }]} numberOfLines={2}>
                                {activeBanner.body || t('you_received_a_new_message')}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
    return context;
};

const styles = StyleSheet.create({
    bannerWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
    },
    banner: {
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        maxWidth: 560,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 9,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 5,
    },
    messagePill: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    messagePillText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    bannerMeta: {
        fontFamily: fonts.medium,
        fontSize: 11,
    },
    bannerTitle: {
        fontFamily: fonts.semibold,
        fontSize: 13,
        marginBottom: 1,
    },
    bannerBody: {
        fontFamily: fonts.regular,
        fontSize: 11,
        lineHeight: 15,
    },
    absoluteWrap: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
    },
    toast: {
        marginHorizontal: spacing.lg,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 0.5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    indicator: {
        width: 4,
        height: '100%',
        borderRadius: 2,
    },
    textWrap: {
        flex: 1,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 14,
        marginBottom: 2,
    },
    message: {
        fontFamily: fonts.regular,
        fontSize: 13,
        lineHeight: 18,
    },
});
