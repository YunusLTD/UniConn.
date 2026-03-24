import { apiFetch } from './client';

export const listCommunities = async (page = 1, limit = 20) => {
    return await apiFetch(`/communities?page=${page}&limit=${limit}`);
};

export const getMyCommunities = async () => {
    return await apiFetch('/communities/my');
};

export const getCommunity = async (id: string) => {
    return await apiFetch(`/communities/${id}`);
};

export const createCommunity = async (data: { name: string, type: string, description?: string }) => {
    return await apiFetch('/communities', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const joinCommunity = async (id: string) => {
    return await apiFetch(`/communities/${id}/join`, { method: 'POST' });
};

export const leaveCommunity = async (id: string) => {
    return await apiFetch(`/communities/${id}/leave`, { method: 'POST' });
};

export const getCommunityMembers = async (id: string) => {
    return await apiFetch(`/communities/${id}/members`);
};

export const requestCommunity = async (data: { name: string, description: string, university_id: string }) => {
    return await apiFetch('/communities/request', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const deleteCommunity = async (id: string) => {
    return await apiFetch(`/communities/${id}`, { method: 'DELETE' });
};

export const updateCommunity = async (id: string, data: any) => {
    return await apiFetch(`/communities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};
