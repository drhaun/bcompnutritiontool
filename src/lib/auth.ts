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
  isActive: boolean;
  canViewAllClients: boolean;
  permissions: Record<string, boolean>;
  createdAt: string;
  authUserId: string;
}

/**
 * Check if user is an admin
 */
export function isAdmin(staff: StaffUser | null): boolean {
  return staff?.role === 'admin';
}

/**
 * Check if user can view all clients (admin or has permission)
 */
export function canViewAllClients(staff: StaffUser | null): boolean {
  if (!staff) return false;
  return staff.role === 'admin' || staff.canViewAllClients === true;
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
 * Clear invalid session (useful when refresh token errors occur)
 * This clears local storage and forces a clean state
 */
export async function clearInvalidSession(): Promise<void> {
  console.log('[Auth] Clearing invalid session...');
  
  // Clear Supabase auth from local storage
  if (typeof window !== 'undefined') {
    // Clear all Supabase-related keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      console.log('[Auth] Removing localStorage key:', key);
      localStorage.removeItem(key);
    });
  }
  
  // Also try to sign out properly (may fail if token is invalid, that's ok)
  if (supabase && isSupabaseConfigured) {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.log('[Auth] signOut during clearInvalidSession failed (expected):', e);
    }
  }
  
  console.log('[Auth] Invalid session cleared');
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  console.log('[Auth] getSession: Starting...');
  if (!supabase || !isSupabaseConfigured) {
    console.log('[Auth] getSession: Supabase not configured');
    return null;
  }

  try {
    console.log('[Auth] getSession: Calling supabase.auth.getSession()...');
    const { data, error } = await supabase.auth.getSession();
    console.log('[Auth] getSession: Got response, error:', error?.message || 'none');
    if (error) {
      console.error('[Auth] getSession error:', error);
      return null;
    }
    console.log('[Auth] getSession: Session exists:', !!data.session);
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
  console.log('[Auth] getCurrentUser: Starting...');
  if (!supabase || !isSupabaseConfigured) {
    console.log('[Auth] getCurrentUser: Supabase not configured');
    return null;
  }

  try {
    console.log('[Auth] getCurrentUser: Calling supabase.auth.getUser()...');
    const { data, error } = await supabase.auth.getUser();
    console.log('[Auth] getCurrentUser: Got response, user:', data.user?.id, 'error:', error?.message || 'none');
    return data.user;
  } catch (err) {
    console.error('[Auth] getCurrentUser exception:', err);
    return null;
  }
}

/**
 * Get staff profile for current user (or specified userId)
 */
export async function getStaffProfile(userId?: string): Promise<StaffUser | null> {
  if (!supabase || !isSupabaseConfigured) {
    console.log('[Auth] getStaffProfile: Supabase not configured');
    return null;
  }

  // If userId not provided, try to get from getCurrentUser (may hang in some cases)
  let authUserId = userId;
  if (!authUserId) {
    const user = await getCurrentUser();
    if (!user) {
      console.log('[Auth] getStaffProfile: No user logged in');
      return null;
    }
    authUserId = user.id;
  }

  console.log('[Auth] getStaffProfile: Fetching for user:', authUserId);
  
  // Try the query with retries (connection can be flaky)
  const maxRetries = 3;
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Auth] getStaffProfile: Attempt ${attempt}/${maxRetries}`);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => {
          resolve({ data: null, error: { message: `Staff query timed out after 10 seconds (attempt ${attempt})` } });
        }, 10000);
      });
      
      const queryPromise = supabase
        .from('staff')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      const { data, error } = result;

      if (error) {
        lastError = error;
        console.warn(`[Auth] getStaffProfile attempt ${attempt} failed:`, error.message || JSON.stringify(error));
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
          continue;
        }
      } else if (data) {
        console.log('[Auth] getStaffProfile: Found staff record:', data.role);
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          isActive: data.is_active ?? true,
          canViewAllClients: data.can_view_all_clients ?? false,
          permissions: data.permissions ?? {},
          createdAt: data.created_at,
          authUserId: data.auth_user_id,
        };
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Auth] getStaffProfile attempt ${attempt} exception:`, err);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
    }
  }
  
  // All retries failed
  if (lastError) {
    console.error('[Auth] getStaffProfile all retries failed:', lastError.message || JSON.stringify(lastError));
  } else {
    console.log('[Auth] getStaffProfile: No staff record found after retries');
  }
  return null;
}

/**
 * Get all staff members (admin only)
 */
export async function getAllStaff(): Promise<StaffUser[]> {
  if (!supabase || !isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('[Auth] getAllStaff error:', error);
    return [];
  }

  return data.map((s: any) => ({
    id: s.id,
    email: s.email,
    name: s.name,
    role: s.role,
    isActive: s.is_active ?? true,
    canViewAllClients: s.can_view_all_clients ?? false,
    permissions: s.permissions ?? {},
    createdAt: s.created_at,
    authUserId: s.auth_user_id,
  }));
}

/**
 * Update staff member (admin only)
 * Uses server-side API to bypass RLS issues
 */
export async function updateStaffMember(
  staffId: string, 
  updates: Partial<Pick<StaffUser, 'name' | 'role' | 'isActive' | 'canViewAllClients' | 'permissions'>>
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured' };
  }

  console.log('[Auth] Updating staff member:', staffId, 'with updates:', updates);

  try {
    // Use the server-side API route which has admin privileges
    const response = await fetch('/api/admin/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId,
        name: updates.name,
        role: updates.role,
        isActive: updates.isActive,
        canViewAllClients: updates.canViewAllClients,
        permissions: updates.permissions,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Auth] Update staff API error:', result.error);
      return { error: result.error || 'Failed to update staff record' };
    }

    console.log('[Auth] Staff record updated successfully');
    return { error: null };
  } catch (err) {
    console.error('[Auth] Update staff exception:', err);
    return { error: 'Network error updating staff record' };
  }
}

/**
 * Create staff record for existing auth user (admin only)
 * Uses server-side API to bypass RLS issues
 */
export async function createStaffForUser(
  authUserId: string,
  email: string,
  data: { name?: string; role?: 'admin' | 'coach' | 'nutritionist'; canViewAllClients?: boolean }
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase not configured' };
  }

  console.log('[Auth] Creating staff record for user:', authUserId, email);

  try {
    // Use the server-side API route which has admin privileges
    const response = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authUserId,
        email,
        name: data.name || null,
        role: data.role || 'coach',
        canViewAllClients: data.canViewAllClients || false,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Auth] Create staff API error:', result.error);
      return { error: result.error || 'Failed to create staff record' };
    }

    console.log('[Auth] Staff record created successfully');
    return { error: null };
  } catch (err) {
    console.error('[Auth] Create staff exception:', err);
    return { error: 'Network error creating staff record' };
  }
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
