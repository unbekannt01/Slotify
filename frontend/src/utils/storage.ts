import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
let inMemoryStore: Record<string, string> = {};

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      } else {
        inMemoryStore[key] = value;
      }
    } catch {
      inMemoryStore[key] = value;
    }
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn(`[SecureStore] Failed to save key "${key}":`, error);
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return inMemoryStore[key] || null;
    } catch {
      return inMemoryStore[key] || null;
    }
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`[SecureStore] Failed to read key "${key}":`, error);
    return null;
  }
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      delete inMemoryStore[key];
    } catch {
      delete inMemoryStore[key];
    }
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn(`[SecureStore] Failed to delete key "${key}":`, error);
  }
}
