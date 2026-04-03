import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { getProfile, deleteAccount } from '../../src/api/users';
import { getMyPosts } from '../../src/api/posts';
import { getMyEvents } from '../../src/api/events';
import { getMyPolls } from '../../src/api/polls';
import { getMyMarketplaceListings } from '../../src/api/marketplace';
import { getFriendsCount, getFriendRequests } from '../../src/api/friends';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import PostCard from '../../src/components/PostCard';
import EventCard from '../../src/components/EventCard';
import PollCard from '../../src/components/PollCard';
import MarketCard from '../../src/components/MarketCard';
import ShadowLoader from '../../src/components/ShadowLoader';
import FriendRequestBanner from '../../src/components/FriendRequestBanner';
import ProfileQRModal from '../../src/components/ProfileQRModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal } from 'react-native';
import { getUserStories } from '../../src/api/stories';
import StoryViewer from '../../src/components/StoryViewer';
import { LinearGradient } from 'expo-linear-gradient';


type TabType = 'posts' | 'events' | 'polls' | 'listings' | 'settings';

const TABS: { key: TabType, icon: string }[] = [
    { key: 'posts', icon: 'grid-outline' },
    { key: 'events', icon: 'calendar-outline' },
    { key: 'listings', icon: 'cart-outline' },
    { key: 'settings', icon: 'settings-outline' },
];

