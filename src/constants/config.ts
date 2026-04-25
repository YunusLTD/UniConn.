import { Platform } from 'react-native';

// For Simulators: iOS uses localhost, Android uses 10.0.2.2
// For Real Devices: Use your machine's local IP address (e.g., 192.168.x.x)
const LOCAL_IP = '172.20.10.2'; // Change this to your local IP if testing on real device

export const API_URL = __DEV__
    ? (Platform.OS === 'android' ? `https://uniconn-be.onrender.com/api/v11` : `https://uniconn-be.onrender.com/api/v1`)
    : 'https://uniconn-be.onrender.com/api/v1';

export const SUPABASE_URL = 'https://njzqtsqvbnssbmsygfsz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_VYhCQwzDmXxABofHYxhAow_dKGfyzs4';
