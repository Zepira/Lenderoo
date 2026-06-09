/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the app using Supabase Auth
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User } from '../lib/types';

// ============================================================================
// Types
// ============================================================================

interface AuthContextType {
  // Auth state
  session: Session | null;
  user: SupabaseUser | null;
  appUser: User | null;
  loading: boolean;

  // Auth methods
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load initial session and set up auth state listener
  useEffect(() => {
    // Get initial session — catch refresh errors silently (expired/invalid
    // refresh token throws AuthApiError; let the auth listener handle routing)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadAppUser(session.user.id);
      } else if (__DEV__) {
        const devEmail = process.env.EXPO_PUBLIC_DEV_EMAIL;
        const devPassword = process.env.EXPO_PUBLIC_DEV_PASSWORD;
        if (devEmail && devPassword) {
          // Auto-sign-in with test credentials in development.
          // onAuthStateChange will fire and update state when this resolves.
          supabase.auth.signInWithPassword({ email: devEmail, password: devPassword })
            .catch(() => setLoading(false));
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Expired/invalid refresh token — clear state silently so the root
      // layout redirects to sign-in without surfacing an error to the user.
      if (event === 'TOKEN_REFRESH_FAILED') {
        setSession(null);
        setUser(null);
        setAppUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadAppUser(session.user.id);
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load app user profile from users table
  async function loadAppUser(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setAppUser({
          id: data.id,
          email: data.email,
          name: data.name,
          avatarUrl: data.avatar_url,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        });
      }
    } catch (error) {
      console.error('Error loading app user:', error);
    } finally {
      setLoading(false);
    }
  }

  // Sign up with email and password
  async function signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) throw error;

    // Note: User profile will be auto-created by database trigger
    // We'll load it when the session is established
  }

  // Sign in with email and password
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  }

  // Sign out
  async function signOut() {
    try {
      console.log('🚪 Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Supabase signOut error:', error);
        throw error;
      }
      console.log('✅ Sign out successful');
    } finally {
      // Always clear local state, even if signOut fails
      // The auth state listener will also update when session changes
      setSession(null);
      setUser(null);
      setAppUser(null);
    }
  }

  // Send password reset email
  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'lenderoo://reset-password',
    });

    if (error) throw error;
  }

  // Update user profile
  async function updateProfile(updates: Partial<User>) {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        avatar_url: updates.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;

    // Reload user profile
    await loadAppUser(user.id);
  }

  const value: AuthContextType = {
    session,
    user,
    appUser,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access authentication state and methods
 *
 * @example
 * const { user, signIn, signOut } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
