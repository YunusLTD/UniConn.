import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getFriendRequests, respondToFriendRequest } from '../../src/api/friends';

export default function FriendRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            <View style={styles.requestCard}>
                <TouchableOpacity 
                    style={styles.profileInfo}
                    onPress={() => router.push(`/user/${profile.id}`)}
                >
                    <View style={styles.avatar}>
                        {profile.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{profile.name?.[0]?.toUpperCase() || '?'}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.nameContent}>
                        <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
                        {profile.university_name && (
                            <Text style={styles.uniName} numberOfLines={1}>{profile.university_name}</Text>
                        )}
                        <Text style={styles.statusText}>Wants to be your friend</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.rejectBtn]} 
                        onPress={() => handleResponse(item.id, 'reject')}
                    >
                        <Text style={styles.rejectBtnText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.acceptBtn]} 
                        onPress={() => handleResponse(item.id, 'accept')}
                    >
                        <Text style={styles.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                title: 'Friend Requests', 
                headerShown: true, 
                headerBackTitle: '',
                headerTintColor: colors.black,
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
                            <Text style={styles.emptyTitle}>No pending requests</Text>
                            <Text style={styles.emptyText}>When students want to be your friend, they'll appear here.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: spacing.lg, 
        paddingTop: 60, 
        paddingBottom: 20,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray100
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 18 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: spacing.lg },
    requestCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.gray100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    profileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatar: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
    avatarImg: { width: '100%', height: '100%' },
    avatarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontFamily: fonts.bold, fontSize: 20, color: colors.gray500 },
    nameContent: { flex: 1, marginLeft: 12 },
    name: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
    uniName: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 2 },
    statusText: { fontFamily: fonts.medium, fontSize: 13, color: colors.blue, marginTop: 4 },
    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    acceptBtn: { backgroundColor: colors.black },
    acceptBtnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
    rejectBtn: { backgroundColor: colors.gray100 },
    rejectBtnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.gray600 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.black, marginTop: 20, marginBottom: 8 },
    emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
});
