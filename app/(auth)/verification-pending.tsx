import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radii } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function VerificationPendingScreen() {
    const { logout } = useAuth(); // User might need to logout if stuck

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.kicker}>VERIFICATION STATUS</Text>

                <Text style={styles.title}>Application Under Review</Text>

                <Text style={styles.subtitle}>
                    Thank you for applying. We're reviewing your verification to keep the community safe and exclusive.
                </Text>

                <View style={styles.infoBox}>
                    <Ionicons name="mail-outline" size={24} color={colors.gray500} style={styles.icon} />
                    <Text style={styles.infoText}>
                        You'll receive an email once your access is approved. Check your inbox and spam folder over the next 4-12 hours.
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xxl,
        paddingTop: 80,
        alignItems: 'center',
    },
    kicker: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: '#64748B',
        letterSpacing: 1.2,
        marginBottom: spacing.md,
        textTransform: 'uppercase',
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 32,
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 38,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: radii.lg,
        padding: spacing.xl,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    icon: {
        marginRight: spacing.md,
        marginTop: 2,
    },
    infoText: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: '#475569',
        lineHeight: 22,
    },
});