export default function ProfileScreen() {
    const { logout, user, savedAccounts, switchAccount, removeSavedAccount } = useAuth();
    const { theme, setTheme, colors, isDark } = useTheme();

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
        
        // Fetch stories
        try {
            const storyRes = await getUserStories(user!.id);
            if (storyRes?.data?.event) {
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
            if (tab === 'posts') res = await getMyPosts();
            else if (tab === 'events') res = await getMyEvents();
            else if (tab === 'polls') res = await getMyPolls();
            else if (tab === 'listings') res = await getMyMarketplaceListings();
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
            // Load pending requests for the banner
            const loadRequestData = async () => {
                try {
                    const reqRes = await getFriendRequests();
                    if (reqRes?.data) setPendingRequests(reqRes.data.length || 0);
                } catch (e) { /* ignore */ }
            };
            loadRequestData();
        }, [])
    );

    useEffect(() => { loadTabContent(activeTab); }, [activeTab]);

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

    const initial = profile?.name?.[0]?.toUpperCase() || 'U';

    if (loading) return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 40 }}>
            <ShadowLoader type="profile" />
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Native Header equivalent */}
            <TouchableOpacity
                style={[styles.navHeader, { borderBottomColor: colors.border }]}
                onPress={() => setShowAccountSwitcher(true)}
                activeOpacity={0.7}
            >
                <Text style={[styles.navHeaderTitle, { color: colors.black }]}>{profile?.username ? `@${profile.username}` : (profile?.name || 'Profile')}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.black} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[]}>
                {/* IG-style header */}
                <View style={styles.header}>
                    <View style={styles.topRow}>
                        <TouchableOpacity 
                            style={styles.avatarRing} 
                            onPress={() => {
                                if (storyEvent) setViewerVisible(true);
                                else router.push('/edit-profile');
                            }}
                            activeOpacity={0.9}
                        >
                            {storyEvent ? (
                                <LinearGradient
                                    colors={['#A154F2', '#9CA3AF', '#000000']}
                                    style={styles.gradientBorder}
                                >
                                    <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.background }]}>
                                        {profile?.avatar_url ? (
                                            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                                        ) : (
                                            <Text style={[styles.avatarText, { color: colors.gray400 }]}>{initial}</Text>
                                        )}
                                    </View>
                                </LinearGradient>
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.background }]}>
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
                                <Text style={[styles.statLabel, { color: colors.gray500 }]}>Posts</Text>
                            </View>
                            <TouchableOpacity style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/friends/list')} activeOpacity={0.7}>
                                <Text style={[styles.statNumber, { color: colors.black }]}>{profile?.friends_count || 0}</Text>
                                <Text style={[styles.statLabel, { color: colors.gray500 }]}>Friends</Text>
                            </TouchableOpacity>
                            <View style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.statNumber, { color: colors.black }]}>{profile?.user_score || 0}</Text>
                                <Text style={[styles.statLabel, { color: colors.gray500 }]}>Score</Text>
                            </View>
                        </View>
                    </View>

                    {/* Name & bio */}
                    <View style={styles.bioSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.displayName, { color: colors.black }]}>{profile?.name || 'User Name'}</Text>
                            {profile?.campus_rank && (
                                <TouchableOpacity style={styles.campusRankBadge} onPress={() => setShowRankModal(true)}>
                                    <Text style={styles.campusRankText}>#{profile.campus_rank}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {(profile?.universities?.name || profile?.department) && (
                            <View style={styles.metaRow}>
                                <Ionicons name="school-outline" size={13} color={colors.gray500} />
                                <Text style={[styles.metaText, { color: colors.gray500 }]}>
                                    {profile?.universities?.name} {profile?.department ? `• ${profile.department}` : ''}
                                </Text>
                            </View>
                        )}

                        <Text style={[styles.bioText, { color: colors.black }]}>
                            {profile?.bio || 'Add a bio to tell students about yourself'}
                        </Text>

                        {(profile?.hometown || profile?.age || profile?.year_of_study) && (
                            <View style={styles.detailsRow}>
                                {profile?.hometown && (
                                    <View style={[styles.detailPill, { backgroundColor: colors.surface }]}>
                                        <Ionicons name="location-outline" size={12} color={colors.gray500} />
                                        <Text style={[styles.detailText, { color: colors.gray600 }]}>{profile.hometown}</Text>
                                    </View>
                                )}
                                {profile?.age && (
                                    <View style={[styles.detailPill, { backgroundColor: colors.surface }]}>
                                        <Ionicons name="calendar-outline" size={12} color={colors.gray500} />
                                        <Text style={[styles.detailText, { color: colors.gray600 }]}>{profile.age} yrs</Text>
                                    </View>
                                )}
                                {profile?.year_of_study && (
                                    <View style={[styles.detailPill, { backgroundColor: colors.surface }]}>
                                        <Ionicons name="school-outline" size={12} color={colors.gray500} />
                                        <Text style={[styles.detailText, { color: colors.gray600 }]}>Class of {profile.year_of_study.split(',')[0].trim()}</Text>
                                    </View>
                                )}
                            </View>
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

                    <FriendRequestBanner />

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: isDark ? colors.gray800 : colors.gray200 }]}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <Text style={[styles.actionBtnText, { color: colors.black }]}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: isDark ? colors.gray800 : colors.gray200 }]}
                            onPress={() => setShowQRModal(true)}
                        >
                            <Text style={[styles.actionBtnText, { color: colors.black }]}>Share profile</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Segmented Pill Tab Bar */}
                    <View style={[styles.tabsContainer, { backgroundColor: colors.surface }]}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tabContent}
                        >
                            {TABS.map(({ key, icon }) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[styles.tabPill, activeTab === key && [styles.activeTabPill, { backgroundColor: colors.black, shadowColor: colors.black }]]}
                                    onPress={() => setActiveTab(key)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={(activeTab === key ? icon.replace('-outline', '') : icon) as any}
                                        size={16}
                                        color={activeTab === key ? colors.white : colors.gray600}
                                    />
                                    <Text style={[styles.tabLabel, { color: activeTab === key ? colors.white : colors.gray500 }]}>
                                        {key.charAt(0).toUpperCase() + key.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {/* Content Area */}
                <View style={styles.contentArea}>
                    {activeTab === 'settings' ? (
                        <View style={styles.settingsSection}>
                            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => router.push('/notifications')}>
                                <View style={[styles.menuIconBox, { backgroundColor: colors.surface }]}><Ionicons name="notifications-outline" size={20} color={colors.black} /></View>
                                <Text style={[styles.menuText, { color: colors.black }]}>Notifications</Text>
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.menuItem, { borderBottomColor: colors.border }]} 
                                onPress={() => {
                                    const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
                                    setTheme(nextTheme);
                                }}
                            >
                                <View style={[styles.menuIconBox, { backgroundColor: colors.surface }]}>
                                    <Ionicons 
                                        name={theme === 'dark' ? "moon" : theme === 'light' ? "sunny" : "settings-outline"} 
                                        size={20} 
                                        color={colors.black} 
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuText, { color: colors.black }]}>Theme</Text>
                                    <Text style={[styles.menuSubText, { color: colors.gray500 }]}>Currently: {theme.charAt(0).toUpperCase() + theme.slice(1)}</Text>
                                </View>
                                <Ionicons name="swap-horizontal" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => router.push('/friends/requests')}>
                                <View style={[styles.menuIconBox, { backgroundColor: colors.surface }]}><Ionicons name="people-outline" size={20} color={colors.black} /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuText, { color: colors.black }]}>Friend Requests</Text>
                                </View>
                                {pendingRequests > 0 && (
                                    <View style={[styles.requestBadge, { backgroundColor: colors.black }]}>
                                        <Text style={[styles.requestBadgeText, { color: colors.white }]}>{pendingRequests}</Text>
                                    </View>
                                )}
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => setShowLegalModal({ visible: true, type: 'privacy' })}>
                                <View style={[styles.menuIconBox, { backgroundColor: colors.surface }]}><Ionicons name="lock-closed-outline" size={20} color={colors.black} /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuText, { color: colors.black }]}>Privacy Policy</Text>
                                    <Text style={[styles.menuSubText, { color: colors.gray500 }]}>How we protect your campus data</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => setShowLegalModal({ visible: true, type: 'terms' })}>
                                <View style={[styles.menuIconBox, { backgroundColor: colors.surface }]}><Ionicons name="document-text-outline" size={20} color={colors.black} /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuText, { color: colors.black }]}>Terms of Use</Text>
                                    <Text style={[styles.menuSubText, { color: colors.gray500 }]}>The rules of our student community</Text>
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
                                    <Text style={styles.logoutBtnText}>Log out</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                                <Text style={[styles.deleteBtnText, { color: colors.gray400 }]}>Delete account</Text>
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
                                            activeTab === 'posts' ? 'camera-outline' :
                                                activeTab === 'events' ? 'calendar-outline' :
                                                    activeTab === 'polls' ? 'stats-chart-outline' :
                                                        'briefcase-outline'
                                        }
                                        size={48}
                                        color={colors.gray300}
                                        style={{ marginBottom: spacing.md }}
                                    />
                                    <Text style={[styles.emptyText, { color: colors.gray500 }]}>No {activeTab} yet</Text>
                                </View>
                            ) : (
                                content.map((item) => {
                                    if (activeTab === 'posts') return <PostCard key={item.id} post={item} showDelete={true} onDelete={handleItemDelete} />;
                                    if (activeTab === 'events') return <EventCard key={item.id} event={item} showDelete={true} onDelete={handleItemDelete} />;
                                    if (activeTab === 'polls') return <PollCard key={item.id} poll={item} showDelete={true} onDelete={handleItemDelete} />;
                                    if (activeTab === 'listings') return <MarketCard key={item.id} item={item} onDelete={handleItemDelete} />;
                                    return null;
                                })
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Legal Data Management Modal */}
            <Modal visible={showLegalModal.visible} transparent animationType="fade" onRequestClose={() => setShowLegalModal({ ...showLegalModal, visible: false })}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLegalModal({ ...showLegalModal, visible: false })}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.black }]}>{showLegalModal.type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</Text>
                            <TouchableOpacity onPress={() => setShowLegalModal({ ...showLegalModal, visible: false })}>
                                <Ionicons name="close" size={24} color={colors.black} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.legalText, { color: colors.gray600 }]}>
                                {showLegalModal.type === 'privacy'
                                    ? "Your privacy is our priority. We only collect data necessary to enhance your campus experience. This includes your university affiliation, basic profile info, and shared content."
                                    : "By using UniConn, you agree to foster a respectful and safe campus community. Harassment, hate speech, and academic dishonesty are strictly prohibited."
                                }
                            </Text>
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Rank Modal */}
            <Modal visible={showRankModal} transparent animationType="fade" onRequestClose={() => setShowRankModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRankModal(false)}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.black }]}>Campus Pioneer Rank</Text>
                            <TouchableOpacity onPress={() => setShowRankModal(false)}>
                                <Ionicons name="close" size={24} color={colors.black} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
                            <Ionicons name="medal" size={48} color="#E11D48" style={{ marginBottom: spacing.sm }} />
                            <Text style={[styles.statNumber, { fontSize: 32, color: '#E11D48', marginBottom: spacing.md }]}>#{profile?.campus_rank}</Text>
                            <Text style={[styles.legalText, { textAlign: 'center', color: colors.gray600 }]}>
                                Your Pioneer Rank represents your early adoption status at {profile?.universities?.name || 'your university'}. 
                                The lower the number, the earlier you joined the community. Because this is unique to your campus, you hold a permanent piece of history!
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Account Switcher Modal */}
            <Modal visible={showAccountSwitcher} transparent animationType="slide" onRequestClose={() => setShowAccountSwitcher(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAccountSwitcher(false)}>
                    <View style={[styles.modalContent, { paddingBottom: 60, backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.black }]}>Switch Account</Text>
                            <TouchableOpacity onPress={() => setShowAccountSwitcher(false)}>
                                <Ionicons name="close" size={24} color={colors.black} />
                            </TouchableOpacity>
                        </View>

                        {savedAccounts.map((acc) => (
                            <TouchableOpacity
                                key={acc.id}
                                style={[styles.accountItem, { borderBottomColor: colors.border }]}
                                onPress={() => handleAccountSwitch(acc.id)}
                            >
                                <View style={styles.accountInfo}>
                                    <View style={[styles.smallAvatar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                        {acc.avatar_url ? (
                                            <Image source={{ uri: acc.avatar_url }} style={styles.avatarImg} />
                                        ) : (
                                            <Text style={[styles.smallAvatarText, { color: colors.gray600 }]}>{acc.name[0].toUpperCase()}</Text>
                                        )}
                                    </View>
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={[styles.accountName, { color: colors.black }]}>{acc.name || acc.username || 'User'}</Text>
                                        <Text style={[styles.accountUsername, { color: colors.gray500 }]}>@{acc.username || 'user'}</Text>
                                    </View>
                                </View>
                                {user?.id === acc.id && (
                                    <Ionicons name="checkmark-circle" size={24} color={colors.black} />
                                )}
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity style={styles.addAccountBtn} onPress={handleAddAccount}>
                            <View style={[styles.addAccountIcon, { borderColor: colors.border }]}>
                                <Ionicons name="add" size={20} color={colors.gray600} />
                            </View>
                            <Text style={[styles.addAccountText, { color: colors.gray600 }]}>Add Account</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

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
                event={storyEvent} 
                onClose={() => setViewerVisible(false)} 
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    navHeader: {
        height: 50,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    navHeaderTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
    },

    // IG-style layout match
    header: { paddingHorizontal: spacing.lg, paddingTop: 16 },
    topRow: { flexDirection: 'row', alignItems: 'center' },
    avatarRing: {
        width: 124, height: 124, borderRadius: 62,
        justifyContent: 'center', alignItems: 'center',
    },
    gradientBorder: {
        width: 124, height: 124, borderRadius: 62,
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

    detailsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    detailPill: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: radii.full, gap: 4,
    },
    detailText: { fontFamily: fonts.medium, fontSize: 11, textTransform: 'capitalize' },

    completionPrompt: { padding: 12, borderRadius: radii.md, marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
    completionText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13 },

    // Pill actions
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
    actionBtn: { flex: 1, height: 42, borderRadius: radii.full, justifyContent: 'center', alignItems: 'center' },
    btnLight: { },
    actionBtnText: { fontFamily: fonts.bold, fontSize: 14 },

    // Segmented Pill Tab Bar
    tabsContainer: { marginTop: 24, padding: 5, borderRadius: radii.full, marginBottom: 8 },
    tabContent: { flexDirection: 'row', gap: 4 },
    tabPill: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 18, paddingVertical: 10,
        borderRadius: radii.full, gap: 6,
    },
    activeTabPill: {
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    },
    tabLabel: { fontFamily: fonts.bold, fontSize: 13 },
    activeTabLabel: { },

    contentArea: { flex: 1, minHeight: 300, paddingBottom: 100 },
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
});

