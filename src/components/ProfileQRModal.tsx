import React, { useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Share, Dimensions, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radii } from '../constants/theme';
import QRCode from 'react-native-qrcode-svg';
import { Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { hapticLight, hapticSuccess, hapticSelection } from '../utils/haptics';

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.55;

interface ProfileQRModalProps {
    visible: boolean;
    onClose: () => void;
    profile: {
        name: string;
        username: string;
        avatar_url?: string;
        university_name?: string;
    };
    onOpenScanner?: () => void;
}

export default function ProfileQRModal({ visible, onClose, profile, onOpenScanner }: ProfileQRModalProps) {
    const deepLink = `uniconnect://user/${profile.username}`;

    const handleShare = async () => {
        hapticSelection();
        try {
            await Share.share({
                message: `Add me on UniConnect! 🎓\n\nFind me as @${profile.username}\n\n${deepLink}`,
            });
        } catch (e) { }
    };

    const initial = profile.name?.[0]?.toUpperCase() || '?';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <StatusBar style="light" />
                {/* Header Bar */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => { hapticSelection(); onClose(); }} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My QR Code</Text>
                    <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
                        <Ionicons name="share-outline" size={22} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Main Content */}
                <View style={styles.content}>
                    {/* Profile Info */}
                    <View style={styles.profileSection}>
                        <View style={styles.avatarContainer}>
                            {profile.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitial}>{initial}</Text>
                                </View>
                            )}
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={24} color="#667eea" />
                            </View>
                        </View>
                        <Text style={styles.name}>{profile.name}</Text>
                        <Text style={styles.username}>@{profile.username}</Text>
                        {profile.university_name && (
                            <View style={styles.uniPill}>
                                <Ionicons name="school-outline" size={13} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.uniText}>{profile.university_name}</Text>
                            </View>
                        )}
                    </View>

                    {/* QR Card */}
                    <View style={styles.qrCard}>
                        <View style={styles.qrInnerBorder}>
                            <QRCode
                                value={deepLink}
                                size={QR_SIZE}
                                color="#1a1a2e"
                                backgroundColor="white"
                                ecl="M"
                            />
                        </View>
                        <Text style={styles.scanPrompt}>Scan to connect instantly</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.shareActionBtn} onPress={handleShare}>
                            <Ionicons name="paper-plane-outline" size={20} color="white" />
                            <Text style={styles.shareActionText}>Share My Profile</Text>
                        </TouchableOpacity>

                        {onOpenScanner && (
                            <TouchableOpacity
                                style={styles.scanActionBtn}
                                onPress={() => {
                                    hapticLight();
                                    onClose();
                                    setTimeout(() => onOpenScanner(), 300);
                                }}
                            >
                                <Ionicons name="scan-outline" size={20} color="white" />
                                <Text style={styles.scanActionText}>Scan a QR Code</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: fonts.bold,
        fontSize: 17,
        color: 'white',
    },
    shareBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        marginTop: -20,
    },

    profileSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: 'rgba(102,126,234,0.5)',
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#667eea',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(102,126,234,0.5)',
    },
    avatarInitial: {
        fontFamily: fonts.bold,
        fontSize: 28,
        color: 'white',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#0f0f1a',
        borderRadius: 12,
        padding: 2,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 24,
        color: 'white',
        marginBottom: 4,
    },
    username: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 12,
    },
    uniPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    uniText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
    },

    qrCard: {
        backgroundColor: 'white',
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 12,
        marginBottom: 32,
    },
    qrInnerBorder: {
        padding: 12,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#f0f0f5',
    },
    scanPrompt: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: '#999',
        marginTop: 16,
    },

    actions: {
        width: '100%',
        gap: 12,
    },
    shareActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 54,
        borderRadius: 16,
        backgroundColor: '#667eea',
    },
    shareActionText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: 'white',
    },
    scanActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 54,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    scanActionText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: 'white',
    },
});
