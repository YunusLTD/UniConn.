import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, Platform, TouchableOpacity, Modal, Text, Pressable, Image, Animated, Dimensions, DeviceEventEmitter } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotifications } from '../../src/context/NotificationContext';
import { hapticLight, hapticSelection } from '../../src/utils/haptics';
import { useLanguage } from '../../src/context/LanguageContext';
import BottomSheet from '../../src/components/BottomSheet';
import UploadProgressBanner from '../../src/components/UploadProgressBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_WIDTH = SCREEN_WIDTH * 0.94;
const TAB_HEIGHT = 60;
const PILL_SPACING = 20;

import { ICONS } from '../../src/constants/icons';

function getIcons(isDark: boolean) {
    return {
        home: {
            active: isDark ? ICONS.tabs.home.white : ICONS.tabs.home.black,
            inactive: ICONS.tabs.home.gray
        },
        community: {
            active: isDark ? ICONS.tabs.explore.white : ICONS.tabs.explore.black,
            inactive: ICONS.tabs.explore.gray
        },
        heart: {
            active: isDark ? ICONS.tabs.marketplace.white : ICONS.tabs.marketplace.black,
            inactive: ICONS.tabs.marketplace.gray
        },
        market: {
            active: isDark ? ICONS.tabs.study.white : ICONS.tabs.study.black,
            inactive: ICONS.tabs.study.gray
        },
        profile: {
            active: isDark ? ICONS.tabs.pulse.white : ICONS.tabs.pulse.black,
            inactive: ICONS.tabs.pulse.gray
        },
        study: {
            active: isDark ? ICONS.tabs.profile.white : ICONS.tabs.profile.black,
            inactive: ICONS.tabs.profile.gray
        },
        chat: isDark ? ICONS.tabs.chat.white : ICONS.tabs.chat.black,
        add: isDark ? ICONS.tabs.add.white : ICONS.tabs.add.black,
    };
}

export default function TabLayout() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const { activityUnreadCount, messageUnreadCount, pulseUnreadCount } = useNotifications();
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const tabIcons = getIcons(isDark);

    function TabIcon({ name, focused, badgeCount }: { name: keyof ReturnType<typeof getIcons>; focused: boolean; badgeCount?: number }) {
        const icon = tabIcons[name] as any;
        const url = focused ? icon.active : icon.inactive;
        return (
            <View style={s.iconWrap}>
                <Image
                    source={url}
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

        // Find current active index in our filtered list
        const activeVisibleIndex = visibleRoutes.findIndex((r: any) => r.name === state.routes[state.index].name);

        const isIOS = Platform.OS === 'ios';

        // Animation for hiding/showing tab bar
        const translateY = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            const sub = DeviceEventEmitter.addListener('setTabBarVisible', (visible: boolean) => {
                Animated.spring(translateY, {
                    toValue: visible ? 0 : 120, // Move down by 120 to fully hide
                    useNativeDriver: true,
                    tension: 50,
                    friction: 10,
                }).start();
            });

            // Ensure tab bar is visible when switching tabs
            const showSub = navigation.addListener('focus', () => {
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 10,
                }).start();
            });

            return () => {
                sub.remove();
                showSub();
            };
        }, [navigation]);

        const renderTabBarContent = () => (
            <>
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
            </>
        );

        return (
            <Animated.View style={[s.tabBarContainer, { transform: [{ translateY }] }]}>
                <View style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: isDark ? 0.6 : 0.15,
                    shadowRadius: 20,
                    elevation: 20,
                    borderRadius: TAB_HEIGHT / 2,
                }}>
                    {isIOS ? (
                        <BlurView
                            intensity={85}
                            tint={isDark ? 'dark' : 'light'}
                            style={[
                                s.tabBar,
                                {
                                    backgroundColor: isDark ? 'rgba(30, 30, 30, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.4)',
                                    borderWidth: 1,
                                }
                            ]}
                        >
                            {renderTabBarContent()}
                        </BlurView>
                    ) : (
                        <View
                            style={[
                                s.tabBar,
                                {
                                    backgroundColor: isDark ? 'rgba(28, 28, 30, 0.98)' : 'rgba(255, 255, 255, 0.96)',
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                                }
                            ]}
                        >
                            {renderTabBarContent()}
                        </View>
                    )}
                </View>
            </Animated.View>
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
                <Image source={isDark ? ICONS.pulse.black : ICONS.pulse.white} style={{ width: 16, height: 16 }} />
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
                <Image source={tabIcons.add} style={{ width: 24, height: 24 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { hapticLight(); router.push('/activity'); }} style={s.headerBtn} hitSlop={8}>
                <Image source={tabIcons.heart.inactive} style={{ width: 24, height: 24 }} />
                {activityUnreadCount > 0 && (
                    <View style={[s.badge, { top: 2, right: 2, borderColor: colors.surface }]}>
                        <Text style={[s.badgeText, { color: '#FFFFFF' }]}>
                            {activityUnreadCount > 9 ? '9+' : activityUnreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { hapticLight(); router.push('/messages'); }} style={s.headerBtn} hitSlop={8}>
                <Image source={tabIcons.chat} style={{ width: 24, height: 24 }} />
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
                <Image source={tabIcons.add} style={{ width: 24, height: 24 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { hapticLight(); router.push('/activity'); }} style={s.headerBtn} hitSlop={8}>
                <Image source={tabIcons.heart.inactive} style={{ width: 24, height: 24 }} />
                {activityUnreadCount > 0 && (
                    <View style={[s.badge, { top: 2, right: 2, borderColor: colors.surface }]}>
                        <Text style={[s.badgeText, { color: '#FFFFFF' }]}>
                            {activityUnreadCount > 9 ? '9+' : activityUnreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { hapticLight(); router.push('/messages'); }} style={s.headerBtn} hitSlop={8}>
                <Image source={tabIcons.chat} style={{ width: 24, height: 24 }} />
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
            <BottomSheet visible={showCreateMenu} onClose={() => setShowCreateMenu(false)}>
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
                    style={[s.sheetOption, { borderTopColor: colors.border, marginBottom: spacing.md }]}
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
            </BottomSheet>
            <UploadProgressBanner />
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
        width: TAB_BAR_WIDTH,
        height: TAB_HEIGHT,
        borderRadius: TAB_HEIGHT / 2,
        backgroundColor: 'transparent',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 20,
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
