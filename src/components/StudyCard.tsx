import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Share, Clipboard, Alert } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { deleteStudyQuestion } from '../api/study';
import { submitReport } from '../api/reports';
import ActionModal, { ActionOption } from './ActionModal';

interface StudyCardProps {
    question: any;
}

const StudyCard: React.FC<{ question: any, onDelete?: (id: string) => void }> = ({ question, onDelete }) => {
    const router = useRouter();
    const { user } = useAuth();
    const [actionVisible, setActionVisible] = useState(false);
    const [reportReasonVisible, setReportReasonVisible] = useState(false);
    const isMe = user?.id === question.user_id;
    const initial = question.profiles?.name?.[0]?.toUpperCase() || '?';

    const handleDelete = () => {
        Alert.alert('Delete Question', 'Remove this question permanently?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteStudyQuestion(question.id);
                        if (onDelete) onDelete(question.id);
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete question.');
                    }
                }
            }
        ]);
    };

    const handleShare = async () => {
        try {
            const shareUrl = `https://uni-platform.app/study/${question.id}`;
            await Share.share({
                title: question.title,
                message: `Can you help with this question: ${question.title} - ${shareUrl}`,
            });
        } catch (e) {
            console.error('Share error', e);
        }
    };

    const handleCopyLink = () => {
        const shareUrl = `https://uni-platform.app/study/${question.id}`;
        Clipboard.setString(shareUrl);
        Alert.alert('Link Copied', 'The question link has been copied to your clipboard.');
    };

    const handleMenu = () => {
        setActionVisible(true);
    };

    const handleReport = () => {
        setReportReasonVisible(true);
    };

    const sendReport = async (reason: string) => {
        try {
            await submitReport({ target_type: 'study_question', target_id: question.id, reason });
            setReportReasonVisible(false);
            
            Alert.alert(
                'Reported',
                'Thank you. We will review this question.',
                [
                    {
                        text: 'Hide Question',
                        style: 'destructive',
                        onPress: () => {
                            if (onDelete) onDelete(question.id);
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

    if (isMe) {
        actionOptions.unshift({ label: 'Delete', icon: 'trash-outline', onPress: handleDelete, destructive: true });
    }

    const reportOptions: ActionOption[] = [
        { label: 'Academic Dishonesty', icon: 'school-outline', onPress: () => sendReport('cheating') },
        { label: 'Inappropriate Content', icon: 'alert-circle-outline', onPress: () => sendReport('inappropriate') },
        { label: 'Spam', icon: 'ban-outline', onPress: () => sendReport('spam') },
    ];

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => router.push(`/study/${question.id}`)}
        >
            <View style={styles.header}>
                <View style={[styles.avatar, !question.profiles?.avatar_url && styles.avatarPlaceholder]}>
                    {question.profiles?.avatar_url ? (
                        <Image source={{ uri: question.profiles.avatar_url }} style={styles.avatarImg} />
                    ) : (
                        <Text style={styles.avatarText}>{initial}</Text>
                    )}
                </View>
                <View style={styles.headerInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.name}>{question.profiles?.name || 'Anonymous'}</Text>
                        {isMe && <Text style={[styles.name, { color: colors.gray400, fontSize: 13 }]}>{'(You)'}</Text>}
                    </View>
                    <Text style={styles.time}>{new Date(question.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {question.subject}</Text>
                </View>
                <View style={styles.badgeRow}>
                    <View style={styles.subjectBadge}>
                        <Text style={styles.subjectText}>{question.subject}</Text>
                    </View>
                    <TouchableOpacity onPress={handleMenu} hitSlop={8} style={{ marginLeft: 8 }}>
                        <Ionicons name="ellipsis-horizontal" size={18} color={colors.gray400} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={2}>{question.title}</Text>
                <Text style={styles.description} numberOfLines={3}>{question.content}</Text>
            </View>

            {
                question.image_url && (
                    <Image source={{ uri: question.image_url }} style={styles.image} resizeMode="cover" />
                )
            }

            <View style={styles.footer}>
                <View style={styles.action}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.gray500} />
                    <Text style={styles.actionText}>{question.answers_count || 0} {question.answers_count === 1 ? 'Reply' : 'Replies'}</Text>
                </View>
                <View style={styles.action}>
                    <Text style={[styles.actionText, { color: colors.black, fontFamily: fonts.bold }]}>Help out</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                </View>

                <ActionModal
                    visible={actionVisible}
                    onClose={() => setActionVisible(false)}
                    options={actionOptions}
                    title="Study Question"
                />

                <ActionModal
                    visible={reportReasonVisible}
                    onClose={() => setReportReasonVisible(false)}
                    options={reportOptions}
                    title="Why are you reporting?"
                />
            </View>
        </TouchableOpacity >
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        borderRadius: 20,
        padding: 16,
        borderWidth: 0.5,
        borderColor: colors.gray100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
    },
    avatarPlaceholder: {
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.gray500,
    },
    headerInfo: {
        flex: 1,
        marginLeft: 10,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.black,
    },
    time: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: colors.gray500,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subjectBadge: {
        backgroundColor: colors.gray50,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: colors.gray100,
    },
    subjectText: {
        fontFamily: fonts.semibold,
        fontSize: 10,
        color: colors.gray600,
        textTransform: 'uppercase',
    },
    content: {
        marginBottom: 12,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 17,
        color: colors.black,
        lineHeight: 22,
        marginBottom: 6,
    },
    description: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray600,
        lineHeight: 20,
    },
    image: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 0.5,
        borderTopColor: colors.gray50,
    },
    action: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.gray500,
    },
});

export default StudyCard;
