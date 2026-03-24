import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingContextType {
    hasCompletedOnboarding: boolean | null;
    completeOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

    useEffect(() => {
        const checkOnboarding = async () => {
            const value = await AsyncStorage.getItem('hasCompletedOnboarding');
            setHasCompletedOnboarding(value === 'true');
        };
        checkOnboarding();
    }, []);

    const completeOnboarding = async () => {
        await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
        setHasCompletedOnboarding(true);
    };

    return (
        <OnboardingContext.Provider value={{ hasCompletedOnboarding, completeOnboarding }}>
            {children}
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
};
