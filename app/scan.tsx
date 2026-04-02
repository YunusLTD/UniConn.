import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radii } from '../src/constants/theme';
import { useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');
const SCAN_AREA = width * 0.65;

export default function ScanScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);

        // Parse deep link: uniconnect://user/{username}
        const match = data.match(/uniconnect:\/\/user\/(.+)/);
        if (match?.[1]) {
            const username = match[1];
            router.replace(`/username/${username}` as any);
        } else {
            Alert.alert('Invalid QR', 'This QR code is not a valid UniConnect profile.', [
                { text: 'Scan Again', onPress: () => setScanned(false) },
                { text: 'Go Back', onPress: () => router.back() },
            ]);
        }
    };

    if (!permission) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <Stack.Screen options={{ headerShown: false }} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <StatusBar style="light" />
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.permissionCard}>
                    <View style={styles.permissionIcon}>
                        <Ionicons name="camera-outline" size={48} color="#667eea" />
                    </View>
                    <Text style={styles.permissionTitle}>Camera Access</Text>
                    <Text style={styles.permissionSub}>
                        Allow camera access to scan QR codes and connect with other students instantly.
                    </Text>
                    <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                        <Ionicons name="lock-open-outline" size={18} color="white" />
                        <Text style={styles.permissionBtnText}>Allow Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>Not now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{ headerShown: false }} />

            <CameraView
                style={StyleSheet.absoluteFillObject}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Dark overlay with cutout */}
            <View style={styles.overlay}>
                {/* Top */}
                <View style={styles.overlaySection} />

                {/* Middle row */}
                <View style={styles.middleRow}>
                    <View style={styles.overlaySide} />
                    <View style={styles.scanArea}>
                        {/* Corner brackets */}
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    <View style={styles.overlaySide} />
                </View>

                {/* Bottom */}
                <View style={[styles.overlaySection, { flex: 1.5 }]}>
                    <Text style={styles.scanText}>Point camera at a profile QR code</Text>
                </View>
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan QR Code</Text>
                <View style={{ width: 40 }} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: '#0f0f1a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    permissionCard: {
        alignItems: 'center',
        width: '100%',
    },
    permissionIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(102,126,234,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    permissionTitle: {
        fontFamily: fonts.bold,
        fontSize: 24,
        color: 'white',
        marginBottom: 12,
    },
    permissionSub: {
        fontFamily: fonts.regular,
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    permissionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#667eea',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        width: '100%',
        justifyContent: 'center',
    },
    permissionBtnText: {
        fontFamily: fonts.bold,
        fontSize: 17,
        color: 'white',
    },
    cancelBtn: {
        marginTop: 16,
        padding: 12,
    },
    cancelText: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: 'rgba(255,255,255,0.5)',
    },

    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
    },
    overlaySection: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 20,
    },
    middleRow: {
        flexDirection: 'row',
    },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    scanArea: {
        width: SCAN_AREA,
        height: SCAN_AREA,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderColor: '#667eea',
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 8,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 8,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 8,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 8,
    },
    scanText: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 24,
    },

    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: fonts.bold,
        fontSize: 17,
        color: 'white',
    },
});
