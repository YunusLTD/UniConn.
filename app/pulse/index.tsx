import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, fonts, radii, lightColors } from '../../src/constants/theme';
import { getPulses } from '../../src/api/pulse';
import PulseCard from '../../src/components/PulseCard';
import ShadowLoader from '../../src/components/ShadowLoader';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTheme } from '../../src/context/ThemeContext';
import { createPulseAliasSeed } from '../../src/utils/pulseAlias';

export default function PulseScreen() {
    const router = useRouter();
    const { t } = useLanguage();
    const { colors, isDark } = useTheme();
    const [pulses, setPulses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const aliasSeedRef = useRef(createPulseAliasSeed());
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack.Screen options={{
                headerShown: true,
                title: t('pulse_title'),
                headerTitleStyle: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
                headerTintColor: colors.black,
                headerShadowVisible: false,
                headerStyle: { backgroundColor: colors.surface },
                headerRight: () => (
                    <TouchableOpacity
                        style={styles.headerIconBtn}
                        onPress={() => router.push('/pulse/create')}
                        activeOpacity={0.9}
                        hitSlop={8}
                    >
                        <View style={styles.headerIconInner}>
                            <Ionicons name="create-outline" size={22} color={colors.black} style={styles.headerIcon} />
                        </View>
                    </TouchableOpacity>
                ),
            }} />

            {loading && page === 1 ? (
                <ShadowLoader type="feed" />
            ) : (
                <FlatList
                    data={pulses}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <PulseCard pulse={item} onDelete={handleDelete} aliasSeed={aliasSeedRef.current} />}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.gray500} colors={[colors.gray500]} />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.listContent, pulses.length === 0 && styles.emptyListContent]}
                    ListHeaderComponent={
                        <View style={styles.headerGroup}>
                            <View style={styles.betaBanner}>
                                <Ionicons name="information-circle-outline" size={16} color={stylesMeta.accent} />
                                <Text style={styles.betaText}>Beta</Text>
                            </View>
                            <View style={styles.rulesBanner}>
                                <Ionicons name="shield-checkmark-outline" size={18} color={stylesMeta.accent} />
                                <Text style={styles.rulesText}>
                                    <Text style={{ fontFamily: fonts.bold }}>{t('pulse_rules_prefix')}</Text> {t('pulse_rules_body')}
                                </Text>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="radio-outline" size={44} color={colors.gray400} />
                            </View>
                            <Text style={styles.emptyTitle}>{t('pulse_empty_title')}</Text>
                            <Text style={styles.emptySub}>{t('pulse_empty_sub')}</Text>
                            <TouchableOpacity
                                style={styles.emptyBtn}
                                onPress={() => router.push('/pulse/create')}
                            >
                                <Ionicons name="create-outline" size={18} color={lightColors.background} />
                                <Text style={styles.emptyBtnText}>{t('pulse_empty_cta')}</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const stylesMeta = {
    accent: '#A154F2',
};

const createStyles = (colors: typeof lightColors, isDark: boolean) => {
    const panel = colors.surface;
    const page = colors.background;
    const accent = stylesMeta.accent;
    const softAccent = isDark ? 'rgba(161,84,242,0.14)' : 'rgba(161,84,242,0.08)';

    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: page,
        },
        listContent: {
            paddingTop: 10,
            paddingBottom: 120,
        },
        headerGroup: {
            gap: 10,
            marginTop: 0,
            marginBottom: 6,
        },
        headerIconBtn: {
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 0,
        },
        headerIconInner: {
            width: 22,
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerIcon: {
            textAlign: 'center',
        },
        betaBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            marginHorizontal: 16,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: colors.elevated,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 6,
        },
        betaText: {
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.gray600,
        },
        emptyListContent: {
            flexGrow: 1,
            justifyContent: 'center',
        },
        rulesBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 12,
            backgroundColor: softAccent,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 8,
        },
        rulesText: {
            flex: 1,
            fontFamily: fonts.regular,
            fontSize: 12,
            color: colors.gray600,
            lineHeight: 16,
        },
        emptyContainer: {
            alignItems: 'center',
            paddingTop: 80,
            paddingHorizontal: spacing.xl,
        },
        emptyIcon: {
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: panel,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: spacing.lg,
            borderWidth: 1,
            borderColor: colors.border,
        },
        emptyTitle: {
            fontFamily: fonts.bold,
            fontSize: 20,
            color: colors.black,
            marginBottom: 8,
        },
        emptySub: {
            fontFamily: fonts.regular,
            fontSize: 15,
            color: colors.gray500,
            textAlign: 'center',
            marginBottom: spacing.xl,
            lineHeight: 22,
        },
        emptyBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: accent,
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: radii.full,
        },
        emptyBtnText: {
            fontFamily: fonts.bold,
            fontSize: 15,
            color: lightColors.background,
        },
    });
};
