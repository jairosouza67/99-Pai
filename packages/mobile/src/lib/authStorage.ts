import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export const authStorage = {
  async getToken() {
    return AsyncStorage.getItem(AUTH_TOKEN_KEY);
  },

  async setToken(token: string) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  async removeToken() {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
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
