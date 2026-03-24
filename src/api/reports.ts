import { apiFetch } from './client';

export const submitReport = async (data: { type: string, target_id: string, reason: string }) => {
    return await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
