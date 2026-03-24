import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Share } from 'react-native';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { getUser } from '../../src/api/users';
import { getUserPosts } from '../../src/api/posts';
import { getUserEvents } from '../../src/api/events';
import { getUserPolls } from '../../src/api/polls';
import { getUserJobs } from '../../src/api/jobs';
import { createConversation } from '../../src/api/messages';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import PostCard from '../../src/components/PostCard';
import EventCard from '../../src/components/EventCard';
import PollCard from '../../src/components/PollCard';
import JobCard from '../../src/components/JobCard';
import SkeletonLoader from '../../src/components/SkeletonLoader';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    const [messaging, setMessaging] = useState(false);
    const router = useRouter();
    const { showToast } = useToast();

    const loadProfileData = async () => {
        try {
            const res = await getUser(id as string);
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
        setContentLoading(true);
        try {
            let res;
            if (tab === 'posts') res = await getUserPosts(id as string);
            else if (tab === 'events') res = await getUserEvents(id as string);
            else if (tab === 'polls') res = await getUserPolls(id as string);
            else if (tab === 'jobs') res = await getUserJobs(id as string);
            setContent(res?.data || []);
        } catch (e) {
            console.log('Error loading tab content', e);
        } finally {
            setContentLoading(false);
        }
    };

    const handleShareProfile = async () => {
        try {
            const shareUrl = `https://uni-platform.app/user/${id}`;
            await Share.share({
                title: `Check out ${profile?.name}'s profile on Uni!`,
                message: `Check out ${profile?.name}'s student profile on Uni Hub: ${shareUrl}`,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    useEffect(() => { loadProfileData(); }, [id]);
    useEffect(() => { loadTabContent(activeTab); }, [activeTab, id]);

    const handleMessage = async () => {
        if (!currentUser || currentUser.id === id) return;
        setMessaging(true);
        try {
            const res = await createConversation({ type: 'direct', participant_ids: [id as string] });
            const session = res?.id || res?.data?.id;
            if (session) {
                router.push(`/chat/${session}`);
            }
        } catch (e) {
            showToast({ title: 'Error', message: 'Could not start conversation', type: 'error' });
        } finally {
            setMessaging(false);
        }
    };

    if (loading) return (
        <SafeAreaView style={styles.loadingContainer}>
            <Stack.Screen options={{ title: '', headerBackTitle: '' }} />
            <ActivityIndicator size="small" color={colors.black} />
        </SafeAreaView>
    );

    if (!profile) return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'Profile' }} />
            <View style={styles.centered}>
                <Text style={styles.errorText}>User profile not found</Text>
            </View>
        </SafeAreaView>
    );

    const initial = profile?.name?.[0]?.toUpperCase() || '?';

    const showScoreContext = () => {
        showToast({
            title: "UniScore & Reputation",
            message: "UniScore reflects your campus impact. Earn points by sharing resources, organizing events, and engaging with peers. High scores build trust and community standing!",
            type: 'info'
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{
                headerShown: true,
                title: '',
                headerBackTitle: '',
                headerTransparent: true,
                headerTintColor: colors.black,
                headerTitle: ''
            }} />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.profileSection}>
                        <View style={styles.profileInfo}>
                            <View style={styles.nameScoreRow}>
                                <Text style={styles.profileName}>{profile?.name || 'User Name'}</Text>
                                <TouchableOpacity style={styles.scoreBadge} onPress={showScoreContext} activeOpacity={0.7}>
                                    <Ionicons name="flash" size={12} color={colors.black} />
                                    <Text style={styles.scoreText}>{profile?.user_score || 0}</Text>
                                </TouchableOpacity>
                            </View>
                            {profile?.username && (
                                <Text style={styles.usernameText}>@{profile.username}</Text>
                            )}
                            {profile?.bio ? (
                                <Text style={styles.profileBio}>{profile.bio}</Text>
                            ) : null}
                            {profile.universities?.name && (
                                <View style={styles.uniRow}>
                                    <Ionicons name="school-outline" size={14} color={colors.gray500} />
                                    <Text style={styles.uniName}>{profile.universities.name}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.avatar}>
                            {profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarText}>{initial}</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        {currentUser?.id !== id && (
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.messageBtn]}
                                onPress={handleMessage}
                                disabled={messaging}
                            >
                                {messaging ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <>
                                        <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.white} />
                                        <Text style={styles.messageBtnText}>Message</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.actionBtnSecondary, currentUser?.id === id && { flex: 1, flexDirection: 'row', gap: 8 }]}
                            onPress={handleShareProfile}
                        >
                            <Ionicons name="share-social-outline" size={20} color={colors.black} />
                            {currentUser?.id === id && <Text style={{ fontFamily: fonts.semibold, fontSize: 15 }}>Share Profile</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tab Bar */}
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

                {/* Content Area */}
                <View style={styles.contentArea}>
                    {contentLoading ? (
                        <SkeletonLoader />
                    ) : content.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>
                                {activeTab === 'posts' ? '📝' : activeTab === 'events' ? '📅' : activeTab === 'polls' ? '📊' : '💼'}
                            </Text>
                            <Text style={styles.emptyText}>No {activeTab} yet</Text>
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
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontFamily: fonts.regular, fontSize: 16, color: colors.gray500 },

    header: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        paddingTop: 60, // Space for header
    },
    profileSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    profileInfo: { flex: 1, marginRight: spacing.lg },
    nameScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    profileName: {
        fontFamily: fonts.bold,
        fontSize: 24,
        color: colors.black,
    },
    scoreBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray100,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radii.full,
        gap: 2,
    },
    scoreText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: colors.black,
    },
    profileBio: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray600,
        marginTop: 4,
        lineHeight: 20,
    },
    usernameText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.gray500,
        marginTop: 2,
    },
    uniRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4,
    },
    uniName: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.gray500,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: colors.gray200,
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 32,
        color: colors.gray500,
    },

    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.xl,
    },
    actionBtn: {
        flex: 1,
        height: 44,
        borderRadius: radii.md,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    messageBtn: {
        backgroundColor: colors.black,
    },
    messageBtnText: {
        fontFamily: fonts.semibold,
        fontSize: 15,
        color: colors.white,
    },
    actionBtnSecondary: {
        width: 44,
        height: 44,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.gray200,
        justifyContent: 'center',
        alignItems: 'center',
    },

    tabScrollWrap: {
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray200,
        backgroundColor: colors.white,
    },
    tabBarContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    tabChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: radii.full,
        backgroundColor: colors.gray100,
        gap: 6,
    },
    activeTabChip: {
        backgroundColor: colors.black,
    },
    tabChipText: {
        fontFamily: fonts.semibold,
        fontSize: 13,
        color: colors.black,
    },
    activeTabChipText: {
        color: colors.white,
    },

    contentArea: { flex: 1, minHeight: 300 },
    emptyState: { alignItems: 'center', marginTop: 80 },
    emptyIcon: { fontSize: 40, marginBottom: 8 },
    emptyText: {
        fontFamily: fonts.regular,
        color: colors.gray400,
        fontSize: 14,
    },
});
