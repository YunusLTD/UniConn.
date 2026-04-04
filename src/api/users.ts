import { apiFetch } from './client';

export const getProfile = async () => {
    return await apiFetch('/users/profile');
};

export const getUser = async (id: string) => {
    return await apiFetch(`/users/${id}`);
};

export const updateProfile = async (data: { 
    name?: string, bio?: string, avatar_url?: string, push_token?: string, username?: string,
    hometown?: string, age?: number, relationship_status?: string, 
    department?: string, year_of_study?: number,
    hide_friends_list?: boolean, friends_only_messages?: boolean 
}) => {
    return await apiFetch('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
};

export const searchUsers = async (query: string) => {
    return await apiFetch(`/users/search?q=${encodeURIComponent(query)}`);
};

export const getByUsername = async (username: string) => {
    return await apiFetch(`/users/username/${username}`);
};

export const blockUser = async (targetId: string) => {
    return await apiFetch(`/users/${targetId}/block`, { method: 'POST' });
};

export const unblockUser = async (targetId: string) => {
    return await apiFetch(`/users/${targetId}/unblock`, { method: 'POST' });
};

export const deleteAccount = async () => {
    return await apiFetch('/users/account', { method: 'DELETE' });
};

export const submitVerification = async (data: { university_id: string, department: string, year_of_study: string, student_id_url: string }) => {
    return await apiFetch('/users/verify', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const sendVerificationEmail = async () => {
    return await apiFetch('/verification/send-email', { method: 'POST' });
};

export const verifyEmail = async (token: string) => {
    return await apiFetch('/verification/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });
};
