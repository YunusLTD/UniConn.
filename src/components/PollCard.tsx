import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, Alert, Image, Share, Clipboard } from 'react-native';
import { spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { voteInPoll, deletePoll } from '../api/polls';
import { submitReport } from '../api/reports';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import ActionModal, { ActionOption } from './ActionModal';

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
    const { colors } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const [selected, setSelected] = useState<string | null>(poll?.voted_option);
    const [submitting, setSubmitting] = useState(false);
    const [localTotalVotes, setLocalTotalVotes] = useState<number>(0);
    const [localOptions, setLocalOptions] = useState<any[]>([]);
    const [actionVisible, setActionVisible] = useState(false);
    const [reportReasonVisible, setReportReasonVisible] = useState(false);
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

    const handleShare = async () => {
        try {
            const shareUrl = `https://uni-platform.app/poll/${poll.id}`;
            await Share.share({
                title: 'UniConnect Poll',
                message: `Vote in this poll on Uni Platform: ${shareUrl}`,
            });
        } catch (e) {
            console.error('Share error', e);
        }
    };

    const handleCopyLink = () => {
        const shareUrl = `https://uni-platform.app/poll/${poll.id}`;
        Clipboard.setString(shareUrl);
        Alert.alert('Link Copied', 'The poll link has been copied to your clipboard.');
    };

    const handleMenu = () => {
        setActionVisible(true);
    };

    const handleReport = () => {
        setReportReasonVisible(true);
    };

    const sendReport = async (reason: string) => {
        try {
            await submitReport({ target_type: 'poll', target_id: poll.id, reason });
            setReportReasonVisible(false);
            
            Alert.alert(
                'Reported',
                'Thank you. We will review this poll.',
                [
                    {
                        text: 'Hide Poll',
                        style: 'destructive',
                        onPress: () => {
                            if (onDelete && poll.id) onDelete(poll.id);
                        }
                    },
                    {
                        text: 'Done',
                        style: 'default',
                    }
                ]
            );
        } catch (e) {
            console.log('Report error', e);
        }
    };

    const actionOptions: ActionOption[] = [
        { label: 'Share', icon: 'share-outline', onPress: handleShare },
        { label: 'Copy Link', icon: 'link-outline', onPress: handleCopyLink },
        { label: 'Report', icon: 'flag-outline', onPress: handleReport },
    ];

    if (isOwner) {
        actionOptions.unshift({ label: 'Delete', icon: 'trash-outline', onPress: handleDelete, destructive: true });
    }

    const reportOptions: ActionOption[] = [
        { label: 'Inappropriate Content', icon: 'alert-circle-outline', onPress: () => sendReport('inappropriate') },
        { label: 'Harassment', icon: 'hand-left-outline', onPress: () => sendReport('harassment') },
        { label: 'Spam', icon: 'ban-outline', onPress: () => sendReport('spam') },
    ];

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.row}>
                {/* Left side matched to PostCard */}
                <View style={styles.leftCol}>
                    <TouchableOpacity
                        style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => poll.created_by && router.push(`/user/${poll.created_by}`)}
                        activeOpacity={0.8}
                    >
                        {poll?.profiles?.avatar_url ? (
                            <Image source={{ uri: poll.profiles.avatar_url }} style={styles.avatarImg} />
                        ) : (
                            <Text style={[styles.avatarText, { color: colors.gray600 }]}>{initial}</Text>
                        )}
                    </TouchableOpacity>
                    <View style={[styles.threadLine, { backgroundColor: colors.border }]} />
                </View>

                {/* Right side content */}
                <View style={styles.rightCol}>
                    <View style={styles.authorRow}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.nameRow}>
                                <TouchableOpacity onPress={() => poll.created_by && router.push(`/user/${poll.created_by}`)}>
                                    <Text style={[styles.name, { color: colors.black }]}>{poll?.profiles?.name || 'Anonymous'}</Text>
                                </TouchableOpacity>
                                <Text style={[styles.dot, { color: colors.gray400 }]}>·</Text>
                                <Text style={[styles.time, { color: colors.gray400 }]}>{timeAgo(poll.created_at)}</Text>
                            </View>
                            <View style={styles.typeTag}>
                                <Text style={[styles.typeTagText, { color: colors.primary }]}>POLL</Text>
                                {poll?.communities?.name && (
                                    <>
                                        <Text style={[styles.tagDot, { color: colors.gray300 }]}>·</Text>
                                        <Text style={[styles.communityName, { color: colors.gray500 }]}>{poll.communities.name}</Text>
                                    </>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity onPress={handleMenu} hitSlop={8}>
                            <Ionicons name="ellipsis-horizontal" size={18} color={colors.gray400} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.question, { color: colors.black }]}>{poll?.question}</Text>

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
                                        { backgroundColor: colors.surface, borderColor: colors.border },
                                        selected && [styles.optionBtnLocked, { backgroundColor: colors.background, borderColor: colors.border }],
                                        isVotedByMe && [styles.optionBtnActive, { borderColor: colors.primary }]
                                    ]}
                                    onPress={() => handleVote(optId)}
                                    activeOpacity={0.7}
                                    disabled={submitting}
                                >
                                    {selected && (
                                        <View style={[styles.progressBg, { width: `${percent}%`, backgroundColor: colors.primary + '20' }]} />
                                    )}
                                    <View style={styles.optionContent}>
                                        <Text style={[
                                            styles.optionText,
                                            { color: colors.black },
                                            isVotedByMe && { color: colors.primary },
                                            selected && { fontFamily: fonts.semibold }
                                        ]}>
                                            {opt.option_text || opt.text}
                                        </Text>

                                        {selected && (
                                            <View style={styles.voteStats}>
                                                {isVotedByMe && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
                                                <Text style={[styles.statPercent, { color: colors.black }]}>{percent}%</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.footerRow}>
                        <Ionicons name="people-outline" size={13} color={colors.gray400} />
                        <Text style={[styles.voteCount, { color: colors.gray500 }]}>{localTotalVotes} votes</Text>
                        {!selected && (
                            <>
                                <Text style={[styles.dotSeparator, { color: colors.gray400 }]}>·</Text>
                                <Text style={[styles.actionHint, { color: colors.primary }]}>Tap to vote</Text>
                            </>
                        )}
                    </View>
                </View>
            </View>

            <ActionModal
                visible={actionVisible}
                onClose={() => setActionVisible(false)}
                options={actionOptions}
                title="Poll Options"
            />

            <ActionModal
                visible={reportReasonVisible}
                onClose={() => setReportReasonVisible(false)}
                options={reportOptions}
                title="Why are you reporting?"
            />
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
    question: {
        fontFamily: fonts.semibold,
        fontSize: 15,
        lineHeight: 21,
        marginTop: 6,
        marginBottom: 12,
    },
    optionsContainer: {
        gap: 8,
    },
    optionBtn: {
        height: 40,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    optionBtnLocked: {
    },
    optionBtnActive: {
    },
    progressBg: {
        ...StyleSheet.absoluteFillObject,
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
    },
    optionTextVoted: {
        fontFamily: fonts.semibold,
    },
    optionTextActive: {
    },
    voteStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statPercent: {
        fontFamily: fonts.bold,
        fontSize: 13,
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
    },
    dotSeparator: {
        fontFamily: fonts.regular,
        fontSize: 12,
    },
    actionHint: {
        fontFamily: fonts.medium,
        fontSize: 12,
    },
});
