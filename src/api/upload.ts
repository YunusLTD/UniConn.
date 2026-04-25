import { apiFetch } from './client';

const normalizeExtension = (uri: string) => {
    const cleanUri = uri.split('?')[0] || '';
    const ext = cleanUri.includes('.') ? cleanUri.split('.').pop() || '' : '';
    return ext.trim().toLowerCase();
};

const getMediaMimeType = (type: string, uri: string) => {
    const extension = normalizeExtension(uri);

    if (type === 'video') {
        if (extension === 'mov') return 'video/quicktime';
        if (extension === 'webm') return 'video/webm';
        return 'video/mp4';
    }

    if (extension === 'png') return 'image/png';
    if (extension === 'webp') return 'image/webp';
    if (extension === 'gif') return 'image/gif';
    if (extension === 'heic') return 'image/heic';
    return 'image/jpeg';
};

export const uploadMultipleMedia = async (uris: { uri: string, type: string }[]) => {
    const formData = new FormData();

    uris.forEach((item, index) => {
        const fileExt = normalizeExtension(item.uri) || (item.type === 'video' ? 'mp4' : 'jpg');
        const fileName = `file_${index}.${fileExt}`;

        formData.append('files', {
            uri: item.uri,
            name: fileName,
            type: getMediaMimeType(item.type, item.uri),
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
