import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../../src/constants/theme';
import { getEvents } from '../../../src/api/events';
import { Ionicons } from '@expo/vector-icons';

export default function CommunityEventsScreen() {
    const { id } = useLocalSearchParams();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            try {
                const res = await getEvents(id as string);
                if (res?.data) setEvents(res.data);
            } catch (e) { console.log('Error', e); }
            finally { setLoading(false); }
        })();
    }, [id]);

    if (loading) return <View style={styles.centered}><ActivityIndicator size="small" color={colors.black} /></View>;

    return (
        <View style={styles.container}>
            <FlatList
                data={events}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <TouchableOpacity style={styles.createBtn} onPress={() => router.push({ pathname: '/events/create', params: { communityId: id } } as any)} activeOpacity={0.7}>
                        <Ionicons name="add" size={18} color={colors.white} />
                        <Text style={styles.createBtnText}>Schedule Event</Text>
                    </TouchableOpacity>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.card} onPress={() => router.push(`/events/${item.id}` as any)} activeOpacity={0.7}>
                        <View style={styles.dateBlock}>
                            <Text style={styles.month}>{new Date(item.start_time).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text>
                            <Text style={styles.day}>{new Date(item.start_time).getDate()}</Text>
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.time}>{new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            {item.location && <Text style={styles.location} numberOfLines={1}>{item.location}</Text>}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No upcoming events</Text></View>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    createBtn: { backgroundColor: colors.black, margin: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: radii.md, gap: spacing.sm },
    createBtnText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 14 },
    card: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: colors.white, borderBottomWidth: 0.5, borderBottomColor: colors.gray200, gap: 14 },
    dateBlock: { width: 48, height: 52, borderRadius: radii.sm, backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center', justifyContent: 'center' },
    month: { fontFamily: fonts.semibold, fontSize: 10, color: colors.danger, letterSpacing: 0.5 },
    day: { fontFamily: fonts.bold, fontSize: 20, color: colors.black, marginTop: -2 },
    info: { flex: 1 },
    title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
    time: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray500, marginTop: 2 },
    location: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray400, marginTop: 1 },
    emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray400 },
});
