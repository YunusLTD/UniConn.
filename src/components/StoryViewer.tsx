import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, Image, TouchableOpacity, SafeAreaView, Animated, Pressable, Alert } from 'react-native';
import { colors, fonts, spacing } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { markStoryViewed, likeStory, unlikeStory } from '../api/stories';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

interface StoryViewerProps {
    visible: boolean;
    event: any; // The POV Cluster
    onClose: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ visible, event, onClose }) => {
    const { user: currentUser } = useAuth();
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [progress, setProgress] = useState(new Animated.Value(0));
    const [isPaused, setIsPaused] = useState(false);
    const [showHint, setShowHint] = useState(true);
    const [showSmartJoin, setShowSmartJoin] = useState(false);
    const [likedStories, setLikedStories] = useState<Record<string, boolean>>({});
    const likeAnim = useRef(new Animated.Value(0)).current;
    const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);

    const toggleLike = async () => {
        if (!currentStory?.id) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const storyId = currentStory.id;
        const isCurrentlyLiked = likedStories[storyId];

        // Always play animation on like action (even if already liked, like IG)
        if (!isCurrentlyLiked) {
            // Optimistic UI for database state
            setLikedStories(prev => ({ ...prev, [storyId]: true }));
            await likeStory(storyId);
        }

        // Reset and play animation
        likeAnim.stopAnimation();
        likeAnim.setValue(0);
        Animated.sequence([
            Animated.spring(likeAnim, { toValue: 1, useNativeDriver: true, friction: 3, tension: 40 }),
            Animated.timing(likeAnim, { toValue: 0, duration: 150, delay: 400, useNativeDriver: true })
        ]).start(({ finished }) => {
            if (finished) likeAnim.setValue(0);
        });
    };
    
    const stories = event?.stories || [];
    const currentStory = stories[currentStoryIndex];

    useEffect(() => {
        if (visible && stories.length > 1) {
            setShowHint(true);
            const timer = setTimeout(() => setShowHint(false), 3000);
            return () => clearTimeout(timer);
        } else {
            setShowHint(false);
        }
    }, [visible, event?.id]);

    useEffect(() => {
        if (visible && stories.length > 0) {
            // Initialize liked state
            const initialLikes: Record<string, boolean> = {};
            stories.forEach((s: any) => {
                if (s.is_liked) initialLikes[s.id] = true;
            });
            setLikedStories(initialLikes);

            startProgress();
            if (currentStory?.id) markStoryViewed(currentStory.id);
        } else {
            stopProgress();
            setCurrentStoryIndex(0);
        }
    }, [visible, event?.id]); // Depend on event ID to reset when switching clusters

    // Still need to trigger progress and analytics when story index changes
    useEffect(() => {
        if (visible && currentStory?.id) {
            startProgress();
            markStoryViewed(currentStory.id);
        }
    }, [currentStoryIndex]);

    const startProgress = () => {
        progress.setValue(0);
        
        // Videos handle their own progress via onPlaybackStatusUpdate
        if (currentStory?.media_type === 'video') {
            stopProgress(); // Ensure no timer is running
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
            setShowHint(false);
        } else {
            if (currentStory?.media_type === 'video') return; // Video resumes naturally via shouldPlay prop

            // Resume from current progress
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
        if (currentStoryIndex < stories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const prevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
        } else {
            setCurrentStoryIndex(0); // Restart first story
        }
    };

    const handlePress = (evt: any) => {
        setShowHint(false);
        const x = evt.nativeEvent.locationX;
        if (x < width / 3) prevStory();
        else nextStory();
    };

    const showSmartJoinInfo = () => {
        togglePause(true);
        setShowSmartJoin(true);
    };

    if (!visible || !event) return null;

    return (
        <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
            <View style={styles.container}>
                <StatusBar style="light" />
                <Pressable 
                    onPress={handlePress}
                    onLongPress={() => togglePause(true)}
                    onPressOut={() => isPaused && togglePause(false)}
                    style={styles.content}
                >
                    {currentStory?.media_type === 'video' ? (
                        <Video
                            source={{ uri: currentStory.media_url }}
                            style={styles.image}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={!isPaused && visible}
                            isLooping={false}
                            onPlaybackStatusUpdate={(status: any) => {
                                if (status.isLoaded && status.durationMillis) {
                                    const p = status.positionMillis / status.durationMillis;
                                    progress.setValue(p);
                                    if (status.didJustFinish) nextStory();
                                }
                            }}
                        />
                    ) : (
                        <Image source={{ uri: currentStory?.media_url }} style={styles.image} resizeMode="cover" />
                    )}

                    {/* Like Animation Overlay */}
                    <Animated.View 
                        style={[
                            styles.centeredOverlay, 
                            { 
                                transform: [{ scale: likeAnim }],
                                opacity: likeAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] })
                            }
                        ]}
                    >
                        <Ionicons name="heart" size={100} color={colors.white} />
                    </Animated.View>
                    
                    <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.topGradient} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.bottomGradient} />

                    <SafeAreaView style={styles.overlay} pointerEvents="box-none">
                        {/* Progress Bars */}
                        <View style={styles.progressRow}>
                            {stories.map((_: any, index: number) => (
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

                        {/* Top Metadata */}
                        <View style={styles.header}>
                            <View style={styles.userInfo}>
                                <Image source={{ uri: currentStory?.profiles?.avatar_url }} style={styles.userAvatar} />
                                <View>
                                    <Text style={styles.userName}>
                                        {currentStory?.profiles?.id === currentUser?.id ? 'You' : currentStory?.profiles?.name}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.locationName}>
                                            {event.location?.name || 'Moments'} • {
                                                currentStory?.created_at 
                                                    ? `${Math.max(1, Math.floor((new Date(currentStory.created_at).getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60)))}h left` 
                                                    : '24h left'
                                            }
                                        </Text>
                                        <TouchableOpacity onPress={showSmartJoinInfo} style={{ marginLeft: 6 }}>
                                            <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.6)" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={28} color={colors.white} />
                            </TouchableOpacity>
                        </View>

                        {/* POV Switcher Prompt */}
                        {stories.length > 1 && showHint && (
                            <View style={styles.povPrompt}>
                                <Ionicons name="swap-horizontal" size={16} color={colors.white} style={{ marginRight: 8 }} />
                                <Text style={styles.povPromptText}>Tap sides to skip • Uni-POV Active</Text>
                            </View>
                        )}

                        {/* Caption & Actions */}
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
                                <Text style={styles.likeCount}>{likedStories[currentStory?.id] ? (currentStory.likes_count || 0) + 1 : (currentStory.likes_count || 0)}</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </Pressable>
            </View>

            {/* Smart Join Bottom Modal */}
            <Modal
                visible={showSmartJoin}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setShowSmartJoin(false);
                    togglePause(false);
                }}
            >
                <Pressable 
                    style={styles.modalOverlay} 
                    onPress={() => {
                        setShowSmartJoin(false);
                        togglePause(false);
                    }}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalIconBox}>
                            <Ionicons name="git-merge" size={32} color="#A154F2" />
                        </View>
                        <Text style={styles.modalTitle}>Smart Joining Active</Text>
                        <Text style={styles.modalDesc}>
                            Uni-POV automatically merges stories from different students when they are at the same location and time.
                        </Text>
                        <Text style={styles.modalSub}>
                            This creates a collective timeline, showing you multiple perspectives of the same campus moment!
                        </Text>
                        <TouchableOpacity 
                            style={styles.modalBtn}
                            onPress={() => {
                                setShowSmartJoin(false);
                                togglePause(false);
                            }}
                        >
                            <Text style={styles.modalBtnText}>Got it</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
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
    locationName: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.medium, fontSize: 11 },
    closeBtn: { padding: 4 },
    povPrompt: { position: 'absolute', top: height / 2 - 20, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
    povPromptText: { color: colors.white, fontFamily: fonts.medium, fontSize: 12, opacity: 0.8 },
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
        backgroundColor: 'rgba(161, 84, 242, 0.2)',
    },
    likeCount: {
        color: colors.white,
        fontFamily: fonts.bold,
        fontSize: 12,
        marginTop: 2,
    },
    // Smart Join Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: colors.gray200,
        borderRadius: 2,
        marginBottom: 24,
    },
    modalIconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(161, 84, 242, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: colors.black,
        marginBottom: 12,
    },
    modalDesc: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: colors.gray700,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 8,
    },
    modalSub: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: colors.gray500,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 24,
    },
    modalBtn: {
        width: '100%',
        backgroundColor: colors.black,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBtnText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.white,
    }
});

export default StoryViewer;
