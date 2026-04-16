import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, DeviceEventEmitter } from 'react-native';
import { spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getFriendRequests } from '../api/friends';

type FriendRequestBannerProps = {
    variant?: 'default' | 'inline';
};

export default function FriendRequestBanner({ variant = 'default' }: FriendRequestBannerProps) {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const [requests, setRequests] = useState<any[]>([]);
    const router = useRouter();
    const slideAnim = React.useRef(new Animated.Value(-100)).current;
    const isInline = variant === 'inline';
    const inlineTitle = requests.length === 1
        ? t('new_friend_request')
        : `${requests.length} ${t('friend_requests')}`;

    const fetchRequests = async () => {
        try {
            const res = await getFriendRequests();
            if (res?.data && res.data.length > 0) {
                setRequests(res.data);
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 7,
                }).start();
            } else {
                setRequests([]);
            }
        } catch (e) {
            console.log('Error fetching requests', e);
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 30000); // Check every 30s
        const sub = DeviceEventEmitter.addListener('friendRequestsUpdated', fetchRequests);
        return () => {
            clearInterval(interval);
            sub.remove();
        };
    }, []);

    if (requests.length === 0) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                isInline ? styles.containerInline : styles.containerDefault,
                { transform: [{ translateY: slideAnim }], backgroundColor: isInline ? 'transparent' : colors.background }
            ]}
        >
            <TouchableOpacity 
                style={[
                    styles.content,
                    isInline ? styles.contentInline : styles.contentDefault,
                    {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        shadowColor: '#000'
                    }
                ]} 
                activeOpacity={0.9}
                onPress={() => router.push('/friends/requests')}
            >
                <View style={[styles.avatarStack, isInline && styles.avatarStackInline]}>
                    {requests.slice(0, 3).map((req, i) => (
                        <View
                            key={req.id}
                            style={[
                                styles.avatarBack,
                                isInline ? styles.avatarBackInline : styles.avatarBackDefault,
                                { marginLeft: i === 0 ? 0 : (isInline ? -10 : -12), zIndex: 10 - i, borderColor: colors.surface, backgroundColor: colors.background }
                            ]}
                        >
                            {req.profiles?.avatar_url ? (
                                <Image source={{ uri: req.profiles.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.placeholder, { backgroundColor: colors.background }]}>
                                    <Text style={[styles.placeholderText, isInline && styles.placeholderTextInline, { color: colors.gray500, fontFamily: fonts.bold }]}>
                                        {req.profiles?.name?.[0]?.toUpperCase() || '?'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
                
                <View style={styles.textContainer}>
                    <Text style={[styles.title, isInline && styles.titleInline, { color: colors.black, fontFamily: fonts.bold }]}>
                        {isInline
                            ? inlineTitle
                            : requests.length === 1
                                ? t('new_friend_request')
                                : t('friend_requests_count').replace('{{count}}', String(requests.length))}
                    </Text>
                    {!isInline && (
                        <Text style={[styles.subtitle, isInline && styles.subtitleInline, { color: colors.gray500, fontFamily: fonts.regular }]} numberOfLines={2}>
                            {requests.length === 1 
                                ? t('friend_request_banner_single').replace('{{name}}', requests[0].profiles?.name || t('user_fallback'))
                                : t('friend_request_banner_multiple')}
                        </Text>
                    )}
                </View>
 
                <View style={[styles.action, isInline && styles.actionInline, { backgroundColor: isInline ? colors.black : colors.background }]}>
                    <Text style={[styles.actionText, isInline && styles.actionTextInline, { color: isInline ? colors.white : colors.black, fontFamily: fonts.bold }]}>{t('view_all')}</Text>
                    <Ionicons name="chevron-forward" size={isInline ? 14 : 16} color={isInline ? colors.white : colors.black} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    containerDefault: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
        marginBottom: spacing.sm,
    },
    containerInline: {
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        marginHorizontal: -4,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 4,
    },
    contentDefault: {
        borderRadius: radii.md,
        padding: 12,
    },
    contentInline: {
        borderRadius: radii.full,
        paddingVertical: 10,
        paddingLeft: 12,
        paddingRight: 10,
        minHeight: 50,
    },
    avatarStack: {
        flexDirection: 'row',
        marginRight: 12,
    },
    avatarStackInline: {
        marginRight: 10,
    },
    avatarBack: {
        borderWidth: 2,
        overflow: 'hidden',
    },
    avatarBackDefault: {
        width: 34,
        height: 34,
        borderRadius: 17,
    },
    avatarBackInline: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 14,
    },
    placeholderTextInline: {
        fontSize: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
    },
    titleInline: {
        fontSize: 13,
        lineHeight: 16,
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    subtitleInline: {
        fontSize: 11,
        marginTop: 1,
    },
    action: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radii.full,
    },
    actionInline: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginLeft: 10,
    },
    actionText: {
        fontSize: 12,
    },
    actionTextInline: {
        fontSize: 11,
    },
});
