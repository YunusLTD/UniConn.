import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { colors, spacing, fonts, radii } from '../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { globalSearch } from '../src/api/search';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SearchScreen() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any>({ users: [], communities: [], posts: [] });
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (query.length < 2) {
            setResults({ users: [], communities: [], posts: [] });
            return;
        }

        const delay = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await globalSearch(query);
                if (res?.data) setResults(res.data);
            } catch (e) {
                console.log('Search failed', e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(delay);
    }, [query]);

    const renderUser = ({ item }: any) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => router.push(`/user/${item.id}`)}
        >
            <View style={styles.avatar}>
                {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
                ) : (
                    <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
                )}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.username}>@{item.username}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
        </TouchableOpacity>
    );

    const renderCommunity = ({ item }: any) => (
        <TouchableOpacity
            style={styles.commCard}
            onPress={() => router.push(`/community/${item.id}`)}
        >
            <Image
                source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?w=200' }}
                style={styles.commImg}
            />
            <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.type}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderPost = ({ item }: any) => (
        <TouchableOpacity
            style={styles.postCard}
            onPress={() => router.push(`/post/${item.id}`)}
        >
            <Text style={styles.postAuthor}>{item.profiles?.name || 'A student'}</Text>
            <Text style={styles.postSnippet} numberOfLines={2}>{item.content}</Text>
        </TouchableOpacity>
    );

    const hasResults = results.users.length > 0 || results.communities.length > 0 || results.posts.length > 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.searchHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.black} />
                </TouchableOpacity>
                <View style={styles.inputWrap}>
                    <Ionicons name="search-outline" size={20} color={colors.gray400} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search students, groups, or posts..."
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                        placeholderTextColor={colors.gray400}
                    />
                    {loading && <ActivityIndicator size="small" color={colors.primary} />}
                    {query.length > 0 && !loading && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={18} color={colors.gray300} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {query.length < 2 ? (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderIcon}>🔍</Text>
                    <Text style={styles.placeholderTitle}>Discover your campus</Text>
                    <Text style={styles.placeholderSub}>Find your friends, major-related communities, or campus discussions.</Text>
                </View>
            ) : !loading && !hasResults ? (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderIcon}>🏜️</Text>
                    <Text style={styles.placeholderTitle}>No results found</Text>
                    <Text style={styles.placeholderSub}>We couldn't find anything matching "{query}". Try different terms.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {results.users.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Students</Text>
                            {results.users.map((item: any) => <View key={item.id}>{renderUser({ item })}</View>)}
                        </View>
                    )}

                    {results.communities.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Groups & Communities</Text>
                            {results.communities.map((item: any) => <View key={item.id}>{renderCommunity({ item })}</View>)}
                        </View>
                    )}

                    {results.posts.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Discussions</Text>
                            {results.posts.map((item: any) => <View key={item.id}>{renderPost({ item })}</View>)}
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray100,
    },
    backBtn: { padding: 4 },
    inputWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray100,
        borderRadius: radii.xl,
        paddingHorizontal: 12,
        height: 44,
        gap: 8,
    },
    input: {
        flex: 1,
        fontFamily: fonts.medium,
        fontSize: 15,
        color: colors.black,
    },
    scrollContent: { paddingBottom: spacing.xl },
    section: { marginTop: spacing.lg },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.black,
        marginHorizontal: spacing.xl,
        marginBottom: spacing.sm,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: 12,
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.gray200,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
    name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
    username: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500 },

    commCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: 12,
        gap: 12,
    },
    commImg: { width: 44, height: 44, borderRadius: radii.md },
    type: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },

    postCard: {
        paddingHorizontal: spacing.xl,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray100,
    },
    postAuthor: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gray500, marginBottom: 4 },
    postSnippet: { fontFamily: fonts.regular, fontSize: 14, color: colors.black, lineHeight: 20 },

    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: -60 },
    placeholderIcon: { fontSize: 64, marginBottom: 20 },
    placeholderTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.black, textAlign: 'center' },
    placeholderSub: { fontFamily: fonts.regular, fontSize: 15, color: colors.gray500, textAlign: 'center', marginTop: 10, lineHeight: 22 },
});
