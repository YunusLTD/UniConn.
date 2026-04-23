import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export type ChatSyncStatus = 'sending' | 'queued' | 'sent' | 'failed';

export type ChatSyncCursor = {
    last_created_at: string | null;
    last_message_id: string | null;
};

export type ChatOutboxPayload = {
    messageId: string;
    conversationId: string;
    content: string | null;
    mediaUri?: string | null;
    mediaType?: string | null;
    replyToMessageId?: string | null;
};

type StoredMessageRow = {
    id: string;
    raw_json: string;
    sync_status: ChatSyncStatus;
    local_media_uri: string | null;
    is_local_only: number;
};

type StoredOutboxRow = {
    message_id: string;
    conversation_id: string;
    payload_json: string;
    status: ChatSyncStatus;
};

type LatestStoredCursorRow = {
    id: string;
    created_at: string;
};

type StoredParticipantRow = {
    conversation_id: string;
    user_id: string;
    profile_json: string | null;
    last_read_at: string | null;
};

type StoredConversationRow = {
    id: string;
    raw_json: string;
};

type StoredConversationListRow = {
    user_id: string;
    conversation_id: string;
    raw_json: string;
};

type ChatStoreListener = (conversationId: string) => void;

let dbPromise: Promise<SQLiteDatabase> | null = null;
const chatStoreListeners = new Set<ChatStoreListener>();

const CHAT_DB_NAME = 'chat-sync.db';

const compareByCursor = (a: { created_at?: string; id?: string }, b: { created_at?: string; id?: string }) => {
    const aCreated = a.created_at || '';
    const bCreated = b.created_at || '';
    if (aCreated < bCreated) return -1;
    if (aCreated > bCreated) return 1;
    return (a.id || '').localeCompare(b.id || '');
};

const hydrateStoredMessage = (row: StoredMessageRow) => {
    const parsed = JSON.parse(row.raw_json);
    const syncStatus = row.sync_status || 'sent';
    const localMediaUri = row.local_media_uri || parsed.local_media_uri || parsed.media_url_local || null;

    return {
        ...parsed,
        sync_status: syncStatus,
        local_media_uri: localMediaUri,
        media_url_local: localMediaUri,
        is_local_only: !!row.is_local_only,
        isOptimistic: syncStatus !== 'sent',
    };
};

const sortReactions = (reactions: any[] | null | undefined) => {
    if (!Array.isArray(reactions)) return [];
    return [...reactions].sort((left, right) => {
        const leftTime = new Date(left?.created_at || 0).getTime();
        const rightTime = new Date(right?.created_at || 0).getTime();
        return leftTime - rightTime;
    });
};

const normalizeProfile = (profile: any) => {
    if (Array.isArray(profile)) {
        return profile[0] || null;
    }

    return profile || null;
};

const mergeProfileData = (existingProfile: any, incomingProfile: any) => {
    const existing = normalizeProfile(existingProfile);
    const incoming = normalizeProfile(incomingProfile);

    if (!existing && !incoming) return null;
    if (!existing) return incoming;
    if (!incoming) return existing;

    return {
        ...existing,
        ...incoming,
    };
};

const pickLatestTimestamp = (currentValue?: string | null, incomingValue?: string | null) => {
    if (!incomingValue) return currentValue ?? null;
    if (!currentValue) return incomingValue;

    return new Date(incomingValue).getTime() >= new Date(currentValue).getTime()
        ? incomingValue
        : currentValue;
};

const hydrateMessageWithParticipants = (
    message: any,
    participantMap: Map<string, { profiles: any; last_read_at: string | null }>
) => {
    const participant = message?.sender_id ? participantMap.get(message.sender_id) : null;
    const replyParticipant = message?.reply_to?.sender_id
        ? participantMap.get(message.reply_to.sender_id)
        : null;

    const mergedProfiles = mergeProfileData(message?.profiles, participant?.profiles);
    const mergedReplyProfiles = message?.reply_to
        ? mergeProfileData(message.reply_to.profiles, replyParticipant?.profiles)
        : null;

    return {
        ...message,
        profiles: mergedProfiles,
        reply_to: message?.reply_to
            ? {
                ...message.reply_to,
                profiles: mergedReplyProfiles,
            }
            : message?.reply_to ?? null,
    };
};

