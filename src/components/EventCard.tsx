import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { deleteEvent, toggleEventInterest } from '../api/events';
import { useRouter } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { formatTimeAgo, localeByLanguage } from '../utils/localization';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function EventCard({ event, showDelete = false, onDelete }: { event: any, showDelete?: boolean, onDelete?: (id: string) => void }) {
    const { colors, isDark } = useTheme();
    const { t, language } = useLanguage();
    // Special translation helper for EventCard to avoid Georgian overflow issues
    const te = (key: any, defaultText: string) => {
        if (language === 'ka') return defaultText;
        return t(key);
    };
    const { user } = useAuth();
    const router = useRouter();
    const [isInterested, setIsInterested] = useState(!!event.is_interested);
    const [interestedCount, setInterestedCount] = useState(Number(event.interested_count || 0));
    const [loading, setLoading] = useState(false);

    const isOwner = user?.id === event.created_by;
    const initial = event?.profiles?.name?.[0]?.toUpperCase() || '?';

    const eventDate = new Date(event.start_time);
    const formattedDate = eventDate.toLocaleDateString(localeByLanguage[language] || 'en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString(localeByLanguage[language] || 'en-US', {
        hour: '2-digit', minute: '2-digit',
    });
    const endTime = event.end_time ? new Date(event.end_time) : null;
    const isPassed = endTime ? (endTime < new Date()) : (eventDate < new Date());

    const handleInterest = async () => {
        if (loading) return;
        setLoading(true);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        const newInterested = !isInterested;
        setIsInterested(newInterested);
        setInterestedCount(prev => newInterested ? prev + 1 : Math.max(0, prev - 1));

        try {
            const res = await toggleEventInterest(event.id);
            if (res?.data) {
                setIsInterested(!!res.data.is_interested);
                setInterestedCount(Number(res.data.interested_count));
            }
        } catch (e) {
            // Rollback
            setIsInterested(!newInterested);
            setInterestedCount(prev => !newInterested ? prev + 1 : Math.max(0, prev - 1));
            Alert.alert('Error', 'Could not update interest');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert('Delete Event', 'Cancel this event permanently?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteEvent(event.id);
                        if (onDelete) onDelete(event.id);
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete event.');
                    }
                }
            }
        ]);
    };

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.row}>
                {/* Left side matched to PostCard */}
                <View style={styles.leftCol}>
                    <TouchableOpacity
                        style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => event.created_by && router.push(`/user/${event.created_by}`)}
                        activeOpacity={0.8}
                    >
                        {event?.profiles?.avatar_url ? (
                            <Image source={{ uri: event.profiles.avatar_url }} style={styles.avatarImg} />
                        ) : (
                            <Text style={[styles.avatarText, { color: colors.gray500 }]}>{initial}</Text>
                        )}
                    </TouchableOpacity>
                    <View style={[styles.threadLine, { backgroundColor: colors.border }]} />
                </View>

                {/* Right side content */}
                <View style={styles.rightCol}>
                    <View style={styles.authorRow}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.nameRow}>
                                <TouchableOpacity onPress={() => event.created_by && router.push(`/user/${event.created_by}`)}>
                                    <Text style={[styles.name, { color: colors.black }]}>{event?.profiles?.name || te('anonymous_user', 'Anonymous')}</Text>
                                </TouchableOpacity>
                                <Text style={[styles.dot, { color: colors.gray400 }]}>·</Text>
                                <Text style={[styles.time, { color: colors.gray400 }]}>{formatTimeAgo(event.created_at, t, language, true)}</Text>
                            </View>
                            <View style={styles.typeTag}>
                                <Text style={[styles.typeTagText, { color: colors.primary }]}>{t('event_badge')}</Text>
                                {event.communities?.name && (
                                    <>
                                        <Text style={[styles.tagDot, { color: colors.gray300 }]}>·</Text>
                                        <Text style={[styles.communityName, { color: colors.gray500 }]}>{event.communities.name}</Text>
                                    </>
                                )}
                            </View>
                        </View>
                        {isOwner && showDelete && (
                            <TouchableOpacity onPress={handleDelete} hitSlop={8}>
                                <Ionicons name="trash-outline" size={16} color={colors.gray400} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push(`/events/${event.id}`)}
                        activeOpacity={0.9}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Text style={[styles.title, { color: colors.black, marginBottom: 0 }]} numberOfLines={2}>{event.title}</Text>
                            {isPassed && (
                                <View style={[styles.passedBadge, { backgroundColor: isDark ? colors.surface : colors.gray100 }]}>
                                    <Text style={styles.passedBadgeText}>{t('event_passed')}</Text>
                                </View>
                            )}
                        </View>

                        <View style={[styles.eventDetailsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={[styles.dateBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Text style={[styles.dateMonth, { color: colors.danger }]}>{eventDate.toLocaleDateString(localeByLanguage[language], { month: 'short' }).toUpperCase()}</Text>
                                <Text style={[styles.dateDay, { color: colors.black }]}>{eventDate.getDate()}</Text>
                            </View>
                            <View style={styles.metaCol}>
                                <View style={styles.metaRow}>
                                    <Ionicons name="time-outline" size={13} color={colors.gray500} />
                                    <Text style={[styles.metaText, { color: colors.gray600 }]}>{formattedDate}, {formattedTime}</Text>
                                </View>
                                {event.location && (
                                    <View style={styles.metaRow}>
                                        <Ionicons name="location-outline" size={13} color={colors.gray500} />
                                        <Text style={[styles.metaText, { color: colors.gray600 }]} numberOfLines={1}>{event.location}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {event.image_url && (
                            <View style={styles.bannerContainer}>
                                <Image source={{ uri: event.image_url }} style={styles.bannerImg} />
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footerRow}>
                        <TouchableOpacity
                            style={[
                                styles.interestBtn, 
                                { backgroundColor: colors.gray100 }, 
                                isInterested && { backgroundColor: colors.primary },
                                isPassed && { opacity: 0.5 }
                            ]}
                            onPress={handleInterest}
                            disabled={isPassed || loading}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={isInterested ? "star" : "star-outline"} size={16} color={isInterested ? colors.white : colors.gray500} />
                            <Text style={[styles.interestBtnText, { color: colors.gray600 }, isInterested && { color: colors.white }]}>
                                {te('interested_label', 'Interested')}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.statsRow}>
                            <View style={styles.avatarsPreview}>
                                <View style={[styles.miniAvatar, { backgroundColor: colors.gray100, borderColor: colors.surface, zIndex: 3 }]} />
                                <View style={[styles.miniAvatar, { backgroundColor: colors.gray200, borderColor: colors.surface, zIndex: 2, marginLeft: -10 }]} />
                                <View style={[styles.miniAvatar, { backgroundColor: colors.gray300, borderColor: colors.surface, zIndex: 1, marginLeft: -10 }]} />
                            </View>
                            <Text style={[styles.statsText, { color: colors.gray500 }]}>{interestedCount} {interestedCount === 1 ? te('person_interested', 'person interested') : te('people_interested', 'people interested')}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderBottomWidth: 0.5,
    },
    row: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingTop: 14,
        paddingBottom: 4,
    },
    leftCol: {
        alignItems: 'center',
        width: 44,
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 0.5,
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontFamily: fonts.bold, fontSize: 15 },
    threadLine: {
        width: 1.5,
        flex: 1,
        marginTop: 8,
        borderRadius: 1,
        minHeight: 12,
    },
    rightCol: {
        flex: 1,
        paddingBottom: 14,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    name: {
        fontFamily: fonts.semibold,
        fontSize: 14,
    },
    dot: {
        fontFamily: fonts.regular,
        fontSize: 12,
    },
    time: {
        fontFamily: fonts.regular,
        fontSize: 12,
    },
    typeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
        gap: 4,
    },
    typeTagText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        letterSpacing: 0.5,
    },
    tagDot: {
        fontSize: 10,
    },
    communityName: {
        fontFamily: fonts.regular,
        fontSize: 11,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 17,
        lineHeight: 22,
        marginBottom: 10,
    },
    eventDetailsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 10,
        gap: 12,
        borderWidth: 1,
    },
    dateBadge: {
        width: 42,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    dateMonth: {
        fontFamily: fonts.bold,
        fontSize: 10,
        includeFontPadding: false,
    },
    dateDay: {
        fontFamily: fonts.bold,
        fontSize: 18,
        marginTop: -1,
        includeFontPadding: false,
    },
    metaCol: {
        flex: 1,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontFamily: fonts.medium,
        fontSize: 12,
    },
    bannerContainer: {
        marginTop: 12,
        borderRadius: 12,
        overflow: 'hidden',
        height: 140,
    },
    bannerImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
    },
    interestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radii.full,
    },
    interestBtnText: {
        fontFamily: fonts.bold,
        fontSize: 13,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    avatarsPreview: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniAvatar: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
    },
    statsText: {
        fontFamily: fonts.medium,
        fontSize: 12,
    },
    passedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    passedBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 9,
        color: '#999',
        letterSpacing: 0.5,
    },
});
