import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, Image, TouchableOpacity, SafeAreaView, Animated, Pressable, ActivityIndicator, DeviceEventEmitter, Share, FlatList, Platform } from 'react-native';
import { colors, fonts, spacing } from '../constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { markStoryViewed, likeStory, deleteStory } from '../api/stories';
import { getFriendsList } from '../api/friends';
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
    const [showMenu, setShowMenu] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [likedStories, setLikedStories] = useState<Record<string, boolean>>({});
    const likeAnim = useRef(new Animated.Value(0)).current;
    const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);

    // Reset user index when becoming visible
    useEffect(() => {
        if (visible) {
            setCurrentUserIndex(initialUserIndex);
            setCurrentStoryIndex(0);
            setShowMenu(false);
            setShowShareModal(false);
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
            const isText = currentStory.media_url === 'text_story' || currentStory.content?.startsWith('__JSON_STORY__');
            setIsMediaLoaded(isText);

            if (currentStory.media_type === 'video') {
                stopProgress();
            }
            markStoryViewed(currentStory.id);
            if (currentStory.is_liked) {
                setLikedStories(prev => ({ ...prev, [currentStory.id]: true }));
            }
        }
    }, [visible, currentUserIndex, currentStoryIndex]);

    // This effect ensures we start only AFTER the state has committed and media is confirmed
    useEffect(() => {
        if (visible && isMediaLoaded && currentStory?.media_type !== 'video') {
            startProgress();
        }
    }, [isMediaLoaded, visible, currentStoryIndex]);

    const startProgress = () => {
        progress.setValue(0);
        if (currentStory?.media_type !== 'video' && !isMediaLoaded) return;
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

    const confirmDelete = () => {
        setShowMenu(false);
        handleDeleteStory();
    };

    const handleShare = async () => {
        setShowMenu(false);
        setShowShareModal(true);
        if (friends.length === 0) {
            setLoadingFriends(true);
            try {
                const res = await getFriendsList();
                if (res?.data) {
                    setFriends(res.data);
                }
            } catch (e) {
                console.log('Failed to fetch friends', e);
            } finally {
                setLoadingFriends(false);
            }
        }
    };

    const sendToFriend = (friend: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowShareModal(false);
        togglePause(false);
    };

    const handleOptions = () => {
        togglePause(true);
        setShowMenu(true);
    };

    const closeOverlays = () => {
        if (showMenu) setShowMenu(false);
        if (showShareModal) setShowShareModal(false);
        togglePause(false);
    };

    const handleDeleteStory = async () => {
        if (!currentStory?.id) return;
        
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await deleteStory(currentStory.id);
            DeviceEventEmitter.emit('storyDeleted');
            
            // If it's the only story in the cluster, remove the user cluster
            if (userStories.length === 1) {
                onClose();
            } else {
                nextStory();
            }
        } catch (e) {
            console.log('Failed to delete story', e);
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
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={styles.container}>
                <StatusBar style="light" />
                <Pressable
                    onPress={(e) => {
                        if (showMenu || showShareModal) {
                            closeOverlays();
                            return;
                        }
                        handlePress(e);
                    }}
                    onPressIn={(!showMenu && !showShareModal) ? onTouchStart : undefined}
                    onLongPress={(!showMenu && !showShareModal) ? () => togglePause(true) : undefined}
                    onPressOut={(!showMenu && !showShareModal) ? () => isPaused && togglePause(false) : undefined}
                    style={styles.content}
                >
                    {currentStory?.media_url === 'text_story' || currentStory?.content?.startsWith('__JSON_STORY__') ? (
                        <View style={[styles.image, styles.textStoryBg, { backgroundColor: (() => {
                            if (!currentStory?.content?.startsWith('__JSON_STORY__')) return '#7C3AED';
                            try {
                                const parts = currentStory.content.split('__');
                                const theme = JSON.parse(parts[2]);
                                return theme.bg || '#7C3AED';
                            } catch { return '#7C3AED'; }
                        })() }]}>
                            <Text style={[styles.textStoryContent, { color: (() => {
                                if (!currentStory?.content?.startsWith('__JSON_STORY__')) return '#FFFFFF';
                                try {
                                    const parts = currentStory.content.split('__');
                                    const theme = JSON.parse(parts[2]);
                                    return theme.color || '#FFFFFF';
                                } catch { return '#FFFFFF'; }
                            })() }]}>
                                {(() => {
                                    if (!currentStory?.content?.startsWith('__JSON_STORY__')) return currentStory?.content || '';
                                    try {
                                        const parts = currentStory.content.split('__');
                                        return parts[3] || '';
                                    } catch { return currentStory?.content || ''; }
                                })()}
                            </Text>
                        </View>
                    ) : currentStory?.media_type === 'video' ? (
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
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.userName}>{userCluster.user?.name || 'User'}</Text>
                                        {userCluster.is_admin && <MaterialCommunityIcons name="check-decagram" size={16} color="#00A3FF" style={{ marginLeft: 4 }} />}
                                    </View>
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleOptions(); }} style={styles.headerBtn} hitSlop={15}>
                                    <Ionicons name="ellipsis-horizontal" size={24} color={colors.white} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={(e) => { e.stopPropagation(); onClose(); }} style={styles.closeBtn} hitSlop={15}>
                                    <Ionicons name="close" size={28} color={colors.white} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.captionRow}>
                            {currentStory?.content && !currentStory.content.startsWith('__JSON_STORY__') && (
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

                    {/* Options Dropdown */}
                    {showMenu && (
                        <View style={styles.dropdownMenu}>
                            <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                                <Ionicons name="paper-plane-outline" size={20} color="white" />
                                <Text style={styles.menuText}>Share to Friends</Text>
                            </TouchableOpacity>
                            {userCluster.user?.id === currentUser?.id && (
                                <TouchableOpacity style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }]} onPress={confirmDelete}>
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    <Text style={[styles.menuText, { color: '#EF4444' }]}>Delete</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Share Bottom Sheet */}
                    {showShareModal && (
                        <View style={styles.shareSheet}>
                            <View style={styles.shareHandle} />
                            <Text style={styles.shareTitle}>Send to...</Text>
                            {loadingFriends ? (
                                <ActivityIndicator size="small" color="white" style={{ marginTop: 20 }} />
                            ) : friends.length === 0 ? (
                                <Text style={styles.noFriendsText}>No friends to share with yet.</Text>
                            ) : (
                                <FlatList
                                    data={friends}
                                    keyExtractor={item => item.id}
                                    style={{ maxHeight: height * 0.4 }}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity style={styles.friendRow} onPress={() => sendToFriend(item)}>
                                            <Image source={{ uri: item.friend?.avatar_url || item.user?.avatar_url }} style={styles.friendAvatar} />
                                            <Text style={styles.friendName}>{item.friend?.name || item.user?.name}</Text>
                                            <View style={styles.sendBtn}>
                                                <Text style={styles.sendBtnText}>Send</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                            )}
                        </View>
                    )}
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
    headerBtn: {
        padding: 8,
    },
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
    textStoryBg: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    textStoryContent: {
        fontFamily: fonts.bold,
        fontSize: 32,
        textAlign: 'center',
        lineHeight: 42,
    },
    dropdownMenu: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 90 : 60,
        right: 20,
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        borderRadius: 14,
        paddingVertical: 4,
        minWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 50,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    menuText: {
        color: 'white',
        fontFamily: fonts.medium,
        fontSize: 15,
    },
    shareSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(20, 20, 20, 0.98)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        zIndex: 50,
    },
    shareHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    shareTitle: {
        color: 'white',
        fontFamily: fonts.bold,
        fontSize: 18,
        marginBottom: 16,
    },
    friendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
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
    sendBtn: {
        backgroundColor: colors.blue,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    sendBtnText: {
        color: 'white',
        fontFamily: fonts.bold,
        fontSize: 13,
    },
    noFriendsText: {
        color: 'rgba(255,255,255,0.5)',
        fontFamily: fonts.medium,
        textAlign: 'center',
        marginTop: 20,
    },
});

export default StoryViewer;
