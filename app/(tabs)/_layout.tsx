import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, Platform, TouchableOpacity, Modal, Text, Pressable, Image, Animated, Dimensions } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotifications } from '../../src/context/NotificationContext';
import { hapticLight, hapticSelection } from '../../src/utils/haptics';
import { useLanguage } from '../../src/context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_WIDTH = SCREEN_WIDTH * 0.94;
const TAB_HEIGHT = 60;
const PILL_SPACING = 20;

function getIcons(isDark: boolean) {
    const black = isDark ? 'FFFFFF' : '000000';
    const gray = isDark ? '8E8E93' : '8E8E93';
    return {
        home: {
            active: `https://img.icons8.com/?size=100&id=Gc9qmZNN9yFN&format=png&color=${black}`,
            inactive: `https://img.icons8.com/?size=100&id=Gc9qmZNN9yFN&format=png&color=${gray}`
        },
        community: {
            active: `https://img.icons8.com/?size=150&id=111487&format=png&color=${black}`,
            inactive: `https://img.icons8.com/?size=150&id=111487&format=png&color=${gray}`
        },
        heart: {
            active: `https://img.icons8.com/?size=100&id=85038&format=png&color=${black}`,
            inactive: `https://img.icons8.com/?size=100&id=85038&format=png&color=${gray}`
        },
        market: {
            active: `https://img.icons8.com/?size=100&id=rh2XLtRql4uV&format=png&color=${black}`,
            inactive: `https://img.icons8.com/?size=100&id=rh2XLtRql4uV&format=png&color=${gray}`
        },
        profile: {
            active: `https://img.icons8.com/?size=100&id=YXG86oegZMMh&format=png&color=${black}`,
            inactive: `https://img.icons8.com/?size=100&id=YXG86oegZMMh&format=png&color=${gray}`
        },
        study: {
            active: `https://img.icons8.com/?size=100&id=6895&format=png&color=${black}`,
            inactive: `https://img.icons8.com/?size=100&id=6895&format=png&color=${gray}`
        },
        chat: `https://img.icons8.com/?size=100&id=7859&format=png&color=${black}`,
        add: `https://img.icons8.com/?size=100&id=84061&format=png&color=${black}`,
    };
}

