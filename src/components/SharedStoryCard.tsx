import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, fonts, spacing, radii } from '../constants/theme';
import { getStoryById } from '../api/stories';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';

interface SharedStoryCardProps {
    storyId: string;
    isMine?: boolean;
    onPress?: () => void;
}

const SharedStoryCard: React.FC<SharedStoryCardProps> = ({ storyId, isMine, onPress }) => {
    const [story, setStory] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getStoryById(storyId);
                if (res?.data) {
                    setStory(res.data);
                }
            } catch (e) {
                console.log('Error loading shared story', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [storyId]);

    const parseContent = (content: string) => {
        if (!content) return { text: '', theme: null };
        if (content.startsWith('__JSON_STORY__')) {
            try {
                const parts = content.split('__');
                return { 
                    text: parts[3] || '', 
                    theme: JSON.parse(parts[2]) 
                };
            } catch {
                return { text: content, theme: null };
            }
        }
        return { text: content, theme: null };
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loading, isMine ? styles.myCard : styles.theirCard]}>
                <ActivityIndicator size="small" color={isMine ? 'white' : colors.primary} />
            </View>
        );
    }

    if (!story) return null;

    const { text, theme } = parseContent(story.content || '');
    const isTextStory = story.media_url === 'text_story' || story.content?.startsWith('__JSON_STORY__');
    const profile = Array.isArray(story.profiles) ? story.profiles[0] : story.profiles;

    return (
        <TouchableOpacity 
            style={[styles.container, isMine ? styles.myCard : styles.theirCard]} 
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={styles.contentHeader}>
                <View style={styles.storyTag}>
                    <Ionicons name="play-circle" size={12} color="white" />
                    <Text style={styles.storyTagText}>Story</Text>
                </View>
                <Text style={styles.userName} numberOfLines={1}>{profile?.name || 'User'}</Text>
            </View>

            <View style={styles.previewContainer}>
                {isTextStory ? (
                    <View style={[styles.textPreview, { backgroundColor: theme?.bgColor || '#A154F2' }]}>
                        <Text style={[styles.previewText, { color: theme?.textColor || 'white' }]} numberOfLines={4}>
                            {text || story.content || 'Text Story'}
                        </Text>
                    </View>
                ) : story.media_type === 'video' ? (
                    <Video
                        source={{ uri: story.media_url }}
                        style={styles.mediaPreview}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={false}
                        isMuted={true}
                    />
                ) : (
                    <Image source={{ uri: story.media_url }} style={[styles.mediaPreview, { backgroundColor: '#333' }]} resizeMode="cover" />
                )}
                
                {!isTextStory && (
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)']} style={StyleSheet.absoluteFill}>
                        <View style={styles.playOverlay}>
                            <Ionicons name="play" size={24} color="white" />
                        </View>
                    </LinearGradient>
                )}
            </View>

            <View style={styles.viewFooter}>
                <Text style={styles.viewText}>Tap to view</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 180,
        borderRadius: 16,
        overflow: 'hidden',
        marginVertical: 4,
        backgroundColor: '#1A1A1A',
        // Shadow for premium feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    loading: { height: 120, justifyContent: 'center', alignItems: 'center' },
    myCard: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
    theirCard: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
    
    contentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    storyTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4,
    },
    storyTagText: { color: 'white', fontFamily: fonts.bold, fontSize: 10, textTransform: 'uppercase' },
    userName: { color: 'white', fontFamily: fonts.medium, fontSize: 11, flex: 1 },
    
    previewContainer: { height: 220, width: 180, position: 'relative' },
    textPreview: { flex: 1, padding: 12, justifyContent: 'center', alignItems: 'center' },
    previewText: { fontFamily: fonts.bold, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    mediaPreview: { width: '100%', height: '100%', backgroundColor: '#222' },
    playOverlay: { position: 'absolute', bottom: 10, left: 10 },
    
    viewFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    viewText: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.semibold, fontSize: 12 },
});

export default SharedStoryCard;
