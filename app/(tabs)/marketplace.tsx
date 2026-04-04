import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, RefreshControl, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { formatRelativeTime } from '../../src/utils/date';
import { getFeed } from '../../src/api/feed';
import { listCommunities, getMyCommunities } from '../../src/api/communities';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ShadowLoader from '../../src/components/ShadowLoader';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../src/context/LanguageContext';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - spacing.lg * 2 - 12) / 2;

export default function MarketplaceScreen() {
    const { colors } = useTheme();
    const [items, setItems] = useState<any[]>([]);
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeType, setActiveType] = useState<'all' | 'sell' | 'request'>('all');
    const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
    const [filterVisible, setFilterVisible] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();

    const CATEGORIES = [
        { id: 'all', label: t('all_subjects'), icon: 'apps-outline' as const },
        { id: 'books', label: 'Books', icon: 'book-outline' as const },
        { id: 'clothes', label: 'Clothes', icon: 'shirt-outline' as const },
        { id: 'accessories', label: 'Accessories', icon: 'watch-outline' as const },
        { id: 'free', label: t('free_badge'), icon: 'gift-outline' as const },
        { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const },
    ];

    const loadData = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const feedRes = await getFeed(
                1, 50, 
                selectedCommunity || undefined, 
                'market', 
                activeCategory, 
                activeType === 'all' ? undefined : activeType
            );
            if (feedRes?.data) setItems(feedRes.data);
            
            // Load communities for filter if not loaded
            if (communities.length === 0) {
                const commRes = await getMyCommunities();
                if (commRes?.data) setCommunities(commRes.data);
            }
        } catch (e) {
            console.log('Fetch error', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [activeCategory, selectedCommunity, activeType])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData(true);
    };

    const renderHeader = () => (
        <View style={[styles.headerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeType === 'all' && { borderBottomColor: colors.black }]}
                    onPress={() => setActiveType('all')}
                >
                    <Text style={[styles.tabText, { color: colors.gray500 }, activeType === 'all' && { color: colors.black }]}>{t('all_listings')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeType === 'sell' && { borderBottomColor: colors.black }]}
                    onPress={() => setActiveType('sell')}
                >
                    <Text style={[styles.tabText, { color: colors.gray500 }, activeType === 'sell' && { color: colors.black }]}>{t('for_sale')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeType === 'request' && { borderBottomColor: colors.black }]}
                    onPress={() => setActiveType('request')}
                >
                    <Text style={[styles.tabText, { color: colors.gray500 }, activeType === 'request' && { color: colors.black }]}>{t('requests_tab')}</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.borderLine, { backgroundColor: colors.gray100 }]} />

            <FlatList
                horizontal
                data={CATEGORIES}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.categoryChip, { backgroundColor: colors.gray50, borderColor: colors.gray100 }, activeCategory === item.id && { backgroundColor: colors.black, borderColor: colors.black }]}
                        onPress={() => setActiveCategory(item.id)}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name={item.icon} 
                            size={16} 
                            color={activeCategory === item.id ? colors.white : colors.gray600} 
                        />
                        <Text style={[styles.categoryLabel, { color: colors.gray600 }, activeCategory === item.id && { color: colors.white }]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            <View style={styles.filterRow}>
                <Text style={[styles.resultsText, { color: colors.gray500 }]}>
                    {items.length} {activeType === 'request' ? t('requests_tab') : t('items_count')}
                </Text>
                <TouchableOpacity 
                    style={[styles.filterBtn, { backgroundColor: colors.gray50 }]}
                    onPress={() => setFilterVisible(true)}
                >
                    <Ionicons name="options-outline" size={16} color={colors.black} />
                    <Text style={[styles.filterBtnText, { color: colors.black }]}>
                        {selectedCommunity ? communities.find(c => c.id === selectedCommunity)?.name : t('all_communities')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}
            onPress={() => router.push({ pathname: `/marketplace/${item.id}`, params: { title: item.title } })}
            activeOpacity={0.9}
        >
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => setPreviewImage(item.image_url)}
                style={[styles.imageWrapper, { backgroundColor: colors.gray50 }]}
            >
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name={item.listing_type === 'request' ? 'search-outline' : 'image-outline'} size={32} color={colors.gray300} />
                    </View>
                )}
                {item.listing_type === 'request' ? (
                    <View style={[styles.freeBadge, { backgroundColor: colors.blue }]}>
                        <Text style={styles.freeBadgeText}>{t('request_badge')}</Text>
                    </View>
                ) : item.price === 0 ? (
                    <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>{t('free_badge')}</Text>
                    </View>
                ) : (new Date().getTime() - new Date(item.created_at).getTime()) < 86400000 ? (
                    <View style={[styles.freeBadge, { backgroundColor: colors.black }]}>
                        <Text style={[styles.freeBadgeText, { color: colors.white }]}>{t('new_badge')}</Text>
                    </View>
                ) : null}
            </TouchableOpacity>
            
            <View style={styles.itemInfo}>
                {item.listing_type === 'request' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <Ionicons name="search" size={12} color={colors.blue} />
                        <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.blue }} numberOfLines={1}>
                            {item.profiles?.name ? `${item.profiles.name.split(' ')[0]} ${t('looking_for')}` : `User ${t('looking_for')}`}
                        </Text>
                    </View>
                ) : (
                    <Text style={[styles.itemPrice, { color: colors.black }]}>
                        {item.price === 0 ? t('free_badge') : `$${item.price?.toLocaleString() || 0}`}
                    </Text>
                )}
                <Text style={[styles.itemTitle, { color: colors.gray700 }]} numberOfLines={1}>{item.title || t('untitled_item')}</Text>
                <View style={styles.locationRow}>
                    <Text style={[styles.itemLocation, { color: colors.gray400 }]} numberOfLines={1}>
                        <Ionicons name="time-outline" size={10} color={colors.gray400} />
                        {'  '}
                        {formatRelativeTime(item.created_at)}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Marketplace', headerBackTitle: '' }} />
            
            {loading ? (
                <View style={{ flex: 1 }}>
                    {renderHeader()}
                    <ShadowLoader type="marketplace" />
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    numColumns={2}
                    columnWrapperStyle={styles.gridRow}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.black} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="shopping-outline" size={64} color={colors.gray200} />
                            <Text style={styles.emptyTitle}>
                                {activeType === 'request' ? t('no_requests_yet') : (activeType === 'sell' ? t('no_items_for_sale') : t('nothing_here_yet'))}
                            </Text>
                            <Text style={styles.emptySub}>
                                {activeType === 'request' ? t('be_the_first_to_request') : (activeType === 'sell' ? t('be_the_first_to_list') : t('be_the_first_to_both'))}
                            </Text>
                            <TouchableOpacity 
                                style={styles.emptyCreateBtn}
                                onPress={() => router.push({
                                    pathname: '/marketplace/create',
                                    params: { defaultType: activeType === 'request' ? 'request' : 'sell' }
                                })}
                            >
                                <Ionicons name="add" size={18} color={colors.white} />
                                <Text style={styles.emptyCreateBtnText}>
                                    {activeType === 'request' ? t('request_an_item') : (activeType === 'sell' ? t('sell_an_item') : t('create_a_listing'))}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Filter Modal */}
            <Modal visible={filterVisible} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, backgroundColor: colors.surface }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.gray100 }]}>
                            <Text style={[styles.modalTitle, { color: colors.black }]}>{t('filter_by_community')}</Text>
                            <TouchableOpacity onPress={() => setFilterVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.black} />
                            </TouchableOpacity>
                        </View>
                        
                        <FlatList
                            data={[{ id: null, name: t('all_communities') }, ...communities]}
                            keyExtractor={item => item.id || 'all'}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={[styles.filterOption, { borderBottomColor: colors.gray50 }, selectedCommunity === item.id && styles.filterOptionSelected]}
                                    onPress={() => {
                                        setSelectedCommunity(item.id);
                                        setFilterVisible(false);
                                    }}
                                >
                                    <Text style={[styles.filterOptionText, { color: colors.gray700 }, selectedCommunity === item.id && { fontFamily: fonts.semibold, color: colors.primary }]}>
                                        {item.name}
                                    </Text>
                                    {selectedCommunity === item.id && (
                                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Image Preview */}
            <Modal visible={!!previewImage} transparent animationType="fade">
                <View style={styles.previewBg}>
                    <TouchableOpacity 
                        style={styles.closePreview} 
                        onPress={() => setPreviewImage(null)}
                    >
                        <Ionicons name="close" size={32} color={colors.white} />
                    </TouchableOpacity>
                    <Image 
                        source={{ uri: previewImage || '' }} 
                        style={styles.fullImage} 
                        resizeMode="contain" 
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { paddingBottom: spacing.xl },
    headerContainer: { paddingBottom: spacing.sm },
    categoryList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 10 },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: radii.full,
        borderWidth: 1,
    },
    categoryLabel: { fontFamily: fonts.medium, fontSize: 13 },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: spacing.lg,
        marginTop: spacing.sm,
    },
    tab: {
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontFamily: fonts.semibold,
        fontSize: 14,
    },
    borderLine: {
        height: 1,
        width: '100%',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xs,
    },
    resultsText: { fontFamily: fonts.medium, fontSize: 13 },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: radii.sm,
    },
    filterBtnText: { fontFamily: fonts.semibold, fontSize: 12 },

    gridRow: { paddingHorizontal: spacing.lg, justifyContent: 'space-between', marginTop: spacing.md },
    itemCard: {
        width: COLUMN_WIDTH,
        borderRadius: radii.lg,
        overflow: 'hidden',
        borderWidth: 1,
    },
    imageWrapper: { width: '100%', height: COLUMN_WIDTH },
    itemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    freeBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    freeBadgeText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 10 },
    
    itemInfo: { padding: 12 },
    itemPrice: { fontFamily: fonts.bold, fontSize: 16 },
    itemTitle: { fontFamily: fonts.regular, fontSize: 14, marginTop: 2 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    itemLocation: { fontFamily: fonts.medium, fontSize: 11 },
    
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40 },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 18, marginTop: 16 },
    emptySub: { fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 20 },
    emptyCreateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: radii.md,
        gap: 6
    },
    emptyCreateBtnText: {
        fontFamily: fonts.semibold,
        fontSize: 14,
    },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
    },
    modalTitle: { fontFamily: fonts.bold, fontSize: 18 },
    filterOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 0.5,
    },
    filterOptionSelected: { backgroundColor: 'rgba(59, 130, 246, 0.05)' },
    filterOptionText: { fontFamily: fonts.regular, fontSize: 16 },

    previewBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    closePreview: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
    fullImage: { width: '100%', height: '80%' },
});
