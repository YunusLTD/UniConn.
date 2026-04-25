import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface UploadStatusEvent {
    id: string;
    type: 'post' | 'story' | 'market';
    status: 'uploading' | 'success' | 'error';
    message?: string;
}

const UploadProgressBanner: React.FC = () => {
    const { t } = useLanguage();
    const { isDark } = useTheme();
    const [upload, setUpload] = useState<UploadStatusEvent | null>(null);
    const translateY = useRef(new Animated.Value(100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener('upload_status', (event: UploadStatusEvent) => {
            setUpload(event);
            
            // Clear any existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            if (event.status === 'uploading') {
                // Show banner
                Animated.parallel([
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 6,
                    }),
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    })
                ]).start();
            } else if (event.status === 'success' || event.status === 'error') {
                if (event.status === 'success') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }

                // Hide banner after 3 seconds
                timeoutRef.current = setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(translateY, {
                            toValue: 100,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        })
                    ]).start(() => setUpload(null));
                }, 3000);
            }
        });

        return () => listener.remove();
    }, [translateY, opacity]);

    if (!upload) return null;

    const isSuccess = upload.status === 'success';
    const isError = upload.status === 'error';
    
    // Determine text
    let statusText = t('status_uploading') || 'Uploading...';
    if (isSuccess) statusText = t('success') || 'Success';
    if (isError) statusText = t('upload_failed') || 'Upload Failed';
    if (upload.message) statusText = upload.message;

    return (
        <Animated.View 
            style={[
                styles.container, 
                { 
                    transform: [{ translateY }],
                    opacity,
                    backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                }
            ]}
        >
            <View style={styles.content}>
                {upload.status === 'uploading' ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : isSuccess ? (
                    <View style={[styles.iconWrap, { backgroundColor: '#10B981' }]}>
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                    </View>
                ) : (
                    <View style={[styles.iconWrap, { backgroundColor: '#EF4444' }]}>
                        <Ionicons name="close" size={12} color="#FFF" />
                    </View>
                )}
                
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]} numberOfLines={1}>
                        {upload.type === 'story' ? (t('status_new_title') || 'New Moment') : (t('post_header') || 'Post')}
                    </Text>
                    <Text style={[styles.statusText, { color: isDark ? colors.gray400 : colors.gray500 }]} numberOfLines={1}>
                        {statusText}
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100, // Above the tab bar
        left: 20,
        right: 20,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 999,
        padding: 12,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        marginLeft: 12,
        flex: 1,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 13,
        marginBottom: 2,
    },
    statusText: {
        fontFamily: fonts.medium,
        fontSize: 12,
    },
});

export default UploadProgressBanner;
