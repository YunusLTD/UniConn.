import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, radii } from '../constants/theme';

export default function SkeletonLoader() {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.7,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [pulseAnim]);

    return (
        <View style={styles.container}>
            {[1, 2, 3, 4, 5].map((key) => (
                <View key={key} style={styles.card}>
                    <View style={styles.row}>
                        <Animated.View style={[styles.avatar, { opacity: pulseAnim }]} />
                        <View style={styles.content}>
                            <Animated.View style={[styles.line, { width: '35%', opacity: pulseAnim }]} />
                            <Animated.View style={[styles.line, { width: '85%', marginTop: 10, opacity: pulseAnim }]} />
                            <Animated.View style={[styles.line, { width: '65%', marginTop: 6, opacity: pulseAnim }]} />
                            <Animated.View style={[styles.mediaPlaceholder, { opacity: pulseAnim }]} />
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
        backgroundColor: colors.background,
    },
    card: {
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray200,
        backgroundColor: colors.white,
    },
    row: {
        flexDirection: 'row',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gray200,
        marginRight: 12,
    },
    content: {
        flex: 1,
        paddingTop: 6,
    },
    line: {
        height: 12,
        borderRadius: radii.sm,
        backgroundColor: colors.gray200,
    },
    mediaPlaceholder: {
        height: 160,
        borderRadius: radii.md,
        backgroundColor: colors.gray100,
        marginTop: 12,
        width: '100%',
    },
});
