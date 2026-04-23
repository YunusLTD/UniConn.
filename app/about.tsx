import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { spacing, fonts } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { getProfile } from '../src/api/users';
import { useLanguage } from '../src/context/LanguageContext';

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    section: {
        marginTop: 16,
        marginHorizontal: spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        overflow: 'hidden',
    },
    row: {
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    label: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    value: {
        marginTop: 6,
        fontFamily: fonts.semibold,
        fontSize: 14,
        color: colors.black,
    },
    headerCard: {
        marginTop: spacing.lg,
        marginHorizontal: spacing.lg,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.lg,
    },
    headerTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
    headerSub: { marginTop: 6, fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, lineHeight: 19 },
});

const formatDate = (value?: string | null, fallback?: string) => {
    if (!value) return fallback || '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback || '';
    return parsed.toLocaleDateString();
};

export default function AboutScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { user } = useAuth();
    const { t } = useLanguage();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const res = await getProfile();
            setProfile(res?.data || null);
        } catch (e) {
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <Stack.Screen options={{ title: t('settings_about_account') }} />
                <ActivityIndicator size="small" color={colors.black} />
            </View>
        );
    }

    const status = profile?.status || user?.profile?.status || 'active';
    const verificationStatus = profile?.student_id_url
        ? (status === 'pending' ? t('about_account_verification_pending') : status === 'approved' || status === 'active' ? t('about_account_verified_profile') : t('about_account_verification_submitted'))
        : t('about_account_not_submitted');
    const notAvailable = t('about_account_not_available');
    const region = profile?.hometown || profile?.universities?.name || user?.profile?.university_id || notAvailable;

    const rows = [
        { label: t('about_account_joined'), value: formatDate(profile?.created_at, notAvailable) },
        { label: t('email'), value: user?.email || notAvailable },
        { label: t('about_account_username'), value: profile?.username ? `@${profile.username}` : t('about_account_not_set') },
        { label: t('about_account_id'), value: profile?.id || user?.id || notAvailable },
        { label: t('about_account_university'), value: profile?.universities?.name || t('about_account_not_set') },
        { label: t('about_account_region'), value: region },
        { label: t('about_account_status'), value: status },
        { label: t('about_account_verification'), value: verificationStatus },
    ];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t('settings_about_account') }} />
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.headerCard}>
                    <Text style={styles.headerTitle}>{t('about_account_header_title')}</Text>
                    <Text style={styles.headerSub}>
                        {t('about_account_header_sub')}
                    </Text>
                </View>

                <View style={styles.section}>
                    {rows.map((row, idx) => (
                        <View key={row.label} style={[styles.row, idx === rows.length - 1 && { borderBottomWidth: 0 }]}>
                            <Text style={styles.label}>{row.label}</Text>
                            <Text style={styles.value}>{row.value}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
