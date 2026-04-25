import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, Image, TouchableOpacity, SafeAreaView, Animated, Pressable, ActivityIndicator, DeviceEventEmitter, Share, FlatList, Platform, Alert } from 'react-native';
import { colors, fonts, spacing } from '../constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { markStoryViewed, likeStory, deleteStory } from '../api/stories';
import { submitReport } from '../api/reports';
import { getFriendsList } from '../api/friends';
import { getByUsername } from '../api/users';
import { createConversation, sendMessage } from '../api/messages';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const parseStoryContent = (content: string | undefined) => {
    if (!content) return { cleanContent: '', theme: null, mentions: [] as { username: string, avatar: string, id: string }[] };
    let text = content;
    let theme = null;
    let mentions: { username: string, avatar: string, id: string }[] = [];

    if (text.includes('__MENTIONS__')) {
        const parts = text.split('__MENTIONS__');
        text = parts[0];
        if (parts[1]) {
            try {
                const parsed = JSON.parse(parts[1]);
                mentions = parsed.map((m: any) => ({ username: m.u || m, avatar: m.a || '', id: m.id || '' }));
            } catch {
                // Legacy comma format fallback
                mentions = parts[1].split(',').map(u => ({ username: u, avatar: '', id: '' }));
            }
        }
    }

    if (text.startsWith('__JSON_STORY__')) {
        try {
            const parts = text.split('__');
            if (parts.length >= 3) theme = JSON.parse(parts[2]);
            if (parts.length >= 4) text = parts[3] || '';
        } catch {
            // ignore
        }
    }

    return { cleanContent: text, theme, mentions };
};

