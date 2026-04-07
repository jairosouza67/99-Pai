import React from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { theme } from '../src/constants/theme';
import { Loading } from '../src/components/shared/Loading';
import { useEffect } from 'react';

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // Call the push notifications hook
  usePushNotifications();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inElderlyGroup = segments[0] === 'elderly';
    const inCaregiverGroup = segments[0] === 'caregiver';
    const inProviderGroup = segments[0] === 'provider';
    const inAdminGroup = segments[0] === 'admin';

    if (!user && !inAuthGroup) {
      router.replace('/auth/role-select');
    } else if (user?.role === 'elderly' && !inElderlyGroup && !inAuthGroup) {
      router.replace('/elderly/home');
    } else if (user?.role === 'caregiver' && !inCaregiverGroup && !inAuthGroup) {
      router.replace('/caregiver/dashboard');
    } else if (user?.role === 'provider' && !inProviderGroup && !inAuthGroup) {
      router.replace('/provider/dashboard');
    } else if (user?.role === 'admin' && !inAdminGroup && !inAuthGroup) {
      router.replace('/admin/dashboard');
    }
  }, [user, segments, isLoading, router]);

  if (isLoading) {
    return <Loading message="Carregando..." />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}