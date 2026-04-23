import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, fonts, radii } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import { useDialog } from '../src/context/DialogContext';
import { deleteAccount } from '../src/api/users';
import { getFriendRequests } from '../src/api/friends';

type LegalModalType = 'privacy' | 'terms';

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    section: {
        marginTop: 18,
        marginHorizontal: spacing.lg,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    sectionTitle: {
        marginHorizontal: spacing.lg,
        marginTop: 20,
        fontFamily: fonts.bold,
        fontSize: 12,
        color: colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    rowLabel: {
        fontFamily: fonts.semibold,
        fontSize: 15,
    },
    rowSub: {
        marginTop: 2,
        fontFamily: fonts.regular,
        fontSize: 12,
    },
    badge: {
        minWidth: 20,
        paddingHorizontal: 6,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    badgeText: {
        fontFamily: fonts.bold,
        fontSize: 11,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 36 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    modalTitle: { fontFamily: fonts.bold, fontSize: 18 },
    selectorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginTop: 8,
        gap: 10,
    },
    selectorText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15 },
    legalText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
    destructiveText: { fontFamily: fonts.bold, fontSize: 15, color: '#EF4444' },
});

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, theme, setTheme, isDark } = useTheme();
    const { t, language, setLanguage } = useLanguage();
    const { logout } = useAuth();
    const { prompt } = useDialog();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [pendingRequests, setPendingRequests] = useState(0);
    const [loadingCounts, setLoadingCounts] = useState(true);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [legalModal, setLegalModal] = useState<{ visible: boolean; type: LegalModalType }>({ visible: false, type: 'privacy' });
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        const loadPendingRequests = async () => {
            try {
                const res = await getFriendRequests();
                setPendingRequests(res?.data?.length || 0);
            } catch (e) {
                setPendingRequests(0);
            } finally {
                setLoadingCounts(false);
            }
        };
        loadPendingRequests();
    }, []);

    const getThemeLabel = (mode: 'light' | 'dark' | 'system') => {
        if (mode === 'light') return t('theme_light');
        if (mode === 'dark') return t('theme_dark');
        return t('theme_system');
    };

    const handleDeleteAccount = async () => {
        const reason = await prompt({
            title: t('delete_account_label'),
            message: language === 'tr'
                ? 'Hesabını neden sildiğini yaz.'
                : language === 'ka'
                    ? 'მოკლედ დაწერე, რატომ შლი ანგარიშს.'
                    : 'Tell us why you are deleting your account.',
            placeholder: language === 'tr'
                ? 'Sebep'
                : language === 'ka'
                    ? 'მიზეზი'
                    : 'Reason',
            confirmText: t('delete_label'),
            cancelText: t('cancel_label'),
            requireInput: true,
        });

        if (!reason) return;

        try {
            await deleteAccount(reason);
            await logout();
        } catch (e: any) {
            Alert.alert(t('error'), e.message || 'Failed to delete account');
        }
    };

    const SettingsRow = ({
        icon,
        label,
        subLabel,
        onPress,
        showBadge = false,
        destructive = false,
    }: {
        icon: any;
        label: string;
        subLabel?: string;
        onPress: () => void;
        showBadge?: boolean;
        destructive?: boolean;
    }) => (
        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.75}>
            <View style={[styles.rowIcon, { backgroundColor: colors.background }]}>
                <Ionicons name={icon} size={18} color={destructive ? '#EF4444' : colors.black} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, destructive ? styles.destructiveText : { color: colors.black }]}>{label}</Text>
                {!!subLabel && <Text style={[styles.rowSub, { color: colors.gray500 }]}>{subLabel}</Text>}
            </View>
            {showBadge && pendingRequests > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.black }]}>
                    <Text style={[styles.badgeText, { color: colors.white }]}>{pendingRequests > 99 ? '99+' : pendingRequests}</Text>
                </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen options={{ title: t('settings') }} />
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>{t('discover_section')}</Text>
                <View style={styles.section}>
                    <SettingsRow icon="notifications-outline" label={t('notifications')} subLabel={t('settings_notifications_sub')} onPress={() => router.push('/activity')} />
                    <SettingsRow icon="bookmark-outline" label={t('settings_saved_posts')} subLabel={t('settings_saved_posts_sub')} onPress={() => router.push('/saved-posts')} />
                    <SettingsRow icon="chatbubble-ellipses-outline" label={t('settings_replies')} subLabel={t('settings_replies_sub')} onPress={() => router.push('/my-replies')} />
                    <SettingsRow icon="arrow-up-circle-outline" label={t('settings_upvoted_posts')} subLabel={t('settings_upvoted_posts_sub')} onPress={() => router.push('/upvoted-posts')} />
                    <SettingsRow icon="people-outline" label={t('friends_label')} subLabel={loadingCounts ? t('loading') : t('settings_friends_sub').replace('{{count}}', String(pendingRequests))} onPress={() => router.push('/friends')} showBadge />
                    <SettingsRow icon="help-circle-outline" label={t('help')} subLabel={t('settings_help_sub')} onPress={() => router.push('/help')} />
                    <SettingsRow icon="information-circle-outline" label={t('settings_about_account')} subLabel={t('settings_about_account_sub')} onPress={() => router.push('/about')} />
                </View>

                <Text style={styles.sectionTitle}>{t('preferences_section')}</Text>
                <View style={styles.section}>
                    <SettingsRow icon={theme === 'dark' ? 'moon-outline' : theme === 'light' ? 'sunny-outline' : 'phone-portrait-outline'} label={t('theme')} subLabel={getThemeLabel(theme as 'light' | 'dark' | 'system')} onPress={() => setShowThemeModal(true)} />
                    <SettingsRow icon="language-outline" label={t('language')} subLabel={language === 'en' ? t('lang_en') : language === 'tr' ? t('lang_tr') : t('lang_ka')} onPress={() => setShowLanguageModal(true)} />
                    <SettingsRow icon="lock-closed-outline" label={t('privacy_policy')} subLabel={t('privacy_desc')} onPress={() => setLegalModal({ visible: true, type: 'privacy' })} />
                    <SettingsRow icon="document-text-outline" label={t('terms_of_use')} subLabel={t('terms_desc')} onPress={() => setLegalModal({ visible: true, type: 'terms' })} />
                </View>

                <Text style={styles.sectionTitle}>{t('account_section')}</Text>
                <View style={styles.section}>
                    <SettingsRow
                        icon="log-out-outline"
                        label={t('logout_label')}
                        onPress={async () => {
                            setLoggingOut(true);
                            await logout();
                            setLoggingOut(false);
                        }}
                        subLabel={loggingOut ? t('settings_logging_out') : undefined}
                    />
                    <SettingsRow icon="trash-outline" label={t('delete_account_label')} onPress={handleDeleteAccount} destructive />
                </View>
            </ScrollView>

            <Modal visible={showThemeModal} transparent animationType="fade" onRequestClose={() => setShowThemeModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowThemeModal(false)}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.black }]}>{t('select_theme')}</Text>
                            <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                                <Ionicons name="close" size={24} color={colors.black} />
                            </TouchableOpacity>
                        </View>
                        {(['light', 'dark', 'system'] as const).map(mode => (
                            <TouchableOpacity
                                key={mode}
                                style={[
                                    styles.selectorItem,
                                    { borderColor: mode === theme ? colors.black : colors.border, backgroundColor: mode === theme ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)') : colors.surface },
                                ]}
                                onPress={() => {
                                    setTheme(mode);
                                    setShowThemeModal(false);
                                }}
                            >
                                <Ionicons
                                    name={mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'phone-portrait-outline'}
                                    size={20}
                                    color={colors.black}
                                />
                                <Text style={[styles.selectorText, { color: colors.black }]}>{getThemeLabel(mode)}</Text>
                                {mode === theme && <Ionicons name="checkmark-circle" size={20} color="#00A3FF" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={showLanguageModal} transparent animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLanguageModal(false)}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.black }]}>{t('language')}</Text>
                            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                                <Ionicons name="close" size={24} color={colors.black} />
                            </TouchableOpacity>
                        </View>
                        {(['en', 'tr', 'ka'] as const).map(lang => (
                            <TouchableOpacity
                                key={lang}
                                style={[
                                    styles.selectorItem,
                                    { borderColor: lang === language ? colors.black : colors.border, backgroundColor: lang === language ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)') : colors.surface },
                                ]}
                                onPress={() => {
                                    setLanguage(lang);
                                    setShowLanguageModal(false);
                                }}
                            >
                                <Text style={{ fontSize: 18 }}>{lang === 'en' ? '🇺🇸' : lang === 'tr' ? '🇹🇷' : '🇬🇪'}</Text>
                                <Text style={[styles.selectorText, { color: colors.black }]}>
                                    {lang === 'en' ? t('lang_en') : lang === 'tr' ? t('lang_tr') : t('lang_ka')}
                                </Text>
                                {lang === language && <Ionicons name="checkmark-circle" size={20} color="#00A3FF" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={legalModal.visible} transparent animationType="fade" onRequestClose={() => setLegalModal(prev => ({ ...prev, visible: false }))}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLegalModal(prev => ({ ...prev, visible: false }))}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.black }]}>{legalModal.type === 'privacy' ? t('privacy_policy') : t('terms_of_use')}</Text>
                            <TouchableOpacity onPress={() => setLegalModal(prev => ({ ...prev, visible: false }))}>
                                <Ionicons name="close" size={24} color={colors.black} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.legalText, { color: colors.gray600 }]}>
                                {legalModal.type === 'privacy' ? t('privacy_desc') : t('terms_desc')}
                            </Text>
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}