interface StoryViewerProps {
    visible: boolean;
    stories: any[]; // Array of user story clusters { id, user, stories[] }
    initialUserIndex: number;
    onClose: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ visible, stories: allUsers = [], initialUserIndex = 0, onClose }) => {
    const { user: currentUser } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [progress, setProgress] = useState(new Animated.Value(0));
    const [isPaused, setIsPaused] = useState(false);
    const [isMediaLoaded, setIsMediaLoaded] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedMention, setSelectedMention] = useState<{ id: string, username: string, avatar: string } | null>(null);
    const [loadingMention, setLoadingMention] = useState<number | null>(null);
    const [isReporting, setIsReporting] = useState(false);
    const [reportFinished, setReportFinished] = useState(false);
    const [likedStories, setLikedStories] = useState<Record<string, boolean>>({});
    const [showShareModal, setShowShareModal] = useState(false);
    const likeAnim = useRef(new Animated.Value(0)).current;
    const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);

    // Reset user index when becoming visible
    useEffect(() => {
        if (visible) {
            setCurrentUserIndex(initialUserIndex);
            setCurrentStoryIndex(0);
            setShowMenu(false);
            setShowShareModal(false);
            setShowReportModal(false);
            setSelectedMention(null);
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

    useEffect(() => {
        if (visible && isMediaLoaded && currentStory?.media_type !== 'video' && !isPaused) {
            startProgress();
        }
    }, [isMediaLoaded, visible, currentStoryIndex, isPaused]);

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
        }
    };

    const nextStory = () => {
        if (currentStoryIndex < userStories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else {
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
            if (currentUserIndex > 0) {
                const prevUser = allUsers[currentUserIndex - 1];
                setCurrentUserIndex(prev => prev - 1);
                setCurrentStoryIndex((prevUser.stories?.length || 1) - 1);
            } else {
                setCurrentStoryIndex(0);
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
    };

    const handleOptions = () => {
        togglePause(true);
        setShowMenu(true);
    };

    const closeOverlays = () => {
        if (showMenu) setShowMenu(false);
        if (showReportModal) {
            setShowReportModal(false);
            setReportFinished(false);
        }
        if (selectedMention) setSelectedMention(null);
        togglePause(false);
    };

    const handleDeleteStory = () => {
        if (!currentStory?.id) return;
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        const storyId = currentStory.id;
        
        // Optimistically update UI immediately
        DeviceEventEmitter.emit('storyDeleted', storyId);
        if (userStories.length === 1) {
            onClose();
        } else {
            nextStory();
        }

        // Perform actual deletion in background
        deleteStory(storyId).catch(e => {
            console.log('Failed to delete story', e);
        });
    };

    const handleReportStory = () => {
        setShowMenu(false);
        setShowReportModal(true);
    };

    const sendReport = async (reason: string) => {
        if (!currentStory?.id || isReporting) return;
        setIsReporting(true);
        try {
            await submitReport({ target_type: 'story', target_id: currentStory.id, reason });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Show custom success state instead of system alert
            setReportFinished(true);
            
            // Auto close and move on after 1.5s
            setTimeout(() => {
                closeOverlays();
                nextStory();
            }, 1500);
        } catch (e) {
            console.log('Report error', e);
            Alert.alert(t('error'), t('report_submit_failed'));
            setIsReporting(false);
        }
    };

    const [touchStartX, setTouchStartX] = useState(0);
    const onTouchStart = (e: any) => {
        setTouchStartX(e.nativeEvent.pageX);
    };

    const onTouchEnd = (e: any) => {
        const x = e.nativeEvent.pageX;
        if (Math.abs(x - touchStartX) > 40) {
            if (touchStartX - x > 40) { // next user
                if (currentUserIndex < allUsers.length - 1) {
                    setCurrentUserIndex(prev => prev + 1);
                    setCurrentStoryIndex(0);
                } else {
                    onClose();
                }
            } else if (x - touchStartX > 40) { // prev user
                if (currentUserIndex > 0) {
                    const prevUser = allUsers[currentUserIndex - 1];
                    setCurrentUserIndex(prev => prev - 1);
                    setCurrentStoryIndex((prevUser.stories?.length || 1) - 1);
                }
            }
            return true;
        }
        return false;
    };

    const handlePress = (evt: any) => {
        if (onTouchEnd(evt)) return;
        const x = evt.nativeEvent.locationX;
        if (x < width / 3) prevStory();
        else nextStory();
    };

    if (!visible || !userCluster) return null;

    const { cleanContent, theme, mentions } = parseStoryContent(currentStory?.content);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.container}>
                <StatusBar style="light" />

                {/* Content Layer */}
                <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
                    {currentStory?.media_type === 'video' ? (
                        <Video
                            source={{ uri: currentStory?.media_url }}
                            style={styles.image}
                            resizeMode={ResizeMode.COVER}
                            isMuted={false}
                            shouldPlay={!isPaused && visible && isMediaLoaded}
                            onReadyForDisplay={() => setIsMediaLoaded(true)}
                            onPlaybackStatusUpdate={(status: any) => {
                                if (status.isLoaded && status.durationMillis) {
                                    const p = status.positionMillis / status.durationMillis;
                                    progress.setValue(p);
                                    if (status.didJustFinish) nextStory();
                                }
                            }}
                        />
                    ) : (currentStory?.media_url === 'text_story' || currentStory?.content?.startsWith('__JSON_STORY__')) ? (
                        <View style={[styles.textStoryBg, { backgroundColor: theme?.bgColor || '#A154F2' }]}>
                            <Text style={[styles.textStoryContent, { color: theme?.textColor || '#FFFFFF' }]}>
                                {cleanContent}
                            </Text>
                        </View>
                    ) : (
                        <Image 
                            source={{ uri: currentStory?.media_url }} 
                            style={styles.image} 
                            resizeMode="cover" 
                            onLoad={() => setIsMediaLoaded(true)} 
                        />
                    )}
                </View>

                {/* Overlays and Taps */}
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

                {/* Navigation Layer - Transparent tap areas behind the UI */}
                {!showMenu && !selectedMention && (
                    <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', zIndex: 1 }]} pointerEvents="box-none">
                        <Pressable
                            style={{ flex: 1 }}
                            onPress={() => prevStory()}
                            onLongPress={() => togglePause(true)}
                            onPressOut={() => isPaused && togglePause(false)}
                        />
                        <Pressable
                            style={{ flex: 2 }}
                            onPress={() => nextStory()}
                            onLongPress={() => togglePause(true)}
                            onPressOut={() => isPaused && togglePause(false)}
                        />
                    </View>
                )}

                {/* UI Elements Layer - Highest Z-Index and last in JSX to take precedence */}
                <SafeAreaView style={[styles.overlay, { zIndex: 10 }]} pointerEvents="box-none">
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
                                        {currentStory?.created_at ? t('hours_left', { count: Math.max(1, Math.floor((new Date(currentStory.created_at).getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60))) }) : t('hours_left', { count: 24 })}
                                    </Text>
                                    <View style={[styles.mediaBadge, { backgroundColor: currentStory?.media_type === 'video' ? 'rgba(239, 68, 68, 0.4)' : currentStory?.media_url === 'text_story' ? 'rgba(124, 58, 237, 0.4)' : 'rgba(255, 255, 255, 0.15)' }]}>
                                        {currentStory?.media_url !== 'text_story' && (
                                            <Ionicons name={currentStory?.media_type === 'video' ? 'videocam' : 'image'} size={8} color="white" />
                                        )}
                                        <Text style={[styles.mediaBadgeText, currentStory?.media_url === 'text_story' && { fontSize: 10 }]}>
                                            {currentStory?.media_type === 'video' ? t('video_label').toUpperCase() : currentStory?.media_url === 'text_story' ? 'Aa' : t('photo_label').toUpperCase()}
                                        </Text>
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

                    {/* Mentioned Users UI */}
                    {mentions.length > 0 && (
                        <View style={styles.mentionsRow}>
                            <Text style={styles.mentionsLabel}>{t('mentioned_in_moment')}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {mentions.map((m, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.mentionChip}
                                        activeOpacity={0.7}
                                        onPress={async (e) => {
                                            e.stopPropagation();
                                            console.log('MENTION TAPPED:', JSON.stringify(m));
                                            let targetId = m.id;

                                            
                                            // Fallback for legacy stories without ID
                                            if (!targetId && m.username) {
                                                setLoadingMention(i);
                                                try {
                                                    const res = await getByUsername(m.username);
                                                    if (res?.data?.id) targetId = res.data.id;
                                                } catch (err) {
                                                    console.log('Failed to fetch user by username', err);
                                                } finally {
                                                    setLoadingMention(null);
                                                }
                                            }

                                            if (targetId) {
                                                // Route immediately so the screen starts loading,
                                                // and close the modal concurrently.
                                                router.push(`/user/${targetId}`);
                                                onClose();
                                            } else {
                                                console.log('No valid user ID to navigate to');
                                            }
                                        }}
                                    >
                                        {loadingMention === i ? (
                                            <View style={[styles.mentionChipAvatar, styles.mentionAvatarFallback, { backgroundColor: 'transparent' }]}>
                                                <ActivityIndicator size="small" color="white" />
                                            </View>
                                        ) : m.avatar ? (
                                            <Image source={{ uri: m.avatar }} style={styles.mentionChipAvatar} />
                                        ) : (
                                            <View style={[styles.mentionChipAvatar, styles.mentionAvatarFallback]}>
                                                <Ionicons name="person" size={10} color="white" />
                                            </View>
                                        )}
                                        <Text style={styles.mentionChipText}>@{m.username}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={styles.captionRow}>
                        <View style={{ flex: 1, marginRight: 16 }}>
                            {currentStory?.media_url !== 'text_story' && cleanContent && (
                                <View style={styles.captionContainer}>
                                    <Text style={styles.captionText}>{cleanContent}</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity style={[styles.likeBtn, likedStories[currentStory?.id] && styles.likedBtn]} onPress={toggleLike} activeOpacity={0.7}>
                            <Ionicons name={likedStories[currentStory?.id] ? "heart" : "heart-outline"} size={28} color={colors.white} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>



                {/* Options Menu — full-screen dismiss + dropdown */}
                {showMenu && (
                    <Pressable style={[StyleSheet.absoluteFill, { zIndex: 50 }]} onPress={closeOverlays}>
                        <View style={styles.dropdownMenu}>
                            {userCluster.user?.id === currentUser?.id ? (
                                <TouchableOpacity style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }]} onPress={confirmDelete}>
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    <Text style={[styles.menuText, { color: '#EF4444' }]}>{t('delete_label')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }]} onPress={handleReportStory}>
                                    <Ionicons name="flag-outline" size={20} color="#EF4444" />
                                    <Text style={[styles.menuText, { color: '#EF4444' }]}>{t('report_story')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </Pressable>
                )}

                {/* Report Sheet — full-screen dismiss + bottom sheet */}
                {showReportModal && (
                    <Pressable style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={closeOverlays}>
                        <Pressable style={[styles.shareSheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
                            <View style={[styles.shareHandle, { backgroundColor: colors.gray200 }]} />
                            
                            {reportFinished ? (
                                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                                    <View style={{ backgroundColor: '#10B981', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                        <Ionicons name="checkmark" size={36} color="white" />
                                    </View>
                                    <Text style={[styles.shareTitle, { color: colors.black, marginBottom: 8 }]}>{t('report_submitted_title')}</Text>
                                    <Text style={{ color: colors.gray500, fontFamily: fonts.medium, textAlign: 'center' }}>
                                        {t('report_submitted_message')}
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    <Text style={[styles.shareTitle, { color: colors.black }]}>{t('report_this_story')}</Text>
                                    
                                    <TouchableOpacity style={styles.menuItem} onPress={() => sendReport("inappropriate")} disabled={isReporting}>
                                        <Ionicons name="alert-circle-outline" size={20} color={isReporting ? colors.gray300 : colors.black} />
                                        <Text style={[styles.menuText, { color: isReporting ? colors.gray300 : colors.black }]}>{t('inappropriate_content_option')}</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity style={styles.menuItem} onPress={() => sendReport("harassment")} disabled={isReporting}>
                                        <Ionicons name="hand-left-outline" size={20} color={isReporting ? colors.gray300 : colors.black} />
                                        <Text style={[styles.menuText, { color: isReporting ? colors.gray300 : colors.black }]}>{t('harassment_option')}</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity style={styles.menuItem} onPress={() => sendReport("spam")} disabled={isReporting}>
                                        <Ionicons name="ban-outline" size={20} color={isReporting ? colors.gray300 : colors.black} />
                                        <Text style={[styles.menuText, { color: isReporting ? colors.gray300 : colors.black }]}>{t('spam_option')}</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity style={styles.menuItem} onPress={closeOverlays} disabled={isReporting}>
                                        <Text style={[styles.menuText, { color: colors.gray400, textAlign: 'center', width: '100%', marginTop: 10 }]}>{t('cancel_label')}</Text>
                                    </TouchableOpacity>
                                    
                                    {isReporting && (
                                        <ActivityIndicator style={{ marginTop: 10 }} color={colors.primary} />
                                    )}
                                </>
                            )}
                        </Pressable>
                    </Pressable>
                )}

                {/* Quick View Mention Overlay — full-screen dismiss + bottom sheet */}
                {!!selectedMention && (
                    <Pressable style={[StyleSheet.absoluteFill, { zIndex: 110, backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={closeOverlays}>
                        <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%', position: 'absolute', bottom: 0 }}>
                            <View style={[styles.quickViewContent, { backgroundColor: colors.surface }]}>
                                <View style={[styles.shareHandle, { backgroundColor: colors.gray200 }]} />
                                <Image source={{ uri: selectedMention?.avatar }} style={styles.quickViewAvatar} />
                                <Text style={[styles.quickViewName, { color: colors.black }]}>@{selectedMention?.username}</Text>
                                <Text style={[styles.quickViewTagline, { color: colors.gray500 }]}>{t('mentioned_in_moment')}</Text>
                                <TouchableOpacity
                                    style={[styles.quickViewProfileBtn, { backgroundColor: colors.primary }]}
                                    onPress={() => {
                                        if (selectedMention?.id) {
                                            const uid = selectedMention.id;
                                            setSelectedMention(null);
                                            onClose();
                                            router.push(`/user/${uid}`);
                                        }
                                    }}
                                >
                                    <Text style={[styles.quickViewProfileBtnText, { color: colors.white }]}>{t('view_full_profile')}</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.black },
    content: { flex: 1 },
    image: { width, height },
    overlay: { ...StyleSheet.absoluteFillObject },
    topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120, zIndex: 5 },
    bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, zIndex: 5 },
    progressRow: { flexDirection: 'row', paddingHorizontal: spacing.sm, marginTop: 10 },
    progressBackground: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 2, borderRadius: 1, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: colors.white },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginTop: spacing.md },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    userAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
    userName: { color: colors.white, fontFamily: fonts.bold, fontSize: 14 },
    locationName: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    mediaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },
    mediaBadgeText: { fontFamily: fonts.bold, fontSize: 8, color: 'white', letterSpacing: 0.5 },
    closeBtn: { padding: 8 },
    headerBtn: { padding: 8 },
    centeredOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 20, pointerEvents: 'none' },
    captionRow: { position: 'absolute', bottom: 40, left: spacing.md, right: spacing.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
    captionContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 16, maxWidth: width * 0.7 },
    captionText: { color: colors.white, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
    likeBtn: { alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.3)', minWidth: 48 },
    likedBtn: { backgroundColor: 'rgba(0, 163, 255, 0.4)' },
    textStoryBg: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    textStoryContent: { fontFamily: fonts.bold, fontSize: 36, textAlign: 'center', lineHeight: 48, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    dropdownMenu: { position: 'absolute', top: Platform.OS === 'ios' ? 90 : 60, right: 20, backgroundColor: 'rgba(30, 30, 30, 0.95)', borderRadius: 14, paddingVertical: 4, minWidth: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, zIndex: 50 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
    menuText: { color: 'white', fontFamily: fonts.medium, fontSize: 15 },
    shareSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(20, 20, 20, 0.98)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, zIndex: 50 },
    shareHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    shareTitle: { color: 'white', fontFamily: fonts.bold, fontSize: 18, marginBottom: 16 },
    friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    friendAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
    friendName: { flex: 1, color: 'white', fontFamily: fonts.medium, fontSize: 16 },
    sendBtn: { backgroundColor: colors.blue, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
    sendBtnText: { color: 'white', fontFamily: fonts.bold, fontSize: 13 },
    noFriendsText: { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.medium, textAlign: 'center', marginTop: 20 },
    mentionsRow: { paddingHorizontal: 16, marginTop: 8, gap: 8 },
    mentionsLabel: { color: 'rgba(255,255,255,0.75)', fontFamily: fonts.medium, fontSize: 13 },
    mentionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingRight: 10, paddingLeft: 3, paddingVertical: 3, borderRadius: 20, gap: 5 },
    mentionChipAvatar: { width: 26, height: 26, borderRadius: 13 },
    mentionAvatarFallback: { backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
    mentionChipText: { color: 'white', fontFamily: fonts.bold, fontSize: 13 },
    quickViewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    quickViewContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 30, alignItems: 'center' },
    quickViewAvatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16, borderWidth: 3, borderColor: 'rgba(255,255,255,0.1)' },
    quickViewName: { color: 'white', fontFamily: fonts.bold, fontSize: 22, marginBottom: 4 },
    quickViewTagline: { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.medium, fontSize: 14, marginBottom: 24 },
    quickViewProfileBtn: { backgroundColor: 'white', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 25, width: '100%', alignItems: 'center' },
    quickViewProfileBtnText: { color: 'black', fontFamily: fonts.bold, fontSize: 16 },
});

export default StoryViewer;
