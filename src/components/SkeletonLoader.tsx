import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function SkeletonLoader() {
    const { colors, isDark } = useTheme();
    const pulseAnim = useRef(new Animated.Value(isDark ? 0.2 : 0.4)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: isDark ? 0.4 : 0.8,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: isDark ? 0.2 : 0.4,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [pulseAnim, isDark]);

    const skeletonColor = isDark ? '#262626' : colors.gray200;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {[1, 2, 3, 4, 5].map((key) => (
                <View key={key} style={[styles.card, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <View style={styles.row}>
                        <Animated.View style={[styles.avatar, { opacity: pulseAnim, backgroundColor: skeletonColor }]} />
                        <View style={styles.content}>
                            <Animated.View style={[styles.line, { width: '35%', opacity: pulseAnim, backgroundColor: skeletonColor }]} />
                            <Animated.View style={[styles.line, { width: '85%', marginTop: 10, opacity: pulseAnim, backgroundColor: skeletonColor }]} />
                            <Animated.View style={[styles.line, { width: '65%', marginTop: 6, opacity: pulseAnim, backgroundColor: skeletonColor }]} />
                            <Animated.View style={[styles.mediaPlaceholder, { opacity: pulseAnim, backgroundColor: isDark ? '#1A1A1A' : colors.gray100 }]} />
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    card: {
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 0.5,
    },
    row: {
        flexDirection: 'row',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    content: {
        flex: 1,
        paddingTop: 6,
    },
    line: {
        height: 12,
        borderRadius: radii.sm,
    },
    mediaPlaceholder: {
        height: 160,
        borderRadius: radii.md,
        marginTop: 12,
        width: '100%',
    },
});

