import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, spacing, radii } from '../../src/constants/theme';
import { updateProfile } from '../../src/api/users';
import { uploadMultipleMedia } from '../../src/api/upload';

export default function ProfileSetupScreen() {
    const router = useRouter();
    const [bio, setBio] = useState('');
    const [username, setUsername] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleContinue = async () => {
        setLoading(true);
        try {
            let avatar_url = undefined;

            if (imageUri) {
                const uploadRes = await uploadMultipleMedia([{ uri: imageUri, type: 'image' }]);
                if (uploadRes && uploadRes.length > 0) {
                    avatar_url = uploadRes[0].url;
                }
            }

            const updates: any = {};
            if (bio) updates.bio = bio;
            if (username) updates.username = username;
            if (avatar_url) updates.avatar_url = avatar_url;

            if (Object.keys(updates).length > 0) {
                await updateProfile(updates);
            }

            // Move to next step
            router.push('/(setup)/community-setup');
        } catch (error: any) {
            console.error('Error saving profile setup:', error);
            // Even if it fails (e.g. username taken), we can alert or proceed. Let's alert to fix it.
            alert(error.message || 'Error updating profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        router.push('/(setup)/community-setup');
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <View style={styles.header}>
                        <Text style={styles.title}>Set up your profile</Text>
                        <Text style={styles.subtitle}>Add a photo, pick a username, and tell your peers about yourself.</Text>
                    </View>

                    <View style={styles.avatarSection}>
                        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="camera-outline" size={32} color={colors.gray400} />
                                </View>
                            )}
                            <View style={styles.editBadge}>
                                <Ionicons name="pencil" size={12} color={colors.white} />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.avatarHint}>Tap to choose a profile picture</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="@username (e.g., student_123)"
                            placeholderTextColor={colors.gray400}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="What are you studying? What are your interests?"
                            placeholderTextColor={colors.gray400}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            maxLength={150}
                        />
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                            onPress={handleContinue}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <Text style={styles.primaryBtnText}>Continue</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={loading}>
                            <Text style={styles.skipBtnText}>Skip for now</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    scrollContent: { padding: spacing.xl, flexGrow: 1 },
    header: { marginTop: spacing.xl, marginBottom: spacing.xl },
    title: { fontFamily: fonts.bold, fontSize: 28, color: colors.black, marginBottom: spacing.sm },
    subtitle: { fontFamily: fonts.regular, fontSize: 16, color: colors.gray500, lineHeight: 24 },

    avatarSection: { alignItems: 'center', marginBottom: spacing.xxl },
    avatarContainer: { position: 'relative', width: 100, height: 100, borderRadius: 50 },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.gray200, borderStyle: 'dashed' },
    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.black, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white },
    avatarHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginTop: spacing.md },

    formGroup: { marginBottom: spacing.lg },
    label: { fontFamily: fonts.medium, fontSize: 14, color: colors.black, marginBottom: 8 },
    input: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, borderRadius: radii.md, paddingHorizontal: 16, paddingVertical: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.black },
    textArea: { minHeight: 100, textAlignVertical: 'top' },

    footer: { marginTop: 'auto', paddingTop: spacing.xl },
    primaryBtn: { backgroundColor: colors.black, height: 50, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
    primaryBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
    skipBtn: { height: 50, justifyContent: 'center', alignItems: 'center' },
    skipBtnText: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray500 },
});
