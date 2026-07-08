/**
 * Supabase Client Configuration
 *
 * Configures the Supabase client with cross-platform storage persistence
 * Uses localStorage on web, AsyncStorage on native
 */

import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { customStorage } from "./async-storage-wrapper";

// Environment variables for Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file."
  );
}

/**
 * Supabase client with cross-platform storage persistence
 *
 * This client automatically:
 * - Persists auth session (localStorage on web, AsyncStorage on native)
 * - Restores session on app restart
 * - Handles token refresh automatically
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    // Keep false on all platforms — password recovery tokens are parsed
    // manually in reset-password.tsx so they're never written to localStorage,
    // preventing unauthenticated tabs from being signed in before the user
    // has actually set a new password.
    detectSessionInUrl: false,
  },
});
