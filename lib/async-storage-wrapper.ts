/**
 * AsyncStorage Wrapper
 *
 * Fixes "window is not defined" error by properly detecting platform
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Re-export AsyncStorage with platform detection
export default AsyncStorage;

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
