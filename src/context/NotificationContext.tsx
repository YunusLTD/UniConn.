import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
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
import { getConversation, getConversations } from '../api/messages';
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

type BannerSource = 'realtime_push' | 'realtime_notifications' | 'polling_fallback';

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
    const lastConversationMessageAtRef = useRef<Record<string, string>>({});
    const seededConversationWatcherRef = useRef(false);
    const bannerSourceRef = useRef<BannerSource>('polling_fallback');
    const previousSourceRef = useRef<BannerSource | null>(null);
    const bannerTranslate = useRef(new Animated.Value(-160)).current;
    const bannerOpacity = useRef(new Animated.Value(0)).current;
    const activeBanner = messageBanner;

    const fetchUnreadCount = async () => {
        if (!token) return;
        try {
            const res = await getUnreadCount();
            if (res?.data) {
                setCounts({
                    total: res.data.total || 0,
                    messages: res.data.messages || 0,
                    activity: res.data.activity || 0,
                    pulse: res.data.pulse || 0
                });
            }
        } catch (e) {
            console.log('Error fetching unread count:', e);
        }
    };

    const registerForPushNotificationsAsync = async () => {
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
    };

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

    const checkConversationsForIncomingMessages = useCallback(async () => {
        const currentUserId = user?.id;
        if (!token || !currentUserId) return;
        if (isOnMessagingScreen()) return;

        try {
            const res = await getConversations();
            const conversations = Array.isArray(res?.data) ? res.data : [];

            if (!seededConversationWatcherRef.current) {
                const seed: Record<string, string> = {};
                conversations.forEach((conv: any) => {
                    const ts = conv?.last_message?.created_at;
                    if (ts) seed[conv.id] = ts;
                });
                lastConversationMessageAtRef.current = seed;
                seededConversationWatcherRef.current = true;
                return;
            }

            let newestIncoming: { conv: any; message: any; createdAtMs: number } | null = null;

            for (const conv of conversations) {
                const msg = conv?.last_message;
                const createdAt = msg?.created_at;
                if (!conv?.id || !createdAt) continue;

                const prev = lastConversationMessageAtRef.current[conv.id];
                lastConversationMessageAtRef.current[conv.id] = createdAt;
                if (!prev) continue;

                const createdAtMs = new Date(createdAt).getTime();
                const prevMs = new Date(prev).getTime();
                if (!Number.isFinite(createdAtMs) || !Number.isFinite(prevMs) || createdAtMs <= prevMs) continue;
                if (msg?.sender_id === currentUserId) continue;

                if (!newestIncoming || createdAtMs > newestIncoming.createdAtMs) {
                    newestIncoming = { conv, message: msg, createdAtMs };
                }
            }

            if (!newestIncoming) return;

            const conv = newestIncoming.conv;
            const msg = newestIncoming.message;
            const other = conv?.participants?.find((p: any) => p?.user_id !== currentUserId);
            const isDirect = conv?.type === 'direct';

            const title = isDirect
                ? (other?.profiles?.name || t('new_message'))
                : (conv?.name || conv?.community?.name || t('group_chat'));

            const avatarUrl = isDirect
                ? other?.profiles?.avatar_url
                : (conv?.community?.image_url || conv?.community?.logo_url);

            const body = (msg?.content || '').trim()
                || (msg?.media_type === 'video' ? t('video_label') : msg?.media_url ? t('photo_label') : t('you_received_a_new_message'));

            setBannerSource('polling_fallback', 'new_message_detected_by_polling');
            showMessageBanner({
                conversationId: conv.id,
                title,
                body,
                avatarUrl,
                source: 'polling_fallback',
            });
        } catch (e) {
            console.log('Conversation watcher failed', e);
        }
    }, [isOnMessagingScreen, setBannerSource, showMessageBanner, t, token, user?.id]);

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

                        if (payload.new?.type === 'message') {
                            setBannerSource('realtime_notifications', 'notifications_realtime_insert');
                            showMessageBanner({
                                conversationId: payload.new.reference_id,
                                title: payload.new.title,
                                body: payload.new.message,
                                source: 'realtime_notifications',
                            });
                        }
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
                supabase.removeChannel(commentsChannel);
                hideMessageBanner();
            };
        }
    }, [token, user, showMessageBanner, hideMessageBanner, setBannerSource]);

    useEffect(() => {
        if (token) {
            const interval = setInterval(fetchUnreadCount, 60000);
            return () => clearInterval(interval);
        }
    }, [token]);

    useEffect(() => {
        if (!token || !user?.id) return;

        seededConversationWatcherRef.current = false;
        lastConversationMessageAtRef.current = {};
        checkConversationsForIncomingMessages();

        const interval = setInterval(checkConversationsForIncomingMessages, 5000);
        return () => clearInterval(interval);
    }, [checkConversationsForIncomingMessages, token, user?.id]);

    return (
        <NotificationContext.Provider value={{
            unreadCount: counts.total,
            messageUnreadCount: counts.messages,
            activityUnreadCount: counts.activity,
            pulseUnreadCount: counts.pulse,
            requestPermissions: registerForPushNotificationsAsync,
            refreshUnreadCount: fetchUnreadCount
        }}>
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
    },
    banner: {
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 7,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
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
        fontSize: 14,
        marginBottom: 2,
    },
    bannerBody: {
        fontFamily: fonts.regular,
        fontSize: 12,
        lineHeight: 16,
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
