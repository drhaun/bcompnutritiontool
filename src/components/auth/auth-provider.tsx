'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { 
  signIn, 
  signOut, 
  signUp, 
  getSession, 
  getCurrentUser,
  getStaffProfile,
  onAuthStateChange,
  type StaffUser
} from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

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
    }, 3000);

    // Skip auth if Supabase not configured
    if (!isSupabaseConfigured) {
      console.log('[AuthProvider] Supabase not configured, skipping auth');
      setIsLoading(false);
      clearTimeout(timeout);
      return;
    }

    // Get initial session
    const initAuth = async () => {
      try {
        const currentSession = await getSession();
        setSession(currentSession);
        
        if (currentSession) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
          
          // Staff profile is optional - don't block on it
          getStaffProfile().then(setStaff).catch(() => {});
        }
      } catch (error) {
        console.error('[AuthProvider] Auth error:', error);
      } finally {
        setIsLoading(false);
        clearTimeout(timeout);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = onAuthStateChange(async (event, newSession) => {
      console.log('[AuthProvider] Auth state changed:', event);
      setSession(newSession);
      
      if (newSession) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        getStaffProfile().then(setStaff).catch(() => {});
      } else {
        setUser(null);
        setStaff(null);
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
      console.log('[AuthProvider] User and session set, fetching staff profile...');
      const staffProfile = await getStaffProfile();
      console.log('[AuthProvider] Staff profile:', staffProfile);
      setStaff(staffProfile);
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
    await signOut();
    setUser(null);
    setSession(null);
    setStaff(null);
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
