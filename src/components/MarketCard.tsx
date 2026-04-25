import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Share, Clipboard, Alert } from 'react-native';
import { spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { deleteMarketplaceListing } from '../api/marketplace';
import { submitReport } from '../api/reports';
import ActionModal, { ActionOption } from './ActionModal';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { ICONS } from '../constants/icons';

interface MarketCardProps {
    item: any;
}

export default function MarketCard({ item, onDelete }: { item: any, onDelete?: (id: string) => void }) {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const router = useRouter();
    const { user } = useAuth();
    const [actionVisible, setActionVisible] = useState(false);
    const [reportReasonVisible, setReportReasonVisible] = useState(false);
    const isOwner = user?.id === item.user_id || user?.id === item.seller_id;

    const handleDelete = () => {
        Alert.alert('Delete Item', 'Remove this listing permanently?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteMarketplaceListing(item.id);
                        if (onDelete) onDelete(item.id);
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete listing.');
                    }
                }
            }
        ]);
    };

    const handleShare = async () => {
        try {
            const shareUrl = `https://uni-platform.app/marketplace/${item.id}`;
            await Share.share({
                title: item.title,
                message: `Check out this listing on Uni Marketplace: ${item.title} - ${shareUrl}`,
            });
        } catch (e) {
            console.error('Share error', e);
        }
    };

    const handleCopyLink = () => {
        const shareUrl = `https://uni-platform.app/marketplace/${item.id}`;
        Clipboard.setString(shareUrl);
        Alert.alert(t('link_copied_title'), t('listing_link_copied'));
    };

    const handleMenu = () => {
        hapticLight();
        setActionVisible(true);
    };

    const handleReport = () => {
        setReportReasonVisible(true);
    };

    const sendReport = async (reason: string) => {
        try {
            await submitReport({ target_type: 'marketplace_item', target_id: item.id, reason });
            hapticSuccess();
            setReportReasonVisible(false);
            if (onDelete) onDelete(item.id);
            Alert.alert('Reported', 'Thank you. We will review this item.');
        } catch (e) {
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
        { label: t('scam_option'), icon: 'ban-outline', onPress: () => sendReport('scam') },
        { label: t('other'), icon: 'help-circle-outline', onPress: () => sendReport('other') },
    ];

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.9}
            onPress={() => {
                hapticLight();
                router.push({ pathname: `/marketplace/${item.id}`, params: { title: item.title } });
            }}
        >
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={[styles.tag, { backgroundColor: colors.background }, item.listing_type === 'request' && { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <Text style={[styles.tagText, { color: colors.gray500 }, item.listing_type === 'request' && { color: colors.blue }]}>
                        {item.listing_type === 'request' ? t('request_badge') : t('marketplace').toUpperCase()}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {item.listing_type === 'request' ? (
                        <Text style={[styles.price, { color: colors.blue }]}>
                            {item.price ? `${t('willing_to_pay')}: $${item.price}` : t('looking_for_label')}
                        </Text>
                    ) : (
                        <Text style={[styles.price, { color: colors.black }, (!item.price || item.price === 0) && { color: '#10B981', fontFamily: fonts.bold }]}>
                            {(!item.price || item.price === 0) ? t('free_badge') : `$${item.price.toLocaleString()}`}
                        </Text>
                    )}
                    <TouchableOpacity onPress={handleMenu} hitSlop={8}>
                        <Ionicons name="ellipsis-horizontal" size={18} color={colors.gray400} />
                    </TouchableOpacity>
                </View>
            </View>

            {item.image_url && (
                <View style={[styles.imgContainer, { backgroundColor: colors.background }]}>
                    <Image source={{ uri: item.image_url }} style={styles.img} />
                </View>
            )}

            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.black }]}>{item.title}</Text>
                {item.description && (
                    <Text style={[styles.desc, { color: colors.gray500 }]} numberOfLines={2}>{item.description}</Text>
                )}

                <View style={[styles.footer, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        style={styles.seller}
                        onPress={(e) => {
                            e.stopPropagation();
                            if (item.seller_id) router.push(`/user/${item.seller_id}`);
                        }}
                        hitSlop={8}
                    >
                        <MaterialCommunityIcons name="account-circle-outline" size={14} color={colors.gray400} />
                        <Text style={[styles.sellerName, { color: colors.gray400 }]}>{item.profiles?.name || t('user_fallback')}</Text>
                    </TouchableOpacity>
                    <View style={[styles.actionBtn, { backgroundColor: colors.black }, item.listing_type === 'request' && { backgroundColor: colors.blue }]}>
                        <Text style={[styles.actionText, { color: colors.white }]}>{t('view_item')}</Text>
                    </View>
                </View>
            </View>

            <ActionModal
                visible={actionVisible}
                onClose={() => setActionVisible(false)}
                options={actionOptions}
                title={t('marketplace_listing_title')}
            />

            <ActionModal
                visible={reportReasonVisible}
                onClose={() => setReportReasonVisible(false)}
                options={reportOptions}
                title={t('why_reporting_title')}
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: spacing.lg,
        marginVertical: spacing.sm,
        borderRadius: radii.xl,
        overflow: 'hidden',
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tagText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        letterSpacing: 0.5,
    },
    price: {
        fontFamily: fonts.bold,
        fontSize: 16,
    },
    imgContainer: {
        width: '100%',
        height: 200,
    },
    img: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    content: {
        padding: 16,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 18,
        marginBottom: 6,
    },
    desc: {
        fontFamily: fonts.regular,
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 0.5,
    },
    seller: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sellerName: {
        fontFamily: fonts.medium,
        fontSize: 12,
    },
    actionBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radii.full,
    },
    actionText: {
        fontFamily: fonts.bold,
        fontSize: 12,
    },
});
