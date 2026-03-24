import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadMultipleMedia } from '../../src/api/upload';
import { createStudyQuestion } from '../../src/api/study';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../src/context/ToastContext';
import CustomBackBtn from '../../src/components/CustomBackBtn';

const SUBJECTS = ['Math', 'Science', 'English', 'History', 'Physics', 'Computer Science', 'Business', 'Arts', 'Other'];

export default function CreateQuestionScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [subject, setSubject] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim() || !subject) {
            showToast({ title: 'Wait', message: 'Please fill in all fields', type: 'error' });
            return;
        }

        setSubmitting(true);
        try {
            let imageUrl;
            if (imageUri) {
                const uploadRes = await uploadMultipleMedia([{ uri: imageUri, type: 'image' }]);
                if (uploadRes && uploadRes.length > 0) {
                    imageUrl = uploadRes[0].url;
                }
            }

            await createStudyQuestion({
                title,
                content,
                subject,
                image_url: imageUrl,
            });

            showToast({ title: 'Success', message: 'Question posted! Good luck!', type: 'success' });
            router.back();
        } catch (e) {
            console.log('Failed to post question', e);
            showToast({ title: 'Error', message: 'Something went wrong while posting', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Ask for Help',
                headerLeft: () => (
                    <CustomBackBtn
                        onPress={() => router.back()}
                        style={{ marginLeft: spacing.lg }}
                    />
                ),
                headerRight: () => (
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={submitting}
                        style={styles.postBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Text style={styles.postBtnText}>Ask</Text>
                        )}
                    </TouchableOpacity>
                )
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Subject</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll} contentContainerStyle={{ gap: 8 }}>
                            {SUBJECTS.map(sub => (
                                <TouchableOpacity
                                    key={sub}
                                    style={[styles.subjectChip, subject === sub && styles.activeSubjectChip]}
                                    onPress={() => setSubject(sub)}
                                >
                                    <Text style={[styles.subjectChipText, subject === sub && styles.activeSubjectChipText]}>
                                        {sub}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="What's the core problem? (e.g. Calculus: Chain Rule)"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={80}
                            placeholderTextColor={colors.gray400}
                        />
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Details / Context</Text>
                        <TextInput
                            style={styles.contentInput}
                            placeholder="Explain where you're stuck or what you've tried so far..."
                            value={content}
                            onChangeText={setContent}
                            multiline
                            placeholderTextColor={colors.gray400}
                        />
                    </View>

                    <TouchableOpacity style={styles.imageSelector} onPress={pickImage}>
                        {imageUri ? (
                            <View style={{ position: 'relative' }}>
                                <Image source={{ uri: imageUri }} style={styles.selectedImage} />
                                <TouchableOpacity
                                    style={styles.removeImage}
                                    onPress={() => setImageUri(null)}
                                >
                                    <Ionicons name="close-circle" size={24} color="rgba(0,0,0,0.6)" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Ionicons name="camera-outline" size={32} color={colors.gray400} />
                                <Text style={styles.placeholderText}>Add a photo of the problem</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.tipsSection}>
                        <View style={styles.tipsHeader}>
                            <Ionicons name="bulb" size={18} color={colors.black} />
                            <Text style={styles.tipsTitle}>Quick Tips for Better Help</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.black} style={{ marginTop: 2 }} />
                            <Text style={styles.tipText}>Be clear and specific in your title so peers know exactly what's up.</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.black} style={{ marginTop: 2 }} />
                            <Text style={styles.tipText}>Show what you've tried—it helps others find where you're stuck!</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.black} style={{ marginTop: 2 }} />
                            <Text style={styles.tipText}>Upload a sharp photo if the problem is visual or has diagrams.</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    scrollContent: {
        padding: spacing.lg,
    },
    postBtn: {
        backgroundColor: colors.black,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 70,
    },
    postBtnText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.white,
    },
    inputSection: {
        marginBottom: 24,
    },
    label: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: colors.gray500,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    subjectScroll: {
        marginHorizontal: -spacing.lg,
        paddingHorizontal: spacing.lg,
    },
    subjectChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: colors.gray50,
        borderWidth: 0.5,
        borderColor: colors.gray200,
    },
    activeSubjectChip: {
        backgroundColor: colors.black,
        borderColor: colors.black,
    },
    subjectChipText: {
        fontFamily: fonts.semibold,
        fontSize: 13,
        color: colors.gray600,
    },
    activeSubjectChipText: {
        color: colors.white,
    },
    titleInput: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: colors.black,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
        paddingVertical: 12,
    },
    contentInput: {
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.black,
        minHeight: 120,
        textAlignVertical: 'top',
        paddingVertical: 12,
        lineHeight: 22,
    },
    imageSelector: {
        marginTop: 10,
        marginBottom: 30,
    },
    imagePlaceholder: {
        height: 120,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.gray100,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    placeholderText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.gray400,
    },
    selectedImage: {
        width: '100%',
        height: 200,
        borderRadius: 16,
    },
    removeImage: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    tipsSection: {
        backgroundColor: colors.gray50,
        padding: 20,
        borderRadius: 24,
        marginTop: 10,
        marginBottom: 40,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    tipsTitle: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: colors.black,
    },
    tipItem: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    tipText: {
        flex: 1,
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.gray700,
        lineHeight: 18,
    },
});
