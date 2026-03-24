import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radii } from '../../src/constants/theme';
import { listCommunities, joinCommunity } from '../../src/api/communities';
import { useAuth } from '../../src/context/AuthContext';

export default function CommunitySetupScreen() {
    const router = useRouter();
    const { completeRegistrationSetup } = useAuth();
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchCommunities = async () => {
            try {
                const res = await listCommunities();
                setCommunities(res?.data || []);
            } catch (e) {
                console.error('Failed to load communities', e);
            } finally {
                setLoading(false);
            }
        };
        fetchCommunities();
    }, []);

    const handleJoin = async (id: string, is_member: boolean) => {
        if (is_member) return;

        setJoining(prev => ({ ...prev, [id]: true }));
        try {
            await joinCommunity(id);
            // Updating local state to show joined
            setCommunities(prev => prev.map(c => c.id === id ? { ...c, is_member: true } : c));
        } catch (error) {
            console.error('Failed to join', error);
        } finally {
            setJoining(prev => ({ ...prev, [id]: false }));
        }
    };

    const handleFinish = () => {
        completeRegistrationSetup(); // this will trigger the root layout nav to go to home
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.type?.replace('_', ' ')} • {item.member_count} members</Text>
            </View>
            <TouchableOpacity
                style={[styles.joinBtn, item.is_member && styles.joinedBtn]}
                onPress={() => handleJoin(item.id, item.is_member)}
                disabled={item.is_member || joining[item.id]}
            >
                {joining[item.id] ? (
                    <ActivityIndicator size="small" color={colors.white} />
                ) : (
                    <Text style={[styles.joinBtnText, item.is_member && styles.joinedBtnText]}>
                        {item.is_member ? 'Joined' : 'Join'}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Find your community</Text>
                <Text style={styles.subtitle}>Join communities relevant to your university and interests.</Text>
            </View>

            {loading ? (
                <View style={styles.loaderWrap}>
                    <ActivityIndicator size="large" color={colors.black} />
                </View>
            ) : (
                <FlatList
                    data={[...communities].sort((a: any, b: any) => (a.type === 'university' ? -1 : 1))} // Prioritize universities first
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyText}>No communities found.</Text>
                        </View>
                    }
                />
            )}

            <View style={styles.footer}>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish}>
                    <Text style={styles.primaryBtnText}>Finish Setup</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    header: { padding: spacing.xl, paddingBottom: spacing.md },
    title: { fontFamily: fonts.bold, fontSize: 28, color: colors.black, marginBottom: spacing.sm },
    subtitle: { fontFamily: fonts.regular, fontSize: 16, color: colors.gray500, lineHeight: 24 },

    loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },

    card: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
    cardInfo: { flex: 1, marginRight: spacing.md },
    cardTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.black, marginBottom: 4 },
    cardSubtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, textTransform: 'capitalize' },

    joinBtn: { backgroundColor: colors.black, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.full, minWidth: 80, alignItems: 'center' },
    joinedBtn: { backgroundColor: colors.gray100 },
    joinBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
    joinedBtnText: { color: colors.black },

    emptyWrap: { padding: spacing.xl, alignItems: 'center' },
    emptyText: { fontFamily: fonts.regular, fontSize: 15, color: colors.gray500 },

    footer: { padding: spacing.xl, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.gray100 },
    primaryBtn: { backgroundColor: colors.black, height: 50, borderRadius: radii.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    primaryBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
