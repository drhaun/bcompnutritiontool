/**
 * Authentication utilities for staff/coach login
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface StaffUser {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'coach' | 'nutritionist';
  createdAt: string;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{
  user: User | null;
  session: Session | null;
  error: string | null;
}> {
  if (!supabase || !isSupabaseConfigured) {
    return { user: null, session: null, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, session: null, error: error.message };
  }

  return { user: data.user, session: data.session, error: null };
}

/**
 * Sign up a new staff member (admin only in production)
 */
export async function signUp(email: string, password: string, metadata?: {
  name?: string;
  role?: 'admin' | 'coach' | 'nutritionist';
}): Promise<{
  user: User | null;
  error: string | null;
}> {
  if (!supabase || !isSupabaseConfigured) {
    return { user: null, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: metadata?.name || null,
        role: metadata?.role || 'coach',
      },
    },
  });

  if (error) {
    return { user: null, error: error.message };
  }

  // After signup, create a staff record
  if (data.user) {
    await supabase.from('staff').insert({
      auth_user_id: data.user.id,
      email: email,
      name: metadata?.name || null,
      role: metadata?.role || 'coach',
    });
  }

  return { user: data.user, error: null };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: string | null }> {
  if (!supabase || !isSupabaseConfigured) {
    return { error: 'Supabase not configured' };
  }

  const { error } = await supabase.auth.signOut();
  return { error: error?.message || null };
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  if (!supabase || !isSupabaseConfigured) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Auth] getSession error:', error);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('[Auth] getSession exception:', err);
    return null;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!supabase || !isSupabaseConfigured) {
    return null;
  }

  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Get staff profile for current user
 */
export async function getStaffProfile(): Promise<StaffUser | null> {
  if (!supabase || !isSupabaseConfigured) {
    return null;
  }

  const user = await getCurrentUser();
  if (!user) return null;

  const { data } = await supabase
    .from('staff')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    createdAt: data.created_at,
  };
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  if (!supabase || !isSupabaseConfigured) {
    return { error: 'Supabase not configured' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
  });

  return { error: error?.message || null };
}

/**
 * Update password (for logged-in user)
 */
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  if (!supabase || !isSupabaseConfigured) {
    return { error: 'Supabase not configured' };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error: error?.message || null };
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  if (!supabase || !isSupabaseConfigured) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  return supabase.auth.onAuthStateChange(callback);
}
