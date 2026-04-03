import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, Platform, TouchableOpacity, Modal, Text, Pressable, Image } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { useNotifications } from '../../src/context/NotificationContext';
import { hapticLight, hapticSelection } from '../../src/utils/haptics';

const TAB_HEIGHT = Platform.OS === 'ios' ? 80 : 62;

const ICONS = {
    home: {
        active: 'https://img.icons8.com/?size=100&id=Gc9qmZNN9yFN&format=png&color=000000',
        inactive: 'https://img.icons8.com/?size=100&id=Gc9qmZNN9yFN&format=png&color=777777'
    },
    community: {
        active: 'https://img.icons8.com/?size=150&id=111487&format=png&color=000000',
        inactive: 'https://img.icons8.com/?size=150&id=111487&format=png&color=777777'
    },
    heart: {
        active: 'https://img.icons8.com/?size=100&id=85038&format=png&color=000000',
        inactive: 'https://img.icons8.com/?size=100&id=85038&format=png&color=777777'
    },
    market: {
        active: 'https://img.icons8.com/?size=100&id=rh2XLtRql4uV&format=png&color=000000',
        inactive: 'https://img.icons8.com/?size=100&id=rh2XLtRql4uV&format=png&color=777777'
    },
    profile: {
        active: 'https://img.icons8.com/?size=100&id=YXG86oegZMMh&format=png&color=000000',
        inactive: 'https://img.icons8.com/?size=100&id=YXG86oegZMMh&format=png&color=777777'
    },
    study: {
        active: 'https://img.icons8.com/?size=100&id=6895&format=png&color=000000',
        inactive: 'https://img.icons8.com/?size=100&id=6895&format=png&color=777777'
    },
    chat: 'https://img.icons8.com/?size=100&id=7859&format=png&color=000000',
    add: 'https://img.icons8.com/?size=100&id=84061&format=png&color=000000',
};

function TabIcon({ name, focused }: { name: keyof typeof ICONS; focused: boolean }) {
    const icon = ICONS[name] as any;
    const url = typeof icon === 'string' ? icon : (focused ? icon.active : icon.inactive);
    return (
        <View style={styles.iconWrap}>
            <Image
                source={{ uri: url }}
                style={{ width: 24, height: 24, opacity: focused ? 1 : 0.6 }}
            />
        </View>
    );
}


export default function TabLayout() {
    const router = useRouter();
    const { activityUnreadCount, messageUnreadCount } = useNotifications();
    const [showCreateMenu, setShowCreateMenu] = useState(false);

    const handleCreateAction = (route: string) => {
        hapticSelection();
        setShowCreateMenu(false);
        router.push(route as any);
    };

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
                        backgroundColor: colors.white,
                        borderTopWidth: 0.5,
                        borderTopColor: colors.gray200,
                        height: TAB_HEIGHT + 4,
                        elevation: 0,
                    },
                    headerStyle: {
                        backgroundColor: colors.white,
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
                    headerRight: () => (
                        <View style={styles.headerRight}>

                            <TouchableOpacity onPress={() => { hapticLight(); router.push('/pulse'); }} style={[styles.headerBtn, { paddingHorizontal: 12, backgroundColor: 'rgba(102,126,234,0.1)', borderRadius: 20 }]} hitSlop={8}>
                                <Ionicons name="eye-off" size={20} color="#667eea" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => { hapticLight(); setShowCreateMenu(true); }} style={styles.headerBtn} hitSlop={8}>
                                <Image source={{ uri: ICONS.add }} style={{ width: 22, height: 22 }} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { hapticLight(); router.push('/activity'); }} style={styles.headerBtn} hitSlop={8}>
                                <Image source={{ uri: ICONS.heart.inactive }} style={{ width: 22, height: 22 }} />
                                {activityUnreadCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {activityUnreadCount > 9 ? '9+' : activityUnreadCount}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { hapticLight(); router.push('/messages'); }} style={styles.headerBtn} hitSlop={8}>
                                <Image source={{ uri: ICONS.chat }} style={{ width: 22, height: 22 }} />
                                {messageUnreadCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: 'Feed',
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
                    style={styles.overlay}
                    onPress={() => setShowCreateMenu(false)}
                >
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Create</Text>

                        <TouchableOpacity
                            style={styles.sheetOption}
                            onPress={() => handleCreateAction('/create-post')}
                        >
                            <View style={styles.sheetIcon}>
                                <Ionicons name="document-text-outline" size={24} color={colors.black} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sheetLabel}>New Post</Text>
                                <Text style={styles.sheetSub}>Share with your campus</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.sheetOption}
                            onPress={() => handleCreateAction('/events/create')}
                        >
                            <View style={styles.sheetIcon}>
                                <Ionicons name="calendar-outline" size={24} color={colors.black} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sheetLabel}>New Event</Text>
                                <Text style={styles.sheetSub}>Organize campus activities</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.sheetOption}
                            onPress={() => handleCreateAction('/marketplace/create')}
                        >
                            <View style={styles.sheetIcon}>
                                <Ionicons name="cart-outline" size={24} color={colors.black} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sheetLabel}>Sell or Request Item</Text>
                                <Text style={styles.sheetSub}>List on marketplace</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.sheetOption}
                            onPress={() => handleCreateAction('/study/create')}
                        >
                            <View style={styles.sheetIcon}>
                                <Ionicons name="school-outline" size={24} color={colors.black} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sheetLabel}>Ask Question</Text>
                                <Text style={styles.sheetSub}>Get homework help</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    iconWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        width: 32,
    },

    headerRight: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginRight: spacing.lg,
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
        backgroundColor: colors.danger,
        borderWidth: 1.5,
        borderColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    badgeText: {
        color: colors.white,
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
        backgroundColor: colors.white,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        paddingHorizontal: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gray300,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    sheetTitle: {
        fontFamily: fonts.bold,
        fontSize: 22,
        color: colors.black,
        marginBottom: 20,
    },
    sheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderTopWidth: 0.5,
        borderTopColor: colors.gray100,
        gap: 14,
    },
    sheetIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.gray50,
        borderWidth: 1,
        borderColor: colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetLabel: {
        fontFamily: fonts.semibold,
        fontSize: 15,
        color: colors.black,
    },
    sheetSub: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.gray500,
        marginTop: 1,
    },
});