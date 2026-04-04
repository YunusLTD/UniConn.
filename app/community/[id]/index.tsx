import React, { useEffect, useState, useLayoutEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Image, Dimensions, StatusBar, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { spacing, fonts, radii } from '../../../src/constants/theme';
import { getCommunity, joinCommunity, leaveCommunity, deleteCommunity } from '../../../src/api/communities';
import { getFeed } from '../../../src/api/feed';
import PostCard from '../../../src/components/PostCard';
import EventCard from '../../../src/components/EventCard';
import StudyGroupCard from '../../../src/components/StudyGroupCard';
import JobCard from '../../../src/components/JobCard';
import MarketCard from '../../../src/components/MarketCard';
import PollCard from '../../../src/components/PollCard';
import EventCalendar from '../../../src/components/EventCalendar';
import ShadowLoader from '../../../src/components/ShadowLoader';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';

const { width } = Dimensions.get('window');
const COVER_HEIGHT = 380;

export default function CommunityDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();

    const styles = useMemo(() => createStyles(colors), [colors]);

    const [community, setCommunity] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'events' | 'market'>('all');
    const [eventViewMode, setEventViewMode] = useState<'list' | 'calendar'>('list');
    const [submitting, setSubmitting] = useState(false);

    const isStudyGroup = community?.type === 'study_group';
    const isAdmin = community?.created_by === user?.id;

    const loadData = async () => {
        setLoading(true);
        try {
            const commRes = await getCommunity(id as string);
            if (commRes.data) {
                setCommunity(commRes.data);
                navigation.setOptions({ title: commRes.data.name });
            }
            const postsRes = await getFeed(1, 40, id as string);
            if (postsRes.data) setPosts(postsRes.data);
        } catch (e: any) {
            console.log('Error loading community', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [id])
    );

    const handleJoinLeave = async () => {
        if (!community) return;
        setSubmitting(true);
        try {
            if (community.is_member) {
                Alert.alert('Leave Community', `Are you sure you want to leave ${community.name}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Leave', style: 'destructive', onPress: async () => {
                            await leaveCommunity(id as string);
                            await loadData();
                        }
                    }
                ]);
            } else {
                const res = await joinCommunity(id as string);
                if (res.status === 'pending') {
                    Alert.alert('Request Sent', 'This community is private. An admin will review your request.');
                }
                await loadData();
            }
        } catch (e) {
            console.log('Error updating membership:', e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCommunity = () => {
        Alert.alert('Delete Community', 'This is permanent. All posts and data will be lost.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete Everywhere', style: 'destructive', onPress: async () => {
                    try {
                        await deleteCommunity(id as string);
                        router.replace('/(tabs)/communities');
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete community');
                    }
                }
            }
        ]);
    };

    const handleShare = async () => {
        try {
            await Share.share({ message: `Join ${community?.name} on UniConn! The ultimate student hub.` });
        } catch (e) { }
    };

    const handleOpenChat = () => {
        if (!community.is_member) {
            Alert.alert('Join Required', `You need to be a member of ${community.name} to enter the chat.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Join Now', onPress: handleJoinLeave }
            ]);
            return;
        }
        if (community.conversation_id) {
            router.push(`/chat/${community.conversation_id}`);
        } else {
            Alert.alert('Chat Initializing', 'The chat room is being synchronized. Please try again in 5 seconds.');
        }
    };

    if (loading) return <ShadowLoader type="students" />;
    if (!community) return <View style={styles.centered}><Text style={{ color: colors.gray400 }}>Community not found</Text></View>;

    const filteredPosts = posts.filter(p => {
        const type = p.feed_type?.toLowerCase();
        if (activeTab === 'events') return type === 'event';
        if (activeTab === 'market') return type === 'market';
        if (activeTab === 'all') return type === 'post' || type === 'poll' || !type;
        return true;
    });

    const getEmptyMessage = () => {
        if (activeTab === 'events') return "No upcoming events posted.";
        if (activeTab === 'market') return "The marketplace is empty.";
        return "Be the first to share something here!";
    };

    const renderItem = ({ item }: { item: any }) => {
        const type = String(item.feed_type || '').toLowerCase();
        if (type === 'event') return <EventCard event={item} onDelete={loadData} />;
        if (type === 'study_group') return <StudyGroupCard group={item} />;
        if (type === 'job') return <JobCard job={item} onDelete={loadData} />;
        if (type === 'market') return <MarketCard item={item} />;
        if (type === 'poll') return <PollCard poll={item} onDelete={loadData} />;
        return <PostCard post={item} onDelete={loadData} />;
    };

    const CommunityHeader = () => (
        <View style={{ backgroundColor: colors.background }}>
            {/* Immersive Cover Section */}
            <View style={styles.coverWrapper}>
                {community.image_url ? (
                    <Image source={{ uri: community.image_url }} style={styles.coverImg} />
                ) : (
                    <LinearGradient
                        colors={isStudyGroup ? ['#1e3c72', '#2a5298'] : ['#000000', '#434343']}
                        style={styles.coverImg}
                    />
                )}

                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.9)']}
                    style={styles.coverGradient}
                >
                    <View style={styles.coverContent}>
                        {isAdmin && (
                            <View style={styles.adminBadge}>
                                <Text style={styles.adminBadgeText}>CREATOR ADMIN</Text>
                            </View>
                        )}
                        <View style={styles.badgesRow}>
                            <View style={[styles.typeTag, isStudyGroup && styles.studyTag]}>
                                <Text style={styles.typeTagText}>
                                    {isStudyGroup ? '📚 STUDY HUB' : community.type?.replace('_', ' ').toUpperCase()}
                                </Text>
                            </View>
                            {community.is_private && (
                                <View style={styles.privateTag}>
                                    <Ionicons name="lock-closed" size={12} color="white" />
                                    <Text style={styles.privateTagText}>PRIVATE</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.coverTitle}>{community.name?.replace(/ community/gi, '')}</Text>

                        <View style={styles.metaInfoRow}>
                            <TouchableOpacity
                                style={styles.statsRow}
                                onPress={() => router.push(`/community/${id}/members` as any)}
                            >
                                <Ionicons name="people" size={16} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.coverSubtitle}>{community.member_count || 0} Students</Text>
                            </TouchableOpacity>
                            {isAdmin && (
                                <TouchableOpacity style={styles.adminEditBtn} onPress={() => router.push({ pathname: '/community/create', params: { edit: true, id: id as string } } as any)}>
                                    <Ionicons name="settings-outline" size={16} color="white" />
                                    <Text style={styles.adminEditBtnText}>Manage</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* Description & Main Actions */}
            <View style={styles.bodyWrapper}>
                {community.description && (
                    <Text style={[styles.descriptionText, { color: colors.gray600 }]}>
                        {community.description}
                    </Text>
                )}

                <View style={styles.mainActionsColumn}>
                    <TouchableOpacity 
                        style={[styles.chatBtn, { backgroundColor: colors.text === '#FFFFFF' ? colors.gray800 : colors.black }, (!community.is_member && community.is_private) && { opacity: 0.5 }]} 
                        onPress={handleOpenChat} 
                        activeOpacity={0.8}
                        disabled={!community.is_member && community.is_private}
                    >
                        <Ionicons name="chatbubbles" size={20} color={colors.background === '#000000' ? colors.black : colors.white} />
                        <Text style={[styles.chatBtnText, { color: colors.background === '#000000' ? colors.black : colors.white }]}>{community.is_member ? 'Enter Chat Room' : (community.is_private ? 'Members Only' : 'Join to Chat')}</Text>
                    </TouchableOpacity>

                    <View style={styles.secondaryActionRow}>
                        <TouchableOpacity
                            style={[styles.postBtn, { borderColor: colors.gray200, backgroundColor: colors.surface }]}
                            onPress={() => router.push({ pathname: '/create-post', params: { communityId: id } } as any)}
                        >
                            <Ionicons name="add" size={20} color={colors.text} />
                            <Text style={[styles.postBtnText, { color: colors.text }]}>Post Something</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.joinBtn, community.is_member && styles.leaveBtn, { backgroundColor: community.is_member ? colors.gray100 : '#00A3FF' }]}
                            onPress={handleJoinLeave}
                        >
                            <Text style={[styles.joinBtnText, (community.is_member || community.membership_status === 'pending') && { color: colors.gray600 }]}>
                                {community.is_member ? 'Member' : (community.membership_status === 'pending' ? 'Requested' : (community.is_private ? 'Request' : 'Join Hub'))}
                            </Text>
                        </TouchableOpacity>

                        {isAdmin && (
                            <TouchableOpacity style={[styles.dangerIconBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)' }]} onPress={handleDeleteCommunity}>
                                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.minimalTabsContainer, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingRight: 20 }}>
                <View style={[styles.minimalTabs, { borderBottomColor: colors.gray100 }]}>
                    {(['all', 'events', 'market'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[styles.minTab, activeTab === tab && { borderBottomColor: colors.text }]}
                        >
                            <Text style={[styles.minTabText, activeTab === tab ? { color: colors.text } : { color: colors.gray400 }]}>
                                {tab === 'all' ? 'FEED' : (tab === 'market' ? 'MARKETPLACE' : tab.toUpperCase())}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {activeTab === 'events' && (
                <View style={[styles.eventToggleBar, { backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, eventViewMode === 'list' ? { backgroundColor: colors.text } : { backgroundColor: colors.gray100 }]}
                        onPress={() => setEventViewMode('list')}
                    >
                        <Ionicons name="list" size={16} color={eventViewMode === 'list' ? colors.background : colors.gray500} />
                        <Text style={[styles.toggleText, eventViewMode === 'list' ? { color: colors.background } : { color: colors.gray500 }]}>List View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, eventViewMode === 'calendar' ? { backgroundColor: colors.text } : { backgroundColor: colors.gray100 }]}
                        onPress={() => setEventViewMode('calendar')}
                    >
                        <Ionicons name="calendar" size={16} color={eventViewMode === 'calendar' ? colors.background : colors.gray500} />
                        <Text style={[styles.toggleText, eventViewMode === 'calendar' ? { color: colors.background } : { color: colors.gray500 }]}>Calendar</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.floatingHeader, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.floatingBtn}>
                    <Ionicons name="chevron-back" size={22} color="white" />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={handleShare} style={styles.floatingBtn}>
                        <Ionicons name="share-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {activeTab === 'events' && eventViewMode === 'calendar' ? (
                <FlatList
                    data={[]}
                    renderItem={() => null}
                    ListHeaderComponent={
                        <View>
                            <CommunityHeader />
                            <EventCalendar events={posts.filter(p => p.feed_type?.toLowerCase() === 'event')} />
                            <View style={{ height: 100 }} />
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />
            ) : community.is_private && !community.is_member ? (
                <View style={styles.lockedState}>
                    <View style={styles.lockedIconCircle}>
                        <Ionicons name="lock-closed" size={42} color={colors.gray400} />
                    </View>
                    <Text style={styles.lockedTitle}>Private Community</Text>
                    <Text style={styles.lockedText}>
                        Join this community to see its feed and connect with students. Content is hidden to protect privacy.
                    </Text>
                    {community.membership_status !== 'pending' && (
                        <TouchableOpacity style={styles.requestButton} onPress={handleJoinLeave}>
                            <Text style={styles.requestButtonText}>Request to Join</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <FlatList
                    data={filteredPosts}
                    keyExtractor={item => `${item.feed_type || 'post'}_${item.id}`}
                    renderItem={renderItem}
                    ListHeaderComponent={<CommunityHeader />}
                    ListEmptyComponent={
                        <View style={[styles.emptyWrap, { backgroundColor: colors.background }]}>
                            <Ionicons name={isStudyGroup ? "book-outline" : "chatbubble-ellipses-outline"} size={48} color={colors.gray200} />
                            <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    floatingHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
    floatingBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    coverWrapper: { width: '100%', height: COVER_HEIGHT, position: 'relative' },
    coverImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    coverGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end', padding: 24, paddingBottom: 32 },
    coverContent: {},
    adminBadge: { alignSelf: 'flex-start', backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 12 },
    adminBadgeText: { fontFamily: fonts.bold, fontSize: 10, color: 'black' },
    badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    typeTag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    studyTag: { backgroundColor: 'rgba(76,175,80,0.4)', borderColor: 'rgba(76,175,80,0.5)' },
    privateTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    privateTagText: { fontFamily: fonts.bold, fontSize: 9, color: 'white' },
    typeTagText: { fontFamily: fonts.bold, fontSize: 10, color: 'white', letterSpacing: 1 },
    coverTitle: { fontFamily: fonts.bold, fontSize: 36, color: 'white', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    metaInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    coverSubtitle: { fontFamily: fonts.semibold, fontSize: 14, color: 'rgba(255,255,255,0.9)' },
    adminEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    adminEditBtnText: { fontFamily: fonts.bold, fontSize: 12, color: 'white' },
    bodyWrapper: { padding: 20 },
    descriptionText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 24, marginBottom: 24 },
    mainActionsColumn: { gap: 12 },
    chatBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    chatBtnText: { fontFamily: fonts.bold, fontSize: 16 },
    secondaryActionRow: { flexDirection: 'row', gap: 12 },
    postBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    postBtnText: { fontFamily: fonts.semibold, fontSize: 14 },
    joinBtn: { width: 100, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    joinBtnText: { fontFamily: fonts.bold, color: 'white', fontSize: 14 },
    leaveBtn: {},
    dangerIconBtn: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    minimalTabsContainer: { marginTop: 10 },
    minimalTabs: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1 },
    minTab: { paddingVertical: 16, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    minTabText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1 },
    eventToggleBar: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
    toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.full },
    toggleText: { fontFamily: fonts.semibold, fontSize: 12 },
    emptyWrap: { paddingVertical: 80, alignItems: 'center', paddingHorizontal: spacing.xl },
    emptyText: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray400, marginTop: 16, textAlign: 'center' },
    lockedState: { flex: 1, padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    lockedIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.gray200 },
    lockedTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, marginBottom: 16 },
    lockedText: { fontFamily: fonts.regular, fontSize: 15, color: colors.gray500, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    requestButton: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: radii.full },
    requestButtonText: { fontFamily: fonts.bold, color: colors.background, fontSize: 15 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200, paddingVertical: 40 },
    emptyMessage: { fontFamily: fonts.medium, fontSize: 16, color: colors.gray300, marginTop: 16, textAlign: 'center' },
    listContent: { paddingBottom: 100 },
});
