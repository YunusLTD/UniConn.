import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getStudyQuestion, getStudyAnswers, createStudyAnswer } from '../../src/api/study';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '../../src/context/ToastContext';

export default function StudyDetailScreen() {
    const { colors, isDark } = useTheme();
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [question, setQuestion] = useState<any>(null);
    const [answers, setAnswers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [answerText, setAnswerText] = useState('');
    const [sending, setSending] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const styles = useMemo(() => createStyles(colors), [colors]);

    const loadData = async () => {
        try {
            const [qRes, aRes] = await Promise.all([
                getStudyQuestion(id as string),
                getStudyAnswers(id as string)
            ]);
            setQuestion(qRes.data);
            setAnswers(aRes.data || []);
        } catch (e) {
            console.log('Error loading study data', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [id]);

    const handleSendAnswer = async () => {
        if (!answerText.trim() || sending) return;
        setSending(true);
        try {
            const res = await createStudyAnswer(id as string, { content: answerText.trim() });
            if (res?.data) {
                setAnswers(prev => [...prev, res.data]);
                setAnswerText('');
                setTimeout(() => scrollViewRef.current?.scrollToEnd(), 100);
            }
        } catch (e) {
            showToast({ title: 'Error', message: 'Failed to post answer', type: 'error' });
        } finally {
            setSending(false);
        }
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.text} />
        </View>
    );

    if (!question) return (
        <View style={styles.loadingContainer}>
            <Text style={{ color: colors.gray400 }}>Question not found</Text>
        </View>
    );

    const initial = question.profiles?.name?.[0]?.toUpperCase() || '?';

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen options={{ 
                title: 'Study Discussion', 
                headerBackTitle: '',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerTitleStyle: { color: colors.text, fontFamily: fonts.bold }
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* The Question Card */}
                    <View style={styles.questionSection}>
                        <View style={styles.header}>
                            <View style={styles.authorRow}>
                                <View style={[styles.avatar, !question.profiles?.avatar_url && styles.avatarPlaceholder]}>
                                    {question.profiles?.avatar_url ? (
                                        <Image source={{ uri: question.profiles.avatar_url }} style={styles.avatarImg} />
                                    ) : (
                                        <Text style={styles.avatarText}>{initial}</Text>
                                    )}
                                </View>
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Text style={styles.name}>{question.profiles?.name || 'User'}</Text>
                                        {user?.id === question.user_id && <Text style={[styles.name, { color: colors.gray400, fontSize: 13 }]}>{'(You)'}</Text>}
                                    </View>
                                    <Text style={styles.subText}>{new Date(question.created_at).toLocaleDateString()} • {question.subject}</Text>
                                </View>
                            </View>
                        </View>

                        <Text style={styles.title}>{question.title}</Text>
                        <Text style={styles.content}>{question.content}</Text>

                        {question.image_url && (
                            <Image source={{ uri: question.image_url }} style={styles.image} resizeMode="contain" />
                        )}
                    </View>

                    <View style={styles.divider} />

                    {/* Answers Section */}
                    <View style={styles.answersHeader}>
                        <Text style={styles.answersTitle}>Answers ({answers.length})</Text>
                    </View>

                    {answers.length === 0 ? (
                        <View style={styles.emptyAnswers}>
                            <Ionicons name="chatbubbles-outline" size={32} color={colors.gray300} />
                            <Text style={styles.emptyAnswersText}>Nobody has answered yet. Be the first to help out!</Text>
                        </View>
                    ) : (
                        answers.map(answer => (
                            <View key={answer.id} style={styles.answerCard}>
                                <View style={styles.answerHeader}>
                                    <View style={[styles.answerAvatar, !answer.profiles?.avatar_url && styles.answerAvatarPlaceholder]}>
                                        {answer.profiles?.avatar_url ? (
                                            <Image source={{ uri: answer.profiles.avatar_url }} style={styles.avatarImg} />
                                        ) : (
                                            <Text style={styles.answerAvatarText}>{answer.profiles?.name?.[0]?.toUpperCase() || '?'}</Text>
                                        )}
                                    </View>
                                    <View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Text style={styles.answerName}>{answer.profiles?.name || 'Helper'}</Text>
                                            {user?.id === answer.user_id && <Text style={[styles.answerName, { color: colors.gray400, fontSize: 12 }]}>{'(You)'}</Text>}
                                        </View>
                                        <Text style={styles.answerTime}>{new Date(answer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>
                                </View>
                                <Text style={styles.answerContent}>{answer.content}</Text>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* Answer Input Bar */}
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type your answer or explanation..."
                        placeholderTextColor={colors.gray400}
                        value={answerText}
                        onChangeText={setAnswerText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, !answerText.trim() && { opacity: 0.5 }]}
                        onPress={handleSendAnswer}
                        disabled={!answerText.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Ionicons name="send" size={20} color={colors.white} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView >
        </SafeAreaView >
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    questionSection: {
        padding: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.gray500,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: colors.text,
    },
    subText: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.gray500,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 22,
        lineHeight: 28,
        color: colors.text,
        marginBottom: 12,
    },
    content: {
        fontFamily: fonts.regular,
        fontSize: 16,
        lineHeight: 24,
        color: colors.gray600,
        marginBottom: 16,
    },
    image: {
        width: '100%',
        height: 300,
        borderRadius: 12,
        backgroundColor: colors.gray50,
    },
    divider: {
        height: 8,
        backgroundColor: colors.gray50,
    },
    answersHeader: {
        padding: spacing.lg,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray100,
    },
    answersTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.text,
    },
    emptyAnswers: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyAnswersText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray400,
        textAlign: 'center',
    },
    answerCard: {
        padding: spacing.lg,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray100,
    },
    answerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    answerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    answerAvatarPlaceholder: {
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    answerAvatarText: {
        fontSize: 12,
        fontFamily: fonts.bold,
        color: colors.gray500,
    },
    answerName: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.text,
    },
    answerTime: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: colors.gray400,
    },
    answerContent: {
        fontFamily: fonts.regular,
        fontSize: 15,
        lineHeight: 22,
        color: colors.gray700,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.lg,
        paddingVertical: 12,
        borderTopWidth: 0.5,
        borderTopColor: colors.gray100,
        backgroundColor: colors.background,
    },
    input: {
        flex: 1,
        maxHeight: 120,
        minHeight: 44,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 22,
        backgroundColor: colors.gray50,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.text,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
});
