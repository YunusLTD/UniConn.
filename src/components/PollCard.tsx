import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, Alert, Image } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { voteInPoll, deletePoll } from '../api/polls';
import { useAuth } from '../context/AuthContext';
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

export default function PollCard({ poll, showDelete = false, onDelete }: { poll: any, showDelete?: boolean, onDelete?: (id: string) => void }) {
    const { user } = useAuth();
    const router = useRouter();
    const [selected, setSelected] = useState<string | null>(poll?.voted_option);
    const [submitting, setSubmitting] = useState(false);
    const [localTotalVotes, setLocalTotalVotes] = useState<number>(0);
    const [localOptions, setLocalOptions] = useState<any[]>([]);
    const isOwner = user?.id === poll?.created_by;
    const initial = poll?.profiles?.name?.[0]?.toUpperCase() || '?';

    // Sync from props on mount or change
    React.useEffect(() => {
        const baseOptions = poll?.poll_options || poll?.options || [];
        setLocalOptions(baseOptions);
        setLocalTotalVotes(baseOptions.reduce((sum: number, opt: any) => sum + (Number(opt.votes_count || opt.votes || 0)), 0));
    }, [poll]);

    const handleVote = async (optionId: string) => {
        if (submitting) return;
        if (selected === optionId) return; // Already voted for this one

        setSubmitting(true);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        const oldSelected = selected;

        // Optimistic Update
        setSelected(optionId);

        // If they hadn't voted yet, increment total. If they are switching, total stays same.
        if (!oldSelected) {
            setLocalTotalVotes(prev => prev + 1);
        }

        setLocalOptions(prev => prev.map(opt => {
            const optId = opt.id;
            let count = Number(opt.votes_count || opt.votes || 0);

            if (optId === optionId) {
                // Increment new choice
                return { ...opt, votes_count: count + 1 };
            } else if (optId === oldSelected) {
                // Decrement old choice
                return { ...opt, votes_count: Math.max(0, count - 1) };
            }
            return opt;
        }));

        try {
            await voteInPoll(poll.id, optionId);
        } catch (e) {
            console.error('Vote error', e);
            // Rollback
            setSelected(oldSelected);
            const baseOptions = poll?.poll_options || poll?.options || [];
            setLocalOptions(baseOptions);
            setLocalTotalVotes(baseOptions.reduce((sum: number, o: any) => sum + (Number(o.votes_count || o.votes || 0)), 0));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert('Delete Poll', 'Remove this poll permanently?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    if (!poll?.id) return;
                    try {
                        await deletePoll(poll.id);
                        if (onDelete) onDelete(poll.id);
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete poll.');
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
                        onPress={() => poll.created_by && router.push(`/user/${poll.created_by}`)}
                        activeOpacity={0.8}
                    >
                        {poll?.profiles?.avatar_url ? (
                            <Image source={{ uri: poll.profiles.avatar_url }} style={styles.avatarImg} />
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
                                <TouchableOpacity onPress={() => poll.created_by && router.push(`/user/${poll.created_by}`)}>
                                    <Text style={styles.name}>{poll?.profiles?.name || 'Anonymous'}</Text>
                                </TouchableOpacity>
                                <Text style={styles.dot}>·</Text>
                                <Text style={styles.time}>{timeAgo(poll.created_at)}</Text>
                            </View>
                            <View style={styles.typeTag}>
                                <Text style={styles.typeTagText}>POLL</Text>
                                {poll?.communities?.name && (
                                    <>
                                        <Text style={styles.tagDot}>·</Text>
                                        <Text style={styles.communityName}>{poll.communities.name}</Text>
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

                    <Text style={styles.question}>{poll?.question}</Text>

                    <View style={styles.optionsContainer}>
                        {localOptions.map((opt: any, index: number) => {
                            const optId = opt.id || `opt_${index}`;
                            const isVotedByMe = selected === optId;
                            const optionVotes = Number(opt.votes_count || opt.votes || 0);
                            const percent = localTotalVotes > 0 ? Math.round((optionVotes / localTotalVotes) * 100) : 0;

                            return (
                                <TouchableOpacity
                                    key={optId}
                                    style={[
                                        styles.optionBtn,
                                        selected && styles.optionBtnLocked,
                                        isVotedByMe && styles.optionBtnActive
                                    ]}
                                    onPress={() => handleVote(optId)}
                                    activeOpacity={0.7}
                                    disabled={submitting}
                                >
                                    {selected && (
                                        <View style={[styles.progressBg, { width: `${percent}%` }]} />
                                    )}
                                    <View style={styles.optionContent}>
                                        <Text style={[
                                            styles.optionText,
                                            isVotedByMe && styles.optionTextActive,
                                            selected && styles.optionTextVoted
                                        ]}>
                                            {opt.option_text || opt.text}
                                        </Text>

                                        {selected && (
                                            <View style={styles.voteStats}>
                                                {isVotedByMe && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
                                                <Text style={styles.statPercent}>{percent}%</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.footerRow}>
                        <Ionicons name="people-outline" size={13} color={colors.gray400} />
                        <Text style={styles.voteCount}>{localTotalVotes} votes</Text>
                        {!selected && (
                            <>
                                <Text style={styles.dotSeparator}>·</Text>
                                <Text style={styles.actionHint}>Tap to vote</Text>
                            </>
                        )}
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
    question: {
        fontFamily: fonts.semibold,
        fontSize: 15,
        color: colors.gray800,
        lineHeight: 21,
        marginTop: 6,
        marginBottom: 12,
    },
    optionsContainer: {
        gap: 8,
    },
    optionBtn: {
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.gray200,
        backgroundColor: colors.white,
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    optionBtnLocked: {
        borderColor: colors.gray100,
        backgroundColor: colors.gray50,
    },
    optionBtnActive: {
        borderColor: 'rgba(52, 120, 246, 0.4)',
        backgroundColor: 'rgba(52, 120, 246, 0.03)',
    },
    progressBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(52, 120, 246, 0.1)',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        width: '100%',
    },
    optionText: {
        flex: 1,
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.gray800,
    },
    optionTextVoted: {
        fontFamily: fonts.semibold,
        color: colors.black,
    },
    optionTextActive: {
        color: colors.primary,
    },
    voteStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statPercent: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: colors.black,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 6,
    },
    voteCount: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.gray500,
    },
    dotSeparator: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.gray400,
    },
    actionHint: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.primary,
    },
});
