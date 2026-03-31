import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Alert, TextInput } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { listCommunities } from '../../src/api/communities';
import { searchUsers } from '../../src/api/users';
import { sendFriendRequest, getFriendshipStatus } from '../../src/api/friends';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ShadowLoader from '../../src/components/ShadowLoader';

type ExploreTab = 'communities' | 'students';

function CommunityCard({ item, onPress }: { item: any; onPress: () => void }) {
    const isOfficial = !!item.is_official;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.cardAvatar, isOfficial && styles.officialAvatar]}>
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
                        <Text style={styles.cardName} numberOfLines={1}>
                            {item.name?.replace(/ community/gi, '')}
                        </Text>
                        {isOfficial && <Ionicons name="checkmark-circle" size={16} color={colors.blue} />}
                    </View>
                    <Text style={styles.cardType} numberOfLines={1}>
                        {item.is_private && <Ionicons name="lock-closed" size={11} color={colors.gray400} />}
                        {item.is_private ? ' ' : ''}{item.member_count || 0} members
                    </Text>
                </View>
            </View>
            {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            ) : null}
        </TouchableOpacity>
    );
}

function StudentCard({ item, onPress, onSendRequest, friendStatus }: { item: any; onPress: () => void; onSendRequest: () => void; friendStatus?: string }) {
    const initial = item.name?.charAt(0).toUpperCase() || '?';

    const getButtonConfig = () => {
        switch (friendStatus) {
            case 'accepted': return { label: 'Friends', icon: 'checkmark-circle' as const, style: styles.friendsBtnActive };
            case 'pending': return { label: 'Requested', icon: 'time-outline' as const, style: styles.friendsBtnPending };
            default: return { label: 'Add Friend', icon: 'person-add-outline' as const, style: styles.friendsBtn };
        }
    };
    const btnConfig = getButtonConfig();

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.cardHeader}>
                <View style={styles.studentAvatar}>
                    {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={styles.cardAvatarImg} />
                    ) : (
                        <Text style={styles.avatarInitial}>{initial}</Text>
                    )}
                </View>
                <View style={styles.cardMain}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    {item.username && <Text style={styles.usernameText}>@{item.username}</Text>}
                    <Text style={styles.universityText} numberOfLines={1}>
                        {item.department ? `${item.department} • ` : ''}
                        {item.universities?.name || 'Academic Institution'}
                    </Text>
                </View>
                {friendStatus !== 'accepted' && friendStatus !== 'pending' && (
                    <TouchableOpacity style={btnConfig.style} onPress={onSendRequest}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name={btnConfig.icon} size={16} color={friendStatus ? colors.gray500 : colors.black} />
                            <Text style={[styles.friendsBtnText, friendStatus === 'pending' && { color: colors.gray500 }]}>{btnConfig.label}</Text>
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
}

export default function CommunitiesScreen() {
    const [communities, setCommunities] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<ExploreTab>('communities');
    const [friendStatuses, setFriendStatuses] = useState<Record<string, string>>({});
    const router = useRouter();

    const loadData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            if (activeTab === 'communities') {
                const res = await listCommunities(1, 100);
                // Filter out official university communities
                if (res?.data) setCommunities(res.data.filter((c: any) => !c.is_official));
            } else {
                const res = await searchUsers(searchQuery);
                if (res?.data) {
                    setStudents(res.data);
                    // Load friendship statuses from pre-fetched data
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

    // Handle search debouncing or simple manual search
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

    // Show ShadowLoader if initial loading or switching tabs/searching
    if (loading && !refreshing && communities.length === 0 && students.length === 0) {
        return (
            <View style={styles.container}>
                <ShadowLoader type={activeTab === 'students' ? 'students' : 'marketplace'} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerArea}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color={colors.gray400} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={activeTab === 'communities' ? "Search communities..." : "Search students by name or department"}
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
                        style={[styles.tab, activeTab === 'communities' && styles.activeTab]}
                        onPress={() => setActiveTab('communities')}
                    >
                        <Text style={[styles.tabText, activeTab === 'communities' && styles.activeTabText]}>Communities</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'students' && styles.activeTab]}
                        onPress={() => setActiveTab('students')}
                    >
                        <Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>Students</Text>
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
                    <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.black} />
                }
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    activeTab === 'communities' ? (
                        <View style={styles.headerSection}>
                            <Text style={styles.headerSubtitle}>Discover & join communities</Text>
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.createBtn, { flex: 1 }]}
                                    onPress={() => router.push('/community/create')}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="add" size={18} color={colors.white} />
                                    <Text style={styles.createBtnText}>Start New Community</Text>
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
                            <ShadowLoader type={activeTab === 'students' ? 'students' : 'marketplace'} />
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons
                                name={activeTab === 'communities' ? "planet-outline" : "people-outline"}
                                size={48}
                                color={colors.gray300}
                                style={{ marginBottom: spacing.md }}
                            />
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'communities' ? "No communities yet" : "No students found"}
                            </Text>
                            <Text style={styles.emptySub}>
                                {activeTab === 'communities' ? "Be the first to start one!" : "Try a different search term"}
                            </Text>
                        </View>
                    )
                }
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    headerArea: {
        backgroundColor: colors.white,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray200,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray50,
        borderRadius: radii.sm,
        paddingHorizontal: 12,
        height: 44,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.black,
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
    activeTab: {
        borderBottomColor: colors.black,
    },
    tabText: {
        fontFamily: fonts.semibold,
        fontSize: 14,
        color: colors.gray500,
    },
    activeTabText: {
        color: colors.black,
    },
    headerSection: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    headerSubtitle: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray500,
        marginBottom: spacing.md,
    },
    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    createBtn: {
        backgroundColor: colors.black,
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
        color: colors.white,
    },
    card: {
        backgroundColor: colors.white,
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.gray100,
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
        backgroundColor: colors.gray50,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    officialAvatar: {
        backgroundColor: colors.black,
        borderColor: colors.black,
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
        color: colors.black,
    },
    cardType: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.gray500,
        marginTop: 2,
    },
    cardDesc: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray600,
        lineHeight: 20,
        marginTop: 12,
        paddingLeft: 4,
    },
    actionArrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.gray50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    studentAvatar: {
        width: 48,
        height: 48,
        borderRadius: 14, // Modern 'squircle' curve
        backgroundColor: colors.gray50,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    avatarInitial: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: colors.gray500,
    },
    cardInfo: { flex: 1 },
    usernameText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray500,
        marginTop: 1,
    },
    universityText: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: colors.gray400,
        marginTop: 2,
    },
    friendsBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.black,
        borderRadius: 20,
    },
    friendsBtnPending: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.gray50,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gray200,
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
        color: colors.white,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: colors.black,
    },
    emptySub: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray500,
        marginTop: 6,
        textAlign: 'center',
    },
});
