import { Platform } from 'react-native';

const LOCAL_IP = '172.20.10.2';

export const API_URL = __DEV__
    ? (Platform.OS === 'android' ? `https://uniconn-be.onrender.com/api/v1` : `https://uniconn-be.onrender.com/api/v1`)
    : 'https://uniconn-be.onrender.com/api/v1';

export const SUPABASE_URL = 'https://njzqtsqvbnssbmsygfsz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_VYhCQwzDmXxABofHYxhAow_dKGfyzs4';
