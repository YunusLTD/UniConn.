import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue, ScrollView, Dimensions } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: colors.gray100,
                    opacity,
                },
                style,
            ]}
        />
    );
}

export function PostSkeleton({ style }: { style?: ViewStyle }) {
    return (
        <View style={[styles.card, style]}>
            <View style={styles.row}>
                <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 16 }} />
                <View style={styles.content}>
                    <Skeleton width="35%" height={10} borderRadius={5} />
                    <Skeleton width="80%" height={10} borderRadius={5} style={{ marginTop: 12 }} />
                    <Skeleton width="60%" height={10} borderRadius={5} style={{ marginTop: 8 }} />
                    <Skeleton width="100%" height={150} borderRadius={20} style={{ marginTop: 12 }} />
                </View>
            </View>
        </View>
    );
}

export function MessageItemSkeleton() {
    return (
        <View style={styles.messageItem}>
            <Skeleton width={48} height={48} borderRadius={24} />
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Skeleton width="40%" height={14} borderRadius={7} />
                <Skeleton width="70%" height={10} borderRadius={5} style={{ marginTop: 8 }} />
            </View>
        </View>
    );
}

export function MarketplaceItemSkeleton() {
    const itemWidth = (SCREEN_WIDTH - spacing.lg * 2 - 12) / 2;
    return (
        <View style={[styles.marketCard, { width: itemWidth }]}>
            <Skeleton width="100%" height={itemWidth} borderRadius={16} />
            <View style={{ padding: 12 }}>
                <Skeleton width="40%" height={16} borderRadius={8} />
                <Skeleton width="80%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
                <Skeleton width="50%" height={10} borderRadius={5} style={{ marginTop: 8 }} />
            </View>
        </View>
    );
}

export function StudentItemSkeleton() {
    return (
        <View style={styles.studentItem}>
            <Skeleton width={50} height={50} borderRadius={14} />
            <View style={{ flex: 1, marginLeft: 14 }}>
                <Skeleton width="50%" height={14} borderRadius={7} />
                <Skeleton width="30%" height={10} borderRadius={5} style={{ marginTop: 8 }} />
                <Skeleton width="70%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
            </View>
            <Skeleton width={80} height={32} borderRadius={radii.md} />
        </View>
    );
}

export function CommunityItemSkeleton() {
    return (
        <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                    <Skeleton width="50%" height={16} borderRadius={8} />
                    <Skeleton width="30%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
                </View>
            </View>
            <Skeleton width="90%" height={12} borderRadius={6} style={{ marginTop: 16 }} />
            <Skeleton width="70%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
    );
}

