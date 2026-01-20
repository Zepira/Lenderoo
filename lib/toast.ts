/**
 * Unified Toast API
 *
 * Platform-specific toast implementation:
 * - Mobile (iOS/Android): uses burnt (native toasts)
 * - Web: uses sonner (React-based toasts)
 */

import { Platform } from "react-native";
import { toast as sonnerToast } from "sonner";
import * as Burnt from "burnt";

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
    Burnt.toast({
      title: options?.title || message,
      preset: "none",
      haptic: "none",
      duration: (options?.duration || 3000) / 1000,
    });
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
    Burnt.toast({
      title: options?.title || message,
      preset: "done",
      haptic: "success",
      duration: (options?.duration || 3000) / 1000,
    });
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
    Burnt.alert({
      title: options?.title || message,
      preset: "error",
      duration: (options?.duration || 3000) / 1000,
    });
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
    Burnt.toast({
      title: options?.title || message,
      preset: "none",
      haptic: "warning",
      duration: (options?.duration || 3000) / 1000,
    });
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
    Burnt.toast({
      title: options?.title || message,
      preset: "none",
      haptic: "none",
      duration: (options?.duration || 3000) / 1000,
    });
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
