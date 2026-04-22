import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Alert,
    ActivityIndicator, SafeAreaView, Dimensions, TextInput,
    KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
    Animated, ScrollView, DeviceEventEmitter, FlatList, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { spacing, fonts, radii } from '../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { uploadMultipleMedia } from '../src/api/upload';
import { createStory } from '../src/api/stories';
import { getFriendsList } from '../src/api/friends';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../src/context/LanguageContext';
import { useTheme } from '../src/context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function StoryUploadScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { language, t } = useLanguage();
    
    const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
    const [mode, setMode] = useState<'media' | 'text'>('media');
    const [textStatus, setTextStatus] = useState('');
    const [bgIndex, setBgIndex] = useState(0);
    const [textColorIndex, setTextColorIndex] = useState(0);
    
    const [caption, setCaption] = useState('');
    const [mentions, setMentions] = useState<{ id: string, username: string, avatar: string }[]>([]);
    const [showMentionModal, setShowMentionModal] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
    const [loading, setLoading] = useState(false);
    const [isMediaReady, setIsMediaReady] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const cameraScale = useRef(new Animated.Value(0.9)).current;
    const libraryScale = useRef(new Animated.Value(0.9)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const PRESET_BGS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#000000', '#6366F1'];
    const PRESET_TEXT = ['#FFFFFF', '#000000', '#FEF3C7', '#BAE6FD', '#D1FAE5', '#FBCFE8', '#DDD6FE', '#F3F4F6'];


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
        if (status !== 'granted') {
            return Alert.alert(t('status_permission_needed'), t('status_camera_access_denied'));
        }
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
        if (mode === 'media' && !media) return;
        if (mode === 'text' && !textStatus.trim()) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setLoading(true);
        try {
            let finalMediaUrl = '';
            let finalMediaType = 'text';
            let finalContent = mode === 'text' ? textStatus.trim() : caption.trim();

            if (mode === 'media' && media) {
                const uploadRes = await uploadMultipleMedia([{ uri: media.uri, type: media.type }]);
                finalMediaUrl = uploadRes[0].url;
                finalMediaType = uploadRes[0].type;
            } else {
                // For text stories, we can encode the theme in the content
                // using a prefix that the feed can parse
                const themeData = JSON.stringify({ bg: PRESET_BGS[bgIndex], color: PRESET_TEXT[textColorIndex] });
                finalContent = `__JSON_STORY__${themeData}__${textStatus.trim()}`;
                finalMediaUrl = 'text_story'; // Sentinel value
            }

            if (mentions.length > 0) {
                const mentionsData = JSON.stringify(mentions.map(m => ({ u: m.username, a: m.avatar, id: m.id })));
                finalContent += `__MENTIONS__${mentionsData}`;
            }

            await createStory({
                media_url: finalMediaUrl,
                media_type: finalMediaType,
                content: finalContent,
                latitude: location?.latitude,
                longitude: location?.longitude,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Emit event and close immediately
            DeviceEventEmitter.emit('storyPosted');
            router.back();
        } catch (e: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t('error'), e.message || t('setup_something_went_wrong'));
        } finally {
            setLoading(false);
        }
    };

    const handleDiscard = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMedia(null);
        setMode('media');
        setTextStatus('');
        setCaption('');
        setMentions([]);
        setIsMediaReady(false);
        setShowMentionModal(false);
    };

    const handleMention = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowMentionModal(true);
        if (friends.length === 0) {
            setFriendsLoading(true);
            try {
                const res = await getFriendsList();
                if (res?.data) {
                    setFriends(res.data);
                }
            } catch (e) {
                console.log('Failed to fetch friends', e);
            } finally {
                setFriendsLoading(false);
            }
        }
    };

    const selectMention = (friendInfo: any) => {
        // friendInfo could be friend or user depending on relationship direction from getFriendsList
        const user = friendInfo.friend || friendInfo.user;
        const validUsername = user?.username || user?.name || t('user_fallback');
        const validId = user?.id;
        const validAvatar = user?.avatar_url || '';

        if (validId && !mentions.find(m => m.id === validId)) {
            setMentions(prev => [...prev, { id: validId, username: validUsername, avatar: validAvatar }]);
        }
        setShowMentionModal(false);
    };

    const removeMention = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMentions(prev => prev.filter(m => m.id !== id));
    };

    const cycleBg = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBgIndex((prev) => (prev + 1) % PRESET_BGS.length);
    };

    const cycleTextColor = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTextColorIndex((prev) => (prev + 1) % PRESET_TEXT.length);
    };

    // ─── PREVIEW / TEXT EDITOR ──────────────────────────────────
    if (media || mode === 'text') {
        return (
            <View style={[styles.container, mode === 'text' && { backgroundColor: PRESET_BGS[bgIndex] }]}>
                <StatusBar style="light" />

                {media && (
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
                )}

                {/* Loading overlay for heavy media */}
                {media && !isMediaReady && (
                    <View style={styles.mediaLoader}>
                        <ActivityIndicator size="large" color="white" />
                        <Text style={styles.mediaLoaderText}>{t('status_preview_loading')}</Text>
                    </View>
                )}

                {/* Top + Bottom gradients (Only for media) */}
                {media && (
                    <>
                        <LinearGradient
                            colors={['rgba(0,0,0,0.65)', 'transparent']}
                            style={styles.topGrad}
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.85)']}
                            style={styles.bottomGrad}
                        />
                    </>
                )}

                {/* Overlay UI */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <SafeAreaView style={styles.overlayContainer}>
                            {/* Header */}
                            <View style={styles.previewHeader}>
                                <TouchableOpacity onPress={handleDiscard} style={styles.iconButton}>
                                    <Ionicons name="close" size={26} color="white" />
                                </TouchableOpacity>

                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity onPress={handleMention} style={styles.iconButton}>
                                        <Ionicons name="at" size={24} color="white" />
                                    </TouchableOpacity>
                                    {mode === 'text' ? (
                                        <>
                                            <TouchableOpacity onPress={cycleBg} style={styles.iconButton}>
                                                <Ionicons name="color-palette" size={24} color="white" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={cycleTextColor} style={styles.iconButton}>
                                                <Text style={{ color: 'white', fontFamily: fonts.bold, fontSize: 20 }}>Aa</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <View style={styles.headerPill}>
                                            <View style={[styles.liveIndicator, { backgroundColor: media.type === 'video' ? '#EF4444' : '#22C55E' }]} />
                                            <Text style={styles.headerPillText}>
                                                {media.type === 'video' ? t('video_label') : t('photo_label')}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Mentions Display */}
                            {mentions.length > 0 && (
                                <View style={styles.mentionsRow}>
                                    {mentions.map(m => (
                                        <TouchableOpacity key={m.id} onPress={() => removeMention(m.id)} style={styles.mentionChip}>
                                            <Text style={styles.mentionChipText}>@{m.username}</Text>
                                            <Ionicons name="close-circle" size={14} color="rgba(255,255,255,0.6)" />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Center Content for Text Mode */}
                            {mode === 'text' && (
                                <Animated.View style={[styles.textModeContainer, { opacity: fadeAnim }]}>
                                    <TextInput
                                        style={[styles.textStatusInput, { color: PRESET_TEXT[textColorIndex] }]}
                                        placeholder={t('status_text_placeholder')}
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                        value={textStatus}
                                        onChangeText={setTextStatus}
                                        multiline
                                        autoFocus
                                        selectionColor={PRESET_TEXT[textColorIndex]}
                                        keyboardAppearance="dark"
                                    />
                                </Animated.View>
                            )}

                            {/* Footer */}
                            <View style={styles.previewFooter}>
                                {mode === 'media' && (
                                    <View style={styles.captionRow}>
                                        <View style={styles.inputPrefix}>
                                            <Ionicons name="text-outline" size={20} color="rgba(255,255,255,0.6)" />
                                        </View>
                                        <TextInput
                                            style={styles.captionInput}
                                            placeholder={t('status_caption_placeholder')}
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
                                )}

                                <TouchableOpacity
                                    style={[styles.shareBtn, loading && { opacity: 0.7 }]}
                                    onPress={handleUpload}
                                    disabled={loading || (mode === 'text' && !textStatus.trim())}
                                    activeOpacity={0.8}
                                >
                                    {loading ? (
                                        <View style={styles.loadingRow}>
                                            <ActivityIndicator color="white" size="small" />
                                            <Text style={styles.shareBtnText}>{t('status_uploading')}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.loadingRow}>
                                            <Ionicons name="paper-plane" size={18} color="white" />
                                            <Text style={styles.shareBtnText}>{t('status_share_cta')}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>
                    </TouchableWithoutFeedback>

                    {/* Mention Modal */}
                    <Modal visible={showMentionModal} transparent animationType="slide" onRequestClose={() => setShowMentionModal(false)}>
                        <View style={styles.mentionModalOverlay}>
                            <View style={styles.mentionSheet}>
                                <View style={styles.sheetHandle} />
                                <Text style={styles.sheetTitle}>{t('status_mention_title')}</Text>
                                <Ionicons 
                                    name="close" 
                                    size={24} 
                                    color="white" 
                                    style={styles.sheetCloseBtn} 
                                    onPress={() => setShowMentionModal(false)}
                                />
                                
                                {friendsLoading ? (
                                    <ActivityIndicator size="small" color="#fff" style={{ marginTop: 20 }} />
                                ) : friends.length === 0 ? (
                                    <Text style={styles.noFriendsText}>{t('status_mention_empty')}</Text>
                                ) : (
                                    <FlatList
                                        data={friends}
                                        keyExtractor={item => item.id}
                                        style={{ maxHeight: height * 0.5 }}
                                        renderItem={({ item }) => {
                                            const user = item.friend || item.user;
                                            return (
                                                <TouchableOpacity style={styles.friendRow} onPress={() => selectMention(item)}>
                                                    <Image source={{ uri: user?.avatar_url }} style={styles.friendAvatar} />
                                                    <Text style={styles.friendName}>{user?.name} <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>@{user?.username}</Text></Text>
                                                </TouchableOpacity>
                                            );
                                        }}
                                    />
                                )}
                            </View>
                        </View>
                    </Modal>
                </KeyboardAvoidingView>
            </View>
        );
    }

    // ─── INDEX / SETUP SCREEN ──────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <LinearGradient
                colors={isDark ? ['#0F0F1A', '#000000'] : ['#FFFFFF', '#F8FAFC']}
                style={StyleSheet.absoluteFillObject}
            />

            <SafeAreaView style={styles.setupSafe}>
                {/* Header */}
                <View style={styles.setupHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.closeCircle, { backgroundColor: colors.gray100 }]} activeOpacity={0.7}>
                        <Ionicons name="close" size={24} color={colors.black} />
                    </TouchableOpacity>
                </View>

                {/* Center Content - Immersive Branding */}
                <Animated.View style={[styles.brandBlock, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <Animated.View style={[styles.heroBadge, { transform: [{ scale: pulseAnim }] }]}>
                        <LinearGradient
                            colors={['#A154F2', '#9CA3AF', '#000000']}
                            style={styles.heroBadgeGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="flash" size={32} color="white" />
                        </LinearGradient>
                    </Animated.View>
                    
                    <Text style={[styles.heroTitle, { color: colors.black }]}>{t('status_new_title')}</Text>
                    <Text style={[styles.heroSub, { color: colors.gray500 }]}>{t('status_new_subtitle')}</Text>
                </Animated.View>

                {/* Bottom Action Bar - Camera/Library Focus */}
                <View style={styles.setupFooter}>
                    <View style={styles.actionRowUnified}>
                        {/* Library Shortcut */}
                        <Animated.View style={{ transform: [{ scale: libraryScale }] }}>
                            <TouchableOpacity onPress={pickMedia} activeOpacity={0.7} style={[styles.sideActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Ionicons name="images" size={26} color={colors.black} />
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Main Camera Shutter Button */}
                        <Animated.View style={{ transform: [{ scale: cameraScale }] }}>
                            <TouchableOpacity onPress={takeMedia} activeOpacity={0.8} style={[styles.shutterContainer, { borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)' }]}>
                                <View style={styles.shutterOuter}>
                                    <LinearGradient
                                        colors={isDark ? ['#ffffff', '#f3f4f6'] : ['#1F2937', '#111827']}
                                        style={styles.shutterInner}
                                    />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Text Mode Toggle */}
                        <Animated.View style={{ transform: [{ scale: libraryScale }] }}>
                            <TouchableOpacity 
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode('text'); }} 
                                activeOpacity={0.7} 
                                style={[styles.sideActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            >
                                <Ionicons name="text" size={26} color={colors.black} />
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    <View style={styles.hintRow}>
                        <Ionicons name="time-outline" size={14} color={colors.gray400} />
                        <Text style={[styles.hintText, { color: colors.gray400 }]}>{t('status_expiry_hint')}</Text>
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
        paddingTop: Platform.OS === 'ios' ? 12 : 0,
    },
    closeCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    brandBlock: {
        alignItems: 'center',
        paddingHorizontal: 54,
        marginBottom: 40,
    },
    heroBadge: {
        marginBottom: 24,
    },
    heroBadgeGradient: {
        width: 72,
        height: 72,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#A154F2',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
    },
    heroTitle: {
        color: 'white',
        fontFamily: fonts.bold,
        fontSize: 32,
        letterSpacing: -0.5,
        marginBottom: 10,
    },
    heroSub: {
        color: 'rgba(255,255,255,0.5)',
        fontFamily: fonts.medium,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },

    setupFooter: {
        paddingHorizontal: spacing.xl,
        paddingBottom: Platform.OS === 'android' ? 32 : 16,
    },
    actionRowUnified: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        marginBottom: 24,
    },
    shutterContainer: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shutterOuter: {
        width: 74,
        height: 74,
        borderRadius: 37,
        padding: 4,
    },
    shutterInner: {
        flex: 1,
        borderRadius: 35,
    },
    sideActionBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    hintText: {
        color: 'rgba(255,255,255,0.4)',
        fontFamily: fonts.medium,
        fontSize: 12,
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
        paddingTop: Platform.OS === 'ios' ? 20 : 32,
        paddingBottom: Platform.OS === 'ios' ? 20 : 44,
    },
    keyboardView: {
        flex: 1,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
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
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
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
        gap: 16,
        paddingHorizontal: 20,
        marginBottom: Platform.OS === 'ios' ? 0 : 20,
    },
    captionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 14,
        gap: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.12)',
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
        backgroundColor: '#000000',
        borderRadius: 26,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    shareBtnText: {
        color: 'white',
        fontFamily: fonts.bold,
        fontSize: 15,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mentionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 20,
        marginTop: 10,
    },
    mentionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    mentionChipText: {
        color: 'white',
        fontFamily: fonts.medium,
        fontSize: 13,
    },
    mentionModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    mentionSheet: {
        backgroundColor: 'rgba(20,20,20,0.98)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetTitle: {
        color: 'white',
        fontFamily: fonts.bold,
        fontSize: 18,
        marginBottom: 16,
        textAlign: 'center',
    },
    sheetCloseBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
    },
    friendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    friendAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    friendName: {
        flex: 1,
        color: 'white',
        fontFamily: fonts.medium,
        fontSize: 16,
    },
    noFriendsText: {
        color: 'rgba(255,255,255,0.5)',
        fontFamily: fonts.medium,
        textAlign: 'center',
        marginTop: 20,
    },
    textModeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        width: '100%',
    },
    textStatusInput: {
        fontFamily: fonts.bold,
        fontSize: 36,
        textAlign: 'center',
        width: '100%',
        paddingVertical: 20,
    },
});
