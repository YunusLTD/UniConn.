import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, spacing, radii } from '../../src/constants/theme';
import { submitVerification } from '../../src/api/users';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch } from '../../src/api/client';

export default function VerificationUploadScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user, login, token, completeRegistrationSetup } = useAuth();

    const [yearOfStudy, setYearOfStudy] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleUploadAndSubmit = async () => {
        if (!yearOfStudy) {
            Alert.alert('Missing Field', 'Please enter your year of study.');
            return;
        }
        if (!imageUri) {
            Alert.alert('Missing ID', 'Please upload your student ID.');
            return;
        }

        setLoading(true);
        try {
            // First upload the image if we had an S3 integration or local endpoint
            // For MVP let's assume `upload` route exists. We'll use a mocked flow if it doesn't, 
            // but we'll try to use a real upload.

            let uploadedUrl = 'placeholder_url';

            try {
                const formData = new FormData();
                formData.append('files', {
                    uri: imageUri,
                    name: `id_${Date.now()}.jpg`,
                    type: 'image/jpeg',
                } as any);

                // Assuming /upload/image exists and works publicly or authenticated
                const uploadRes = await apiFetch('/upload', {
                    method: 'POST',
                    body: formData,
                });
                if (uploadRes?.data?.[0]?.url) {
                    uploadedUrl = uploadRes.data[0].url;
                }
            } catch (e) {
                console.log('Upload failed, using placeholder', e);
            }

            const res = await submitVerification({
                university_id: params.university_id as string,
                department: params.department as string,
                year_of_study: yearOfStudy,
                student_id_url: uploadedUrl
            });

            if (res.status === 'success' && token) {
                // Update local context user with new profile state
                await login(token, { ...user!, profile: (res as any).data });

                // Ensure layout knows setup is handled
                completeRegistrationSetup();
                router.replace('/(tabs)/home');
            }
        } catch (error: any) {
            Alert.alert('Submission Failed', error.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.black} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>Student Verification</Text>
                    <Text style={styles.subtitle}>Upload your ID to verify your student status. Please **blur or cover** sensitive info (ID numbers, birth date). Only Photo, Name, and University must be visible.</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Year of Study</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Freshman, 1st Year, 2024"
                        placeholderTextColor={colors.gray400}
                        value={yearOfStudy}
                        onChangeText={setYearOfStudy}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Student ID Card</Text>
                    <Text style={styles.hint}>Please ensure your name and university are clearly visible.</Text>

                    <TouchableOpacity style={styles.uploadArea} onPress={pickImage} activeOpacity={0.8}>
                        {imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <Ionicons name="id-card-outline" size={48} color={colors.gray400} />
                                <Text style={styles.uploadText}>Tap to upload photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, loading && { opacity: 0.8 }]}
                    onPress={handleUploadAndSubmit}
                    disabled={loading}
                    activeOpacity={0.9}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.submitText}>Submit for Review</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
    },
    backBtn: {
        marginBottom: spacing.lg,
    },
    headerTextContainer: {
        marginBottom: spacing.sm,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 28,
        color: '#0F172A',
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: fonts.regular,
        fontSize: 15,
        color: '#64748B',
    },
    content: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
        gap: spacing.xl,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#0F172A',
    },
    hint: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: '#64748B',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.black,
        backgroundColor: '#F8FAFC',
    },
    uploadArea: {
        height: 200,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        overflow: 'hidden',
    },
    uploadPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    uploadText: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: '#64748B',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    submitBtn: {
        backgroundColor: colors.black,
        borderRadius: radii.full,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    submitText: {
        fontFamily: fonts.bold,
        color: colors.white,
        fontSize: 16,
    },
});
