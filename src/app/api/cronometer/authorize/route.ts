import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl, isCronometerConfigured } from '@/lib/cronometer';

/**
 * Initiates the Cronometer OAuth flow
 * Redirects user to Cronometer's authorization page
 */
export async function GET(request: NextRequest) {
  if (!isCronometerConfigured()) {
    return NextResponse.json(
      { error: 'Cronometer API not configured' },
      { status: 500 }
    );
  }

  // Determine the callback URL based on the request origin
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/cronometer/callback`;
  
  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(2, 15);
  
  // Store state in a cookie for verification on callback
  const authUrl = getAuthorizationUrl(redirectUri, state);
  
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('cronometer_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  });
  
  return response;
}
