import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
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
    const { colors } = useTheme();
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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.black,
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
                        style={[styles.postBtn, { backgroundColor: colors.black }]}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Text style={[styles.postBtnText, { color: colors.white }]}>Ask</Text>
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
                        <Text style={[styles.label, { color: colors.gray500 }]}>Subject</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll} contentContainerStyle={{ gap: 8 }}>
                            {SUBJECTS.map(sub => (
                                <TouchableOpacity
                                    key={sub}
                                    style={[
                                        styles.subjectChip,
                                        { backgroundColor: colors.surface, borderColor: colors.border },
                                        subject === sub && { backgroundColor: colors.black, borderColor: colors.black }
                                    ]}
                                    onPress={() => setSubject(sub)}
                                >
                                    <Text style={[
                                        styles.subjectChipText,
                                        { color: colors.gray600 },
                                        subject === sub && { color: colors.white }
                                    ]}>
                                        {sub}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={[styles.label, { color: colors.gray500 }]}>Title</Text>
                        <TextInput
                            style={[styles.titleInput, { color: colors.black, borderBottomColor: colors.border }]}
                            placeholder="What's the core problem? (e.g. Calculus: Chain Rule)"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={80}
                            placeholderTextColor={colors.gray400}
                        />
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={[styles.label, { color: colors.gray500 }]}>Details / Context</Text>
                        <TextInput
                            style={[styles.contentInput, { color: colors.black }]}
                            placeholder="Explain where you're stuck or what you've tried so far..."
                            value={content}
                            onChangeText={setContent}
                            multiline
                            placeholderTextColor={colors.gray400}
                        />
                    </View>

                    <TouchableOpacity style={[styles.imageSelector, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={pickImage}>
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
                            <View style={[styles.imagePlaceholder, { borderColor: colors.border }]}>
                                <Ionicons name="camera-outline" size={32} color={colors.gray400} />
                                <Text style={[styles.placeholderText, { color: colors.gray500 }]}>Add a photo of the problem</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={[styles.tipsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.tipsHeader}>
                            <Ionicons name="bulb" size={18} color={colors.black} />
                            <Text style={[styles.tipsTitle, { color: colors.black }]}>Quick Tips for Better Help</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.black} style={{ marginTop: 2 }} />
                            <Text style={[styles.tipText, { color: colors.gray700 }]}>Be clear and specific in your title so peers know exactly what's up.</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.black} style={{ marginTop: 2 }} />
                            <Text style={[styles.tipText, { color: colors.gray700 }]}>Show what you've tried—it helps others find where you're stuck!</Text>
                        </View>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.black} style={{ marginTop: 2 }} />
                            <Text style={[styles.tipText, { color: colors.gray700 }]}>Upload a sharp photo if the problem is visual or has diagrams.</Text>
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
    },
    scrollContent: {
        padding: spacing.lg,
    },
    postBtn: {
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
    },
    inputSection: {
        marginBottom: 24,
    },
    label: {
        fontFamily: fonts.bold,
        fontSize: 13,
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
        borderWidth: 0.5,
    },
    subjectChipText: {
        fontFamily: fonts.semibold,
        fontSize: 13,
    },
    titleInput: {
        fontFamily: fonts.bold,
        fontSize: 18,
        borderBottomWidth: 1,
        paddingVertical: 12,
    },
    contentInput: {
        fontFamily: fonts.regular,
        fontSize: 15,
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
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    placeholderText: {
        fontFamily: fonts.medium,
        fontSize: 13,
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
        padding: 20,
        borderRadius: 24,
        marginTop: 10,
        marginBottom: 40,
        borderWidth: 1,
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
        lineHeight: 18,
    },
});
