import { apiFetch } from './client';
export const uploadMultipleMedia = async (uris: { uri: string, type: string }[]) => {
    const formData = new FormData();

    uris.forEach((item, index) => {
        const uriParts = item.uri.split('.');
        const fileExt = uriParts[uriParts.length - 1];
        const fileName = `file_${index}.${fileExt}`;

        formData.append('files', {
            uri: item.uri,
            name: fileName,
            type: item.type === 'video' ? `video/${fileExt}` : `image/${fileExt}`,
        } as any);
    });

    const response = await apiFetch('/upload', {
        method: 'POST',
        headers: {
            // 'Content-Type': 'multipart/form-data' // Fetch handles this automatically with FormData
        },
        body: formData,
    });

    return response.data;
};
export const uploadSingleMedia = async (uri: string, type: 'image' | 'video' = 'image') => {
    const res = await uploadMultipleMedia([{ uri, type }]);
    return res && res.length > 0 ? res[0] : null;
};
