import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../../src/constants/theme';
import { getMarketplaceListings } from '../../../src/api/marketplace';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../../src/context/LanguageContext';

export default function CommunityMarketplaceScreen() {
    const { id } = useLocalSearchParams();
    const { t } = useLanguage();
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            try { const res = await getMarketplaceListings(id as string); if (res?.data) setListings(res.data); }
            catch (e) { console.log('Error', e); }
            finally { setLoading(false); }
        })();
    }, [id]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t('marketplace'), headerBackTitle: '' }} />
            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="small" color={colors.black} /></View>
            ) : (
                <FlatList
                    data={listings}
                    keyExtractor={item => item.id.toString()}
                    numColumns={2}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: spacing.sm }}
                    ListHeaderComponent={
                        <TouchableOpacity style={styles.createBtn} onPress={() => router.push({ pathname: '/marketplace/create', params: { communityId: id } } as any)} activeOpacity={0.7}>
                            <Ionicons name="add" size={18} color={colors.white} />
                            <Text style={styles.createBtnText}>Post an Item</Text>
                        </TouchableOpacity>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.card} 
                            onPress={() => router.push({ pathname: `/marketplace/${item.id}`, params: { title: item.title } } as any)} 
                            activeOpacity={0.7}
                        >
                            {item.image_url ? (
                                <Image source={{ uri: item.image_url }} style={styles.image} />
                            ) : (
                                <View style={styles.placeholder}><Ionicons name="image-outline" size={32} color={colors.gray300} /></View>
                            )}
                            <View style={styles.info}>
                                <Text style={styles.price}>${Number(item.price).toLocaleString()}</Text>
                                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No listings yet</Text></View>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    createBtn: { backgroundColor: colors.black, margin: spacing.sm, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: radii.md, gap: spacing.sm },
    createBtnText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 14 },
    card: { flex: 0.5, margin: spacing.xs, backgroundColor: colors.white, borderRadius: radii.md, overflow: 'hidden', borderWidth: 0.5, borderColor: colors.gray200 },
    image: { width: '100%', height: 150, backgroundColor: colors.gray100 },
    placeholder: { width: '100%', height: 150, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' },
    info: { padding: spacing.sm },
    price: { fontFamily: fonts.bold, fontSize: 15, color: colors.black },
    title: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 2 },
    emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray400 },
});
