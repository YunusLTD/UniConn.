import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getPolls, voteInPoll } from '../../src/api/polls';

export default function PollsScreen() {
    const { colors } = useTheme();
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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={polls}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <View style={[styles.card, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                        <Text style={[styles.question, { color: colors.black }]}>{item.question}</Text>
                        <View style={styles.options}>
                            {item.options?.map((opt: any) => (
                                <TouchableOpacity key={opt.id} style={[styles.option, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => handleVote(item.id, opt.id)} activeOpacity={0.7}>
                                    <Text style={[styles.optionText, { color: colors.black }]}>{opt.text}</Text>
                                    <Text style={[styles.votes, { color: colors.gray500 }]}>{opt.votes?.[0]?.count || 0}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
                ListEmptyComponent={<View style={styles.centered}><Text style={[styles.emptyText, { color: colors.gray400 }]}>No polls found</Text></View>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    card: { paddingHorizontal: spacing.lg, paddingVertical: 16, borderBottomWidth: 0.5 },
    question: { fontFamily: fonts.semibold, fontSize: 16, marginBottom: spacing.md },
    options: { gap: spacing.sm },
    option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderWidth: 1, borderRadius: radii.sm },
    optionText: { fontFamily: fonts.regular, fontSize: 14 },
    votes: { fontFamily: fonts.semibold, fontSize: 12 },
    emptyText: { fontFamily: fonts.regular, fontSize: 14 },
});
