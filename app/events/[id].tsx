import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, LayoutAnimation, Platform, UIManager, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getEvent, rsvpToEvent, toggleEventInterest } from '../../src/api/events';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function EventDetailScreen() {
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
            Alert.alert('Done', `You're marked as ${newStatus.replace('_', ' ')}!`);
            loadData();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const startTime = event ? new Date(event.start_time) : null;
    const endTime = event?.end_time ? new Date(event.end_time) : null;

    return (
        <View style={{ flex: 1, backgroundColor: colors.white }}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: event?.title || 'Event Details',
                    headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17 },
                    headerBackTitleVisible: false,
                    headerShadowVisible: false,
                }}
            />
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Banner */}
                {event?.image_url && (
                    <View style={styles.bannerContainer}>
                        <Image source={{ uri: event.image_url }} style={styles.bannerImg} />
                    </View>
                )}

                {loading && !event ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <ActivityIndicator color={colors.black} />
                        <Text style={{ marginTop: 12, fontFamily: fonts.medium, color: colors.gray400 }}>Loading event...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.title}>{event?.title}</Text>
                            <TouchableOpacity
                                onPress={() => event?.communities?.slug && router.push(`/uni/${event.communities.slug}`)}
                                style={styles.communityRow}
                            >
                                <Ionicons name="business-outline" size={14} color={colors.primary} />
                                <Text style={styles.communityName}>Hosted by {event?.communities?.name || 'Community'}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.statsSection}>
                            <View style={[styles.statItem, { borderRightWidth: 1, borderRightColor: colors.gray100 }]}>
                                <Text style={styles.statValue}>{interestedCount}</Text>
                                <Text style={styles.statLabel}>Interested</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{event?.event_participants?.filter((p: any) => p.status === 'going').length || 0}</Text>
                                <Text style={styles.statLabel}>Going</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.row}>
                                <View style={styles.iconBlock}><Ionicons name="calendar-outline" size={20} color={colors.primary} /></View>
                                <View>
                                    <Text style={styles.dateText}>
                                        {startTime ? startTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '---'}
                                    </Text>
                                    <Text style={styles.timeText}>
                                        {startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                                        {endTime ? ` - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                    </Text>
                                </View>
                            </View>
                            {event?.location && (
                                <View style={[styles.row, { marginTop: spacing.lg }]}>
                                    <View style={styles.iconBlock}><Ionicons name="location-outline" size={20} color={colors.primary} /></View>
                                    <Text style={styles.locationText}>{event.location}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>About this event</Text>
                            <Text style={styles.description}>{event?.description || 'No description provided.'}</Text>
                        </View>

                        <View style={styles.rsvpSection}>
                            <TouchableOpacity
                                style={[styles.interestAction, isInterested && styles.interestActionActive]}
                                onPress={handleInterestToggle}
                            >
                                <Ionicons name={isInterested ? "star" : "star-outline"} size={20} color={isInterested ? colors.white : colors.primary} />
                                <Text style={[styles.interestActionText, isInterested && styles.interestActionTextActive]}>
                                    {isInterested ? "I'm Interested" : "Mark as Interested"}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.divider}>
                                <View style={styles.line} />
                                <Text style={styles.dividerText}>OR RSVP</Text>
                                <View style={styles.line} />
                            </View>

                            <View style={styles.rsvpRow}>
                                {(['going', 'not_going'] as const).map(s => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.rsvpBtn, status === s && styles.rsvpActive]}
                                        onPress={() => handleRSVP(s)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.rsvpText, status === s && styles.rsvpActiveText]}>
                                            {s === 'not_going' ? "Can't go" : "I'm Going"}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
    errorText: { fontFamily: fonts.regular, fontSize: 15, color: colors.gray500 },
    bannerContainer: { height: 220, width: '100%', position: 'relative' },
    bannerImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
    title: { fontFamily: fonts.bold, fontSize: 28, color: colors.black, lineHeight: 34 },
    communityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    communityName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
    statsSection: { flexDirection: 'row', backgroundColor: colors.gray50, marginHorizontal: spacing.lg, borderRadius: 16, paddingVertical: 16, marginBottom: spacing.lg },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
    statLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.gray500, marginTop: 2 },
    section: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.gray100 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconBlock: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(52, 120, 246, 0.08)', justifyContent: 'center', alignItems: 'center' },
    dateText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
    timeText: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray500, marginTop: 2 },
    locationText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
    sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.black, marginBottom: spacing.md },
    description: { fontFamily: fonts.regular, fontSize: 16, color: colors.gray600, lineHeight: 24 },
    rsvpSection: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
    interestAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.white },
    interestActionActive: { backgroundColor: colors.primary },
    interestActionText: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
    interestActionTextActive: { color: colors.white },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
    line: { flex: 1, height: 1, backgroundColor: colors.gray100 },
    dividerText: { fontFamily: fonts.bold, fontSize: 10, color: colors.gray400, letterSpacing: 1 },
    rsvpRow: { flexDirection: 'row', gap: spacing.md },
    rsvpBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.gray50, alignItems: 'center', borderWidth: 1, borderColor: colors.gray200 },
    rsvpActive: { backgroundColor: colors.black, borderColor: colors.black },
    rsvpText: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
    rsvpActiveText: { color: colors.white },
});
