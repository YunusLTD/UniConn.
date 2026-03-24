import { apiFetch } from './client';

export const getFiles = async (communityId: string) => {
    return await apiFetch(`/files/community/${communityId}`);
};

export const uploadFile = async (communityId: string, formData: FormData) => {
    // Use bare fetch for FormData since client.ts assumes JSON
    const token = await (require('@react-native-async-storage/async-storage').default).getItem('auth_token');
    const response = await fetch(`${require('../constants/config').API_URL}/files/community/${communityId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });
    if (!response.ok) throw new Error('File upload failed');
    return await response.json();
};
