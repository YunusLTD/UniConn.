import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isSupported = Platform.OS !== 'web';

export const hapticLight = () => {
    if (isSupported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const hapticMedium = () => {
    if (isSupported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

export const hapticHeavy = () => {
    if (isSupported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
};

export const hapticSuccess = () => {
    if (isSupported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

export const hapticWarning = () => {
    if (isSupported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};

export const hapticError = () => {
    if (isSupported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
};

export const hapticSelection = () => {
    if (isSupported) Haptics.selectionAsync().catch(() => {});
};
