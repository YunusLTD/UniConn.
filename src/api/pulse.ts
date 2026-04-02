import { apiFetch } from './client';

export const getPulses = async (page = 1, limit = 20) => {
    return await apiFetch(`/pulse?page=${page}&limit=${limit}`);
};

export const getPulse = async (id: string) => {
    return await apiFetch(`/pulse/${id}`);
};

export const createPulse = async (data: { content: string; image_url?: string }) => {
    return await apiFetch('/pulse', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const votePulse = async (id: string, value: number) => {
    return await apiFetch(`/pulse/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ value }),
    });
};

export const getPulseComments = async (id: string, page = 1) => {
    return await apiFetch(`/pulse/${id}/comments?page=${page}&limit=30`);
};

export const addPulseComment = async (id: string, content: string) => {
    return await apiFetch(`/pulse/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
    });
};

export const deletePulse = async (id: string) => {
    return await apiFetch(`/pulse/${id}`, { method: 'DELETE' });
};

export const updatePulse = async (id: string, data: { content: string; image_url?: string }) => {
    return await apiFetch(`/pulse/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};
