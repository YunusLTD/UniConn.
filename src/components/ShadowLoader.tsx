import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue, ScrollView, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    backgroundColor?: string;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style, backgroundColor }: SkeletonProps) {
    const { isDark, colors } = useTheme();
    const opacity = useRef(new Animated.Value(isDark ? 0.1 : 0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: isDark ? 0.25 : 0.7,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: isDark ? 0.1 : 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [opacity, isDark]);

    const baseColor = isDark ? colors.gray100 : colors.gray200;

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: backgroundColor || baseColor,
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
        <View style={[s.card, { backgroundColor: colors.surface, borderBottomColor: colors.border }, style]}>
            <View style={s.row}>
                <View style={s.leftCol}>
                    <Skeleton width={40} height={40} borderRadius={20} />
                    <View style={[s.threadLine, { backgroundColor: colors.border }]} />
                </View>
                <View style={s.rightCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Skeleton width="40%" height={12} borderRadius={6} />
                        <Skeleton width="20%" height={10} borderRadius={5} />
                    </View>

                    <Skeleton width="70%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
                    <Skeleton width="100%" height={200} borderRadius={16} style={{ marginTop: 12 }} />
                    <View style={{ flexDirection: 'row', gap: 20, marginTop: 16 }}>
                        <Skeleton width={80} height={24} borderRadius={12} />
                        <Skeleton width={40} height={24} borderRadius={12} />
                    </View>
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
        <View style={[s.studentCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
            <View style={s.cardHeader}>
                <Skeleton width={48} height={48} borderRadius={14} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Skeleton width="50%" height={14} borderRadius={7} />
                    <Skeleton width="30%" height={10} borderRadius={5} style={{ marginTop: 8 }} />
                    <Skeleton width="70%" height={10} borderRadius={5} style={{ marginTop: 6 }} />
                </View>
                <Skeleton width={80} height={32} borderRadius={20} />
            </View>
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
    const { colors, isDark } = useTheme();

    return (
        <View style={{ backgroundColor: colors.background }}>

            {/* ── HEADER ── */}
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: 20 }}>

                {/* Top Row: Avatar + Stats */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Skeleton width={124} height={124} borderRadius={62} />

                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: spacing.md, gap: 8 }}>
                        {[0, 1, 2].map((i) => (
                            <View
                                key={i}
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingVertical: 30,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    backgroundColor: isDark ? colors.gray100 : colors.gray200,
                                    borderColor: colors.border,
                                    opacity: 0.5,
                                    gap: 4,
                                }}
                            >
                            </View>
                        ))}
                    </View>
                </View>

                {/* Bio Section */}
                <View style={{ marginTop: 18 }}>
                    <Skeleton width={140} height={18} borderRadius={9} />
                    <Skeleton width="92%" height={12} borderRadius={6} style={{ marginTop: 12 }} />
                    <Skeleton width="65%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 24 }}>
                    <Skeleton style={{ flex: 1 }} height={44} borderRadius={12} />
                    <Skeleton style={{ flex: 1 }} height={44} borderRadius={12} />
                </View>
                <View style={{ marginTop: 8 }}>
                    <Skeleton width="100%" height={44} borderRadius={12} />
                </View>

                {/* Tab Pills */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 32, marginBottom: 8 }}>
                    {[80, 85, 75, 90].map((w, i) => (
                        <Skeleton key={i} width={w} height={34} borderRadius={17} />
                    ))}
                </View>
            </View>

            {/* ── CONTENT FEED CARDS ── */}
            <View style={{ paddingHorizontal: 0, marginTop: 8, gap: 12 }}>
                <ShadowLoader type="feed" />
            </View>

        </View>
    );
}
export function CommunityDetailSkeleton() {
    const { colors } = useTheme();
    return (
        <View style={{ backgroundColor: colors.background }}>
            {/* Cover Skeleton */}
            <Skeleton width="100%" height={320} borderRadius={0} />

            <View style={{ padding: 20 }}>
                {/* Description Skeleton */}
                <Skeleton width="100%" height={12} borderRadius={6} />


                {/* Main Action Buttons */}
                <Skeleton width="100%" height={56} borderRadius={16} style={{ marginTop: 24 }} />

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <Skeleton style={{ flex: 1 }} height={48} borderRadius={12} />
                    <Skeleton width={100} height={48} borderRadius={12} />
                </View>

                {/* Tabs Skeleton */}
                <View style={{ marginTop: 32, alignItems: 'center' }}>
                    <Skeleton width={200} height={40} borderRadius={20} />
                </View>
            </View>


        </View>
    );
}

