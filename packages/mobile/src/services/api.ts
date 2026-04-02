import axios from 'axios';

const rawBaseUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:3000';

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
