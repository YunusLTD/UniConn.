import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getPolls, voteInPoll } from '../../src/api/polls';

export default function PollsScreen() {
    const { id } = useLocalSearchParams();
    const [polls, setPolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try { const res = await getPolls(id as string); if (res?.data) setPolls(res.data); }
        catch (e) { console.log('Error', e); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [id]);

    const handleVote = async (pollId: string, optionId: string) => {
        try { await voteInPoll(pollId, optionId); Alert.alert('Done', 'Vote cast!'); loadData(); }
        catch (e: any) { Alert.alert('Error', e.message); }
    };

    if (loading) return <View style={styles.centered}><ActivityIndicator size="small" color={colors.black} /></View>;

    return (
        <View style={styles.container}>
            <FlatList
                data={polls}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.question}>{item.question}</Text>
                        <View style={styles.options}>
                            {item.options?.map((opt: any) => (
                                <TouchableOpacity key={opt.id} style={styles.option} onPress={() => handleVote(item.id, opt.id)} activeOpacity={0.7}>
                                    <Text style={styles.optionText}>{opt.text}</Text>
                                    <Text style={styles.votes}>{opt.votes?.[0]?.count || 0}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
                ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No polls found</Text></View>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    card: { paddingHorizontal: spacing.lg, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: colors.gray200, backgroundColor: colors.white },
    question: { fontFamily: fonts.semibold, fontSize: 16, color: colors.black, marginBottom: spacing.md },
    options: { gap: spacing.sm },
    option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: colors.gray200, borderRadius: radii.sm, backgroundColor: colors.white },
    optionText: { fontFamily: fonts.regular, fontSize: 14, color: colors.black },
    votes: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gray500 },
    emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray400 },
});
