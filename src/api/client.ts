import { API_URL } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = await AsyncStorage.getItem('auth_token');

    const isFormData = options.body instanceof FormData;

    const headers: Record<string, string> = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        data = null;
    }

    if (!response.ok) {
        throw new Error(data?.message || data?.error || 'API request failed');
    }

    return data;
};
