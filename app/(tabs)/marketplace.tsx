import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, RefreshControl, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getFeed } from '../../src/api/feed';
import { listCommunities, getMyCommunities } from '../../src/api/communities';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ShadowLoader from '../../src/components/ShadowLoader';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - spacing.lg * 2 - 12) / 2;

const CATEGORIES = [
    { id: 'all', label: 'All', icon: 'apps-outline' as const },
    { id: 'books', label: 'Books', icon: 'book-outline' as const },
    { id: 'clothes', label: 'Clothes', icon: 'shirt-outline' as const },
    { id: 'accessories', label: 'Accessories', icon: 'watch-outline' as const },
    { id: 'free', label: 'Free', icon: 'gift-outline' as const },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const },
];

export default function MarketplaceScreen() {
    const [items, setItems] = useState<any[]>([]);
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
    const [filterVisible, setFilterVisible] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const loadData = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const feedRes = await getFeed(1, 50, selectedCommunity || undefined, 'market', activeCategory);
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
        }, [activeCategory, selectedCommunity])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData(true);
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <FlatList
                horizontal
                data={CATEGORIES}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.categoryChip, activeCategory === item.id && styles.categoryChipActive]}
                        onPress={() => setActiveCategory(item.id)}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name={item.icon} 
                            size={16} 
                            color={activeCategory === item.id ? colors.white : colors.gray600} 
                        />
                        <Text style={[styles.categoryLabel, activeCategory === item.id && styles.categoryLabelActive]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                )}
            />
            
            <View style={styles.filterRow}>
                <Text style={styles.resultsText}>
                    {items.length} {activeCategory === 'all' ? 'Items' : activeCategory + ' listings'}
                </Text>
                <TouchableOpacity 
                    style={styles.filterBtn}
                    onPress={() => setFilterVisible(true)}
                >
                    <Ionicons name="options-outline" size={16} color={colors.black} />
                    <Text style={styles.filterBtnText}>
                        {selectedCommunity ? communities.find(c => c.id === selectedCommunity)?.name : 'All Communities'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={styles.itemCard}
            onPress={() => router.push(`/marketplace/${item.id}`)}
            activeOpacity={0.9}
        >
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => setPreviewImage(item.image_url)}
                style={styles.imageWrapper}
            >
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="image-outline" size={32} color={colors.gray300} />
                    </View>
                )}
                {item.price === 0 && (
                    <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>FREE</Text>
                    </View>
                )}
            </TouchableOpacity>
            
            <View style={styles.itemInfo}>
                <Text style={styles.itemPrice}>
                    {item.price === 0 ? 'Free' : `$${item.price.toLocaleString()}`}
                </Text>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title || 'Untitled Item'}</Text>
                <View style={styles.locationRow}>
                    <Ionicons name="time-outline" size={10} color={colors.gray400} />
                    <Text style={styles.itemLocation} numberOfLines={1}>
                        {(() => {
                            const d = new Date(item.created_at);
                            const now = new Date();
                            const diff = now.getTime() - d.getTime();
                            const mins = Math.floor(diff / 60000);
                            if (mins < 1) return 'now';
                            if (mins < 60) return `${mins}m ago`;
                            const hrs = Math.floor(mins / 60);
                            if (hrs < 24) return `${hrs}h ago`;
                            return `${Math.floor(hrs / 24)}d ago`;
                        })()}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
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
                            <Text style={styles.emptyTitle}>Nothing here yet</Text>
                            <Text style={styles.emptySub}>Be the first to list something in this category!</Text>
                        </View>
                    }
                />
            )}

            {/* Filter Modal */}
            <Modal visible={filterVisible} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter by Community</Text>
                            <TouchableOpacity onPress={() => setFilterVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.black} />
                            </TouchableOpacity>
                        </View>
                        
                        <FlatList
                            data={[{ id: null, name: 'All Communities' }, ...communities]}
                            keyExtractor={item => item.id || 'all'}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={[styles.filterOption, selectedCommunity === item.id && styles.filterOptionSelected]}
                                    onPress={() => {
                                        setSelectedCommunity(item.id);
                                        setFilterVisible(false);
                                    }}
                                >
                                    <Text style={[styles.filterOptionText, selectedCommunity === item.id && styles.filterOptionTextSelected]}>
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
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { paddingBottom: spacing.xl },
    headerContainer: { backgroundColor: colors.white, paddingBottom: spacing.sm },
    categoryList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 10 },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: radii.full,
        backgroundColor: colors.gray50,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    categoryChipActive: { backgroundColor: colors.black, borderColor: colors.black },
    categoryLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray600 },
    categoryLabelActive: { color: colors.white },
    
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xs,
    },
    resultsText: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray500 },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: radii.sm,
        backgroundColor: colors.gray50,
    },
    filterBtnText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.black },

    gridRow: { paddingHorizontal: spacing.lg, justifyContent: 'space-between', marginTop: spacing.md },
    itemCard: {
        width: COLUMN_WIDTH,
        backgroundColor: colors.white,
        borderRadius: radii.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    imageWrapper: { width: '100%', height: COLUMN_WIDTH, backgroundColor: colors.gray50 },
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
    freeBadgeText: { color: colors.white, fontFamily: fonts.bold, fontSize: 10 },
    
    itemInfo: { padding: 12 },
    itemPrice: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
    itemTitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray700, marginTop: 2 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    itemLocation: { fontFamily: fonts.medium, fontSize: 11, color: colors.gray400 },
    
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.black, marginTop: 16 },
    emptySub: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, textAlign: 'center', marginTop: 8 },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
    filterOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray50,
    },
    filterOptionSelected: { backgroundColor: 'rgba(59, 130, 246, 0.05)' },
    filterOptionText: { fontFamily: fonts.regular, fontSize: 16, color: colors.gray700 },
    filterOptionTextSelected: { fontFamily: fonts.semibold, color: colors.primary },

    previewBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    closePreview: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
    fullImage: { width: '100%', height: '80%' },
    absoluteLoader: {
        position: 'absolute',
        top: 140,
        left: 0,
        right: 0,
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
});
