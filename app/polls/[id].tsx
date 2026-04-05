import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getPoll } from '../../src/api/polls';

import PollCard from '../../src/components/PollCard';

export default function PollsScreen() {
    const { colors } = useTheme();
    const { id } = useLocalSearchParams();
    const [polls, setPolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try { 
            const res = await getPoll(id as string); 
            if (res?.data) {
                setPolls(Array.isArray(res.data) ? res.data : [res.data]); 
            }
        }
        catch (e) { console.log('Error', e); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [id]);

    if (loading) return (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Polls', headerBackTitle: '', headerShadowVisible: false, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.black }} />
            <ActivityIndicator size="small" color={colors.black} />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ 
                title: 'Polls',
                headerBackTitle: '',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.black,
                headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16, color: colors.black }
            }} />
            <FlatList
                data={polls}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <PollCard poll={item} />
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
