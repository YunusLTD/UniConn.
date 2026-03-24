import { apiFetch } from './client';

export const getNotifications = async () => {
    return await apiFetch('/notifications');
};

export const getUnreadCount = async () => {
    return await apiFetch('/notifications/unread-count');
};

export const markAsRead = async (id: string) => {
    return await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
};

export const markAllAsRead = async () => {
    return await apiFetch('/notifications/mark-all-read', { method: 'POST' });
};
export const markReadByReference = async (type: string, reference_id: string) => {
    return await apiFetch('/notifications/mark-read-by-reference', {
        method: 'POST',
        body: JSON.stringify({ type, reference_id }),
    });
};
