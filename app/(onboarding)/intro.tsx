import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { useOnboarding } from '../../src/context/OnboardingContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const SLIDES = [
    {
        id: '1',
        emoji: '🤝',
        title: 'Connect\nwith Ease',
        description: 'Join your university community and stay connected with your peers.',
    },
    {
        id: '2',
        emoji: '📅',
        title: 'Discover\nEvents',
        description: 'Never miss campus activities, workshops, and social gatherings.',
    },
    {
        id: '3',
        emoji: '🚀',
        title: 'Thrive\nTogether',
        description: 'Collaborate in study groups, find jobs, and trade in the marketplace.',
    },
];

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
            {/* Logo */}
            <View style={styles.header}>
                <View style={[styles.logo, { backgroundColor: colors.black }]}>
                    <Text style={[styles.logoText, { color: colors.white }]}>U</Text>
                </View>
            </View>

            {/* Slide Content */}
            <View style={styles.content}>
                <Text style={styles.emoji}>{slide.emoji}</Text>
                <Text style={[styles.title, { color: colors.black }]}>{slide.title}</Text>
                <Text style={[styles.description, { color: colors.gray500 }]}>{slide.description}</Text>
            </View>

            {/* Footer */}
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
    logo: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontFamily: fonts.bold,
        fontSize: 22,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    emoji: {
        fontSize: 56,
        marginBottom: spacing.xl,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 36,
        textAlign: 'center',
        lineHeight: 42,
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
