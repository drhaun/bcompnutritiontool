'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isAuthenticated, isLoading: authLoading, isConfigured } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [justSignedOut, setJustSignedOut] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    // Check if user just signed out (don't auto-redirect back)
    if (searchParams.get('signedout') === '1') {
      setJustSignedOut(true);
    }
  }, [searchParams]);

  // Redirect if authenticated (either already or after login)
  // But NOT if user just signed out
  useEffect(() => {
    console.log('[LoginPage] Auth state check:', { isAuthenticated, authLoading, isLoading, justSignedOut });
    if (isAuthenticated && !justSignedOut && !authLoading) {
      console.log('[LoginPage] Authenticated! Redirecting to home...');
      router.replace('/');
    }
  }, [isAuthenticated, authLoading, justSignedOut, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    console.log('[Login] Attempting sign in for:', email);

    try {
      const { error: signInError } = await signIn(email, password);
      console.log('[Login] Sign in result:', signInError ? `Error: ${signInError}` : 'Success');
      
      if (signInError) {
        setError(signInError);
        setIsLoading(false);
      } else {
        console.log('[Login] Sign in successful, redirecting...');
        // Clear the justSignedOut flag so redirect works
        setJustSignedOut(false);
        // Redirect immediately on successful sign in
        router.replace('/');
      }
    } catch (err) {
      console.error('[Login] Unexpected error:', err);
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  // Show loading while checking auth state
  if (!isHydrated || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00263d] to-[#001a2b]">
        <Loader2 className="h-8 w-8 animate-spin text-[#c19962]" />
      </div>
    );
  }

  // If Supabase not configured, show local mode message
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00263d] to-[#001a2b] p-4">
        <Card className="w-full max-w-md border-[#c19962]/20 bg-white/95 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 relative w-48 h-16">
              <Image
                src="/images/fitomics-login-logo.png"
                alt="Fitomics"
                fill
                className="object-contain"
                priority
              />
            </div>
            <CardTitle className="text-2xl text-[#00263d]">Local Mode</CardTitle>
            <CardDescription>
              Supabase is not configured. Running in local-only mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-[#c19962]/30 bg-[#c19962]/10">
              <AlertCircle className="h-4 w-4 text-[#c19962]" />
              <AlertDescription className="text-[#00263d]">
                Authentication is disabled. Data is stored locally in your browser.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => router.push('/')}
              className="w-full bg-[#00263d] hover:bg-[#003a5c] text-white"
            >
              Continue to App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00263d] to-[#001a2b] p-4">
      <Card className="w-full max-w-md border-[#c19962]/20 bg-white/95 backdrop-blur shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-6 relative w-56 h-16">
            <Image
              src="/images/fitomics-login-logo.png"
              alt="Fitomics"
              fill
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold text-[#00263d]">
            Nutrition Planning OS
          </CardTitle>
          <CardDescription className="text-gray-600">
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#00263d]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="coach@fitomics.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="border-gray-300 focus:border-[#c19962] focus:ring-[#c19962]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#00263d]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="border-gray-300 focus:border-[#c19962] focus:ring-[#c19962]"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#00263d] hover:bg-[#003a5c] text-white font-medium py-5"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Contact your administrator for account access
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00263d] to-[#001a2b]">
        <Loader2 className="h-8 w-8 animate-spin text-[#c19962]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
