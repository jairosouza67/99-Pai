import { Stack } from 'expo-router';

export default function ElderlyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="home" options={{ headerShown: false }} />
    </Stack>
  );
}