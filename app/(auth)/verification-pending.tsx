import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, radii } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';

export default function VerificationPendingScreen() {
    const { logout } = useAuth();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            router.replace('/(auth)/login');
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <Text style={[styles.kicker, { color: colors.gray400 }]}>VERIFICATION STATUS</Text>

                <Text style={[styles.title, { color: colors.black }]}>Application Under Review</Text>

                <Text style={[styles.subtitle, { color: colors.gray500 }]}>
                    Thank you for applying. We're reviewing your verification to keep the community safe and exclusive.
                </Text>

                <View
                    style={[
                        styles.infoBox,
                        {
                            backgroundColor: isDark ? colors.elevated : '#F8FAFC',
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <Ionicons name="mail-outline" size={24} color={colors.gray500} style={styles.icon} />
                    <Text style={[styles.infoText, { color: colors.gray500 }]}>
                        You'll receive an email once your access is approved. Verification process can take few minutes or few hours. Please be patient while we review everything.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.logoutBtn, { backgroundColor: colors.primary, borderColor: colors.border }, isLoggingOut && { opacity: 0.8 }]}
                    onPress={handleLogout}
                    disabled={isLoggingOut}
                    activeOpacity={0.9}
                >
                    {isLoggingOut ? (
                        <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                        <Text style={[styles.logoutText, { color: colors.white }]}>Log Out</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        letterSpacing: 1.2,
        marginBottom: spacing.md,
        textTransform: 'uppercase',
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 32,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 38,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    infoBox: {
        flexDirection: 'row',
        borderRadius: radii.lg,
        padding: spacing.xl,
        alignItems: 'flex-start',
        borderWidth: 1,
        width: '100%',
    },
    icon: {
        marginRight: spacing.md,
        marginTop: 2,
    },
    infoText: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 15,
        lineHeight: 22,
    },
    logoutBtn: {
        marginTop: spacing.xl,
        height: 52,
        borderRadius: radii.full,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        width: '100%',
    },
    logoutText: {
        fontFamily: fonts.bold,
        fontSize: 15,
    },
});
