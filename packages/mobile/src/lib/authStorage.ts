import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { User } from '../types';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

const tokenStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const authStorage = {
  async getToken() {
    return tokenStorage.getItem(AUTH_TOKEN_KEY);
  },

  async setToken(token: string) {
    await tokenStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  async removeToken() {
    await tokenStorage.removeItem(AUTH_TOKEN_KEY);
  },

  async getUser() {
    const value = await AsyncStorage.getItem(AUTH_USER_KEY);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as User;
    } catch {
      return null;
    }
  },

  async setUser(user: User) {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  async removeUser() {
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  },

  async clear() {
    await Promise.all([this.removeToken(), this.removeUser()]);
  },
};
