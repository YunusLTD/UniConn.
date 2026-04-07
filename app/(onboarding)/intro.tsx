import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { useOnboarding } from '../../src/context/OnboardingContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const SLIDES = [
    {
        id: '1',
        icon: 'people-outline',
        title: 'Build Your Campus Circle',
        description: 'Connect with students in your school, follow communities, and stay in sync with your people.',
    },
    {
        id: '2',
        icon: 'calendar-clear-outline',
        title: 'Discover What Is Happening',
        description: 'Find events, workshops, and campus moments in one place so you never miss out.',
    },
    {
        id: '3',
        icon: 'rocket-outline',
        title: 'Thrive With UniConn',
        description: 'Study together, discover opportunities, and buy or sell essentials inside your student hub.',
    },
] as const;

export default function IntroScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { completeOnboarding } = useOnboarding();
    const [activeIndex, setActiveIndex] = useState(0);

    const handleNext = async () => {
        if (activeIndex === SLIDES.length - 1) {
            await completeOnboarding();
            router.replace('/(auth)/login');
        } else {
            setActiveIndex(activeIndex + 1);
        }
    };

    const slide = SLIDES[activeIndex];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
            <View style={styles.header}>
                <View style={[styles.logoWrap, { borderColor: colors.gray200 }]}>
                    <Image source={require('../../assets/favicon.png')} style={styles.logoImage} resizeMode="contain" />
                </View>
                <Text style={[styles.brandText, { color: colors.black }]}>uniconn</Text>
            </View>

            <View style={styles.content}>
                <View style={[styles.iconCircle, { backgroundColor: colors.gray100 }]}>
                    <Ionicons name={slide.icon} size={38} color={colors.black} />
                </View>
                <Text style={[styles.title, { color: colors.black }]}>{slide.title}</Text>
                <Text style={[styles.description, { color: colors.gray500 }]}>{slide.description}</Text>
            </View>

            <View style={styles.footer}>
                <View style={styles.indicators}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                { backgroundColor: colors.gray200 },
                                activeIndex === index && [styles.activeIndicator, { backgroundColor: colors.black }],
                            ]}
                        />
                    ))}
                </View>

                <TouchableOpacity style={[styles.button, { backgroundColor: colors.black }]} onPress={handleNext} activeOpacity={0.8}>
                    <Text style={[styles.buttonText, { color: colors.white }]}>
                        {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
                    </Text>
                </TouchableOpacity>

                {activeIndex < SLIDES.length - 1 && (
                    <TouchableOpacity
                        style={styles.skipBtn}
                        onPress={async () => {
                            await completeOnboarding();
                            router.replace('/(auth)/login');
                        }}
                    >
                        <Text style={[styles.skipText, { color: colors.gray400 }]}>Skip</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.xl,
    },
    header: {
        marginTop: spacing.xxl,
        alignItems: 'center',
    },
    logoWrap: {
        width: 64,
        height: 64,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoImage: {
        width: 40,
        height: 40,
    },
    brandText: {
        marginTop: spacing.sm,
        fontFamily: fonts.bold,
        fontSize: 18,
        letterSpacing: 0.3,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    iconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 32,
        textAlign: 'center',
        lineHeight: 38,
        marginBottom: spacing.md,
    },
    description: {
        fontFamily: fonts.regular,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        marginBottom: spacing.xxl,
    },
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: spacing.xs,
    },
    activeIndicator: {
        width: 24,
    },
    button: {
        paddingVertical: 16,
        borderRadius: radii.md,
        alignItems: 'center',
    },
    buttonText: {
        fontFamily: fonts.semibold,
        fontSize: 16,
    },
    skipBtn: {
        marginTop: 16,
        alignItems: 'center',
    },
    skipText: {
        fontFamily: fonts.regular,
        fontSize: 14,
    },
});
