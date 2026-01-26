'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Protects routes that require authentication.
 * If Supabase is not configured, allows access (local mode).
 * If Supabase is configured but user is not authenticated, redirects to login.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isConfigured } = useAuth();

  useEffect(() => {
    console.log('[AuthGuard] State:', { isLoading, isConfigured, isAuthenticated });
    
    // Only redirect if:
    // 1. We're done loading
    // 2. Supabase IS configured (not local mode)
    // 3. User is NOT authenticated
    if (!isLoading && isConfigured && !isAuthenticated) {
      console.log('[AuthGuard] Redirecting to login...');
      router.push('/login');
    }
  }, [isLoading, isConfigured, isAuthenticated, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c19962]" />
      </div>
    );
  }

  // If Supabase not configured, allow access (local mode)
  if (!isConfigured) {
    return <>{children}</>;
  }

  // If authenticated, show content
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Otherwise show loading while redirecting
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#c19962]" />
    </div>
  );
}
