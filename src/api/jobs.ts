import { apiFetch } from './client';

export const getJobs = async (communityId: string) => {
    return await apiFetch(`/jobs/community/${communityId}`);
};

export const getMyJobs = async (page = 1) => {
    return await apiFetch(`/jobs/me?page=${page}`);
};

export const getUserJobs = async (userId: string, page = 1) => {
    return await apiFetch(`/jobs/user/${userId}?page=${page}`);
};

export const createJob = async (communityId: string, data: any) => {
    return await apiFetch(`/jobs/community/${communityId}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getJob = async (id: string) => {
    return await apiFetch(`/jobs/${id}`);
};

export const updateJob = async (id: string, data: any) => {
    return await apiFetch(`/jobs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
};

export const deleteJob = async (id: string) => {
    return await apiFetch(`/jobs/${id}`, { method: 'DELETE' });
};
