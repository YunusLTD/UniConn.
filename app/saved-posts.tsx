import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { getSavedPosts } from '../src/api/posts';
import PostCard from '../src/components/PostCard';

export default function SavedPostsScreen() {
    const { colors } = useTheme();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const res = await getSavedPosts();
            setPosts(res?.data || []);
        } catch (e) {
            setPosts([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ title: 'Saved posts' }} />
                <ActivityIndicator size="small" color={colors.black} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Saved posts' }} />
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadData();
                        }}
                        tintColor={colors.black}
                    />
                }
                renderItem={({ item }) => (
                    <PostCard
                        post={item}
                        onSaveChange={(postId, isSaved) => {
                            if (!isSaved) {
                                setPosts((prev) => prev.filter((post) => post.id !== postId));
                            }
                        }}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="bookmark-outline" size={52} color={colors.gray300} />
                        <Text style={[styles.emptyTitle, { color: colors.black }]}>No saved posts yet</Text>
                        <Text style={[styles.emptySub, { color: colors.gray500 }]}>
                            Save posts from the 3-dot menu to find them here.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: 120,
    },
    emptyTitle: {
        marginTop: 14,
        fontFamily: fonts.bold,
        fontSize: 18,
    },
    emptySub: {
        marginTop: 6,
        textAlign: 'center',
        fontFamily: fonts.regular,
        fontSize: 14,
        lineHeight: 20,
    },
});
