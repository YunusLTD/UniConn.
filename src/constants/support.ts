import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || {}) as Record<string, any>;

export const SUPPORT_EMAIL =
    typeof extra.supportEmail === 'string' && extra.supportEmail.trim().length > 0
        ? extra.supportEmail.trim()
        : 'support@uniconn.app';
