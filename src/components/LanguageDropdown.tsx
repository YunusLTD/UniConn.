import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, Language } from '../context/LanguageContext';

type Props = {
    visible: boolean;
    onClose: () => void;
};

const LANGUAGES: { code: Language; label: string; icon: string }[] = [
    { code: 'en', label: 'English', icon: '🇺🇸' },
    { code: 'tr', label: 'Türkçe', icon: '🇹🇷' },
    { code: 'ka', label: 'ქართული', icon: '🇬🇪' },
];

export default function LanguageDropdown({ visible, onClose }: Props) {
    const { colors, isDark } = useTheme();
    const { language, setLanguage } = useLanguage();

    const handleSelect = (code: Language) => {
        setLanguage(code);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.gray500 }]}>Select Language</Text>
                    {LANGUAGES.map((lang) => (
                        <TouchableOpacity
                            key={lang.code}
                            style={[
                                styles.option,
                                language === lang.code && { backgroundColor: colors.gray100 }
                            ]}
                            onPress={() => handleSelect(lang.code)}
                        >
                            <Text style={styles.icon}>{lang.icon}</Text>
                            <Text style={[styles.label, { color: colors.black }]}>{lang.label}</Text>
                            {language === lang.code && (
                                <Ionicons name="checkmark" size={18} color={colors.black} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdown: {
        width: 260,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 8,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 12,
    },
    icon: {
        fontSize: 20,
    },
    label: {
        flex: 1,
        fontFamily: fonts.semibold,
        fontSize: 15,
    },
});
