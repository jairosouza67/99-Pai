import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
    </Stack>
  );
}
