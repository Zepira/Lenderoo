/**
 * Unified Toast API
 *
 * Platform-specific toast implementation:
 * - Mobile (iOS/Android): drawn by components/ToastHost (mounted in Provider)
 * - Web: uses sonner (React-based toasts)
 */

import { Platform } from "react-native";
import { toast as sonnerToast } from "sonner";

export type ToastOptions = {
  title?: string;
  description?: string;
  duration?: number;
};

type ToastKind = "success" | "error" | "warning" | "info" | "none";

export type NativeToast = {
  kind: ToastKind;
  title: string;
  description?: string;
  duration: number;
};

type Listener = (toast: NativeToast | null) => void;
const listeners = new Set<Listener>();

/** Used by ToastHost; a null toast means dismiss. */
export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function present(kind: ToastKind, message: string, options?: ToastOptions) {
  const duration = options?.duration || 3000;
  if (Platform.OS === "web") {
    const webToast = kind === "none" ? sonnerToast : sonnerToast[kind];
    webToast(options?.title || message, { description: options?.description, duration });
    return;
  }
  // With a title, the message becomes the second line.
  const title = options?.title || message;
  const description = options?.description ?? (options?.title ? message : undefined);
  for (const listener of listeners) listener({ kind, title, description, duration });
}

/**
 * Show a generic toast message
 */
export function show(message: string, options?: ToastOptions) {
  present("none", message, options);
}

/**
 * Show a success toast
 */
export function success(message: string, options?: ToastOptions) {
  present("success", message, options);
}

/**
 * Show an error toast
 */
export function error(message: string, options?: ToastOptions) {
  present("error", message, options);
}

/**
 * Show a warning toast
 */
export function warning(message: string, options?: ToastOptions) {
  present("warning", message, options);
}

/**
 * Show an info toast
 */
export function info(message: string, options?: ToastOptions) {
  present("info", message, options);
}

/**
 * Dismiss all toasts
 */
export function dismiss() {
  if (Platform.OS === "web") {
    sonnerToast.dismiss();
  } else {
    for (const listener of listeners) listener(null);
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