export function ExploreCommunitySkeleton() {
    const { colors } = useTheme();
    return (
        <View style={[s.card, { backgroundColor: colors.surface, borderBottomWidth: 0, borderWidth: 1, borderColor: colors.gray100, marginHorizontal: 16, marginBottom: 12, borderRadius: 20, padding: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Skeleton width={48} height={48} borderRadius={24} />
                <View style={{ flex: 1 }}>
                    <Skeleton width="60%" height={16} borderRadius={8} />
                    <Skeleton width="30%" height={10} borderRadius={5} style={{ marginTop: 8 }} />
                </View>
            </View>
            <Skeleton width="100%" height={12} borderRadius={6} style={{ marginTop: 16 }} />
            <Skeleton width="80%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
    );
}

export function StoriesFeedSkeleton() {
    const { colors, user } = useAuth() as any; // Using useAuth to get current user info for at least the name/avatar if available
    const { colors: themeColors } = useTheme();

    return (
        <View style={[s.storiesWrapper, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
                {/* "Me" Story Skeleton */}
                <View style={s.storyContainer}>
                    <View style={s.avatarContainerSkeleton}>
                        <Skeleton width={68} height={68} borderRadius={34} />
                        <View style={[s.plusIconSkeleton, { borderColor: themeColors.surface }]} />
                    </View>
                    <Skeleton width={30} height={10} borderRadius={5} style={{ marginTop: 8 }} />
                </View>

                {/* Other Stories Skeletons */}
                {[1, 2, 3, 4, 5].map((_, i) => (
                    <View key={i} style={s.storyContainer}>
                        <Skeleton width={68} height={68} borderRadius={34} />
                        <Skeleton width={40} height={10} borderRadius={5} style={{ marginTop: 8 }} />
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

export default function ShadowLoader({ type = 'feed' }: { type?: 'feed' | 'messages' | 'chat' | 'profile' | 'marketplace' | 'students' | 'communities' | 'study' | 'community' | 'explore_communities' | 'stories' }) {
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
        if (type === 'community') return <CommunityDetailSkeleton />;
        if (type === 'explore_communities') return [1, 2, 3, 4, 5].map(i => <ExploreCommunitySkeleton key={i} />);
        if (type === 'study') return [1, 2, 3, 4].map(i => <PostSkeleton key={i} style={{ marginHorizontal: 0 }} />);
        if (type === 'profile') return (
            <ScrollView showsVerticalScrollIndicator={false}>
                <ProfileHeaderSkeleton />
            </ScrollView>
        );
        if (type === 'stories') return <StoriesFeedSkeleton />;
        return [1, 2, 3, 4].map(i => <PostSkeleton key={i} />);
    };

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            {renderContent()}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        width: '100%',
    },
    card: {
        borderBottomWidth: 0.5,
    },
    row: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingTop: 14,
        paddingBottom: 4,
    },
    leftCol: {
        alignItems: 'center',
        width: 44,
        marginRight: 12,
    },
    rightCol: {
        flex: 1,
        paddingBottom: 14,
    },
    threadLine: {
        width: 1.5,
        flex: 1,
        marginTop: 8,
        borderRadius: 1,
        minHeight: 12,
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
    studentCard: {
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        marginHorizontal: 16,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statsSkeletonRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginLeft: 16,
        gap: 8,
    },
    statPillSkeleton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    storiesWrapper: {
        height: 110,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
    },
    storyContainer: {
        width: 80,
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    avatarContainerSkeleton: {
        position: 'relative',
        width: 68,
        height: 68,
    },
    plusIconSkeleton: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: '#A154F2',
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
    },
});

