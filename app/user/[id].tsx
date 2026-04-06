import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Share, Alert, Modal } from 'react-native';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { getUser, blockUser, unblockUser } from '../../src/api/users';
import { getUserPosts } from '../../src/api/posts';
import { getUserEvents } from '../../src/api/events';
import { getUserPolls } from '../../src/api/polls';
import { getUserMarketplaceListings } from '../../src/api/marketplace';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { sendFriendRequest, getFriendshipStatus, getFriendsCount, removeFriend } from '../../src/api/friends';
import PostCard from '../../src/components/PostCard';
import EventCard from '../../src/components/EventCard';
import PollCard from '../../src/components/PollCard';
import MarketCard from '../../src/components/MarketCard';
import SkeletonLoader from '../../src/components/SkeletonLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionModal from '../../src/components/ActionModal';
import { useToast } from '../../src/context/ToastContext';
import ShadowLoader from '../../src/components/ShadowLoader';
import { getUserStories } from '../../src/api/stories';
import StoryViewer from '../../src/components/StoryViewer';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../src/context/LanguageContext';

type TabType = 'posts' | 'events' | 'polls' | 'listings';

const TABS: { key: TabType, icon: string }[] = [
    { key: 'posts', icon: 'grid-outline' },
    { key: 'events', icon: 'calendar-outline' },
    { key: 'polls', icon: 'stats-chart-outline' },
    { key: 'listings', icon: 'cart-outline' },
];

