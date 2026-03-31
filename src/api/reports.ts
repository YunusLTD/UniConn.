import { apiFetch } from './client';

export const submitReport = async (data: { target_type: string, target_id: string, reason: string }) => {
    return await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getReports = async (options?: { status?: string, page?: number, limit?: number }) => {
    const queryParams = new URLSearchParams(options as any).toString();
    return await apiFetch(`/reports${queryParams ? `?${queryParams}` : ''}`);
};

export const updateReportStatus = async (id: string, status: string) => {
    return await apiFetch(`/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
};
