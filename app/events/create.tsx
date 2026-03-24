import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { createEvent } from '../../src/api/events';

export default function CreateEventScreen() {
    const { communityId } = useLocalSearchParams();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startTime, setStartTime] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCreate = async () => {
        if (!title || !startTime) return Alert.alert('Error', 'Title and Start Date are required');
        setLoading(true);
        try {
            const res = await createEvent(communityId as string, { title, description, start_time: startTime, location });
            if (res?.data) { Alert.alert('Success', 'Event scheduled!'); router.back(); }
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setLoading(false); }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Schedule Event</Text>
            <View style={styles.group}>
                <Text style={styles.label}>TITLE</Text>
                <TextInput style={styles.input} placeholder="Event name" placeholderTextColor={colors.gray400} value={title} onChangeText={setTitle} />
            </View>
            <View style={styles.group}>
                <Text style={styles.label}>START TIME</Text>
                <TextInput style={styles.input} placeholder="YYYY-MM-DD HH:MM" placeholderTextColor={colors.gray400} value={startTime} onChangeText={setStartTime} />
            </View>
            <View style={styles.group}>
                <Text style={styles.label}>LOCATION</Text>
                <TextInput style={styles.input} placeholder="Venue or link" placeholderTextColor={colors.gray400} value={location} onChangeText={setLocation} />
            </View>
            <View style={styles.group}>
                <Text style={styles.label}>DESCRIPTION</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="What's happening?" placeholderTextColor={colors.gray400} value={description} onChangeText={setDescription} multiline />
            </View>
            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.5 }]} onPress={handleCreate} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>Schedule Event</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: colors.white, padding: spacing.lg },
    title: { fontFamily: fonts.bold, fontSize: 28, color: colors.black, marginBottom: spacing.xl },
    group: { marginBottom: spacing.md },
    label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.gray400, letterSpacing: 1, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radii.md, fontFamily: fonts.regular, fontSize: 15, color: colors.black, backgroundColor: colors.gray50 },
    textArea: { minHeight: 120, textAlignVertical: 'top' },
    btn: { backgroundColor: colors.black, paddingVertical: 14, borderRadius: radii.md, alignItems: 'center', marginTop: spacing.lg },
    btnText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 16 },
});
