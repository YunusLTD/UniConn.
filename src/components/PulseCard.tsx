import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Alert, Share, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radii } from '../constants/theme';
import { votePulse, deletePulse } from '../api/pulse';
import { submitReport } from '../api/reports';
import { useRouter } from 'expo-router';
import ActionModal, { ActionOption } from './ActionModal';
import { hapticLight, hapticSuccess } from '../utils/haptics';

interface PulseCardProps {
    pulse: any;
    onDelete?: () => void;
}

const GHOST_GRADIENTS = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#a18cd1', '#fbc2eb'],
    ['#fccb90', '#d57eeb'],
    ['#e0c3fc', '#8ec5fc'],
];

function getGhostColor(id: string): string {
    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const pair = GHOST_GRADIENTS[hash % GHOST_GRADIENTS.length];
    return pair[0];
}

function timeAgo(date: string): string {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PulseCard({ pulse, onDelete }: PulseCardProps) {
    const router = useRouter();
    const [actionVisible, setActionVisible] = useState(false);
    const [reportReasonVisible, setReportReasonVisible] = useState(false);

    const ghostColor = getGhostColor(pulse.id);



    const handleDelete = () => {
        Alert.alert('Delete Pulse', 'This confession will be removed permanently.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await deletePulse(pulse.id);
                        onDelete?.();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete');
                    }
                }
            }
        ]);
    };

    const handleShare = async () => {
        try {
            const shareUrl = `https://uni-platform.app/pulse/${pulse.id}`;
            await Share.share({ message: `Check out this anonymous confession on Uni Pulse: ${shareUrl}` });
        } catch (e) { }
    };

    const handleCopyLink = () => {
        const shareUrl = `https://uni-platform.app/pulse/${pulse.id}`;
        Clipboard.setString(shareUrl);
        hapticSuccess();
        Alert.alert('Link Copied', 'The confession link has been copied.');
    };

    const sendReport = async (reason: string) => {
        try {
            await submitReport({ target_type: 'pulse', target_id: pulse.id, reason });
            hapticSuccess();
            setReportReasonVisible(false);
            Alert.alert('Reported', 'Thank you. We will review this confession.');
        } catch (e) { }
    };

    const actionOptions: ActionOption[] = [
        { label: 'Share', icon: 'share-outline', onPress: handleShare },
        { label: 'Copy Link', icon: 'link-outline', onPress: handleCopyLink },
        { label: 'Report', icon: 'flag-outline', onPress: () => setReportReasonVisible(true) },
    ];

    if (pulse.is_mine) {
        // Edit and Delete
        actionOptions.unshift({ label: 'Edit', icon: 'pencil-outline', onPress: () => router.push(`/pulse/edit?id=${pulse.id}&content=${encodeURIComponent(pulse.content)}`) });
        actionOptions.push({ label: 'Delete', icon: 'trash-outline', onPress: handleDelete, destructive: true });
    }

    const reportOptions: ActionOption[] = [
        { label: 'Bullying or Harassment', icon: 'alert-circle-outline', onPress: () => sendReport('bullying') },
        { label: 'Hate Speech', icon: 'warning-outline', onPress: () => sendReport('hate_speech') },
        { label: 'Spam', icon: 'ban-outline', onPress: () => sendReport('spam') },
    ];


    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.85}
            onPress={() => {
                hapticLight();
                router.push(`/pulse/${pulse.id}`);
            }}
        >
            {/* Anonymous Header */}
            <View style={styles.header}>
                <View style={[styles.ghostAvatar, { backgroundColor: ghostColor }]}>
                    <Ionicons name="eye-off" size={18} color="white" />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.anonLabel}>Anonymous Student</Text>
                    <Text style={styles.timestamp}>{timeAgo(pulse.created_at)}{pulse.is_mine && ' • You'}</Text>
                </View>
                <TouchableOpacity onPress={() => { hapticLight(); setActionVisible(true); }} hitSlop={12} style={styles.deleteBtn}>
                    <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <Text style={styles.content}>{pulse.content}</Text>

            {/* Image */}
            {pulse.image_url && (
                <Image source={{ uri: pulse.image_url }} style={styles.image} />
            )}

            <View style={styles.footer}>
                <View />

                <TouchableOpacity
                    style={styles.commentBtn}
                    onPress={() => {
                        hapticLight();
                        router.push(`/pulse/${pulse.id}`);
                    }}
                    hitSlop={6}
                >
                    <Ionicons name="chatbubble-outline" size={18} color={colors.gray500} />
                    <Text style={styles.commentCount}>{pulse.comment_count || 0}</Text>
                </TouchableOpacity>
            </View>

            <ActionModal
                visible={actionVisible}
                onClose={() => setActionVisible(false)}
                options={actionOptions}
                title="Pulse Options"
            />
            <ActionModal
                visible={reportReasonVisible}
                onClose={() => setReportReasonVisible(false)}
                options={reportOptions}
                title="Report Confession"
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1a1a2e',
        marginHorizontal: 16,
        marginVertical: 6,
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    ghostAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    anonLabel: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: 'white',
    },
    timestamp: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: '#8F9BB3',
        marginTop: 1,
    },
    deleteBtn: {
        padding: 6,
    },
    content: {
        fontFamily: fonts.regular,
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 24,
        marginBottom: 4,
    },
    image: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        marginTop: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    voteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
        paddingHorizontal: 4,
        paddingVertical: 4,
        gap: 2,
    },
    voteBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    upvotedBtn: {
        backgroundColor: 'rgba(16,185,129,0.15)',
    },
    downvotedBtn: {
        backgroundColor: 'rgba(239,68,68,0.15)',
    },
    scoreText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#E0E0E0',
        minWidth: 36,
        textAlign: 'center',
    },
    commentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
    },
    commentCount: {
        fontFamily: fonts.semibold,
        fontSize: 14,
        color: '#E0E0E0',
    },
});
