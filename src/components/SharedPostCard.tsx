import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../api/supabase';

interface SharedPostCardProps {
    postId: string;
    isMine: boolean;
}

export default function SharedPostCard({ postId, isMine }: SharedPostCardProps) {
    const { colors: themeColors, isDark } = useTheme();
    const router = useRouter();
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const { data, error } = await supabase
                    .from('posts')
                    .select('*, profiles(name, avatar_url, username)')
                    .eq('id', postId)
                    .single();
                
                if (data) setPost(data);
            } catch (e) {
                console.error('Error fetching shared post', e);
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [postId]);

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isMine ? 'rgba(255,255,255,0.1)' : themeColors.gray50, justifyContent: 'center', height: 100 }]}>
                <ActivityIndicator size="small" color={isMine ? '#FFFFFF' : themeColors.primary} />
            </View>
        );
    }

    if (!post) return null;

    const media = (post.media_urls && post.media_urls.length > 0)
        ? post.media_urls
        : (post.image_url ? [post.image_url] : []);
    const media_types = (post.media_types && post.media_types.length > 0)
        ? post.media_types
        : (post.image_url ? ['image'] : []);
    
    const hasMedia = media.length > 0;

    return (
        <TouchableOpacity 
            style={[
                styles.container, 
                { 
                    backgroundColor: isMine ? 'rgba(255,255,255,0.1)' : (isDark ? '#1A1A1A' : '#F3F4F6'),
                    borderColor: isMine ? 'rgba(255,255,255,0.2)' : themeColors.border
                }
            ]}
            onPress={() => router.push({ pathname: `/post/${postId}`, params: { post: JSON.stringify(post) } })}
            activeOpacity={0.8}
        >
            <View style={styles.header}>
                <Image 
                    source={{ uri: post.profiles?.avatar_url || 'https://via.placeholder.com/150' }} 
                    style={styles.avatar} 
                />
                <View>
                    <Text style={[styles.name, { color: isMine ? '#FFFFFF' : themeColors.black }]} numberOfLines={1}>
                        {post.profiles?.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.username, { color: isMine ? 'rgba(255,255,255,0.7)' : themeColors.gray500 }]} numberOfLines={1}>
                            @{post.profiles?.username}
                        </Text>
                        <Text style={{ color: isMine ? 'rgba(255,255,255,0.4)' : themeColors.gray400, fontSize: 10 }}>• Shared Post</Text>
                    </View>
                </View>
            </View>

            {post.content && (
                <Text 
                    style={[styles.content, { color: isMine ? '#FFFFFF' : themeColors.black }]} 
                    numberOfLines={3}
                >
                    {post.content}
                </Text>
            )}

            {hasMedia && (
                <View style={styles.mediaContainer}>
                    <Image source={{ uri: media[0] }} style={styles.media} />
                    {media_types?.[0] === 'video' && (
                        <View style={styles.playOverlay}>
                            <Ionicons name="play" size={20} color="#FFFFFF" />
                        </View>
                    )}
                    {media.length > 1 && (
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>+{media.length - 1}</Text>
                        </View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 12,
        marginTop: 4,
        marginBottom: 8,
        borderWidth: 1,
        width: 240,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 13,
    },
    username: {
        fontFamily: fonts.regular,
        fontSize: 11,
    },
    content: {
        fontFamily: fonts.regular,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 8,
    },
    mediaContainer: {
        height: 120,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    countBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    countText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontFamily: fonts.bold,
    },
});
