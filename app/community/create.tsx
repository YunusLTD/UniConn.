import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Image, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { createCommunity } from '../../src/api/communities';
import { uploadMultipleMedia } from '../../src/api/upload';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const TYPES = [
    { key: 'course', label: 'Course', icon: 'book-outline' as const },
    { key: 'interest', label: 'Interest', icon: 'sparkles-outline' as const },
    { key: 'club', label: 'Club', icon: 'people-outline' as const },
    { key: 'study_group', label: 'Study Group', icon: 'library-outline' as const },
];

export default function CreateCommunityScreen() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedType, setSelectedType] = useState('interest');
    const [image, setImage] = useState<string | null>(null);
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const handleCreate = async () => {
        if (!name.trim()) return Alert.alert('Error', 'Community name is required');
        setLoading(true);
        try {
            let imageUrl = null;
            if (image) {
                const uploadRes = await uploadMultipleMedia([{ uri: image, type: 'image' }]);
                if (uploadRes && uploadRes.length > 0) {
                    imageUrl = uploadRes[0].url;
                }
            }
            const res = await createCommunity({
                name: name.trim(),
                type: selectedType,
                description: description.trim(),
                image_url: imageUrl,
                is_private: isPrivate,
            } as any);
            if (res?.data) router.back();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'New Community',
                    headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17 },
                    headerRight: () => (
                        <TouchableOpacity onPress={handleCreate} disabled={loading || !name.trim()}>
                            {loading ? (
                                <ActivityIndicator size="small" color={colors.black} />
                            ) : (
                                <Text style={[styles.headerAction, !name.trim() && { opacity: 0.3 }]}>Create</Text>
                            )}
                        </TouchableOpacity>
                    ),
                }}
            />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                    {/* Banner */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>COMMUNITY BANNER</Text>
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.previewImage} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="camera-outline" size={28} color={colors.gray400} />
                                    <Text style={styles.imagePlaceholderText}>Add cover photo (displayed on community profile)</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>NAME</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Community name"
                            placeholderTextColor={colors.gray400}
                            value={name}
                            onChangeText={setName}
                            autoFocus
                        />
                    </View>

                    {/* Description */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>DESCRIPTION</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="What's this community about?"
                            placeholderTextColor={colors.gray400}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* Type */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>TYPE</Text>
                        <View style={styles.typeGrid}>
                            {TYPES.map(type => (
                                <TouchableOpacity
                                    key={type.key}
                                    style={[styles.typeChip, selectedType === type.key && styles.typeChipActive]}
                                    onPress={() => setSelectedType(type.key)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={type.icon}
                                        size={16}
                                        color={selectedType === type.key ? colors.white : colors.gray600}
                                    />
                                    <Text style={[styles.typeLabel, selectedType === type.key && styles.typeLabelActive]}>
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Privacy Toggle */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PRIVACY</Text>
                        <View style={styles.privacyRow}>
                            <View style={styles.privacyInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name={isPrivate ? 'lock-closed' : 'earth'} size={20} color={colors.black} />
                                    <Text style={styles.privacyTitle}>{isPrivate ? 'Private Community' : 'Public Community'}</Text>
                                </View>
                                <Text style={styles.privacyDesc}>
                                    {isPrivate
                                        ? 'Only members can see posts and content. Join requests need approval.'
                                        : 'Anyone can see posts and join freely.'
                                    }
                                </Text>
                            </View>
                            <Switch
                                value={isPrivate}
                                onValueChange={setIsPrivate}
                                trackColor={{ false: colors.gray200, true: colors.black }}
                                thumbColor={colors.white}
                            />
                        </View>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    content: { padding: spacing.lg },
    headerAction: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
    inputGroup: { marginBottom: spacing.xl },
    label: {
        fontFamily: fonts.semibold,
        fontSize: 11,
        color: colors.gray400,
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.gray200,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: radii.md,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.black,
        backgroundColor: colors.gray50,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    typeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: colors.gray200,
        backgroundColor: colors.white,
    },
    typeChipActive: { backgroundColor: colors.black, borderColor: colors.black },
    typeLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray600 },
    typeLabelActive: { color: colors.white },
    privacyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.gray50,
        padding: 16,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    privacyInfo: { flex: 1, marginRight: 16 },
    privacyTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
    privacyDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 4, lineHeight: 18 },
    imagePicker: {
        width: '100%',
        height: 140,
        borderRadius: radii.md,
        backgroundColor: colors.gray50,
        borderWidth: 1.5,
        borderColor: colors.gray200,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
    imagePlaceholderText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400 },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
});
