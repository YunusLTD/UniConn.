import { apiFetch } from './client';

export const globalSearch = async (query: string) => {
    return await apiFetch(`/search?q=${encodeURIComponent(query)}`);
};
