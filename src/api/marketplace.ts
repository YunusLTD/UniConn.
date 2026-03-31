import { apiFetch } from './client';

export const getMarketplaceListings = async (communityId: string, page = 1) => {
    return await apiFetch(`/marketplace/community/${communityId}?page=${page}`);
};

export const getMarketplaceListing = async (id: string) => {
    return await apiFetch(`/marketplace/${id}`);
};

export const createMarketplaceListing = async (communityId: string, data: any) => {
    return await apiFetch(`/marketplace/community/${communityId}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const deleteMarketplaceListing = async (id: string) => {
    return await apiFetch(`/marketplace/${id}`, {
        method: 'DELETE',
    });
};
