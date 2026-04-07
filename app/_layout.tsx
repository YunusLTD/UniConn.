import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { OnboardingProvider, useOnboarding } from '../src/context/OnboardingContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { LanguageProvider, useLanguage } from '../src/context/LanguageContext';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
    useFonts,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import CustomBackBtn from '../src/components/CustomBackBtn';

SplashScreen.preventAutoHideAsync().catch(() => {
    // ignore if splash is already controlled elsewhere
});


function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
    const { user, token, isLoading: authLoading, isNewUser } = useAuth();
    const { hasCompletedOnboarding } = useOnboarding();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const segments = useSegments();
    const router = useRouter();
    const splashHiddenRef = useRef(false);

    useEffect(() => {
        if (authLoading || hasCompletedOnboarding === null) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inOnboardingGroup = segments[0] === '(onboarding)';
        const inSetupGroup = segments[0] === '(setup)';

        if (!token) {
            // Logged-out users should always start from onboarding,
            // but allow auth routes after onboarding CTA navigation.
            if (!inOnboardingGroup && !inAuthGroup) {
                router.replace('/(onboarding)/intro');
            }
            return;
        }

        if (token && user) {
            const status = user?.profile?.status || 'approved';
            const hasUniversity = !!user?.profile?.university_id;

            if (status === 'banned') {
                if (segments[0] !== 'banned') {
                    router.replace('/banned');
                }
                return;
            }

            if (status === 'pending' || status === 'rejected') {
                if (segments[segments.length - 1] !== 'verification-pending') {
                    router.replace('/(auth)/verification-pending');
                }
                return;
            }

            if (!hasUniversity) {
                if (!inSetupGroup) router.replace('/(setup)/university-select');
                return;
            }

            // Only block redirect if they are on login screen AND DON'T have a token yet
            const s = segments as string[];
            const isAddingAccount = s[0] === '(auth)' && (s.length > 1 && s[1] === 'login');
            const shouldRedirect = (inAuthGroup && !isAddingAccount) || inOnboardingGroup || inSetupGroup || !segments[0];

            if (shouldRedirect) {
                router.replace('/(tabs)/home');
            }
        }
    }, [token, authLoading, hasCompletedOnboarding, segments, isNewUser, user]);

    useEffect(() => {
        const ready = fontsLoaded && !authLoading && hasCompletedOnboarding !== null;
        if (!ready || splashHiddenRef.current) return;
        splashHiddenRef.current = true;
        SplashScreen.hideAsync().catch(() => {
            // noop
        });
    }, [fontsLoaded, authLoading, hasCompletedOnboarding]);

    if (!fontsLoaded || authLoading || hasCompletedOnboarding === null) return null;

    return (
        <>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.surface },
                    headerTintColor: colors.black,
                    headerTitleStyle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17 },
                    headerShadowVisible: false,
                    headerTitleAlign: 'center',
                    headerLeft: () => (
                        router.canGoBack() ? <CustomBackBtn onPress={() => router.back()} style={{ marginLeft: 16 }} /> : null
                    ),
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false, headerLeft: () => null }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false, headerLeft: () => null }} />
                <Stack.Screen name="(onboarding)" options={{ headerShown: false, headerLeft: () => null }} />
                <Stack.Screen name="(setup)" options={{ headerShown: false, animation: 'fade', headerLeft: () => null }} />
                <Stack.Screen name="index" options={{ headerShown: false, headerLeft: () => null }} />

                <Stack.Screen
                    name="community/[id]/index"
                    options={{ title: t('community_hub') }}
                />

                <Stack.Screen
                    name="community/create"
                    options={{ title: t('new_community_header'), presentation: 'modal' }}
                />
                <Stack.Screen
                    name="create-post"
                    options={{ title: t('new_post'), presentation: 'modal', headerShown: false }}
                />
                <Stack.Screen
                    name="messages/index"
                    options={{ title: t('messages_header') }}
                />
                <Stack.Screen
                    name="marketplace/community/[id]"
                    options={{ title: t('marketplace') }}
                />
                <Stack.Screen
                    name="banned"
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="chat/[id]"
                    options={{ title: t('chat_header') }}
                />
                <Stack.Screen
                    name="edit-profile"
                    options={{ title: t('edit_profile'), presentation: 'modal', headerShown: false }}
                />
                <Stack.Screen
                    name="study/[id]"
                    options={{ title: t('study_discussion_header') }}
                />
                <Stack.Screen
                    name="study/create"
                    options={{ title: t('ask_for_help_header'), presentation: 'modal', headerShown: true }}
                />
                <Stack.Screen
                    name="events/create"
                    options={{ title: t('schedule_event_header'), presentation: 'modal', headerShown: true }}
                />
                <Stack.Screen
                    name="story-upload"
                    options={{ title: t('share_pov_header'), presentation: 'fullScreenModal', headerShown: false }}
                />
            </Stack>
        </>
    );
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        SpaceGrotesk_400Regular,
        SpaceGrotesk_500Medium,
        SpaceGrotesk_600SemiBold,
        SpaceGrotesk_700Bold,
    });

    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <LanguageProvider>
                    <OnboardingProvider>
                        <AuthProvider>
                            <NotificationProvider>
                                <ToastProvider>
                                    <RootLayoutNav fontsLoaded={fontsLoaded} />
                                </ToastProvider>
                            </NotificationProvider>
                        </AuthProvider>
                    </OnboardingProvider>
                </LanguageProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
