import { apiFetch } from './client';

/**
 * STORIES API
 */

export const getStoryFeed = async () => {
    // Returns stories grouped by POV events
    return await apiFetch('/stories/feed');
};

export const createStory = async (data: { 
    media_url: string, 
    media_type?: string, 
    content?: string, 
    latitude?: number, 
    longitude?: number 
}) => {
    return await apiFetch('/stories', {
        method: 'POST',
        body: JSON.stringify(data)
    });
};

export const markStoryViewed = async (storyId: string) => {
    return await apiFetch(`/stories/${storyId}/view`, {
        method: 'POST'
    });
};

export const getUserStories = async (userId: string) => {
    return await apiFetch(`/stories/user/${userId}`);
};

export const likeStory = async (storyId: string) => {
    return await apiFetch(`/stories/${storyId}/like`, { method: 'POST' });
};

export const unlikeStory = async (storyId: string) => {
    return await apiFetch(`/stories/${storyId}/like`, { method: 'DELETE' });
};

export const deleteStory = async (storyId: string) => {
    return await apiFetch(`/stories/${storyId}`, { method: 'DELETE' });
};

export const getStoryById = async (storyId: string) => {
    return await apiFetch(`/stories/${storyId}`);
};
