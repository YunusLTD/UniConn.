import { apiFetch } from './client';

export const getConversations = async () => {
    return await apiFetch('/messages');
};

export const getConversation = async (id: string) => {
    return await apiFetch(`/messages/${id}`);
};

export const createConversation = async (data: { type: 'direct' | 'group', participant_ids: string[] }) => {
    return await apiFetch('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getMessages = async (
    conversationId: string,
    options?: {
        page?: number;
        limit?: number;
        after_created_at?: string;
        after_id?: string;
    }
) => {
    const query = new URLSearchParams();
    if (options?.page) query.set('page', String(options.page));
    if (options?.limit) query.set('limit', String(options.limit));
    if (options?.after_created_at) query.set('after_created_at', options.after_created_at);
    if (options?.after_id) query.set('after_id', options.after_id);

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return await apiFetch(`/messages/${conversationId}/messages${suffix}`);
};

export const sendMessage = async (conversationId: string, content: string | null, media_url?: string, media_type?: string, reply_to_message_id?: string, messageId?: string) => {
    const body: any = {};
    if (content) body.content = content;
    if (media_url) {
        body.media_url = media_url;
        body.media_type = media_type || 'image';
    }
    if (reply_to_message_id) body.reply_to_message_id = reply_to_message_id;
    if (messageId) body.message_id = messageId;
    return await apiFetch(`/messages/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

export const markConversationRead = async (id: string) => {
    return await apiFetch(`/messages/${id}/read`, {
        method: 'POST',
    });
};

export const deleteMessage = async (messageId: string) => {
    return await apiFetch(`/messages/message/${messageId}`, {
        method: 'DELETE',
    });
};

export const editMessage = async (messageId: string, content: string) => {
    return await apiFetch(`/messages/message/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
    });
};

export const toggleMessageReaction = async (messageId: string, emoji: string) => {
    return await apiFetch(`/messages/message/${messageId}/reaction`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
    });
};

export const deleteConversation = async (id: string) => {
    return await apiFetch(`/messages/${id}`, {
        method: 'DELETE',
    });
};
