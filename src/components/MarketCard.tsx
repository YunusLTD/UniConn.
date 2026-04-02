import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Share, Clipboard, Alert } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { deleteMarketplaceListing } from '../api/marketplace';
import { submitReport } from '../api/reports';
import ActionModal, { ActionOption } from './ActionModal';

interface MarketCardProps {
    item: any;
}

export default function MarketCard({ item, onDelete }: { item: any, onDelete?: (id: string) => void }) {
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
        Alert.alert('Link Copied', 'The listing link has been copied to your clipboard.');
    };

    const handleMenu = () => {
        setActionVisible(true);
    };

    const handleReport = () => {
        setReportReasonVisible(true);
    };

    const sendReport = async (reason: string) => {
        try {
            await submitReport({ target_type: 'marketplace', target_id: item.id, reason });
            setReportReasonVisible(false);
            
            Alert.alert(
                'Reported',
                'Thank you. We will review this item.',
                [
                    {
                        text: 'Hide Item',
                        style: 'destructive',
                        onPress: () => {
                            if (onDelete) onDelete(item.id);
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
        { label: 'Scam', icon: 'ban-outline', onPress: () => sendReport('scam') },
        { label: 'Other', icon: 'help-circle-outline', onPress: () => sendReport('other') },
    ];

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: `/marketplace/${item.id}`, params: { title: item.title } })}
        >
            <View style={styles.header}>
                <View style={styles.tag}>
                    <Text style={styles.tagText}>MARKETPLACE</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={styles.price}>${item.price?.toLocaleString() || '0'}</Text>
                    <TouchableOpacity onPress={handleMenu} hitSlop={8}>
                        <Ionicons name="ellipsis-horizontal" size={18} color={colors.gray400} />
                    </TouchableOpacity>
                </View>
            </View>

            {item.image_url && (
                <View style={styles.imgContainer}>
                    <Image source={{ uri: item.image_url }} style={styles.img} />
                </View>
            )}

            <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                {item.description && (
                    <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                )}

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.seller}
                        onPress={(e) => {
                            e.stopPropagation();
                            if (item.seller_id) router.push(`/user/${item.seller_id}`);
                        }}
                        hitSlop={8}
                    >
                        <MaterialCommunityIcons name="account-circle-outline" size={14} color={colors.gray400} />
                        <Text style={styles.sellerName}>{item.profiles?.name || 'Student'}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionBtn}>
                        <Text style={styles.actionText}>View Item</Text>
                    </View>
                </View>
            </View>

            <ActionModal
                visible={actionVisible}
                onClose={() => setActionVisible(false)}
                options={actionOptions}
                title="Marketplace Listing"
            />

            <ActionModal
                visible={reportReasonVisible}
                onClose={() => setReportReasonVisible(false)}
                options={reportOptions}
                title="Why are you reporting?"
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        marginHorizontal: spacing.lg,
        marginVertical: spacing.sm,
        borderRadius: radii.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.gray100,
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
        borderBottomColor: colors.gray50,
    },
    tag: {
        backgroundColor: colors.gray50,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tagText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: colors.gray400,
        letterSpacing: 0.5,
    },
    price: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.black,
    },
    imgContainer: {
        width: '100%',
        height: 200,
        backgroundColor: colors.gray50,
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
        color: colors.black,
        marginBottom: 6,
    },
    desc: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray500,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 0.5,
        borderTopColor: colors.gray50,
    },
    seller: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sellerName: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.gray400,
    },
    actionBtn: {
        backgroundColor: colors.black,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radii.full,
    },
    actionText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: colors.white,
    },
});
