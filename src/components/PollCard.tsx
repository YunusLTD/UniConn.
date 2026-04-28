import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, Alert, Image, Share, Clipboard, Animated, DeviceEventEmitter } from 'react-native';
import { Skeleton } from './ShadowLoader';
import { spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { voteInPoll, deletePoll } from '../api/polls';
import { submitReport } from '../api/reports';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import ActionModal, { ActionOption } from './ActionModal';
import { useLanguage } from '../context/LanguageContext';
import { formatTimeAgo } from '../utils/localization';
import { ICONS } from '../constants/icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PollCard({ poll, showDelete = false, onDelete }: { poll: any, showDelete?: boolean, onDelete?: (id: string) => void }) {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
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

    const [isHydrated, setIsHydrated] = useState(!!poll?.profiles?.name);
    const hydratedAnim = React.useRef(new Animated.Value(poll?.profiles?.name ? 1 : 0)).current;

    // Sync from props on mount or change
    React.useEffect(() => {
        const baseOptions = poll?.poll_options || poll?.options || [];
        setLocalOptions(baseOptions);
        setLocalTotalVotes(baseOptions.reduce((sum: number, opt: any) => sum + (Number(opt.votes_count || opt.votes || 0)), 0));
        setSelected(poll?.my_vote || poll?.voted_option || null);

        if (poll?.profiles?.name && !isHydrated) {
            setIsHydrated(true);
            Animated.timing(hydratedAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }
    }, [poll.id, poll.my_vote, poll.options, poll.poll_options, poll.profiles?.name]);

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
                    const actionId = Math.random().toString(36).substring(7);
                    DeviceEventEmitter.emit('action_status', { id: actionId, type: 'delete', status: 'processing' });
                    try {
                        await deletePoll(poll.id);
                        if (onDelete) onDelete(poll.id);
                        DeviceEventEmitter.emit('action_status', { id: actionId, type: 'delete', status: 'success' });
                    } catch (e) {
                        DeviceEventEmitter.emit('action_status', { id: actionId, type: 'delete', status: 'error', message: 'Failed to delete poll.' });
                        Alert.alert('Error', 'Failed to delete poll.');
                    }
                }
            }
        ]);
    };

    const handleShare = async () => {
        const actionId = Math.random().toString(36).substring(7);
        DeviceEventEmitter.emit('action_status', { id: actionId, type: 'send', status: 'processing' });
        try {
            const shareUrl = `https://uni-platform.app/poll/${poll.id}`;
            await Share.share({
                title: 'UniConnect Poll',
                message: `Vote in this poll on Uni Platform: ${shareUrl}`,
            });
            DeviceEventEmitter.emit('action_status', { id: actionId, type: 'send', status: 'success' });
        } catch (e) {
            DeviceEventEmitter.emit('action_status', { id: actionId, type: 'send', status: 'error', message: 'Share failed' });
            console.error('Share error', e);
        }
    };

    const handleCopyLink = () => {
        const shareUrl = `https://uni-platform.app/poll/${poll.id}`;
        Clipboard.setString(shareUrl);
        Alert.alert(t('link_copied_title'), t('poll_link_copied'));
    };

    const handleMenu = () => {
        setActionVisible(true);
    };

    const handleReport = () => {
        setReportReasonVisible(true);
    };

    const sendReport = async (reason: string) => {
        const actionId = Math.random().toString(36).substring(7);
        DeviceEventEmitter.emit('action_status', { id: actionId, type: 'send', status: 'processing' });
        try {
            await submitReport({ target_type: 'poll', target_id: poll.id, reason });
            setReportReasonVisible(false);
            if (onDelete && poll.id) onDelete(poll.id);
            DeviceEventEmitter.emit('action_status', { id: actionId, type: 'send', status: 'success' });
            Alert.alert('Reported', 'Thank you. We will review this poll.');
        } catch (e) {
            DeviceEventEmitter.emit('action_status', { id: actionId, type: 'send', status: 'error', message: 'Failed to submit report.' });
            console.log('Report error', e);
        }
    };


    const actionOptions: ActionOption[] = [
        { label: t('share_option'), icon: ICONS.share, onPress: handleShare },
        { label: t('report_option'), icon: ICONS.report, onPress: handleReport },
    ];

    if (isOwner) {
        actionOptions.unshift({ label: t('delete_label'), icon: ICONS.delete, onPress: handleDelete, destructive: true });
    }

    const reportOptions: ActionOption[] = [
        { label: t('inappropriate_content_option'), icon: 'alert-circle-outline', onPress: () => sendReport('inappropriate') },
        { label: t('harassment_option'), icon: 'hand-left-outline', onPress: () => sendReport('harassment') },
        { label: t('spam_option'), icon: 'ban-outline', onPress: () => sendReport('spam') },
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
                        ) : !!poll?.profiles?.name ? (
                            <Text style={[styles.avatarText, { color: colors.gray600 }]}>{initial}</Text>
                        ) : (
                            <Skeleton width="100%" height="100%" borderRadius={radii.full || 20} />
                        )}
                    </TouchableOpacity>
                    <View style={[styles.threadLine, { backgroundColor: colors.border }]} />
                </View>

                {/* Right side content */}
                <View style={styles.rightCol}>
                    <View style={styles.authorRow}>
                        <View style={{ flex: 1 }}>
                            {poll?.profiles?.name ? (
                                <Animated.View style={{ opacity: hydratedAnim }}>
                                    <View style={styles.nameRow}>
                                        <TouchableOpacity onPress={() => poll.created_by && router.push(`/user/${poll.created_by}`)}>
                                            <Text style={[styles.name, { color: colors.black }]}>{poll?.profiles?.name || t('anonymous_user')}</Text>
                                        </TouchableOpacity>
                                        <Text style={[styles.dot, { color: colors.gray400 }]}>·</Text>
                                        <Text style={[styles.time, { color: colors.gray400 }]}>{formatTimeAgo(poll.created_at, t, language, true)}</Text>
                                    </View>
                                    <View style={styles.typeTag}>
                                        <Text style={[styles.typeTagText, { color: colors.primary }]}>{t('poll_badge')}</Text>
                                        {poll?.communities?.name && (
                                            <>
                                                <Text style={[styles.tagDot, { color: colors.gray300 }]}>·</Text>
                                                <Text style={[styles.communityName, { color: colors.gray500 }]}>{poll.communities.name}</Text>
                                            </>
                                        )}
                                    </View>
                                </Animated.View>
                            ) : (
                                <View style={{ gap: 6, marginTop: 4 }}>
                                    <Skeleton width="40%" height={12} borderRadius={6} />
                                    <Skeleton width="20%" height={10} borderRadius={5} />
                                </View>
                            )}
                        </View>
                        <TouchableOpacity onPress={handleMenu} hitSlop={8}>
                            <Ionicons name="ellipsis-horizontal" size={18} color={colors.gray400} />
                        </TouchableOpacity>
                    </View>

                    {poll?.question ? (
                        <>
                            <Text style={[styles.question, { color: colors.black }]}>{poll.question}</Text>
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
                        </>
                    ) : (
                        <View style={{ gap: 10, marginTop: 12, marginBottom: 16 }}>
                            <Skeleton width="100%" height={20} borderRadius={4} />
                            <View style={{ gap: 8 }}>
                                <Skeleton width="100%" height={40} borderRadius={16} />
                                <Skeleton width="100%" height={40} borderRadius={16} />
                            </View>
                        </View>
                    )}

                    <View style={styles.footerRow}>
                        <Ionicons name="people-outline" size={13} color={colors.gray400} />
                        <Text style={[styles.voteCount, { color: colors.gray500 }]}>{localTotalVotes} {t('votes_label')}</Text>
                        {!selected && (
                            <>
                                <Text style={[styles.dotSeparator, { color: colors.gray400 }]}>·</Text>
                                <Text style={[styles.actionHint, { color: colors.primary }]}>{t('tap_to_vote')}</Text>
                            </>
                        )}
                    </View>
                </View>
            </View>

            <ActionModal
                visible={actionVisible}
                onClose={() => setActionVisible(false)}
                options={actionOptions}
                title={t('poll_options_title')}
            />

            <ActionModal
                visible={reportReasonVisible}
                onClose={() => setReportReasonVisible(false)}
                options={reportOptions}
                title={t('why_reporting_title')}
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
