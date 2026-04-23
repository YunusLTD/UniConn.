import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts, radii } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { SUPPORT_EMAIL } from '../src/constants/support';
import { useLanguage } from '../src/context/LanguageContext';

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    sectionTitle: {
        marginTop: 18,
        marginHorizontal: spacing.lg,
        fontFamily: fonts.bold,
        fontSize: 12,
        color: colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    card: {
        marginTop: 10,
        marginHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.surface,
        padding: 14,
    },
    title: { fontFamily: fonts.bold, fontSize: 15, color: colors.black },
    body: { marginTop: 6, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.gray600 },
    contactBtn: {
        marginTop: 10,
        marginHorizontal: spacing.lg,
        borderRadius: radii.full,
        backgroundColor: colors.black,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    contactText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
    supportEmail: {
        marginTop: 10,
        marginHorizontal: spacing.lg,
        textAlign: 'center',
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.gray500,
    },
});

export default function HelpScreen() {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const faqItems = [
        {
            title: t('help_faq_save_title'),
            body: t('help_faq_save_body'),
        },
        {
            title: t('help_faq_friends_title'),
            body: t('help_faq_friends_body'),
        },
        {
            title: t('help_faq_report_title'),
            body: t('help_faq_report_body'),
        },
        {
            title: t('help_faq_visibility_title'),
            body: t('help_faq_visibility_body'),
        },
    ];

    const handleContactSupport = async () => {
        const subject = encodeURIComponent(t('help_support_subject'));
        const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
        const canOpen = await Linking.canOpenURL(mailto);
        if (!canOpen) {
            Alert.alert(t('help'), `${t('help_email_support')} ${SUPPORT_EMAIL}`);
            return;
        }
        await Linking.openURL(mailto);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t('help') }} />
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>{t('help_faq_section')}</Text>
                {faqItems.map((item) => (
                    <View key={item.title} style={styles.card}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.body}>{item.body}</Text>
                    </View>
                ))}

                <Text style={styles.sectionTitle}>{t('help_contact_section')}</Text>
                <TouchableOpacity style={styles.contactBtn} activeOpacity={0.8} onPress={handleContactSupport}>
                    <Ionicons name="mail-outline" size={18} color={colors.white} />
                    <Text style={styles.contactText}>{t('help_email_support')}</Text>
                </TouchableOpacity>
                <Text style={styles.supportEmail}>{SUPPORT_EMAIL}</Text>
            </ScrollView>
        </View>
    );
}
