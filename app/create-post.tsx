import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, FlatList, DeviceEventEmitter } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, fonts, radii } from '../src/constants/theme';
import { getMyCommunities, createCommunity } from '../src/api/communities';
import { createPost, getPost, updatePost } from '../src/api/posts';
import { createEvent } from '../src/api/events';
import { createJob } from '../src/api/jobs';
import { createMarketplaceListing } from '../src/api/marketplace';
import { createPoll } from '../src/api/polls';
import { uploadMultipleMedia } from '../src/api/upload';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '../src/components/ShadowLoader';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getCommunityMembers } from '../src/api/communities';

export default function CreatePostModal() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [communities, setCommunities] = useState<any[]>([]);
    const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [showSelector, setShowSelector] = useState(false);
    const [taggingSearch, setTaggingSearch] = useState<string | null>(null);
    const [taggingRefInput, setTaggingRefInput] = useState<'content' | 'description' | 'poll' | null>(null);
    const [members, setMembers] = useState<any[]>([]);

    // Normalize plural types from tabs
    const normalizedType = params.type === 'events' ? 'event' : params.type === 'jobs' ? 'job' : params.type;
    const [creationType, setCreationType] = useState<'post' | 'event' | 'job' | 'study' | 'market' | 'poll'>((normalizedType as any) || 'post');

    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [eventLocation, setEventLocation] = useState('');

    const [jobTitle, setJobTitle] = useState('');
    const [jobBudget, setJobBudget] = useState('');

    const [studyTitle, setStudyTitle] = useState('');
    const [studyTopic, setStudyTopic] = useState('');
    const [studySchedule, setStudySchedule] = useState('');

    const [marketTitle, setMarketTitle] = useState('');
    const [marketPrice, setMarketPrice] = useState('');

    const [attachments, setAttachments] = useState<{ uri: string, type: 'image' | 'video' }[]>([]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // 1. Load communities
                const commRes = await getMyCommunities();
                if (commRes?.data) {
                    setCommunities(commRes.data);
                }

                // 2. If editing, load the post
                if (params.edit === 'true' && params.postId) {
                    const postRes = await getPost(params.postId as string);
                    if (postRes?.data) {
                        const post = postRes.data;
                        setContent(post.content || '');
                        setCreationType('post'); // For now only editing regular posts
                        
                        if (commRes?.data) {
                            const comm = commRes.data.find((c: any) => c.id === post.community_id);
                            if (comm) {
                                setSelectedCommunity(comm);
                                loadMembers(comm.id);
                            }
                        }
                    }
                } else if (commRes?.data) {
                    // Default selection for new posts
                    let target = null;
                    if (params.communityId) {
                        target = commRes.data.find((c: any) => c.id === params.communityId);
                    } else if (commRes.data.length > 0) {
                        target = commRes.data[0];
                    }
                    if (target) {
                        setSelectedCommunity(target);
                        loadMembers(target.id);
                    }
                }
            } catch (error) {
                console.error('Failed to load initial data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [params.communityId, params.edit, params.postId]);

    const loadMembers = async (communityId: string) => {
        try {
            const res = await getCommunityMembers(communityId);
            if (res?.data) setMembers(res.data);
        } catch (e) { }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const pickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            allowsMultipleSelection: true,
            selectionLimit: 10,
            quality: 0.8,
        });
        if (!result.canceled) {
            const newAttachments = result.assets.map(asset => ({
                uri: asset.uri,
                type: asset.type as 'image' | 'video'
            }));
            setAttachments([...attachments, ...newAttachments].slice(0, 10));
        }
    };

    const takeMedia = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Error', 'Camera permission is required');
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
        if (!result.canceled) {
            const asset = result.assets[0];
            const newAttachment = { uri: asset.uri, type: asset.type as 'image' | 'video' };
            setAttachments([...attachments, newAttachment].slice(0, 10));
        }
    };

    const handlePost = async () => {
        if (!selectedCommunity && creationType !== 'study') return Alert.alert('Error', 'Please select a community.');
        setPosting(true);
        try {
            let media_urls: string[] = [];
            let media_types: string[] = [];
            if (attachments.length > 0) {
                const uploadRes = await uploadMultipleMedia(attachments);
                media_urls = uploadRes.map((f: any) => f.url);
                media_types = uploadRes.map((f: any) => f.type);
            }

            if (creationType === 'post') {
                if (!content.trim() && attachments.length === 0) throw new Error('Content or media is required');
                if (params.edit === 'true' && params.postId) {
                    await updatePost(params.postId as string, { content: content.trim() });
                } else {
                    await createPost(selectedCommunity.id, { content: content.trim(), media_urls, media_types });
                }
            } else if (creationType === 'event') {
                if (!eventTitle.trim()) throw new Error('Title is required');
                await createEvent(selectedCommunity.id, {
                    title: eventTitle, description: content,
                    start_time: eventDate.toISOString(), location: eventLocation,
                    image_url: media_urls[0]
                });
            } else if (creationType === 'job') {
                if (!jobTitle.trim()) throw new Error('Title is required');
                await createJob(selectedCommunity.id, {
                    title: jobTitle, description: content,
                    budget: jobBudget ? parseFloat(jobBudget) : null
                });

            } else if (creationType === 'market') {
                if (!marketTitle.trim()) throw new Error('Item name is required');
                await createMarketplaceListing(selectedCommunity.id, {
                    title: marketTitle, description: content,
                    price: marketPrice ? parseFloat(marketPrice) : 0,
                    image_url: media_urls[0]
                });
            } else if (creationType === 'poll') {
                if (!pollQuestion.trim()) throw new Error('Poll question is required');
                const validOptions = pollOptions.filter(o => o.trim());
                if (validOptions.length < 2) throw new Error('At least 2 options required');
                await createPoll(selectedCommunity.id, {
                    question: pollQuestion.trim(),
                    options: validOptions.map(o => o.trim()),
                });
            }
            DeviceEventEmitter.emit('postCreated');
            router.back();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to create');
            setPosting(false);
        }
    };

    const TYPES: { key: typeof creationType, icon: string, label: string }[] = [
        { key: 'post', icon: 'document-text-outline', label: 'Post' },
        { key: 'poll', icon: 'stats-chart-outline', label: 'Poll' },
        { key: 'event', icon: 'calendar-outline', label: 'Event' },
        { key: 'job', icon: 'briefcase-outline', label: 'Job' },
        { key: 'market', icon: 'cart-outline', label: 'Sell' },
    ];

    const formatSmartDate = (date: Date) => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const isToday = date.toDateString() === now.toDateString();
        const isTomorrow = date.toDateString() === tomorrow.toDateString();

        const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        if (isToday) return `Today, ${time}`;
        if (isTomorrow) return `Tomorrow, ${time}`;

        // If within the next 7 days, show day name
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && diffDays < 7) {
            return `${date.toLocaleDateString([], { weekday: 'short' })}, ${time}`;
        }

        return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            if (selectedDate) setEventDate(selectedDate);
            return;
        }
        if (selectedDate) setEventDate(selectedDate);
    };

    const handleInputChange = (text: string, field: 'content' | 'description' | 'poll') => {
        if (field === 'content') setContent(text);
        else if (field === 'poll') setPollQuestion(text);

        // Detect tagging in current field
        const lastWord = text.split(/\s/).pop();
        if (lastWord?.startsWith('@')) {
            setTaggingSearch(lastWord.substring(1));
            setTaggingRefInput(field);
        } else {
            setTaggingSearch(null);
            setTaggingRefInput(null);
        }
    };

    const handleSelectTag = (username: string) => {
        const currentVal = taggingRefInput === 'poll' ? pollQuestion : content;
        const parts = currentVal.split(' ');
        parts.pop();
        const newVal = parts.join(' ') + (parts.length > 0 ? ' ' : '') + '@' + username + ' ';
        
        if (taggingRefInput === 'poll') setPollQuestion(newVal);
        else setContent(newVal);
        
        setTaggingSearch(null);
        setTaggingRefInput(null);
    };

    const filteredMembers = taggingSearch !== null 
        ? members.filter(m => {
            const search = taggingSearch.toLowerCase();
            const username = m.profiles?.username?.toLowerCase() || '';
            const name = m.profiles?.name?.toLowerCase() || '';
            return username.includes(search) || name.includes(search);
        }).slice(0, 8)
        : [];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{params.edit === 'true' ? 'Edit' : 'New'} {creationType === 'study' ? 'Mini Community' : creationType === 'market' ? 'Listing' : creationType}</Text>
                    <TouchableOpacity
                        style={[styles.postBtn, posting && { opacity: 0.5 }]}
                        onPress={handlePost}
                        disabled={posting}
                        activeOpacity={0.7}
                    >
                        {posting ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Text style={styles.postBtnText}>
                                {params.edit === 'true' ? 'Save' : (creationType === 'post' ? 'Share' : 'Launch')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Community Selector */}
                {creationType !== 'study' && (
                    <View style={[styles.selectorRow, !!params.communityId && { opacity: 0.7 }]}>
                        <Text style={styles.selectorLabel}>in</Text>
                        {loading ? (
                            <Skeleton width={120} height={32} borderRadius={16} />
                        ) : (
                            <TouchableOpacity
                                style={styles.selectorPill}
                                onPress={() => !params.communityId && setShowSelector(!showSelector)}
                                disabled={!!params.communityId}
                            >
                                <Text style={styles.selectorText}>{selectedCommunity?.is_official ? (selectedCommunity.universities?.name || 'University Feed') : (selectedCommunity?.name?.replace(/ community/gi, '') || 'Select')}</Text>
                                {!params.communityId && <Ionicons name={showSelector ? 'chevron-up' : 'chevron-down'} size={14} color={colors.gray500} />}
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {showSelector && (
                    <View style={styles.dropdown}>
                        <ScrollView style={{ maxHeight: 180 }}>
                            {communities.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={styles.dropdownItem}
                                    onPress={() => { 
                                        setSelectedCommunity(c); 
                                        setShowSelector(false); 
                                        loadMembers(c.id);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, selectedCommunity?.id === c.id && styles.dropdownTextActive]}>
                                        {c.is_official ? (c.universities?.name || 'University Feed') : c.name?.replace(/ community/gi, '')}
                                    </Text>
                                    {selectedCommunity?.id === c.id && <Ionicons name="checkmark" size={16} color={colors.black} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}


                <View style={[styles.typeBar, params.edit === 'true' && { opacity: 0.5 }]}>
                    {TYPES.map(t => (
                        <TouchableOpacity
                            key={t.key}
                            style={[styles.typeBtn, creationType === t.key && styles.typeBtnActive]}
                            onPress={() => !params.edit && setCreationType(t.key)}
                            disabled={!!params.edit}
                        >
                            <Ionicons name={t.icon as any} size={16} color={creationType === t.key ? colors.white : colors.gray500} />
                            {creationType === t.key && <Text style={styles.typeLabel}>{t.label}</Text>}
                        </TouchableOpacity>
                    ))}
                </View>

                <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                    {creationType === 'post' && (
                        <View style={{ flex: 1 }}>
                            <TextInput style={styles.mainInput} placeholder="What's on your mind?" placeholderTextColor={colors.gray400} multiline autoFocus value={content} onChangeText={t => handleInputChange(t, 'content')} />
                            {taggingSearch !== null && filteredMembers.length > 0 && (
                                <View style={styles.taggingList}>
                                    {filteredMembers.map((item) => (
                                        <TouchableOpacity 
                                            key={item.profiles.id}
                                            style={styles.memberTag} 
                                            onPress={() => handleSelectTag(item.profiles.username || item.profiles.name?.replace(/\s/g, ''))}
                                        >
                                            {item.profiles.avatar_url ? (
                                                <Image source={{ uri: item.profiles.avatar_url }} style={styles.tagAvatar} />
                                            ) : (
                                                <View style={[styles.tagAvatar, { backgroundColor: colors.gray200, justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.gray600 }}>{item.profiles.name?.[0]?.toUpperCase() || '?'}</Text>
                                                </View>
                                            )}
                                            <View>
                                                <Text style={styles.tagName}>{item.profiles.name}</Text>
                                                {item.profiles.username && <Text style={styles.tagUsername}>@{item.profiles.username}</Text>}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            {attachments.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                                    {attachments.map((item, index) => (
                                        <View key={index} style={styles.mediaThumbnail}>
                                            <Image source={{ uri: item.uri }} style={styles.mediaImg} />
                                            <TouchableOpacity style={styles.removeBtn} onPress={() => removeAttachment(index)}><Ionicons name="close-circle" size={22} color={colors.black} /></TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                            <View style={styles.toolbar}>
                                <TouchableOpacity style={styles.toolbarItem} onPress={pickMedia}><Ionicons name="images-outline" size={22} color={colors.gray500} /><Text style={styles.toolbarText}>Library</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.toolbarItem} onPress={takeMedia}><Ionicons name="camera-outline" size={22} color={colors.gray500} /><Text style={styles.toolbarText}>Camera</Text></TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {creationType === 'study' && (
                        <View style={styles.formSection}>
                            <Text style={styles.sectionHint}>Starting a study mini-community will allow others to join and collaborate in a dedicated space.</Text>
                            <TextInput style={styles.formInput} placeholder="Mini Community Name (e.g. Bio 101 Study Room)" placeholderTextColor={colors.gray400} value={studyTitle} onChangeText={setStudyTitle} />
                            <TextInput style={styles.formInput} placeholder="Primary Topic" placeholderTextColor={colors.gray400} value={studyTopic} onChangeText={setStudyTopic} />
                            <TextInput style={styles.formInput} placeholder="Schedule Goal (e.g. Weekends only)" placeholderTextColor={colors.gray400} value={studySchedule} onChangeText={setStudySchedule} />
                            <TextInput style={[styles.formInput, { height: 80, borderBottomWidth: 0 }]} placeholder="What's this group for?" placeholderTextColor={colors.gray400} multiline value={content} onChangeText={t => handleInputChange(t, 'content')} />
                        </View>
                    )}

                    {creationType === 'event' && (
                        <View style={styles.formSection}>
                            <TextInput style={styles.formInput} placeholder="Event title" placeholderTextColor={colors.gray400} value={eventTitle} onChangeText={setEventTitle} />
                            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                <Text style={styles.datePickerText}>{formatSmartDate(eventDate)}</Text>
                                <View style={styles.changeTag}>
                                    <Text style={styles.changeLabel}>{showDatePicker ? 'Setting Time...' : 'Change'}</Text>
                                </View>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <View style={styles.pickerContainer}>
                                    <DateTimePicker value={eventDate} mode="datetime" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} />
                                    {Platform.OS === 'ios' && (
                                        <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
                                            <Text style={styles.doneText}>Done</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                            <TextInput style={styles.formInput} placeholder="Location" placeholderTextColor={colors.gray400} value={eventLocation} onChangeText={setEventLocation} />
                            <TextInput style={[styles.formInput, { height: 100 }]} placeholder="Description" placeholderTextColor={colors.gray400} multiline value={content} onChangeText={t => handleInputChange(t, 'content')} />
                            <TouchableOpacity style={styles.mediaPicker} onPress={pickMedia}><Ionicons name="image-outline" size={18} color={colors.gray400} /><Text style={styles.mediaPickerText}>{attachments.length > 0 ? 'Image selected' : 'Add event banner'}</Text></TouchableOpacity>
                        </View>
                    )}

                    {creationType === 'job' && (
                        <View style={styles.formSection}>
                            <TextInput style={styles.formInput} placeholder="Job title" placeholderTextColor={colors.gray400} value={jobTitle} onChangeText={setJobTitle} />
                            <View style={styles.curRow}><Text style={styles.cur}>$</Text><TextInput style={[styles.formInput, { flex: 1, borderBottomWidth: 0 }]} placeholder="Budget" placeholderTextColor={colors.gray400} value={jobBudget} onChangeText={setJobBudget} keyboardType="numeric" /></View>
                            <TextInput style={[styles.formInput, { height: 120 }]} placeholder="Details" placeholderTextColor={colors.gray400} multiline value={content} onChangeText={t => handleInputChange(t, 'content')} />
                        </View>
                    )}

                    {creationType === 'market' && (
                        <View style={styles.formSection}>
                            <TextInput style={styles.formInput} placeholder="What are you selling?" placeholderTextColor={colors.gray400} value={marketTitle} onChangeText={setMarketTitle} />
                            <View style={styles.curRow}><Text style={styles.cur}>$</Text><TextInput style={[styles.formInput, { flex: 1, borderBottomWidth: 0 }]} placeholder="Price" placeholderTextColor={colors.gray400} value={marketPrice} onChangeText={setMarketPrice} keyboardType="numeric" /></View>
                            <TextInput style={[styles.formInput, { height: 100 }]} placeholder="Item details (Condition, etc.)" placeholderTextColor={colors.gray400} multiline value={content} onChangeText={t => handleInputChange(t, 'content')} />
                            <TouchableOpacity style={styles.mediaPicker} onPress={pickMedia}><Ionicons name="image-outline" size={18} color={colors.gray400} /><Text style={styles.mediaPickerText}>{attachments.length > 0 ? 'Image selected' : 'Add item image'}</Text></TouchableOpacity>
                        </View>
                    )}

                    {creationType === 'poll' && (
                        <View style={styles.formSection}>
                            <TextInput style={styles.formInput} placeholder="Ask a question..." placeholderTextColor={colors.gray400} value={pollQuestion} onChangeText={t => handleInputChange(t, 'poll')} autoFocus />
                            {pollOptions.map((opt, i) => (
                                <View key={i} style={styles.pollOptionRow}>
                                    <View style={styles.pollDot} />
                                    <TextInput
                                        style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                                        placeholder={`Option ${i + 1}`}
                                        placeholderTextColor={colors.gray400}
                                        value={opt}
                                        onChangeText={text => {
                                            const updated = [...pollOptions];
                                            updated[i] = text;
                                            setPollOptions(updated);
                                        }}
                                    />
                                    {pollOptions.length > 2 && (
                                        <TouchableOpacity onPress={() => setPollOptions(prev => prev.filter((_, j) => j !== i))} hitSlop={8}>
                                            <Ionicons name="close-circle" size={20} color={colors.gray300} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            {pollOptions.length < 6 && (
                                <TouchableOpacity style={styles.addOptionBtn} onPress={() => setPollOptions(prev => [...prev, ''])}>
                                    <Ionicons name="add-circle-outline" size={18} color={colors.gray500} />
                                    <Text style={styles.addOptionText}>Add option</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.gray200 },
    cancelText: { fontFamily: fonts.regular, fontSize: 15, color: colors.gray500 },
    headerTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.black },
    postBtn: { backgroundColor: colors.black, paddingHorizontal: 18, paddingVertical: 8, borderRadius: radii.full },
    postBtnText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 13 },
    selectorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 12, gap: 8 },
    selectorLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray400 },
    selectorPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full, gap: 4 },
    selectorText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.black },
    dropdown: { marginHorizontal: spacing.lg, backgroundColor: colors.white, borderRadius: radii.md, borderWidth: 1, borderColor: colors.gray200, overflow: 'hidden', marginBottom: 8 },
    dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.gray100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownText: { fontFamily: fonts.regular, fontSize: 14, color: colors.black },
    dropdownTextActive: { fontFamily: fonts.semibold },
    typeBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: 10, gap: 8, borderBottomWidth: 0.5, borderBottomColor: colors.gray200 },
    typeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.full, gap: 5, backgroundColor: colors.gray50 },
    typeBtnActive: { backgroundColor: colors.black },
    typeLabel: { fontFamily: fonts.semibold, color: colors.white, fontSize: 12 },
    mainInput: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, fontFamily: fonts.regular, fontSize: 17, color: colors.black, textAlignVertical: 'top', minHeight: 120 },
    mediaScroll: { maxHeight: 160, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
    mediaThumbnail: { width: 120, height: 140, marginRight: 8, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.gray100 },
    mediaImg: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: colors.white, borderRadius: 11 },
    toolbar: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: 18, borderTopWidth: 0.5, borderTopColor: colors.gray100, gap: 24 },
    toolbarItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    toolbarText: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray500 },
    formSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    formInput: { borderBottomWidth: 0.5, borderBottomColor: colors.gray200, paddingVertical: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.black, marginBottom: 4 },
    datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: colors.gray200 },
    datePickerText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.black, flex: 1 },
    changeTag: { backgroundColor: colors.gray100, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    changeLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.gray600, textTransform: 'uppercase' },
    pickerContainer: { backgroundColor: colors.gray50, borderRadius: 12, marginTop: 8, padding: 10, borderWidth: 1, borderColor: colors.gray100 },
    doneBtn: { backgroundColor: colors.black, paddingVertical: 12, alignItems: 'center', borderRadius: 10, marginTop: 10 },
    doneText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14 },
    curRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: colors.gray200, marginBottom: 4 },
    cur: { fontFamily: fonts.bold, fontSize: 17, color: colors.black, marginRight: 4 },
    sectionHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500, marginBottom: 12, lineHeight: 18 },
    mediaPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: colors.gray50, borderRadius: radii.sm, marginTop: spacing.md, borderWidth: 1, borderColor: colors.gray200 },
    mediaPickerText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray500 },
    pollOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    pollDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gray300 },
    addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14 },
    addOptionText: { fontFamily: fonts.medium, fontSize: 14, color: colors.gray500 },

    taggingList: {
        marginHorizontal: spacing.lg,
        marginTop: -16, // Pull it up closer to the cursor/input
        maxHeight: 220,
        backgroundColor: colors.white,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.gray200,
        overflow: 'hidden',
        // Subtle depth
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    memberTag: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray50
    },
    tagAvatar: { width: 32, height: 32, borderRadius: 16 },
    tagName: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
    tagUsername: { fontFamily: fonts.regular, fontSize: 12, color: colors.gray400 },
});
