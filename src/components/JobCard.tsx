import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { spacing, fonts, radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { deleteJob } from '../api/jobs';
import { useRouter } from 'expo-router';

export default function JobCard({ job, showDelete = false, onDelete }: { job: any, showDelete?: boolean, onDelete?: (id: string) => void }) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const isOwner = user?.id === job.created_by;
    const formattedBudget = job.budget ? `$${Number(job.budget).toLocaleString()}` : 'Negotiable';

    const handleDelete = () => {
        Alert.alert('Delete Opportunity', 'Remove this listing permanently?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteJob(job.id);
                        if (onDelete) onDelete(job.id);
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete listing.');
                    }
                }
            }
        ]);
    };

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
            onPress={() => router.push(`/jobs/${job.id}`)}
            activeOpacity={0.8}
        >
            <View style={styles.inner}>
                {/* Icon */}
                <View style={[styles.iconBlock, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                    <Ionicons name="briefcase-outline" size={20} color={colors.black} />
                </View>

                {/* Content */}
                <View style={styles.info}>
                    <View style={styles.labelRow}>
                        <Text style={[styles.label, { color: colors.gray400 }]}>OPPORTUNITY</Text>
                        {job.communities?.name && (
                            <Text style={[styles.community, { color: colors.gray400 }]}>· {job.communities.name}</Text>
                        )}
                    </View>
                    <Text style={[styles.title, { color: colors.black }]} numberOfLines={1}>{job.title}</Text>
                    {job.description && (
                        <Text style={[styles.desc, { color: colors.gray500 }]} numberOfLines={2}>{job.description}</Text>
                    )}
                    <View style={styles.budgetRow}>
                        <Text style={[styles.budget, { color: colors.black }]}>{formattedBudget}</Text>
                        {job.profiles?.name && (
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    if (job.created_by) router.push(`/user/${job.created_by}`);
                                }}
                            >
                                <Text style={styles.author}>by {job.profiles.name}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionColumn}>
                    {isOwner ? (
                        showDelete && (
                            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
                                <Ionicons name="trash-outline" size={16} color={colors.gray400} />
                            </TouchableOpacity>
                        )
                    ) : (
                        <TouchableOpacity
                            style={[styles.applyBtn, { backgroundColor: colors.black }]}
                            onPress={() => Alert.alert('Interested?', 'We will notify the poster that you are interested in this opportunity.', [
                                { text: 'Cancel' },
                                { text: 'Express Interest', onPress: () => Alert.alert('Sent!', 'Your profile has been shared.') }
                            ])}
                        >
                            <Text style={[styles.applyBtnText, { color: colors.white }]}>Apply</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderBottomWidth: 0.5,
    },
    inner: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: 16,
        gap: 14,
        alignItems: 'center',
    },
    iconBlock: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
    },
    actionColumn: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 3,
    },
    label: {
        fontFamily: fonts.semibold,
        fontSize: 10,
        letterSpacing: 1,
    },
    community: {
        fontFamily: fonts.regular,
        fontSize: 10,
    },
    title: {
        fontFamily: fonts.semibold,
        fontSize: 15,
    },
    desc: {
        fontFamily: fonts.regular,
        fontSize: 13,
        lineHeight: 18,
        marginTop: 3,
    },
    budgetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    budget: {
        fontFamily: fonts.bold,
        fontSize: 14,
    },
    author: {
        fontFamily: fonts.regular,
        fontSize: 11,
    },
    deleteBtn: {
        padding: 4,
    },
    applyBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radii.md,
    },
    applyBtnText: {
        fontFamily: fonts.bold,
        fontSize: 12,
    },
});
