import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { fonts, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useLanguage } from '../context/LanguageContext';

interface StoryCircleProps {
    id: string;
    image_url?: string;
    media_type?: string;
    title: string;
    isUnread?: boolean;
    isAdmin?: boolean;
    onPress: () => void;
    onAddPress?: () => void;
    isMe?: boolean;
}

const StoryCircle: React.FC<StoryCircleProps> = ({ 
    image_url, 
    media_type,
    title, 
    isUnread = true, 
    isAdmin = false,
    onPress, 
    onAddPress,
    isMe = false 
}) => {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const initial = title ? title[0].toUpperCase() : '?';

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.avatarContainer}>
                {isUnread ? (
                    <LinearGradient
                        colors={['#A154F2', '#9CA3AF', '#000000']}
                        style={styles.gradientBorder}
                    >
                        <View style={[styles.innerCircle, { backgroundColor: colors.surface }]}>
                            {media_type === 'video' && image_url ? (
                                <Video source={{ uri: image_url }} style={styles.avatar} resizeMode={ResizeMode.COVER} shouldPlay={false} />
                            ) : image_url ? (
                                <Image source={{ uri: image_url }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.fallback, { backgroundColor: colors.gray100 }]}>
                                    <Text style={[styles.fallbackText, { color: colors.gray400 }]}>{initial}</Text>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                ) : (
                    <View style={[styles.viewedBorder, { borderColor: colors.gray200 }]}>
                        <View style={[styles.innerCircle, { backgroundColor: colors.surface }]}>
                            {media_type === 'video' && image_url ? (
                                <Video source={{ uri: image_url }} style={styles.avatar} resizeMode={ResizeMode.COVER} shouldPlay={false} />
                            ) : image_url ? (
                                <Image source={{ uri: image_url }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.fallback, { backgroundColor: colors.gray100 }]}>
                                    <Text style={[styles.fallbackText, { color: colors.gray400 }]}>{initial}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {isMe && (
                    <TouchableOpacity 
                        style={[styles.plusIcon, { borderColor: colors.surface }]} 
                        onPress={(e) => {
                            e.stopPropagation();
                            if (onAddPress) onAddPress();
                            else onPress();
                        }}
                    >
                        <Ionicons name="add" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                )}

            </View>
            <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: colors.gray500 }, isMe && { fontFamily: fonts.semibold, color: colors.black }]} numberOfLines={1}>
                    {isMe ? t('me_label') : title}
                </Text>
                {isAdmin && <MaterialCommunityIcons name="check-decagram" size={12} color="#00A3FF" style={styles.badge} />}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 80,
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    avatarContainer: {
        position: 'relative',
        width: 68,
        height: 68,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradientBorder: {
        width: 68,
        height: 68,
        borderRadius: 34,
        padding: 2.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewedBorder: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerCircle: {
        width: 62,
        height: 62,
        borderRadius: 31,
        padding: 2,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 29,
    },
    fallback: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    fallbackText: {
        fontFamily: fonts.bold,
        fontSize: 24,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
        width: '100%',
    },
    title: {
        fontFamily: fonts.medium,
        fontSize: 11,
        textAlign: 'center',
        flexShrink: 1, // Allow text to shrink if badge is present
    },
    badge: {
        marginLeft: 3,
    },
    plusIcon: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: '#A154F2',
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default StoryCircle;
