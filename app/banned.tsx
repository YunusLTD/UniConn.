import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { spacing, fonts, radii } from '../src/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function BannedScreen() {
    const { colors } = useTheme();
    const { user, logout } = useAuth();
    const profile = user?.profile;

    const bannedUntilDate = profile?.banned_until ? new Date(profile.banned_until) : null;
    const isPermanent = !bannedUntilDate;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: colors.danger + '15' }]}>
                    <MaterialCommunityIcons name="account-cancel" size={80} color="#ef4444" />
                </View>
                
                <Text style={[styles.title, { color: colors.black }]}>Account Restricted</Text>
                
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.message, { color: colors.gray500 }]}>
                        Your account has been restricted from accessing UniConn due to a violation of our community guidelines.
                    </Text>
                    
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.gray400 }]}>REASON</Text>
                        <Text style={[styles.detailValue, { color: colors.black }]}>{profile?.ban_reason || 'Guidelines Violation'}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.gray400 }]}>DURATION</Text>
                        <Text style={[styles.detailValue, { fontWeight: 'bold', color: '#ef4444' }]}>
                            {isPermanent ? 'Permanent' : `Until ${bannedUntilDate.toLocaleDateString()} ${bannedUntilDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.footerText, { color: colors.gray400 }]}>
                    If you believe this was a mistake, please contact support at support@uniconn.com
                </Text>

                <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.black }]} onPress={logout}>
                    <Text style={[styles.logoutButtonText, { color: colors.white }]}>Log Out</Text>
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
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontFamily: fonts.bold,
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    card: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 32,
    },
    message: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 20,
    },
    divider: {
        height: 1,
        marginBottom: 20,
    },
    detailRow: {
        marginBottom: 16,
    },
    detailLabel: {
        fontSize: 12,
        fontFamily: fonts.bold,
        letterSpacing: 1,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 15,
        fontFamily: fonts.regular,
    },
    footerText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    logoutButton: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutButtonText: {
        fontSize: 16,
        fontFamily: fonts.bold,
    },
});
