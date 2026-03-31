import { apiFetch } from './client';

export const getStudyQuestions = async (params?: { subject?: string, page?: number }) => {
    let url = '/study/questions';
    if (params) {
        const query = new URLSearchParams();
        if (params.subject) query.append('subject', params.subject);
        if (params.page) query.append('page', params.page.toString());
        url += `?${query.toString()}`;
    }
    return await apiFetch(url);
};

export const getStudyQuestion = async (id: string) => {
    return await apiFetch(`/study/questions/${id}`);
};

export const createStudyQuestion = async (data: { title: string, content: string, subject: string, image_url?: string }) => {
    return await apiFetch('/study/questions', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getStudyAnswers = async (questionId: string) => {
    return await apiFetch(`/study/questions/${questionId}/answers`);
};

export const createStudyAnswer = async (questionId: string, data: { content: string, image_url?: string }) => {
    return await apiFetch(`/study/questions/${questionId}/answers`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const deleteStudyQuestion = async (id: string) => {
    return await apiFetch(`/study/questions/${id}`, {
        method: 'DELETE',
    });
};
