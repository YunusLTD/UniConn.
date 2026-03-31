import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getFriendsList } from '../../src/api/friends';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FriendsListScreen() {
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

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
                style={styles.card} 
                onPress={() => router.push(`/user/${friend.id}`)}
            >
                <View style={styles.avatar}>
                    {friend.avatar_url ? (
                        <Image source={{ uri: friend.avatar_url }} style={styles.avatarImg} />
                    ) : (
                        <Text style={styles.avatarText}>{friend.name?.[0]?.toUpperCase() || '?'}</Text>
                    )}
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{friend.name}</Text>
                    <Text style={styles.uni}>
                        {friend.universities?.name || friend.department || 'Student'}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                title: 'All Friends', 
                headerShown: true, 
                headerBackTitle: '',
                headerTintColor: colors.black,
            }} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="small" color={colors.black} />
                </View>
            ) : (
                <FlatList
                    data={friends}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => {
                            setRefreshing(true);
                            fetchFriends();
                        }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={48} color={colors.gray300} />
                            <Text style={styles.emptyText}>No friends yet. Start connecting!</Text>
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
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: colors.black,
    },
    list: {
        padding: spacing.md,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray100,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.gray100,
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
        color: colors.gray500,
    },
    info: {
        flex: 1,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: colors.black,
    },
    uni: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.gray500,
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
        color: colors.gray400,
    }
});
