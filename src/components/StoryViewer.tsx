import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, Image, TouchableOpacity, SafeAreaView, Animated, Pressable, ActivityIndicator } from 'react-native';
import { colors, fonts, spacing } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { markStoryViewed, likeStory } from '../api/stories';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

interface StoryViewerProps {
    visible: boolean;
    stories: any[]; // Array of user story clusters { id, user, stories[] }
    initialUserIndex: number;
    onClose: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ visible, stories: allUsers = [], initialUserIndex = 0, onClose }) => {
    const { user: currentUser } = useAuth();
    const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [progress, setProgress] = useState(new Animated.Value(0));
    const [isPaused, setIsPaused] = useState(false);
    const [isMediaLoaded, setIsMediaLoaded] = useState(false);
    const [likedStories, setLikedStories] = useState<Record<string, boolean>>({});
    const likeAnim = useRef(new Animated.Value(0)).current;
    const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);

    // Reset user index when becoming visible
    useEffect(() => {
        if (visible) {
            setCurrentUserIndex(initialUserIndex);
            setCurrentStoryIndex(0);
        }
    }, [visible, initialUserIndex]);

    const userCluster = allUsers[currentUserIndex];
    const userStories = userCluster?.stories || [];
    const currentStory = userStories[currentStoryIndex];

    const toggleLike = async () => {
        if (!currentStory?.id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const storyId = currentStory.id;
        const isCurrentlyLiked = likedStories[storyId];

        if (!isCurrentlyLiked) {
            setLikedStories(prev => ({ ...prev, [storyId]: true }));
            await likeStory(storyId);
        }

        likeAnim.setValue(0);
        Animated.sequence([
            Animated.spring(likeAnim, { toValue: 1, useNativeDriver: true, friction: 3, tension: 40 }),
            Animated.timing(likeAnim, { toValue: 0, duration: 150, delay: 400, useNativeDriver: true })
        ]).start();
    };

    useEffect(() => {
        if (visible && currentStory?.id) {
            setIsMediaLoaded(false);
            if (currentStory.media_type === 'video') {
                stopProgress();
            } else {
                // For images, we wait for onLoad to set isMediaLoaded to true
                // which then triggers the useEffect below
            }
            markStoryViewed(currentStory.id);
            if (currentStory.is_liked) {
                setLikedStories(prev => ({ ...prev, [currentStory.id]: true }));
            }
        }
    }, [visible, currentUserIndex, currentStoryIndex]);

    // This effect ensures we start only AFTER the state has committed and media is confirmed
    useEffect(() => {
        if (visible && isMediaLoaded && currentStory?.media_type === 'image') {
            startProgress();
        }
    }, [isMediaLoaded, visible, currentStoryIndex]);

    const startProgress = () => {
        progress.setValue(0);
        if (currentStory?.media_type === 'image' && !isMediaLoaded) return;
        if (currentStory?.media_type === 'video') {
            stopProgress();
            return;
        }

        progressAnimation.current = Animated.timing(progress, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: false,
        });

        if (!isPaused) {
            progressAnimation.current.start(({ finished }) => {
                if (finished) nextStory();
            });
        }
    };

    const stopProgress = () => {
        progressAnimation.current?.stop();
    };

    const togglePause = (paused: boolean) => {
        setIsPaused(paused);
        if (paused) {
            stopProgress();
        } else {
            if (currentStory?.media_type === 'video') return;
            const remaining = 1 - (progress as any)._value;
            progressAnimation.current = Animated.timing(progress, {
                toValue: 1,
                duration: 5000 * remaining,
                useNativeDriver: false,
            });
            progressAnimation.current.start(({ finished }) => {
                if (finished) nextStory();
            });
        }
    };

    const nextStory = () => {
        if (currentStoryIndex < userStories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else {
            // Move to next user
            if (currentUserIndex < allUsers.length - 1) {
                setCurrentUserIndex(prev => prev + 1);
                setCurrentStoryIndex(0);
            } else {
                onClose();
            }
        }
    };

    const prevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
        } else {
            // Move to prev user
            if (currentUserIndex > 0) {
                const prevUser = allUsers[currentUserIndex - 1];
                setCurrentUserIndex(prev => prev - 1);
                setCurrentStoryIndex((prevUser.stories?.length || 1) - 1);
            } else {
                setCurrentStoryIndex(0);
            }
        }
    };

    const [touchStartX, setTouchStartX] = useState(0);

    const onTouchStart = (e: any) => {
        setTouchStartX(e.nativeEvent.pageX);
    };

    const onTouchEnd = (e: any) => {
        const x = e.nativeEvent.pageX;
        // Swipe Detection (only if it was a real drag, not a tap)
        if (Math.abs(x - touchStartX) > 40) {
            if (touchStartX - x > 40) { // Swipe left -> next user
                if (currentUserIndex < allUsers.length - 1) {
                    setCurrentUserIndex(prev => prev + 1);
                    setCurrentStoryIndex(0);
                } else {
                    onClose();
                }
            } else if (x - touchStartX > 40) { // Swipe right -> prev user
                if (currentUserIndex > 0) {
                    const prevUser = allUsers[currentUserIndex - 1];
                    setCurrentUserIndex(prev => prev - 1);
                    setCurrentStoryIndex((prevUser.stories?.length || 1) - 1);
                }
            }
            return true; // Handled
        }
        return false; // Not handled (was a tap)
    };

    const handlePress = (evt: any) => {
        if (onTouchEnd(evt)) return; // If it was a swipe, don't tap
        
        const x = evt.nativeEvent.locationX;
        if (x < width / 3) prevStory();
        else nextStory();
    };

    if (!visible || !userCluster) return null;

    return (
        <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
            <View style={styles.container}>
                <StatusBar style="light" />
                <Pressable
                    onPress={handlePress}
                    onPressIn={onTouchStart}
                    onLongPress={() => togglePause(true)}
                    onPressOut={() => isPaused && togglePause(false)}
                    style={styles.content}
                >
                    {currentStory?.media_type === 'video' ? (
                        <Video
                            source={{ uri: currentStory.media_url }}
                            style={styles.image}
                            resizeMode={ResizeMode.CONTAIN}
                            shouldPlay={!isPaused && visible && isMediaLoaded}
                            isLooping={false}
                            onReadyForDisplay={() => setIsMediaLoaded(true)}
                            onPlaybackStatusUpdate={(status: any) => {
                                if (status.isLoaded && status.durationMillis) {
                                    const p = status.positionMillis / status.durationMillis;
                                    progress.setValue(p);
                                    if (status.didJustFinish) nextStory();
                                }
                            }}
                        />
                    ) : (
                        <Image 
                            source={{ uri: currentStory?.media_url }} 
                            style={styles.image} 
                            resizeMode="contain" 
                            onLoad={() => setIsMediaLoaded(true)}
                        />
                    )}

                    <Animated.View style={[styles.centeredOverlay, { transform: [{ scale: likeAnim }], opacity: likeAnim }]}>
                        <Ionicons name="heart" size={100} color={colors.white} />
                    </Animated.View>

                    {!isMediaLoaded && (
                        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.black }]}>
                            <ActivityIndicator size="large" color={colors.white} />
                        </View>
                    )}

                    <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.topGradient} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.bottomGradient} />

                    <SafeAreaView style={styles.overlay} pointerEvents="box-none">
                        <View style={styles.progressRow}>
                            {userStories.map((_: any, index: number) => (
                                <View key={index} style={styles.progressBackground}>
                                    <Animated.View
                                        style={[
                                            styles.progressBar,
                                            {
                                                width: index === currentStoryIndex
                                                    ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                                                    : index < currentStoryIndex ? '100%' : '0%'
                                            }
                                        ]}
                                    />
                                </View>
                            ))}
                        </View>

                        <View style={styles.header}>
                            <View style={styles.userInfo}>
                                <Image source={{ uri: userCluster.user?.avatar_url || currentStory?.profiles?.avatar_url }} style={styles.userAvatar} />
                                <View>
                                    <Text style={styles.userName}>{userCluster.user?.name || 'User'}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.locationName}>
                                            {currentStory?.created_at ? `${Math.max(1, Math.floor((new Date(currentStory.created_at).getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60)))}h left` : '24h left'}
                                        </Text>
                                        <View style={[styles.mediaBadge, { backgroundColor: currentStory?.media_type === 'video' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.15)' }]}>
                                            <Ionicons name={currentStory?.media_type === 'video' ? 'videocam' : 'image'} size={8} color="white" />
                                            <Text style={styles.mediaBadgeText}>{currentStory?.media_type === 'video' ? 'VIDEO' : 'PHOTO'}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={28} color={colors.white} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.captionRow}>
                            {currentStory?.content && (
                                <View style={styles.captionContainer}>
                                    <Text style={styles.captionText}>{currentStory.content}</Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.likeBtn, likedStories[currentStory?.id] && styles.likedBtn]}
                                onPress={toggleLike}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={likedStories[currentStory?.id] ? "heart" : "heart-outline"}
                                    size={28}
                                    color={colors.white}
                                />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </Pressable>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.black },
    content: { flex: 1 },
    image: { width: width, height: height },
    overlay: { ...StyleSheet.absoluteFillObject },
    topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
    bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 },
    progressRow: { flexDirection: 'row', paddingHorizontal: spacing.sm, marginTop: 10 },
    progressBackground: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 2, borderRadius: 1, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: colors.white },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginTop: spacing.md },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    userAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
    userName: { color: colors.white, fontFamily: fonts.bold, fontSize: 14 },
    locationName: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    mediaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },
    mediaBadgeText: { fontFamily: fonts.bold, fontSize: 8, color: 'white', letterSpacing: 0.5 },
    closeBtn: { padding: 8 },
    centeredOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 20, pointerEvents: 'none' },
    captionRow: {
        position: 'absolute',
        bottom: 40,
        left: spacing.md,
        right: spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
    },
    captionContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 12,
        borderRadius: 16,
        maxWidth: width * 0.7,
    },
    captionText: { color: colors.white, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
    likeBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.3)',
        minWidth: 48,
    },
    likedBtn: {
        backgroundColor: 'rgba(0, 163, 255, 0.4)',
    },
});

export default StoryViewer;
