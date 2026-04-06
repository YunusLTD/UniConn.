import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, Image, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { getFriendsList } from '../api/friends';
import { sendMessage, createConversation } from '../api/messages';
import { useLanguage } from '../context/LanguageContext';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PostShareModalProps {
    visible: boolean;
    onClose: () => void;
    post: any;
}

export default function PostShareModal({ visible, onClose, post }: PostShareModalProps) {
    const { colors: themeColors } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const [search, setSearch] = useState('');
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());

    const animatedValue = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            loadFriends();
            Animated.spring(animatedValue, {
                toValue: 1,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();
        } else {
             Animated.timing(animatedValue, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
            setSearch('');
            setSentIds(new Set());
        }
    }, [visible]);

    const loadFriends = async () => {
        setLoading(true);
        try {
            const res = await getFriendsList();
            if (res?.data) {
                setFriends(res.data);
            }
        } catch (e) {
            console.error('Failed to load friends', e);
        } finally {
            setLoading(false);
        }
    };

    const filteredFriends = friends.filter(f => 
        f.friend?.name?.toLowerCase().includes(search.toLowerCase()) || 
        f.friend?.username?.toLowerCase().includes(search.toLowerCase())
    );

    const handleShare = async (friendId: string) => {
        if (sentIds.has(friendId)) return;
        setSendingId(friendId);
        hapticLight();

        try {
            // 1. Get or Create conversation
            const convRes = await createConversation({ type: 'direct', participant_ids: [friendId] });
            if (convRes?.data?.id) {
                // 2. Send the post as a message
                const shareText = `Check out this post: https://uni-platform.app/post/${post.id}\n\n${post.content?.substring(0, 50) || ''}...`;
                await sendMessage(convRes.data.id, shareText);
                
                hapticSuccess();
                setSentIds(prev => new Set(prev).add(friendId));
            }
        } catch (e) {
            hapticError();
            console.error('Failed to share post', e);
        } finally {
            setSendingId(null);
        }
    };

    const modalTranslateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_HEIGHT, 0],
    });

    const backdropOpacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
    });

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
                </TouchableOpacity>

                <Animated.View style={[
                    styles.sheet, 
                    { 
                        backgroundColor: themeColors.surface, 
                        paddingBottom: Math.max(insets.bottom, spacing.xl),
                        transform: [{ translateY: modalTranslateY }]
                    }
                ]}>
                    <View style={[styles.indicator, { backgroundColor: themeColors.gray200 }]} />
                    
                    <Text style={[styles.title, { color: themeColors.black }]}>{t('send_to_friends')}</Text>

                    <View style={[styles.searchBox, { backgroundColor: themeColors.gray100 }]}>
                        <Ionicons name="search" size={18} color={themeColors.gray500} />
                        <TextInput
                            style={[styles.searchInput, { color: themeColors.black }]}
                            placeholder={t('search_friends')}
                            placeholderTextColor={themeColors.gray500}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>

                    {loading && friends.length === 0 ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator color={themeColors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredFriends}
                            keyExtractor={(item) => (item.friend?.id || item.id).toString()}
                            renderItem={({ item }) => {
                                const friendProfile = item.friend;
                                const friendId = friendProfile?.id;
                                if (!friendProfile) return null;

                                return (
                                    <View style={styles.friendItem}>
                                        <View style={styles.friendInfo}>
                                            <Image 
                                                source={{ uri: friendProfile.avatar_url || 'https://via.placeholder.com/150' }}
                                                style={styles.avatar}
                                            />
                                            <View>
                                                <Text style={[styles.friendName, { color: themeColors.black }]}>{friendProfile.name || 'User'}</Text>
                                                <Text style={[styles.friendUser, { color: themeColors.gray500 }]}>@{friendProfile.username || 'uniconn'}</Text>
                                            </View>
                                        </View>
                                        
                                        <TouchableOpacity
                                            style={[
                                                styles.sendBtn,
                                                { backgroundColor: themeColors.primary },
                                                sentIds.has(friendId) && { backgroundColor: themeColors.gray200 }
                                            ]}
                                            onPress={() => handleShare(friendId)}
                                            disabled={sendingId === friendId || sentIds.has(friendId)}
                                        >
                                            {sendingId === friendId ? (
                                                <ActivityIndicator size="small" color={themeColors.white} />
                                            ) : (
                                                <Text style={[
                                                    styles.sendBtnText, 
                                                    { color: themeColors.white },
                                                    sentIds.has(friendId) && { color: themeColors.gray500 }
                                                ]}>
                                                    {sentIds.has(friendId) ? t('sent') : t('send')}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                );
                            }}
                            ListEmptyComponent={
                                !loading ? (
                                    <View style={styles.emptyContainer}>
                                        <Text style={{ color: themeColors.gray400, fontFamily: fonts.medium }}>{t('no_friends_found')}</Text>
                                    </View>
                                ) : null
                            }
                            style={styles.list}
                            keyboardShouldPersistTaps="handled"
                        />
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdropTouch: {
        ...StyleSheet.absoluteFillObject,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    sheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: SCREEN_HEIGHT * 0.8,
        minHeight: SCREEN_HEIGHT * 0.5,
    },
    indicator: {
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 16,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.lg,
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: fonts.medium,
        fontSize: 15,
    },
    list: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    friendInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    friendName: {
        fontFamily: fonts.semibold,
        fontSize: 15,
    },
    friendUser: {
        fontFamily: fonts.regular,
        fontSize: 13,
    },
    sendBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radii.full,
        minWidth: 70,
        alignItems: 'center',
    },
    sendBtnText: {
        fontFamily: fonts.bold,
        fontSize: 14,
    },
    loaderContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
});
