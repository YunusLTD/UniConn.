import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    ScrollView, Image, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { spacing, fonts, radii } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import { getMyCommunities } from '../src/api/communities';
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
import { DeviceEventEmitter } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import * as VideoThumbnails from 'expo-video-thumbnails';

// ─── Types ────────────────────────────────────────────────────────────────────
type CreationType = 'post' | 'event' | 'job' | 'study' | 'market' | 'poll' | 'story';

// ─── Subcomponents ────────────────────────────────────────────────────────────

function AvatarBlock({ size = 40, letter = '?', color, uri }: { size?: number; letter?: string; color: string; uri?: string }) {
    if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    return (
        <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.38, color: '#fff' }}>{letter}</Text>
        </View>
    );
}

function ThreadLine({ color }: { color: string }) {
    return <View style={{ width: 2, flex: 1, backgroundColor: color, borderRadius: 1, marginVertical: 4, alignSelf: 'center' }} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreatePostModal() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const { user } = useAuth();

    const [communities, setCommunities] = useState<any[]>([]);
    const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [showSelector, setShowSelector] = useState(false);
    const [taggingSearch, setTaggingSearch] = useState<string | null>(null);
    const [taggingRefInput, setTaggingRefInput] = useState<'content' | 'description' | 'poll' | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [attachments, setAttachments] = useState<{ uri: string; type: 'image' | 'video'; thumbnail?: string | null }[]>([]);

    const normalizedType = params.type === 'events' ? 'event' : params.type === 'jobs' ? 'job' : params.type;
    const [creationType, setCreationType] = useState<CreationType>(((normalizedType as any) || 'post'));

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

    const selectorAnim = useRef(new Animated.Value(0)).current;

    const toggleSelector = (open: boolean) => {
        setShowSelector(open);
        Animated.spring(selectorAnim, { toValue: open ? 1 : 0, useNativeDriver: true, tension: 60, friction: 12 }).start();
    };

    useEffect(() => {
        const load = async () => {
            try {
                const commRes = await getMyCommunities();
                if (commRes?.data) setCommunities(commRes.data);

                if (params.edit === 'true' && params.postId) {
                    const postRes = await getPost(params.postId as string);
                    if (postRes?.data) {
                        const post = postRes.data;
                        setContent(post.content || '');
                        if (commRes?.data) {
                            const comm = commRes.data.find((c: any) => c.id === post.community_id);
                            if (comm) { setSelectedCommunity(comm); loadMembers(comm.id); }
                        }
                    }
                } else if (commRes?.data) {
                    let target = null;
                    if (params.communityId) target = commRes.data.find((c: any) => c.id === params.communityId);
                    else if (commRes.data.length > 0) target = commRes.data[0];
                    if (target) { setSelectedCommunity(target); loadMembers(target.id); }
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, [params.communityId, params.edit, params.postId]);

    const loadMembers = async (id: string) => {
        try { const r = await getCommunityMembers(id); if (r?.data) setMembers(r.data); } catch (_) { }
    };

    const removeAttachment = (i: number) => setAttachments(p => p.filter((_, j) => j !== i));

    const pickMedia = async () => {
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: 10, quality: 0.8, videoMaxDuration: 120 });
        if (!r.canceled) {
            const assetsWithThumbs = await Promise.all(r.assets.map(async (a) => {
                let thumbnail = null;
                if (a.type === 'video') {
                    try {
                        const { uri } = await VideoThumbnails.getThumbnailAsync(a.uri, { time: 1000 });
                        thumbnail = uri;
                    } catch (e) { console.error('Thumbnail error:', e); }
                }
                return { uri: a.uri, type: a.type as 'image' | 'video', thumbnail };
            }));
            setAttachments(p => [...p, ...assetsWithThumbs].slice(0, 10));
        }
    };

    const takeMedia = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert(t('error'), 'Camera permission required');
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.8, videoMaxDuration: 120 });
        if (!r.canceled) {
            let thumbnail = null;
            const asset = r.assets[0];
            if (asset.type === 'video') {
                try {
                    const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 1000 });
                    thumbnail = uri;
                } catch (e) { }
            }
            setAttachments(p => [...p, { uri: asset.uri, type: asset.type as 'image' | 'video', thumbnail }].slice(0, 10));
        }
    };

    const handlePost = async () => {
        if (!selectedCommunity && !['study'].includes(creationType)) return Alert.alert(t('error'), 'Please select a community.');
        const uploadId = Math.random().toString(36).substring(7);
        const type = creationType === 'market' ? 'market' : 'post';
        DeviceEventEmitter.emit('action_status', { id: uploadId, type, status: 'uploading' });
        router.back();
        try {
            let media_urls: string[] = [], media_types: string[] = [];
            if (attachments.length > 0) {
                const up = await uploadMultipleMedia(attachments);
                media_urls = up.map((f: any) => f.url);
                media_types = up.map((f: any) => f.type);
            }
            if (creationType === 'post') {
                if (!content.trim() && attachments.length === 0) throw new Error('Content or media required');
                if (params.edit === 'true' && params.postId) {
                    const ur = await updatePost(params.postId as string, { content: content.trim() });
                    DeviceEventEmitter.emit('postUpdated', { postId: params.postId, content: content.trim(), updated_at: new Date().toISOString(), is_edited: true, updatedPost: ur?.data || null });
                } else {
                    await createPost(selectedCommunity.id, { content: content.trim(), media_urls, media_types });
                }
            } else if (creationType === 'event') {
                if (!eventTitle.trim()) throw new Error('Title required');
                await createEvent(selectedCommunity.id, { title: eventTitle, description: content, start_time: eventDate.toISOString(), location: eventLocation, image_url: media_urls[0] });
            } else if (creationType === 'job') {
                if (!jobTitle.trim()) throw new Error('Title required');
                await createJob(selectedCommunity.id, { title: jobTitle, description: content, budget: jobBudget ? parseFloat(jobBudget) : null });
            } else if (creationType === 'market') {
                if (!marketTitle.trim()) throw new Error('Item name required');
                await createMarketplaceListing(selectedCommunity.id, { title: marketTitle, description: content, price: marketPrice ? parseFloat(marketPrice) : 0, image_url: media_urls[0] });
            } else if (creationType === 'poll') {
                if (!pollQuestion.trim()) throw new Error('Poll question required');
                const valid = pollOptions.filter(o => o.trim());
                if (valid.length < 2) throw new Error('At least 2 options required');
                await createPoll(selectedCommunity.id, { question: pollQuestion.trim(), options: valid.map(o => o.trim()) });
            }
            if (!(creationType === 'post' && params.edit === 'true' && params.postId)) DeviceEventEmitter.emit('postCreated');
            DeviceEventEmitter.emit('action_status', { id: uploadId, type, status: 'success' });
        } catch (e: any) {
            DeviceEventEmitter.emit('action_status', { id: uploadId, type, status: 'error', message: e.message || 'Upload failed' });
        }
    };

    const handleInputChange = (text: string, field: 'content' | 'poll') => {
        if (field === 'content') setContent(text);
        else setPollQuestion(text);
        const lastWord = text.split(/\s/).pop();
        if (lastWord?.startsWith('@')) { setTaggingSearch(lastWord.substring(1)); setTaggingRefInput(field); }
        else { setTaggingSearch(null); setTaggingRefInput(null); }
    };

    const handleSelectTag = (username: string) => {
        const cur = taggingRefInput === 'poll' ? pollQuestion : content;
        const parts = cur.split(' '); parts.pop();
        const val = parts.join(' ') + (parts.length ? ' ' : '') + '@' + username + ' ';
        if (taggingRefInput === 'poll') setPollQuestion(val); else setContent(val);
        setTaggingSearch(null); setTaggingRefInput(null);
    };

    const filteredMembers = taggingSearch !== null
        ? members.filter(m => {
            const s = taggingSearch.toLowerCase();
            return m.profiles?.username?.toLowerCase().includes(s) || m.profiles?.name?.toLowerCase().includes(s);
        }).slice(0, 6)
        : [];

    const formatDate = (d: Date) => {
        const now = new Date(), tom = new Date(now); tom.setDate(tom.getDate() + 1);
        const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
        if (d.toDateString() === tom.toDateString()) return `Tomorrow, ${time}`;
        return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
    };

    const TYPES: { key: CreationType; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
        { key: 'post', icon: 'create-outline', label: 'Post' },
        { key: 'poll', icon: 'bar-chart-outline', label: 'Poll' },
    ];

    const isEditing = params.edit === 'true';
    const canPost = content.trim().length > 0 || (creationType === 'poll' && pollQuestion.trim().length > 0) || attachments.length > 0;
    const communityName = selectedCommunity?.is_official
        ? (selectedCommunity.universities?.name || 'University Feed')
        : (selectedCommunity?.name?.replace(/ community/gi, '') || 'Select');

    // Colors
    const bg = colors.background;
    const textPrimary = colors.black;
    const textMuted = colors.gray400;
    const border = colors.border;
    const surface = colors.surface;
    const accent = colors.text; // typically black/near-black
    const threadLineColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: bg }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

                {/* ── Header ── */}
                <View style={[S.header, { borderBottomColor: border }]}>
                    <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={S.headerSide}>
                        <Text style={[S.headerCancel, { color: textMuted }]}>Cancel</Text>
                    </TouchableOpacity>

                    {/* Type Pills (centered) */}
                    {!isEditing && (
                        <View style={S.typePills}>
                            {TYPES.map(tp => {
                                const active = creationType === tp.key;
                                return (
                                    <TouchableOpacity
                                        key={tp.key}
                                        onPress={() => setCreationType(tp.key)}
                                        style={[S.pill, { backgroundColor: active ? accent : 'transparent', borderColor: active ? accent : border }]}
                                    >
                                        <Ionicons name={tp.icon} size={13} color={active ? bg : textMuted} />
                                        <Text style={[S.pillLabel, { color: active ? bg : textMuted }]}>{tp.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                    {isEditing && <Text style={[S.headerTitle, { color: textPrimary }]}>Edit Post</Text>}

                    <View style={S.headerSide}>
                        <TouchableOpacity
                            style={[S.postBtn, { backgroundColor: canPost && !posting ? accent : textMuted }]}
                            onPress={handlePost}
                            disabled={!canPost || posting}
                            activeOpacity={0.8}
                        >
                            {posting
                                ? <ActivityIndicator size="small" color={bg} />
                                : <Text style={[S.postBtnText, { color: bg }]}>
                                    {isEditing ? 'Save' : (creationType === 'post' || creationType === 'poll') ? 'Post' : 'Launch'}
                                </Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Community chip ── */}
                {!['study', 'story'].includes(creationType) && (
                    <View style={[S.communityRow, { borderBottomColor: border }]}>
                        <Ionicons name="people-outline" size={14} color={textMuted} />
                        {loading
                            ? <Skeleton width={100} height={22} borderRadius={11} />
                            : (
                                <TouchableOpacity
                                    style={[S.communityChip, { borderColor: border }]}
                                    onPress={() => !params.communityId && toggleSelector(!showSelector)}
                                    disabled={!!params.communityId}
                                >
                                    <Text style={[S.communityChipText, { color: textPrimary }]}>{communityName}</Text>
                                    {!params.communityId && (
                                        <Ionicons name={showSelector ? 'chevron-up' : 'chevron-down'} size={12} color={textMuted} />
                                    )}
                                </TouchableOpacity>
                            )
                        }
                    </View>
                )}

                {/* ── Community Dropdown ── */}
                {showSelector && (
                    <Animated.View style={[S.dropdown, { backgroundColor: surface, borderColor: border, opacity: selectorAnim, transform: [{ translateY: selectorAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
                        <ScrollView style={{ maxHeight: 180 }} bounces={false}>
                            {communities.map(c => {
                                const name = c.is_official ? (c.universities?.name || 'University Feed') : c.name?.replace(/ community/gi, '');
                                const isActive = selectedCommunity?.id === c.id;
                                return (
                                    <TouchableOpacity
                                        key={c.id}
                                        style={[S.dropdownItem, { borderBottomColor: border, backgroundColor: isActive ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') : 'transparent' }]}
                                        onPress={() => { setSelectedCommunity(c); toggleSelector(false); loadMembers(c.id); }}
                                    >
                                        <Text style={[S.dropdownText, { color: textPrimary, fontFamily: isActive ? fonts.semibold : fonts.regular }]}>{name}</Text>
                                        {isActive && <Ionicons name="checkmark" size={15} color={accent} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* ── Body ── */}
                <ScrollView 
                    style={{ flex: 1 }} 
                    keyboardShouldPersistTaps="handled" 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >

                    {/* POST */}
                    {creationType === 'post' && (
                        <View style={S.composerRoot}>
                            {/* Left column: avatar + thread line */}
                            <View style={S.composerLeft}>
                                <AvatarBlock 
                                    uri={user?.profile?.avatar_url} 
                                    letter={user?.profile?.name?.[0] || user?.name?.[0] || '?'} 
                                    color={accent} 
                                />
                                {(content.length > 0 || attachments.length > 0) && <ThreadLine color={threadLineColor} />}
                            </View>

                            {/* Right column: input + media */}
                            <View style={S.composerRight}>
                                <TextInput
                                    style={[S.mainInput, { color: textPrimary }]}
                                    placeholder="What's on your mind?"
                                    placeholderTextColor={textMuted}
                                    multiline
                                    autoFocus
                                    value={content}
                                    onChangeText={t => handleInputChange(t, 'content')}
                                />

                                {/* Tagging suggestions */}
                                {taggingSearch !== null && filteredMembers.length > 0 && (
                                    <View style={[S.taggingBox, { backgroundColor: surface, borderColor: border }]}>
                                        {filteredMembers.map(item => (
                                            <TouchableOpacity
                                                key={item.profiles.id}
                                                style={[S.tagRow, { borderBottomColor: border }]}
                                                onPress={() => handleSelectTag(item.profiles.username || item.profiles.name?.replace(/\s/g, ''))}
                                            >
                                                {item.profiles.avatar_url
                                                    ? <Image source={{ uri: item.profiles.avatar_url }} style={S.tagAvatar} />
                                                    : <AvatarBlock size={30} letter={item.profiles.name?.[0] || '?'} color={accent} />
                                                }
                                                <View>
                                                    <Text style={[S.tagName, { color: textPrimary }]}>{item.profiles.name}</Text>
                                                    {item.profiles.username && <Text style={[S.tagHandle, { color: textMuted }]}>@{item.profiles.username}</Text>}
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {attachments.length > 0 && (
                                    <View style={S.mediaGrid}>
                                        {attachments.map((item, i) => (
                                            <View key={i} style={[S.mediaCell, { backgroundColor: surface }]}>
                                                {item.type === 'video'
                                                    ? (item.thumbnail 
                                                        ? <Image source={{ uri: item.thumbnail }} style={S.mediaImg} />
                                                        : <View style={[S.mediaCell, { justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}>
                                                            <Ionicons name="videocam" size={28} color={textMuted} />
                                                          </View>
                                                      )
                                                    : <Image source={{ uri: item.uri }} style={S.mediaImg} />
                                                }
                                                {item.type === 'video' && (
                                                    <View style={S.videoIconOverlay}>
                                                        <Ionicons name="play-circle" size={24} color="#fff" />
                                                    </View>
                                                )}
                                                <TouchableOpacity style={S.removeBtn} onPress={() => removeAttachment(i)}>
                                                    <Ionicons name="close-circle" size={20} color={isDark ? '#fff' : '#000'} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* POLL */}
                    {creationType === 'poll' && (
                        <View style={S.composerRoot}>
                            <View style={S.composerLeft}>
                                <AvatarBlock 
                                    uri={user?.profile?.avatar_url} 
                                    letter={user?.profile?.name?.[0] || user?.name?.[0] || '?'} 
                                    color={accent} 
                                />
                                {pollQuestion.length > 0 && <ThreadLine color={threadLineColor} />}
                            </View>
                            <View style={[S.composerRight, { paddingBottom: spacing.xl }]}>
                                <TextInput
                                    style={[S.mainInput, { color: textPrimary }]}
                                    placeholder="Ask a question…"
                                    placeholderTextColor={textMuted}
                                    multiline
                                    autoFocus
                                    value={pollQuestion}
                                    onChangeText={t => handleInputChange(t, 'poll')}
                                />
                                {/* Poll options */}
                                <View style={[S.pollCard, { borderColor: border, backgroundColor: surface }]}>
                                    {pollOptions.map((opt, i) => (
                                        <View key={i} style={[S.pollOptionRow, { borderBottomColor: i < pollOptions.length - 1 ? border : 'transparent' }]}>
                                            <View style={[S.pollIndex, { borderColor: border }]}>
                                                <Text style={[S.pollIndexText, { color: textMuted }]}>{String.fromCharCode(65 + i)}</Text>
                                            </View>
                                            <TextInput
                                                style={[S.pollInput, { color: textPrimary }]}
                                                placeholder={`Option ${i + 1}`}
                                                placeholderTextColor={textMuted}
                                                value={opt}
                                                onChangeText={v => { const u = [...pollOptions]; u[i] = v; setPollOptions(u); }}
                                            />
                                            {pollOptions.length > 2 && (
                                                <TouchableOpacity onPress={() => setPollOptions(p => p.filter((_, j) => j !== i))} hitSlop={8}>
                                                    <Ionicons name="close" size={16} color={textMuted} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                    {pollOptions.length < 6 && (
                                        <TouchableOpacity style={S.addOption} onPress={() => setPollOptions(p => [...p, ''])}>
                                            <Ionicons name="add" size={16} color={textMuted} />
                                            <Text style={[S.addOptionText, { color: textMuted }]}>Add option</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* EVENT */}
                    {creationType === 'event' && (
                        <View style={[S.formCard, { borderColor: border }]}>
                            <View style={[S.formField, { borderBottomColor: border }]}>
                                <Text style={[S.fieldLabel, { color: textMuted }]}>Event name</Text>
                                <TextInput style={[S.fieldInput, { color: textPrimary }]} placeholder="Give your event a title" placeholderTextColor={textMuted} value={eventTitle} onChangeText={setEventTitle} autoFocus />
                            </View>
                            <TouchableOpacity style={[S.formField, { borderBottomColor: border }]} onPress={() => setShowDatePicker(!showDatePicker)}>
                                <Text style={[S.fieldLabel, { color: textMuted }]}>Date & time</Text>
                                <View style={S.fieldRow}>
                                    <Text style={[S.fieldValue, { color: textPrimary }]}>{formatDate(eventDate)}</Text>
                                    <Ionicons name="calendar-outline" size={16} color={textMuted} />
                                </View>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <View style={[S.pickerWrap, { borderBottomColor: border }]}>
                                    <DateTimePicker value={eventDate} mode="datetime" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, d) => { if (Platform.OS === 'android') setShowDatePicker(false); if (d) setEventDate(d); }} textColor={isDark ? '#fff' : '#000'} />
                                    {Platform.OS === 'ios' && (
                                        <TouchableOpacity style={[S.doneBtn, { backgroundColor: accent }]} onPress={() => setShowDatePicker(false)}>
                                            <Text style={[S.doneBtnText, { color: bg }]}>Done</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                            <View style={[S.formField, { borderBottomColor: border }]}>
                                <Text style={[S.fieldLabel, { color: textMuted }]}>Location</Text>
                                <TextInput style={[S.fieldInput, { color: textPrimary }]} placeholder="Where is it?" placeholderTextColor={textMuted} value={eventLocation} onChangeText={setEventLocation} />
                            </View>
                            <View style={[S.formField, { borderBottomColor: 'transparent' }]}>
                                <Text style={[S.fieldLabel, { color: textMuted }]}>Description</Text>
                                <TextInput style={[S.fieldInput, { color: textPrimary, minHeight: 80 }]} placeholder="What's happening?" placeholderTextColor={textMuted} multiline value={content} onChangeText={t => handleInputChange(t, 'content')} />
                            </View>
                            <TouchableOpacity style={[S.bannerPicker, { borderColor: border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]} onPress={pickMedia}>
                                <Ionicons name="image-outline" size={18} color={textMuted} />
                                <Text style={[S.bannerText, { color: textMuted }]}>{attachments.length > 0 ? '✓ Banner selected' : 'Add event banner'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* JOB */}
                    {creationType === 'job' && (
                        <View style={[S.formCard, { borderColor: border }]}>
                            <View style={[S.formField, { borderBottomColor: border }]}>
                                <Text style={[S.fieldLabel, { color: textMuted }]}>Role / Title</Text>
                                <TextInput style={[S.fieldInput, { color: textPrimary }]} placeholder="What's the job?" placeholderTextColor={textMuted} value={jobTitle} onChangeText={setJobTitle} autoFocus />
                            </View>
                            <View style={[S.formField, { borderBottomColor: border }]}>
                                <Text style={[S.fieldLabel, { color: textMuted }]}>Budget (USD)</Text>
                                <View style={S.fieldRow}>
                                    <Text style={[S.currencySign, { color: textPrimary }]}>$</Text>
                                    <TextInput style={[S.fieldInput, { color: textPrimary, flex: 1 }]} placeholder="0.00" placeholderTextColor={textMuted} keyboardType="numeric" value={jobBudget} onChangeText={setJobBudget} />
                                </View>
                            </View>
                            <View style={[S.formField, { borderBottomColor: 'transparent' }]}>
                                <Text style={[S.fieldLabel, { color: textMuted }]}>Details</Text>
                                <TextInput style={[S.fieldInput, { color: textPrimary, minHeight: 100 }]} placeholder="Describe the work, skills needed…" placeholderTextColor={textMuted} multiline value={content} onChangeText={t => handleInputChange(t, 'content')} />
                            </View>
                        </View>
                    )}

                    {/* MARKET */}
                    {creationType === 'market' && (
                        <View style={[S.formCard, { borderColor: border }]}>
                            <View style={[S.formField, { borderBottomColor: border }]}>
                                <Text style={[S.fieldLabel, { color: textMuted }]}>Item name</Text>
                                <TextInput style={[S.fieldInput, { color: textPrimary }]} placeholder="What are you selling?" placeholderTextColor={textMuted} value={marketTitle} onChangeText={setMarketTitle} autoFocus />
                            </View>
                            <View style={[S.formField, { borderBottomColor: border }]}>
                                <Text style={[S.fieldLabel, { color: textMuted }]}>Price (USD)</Text>
                                <View style={S.fieldRow}>
                                    <Text style={[S.currencySign, { color: textPrimary }]}>$</Text>
                                    <TextInput style={[S.fieldInput, { color: textPrimary, flex: 1 }]} placeholder="0.00" placeholderTextColor={textMuted} keyboardType="numeric" value={marketPrice} onChangeText={setMarketPrice} />
                                </View>
                            </View>
                            <View style={[S.formField, { borderBottomColor: 'transparent' }]}>
                                <Text style={[S.fieldLabel, { color: textMuted }]}>Description</Text>
                                <TextInput style={[S.fieldInput, { color: textPrimary, minHeight: 80 }]} placeholder="Condition, details, how to pick up…" placeholderTextColor={textMuted} multiline value={content} onChangeText={t => handleInputChange(t, 'content')} />
                            </View>
                            <TouchableOpacity style={[S.bannerPicker, { borderColor: border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]} onPress={pickMedia}>
                                <Ionicons name="image-outline" size={18} color={textMuted} />
                                <Text style={[S.bannerText, { color: textMuted }]}>{attachments.length > 0 ? '✓ Photo selected' : 'Add a photo'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                </ScrollView>

                {/* ── Toolbar (post/poll only) ── */}
                {['post', 'poll'].includes(creationType) && (
                    <View style={[S.toolbar, { borderTopColor: border, backgroundColor: bg }]}>
                        {creationType === 'post' && (
                            <>
                                <TouchableOpacity style={S.toolbarBtn} onPress={pickMedia}>
                                    <Ionicons name="images-outline" size={22} color={textMuted} />
                                </TouchableOpacity>
                                <TouchableOpacity style={S.toolbarBtn} onPress={takeMedia}>
                                    <Ionicons name="camera-outline" size={22} color={textMuted} />
                                </TouchableOpacity>
                            </>
                        )}
                        <View style={{ flex: 1 }} />
                        <Text style={[S.charCount, { color: (creationType === 'poll' ? pollQuestion.length : content.length) > 450 ? '#ef4444' : textMuted }]}>
                            {500 - (creationType === 'poll' ? pollQuestion.length : content.length)}
                        </Text>
                    </View>
                )}

            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
    root: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerSide: { minWidth: 70, alignItems: 'flex-start' },
    headerCancel: { fontFamily: fonts.regular, fontSize: 15 },
    headerTitle: { fontFamily: fonts.semibold, fontSize: 16 },
    typePills: { flexDirection: 'row', gap: 6 },
    pill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: radii.full, borderWidth: 1,
    },
    pillLabel: { fontFamily: fonts.semibold, fontSize: 12 },
    postBtn: {
        paddingHorizontal: 18, paddingVertical: 8,
        borderRadius: radii.full, alignSelf: 'flex-end',
    },
    postBtnText: { fontFamily: fonts.bold, fontSize: 13 },

    // Community row
    communityRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    communityChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: radii.full, borderWidth: StyleSheet.hairlineWidth,
    },
    communityChipText: { fontFamily: fonts.semibold, fontSize: 13 },

    // Dropdown
    dropdown: {
        marginHorizontal: 16, borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginTop: 2,
    },
    dropdownItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dropdownText: { fontSize: 14 },

    // Composer (Threads-style)
    composerRoot: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16 },
    composerLeft: { width: 44, alignItems: 'center', marginRight: 12 },
    composerRight: { flex: 1, paddingBottom: spacing.xl },
    mainInput: {
        fontFamily: fonts.regular, fontSize: 16,
        lineHeight: 22, textAlignVertical: 'top',
        minHeight: 40, paddingTop: 2,
    },

    // Media
    mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    mediaCell: { width: 100, height: 110, borderRadius: 10, overflow: 'hidden' },
    mediaImg: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 5, right: 5, zIndex: 10 },
    videoIconOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },

    // Tagging
    taggingBox: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginTop: 8 },
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    tagAvatar: { width: 30, height: 30, borderRadius: 15 },
    tagName: { fontFamily: fonts.semibold, fontSize: 13 },
    tagHandle: { fontFamily: fonts.regular, fontSize: 12 },

    // Poll
    pollCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginTop: 12 },
    pollOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
    pollIndex: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
    pollIndexText: { fontFamily: fonts.bold, fontSize: 11 },
    pollInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15 },
    addOption: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 14 },
    addOptionText: { fontFamily: fonts.medium, fontSize: 14 },

    // Form card (event / job / market)
    formCard: {
        marginHorizontal: 16, marginTop: 16,
        borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
        marginBottom: spacing.xl,
    },
    formField: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    fieldLabel: { fontFamily: fonts.medium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    fieldInput: { fontFamily: fonts.regular, fontSize: 15, paddingTop: 2 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    fieldValue: { fontFamily: fonts.semibold, fontSize: 15, flex: 1 },
    currencySign: { fontFamily: fonts.bold, fontSize: 16 },
    bannerPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, padding: 14, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
    bannerText: { fontFamily: fonts.regular, fontSize: 13 },
    pickerWrap: { borderBottomWidth: StyleSheet.hairlineWidth, padding: 8 },
    doneBtn: { marginHorizontal: 12, marginBottom: 8, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    doneBtnText: { fontFamily: fonts.bold, fontSize: 14 },

    // Toolbar
    toolbar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 8, paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    toolbarBtn: { padding: 8, borderRadius: 8 },
    charCount: { fontFamily: fonts.regular, fontSize: 13, paddingHorizontal: 12 },
});