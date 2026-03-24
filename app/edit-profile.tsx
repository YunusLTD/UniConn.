import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, spacing, fonts, radii } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { getProfile, updateProfile } from '../src/api/users';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../src/api/client';

export default function EditProfileScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    useEffect(() => {
        loadProfileData();
    }, []);

    const loadProfileData = async () => {
        try {
            const res = await getProfile();
            if (res?.data) {
                setName(res.data.name || '');
                setUsername(res.data.username || '');
                setBio(res.data.bio || '');
                setAvatarUrl(res.data.avatar_url || '');
            }
        } catch (e) {
            console.log('Error loading profile', e);
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets[0].uri) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        setUploading(true);
        try {
            const formData = new FormData();
            const fileName = uri.split('/').pop() || 'avatar.jpg';
            const match = /\.(\w+)$/.exec(fileName);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('files', {
                uri,
                name: fileName,
                type,
            } as any);

            const res = await apiFetch('/upload', {
                method: 'POST',
                body: formData,
            });

            if (res?.data?.[0]?.url) {
                const newUrl = res.data[0].url;
                setAvatarUrl(newUrl);
            }
        } catch (e: any) {
            Alert.alert('Upload Failed', e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleUpdate = async () => {
        if (!name.trim()) return Alert.alert('Error', 'Name is required');

        setUpdating(true);
        try {
            await updateProfile({
                name: name.trim(),
                username: username.trim().toLowerCase(),
                bio: bio.trim(),
                avatar_url: avatarUrl,
            });
            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to update profile');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.black} />
            </View>
        );
    }

    const initial = (name || user?.email || '?').charAt(0).toUpperCase();

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={24} color={colors.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleUpdate} disabled={updating} style={styles.saveHeaderBtn}>
                    {updating ? (
                        <ActivityIndicator size="small" color={colors.black} />
                    ) : (
                        <Text style={styles.saveHeaderText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Avatar Edit */}
                    <TouchableOpacity
                        style={styles.avatarEditContainer}
                        onPress={handlePickImage}
                        disabled={uploading}
                    >
                        <View style={styles.avatarLarge}>
                            {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarTextLarge}>{initial}</Text>
                            )}
                            {uploading && (
                                <View style={styles.uploadOverlay}>
                                    <ActivityIndicator size="small" color={colors.white} />
                                </View>
                            )}
                        </View>
                        <Text style={styles.avatarEditText}>Change Profile Picture</Text>
                    </TouchableOpacity>

                    <View style={styles.form}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Display Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Your name"
                                placeholderTextColor={colors.gray400}
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Username</Text>
                            <View style={styles.usernameInputContainer}>
                                <Text style={styles.usernamePrefix}>@</Text>
                                <TextInput
                                    style={[styles.input, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="username"
                                    placeholderTextColor={colors.gray400}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Bio</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Tell us about yourself..."
                                placeholderTextColor={colors.gray400}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray100,
    },
    headerTitle: {
        fontFamily: fonts.bold,
        fontSize: 17,
        color: colors.black,
    },
    backBtn: { padding: 4 },
    saveHeaderBtn: { padding: 4 },
    saveHeaderText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.black,
    },
    scrollContent: { padding: spacing.lg },
    avatarEditContainer: {
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    avatarLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarTextLarge: {
        fontFamily: fonts.bold,
        fontSize: 36,
        color: colors.gray500,
    },
    uploadOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarEditText: {
        marginTop: 12,
        fontFamily: fonts.semibold,
        fontSize: 14,
        color: colors.black,
    },
    form: { gap: spacing.lg },
    field: { gap: 8 },
    label: {
        fontFamily: fonts.semibold,
        fontSize: 14,
        color: colors.gray600,
        marginLeft: 4,
    },
    input: {
        backgroundColor: colors.gray50,
        borderRadius: radii.sm,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.black,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    usernameInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    usernamePrefix: {
        backgroundColor: colors.gray100,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontFamily: fonts.bold,
        fontSize: 15,
        color: colors.gray500,
        borderWidth: 1,
        borderColor: colors.gray100,
        borderTopLeftRadius: radii.sm,
        borderBottomLeftRadius: radii.sm,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
});
