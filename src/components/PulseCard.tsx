import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Share, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, lightColors } from '../constants/theme';
import { deletePulse } from '../api/pulse';
import { submitReport } from '../api/reports';
import { useRouter } from 'expo-router';
import ActionModal, { ActionOption } from './ActionModal';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { createPulseAliasSeed, getPulseAlias } from '../utils/pulseAlias';

interface PulseCardProps {
    pulse: any;
    onDelete?: () => void;
    aliasSeed?: number;
}

const GHOST_COLORS = [
    '#A154F2', '#8B5CF6', '#9333EA', '#A78BFA',
];
const PULSE_ICON_WHITE_URI = 'https://img.icons8.com/?size=100&id=33452&format=png&color=FFFFFF';

function getGhostColor(id: string): string {
    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return GHOST_COLORS[hash % GHOST_COLORS.length];
}

function timeAgo(date: string, t: (key: any) => string, language: 'en' | 'tr' | 'ka'): string {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diff < 60) return t('just_now');
    if (diff < 3600) return t('minute_ago').replace('{{count}}', String(Math.floor(diff / 60)));
    if (diff < 86400) return t('hour_ago').replace('{{count}}', String(Math.floor(diff / 3600)));
    if (diff < 604800) return t('day_ago').replace('{{count}}', String(Math.floor(diff / 86400)));

    const localeMap = {
        en: 'en-US',
        tr: 'tr-TR',
        ka: 'ka-GE',
    };
    return d.toLocaleDateString(localeMap[language]);
}

export default function PulseCard({ pulse, onDelete, aliasSeed }: PulseCardProps) {
    const router = useRouter();
    const { t, language } = useLanguage();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [actionVisible, setActionVisible] = useState(false);
    const [reportReasonVisible, setReportReasonVisible] = useState(false);
    const localAliasSeed = useRef(createPulseAliasSeed()).current;

    const ghostColor = getGhostColor(pulse.id);
    const currentSeed = aliasSeed ?? localAliasSeed;
    const authorLabel = pulse.is_mine ? t('pulse_you_anonymous') : getPulseAlias(pulse.id, currentSeed);

    const handleDelete = () => {
        Alert.alert(t('pulse_delete_title'), t('pulse_delete_confirm'), [
            { text: t('cancel_label'), style: 'cancel' },
            {
                text: t('delete_label'), style: 'destructive', onPress: async () => {
                    try {
                        await deletePulse(pulse.id);
                        onDelete?.();
                    } catch (e) {
                        Alert.alert(t('error'), t('pulse_failed_to_delete'));
                    }
                }
            }
        ]);
    };

    const handleShare = async () => {
        try {
            const shareUrl = `https://uni-platform.app/pulse/${pulse.id}`;
            await Share.share({ message: `${t('pulse_share_prefix')} ${shareUrl}` });
        } catch (e) { }
    };

    const handleCopyLink = () => {
        const shareUrl = `https://uni-platform.app/pulse/${pulse.id}`;
        Clipboard.setString(shareUrl);
        hapticSuccess();
        Alert.alert(t('link_copied_title'), t('pulse_link_copied'));
    };

    const sendReport = async (reason: string) => {
        try {
            await submitReport({ target_type: 'pulse', target_id: pulse.id, reason });
            hapticSuccess();
            setReportReasonVisible(false);
            Alert.alert(t('report_option'), t('pulse_report_thanks'));
        } catch (e) { }
    };

    const actionOptions: ActionOption[] = [
        { label: t('share_option'), icon: 'share-outline', onPress: handleShare },
        { label: t('copy_link_option'), icon: 'link-outline', onPress: handleCopyLink },
        { label: t('report_option'), icon: 'flag-outline', onPress: () => setReportReasonVisible(true) },
    ];

    if (pulse.is_mine) {
        const canEdit = new Date().getTime() - new Date(pulse.created_at).getTime() < 30 * 60 * 1000;
        if (canEdit) {
            actionOptions.unshift({ label: t('edit_label'), icon: 'pencil-outline', onPress: () => router.push(`/pulse/edit?id=${pulse.id}&content=${encodeURIComponent(pulse.content)}`) });
        }
        actionOptions.push({ label: t('delete_label'), icon: 'trash-outline', onPress: handleDelete, destructive: true });
    }

    const reportOptions: ActionOption[] = [
        { label: t('pulse_report_bullying'), icon: 'alert-circle-outline', onPress: () => sendReport('bullying') },
        { label: t('pulse_report_hate_speech'), icon: 'warning-outline', onPress: () => sendReport('hate_speech') },
        { label: t('spam_option'), icon: 'ban-outline', onPress: () => sendReport('spam') },
    ];

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.9}
            onPress={() => {
                hapticLight();
                router.push(`/pulse/${pulse.id}`);
            }}
        >
            <View style={styles.header}>
                <View style={[styles.ghostAvatar, { backgroundColor: ghostColor }]}>
                    <Image source={{ uri: PULSE_ICON_WHITE_URI }} style={styles.ghostIcon} />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.anonLabel}>{authorLabel}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <Text style={styles.timestamp}>
                            {timeAgo(pulse.created_at, t, language)}
                        </Text>
                        {pulse.is_edited && (
                            <>
                                <Text style={[styles.timestamp, { fontSize: 10 }]}>·</Text>
                                <Text style={[styles.timestamp, { fontSize: 11 }]}>{t('edited_label')}</Text>
                            </>
                        )}
                    </View>
                </View>
                <TouchableOpacity onPress={() => { hapticLight(); setActionVisible(true); }} hitSlop={12} style={styles.menuBtn}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.gray500} />
                </TouchableOpacity>
            </View>

            <Text style={styles.content}>{pulse.content}</Text>

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
                title={t('pulse_options_title')}
            />
            <ActionModal
                visible={reportReasonVisible}
                onClose={() => setReportReasonVisible(false)}
                options={reportOptions}
                title={t('pulse_report_title')}
            />
        </TouchableOpacity>
    );
}

const createStyles = (colors: typeof lightColors, isDark: boolean) => {
    const cardBg = colors.surface;
    const softBg = colors.elevated;

    return StyleSheet.create({
        container: {
            backgroundColor: cardBg,
            marginHorizontal: 16,
            marginVertical: 6,
            padding: 18,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#0B1220',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.08,
            shadowRadius: 10,
            elevation: 3,
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
        ghostIcon: {
            width: 18,
            height: 18,
        },
        headerInfo: {
            flex: 1,
            marginLeft: 12,
        },
        anonLabel: {
            fontFamily: fonts.bold,
            fontSize: 15,
            color: colors.black,
        },
        timestamp: {
            fontFamily: fonts.regular,
            fontSize: 12,
            color: colors.gray500,
            marginTop: 1,
        },
        menuBtn: {
            padding: 6,
        },
        content: {
            fontFamily: fonts.regular,
            fontSize: 16,
            color: colors.black,
            lineHeight: 24,
            marginBottom: 4,
        },
        image: {
            width: '100%',
            height: 200,
            borderRadius: 16,
            marginTop: 12,
            backgroundColor: softBg,
        },
        footer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 16,
            paddingTop: 14,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
        },
        commentBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: softBg,
            borderRadius: 20,
        },
        commentCount: {
            fontFamily: fonts.semibold,
            fontSize: 14,
            color: colors.gray600,
        },
    });
};
