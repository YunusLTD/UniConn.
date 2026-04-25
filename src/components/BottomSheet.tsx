import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
    PanResponder,
    Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxHeight?: number;
    showHandle?: boolean;
}

export default function BottomSheet({
    visible,
    onClose,
    children,
    maxHeight = SCREEN_HEIGHT * 0.8,
    showHandle = true,
}: BottomSheetProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const animatedValue = useRef(new Animated.Value(0)).current;
    const panY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(animatedValue, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 10,
            }).start();
        } else {
            Animated.timing(animatedValue, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    panY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100) {
                    onClose();
                    Animated.timing(panY, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }).start();
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 50,
                        friction: 10,
                    }).start();
                }
            },
        })
    ).current;

    if (!visible && animatedValue._value === 0) return null;

    const translateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_HEIGHT, 0],
    });

    const backdropOpacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const combinedTranslateY = Animated.add(translateY, panY);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]} />
                </TouchableWithoutFeedback>

                <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.surface,
                            transform: [{ translateY: combinedTranslateY }],
                            maxHeight: maxHeight,
                            paddingBottom: Math.max(insets.bottom, spacing.xl),
                        },
                    ]}
                >
                    {showHandle && (
                        <View style={styles.handleContainer}>
                            <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />
                        </View>
                    )}
                    <View style={styles.content}>
                        {children}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    backdropColor: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    handleContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    content: {
        paddingHorizontal: spacing.lg,
    },
});
