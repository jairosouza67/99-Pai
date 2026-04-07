import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="role-select" options={{ headerShown: false }} />
    </Stack>
  );
}