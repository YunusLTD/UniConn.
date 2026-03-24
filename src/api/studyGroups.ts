import { apiFetch } from './client';

export const getStudyGroups = async (communityId: string) => {
    return await apiFetch(`/study-groups/community/${communityId}`);
};

export const createStudyGroup = async (communityId: string, data: any) => {
    return await apiFetch(`/study-groups/community/${communityId}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getStudyGroup = async (id: string) => {
    return await apiFetch(`/study-groups/${id}`);
};

export const joinStudyGroup = async (id: string) => {
    return await apiFetch(`/study-groups/${id}/join`, { method: 'POST' });
};

export const leaveStudyGroup = async (id: string) => {
    return await apiFetch(`/study-groups/${id}/leave`, { method: 'POST' });
};

export const deleteStudyGroup = async (id: string) => {
    return await apiFetch(`/study-groups/${id}`, { method: 'DELETE' });
};
