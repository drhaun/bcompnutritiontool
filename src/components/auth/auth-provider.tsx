'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { 
  signIn, 
  signOut, 
  signUp, 
  getStaffProfile,
  onAuthStateChange,
  isAdmin,
  canViewAllClients,
  type StaffUser
} from '@/lib/auth';

// Re-export helper functions
export { isAdmin, canViewAllClients };
import { isSupabaseConfigured } from '@/lib/supabase';
import { useFitomicsStore } from '@/lib/store';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  staff: StaffUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, metadata?: { name?: string; role?: 'admin' | 'coach' | 'nutritionist' }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Always set loading to false after a maximum timeout to prevent infinite spinner
    const timeout = setTimeout(() => {
      console.log('[AuthProvider] Timeout reached, forcing isLoading=false');
      setIsLoading(false);
    }, 8000); // Increased to 8s to allow staff profile to load

    // Skip auth if Supabase not configured
    if (!isSupabaseConfigured) {
      console.log('[AuthProvider] Supabase not configured, skipping auth');
      setIsLoading(false);
      clearTimeout(timeout);
      return;
    }

    // Note: We don't call initAuth() anymore because getSession() hangs.
    // Instead, we rely entirely on onAuthStateChange which fires immediately with the cached session.
    console.log('[AuthProvider] Waiting for onAuthStateChange to fire with cached session...');

    // Subscribe to auth changes - Use session data directly, don't call additional API methods
    const { data: { subscription } } = onAuthStateChange(async (event, newSession) => {
      console.log('[AuthProvider] Auth state changed:', event, 'has session:', !!newSession);
      setSession(newSession);
      
      if (newSession?.user) {
        // Use user from session directly - don't call getCurrentUser() as it may hang
        console.log('[AuthProvider] onAuthStateChange - User from session:', newSession.user.id);
        setUser(newSession.user);
        
        // Clear timeout since we have auth now
        clearTimeout(timeout);
        
        // Fetch staff profile with proper error logging - pass userId directly to avoid hanging
        console.log('[AuthProvider] onAuthStateChange - Fetching staff profile for:', newSession.user.id);
        try {
          const staffProfile = await getStaffProfile(newSession.user.id);
          console.log('[AuthProvider] onAuthStateChange - Staff profile:', staffProfile);
          setStaff(staffProfile);
        } catch (err) {
          console.error('[AuthProvider] onAuthStateChange - Staff profile error:', err);
        }
        
        // Set loading false now that we have user and staff
        setIsLoading(false);
        
        // Trigger client sync with database
        useFitomicsStore.getState().setAuthenticated(true);
      } else {
        setUser(null);
        setStaff(null);
        setIsLoading(false);
        
        // Mark as not authenticated
        useFitomicsStore.getState().setAuthenticated(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    console.log('[AuthProvider] signIn called');
    const result = await signIn(email, password);
    console.log('[AuthProvider] signIn result:', { 
      hasUser: !!result.user, 
      hasSession: !!result.session,
      error: result.error 
    });
    
    if (!result.error && result.user) {
      setUser(result.user);
      setSession(result.session);
      console.log('[AuthProvider] User and session set, fetching staff profile for:', result.user.id);
      const staffProfile = await getStaffProfile(result.user.id);
      console.log('[AuthProvider] Staff profile:', staffProfile);
      setStaff(staffProfile);
      
      // Trigger client sync with database
      console.log('[AuthProvider] Triggering client sync...');
      useFitomicsStore.getState().setAuthenticated(true);
    }
    return { error: result.error };
  };

  const handleSignUp = async (
    email: string, 
    password: string, 
    metadata?: { name?: string; role?: 'admin' | 'coach' | 'nutritionist' }
  ) => {
    const result = await signUp(email, password, metadata);
    return { error: result.error };
  };

  const handleSignOut = async () => {
    console.log('[AuthProvider] Signing out...');
    await signOut();
    setUser(null);
    setSession(null);
    setStaff(null);
    // Clear the store's authenticated state
    useFitomicsStore.getState().setAuthenticated(false);
    console.log('[AuthProvider] Sign out complete');
  };

  const value: AuthContextType = {
    user,
    session,
    staff,
    isLoading,
    isAuthenticated: !!session,
    isConfigured: isSupabaseConfigured,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
