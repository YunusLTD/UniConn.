import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function BannedScreen() {
    const { user, logout } = useAuth();
    const profile = user?.profile;

    const bannedUntilDate = profile?.banned_until ? new Date(profile.banned_until) : null;
    const isPermanent = !bannedUntilDate;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="account-cancel" size={80} color="#ef4444" />
                </View>
                
                <Text style={styles.title}>Account Restricted</Text>
                
                <View style={styles.card}>
                    <Text style={styles.message}>
                        Your account has been restricted from accessing UniConnect due to a violation of our community guidelines.
                    </Text>
                    
                    <View style={styles.divider} />
                    
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>REASON</Text>
                        <Text style={styles.detailValue}>{profile?.ban_reason || 'Guidelines Violation'}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>DURATION</Text>
                        <Text style={[styles.detailValue, { fontWeight: 'bold', color: '#ef4444' }]}>
                            {isPermanent ? 'Permanent' : `Until ${bannedUntilDate.toLocaleDateString()} ${bannedUntilDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </Text>
                    </View>
                </View>

                <Text style={styles.footerText}>
                    If you believe this was a mistake, please contact support at support@uniconnect.com
                </Text>

                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    card: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 32,
    },
    message: {
        fontSize: 16,
        color: '#64748b',
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 20,
    },
    divider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginBottom: 20,
    },
    detailRow: {
        marginBottom: 16,
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 15,
        color: '#1e293b',
    },
    footerText: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    logoutButton: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
