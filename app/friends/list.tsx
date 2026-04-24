import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { getFriendsList } from '../../src/api/friends';
import { createConversation } from '../../src/api/messages';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTheme } from '../../src/context/ThemeContext';
import { getDepartmentLabel } from '../../src/utils/localization';

export default function FriendsListScreen() {
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [startingFor, setStartingFor] = useState<string | null>(null);
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();

    const fetchFriends = async () => {
        try {
            const res = await getFriendsList();
            if (res?.data) {
                setFriends(res.data);
            }
        } catch (e) {
            console.log('Error fetching friends', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchFriends();
    }, []);

    const renderItem = ({ item }: { item: any }) => {
        const friend = item.friend;
        if (!friend) return null;

        return (
            <TouchableOpacity 
                style={[styles.card, { borderBottomColor: colors.border }]} 
                onPress={() => router.push(`/user/${friend.id}`)}
                activeOpacity={0.7}
            >
                <View style={[styles.avatar, { backgroundColor: isDark ? '#1A1A1A' : colors.gray100 }]}>
                    {friend.avatar_url ? (
                        <Image source={{ uri: friend.avatar_url }} style={styles.avatarImg} />
                    ) : (
                        <Text style={[styles.avatarText, { color: colors.gray400 }]}>{friend.name?.[0]?.toUpperCase() || '?'}</Text>
                    )}
                </View>
                <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.black }]}>{friend.name}</Text>
                    <Text style={[styles.uni, { color: colors.gray500 }]}>
                        {friend.universities?.name || getDepartmentLabel(friend.department, t) || t('user_fallback')}
                    </Text>
                </View>
                <TouchableOpacity onPress={async () => {
                    setStartingFor(friend.id);
                    try {
                        const res = await createConversation({ type: 'direct', participant_ids: [friend.id] });
                        const conv = res?.data;
                        if (conv?.id) {
                            router.push(`/chat/${conv.id}`);
                        }
                    } catch (e) {
                        console.log('Failed to start conversation', e);
                    } finally {
                        setStartingFor(null);
                    }
                }} style={{ padding: 8, marginRight: 8 }}>
                    {startingFor === friend.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.gray300} />
                    )}
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ 
                title: t('all_friends_title'), 
                headerShown: true, 
                headerBackTitle: '',
                headerTintColor: colors.black,
                headerStyle: { backgroundColor: colors.background },
            }} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={friends}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchFriends();
                            }}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={48} color={colors.gray300} />
                            <Text style={[styles.emptyText, { color: colors.gray400 }]}>{t('friends_empty_title')} {t('friends_empty_cta')}</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    list: {
        paddingHorizontal: spacing.md,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 0.5,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 18,
    },
    info: {
        flex: 1,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 15,
    },
    uni: {
        fontFamily: fonts.regular,
        fontSize: 12,
        marginTop: 2,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        alignItems: 'center',
        marginTop: 100,
        gap: 12,
    },
    emptyText: {
        fontFamily: fonts.medium,
        fontSize: 14,
    }
});
