import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { spacing, fonts } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../utils/haptics';
import BottomSheet from './BottomSheet';

export interface ActionOption {
    label: string;
    icon: any;
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
    const { colors } = useTheme();

    return (
        <BottomSheet visible={visible} onClose={onClose}>
            {title && (
                <Text style={[styles.title, { color: colors.gray500 }]}>
                    {title}
                </Text>
            )}

            <View style={[styles.optionsWrapper, { backgroundColor: colors.gray100 }]}>
                {options.map((option, index) => (
                    <React.Fragment key={index}>
                        <TouchableOpacity
                            style={styles.optionBtn}
                            onPress={() => {
                                hapticLight();
                                onClose();
                                setTimeout(() => {
                                    option.onPress();
                                }, 220);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.optionLabel, 
                                { color: colors.black }, 
                                option.destructive && { color: colors.danger }
                            ]}>
                                {option.label}
                            </Text>
                            {typeof option.icon === 'number' ? (
                                <Image 
                                    source={option.icon} 
                                    style={{ width: 22, height: 22, tintColor: option.destructive ? colors.danger : colors.black }} 
                                />
                            ) : (typeof option.icon === 'string' && option.icon.startsWith('http')) ? (
                                <Image 
                                    source={{ uri: option.icon }} 
                                    style={{ width: 22, height: 22, tintColor: option.destructive ? colors.danger : colors.black }} 
                                />
                            ) : (
                                <Ionicons 
                                    name={option.icon as any} 
                                    size={22} 
                                    color={option.destructive ? colors.danger : colors.black} 
                                />
                            )}
                        </TouchableOpacity>
                        {index < options.length - 1 && (
                            <View style={[styles.separator, { backgroundColor: colors.gray200 }]} />
                        )}
                    </React.Fragment>
                ))}
            </View>
            {/* Added extra padding for the bottom of the sheet content */}
            <View style={{ height: spacing.md }} />
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    title: {
        fontFamily: fonts.medium,
        fontSize: 13,
        textAlign: 'center',
        marginBottom: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    optionsWrapper: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: 18,
    },
    optionLabel: {
        fontFamily: fonts.semibold,
        fontSize: 16,
    },
    separator: {
        height: 1,
        marginHorizontal: spacing.lg,
    },
});
