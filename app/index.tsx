import { Redirect } from 'expo-router';
import { useOnboarding } from '../src/context/OnboardingContext';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
    const { hasCompletedOnboarding } = useOnboarding();
    const { token, isLoading } = useAuth();

    if (hasCompletedOnboarding === null || isLoading) {
        return null;
    }

    if (!token) {
        return <Redirect href="/(onboarding)/intro" />;
    }

    return <Redirect href="/(tabs)/home" />;
}
