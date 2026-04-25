import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, DeviceEventEmitter, Alert, Dimensions } from 'react-native';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { getProfile, deleteAccount } from '../../src/api/users';
import { getMyPosts } from '../../src/api/posts';
import { getMyEvents } from '../../src/api/events';
import { getMyMarketplaceListings } from '../../src/api/marketplace';
import { getMyPolls } from '../../src/api/polls';
import { getFriendsCount, getFriendRequests } from '../../src/api/friends';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import PostCard from '../../src/components/PostCard';
import EventCard from '../../src/components/EventCard';
import PollCard from '../../src/components/PollCard';
import MarketCard from '../../src/components/MarketCard';
import StudyCard from '../../src/components/StudyCard';
import JobCard from '../../src/components/JobCard';
import ShadowLoader from '../../src/components/ShadowLoader';
import FriendRequestBanner from '../../src/components/FriendRequestBanner';
import ProfileQRModal from '../../src/components/ProfileQRModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal } from 'react-native';
import { getUserStories } from '../../src/api/stories';
import StoryViewer from '../../src/components/StoryViewer';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../src/context/LanguageContext';
import { useDialog } from '../../src/context/DialogContext';
import { getDepartmentLabel, getRelationshipStatusLabel, getYearOfStudyLabel } from '../../src/utils/localization';
import { ICONS } from '../../src/constants/icons';
import { POST_COMMENT_COUNT_CHANGED_EVENT, applyPostCommentCountChange } from '../../src/utils/postCommentCount';
import BottomSheet from '../../src/components/BottomSheet';
import ActionModal from '../../src/components/ActionModal';


type ContentTabType = 'posts' | 'marketplace' | 'polls' | 'events' | 'study';
type TabType = ContentTabType | 'settings';

const buildTabs = (t: (k: any) => string) => ([
    { key: 'posts' as TabType, icon: 'grid-outline', label: t('post_tab') },
    { key: 'marketplace' as TabType, icon: 'storefront-outline', label: t('market_tab') },
    { key: 'polls' as TabType, icon: 'stats-chart-outline', label: t('polls') },
    { key: 'events' as TabType, icon: 'calendar-outline', label: t('events') },
    { key: 'study' as TabType, icon: 'school-outline', label: t('study_tab') },
]);

const timeAgo = (dateStr: string, t: (key: any) => string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('just_now');
    if (mins < 60) return t('minute_ago').replace('{{count}}', String(mins));
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('hour_ago').replace('{{count}}', String(hrs));
    const days = Math.floor(hrs / 24);
    if (days < 7) return t('day_ago').replace('{{count}}', String(days));
    return d.toLocaleDateString();
};

const buildReplyGroups = (items: any[]) => {
    const groups: Array<{ postId: string, postItem: any, replies: any[] }> = [];
    const groupsMap = new Map<string, { postId: string, postItem: any, replies: any[] }>();

    items.forEach((item) => {
        const postItem = Array.isArray(item.posts) ? item.posts[0] : item.posts;
        const postId = item.post_id || postItem?.id || `unknown-${item.id}`;

        let group = groupsMap.get(postId);
        if (!group) {
            group = { postId, postItem: postItem || null, replies: [] };
            groupsMap.set(postId, group);
            groups.push(group);
        }

        if (!group.postItem && postItem) {
            group.postItem = postItem;
        }

        group.replies.push(item);
    });

    return groups;
};

