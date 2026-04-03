import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, Platform, TouchableOpacity, Modal, Text, Pressable, Image } from 'react-native';
import React, { useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotifications } from '../../src/context/NotificationContext';
import { hapticLight, hapticSelection } from '../../src/utils/haptics';

const TAB_HEIGHT = Platform.OS === 'ios' ? 80 : 62;

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
    const { activityUnreadCount, messageUnreadCount, pulseUnreadCount } = useNotifications();
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const ICONS = getIcons(isDark);

    function TabIcon({ name, focused }: { name: keyof ReturnType<typeof getIcons>; focused: boolean }) {
        const icon = ICONS[name] as any;
        const url = typeof icon === 'string' ? icon : (focused ? icon.active : icon.inactive);
        return (
            <View style={s.iconWrap}>
                <Image
                    source={{ uri: url }}
                    style={{ width: 24, height: 24, opacity: focused ? 1 : 0.6 }}
                />
            </View>
        );
    }

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
                <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: isDark ? '#000000' : '#FFFFFF', letterSpacing: 1 }}>PULSE</Text>
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
                screenOptions={{
                    tabBarActiveTintColor: colors.black,
                    tabBarInactiveTintColor: colors.gray400,
                    tabBarShowLabel: true,
                    tabBarLabelStyle: {
                        fontFamily: fonts.medium,
                        fontSize: 10,
                        marginBottom: Platform.OS === 'ios' ? 0 : 4,
                    },
                    tabBarStyle: {
                        backgroundColor: colors.surface,
                        borderTopWidth: 0.5,
                        borderTopColor: colors.border,
                        height: TAB_HEIGHT + 4,
                        elevation: 0,
                    },
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
                        title: 'Feed',
                        headerRight: feedHeaderRight,
                        tabBarIcon: ({ focused }) => (
                            <TabIcon name="home" focused={focused} />
                        ),
                    }}
                    listeners={{ tabPress: () => hapticSelection() }}
                />
                <Tabs.Screen
                    name="communities"
                    options={{
                        title: 'Explore',
                        tabBarIcon: ({ focused }) => (
                            <TabIcon name="community" focused={focused} />
                        ),
                    }}
                    listeners={{ tabPress: () => hapticSelection() }}
                />
                <Tabs.Screen
                    name="marketplace"
                    options={{
                        title: 'Marketplace',
                        tabBarIcon: ({ focused }) => (
                            <TabIcon name="market" focused={focused} />
                        ),
                    }}
                    listeners={{ tabPress: () => hapticSelection() }}
                />
                <Tabs.Screen
                    name="study"
                    options={{
                        title: ' Study',
                        tabBarIcon: ({ focused }) => (
                            <TabIcon name="study" focused={focused} />
                        ),
                    }}
                    listeners={{ tabPress: () => hapticSelection() }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                        headerShown: false,
                        tabBarIcon: ({ focused }) => (
                            <TabIcon name="profile" focused={focused} />
                        ),
                    }}
                    listeners={{ tabPress: () => hapticSelection() }}
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
                        <Text style={[s.sheetTitle, { color: colors.black }]}>Create</Text>

                        <TouchableOpacity
                            style={[s.sheetOption, { borderTopColor: colors.border }]}
                            onPress={() => handleCreateAction('/create-post')}
                        >
                            <View style={[s.sheetIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Ionicons name="document-text-outline" size={24} color={colors.black} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.sheetLabel, { color: colors.black }]}>New Post</Text>
                                <Text style={[s.sheetSub, { color: colors.gray500 }]}>Share with your campus</Text>
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
                                <Text style={[s.sheetLabel, { color: colors.black }]}>New Event</Text>
                                <Text style={[s.sheetSub, { color: colors.gray500 }]}>Organize campus activities</Text>
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
                                <Text style={[s.sheetLabel, { color: colors.black }]}>Sell or Request Item</Text>
                                <Text style={[s.sheetSub, { color: colors.gray500 }]}>List on marketplace</Text>
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
                                <Text style={[s.sheetLabel, { color: colors.black }]}>Ask Question</Text>
                                <Text style={[s.sheetSub, { color: colors.gray500 }]}>Get homework help</Text>
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
        height: 32,
        width: 32,
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