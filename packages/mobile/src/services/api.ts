import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extraApiUrl =
  typeof Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL === 'string'
    ? Constants.expoConfig.extra.EXPO_PUBLIC_API_URL.trim()
    : undefined;

const isWebLocalhost =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const fallbackBaseUrl = isWebLocalhost
  ? 'http://localhost:3000'
  : 'https://99pai-api.vercel.app';

const rawBaseUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  (Platform.OS === 'web' ? undefined : extraApiUrl) ||
  fallbackBaseUrl;

const normalizedBaseUrl = rawBaseUrl.replace(/\/$/, '');
const apiBaseUrl = normalizedBaseUrl.endsWith('/api')
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/api`;

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data?.message === 'string') {
      return data.message;
    }
    if (Array.isArray(data?.message) && data.message.length > 0) {
      return String(data.message[0]);
    }
    if (typeof data?.error === 'string') {
      return data.error;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
