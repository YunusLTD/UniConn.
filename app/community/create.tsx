import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Image, KeyboardAvoidingView, Platform, Switch, DeviceEventEmitter } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { createCommunity, getCommunity, updateCommunity } from '../../src/api/communities';
import { uploadMultipleMedia } from '../../src/api/upload';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';

const TYPES = [
    { key: 'course', label: 'Course', icon: 'book-outline' as const },
    { key: 'interest', label: 'Interest', icon: 'sparkles-outline' as const },
    { key: 'club', label: 'Club', icon: 'people-outline' as const },
    { key: 'study_group', label: 'Study Group', icon: 'library-outline' as const },
];

export default function CreateCommunityScreen() {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { edit, id } = useLocalSearchParams();
    const isEdit = edit === 'true';
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedType, setSelectedType] = useState('interest');
    const [image, setImage] = useState<string | null>(null);
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const router = useRouter();

    const TYPES = [
        { key: 'course', label: t('course'), icon: 'book-outline' as const },
        { key: 'interest', label: t('interest'), icon: 'sparkles-outline' as const },
        { key: 'club', label: t('club'), icon: 'people-outline' as const },
        { key: 'study_group', label: t('study_group'), icon: 'library-outline' as const },
    ];

    useEffect(() => {
        if (isEdit && id) {
            loadCommunityData();
        }
    }, [isEdit, id]);

    const loadCommunityData = async () => {
        try {
            const res = await getCommunity(id as string);
            if (res.data) {
                setName(res.data.name);
                setDescription(res.data.description || '');
                setSelectedType(res.data.type);
                setIsPrivate(res.data.is_private);
                if (res.data.image_url) setImage(res.data.image_url);
            }
        } catch (e) {
            Alert.alert(t('error'), 'Failed to load community details');
        } finally {
            setFetching(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const handleAction = async () => {
        if (!name.trim()) return Alert.alert(t('error'), 'Community name is required');
        
        const actionId = Math.random().toString(36).substring(7);
        const actionType = isEdit ? 'post' : 'post'; // Reusing 'post' logic for banner title or we could add 'community'
        
        hapticLight();
        DeviceEventEmitter.emit('action_status', { 
            id: actionId, 
            type: 'post', 
            status: 'processing',
            title: isEdit ? t('header_edit') : t('header_new')
        });
        
        // Immediate close
        router.back();

        try {
            let imageUrl = image;
            // Only upload if it's a local file (starting with file://)
            if (image && image.startsWith('file')) {
                const uploadRes = await uploadMultipleMedia([{ uri: image, type: 'image' }]);
                if (uploadRes && uploadRes.length > 0) {
                    imageUrl = uploadRes[0].url;
                }
            }

            const data = {
                name: name.trim(),
                type: selectedType,
                description: description.trim(),
                image_url: imageUrl,
                is_private: isPrivate,
            };

            if (isEdit) {
                await updateCommunity(id as string, data);
                DeviceEventEmitter.emit('communityUpdated');
            } else {
                await createCommunity(data as any);
                DeviceEventEmitter.emit('communityCreated');
            }
            
            DeviceEventEmitter.emit('action_status', { id: actionId, type: 'post', status: 'success' });
        } catch (e: any) {
            console.error('Community action failed:', e);
            DeviceEventEmitter.emit('action_status', { id: actionId, type: 'post', status: 'error', message: e.message || 'Failed' });
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: isEdit ? t('header_edit') + ' ' + t('community_hub') : t('header_new') + ' ' + t('community_hub'),
                    headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerRight: () => (
                        <TouchableOpacity onPress={handleAction} disabled={loading || !name.trim()}>
                            {loading ? (
                                <ActivityIndicator size="small" color={colors.text} />
                            ) : (
                                <Text style={[styles.headerAction, { color: colors.text }, !name.trim() && { opacity: 0.3 }]}>
                                    {isEdit ? t('save') : t('create')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    ),
                }}
            />
            {fetching && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 10, justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={colors.text} />
                </View>
            )}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Banner */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('community_banner')}</Text>
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.previewImage} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="camera-outline" size={28} color={colors.gray400} />
                                    <Text style={styles.imagePlaceholderText}>{t('add_cover_photo')}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('community_name')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Community name"
                            placeholderTextColor={colors.gray400}
                            value={name}
                            onChangeText={setName}
                            autoFocus
                            selectionColor={colors.primary}
                        />
                    </View>

                    {/* Description */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('description').toUpperCase()}</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="What's this community about?"
                            placeholderTextColor={colors.gray400}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            selectionColor={colors.primary}
                        />
                    </View>

                    {/* Type */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('community_type')}</Text>
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
                                        color={selectedType === type.key ? (isDark ? colors.black : colors.white) : colors.gray600}
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
                        <Text style={styles.label}>{t('privacy')}</Text>
                        <View style={styles.privacyRow}>
                            <View style={styles.privacyInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name={isPrivate ? 'lock-closed' : 'earth'} size={20} color={colors.text} />
                                    <Text style={styles.privacyTitle}>{isPrivate ? t('private_community') : t('public_community')}</Text>
                                </View>
                                <Text style={styles.privacyDesc}>
                                    {isPrivate
                                        ? t('private_desc')
                                        : t('public_desc')
                                    }
                                </Text>
                            </View>
                            <Switch
                                value={isPrivate}
                                onValueChange={setIsPrivate}
                                trackColor={{ false: colors.gray200, true: colors.text }}
                                thumbColor={colors.background}
                                ios_backgroundColor={colors.gray200}
                            />
                        </View>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg },
    headerAction: { fontFamily: fonts.semibold, fontSize: 15 },
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
        borderColor: colors.border,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: radii.md,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.text,
        backgroundColor: colors.surface,
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
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    typeChipActive: { backgroundColor: colors.text, borderColor: colors.text },
    typeLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray600 },
    typeLabelActive: { color: colors.background },
    privacyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    privacyInfo: { flex: 1, marginRight: 16 },
    privacyTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
    privacyDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 4, lineHeight: 18 },
    imagePicker: {
        width: '100%',
        height: 140,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
    imagePlaceholderText: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400, textAlign: 'center', paddingHorizontal: 20 },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
});
