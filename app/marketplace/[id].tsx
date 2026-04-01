import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, Share, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getPost } from '../../src/api/posts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MarketplaceDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const res = await getPost(id as string);
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
            await Share.share({
                message: `Check out this ${item.title} on Marketplace for $${item.price}!`,
                url: `https://uniconn.app/market/${item.id}`,
            });
        } catch (e) {}
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="small" color={colors.black} />
            </View>
        );
    }

    if (!item) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>Item not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const initials = item.profiles?.name
        ? item.profiles.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : '?';

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <Stack.Screen 
                options={{ 
                    title: item.title,
                    headerTitleStyle: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
                    headerBackTitle: '',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
                            <Ionicons name="chevron-back" size={24} color={colors.black} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <TouchableOpacity onPress={handleShare} style={styles.headerIconBtn}>
                            <Ionicons name="share-outline" size={22} color={colors.black} />
                        </TouchableOpacity>
                    ),
                }} 
            />

            <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity 
                    activeOpacity={0.95} 
                    onPress={() => setPreviewImage(item.image_url)}
                >
                    {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.mainImage} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name="image-outline" size={64} color={colors.gray200} />
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        <Text style={styles.price}>
                            {item.price === 0 ? 'FREE' : `$${item.price.toLocaleString()}`}
                        </Text>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{item.category || 'Other'}</Text>
                        </View>
                    </View>

                    <Text style={styles.title}>{item.title}</Text>
                    
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={14} color={colors.gray500} />
                            <Text style={styles.metaText}>
                                {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.description}>{item.description || 'No description provided.'}</Text>
                    </View>

                    <View style={styles.sellerSection}>
                        <Text style={styles.sectionTitle}>Seller Information</Text>
                        <TouchableOpacity 
                            style={styles.sellerCard}
                            onPress={() => router.push(`/user/${item.seller_id}`)}
                        >
                            <View style={styles.avatar}>
                                {item.profiles?.avatar_url ? (
                                    <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatarImg} />
                                ) : (
                                    <View style={styles.avatarInitials}>
                                        <Text style={styles.initialsText}>{initials}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.sellerInfo}>
                                <Text style={styles.sellerName}>{item.profiles?.name || 'Unknown Seller'}</Text>
                                <Text style={styles.sellerSub}>Active on Campus</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity 
                    style={styles.chatBtn}
                    onPress={() => router.push(`/chat/${item.seller_id}`)}
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.chatBtnText}>Message Seller</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={!!previewImage} transparent animationType="fade">
                <View style={styles.previewBg}>
                    <TouchableOpacity onPress={() => setPreviewImage(null)} style={styles.closePreview}>
                        <Ionicons name="close" size={32} color={colors.white} />
                    </TouchableOpacity>
                    <Image source={{ uri: previewImage || '' }} style={styles.fullImage} resizeMode="contain" />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    centered: { justifyContent: 'center', alignItems: 'center' },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gray50,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    mainImage: { width: SCREEN_WIDTH, height: (SCREEN_WIDTH * 4) / 5, backgroundColor: colors.gray50 },
    imagePlaceholder: { width: SCREEN_WIDTH, height: (SCREEN_WIDTH * 4) / 5, backgroundColor: colors.gray50, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    price: { fontSize: 24, fontFamily: fonts.bold, color: colors.black },
    categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.gray100, borderRadius: 12 },
    categoryText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.gray600, textTransform: 'capitalize' },
    title: { fontSize: 22, fontFamily: fonts.bold, color: colors.black, marginBottom: 12 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    metaItem: { flexDirection: 'row', alignItems: 'center' },
    metaText: { fontSize: 13, fontFamily: fonts.medium, color: colors.gray500, marginLeft: 4 },
    metaDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.gray300, marginHorizontal: 12 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.black, marginBottom: 8 },
    description: { fontSize: 15, fontFamily: fonts.regular, color: colors.gray600, lineHeight: 22 },
    sellerSection: { marginBottom: 100 },
    sellerCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 12, 
        backgroundColor: colors.gray50, 
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    avatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.gray200 },
    avatarImg: { width: '100%', height: '100%' },
    avatarInitials: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    initialsText: { fontSize: 16, fontFamily: fonts.bold, color: colors.gray500 },
    sellerInfo: { flex: 1, marginLeft: 12 },
    sellerName: { fontSize: 16, fontFamily: fonts.semibold, color: colors.black },
    sellerSub: { fontSize: 12, fontFamily: fonts.regular, color: colors.gray500, marginTop: 2 },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderTopWidth: 1,
        borderTopColor: colors.gray100,
    },
    chatBtn: {
        height: 56,
        backgroundColor: colors.black,
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
    chatBtnText: { color: colors.white, fontSize: 16, fontFamily: fonts.bold },
    errorText: { fontSize: 16, fontFamily: fonts.medium, color: colors.gray400, marginBottom: 16 },
    backBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.black, borderRadius: 20 },
    backBtnText: { color: colors.white, fontSize: 14, fontFamily: fonts.bold },
    previewBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    closePreview: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
    fullImage: { width: '100%', height: '80%' },
});
