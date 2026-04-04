import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue, ScrollView, Dimensions } from 'react-native';
import { radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
    const { isDark, colors } = useTheme();
    const opacity = useRef(new Animated.Value(isDark ? 0.15 : 0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: isDark ? 0.4 : 0.7,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: isDark ? 0.15 : 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [opacity, isDark]);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: isDark ? colors.gray100 : colors.gray200,
                    opacity,
                },
                style,
            ]}
        />
    );
}

export function PostSkeleton({ style }: { style?: ViewStyle }) {
    const { colors } = useTheme();
    return (
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
            <View style={s.row}>
                <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 16 }} />
                <View style={s.content}>
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
    const { colors } = useTheme();
    return (
        <View style={[s.messageItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Skeleton width={48} height={48} borderRadius={24} />
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Skeleton width="40%" height={14} borderRadius={7} />
                <Skeleton width="70%" height={10} borderRadius={5} style={{ marginTop: 8 }} />
            </View>
        </View>
    );
}

export function MarketplaceItemSkeleton() {
    const { colors } = useTheme();
    const itemWidth = (SCREEN_WIDTH - spacing.lg * 2 - 12) / 2;
    return (
        <View style={[s.marketCard, { width: itemWidth, backgroundColor: colors.surface, borderColor: colors.border }]}>
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
    const { colors } = useTheme();
    return (
        <View style={[s.studentItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
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
    const { colors } = useTheme();
    return (
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
    const { colors, isDark } = useTheme();
    return (
        <View style={[s.bubbleWrap, isMine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
            <Skeleton
                width={isMine ? "60%" : "70%"}
                height={44}
                borderRadius={22}
                style={{ backgroundColor: isMine ? (isDark ? '#374151' : '#E5E7EB') : (isDark ? '#1F2937' : '#F3F4F6') }}
            />
        </View>
    );
}

export function ProfileHeaderSkeleton() {
    const { colors } = useTheme();
    return (
        <View style={[s.profileHeader, { backgroundColor: colors.background }]}>
            <View style={s.profileTop}>
                <Skeleton width={112} height={112} borderRadius={56} />
                <View style={s.statsSkeletonRow}>
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
            <View style={{ marginTop: 20 }}>
                <Skeleton width="50%" height={24} borderRadius={12} />
                <Skeleton width="80%" height={14} borderRadius={7} style={{ marginTop: 12 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <Skeleton style={{ flex: 1 }} height={52} borderRadius={26} />
                <Skeleton width={52} height={52} borderRadius={26} />
            </View>
            <View style={{ marginTop: 32 }}>
                <Skeleton width="100%" height={52} borderRadius={26} />
            </View>
        </View>
    );
}

export default function ShadowLoader({ type = 'feed' }: { type?: 'feed' | 'messages' | 'chat' | 'profile' | 'marketplace' | 'students' | 'communities' | 'study' }) {
    const { colors } = useTheme();
    
    const renderContent = () => {
        if (type === 'messages') return [1, 2, 3, 4, 5, 6, 7, 8].map(i => <MessageItemSkeleton key={i} />);
        if (type === 'communities') return [1, 2, 3, 4, 5].map(i => <CommunityItemSkeleton key={i} />);
        if (type === 'marketplace') return (
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <MarketplaceItemSkeleton />
                    <MarketplaceItemSkeleton />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                    <MarketplaceItemSkeleton />
                    <MarketplaceItemSkeleton />
                </View>
            </View>
        );
        if (type === 'students') return [1, 2, 3, 4, 5, 6, 7, 8].map(i => <StudentItemSkeleton key={i} />);
        if (type === 'chat') return [1, 2, 3, 4, 5].map(i => <ChatBubbleSkeleton key={i} isMine={i % 2 === 0} />);
        if (type === 'study') return [1, 2, 3, 4].map(i => <PostSkeleton key={i} style={{ marginHorizontal: 0 }} />);
        if (type === 'profile') return (
            <ScrollView showsVerticalScrollIndicator={false}>
                <ProfileHeaderSkeleton />
                <View style={{ marginTop: 4 }}>
                    <PostSkeleton style={{ marginHorizontal: spacing.md, transform: [{ scale: 0.95 }] }} />
                    <PostSkeleton style={{ marginHorizontal: spacing.md, transform: [{ scale: 0.95 }] }} />
                </View>
            </ScrollView>
        );
        return [1, 2, 3, 4].map(i => <PostSkeleton key={i} />);
    };

    return (
        <View style={[s.container, { backgroundColor: colors.background, paddingTop: (type === 'profile' || type === 'messages') ? 0 : 24 }]}>
            {renderContent()}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    card: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 16,
        marginHorizontal: spacing.md,
        borderWidth: 1,
    },
    row: {
        flexDirection: 'row',
    },
    content: {
        flex: 1,
        paddingTop: 6,
    },
    messageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 0.5,
    },
    marketCard: {
        borderRadius: radii.lg,
        overflow: 'hidden',
        borderWidth: 1,
    },
    studentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 0.5,
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

