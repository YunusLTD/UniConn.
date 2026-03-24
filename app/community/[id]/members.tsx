import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../../src/constants/theme';
import { getCommunityMembers, getCommunity } from '../../../src/api/communities';
import { Ionicons } from '@expo/vector-icons';
import ShadowLoader from '../../../src/components/ShadowLoader';

export default function CommunityMembersScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [members, setMembers] = useState<any[]>([]);
    const [community, setCommunity] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const [memRes, commRes] = await Promise.all([
                getCommunityMembers(id as string),
                getCommunity(id as string)
            ]);
            if (memRes.data) setMembers(memRes.data);
            if (commRes.data) setCommunity(commRes.data);
        } catch (e) {
            console.log('Error loading members:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [id]);

    if (loading) return <ShadowLoader type="students" />;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                title: 'Members',
                headerTitleStyle: { fontFamily: fonts.bold },
                headerBackTitle: '',
                headerTintColor: colors.black,
            }} />

            <FlatList
                data={members}
                keyExtractor={item => item.user_id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.memberCard}
                        onPress={() => router.push(`/user/${item.user_id}` as any)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.avatar}>
                            {item.profiles?.avatar_url ? (
                                <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarText}>{item.profiles?.name?.[0]?.toUpperCase()}</Text>
                            )}
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.profiles?.name}</Text>
                            <Text style={styles.department}>{item.profiles?.department || 'Student'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                    </TouchableOpacity>
                )}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={styles.countText}>{members.length} members in {community?.name}</Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No members found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { paddingBottom: 40 },
    header: { padding: spacing.lg, borderBottomWidth: 0.5, borderBottomColor: colors.gray100 },
    countText: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray500 },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        backgroundColor: colors.white,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray200,
        gap: 14,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.gray600 },
    info: { flex: 1 },
    name: { fontFamily: fonts.bold, fontSize: 15, color: colors.black },
    department: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 2 },
    empty: { padding: 40, alignItems: 'center' },
    emptyText: { fontFamily: fonts.regular, color: colors.gray400 },
});
