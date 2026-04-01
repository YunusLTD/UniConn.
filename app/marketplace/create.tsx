import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Image, Modal, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts, radii } from '../../src/constants/theme';
import { createMarketplaceListing } from '../../src/api/marketplace';
import { uploadSingleMedia } from '../../src/api/upload';
import { getMyCommunities } from '../../src/api/communities';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORIES = [
    { id: 'books', label: 'Books', icon: 'book-outline' },
    { id: 'clothes', label: 'Clothes', icon: 'shirt-outline' },
    { id: 'accessories', label: 'Accessories', icon: 'watch-outline' },
    { id: 'free', label: 'Free', icon: 'gift-outline' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function CreateListingScreen() {
    const { communityId: initialCommunityId } = useLocalSearchParams();
    const router = useRouter();
    
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('other');
    const [image, setImage] = useState<string | null>(null);
    const [selectedCommunityId, setSelectedCommunityId] = useState<any>(initialCommunityId || null);
    const [myCommunities, setMyCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingComm, setLoadingComm] = useState(true);
    const [showCommModal, setShowCommModal] = useState(false);

    const loadMyCommunities = useCallback(async () => {
        try {
            const res = await getMyCommunities();
            if (res?.data) {
                setMyCommunities(res.data);
                if (!selectedCommunityId && res.data.length > 0) {
                    setSelectedCommunityId(res.data[0].id);
                }
            }
        } catch (e) {
            console.error('Error loading communities:', e);
        } finally {
            setLoadingComm(false);
        }
    }, [selectedCommunityId]);

    useEffect(() => { loadMyCommunities(); }, [loadMyCommunities]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleCreate = async () => {
        if (!selectedCommunityId) return Alert.alert('Error', 'Please select a community');
        if (!title || price === '') return Alert.alert('Error', 'Title and Price are required');
        
        setLoading(true);
        try {
            let uploadedUrl = null;
            if (image) {
                const uploadRes = await uploadSingleMedia(image);
                if (uploadRes?.url) uploadedUrl = uploadRes.url;
            }

            const res = await createMarketplaceListing(selectedCommunityId as string, { 
                title, 
                price: Number(price), 
                description,
                category,
                image_url: uploadedUrl
            });

            if (res?.data) {
                Alert.alert('Success', 'Item listed successfully!');
                router.back();
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to list item');
        } finally {
            setLoading(false);
        }
    };

    const selectedComm = myCommunities.find(c => c.id === selectedCommunityId);
    const commName = selectedComm ? selectedComm.name : 'Choose Community';

    return (
        <View style={{ flex: 1, backgroundColor: colors.white }}>
            <Stack.Screen options={{ title: 'List an Item', headerBackTitle: '' }} />
            
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <Text style={styles.smallLabel}>Listing on </Text>
                    <TouchableOpacity onPress={() => setShowCommModal(true)} style={styles.clickableWrapper}>
                        <Text style={styles.clickableComm}>{commName}</Text>
                        <Ionicons name="chevron-down" size={14} color={colors.blue} style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.7}>
                    {image ? (
                        <>
                            <Image source={{ uri: image }} style={styles.previewImage} />
                            <View style={styles.imageOverlay}>
                                <Ionicons name="camera" size={24} color={colors.white} />
                                <Text style={styles.changePhotoText}>Change Photo</Text>
                            </View>
                        </>
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name="camera-outline" size={40} color={colors.gray300} />
                            <Text style={styles.uploadText}>Add Product Photo</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.section}>
                    <Text style={styles.label}>PRODUCT DETAILS</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="What are you selling?" 
                        placeholderTextColor={colors.gray400} 
                        value={title} 
                        onChangeText={setTitle} 
                    />
                    <View style={[styles.input, styles.priceInput]}>
                        <Text style={styles.dollarSign}>$</Text>
                        <TextInput 
                            style={styles.flexInput} 
                            placeholder="0" 
                            placeholderTextColor={colors.gray400} 
                            value={price} 
                            onChangeText={setPrice} 
                            keyboardType="numeric" 
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>CATEGORY</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity 
                                key={cat.id} 
                                style={[styles.categoryBtn, category === cat.id && styles.categoryBtnActive]}
                                onPress={() => setCategory(cat.id)}
                            >
                                <Ionicons 
                                    name={cat.icon as any} 
                                    size={18} 
                                    color={category === cat.id ? colors.white : colors.gray500} 
                                />
                                <Text style={[styles.categoryBtnText, category === cat.id && styles.categoryBtnTextActive]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>DESCRIPTION</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]} 
                        placeholder="Tell us more about the item..." 
                        placeholderTextColor={colors.gray400} 
                        value={description} 
                        onChangeText={setDescription} 
                        multiline 
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.btn, (loading || myCommunities.length === 0) && { opacity: 0.5 }]} 
                    onPress={handleCreate} 
                    disabled={loading || myCommunities.length === 0} 
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.btnText}>Post Listing</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={showCommModal} transparent animationType="slide" onRequestClose={() => setShowCommModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Choose Community</Text>
                            <TouchableOpacity onPress={() => setShowCommModal(false)}>
                                <Ionicons name="close" size={24} color={colors.black} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.commList}>
                            {myCommunities.map(comm => (
                                <TouchableOpacity 
                                    key={comm.id} 
                                    style={styles.commOption}
                                    onPress={() => {
                                        setSelectedCommunityId(comm.id);
                                        setShowCommModal(false);
                                    }}
                                >
                                    <Text style={[styles.commOptionText, selectedCommunityId === comm.id && { color: colors.blue, fontFamily: fonts.bold }]}>
                                        {comm.name}
                                    </Text>
                                    {selectedCommunityId === comm.id && <Ionicons name="checkmark" size={20} color={colors.blue} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: colors.white, padding: spacing.lg, paddingBottom: 60 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    smallLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray500 },
    clickableWrapper: { flexDirection: 'row', alignItems: 'center' },
    clickableComm: { fontFamily: fonts.bold, fontSize: 13, color: colors.blue, textDecorationLine: 'underline' },
    section: { marginBottom: 24 },
    label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.gray400, letterSpacing: 1, marginBottom: 12 },
    input: { 
        borderWidth: 1, 
        borderColor: colors.gray200, 
        paddingHorizontal: 16, 
        paddingVertical: 14, 
        borderRadius: radii.md, 
        fontFamily: fonts.regular, 
        fontSize: 15, 
        color: colors.black, 
        backgroundColor: colors.gray50,
        marginBottom: 12,
    },
    priceInput: { flexDirection: 'row', alignItems: 'center' },
    dollarSign: { fontSize: 15, fontFamily: fonts.bold, color: colors.black, marginRight: 4 },
    flexInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.black },
    textArea: { minHeight: 120, textAlignVertical: 'top' },
    imagePicker: {
        width: '100%',
        height: 200,
        borderRadius: radii.lg,
        backgroundColor: colors.gray50,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderStyle: 'dashed',
        marginBottom: 24,
        overflow: 'hidden',
    },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    uploadText: { fontFamily: fonts.medium, fontSize: 13, color: colors.gray400, marginTop: 8 },
    previewImage: { width: '100%', height: '100%' },
    imageOverlay: { 
        position: 'absolute', 
        inset: 0, 
        backgroundColor: 'rgba(0,0,0,0.3)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    changePhotoText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 14, marginTop: 4 },
    categoryRow: { gap: 10, paddingRight: 20 },
    categoryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: colors.gray50,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    categoryBtnActive: { backgroundColor: colors.black, borderColor: colors.black },
    categoryBtnText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gray500, marginLeft: 8 },
    categoryBtnTextActive: { color: colors.white },
    btn: { backgroundColor: colors.black, paddingVertical: 16, borderRadius: radii.md, alignItems: 'center', marginTop: 12 },
    btnText: { fontFamily: fonts.bold, color: colors.white, fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: SCREEN_HEIGHT * 0.7 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
    commList: { marginBottom: 20 },
    commOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
    commOptionText: { fontFamily: fonts.medium, fontSize: 16, color: colors.black },
});
