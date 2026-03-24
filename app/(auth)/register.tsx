import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { register as registerApi } from '../../src/api/auth';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert('Missing fields', 'Please fill in all fields.');
            return;
        }
        setLoading(true);
        try {
            const response = await registerApi({ name, email, password });
            if (response?.data?.token) {
                await login(response.data.token, response.data.user, true);
            }
        } catch (error: any) {
            Alert.alert('Registration Failed', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRight}>
                <TouchableOpacity style={styles.headerItem} hitSlop={8}>
                    <Ionicons name="globe-outline" size={20} color={colors.gray500} />
                    <Text style={styles.headerText}>EN</Text>
                </TouchableOpacity>
                <View style={[styles.dividerVertical, { marginHorizontal: 12 }]} />
                <TouchableOpacity style={styles.headerItem} hitSlop={8}>
                    <Ionicons name="help-circle-outline" size={22} color={colors.gray500} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <View style={styles.logoSection}>
                            <View style={styles.logo}>
                                <Ionicons name="school" size={32} color={colors.white} />
                            </View>
                        </View>

                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join your campus community and stay connected.</Text>

                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Full Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    placeholderTextColor={colors.gray400}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email Address</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="name@university.edu"
                                    placeholderTextColor={colors.gray400}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password</Text>
                                <View style={styles.passwordWrap}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="••••••••"
                                        placeholderTextColor={colors.gray400}
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={22}
                                            color={colors.gray400}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, loading && { opacity: 0.8 }]}
                                onPress={handleRegister}
                                disabled={loading}
                                activeOpacity={0.9}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.white} size="small" />
                                ) : (
                                    <Text style={styles.submitText}>Create Account</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <View style={styles.footerRow}>
                                <Text style={styles.footerText}>Already have an account? </Text>
                                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                                    <Text style={styles.footerAction}>Log in</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
    },
    headerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerText: {
        fontFamily: fonts.semibold,
        fontSize: 14,
        color: colors.gray600,
    },
    dividerVertical: {
        width: 1,
        height: 20,
        backgroundColor: colors.gray200,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: spacing.xl,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 32,
        paddingHorizontal: 20,
        paddingVertical: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logo: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: colors.black,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 26,
        color: '#0F172A',
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 32,
        lineHeight: 22,
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: '#0F172A',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.black,
        backgroundColor: colors.white,
    },
    passwordWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: colors.white,
    },
    passwordInput: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.black,
    },
    submitBtn: {
        backgroundColor: colors.black,
        borderRadius: radii.full,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    submitText: {
        fontFamily: fonts.bold,
        color: colors.white,
        fontSize: 16,
    },
    footer: {
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: '#64748B',
    },
    footerAction: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.black,
    },
});