export default function ProfileScreen() {
    const { logout, user, savedAccounts, switchAccount, removeSavedAccount } = useAuth();
    const { theme, setTheme, colors, isDark } = useTheme();
    const { t, language, setLanguage } = useLanguage();
    const { prompt } = useDialog();
    const TABS = buildTabs(t);

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('posts');
    const [content, setContent] = useState<any[]>([]);
    const [contentLoading, setContentLoading] = useState(false);
    const [showLegalModal, setShowLegalModal] = useState<{ visible: boolean, type: 'privacy' | 'terms' }>({ visible: false, type: 'privacy' });
    const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [friendCount, setFriendCount] = useState(0);
    const [pendingRequests, setPendingRequests] = useState(0);
    const [showQRModal, setShowQRModal] = useState(false);
    const [storyEvent, setStoryEvent] = useState<any>(null);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [fetchingStory, setFetchingStory] = useState(false);
    const [showRankModal, setShowRankModal] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [showUniScoreModal, setShowUniScoreModal] = useState(false);
    const activeTabRef = useRef<TabType>('posts');
    const router = useRouter();
    const profileBackground = isDark ? colors.surface : colors.background;

    const getThemeLabel = (mode: 'light' | 'dark' | 'system') => {
        if (mode === 'light') return t('theme_light');
        if (mode === 'dark') return t('theme_dark');
        return t('theme_system');
    };

    const handleUniScorePress = () => {
        setShowUniScoreModal(true);
    };

    const loadProfileData = async () => {
        try {
            const res = await getProfile();
            if (res?.data) {
                setProfile(res.data);
            }
        } catch (e) {
            console.log('Error loading profile', e);
        } finally {
            setLoading(false);
        }

        // Fetch stories
        try {
            const storyRes = await getUserStories(user!.id);
            if (storyRes?.data?.event?.stories?.length) {
                setStoryEvent(storyRes.data.event);
            } else {
                setStoryEvent(null);
            }
        } catch (e) { /* ignore */ }
    };

    const loadTabContent = async (tab: TabType) => {
        if (tab === 'settings') return;
        setContentLoading(true);
        try {
            let res;
            let nextContent: any[] = [];

            if (tab === 'posts') {
                res = await getMyPosts();
                nextContent = (res?.data || []).filter((item: any) => !['event', 'poll', 'market', 'study'].includes(item.feed_type));
            } else if (tab === 'marketplace') {
                res = await getMyMarketplaceListings();
                nextContent = res?.data || [];
            } else if (tab === 'polls') {
                res = await getMyPolls();
                nextContent = res?.data || [];
            } else if (tab === 'events') {
                res = await getMyEvents();
                nextContent = res?.data || [];
            } else if (tab === 'study') {
                res = await getMyPosts();
                nextContent = (res?.data || []).filter((item: any) => item.feed_type === 'study');
            }

            setContent(nextContent);
        } catch (e) {
            console.log('Error loading tab content', e);
        } finally {
            setContentLoading(false);
        }
    };

    useEffect(() => {
        loadProfileData();
        if (activeTabRef.current !== 'settings') {
            loadTabContent(activeTabRef.current);
        }
        // Load pending requests for the banner
        const loadRequestData = async () => {
            try {
                const reqRes = await getFriendRequests();
                if (reqRes?.data) setPendingRequests(reqRes.data.length || 0);
            } catch (e) { /* ignore */ }
        };
        loadRequestData();
    }, []);

    useEffect(() => {
        activeTabRef.current = activeTab;
        loadTabContent(activeTab);
    }, [activeTab]);


    useEffect(() => {
        const commentCountSub = DeviceEventEmitter.addListener(POST_COMMENT_COUNT_CHANGED_EVENT, (data) => {
            if (activeTab !== 'posts' || !data?.postId) return;
            setContent(prev => prev.map(item => applyPostCommentCountChange(item, data)));
        });

        return () => commentCountSub.remove();
    }, [activeTab]);

    const handleItemDelete = (id: string) => {
        setContent(prev => prev.filter(item => item.id !== id));
    };

    const handleAccountSwitch = async (userId: string) => {
        if (userId === user?.id) return;
        setShowAccountSwitcher(false);
        await switchAccount(userId);
    };

    const handleAddAccount = () => {
        setShowAccountSwitcher(false);
        // Navigate to login but with a flag or just let them login
        router.push('/(auth)/login');
    };

    const handleDelete = async () => {
        const reason = await prompt({
            title: t('delete_account_label'),
            message: language === 'tr'
                ? 'Hesabını neden sildiğini yaz.'
                : language === 'ka'
                    ? 'მოკლედ დაწერე, რატომ შლი ანგარიშს.'
                    : 'Tell us why you are deleting your account.',
            placeholder: language === 'tr'
                ? 'Sebep'
                : language === 'ka'
                    ? 'მიზეზი'
                    : 'Reason',
            confirmText: t('delete_label'),
            cancelText: t('cancel_label'),
            requireInput: true,
        });

        if (!reason) return;

        try {
            await deleteAccount(reason);
            await logout();
        } catch (e: any) {
            Alert.alert(t('error'), e.message);
        }
    };

    const renderReplyContentWithMentions = (replyContent: string) => {
        if (!replyContent) return null;
        const parts = replyContent.split(/(@[\w.-]+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);
                return (
                    <Text
                        key={index}
                        style={{ color: colors.blue, fontFamily: fonts.semibold }}
                        onPress={() => router.push(`/user/${username}`)}
                    >
                        {part}
                    </Text>
                );
            }
            return <Text key={index}>{part}</Text>;
        });
    };

    const initial = (profile?.name || user?.name)?.[0]?.toUpperCase() || 'U';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: profileBackground }]} edges={['top']}>
            {/* Native Header equivalent */}
            <View
                style={[styles.navHeader, { backgroundColor: profileBackground, borderBottomColor: colors.border }]}
            >
                {activeTab === 'settings' ? (
                    <>
                        <TouchableOpacity
                            onPress={() => setActiveTab('posts')}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            activeOpacity={0.7}
                            style={styles.headerMenuBtn}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.black} />
                        </TouchableOpacity>
                        <Text style={[styles.navHeaderTitle, { color: colors.black }]}>{t('settings')}</Text>
                        <View style={{ width: 36 }} />
                    </>
                ) : (
                    <>
                        <View style={{ width: 36 }} />
                        <Text style={[styles.navHeaderTitle, { color: colors.black }]}>
                            {profile?.username 
                                ? `@${profile.username}` 
                                : (user?.profile?.username ? `@${user.profile.username}` : (profile?.name || user?.name || t('profile')))}
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/settings')}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            activeOpacity={0.7}
                            style={styles.headerMenuBtn}
                        >
                            <Ionicons name="menu-outline" size={26} color={colors.black} />
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {loading ? (
                <View style={{ flex: 1 }}>
                    <ShadowLoader type="profile" />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[]}>
                    {/* IG-style header — hidden when settings is active */}
                    {activeTab !== 'settings' && (
                        <View style={styles.header}>
                    <View style={styles.topRow}>
                        <TouchableOpacity 
                            style={styles.avatarRing} 
                            onPress={() => {
                                if (storyEvent?.stories?.length) setViewerVisible(true);
                                else router.push('/edit-profile');
                            }}
                            activeOpacity={0.9}
                        >
                            {storyEvent?.stories?.length ? (
                                <LinearGradient
                                    colors={['#A154F2', '#3B82F6', isDark ? colors.gray50 : colors.gray100]}
                                    style={styles.gradientBorder}
                                >
                                    <View style={[styles.avatar, { backgroundColor: profileBackground, borderColor: profileBackground }]}>
                                        {profile?.avatar_url ? (
                                            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                                        ) : (
                                            <Text style={[styles.avatarText, { color: colors.gray400 }]}>{initial}</Text>
                                        )}
                                    </View>
                                </LinearGradient>
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: profileBackground }]}>
                                    {profile?.avatar_url ? (
                                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                                    ) : (
                                        <Text style={[styles.avatarText, { color: colors.gray400 }]}>{initial}</Text>
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.statsRow}>
                            <View style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.statNumber, { color: colors.black }]}>{profile?.posts_count || 0}</Text>
                                <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('posts')}</Text>
                            </View>
                            <TouchableOpacity style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/friends/list')} activeOpacity={0.7}>
                                <Text style={[styles.statNumber, { color: colors.black }]}>{profile?.friends_count || 0}</Text>
                                <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('friends_label')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={handleUniScorePress}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.statNumber, { color: colors.black }]}>{profile?.user_score || 0}</Text>
                                <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('uniscore_label')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>


                    {/* Name & bio */}
                    <View style={styles.bioSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.displayName, { color: colors.black }]}>{profile?.name || 'User Name'}</Text>
                            {profile?.show_rank !== false && profile?.campus_rank && (
                                <TouchableOpacity style={[styles.campusRankBadge, { backgroundColor: isDark ? '#3D1B21' : '#FFEBF0' }]} onPress={() => setShowRankModal(true)}>
                                    <Text style={styles.campusRankText}>#{profile.campus_rank}</Text>
                                </TouchableOpacity>
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
                                    {getDepartmentLabel(profile.department, t)}
                                    {profile?.show_year !== false && profile.year_of_study ? ' • ' : ''}
                                    {profile?.show_year !== false && profile.year_of_study
                                        ? getYearOfStudyLabel(String(profile.year_of_study), language, t)
                                        : ''}
                                </Text>
                            </View>
                        )}

                        <Text style={[styles.bioText, { color: colors.black }]}>
                            {profile?.bio || 'Add a bio to tell students about yourself'}
                        </Text>


                                {((profile?.show_hometown !== false && profile?.hometown) || (profile?.show_age !== false && profile?.age) || (profile?.show_relationship !== false && profile?.relationship_status)) && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: spacing.lg }} style={{ marginTop: 12, marginLeft: -spacing.lg, paddingLeft: spacing.lg }}>
                                        {profile?.show_hometown !== false && profile?.hometown && (
                                            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={[styles.detailIconBox, { backgroundColor: '#3B82F6' }]}>
                                                    <Image source={ICONS.location.white} style={{ width: 12, height: 12 }} />
                                                </View>
                                                <Text style={[styles.detailCardText, { color: colors.black }]}>{profile.hometown}</Text>
                                            </View>
                                        )}
                                        {profile?.show_age !== false && profile?.age && (
                                            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={[styles.detailIconBox, { backgroundColor: '#A855F7' }]}>
                                                    <Image source={ICONS.age.white} style={{ width: 12, height: 12 }} />
                                                </View>
                                                <Text style={[styles.detailCardText, { color: colors.black }]}>
                                                    {language === 'tr'
                                                        ? `${profile.age} Yaş`
                                                        : language === 'ka'
                                                            ? `${profile.age} წ.`
                                                            : `${profile.age} yrs`}
                                                </Text>
                                            </View>
                                        )}
                                        {profile?.show_relationship !== false && profile?.relationship_status && (
                                            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={[styles.detailIconBox, { backgroundColor: '#EC4899' }]}>
                                                    <Image source={ICONS.marital.white} style={{ width: 12, height: 12 }} />
                                                </View>
                                                <Text style={[styles.detailCardText, { color: colors.black }]}>
                                                    {getRelationshipStatusLabel(profile.relationship_status, language)}
                                                </Text>
                                            </View>
                                        )}
                                    </ScrollView>
                                )}
                    </View>

                    {/* Completion Prompt */}
                    {(!profile?.bio || !profile?.avatar_url) && (
                        <TouchableOpacity
                            style={[styles.completionPrompt, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <Ionicons name="sparkles" size={16} color={colors.black} />
                            <Text style={[styles.completionText, { color: colors.black }]}> Complete your profile to stand out!</Text>
                            <Ionicons name="chevron-forward" size={14} color={colors.black} />
                        </TouchableOpacity>
                    )}

                    <FriendRequestBanner variant="inline" />

                    {/* Action Buttons */}
                    <View style={[styles.actionRow, language === 'ka' && styles.actionRowStacked]}>
                        <TouchableOpacity
                            style={[styles.actionBtn, language === 'ka' && styles.actionBtnStacked, { backgroundColor: isDark ? colors.surface : colors.gray200, borderWidth: 1, borderColor: colors.border }]}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <Text style={[styles.actionBtnText, { color: colors.black }]}>{t('edit_profile')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, language === 'ka' && styles.actionBtnStacked, { backgroundColor: isDark ? colors.surface : colors.gray200, borderWidth: 1, borderColor: colors.border }]}
                            onPress={() => setShowQRModal(true)}
                        >
                            <Text style={[styles.actionBtnText, { color: colors.black }]}>{t('share_profile')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                )}

                {/* Segmented Tab Bar — Outside of padded header for full width */}
                {activeTab !== 'settings' && (
                <View style={[styles.tabsContainer, { borderBottomColor: colors.border, backgroundColor: profileBackground }]}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabScrollContent}
                        bounces={false}
                    >
                        {TABS.map(({ key, icon, label }) => (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.tabItem,
                                    {
                                        backgroundColor: activeTab === key ? colors.black : (isDark ? colors.surface : colors.gray100),
                                        borderColor: activeTab === key ? colors.black : colors.border,
                                    }
                                ]}
                                onPress={() => setActiveTab(key)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.tabContentInner}>
                                    <Ionicons
                                        name={icon as any}
                                        size={15}
                                        color={activeTab === key ? colors.white : colors.gray500}
                                    />
                                    <Text style={[
                                        styles.tabLabel, 
                                        { color: activeTab === key ? colors.white : colors.black }
                                    ]}>
                                        {label}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                )}

                {/* Content Area */}
                <View style={styles.contentArea}>
                    {activeTab === 'settings' ? (
                        <View style={styles.settingsSection}>
                            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => router.push('/friends/requests')}>
                                <View style={[styles.menuIconBox, { backgroundColor: colors.surface }]}><Ionicons name="people-outline" size={20} color={colors.black} /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuText, { color: colors.black }]}>{t('friend_requests')}</Text>
                                </View>
                                {pendingRequests > 0 && (
                                    <View style={[styles.requestBadge, { backgroundColor: colors.black }]}>
                                        <Text style={[styles.requestBadgeText, { color: colors.white }]}>{pendingRequests}</Text>
                                    </View>
                                )}
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.menuItem, { borderBottomColor: colors.border }]} 
                                onPress={() => setShowThemeModal(true)}
                            >
                                <View style={[styles.menuIconBox, { backgroundColor: colors.surface }]}>
                                    <Ionicons 
                                        name={theme === 'dark' ? "moon" : theme === 'light' ? "sunny" : "settings-outline"} 
                                        size={20} 
                                        color={colors.black} 
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuText, { color: colors.black }]}>{t('theme')}</Text>
                                    <Text style={[styles.menuSubText, { color: colors.gray500 }]}>{`${t('theme')}: ${getThemeLabel(theme as 'light' | 'dark' | 'system')}`}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.menuItem, { borderBottomColor: colors.border }]} 
                                onPress={() => setShowLanguageModal(true)}
                            >
                                <View style={[styles.menuIconBox, { backgroundColor: colors.surface }]}>
                                    <Ionicons name="language-outline" size={20} color={colors.black} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuText, { color: colors.black }]}>{t('language')}</Text>
                                    <Text style={[styles.menuSubText, { color: colors.gray500 }]}>
                                        {language === 'en' ? t('lang_en') : language === 'tr' ? t('lang_tr') : t('lang_ka')}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => setShowLegalModal({ visible: true, type: 'privacy' })}>
                                <View style={[styles.menuIconBox, { backgroundColor: colors.surface }]}><Ionicons name="lock-closed-outline" size={20} color={colors.black} /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuText, { color: colors.black }]}>{t('privacy_policy')}</Text>
                                    <Text style={[styles.menuSubText, { color: colors.gray500 }]}>{t('privacy_desc')}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => setShowLegalModal({ visible: true, type: 'terms' })}>
                                <View style={[styles.menuIconBox, { backgroundColor: colors.surface }]}><Ionicons name="document-text-outline" size={20} color={colors.black} /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuText, { color: colors.black }]}>{t('terms_of_use')}</Text>
                                    <Text style={[styles.menuSubText, { color: colors.gray500 }]}>{t('terms_desc')}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>


                            <TouchableOpacity
                                style={[styles.logoutBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                                onPress={async () => {
                                    setLoggingOut(true);
                                    await logout();
                                }}
                                disabled={loggingOut}
                            >
                                {loggingOut ? (
                                    <ActivityIndicator size="small" color="#FF3B30" />
                                ) : (
                                    <Text style={styles.logoutBtnText}>{t('logout_label')}</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                                <Text style={[styles.deleteBtnText, { color: colors.gray400 }]}>{t('delete_account_label')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            {contentLoading ? (
                                <ShadowLoader />
                            ) : content.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons
                                        name={
                                            activeTab === 'marketplace' ? 'pricetag-outline' :
                                                activeTab === 'polls' ? 'stats-chart-outline' :
                                                    activeTab === 'events' ? 'calendar-outline' :
                                                        activeTab === 'study' ? 'school-outline' :
                                                            'list-outline'
                                        }
                                        size={48}
                                        color={colors.gray300}
                                        style={{ marginBottom: spacing.md }}
                                    />
                                    <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('no_content_yet')}</Text>
                                </View>
                            ) : (
                                content.map((item) => {
                                    if (activeTab === 'posts') {
                                        if (item.feed_type === 'post') return <PostCard key={item.id || item.postId} post={item} showDelete={true} onDelete={handleItemDelete} />;
                                        if (item.feed_type === 'job') return <JobCard key={item.id} job={item} onDelete={handleItemDelete} />;
                                        return <PostCard key={item.id} post={item} showDelete={activeTab === 'posts'} onDelete={handleItemDelete} />;
                                    }
                                    if (activeTab === 'events') return <EventCard key={item.id} event={item} showDelete={true} onDelete={handleItemDelete} />;
                                    if (activeTab === 'polls') return <PollCard key={item.id} poll={item} showDelete={true} onDelete={handleItemDelete} />;
                                    if (activeTab === 'marketplace') return <MarketCard key={item.id} item={item} onDelete={handleItemDelete} />;
                                    if (activeTab === 'study') return <StudyCard key={item.id} question={item} onDelete={handleItemDelete} />;
                                    return null;
                                })
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
            )}

            {/* Legal Data Management Modal */}
            <BottomSheet visible={showLegalModal.visible} onClose={() => setShowLegalModal({ ...showLegalModal, visible: false })}>
                <Text style={[styles.modalTitle, { color: colors.black, marginBottom: 16 }]}>{showLegalModal.type === 'privacy' ? t('privacy_policy') : t('terms_of_use')}</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get('window').height * 0.5 }}>
                    <Text style={[styles.legalText, { color: colors.gray600, fontSize: 14, lineHeight: 20 }]}>
                        {showLegalModal.type === 'privacy'
                            ? t('privacy_desc')
                            : t('terms_desc')}
                    </Text>
                </ScrollView>
                <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: colors.black, marginTop: 24, width: '100%', height: 50 }]} 
                    onPress={() => setShowLegalModal({ ...showLegalModal, visible: false })}
                >
                    <Text style={[styles.actionBtnText, { color: colors.white }]}>{t('profile_settings_close') || 'Close'}</Text>
                </TouchableOpacity>
            </BottomSheet>

            {/* Rank Modal */}
            <BottomSheet visible={showRankModal} onClose={() => setShowRankModal(false)}>
                <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
                    <Ionicons name="medal" size={48} color="#E11D48" style={{ marginBottom: spacing.sm }} />
                    <Text style={[styles.statNumber, { fontSize: 32, color: '#E11D48', marginBottom: spacing.md }]}>#{profile?.campus_rank}</Text>
                    <Text style={[styles.legalText, { textAlign: 'center', color: colors.gray600, fontSize: 15, lineHeight: 22 }]}>
                        {t('campus_rank_self_body')
                            .replace('{{university}}', t('campus_rank_university_generic'))}
                    </Text>
                </View>
                <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: colors.black, marginTop: 24, width: '100%', height: 50 }]} 
                    onPress={() => setShowRankModal(false)}
                >
                    <Text style={[styles.actionBtnText, { color: colors.white }]}>{t('profile_settings_close') || 'Close'}</Text>
                </TouchableOpacity>
            </BottomSheet>

            <ProfileQRModal
                visible={showQRModal}
                onClose={() => setShowQRModal(false)}
                profile={{
                    name: profile?.name || 'Student',
                    username: profile?.username || 'user',
                    avatar_url: profile?.avatar_url,
                    university_name: profile?.universities?.name,
                }}
                onOpenScanner={() => router.push('/scan')}
            />

            <StoryViewer 
                visible={viewerVisible} 
                stories={storyEvent?.stories?.length ? [{ id: profile?.id, user: profile, stories: storyEvent.stories }] : []}
                initialUserIndex={0}
                onClose={() => setViewerVisible(false)} 
            />

            {/* Theme Selection */}
            <ActionModal
                visible={showThemeModal}
                onClose={() => setShowThemeModal(false)}
                title={t('select_theme')}
                options={[
                    { label: t('theme_light'), icon: 'sunny-outline', onPress: () => { setTheme('light'); setShowThemeModal(false); } },
                    { label: t('theme_dark'), icon: 'moon-outline', onPress: () => { setTheme('dark'); setShowThemeModal(false); } },
                    { label: t('theme_system'), icon: 'phone-portrait-outline', onPress: () => { setTheme('system'); setShowThemeModal(false); } },
                ]}
            />

            {/* Language Selection */}
            <ActionModal
                visible={showLanguageModal}
                onClose={() => setShowLanguageModal(false)}
                title={t('language')}
                options={[
                    { label: t('lang_en'), icon: 'language-outline', onPress: () => { setLanguage('en'); setShowLanguageModal(false); } },
                    { label: t('lang_tr'), icon: 'language-outline', onPress: () => { setLanguage('tr'); setShowLanguageModal(false); } },
                    { label: t('lang_ka'), icon: 'language-outline', onPress: () => { setLanguage('ka'); setShowLanguageModal(false); } },
                ]}
            />

            {/* UniScore Explanation Modal */}
            <BottomSheet visible={showUniScoreModal} onClose={() => setShowUniScoreModal(false)}>
                <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
                    <LinearGradient
                        colors={['#A154F2', '#3B82F6']}
                        style={{ width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md }}
                    >
                        <Ionicons name="flash" size={32} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={[styles.modalTitle, { fontSize: 28, marginBottom: spacing.sm, color: colors.black }]}>{profile?.user_score || 0}</Text>
                    <Text style={[styles.legalText, { textAlign: 'center', color: colors.black, fontSize: 16, lineHeight: 24 }]}>
                        {t('uniscore_body')}
                    </Text>
                </View>
                <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: colors.black, marginTop: 24, width: '100%', height: 50 }]} 
                    onPress={() => setShowUniScoreModal(false)}
                >
                    <Text style={[styles.actionBtnText, { color: colors.white }]}>{t('profile_settings_close') || 'Close'}</Text>
                </TouchableOpacity>
            </BottomSheet>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    navHeader: {
        height: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    navHeaderTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
    },
    headerMenuBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // IG-style layout match
    header: { paddingHorizontal: spacing.lg, paddingTop: 16 },
    topRow: { flexDirection: 'row', alignItems: 'center' },
    avatarRing: {
        width: 124, height: 124, borderRadius: 62,
        justifyContent: 'center', alignItems: 'center',
    },
    gradientBorder: {
        width: 120, height: 120, borderRadius: 60,
        padding: 4, justifyContent: 'center', alignItems: 'center',
    },
    avatar: {
        width: 112, height: 112, borderRadius: 56,
        justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontFamily: fonts.bold, fontSize: 40 },

    statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: spacing.md, gap: 8 },
    statPill: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 16, borderWidth: 1,
    },
    statNumber: { fontFamily: fonts.bold, fontSize: 16 },
    statLabel: { fontFamily: fonts.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
    uniScoreHintPill: {
        marginTop: 10,
        borderRadius: radii.full,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    uniScoreHintText: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 12,
        lineHeight: 16,
    },

    bioSection: { marginTop: 18 },
    displayName: { fontFamily: fonts.bold, fontSize: 15 },
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
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    metaText: { fontFamily: fonts.regular, fontSize: 13 },
    bioText: { fontFamily: fonts.regular, fontSize: 14, marginTop: 6, lineHeight: 19 },

    detailCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 10,
        paddingLeft: 4,
        paddingVertical: 3,
        borderRadius: radii.full,
        gap: 5,
        borderWidth: 1,
    },
    detailIconBox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailCardText: {
        fontFamily: fonts.semibold,
        fontSize: 12,
        textTransform: 'capitalize',
    },

    completionPrompt: { padding: 12, borderRadius: radii.md, marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
    completionText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13 },

    // Pill actions
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
    actionRowStacked: { flexDirection: 'column' },
    actionBtn: { flex: 1, height: 42, borderRadius: radii.full, justifyContent: 'center', alignItems: 'center' },
    actionBtnStacked: { width: '100%' },
    btnLight: { },
    actionBtnText: { fontFamily: fonts.bold, fontSize: 13 },

    // Pill Tab Bar
    tabsContainer: { 
        marginTop: 18,
        paddingTop: 4,
        paddingBottom: 2,
    },
    tabScrollContent: {
        flexDirection: 'row',
        paddingLeft: spacing.lg,
        paddingRight: spacing.lg,
        gap: 8,
    },
    tabItem: {
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 84,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radii.full,
        borderWidth: 1,
    },
    activeTabItem: {
    },
    tabContentInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tabLabel: { 
        fontFamily: fonts.bold, 
        fontSize: 12,
        letterSpacing: 0.1,
    },

    contentArea: { flex: 1, minHeight: 300, paddingBottom: 110 },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontFamily: fonts.medium, fontSize: 15, marginTop: 12 },

    // Settings
    settingsSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
    menuIconBox: { width: 36, height: 36, borderRadius: radii.full, justifyContent: 'center', alignItems: 'center' },
    menuText: { fontFamily: fonts.bold, fontSize: 15 },
    menuSubText: { fontFamily: fonts.medium, fontSize: 13, marginTop: 2 },

    logoutBtn: { marginTop: 32, height: 48, borderRadius: radii.full, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    logoutBtnText: { fontFamily: fonts.bold, color: '#FF3B30', fontSize: 15 },
    deleteBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
    deleteBtnText: { fontFamily: fonts.medium, fontSize: 13 },

    requestBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.full, marginRight: 8 },
    requestBadgeText: { fontFamily: fonts.bold, fontSize: 11 },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontFamily: fonts.bold, fontSize: 20 },
    legalText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 24 },
    selectorItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 12, borderWidth: 1, borderColor: 'transparent' },
    selectorText: { flex: 1, fontFamily: fonts.bold, fontSize: 16 },

    // Account Switcher
    accountItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5 },
    accountInfo: { flexDirection: 'row', alignItems: 'center' },
    smallAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 0.5 },
    smallAvatarText: { fontFamily: fonts.bold, fontSize: 16 },
    accountName: { fontFamily: fonts.bold, fontSize: 15 },
    accountUsername: { fontFamily: fonts.regular, fontSize: 13, marginTop: 1 },
    addAccountBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingVertical: 8 },
    addAccountIcon: { width: 36, height: 36, borderRadius: 18, borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    addAccountText: { fontFamily: fonts.bold, fontSize: 15 },

    // Reply Tab Styles
    replyMissingPost: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    replyMissingPostText: {
        fontFamily: fonts.medium,
        fontSize: 13,
    },
    replyBodyCard: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        gap: 12,
    },
    replyAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    replyAvatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 100,
    },
    replyAvatarText: {
        fontFamily: fonts.bold,
        fontSize: 15,
    },
    replyContentBody: {
        flex: 1,
    },
    replyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    replyAuthor: {
        fontFamily: fonts.semibold,
        fontSize: 13,
    },
    replyTime: {
        fontFamily: fonts.regular,
        fontSize: 11,
    },
    replyMenuBtn: {
        padding: 2,
    },
    replyToggleBtn: {
        paddingHorizontal: spacing.lg,
        paddingTop: 2,
        paddingBottom: 12,
    },
    replyToggleText: {
        marginLeft: 52,
        fontFamily: fonts.semibold,
        fontSize: 12,
    },
    replyContent: {
        fontFamily: fonts.regular,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 3,
    },
});