const linkReplyMessages = (messages: any[]) => {
    const byId = new Map(messages.map((message) => [message.id, message]));

    return messages.map((message) => {
        if (message?.reply_to || !message?.reply_to_message_id) {
            return {
                ...message,
                reactions: sortReactions(message?.reactions),
            };
        }

        const replyTarget = byId.get(message.reply_to_message_id);
        return {
            ...message,
            reply_to: replyTarget || null,
            reactions: sortReactions(message?.reactions),
        };
    });
};

const getDb = async () => {
    if (!dbPromise) {
        dbPromise = (async () => {
            const db = await openDatabaseAsync(CHAT_DB_NAME);
            await db.execAsync(`
                PRAGMA journal_mode = WAL;
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id TEXT PRIMARY KEY NOT NULL,
                    conversation_id TEXT NOT NULL,
                    sender_id TEXT,
                    content TEXT,
                    created_at TEXT NOT NULL,
                    raw_json TEXT NOT NULL,
                    sync_status TEXT NOT NULL DEFAULT 'sent',
                    local_media_uri TEXT,
                    is_local_only INTEGER NOT NULL DEFAULT 0
                );
                CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
                    ON chat_messages (conversation_id, created_at, id);
                CREATE TABLE IF NOT EXISTS chat_sync_state (
                    conversation_id TEXT PRIMARY KEY NOT NULL,
                    last_created_at TEXT,
                    last_message_id TEXT,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS chat_outbox (
                    message_id TEXT PRIMARY KEY NOT NULL,
                    conversation_id TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    status TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_chat_outbox_conversation_created
                    ON chat_outbox (conversation_id, created_at);
                CREATE TABLE IF NOT EXISTS chat_participants (
                    conversation_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    profile_json TEXT,
                    last_read_at TEXT,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (conversation_id, user_id)
                );
                CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation
                    ON chat_participants (conversation_id, updated_at);
                CREATE TABLE IF NOT EXISTS chat_conversations (
                    id TEXT PRIMARY KEY NOT NULL,
                    raw_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS chat_conversation_lists (
                    user_id TEXT NOT NULL,
                    conversation_id TEXT NOT NULL,
                    raw_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (user_id, conversation_id)
                );
                CREATE INDEX IF NOT EXISTS idx_chat_conversation_lists_user
                    ON chat_conversation_lists (user_id, updated_at);
            `);
            return db;
        })();
    }

    return dbPromise;
};

const emitConversationChange = (conversationId?: string | null) => {
    if (!conversationId) return;
    for (const listener of chatStoreListeners) {
        listener(conversationId);
    }
};

const compareConversationActivity = (left: any, right: any) => {
    const leftTime = new Date(left?.last_message?.created_at || left?.created_at || 0).getTime();
    const rightTime = new Date(right?.last_message?.created_at || right?.created_at || 0).getTime();
    return rightTime - leftTime;
};

const sortConversationList = (conversations: any[]) => {
    return [...conversations].sort(compareConversationActivity);
};

const upsertConversationListEntry = async (db: SQLiteDatabase, userId: string, conversation: any) => {
    if (!userId || !conversation?.id) return;

    await db.runAsync(
        `INSERT INTO chat_conversation_lists (user_id, conversation_id, raw_json, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, conversation_id) DO UPDATE SET
           raw_json = excluded.raw_json,
           updated_at = excluded.updated_at`,
        userId,
        conversation.id,
        JSON.stringify(conversation),
        new Date().toISOString()
    );
};

const updateConversationListPreview = async (db: SQLiteDatabase, conversationId: string, message: any) => {
    if (!conversationId || !message?.created_at) return;

    const rows = await db.getAllAsync<StoredConversationListRow>(
        `SELECT user_id, conversation_id, raw_json
         FROM chat_conversation_lists
         WHERE conversation_id = ?`,
        conversationId
    );

    for (const row of rows) {
        const conversation = JSON.parse(row.raw_json);
        const currentLastMessage = conversation?.last_message;

        if (
            currentLastMessage &&
            compareByCursor(
                { created_at: message.created_at, id: message.id },
                { created_at: currentLastMessage.created_at, id: currentLastMessage.id }
            ) < 0
        ) {
            continue;
        }

        const updatedConversation = {
            ...conversation,
            last_message: {
                ...(currentLastMessage || {}),
                ...message,
            },
        };

        await upsertConversationListEntry(db, row.user_id, updatedConversation);
    }
};

