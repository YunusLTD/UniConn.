import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, Alert } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { formatMonthDay } from '../utils/localization';

export default function ResourceVault({ communityId }: { communityId: string }) {
    const { language } = useLanguage();
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadResources = async () => {
        setLoading(true);
        try {
            // This endpoint would be added to the backend
            const res = await apiFetch(`/communities/${communityId}/resources`);
            if (res.data) setResources(res.data);
        } catch (e) {
            console.log('Error loading resources', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadResources(); }, [communityId]);

    const handleOpen = (url: string) => {
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open resource link.'));
    };

    const renderResource = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleOpen(item.url)}>
            <View style={[styles.iconContainer, item.type === 'link' ? styles.linkIcon : styles.fileIcon]}>
                <Ionicons
                    name={item.type === 'link' ? "link" : "document-text"}
                    size={24}
                    color={colors.white}
                />
            </View>
            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.meta}>Shared by {item.profiles?.name || 'Student'} • {formatMonthDay(item.created_at, language)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.countText}>{resources.length} Resources Available</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Ionicons name="cloud-upload-outline" size={18} color={colors.black} />
                    <Text style={styles.addBtnText}>Upload</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={resources}
                renderItem={renderResource}
                keyExtractor={item => item.id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="folder-open-outline" size={48} color={colors.gray200} />
                        <Text style={styles.emptyText}>No shared resources yet.</Text>
                        <Text style={styles.emptySub}>Shared lecture notes, study guides, and research links will appear here.</Text>
                    </View>
                }
                contentContainerStyle={{ padding: spacing.md }}
                scrollEnabled={false} // Since it's inside a parent ScrollView usually
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: colors.white, flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
    countText: { fontFamily: fonts.bold, fontSize: 13, color: colors.gray500, textTransform: 'uppercase' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full, backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200 },
    addBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.black },
    card: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    fileIcon: { backgroundColor: colors.blue },
    linkIcon: { backgroundColor: colors.success },
    content: { flex: 1, marginLeft: 16 },
    title: { fontFamily: fonts.bold, fontSize: 15, color: colors.black },
    meta: { fontFamily: fonts.medium, fontSize: 12, color: colors.gray400, marginTop: 2 },
    separator: { height: 1, backgroundColor: colors.gray50, marginVertical: 4 },
    empty: { paddingVertical: 60, alignItems: 'center', paddingHorizontal: 40 },
    emptyText: { fontFamily: fonts.bold, fontSize: 16, color: colors.gray400, marginTop: 16 },
    emptySub: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray400, textAlign: 'center', marginTop: 8 },
});
