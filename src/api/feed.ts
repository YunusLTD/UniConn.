import { apiFetch } from './client';

export const getFeed = async (page = 1, limit = 10, community_id?: string) => {
    const url = `/feed?page=${page}&limit=${limit}${community_id ? `&community_id=${community_id}` : ''}`;
    return await apiFetch(url);
};