const maybeUpdateSyncCursor = async (db: SQLiteDatabase, conversationId: string, messages: any[]) => {
    const committedMessages = messages
        .filter((message) => (message.sync_status ?? 'sent') === 'sent' && !message.is_local_only)
        .sort(compareByCursor);

    if (!committedMessages.length) return;

    const latest = committedMessages[committedMessages.length - 1];
    const existing = await db.getFirstAsync<ChatSyncCursor>(
        'SELECT last_created_at, last_message_id FROM chat_sync_state WHERE conversation_id = ?',
        conversationId
    );

    if (
        existing?.last_created_at &&
        existing?.last_message_id &&
        compareByCursor(
            { created_at: latest.created_at, id: latest.id },
            { created_at: existing.last_created_at, id: existing.last_message_id }
        ) <= 0
    ) {
        return;
    }

    await db.runAsync(
        `INSERT INTO chat_sync_state (conversation_id, last_created_at, last_message_id, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(conversation_id) DO UPDATE SET
           last_created_at = excluded.last_created_at,
           last_message_id = excluded.last_message_id,
           updated_at = excluded.updated_at`,
        conversationId,
        latest.created_at,
        latest.id,
        new Date().toISOString()
    );
};

const getExistingMessage = async (db: SQLiteDatabase, messageId: string) => {
    return db.getFirstAsync<StoredMessageRow>(
        'SELECT id, raw_json, sync_status, local_media_uri, is_local_only FROM chat_messages WHERE id = ?',
        messageId
    );
};

const getStoredConversationParticipants = async (db: SQLiteDatabase, conversationId: string) => {
    return db.getAllAsync<StoredParticipantRow>(
        `SELECT conversation_id, user_id, profile_json, last_read_at
         FROM chat_participants
         WHERE conversation_id = ?`,
        conversationId
    );
};

const upsertParticipant = async (
    db: SQLiteDatabase,
    {
        conversationId,
        userId,
        profiles,
        lastReadAt,
    }: {
        conversationId?: string | null;
        userId?: string | null;
        profiles?: any;
        lastReadAt?: string | null;
    }
) => {
    if (!conversationId || !userId) {
        return;
    }

    const existing = await db.getFirstAsync<StoredParticipantRow>(
        `SELECT conversation_id, user_id, profile_json, last_read_at
         FROM chat_participants
         WHERE conversation_id = ? AND user_id = ?`,
        conversationId,
        userId
    );

    const existingProfile = existing?.profile_json ? JSON.parse(existing.profile_json) : null;
    const mergedProfile = mergeProfileData(existingProfile, profiles);
    const mergedLastReadAt = pickLatestTimestamp(existing?.last_read_at, lastReadAt);

    await db.runAsync(
        `INSERT INTO chat_participants (conversation_id, user_id, profile_json, last_read_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(conversation_id, user_id) DO UPDATE SET
           profile_json = excluded.profile_json,
           last_read_at = excluded.last_read_at,
           updated_at = excluded.updated_at`,
        conversationId,
        userId,
        mergedProfile ? JSON.stringify(mergedProfile) : null,
        mergedLastReadAt,
        new Date().toISOString()
    );
};

const persistParticipantsFromMessage = async (db: SQLiteDatabase, message: any) => {
    if (!message?.conversation_id) return;

    await upsertParticipant(db, {
        conversationId: message.conversation_id,
        userId: message.sender_id,
        profiles: message.profiles,
    });

    if (message.reply_to?.sender_id) {
        await upsertParticipant(db, {
            conversationId: message.reply_to.conversation_id || message.conversation_id,
            userId: message.reply_to.sender_id,
            profiles: message.reply_to.profiles,
        });
    }
};

