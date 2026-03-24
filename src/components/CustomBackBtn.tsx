import React from 'react';
import { TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

interface CustomBackBtnProps {
    onPress: () => void;
    color?: string;
    style?: StyleProp<ViewStyle>;
}

const CustomBackBtn: React.FC<CustomBackBtnProps> = ({ onPress, color = colors.black, style }) => (
    <TouchableOpacity
        onPress={onPress}
        style={[
            {
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.gray100,
                justifyContent: 'center',
                alignItems: 'center',
            },
            style
        ]}
        hitSlop={12}
    >
        <Ionicons name="chevron-back" size={20} color={color} style={{ marginRight: 2 }} />
    </TouchableOpacity>
);

export default CustomBackBtn;
