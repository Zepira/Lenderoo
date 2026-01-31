/**
 * Unified Toast API
 *
 * Platform-specific toast implementation:
 * - Mobile (iOS/Android): uses burnt (native toasts) or Alert fallback in Expo Go
 * - Web: uses sonner (React-based toasts)
 */

import { Platform, Alert } from "react-native";
import { toast as sonnerToast } from "sonner";

// Try to import burnt, but gracefully handle if it's not available (Expo Go)
let Burnt: any = null;
try {
  Burnt = require("burnt");
} catch (e) {
  console.log("Burnt module not available, using Alert fallback");
}

export type ToastOptions = {
  title?: string;
  description?: string;
  duration?: number;
};

/**
 * Show a generic toast message
 */
export function show(message: string, options?: ToastOptions) {
  if (Platform.OS === "web") {
    sonnerToast(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 3000,
    });
  } else {
    if (Burnt) {
      Burnt.toast({
        title: options?.title || message,
        preset: "none",
        haptic: "none",
        duration: (options?.duration || 3000) / 1000,
      });
    } else {
      // Fallback to Alert for Expo Go
      Alert.alert(options?.title || "Info", message);
    }
  }
}

/**
 * Show a success toast
 */
export function success(message: string, options?: ToastOptions) {
  if (Platform.OS === "web") {
    sonnerToast.success(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 3000,
    });
  } else {
    if (Burnt) {
      Burnt.toast({
        title: options?.title || message,
        preset: "done",
        haptic: "success",
        duration: (options?.duration || 3000) / 1000,
      });
    } else {
      // Fallback to Alert for Expo Go
      Alert.alert("✓ " + (options?.title || "Success"), message);
    }
  }
}

/**
 * Show an error toast
 */
export function error(message: string, options?: ToastOptions) {
  if (Platform.OS === "web") {
    sonnerToast.error(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 3000,
    });
  } else {
    if (Burnt) {
      Burnt.alert({
        title: options?.title || message,
        preset: "error",
        duration: (options?.duration || 3000) / 1000,
      });
    } else {
      // Fallback to Alert for Expo Go
      Alert.alert("✗ " + (options?.title || "Error"), message);
    }
  }
}

/**
 * Show a warning toast
 */
export function warning(message: string, options?: ToastOptions) {
  if (Platform.OS === "web") {
    sonnerToast.warning(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 3000,
    });
  } else {
    if (Burnt) {
      Burnt.toast({
        title: options?.title || message,
        preset: "none",
        haptic: "warning",
        duration: (options?.duration || 3000) / 1000,
      });
    } else {
      // Fallback to Alert for Expo Go
      Alert.alert("⚠ " + (options?.title || "Warning"), message);
    }
  }
}

/**
 * Show an info toast
 */
export function info(message: string, options?: ToastOptions) {
  if (Platform.OS === "web") {
    sonnerToast.info(options?.title || message, {
      description: options?.description,
      duration: options?.duration || 3000,
    });
  } else {
    if (Burnt) {
      Burnt.toast({
        title: options?.title || message,
        preset: "none",
        haptic: "none",
        duration: (options?.duration || 3000) / 1000,
      });
    } else {
      // Fallback to Alert for Expo Go
      Alert.alert("ℹ " + (options?.title || "Info"), message);
    }
  }
}

/**
 * Dismiss all toasts (web only)
 */
export function dismiss() {
  if (Platform.OS === "web") {
    sonnerToast.dismiss();
  }
}

export const showToast = {
  show,
  success,
  error,
  warning,
  info,
  dismiss,
};

export default showToast;
