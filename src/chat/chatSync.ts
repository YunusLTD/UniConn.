import NetInfo from '@react-native-community/netinfo';
import { getMessages, sendMessage } from '../api/messages';
import { uploadMultipleMedia } from '../api/upload';
import { chatStore, type ChatOutboxPayload, type ChatSyncStatus } from './chatStore';

const INITIAL_SYNC_LIMIT = 50;
const DELTA_SYNC_LIMIT = 100;

const isOnline = async () => {
    const state = await NetInfo.fetch();
    return !!state.isConnected && state.isInternetReachable !== false;
};

const isNetworkError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return /network|fetch|timed out|socket|internet/i.test(message);
};

export const createMessageUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const random = Math.random() * 16 | 0;
        const value = char === 'x' ? random : (random & 0x3 | 0x8);
        return value.toString(16);
    });

const detectMediaType = (uri?: string | null) => {
    if (!uri) return null;
    return /\.(mp4|mov|m4v|webm)$/i.test(uri) ? 'video' : 'image';
};

export const syncConversationMessages = async (conversationId: string) => {
    const cursor = await chatStore.getSyncCursor(conversationId);

    if (!cursor.last_created_at) {
        const response = await getMessages(conversationId, { page: 1, limit: INITIAL_SYNC_LIMIT });
        const initialMessages = [...(response?.data || [])].reverse();
        await chatStore.upsertMessages(initialMessages.map((message: any) => ({
            ...message,
            sync_status: 'sent',
            is_local_only: false,
        })));
        return;
    }

    let nextCreatedAt = cursor.last_created_at;
    let nextMessageId = cursor.last_message_id;

    while (nextCreatedAt) {
        const response = await getMessages(conversationId, {
            after_created_at: nextCreatedAt,
            after_id: nextMessageId || undefined,
            limit: DELTA_SYNC_LIMIT,
        });

        const deltaMessages = response?.data || [];
        if (!deltaMessages.length) break;

        await chatStore.upsertMessages(deltaMessages.map((message: any) => ({
            ...message,
            sync_status: 'sent',
            is_local_only: false,
        })));

        const syncCursor = response?.sync_cursor;
        if (!syncCursor?.created_at) break;
        nextCreatedAt = syncCursor.created_at;
        nextMessageId = syncCursor.id;

        if (deltaMessages.length < DELTA_SYNC_LIMIT) break;
    }
};

export const applyIncomingRealtimeMessage = async (message: any) => {
    await chatStore.upsertMessages([{ ...message, sync_status: 'sent', is_local_only: false }]);
};

export const applyUpdatedRealtimeMessage = async (message: any) => {
    await chatStore.upsertMessages([{ ...message, sync_status: 'sent', is_local_only: false }]);
};

export const queueOptimisticMessage = async ({
    conversationId,
    senderId,
    senderProfile,
    content,
    mediaUri,
    replyTo,
}: {
    conversationId: string;
    senderId?: string;
    senderProfile?: any;
    content: string | null;
    mediaUri?: string | null;
    replyTo?: any;
}) => {
    const messageId = createMessageUUID();
    const mediaType = detectMediaType(mediaUri);
    const createdAt = new Date().toISOString();
    const online = await isOnline();
    const status: ChatSyncStatus = online ? 'sending' : 'queued';
    const validReplyId = replyTo?.id && !String(replyTo.id).startsWith('temp_') ? replyTo.id : undefined;

    const optimisticMessage = {
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        media_url: mediaUri || null,
        media_type: mediaType,
        created_at: createdAt,
        profiles: senderProfile || null,
        reply_to: replyTo || null,
        local_media_uri: mediaUri || null,
        is_local_only: true,
        sync_status: status,
    };

    const outboxPayload: ChatOutboxPayload = {
        messageId,
        conversationId,
        content,
        mediaUri: mediaUri || null,
        mediaType,
        replyToMessageId: validReplyId || null,
    };

    await chatStore.queueOutgoingMessage(optimisticMessage, outboxPayload, status);

    if (online) {
        void drainOutbox(conversationId);
    }

    return messageId;
};

export const drainOutbox = async (conversationId?: string) => {
    if (!(await isOnline())) return;

    const queuedMessages = await chatStore.getOutboxMessages(conversationId);

    for (const queued of queuedMessages) {
        const { payload } = queued;

        try {
            await chatStore.updateMessageStatus(payload.messageId, 'sending');

            let uploadedUrl: string | undefined;
            let mediaType = payload.mediaType || detectMediaType(payload.mediaUri) || undefined;

            if (payload.mediaUri) {
                const uploadResult = await uploadMultipleMedia([{ uri: payload.mediaUri, type: mediaType || 'image' }]);
                if (uploadResult?.length) {
                    uploadedUrl = uploadResult[0].url;
                }
            }

            const response = await sendMessage(
                payload.conversationId,
                payload.content,
                uploadedUrl,
                mediaType,
                payload.replyToMessageId || undefined,
                payload.messageId
            );

            if (response?.data) {
                await chatStore.markMessageSent(payload.messageId, {
                    ...response.data,
                    local_media_uri: payload.mediaUri || null,
                });
            }
        } catch (error) {
            if (isNetworkError(error)) {
                await chatStore.updateMessageStatus(payload.messageId, 'queued');
                break;
            }

            await chatStore.updateMessageStatus(payload.messageId, 'failed');
        }
    }
};

export const retryFailedMessage = async (conversationId: string, messageId: string) => {
    await chatStore.updateMessageStatus(messageId, 'queued');
    await drainOutbox(conversationId);
};
