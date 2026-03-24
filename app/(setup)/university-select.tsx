import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radii } from '../../src/constants/theme';
import { listUniversities } from '../../src/api/universities';
import { University } from '../../src/types/models';

export default function UniversitySelectScreen() {
    const [universities, setUniversities] = useState<University[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchUniversities();
    }, []);

    const fetchUniversities = async () => {
        try {
            const res = await listUniversities();
            setUniversities(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUniversities = universities.filter(uni =>
        uni.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (university: University) => {
        router.push({
            pathname: '/(setup)/department-select',
            params: { university_id: university.id }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Select University</Text>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.gray400} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search for your university"
                    placeholderTextColor={colors.gray400}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.black} />
                </View>
            ) : (
                <FlatList
                    data={filteredUniversities}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            activeOpacity={0.7}
                            onPress={() => handleSelect(item)}
                        >
                            <View style={styles.iconContainer}>
                                <Ionicons name="library" size={24} color={colors.black} />
                            </View>
                            <View style={styles.info}>
                                <Text style={styles.uniName}>{item.name}</Text>
                                {/* We don't have location in DB for MVP, using placeholder from mockup */}
                                <Text style={styles.uniLocation}>Tbilisi, Georgia</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListFooterComponent={
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Can't find your university? </Text>
                            <TouchableOpacity>
                                <Text style={styles.footerLink}>Ask to add it</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 28,
        color: '#0F172A',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F8FA',
        marginHorizontal: spacing.xl,
        borderRadius: radii.full,
        paddingHorizontal: spacing.lg,
        height: 52,
        marginBottom: spacing.lg,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 16,
        color: colors.black,
    },
    listContainer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: radii.full,
        backgroundColor: '#F7F8FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    info: {
        flex: 1,
    },
    uniName: {
        fontFamily: fonts.semibold,
        fontSize: 16,
        color: '#0F172A',
        marginBottom: 2,
    },
    uniLocation: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: '#94A3B8',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40,
        marginBottom: 20,
    },
    footerText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: '#94A3B8',
    },
    footerLink: {
        fontFamily: fonts.semibold,
        fontSize: 14,
        color: '#94A3B8',
        textDecorationLine: 'underline',
    },
});
