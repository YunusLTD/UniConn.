import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Modal,
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
const DISMISS_THRESHOLD_Y = 80;
const DISMISS_THRESHOLD_VY = 1.0;

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
    const [modalVisible, setModalVisible] = useState(false);

    const animatedValue = useRef(new Animated.Value(0)).current;
    const panY = useRef(new Animated.Value(0)).current;

    // Refs so the panResponder (created once) never holds stale closures
    const onCloseRef = useRef(onClose);
    const maxHeightRef = useRef(maxHeight);
    const panYValueRef = useRef(0);
    const isDismissingRef = useRef(false);

    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
    useEffect(() => { maxHeightRef.current = maxHeight; }, [maxHeight]);

    useEffect(() => {
        const id = panY.addListener(({ value }) => { panYValueRef.current = value; });
        return () => panY.removeListener(id);
    }, [panY]);

    useEffect(() => {
        if (visible) {
            isDismissingRef.current = false;
            setModalVisible(true);
            panY.setValue(0);
            Animated.spring(animatedValue, {
                toValue: 1,
                useNativeDriver: true,
                tension: 55,
                friction: 11,
            }).start();
        } else {
            Animated.timing(animatedValue, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
            }).start(() => {
                panY.setValue(0);
                isDismissingRef.current = false;
                setModalVisible(false);
            });
        }
    }, [visible, animatedValue, panY]);

    const panResponder = useRef(
        PanResponder.create({
            // Grab touch immediately on the handle — don't wait for move
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: () => {
                // Stop any running animation so sheet sticks to finger instantly
                panY.stopAnimation();
                panY.extractOffset();
            },

            onPanResponderMove: (_, { dy }) => {
                if (isDismissingRef.current) return;
                // Follow finger exactly down; resist rubber-band up
                panY.setValue(dy > 0 ? dy : dy * 0.12);
            },

            onPanResponderRelease: (_, { dy, vy }) => {
                if (isDismissingRef.current) return;
                panY.flattenOffset();

                const current = panYValueRef.current;

                if (current > DISMISS_THRESHOLD_Y || vy > DISMISS_THRESHOLD_VY) {
                    isDismissingRef.current = true;
                    const remaining = Math.max(maxHeightRef.current - current, 50);
                    const duration = Math.min(Math.max((remaining / Math.max(vy, 0.8)) * 16, 80), 280);

                    Animated.timing(panY, {
                        toValue: maxHeightRef.current + 60,
                        duration,
                        useNativeDriver: true,
                    }).start(({ finished }) => {
                        if (finished) onCloseRef.current();
                    });
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true,
                        velocity: vy,
                        tension: 60,
                        friction: 12,
                    }).start();
                }
            },

            onPanResponderTerminate: () => {
                panY.flattenOffset();
                if (isDismissingRef.current) return;
                Animated.spring(panY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 60,
                    friction: 12,
                }).start();
            },
        })
    ).current;

    const sheetTranslateY = Animated.add(
        animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [SCREEN_HEIGHT, 0],
        }),
        panY
    );

    // Backdrop dims live as finger drags the sheet down
    const backdropOpacity = Animated.multiply(
        animatedValue,
        panY.interpolate({
            inputRange: [0, maxHeight],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        })
    );

    return (
        <Modal
            transparent
            visible={modalVisible}
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View
                        style={[
                            styles.backdrop,
                            {
                                opacity: backdropOpacity,
                                backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
                            },
                        ]}
                    />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.surface,
                            maxHeight,
                            paddingBottom: Math.max(insets.bottom, spacing.xl),
                            transform: [{ translateY: sheetTranslateY }],
                        },
                    ]}
                >
                    {/* panResponder on handle only — content stays scrollable */}
                    <View {...panResponder.panHandlers} style={styles.handleContainer}>
                        {showHandle && (
                            <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />
                        )}
                    </View>

                    <View style={styles.content}>{children}</View>
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
        minHeight: 36,
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