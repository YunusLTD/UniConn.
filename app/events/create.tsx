import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, Pressable, DeviceEventEmitter } from 'react-native';
import { useRouter, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { createEvent } from '../../src/api/events';
import { getMyCommunities } from '../../src/api/communities';
import { uploadMultipleMedia } from '../../src/api/upload';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { hapticSelection } from '../../src/utils/haptics';

export default function CreateEventScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const { colors, theme, isDark } = useTheme();

    const [communities, setCommunities] = useState<any[]>([]);
    const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showSelector, setShowSelector] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [eventDate, setEventDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadCommunities = async () => {
            try {
                const res = await getMyCommunities();
                if (res?.data) {
                    setCommunities(res.data);
                    if (params.communityId) {
                        const target = res.data.find((c: any) => c.id === params.communityId);
                        if (target) setSelectedCommunity(target);
                    } else if (res.data.length > 0) {
                        setSelectedCommunity(res.data[0]);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadCommunities();
    }, [params.communityId]);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].uri) {
            setUploading(true);
            try {
                const res = await uploadMultipleMedia([{ uri: result.assets[0].uri, type: 'image' }]);
                if (res?.[0]?.url) setImageUrl(res[0].url);
            } catch (e) {
                Alert.alert('Upload Failed', 'Could not upload image');
            } finally {
                setUploading(false);
            }
        }
    };

    const handleCreate = async () => {
        if (!selectedCommunity) return Alert.alert('Error', 'Please select a community first');
        if (!title.trim()) return Alert.alert('Error', 'Please enter an event title');

        setPosting(true);
        try {
            await createEvent(selectedCommunity.id, {
                title: title.trim(),
                description: description.trim(),
                location: location.trim(),
                start_time: eventDate.toISOString(),
                image_url: imageUrl || undefined
            });
            DeviceEventEmitter.emit('postCreated');
            Alert.alert('Success', 'Event scheduled!');
            router.back();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to schedule event');
        } finally {
            setPosting(false);
        }
    };

    const formatSmartDate = (date: Date) => {
        const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}, ${time}`;
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) setEventDate(selectedDate);
    };

    useLayoutEffect(() => {
        const isReady = !!title.trim() && !posting;

        navigation.setOptions({
            headerShown: true,
            title: 'Schedule Event',
            headerTitleAlign: 'center',
            headerBackTitleVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.black,
            headerLeft: () => (
                <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 16 }}>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: colors.gray600 }}>Cancel</Text>
                </TouchableOpacity>
            ),
            headerRight: () => (
                <Pressable
                    onPress={() => {
                        if (isReady) {
                            hapticSelection();
                            handleCreate();
                        }
                    }}
                    disabled={!isReady}
                    style={({ pressed }) => [
                        { paddingLeft: 16, paddingVertical: 8, opacity: isReady ? (pressed ? 0.7 : 1) : 0.5 },
                    ]}
                    hitSlop={20}
                >
                    {posting ? <Text style={[styles.doneBtn, { color: colors.gray400 }]}>Sharing</Text> : <Text style={[styles.doneBtn, { color: colors.black }]}>Share</Text>}
                </Pressable>
            )
        });
    }, [title, posting, colors, navigation]);

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator color={colors.black} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
            <Stack.Screen options={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.black
            }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                    {/* Community Picker */}
                    <TouchableOpacity style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} onPress={() => setShowSelector(!showSelector)}>
                        <View style={styles.pickerLeft}>
                            <View style={[styles.pickerIcon, { backgroundColor: colors.background }]}>
                                <Ionicons name="people-outline" size={20} color={colors.gray500} />
                            </View>
                            <View>
                                <Text style={[styles.pickerSub, { color: colors.gray500 }]}>POSTING TO</Text>
                                <Text style={[styles.pickerName, { color: colors.black }]}>{selectedCommunity?.name?.replace(/Community/gi, '').trim() || 'Select Community'}</Text>
                            </View>
                        </View>
                        <Ionicons name={showSelector ? "chevron-up" : "chevron-down"} size={20} color={colors.gray400} />
                    </TouchableOpacity>

                    {showSelector && (
                        <View style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            {communities.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={[styles.selectorItem, selectedCommunity?.id === c.id && [styles.selectorActive, { backgroundColor: colors.background }]]}
                                    onPress={() => { setSelectedCommunity(c); setShowSelector(false); }}
                                >
                                    <Text style={[styles.selectorText, { color: colors.gray500 }, selectedCommunity?.id === c.id && [styles.selectorTextActive, { color: colors.black }]]}>
                                        {c.name?.replace(/Community/gi, '').trim()}
                                    </Text>
                                    {selectedCommunity?.id === c.id && <Ionicons name="checkmark" size={18} color={colors.black} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Image Upload */}
                    <TouchableOpacity style={[styles.imageZone, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handlePickImage} disabled={uploading}>
                        {imageUrl ? (
                            <View style={styles.imagePreviewWrap}>
                                <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
                                <View style={styles.imageOverlay}>
                                    <Ionicons name="camera" size={24} color="white" />
                                    <Text style={styles.changePhotoText}>Change Cover</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                {uploading ? (
                                    <ActivityIndicator color={colors.gray400} />
                                ) : (
                                    <>
                                        <Ionicons name="image-outline" size={40} color={colors.gray400} />
                                        <Text style={[styles.imageLabel, { color: colors.gray500 }]}>Add Event Cover Photo</Text>
                                    </>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Form Fields */}
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>TITLE</Text>
                            <TextInput
                                style={[styles.titleInput, { color: colors.black }]}
                                placeholder="What's the event?"
                                placeholderTextColor={colors.gray400}
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>WHEN</Text>
                            <TouchableOpacity style={[styles.datePickerBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} onPress={() => setShowDatePicker(true)}>
                                <Ionicons name="calendar-outline" size={20} color={colors.gray500} />
                                <Text style={[styles.dateText, { color: colors.black }]}>{formatSmartDate(eventDate)}</Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
                                    {Platform.OS === 'ios' && (
                                        <View style={[styles.pickerHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                                <Text style={[styles.pickerDoneText, { color: colors.black }]}>Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    <DateTimePicker
                                        value={eventDate}
                                        mode="datetime"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onDateChange}
                                        textColor={isDark ? '#FFFFFF' : '#000000'}
                                    />
                                </View>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>WHERE</Text>
                            <View style={[styles.locationWrap, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                                <Ionicons name="location-outline" size={20} color={colors.gray500} />
                                <TextInput
                                    style={[styles.locationInput, { color: colors.black }]}
                                    placeholder="Venue or Link"
                                    placeholderTextColor={colors.gray400}
                                    value={location}
                                    onChangeText={setLocation}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>DESCRIPTION</Text>
                            <TextInput
                                style={[styles.descInput, { backgroundColor: colors.surface, color: colors.black, borderColor: colors.border, borderWidth: 1 }]}
                                placeholder="Tell everyone more about it..."
                                placeholderTextColor={colors.gray400}
                                value={description}
                                onChangeText={setDescription}
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
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: spacing.lg, paddingBottom: 100 },
    doneBtn: { fontFamily: fonts.bold, fontSize: 16, marginRight: spacing.md },

    picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 12 },
    pickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pickerIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    pickerSub: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1 },
    pickerName: { fontFamily: fonts.bold, fontSize: 14 },

    selector: { borderRadius: 16, padding: 8, marginBottom: 16, borderWidth: 1 },
    selectorItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10 },
    selectorActive: { },
    selectorText: { fontFamily: fonts.medium, fontSize: 14 },
    selectorTextActive: { fontFamily: fonts.bold },

    imageZone: { width: '100%', height: 180, borderRadius: 20, marginBottom: 24, overflow: 'hidden', borderStyle: 'dashed', borderWidth: 1 },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imageLabel: { fontFamily: fonts.medium, fontSize: 13, marginTop: 8 },
    imagePreviewWrap: { flex: 1, position: 'relative' },
    imagePreview: { width: '100%', height: '100%' },
    imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    changePhotoText: { fontFamily: fonts.bold, color: 'white', marginTop: 4 },

    form: { gap: 20 },
    inputGroup: { gap: 8 },
    fieldLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1 },
    titleInput: { fontFamily: fonts.bold, fontSize: 24, paddingVertical: 8 },
    datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
    dateText: { fontFamily: fonts.semibold, fontSize: 15 },
    locationWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
    locationInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15 },
    descInput: { fontFamily: fonts.regular, fontSize: 16, padding: 16, borderRadius: 16, minHeight: 120, textAlignVertical: 'top' },
    pickerContainer: {
        borderRadius: 16,
        marginTop: 8,
        overflow: 'hidden',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 12,
        borderBottomWidth: 1,
    },
    pickerDoneText: {
        fontFamily: fonts.bold,
        fontSize: 15,
    },
});
