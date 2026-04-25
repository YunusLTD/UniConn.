import { apiFetch } from './client';

export const getFeed = async (page = 1, limit = 10, community_id?: string, type?: string, category?: string, listing_type?: string) => {
    let url = `/feed?page=${page}&limit=${limit}`;
    if (community_id) url += `&community_id=${community_id}`;
    if (type) url += `&type=${type}`;
    if (category) url += `&category=${category}`;
    if (listing_type) url += `&listing_type=${listing_type}`;
    return await apiFetch(url);
};

export const getFeedCore = async (cursor?: string, limit = 10, community_id?: string) => {
    let url = `/feed/core?limit=${limit}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    if (community_id) url += `&community_id=${community_id}`;
    return await apiFetch(url);
};

export const enrichFeed = async (postIds: string[], userIds: string[], communityIds: string[], pollIds: string[] = [], eventIds: string[] = []) => {
    return await apiFetch('/feed/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds, userIds, communityIds, pollIds, eventIds }),
    });
};
