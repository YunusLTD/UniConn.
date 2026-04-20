import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { useOnboarding } from '../../src/context/OnboardingContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../src/context/LanguageContext';
import LanguageDropdown from '../../src/components/LanguageDropdown';

const SLIDES = [
    {
        id: '1',
        icon: 'people-outline',
        titleKey: 'onboarding_slide1_headline',
        descriptionKey: 'onboarding_slide1_body',
    },
    {
        id: '2',
        icon: 'calendar-clear-outline',
        titleKey: 'onboarding_slide2_headline',
        descriptionKey: 'onboarding_slide2_body',
    },
    {
        id: '3',
        icon: 'rocket-outline',
        titleKey: 'onboarding_slide3_headline',
        descriptionKey: 'onboarding_slide3_body',
    },
] as const;

export default function IntroScreen() {
    const { colors } = useTheme();
    const { t, language } = useLanguage();
    const router = useRouter();
    const { completeOnboarding } = useOnboarding();
    const [activeIndex, setActiveIndex] = useState(0);
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);

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
            <View style={styles.topHeader}>
                <View style={styles.flex1} />
                <TouchableOpacity 
                    style={styles.headerItem} 
                    hitSlop={8}
                    onPress={() => setShowLanguagePicker(true)}
                >
                    <Ionicons name="globe-outline" size={20} color={colors.gray500} />
                    <Text style={[styles.headerText, { color: colors.gray500 }]}>{language.toUpperCase()}</Text>
                </TouchableOpacity>

                <LanguageDropdown 
                    visible={showLanguagePicker} 
                    onClose={() => setShowLanguagePicker(false)} 
                />
            </View>

            <View style={styles.content}>
                <View style={[styles.iconCircle, { backgroundColor: colors.gray100 }]}>
                    <Ionicons name={slide.icon} size={38} color={colors.black} />
                </View>
                <Text style={[styles.title, { color: colors.black }]}>{t(slide.titleKey as any)}</Text>
                <Text style={[styles.description, { color: colors.gray500 }]}>{t(slide.descriptionKey as any)}</Text>
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
                        {activeIndex === SLIDES.length - 1 ? t('onboarding_get_started') : t('onboarding_continue')}
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
                        <Text style={[styles.skipText, { color: colors.gray400 }]}>{t('onboarding_skip')}</Text>
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
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingTop: spacing.md,
    },
    flex1: {
        flex: 1,
    },
    headerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerText: {
        fontFamily: fonts.semibold,
        fontSize: 14,
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