export function ChatBubbleSkeleton({ isMine }: { isMine: boolean }) {
    return (
        <View style={[styles.bubbleWrap, isMine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
            <Skeleton
                width={isMine ? "60%" : "70%"}
                height={44}
                borderRadius={22}
                style={{ backgroundColor: isMine ? colors.gray200 : colors.gray100 }}
            />
        </View>
    );
}

export function ProfileHeaderSkeleton() {
    return (
        <View style={styles.profileHeader}>
            <View style={styles.profileTop}>
                {/* Large Avatar (LEFT) */}
                <Skeleton width={112} height={112} borderRadius={56} />

                {/* Stats Section (RIGHT) */}
                <View style={styles.statsSkeletonRow}>
                    <View style={{ alignItems: 'center' }}>
                        <Skeleton width={32} height={20} borderRadius={10} />
                        <Skeleton width={48} height={10} borderRadius={5} style={{ marginTop: 8 }} />
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <Skeleton width={32} height={20} borderRadius={10} />
                        <Skeleton width={48} height={10} borderRadius={5} style={{ marginTop: 8 }} />
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <Skeleton width={32} height={20} borderRadius={10} />
                        <Skeleton width={48} height={10} borderRadius={5} style={{ marginTop: 8 }} />
                    </View>
                </View>
            </View>

            {/* Name/Bio */}
            <View style={{ marginTop: 20 }}>
                <Skeleton width="50%" height={24} borderRadius={12} />
                <Skeleton width="80%" height={14} borderRadius={7} style={{ marginTop: 12 }} />
            </View>

            {/* Action Buttons (Large Pills) */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <Skeleton style={{ flex: 1 }} height={52} borderRadius={26} />
                <Skeleton width={52} height={52} borderRadius={26} />
            </View>

            {/* Tab Bar (Segmented Pill) */}
            <View style={{ marginTop: 32 }}>
                <Skeleton width="100%" height={52} borderRadius={26} />
            </View>
        </View>
    );
}

export default function ShadowLoader({ type = 'feed' }: { type?: 'feed' | 'messages' | 'chat' | 'profile' | 'marketplace' | 'students' | 'communities' | 'study' }) {
    if (type === 'messages') {
        return (
            <View style={styles.container}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <MessageItemSkeleton key={i} />)}
            </View>
        );
    }
    if (type === 'communities') {
        return (
            <View style={[styles.container, { paddingTop: 10 }]}>
                {[1, 2, 3, 4, 5].map(i => <CommunityItemSkeleton key={i} />)}
            </View>
        );
    }
    if (type === 'marketplace') {
        return (
            <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingTop: 20 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <MarketplaceItemSkeleton />
                    <MarketplaceItemSkeleton />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                    <MarketplaceItemSkeleton />
                    <MarketplaceItemSkeleton />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                    <MarketplaceItemSkeleton />
                    <MarketplaceItemSkeleton />
                </View>
            </View>
        );
    }
    if (type === 'students') {
        return (
            <View style={[styles.container]}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <StudentItemSkeleton key={i} />)}
            </View>
        );
    }
    if (type === 'chat') {
        return (
            <View style={[styles.container, { paddingBottom: 100 }]}>
                <ChatBubbleSkeleton isMine={false} />
                <ChatBubbleSkeleton isMine={true} />
                <ChatBubbleSkeleton isMine={false} />
                <ChatBubbleSkeleton isMine={false} />
                <ChatBubbleSkeleton isMine={true} />
            </View>
        );
    }
    if (type === 'study') {
        return (
            <View style={[styles.container, { paddingHorizontal: spacing.sm }]}>
                {[1, 2, 3, 4].map(i => <PostSkeleton key={i} style={{ marginHorizontal: 0 }} />)}
            </View>
        );
    }
    if (type === 'profile') {
        return (
            <ScrollView style={[styles.container, { paddingTop: 0 }]} showsVerticalScrollIndicator={false}>
                <ProfileHeaderSkeleton />
                <View style={{ marginTop: 4 }}>
                    <PostSkeleton style={{ marginHorizontal: spacing.md, transform: [{ scale: 0.95 }] }} />
                    <PostSkeleton style={{ marginHorizontal: spacing.md, transform: [{ scale: 0.95 }] }} />
                </View>
            </ScrollView>
        );
    }
    return (
        <View style={[styles.container, { paddingTop: 24 }]}>
            {[1, 2, 3, 4].map(i => <PostSkeleton key={i} />)}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    card: {
        padding: 20,
        backgroundColor: colors.white,
        borderRadius: 20,
        marginBottom: 16,
        marginHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    row: {
        flexDirection: 'row',
    },
    content: {
        flex: 1,
        paddingTop: 6,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    messageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray100,
        backgroundColor: colors.white,
    },
    marketCard: {
        backgroundColor: colors.white,
        borderRadius: radii.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    studentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.white,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray100,
    },
    bubbleWrap: {
        flexDirection: 'row',
        marginBottom: 16,
        paddingHorizontal: spacing.md,
    },
    profileHeader: {
        paddingTop: 20,
        paddingHorizontal: spacing.md,
        paddingBottom: 24,
        backgroundColor: colors.white,
    },
    profileTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statsSkeletonRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginLeft: 24,
    }
});
