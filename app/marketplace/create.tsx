import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Image, Modal, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fonts, radii } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
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
    const { communityId: initialCommunityId, defaultType } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('other');
    const [listingType, setListingType] = useState<'sell' | 'request'>((defaultType as 'sell' | 'request') || 'sell');
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
        if (!title) return Alert.alert('Error', 'Title is required');
        if (listingType === 'sell' && price === '') return Alert.alert('Error', 'Price is required for selling');
        if (listingType === 'sell' && isNaN(Number(price))) return Alert.alert('Error', 'Price must be a number');
        
        setLoading(true);
        try {
            let uploadedUrl = null;
            if (image) {
                const uploadRes = await uploadSingleMedia(image);
                if (uploadRes?.url) uploadedUrl = uploadRes.url;
            }

            const res = await createMarketplaceListing(selectedCommunityId as string, { 
                title, 
                price: listingType === 'request' ? null : Number(price), 
                description,
                category,
                listing_type: listingType,
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
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Stack.Screen options={{ 
                title: 'List an Item', 
                headerBackTitle: '',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.black
            }} />
            
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <Text style={[styles.smallLabel, { color: colors.gray500 }]}>Listing on </Text>
                    <TouchableOpacity onPress={() => setShowCommModal(true)} style={styles.clickableWrapper}>
                        <Text style={styles.clickableComm}>{commName}</Text>
                        <Ionicons name="chevron-down" size={14} color="#00A3FF" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.typeSelectorRow, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity 
                        style={[
                            styles.typeBtn, 
                            listingType === 'sell' && [styles.typeBtnActive, { backgroundColor: colors.background }]
                        ]} 
                        onPress={() => setListingType('sell')}
                    >
                        <Text style={[
                            styles.typeBtnText, { color: colors.gray500 },
                            listingType === 'sell' && styles.typeBtnTextActive
                        ]}>Sell Item</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[
                            styles.typeBtn, 
                            listingType === 'request' && [styles.typeBtnActive, { backgroundColor: colors.background }]
                        ]} 
                        onPress={() => setListingType('request')}
                    >
                        <Text style={[
                            styles.typeBtnText, { color: colors.gray500 },
                            listingType === 'request' && styles.typeBtnTextActive
                        ]}>Request Item</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.imagePicker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={pickImage} activeOpacity={0.7}>
                    {image ? (
                        <>
                            <Image source={{ uri: image }} style={styles.previewImage} />
                            <View style={styles.imageOverlay}>
                                <Ionicons name="camera" size={24} color="#FFFFFF" />
                                <Text style={styles.changePhotoText}>Change Photo</Text>
                            </View>
                        </>
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name="camera-outline" size={40} color={colors.gray400} />
                            <Text style={[styles.uploadText, { color: colors.gray500 }]}>{listingType === 'sell' ? 'Add Product Photo' : 'Add Reference Photo (Optional)'}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.gray500 }]}>ITEM DETAILS</Text>
                    <TextInput 
                        style={[styles.input, { borderColor: colors.border, color: colors.black, backgroundColor: colors.surface }]} 
                        placeholder={listingType === 'sell' ? "What are you selling?" : "What are you looking for?"} 
                        placeholderTextColor={colors.gray400} 
                        value={title} 
                        onChangeText={setTitle} 
                    />
                    {listingType === 'sell' && (
                        <View style={[styles.input, styles.priceInput, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                            <Text style={[styles.dollarSign, { color: colors.black }]}>$</Text>
                            <TextInput 
                                style={[styles.flexInput, { color: colors.black }]} 
                                placeholder="0" 
                                placeholderTextColor={colors.gray400} 
                                value={price} 
                                onChangeText={setPrice} 
                                keyboardType="numeric" 
                            />
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.gray500 }]}>CATEGORY</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity 
                                key={cat.id} 
                                style={[
                                    styles.categoryBtn, { backgroundColor: colors.surface, borderColor: colors.border },
                                    category === cat.id && [styles.categoryBtnActive, { backgroundColor: colors.black, borderColor: colors.black }]
                                ]}
                                onPress={() => setCategory(cat.id)}
                            >
                                <Ionicons 
                                    name={cat.icon as any} 
                                    size={18} 
                                    color={category === cat.id ? colors.white : colors.gray500} 
                                />
                                <Text style={[
                                    styles.categoryBtnText, { color: colors.gray500 },
                                    category === cat.id && [styles.categoryBtnTextActive, { color: colors.white }]
                                ]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.gray500 }]}>DESCRIPTION</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.black, backgroundColor: colors.surface }]} 
                        placeholder="Tell us more about the item..." 
                        placeholderTextColor={colors.gray400} 
                        value={description} 
                        onChangeText={setDescription} 
                        multiline 
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: colors.black }, (loading || myCommunities.length === 0) && { opacity: 0.5 }]} 
                    onPress={handleCreate} 
                    disabled={loading || myCommunities.length === 0} 
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={[styles.btnText, { color: colors.white }]}>Post Listing</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={showCommModal} transparent animationType="slide" onRequestClose={() => setShowCommModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.black }]}>Choose Community</Text>
                            <TouchableOpacity onPress={() => setShowCommModal(false)}>
                                <Ionicons name="close" size={24} color={colors.black} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.commList}>
                            {myCommunities.map(comm => (
                                <TouchableOpacity 
                                    key={comm.id} 
                                    style={[styles.commOption, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        setSelectedCommunityId(comm.id);
                                        setShowCommModal(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.commOptionText, { color: colors.black },
                                        selectedCommunityId === comm.id && { color: "#00A3FF", fontFamily: fonts.bold }
                                    ]}>
                                        {comm.name}
                                    </Text>
                                    {selectedCommunityId === comm.id && <Ionicons name="checkmark" size={20} color="#00A3FF" />}
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
    container: { flexGrow: 1, padding: spacing.lg, paddingBottom: 60 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    smallLabel: { fontFamily: fonts.medium, fontSize: 13 },
    clickableWrapper: { flexDirection: 'row', alignItems: 'center' },
    clickableComm: { fontFamily: fonts.bold, fontSize: 13, color: "#00A3FF", textDecorationLine: 'underline' },
    
    typeSelectorRow: { 
        flexDirection: 'row', 
        borderRadius: radii.md, 
        padding: 4, 
        marginBottom: 24 
    },
    typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radii.md },
    typeBtnActive: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
    typeBtnText: { fontFamily: fonts.medium, fontSize: 14 },
    typeBtnTextActive: { fontFamily: fonts.bold },
    
    section: { marginBottom: 24 },
    label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1, marginBottom: 12 },
    input: { 
        borderWidth: 1, 
        paddingHorizontal: 16, 
        paddingVertical: 14, 
        borderRadius: radii.md, 
        fontFamily: fonts.regular, 
        fontSize: 15, 
        marginBottom: 12,
    },
    priceInput: { flexDirection: 'row', alignItems: 'center' },
    dollarSign: { fontSize: 15, fontFamily: fonts.bold, marginRight: 4 },
    flexInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15 },
    textArea: { minHeight: 120, textAlignVertical: 'top' },
    imagePicker: {
        width: '100%',
        height: 200,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginBottom: 24,
        overflow: 'hidden',
    },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    uploadText: { fontFamily: fonts.medium, fontSize: 13, marginTop: 8 },
    previewImage: { width: '100%', height: '100%' },
    imageOverlay: { 
        position: 'absolute', 
        inset: 0, 
        backgroundColor: 'rgba(0,0,0,0.3)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    changePhotoText: { color: "#FFFFFF", fontFamily: fonts.semibold, fontSize: 14, marginTop: 4 },
    categoryRow: { gap: 10, paddingRight: 20 },
    categoryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    categoryBtnActive: { },
    categoryBtnText: { fontFamily: fonts.semibold, fontSize: 13, marginLeft: 8 },
    categoryBtnTextActive: { },
    btn: { paddingVertical: 16, borderRadius: radii.md, alignItems: 'center', marginTop: 12 },
    btnText: { fontFamily: fonts.bold, fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: SCREEN_HEIGHT * 0.7 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontFamily: fonts.bold, fontSize: 18 },
    commList: { marginBottom: 20 },
    commOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    commOptionText: { fontFamily: fonts.medium, fontSize: 16 },
});
