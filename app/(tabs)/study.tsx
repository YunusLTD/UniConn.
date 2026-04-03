import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { getStudyQuestions } from '../../src/api/study';
import StudyCard from '../../src/components/StudyCard';
import ShadowLoader, { Skeleton } from '../../src/components/ShadowLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../src/context/LanguageContext';

export default function StudyScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useLanguage();

    const SUBJECTS = [
        { id: 'All', label: t('all_subjects'), icon: 'apps-outline' as const },
        { id: 'Math', label: t('math' as any) || 'Math', icon: 'calculator-outline' as const },
        { id: 'Science', label: t('science' as any) || 'Science', icon: 'flask-outline' as const },
        { id: 'English', label: t('english' as any) || 'English', icon: 'book-outline' as const },
        { id: 'History', label: t('history' as any) || 'History', icon: 'time-outline' as const },
        { id: 'Physics', label: t('physics' as any) || 'Physics', icon: 'magnet-outline' as const },
        { id: 'Computer Science', label: t('cs' as any) || 'CS', icon: 'hardware-chip-outline' as const },
        { id: 'Business', label: t('business' as any) || 'Business', icon: 'briefcase-outline' as const },
        { id: 'Arts', label: t('arts' as any) || 'Arts', icon: 'color-palette-outline' as const },
    ];
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeSubject, setActiveSubject] = useState('All');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const loadQuestions = async (pageNum = 1, isRefresh = false) => {
        try {
            const subject = activeSubject === 'All' ? undefined : activeSubject;
            const response = await getStudyQuestions({ subject, page: pageNum });
            if (response?.data) {
                setQuestions(prev => isRefresh ? response.data : [...prev, ...response.data]);
                setHasMore(response.data.length === 20);
                console.log('Study Questions Loaded:', response.data.length);
            } else {
                setQuestions([]);
                setHasMore(false);
            }
        } catch (e) {
            console.log('Failed to fetch study questions', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadQuestions(1, true);
        }, [activeSubject])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(1);
        loadQuestions(1, true);
    };

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadQuestions(nextPage);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.subjectsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.gray100 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectsScroll}>
                    {SUBJECTS.map(subject => (
                        <TouchableOpacity
                            key={subject.id}
                            style={[styles.subjectChip, { backgroundColor: colors.gray50, borderColor: colors.gray100 }, activeSubject === subject.id && { backgroundColor: colors.black, borderColor: colors.black }]}
                            onPress={() => {
                                setActiveSubject(subject.id);
                                setLoading(true);
                                setPage(1);
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons 
                                name={subject.icon} 
                                size={16} 
                                color={activeSubject === subject.id ? colors.white : colors.gray600} 
                            />
                            <Text style={[styles.subjectChipText, { color: colors.gray600 }, activeSubject === subject.id && { color: colors.white }]}>
                                {subject.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading && page === 1 ? (
                <View style={{ flex: 1 }}>
                    <ShadowLoader type="study" />
                </View>
            ) : (
                <FlatList
                    data={questions}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <StudyCard question={item} />}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="school-outline" size={64} color={colors.gray300} style={{ marginBottom: spacing.md }} />
                            <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('no_questions_in')} {activeSubject}</Text>
                            <Text style={[styles.emptySub, { color: colors.gray500 }]}>{t('be_the_first_to_ask')}</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    subjectsContainer: {
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
    },
    subjectsScroll: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: 10,
    },
    subjectChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: radii.full,
        borderWidth: 1,
    },
    subjectChipText: {
        fontFamily: fonts.medium,
        fontSize: 13,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        marginBottom: 8,
    },
    emptySub: {
        fontFamily: fonts.regular,
        fontSize: 14,
        textAlign: 'center',
    },
});