const getLatestStoredCursor = async (db: SQLiteDatabase, conversationId: string): Promise<ChatSyncCursor> => {
    const latest = await db.getFirstAsync<LatestStoredCursorRow>(
        `SELECT id, created_at
         FROM chat_messages
         WHERE conversation_id = ?
           AND sync_status = 'sent'
           AND is_local_only = 0
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        conversationId
    );

    return {
        last_created_at: latest?.created_at ?? null,
        last_message_id: latest?.id ?? null,
    };
};

const buildStoredMessage = (existing: StoredMessageRow | null, incoming: any) => {
    const existingJson = existing ? JSON.parse(existing.raw_json) : {};
    const syncStatus = (incoming.sync_status ?? existing?.sync_status ?? 'sent') as ChatSyncStatus;
    const localMediaUri =
        incoming.local_media_uri ??
        incoming.media_url_local ??
        existing?.local_media_uri ??
        existingJson.local_media_uri ??
        existingJson.media_url_local ??
        null;
    const isLocalOnly = incoming.is_local_only ?? existing?.is_local_only ?? 0;

    const merged = {
        ...existingJson,
        ...incoming,
        sync_status: syncStatus,
        local_media_uri: localMediaUri,
        media_url_local: localMediaUri,
        is_local_only: !!isLocalOnly,
    };

    return {
        merged,
        syncStatus,
        localMediaUri,
        isLocalOnly: isLocalOnly ? 1 : 0,
    };
};

const persistMessage = async (db: SQLiteDatabase, incoming: any) => {
    if (!incoming?.id || !incoming?.conversation_id) {
        return null;
    }

    const existing = await getExistingMessage(db, incoming.id);
    const { merged, syncStatus, localMediaUri, isLocalOnly } = buildStoredMessage(existing, incoming);

    await db.runAsync(
        `INSERT INTO chat_messages (
            id, conversation_id, sender_id, content, created_at, raw_json, sync_status, local_media_uri, is_local_only
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            conversation_id = excluded.conversation_id,
            sender_id = excluded.sender_id,
            content = excluded.content,
            created_at = excluded.created_at,
            raw_json = excluded.raw_json,
            sync_status = excluded.sync_status,
            local_media_uri = excluded.local_media_uri,
            is_local_only = excluded.is_local_only`,
        merged.id,
        merged.conversation_id,
        merged.sender_id ?? null,
        merged.content ?? null,
        merged.created_at,
        JSON.stringify(merged),
        syncStatus,
        localMediaUri,
        isLocalOnly
    );

    return merged;
};

const updateStoredMessage = async (
    db: SQLiteDatabase,
    messageId: string,
    updater: (existingJson: any, existingRow: StoredMessageRow) => any
) => {
    const existing = await getExistingMessage(db, messageId);
    if (!existing) return null;

    const existingJson = JSON.parse(existing.raw_json);
    const updated = updater(existingJson, existing);
    if (!updated) return null;

    const { merged, syncStatus, localMediaUri, isLocalOnly } = buildStoredMessage(existing, updated);

    await db.runAsync(
        `UPDATE chat_messages
         SET content = ?, raw_json = ?, sync_status = ?, local_media_uri = ?, is_local_only = ?
         WHERE id = ?`,
        merged.content ?? null,
        JSON.stringify(merged),
        syncStatus,
        localMediaUri,
        isLocalOnly,
        messageId
    );

    return merged;
};

export const chatStore = {
    subscribe(listener: ChatStoreListener) {
        chatStoreListeners.add(listener);
        return () => {
            chatStoreListeners.delete(listener);
        };
    },

    async upsertConversation(conversation: any) {
        if (!conversation?.id) return;

        const db = await getDb();
        await db.runAsync(
            `INSERT INTO chat_conversations (id, raw_json, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               raw_json = excluded.raw_json,
               updated_at = excluded.updated_at`,
            conversation.id,
            JSON.stringify(conversation),
            new Date().toISOString()
        );

        if (Array.isArray(conversation.participants) && conversation.participants.length) {
            await this.upsertConversationParticipants(conversation.id, conversation.participants);
        }

        emitConversationChange(conversation.id);
    },

    async getConversation(conversationId: string) {
        const db = await getDb();
        const row = await db.getFirstAsync<StoredConversationRow>(
            `SELECT id, raw_json
             FROM chat_conversations
             WHERE id = ?`,
            conversationId
        );

        if (!row?.raw_json) return null;

        const conversation = JSON.parse(row.raw_json);
        const participants = await this.getConversationParticipants(conversationId);

        return {
            ...conversation,
            participants,
        };
    },

    async upsertConversationList(userId: string, conversations: any[]) {
        if (!userId || !conversations.length) return;

        const db = await getDb();
        for (const conversation of conversations) {
            await upsertConversationListEntry(db, userId, conversation);
            await db.runAsync(
                `INSERT INTO chat_conversations (id, raw_json, updated_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                   raw_json = excluded.raw_json,
                   updated_at = excluded.updated_at`,
                conversation.id,
                JSON.stringify(conversation),
                new Date().toISOString()
            );

            if (Array.isArray(conversation?.participants) && conversation.participants.length) {
                await this.upsertConversationParticipants(conversation.id, conversation.participants);
            }

            if (conversation?.last_message?.id && conversation?.last_message?.created_at) {
                await this.upsertMessages([{
                    ...conversation.last_message,
                    conversation_id: conversation.id,
                    sync_status: 'sent',
                    is_local_only: false,
                }]);
            }
        }

        for (const conversation of conversations) {
            emitConversationChange(conversation.id);
        }
    },

    async getConversationList(userId: string) {
        if (!userId) return [];

        const db = await getDb();
        const rows = await db.getAllAsync<StoredConversationListRow>(
            `SELECT user_id, conversation_id, raw_json
             FROM chat_conversation_lists
             WHERE user_id = ?`,
            userId
        );

        const conversations = await Promise.all(rows.map(async (row) => {
            const conversation = JSON.parse(row.raw_json);
            const participants = await this.getConversationParticipants(row.conversation_id);
            return {
                ...conversation,
                participants: participants.length ? participants : (conversation.participants || []),
            };
        }));

        return sortConversationList(conversations);
    },

    async updateConversationListUnread(userId: string, conversationId: string, unreadCount: number) {
        if (!userId || !conversationId) return;

        const db = await getDb();
        const row = await db.getFirstAsync<StoredConversationListRow>(
            `SELECT user_id, conversation_id, raw_json
             FROM chat_conversation_lists
             WHERE user_id = ? AND conversation_id = ?`,
            userId,
            conversationId
        );

        if (!row?.raw_json) return;

        const conversation = JSON.parse(row.raw_json);
        const updatedConversation = {
            ...conversation,
            unread_count: Math.max(0, unreadCount || 0),
        };

        await upsertConversationListEntry(db, userId, updatedConversation);
        emitConversationChange(conversationId);
    },

    async loadConversationMessages(conversationId: string) {
        const db = await getDb();
        const participants = await getStoredConversationParticipants(db, conversationId);
        const participantMap = new Map(
            participants.map((participant) => [
                participant.user_id,
                {
                    profiles: participant.profile_json ? JSON.parse(participant.profile_json) : null,
                    last_read_at: participant.last_read_at ?? null,
                },
            ])
        );
        const rows = await db.getAllAsync<StoredMessageRow>(
            `SELECT id, raw_json, sync_status, local_media_uri, is_local_only
             FROM chat_messages
             WHERE conversation_id = ?
            ORDER BY created_at ASC, id ASC`,
            conversationId
        );
        return linkReplyMessages(
            rows
                .map(hydrateStoredMessage)
                .map((message) => hydrateMessageWithParticipants(message, participantMap))
        );
    },

    async upsertMessages(messages: any[]) {
        if (!messages.length) return;
        const db = await getDb();
        const persistedMessages: any[] = [];

        for (const incoming of messages) {
            const persisted = await persistMessage(db, incoming);
            if (persisted) {
                await persistParticipantsFromMessage(db, persisted);
                persistedMessages.push(persisted);
            }
        }

        const conversationGroups = new Map<string, any[]>();
        for (const message of persistedMessages) {
            if (!message?.conversation_id) continue;
            const group = conversationGroups.get(message.conversation_id) || [];
            group.push(message);
            conversationGroups.set(message.conversation_id, group);
        }

        for (const [conversationId, group] of conversationGroups.entries()) {
            await maybeUpdateSyncCursor(db, conversationId, group);
            const latestMessage = [...group].sort(compareByCursor)[group.length - 1];
            if (latestMessage) {
                await updateConversationListPreview(db, conversationId, latestMessage);
            }
            emitConversationChange(conversationId);
        }
    },

    async queueOutgoingMessage(message: any, payload: ChatOutboxPayload, status: ChatSyncStatus) {
        await this.upsertMessages([{ ...message, sync_status: status, is_local_only: true }]);

        const db = await getDb();
        await db.runAsync(
            `INSERT INTO chat_outbox (message_id, conversation_id, payload_json, created_at, status)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(message_id) DO UPDATE SET
               conversation_id = excluded.conversation_id,
               payload_json = excluded.payload_json,
               created_at = excluded.created_at,
               status = excluded.status`,
            payload.messageId,
            payload.conversationId,
            JSON.stringify(payload),
            message.created_at,
            status
        );
        emitConversationChange(payload.conversationId);
    },

    async updateMessageStatus(messageId: string, syncStatus: ChatSyncStatus) {
        const db = await getDb();
        const existing = await getExistingMessage(db, messageId);
        if (!existing) return;

        const existingJson = JSON.parse(existing.raw_json);
        const merged = { ...existingJson, sync_status: syncStatus };

        await db.runAsync(
            `UPDATE chat_messages
             SET raw_json = ?, sync_status = ?
             WHERE id = ?`,
            JSON.stringify(merged),
            syncStatus,
            messageId
        );
        await db.runAsync('UPDATE chat_outbox SET status = ? WHERE message_id = ?', syncStatus, messageId);
        emitConversationChange(existingJson?.conversation_id ?? null);
    },

    async markMessageSent(messageId: string, serverMessage: any) {
        const db = await getDb();
        const optimisticMessage = await getExistingMessage(db, messageId);
        const optimisticJson = optimisticMessage ? JSON.parse(optimisticMessage.raw_json) : {};
        const finalMessageId = serverMessage?.id || messageId;
        const localMediaUri =
            serverMessage?.local_media_uri ??
            serverMessage?.media_url_local ??
            optimisticMessage?.local_media_uri ??
            optimisticJson.local_media_uri ??
            optimisticJson.media_url_local ??
            null;

        const committedMessage = {
            ...optimisticJson,
            ...serverMessage,
            id: finalMessageId,
            local_media_uri: localMediaUri,
            media_url_local: localMediaUri,
            sync_status: 'sent',
            is_local_only: false,
        };

        await persistMessage(db, committedMessage);

        if (finalMessageId !== messageId) {
            await db.runAsync('DELETE FROM chat_messages WHERE id = ?', messageId);
        }

        await db.runAsync('DELETE FROM chat_outbox WHERE message_id = ?', messageId);

        if (committedMessage.conversation_id) {
            await maybeUpdateSyncCursor(db, committedMessage.conversation_id, [committedMessage]);
        }
        emitConversationChange(committedMessage.conversation_id);
    },

    async removeOutboxMessage(messageId: string) {
        const db = await getDb();
        const existing = await getExistingMessage(db, messageId);
        await db.runAsync('DELETE FROM chat_outbox WHERE message_id = ?', messageId);
        if (existing) {
            const existingJson = JSON.parse(existing.raw_json);
            emitConversationChange(existingJson?.conversation_id ?? null);
        }
    },

    async markMessageDeleted(messageId: string, deletedAt?: string) {
        const db = await getDb();
        await updateStoredMessage(db, messageId, (existingJson, existing) => ({
            ...existingJson,
            deleted_at: deletedAt || new Date().toISOString(),
            content: 'This message was deleted',
            media_url: null,
            sync_status: existing.sync_status || 'sent',
        }));
        await db.runAsync('DELETE FROM chat_outbox WHERE message_id = ?', messageId);
        const existing = await getExistingMessage(db, messageId);
        if (existing) {
            const existingJson = JSON.parse(existing.raw_json);
            emitConversationChange(existingJson?.conversation_id ?? null);
        }
    },

    async updateLocalMessage(messageId: string, updater: (message: any) => any) {
        const db = await getDb();
        const updated = await updateStoredMessage(db, messageId, (existingJson) => updater(existingJson));
        emitConversationChange(updated?.conversation_id ?? null);
    },

    async upsertConversationParticipants(conversationId: string, participants: any[]) {
        if (!conversationId || !participants.length) return;

        const db = await getDb();
        for (const participant of participants) {
            await upsertParticipant(db, {
                conversationId,
                userId: participant?.user_id,
                profiles: participant?.profiles,
                lastReadAt: participant?.last_read_at ?? null,
            });
        }
        emitConversationChange(conversationId);
    },

    async getConversationParticipants(conversationId: string) {
        const db = await getDb();
        const rows = await getStoredConversationParticipants(db, conversationId);

        return rows.map((row) => ({
            user_id: row.user_id,
            last_read_at: row.last_read_at ?? null,
            profiles: row.profile_json ? JSON.parse(row.profile_json) : null,
        }));
    },

    async updateParticipantReadState(conversationId: string, userId: string, lastReadAt?: string) {
        const db = await getDb();
        await upsertParticipant(db, {
            conversationId,
            userId,
            lastReadAt: lastReadAt || new Date().toISOString(),
        });
        emitConversationChange(conversationId);
    },

    async applyReactionEvent(eventType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) {
        const messageId = payload?.message_id;
        if (!messageId) return;

        const db = await getDb();
        await updateStoredMessage(db, messageId, (existingJson) => {
            const existingReactions = sortReactions(existingJson?.reactions);
            let nextReactions = existingReactions;

            if (eventType === 'DELETE') {
                nextReactions = existingReactions.filter((reaction) => reaction.id !== payload.id);
            } else if (eventType === 'UPDATE') {
                nextReactions = existingReactions
                    .filter((reaction) => reaction.id !== payload.id && reaction.user_id !== payload.user_id)
                    .concat(payload);
            } else {
                nextReactions = existingReactions
                    .filter((reaction) => reaction.id !== payload.id && reaction.user_id !== payload.user_id)
                    .concat(payload);
            }

            return {
                ...existingJson,
                reactions: sortReactions(nextReactions),
            };
        });
    },

    async clearConversation(conversationId: string) {
        const db = await getDb();
        await db.runAsync('DELETE FROM chat_messages WHERE conversation_id = ?', conversationId);
        await db.runAsync('DELETE FROM chat_outbox WHERE conversation_id = ?', conversationId);
        await db.runAsync('DELETE FROM chat_sync_state WHERE conversation_id = ?', conversationId);
        await db.runAsync('DELETE FROM chat_participants WHERE conversation_id = ?', conversationId);
        await db.runAsync('DELETE FROM chat_conversations WHERE id = ?', conversationId);
        await db.runAsync('DELETE FROM chat_conversation_lists WHERE conversation_id = ?', conversationId);
        emitConversationChange(conversationId);
    },

    async getOutboxMessages(conversationId?: string) {
        const db = await getDb();
        const rows = conversationId
            ? await db.getAllAsync<StoredOutboxRow>(
                `SELECT message_id, conversation_id, payload_json, status
                 FROM chat_outbox
                 WHERE conversation_id = ?
                   AND status != 'failed'
                 ORDER BY created_at ASC, message_id ASC`,
                conversationId
            )
            : await db.getAllAsync<StoredOutboxRow>(
                `SELECT message_id, conversation_id, payload_json, status
                 FROM chat_outbox
                 WHERE status != 'failed'
                 ORDER BY created_at ASC, message_id ASC`
            );

        return rows.map((row) => ({
            messageId: row.message_id,
            conversationId: row.conversation_id,
            status: row.status,
            payload: JSON.parse(row.payload_json) as ChatOutboxPayload,
        }));
    },

    async getSyncCursor(conversationId: string): Promise<ChatSyncCursor> {
        const db = await getDb();
        const row = await db.getFirstAsync<ChatSyncCursor>(
            'SELECT last_created_at, last_message_id FROM chat_sync_state WHERE conversation_id = ?',
            conversationId
        );
        if (row?.last_created_at) {
            return {
                last_created_at: row.last_created_at,
                last_message_id: row.last_message_id ?? null,
            };
        }

        const fallbackCursor = await getLatestStoredCursor(db, conversationId);
        if (fallbackCursor.last_created_at) {
            await db.runAsync(
                `INSERT INTO chat_sync_state (conversation_id, last_created_at, last_message_id, updated_at)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(conversation_id) DO UPDATE SET
                   last_created_at = excluded.last_created_at,
                   last_message_id = excluded.last_message_id,
                   updated_at = excluded.updated_at`,
                conversationId,
                fallbackCursor.last_created_at,
                fallbackCursor.last_message_id,
                new Date().toISOString()
            );
        }

        return {
            last_created_at: fallbackCursor.last_created_at,
            last_message_id: fallbackCursor.last_message_id,
        };
    },

    async setSyncCursor(conversationId: string, cursor: ChatSyncCursor) {
        const db = await getDb();
        await db.runAsync(
            `INSERT INTO chat_sync_state (conversation_id, last_created_at, last_message_id, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(conversation_id) DO UPDATE SET
               last_created_at = excluded.last_created_at,
               last_message_id = excluded.last_message_id,
               updated_at = excluded.updated_at`,
            conversationId,
            cursor.last_created_at,
            cursor.last_message_id,
            new Date().toISOString()
        );
    },
};
