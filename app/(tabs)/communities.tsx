import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Alert, TextInput, DeviceEventEmitter } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { listCommunities } from '../../src/api/communities';
import { searchUsers } from '../../src/api/users';
import { sendFriendRequest, getFriendshipStatus } from '../../src/api/friends';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ShadowLoader from '../../src/components/ShadowLoader';
import { useLanguage } from '../../src/context/LanguageContext';

type ExploreTab = 'communities' | 'students';

export default function CommunitiesScreen() {
    const { colors } = useTheme();
    const [communities, setCommunities] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<ExploreTab>('communities');
    const [friendStatuses, setFriendStatuses] = useState<Record<string, string>>({});
    const router = useRouter();
    const { t } = useLanguage();

    const loadData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            if (activeTab === 'communities') {
                const res = await listCommunities(1, 100);
                if (res?.data) setCommunities(res.data.filter((c: any) => !c.is_official));
            } else {
                const res = await searchUsers(searchQuery);
                if (res?.data) {
                    setStudents(res.data);
                    const statuses: Record<string, string> = {};
                    res.data.forEach((student: any) => {
                        if (student.friend_status) {
                            statuses[student.id] = student.friend_status;
                        }
                    });
                    setFriendStatuses(statuses);
                }
            }
        } catch (e) {
            console.log('Fetch error', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, [activeTab]);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('communityCreated', () => {
            loadData(true);
        });
        return () => sub.remove();
    }, [activeTab]);

    useEffect(() => {
        const delay = setTimeout(() => {
            if (activeTab === 'students' || searchQuery) {
                loadData();
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [searchQuery]);

    const handleSendFriendRequest = async (studentId: string) => {
        try {
            const res = await sendFriendRequest(studentId);
            if (res?.status === 'success') {
                setFriendStatuses(prev => ({ ...prev, [studentId]: 'pending' }));
                Alert.alert('Request Sent', 'Friend request sent successfully!');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to send friend request');
        }
    };

    if (loading && !refreshing && communities.length === 0 && students.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ShadowLoader type={activeTab === 'students' ? 'students' : 'communities'} />
            </View>
        );
    }

    const CommunityCard = ({ item, onPress }: { item: any; onPress: () => void }) => {
        const isOfficial = !!item.is_official;
        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.cardAvatar, { backgroundColor: colors.gray50, borderColor: colors.gray100 }, isOfficial && { backgroundColor: colors.black, borderColor: colors.black }]}>
                        {item.image_url ? (
                            <Image source={{ uri: item.image_url }} style={styles.cardAvatarImg} />
                        ) : (
                            <MaterialCommunityIcons
                                name={isOfficial ? "school" : "account-group"}
                                size={24}
                                color={isOfficial ? colors.white : colors.gray400}
                            />
                        )}
                    </View>
                    <View style={styles.cardMain}>
                        <View style={styles.nameRow}>
                            <Text style={[styles.cardName, { color: colors.black }]} numberOfLines={1}>
                                {item.name?.replace(/Community/gi, '').replace(/University/gi, '').trim()}
                            </Text>
                            {isOfficial && <Ionicons name="checkmark-circle" size={16} color={colors.blue} />}
                        </View>
                        <Text style={[styles.cardType, { color: colors.gray500 }]} numberOfLines={1}>
                            {item.is_private && <Ionicons name="lock-closed" size={11} color={colors.gray400} />}
                            {item.is_private ? ' ' : ''}{item.member_count || 0} {t('members_count')}
                        </Text>
                    </View>
                </View>
                {item.description ? (
                    <Text style={[styles.cardDesc, { color: colors.gray600 }]} numberOfLines={2}>{item.description}</Text>
                ) : null}
            </TouchableOpacity>
        );
    };

    const StudentCard = ({ item, onPress, onSendRequest, friendStatus }: { item: any; onPress: () => void; onSendRequest: () => void; friendStatus?: string }) => {
        const initials = (() => {
            if (!item.name) return '?';
            const parts = item.name.split(' ').filter((p: string) => p.length > 0);
            if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
            return item.name.substring(0, 2).toUpperCase();
        })();

        const getButtonConfig = () => {
            switch (friendStatus) {
                case 'accepted': return { label: t('friends_label'), icon: 'checkmark-circle' as const, style: [styles.friendsBtnActive] };
                case 'pending': return { label: t('requested_label'), icon: 'time-outline' as const, style: [styles.friendsBtnPending, { backgroundColor: colors.gray50, borderColor: colors.gray200 }] };
                default: return { label: t('add_friend_label'), icon: 'person-add-outline' as const, style: [styles.friendsBtn, { backgroundColor: colors.black }] };
            }
        };
        const btnConfig = getButtonConfig();

        return (
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.gray100 }]} onPress={onPress} activeOpacity={0.8}>
                <View style={styles.cardHeader}>
                    <View style={[styles.studentAvatar, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}>
                        {item.avatar_url ? (
                            <Image source={{ uri: item.avatar_url }} style={styles.cardAvatarImg} />
                        ) : (
                            <Text style={[styles.avatarInitial, { color: colors.gray500 }]}>{initials}</Text>
                        )}
                    </View>
                    <View style={styles.cardMain}>
                        <Text style={[styles.cardName, { color: colors.black }]} numberOfLines={1}>{item.name}</Text>
                        {item.username && <Text style={[styles.usernameText, { color: colors.gray500 }]}>@{item.username}</Text>}
                        <Text style={[styles.universityText, { color: colors.gray400 }]} numberOfLines={1}>
                            {item.department ? `${item.department} • ` : ''}
                            {item.universities?.name || 'Academic Institution'}
                        </Text>
                    </View>
                    {friendStatus !== 'accepted' && friendStatus !== 'pending' && (
                        <TouchableOpacity style={btnConfig.style} onPress={onSendRequest}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name={btnConfig.icon} size={16} color={friendStatus ? colors.gray500 : colors.white} />
                                <Text style={[styles.friendsBtnText, { color: colors.white }, friendStatus === 'pending' && { color: colors.gray500 }]}>{btnConfig.label}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    {(friendStatus === 'accepted' || friendStatus === 'pending') && (
                        <View style={btnConfig.style}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name={btnConfig.icon} size={16} color={friendStatus === 'accepted' ? '#4CAF50' : colors.gray500} />
                                <Text style={[styles.friendsBtnText, friendStatus === 'accepted' && { color: '#4CAF50' }, friendStatus === 'pending' && { color: colors.gray500 }]}>{btnConfig.label}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.headerArea, { backgroundColor: colors.surface, borderBottomColor: colors.gray200 }]}>
                <View style={[styles.searchContainer, { backgroundColor: colors.gray50 }]}>
                    <Ionicons name="search" size={18} color={colors.gray400} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.black }]}
                        placeholder={activeTab === 'communities' ? t('search_communities_placeholder') : t('search_students_placeholder')}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={colors.gray400}
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={colors.gray300} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'communities' && { borderBottomColor: colors.black }]}
                        onPress={() => setActiveTab('communities')}
                    >
                        <Text style={[styles.tabText, { color: colors.gray500 }, activeTab === 'communities' && { color: colors.black }]}>{t('communities_tab')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'students' && { borderBottomColor: colors.black }]}
                        onPress={() => setActiveTab('students')}
                    >
                        <Text style={[styles.tabText, { color: colors.gray500 }, activeTab === 'students' && { color: colors.black }]}>{t('students_tab')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={activeTab === 'communities'
                    ? communities.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    : students
                }
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    activeTab === 'communities' ? (
                        <CommunityCard
                            item={item}
                            onPress={() => router.push(`/community/${item.id}` as any)}
                        />
                    ) : (
                        <StudentCard
                            item={item}
                            onPress={() => router.push(`/user/${item.id}`)}
                            onSendRequest={() => handleSendFriendRequest(item.id)}
                            friendStatus={friendStatuses[item.id]}
                        />
                    )
                )}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.black} colors={[colors.black]} />
                }
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    activeTab === 'communities' ? (
                        <View style={styles.headerSection}>
                            <Text style={[styles.headerSubtitle, { color: colors.gray500 }]}>{t('discover_communities')}</Text>
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.createBtn, { backgroundColor: colors.black, flex: 1 }]}
                                    onPress={() => router.push('/community/create')}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="add" size={18} color={colors.white} />
                                    <Text style={[styles.createBtnText, { color: colors.white }]}>{t('start_new_community')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={{ height: 20 }} />
                    )
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={{ marginTop: 20 }}>
                            <ShadowLoader type={activeTab === 'students' ? 'students' : 'communities'} />
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons
                                name={activeTab === 'communities' ? "planet-outline" : "people-outline"}
                                size={48}
                                color={colors.gray300}
                                style={{ marginBottom: spacing.md }}
                            />
                            <Text style={[styles.emptyTitle, { color: colors.black }]}>
                                {activeTab === 'communities' ? t('no_communities_yet') : t('no_students_found')}
                            </Text>
                            <Text style={[styles.emptySub, { color: colors.gray500 }]}>
                                {activeTab === 'communities' ? t('be_the_first') : t('try_different_search')}
                            </Text>
                        </View>
                    )
                }
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerArea: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        borderBottomWidth: 0.5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radii.sm,
        paddingHorizontal: 12,
        height: 44,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 15,
    },
    tabBar: {
        flexDirection: 'row',
        marginTop: spacing.md,
        gap: spacing.lg,
    },
    tab: {
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontFamily: fonts.semibold,
        fontSize: 14,
    },
    headerSection: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    headerSubtitle: {
        fontFamily: fonts.regular,
        fontSize: 14,
        marginBottom: spacing.md,
    },
    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    createBtn: {
        flex: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        borderRadius: radii.md,
        gap: spacing.sm,
    },
    createBtnText: {
        fontFamily: fonts.semibold,
        fontSize: 14,
    },
    card: {
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        marginHorizontal: 16,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardMain: { flex: 1 },
    cardAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
    },
    cardAvatarImg: { width: '100%', height: '100%' },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardName: {
        fontFamily: fonts.bold,
        fontSize: 16,
    },
    cardType: {
        fontFamily: fonts.medium,
        fontSize: 12,
        marginTop: 2,
    },
    cardDesc: {
        fontFamily: fonts.regular,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 12,
        paddingLeft: 4,
    },
    studentAvatar: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
    },
    avatarInitial: {
        fontFamily: fonts.bold,
        fontSize: 18,
    },
    usernameText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        marginTop: 1,
    },
    universityText: {
        fontFamily: fonts.regular,
        fontSize: 13,
        marginTop: 2,
    },
    friendsBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    friendsBtnPending: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    friendsBtnActive: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(76,175,80,0.1)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(76,175,80,0.3)',
    },
    friendsBtnText: {
        fontFamily: fonts.semibold,
        fontSize: 12,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
    },
    emptySub: {
        fontFamily: fonts.regular,
        fontSize: 14,
        marginTop: 6,
        textAlign: 'center',
    },
});
