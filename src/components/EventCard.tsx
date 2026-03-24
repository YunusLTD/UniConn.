import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { deleteEvent, toggleEventInterest } from '../api/events';
import { useRouter } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

function timeAgo(dateStr: string) {
    const now = new Date();
    const diff = now.getTime() - new Date(dateStr).getTime();
    if (diff < 0) return 'now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString();
}

export default function EventCard({ event, showDelete = false, onDelete }: { event: any, showDelete?: boolean, onDelete?: (id: string) => void }) {
    const { user } = useAuth();
    const router = useRouter();
    const [isInterested, setIsInterested] = useState(!!event.is_interested);
    const [interestedCount, setInterestedCount] = useState(Number(event.interested_count || 0));
    const [loading, setLoading] = useState(false);

    const isOwner = user?.id === event.created_by;
    const initial = event?.profiles?.name?.[0]?.toUpperCase() || '?';

    const eventDate = new Date(event.start_time);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit',
    });

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
        <View style={styles.card}>
            <View style={styles.row}>
                {/* Left side matched to PostCard */}
                <View style={styles.leftCol}>
                    <TouchableOpacity
                        style={styles.avatar}
                        onPress={() => event.created_by && router.push(`/user/${event.created_by}`)}
                        activeOpacity={0.8}
                    >
                        {event?.profiles?.avatar_url ? (
                            <Image source={{ uri: event.profiles.avatar_url }} style={styles.avatarImg} />
                        ) : (
                            <Text style={styles.avatarText}>{initial}</Text>
                        )}
                    </TouchableOpacity>
                    <View style={styles.threadLine} />
                </View>

                {/* Right side content */}
                <View style={styles.rightCol}>
                    <View style={styles.authorRow}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.nameRow}>
                                <TouchableOpacity onPress={() => event.created_by && router.push(`/user/${event.created_by}`)}>
                                    <Text style={styles.name}>{event?.profiles?.name || 'Anonymous'}</Text>
                                </TouchableOpacity>
                                <Text style={styles.dot}>·</Text>
                                <Text style={styles.time}>{timeAgo(event.created_at)}</Text>
                            </View>
                            <View style={styles.typeTag}>
                                <Text style={styles.typeTagText}>EVENT</Text>
                                {event.communities?.name && (
                                    <>
                                        <Text style={styles.tagDot}>·</Text>
                                        <Text style={styles.communityName}>{event.communities.name}</Text>
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
                        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

                        <View style={styles.eventDetailsBox}>
                            <View style={styles.dateBadge}>
                                <Text style={styles.dateMonth}>{eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text>
                                <Text style={styles.dateDay}>{eventDate.getDate()}</Text>
                            </View>
                            <View style={styles.metaCol}>
                                <View style={styles.metaRow}>
                                    <Ionicons name="time-outline" size={13} color={colors.gray500} />
                                    <Text style={styles.metaText}>{formattedDate}, {formattedTime}</Text>
                                </View>
                                {event.location && (
                                    <View style={styles.metaRow}>
                                        <Ionicons name="location-outline" size={13} color={colors.gray500} />
                                        <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
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
                            style={[styles.interestBtn, isInterested && styles.interestBtnActive]}
                            onPress={handleInterest}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={isInterested ? "star" : "star-outline"} size={16} color={isInterested ? colors.white : colors.gray500} />
                            <Text style={[styles.interestBtnText, isInterested && styles.interestBtnTextActive]}>
                                {isInterested ? 'Interested' : 'Interested'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.statsRow}>
                            <View style={styles.avatarsPreview}>
                                <View style={[styles.miniAvatar, { backgroundColor: colors.gray100, zIndex: 3 }]} />
                                <View style={[styles.miniAvatar, { backgroundColor: colors.gray200, zIndex: 2, marginLeft: -10 }]} />
                                <View style={[styles.miniAvatar, { backgroundColor: colors.gray300, zIndex: 1, marginLeft: -10 }]} />
                            </View>
                            <Text style={styles.statsText}>{interestedCount} {interestedCount === 1 ? 'person' : 'people'} interested</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray200,
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
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: colors.gray200,
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontFamily: fonts.bold, fontSize: 15, color: colors.gray600 },
    threadLine: {
        width: 1.5,
        flex: 1,
        backgroundColor: colors.gray200,
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
        color: colors.black,
    },
    dot: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.gray400,
    },
    time: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.gray400,
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
        color: colors.gray400,
        letterSpacing: 0.5,
    },
    tagDot: {
        fontSize: 10,
        color: colors.gray300,
    },
    communityName: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: colors.gray500,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 17,
        color: colors.black,
        lineHeight: 22,
        marginBottom: 10,
    },
    eventDetailsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray50,
        borderRadius: 12,
        padding: 10,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    dateBadge: {
        width: 42,
        height: 44,
        backgroundColor: colors.white,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    dateMonth: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: colors.danger, // Using standard color for month
        includeFontPadding: false,
    },
    dateDay: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: colors.black,
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
        color: colors.gray600,
    },
    bannerContainer: {
        marginTop: 12,
        borderRadius: 12,
        overflow: 'hidden',
        height: 140,
        backgroundColor: colors.gray100,
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
        backgroundColor: colors.gray100,
    },
    interestBtnActive: {
        backgroundColor: colors.primary,
    },
    interestBtnText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: colors.gray600,
    },
    interestBtnTextActive: {
        color: colors.white,
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
        borderColor: colors.white,
    },
    statsText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.gray500,
    },
});
