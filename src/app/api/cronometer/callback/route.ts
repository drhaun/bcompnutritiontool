import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/cronometer';
import { saveCronometerTokenToDatabase, persistTokenToEnvFile } from '@/lib/cronometer-token';

/**
 * OAuth callback handler
 * Receives the authorization code and exchanges it for an access token.
 * 
 * Stores the token in:
 *   1. httpOnly cookies (for fast access on this device)
 *   2. Supabase database (for cross-device persistence)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // Check for error from Cronometer
  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?cronometer_error=${encodeURIComponent(error)}`, request.url)
    );
  }
  
  // Verify code is present
  if (!code) {
    return NextResponse.redirect(
      new URL('/settings?cronometer_error=no_code', request.url)
    );
  }
  
  // Verify state matches (CSRF protection)
  const storedState = request.cookies.get('cronometer_oauth_state')?.value;
  if (state && storedState && state !== storedState) {
    return NextResponse.redirect(
      new URL('/settings?cronometer_error=state_mismatch', request.url)
    );
  }
  
  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);
    
    // Create response that redirects to settings with success
    const response = NextResponse.redirect(
      new URL('/settings?cronometer_connected=true', request.url)
    );
    
    // Store the access token in a secure httpOnly cookie (for this device)
    response.cookies.set('cronometer_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year (tokens don't expire unless revoked)
      path: '/',
    });
    
    response.cookies.set('cronometer_user_id', tokenData.user_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
    
    // Clear the state cookie
    response.cookies.delete('cronometer_oauth_state');

    // In development, auto-save the fresh token to .env.local so it
    // survives server restarts without manual cookie copying.
    persistTokenToEnvFile(tokenData.access_token, tokenData.user_id);
    
    // Also persist the token to the database for cross-device access.
    // This runs async but we don't block the redirect on it.
    // If it fails, the cookie still works on this device.
    try {
      const saved = await saveCronometerTokenToDatabase(
        request,
        tokenData.access_token,
        tokenData.user_id
      );
      if (saved) {
        console.log('[Cronometer Callback] Token persisted to database for cross-device access');
      } else {
        console.warn('[Cronometer Callback] Could not persist token to database - cookie-only mode');
      }
    } catch (dbError) {
      console.error('[Cronometer Callback] Database persistence error (non-fatal):', dbError);
    }
    
    return response;
  } catch (err) {
    console.error('Cronometer token exchange error:', err);
    return NextResponse.redirect(
      new URL(`/settings?cronometer_error=${encodeURIComponent('token_exchange_failed')}`, request.url)
    );
  }
}
