import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { login as loginApi } from '../../src/api/auth';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../src/context/LanguageContext';
import LanguageDropdown from '../../src/components/LanguageDropdown';

export default function LoginScreen() {
    const { colors, isDark } = useTheme();
    const { t, language, setLanguage } = useLanguage();
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);
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
                router.replace('/(tabs)/home');
            }
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.topHeader}>
                {router.canGoBack() ? (
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
                        <Ionicons name="arrow-back" size={24} color={colors.black} />
                    </TouchableOpacity>
                ) : <View />}
                 <View style={styles.headerRight}>
                    <TouchableOpacity 
                        style={styles.headerItem} 
                        hitSlop={8}
                        onPress={() => setShowLanguagePicker(true)}
                    >
                        <Ionicons name="globe-outline" size={20} color={colors.gray500} />
                        <Text style={[styles.headerText, { color: colors.gray500 }]}>{language.toUpperCase()}</Text>
                    </TouchableOpacity>
                    <View style={[styles.dividerVertical, { marginHorizontal: 12, backgroundColor: colors.gray200 }]} />
                    <TouchableOpacity style={styles.headerItem} hitSlop={8}>
                        <Ionicons name="help-circle-outline" size={22} color={colors.gray500} />
                    </TouchableOpacity>
                </View>

                <LanguageDropdown 
                    visible={showLanguagePicker} 
                    onClose={() => setShowLanguagePicker(false)} 
                />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        {/* Logo */}
                        <View style={styles.logoSection}>
                            <View style={[styles.logo, { backgroundColor: colors.black }]}>
                                <Ionicons name="school" size={32} color={colors.white} />
                            </View>
                        </View>

                        <Text style={[styles.title, { color: colors.black }]}>{t('welcome')}</Text>
                        <Text style={[styles.subtitle, { color: colors.gray500 }]}>{t('login_subtitle')}</Text>

                        {/* Form */}
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.black }]}>{t('email')}</Text>
                                <TextInput
                                    style={[styles.input, { borderColor: colors.border || colors.gray200, color: colors.text, backgroundColor: isDark ? colors.elevated : colors.gray50 }]}
                                    placeholder="example@gmail.com"
                                    placeholderTextColor={colors.gray400}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.black }]}>{t('password')}</Text>
                                <View style={[styles.passwordWrap, { borderColor: colors.border || colors.gray200, backgroundColor: isDark ? colors.elevated : colors.gray50 }]}>
                                    <TextInput
                                        style={[styles.passwordInput, { color: colors.text }]}
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
                                <Text style={[styles.forgotText, { color: colors.gray400 }]}>{t('forgot_password')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: isDark ? '#FFFFFF' : colors.black }, loading && { opacity: 0.8 }]}
                                onPress={handleLogin}
                                disabled={loading}
                                activeOpacity={0.9}
                            >
                                {loading ? (
                                    <ActivityIndicator color={isDark ? '#000000' : colors.white} size="small" />
                                ) : (
                                    <Text style={[styles.submitText, { color: isDark ? '#000000' : colors.white }]}>{t('login')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Footer */}
                        <View style={[styles.footer, { borderTopColor: colors.gray100 }]}>
                            <View style={styles.footerRow}>
                                <Text style={[styles.footerText, { color: colors.gray500 }]}>{t('no_account')}</Text>
                                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                                    <Text style={[styles.footerAction, { color: colors.black }]}>{t('apply_access')}</Text>
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
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
    },
    backBtn: {
        padding: 4,
    },
    headerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerText: {
        fontFamily: fonts.semibold,
        fontSize: 14,
    },
    dividerVertical: {
        width: 1,
        height: 20,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingBottom: spacing.xxl,
    },
    card: {
        borderRadius: 32,
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 26,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 15,
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
        fontSize: 14,
    },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontFamily: fonts.regular,
        fontSize: 15,
    },
    passwordWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    passwordInput: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 15,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginTop: 2,
    },
    forgotText: {
        fontFamily: fonts.semibold,
        fontSize: 13,
    },
    submitBtn: {
        borderRadius: radii.full,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    submitText: {
        fontFamily: fonts.bold,
        fontSize: 16,
    },
    footer: {
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontFamily: fonts.medium,
        fontSize: 14,
    },
    footerAction: {
        fontFamily: fonts.bold,
        fontSize: 14,
    },
});
