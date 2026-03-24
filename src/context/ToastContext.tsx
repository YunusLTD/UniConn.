import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
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
            {visible && (
                <View style={styles.absoluteWrap} pointerEvents="box-none">
                    <SafeAreaView pointerEvents="box-none">
                        <Animated.View
                            style={[
                                styles.toast,
                                {
                                    transform: [{ translateY }],
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border
                                }
                            ]}
                        >
                            <TouchableOpacity onPress={hideToast} activeOpacity={0.9} style={styles.content}>
                                <View style={[styles.indicator, { backgroundColor: typeColor(options.type, colors) }]} />
                                <View style={styles.textWrap}>
                                    {options.title && <Text style={[styles.title, { color: colors.text }]}>{options.title}</Text>}
                                    <Text style={[styles.message, { color: colors.gray500 }]}>{options.message}</Text>
                                </View>
                                <Ionicons name="close" size={18} color={colors.gray400} />
                            </TouchableOpacity>
                        </Animated.View>
                    </SafeAreaView>
                </View>
            )}
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
    },
    toast: {
        marginHorizontal: spacing.lg,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 0.5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    indicator: {
        width: 4,
        height: '100%',
        borderRadius: 2,
    },
    textWrap: {
        flex: 1,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 14,
        marginBottom: 2,
    },
    message: {
        fontFamily: fonts.regular,
        fontSize: 13,
        lineHeight: 18,
    },
});
