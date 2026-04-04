import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, SafeAreaView, Dimensions, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fonts, radii } from '../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { uploadMultipleMedia } from '../src/api/upload';
import { createStory } from '../src/api/stories';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function StoryUploadScreen() {
    const router = useRouter();
    const [media, setMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
    const [loading, setLoading] = useState(false);
    const [hotspot, setHotspot] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const { status: lStat } = await Location.requestForegroundPermissionsAsync();
            if (lStat === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setLocation(loc.coords);
                // In a real app, we'd call a backend to check if this coordinate is a hotspot
                // For MVP, we'll assume they're at a hotspot if they're near campus coords
                setHotspot("Campus Center"); 
            }
        })();
    }, []);

    const pickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            allowsEditing: true,
            aspect: [9, 16],
            quality: 0.8,
        });

        if (!result.canceled) {
            setMedia({ uri: result.assets[0].uri, type: result.assets[0].type as 'image' | 'video' });
        }
    };

    const takeMedia = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Error', 'Camera permission required');
        
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images', 'videos'],
            allowsEditing: true,
            aspect: [9, 16],
            quality: 0.8,
        });

        if (!result.canceled) {
            setMedia({ uri: result.assets[0].uri, type: result.assets[0].type as 'image' | 'video' });
        }
    };

    const handleUpload = async () => {
        if (!media) return Alert.alert('Error', 'Please capture or select a moment.');
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
                longitude: location?.longitude
            });

            Alert.alert('Success', 'Your Moment is now live!', [
                { text: 'Great', onPress: () => router.back() }
            ]);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            {media ? (
                <View style={styles.previewContainer}>
                    {media.type === 'video' ? (
                        <Video
                            source={{ uri: media.uri }}
                            style={styles.previewImage}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay
                            isLooping
                            isMuted={false}
                        />
                    ) : (
                        <Image source={{ uri: media.uri }} style={styles.previewImage} resizeMode="cover" />
                    )}
                    
                    <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={StyleSheet.absoluteFillObject}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <SafeAreaView style={styles.previewOverlay}>
                                <View style={styles.previewHeader}>
                                    <TouchableOpacity onPress={() => setMedia(null)} style={styles.backBtn}>
                                        <Ionicons name="close" size={28} color="white" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.previewFooter}>
                                    <View style={styles.captionBox}>
                                        <TextInput
                                            style={styles.captionInput}
                                            placeholder="Add a caption to this moment..."
                                            placeholderTextColor="rgba(255,255,255,0.6)"
                                            value={caption}
                                            onChangeText={setCaption}
                                            multiline
                                            returnKeyType="done"
                                            onSubmitEditing={() => Keyboard.dismiss()}
                                            blurOnSubmit={true}
                                        />
                                    </View>
                                    
                                    <TouchableOpacity 
                                        style={[styles.uploadBtn, loading && { opacity: 0.7 }]} 
                                        onPress={handleUpload}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <>
                                                <Text style={styles.uploadBtnText}>Share Moment</Text>
                                                <Ionicons name="paper-plane" size={18} color="white" style={{ marginLeft: 8 }} />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </SafeAreaView>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            ) : (
                <View style={[styles.setupContainer, { backgroundColor: colors.black }]}>
                    <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
                        <View style={styles.setupHeader}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                                <Ionicons name="close" size={28} color="white" />
                            </TouchableOpacity>
                            <Text style={styles.setupTitle}>Uni-POV Live</Text>
                            <View style={{ width: 28 }} />
                        </View>

                        <View style={styles.setupContent}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="flash-outline" size={48} color={colors.white} />
                            </View>
                            <Text style={styles.setupHero}>Your Moment, Live</Text>
                            <Text style={styles.setupSub}>Share what's happening right now with everyone on campus.</Text>
                        </View>

                        <View style={styles.setupFooter}>
                            <TouchableOpacity style={styles.primaryBtn} onPress={takeMedia} activeOpacity={0.8}>
                                <Ionicons name="camera" size={24} color="black" />
                                <View>
                                    <Text style={styles.primaryBtnText}>Open Camera</Text>
                                    <Text style={styles.btnSubText}>Capture a live moment</Text>
                                </View>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.secondaryBtn} onPress={pickMedia} activeOpacity={0.7}>
                                <View style={styles.libraryIconWrap}>
                                    <Ionicons name="images" size={20} color="white" />
                                </View>
                                <View>
                                    <Text style={styles.secondaryBtnText}>Choose from Library</Text>
                                    <Text style={[styles.btnSubText, { color: 'rgba(255,255,255,0.4)' }]}>Upload photo or video</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" style={{ marginLeft: 'auto' }} />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.black },
    setupContainer: { flex: 1, padding: spacing.xl },
    setupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    setupTitle: { color: 'white', fontFamily: fonts.bold, fontSize: 17, letterSpacing: 0.5 },
    setupContent: { alignItems: 'center', paddingHorizontal: 20 },
    iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    setupHero: { color: 'white', fontFamily: fonts.bold, fontSize: 24, textAlign: 'center', marginBottom: 12 },
    setupSub: { color: 'rgba(255,255,255,0.6)', fontFamily: fonts.regular, fontSize: 15, textAlign: 'center', lineHeight: 22 },
    setupFooter: { gap: 12, marginBottom: spacing.xl },
    primaryBtn: { backgroundColor: 'white', height: 68, borderRadius: 34, flexDirection: 'row', paddingHorizontal: 24, alignItems: 'center', gap: 16 },
    primaryBtnText: { fontFamily: fonts.bold, fontSize: 17, color: 'black' },
    secondaryBtn: { height: 68, borderRadius: 34, flexDirection: 'row', paddingHorizontal: 24, alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    secondaryBtnText: { fontFamily: fonts.semibold, fontSize: 16, color: 'white' },
    btnSubText: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(0,0,0,0.5)', marginTop: -2 },
    libraryIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    
    previewContainer: { flex: 1 },
    previewImage: { width: width, height: height, ...StyleSheet.absoluteFillObject },
    previewOverlay: { flex: 1, padding: spacing.lg },
    previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    hotspotBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
    hotspotText: { color: 'white', fontFamily: fonts.bold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    
    previewFooter: { marginTop: 'auto', gap: 16, marginBottom: 10 },
    captionBox: { borderRadius: radii.lg, padding: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.5)' },
    captionInput: { color: 'white', fontFamily: fonts.regular, fontSize: 16, maxHeight: 100 },
    uploadBtn: { backgroundColor: '#A154F2', height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    uploadBtnText: { color: 'white', fontFamily: fonts.bold, fontSize: 16 },
    closeBtn: { padding: 4 }
});
