import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { getFriendRequests, respondToFriendRequest } from '../../src/api/friends';
import { useTheme } from '../../src/context/ThemeContext';

export default function FriendRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { colors, isDark } = useTheme();

    const loadRequests = async () => {
        try {
            const res = await getFriendRequests();
            if (res?.data) setRequests(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleResponse = async (requestId: string, action: 'accept' | 'reject') => {
        try {
            await respondToFriendRequest(requestId, action);
            setRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (e) {
            console.error('Failed to respond to request');
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const profile = item.profiles;
        if (!profile) return null;

        return (
            <View style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity 
                    style={styles.profileInfo}
                    onPress={() => router.push(`/user/${profile.id}`)}
                >
                    <View style={[styles.avatar, { backgroundColor: colors.gray100, borderColor: colors.gray200 }]}>
                        {profile.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={[styles.avatarText, { color: colors.gray500 }]}>{profile.name?.[0]?.toUpperCase() || '?'}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.nameContent}>
                        <Text style={[styles.name, { color: colors.black }]} numberOfLines={1}>{profile.name}</Text>
                        {profile.university_name && (
                            <Text style={[styles.uniName, { color: colors.gray500 }]} numberOfLines={1}>{profile.university_name}</Text>
                        )}
                        <Text style={styles.statusText}>Wants to be your friend</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.rejectBtn, { backgroundColor: isDark ? colors.gray800 : colors.gray100 }]} 
                        onPress={() => handleResponse(item.id, 'reject')}
                    >
                        <Text style={[styles.rejectBtnText, { color: colors.gray600 }]}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: colors.black }]} 
                        onPress={() => handleResponse(item.id, 'accept')}
                    >
                        <Text style={[styles.acceptBtnText, { color: colors.white }]}>Accept</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ 
                title: 'Friend Requests', 
                headerShown: true, 
                headerBackTitle: '',
                headerTintColor: colors.black,
                headerStyle: { backgroundColor: colors.background }
            }} />

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.black} />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={64} color={colors.gray200} />
                            <Text style={[styles.emptyTitle, { color: colors.black }]}>No pending requests</Text>
                            <Text style={[styles.emptyText, { color: colors.gray500 }]}>When students want to be your friend, they'll appear here.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: spacing.lg },
    requestCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    profileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatar: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', borderWidth: 1 },
    avatarImg: { width: '100%', height: '100%' },
    avatarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontFamily: fonts.bold, fontSize: 20 },
    nameContent: { flex: 1, marginLeft: 12 },
    name: { fontFamily: fonts.bold, fontSize: 16 },
    uniName: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
    statusText: { fontFamily: fonts.medium, fontSize: 13, color: '#3B82F6', marginTop: 4 },
    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    acceptBtn: { },
    acceptBtnText: { fontFamily: fonts.bold, fontSize: 14 },
    rejectBtn: { },
    rejectBtnText: { fontFamily: fonts.bold, fontSize: 14 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 20, marginTop: 20, marginBottom: 8 },
    emptyText: { fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
});
