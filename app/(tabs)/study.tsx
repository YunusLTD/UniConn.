import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { getStudyQuestions } from '../../src/api/study';
import StudyCard from '../../src/components/StudyCard';
import ShadowLoader, { Skeleton } from '../../src/components/ShadowLoader';
import { SafeAreaView } from 'react-native-safe-area-context';

const SUBJECTS = ['All', 'Math', 'Science', 'English', 'History', 'Physics', 'Computer Science', 'Business', 'Arts'];

export default function StudyScreen() {
    const router = useRouter();
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
        <View style={styles.container}>
            <View style={styles.subjectsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectsScroll}>
                    {SUBJECTS.map(subject => (
                        <TouchableOpacity
                            key={subject}
                            style={[styles.subjectChip, activeSubject === subject && styles.activeSubjectChip]}
                            onPress={() => {
                                setActiveSubject(subject);
                                setLoading(true);
                                setPage(1);
                            }}
                        >
                            <Text style={[styles.subjectChipText, activeSubject === subject && styles.activeSubjectChipText]}>
                                {subject}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading && page === 1 ? (
                <View style={{ flex: 1, padding: spacing.md }}>
                    <ShadowLoader />
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
                            <Text style={styles.emptyTitle}>No questions in {activeSubject}</Text>
                            <Text style={styles.emptySub}>Be the first to ask or help out!</Text>
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
        backgroundColor: colors.background,
    },
    subjectsContainer: {
        backgroundColor: colors.white,
        paddingBottom: 12,
        paddingTop: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray100,
    },
    subjectsScroll: {
        paddingHorizontal: spacing.lg,
        gap: 8,
    },
    subjectChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.gray50,
        borderWidth: 0.5,
        borderColor: colors.gray100,
    },
    activeSubjectChip: {
        backgroundColor: colors.black,
        borderColor: colors.black,
    },
    subjectChipText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.gray600,
    },
    activeSubjectChipText: {
        color: colors.white,
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
        color: colors.black,
        marginBottom: 8,
    },
    emptySub: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray500,
        textAlign: 'center',
    },
});