export default function TabLayout() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const { activityUnreadCount, messageUnreadCount, pulseUnreadCount } = useNotifications();
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const ICONS = getIcons(isDark);

    function TabIcon({ name, focused, badgeCount }: { name: keyof ReturnType<typeof getIcons>; focused: boolean; badgeCount?: number }) {
        const icon = ICONS[name] as any;
        const url = typeof icon === 'string' ? icon : (focused ? icon.active : icon.inactive);
        return (
            <View style={s.iconWrap}>
                <Image
                    source={{ uri: url }}
                    style={{
                        width: 22,
                        height: 22,
                        opacity: focused ? 1 : 0.5,
                        transform: [{ scale: focused ? 1.1 : 1 }]
                    }}
                />
                {badgeCount !== undefined && badgeCount > 0 && (
                    <View style={[s.tabBadge, { backgroundColor: '#EF4444' }]}>
                        <Text style={s.tabBadgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                    </View>
                )}
            </View>
        );
    }

    const CustomTabBar = ({ state, descriptors, navigation }: any) => {
        const TAB_ROUTES = ['home', 'communities', 'marketplace', 'study', 'profile'];
        const visibleRoutes = state.routes.filter((r: any) =>
            TAB_ROUTES.includes(r.name) && descriptors[r.key].options.href !== null
        );

        const totalTabs = visibleRoutes.length;
        const tabWidth = TAB_BAR_WIDTH / totalTabs;

        // Find current active index in our filtered list
        const activeVisibleIndex = visibleRoutes.findIndex((r: any) => r.name === state.routes[state.index].name);
        const translateX = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            if (activeVisibleIndex !== -1) {
                Animated.spring(translateX, {
                    toValue: activeVisibleIndex * tabWidth,
                    useNativeDriver: true,
                    tension: 40,
                    friction: 8,
                }).start();
            }
        }, [activeVisibleIndex]);

        return (
            <View style={s.tabBarContainer}>
                <View style={[s.tabBarShadow, { shadowColor: isDark ? '#000' : colors.gray400 }]} />
                <View
                    style={[
                        s.tabBar,
                        {
                            backgroundColor: isDark ? 'rgba(28, 28, 30, 0.98)' : 'rgba(255, 255, 255, 0.96)',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                        }
                    ]}
                >
                    {visibleRoutes.map((route: any, index: number) => {
                        const isFocused = visibleRoutes[activeVisibleIndex]?.name === route.name;

                        const onPress = () => {
                            if (!isFocused) hapticSelection();
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        let iconName: keyof ReturnType<typeof getIcons>;
                        if (route.name === 'home') iconName = 'home';
                        else if (route.name === 'communities') iconName = 'community';
                        else if (route.name === 'marketplace') iconName = 'market';
                        else if (route.name === 'study') iconName = 'study';
                        else if (route.name === 'profile') iconName = 'profile';
                        else return null;

                        return (
                            <TouchableOpacity
                                key={route.key}
                                onPress={onPress}
                                style={s.tabItem}
                                activeOpacity={0.7}
                            >
                                <TabIcon name={iconName} focused={isFocused} />
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        s.tabLabel,
                                        {
                                            color: isFocused ? colors.black : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'),
                                        }
                                    ]}
                                >
                                    {descriptors[route.key].options.title}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const handleCreateAction = (route: string) => {
        hapticSelection();
        setShowCreateMenu(false);
        router.push(route as any);
    };

    // Feed-only header right (with PULSE)
    const feedHeaderRight = () => (
        <View style={[s.headerRight, { marginRight: spacing.lg }]}>
            <TouchableOpacity
                onPress={() => { hapticLight(); router.push('/pulse'); }}
                style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: isDark ? '#FFFFFF' : '#000000',
                    borderRadius: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    position: 'relative',
                }}
                hitSlop={8}
            >
                <Image source={{ uri: `https://img.icons8.com/?size=100&id=33452&format=png&color=${isDark ? '000000' : 'FFFFFF'}` }} style={{ width: 16, height: 16 }} />
                <Text
                    numberOfLines={1}
                    style={{ fontFamily: fonts.bold, fontSize: 11, color: isDark ? '#000000' : '#FFFFFF' }}
                >
                    {t('pulse_title')}
                </Text>
                {pulseUnreadCount > 0 && (
                    <View style={[s.badge, { top: -4, right: -4, width: 18, height: 18, borderRadius: 9, borderColor: colors.surface }]}>
                        <Text style={[s.badgeText, { color: '#FFFFFF' }]}>
                            {pulseUnreadCount > 9 ? '9+' : pulseUnreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { hapticLight(); setShowCreateMenu(true); }} style={s.headerBtn} hitSlop={8}>
                <Image source={{ uri: ICONS.add }} style={{ width: 24, height: 24 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { hapticLight(); router.push('/activity'); }} style={s.headerBtn} hitSlop={8}>
                <Image source={{ uri: ICONS.heart.inactive }} style={{ width: 24, height: 24 }} />
                {activityUnreadCount > 0 && (
                    <View style={[s.badge, { top: 2, right: 2, borderColor: colors.surface }]}>
                        <Text style={[s.badgeText, { color: '#FFFFFF' }]}>
                            {activityUnreadCount > 9 ? '9+' : activityUnreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { hapticLight(); router.push('/messages'); }} style={s.headerBtn} hitSlop={8}>
                <Image source={{ uri: ICONS.chat }} style={{ width: 24, height: 24 }} />
                {messageUnreadCount > 0 && (
                    <View style={[s.badge, { borderColor: colors.surface }]}>
                        <Text style={[s.badgeText, { color: '#FFFFFF' }]}>
                            {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );

    // Default header right (NO PULSE — for all other tabs)
    const defaultHeaderRight = () => (
        <View style={[s.headerRight, { marginRight: spacing.lg }]}>
            <TouchableOpacity onPress={() => { hapticLight(); setShowCreateMenu(true); }} style={s.headerBtn} hitSlop={8}>
                <Image source={{ uri: ICONS.add }} style={{ width: 24, height: 24 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { hapticLight(); router.push('/activity'); }} style={s.headerBtn} hitSlop={8}>
                <Image source={{ uri: ICONS.heart.inactive }} style={{ width: 24, height: 24 }} />
                {activityUnreadCount > 0 && (
                    <View style={[s.badge, { top: 2, right: 2, borderColor: colors.surface }]}>
                        <Text style={[s.badgeText, { color: '#FFFFFF' }]}>
                            {activityUnreadCount > 9 ? '9+' : activityUnreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { hapticLight(); router.push('/messages'); }} style={s.headerBtn} hitSlop={8}>
                <Image source={{ uri: ICONS.chat }} style={{ width: 24, height: 24 }} />
                {messageUnreadCount > 0 && (
                    <View style={[s.badge, { borderColor: colors.surface }]}>
                        <Text style={[s.badgeText, { color: '#FFFFFF' }]}>
                            {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Tabs
                tabBar={(props) => <CustomTabBar {...props} />}
                screenOptions={{
                    tabBarActiveTintColor: colors.black,
                    tabBarInactiveTintColor: colors.gray400,
                    headerStyle: {
                        backgroundColor: colors.surface,
                        elevation: 0,
                        shadowOpacity: 0,
                    },
                    headerShadowVisible: false,
                    headerTitleStyle: {
                        fontFamily: fonts.bold,
                        fontSize: 22,
                        color: colors.black,
                    },
                    headerTitleAlign: 'left',
                    headerRight: defaultHeaderRight,
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: t('feed'),
                        headerRight: feedHeaderRight,
                    }}
                />
                <Tabs.Screen
                    name="communities"
                    options={{
                        title: t('explore'),
                    }}
                />
                <Tabs.Screen
                    name="marketplace"
                    options={{
                        title: t('marketplace'),
                    }}
                />
                <Tabs.Screen
                    name="study"
                    options={{
                        title: t('study'),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: t('profile'),
                        headerShown: false,
                    }}
                />
                <Tabs.Screen
                    name="activity"
                    options={{
                        href: null,
                    }}
                />
            </Tabs>

            {/* Create Menu — Bottom Sheet Style */}
            <Modal
                transparent
                visible={showCreateMenu}
                animationType="slide"
                onRequestClose={() => setShowCreateMenu(false)}
            >
                <Pressable
                    style={s.overlay}
                    onPress={() => setShowCreateMenu(false)}
                >
                    <View style={[s.sheet, { backgroundColor: colors.surface }]}>
                        <View style={[s.sheetHandle, { backgroundColor: colors.gray300 }]} />
                        <Text style={[s.sheetTitle, { color: colors.black }]}>{t('create')}</Text>

                        <TouchableOpacity
                            style={[s.sheetOption, { borderTopColor: colors.border }]}
                            onPress={() => handleCreateAction('/create-post')}
                        >
                            <View style={[s.sheetIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Ionicons name="document-text-outline" size={24} color={colors.black} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.sheetLabel, { color: colors.black }]}>{t('new_post')}</Text>
                                <Text style={[s.sheetSub, { color: colors.gray500 }]}>{t('share_with_campus')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.sheetOption, { borderTopColor: colors.border }]}
                            onPress={() => handleCreateAction('/events/create')}
                        >
                            <View style={[s.sheetIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Ionicons name="calendar-outline" size={24} color={colors.black} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.sheetLabel, { color: colors.black }]}>{t('new_event')}</Text>
                                <Text style={[s.sheetSub, { color: colors.gray500 }]}>{t('organize_activities')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.sheetOption, { borderTopColor: colors.border }]}
                            onPress={() => handleCreateAction('/marketplace/create')}
                        >
                            <View style={[s.sheetIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Ionicons name="cart-outline" size={24} color={colors.black} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.sheetLabel, { color: colors.black }]}>{t('sell_request')}</Text>
                                <Text style={[s.sheetSub, { color: colors.gray500 }]}>{t('list_on_market')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.sheetOption, { borderTopColor: colors.border }]}
                            onPress={() => handleCreateAction('/study/create')}
                        >
                            <View style={[s.sheetIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Ionicons name="school-outline" size={24} color={colors.black} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.sheetLabel, { color: colors.black }]}>{t('ask_question')}</Text>
                                <Text style={[s.sheetSub, { color: colors.gray500 }]}>{t('get_homework_help')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    iconWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 28,
        width: 28,
    },
    tabBarContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 30 : 10,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: (SCREEN_WIDTH - TAB_BAR_WIDTH) / 2,
    },
    tabBarShadow: {
        position: 'absolute',
        width: TAB_BAR_WIDTH - 20,
        height: TAB_HEIGHT - 6,
        borderRadius: TAB_HEIGHT / 2,
        backgroundColor: 'transparent',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 10,
    },
    tabBar: {
        flexDirection: 'row',
        height: TAB_HEIGHT,
        width: TAB_BAR_WIDTH,
        borderRadius: TAB_HEIGHT / 2,
        alignItems: 'center',
        justifyContent: 'space-around',
        overflow: 'hidden',
        borderWidth: 1.5,
    },
    tabItem: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: -2,
    },
    tabLabel: {
        fontSize: 10,
        fontFamily: fonts.medium,
        marginTop: 0,
    },
    tabBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    tabBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontFamily: fonts.bold,
        includeFontPadding: false,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    headerBtn: {
        padding: 6,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    badgeText: {
        fontSize: 9,
        fontFamily: fonts.bold,
        includeFontPadding: false,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        paddingHorizontal: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    sheetTitle: {
        fontFamily: fonts.bold,
        fontSize: 22,
        marginBottom: 20,
    },
    sheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderTopWidth: 0.5,
        gap: 14,
    },
    sheetIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetLabel: {
        fontFamily: fonts.semibold,
        fontSize: 15,
    },
    sheetSub: {
        fontFamily: fonts.regular,
        fontSize: 12,
        marginTop: 1,
    },
});
