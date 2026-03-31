import { apiFetch } from './client';

export const sendFriendRequest = async (userId: string) => {
    return await apiFetch(`/friends/request`, {
        method: 'POST',
        body: JSON.stringify({ to_user_id: userId }),
    });
};

export const respondToFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    return await apiFetch(`/friends/respond`, {
        method: 'POST',
        body: JSON.stringify({ request_id: requestId, action }),
    });
};

export const getFriendRequests = async () => {
    return await apiFetch('/friends/requests');
};

export const getFriendsList = async (userId?: string) => {
    const url = userId ? `/friends/list?user_id=${userId}` : '/friends/list';
    return await apiFetch(url);
};

export const getFriendshipStatus = async (userId: string) => {
    return await apiFetch(`/friends/status/${userId}`);
};

export const removeFriend = async (userId: string) => {
    return await apiFetch(`/friends/${userId}`, { method: 'DELETE' });
};

export const getFriendsCount = async (userId?: string) => {
    const url = userId ? `/friends/count?user_id=${userId}` : '/friends/count';
    return await apiFetch(url);
};
