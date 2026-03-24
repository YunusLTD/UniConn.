import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

interface StudyCardProps {
    question: any;
}

const StudyCard: React.FC<StudyCardProps> = ({ question }) => {
    const router = useRouter();
    const { user } = useAuth();
    const isMe = user?.id === question.user_id;
    const initial = question.profiles?.name?.[0]?.toUpperCase() || '?';

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => router.push(`/study/${question.id}`)}
        >
            <View style={styles.header}>
                <View style={[styles.avatar, !question.profiles?.avatar_url && styles.avatarPlaceholder]}>
                    {question.profiles?.avatar_url ? (
                        <Image source={{ uri: question.profiles.avatar_url }} style={styles.avatarImg} />
                    ) : (
                        <Text style={styles.avatarText}>{initial}</Text>
                    )}
                </View>
                <View style={styles.headerInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.name}>{question.profiles?.name || 'Anonymous'}</Text>
                        {isMe && <Text style={[styles.name, { color: colors.gray400, fontSize: 13 }]}>{'(You)'}</Text>}
                    </View>
                    <Text style={styles.time}>{new Date(question.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {question.subject}</Text>
                </View>
                <View style={styles.subjectBadge}>
                    <Text style={styles.subjectText}>{question.subject}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={2}>{question.title}</Text>
                <Text style={styles.description} numberOfLines={3}>{question.content}</Text>
            </View>

            {
                question.image_url && (
                    <Image source={{ uri: question.image_url }} style={styles.image} resizeMode="cover" />
                )
            }

            <View style={styles.footer}>
                <View style={styles.action}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.gray500} />
                    <Text style={styles.actionText}>{question.answers_count || 0} {question.answers_count === 1 ? 'Reply' : 'Replies'}</Text>
                </View>
                <View style={styles.action}>
                    <Text style={[styles.actionText, { color: colors.black, fontFamily: fonts.bold }]}>Help out</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                </View>
            </View>
        </TouchableOpacity >
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        borderRadius: 20,
        padding: 16,
        borderWidth: 0.5,
        borderColor: colors.gray100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
    },
    avatarPlaceholder: {
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.gray500,
    },
    headerInfo: {
        flex: 1,
        marginLeft: 10,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.black,
    },
    time: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: colors.gray500,
    },
    subjectBadge: {
        backgroundColor: colors.gray50,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: colors.gray100,
    },
    subjectText: {
        fontFamily: fonts.semibold,
        fontSize: 10,
        color: colors.gray600,
        textTransform: 'uppercase',
    },
    content: {
        marginBottom: 12,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 17,
        color: colors.black,
        lineHeight: 22,
        marginBottom: 6,
    },
    description: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray600,
        lineHeight: 20,
    },
    image: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 0.5,
        borderTopColor: colors.gray50,
    },
    action: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.gray500,
    },
});

export default StudyCard;
