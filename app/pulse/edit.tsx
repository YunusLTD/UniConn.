import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts, radii, lightColors } from '../../src/constants/theme';
import { updatePulse } from '../../src/api/pulse';
import { uploadMultipleMedia } from '../../src/api/upload';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTheme } from '../../src/context/ThemeContext';
import { createPulseAliasSeed, getPulseAlias } from '../../src/utils/pulseAlias';

const MAX_CHARS = 500;
const ACCENT = '#A154F2';

export default function EditPulseScreen() {
    const { id, content: initialContent } = useLocalSearchParams();
    const router = useRouter();
    const { t } = useLanguage();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [content, setContent] = useState((initialContent as string) || '');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [posting, setPosting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const aliasSeed = useRef(createPulseAliasSeed()).current;
    const currentAlias = useMemo(() => getPulseAlias('editor', aliasSeed), [aliasSeed]);

    const charsLeft = MAX_CHARS - content.length;
    const isOverLimit = charsLeft < 0;
    const canPost = content.trim().length > 0 && !isOverLimit && !posting;

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.6,
        });

        if (!result.canceled && result.assets[0].uri) {
            setUploading(true);
            try {
                const res = await uploadMultipleMedia([{ uri: result.assets[0].uri, type: 'image' }]);
                if (res?.[0]?.url) setImageUrl(res[0].url);
            } catch (e) {
                Alert.alert(t('error'), t('upload_failed'));
            } finally {
                setUploading(false);
            }
        }
    };

    const handlePost = async () => {
        if (!canPost) return;
        setPosting(true);
        try {
            await updatePulse(id as string, {
                content: content.trim(),
                image_url: imageUrl || undefined,
            });
            router.back();
        } catch (e: any) {
            Alert.alert(t('error'), e.message || t('pulse_failed_to_edit'));
        } finally {
            setPosting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack.Screen options={{
                headerShown: true,
                title: '',
                headerBackTitle: t('cancel_label'),
                headerShadowVisible: false,
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.black,
                headerRight: () => (
                    <TouchableOpacity
                        onPress={handlePost}
                        disabled={!canPost}
                        style={[styles.postBtn, !canPost && { opacity: 0.4 }]}
                    >
                        {posting ? (
                            <ActivityIndicator size="small" color={lightColors.background} />
                        ) : (
                            <Text style={styles.postBtnText}>{t('save')}</Text>
                        )}
                    </TouchableOpacity>
                ),
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.betaBanner}>
                        <Ionicons name="information-circle-outline" size={16} color={ACCENT} />
                        <Text style={styles.betaText}>{t('pulse_beta_notice')}</Text>
                    </View>

                    <View style={styles.anonBanner}>
                        <View style={styles.anonIcon}>
                            <Ionicons name="shield-checkmark-outline" size={18} color={ACCENT} />
                        </View>
                        <View style={styles.anonTextWrap}>
                            <Text style={styles.anonTitle}>{t('pulse_guidelines_title')}</Text>
                            <Text style={styles.anonSub}>{t('pulse_guidelines_body')}</Text>
                        </View>
                    </View>

                    <View style={styles.aliasRow}>
                        <Text style={styles.aliasLabel}>{t('pulse_posting_as')}</Text>
                        <View style={styles.aliasPill}>
                            <Ionicons name="eye-off-outline" size={14} color={ACCENT} />
                            <Text style={styles.aliasText}>{currentAlias}</Text>
                        </View>
                    </View>

                    <TextInput
                        style={styles.input}
                        value={content}
                        onChangeText={setContent}
                        placeholder={t('pulse_input_placeholder')}
                        placeholderTextColor={colors.gray400}
                        multiline
                        autoFocus
                        textAlignVertical="top"
                        maxLength={MAX_CHARS + 50}
                    />

                    <View style={styles.counterRow}>
                        <Text style={[
                            styles.charCount,
                            charsLeft <= 50 && { color: colors.warning },
                            isOverLimit && { color: colors.danger },
                        ]}>
                            {charsLeft}
                        </Text>
                    </View>

                    {imageUrl && (
                        <View style={styles.imagePreview}>
                            <Image source={{ uri: imageUrl }} style={styles.previewImg} />
                            <TouchableOpacity
                                style={styles.removeImgBtn}
                                onPress={() => setImageUrl(null)}
                            >
                                <Ionicons name="close-circle" size={24} color={lightColors.background} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {uploading && (
                        <View style={styles.uploadingIndicator}>
                            <ActivityIndicator size="small" color={colors.gray500} />
                            <Text style={styles.uploadingText}>{t('pulse_uploading_image')}</Text>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.toolbar}>
                    <TouchableOpacity
                        style={styles.toolBtn}
                        onPress={handlePickImage}
                        disabled={uploading}
                    >
                        <Ionicons name="image-outline" size={22} color={colors.gray600} />
                        <Text style={styles.toolText}>{t('photo_label')}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (colors: typeof lightColors, isDark: boolean) => {
    const page = colors.background;
    const panel = colors.surface;
    const panelSoft = colors.elevated;

    return StyleSheet.create({
        container: { flex: 1, backgroundColor: page },
        scrollContent: { padding: spacing.lg, paddingBottom: 40 },
        betaBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: panel,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
        },
        betaText: {
            flex: 1,
            fontFamily: fonts.medium,
            fontSize: 12,
            color: colors.gray600,
            lineHeight: 16,
        },
        postBtn: {
            backgroundColor: ACCENT,
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: radii.full,
            minWidth: 90,
            alignItems: 'center',
        },
        postBtnText: {
            fontFamily: fonts.bold,
            fontSize: 15,
            color: lightColors.background,
        },
        anonBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: panel,
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            gap: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        anonIcon: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: panelSoft,
            justifyContent: 'center',
            alignItems: 'center',
        },
        anonTextWrap: { flex: 1 },
        anonTitle: {
            fontFamily: fonts.semibold,
            fontSize: 14,
            color: colors.black,
        },
        anonSub: {
            fontFamily: fonts.regular,
            fontSize: 12,
            color: colors.gray500,
            marginTop: 2,
            lineHeight: 17,
        },
        aliasRow: {
            marginBottom: 14,
            gap: 8,
        },
        aliasLabel: {
            fontFamily: fonts.medium,
            fontSize: 13,
            color: colors.gray500,
        },
        aliasPill: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: radii.full,
            backgroundColor: panel,
            borderWidth: 1,
            borderColor: colors.border,
        },
        aliasText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.black,
        },
        input: {
            fontFamily: fonts.regular,
            fontSize: 18,
            color: colors.black,
            backgroundColor: panel,
            padding: 16,
            borderRadius: 16,
            lineHeight: 28,
            minHeight: 200,
            borderWidth: 1,
            borderColor: colors.border,
        },
        counterRow: {
            alignItems: 'flex-end',
            marginTop: 8,
        },
        charCount: {
            fontFamily: fonts.semibold,
            fontSize: 14,
            color: colors.gray400,
        },
        imagePreview: {
            marginTop: 16,
            borderRadius: 16,
            overflow: 'hidden',
            position: 'relative',
            borderWidth: 1,
            borderColor: colors.border,
        },
        previewImg: {
            width: '100%',
            height: 220,
            borderRadius: 16,
            backgroundColor: panelSoft,
        },
        removeImgBtn: {
            position: 'absolute',
            top: 8,
            right: 8,
        },
        uploadingIndicator: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
        },
        uploadingText: {
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.gray500,
        },
        toolbar: {
            flexDirection: 'row',
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingVertical: 12,
            backgroundColor: colors.surface,
            gap: 16,
        },
        toolBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: panelSoft,
            borderRadius: radii.full,
        },
        toolText: {
            fontFamily: fonts.medium,
            fontSize: 14,
            color: colors.black,
        },
    });
};
