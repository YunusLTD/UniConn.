import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Image, KeyboardAvoidingView, Platform, DeviceEventEmitter } from 'react-native';
import { spacing, fonts, radii } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { getProfile, updateProfile } from '../src/api/users';
import { uploadSingleMedia } from '../src/api/upload';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import ActionModal from '../src/components/ActionModal';
import { useLanguage } from '../src/context/LanguageContext';
import { buildYearOptions, getDepartmentLabel, getRelationshipStatusLabel, getYearOfStudyLabel } from '../src/utils/localization';

export default function EditProfileScreen() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const { t, language } = useLanguage();
    const bioLabel = language === 'tr' ? 'Biyografi' : language === 'ka' ? 'ბიოგრაფია' : 'Bio';
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
    const [department, setDepartment] = useState('');
    const [yearOfStudy, setYearOfStudy] = useState('');
    const [showRelModal, setShowRelModal] = useState(false);
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [showYearModal, setShowYearModal] = useState(false);
    
    // Privacy settings
    const [showHometown, setShowHometown] = useState(true);
    const [showAge, setShowAge] = useState(true);
    const [showRelationship, setShowRelationship] = useState(true);
    const [showDepartment, setShowDepartment] = useState(true);
    const [showYear, setShowYear] = useState(true);
    const [showRank, setShowRank] = useState(false);

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
                setDepartment(res.data.department || '');
                setYearOfStudy(res.data.year_of_study ? String(res.data.year_of_study) : '');
                
                setShowHometown(res.data.show_hometown ?? true);
                setShowAge(res.data.show_age ?? true);
                setShowRelationship(res.data.show_relationship ?? true);
                setShowDepartment(res.data.show_department ?? true);
                setShowYear(res.data.show_year ?? true);
                setShowRank(res.data.show_rank ?? false);
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
            const uploadedMedia = await uploadSingleMedia(uri, 'image');
            if (uploadedMedia?.url) {
                const newUrl = uploadedMedia.url;
                setAvatarUrl(newUrl);
            }
        } catch (e: any) {
            Alert.alert(t('upload_failed'), e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleUpdate = async () => {
        if (!name.trim()) return Alert.alert(t('error'), t('name_required'));

        setUpdating(true);
        try {
            await updateProfile({
                name: name.trim(),
                username: username.trim().toLowerCase(),
                bio: bio.trim(),
                avatar_url: avatarUrl,
                hometown: hometown.trim() || undefined,
                age: age.trim() ? parseInt(age.trim(), 10) : undefined,
                relationship_status: relationshipStatus || undefined,
                department: department.trim() || undefined,
                year_of_study: yearOfStudy.trim() || undefined,
                show_hometown: showHometown,
                show_age: showAge,
                show_relationship: showRelationship,
                show_department: showDepartment,
                show_year: showYear,
                show_rank: showRank
            });
            DeviceEventEmitter.emit('profileUpdated', {
                name: name.trim(),
                avatar_url: avatarUrl,
                bio: bio.trim(),
                username: username.trim().toLowerCase(),
            });

            router.back();
        } catch (e: any) {
            Alert.alert(t('error'), e.message || t('error'));
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
                <Text style={[styles.headerTitle, { color: colors.black }]}>{t('edit_profile')}</Text>
                <TouchableOpacity onPress={handleUpdate} disabled={updating} style={styles.saveHeaderBtn}>
                    {updating ? (
                        <ActivityIndicator size="small" color={colors.black} />
                    ) : (
                        <Text style={[styles.saveHeaderText, { color: colors.black }]}>{t('save')}</Text>
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
                        <Text style={[styles.avatarEditText, { color: colors.black }]}>{t('change_profile_picture')}</Text>
                    </TouchableOpacity>

                    <View style={styles.form}>
                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>{t('display_name')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.black }]}
                                value={name}
                                onChangeText={setName}
                                placeholder={t('display_name')}
                                placeholderTextColor={colors.gray400}
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>{t('username_label')}</Text>
                            <View style={styles.usernameInputContainer}>
                                <Text style={[styles.usernamePrefix, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.gray400 }]}>@</Text>
                                <TextInput
                                    style={[styles.input, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, backgroundColor: colors.surface, borderColor: colors.border, color: colors.black }]}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder={t('username_label')}
                                    placeholderTextColor={colors.gray400}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>{bioLabel}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.black }]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder={t('bio_placeholder')}
                                placeholderTextColor={colors.gray400}
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        <Text style={[styles.label, { marginTop: spacing.md, color: colors.gray600 }]}>{t('personal_details')}</Text>

                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>{t('hometown')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.black }]}
                                value={hometown}
                                onChangeText={setHometown}
                                placeholder={t('hometown')}
                                placeholderTextColor={colors.gray400}
                            />
                        </View>
                        
                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>{t('age')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.black }]}
                                value={age}
                                onChangeText={setAge}
                                placeholder={t('age')}
                                keyboardType="numeric"
                                placeholderTextColor={colors.gray400}
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>{t('relationship_status')}</Text>
                            <TouchableOpacity 
                                style={[styles.input, { justifyContent: 'center', backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => setShowRelModal(true)}
                            >
                                <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: relationshipStatus ? colors.black : colors.gray400, textTransform: 'capitalize' }}>
                                    {relationshipStatus ? getRelationshipStatusLabel(relationshipStatus, language) : t('select_status')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Privacy for Personal */}
                        <View style={styles.privacyGroup}>
                            <PrivacyToggle label={t('show_hometown')} value={showHometown} onChange={setShowHometown} />
                            <PrivacyToggle label={t('show_age')} value={showAge} onChange={setShowAge} />
                            <PrivacyToggle label={t('show_relationship')} value={showRelationship} onChange={setShowRelationship} />
                        </View>

                        <Text style={[styles.label, { marginTop: spacing.md, color: colors.gray600 }]}>{t('academic_details')}</Text>

                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>{t('department_label')}</Text>
                            <TouchableOpacity 
                                style={[styles.input, { justifyContent: 'center', backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => setShowDeptModal(true)}
                            >
                                <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: department ? colors.black : colors.gray400 }}>
                                    {department ? getDepartmentLabel(department, t) : t('select_department')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.field}>
                            <Text style={[styles.label, { color: colors.gray500 }]}>{t('graduation_year_label')}</Text>
                            <TouchableOpacity 
                                style={[styles.input, { justifyContent: 'center', backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => setShowYearModal(true)}
                            >
                                <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: yearOfStudy ? colors.black : colors.gray400 }}>
                                    {yearOfStudy ? getYearOfStudyLabel(yearOfStudy, language, t) : t('select_year')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Privacy for Academic */}
                        <View style={styles.privacyGroup}>
                            <PrivacyToggle label={t('show_department')} value={showDepartment} onChange={setShowDepartment} />
                            <PrivacyToggle label={t('show_year')} value={showYear} onChange={setShowYear} />
                            <PrivacyToggle label={t('show_rank')} value={showRank} onChange={setShowRank} />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <ActionModal
                visible={showDeptModal}
                onClose={() => setShowDeptModal(false)}
                title={t('select_department')}
                options={[
                    { label: t('cs'), icon: 'code-slash-outline', onPress: () => { setDepartment(t('cs')); setShowDeptModal(false); } },
                    { label: t('business'), icon: 'business-outline', onPress: () => { setDepartment(t('business')); setShowDeptModal(false); } },
                    { label: language === 'tr' ? 'Muhendislik' : language === 'ka' ? 'ინჟინერია' : 'Engineering', icon: 'construct-outline', onPress: () => { setDepartment(language === 'tr' ? 'Muhendislik' : language === 'ka' ? 'ინჟინერია' : 'Engineering'); setShowDeptModal(false); } },
                    { label: language === 'tr' ? 'Tip ve Saglik' : language === 'ka' ? 'მედიცინა და ჯანმრთელობა' : 'Medicine & Health', icon: 'medical-outline', onPress: () => { setDepartment(language === 'tr' ? 'Tip ve Saglik' : language === 'ka' ? 'მედიცინა და ჯანმრთელობა' : 'Medicine & Health'); setShowDeptModal(false); } },
                    { label: language === 'tr' ? 'Hukuk' : language === 'ka' ? 'სამართალი' : 'Law', icon: 'scale-outline', onPress: () => { setDepartment(language === 'tr' ? 'Hukuk' : language === 'ka' ? 'სამართალი' : 'Law'); setShowDeptModal(false); } },
                    { label: t('arts'), icon: 'color-palette-outline', onPress: () => { setDepartment(t('arts')); setShowDeptModal(false); } },
                    { label: language === 'tr' ? 'Sosyal Bilimler' : language === 'ka' ? 'სოციალური მეცნიერებები' : 'Social Sciences', icon: 'people-outline', onPress: () => { setDepartment(language === 'tr' ? 'Sosyal Bilimler' : language === 'ka' ? 'სოციალური მეცნიერებები' : 'Social Sciences'); setShowDeptModal(false); } },
                    { label: language === 'tr' ? 'Dogal Bilimler' : language === 'ka' ? 'ბუნების მეცნიერებები' : 'Natural Sciences', icon: 'leaf-outline', onPress: () => { setDepartment(language === 'tr' ? 'Dogal Bilimler' : language === 'ka' ? 'ბუნების მეცნიერებები' : 'Natural Sciences'); setShowDeptModal(false); } },
                    { label: language === 'tr' ? 'Ekonomi' : language === 'ka' ? 'ეკონომიკა' : 'Economics', icon: 'stats-chart-outline', onPress: () => { setDepartment(language === 'tr' ? 'Ekonomi' : language === 'ka' ? 'ეკონომიკა' : 'Economics'); setShowDeptModal(false); } },
                    { label: language === 'tr' ? 'Mimarlik' : language === 'ka' ? 'არქიტექტურა' : 'Architecture', icon: 'home-outline', onPress: () => { setDepartment(language === 'tr' ? 'Mimarlik' : language === 'ka' ? 'არქიტექტურა' : 'Architecture'); setShowDeptModal(false); } },
                    { label: t('other'), icon: 'ellipsis-horizontal-outline', onPress: () => { setDepartment(t('other')); setShowDeptModal(false); } },
                ]}
            />

            <ActionModal
                visible={showYearModal}
                onClose={() => setShowYearModal(false)}
                title={t('graduation_year_label')}
                options={buildYearOptions(language, t).map((option) => ({
                    label: option.label,
                    icon: option.value === 'graduated' ? 'trophy-outline' : option.value === '0' ? 'time-outline' : 'calendar-outline',
                    onPress: () => { setYearOfStudy(option.value); setShowYearModal(false); },
                }))}
            />
            
            <ActionModal
                visible={showRelModal}
                onClose={() => setShowRelModal(false)}
                title={t('relationship_status')}
                options={[
                    { label: t('rel_private'), icon: 'lock-closed-outline', onPress: () => { setRelationshipStatus('Private'); setShowRelModal(false); } },
                    { label: t('rel_single'), icon: 'person-outline', onPress: () => { setRelationshipStatus('Single'); setShowRelModal(false); } },
                    { label: t('rel_in_relationship'), icon: 'heart-outline', onPress: () => { setRelationshipStatus('In a relationship'); setShowRelModal(false); } },
                    { label: t('rel_married'), icon: 'heart-circle-outline', onPress: () => { setRelationshipStatus('Married'); setShowRelModal(false); } },
                    { label: t('rel_complicated'), icon: 'sync-circle-outline', onPress: () => { setRelationshipStatus('Complicated'); setShowRelModal(false); } },
                    { label: language === 'tr' ? 'Emin degil' : language === 'ka' ? 'დარწმუნებული არ არის' : 'Not sure', icon: 'help-circle-outline', onPress: () => { setRelationshipStatus('Not sure'); setShowRelModal(false); } },
                    { label: t('clear'), icon: 'close-circle-outline', destructive: true, onPress: () => { setRelationshipStatus(''); setShowRelModal(false); } }
                ]}
            />
        </SafeAreaView>
    );
}

const PrivacyToggle = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity 
            style={[styles.toggleRow, { backgroundColor: colors.surface }]} 
            onPress={() => onChange(!value)}
            activeOpacity={0.7}
        >
            <Text style={[styles.toggleLabel, { color: colors.black }]}>{label}</Text>
            <View style={[styles.switchTrack, { backgroundColor: value ? colors.black : colors.gray200 }]}>
                <View style={[styles.switchThumb, { transform: [{ translateX: value ? 20 : 0 }], backgroundColor: colors.white }]} />
            </View>
        </TouchableOpacity>
    );
};

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
    scrollContent: { padding: spacing.lg, paddingBottom: 60 },
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
    privacyGroup: {
        marginTop: -8,
        gap: 8,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    toggleLabel: {
        fontFamily: fonts.medium,
        fontSize: 14,
    },
    switchTrack: {
        width: 44,
        height: 24,
        borderRadius: 12,
        padding: 2,
        justifyContent: 'center',
    },
    switchThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 1,
    }
});
