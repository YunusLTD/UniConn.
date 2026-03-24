import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radii } from '../../src/constants/theme';

const DEPARTMENTS = [
    { id: 'cs', name: 'Computer Science', category: 'Engineering & Technology', icon: 'desktop-outline' },
    { id: 'bus', name: 'Business', category: 'Management & Economics', icon: 'cash-outline' },
    { id: 'law', name: 'Law', category: 'Legal Studies & Jurisprudence', icon: 'library-outline' },
    { id: 'med', name: 'Medicine', category: 'Health Sciences', icon: 'medical-outline' },
    { id: 'art', name: 'Art', category: 'Design & Creative Studies', icon: 'color-palette-outline' },
    { id: 'eng', name: 'Engineering', category: 'Applied Sciences', icon: 'hardware-chip-outline' },
];

export default function DepartmentSelectScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

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
                    <Text style={styles.title}>Select Department</Text>
                    <Text style={styles.subtitle}>Choose the primary field of your studies</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
                {DEPARTMENTS.map((dept) => (
                    <TouchableOpacity
                        key={dept.id}
                        style={styles.card}
                        activeOpacity={0.7}
                        onPress={() => handleSelect(dept.name)}
                    >
                        <View style={styles.info}>
                            <Text style={styles.deptName}>{dept.name}</Text>
                            <Text style={styles.deptCategory}>{dept.category}</Text>
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
