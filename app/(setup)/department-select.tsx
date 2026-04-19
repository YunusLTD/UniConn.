import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radii } from '../../src/constants/theme';
import { useLanguage, type TranslationKey } from '../../src/context/LanguageContext';

const DEPARTMENTS: Array<{ id: string; value: string; nameKey: TranslationKey; categoryKey: TranslationKey; icon: string }> = [
    { id: 'cs', value: 'Computer Science', nameKey: 'setup_dept_cs', categoryKey: 'setup_dept_cat_engineering_technology', icon: 'desktop-outline' },
    { id: 'bus', value: 'Business', nameKey: 'setup_dept_business', categoryKey: 'setup_dept_cat_management_economics', icon: 'cash-outline' },
    { id: 'law', value: 'Law', nameKey: 'setup_dept_law', categoryKey: 'setup_dept_cat_legal_studies', icon: 'library-outline' },
    { id: 'med', value: 'Medicine', nameKey: 'setup_dept_medicine', categoryKey: 'setup_dept_cat_health_sciences', icon: 'medical-outline' },
    { id: 'art', value: 'Art', nameKey: 'setup_dept_art', categoryKey: 'setup_dept_cat_design_creative', icon: 'color-palette-outline' },
    { id: 'eng', value: 'Engineering', nameKey: 'setup_dept_engineering', categoryKey: 'setup_dept_cat_applied_sciences', icon: 'hardware-chip-outline' },
];

export default function DepartmentSelectScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { t } = useLanguage();

    const handleSelect = (departmentName: string) => {
        router.push({
            pathname: '/(setup)/verification-upload',
            params: {
                university_id: params.university_id,
                department: departmentName
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.black} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.title}>{t('select_department')}</Text>
                    <Text style={styles.subtitle}>{t('setup_select_department_subtitle')}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
                {DEPARTMENTS.map((dept) => (
                    <TouchableOpacity
                        key={dept.id}
                        style={styles.card}
                        activeOpacity={0.7}
                        onPress={() => handleSelect(dept.value)}
                    >
                        <View style={styles.info}>
                            <Text style={styles.deptName}>{t(dept.nameKey)}</Text>
                            <Text style={styles.deptCategory}>{t(dept.categoryKey)}</Text>
                        </View>
                        <Ionicons name={dept.icon as any} size={24} color="#64748B" />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
    },
    backBtn: {
        marginBottom: spacing.lg,
    },
    headerTextContainer: {
        marginBottom: spacing.sm,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 28,
        color: '#0F172A',
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: fonts.regular,
        fontSize: 15,
        color: '#64748B',
    },
    listContainer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
        gap: spacing.md,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 24,
        backgroundColor: '#F8FAFC',
    },
    info: {
        flex: 1,
        paddingRight: spacing.md,
    },
    deptName: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#0F172A',
        marginBottom: 2,
    },
    deptCategory: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: '#64748B',
    },
});
