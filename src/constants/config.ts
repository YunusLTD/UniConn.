import { Platform } from 'react-native';

// For Simulators: iOS uses localhost, Android uses 10.0.2.2
// For Real Devices: Use your machine's local IP address (e.g., 192.168.x.x)
export const API_URL = Platform.OS === 'android'
    ? 'http://10.0.2.2:4000/api/v1'
    : 'http://172.20.10.2:4000/api/v1';

export const SUPABASE_URL = 'https://njzqtsqvbnssbmsygfsz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_VYhCQwzDmXxABofHYxhAow_dKGfyzs4';
