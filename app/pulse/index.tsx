import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getPulses } from '../../src/api/pulse';
import PulseCard from '../../src/components/PulseCard';
import ShadowLoader from '../../src/components/ShadowLoader';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function PulseScreen() {
    const router = useRouter();
    const [pulses, setPulses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const loadPulses = async (pageNum = 1, isRefresh = false) => {
        try {
            const response = await getPulses(pageNum, 15);
            if (response?.data) {
                if (isRefresh || pageNum === 1) {
                    setPulses(response.data);
                } else {
                    setPulses(prev => [...prev, ...response.data]);
                }
                setHasMore(response.data.length === 15);
            }
        } catch (e) {
            console.log('Failed to fetch pulses', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadPulses(1, true);
        }, [])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(1);
        loadPulses(1, true);
    };

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadPulses(nextPage);
        }
    };

    const handleDelete = () => {
        loadPulses(1, true);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="light" />
            <Stack.Screen options={{
                headerShown: true,
                title: 'The Pulse',
                headerTitleStyle: { fontFamily: fonts.bold, fontSize: 18, color: 'white' },
                headerTintColor: 'white',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#0f0f1a' }
            }} />

            {loading && page === 1 ? (
                <ShadowLoader type="feed" dark />
            ) : (
                <FlatList
                    data={pulses}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <PulseCard pulse={item} onDelete={handleDelete} />}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="white" />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
                    ListHeaderComponent={
                        <View style={styles.rulesBanner}>
                            <Ionicons name="shield-checkmark" size={18} color="#A154F2" />
                            <Text style={styles.rulesText}>
                                <Text style={{ fontFamily: fonts.bold }}>Pulse Rules:</Text> No bullying, no names, no harassment. Keep the campus safe.
                            </Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="eye-off-outline" size={48} color="rgba(255,255,255,0.2)" />
                            </View>
                            <Text style={styles.emptyTitle}>The Pulse is empty</Text>
                            <Text style={styles.emptySub}>Be the first to speak your mind anonymously.</Text>
                            <TouchableOpacity
                                style={styles.emptyBtn}
                                onPress={() => router.push('/pulse/create')}
                            >
                                <Ionicons name="flame" size={18} color="white" />
                                <Text style={styles.emptyBtnText}>Ignite The Pulse</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/pulse/create')}
                activeOpacity={0.85}
            >
                <View style={styles.fabInner}>
                    <Ionicons name="add" size={28} color="white" />
                </View>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a', // Sleek dark baseline
    },
    rulesBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        backgroundColor: 'rgba(161, 84, 242, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(161, 84, 242, 0.2)',
        gap: 8,
    },
    rulesText: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        lineHeight: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: 'white',
        marginBottom: 8,
    },
    emptySub: {
        fontFamily: fonts.regular,
        fontSize: 15,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    emptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#A154F2',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: radii.full,
    },
    emptyBtnText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: colors.white,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: Platform.OS === 'ios' ? 24 : 20,
        zIndex: 10,
    },
    fabInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#A154F2', // Neon purple
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#A154F2',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
        elevation: 8,
    },
});
