import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, SafeAreaView, TouchableOpacity } from 'react-native';
import { spacing, fonts, radii } from '../constants/theme';
import { useTheme } from './ThemeContext';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
    message: string;
    title?: string;
    type?: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { colors } = useTheme();
    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<ToastOptions>({ message: '' });
    const translateY = useRef(new Animated.Value(200)).current;

    const hideToast = useCallback(() => {
        Animated.timing(translateY, {
            toValue: 200,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setVisible(false));
    }, [translateY]);

    const showToast = useCallback(({ message, title, type = 'info', duration = 4000 }: ToastOptions) => {
        setOptions({ message, title, type, duration });
        setVisible(true);

        Animated.spring(translateY, {
            toValue: -100,
            useNativeDriver: true,
            bounciness: 8,
        }).start();

        setTimeout(() => {
            hideToast();
        }, duration);
    }, [translateY, hideToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
        </ToastContext.Provider>
    );
};

const typeColor = (type: ToastType | undefined, colors: any) => {
    switch (type) {
        case 'success': return '#34C759';
        case 'error': return '#FF3B30';
        case 'info': return colors.blue || '#007AFF';
        default: return colors.primary;
    }
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};

const styles = StyleSheet.create({
    absoluteWrap: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingBottom: spacing.md,
        alignItems: 'center',
    },
    safeArea: {
        width: '100%',
        alignItems: 'center',
    },
    toast: {
        width: '80%',
        maxWidth: 560,
        borderRadius: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 12,
        borderWidth: 1,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        paddingLeft: 12,
        paddingRight: 12,
        gap: 9,
        minHeight: 54,
    },
    indicator: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    textWrap: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 13,
        marginBottom: 1,
    },
    message: {
        fontFamily: fonts.regular,
        fontSize: 11,
        lineHeight: 14,
    },
});
