import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Share, Alert, Modal } from 'react-native';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { getUser, blockUser, unblockUser } from '../../src/api/users';
import { getUserPosts } from '../../src/api/posts';
import { getUserEvents } from '../../src/api/events';
import { getUserPolls } from '../../src/api/polls';
import { getUserJobs } from '../../src/api/jobs';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { sendFriendRequest, getFriendshipStatus, getFriendsCount, removeFriend } from '../../src/api/friends';
import PostCard from '../../src/components/PostCard';
import EventCard from '../../src/components/EventCard';
import PollCard from '../../src/components/PollCard';
import JobCard from '../../src/components/JobCard';
import SkeletonLoader from '../../src/components/SkeletonLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../src/components/ActionModal';
import { useToast } from '../../src/context/ToastContext';

type TabType = 'posts' | 'events' | 'polls' | 'jobs';

const TABS: { key: TabType, icon: string }[] = [
    { key: 'posts', icon: 'grid-outline' },
    { key: 'events', icon: 'calendar-outline' },
    { key: 'polls', icon: 'stats-chart-outline' },
    { key: 'jobs', icon: 'briefcase-outline' },
];

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams();
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('posts');
    const [content, setContent] = useState<any[]>([]);
    const [contentLoading, setContentLoading] = useState(false);
    const [friendStatus, setFriendStatus] = useState<string>('none');
    const [friendshipId, setFriendshipId] = useState<string | null>(null);
    const [friendCount, setFriendCount] = useState(0);
    const [sendingRequest, setSendingRequest] = useState(false);
    const [fullAvatarVisible, setFullAvatarVisible] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionTitle, setActionTitle] = useState('');
    const [actionOptions, setActionOptions] = useState<any[]>([]);
    const router = useRouter();
    const { showToast } = useToast();

    const isUUID = (str: string) => {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    };

    const loadProfileData = async () => {
        try {
            let res;
            if (isUUID(id as string)) {
                res = await getUser(id as string);
            } else {
                const { getByUsername } = await import('../../src/api/users');
                res = await getByUsername(id as string);
            }
            
            if (res?.data) {
                setProfile(res.data);
                loadFriendData(res.data.id);
                loadCount(res.data.id);
            }
        } catch (e) {
            console.log('Error loading profile', e);
        } finally {
            setLoading(false);
        }
    };

    const loadTabContent = async (tab: TabType, targetId: string) => {
        if (!targetId) return;
        setContentLoading(true);
        try {
            let res;
            if (tab === 'posts') res = await getUserPosts(targetId);
            else if (tab === 'events') res = await getUserEvents(targetId);
            else if (tab === 'polls') res = await getUserPolls(targetId);
            else if (tab === 'jobs') res = await getUserJobs(targetId);
            setContent(res?.data || []);
        } catch (e) {
            console.log('Error loading tab content', e);
        } finally {
            setContentLoading(false);
        }
    };

    const handleShareProfile = async () => {
        if (!profile?.id) return;
        try {
            const shareUrl = `https://uni-platform.app/user/${profile.id}`;
            await Share.share({
                title: `Check out ${profile.name}'s profile on Uni!`,
                message: `Check out ${profile.name}'s student profile on Uni Hub: ${shareUrl}`,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const loadFriendData = async (targetId: string) => {
        if (!currentUser || currentUser.id === targetId) return;
        try {
            const statusRes = await getFriendshipStatus(targetId);
            if (statusRes?.data) {
                setFriendStatus(statusRes.data.status || 'none');
                setFriendshipId(statusRes.data.id || null);
            }
        } catch (e) { /* ignore */ }
    };

    const loadCount = async (targetId: string) => {
        try {
            const countRes = await getFriendsCount(targetId);
            if (countRes?.data) setFriendCount(countRes.data.count || 0);
        } catch (e) { /* ignore */ }
    };

    useEffect(() => { loadProfileData(); }, [id]);
    useEffect(() => { 
        if (profile?.id) loadTabContent(activeTab, profile.id); 
    }, [activeTab, profile?.id]);

    useEffect(() => {
        const loadCount = async () => {
            try {
                const countRes = await getFriendsCount(id as string);
                if (countRes?.data) setFriendCount(countRes.data.count || 0);
            } catch (e) { /* ignore */ }
        };
        loadCount();
    }, [id]);

    const confirmRemoval = async (isPending: boolean) => {
        setSendingRequest(true);
        setShowActionModal(false);
        try {
            await removeFriend(id as string);
            setFriendStatus('none');
            if (!isPending) setFriendCount(prev => Math.max(0, prev - 1));
            showToast({ 
                title: isPending ? 'Request Cancelled' : 'Friend Removed', 
                message: isPending 
                    ? 'Your connection request has been withdrawn.'
                    : `You are no longer friends with ${profile?.name}.`, 
                type: 'info' 
            });
        } catch (e) {
            console.log('Removal error', e);
            Alert.alert('Error', 'Failed to update connection. Please try again.');
        } finally {
            setSendingRequest(false);
        }
    };

    const handleFriendRemoval = () => {
        const isPending = friendStatus === 'pending';
        setActionTitle(isPending ? 'Manage Request' : 'Manage Friendship');
        setActionOptions([
            {
                label: isPending ? 'Cancel Sent Request' : 'Unfriend Student',
                icon: 'close-circle-outline',
                destructive: true,
                onPress: () => confirmRemoval(isPending)
            }
        ]);
        setShowActionModal(true);
    };

    const handleFriendAction = async () => {
        if (!currentUser) return;
        if (friendStatus === 'accepted' || friendStatus === 'pending') {
            handleFriendRemoval();
            return;
        }
        if (friendStatus !== 'none') return;

        setSendingRequest(true);
        try {
            const res = await sendFriendRequest(id as string);
            if (res?.status === 'success') {
                setFriendStatus('pending');
                showToast({ title: 'Request Sent', message: 'Connection request sent successfully!', type: 'success' });
            }
        } catch (e) {
            console.log('Friend request error', e);
        } finally {
            setSendingRequest(false);
        }
    };

    const handleMessage = async () => {
        if (!currentUser) return;
        try {
            const { createConversation } = await import('../../src/api/messages');
            const res = await createConversation({ type: 'direct', participant_ids: [id as string] });
            if (res?.data?.id) {
                router.push(`/chat/${res.data.id}`);
            }
        } catch (e) {
            console.log('Failed to start chat', e);
            Alert.alert('Error', 'Could not open chat.');
        }
    };

    const handleProfileOptions = () => {
        setActionTitle('Profile Options');
        const isBlocked = profile?.is_blocked_by_me;
        setActionOptions([
            {
                label: isBlocked ? 'Unblock User' : 'Block User',
                icon: isBlocked ? 'lock-open-outline' : 'ban-outline',
                destructive: !isBlocked,
                onPress: isBlocked ? confirmUnblock : confirmBlock
            }
        ]);
        setShowActionModal(true);
    };

    const confirmBlock = () => {
        Alert.alert(
            'Block User',
            `Are you sure you want to block ${profile?.name}? They won't be able to message you or see your content.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Block', style: 'destructive', onPress: performBlock }
            ]
        );
    };

    const confirmUnblock = () => {
        Alert.alert(
            'Unblock User',
            `Are you sure you want to unblock ${profile?.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Unblock', style: 'default', onPress: performUnblock }
            ]
        );
    };

    const performBlock = async () => {
        try {
            await blockUser(profile?.id || id);
            setProfile((prev: any) => ({ ...prev, is_blocked_by_me: true }));
            showToast({ title: 'User Blocked', message: `${profile?.name} has been blocked.`, type: 'info' });
        } catch (e) {
            Alert.alert('Error', 'Could not block user. Try again.');
        }
    };

    const performUnblock = async () => {
        try {
            await unblockUser(profile?.id || id);
            setProfile((prev: any) => ({ ...prev, is_blocked_by_me: false }));
            showToast({ title: 'User Unblocked', message: `${profile?.name} has been unblocked.`, type: 'success' });
        } catch (e) {
            Alert.alert('Error', 'Could not unblock user. Try again.');
        }
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <Stack.Screen options={{ title: '', headerBackTitle: '' }} />
            <ActivityIndicator size="small" color={colors.black} />
        </View>
    );

    if (!profile) return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Profile' }} />
            <View style={styles.centered}>
                <Text style={styles.errorText}>User profile not found</Text>
            </View>
        </View>
    );

    const initial = profile?.name?.[0]?.toUpperCase() || '?';

    const showScoreContext = () => {
        showToast({
            title: "UniScore & Reputation",
            message: "UniScore reflects your campus impact. Earn points by sharing resources, organizing events, and engaging with peers.",
            type: 'info'
        });
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: profile?.username ? `@${profile.username}` : '',
                headerBackTitle: '',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: colors.white },
                headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16 },
                headerRight: () => currentUser?.id !== id ? (
                    <TouchableOpacity onPress={handleProfileOptions} style={{ padding: 8 }}>
                        <Ionicons name="ellipsis-horizontal" size={22} color={colors.black} />
                    </TouchableOpacity>
                ) : null
            }} />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* IG-style header */}
                <View style={styles.header}>
                    <View style={styles.topRow}>
                        <TouchableOpacity activeOpacity={0.8} onPress={() => profile?.avatar_url && setFullAvatarVisible(true)}>
                            <View style={styles.avatarRing}>
                                <View style={styles.avatar}>
                                    {profile?.avatar_url ? (
                                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                                    ) : (
                                        <Text style={styles.avatarText}>{initial}</Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.statsRow}>
                            <View style={styles.statPill}>
                                <Text style={styles.statNumber}>{content.length || 0}</Text>
                                <Text style={styles.statLabel}>Posts</Text>
                            </View>
                            <View style={styles.statPill}>
                                <Text style={styles.statNumber}>{friendCount}</Text>
                                <Text style={styles.statLabel}>Friends</Text>
                            </View>
                            <TouchableOpacity style={styles.statPill} onPress={showScoreContext} activeOpacity={0.7}>
                                <Text style={styles.statNumber}>{profile?.user_score || 0}</Text>
                                <Text style={styles.statLabel}>Score</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Name & bio */}
                    <View style={styles.bioSection}>
                        <Text style={styles.displayName}>{profile?.name || 'User Name'}</Text>
                        
                        {profile?.universities?.name && (
                            <View style={styles.metaRow}>
                                <Ionicons name="school-outline" size={13} color={colors.gray500} />
                                <Text style={styles.metaText}>{profile.universities.name}</Text>
                            </View>
                        )}

                        {profile?.bio ? (
                            <Text style={styles.bioText}>{profile.bio}</Text>
                        ) : null}

                        {(profile?.hometown || profile?.age || profile?.relationship_status) && (
                            <View style={styles.detailsRow}>
                                {profile?.hometown && (
                                    <View style={styles.detailPill}>
                                        <Ionicons name="location-outline" size={12} color={colors.gray500} />
                                        <Text style={styles.detailText}>{profile.hometown}</Text>
                                    </View>
                                )}
                                {profile?.age && (
                                    <View style={styles.detailPill}>
                                        <Ionicons name="calendar-outline" size={12} color={colors.gray500} />
                                        <Text style={styles.detailText}>{profile.age}</Text>
                                    </View>
                                )}
                                {profile?.relationship_status && (
                                    <View style={styles.detailPill}>
                                        <Ionicons name="heart-outline" size={12} color={colors.gray500} />
                                        <Text style={styles.detailText}>{profile.relationship_status}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Action Buttons */}
                    {profile?.is_blocked_by_me || profile?.has_blocked_me ? (
                        <View style={styles.blockedCard}>
                            <Ionicons name="ban-outline" size={36} color={colors.gray400} style={{ marginBottom: 12 }} />
                            <Text style={styles.blockedTitle}>
                                {profile?.is_blocked_by_me ? 'User Blocked' : 'Profile Unavailable'}
                            </Text>
                            <Text style={styles.blockedDesc}>
                                {profile?.is_blocked_by_me 
                                    ? `You have blocked ${profile?.name}. Unblock them to interact.`
                                    : 'You cannot view this user\u2019s content.'}
                            </Text>
                            {profile?.is_blocked_by_me && (
                                <TouchableOpacity style={styles.unblockBtn} onPress={confirmUnblock}>
                                    <Text style={styles.unblockBtnText}>Unblock</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <>
                            <View style={styles.actionRow}>
                                {currentUser?.id !== id && (
                                    <TouchableOpacity
                                        style={[
                                            styles.actionBtn,
                                            friendStatus === 'none' ? styles.btnPrimary :
                                            friendStatus === 'pending' ? styles.btnMuted :
                                            styles.btnLight
                                        ]}
                                        onPress={handleFriendAction}
                                        disabled={sendingRequest}
                                    >
                                        {sendingRequest ? (
                                            <ActivityIndicator size="small" color={friendStatus === 'none' ? colors.white : colors.black} />
                                        ) : (
                                            <Text style={[
                                                styles.actionBtnText,
                                                friendStatus !== 'none' && { color: colors.black }
                                            ]}>
                                                {friendStatus === 'accepted' ? 'Friends' :
                                                 friendStatus === 'pending' ? 'Requested' :
                                                 'Connect'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                                {currentUser?.id !== id && (
                                    <TouchableOpacity style={[styles.actionBtn, styles.btnLight]} onPress={handleMessage}>
                                        <Text style={[styles.actionBtnText, { color: colors.black }]}>Message</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={styles.shareBtn} onPress={handleShareProfile}>
                                    <Ionicons name="share-outline" size={18} color={colors.black} />
                                </TouchableOpacity>
                            </View>

                            {/* Pill-style Tab Bar */}
                            {/* Segmented Pill Tab Bar */}
                            <View style={styles.tabsContainer}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.tabContent}
                                >
                                    {TABS.map(({ key, icon }) => (
                                        <TouchableOpacity
                                            key={key}
                                            style={[styles.tabPill, activeTab === key && styles.activeTabPill]}
                                            onPress={() => setActiveTab(key)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={(activeTab === key ? icon.replace('-outline', '') : icon) as any}
                                                size={16}
                                                color={activeTab === key ? colors.white : colors.gray600}
                                            />
                                            <Text style={[styles.tabLabel, activeTab === key && styles.activeTabLabel]}>
                                                {key.charAt(0).toUpperCase() + key.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </>
                    )}
                </View>

                {/* Content */}
                {!(profile?.is_blocked_by_me || profile?.has_blocked_me) && (
                    <View style={styles.contentArea}>
                        {contentLoading ? (
                            <SkeletonLoader />
                        ) : content.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons
                                    name={
                                        activeTab === 'posts' ? 'camera-outline' :
                                        activeTab === 'events' ? 'calendar-outline' :
                                        activeTab === 'polls' ? 'stats-chart-outline' :
                                        'briefcase-outline'
                                    }
                                    size={48}
                                    color={colors.gray300}
                                />
                                <Text style={styles.emptyTitle}>No {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Yet</Text>
                            </View>
                        ) : (
                            content.map((item) => {
                                if (activeTab === 'posts') return <PostCard key={item.id} post={item} hideNavigation={false} />;
                                if (activeTab === 'events') return <EventCard key={item.id} event={item} />;
                                if (activeTab === 'polls') return <PollCard key={item.id} poll={item} />;
                                if (activeTab === 'jobs') return <JobCard key={item.id} job={item} />;
                                return null;
                            })
                        )}
                    </View>
                )}
            </ScrollView>

            <ActionModal visible={showActionModal} onClose={() => setShowActionModal(false)} title={actionTitle} options={actionOptions} />

            <Modal visible={fullAvatarVisible} transparent animationType="fade">
                <View style={styles.previewOverlay}>
                    <TouchableOpacity onPress={() => setFullAvatarVisible(false)} style={styles.previewClose}>
                        <Ionicons name="close" size={28} color={colors.white} />
                    </TouchableOpacity>
                    <Image source={{ uri: profile?.avatar_url || '' }} style={styles.previewImage} resizeMode="contain" />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontFamily: fonts.regular, fontSize: 16, color: colors.gray500 },

    // Header
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: 0,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarRing: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: colors.gray200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 40,
        color: colors.gray400,
    },

    // Stats
    statsRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginLeft: spacing.md,
        gap: 8,
    },
    statPill: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: colors.gray50,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    statNumber: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.black,
    },
    statLabel: {
        fontFamily: fonts.medium,
        fontSize: 10,
        color: colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 2,
    },

    // Bio
    bioSection: {
        marginTop: 18,
    },
    displayName: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: colors.black,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    metaText: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: colors.gray500,
    },
    bioText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.black,
        marginTop: 6,
        lineHeight: 19,
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        flexWrap: 'wrap',
    },
    detailPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray100,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radii.full,
        gap: 4,
    },
    detailText: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: colors.gray600,
        textTransform: 'capitalize',
    },

    // Actions
    actionRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 20,
    },
    actionBtn: {
        flex: 1,
        height: 42,
        borderRadius: radii.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnPrimary: {
        backgroundColor: colors.black,
    },
    btnLight: {
        backgroundColor: colors.gray100,
    },
    btnMuted: {
        backgroundColor: colors.gray100,
    },
    actionBtnText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.white,
    },
    shareBtn: {
        width: 42,
        height: 42,
        borderRadius: radii.full,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Blocked
    blockedCard: {
        alignItems: 'center',
        marginTop: 24,
        paddingVertical: 32,
        paddingHorizontal: 24,
        backgroundColor: colors.gray50,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    blockedTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.black, marginBottom: 6 },
    blockedDesc: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, textAlign: 'center', lineHeight: 18 },
    unblockBtn: {
        marginTop: 16,
        backgroundColor: colors.black,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    unblockBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },

    // Tabs — Unified Pill Form
    tabsContainer: {
        marginTop: 24,
        backgroundColor: colors.gray50,
        padding: 5,
        borderRadius: radii.full,
    },
    tabContent: {
        flexDirection: 'row',
        gap: 4,
    },
    tabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: radii.full,
        gap: 6,
    },
    activeTabPill: {
        backgroundColor: colors.black,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabLabel: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: colors.gray500,
    },
    activeTabLabel: {
        color: colors.white,
    },

    // Content
    contentArea: { flex: 1, minHeight: 300 },
    emptyState: { alignItems: 'center', marginTop: 64, gap: 12 },
    emptyTitle: {
        fontFamily: fonts.medium,
        color: colors.gray400,
        fontSize: 14,
    },

    // Preview
    previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    previewClose: { position: 'absolute', top: 56, right: 20, zIndex: 10, padding: 8 },
    previewImage: { width: '100%', height: '80%' },
});
