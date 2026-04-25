import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, FlatList, DeviceEventEmitter } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { spacing, fonts, radii } from '../src/constants/theme';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
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
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();

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
    const [creationType, setCreationType] = useState<'post' | 'event' | 'job' | 'study' | 'market' | 'poll' | 'story'>(((normalizedType as any) || 'post'));
    const [location, setLocation] = useState<any>(null);

    useEffect(() => {
        if (creationType === 'story') {
            (async () => {
                const { status: lStat } = await import('expo-location').then(l => l.requestForegroundPermissionsAsync());
                if (lStat === 'granted') {
                    const loc = await import('expo-location').then(l => l.getCurrentPositionAsync({}));
                    setLocation(loc.coords);
                }
            })();
        }
    }, [creationType]);

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
        if (status !== 'granted') return Alert.alert(t('error'), 'Camera permission is required');
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
        if (!result.canceled) {
            const asset = result.assets[0];
            const newAttachment = { uri: asset.uri, type: asset.type as 'image' | 'video' };
            setAttachments([...attachments, newAttachment].slice(0, 10));
        }
    };

    const handlePost = async () => {
        if (!selectedCommunity && !['study'].includes(creationType)) return Alert.alert(t('error'), 'Please select a community.');
        
        const uploadId = Math.random().toString(36).substring(7);
        const type = creationType === 'market' ? 'market' : 'post';
        
        // Immediate UI feedback
        DeviceEventEmitter.emit('action_status', { id: uploadId, type, status: 'uploading' });
        router.back();

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
                    const updateRes = await updatePost(params.postId as string, { content: content.trim() });
                    const localUpdatedAt = new Date().toISOString();
                    DeviceEventEmitter.emit('postUpdated', {
                        postId: params.postId,
                        content: content.trim(),
                        updated_at: localUpdatedAt,
                        is_edited: true,
                        updatedPost: updateRes?.data || updateRes || null,
                    });
                } else {
                    await createPost(selectedCommunity.id, { content: content.trim(), media_urls, media_types });
                }
            } else if (creationType === 'study') {
                await createPost(selectedCommunity?.id || 'public', { content: content.trim(), media_urls, media_types });
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
            
            if (!(creationType === 'post' && params.edit === 'true' && params.postId)) {
                DeviceEventEmitter.emit('postCreated');
            }

            DeviceEventEmitter.emit('action_status', { id: uploadId, type, status: 'success' });
        } catch (e: any) {
            console.error('Upload failed:', e);
            DeviceEventEmitter.emit('action_status', { id: uploadId, type, status: 'error', message: e.message || 'Failed to upload' });
        }
    };

    const TYPES: { key: typeof creationType, icon: string, label: string }[] = [
        { key: 'post', icon: 'document-text-outline', label: t('post_tab') },
        { key: 'poll', icon: 'stats-chart-outline', label: t('poll_tab') },
    ];

    const formatSmartDate = (date: Date) => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const isToday = date.toDateString() === now.toDateString();
        const isTomorrow = date.toDateString() === tomorrow.toDateString();

        const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        if (isToday) return `${t('today')}, ${time}`;
        if (isTomorrow) return `${t('tomorrow')}, ${time}`;

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
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
                        <Text style={[styles.cancelText, { color: colors.gray500 }]}>{t('cancel_label')}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.black }]}>
                        {params.edit === 'true' ? t('header_edit') : t('header_new')} {
                            creationType === 'study' ? t('mini_community') : 
                            creationType === 'market' ? t('listing_label') : 
                            creationType === 'event' ? t('event_tab') :
                            creationType === 'job' ? t('job_tab') :
                            creationType === 'poll' ? t('poll_tab') :
                            t('post_tab')
                        }
                    </Text>
                    <TouchableOpacity
                        style={[
                            styles.postBtn, 
                            { 
                                backgroundColor: colors.text, 
                                opacity: (content.trim().length > 0 || (creationType === 'poll' && pollQuestion.trim().length > 0)) && !posting ? 1 : 0.5 
                            }
                        ]}
                        onPress={handlePost}
                        disabled={posting || !(content.trim().length > 0 || (creationType === 'poll' && pollQuestion.trim().length > 0))}
                        activeOpacity={0.7}
                    >
                        {posting ? (
                            <ActivityIndicator size="small" color={colors.background} />
                        ) : (
                            <Text style={[styles.postBtnText, { color: colors.background }]}>
                                {params.edit === 'true' ? t('save') : (creationType === 'post' ? t('share') : t('launch'))}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Community Selector */}
                {!['study', 'story'].includes(creationType) && (
                    <View style={[styles.selectorRow, !!params.communityId && { opacity: 0.7 }]}>
                        <Text style={[styles.selectorLabel, { color: colors.gray400 }]}>{t('in_label')}</Text>
                        {loading ? (
                            <Skeleton width={120} height={32} borderRadius={16} />
                        ) : (
                            <TouchableOpacity
                                style={[styles.selectorPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => !params.communityId && setShowSelector(!showSelector)}
                                disabled={!!params.communityId}
                            >
                                <Text style={[styles.selectorText, { color: colors.black }]}>{selectedCommunity?.is_official ? (selectedCommunity.universities?.name || 'University Feed') : (selectedCommunity?.name?.replace(/ community/gi, '') || 'Select')}</Text>
                                {!params.communityId && <Ionicons name={showSelector ? 'chevron-up' : 'chevron-down'} size={14} color={colors.gray500} />}
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {showSelector && (
                    <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <ScrollView style={{ maxHeight: 180 }}>
                            {communities.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                    onPress={() => { 
                                        setSelectedCommunity(c); 
                                        setShowSelector(false); 
                                        loadMembers(c.id);
                                    }}
                                >
                                    <Text style={[styles.dropdownText, { color: colors.black }, selectedCommunity?.id === c.id && styles.dropdownTextActive]}>
                                        {c.is_official ? (c.universities?.name || 'University Feed') : c.name?.replace(/ community/gi, '')}
                                    </Text>
                                    {selectedCommunity?.id === c.id && <Ionicons name="checkmark" size={16} color={colors.black} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}


                <View style={[styles.typeBar, { borderBottomColor: colors.border }, params.edit === 'true' && { opacity: 0.5 }]}>
                    {TYPES.map(t => (
                        <TouchableOpacity
                            key={t.key}
                            style={[styles.typeBtn, { backgroundColor: colors.gray100 }, creationType === t.key && { backgroundColor: colors.black }]}
                            onPress={() => !params.edit && setCreationType(t.key)}
                            disabled={!!params.edit}
                        >
                            <Ionicons name={t.icon as any} size={16} color={creationType === t.key ? colors.white : colors.gray600} />
                            {creationType === t.key && <Text style={[styles.typeLabel, { color: colors.white }]}>{t.label}</Text>}
                        </TouchableOpacity>
                    ))}
                </View>

                <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                    {creationType === 'post' && (
                        <View style={{ flex: 1 }}>
                            <TextInput style={[styles.mainInput, { color: colors.black }]} placeholder={t('post_placeholder')} placeholderTextColor={colors.gray400} multiline autoFocus value={content} onChangeText={t => handleInputChange(t, 'content')} />
                            {taggingSearch !== null && filteredMembers.length > 0 && (
                                <View style={[styles.taggingList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    {filteredMembers.map((item) => (
                                        <TouchableOpacity 
                                            key={item.profiles.id}
                                            style={[styles.memberTag, { borderBottomColor: colors.border }]} 
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
                                                <Text style={[styles.tagName, { color: colors.black }]}>{item.profiles.name}</Text>
                                                {item.profiles.username && <Text style={[styles.tagUsername, { color: colors.gray400 }]}>@{item.profiles.username}</Text>}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            {attachments.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                                    {attachments.map((item, index) => (
                                        <View key={index} style={[styles.mediaThumbnail, { backgroundColor: colors.surface }]}>
                                            <Image source={{ uri: item.uri }} style={styles.mediaImg} />
                                            <TouchableOpacity style={[styles.removeBtn, { backgroundColor: colors.surface }]} onPress={() => removeAttachment(index)}><Ionicons name="close-circle" size={22} color={colors.black} /></TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                            <View style={[styles.toolbar, { borderTopColor: colors.border }]}>
                                <TouchableOpacity style={styles.toolbarItem} onPress={pickMedia}><Ionicons name="images-outline" size={22} color={colors.gray500} /><Text style={[styles.toolbarText, { color: colors.gray500 }]}>{t('library_label')}</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.toolbarItem} onPress={takeMedia}><Ionicons name="camera-outline" size={22} color={colors.gray500} /><Text style={[styles.toolbarText, { color: colors.gray500 }]}>{t('camera_label')}</Text></TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {creationType === 'study' && (
                        <View style={styles.formSection}>
                                <Text style={[styles.sectionHint, { color: colors.gray500 }]}>{t('mini_community_hint')}</Text>
                            <TextInput style={[styles.formInput, { color: colors.black, borderBottomColor: colors.border }]} placeholder={t('mini_community_name_placeholder')} placeholderTextColor={colors.gray400} value={studyTitle} onChangeText={setStudyTitle} />
                            <TextInput style={[styles.formInput, { color: colors.black, borderBottomColor: colors.border }]} placeholder={t('subject_label')} placeholderTextColor={colors.gray400} value={studyTopic} onChangeText={setStudyTopic} />
                            <TextInput style={[styles.formInput, { color: colors.black, borderBottomColor: colors.border }]} placeholder={t('schedule_goal_placeholder')} placeholderTextColor={colors.gray400} value={studySchedule} onChangeText={setStudySchedule} />
                            <TextInput style={[styles.formInput, { height: 80, borderBottomWidth: 0, color: colors.black }]} placeholder={t('group_purpose_placeholder')} placeholderTextColor={colors.gray400} multiline value={content} onChangeText={t => handleInputChange(t, 'content')} />
                        </View>
                    )}

                    {creationType === 'event' && (
                        <View style={styles.formSection}>
                            <TextInput style={[styles.formInput, { color: colors.black, borderBottomColor: colors.border }]} placeholder={t('event_placeholder')} placeholderTextColor={colors.gray400} value={eventTitle} onChangeText={setEventTitle} />
                            <TouchableOpacity style={[styles.datePickerBtn, { borderBottomColor: colors.border }]} onPress={() => setShowDatePicker(true)}>
                                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                <Text style={[styles.datePickerText, { color: colors.black }]}>{formatSmartDate(eventDate)}</Text>
                                <View style={[styles.changeTag, { backgroundColor: colors.surface }]}>
                                    <Text style={[styles.changeLabel, { color: colors.gray600 }]}>{showDatePicker ? t('setting_time') : t('change')}</Text>
                                </View>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <DateTimePicker 
                                        value={eventDate} 
                                        mode="datetime" 
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
                                        onChange={onDateChange} 
                                        textColor={isDark ? '#FFFFFF' : '#000000'}
                                    />
                                    {Platform.OS === 'ios' && (
                                        <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.black }]} onPress={() => setShowDatePicker(false)}>
                                            <Text style={[styles.doneText, { color: colors.white }]}>{t('done_label')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                            <TextInput style={[styles.formInput, { color: colors.black, borderBottomColor: colors.border }]} placeholder={t('location_label')} placeholderTextColor={colors.gray400} value={eventLocation} onChangeText={setEventLocation} />
                            <TextInput style={[styles.formInput, { height: 100, color: colors.black, borderBottomColor: colors.border }]} placeholder={t('description_label')} placeholderTextColor={colors.gray400} multiline value={content} onChangeText={t => handleInputChange(t, 'content')} />
                            <TouchableOpacity style={[styles.mediaPicker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={pickMedia}><Ionicons name="image-outline" size={18} color={colors.gray400} /><Text style={[styles.mediaPickerText, { color: colors.gray500 }]}>{attachments.length > 0 ? t('image_selected') : t('add_event_banner')}</Text></TouchableOpacity>
                        </View>
                    )}

                    {creationType === 'job' && (
                        <View style={styles.formSection}>
                            <TextInput style={[styles.formInput, { color: colors.black, borderBottomColor: colors.border }]} placeholder={t('job_title')} placeholderTextColor={colors.gray400} value={jobTitle} onChangeText={setJobTitle} />
                            <View style={[styles.curRow, { borderBottomColor: colors.border }]}><Text style={[styles.cur, { color: colors.black }]}>$</Text><TextInput style={[styles.formInput, { flex: 1, borderBottomWidth: 0, color: colors.black }]} placeholder={t('budget')} placeholderTextColor={colors.gray400} value={jobBudget} onChangeText={setJobBudget} keyboardType="numeric" /></View>
                            <TextInput style={[styles.formInput, { height: 120, color: colors.black, borderBottomColor: colors.border }]} placeholder={t('details')} placeholderTextColor={colors.gray400} multiline value={content} onChangeText={t => handleInputChange(t, 'content')} />
                        </View>
                    )}

                    {creationType === 'market' && (
                        <View style={styles.formSection}>
                            <TextInput style={[styles.formInput, { color: colors.black, borderBottomColor: colors.border }]} placeholder={t('what_selling_placeholder')} placeholderTextColor={colors.gray400} value={marketTitle} onChangeText={setMarketTitle} />
                            <View style={[styles.curRow, { borderBottomColor: colors.border }]}><Text style={[styles.cur, { color: colors.black }]}>$</Text><TextInput style={[styles.formInput, { flex: 1, borderBottomWidth: 0, color: colors.black }]} placeholder={t('price_label')} placeholderTextColor={colors.gray400} value={marketPrice} onChangeText={setMarketPrice} keyboardType="numeric" /></View>
                            <TextInput style={[styles.formInput, { height: 100, color: colors.black, borderBottomColor: colors.border }]} placeholder={t('tell_more_placeholder')} placeholderTextColor={colors.gray400} multiline value={content} onChangeText={t => handleInputChange(t, 'content')} />
                            <TouchableOpacity style={[styles.mediaPicker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={pickMedia}><Ionicons name="image-outline" size={18} color={colors.gray400} /><Text style={[styles.mediaPickerText, { color: colors.gray500 }]}>{attachments.length > 0 ? t('image_selected') : t('add_problem_photo')}</Text></TouchableOpacity>
                        </View>
                    )}

                    {creationType === 'poll' && (
                        <View style={styles.formSection}>
                            <TextInput style={[styles.formInput, { color: colors.black, borderBottomColor: colors.border }]} placeholder={t('poll_question_placeholder')} placeholderTextColor={colors.gray400} value={pollQuestion} onChangeText={t => handleInputChange(t, 'poll')} autoFocus />
                            {pollOptions.map((opt, i) => (
                                <View key={i} style={styles.pollOptionRow}>
                                    <View style={[styles.pollDot, { backgroundColor: colors.gray300 }]} />
                                    <TextInput
                                        style={[styles.formInput, { flex: 1, marginBottom: 0, color: colors.black, borderBottomColor: colors.border }]}
                                        placeholder={`${t('option_label')} ${i + 1}`}
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
                                    <Text style={[styles.addOptionText, { color: colors.gray500 }]}>{t('add_option_label')}</Text>
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
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: 0.5 },
    cancelText: { fontFamily: fonts.regular, fontSize: 15 },
    headerTitle: { fontFamily: fonts.semibold, fontSize: 16 },
    postBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: radii.full },
    postBtnText: { fontFamily: fonts.semibold, fontSize: 13 },
    selectorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 12, gap: 8 },
    selectorLabel: { fontFamily: fonts.regular, fontSize: 13 },
    selectorPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full, gap: 4 },
    selectorText: { fontFamily: fonts.semibold, fontSize: 13 },
    dropdown: { marginHorizontal: spacing.lg, borderRadius: radii.md, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
    dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownText: { fontFamily: fonts.regular, fontSize: 14 },
    dropdownTextActive: { fontFamily: fonts.semibold },
    typeBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: 10, gap: 8, borderBottomWidth: 0.5 },
    typeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.full, gap: 5 },
    typeLabel: { fontFamily: fonts.semibold, fontSize: 12 },
    mainInput: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, fontFamily: fonts.regular, fontSize: 17, textAlignVertical: 'top', minHeight: 120 },
    mediaScroll: { maxHeight: 160, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
    mediaThumbnail: { width: 120, height: 140, marginRight: 8, borderRadius: radii.md, overflow: 'hidden' },
    mediaImg: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 6, right: 6, borderRadius: 11 },
    toolbar: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: 18, borderTopWidth: 0.5, gap: 24 },
    toolbarItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    toolbarText: { fontFamily: fonts.regular, fontSize: 14 },
    formSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    formInput: { borderBottomWidth: 0.5, paddingVertical: 14, fontFamily: fonts.regular, fontSize: 15, marginBottom: 4 },
    datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, borderBottomWidth: 0.5 },
    datePickerText: { fontFamily: fonts.semibold, fontSize: 16, flex: 1 },
    changeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    changeLabel: { fontFamily: fonts.bold, fontSize: 11, textTransform: 'uppercase' },
    pickerContainer: { borderRadius: 12, marginTop: 8, padding: 10, borderWidth: 1 },
    doneBtn: { paddingVertical: 12, alignItems: 'center', borderRadius: 10, marginTop: 10 },
    doneText: { fontFamily: fonts.bold, fontSize: 14 },
    curRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, marginBottom: 4 },
    cur: { fontFamily: fonts.bold, fontSize: 17, marginRight: 4 },
    sectionHint: { fontFamily: fonts.regular, fontSize: 13, marginBottom: 12, lineHeight: 18 },
    mediaPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: radii.sm, marginTop: spacing.md, borderWidth: 1 },
    mediaPickerText: { fontFamily: fonts.regular, fontSize: 13 },
    pollOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    pollDot: { width: 8, height: 8, borderRadius: 4 },
    addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14 },
    addOptionText: { fontFamily: fonts.medium, fontSize: 14 },
    taggingList: {
        marginHorizontal: spacing.lg,
        marginTop: -16,
        maxHeight: 220,
        borderRadius: radii.md,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
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
    },
    tagAvatar: { width: 32, height: 32, borderRadius: 16 },
    tagName: { fontFamily: fonts.bold, fontSize: 14 },
    tagUsername: { fontFamily: fonts.regular, fontSize: 12 },
    storyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
    liveText: { fontFamily: fonts.bold, color: '#DC2626', fontSize: 10, textTransform: 'uppercase' },
    locationStatus: { fontFamily: fonts.medium, fontSize: 12 },
});
