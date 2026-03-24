import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { login as loginApi } from '../../src/api/auth';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Missing fields', 'Please fill in all fields.');
            return;
        }
        setLoading(true);
        try {
            const response = await loginApi({ email, password });
            if (response?.data?.token) {
                await login(response.data.token, response.data.user);
            }
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Something went wrong');
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
                        {/* Logo */}
                        <View style={styles.logoSection}>
                            <View style={styles.logo}>
                                <Ionicons name="school" size={32} color={colors.white} />
                            </View>
                        </View>

                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Log in to access your campus network.</Text>

                        {/* Form */}
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="name@gmail.com"
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

                            <TouchableOpacity style={styles.forgotBtn}>
                                <Text style={styles.forgotText}>Forgot password?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.submitBtn, loading && { opacity: 0.8 }]}
                                onPress={handleLogin}
                                disabled={loading}
                                activeOpacity={0.9}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.white} size="small" />
                                ) : (
                                    <Text style={styles.submitText}>Log In</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <View style={styles.footerRow}>
                                <Text style={styles.footerText}>Don’t have an account? </Text>
                                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                                    <Text style={styles.footerAction}>Apply for access</Text>
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
        backgroundColor: '#F7F8FA', // Light aesthetic background
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
        paddingBottom: spacing.xxl,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 32, // Adjusted for responsiveness
        paddingHorizontal: 20,
        paddingVertical: 32,
        width: '100%',
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
        fontSize: 26, // Reduced size
        color: '#0F172A',
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 15, // Reduced size
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 32,
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontFamily: fonts.bold,
        fontSize: 14, // Reduced size
        color: '#0F172A',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16, // Adjusted radius
        paddingHorizontal: 16,
        paddingVertical: 14, // Reduced vertical padding
        fontFamily: fonts.regular,
        fontSize: 15, // Reduced size
        color: colors.black,
        backgroundColor: colors.white,
    },
    passwordWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16, // Adjusted radius
        paddingHorizontal: 16,
        paddingVertical: 14, // Reduced vertical padding
        backgroundColor: colors.white,
    },
    passwordInput: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.black,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginTop: 2,
    },
    forgotText: {
        fontFamily: fonts.semibold,
        fontSize: 13,
        color: '#94A3B8',
    },
    submitBtn: {
        backgroundColor: colors.black,
        borderRadius: radii.full,
        height: 56, // Reduced height
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    submitText: {
        fontFamily: fonts.bold,
        color: colors.white,
        fontSize: 16, // Reduced size
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
        fontSize: 14, // Reduced size
        color: '#64748B',
    },
    footerAction: {
        fontFamily: fonts.bold,
        fontSize: 14, // Reduced size
        color: colors.black,
    },
});
