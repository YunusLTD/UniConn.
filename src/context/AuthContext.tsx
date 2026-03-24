import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../api/client';
import { supabase } from '../api/supabase';

type User = {
    id: string;
    email: string;
    name: string;
    role: string;
    profile?: {
        status?: string;
        university_id?: string;
        username?: string;
        avatar_url?: string;
    } | null;
};

type AuthContextType = {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isNewUser: boolean;
    onlineUsers: string[];
    login: (token: string, user: User, isNewRegistration?: boolean) => Promise<void>;
    completeRegistrationSetup: () => void;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    isLoading: true,
    isNewUser: false,
    onlineUsers: [],
    login: async () => { },
    completeRegistrationSetup: () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewUser, setIsNewUser] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    useEffect(() => {
        loadAuth();
    }, []);

    const updateHeartbeat = async () => {
        if (!token) return;
        try {
            await apiFetch('/auth/heartbeat', { method: 'POST' });
        } catch (e) { }
    };

    useEffect(() => {
        if (!user) return;

        // Setup Heartbeat (every 60s)
        const heartbeatInterval = setInterval(updateHeartbeat, 60000);
        updateHeartbeat();

        // Setup Presence
        const channel = supabase.channel('online-users', {
            config: { presence: { key: user.id } }
        });

        const syncPresence = () => {
            const state = channel.presenceState();
            const keys = Object.keys(state);
            setOnlineUsers(keys);
            console.log('Online users count:', keys.length);
        };

        channel
            .on('presence', { event: 'sync' }, syncPresence)
            .on('presence', { event: 'join' }, ({ key }) => {
                console.log('User joined:', key);
                syncPresence();
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                console.log('User left:', key);
                syncPresence();
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString(), user_id: user.id });
                }
            });

        return () => {
            clearInterval(heartbeatInterval);
            channel.unsubscribe();
        };
    }, [user, token]);

    const loadAuth = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('auth_token');
            if (storedToken) {
                setToken(storedToken);
                const data = await apiFetch('/auth/me');
                if (data?.data) {
                    setUser(data.data);
                } else {
                    await AsyncStorage.removeItem('auth_token');
                    setToken(null);
                }
            }
        } catch (error) {
            console.log('Auth load error:', error);
            await AsyncStorage.removeItem('auth_token');
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (newToken: string, newUser: User, isNewRegistration: boolean = false) => {
        if (isNewRegistration) setIsNewUser(true);
        await AsyncStorage.setItem('auth_token', newToken);
        setToken(newToken);
        setUser(newUser);
    };

    const completeRegistrationSetup = () => {
        setIsNewUser(false);
    };

    const logout = async () => {
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
        } catch (e) { }
        await AsyncStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        setOnlineUsers([]);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, isNewUser, onlineUsers, login, completeRegistrationSetup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
