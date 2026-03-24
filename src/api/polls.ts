import { apiFetch } from './client';

export const getPolls = async (communityId: string) => {
    return await apiFetch(`/polls/community/${communityId}`);
};

export const getMyPolls = async (page = 1) => {
    return await apiFetch(`/polls/me?page=${page}`);
};

export const getUserPolls = async (userId: string, page = 1) => {
    return await apiFetch(`/polls/user/${userId}?page=${page}`);
};

export const createPoll = async (communityId: string, data: any) => {
    return await apiFetch(`/polls/community/${communityId}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getPoll = async (id: string) => {
    return await apiFetch(`/polls/${id}`);
};

export const voteInPoll = async (id: string, option_id: string) => {
    return await apiFetch(`/polls/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ option_id }),
    });
};

export const deletePoll = async (id: string) => {
    return await apiFetch(`/polls/${id}`, { method: 'DELETE' });
};
