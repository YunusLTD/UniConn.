import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { spacing, fonts, radii } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { getProfile, updateProfile } from '../src/api/users';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../src/api/client';
import ActionModal from '../src/components/ActionModal';

export default function EditProfileScreen() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    
    const [hometown, setHometown] = useState('');
    const [age, setAge] = useState('');
    const [relationshipStatus, setRelationshipStatus] = useState<string>('');
    const [showRelModal, setShowRelModal] = useState(false);

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
                setHometown(res.data.hometown || '');
                setAge(res.data.age ? String(res.data.age) : '');
                setRelationshipStatus(res.data.relationship_status || '');
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
                hometown: hometown.trim() || undefined,
                age: age.trim() ? parseInt(age.trim(), 10) : undefined,
                relationship_status: relationshipStatus || undefined
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
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="small" color={colors.black} />
            </View>
        );
    }

    const initial = (name || user?.email || '?').charAt(0).toUpperCase();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={24} color={colors.black} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.black }]}>Edit Profile</Text>
                <TouchableOpacity onPress={handleUpdate} disabled={updating} style={styles.saveHeaderBtn}>
                    {updating ? (
                        <ActivityIndicator size="small" color={colors.black} />
                    ) : (
                        <Text style={[styles.saveHeaderText, { color: colors.black }]}>Save</Text>
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
                        <View style={[styles.avatarLarge, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                            {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                            ) : (
                                <Text style={[styles.avatarTextLarge, { color: colors.gray400 }]}>{initial}</Text>
                            )}
                            {uploading && (
                                <View style={styles.uploadOverlay}>
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                </View>
                            )}
                        </View>
                        <Text style={[styles.avatarEditText, { color: colors.black }]}>Change Profile Picture</Text>
                    </TouchableOpacity>

                    <View style={styles.form}>
                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>Display Name</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.black }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="Your name"
                                placeholderTextColor={colors.gray400}
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>Username</Text>
                            <View style={styles.usernameInputContainer}>
                                <Text style={[styles.usernamePrefix, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.gray400 }]}>@</Text>
                                <TextInput
                                    style={[styles.input, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, backgroundColor: colors.surface, borderColor: colors.border, color: colors.black }]}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="username"
                                    placeholderTextColor={colors.gray400}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>Bio</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.black }]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Tell us about yourself..."
                                placeholderTextColor={colors.gray400}
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        <Text style={[styles.label, { marginTop: spacing.md, color: colors.gray600 }]}>Personal Details (Optional)</Text>

                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>Hometown</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.black }]}
                                value={hometown}
                                onChangeText={setHometown}
                                placeholder="Where are you from?"
                                placeholderTextColor={colors.gray400}
                            />
                        </View>
                        
                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>Age</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.black }]}
                                value={age}
                                onChangeText={setAge}
                                placeholder="Age"
                                keyboardType="numeric"
                                placeholderTextColor={colors.gray400}
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>Relationship Status</Text>
                            <TouchableOpacity 
                                style={[styles.input, { justifyContent: 'center', backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => setShowRelModal(true)}
                            >
                                <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: relationshipStatus ? colors.black : colors.gray400, textTransform: 'capitalize' }}>
                                    {relationshipStatus || 'Select Status'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            
            <ActionModal
                visible={showRelModal}
                onClose={() => setShowRelModal(false)}
                title="Relationship Status"
                options={[
                    { label: 'Private', icon: 'lock-closed-outline', onPress: () => { setRelationshipStatus('Private'); setShowRelModal(false); } },
                    { label: 'Single', icon: 'person-outline', onPress: () => { setRelationshipStatus('Single'); setShowRelModal(false); } },
                    { label: 'In a relationship', icon: 'heart-outline', onPress: () => { setRelationshipStatus('In a relationship'); setShowRelModal(false); } },
                    { label: 'Married', icon: 'heart-circle-outline', onPress: () => { setRelationshipStatus('Married'); setShowRelModal(false); } },
                    { label: 'Complicated', icon: 'sync-circle-outline', onPress: () => { setRelationshipStatus('Complicated'); setShowRelModal(false); } },
                    { label: 'Not sure', icon: 'help-circle-outline', onPress: () => { setRelationshipStatus('Not sure'); setShowRelModal(false); } },
                    { label: 'Clear', icon: 'close-circle-outline', destructive: true, onPress: () => { setRelationshipStatus(''); setShowRelModal(false); } }
                ]}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 0.5,
    },
    headerTitle: {
        fontFamily: fonts.bold,
        fontSize: 17,
    },
    backBtn: { padding: 4 },
    saveHeaderBtn: { padding: 4 },
    saveHeaderText: {
        fontFamily: fonts.bold,
        fontSize: 16,
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
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarTextLarge: {
        fontFamily: fonts.bold,
        fontSize: 36,
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
    },
    form: { gap: spacing.lg },
    field: { gap: 8 },
    label: {
        fontFamily: fonts.semibold,
        fontSize: 14,
        marginLeft: 4,
    },
    input: {
        borderRadius: radii.sm,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontFamily: fonts.regular,
        fontSize: 15,
        borderWidth: 1,
    },
    usernameInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    usernamePrefix: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontFamily: fonts.bold,
        fontSize: 15,
        borderWidth: 1,
        borderTopLeftRadius: radii.sm,
        borderBottomLeftRadius: radii.sm,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
});
