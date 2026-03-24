import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getMarketplaceListing } from '../../src/api/marketplace';
import { Ionicons } from '@expo/vector-icons';

export default function ListingDetailScreen() {
    const { id } = useLocalSearchParams();
    const [listing, setListing] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try { const res = await getMarketplaceListing(id as string); if (res?.data) setListing(res.data); }
            catch (e) { console.log('Error', e); }
            finally { setLoading(false); }
        })();
    }, [id]);

    if (loading) return <View style={styles.centered}><ActivityIndicator size="small" color={colors.black} /></View>;
    if (!listing) return <View style={styles.centered}><Text style={styles.errorText}>Listing not found</Text></View>;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {listing.image_url ? (
                <Image source={{ uri: listing.image_url }} style={styles.mainImage} />
            ) : (
                <View style={styles.placeholderImage}><Ionicons name="image-outline" size={60} color={colors.gray300} /></View>
            )}
            <View style={styles.content}>
                <Text style={styles.price}>${Number(listing.price).toLocaleString()}</Text>
                <Text style={styles.title}>{listing.title}</Text>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{listing.description || 'No description provided.'}</Text>
                <View style={styles.sellerRow}>
                    <View style={styles.sellerAvatar}><Ionicons name="person-outline" size={18} color={colors.gray600} /></View>
                    <Text style={styles.sellerName}>{listing.profiles?.name || 'Unknown'}</Text>
                </View>
                <TouchableOpacity style={styles.contactBtn} onPress={() => Alert.alert('Coming Soon', 'In-app messaging coming soon!')} activeOpacity={0.8}>
                    <Text style={styles.contactBtnText}>Message Seller</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    errorText: { fontFamily: fonts.regular, fontSize: 15, color: colors.gray500 },
    mainImage: { width: '100%', height: 300, backgroundColor: colors.gray100 },
    placeholderImage: { width: '100%', height: 260, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' },
    content: { padding: spacing.lg },
    price: { fontFamily: fonts.bold, fontSize: 28, color: colors.black },
    title: { fontFamily: fonts.regular, fontSize: 18, color: colors.gray700, marginTop: 4 },
    divider: { height: 0.5, backgroundColor: colors.gray200, marginVertical: spacing.lg },
    sectionTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.black, marginBottom: spacing.sm },
    description: { fontFamily: fonts.regular, fontSize: 15, color: colors.gray600, lineHeight: 22, marginBottom: spacing.xl },
    sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xl },
    sellerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' },
    sellerName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
    contactBtn: { backgroundColor: colors.black, paddingVertical: 14, borderRadius: radii.md, alignItems: 'center' },
    contactBtnText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 16 },
});
