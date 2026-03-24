import { apiFetch } from './client';

export const register = async (data: any) => {
    return await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const login = async (data: any) => {
    return await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
