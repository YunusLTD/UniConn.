import { apiFetch } from './client';

export const getFeed = async (page = 1, limit = 10, community_id?: string, type?: string, category?: string) => {
    let url = `/feed?page=${page}&limit=${limit}`;
    if (community_id) url += `&community_id=${community_id}`;
    if (type) url += `&type=${type}`;
    if (category) url += `&category=${category}`;
    return await apiFetch(url);
};
