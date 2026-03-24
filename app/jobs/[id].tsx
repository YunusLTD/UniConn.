import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getJobs } from '../../src/api/jobs';
import { Ionicons } from '@expo/vector-icons';

export default function JobsScreen() {
    const { id } = useLocalSearchParams();
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            try { const res = await getJobs(id as string); if (res?.data) setJobs(res.data); }
            catch (e) { console.log('Error', e); }
            finally { setLoading(false); }
        })();
    }, [id]);

    if (loading) return <View style={styles.centered}><ActivityIndicator size="small" color={colors.black} /></View>;

    return (
        <View style={styles.container}>
            <FlatList
                data={jobs}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.card} onPress={() => router.push(`/jobs/detail/${item.id}` as any)} activeOpacity={0.7}>
                        <View style={styles.iconBlock}><Ionicons name="briefcase-outline" size={18} color={colors.black} /></View>
                        <View style={styles.info}>
                            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.company}>{item.company}</Text>
                            <Text style={styles.type}>{item.type?.replace('_', ' ')?.toUpperCase()} · {item.location}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No opportunities found</Text></View>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    card: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: colors.white, borderBottomWidth: 0.5, borderBottomColor: colors.gray200, gap: 14 },
    iconBlock: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1 },
    title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
    company: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray600, marginTop: 2 },
    type: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 2 },
    emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray400 },
});
