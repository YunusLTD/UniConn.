import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, Share, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getMarketplaceListing } from '../../src/api/marketplace';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../src/context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MarketplaceDetailScreen() {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isMediaLoading, setIsMediaLoading] = useState(false);

    const formatRelativeLocalized = (dateStr?: string) => {
        if (!dateStr) return '';
        const now = new Date();
        const d = new Date(dateStr);
        const diffMs = now.getTime() - d.getTime();
        if (!Number.isFinite(diffMs) || diffMs < 0) return t('just_now');

        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        if (diffMins < 1) return t('just_now');
        if (diffMins < 60) return t('minute_ago').replace('{{count}}', String(diffMins));
        if (diffHrs < 24) return t('hour_ago').replace('{{count}}', String(diffHrs));
        if (diffDays === 1) return t('yesterday');
        return t('day_ago').replace('{{count}}', String(diffDays));
    };

    const loadData = useCallback(async () => {
        try {
            const res = await getMarketplaceListing(id as string);
            if (res?.data) setItem(res.data);
        } catch (e) {
            console.error('Error loading item:', e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleShare = async () => {
        if (!item) return;
        try {
            const formattedPrice = item.price === 0 ? t('free_badge') : `$${item.price?.toLocaleString() || 0}`;
            await Share.share({
                message: t('market_share_text')
                    .replace('{{title}}', item.title || '')
                    .replace('{{price}}', formattedPrice),
                url: `https://uniconn.app/market/${item.id}`,
            });
        } catch (e) {}
    };

    const initials = item?.profiles?.name
        ? item.profiles.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : '?';

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
            <Stack.Screen 
                options={{ 
                    title: item?.title || t('marketplace'),
                    headerTitleStyle: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
                    headerBackTitle: '',
                    headerStyle: { backgroundColor: colors.surface },
                    headerTintColor: colors.black,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={[styles.headerIconBtn, { backgroundColor: colors.background }]}>
                            <Ionicons name="chevron-back" size={24} color={colors.black} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <TouchableOpacity onPress={handleShare} style={[styles.headerIconBtn, { backgroundColor: colors.background }]}>
                            <Ionicons name="share-outline" size={22} color={colors.black} />
                        </TouchableOpacity>
                    ),
                }} 
            />

            {loading ? (
                <View style={[styles.container, styles.centered]}>
                    <ActivityIndicator size="small" color={colors.black} />
                </View>
            ) : !item ? (
                <View style={[styles.container, styles.centered]}>
                    <Text style={styles.errorText}>{t('market_item_not_found')}</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.backBtnText}>{t('go_back')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity 
                    activeOpacity={0.95} 
                    onPress={() => setPreviewImage(item.image_url)}
                >
                    {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={[styles.mainImage, { backgroundColor: colors.background }]} />
                    ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: colors.background }]}>
                            <Ionicons name={item.listing_type === 'request' ? 'search-outline' : 'image-outline'} size={64} color={colors.gray200} />
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        {item.listing_type === 'request' ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full, gap: 6 }}>
                                <Ionicons name="search" size={16} color={colors.primary} />
                                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.primary }}>
                                    {item.profiles?.name ? `${item.profiles.name.split(' ')[0]} ${t('looking_for')}` : t('user_looking_for')}
                                </Text>
                            </View>
                        ) : (
                            <Text style={[styles.price, { color: colors.black }]}>
                                {item.price === 0 ? t('free_badge') : `$${item.price?.toLocaleString() || 0}`}
                            </Text>
                        )}
                        <View style={[styles.categoryBadge, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.categoryText, { color: colors.gray600 }]}>{item.category || t('other')}</Text>
                        </View>
                    </View>

                    <Text style={[styles.title, { color: colors.black }]}>{item.title}</Text>
                    
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={14} color={colors.gray400} />
                            <Text style={[styles.metaText, { color: colors.gray500 }]}>
                                <Text style={{ color: colors.gray400 }}>{t('listed')} </Text>
                                {formatRelativeLocalized(item.created_at)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.black }]}>{t('description')}</Text>
                        <Text style={[styles.description, { color: colors.gray600 }]}>{item.description || t('no_description_provided')}</Text>
                    </View>

                    <View style={styles.sellerSection}>
                        <Text style={[styles.sectionTitle, { color: colors.black }]}>{item.listing_type === 'request' ? t('requested_by') : t('seller_information')}</Text>
                        <TouchableOpacity 
                            style={[styles.sellerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => router.push(`/user/${item.seller_id}`)}
                        >
                            <View style={[styles.avatar, { backgroundColor: colors.background }]}>
                                {item.profiles?.avatar_url ? (
                                    <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatarImg} />
                                ) : (
                                    <View style={styles.avatarInitials}>
                                        <Text style={[styles.initialsText, { color: colors.gray500 }]}>{initials}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.sellerInfo}>
                                <Text style={[styles.sellerName, { color: colors.black }]}>{item.profiles?.name || t('unknown_user')}</Text>
                                <Text style={[styles.sellerSub, { color: colors.gray500 }]}>{t('active_on_campus')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
                        </TouchableOpacity>
                    </View>
                </View>
                </ScrollView>
            )}

            {item && (
                <View style={[styles.footer, { backgroundColor: isDark ? colors.surface : 'rgba(255,255,255,0.95)', borderTopColor: colors.border }]}>
                    <TouchableOpacity 
                        style={[styles.chatBtn, { backgroundColor: isDark ? colors.blue : colors.primary }]}
                        onPress={() => router.push(`/chat/${item.seller_id}`)}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
                        <Text style={[styles.chatBtnText, { color: colors.white }]}>{item.listing_type === 'request' ? t('send_message') : t('message_seller')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Modal visible={!!previewImage} transparent animationType="fade">
                <View style={styles.previewBg}>
                    <TouchableOpacity 
                        onPress={() => {
                            setPreviewImage(null);
                            setIsMediaLoading(false);
                        }} 
                        style={styles.closePreview}
                    >
                        <Ionicons name="close" size={32} color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    {isMediaLoading && (
                        <View style={StyleSheet.absoluteFill}>
                            <ActivityIndicator size="large" color="#FFFFFF" style={{ flex: 1 }} />
                        </View>
                    )}

                    <Image 
                        source={{ uri: previewImage || '' }} 
                        style={styles.fullImage} 
                        resizeMode="contain" 
                        onLoadStart={() => setIsMediaLoading(true)}
                        onLoadEnd={() => setIsMediaLoading(false)}
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { justifyContent: 'center', alignItems: 'center' },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    mainImage: { width: SCREEN_WIDTH, height: (SCREEN_WIDTH * 4) / 5 },
    imagePlaceholder: { width: SCREEN_WIDTH, height: (SCREEN_WIDTH * 4) / 5, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    price: { fontSize: 24, fontFamily: fonts.bold },
    categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    categoryText: { fontSize: 12, fontFamily: fonts.semibold, textTransform: 'capitalize' },
    title: { fontSize: 22, fontFamily: fonts.bold, marginBottom: 12 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    metaItem: { flexDirection: 'row', alignItems: 'center' },
    metaText: { fontSize: 13, fontFamily: fonts.medium, marginLeft: 4 },
    metaDivider: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 12 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontFamily: fonts.bold, marginBottom: 8 },
    description: { fontSize: 15, fontFamily: fonts.regular, lineHeight: 22 },
    sellerSection: { marginBottom: 100 },
    sellerCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 12, 
        borderRadius: 16,
        borderWidth: 1,
    },
    avatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%' },
    avatarInitials: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    initialsText: { fontSize: 16, fontFamily: fonts.bold },
    sellerInfo: { flex: 1, marginLeft: 12 },
    sellerName: { fontSize: 16, fontFamily: fonts.semibold },
    sellerSub: { fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        borderTopWidth: 1,
    },
    chatBtn: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    chatBtnText: { fontSize: 16, fontFamily: fonts.bold },
    errorText: { fontSize: 16, fontFamily: fonts.medium, marginBottom: 16 },
    backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    backBtnText: { fontSize: 14, fontFamily: fonts.bold },
    previewBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    closePreview: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
    fullImage: { width: '100%', height: '80%' },
});
