import { apiFetch } from './client';

export const getEvents = async (communityId: string, page = 1) => {
    return await apiFetch(`/events/community/${communityId}?page=${page}`);
};

export const getMyEvents = async (page = 1) => {
    return await apiFetch(`/events/me?page=${page}`);
};

export const getUserEvents = async (userId: string, page = 1) => {
    return await apiFetch(`/events/user/${userId}?page=${page}`);
};

export const getEvent = async (id: string) => {
    return await apiFetch(`/events/${id}`);
};

export const createEvent = async (communityId: string, data: any) => {
    return await apiFetch(`/events/community/${communityId}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const rsvpToEvent = async (id: string, status: 'going' | 'interested' | 'not_going') => {
    return await apiFetch(`/events/${id}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status }),
    });
};

export const updateEvent = async (id: string, data: any) => {
    return await apiFetch(`/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
};

export const deleteEvent = async (id: string) => {
    return await apiFetch(`/events/${id}`, { method: 'DELETE' });
};

export const toggleEventInterest = async (id: string) => {
    return await apiFetch(`/events/${id}/interest`, { method: 'POST' });
};
