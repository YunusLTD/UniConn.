import { Stack } from 'expo-router';

export default function SetupLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="profile-setup" />
            <Stack.Screen name="community-setup" />
        </Stack>
    );
}
