import { Platform } from 'react-native';

// On Android emulator, localhost is 10.0.2.2. On iOS simulator, it's localhost.
export const API_URL = Platform.OS === 'android' ? 'http://[IP_ADDRESS]/api/v1' : 'http://172.20.10.2:3000/api/v1';

export const SUPABASE_URL = 'https://njzqtsqvbnssbmsygfsz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_VYhCQwzDmXxABofHYxhAow_dKGfyzs4';
