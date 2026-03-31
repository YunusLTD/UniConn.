import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { getProfile, deleteAccount } from '../../src/api/users';
import { getMyPosts } from '../../src/api/posts';
import { getMyEvents } from '../../src/api/events';
import { getMyPolls } from '../../src/api/polls';
import { getMyJobs } from '../../src/api/jobs';
import { getFriendsCount, getFriendRequests } from '../../src/api/friends';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import PostCard from '../../src/components/PostCard';
import EventCard from '../../src/components/EventCard';
import PollCard from '../../src/components/PollCard';
import JobCard from '../../src/components/JobCard';
import ShadowLoader from '../../src/components/ShadowLoader';
import FriendRequestBanner from '../../src/components/FriendRequestBanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal } from 'react-native';


type TabType = 'posts' | 'events' | 'polls' | 'jobs' | 'settings';

const TABS: { key: TabType, icon: string }[] = [
    { key: 'posts', icon: 'grid-outline' },
    { key: 'events', icon: 'calendar-outline' },
    { key: 'settings', icon: 'settings-outline' },
];

export default function ProfileScreen() {
    const { logout } = useAuth();
    const { theme, setTheme, colors, isDark } = useTheme();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('posts');
    const [content, setContent] = useState<any[]>([]);
    const [contentLoading, setContentLoading] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [showLegalModal, setShowLegalModal] = useState<{ visible: boolean, type: 'privacy' | 'terms' }>({ visible: false, type: 'privacy' });
    const [loggingOut, setLoggingOut] = useState(false);
    const [friendCount, setFriendCount] = useState(0);
    const [pendingRequests, setPendingRequests] = useState(0);
    const router = useRouter();

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
    };

    const loadTabContent = async (tab: TabType) => {
        if (tab === 'settings') return;
        setContentLoading(true);
        try {
            let res;
            if (tab === 'posts') res = await getMyPosts();
            else if (tab === 'events') res = await getMyEvents();
            else if (tab === 'polls') res = await getMyPolls();
            else if (tab === 'jobs') res = await getMyJobs();
            setContent(res?.data || []);
        } catch (e) {
            console.log('Error loading tab content', e);
        } finally {
            setContentLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadProfileData();
            // Load friend count
            const loadFriendData = async () => {
                try {
                    const [countRes, reqRes] = await Promise.all([
                        getFriendsCount(),
                        getFriendRequests()
                    ]);
                    if (countRes?.data) setFriendCount(countRes.data.count || 0);
                    if (reqRes?.data) setPendingRequests(reqRes.data.length || 0);
                } catch (e) { /* ignore */ }
            };
            loadFriendData();
        }, [])
    );

    useEffect(() => { loadTabContent(activeTab); }, [activeTab]);

    const handleItemDelete = (id: string) => {
        setContent(prev => prev.filter(item => item.id !== id));
    };

    const handleDelete = () => {
        Alert.alert('Delete Account', 'Are you absolutely sure? This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await deleteAccount(); logout(); } catch (e: any) { Alert.alert('Error', e.message); }
                }
            }
        ]);
    };

    if (loading) return <ShadowLoader type="profile" />;

    const initial = profile?.name?.[0]?.toUpperCase() || 'U';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]} edges={['top']}>
            <ScrollView
                style={[styles.container, { backgroundColor: colors.white }]}
                stickyHeaderIndices={[1]}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.topRow}>
                        <Text style={styles.headerTitle}>Profile</Text>
                    </View>
                    <View style={styles.profileSection}>
                        <View style={styles.profileInfo}>
                            <View style={styles.nameScoreRow}>
                                <Text style={styles.profileName}>{profile?.name || 'User Name'}</Text>
                                <View style={styles.scoreBadge}>
                                    <Ionicons name="flash" size={12} color={colors.black} />
                                    <Text style={styles.scoreText}>{profile?.user_score || 0}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.friendCountBadge} 
                                    onPress={() => router.push('/friends/list')}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="people" size={12} color={colors.gray500} />
                                    <Text style={styles.friendCountText}>{friendCount} friends</Text>
                                </TouchableOpacity>
                            </View>
                            {profile?.username && (
                                <Text style={styles.usernameText}>@{profile.username}</Text>
                            )}
                            <Text style={styles.profileBio}>{profile?.bio || 'Add a bio to tell students about yourself'}</Text>

                            {/* University Details */}
                            <View style={styles.schoolBadge}>
                                <Ionicons name="school-outline" size={14} color={colors.black} />
                                <Text style={styles.schoolName}>
                                    {profile?.universities?.name || 'Loading University...'}
                                </Text>
                            </View>

                            <View style={styles.metaRow}>
                                <View style={styles.metaBadge}>
                                    <Text style={styles.metaText}>{profile?.department || 'Department'}</Text>
                                </View>
                                <View style={styles.metaBadge}>
                                    <Text style={styles.metaText}>Class of {profile?.year_of_study || 'Year'}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.avatar}>
                            {profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{initial}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Completion Prompt */}
                    {(!profile?.bio || !profile?.avatar_url) && (
                        <TouchableOpacity
                            style={styles.completionPrompt}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <Ionicons name="sparkles" size={16} color={colors.black} />
                            <Text style={styles.completionText}> Complete your profile to stand out!</Text>
                            <Ionicons name="chevron-forward" size={14} color={colors.black} />
                        </TouchableOpacity>
                    )}

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <Text style={styles.actionBtnText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Coming Soon', 'Profile sharing is coming soon!')}>
                            <Text style={styles.actionBtnText}>Share Profile</Text>
                        </TouchableOpacity>
                    </View>

                    <FriendRequestBanner />
                </View>

                {/* Tab Bar completely redesigned as horizontal scroll */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabScrollWrap}
                    contentContainerStyle={styles.tabBarContainer}
                >
                    {TABS.map(({ key, icon }) => (
                        <TouchableOpacity
                            key={key}
                            style={[styles.tabChip, activeTab === key && styles.activeTabChip]}
                            onPress={() => setActiveTab(key)}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={icon as any}
                                size={18}
                                color={activeTab === key ? colors.white : colors.black}
                            />
                            <Text style={[styles.tabChipText, activeTab === key && styles.activeTabChipText]}>
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Content */}
                <View style={styles.contentArea}>
                    {activeTab === 'settings' ? (
                        <View style={styles.settingsSection}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications')}>
                                <Ionicons name="notifications-outline" size={20} color={colors.black} />
                                <Text style={styles.menuText}>Notifications</Text>
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/friends/requests')}>
                                <Ionicons name="people-outline" size={20} color={colors.black} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.menuText}>Friend Requests</Text>
                                </View>
                                {pendingRequests > 0 && (
                                    <View style={styles.requestBadge}>
                                        <Text style={styles.requestBadgeText}>{pendingRequests}</Text>
                                    </View>
                                )}
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => setShowLegalModal({ visible: true, type: 'privacy' })}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.black} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.menuText}>Privacy Policy</Text>
                                    <Text style={styles.menuSubText}>How we protect your campus data</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => setShowLegalModal({ visible: true, type: 'terms' })}>
                                <Ionicons name="document-text-outline" size={20} color={colors.black} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.menuText}>Terms of Use</Text>
                                    <Text style={styles.menuSubText}>The rules of our student community</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => setShowThemeModal(true)}>
                                <Ionicons name="moon-outline" size={24} color={colors.text} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.menuText}>Appearance</Text>
                                    <Text style={styles.menuSubText}>{theme.toUpperCase()}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.logoutBtn}
                                onPress={async () => {
                                    setLoggingOut(true);
                                    await logout();
                                }}
                                disabled={loggingOut}
                            >
                                {loggingOut ? (
                                    <ActivityIndicator size="small" color="#FF3B30" />
                                ) : (
                                    <Text style={styles.logoutBtnText}>Log out</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                                <Text style={styles.deleteBtnText}>Delete account</Text>
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
                                            activeTab === 'posts' ? 'document-text-outline' :
                                                activeTab === 'events' ? 'calendar-outline' :
                                                    activeTab === 'polls' ? 'stats-chart-outline' : 'briefcase-outline'
                                        }
                                        size={48}
                                        color={colors.gray300}
                                        style={{ marginBottom: spacing.md }}
                                    />
                                    <Text style={styles.emptyText}>No {activeTab} yet</Text>
                                </View>
                            ) : (
                                content.map((item) => {
                                    if (activeTab === 'posts') return <PostCard key={item.id} post={item} showDelete={true} onDelete={handleItemDelete} />;
                                    if (activeTab === 'events') return <EventCard key={item.id} event={item} showDelete={true} onDelete={handleItemDelete} />;
                                    if (activeTab === 'polls') return <PollCard key={item.id} poll={item} showDelete={true} onDelete={handleItemDelete} />;
                                    if (activeTab === 'jobs') return <JobCard key={item.id} job={item} showDelete={true} onDelete={handleItemDelete} />;
                                    return null;
                                })
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            <Modal visible={showThemeModal} animationType="fade" transparent>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowThemeModal(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.white }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.black }]}>Appearance</Text>
                            <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                                <Ionicons name="close" size={24} color={colors.gray400} />
                            </TouchableOpacity>
                        </View>

                        {(['light', 'dark', 'system'] as const).map(t => (
                            <TouchableOpacity
                                key={t}
                                style={styles.themeOption}
                                onPress={() => { setTheme(t); setShowThemeModal(false); }}
                            >
                                <Ionicons
                                    name={t === 'light' ? 'sunny' : t === 'dark' ? 'moon' : 'settings-outline'}
                                    size={20}
                                    color={theme === t ? colors.black : colors.gray400}
                                />
                                <Text style={[styles.themeOptionText, { color: theme === t ? colors.black : colors.gray500, fontFamily: theme === t ? fonts.bold : fonts.regular }]}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)} Mode
                                </Text>
                                {theme === t && <Ionicons name="checkmark-circle" size={20} color={colors.black} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={showLegalModal.visible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.white, height: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.black }]}>
                                {showLegalModal.type === 'privacy' ? 'Privacy Policy' : 'Terms of Use'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowLegalModal({ ...showLegalModal, visible: false })}>
                                <Ionicons name="close" size={24} color={colors.gray400} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.legalText, { color: colors.gray700 }]}>
                                {showLegalModal.type === 'privacy' ?
                                    "Your privacy is our priority. As a student-focused platform, we only collect data necessary to enhance your campus experience.\n\n" +
                                    "1. Data Collection: We collect your university email for verification to ensure a safe, student-only environment.\n\n" +
                                    "2. Profile Visibility: Your name and university affiliation are visible to other verified students. You can control who sees your posts and study groups.\n\n" +
                                    "3. Content Safety: We do not sell your personal data to third parties. Your academic resources and discussions remain within the community.\n\n" +
                                    "4. Security: We use industry-standard encryption to protect your messages and account information."
                                    :
                                    "Welcome to UniConnect. By using this platform, you agree to foster a positive academic community.\n\n" +
                                    "1. Eligibility: You must be a verified student or faculty member of a recognized university.\n\n" +
                                    "2. Conduct: Harassment, hate speech, and academic dishonesty (like sharing exam answers) are strictly prohibited.\n\n" +
                                    "3. Content: You own the content you post, but you grant UniConnect a license to display it within the app for other students.\n\n" +
                                    "4. Termination: We reserve the right to suspend accounts that violate our community guidelines.\n\n" +
                                    "5. Liability: UniConnect is a tool for student collaboration; we are not responsible for private transactions or external meetups."
                                }
                            </Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.md },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    headerTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.black },
    profileSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    profileInfo: { flex: 1, marginRight: spacing.lg },
    nameScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    profileName: { fontFamily: fonts.bold, fontSize: 24, color: colors.black },
    scoreBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.full, gap: 2 },
    scoreText: { fontFamily: fonts.bold, fontSize: 12, color: colors.black },
    profileBio: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray600, marginTop: 4, lineHeight: 20 },
    usernameText: { fontFamily: fonts.medium, fontSize: 14, color: colors.gray500, marginTop: 2 },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 0.5, borderColor: colors.gray200 },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontFamily: fonts.bold, fontSize: 28, color: colors.gray500 },
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    actionBtn: { flex: 1, height: 36, borderWidth: 1, borderColor: colors.gray200, borderRadius: radii.sm, justifyContent: 'center', alignItems: 'center' },
    actionBtnText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.black },
    schoolBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: colors.gray50, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.sm, borderWidth: 0.5, borderColor: colors.gray200 },
    schoolName: { fontFamily: fonts.semibold, fontSize: 13, color: colors.black },
    metaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    metaBadge: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray100, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm },
    metaText: { fontFamily: fonts.medium, fontSize: 11, color: colors.gray600 },
    avatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.gray100 },
    completionPrompt: { backgroundColor: colors.gray50, padding: 12, borderRadius: radii.md, marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.gray200, borderStyle: 'dashed', opacity: 0.8 },
    completionText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.black },
    tabScrollWrap: { borderBottomWidth: 0.5, borderBottomColor: colors.gray200, backgroundColor: colors.white },
    tabBarContainer: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
    tabChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.full, backgroundColor: colors.gray100, gap: 6 },
    activeTabChip: { backgroundColor: colors.black },
    tabChipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.black },
    activeTabChipText: { color: colors.white },
    contentArea: { flex: 1, minHeight: 300 },
    settingsSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: colors.gray100, gap: 12 },
    menuText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
    menuSubText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400, marginTop: 1 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, backgroundColor: colors.white },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontFamily: fonts.bold, fontSize: 20 },
    themeOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16 },
    themeOptionText: { flex: 1, fontSize: 16 },
    logoutBtn: { marginTop: 32, height: 44, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.gray200, justifyContent: 'center', alignItems: 'center' },
    logoutBtnText: { fontFamily: fonts.semibold, color: colors.black, fontSize: 14 },
    deleteBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
    deleteBtnText: { fontFamily: fonts.regular, color: colors.gray400, fontSize: 12 },
    emptyState: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontFamily: fonts.regular, color: colors.gray400, fontSize: 14 },
    friendCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray100,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radii.full,
        gap: 4,
    },
    friendCountText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: colors.gray500,
    },
    legalText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 24 },
    requestBadge: {
        backgroundColor: colors.danger,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginRight: 8,
    },
    requestBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: colors.white,
    },
});

