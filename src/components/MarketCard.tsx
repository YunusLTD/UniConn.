import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors, spacing, fonts, radii } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface MarketCardProps {
    item: any;
}

export default function MarketCard({ item }: MarketCardProps) {
    const router = useRouter();

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => router.push(`/marketplace/${item.id}`)}
        >
            <View style={styles.header}>
                <View style={styles.tag}>
                    <Text style={styles.tagText}>MARKETPLACE</Text>
                </View>
                <Text style={styles.price}>${item.price?.toLocaleString() || '0'}</Text>
            </View>

            {item.image_url && (
                <View style={styles.imgContainer}>
                    <Image source={{ uri: item.image_url }} style={styles.img} />
                </View>
            )}

            <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                {item.description && (
                    <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                )}

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.seller}
                        onPress={(e) => {
                            e.stopPropagation();
                            if (item.seller_id) router.push(`/user/${item.seller_id}`);
                        }}
                        hitSlop={8}
                    >
                        <MaterialCommunityIcons name="account-circle-outline" size={14} color={colors.gray400} />
                        <Text style={styles.sellerName}>{item.profiles?.name || 'Student'}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionBtn}>
                        <Text style={styles.actionText}>View Item</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        marginHorizontal: spacing.lg,
        marginVertical: spacing.sm,
        borderRadius: radii.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.gray100,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray50,
    },
    tag: {
        backgroundColor: colors.gray50,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tagText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: colors.gray400,
        letterSpacing: 0.5,
    },
    price: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.black,
    },
    imgContainer: {
        width: '100%',
        height: 200,
        backgroundColor: colors.gray50,
    },
    img: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    content: {
        padding: 16,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: colors.black,
        marginBottom: 6,
    },
    desc: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.gray500,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 0.5,
        borderTopColor: colors.gray50,
    },
    seller: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sellerName: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.gray400,
    },
    actionBtn: {
        backgroundColor: colors.black,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radii.full,
    },
    actionText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: colors.white,
    },
});
