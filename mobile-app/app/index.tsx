import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { Loading } from '../src/components/shared/Loading';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (!user) {
    return <Redirect href="/auth/role-select" />;
  }

  if (user.role === 'elderly') {
    return <Redirect href="/elderly/home" />;
  }

  if (user.role === 'caregiver') {
    return <Redirect href="/caregiver/dashboard" />;
  }

  if (user.role === 'provider') {
    return <Redirect href="/provider/dashboard" />;
  }

  if (user.role === 'admin') {
    return <Redirect href="/admin/dashboard" />;
  }

  return <Redirect href="/auth/role-select" />;
}