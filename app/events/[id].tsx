import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, LayoutAnimation, Platform, UIManager, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getEvent, rsvpToEvent, toggleEventInterest } from '../../src/api/events';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function EventDetailScreen() {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string | null>(null);
    const [isInterested, setIsInterested] = useState(false);
    const [interestedCount, setInterestedCount] = useState(0);

    const loadData = async () => {
        try {
            const res = await getEvent(id as string);
            if (res?.data) {
                setEvent(res.data);
                setIsInterested(!!res.data.is_interested);
                setInterestedCount(Number(res.data.interested_count || 0));

                const myRsvp = res.data.event_participants?.find((p: any) => p.user_id === user?.id);
                if (myRsvp) setStatus(myRsvp.status);
            }
        } catch (e) {
            console.log('Error loading event', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [id]);

    const handleInterestToggle = async () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const prevInterested = isInterested;
        setIsInterested(!prevInterested);
        setInterestedCount(prev => !prevInterested ? prev + 1 : Math.max(0, prev - 1));

        try {
            const res = await toggleEventInterest(id as string);
            if (res?.data) {
                setIsInterested(!!res.data.is_interested);
                setInterestedCount(Number(res.data.interested_count));
            }
        } catch (e) {
            setIsInterested(prevInterested);
            setInterestedCount(prev => prevInterested ? prev + 1 : Math.max(0, prev - 1));
        }
    };

    const handleRSVP = async (newStatus: 'going' | 'interested' | 'not_going') => {
        try {
            await rsvpToEvent(id as string, newStatus);
            setStatus(newStatus);
            Alert.alert(t('done_label'), t('marked_as_status').replace('{{status}}', newStatus.replace('_', ' ')));
            loadData();
        } catch (e: any) {
            Alert.alert(t('error'), e.message);
        }
    };

    const startTime = event ? new Date(event.start_time) : null;
    const endTime = event?.end_time ? new Date(event.end_time) : null;
    const isPassed = endTime ? (endTime < new Date()) : (startTime ? (startTime < new Date()) : false);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: event?.title || t('event_details_header'),
                    headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
                    headerBackTitle: '',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: colors.surface },
                    headerTintColor: colors.text,
                }}
            />
            <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
                {/* Banner */}
                {event?.image_url && (
                    <View style={styles.bannerContainer}>
                        <Image source={{ uri: event.image_url }} style={styles.bannerImg} />
                    </View>
                )}

                {isPassed && !loading && (
                    <View style={[styles.passedBanner, { backgroundColor: isDark ? '#2D2D2D' : colors.gray50 }]}>
                        <Ionicons name="alert-circle-outline" size={18} color={colors.gray500} />
                        <Text style={[styles.passedText, { color: colors.gray500 }]}>{t('event_already_ended')}</Text>
                    </View>
                )}

                {loading && !event ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <ActivityIndicator color={colors.text} />
                        <Text style={{ marginTop: 12, fontFamily: fonts.medium, color: colors.gray400 }}>{t('loading_event')}</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.title}>{event?.title}</Text>
                            <View style={styles.hostSection}>
                                <TouchableOpacity
                                    onPress={() => event?.communities?.slug && router.push(`/uni/${event.communities.slug}`)}
                                    style={styles.communityRow}
                                >
                                    <View style={[styles.miniIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name="business" size={12} color={colors.primary} />
                                    </View>
                                    <Text style={styles.communityName}>{event?.communities?.name || t('community_label')}</Text>
                                </TouchableOpacity>

                                {event?.profiles && (
                                    <TouchableOpacity
                                        onPress={() => router.push(`/user/${event.created_by}`)}
                                        style={styles.hostRow}
                                    >
                                        <Image 
                                            source={{ uri: event.profiles.avatar_url || 'https://via.placeholder.com/100' }} 
                                            style={styles.hostAvatar} 
                                        />
                                        <Text style={styles.hostName}>{event.profiles.name}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Interest Social Stack */}
                            {interestedCount > 0 && (
                                <View style={styles.socialStackContainer}>
                                    <View style={styles.avatarStack}>
                                        {(event?.event_interests || []).slice(0, 3).map((interest: any, idx: number) => (
                                            <Image 
                                                key={idx}
                                                source={{ uri: interest.profiles?.avatar_url || 'https://via.placeholder.com/100' }}
                                                style={[styles.stackAvatar, { left: idx * 14, zIndex: 10 - idx }]}
                                            />
                                        ))}
                                    </View>
                                    <Text style={styles.socialText}>
                                        <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{interestedCount}</Text>
                                        {interestedCount === 1 ? ` ${t('person_is_interested')}` : ` ${t('people_are_interested')}`}
                                    </Text>
                                </View>
                            )}
                        </View>



                        <View style={[styles.section, { borderBottomColor: colors.border }]}>
                            <View style={styles.row}>
                                <View style={[styles.iconBlock, { backgroundColor: colors.primary + '15' }]}><Ionicons name="calendar-outline" size={20} color={colors.primary} /></View>
                                <View>
                                    <Text style={styles.dateText}>
                                        {startTime ? startTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '---'}
                                    </Text>
                                    <Text style={[styles.timeText, { color: colors.gray500 }]}>
                                        {startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                                        {endTime ? ` - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                    </Text>
                                </View>
                            </View>
                            {event?.location && (
                                <View style={[styles.row, { marginTop: spacing.lg }]}>
                                    <View style={[styles.iconBlock, { backgroundColor: colors.primary + '15' }]}><Ionicons name="location-outline" size={20} color={colors.primary} /></View>
                                    <Text style={styles.locationText}>{event.location}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('about_this_event')}</Text>
                            <Text style={[styles.description, { color: colors.gray600 }]}>{event?.description || t('no_event_description')}</Text>
                        </View>

                        <View style={styles.actionSection}>
                            <TouchableOpacity
                                style={[
                                    styles.interestAction,
                                    {
                                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : colors.border,
                                        backgroundColor: isInterested ? colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : colors.surface)
                                    },
                                    isPassed && { opacity: 0.5 }
                                ]}
                                onPress={handleInterestToggle}
                                disabled={isPassed}
                                activeOpacity={0.8}
                            >
                                <Ionicons name={isInterested ? "star" : "star-outline"} size={22} color={isInterested ? colors.white : (isDark ? 'rgba(255,255,255,0.8)' : colors.primary)} />
                                <Text style={[
                                    styles.interestActionText,
                                    { color: isInterested ? colors.white : (isDark ? 'rgba(255,255,255,0.9)' : colors.text) }
                                ]}>
                                    {isInterested ? t('im_interested_label') : t('mark_as_interested')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontFamily: fonts.regular, fontSize: 15 },
    bannerContainer: { height: 220, width: '100%', position: 'relative' },
    bannerImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: 16 },
    title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.text },
    hostSection: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
    communityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '10', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    communityName: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
    hostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
    hostAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.gray100 },
    hostName: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
    miniIcon: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    socialStackContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    avatarStack: { flexDirection: 'row', height: 28, width: 60, marginRight: 8 },
    stackAvatar: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.background, position: 'absolute' },
    socialText: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray500 },
    statsSection: { flexDirection: 'row', marginHorizontal: spacing.lg, borderRadius: 16, paddingVertical: 16, marginBottom: spacing.lg },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
    statLabel: { fontFamily: fonts.medium, fontSize: 12, marginTop: 2, color: colors.gray500 },
    section: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 0.5 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconBlock: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    dateText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
    timeText: { fontFamily: fonts.medium, fontSize: 13, marginTop: 2 },
    locationText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
    sectionTitle: { fontFamily: fonts.bold, fontSize: 18, marginBottom: spacing.md, color: colors.text },
    description: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.gray600 },
    actionSection: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
    interestAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 20, borderWidth: 1.5 },
    interestActionText: { fontFamily: fonts.bold, fontSize: 16 },
    passedBanner: { paddingHorizontal: spacing.lg, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    passedText: { fontFamily: fonts.medium, fontSize: 13 },
});
