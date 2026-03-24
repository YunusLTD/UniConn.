import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { createMarketplaceListing } from '../../src/api/marketplace';

export default function CreateListingScreen() {
    const { communityId } = useLocalSearchParams();
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCreate = async () => {
        if (!title || !price) return Alert.alert('Error', 'Title and Price are required');
        if (isNaN(Number(price))) return Alert.alert('Error', 'Price must be a number');
        setLoading(true);
        try {
            const res = await createMarketplaceListing(communityId as string, { title, price: Number(price), description });
            if (res?.data) { Alert.alert('Success', 'Listed!'); router.back(); }
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setLoading(false); }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.pageTitle}>Post an Item</Text>
            <View style={styles.group}>
                <Text style={styles.label}>TITLE</Text>
                <TextInput style={styles.input} placeholder="What are you selling?" placeholderTextColor={colors.gray400} value={title} onChangeText={setTitle} />
            </View>
            <View style={styles.group}>
                <Text style={styles.label}>PRICE ($)</Text>
                <TextInput style={styles.input} placeholder="0" placeholderTextColor={colors.gray400} value={price} onChangeText={setPrice} keyboardType="numeric" />
            </View>
            <View style={styles.group}>
                <Text style={styles.label}>DESCRIPTION</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Details…" placeholderTextColor={colors.gray400} value={description} onChangeText={setDescription} multiline />
            </View>
            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.5 }]} onPress={handleCreate} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>Post Listing</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: colors.white, padding: spacing.lg },
    pageTitle: { fontFamily: fonts.bold, fontSize: 28, color: colors.black, marginBottom: spacing.xl },
    group: { marginBottom: spacing.md },
    label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.gray400, letterSpacing: 1, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radii.md, fontFamily: fonts.regular, fontSize: 15, color: colors.black, backgroundColor: colors.gray50 },
    textArea: { minHeight: 120, textAlignVertical: 'top' },
    btn: { backgroundColor: colors.black, paddingVertical: 14, borderRadius: radii.md, alignItems: 'center', marginTop: spacing.lg },
    btnText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 16 },
});
