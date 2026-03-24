import { apiFetch } from './client';
import { University } from '../types/models';

export const listUniversities = async (): Promise<{ status: string, data: University[] }> => {
    return await apiFetch('/universities');
};

export const requestUniversity = async (data: { name: string, domain?: string }) => {
    return await apiFetch('/universities/request-addition', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
