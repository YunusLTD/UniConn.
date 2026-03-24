import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthContext';
import { updateProfile } from '../api/users';
import { getUnreadCount } from '../api/notifications';
import { supabase } from '../api/supabase';

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
    requestPermissions: () => Promise<void>;
    refreshUnreadCount: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [counts, setCounts] = useState({ total: 0, messages: 0, activity: 0 });
    const { token, user } = useAuth();
    const router = useRouter();
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    const fetchUnreadCount = async () => {
        if (!token) return;
        try {
            const res = await getUnreadCount();
            if (res?.data) {
                setCounts({
                    total: res.data.total || 0,
                    messages: res.data.messages || 0,
                    activity: res.data.activity || 0
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

    useEffect(() => {
        if (token && user) {
            fetchUnreadCount();
            registerForPushNotificationsAsync();

            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                fetchUnreadCount();
            });

            responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                const data = response.notification.request.content.data;
                if (data?.type === 'message' && data.reference_id) {
                    router.push(`/chat/${data.reference_id}` as any);
                } else if (data?.reference_id) {
                    // Generic handler for others
                    router.push(`/post/${data.reference_id}` as any);
                }
            });

            // ─── Realtime: Notifications ───
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
                    }
                )
                .subscribe();

            return () => {
                notificationListener.current?.remove();
                responseListener.current?.remove();
                supabase.removeChannel(channel);
            };
        }
    }, [token, user]);

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
            requestPermissions: registerForPushNotificationsAsync,
            refreshUnreadCount: fetchUnreadCount
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
    return context;
};
