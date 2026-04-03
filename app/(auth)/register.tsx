import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { register as registerApi } from '../../src/api/auth';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
    const { colors, isDark } = useTheme();
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
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.headerRight}>
                <TouchableOpacity style={styles.headerItem} hitSlop={8}>
                    <Ionicons name="globe-outline" size={20} color={colors.gray500} />
                    <Text style={[styles.headerText, { color: colors.gray500 }]}>EN</Text>
                </TouchableOpacity>
                <View style={[styles.dividerVertical, { marginHorizontal: 12, backgroundColor: colors.gray200 }]} />
                <TouchableOpacity style={styles.headerItem} hitSlop={8}>
                    <Ionicons name="help-circle-outline" size={22} color={colors.gray500} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        <View style={styles.logoSection}>
                            <View style={[styles.logo, { backgroundColor: colors.black }]}>
                                <Ionicons name="school" size={32} color={colors.white} />
                            </View>
                        </View>

                        <Text style={[styles.title, { color: colors.black }]}>Create Account</Text>
                        <Text style={[styles.subtitle, { color: colors.gray500 }]}>Join your campus community and stay connected.</Text>

                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.black }]}>Full Name</Text>
                                <TextInput
                                    style={[styles.input, { borderColor: colors.border || colors.gray200, color: colors.black, backgroundColor: isDark ? colors.gray800 : colors.gray50 }]}
                                    placeholder="John Doe"
                                    placeholderTextColor={colors.gray400}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.black }]}>Email Address</Text>
                                <TextInput
                                    style={[styles.input, { borderColor: colors.border || colors.gray200, color: colors.black, backgroundColor: isDark ? colors.gray800 : colors.gray50 }]}
                                    placeholder="name@university.edu"
                                    placeholderTextColor={colors.gray400}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.black }]}>Password</Text>
                                <View style={[styles.passwordWrap, { borderColor: colors.border || colors.gray200, backgroundColor: isDark ? colors.gray800 : colors.gray50 }]}>
                                    <TextInput
                                        style={[styles.passwordInput, { color: colors.black }]}
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
                                style={[styles.submitBtn, { backgroundColor: colors.black }, loading && { opacity: 0.8 }]}
                                onPress={handleRegister}
                                disabled={loading}
                                activeOpacity={0.9}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.white} size="small" />
                                ) : (
                                    <Text style={[styles.submitText, { color: colors.white }]}>Create Account</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.footer, { borderTopColor: colors.gray100 }]}>
                            <View style={styles.footerRow}>
                                <Text style={[styles.footerText, { color: colors.gray500 }]}>Already have an account? </Text>
                                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                                    <Text style={[styles.footerAction, { color: colors.black }]}>Log in</Text>
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
    },
    dividerVertical: {
        width: 1,
        height: 20,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: spacing.xl,
    },
    card: {
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
