import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { colors, fonts, spacing, radii } from '../../src/constants/theme';
import { getByUsername } from '../../src/api/users';
import { createConversation } from '../../src/api/messages';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';

export default function UserProfileScreen() {
    const { username } = useLocalSearchParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [startingChat, setStartingChat] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await getByUsername(username as string);
                if (res?.data) {
                    setProfile(res.data);
                }
            } catch (e) {
                console.error('Error fetching user', e);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [username]);

    const handleMessage = async () => {
        if (!profile || profile.id === currentUser?.id) return;
        setStartingChat(true);
        try {
            const res = await createConversation({
                type: 'direct',
                participant_ids: [profile.id]
            });
            if (res?.data?.id) {
                router.push(`/chat/${res.data.id}` as any);
            }
        } catch (e) {
            console.error('Error starting chat', e);
            alert('Could not start conversation');
        } finally {
            setStartingChat(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="small" color={colors.black} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.centered}>
                <Stack.Screen options={{ title: 'User Not Found' }} />
                <Text style={styles.errorText}>This user could not be found.</Text>
            </View>
        );
    }

    const initial = profile.name?.[0]?.toUpperCase() || '?';
    const isSelf = profile.id === currentUser?.id;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Stack.Screen options={{ title: `@${profile.username}`, headerBackTitle: '' }} />

            <View style={styles.header}>
                <View style={styles.avatarWrap}>
                    {profile.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitial}>{initial}</Text>
                        </View>
                    )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.name}>{profile.name}</Text>
                    {isSelf && (
                        <View style={styles.selfBadge}>
                            <Text style={styles.selfBadgeText}>YOU</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.username}>@{profile.username}</Text>

                {profile.bio && (
                    <Text style={styles.bio}>{profile.bio}</Text>
                )}

                {profile.universities?.name && (
                    <View style={styles.uniTag}>
                        <Ionicons name="school-outline" size={14} color={colors.gray600} />
                        <Text style={styles.uniText}>{profile.universities.name}</Text>
                    </View>
                )}
            </View>

                <View style={styles.actions}>
                    {isSelf ? (
                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <Ionicons name="create-outline" size={20} color={colors.black} />
                            <Text style={styles.editBtnText}>Edit Profile</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.messageBtn}
                            onPress={handleMessage}
                            disabled={startingChat}
                        >
                            {startingChat ? (
                                <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                                <>
                                    <Ionicons name="chatbubble-outline" size={20} color={colors.white} />
                                    <Text style={styles.messageBtnText}>Message</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    content: { padding: spacing.xl },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
    errorText: { fontFamily: fonts.regular, fontSize: 16, color: colors.gray500 },

    header: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
    avatarWrap: { marginBottom: spacing.lg },
    avatarImg: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.gray200 },
    avatarInitial: { fontFamily: fonts.bold, fontSize: 36, color: colors.gray500 },

    name: { fontFamily: fonts.bold, fontSize: 24, color: colors.black, marginBottom: 4 },
    username: { fontFamily: fonts.medium, fontSize: 15, color: colors.gray500, marginBottom: spacing.md },
    bio: { fontFamily: fonts.regular, fontSize: 15, color: colors.gray700, textAlign: 'center', lineHeight: 22, marginBottom: spacing.md },

    uniTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray50, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full, gap: 6 },
    uniText: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray600 },

    actions: { paddingHorizontal: spacing.lg },
    messageBtn: { backgroundColor: colors.black, height: 50, borderRadius: radii.full, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    messageBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
    editBtn: { backgroundColor: colors.gray100, height: 50, borderRadius: radii.full, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    editBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
    selfBadge: {
        backgroundColor: colors.gray100,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    selfBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: colors.gray600,
        letterSpacing: 0.5,
    },
});
