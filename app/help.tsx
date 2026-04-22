import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts, radii } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { SUPPORT_EMAIL } from '../src/constants/support';

const FAQ_ITEMS = [
    {
        title: 'How do I save a post?',
        body: 'Open the 3-dot menu on any post and tap Save. You can find it later in Saved posts.',
    },
    {
        title: 'How do friend requests work?',
        body: 'Open Friends in Settings to review requests and manage your connections in one place.',
    },
    {
        title: 'How do I report content?',
        body: 'Use the 3-dot menu on a post and choose Report. Our team reviews reported content.',
    },
    {
        title: 'Why can’t I see some posts?',
        body: 'Private community posts require membership. You may also not see content from blocked or reported users.',
    },
];

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
    const styles = useMemo(() => createStyles(colors), [colors]);

    const handleContactSupport = async () => {
        const subject = encodeURIComponent('UniConn Support Request');
        const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
        const canOpen = await Linking.canOpenURL(mailto);
        if (!canOpen) {
            Alert.alert('Support', `Email us at ${SUPPORT_EMAIL}`);
            return;
        }
        await Linking.openURL(mailto);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Help' }} />
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Frequently asked</Text>
                {FAQ_ITEMS.map((item) => (
                    <View key={item.title} style={styles.card}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.body}>{item.body}</Text>
                    </View>
                ))}

                <Text style={styles.sectionTitle}>Contact support</Text>
                <TouchableOpacity style={styles.contactBtn} activeOpacity={0.8} onPress={handleContactSupport}>
                    <Ionicons name="mail-outline" size={18} color={colors.white} />
                    <Text style={styles.contactText}>Email support</Text>
                </TouchableOpacity>
                <Text style={styles.supportEmail}>{SUPPORT_EMAIL}</Text>
            </ScrollView>
        </View>
    );
}
