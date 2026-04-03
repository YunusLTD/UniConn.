import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../api/client';
import { supabase } from '../api/supabase';

type User = {
    id: string;
    email: string;
    name: string;
    role: string;
    profile?: {
        name?: string;
        status?: string;
        university_id?: string;
        username?: string;
        avatar_url?: string;
        ban_reason?: string;
        banned_until?: string;
    } | null;
};

type AuthContextType = {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isNewUser: boolean;
    onlineUsers: string[];
    savedAccounts: { id: string, name: string, username?: string, avatar_url?: string, token: string }[];
    login: (token: string, user: User, isNewRegistration?: boolean) => Promise<void>;
    completeRegistrationSetup: () => void;
    logout: () => Promise<void>;
    switchAccount: (userId: string) => Promise<void>;
    removeSavedAccount: (userId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    isLoading: true,
    isNewUser: false,
    onlineUsers: [],
    savedAccounts: [],
    login: async () => { },
    completeRegistrationSetup: () => { },
    logout: async () => { },
    switchAccount: async () => { },
    removeSavedAccount: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewUser, setIsNewUser] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [savedAccounts, setSavedAccounts] = useState<{ id: string, name: string, username?: string, avatar_url?: string, token: string }[]>([]);

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
            // Load saved accounts list
            const savedJson = await AsyncStorage.getItem('saved_accounts');
            if (savedJson) {
                setSavedAccounts(JSON.parse(savedJson));
            }

            const storedToken = await AsyncStorage.getItem('auth_token');
            if (storedToken) {
                setToken(storedToken);
                const data = await apiFetch('/auth/me');
                if (data?.data) {
                    setUser(data.data);
                    // Refresh current account info in saved list
                    const updatedUser = data.data;
                    setSavedAccounts(prev => {
                        const existing = prev.find(a => a.id === updatedUser.id);
                        if (!existing) return prev;
                        const newList = prev.map(a => a.id === updatedUser.id ? {
                            ...a,
                            name: updatedUser.name || updatedUser.profile?.name || a.name || 'User',
                            username: updatedUser.profile?.username,
                            avatar_url: updatedUser.profile?.avatar_url,
                            token: storedToken
                        } : a);
                        AsyncStorage.setItem('saved_accounts', JSON.stringify(newList));
                        return newList;
                    });
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

        // Add to saved accounts
        setSavedAccounts(prev => {
            const filtered = prev.filter(a => a.id !== newUser.id);
            const newList = [{
                id: newUser.id,
                name: newUser.name || newUser.profile?.name || 'User',
                username: newUser.profile?.username,
                avatar_url: newUser.profile?.avatar_url,
                token: newToken
            }, ...filtered];
            AsyncStorage.setItem('saved_accounts', JSON.stringify(newList));
            return newList;
        });
    };

    const switchAccount = async (userId: string) => {
        const account = savedAccounts.find(a => a.id === userId);
        if (!account) return;

        setIsLoading(true);
        try {
            await AsyncStorage.setItem('auth_token', account.token);
            setToken(account.token);
            const data = await apiFetch('/auth/me');
            if (data?.data) {
                setUser(data.data);
            } else {
                // If switch fails (invalidated token), remove from saved
                await removeSavedAccount(userId);
                Alert.alert('Error', 'Account session expired. Please log in again.');
            }
        } catch (e) {
            console.error('Switch account error', e);
        } finally {
            setIsLoading(false);
        }
    };

    const removeSavedAccount = async (userId: string) => {
        const isCurrent = user?.id === userId;
        const newList = savedAccounts.filter(a => a.id !== userId);
        setSavedAccounts(newList);
        await AsyncStorage.setItem('saved_accounts', JSON.stringify(newList));

        if (isCurrent) {
            await logout();
        }
    };

    const completeRegistrationSetup = () => {
        setIsNewUser(false);
    };

    const logout = async () => {
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
        } catch (e) { }
        
        // Remove current account from saved list on logout?
        // Usually, Multi-account apps keep the account in the list but mark it as logged out.
        // For simplicity, let's just remove the current token.
        await AsyncStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        setOnlineUsers([]);
    };

    return (
        <AuthContext.Provider value={{ 
            user, token, isLoading, isNewUser, onlineUsers, savedAccounts,
            login, completeRegistrationSetup, logout, switchAccount, removeSavedAccount 
        }}>
            {children}
        </AuthContext.Provider>
    );
};
