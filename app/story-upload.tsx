import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Alert,
    ActivityIndicator, SafeAreaView, Dimensions, TextInput,
    KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
    Animated, ScrollView, DeviceEventEmitter
} from 'react-native';
import { useRouter } from 'expo-router';
import { spacing, fonts, radii } from '../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { uploadMultipleMedia } from '../src/api/upload';
import { createStory } from '../src/api/stories';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../src/context/LanguageContext';

const { width, height } = Dimensions.get('window');

export default function StoryUploadScreen() {
    const router = useRouter();
    const { language } = useLanguage();
    const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
    const [loading, setLoading] = useState(false);
    const [isMediaReady, setIsMediaReady] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const cameraScale = useRef(new Animated.Value(0.9)).current;
    const libraryScale = useRef(new Animated.Value(0.9)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const copy = {
        setupTitle: language === 'tr' ? 'Yeni An' : language === 'ka' ? 'ახალი მომენტი' : 'New Moment',
        setupSub: language === 'tr'
            ? 'Bir anı çek ya da seç ve arkadaşlarınla paylaş'
            : language === 'ka'
                ? 'გადაიღე ან აირჩიე მომენტი და გაუზიარე მეგობრებს'
                : 'Capture or choose a moment to share to your friends',
        discard: language === 'tr' ? 'Sil' : language === 'ka' ? 'გაუქმება' : 'Discard',
        video: language === 'tr' ? 'Video' : language === 'ka' ? 'ვიდეო' : 'Video',
        photo: language === 'tr' ? 'Foto' : language === 'ka' ? 'ფოტო' : 'Photo',
        caption: language === 'tr' ? 'Açıklama ekle…' : language === 'ka' ? 'დაამატე აღწერა…' : 'Add a caption…',
        uploading: language === 'tr' ? 'Yukleniyor…' : language === 'ka' ? 'იტვირთება…' : 'Uploading…',
        share: language === 'tr' ? 'Ani Paylas' : language === 'ka' ? 'მომენტის გაზიარება' : 'Share Moment',
        openCamera: language === 'tr' ? 'Kamerayi Ac' : language === 'ka' ? 'კამერის გახსნა' : 'Open Camera',
        openCameraSub: language === 'tr' ? 'Foto cek ya da video kaydet' : language === 'ka' ? 'გადაიღე ფოტო ან ვიდეო' : 'Take a photo or record a video',
        fromLibrary: language === 'tr' ? 'Kutuphane' : language === 'ka' ? 'გალერეიდან' : 'From Library',
        fromLibrarySub: language === 'tr' ? 'Foto ya da video sec' : language === 'ka' ? 'აირჩიე ფოტო ან ვიდეო' : 'Choose a photo or video',
        storiesHint: language === 'tr' ? 'Hikayeler 24 saat sonra kaybolur' : language === 'ka' ? 'სტორი 24 საათში ქრება' : 'Stories disappear after 24 hours',
        previewLoading: language === 'tr' ? 'Onizleme yukleniyor…' : language === 'ka' ? 'გადახედვა იტვირთება…' : 'Loading preview…',
    };

    useEffect(() => {
        // Entry animation
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
            Animated.spring(cameraScale, { toValue: 1, tension: 80, friction: 8, delay: 200, useNativeDriver: true }),
            Animated.spring(libraryScale, { toValue: 1, tension: 80, friction: 8, delay: 350, useNativeDriver: true }),
        ]).start();

        // Pulsing icon animation  
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        (async () => {
            const { status: lStat } = await Location.requestForegroundPermissionsAsync();
            if (lStat === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setLocation(loc.coords);
            }
        })();
    }, []);

    // Reset media-ready state when media changes
    useEffect(() => {
        setIsMediaReady(false);
    }, [media?.uri]);

    const pickMedia = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            allowsEditing: false,
            quality: 0.9,
        });
        if (!result.canceled) {
            setMedia({ uri: result.assets[0].uri, type: result.assets[0].type as 'image' | 'video' });
        }
    };

    const takeMedia = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission Needed', 'Camera access is required to capture moments.');
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images', 'videos'],
            allowsEditing: false,
            quality: 0.9,
        });
        if (!result.canceled) {
            setMedia({ uri: result.assets[0].uri, type: result.assets[0].type as 'image' | 'video' });
        }
    };

    const handleUpload = async () => {
        if (!media) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setLoading(true);
        try {
            const uploadRes = await uploadMultipleMedia([{ uri: media.uri, type: media.type }]);
            const media_url = uploadRes[0].url;
            const media_type = uploadRes[0].type;

            await createStory({
                media_url,
                media_type,
                content: caption.trim(),
                latitude: location?.latitude,
                longitude: location?.longitude,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Emit event and close immediately
            DeviceEventEmitter.emit('storyPosted');
            router.back();
        } catch (e: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Upload Failed', e.message || 'Something went wrong. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDiscard = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMedia(null);
        setCaption('');
        setIsMediaReady(false);
    };

    // ─── PREVIEW SCREEN ────────────────────────────────────────
    if (media) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />

                {/* Media */}
                {/* Media with Native Zoom */}
                <ScrollView
                    style={styles.fullMedia}
                    contentContainerStyle={{ width, height }}
                    maximumZoomScale={3}
                    minimumZoomScale={1}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    centerContent={true}
                    scrollEventThrottle={16}
                >
                    {media.type === 'video' ? (
                        <Video
                            source={{ uri: media.uri }}
                            style={styles.fullMedia}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={isMediaReady}
                            isLooping
                            isMuted={false}
                            onReadyForDisplay={() => setIsMediaReady(true)}
                        />
                    ) : (
                        <Image
                            source={{ uri: media.uri }}
                            style={styles.fullMedia}
                            resizeMode="cover"
                            onLoad={() => setIsMediaReady(true)}
                        />
                    )}
                </ScrollView>

                {/* Loading overlay for heavy media */}
                {!isMediaReady && (
                    <View style={styles.mediaLoader}>
                        <ActivityIndicator size="large" color="white" />
                        <Text style={styles.mediaLoaderText}>{copy.previewLoading}</Text>
                    </View>
                )}

                {/* Top + Bottom gradients */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.65)', 'transparent']}
                    style={styles.topGrad}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.bottomGrad}
                />

                {/* Overlay UI */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={StyleSheet.absoluteFillObject}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <SafeAreaView style={styles.overlayContainer}>
                            {/* Header */}
                            <View style={styles.previewHeader}>
                                <TouchableOpacity onPress={handleDiscard} style={styles.headerPill}>
                                    <Ionicons name="arrow-back" size={20} color="white" />
                                    <Text style={styles.headerPillText}>{copy.discard}</Text>
                                </TouchableOpacity>

                                <View style={styles.headerPill}>
                                    <View style={[styles.liveIndicator, { backgroundColor: media.type === 'video' ? '#EF4444' : '#22C55E' }]} />
                                    <Text style={styles.headerPillText}>
                                        {media.type === 'video' ? copy.video : copy.photo}
                                    </Text>
                                </View>

                            </View>

                            {/* Footer */}
                            <View style={styles.previewFooter}>
                                <View style={styles.captionRow}>
                                    <View style={styles.inputPrefix}>
                                        <Ionicons name="text-outline" size={20} color="rgba(255,255,255,0.6)" />
                                    </View>
                                    <TextInput
                                        style={styles.captionInput}
                                        placeholder={copy.caption}
                                        placeholderTextColor="rgba(255,255,255,0.45)"
                                        value={caption}
                                        onChangeText={setCaption}
                                        multiline
                                        returnKeyType="done"
                                        onSubmitEditing={() => Keyboard.dismiss()}
                                        blurOnSubmit
                                        textAlignVertical="center"
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.shareBtn}
                                    onPress={handleUpload}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={loading ? ['#6B21A8', '#4C1D95'] : ['#A855F7', '#7C3AED']}
                                        style={styles.shareBtnGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        {loading ? (
                                            <View style={styles.loadingRow}>
                                                <ActivityIndicator color="white" size="small" />
                                                <Text style={styles.shareBtnText}>{copy.uploading}</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.loadingRow}>
                                                <Ionicons name="paper-plane" size={20} color="white" />
                                                <Text style={styles.shareBtnText}>{copy.share}</Text>
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </View>
        );
    }

    // ─── INDEX / SETUP SCREEN ──────────────────────────────────
    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#1E1B4B', '#0F0A2E', '#000000']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
            />

            <SafeAreaView style={styles.setupSafe}>
                {/* Close */}
                <View style={styles.setupHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeCircle} activeOpacity={0.7}>
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Center Content */}
                <Animated.View style={[styles.centerBlock, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    {/* Pulsing Icon */}
                    <Animated.View style={[styles.heroIconWrap, { transform: [{ scale: pulseAnim }] }]}>
                        <LinearGradient
                            colors={['#A855F7', '#6D28D9', '#4C1D95']}
                            style={styles.heroIconGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="sparkles" size={44} color="white" />
                        </LinearGradient>
                    </Animated.View>

                    <Text style={styles.heroTitle}>{copy.setupTitle}</Text>
                    <Text style={styles.heroSub}>
                        {copy.setupSub}
                    </Text>
                </Animated.View>

                {/* Action Buttons */}
                <View style={styles.actionsBlock}>
                    {/* Camera — Primary CTA */}
                    <Animated.View style={[styles.actionCardWrap, { transform: [{ scale: cameraScale }] }]}>
                        <TouchableOpacity onPress={takeMedia} activeOpacity={0.85} style={styles.actionCard}>
                            <LinearGradient
                                colors={['#A855F7', '#7C3AED']}
                                style={styles.actionCardGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.actionIconCircle}>
                                    <Ionicons name="camera" size={28} color="#A855F7" />
                                </View>
                                <View style={styles.actionTextBlock}>
                                    <Text style={styles.actionTitle}>{copy.openCamera}</Text>
                                    <Text style={styles.actionDesc}>{copy.openCameraSub}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Library — Secondary CTA */}
                    <Animated.View style={[styles.actionCardWrap, { transform: [{ scale: libraryScale }] }]}>
                        <TouchableOpacity onPress={pickMedia} activeOpacity={0.85} style={styles.actionCard}>
                            <View style={styles.actionCardOutline}>
                                <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                    <Ionicons name="images" size={26} color="white" />
                                </View>
                                <View style={styles.actionTextBlock}>
                                    <Text style={styles.actionTitle}>{copy.fromLibrary}</Text>
                                    <Text style={[styles.actionDesc, { color: 'rgba(255,255,255,0.45)' }]}>{copy.fromLibrarySub}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Hint */}
                    <View style={styles.hintRow}>
                        <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.hintText}>{copy.storiesHint}</Text>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    // ─── Setup / Index ─────────────────────
    setupSafe: { flex: 1, justifyContent: 'space-between' },
    setupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: Platform.OS === 'android' ? 12 : 0,
    },
    closeCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    centerBlock: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    heroIconWrap: { marginBottom: 28 },
    heroIconGradient: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
    },
    heroTitle: {
        color: 'white',
        fontFamily: fonts.bold,
        fontSize: 34,
        letterSpacing: -1,
        marginBottom: 12,
    },
    heroSub: {
        color: 'rgba(255,255,255,0.55)',
        fontFamily: fonts.medium,
        fontSize: 17,
        textAlign: 'center',
        lineHeight: 26,
    },

    actionsBlock: {
        paddingHorizontal: spacing.lg,
        paddingBottom: Platform.OS === 'android' ? 32 : 16,
        gap: 12,
    },
    actionCardWrap: {},
    actionCard: { borderRadius: 22, overflow: 'hidden' },
    actionCardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        gap: 16,
    },
    actionCardOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        gap: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    actionIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTextBlock: { flex: 1 },
    actionTitle: {
        color: 'white',
        fontFamily: fonts.bold,
        fontSize: 17,
        marginBottom: 2,
    },
    actionDesc: {
        color: 'rgba(255,255,255,0.7)',
        fontFamily: fonts.regular,
        fontSize: 13,
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingTop: 8,
    },
    hintText: {
        color: 'rgba(255,255,255,0.3)',
        fontFamily: fonts.medium,
        fontSize: 13,
    },

    // ─── Preview ───────────────────────────
    fullMedia: {
        ...StyleSheet.absoluteFillObject,
        width,
        height,
    },
    mediaLoader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        gap: 14,
    },
    mediaLoaderText: {
        color: 'rgba(255,255,255,0.5)',
        fontFamily: fonts.medium,
        fontSize: 14,
    },
    topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
    bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 260 },

    overlayContainer: {
        flex: 1,
        justifyContent: 'space-between',
        padding: spacing.xl,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    headerPillText: {
        color: 'white',
        fontFamily: fonts.semibold,
        fontSize: 14,
    },
    liveIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    previewFooter: {
        gap: 14,
        marginBottom: Platform.OS === 'android' ? 16 : 0,
    },
    captionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    inputPrefix: {
        height: 24,
        width: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 2,
    },
    captionInput: {
        flex: 1,
        color: 'white',
        fontFamily: fonts.regular,
        fontSize: 16,
        maxHeight: 80,
        paddingTop: Platform.OS === 'ios' ? 0 : 4,
        textAlignVertical: 'center',
    },
    successToast: {
        position: 'absolute',
        bottom: 120,
        left: spacing.xl,
        right: spacing.xl,
        height: 54,
        borderRadius: 27,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    toastGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 20,
    },
    toastText: {
        color: 'white',
        fontFamily: fonts.bold,
        fontSize: 15,
    },
    shareBtn: {
        borderRadius: 28,
        overflow: 'hidden',
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 10,
    },
    shareBtnGradient: {
        height: 58,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareBtnText: {
        color: 'white',
        fontFamily: fonts.bold,
        fontSize: 17,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
});
