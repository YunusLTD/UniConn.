import { apiFetch } from './client';

export const getCommunityPosts = async (communityId: string, page = 1) => {
    return await apiFetch(`/posts/community/${communityId}?page=${page}`);
};

export const getMyPosts = async (page = 1) => {
    return await apiFetch(`/posts/me?page=${page}`);
};

export const getUserPosts = async (userId: string, page = 1) => {
    return await apiFetch(`/posts/user/${userId}?page=${page}`);
};

export const createPost = async (communityId: string, data: { content: string, media_urls?: string[], media_types?: string[], image_url?: string | null }) => {
    return await apiFetch(`/posts/community/${communityId}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getPost = async (id: string) => {
    return await apiFetch(`/posts/${id}`);
};

export const votePost = async (id: string, value: number) => {
    return await apiFetch(`/posts/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ value }),
    });
};

export const getComments = async (id: string) => {
    return await apiFetch(`/posts/${id}/comments`);
};

export const addComment = async (id: string, content: string, parent_id?: string) => {
    const body: any = { content };
    if (parent_id) body.parent_id = parent_id;
    return await apiFetch(`/posts/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

export const updatePost = async (id: string, data: any) => {
    return await apiFetch(`/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
};

export const deletePost = async (id: string) => {
    return await apiFetch(`/posts/${id}`, { method: 'DELETE' });
};
