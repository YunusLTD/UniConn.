import { apiFetch } from './client';

export const listCommunities = async (page = 1, limit = 20) => {
    return await apiFetch(`/communities?page=${page}&limit=${limit}`);
};

let myCommunitiesCache: any = null;
let lastFetchTime = 0;

export const getMyCommunities = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && myCommunitiesCache && (now - lastFetchTime < 60000)) {
        return { status: 'success', data: myCommunitiesCache };
    }
    
    const res = await apiFetch('/communities/my');
    if (res?.data) {
        myCommunitiesCache = res.data;
        lastFetchTime = now;
    }
    return res;
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

export const getPendingRequests = async (id: string) => {
    return await apiFetch(`/communities/${id}/pending`);
};

export const approveJoinRequest = async (id: string, userId: string) => {
    return await apiFetch(`/communities/${id}/approve/${userId}`, { method: 'POST' });
};

export const rejectJoinRequest = async (id: string, userId: string) => {
    return await apiFetch(`/communities/${id}/reject/${userId}`, { method: 'POST' });
};