export default function UserProfileScreen() {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const { id } = useLocalSearchParams();
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('posts');
    const [content, setContent] = useState<any[]>([]);
    const [contentLoading, setContentLoading] = useState(false);
    const [friendStatus, setFriendStatus] = useState<string>('none');
    const [friendshipId, setFriendshipId] = useState<string | null>(null);
    const [friendCount, setFriendCount] = useState<number | null>(null);
    const [postsCount, setPostsCount] = useState<number | null>(null);
    const [sendingRequest, setSendingRequest] = useState(false);
    const [fullAvatarVisible, setFullAvatarVisible] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionTitle, setActionTitle] = useState('');
    const [actionOptions, setActionOptions] = useState<any[]>([]);
    const [storyEvent, setStoryEvent] = useState<any>(null);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [showRankModal, setShowRankModal] = useState(false);
    const router = useRouter();
    const { showToast } = useToast();
    const [startingChat, setStartingChat] = useState(false);
    const isSelf = currentUser?.id === profile?.id;
    const profileBackground = isDark ? colors.surface : colors.background;

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
                const p = res.data;
                setProfile(p);
                setFriendCount(p.friends_count ?? 0);
                setPostsCount(p.posts_count ?? 0);
                setFriendStatus(p.friend_status ?? 'none');
                try {
                    const storyRes = await getUserStories(p.id);
                    if (storyRes?.data?.event?.stories?.length) {
                        setStoryEvent(storyRes.data.event);
                    } else {
                        setStoryEvent(null);
                    }
                } catch (e) {
                    setStoryEvent(null);
                }

                // Load tab content immediately once profile is resolved
                loadTabContent(activeTab, p.id);
            }
        } catch (e) {
            console.log('Error loading profile', e);
        } finally {
            setLoading(false);
        }
    };

    const loadTabContent = async (tab: TabType, targetId: string) => {
        if (!targetId || contentLoading) return;
        setContentLoading(true);
        try {
            let res;
            if (tab === 'posts') res = await getUserPosts(targetId);
            else if (tab === 'events') res = await getUserEvents(targetId);
            else if (tab === 'polls') res = await getUserPolls(targetId);
            else if (tab === 'listings') res = await getUserMarketplaceListings(targetId);
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
    }, [activeTab]);

    useEffect(() => {
        const { DeviceEventEmitter } = require('react-native');
        const sub = DeviceEventEmitter.addListener('profileUpdated', (updates: any) => {
            if (currentUser?.id && (profile?.id === currentUser.id || id === currentUser.id)) {
                setProfile((prev: any) => ({
                    ...prev,
                    name: updates.name,
                    avatar_url: updates.avatar_url,
                    bio: updates.bio,
                    username: updates.username
                }));
                setContent((prev: any[]) => prev.map(item => ({
                    ...item,
                    profiles: {
                        ...item.profiles,
                        name: updates.name,
                        avatar_url: updates.avatar_url
                    }
                })));
            }
        });

        const voteSub = DeviceEventEmitter.addListener('postVoted', (data: any) => {
            setContent((prev: any[]) => prev.map(item => {
                if (item.id === data.postId) {
                    return { ...item, my_vote: data.myVote, vote_count: data.voteCount };
                }
                return item;
            }));
        });

        return () => {
            sub.remove();
            voteSub.remove();
        };
    }, [currentUser, profile?.id, id]);



    const confirmRemoval = async (isPending: boolean) => {
        setSendingRequest(true);
        setShowActionModal(false);
        try {
            await removeFriend(profile?.id || (id as string));
            setFriendStatus('none');
            if (!isPending) setFriendCount(prev => Math.max(0, (prev || 0) - 1));
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
            const res = await sendFriendRequest(profile?.id || (id as string));
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
        if (!currentUser || startingChat) return;

        const isPlatform = profile?.is_admin || profile?.name === 'UniConn Platform' || profile?.id === '00000000-0000-0000-0000-000000000000';

        if (friendStatus !== 'accepted' && !isPlatform) {
            Alert.alert(
                'Friends Only',
                'You can only message your friends. Send a connection request first!',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Connect', onPress: handleFriendAction }
                ]
            );
            return;
        }

        setStartingChat(true);

        // The Chat screen natively handles creating/retrieving direct conversation IDs
        // given a target User ID, so we can route immediately with zero latency!
        router.push({
            pathname: '/chat/[id]',
            params: { id: profile?.id || (id as string), title: profile?.name || '' }
        });

        // Prevent double taps from nesting navigation, re-enable after 1000ms
        setTimeout(() => setStartingChat(false), 1000);
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
            },
            {
                label: 'Report Student',
                icon: 'flag-outline',
                destructive: true,
                onPress: handleReportUser
            }
        ]);
        setShowActionModal(true);
    };

    const handleReportUser = () => {
        setShowActionModal(false);
        setTimeout(() => {
            setActionTitle('Report Reason');
            setActionOptions([
                { label: 'Harassment', icon: 'hand-left-outline', onPress: () => confirmReport('Harassment') },
                { label: 'Spam or Scam', icon: 'mail-outline', onPress: () => confirmReport('Spam or Scam') },
                { label: 'Impersonation', icon: 'person-outline', onPress: () => confirmReport('Impersonation') },
                { label: 'Inappropriate Content', icon: 'image-outline', onPress: () => confirmReport('Inappropriate Content') },
                { label: 'Other', icon: 'help-circle-outline', onPress: () => confirmReport('Other') },
            ]);
            setShowActionModal(true);
        }, 300);
    };

    const confirmReport = async (reason: string) => {
        setShowActionModal(false);
        try {
            const { submitReport } = await import('../../src/api/reports');
            await submitReport({
                target_type: 'user',
                target_id: profile?.id || id as string,
                reason: reason
            });
            showToast({
                title: 'Report Submitted',
                message: 'Thank you for helping keep our community safe. Our team will review this report.',
                type: 'success'
            });
        } catch (e) {
            console.log('Report error', e);
            Alert.alert('Error', 'Failed to submit report. Please try again.');
        }
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
        <View style={[styles.container, { backgroundColor: profileBackground }]}>
            <Stack.Screen options={{ title: '', headerBackTitle: '', headerShadowVisible: false }} />
            <ShadowLoader type="profile" />
        </View>
    );

    if (profile === null || profile === undefined) return (
        <View style={[styles.container, { backgroundColor: profileBackground }]}>
            <Stack.Screen options={{ title: t('profile') || 'Profile' }} />
            <View style={styles.centered}>
                <Text style={[styles.errorText, { color: colors.gray500 }]}>{t('profile_not_found')}</Text>
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
        <View style={[styles.container, { backgroundColor: profileBackground }]}>
            <Stack.Screen options={{
                headerShown: true,
                title: profile?.username ? `@${profile.username}` : '',
                headerBackTitle: '',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: profileBackground },
                headerTintColor: colors.black,
                headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
                headerRight: () => !isSelf && profile ? (
                    <TouchableOpacity onPress={handleProfileOptions} style={{ padding: 8 }}>
                        <Ionicons name="ellipsis-horizontal" size={22} color={colors.black} />
                    </TouchableOpacity>
                ) : null
            }} />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* IG-style header */}
                <View style={styles.header}>
                    <View style={styles.topRow}>
                        <TouchableOpacity
                            style={styles.avatarRing}
                            onPress={() => {
                                if (storyEvent?.stories?.length) setViewerVisible(true);
                                else if (!profile?.avatar_url) { /* ignore */ }
                                else setFullAvatarVisible(true);
                            }}
                            activeOpacity={0.9}
                        >
                            {storyEvent?.stories?.length ? (
                                <LinearGradient
                                    colors={['#A154F2', '#3B82F6', isDark ? colors.gray50 : colors.gray100]}
                                    style={styles.gradientBorder}
                                >
                                    <View style={styles.avatar}>
                                        {profile?.avatar_url ? (
                                            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                                        ) : (
                                            <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>{initial}</Text>
                                        )}
                                    </View>
                                </LinearGradient>
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: profileBackground, borderColor: profileBackground }]}>
                                    {profile?.avatar_url ? (
                                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                                    ) : (
                                        <Text style={[styles.avatarText, { color: colors.gray500 }]}>{initial}</Text>
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.statsRow}>
                            <View style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.statNumber, { color: colors.black }]}>{activeTab === 'posts' ? content.length : (postsCount ?? 0)}</Text>
                                <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('posts') || 'Posts'}</Text>
                            </View>
                            <View style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.statNumber, { color: colors.black }]}>{friendCount ?? 0}</Text>
                                <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('friends_label')}</Text>
                            </View>
                            <TouchableOpacity style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={showScoreContext} activeOpacity={0.7}>
                                <Text style={[styles.statNumber, { color: colors.black }]}>{profile?.user_score || 0}</Text>
                                <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('score_label')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.bioSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.displayName, { color: colors.black }]}>{profile?.name || 'User Name'}</Text>
                            {profile?.show_rank !== false && profile?.campus_rank && (
                                <TouchableOpacity style={[styles.campusRankBadge, { backgroundColor: isDark ? '#3D1B21' : '#FFEBF0' }]} onPress={() => setShowRankModal(true)}>
                                    <Text style={styles.campusRankText}>#{profile.campus_rank}</Text>
                                </TouchableOpacity>
                            )}
                            {(profile?.is_admin || profile?.name === 'UniConn Platform') && (
                                <MaterialCommunityIcons name="check-decagram" size={16} color="#00A3FF" />
                            )}
                            {isSelf && (
                                <View style={[styles.selfBadge, { backgroundColor: isDark ? colors.surface : colors.gray100 }]}>
                                    <Text style={[styles.selfBadgeText, { color: colors.gray600 }]}>YOU</Text>
                                </View>
                            )}
                        </View>

                        {profile?.universities?.name && (
                            <View style={styles.metaRow}>
                                <Ionicons name="business-outline" size={13} color={colors.gray500} />
                                <Text style={[styles.metaText, { color: colors.gray500 }]}>
                                    {profile.universities.name}
                                </Text>
                            </View>
                        )}

                        {profile?.show_department !== false && profile?.department && (
                            <View style={[styles.metaRow, { marginTop: 2 }]}>
                                <Ionicons name="school-outline" size={13} color={colors.gray500} />
                                <Text style={[styles.metaText, { color: colors.gray500 }]}>
                                    {profile.department}
                                    {profile?.show_year !== false && profile.year_of_study ? ' • ' : ''}
                                    {profile?.show_year !== false && profile.year_of_study ? (() => {
                                        const y = parseInt(profile.year_of_study);
                                        if (profile.year_of_study === 'vats') return 'Vats';
                                        if (profile.year_of_study === 'graduated') return 'Graduated';
                                        if (y === 0) return 'Not graduated yet';
                                        let label = String(profile.year_of_study).slice(-2);
                                        return `Class of ${label.startsWith("'") ? label : "'" + label}`;
                                    })() : ''}
                                </Text>
                            </View>
                        )}

                        {profile?.bio ? (
                            <Text style={[styles.bioText, { color: colors.black }]}>{profile.bio}</Text>
                        ) : null}

                        {((profile?.show_hometown !== false && profile?.hometown) || (profile?.show_age !== false && profile?.age) || (profile?.show_relationship !== false && profile?.relationship_status)) && (
                            <View style={styles.detailsRow}>
                                {profile?.show_hometown !== false && profile?.hometown && (
                                    <View style={[styles.detailPill, { backgroundColor: colors.surface }]}>
                                        <Ionicons name="location-outline" size={12} color={colors.gray500} />
                                        <Text style={[styles.detailText, { color: colors.gray500 }]}>{profile.hometown}</Text>
                                    </View>
                                )}
                                {profile?.show_age !== false && profile?.age && (
                                    <View style={[styles.detailPill, { backgroundColor: colors.surface }]}>
                                        <Ionicons name="calendar-outline" size={12} color={colors.gray500} />
                                        <Text style={[styles.detailText, { color: colors.gray500 }]}>{profile.age}</Text>
                                    </View>
                                )}
                                {profile?.show_relationship !== false && profile?.relationship_status && (
                                    <View style={[styles.detailPill, { backgroundColor: colors.surface }]}>
                                        <Ionicons name="heart-outline" size={12} color={colors.gray500} />
                                        <Text style={[styles.detailText, { color: colors.gray500 }]}>{profile.relationship_status}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Action Buttons */}
                    {profile?.is_blocked_by_me || profile?.has_blocked_me ? (
                        <View style={[styles.blockedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Ionicons name="ban-outline" size={36} color={colors.gray400} style={{ marginBottom: 12 }} />
                            <Text style={[styles.blockedTitle, { color: colors.black }]}>
                                {profile?.is_blocked_by_me ? t('user_blocked') : t('profile_unavailable')}
                            </Text>
                            <Text style={[styles.blockedDesc, { color: colors.gray500 }]}>
                                {profile?.is_blocked_by_me
                                    ? t('block_desc_me')
                                    : t('block_desc_other')}
                            </Text>
                            {profile?.is_blocked_by_me && (
                                <TouchableOpacity style={[styles.unblockBtn, { backgroundColor: colors.black }]} onPress={confirmUnblock}>
                                    <Text style={[styles.unblockBtnText, { color: colors.white }]}>{t('unblock_label')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <>
                            <View style={styles.actionRow}>
                                {isSelf ? (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.gray200, borderWidth: 1, borderColor: colors.border }]}
                                        onPress={() => router.push('/edit-profile')}
                                    >
                                        <Text style={[styles.actionBtnText, { color: colors.black }]}>{t('edit_profile')}</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <>
                                        <TouchableOpacity
                                            style={[
                                                styles.actionBtn,
                                                friendStatus === 'none' ? { backgroundColor: colors.black } :
                                                    friendStatus === 'pending' ? { backgroundColor: isDark ? colors.surface : colors.gray200 } :
                                                        { backgroundColor: isDark ? colors.surface : colors.gray200, borderWidth: 1, borderColor: colors.border }
                                            ]}
                                            onPress={handleFriendAction}
                                            disabled={sendingRequest}
                                        >
                                            {sendingRequest ? (
                                                <ActivityIndicator size="small" color={friendStatus === 'none' ? colors.white : colors.black} />
                                            ) : (
                                                <Text style={[
                                                    styles.actionBtnText,
                                                    { color: friendStatus === 'none' ? colors.white : colors.black }
                                                ]}>
                                                    {friendStatus === 'accepted' ? t('friends_label') :
                                                        friendStatus === 'pending' ? t('requested_label') :
                                                            t('connect_label')}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.gray200, borderWidth: 1, borderColor: colors.border }]} 
                                            onPress={handleMessage}
                                        >
                                            <Text style={[styles.actionBtnText, { color: colors.black }]}>{t('message_label') || 'Message'}</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                            <View style={[styles.actionRow, { marginTop: 8 }]}>
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.gray200, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 8 }]} onPress={handleShareProfile}>
                                    <Ionicons name="share-outline" size={18} color={colors.black} />
                                    <Text style={[styles.actionBtnText, { color: colors.black }]}>{t('share_profile_label')}</Text>
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
                                            style={[
                                                styles.tabPill,
                                                {
                                                    backgroundColor: activeTab === key ? colors.black : (isDark ? colors.surface : colors.gray50),
                                                    borderWidth: 1,
                                                    borderColor: activeTab === key ? colors.black : colors.border,
                                                },
                                                activeTab === key && styles.activeTabPill
                                            ]}
                                            onPress={() => setActiveTab(key)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={(activeTab === key ? icon.replace('-outline', '') : icon) as any}
                                                size={16}
                                                color={activeTab === key ? colors.white : colors.gray500}
                                            />
                                            <Text style={[styles.tabLabel, { color: activeTab === key ? colors.white : colors.gray500 }]}>
                                                {key === 'posts' ? (t('post_tab' as any) || 'Posts') :
                                                 key === 'events' ? (t('event_tab' as any) || 'Events') :
                                                 key === 'polls' ? (t('poll_tab' as any) || 'Polls') :
                                                 (t('market_tab' as any) || 'Market')}
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
                            <ShadowLoader type="feed" />
                        ) : content.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons
                                    name={
                                        activeTab === 'posts' ? 'camera-outline' :
                                            activeTab === 'events' ? 'calendar-outline' :
                                                activeTab === 'polls' ? 'stats-chart-outline' :
                                                    'cart-outline'
                                    }
                                    size={48}
                                    color={colors.gray300}
                                />
                                <Text style={[styles.emptyTitle, { color: colors.gray500 }]}>{t('no_content_yet')}</Text>
                            </View>
                        ) : (
                            content.map((item) => {
                                if (activeTab === 'posts') return <PostCard key={item.id} post={item} hideNavigation={false} />;
                                if (activeTab === 'events') return <EventCard key={item.id} event={item} />;
                                if (activeTab === 'polls') return <PollCard key={item.id} poll={item} />;
                                if (activeTab === 'listings') return <MarketCard key={item.id} item={item} />;
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
                        <Ionicons name="close" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Image source={{ uri: profile?.avatar_url || '' }} style={styles.previewImage} resizeMode="contain" />
                </View>
            </Modal>

            {/* Rank Modal */}
            <Modal visible={showRankModal} transparent animationType="fade" onRequestClose={() => setShowRankModal(false)}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowRankModal(false)}>
                    <View style={{ backgroundColor: colors.surface, padding: spacing.xl, borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: 400 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                            <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.black }}>{t('campus_rank_label')}</Text>
                            <TouchableOpacity onPress={() => setShowRankModal(false)}>
                                <Ionicons name="close" size={24} color={colors.black} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
                            <Ionicons name="medal" size={48} color="#E11D48" style={{ marginBottom: spacing.sm }} />
                            <Text style={{ fontFamily: fonts.bold, fontSize: 32, color: '#E11D48', marginBottom: spacing.md }}>#{profile?.campus_rank}</Text>
                            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.gray600, textAlign: 'center', lineHeight: 20 }}>
                                {profile?.name}'s Pioneer Rank represents their early adoption status at {profile?.universities?.name || 'their university'}.
                                The lower the number, the earlier they joined the community. Because this is unique to their campus, they hold a permanent piece of history!
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            <StoryViewer
                visible={viewerVisible}
                stories={storyEvent?.stories?.length ? [{ id: profile?.id, user: profile, stories: storyEvent.stories }] : []}
                initialUserIndex={0}
                onClose={() => setViewerVisible(false)}
            />
        </View>
    );
} const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontFamily: fonts.regular, fontSize: 16 },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: 20,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarRing: {
        width: 124, height: 124, borderRadius: 62,
        justifyContent: 'center', alignItems: 'center',
    },
    gradientBorder: {
        width: 120, height: 120, borderRadius: 62,
        padding: 4, justifyContent: 'center', alignItems: 'center',
    },
    avatar: {
        width: 112, height: 112, borderRadius: 56,
        justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 40,
    },
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
        borderRadius: 16,
        borderWidth: 1,
    },
    statNumber: {
        fontFamily: fonts.bold,
        fontSize: 16,
    },
    statLabel: {
        fontFamily: fonts.medium,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    bioSection: {
        marginTop: 18,
    },
    displayName: {
        fontFamily: fonts.bold,
        fontSize: 16,
    },
    selfBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    selfBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        letterSpacing: 0.5,
    },
    campusRankBadge: {
        backgroundColor: '#FFEBF0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    campusRankText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: '#E11D48',
        letterSpacing: 0.5,
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
    },
    bioText: {
        fontFamily: fonts.regular,
        fontSize: 14,
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
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radii.full,
        gap: 4,
    },
    detailText: {
        fontFamily: fonts.medium,
        fontSize: 11,
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
    },
    btnLight: {
    },
    btnMuted: {
    },
    actionBtnText: {
        fontFamily: fonts.bold,
        fontSize: 14,
    },
    shareBtn: {
        width: 42,
        height: 42,
        borderRadius: radii.full,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Blocked
    blockedCard: {
        alignItems: 'center',
        marginTop: 24,
        paddingVertical: 32,
        paddingHorizontal: 24,
        borderRadius: radii.lg,
        borderWidth: 1,
    },
    blockedTitle: { fontFamily: fonts.bold, fontSize: 17, marginBottom: 6 },
    blockedDesc: { fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', lineHeight: 18 },
    unblockBtn: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    unblockBtnText: { fontFamily: fonts.bold, fontSize: 13 },

    // Tabs — Unified Pill Form
    tabsContainer: {
        marginTop: 24,
    },
    tabContent: {
        flexDirection: 'row',
        gap: 4,
        padding: 10
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabLabel: {
        fontFamily: fonts.bold,
        fontSize: 13,
    },
    activeTabLabel: {
    },

    // Content
    contentArea: { flex: 1, minHeight: 300 },
    emptyState: { alignItems: 'center', marginTop: 64, gap: 12 },
    emptyTitle: {
        fontFamily: fonts.medium,
        fontSize: 14,
    },

    // Preview
    previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    previewClose: { position: 'absolute', top: 56, right: 20, zIndex: 10, padding: 8 },
    previewImage: { width: '100%', height: '80%' },
});
