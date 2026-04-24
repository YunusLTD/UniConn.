import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, fonts, radii, colors } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import { deleteAccount } from '../src/api/users';

export default function DeleteAccountScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t, language } = useLanguage();
    const { logout } = useAuth();

    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!reason.trim()) {
            Alert.alert(
                t('error'),
                language === 'tr' 
                    ? 'Lütfen devam etmeden önce bir sebep belirtin.' 
                    : language === 'ka'
                    ? 'გთხოვთ მიუთითოთ მიზეზი გაგრძელებამდე.'
                    : 'Please provide a reason before proceeding.'
            );
            return;
        }

        Alert.alert(
            t('delete_account_label'),
            language === 'tr'
                ? 'Hesabını silmek istediğinden emin misin? Bu işlem geri alınamaz.'
                : language === 'ka'
                ? 'დარწმუნებული ხართ, რომ გსურთ ანგარიშის წაშლა? ეს მოქმედება შეუქცევადია.'
                : 'Are you sure you want to delete your account? This action cannot be undone.',
            [
                { text: t('cancel_label'), style: 'cancel' },
                { 
                    text: t('delete_label'), 
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await deleteAccount(reason);
                            await logout();
                        } catch (e: any) {
                            Alert.alert(t('error'), e.message || 'Failed to delete account');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
            <Stack.Screen 
                options={{ 
                    title: t('delete_account_label'),
                    headerBackTitle: t('settings'),
                }} 
            />
            
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.iconContainer}>
                        <View style={[styles.warningCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}>
                            <Ionicons name="trash-outline" size={40} color="#EF4444" />
                        </View>
                    </View>

                    <Text style={[styles.title, { color: colors.black }]}>
                        {language === 'tr' ? 'Hesabını mı siliyorsun?' : language === 'ka' ? 'შლით ანგარიშს?' : 'Deleting your account?'}
                    </Text>
                    
                    <Text style={[styles.subtitle, { color: colors.gray600 }]}>
                        {language === 'tr' 
                            ? 'Ayrıldığını görmek bizi üzüyor. Lütfen bize neden ayrıldığını söyle ki kendimizi geliştirebilelim.' 
                            : language === 'ka'
                            ? 'გვწყინს თქვენი წასვლა. გთხოვთ გვითხრათ მიზეზი, რომ გავუმჯობესდეთ.'
                            : "We're sorry to see you go. Please let us know why you're leaving so we can improve."}
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: colors.gray500 }]}>
                            {language === 'tr' ? 'Silme Sebebi' : language === 'ka' ? 'წაშლის მიზეზი' : 'Reason for deletion'}
                        </Text>
                        <TextInput
                            style={[
                                styles.input, 
                                { 
                                    backgroundColor: colors.surface, 
                                    color: colors.black, 
                                    borderColor: colors.border,
                                    textAlignVertical: 'top'
                                }
                            ]}
                            placeholder={language === 'tr' ? 'Sebep buraya...' : language === 'ka' ? 'მიზეზი აქ...' : 'Reason here...'}
                            placeholderTextColor={colors.gray400}
                            multiline
                            numberOfLines={4}
                            value={reason}
                            onChangeText={setReason}
                        />
                    </View>

                    <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.gray50 }]}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.gray500} />
                        <Text style={[styles.infoText, { color: colors.gray600 }]}>
                            {language === 'tr'
                                ? 'Hesabını sildiğinde tüm verilerin, mesajların ve topluluk üyeliklerin kalıcı olarak kaldırılacaktır.'
                                : language === 'ka'
                                ? 'თქვენი ანგარიშის წაშლისას ყველა თქვენი მონაცემი, შეტყობინება და ჯგუფის წევრობა სამუდამოდ წაიშლება.'
                                : 'When you delete your account, all your data, messages, and community memberships will be permanently removed.'}
                        </Text>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: colors.border }]}>
                    <TouchableOpacity 
                        style={[styles.deleteButton, { opacity: loading ? 0.7 : 1 }]} 
                        onPress={handleDelete}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.deleteButtonText}>{t('delete_label')}</Text>
                        )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.cancelButton} 
                        onPress={() => router.back()}
                        disabled={loading}
                    >
                        <Text style={[styles.cancelButtonText, { color: colors.gray500 }]}>{t('cancel_label')}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    iconContainer: {
        marginTop: 20,
        marginBottom: 24,
    },
    warningCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 22,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: fonts.regular,
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 10,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 24,
    },
    inputLabel: {
        fontFamily: fonts.semibold,
        fontSize: 13,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        minHeight: 120,
        fontFamily: fonts.regular,
        fontSize: 15,
    },
    infoCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        width: '100%',
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 13,
        lineHeight: 18,
    },
    footer: {
        padding: spacing.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    deleteButton: {
        backgroundColor: '#EF4444',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontFamily: fonts.bold,
        fontSize: 16,
    },
    cancelButton: {
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontFamily: fonts.semibold,
        fontSize: 15,
    },
});
