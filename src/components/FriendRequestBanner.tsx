import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getFriendRequests } from '../api/friends';

export default function FriendRequestBanner() {
    const { colors } = useTheme();
    const [requests, setRequests] = useState<any[]>([]);
    const router = useRouter();
    const slideAnim = React.useRef(new Animated.Value(-100)).current;

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
        return () => clearInterval(interval);
    }, []);

    if (requests.length === 0) return null;

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }], backgroundColor: colors.background }]}>
            <TouchableOpacity 
                style={[styles.content, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                activeOpacity={0.9}
                onPress={() => router.push('/friends/requests')}
            >
                <View style={styles.avatarStack}>
                    {requests.slice(0, 3).map((req, i) => (
                        <View key={req.id} style={[styles.avatarBack, { marginLeft: i === 0 ? 0 : -12, zIndex: 10 - i, borderColor: colors.surface, backgroundColor: colors.background }]}>
                            {req.profiles?.avatar_url ? (
                                <Image source={{ uri: req.profiles.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.placeholder, { backgroundColor: colors.background }]}>
                                    <Text style={[styles.placeholderText, { color: colors.gray500, fontFamily: fonts.bold }]}>
                                        {req.profiles?.name?.[0]?.toUpperCase() || '?'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
                
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.black, fontFamily: fonts.bold }]}>
                        {requests.length === 1 
                            ? 'New Friend Request' 
                            : `${requests.length} Friend Requests`}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.gray500, fontFamily: fonts.regular }]}>
                        {requests.length === 1 
                            ? `${requests[0].profiles?.name} wants to connect`
                            : 'People want to connect with you'}
                    </Text>
                </View>
 
                <View style={[styles.action, { backgroundColor: colors.background }]}>
                    <Text style={[styles.actionText, { color: colors.black, fontFamily: fonts.bold }]}>View All</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.black} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
        marginBottom: spacing.sm,
    },
    content: {
        borderRadius: radii.md,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
    },
    avatarStack: {
        flexDirection: 'row',
        marginRight: 12,
    },
    avatarBack: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
        overflow: 'hidden',
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
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    action: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radii.full,
    },
    actionText: {
        fontSize: 12,
    }
});
