import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { spacing, fonts, radii } from '../../../src/constants/theme';
import { getCommunityMembers, getCommunity, getPendingRequests, approveJoinRequest, rejectJoinRequest } from '../../../src/api/communities';
import { Ionicons } from '@expo/vector-icons';
import ShadowLoader from '../../../src/components/ShadowLoader';
import { useTheme } from '../../../src/context/ThemeContext';
import { useAuth } from '../../../src/context/AuthContext';

export default function CommunityMembersScreen() {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const [members, setMembers] = useState<any[]>([]);
    const [pending, setPending] = useState<any[]>([]);
    const [community, setCommunity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const isAdmin = community?.created_by === user?.id;

    const loadData = async () => {
        try {
            const [memRes, commRes] = await Promise.all([
                getCommunityMembers(id as string),
                getCommunity(id as string)
            ]);
            if (memRes.data) setMembers(memRes.data);
            if (commRes.data) {
                setCommunity(commRes.data);
                // If admin, fetch pending requests
                if (commRes.data.created_by === user?.id) {
                    const pendRes = await getPendingRequests(id as string);
                    if (pendRes.data) setPending(pendRes.data);
                }
            }
        } catch (e) {
            console.log('Error loading members:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [id]);

    const handleApprove = async (userId: string) => {
        setActionLoading(userId);
        try {
            await approveJoinRequest(id as string, userId);
            Alert.alert('Success', 'Student has been accepted into the hub!');
            await loadData();
        } catch (e) {
            Alert.alert('Error', 'Failed to approve request');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (userId: string) => {
        Alert.alert('Confirm Decline', 'Are you sure you want to decline this request?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Decline', style: 'destructive', onPress: async () => {
                    setActionLoading(userId);
                    try {
                        await rejectJoinRequest(id as string, userId);
                        await loadData();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to decline request');
                    } finally {
                        setActionLoading(null);
                    }
                }
            }
        ]);
    };

    if (loading) return <ShadowLoader type="students" />;

    const combinedData = [
        ...(pending.length > 0 ? [{ type: 'header', title: 'PENDING REQUESTS', count: pending.length }] : []),
        ...pending.map(p => ({ ...p, isPending: true })),
        { type: 'header', title: 'HUB MEMBERS', count: members.length },
        ...members
    ];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                title: 'University Hub Members',
                headerTitleStyle: { fontFamily: fonts.bold, color: colors.text, fontSize: 16 },
                headerBackTitle: '',
                headerTintColor: colors.text,
                headerStyle: { backgroundColor: colors.background },
                headerShadowVisible: false,
            }} />

            <FlatList
                data={combinedData}
                keyExtractor={(item, index) => item.id || `extra_${index}`}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    if (item.type === 'header') {
                        return (
                            <View style={[styles.sectionHeader, { borderBottomColor: colors.border, backgroundColor: isDark ? '#121212' : '#F9F9F9' }]}>
                                <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>{item.title}</Text>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{item.count}</Text>
                                </View>
                            </View>
                        );
                    }

                    const profile = item.profiles;
                    return (
                        <View style={[styles.memberCard, { borderBottomColor: colors.border }]}>
                            <TouchableOpacity
                                style={styles.memberInfo}
                                onPress={() => router.push(`/user/${profile.id}` as any)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
                                    {profile.avatar_url ? (
                                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                                    ) : (
                                        <Text style={[styles.avatarText, { color: colors.gray500 }]}>{profile.name?.[0]?.toUpperCase()}</Text>
                                    )}
                                </View>
                                <View style={styles.info}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={[styles.name, { color: colors.text }]}>{profile.name}</Text>
                                        {item.role === 'admin' && (
                                            <View style={styles.adminTag}>
                                                <Text style={styles.adminTagText}>ADMIN</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.department, { color: colors.gray500 }]}>
                                        {profile.department || 'Student'}
                                        {profile.year_of_study ? ` • ${profile.year_of_study}` : ''}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {item.isPending ? (
                                <View style={styles.actionRow}>
                                    <TouchableOpacity 
                                        style={[styles.smallBtn, { backgroundColor: colors.primary }]} 
                                        onPress={() => handleApprove(profile.id)}
                                        disabled={!!actionLoading}
                                    >
                                        <Text style={[styles.smallBtnText, { color: colors.background }]}>Accept</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.smallBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger }]} 
                                        onPress={() => handleReject(profile.id)}
                                        disabled={!!actionLoading}
                                    >
                                        <Text style={[styles.smallBtnText, { color: colors.danger }]}>Decline</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            )}
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="people-outline" size={48} color={colors.gray200} />
                        <Text style={[styles.emptyText, { color: colors.gray400 }]}>No members yet</Text>
                    </View>
                }
            />
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { paddingBottom: 40 },
    sectionHeader: { 
        paddingHorizontal: spacing.lg, 
        paddingVertical: 12, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottomWidth: 1,
    },
    sectionTitle: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1 },
    badge: { backgroundColor: colors.gray200, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    badgeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.gray600 },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        gap: 14,
    },
    memberInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontFamily: fonts.bold, fontSize: 16 },
    info: { flex: 1 },
    name: { fontFamily: fonts.bold, fontSize: 15 },
    department: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
    adminTag: { backgroundColor: 'rgba(0,163,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    adminTagText: { fontFamily: fonts.bold, fontSize: 8, color: '#00A3FF' },
    actionRow: { flexDirection: 'row', gap: 8 },
    smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center', minWidth: 60 },
    smallBtnText: { fontFamily: fonts.bold, fontSize: 12 },
    empty: { padding: 80, alignItems: 'center' },
    emptyText: { fontFamily: fonts.medium, fontSize: 15, marginTop: 16 },
});
