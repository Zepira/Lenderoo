/**
 * AsyncStorage Wrapper
 *
 * Fixes "window is not defined" error by properly detecting platform
 * Provides a unified storage interface for web (localStorage) and native (AsyncStorage)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Helper to ensure storage is available
export function isStorageAvailable(): boolean {
  try {
    if (Platform.OS === "web") {
      return (
        typeof window !== "undefined" &&
        typeof window.localStorage !== "undefined"
      );
    }
    return true; // Native platforms always have AsyncStorage
  } catch {
    return false;
  }
}

/**
 * Custom storage adapter that works on both web and native
 * Uses localStorage on web, AsyncStorage on native
 */
export const customStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      // Use localStorage on web
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    // Use AsyncStorage on native
    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      // Use localStorage on web
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    // Use AsyncStorage on native
    return AsyncStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      // Use localStorage on web
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    // Use AsyncStorage on native
    return AsyncStorage.removeItem(key);
  },
};

// Re-export AsyncStorage for direct use if needed
export default AsyncStorage;
