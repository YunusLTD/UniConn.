import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Animated, Easing, TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from './AuthContext';
import { updateProfile } from '../api/users';
import { getUnreadCount } from '../api/notifications';
import { supabase } from '../api/supabase';
import { useTheme } from './ThemeContext';
import { getConversation } from '../api/messages';
import { fonts, spacing } from '../constants/theme';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
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

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [counts, setCounts] = useState({ total: 0, messages: 0, activity: 0, pulse: 0 });
    const [messageBanner, setMessageBanner] = useState<MessageBannerData | null>(null);
    const { token, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);
    const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const bannerTranslate = useRef(new Animated.Value(-160)).current;
    const bannerOpacity = useRef(new Animated.Value(0)).current;

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
            console.error('Failed to register for push notifications:', e);
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
            const title = convo.type === 'direct' ? (other?.profiles?.name || 'Message') : (convo.name || 'Group chat');
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
    }, [user?.id]);

    const showMessageBanner = useCallback((data: Partial<MessageBannerData> & { conversationId?: string }) => {
        if (!data.conversationId) return;
        if (isOnMessagingScreen()) return;

        const bannerPayload: MessageBannerData = {
            conversationId: data.conversationId,
            title: data.title || 'New message',
            body: data.body || 'You received a new message',
            avatarUrl: data.avatarUrl,
        };

        setMessageBanner(bannerPayload);
        hydrateConversationMeta(data.conversationId);

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
        bannerTimer.current = setTimeout(hideMessageBanner, 5000);
    }, [bannerOpacity, bannerTranslate, hideMessageBanner, hydrateConversationMeta, isOnMessagingScreen]);

    useEffect(() => {
        if (token && user) {
            fetchUnreadCount();
            registerForPushNotificationsAsync();

            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                fetchUnreadCount();

                const data = notification.request.content?.data || {};
                if (data?.type === 'message') {
                    showMessageBanner({
                        conversationId: data.reference_id,
                        title: notification.request.content.title,
                        body: notification.request.content.body,
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
                            showMessageBanner({
                                conversationId: payload.new.reference_id,
                                title: payload.new.title,
                                body: payload.new.message,
                            });
                        }
                    }
                )
                .subscribe();

            return () => {
                notificationListener.current?.remove();
                responseListener.current?.remove();
                supabase.removeChannel(channel);
                hideMessageBanner();
            };
        }
    }, [token, user, showMessageBanner, hideMessageBanner]);

    useEffect(() => {
        if (token) {
            const interval = setInterval(fetchUnreadCount, 60000);
            return () => clearInterval(interval);
        }
    }, [token]);

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
            {messageBanner && (
                <Animated.View
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
                            router.push(`/chat/${messageBanner.conversationId}` as any);
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
                        {messageBanner.avatarUrl ? (
                            <Image source={{ uri: messageBanner.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: isDark ? colors.gray100 : colors.gray200 }]}>
                                <Text style={{ color: colors.black, fontFamily: fonts.bold }}>
                                    {messageBanner.title.substring(0, 1).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.bannerTitle, { color: colors.black }]} numberOfLines={1}>
                                {messageBanner.title || 'New message'}
                            </Text>
                            <Text style={[styles.bannerBody, { color: colors.gray500 }]} numberOfLines={2}>
                                {messageBanner.body || 'You received a new message'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={hideMessageBanner} hitSlop={10}>
                            <Text style={{ color: colors.gray400, fontSize: 18 }}>×</Text>
                        </TouchableOpacity>
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
        paddingHorizontal: spacing.lg,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 0.5,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 10,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
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
