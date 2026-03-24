import { Redirect } from 'expo-router';
import { useOnboarding } from '../src/context/OnboardingContext';
import { useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../src/constants/theme';

export default function Index() {
    const { hasCompletedOnboarding } = useOnboarding();
    const { token, isLoading } = useAuth();

    if (hasCompletedOnboarding === null || isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.black} />
            </View>
        );
    }

    if (!hasCompletedOnboarding) {
        return <Redirect href="/(onboarding)/intro" />;
    }

    if (!token) {
        return <Redirect href="/(auth)/login" />;
    }

    return <Redirect href="/(tabs)/home" />;
}
