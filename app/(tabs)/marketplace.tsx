import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { listCommunities } from '../../src/api/communities';
import { Ionicons } from '@expo/vector-icons';
import ShadowLoader from '../../src/components/ShadowLoader';

export default function MarketplaceScreen() {
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadData = async () => {
        try {
            const res = await listCommunities(1, 40);
            if (res?.data) setCommunities(res.data);
        } catch (e) {
            console.log('Fetch error', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading) {
        return <ShadowLoader type="marketplace" />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={communities}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <Text style={styles.headerSub}>Select a community to browse listings</Text>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => router.push(`/marketplace/community/${item.id}` as any)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconBlock}>
                            <Ionicons name="storefront-outline" size={18} color={colors.black} />
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardName}>{item.name}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🛍</Text>
                        <Text style={styles.emptyTitle}>No marketplaces yet</Text>
                        <Text style={styles.emptySub}>Join a community to unlock its marketplace</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    headerSub: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray500,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        backgroundColor: colors.white,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray200,
        gap: 14,
    },
    iconBlock: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gray50,
        borderWidth: 1,
        borderColor: colors.gray200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: { flex: 1 },
    cardName: {
        fontFamily: fonts.semibold,
        fontSize: 16,
        color: colors.black,
    },
    emptyState: { alignItems: 'center', paddingTop: 100, paddingHorizontal: spacing.xl },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.black },
    emptySub: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500, marginTop: 4, textAlign: 'center' },
});
