import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, FlatList } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { colors, fonts, spacing, radii } from '../../../src/constants/theme';
import { getStudyGroup, joinStudyGroup, leaveStudyGroup } from '../../../src/api/studyGroups';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';

export default function StudyGroupDetailScreen() {
    const { id } = useLocalSearchParams();
    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    const loadData = async () => {
        try {
            const res = await getStudyGroup(id as string);
            if (res?.data) {
                setGroup(res.data);
            }
        } catch (e) {
            console.error('Error loading study group', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleJoinLeave = async () => {
        if (!group) return;
        setSubmitting(true);
        try {
            if (group.is_member) {
                await leaveStudyGroup(id as string);
            } else {
                await joinStudyGroup(id as string);
            }
            await loadData();
        } catch (e: any) {
            console.error('Error with group membership', e);
            Alert.alert('Error', e.message || 'Could not update membership');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="small" color={colors.black} />
            </View>
        );
    }

    if (!group) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Study Group not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Study Group', headerBackTitle: '' }} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerCard}>
                    <View style={styles.iconBox}>
                        <Ionicons name="book" size={32} color={colors.black} />
                    </View>
                    <Text style={styles.title}>{group.title}</Text>
                    <Text style={styles.topic}>{group.topic}</Text>

                    {group.description && (
                        <Text style={styles.description}>{group.description}</Text>
                    )}

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={16} color={colors.gray500} />
                            <Text style={styles.metaText}>{group.schedule || 'TBD'}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="people-outline" size={16} color={colors.gray500} />
                            <Text style={styles.metaText}>
                                {group.member_count} {group.max_members ? `/ ${group.max_members}` : ''} Members
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryBtn, group.is_member && styles.secondaryBtn]}
                        onPress={handleJoinLeave}
                        disabled={submitting || (!group.is_member && group.max_members && group.member_count >= group.max_members)}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={group.is_member ? colors.black : colors.white} />
                        ) : (
                            <Text style={[styles.primaryBtnText, group.is_member && styles.secondaryBtnText]}>
                                {group.is_member ? 'Leave Group' : 'Join Group'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Members List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Members</Text>
                    {group.members?.map((member: any) => (
                        <View key={member.user_id} style={styles.memberCard}>
                            <View style={styles.memberAvatar}>
                                {member.avatar_url ? (
                                    <View style={[styles.memberAvatar, { backgroundColor: 'transparent' }]} />
                                ) : (
                                    <Text style={styles.memberInitials}>{member.name?.charAt(0)?.toUpperCase()}</Text>
                                )}
                            </View>
                            <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>{member.name}</Text>
                                {member.username && <Text style={styles.memberUsername}>@{member.username}</Text>}
                            </View>
                            {member.user_id === group.created_by && (
                                <View style={styles.adminBadge}>
                                    <Text style={styles.adminText}>Admin</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* If member, show quick chat button at bottom */}
            {group.is_member && (
                <View style={styles.chatFooter}>
                    <TouchableOpacity
                        style={styles.chatBtn}
                        onPress={() => {
                            // Theoretically a study group could have a linked conversation, or we create one here.
                            // For now, this is a placeholder stub
                            Alert.alert('Group Chat', 'Group chat feature coming soon.');
                        }}
                    >
                        <Ionicons name="chatbubbles" size={20} color={colors.white} />
                        <Text style={styles.chatBtnText}>Group Chat</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontFamily: fonts.regular, fontSize: 16, color: colors.gray500 },
    scrollContent: { paddingBottom: 100 },

    headerCard: {
        backgroundColor: colors.white,
        padding: spacing.xl,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    iconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: { fontFamily: fonts.bold, fontSize: 24, color: colors.black, textAlign: 'center', marginBottom: 4 },
    topic: { fontFamily: fonts.medium, fontSize: 16, color: colors.gray600, textAlign: 'center', marginBottom: 12 },
    description: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray700, textAlign: 'center', marginBottom: 20, lineHeight: 22 },

    metaRow: { flexDirection: 'row', gap: 20, marginBottom: 24 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontFamily: fonts.medium, fontSize: 14, color: colors.gray600 },

    primaryBtn: { backgroundColor: colors.black, width: '100%', height: 50, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center' },
    primaryBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
    secondaryBtn: { backgroundColor: colors.gray100 },
    secondaryBtnText: { color: colors.black },

    section: { padding: spacing.xl },
    sectionTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.black, marginBottom: spacing.md },

    memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, padding: spacing.md, borderRadius: radii.md, marginBottom: 8, borderWidth: 1, borderColor: colors.gray100 },
    memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    memberInitials: { fontFamily: fonts.bold, fontSize: 14, color: colors.gray600 },
    memberInfo: { flex: 1 },
    memberName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
    memberUsername: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginTop: 2 },
    adminBadge: { backgroundColor: colors.black, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    adminText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },

    chatFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: 30, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray200 },
    chatBtn: { backgroundColor: colors.black, height: 50, borderRadius: radii.full, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    chatBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
