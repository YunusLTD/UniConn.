import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { verifyEmail } from '../../src/api/users';
import { Ionicons } from '@expo/vector-icons';

export default function VerificationScreen() {
    const { token } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            if (!token) { setLoading(false); return; }
            try { await verifyEmail(token as string); setSuccess(true); }
            catch (e: any) { Alert.alert('Failed', e.message); }
            finally { setLoading(false); }
        })();
    }, [token]);

    if (loading) return <View style={styles.centered}><ActivityIndicator size="small" color={colors.black} /></View>;

    return (
        <View style={styles.container}>
            <Ionicons name={success ? 'checkmark-circle' : 'close-circle'} size={72} color={success ? colors.success : colors.danger} />
            <Text style={styles.title}>{success ? 'Email Verified' : 'Invalid Link'}</Text>
            <Text style={styles.text}>
                {success
                    ? 'Your email has been verified. You now have full access.'
                    : 'This link is invalid or has expired. Request a new one from your profile.'}
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(tabs)/home')} activeOpacity={0.8}>
                <Text style={styles.btnText}>Go to Home</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white, paddingHorizontal: spacing.xl, justifyContent: 'center', alignItems: 'center' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
    title: { fontFamily: fonts.bold, fontSize: 24, color: colors.black, marginTop: spacing.lg, marginBottom: spacing.md },
    text: { fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', color: colors.gray500, lineHeight: 22, marginBottom: spacing.xl },
    btn: { backgroundColor: colors.black, paddingVertical: 14, paddingHorizontal: spacing.xxl, borderRadius: radii.md },
    btnText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 16 },
});
