import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { updatePulse } from '../../src/api/pulse';
import { uploadMultipleMedia } from '../../src/api/upload';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const MAX_CHARS = 500;

export default function EditPulseScreen() {
    const { id, content: initialContent } = useLocalSearchParams();
    const router = useRouter();
    const [content, setContent] = useState((initialContent as string) || '');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [posting, setPosting] = useState(false);
    const [uploading, setUploading] = useState(false);

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
                if (res?.[0]?.url) {
                    setImageUrl(res[0].url);
                }
            } catch (e) {
                Alert.alert('Upload Failed', 'Could not upload image');
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
            Alert.alert('Error', e.message || 'Failed to edit confession');
        } finally {
            setPosting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <StatusBar style="light" />
            <Stack.Screen options={{
                headerShown: true,
                title: '',
                headerBackTitle: 'Cancel',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#0f0f1a' },
                headerRight: () => (
                    <TouchableOpacity
                        onPress={handlePost}
                        disabled={!canPost}
                        style={[styles.postBtn, !canPost && { opacity: 0.4 }]}
                    >
                        {posting ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={styles.postBtnText}>Save</Text>
                        )}
                    </TouchableOpacity>
                ),
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Anonymous Reminder */}
                    <View style={styles.anonBanner}>
                        <View style={styles.anonIcon}>
                            <Ionicons name="shield-checkmark" size={18} color="#A154F2" />
                        </View>
                        <View style={styles.anonTextWrap}>
                            <Text style={styles.anonTitle}>Pulse Community Guidelines</Text>
                            <Text style={styles.anonSub}>No bullying, harassment, or naming individuals. Keep it real, but keep it respectful.</Text>
                        </View>
                    </View>

                    {/* Text Input */}
                    <TextInput
                        style={styles.input}
                        value={content}
                        onChangeText={setContent}
                        placeholder="What's on your mind? Spill it anonymously..."
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        multiline
                        autoFocus
                        textAlignVertical="top"
                        maxLength={MAX_CHARS + 50}
                    />

                    {/* Character Counter */}
                    <View style={styles.counterRow}>
                        <Text style={[
                            styles.charCount,
                            charsLeft <= 50 && { color: '#F59E0B' },
                            isOverLimit && { color: '#EF4444' },
                        ]}>
                            {charsLeft}
                        </Text>
                    </View>

                    {/* Image Preview */}
                    {imageUrl && (
                        <View style={styles.imagePreview}>
                            <Image source={{ uri: imageUrl }} style={styles.previewImg} />
                            <TouchableOpacity
                                style={styles.removeImgBtn}
                                onPress={() => setImageUrl(null)}
                            >
                                <Ionicons name="close-circle" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {uploading && (
                        <View style={styles.uploadingIndicator}>
                            <ActivityIndicator size="small" color={colors.gray500} />
                            <Text style={styles.uploadingText}>Uploading image...</Text>
                        </View>
                    )}
                </ScrollView>

                {/* Bottom Toolbar */}
                <View style={styles.toolbar}>
                    <TouchableOpacity
                        style={styles.toolBtn}
                        onPress={handlePickImage}
                        disabled={uploading}
                    >
                        <Ionicons name="image-outline" size={22} color={colors.gray600} />
                        <Text style={styles.toolText}>Photo</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a' },
    scrollContent: { padding: spacing.lg, paddingBottom: 40 },
    postBtn: {
        backgroundColor: '#A154F2',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: radii.full,
        minWidth: 80,
        alignItems: 'center',
    },
    postBtnText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: 'white',
    },
    anonBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(161, 84, 242, 0.08)',
        borderRadius: 16,
        padding: 14,
        marginBottom: 20,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(161, 84, 242, 0.2)',
    },
    anonIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(161, 84, 242, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    anonTextWrap: { flex: 1 },
    anonTitle: {
        fontFamily: fonts.semibold,
        fontSize: 14,
        color: '#A154F2',
    },
    anonSub: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 2,
        lineHeight: 17,
    },
    input: {
        fontFamily: fonts.regular,
        fontSize: 18,
        color: 'white',
        backgroundColor: '#1a1a2e',
        padding: 16,
        borderRadius: 16,
        lineHeight: 28,
        minHeight: 200,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
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
    },
    previewImg: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
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
        color: 'rgba(255,255,255,0.6)',
    },
    toolbar: {
        flexDirection: 'row',
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: spacing.lg,
        paddingVertical: 12,
        backgroundColor: '#0f0f1a',
        gap: 16,
    },
    toolBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: radii.full,
    },
    toolText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: 'white',
    },
});
