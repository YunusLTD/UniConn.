import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions, TouchableWithoutFeedback, Share, Clipboard } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticSelection } from '../utils/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ActionOption {
    label: string;
    icon: string;
    onPress: () => void;
    destructive?: boolean;
}

export interface ActionModalProps {
    visible: boolean;
    onClose: () => void;
    options: ActionOption[];
    title?: string;
}

export default function ActionModal({ visible, onClose, options, title }: ActionModalProps) {
    const insets = useSafeAreaInsets();
    const animatedValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            hapticLight();
            Animated.spring(animatedValue, {
                toValue: 1,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();
        } else {
            Animated.timing(animatedValue, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    const modalTranslateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_HEIGHT, 0],
    });

    const backdropOpacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
    });

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
                </TouchableWithoutFeedback>

                <Animated.View style={[
                    styles.sheet,
                    { 
                        transform: [{ translateY: modalTranslateY }],
                        paddingBottom: Math.max(insets.bottom, spacing.xl)
                    }
                ]}>
                    <View style={styles.indicator} />
                    
                    {title && <Text style={styles.title}>{title}</Text>}

                    <View style={styles.optionsContainer}>
                        {options.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.optionBtn}
                                onPress={() => {
                                    hapticLight();
                                    onClose();
                                    option.onPress();
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconFrame, option.destructive && styles.destructiveIconFrame]}>
                                    <Ionicons 
                                        name={option.icon as any} 
                                        size={22} 
                                        color={option.destructive ? colors.danger : colors.black} 
                                    />
                                </View>
                                <Text style={[styles.optionLabel, option.destructive && styles.destructiveLabel]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                        hapticSelection();
                        onClose();
                    }} activeOpacity={0.8}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
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
        backgroundColor: '#000',
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    indicator: {
        width: 40,
        height: 5,
        backgroundColor: colors.gray200,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.gray400,
        textAlign: 'center',
        marginBottom: spacing.xl,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    optionsContainer: {
        gap: 4,
        marginBottom: spacing.xl,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 16,
    },
    iconFrame: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.gray50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    destructiveIconFrame: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
    },
    optionLabel: {
        fontFamily: fonts.semibold,
        fontSize: 16,
        color: colors.black,
    },
    destructiveLabel: {
        color: colors.danger,
    },
    cancelBtn: {
        backgroundColor: colors.gray100,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.black,
    },
});
