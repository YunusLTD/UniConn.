import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface StudyGroupCardProps {
    group: any;
}

export default function StudyGroupCard({ group }: StudyGroupCardProps) {
    const router = useRouter();

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => router.push(`/study-groups/${group.id}` as any)}
            activeOpacity={0.9}
        >
            <View style={styles.header}>
                <View style={styles.iconBox}>
                    <MaterialCommunityIcons name="book-open-variant" size={24} color={colors.white} />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.title} numberOfLines={1}>{group.title}</Text>
                    <Text style={styles.topic} numberOfLines={1}>{group.topic || 'General Study'}</Text>
                </View>
            </View>

            <View style={styles.body}>
                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.gray500} />
                    <Text style={styles.infoText}>{group.schedule || 'TBD'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="people-outline" size={16} color={colors.gray500} />
                    <Text style={styles.infoText}>Tap to join the session</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.author}>Created by {group.profiles?.name || 'Student'}</Text>
                <View style={styles.joinBtn}>
                    <Text style={styles.joinBtnText}>Join Group</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        marginHorizontal: spacing.lg,
        marginVertical: spacing.sm,
        padding: spacing.lg,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.gray100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    headerInfo: {
        flex: 1,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 17,
        color: colors.black,
    },
    topic: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.gray500,
        marginTop: 2,
    },
    body: {
        gap: 8,
        marginBottom: spacing.lg,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray600,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.md,
        borderTopWidth: 0.5,
        borderTopColor: colors.gray100,
    },
    author: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.gray400,
    },
    joinBtn: {
        backgroundColor: colors.gray50,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    joinBtnText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: colors.black,
    },
});
