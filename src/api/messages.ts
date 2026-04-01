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

export const getMessages = async (conversationId: string) => {
    return await apiFetch(`/messages/${conversationId}/messages`);
};

export const sendMessage = async (conversationId: string, content: string | null, media_url?: string, media_type?: string, reply_to_message_id?: string) => {
    const body: any = {};
    if (content) body.content = content;
    if (media_url) {
        body.media_url = media_url;
        body.media_type = media_type || 'image';
    }
    if (reply_to_message_id) body.reply_to_message_id = reply_to_message_id;
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
