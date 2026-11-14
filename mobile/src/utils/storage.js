import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createTokenStore } from './tokenStore';

const tokens = createTokenStore({ native: Platform.OS !== 'web', plain: AsyncStorage, secure: {
  getItemAsync: (key) => SecureStore.getItemAsync(key),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
} });

const KEYS = {
  TOKEN: '@sangeetx_token',
  USER: '@sangeetx_user',
  SERVER_URL: '@sangeetx_server_url',
  LAST_PLAYED: '@sangeetx_last_played',
  LIKED_CACHE: '@sangeetx_liked_cache',
  VOLUME: '@sangeetx_volume',
};

export const storage = {
  async getToken() {
    return tokens.get();
  },
  async setToken(token) {
    await tokens.set(token);
  },

  async getUser() {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  async setUser(user) {
    if (user) {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(KEYS.USER);
    }
  },

  async getServerUrl() {
    return await AsyncStorage.getItem(KEYS.SERVER_URL);
  },
  async setServerUrl(url) {
    if (url) {
      await AsyncStorage.setItem(KEYS.SERVER_URL, url.trim().replace(/\/$/, ''));
    } else {
      await AsyncStorage.removeItem(KEYS.SERVER_URL);
    }
  },

  async clearAuth() {
    await Promise.all([tokens.set(null), AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER])]);
  },
};
