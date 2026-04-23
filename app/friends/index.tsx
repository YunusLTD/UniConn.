import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getFriendRequests, getFriendsList, respondToFriendRequest } from '../../src/api/friends';

type Segment = 'requests' | 'friends';

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    segmentWrap: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: 10,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.full,
        backgroundColor: colors.surface,
        overflow: 'hidden',
    },
    segmentBtn: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    segmentLabel: { fontFamily: fonts.semibold, fontSize: 13 },
    segmentBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentBadgeText: { fontFamily: fonts.bold, fontSize: 10 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 13,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        marginRight: 12,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontFamily: fonts.bold, fontSize: 17 },
    name: { fontFamily: fonts.bold, fontSize: 15 },
    sub: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12 },
    actions: { flexDirection: 'row', gap: 8, marginLeft: 8 },
    actionBtn: { height: 34, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    actionText: { fontFamily: fonts.bold, fontSize: 12 },
    empty: { alignItems: 'center', marginTop: 110, paddingHorizontal: spacing.xl },
    emptyTitle: { marginTop: 12, fontFamily: fonts.bold, fontSize: 18, textAlign: 'center' },
    emptySub: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default function FriendsHubScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [segment, setSegment] = useState<Segment>('requests');
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const [requestsRes, friendsRes] = await Promise.all([getFriendRequests(), getFriendsList()]);
            setRequests(requestsRes?.data || []);
            setFriends(friendsRes?.data || []);
        } catch (e) {
            setRequests([]);
            setFriends([]);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
        setActionLoading(`${requestId}-${action}`);
        try {
            await respondToFriendRequest(requestId, action);
            setRequests((prev) => prev.filter((request) => request.id !== requestId));
            if (action === 'accept') {
                await loadData();
            }
        } finally {
            setActionLoading(null);
        }
    };

    const renderRequest = ({ item }: { item: any }) => {
        const profile = item.profiles;
        if (!profile) return null;
        return (
            <View style={styles.row}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push(`/user/${profile.id}`)}
                    style={[styles.avatar, { backgroundColor: colors.background }]}
                >
                    {profile.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                    ) : (
                        <Text style={[styles.avatarText, { color: colors.gray500 }]}>{profile.name?.[0]?.toUpperCase() || 'U'}</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/user/${profile.id}`)}
                >
                    <Text style={[styles.name, { color: colors.black }]}>{profile.name}</Text>
                    <Text style={[styles.sub, { color: colors.gray500 }]} numberOfLines={1}>
                        {profile.department || t('wants_to_connect')}
                    </Text>
                </TouchableOpacity>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.gray100, borderWidth: isDark ? 1 : 0, borderColor: colors.border }]}
                        disabled={!!actionLoading}
                        onPress={() => handleRequestAction(item.id, 'reject')}
                    >
                        {actionLoading === `${item.id}-reject` ? (
                            <ActivityIndicator size="small" color={colors.gray500} />
                        ) : (
                            <Text style={[styles.actionText, { color: colors.gray600 }]}>{t('decline')}</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.black }]}
                        disabled={!!actionLoading}
                        onPress={() => handleRequestAction(item.id, 'accept')}
                    >
                        {actionLoading === `${item.id}-accept` ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Text style={[styles.actionText, { color: colors.white }]}>{t('accept')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderFriend = ({ item }: { item: any }) => {
        const friend = item.friend;
        if (!friend) return null;
        return (
            <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={() => router.push(`/user/${friend.id}`)}>
                <View style={[styles.avatar, { backgroundColor: colors.background }]}>
                    {friend.avatar_url ? (
                        <Image source={{ uri: friend.avatar_url }} style={styles.avatarImg} />
                    ) : (
                        <Text style={[styles.avatarText, { color: colors.gray500 }]}>{friend.name?.[0]?.toUpperCase() || 'U'}</Text>
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.black }]}>{friend.name}</Text>
                    <Text style={[styles.sub, { color: colors.gray500 }]} numberOfLines={1}>
                        {friend.department || friend.username || t('friends')}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={colors.gray300} />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <Stack.Screen options={{ title: t('friends') }} />
                <ActivityIndicator size="small" color={colors.black} />
            </View>
        );
    }

    const isRequests = segment === 'requests';
    const listData = isRequests ? requests : friends;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t('friends') }} />

            <View style={styles.segmentWrap}>
                <TouchableOpacity
                    style={[styles.segmentBtn, isRequests && { backgroundColor: colors.black }]}
                    onPress={() => setSegment('requests')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.segmentLabel, { color: isRequests ? colors.white : colors.gray500 }]}>{t('requests_tab')}</Text>
                    {requests.length > 0 && (
                        <View style={[styles.segmentBadge, { backgroundColor: isRequests ? colors.white : colors.black }]}>
                            <Text style={[styles.segmentBadgeText, { color: isRequests ? colors.black : colors.white }]}>
                                {requests.length > 99 ? '99+' : requests.length}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.segmentBtn, !isRequests && { backgroundColor: colors.black }]}
                    onPress={() => setSegment('friends')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.segmentLabel, { color: !isRequests ? colors.white : colors.gray500 }]}>{t('friends')}</Text>
                    <View style={[styles.segmentBadge, { backgroundColor: !isRequests ? colors.white : colors.gray100 }]}>
                        <Text style={[styles.segmentBadgeText, { color: !isRequests ? colors.black : colors.gray600 }]}>
                            {friends.length}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            <FlatList
                data={listData}
                keyExtractor={(item) => item.id}
                renderItem={isRequests ? renderRequest : renderFriend}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons
                            name={isRequests ? 'person-add-outline' : 'people-outline'}
                            size={54}
                            color={colors.gray300}
                        />
                        <Text style={[styles.emptyTitle, { color: colors.black }]}>
                            {isRequests ? t('no_pending_requests') : t('friends_empty_title')}
                        </Text>
                        <Text style={[styles.emptySub, { color: colors.gray500 }]}>
                            {isRequests ? t('requests_empty_sub') : t('friends_empty_sub')}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}
