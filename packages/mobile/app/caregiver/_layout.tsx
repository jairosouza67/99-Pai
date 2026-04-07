import { Stack } from 'expo-router';

export default function CaregiverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
    </Stack>
  );
}