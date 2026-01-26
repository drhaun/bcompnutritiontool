import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/cronometer';

/**
 * OAuth callback handler
 * Receives the authorization code and exchanges it for an access token
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
    
    // Store the access token in a secure cookie
    // In production, you'd want to store this in a database associated with the user
    response.cookies.set('cronometer_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year (tokens don't expire unless revoked)
    });
    
    response.cookies.set('cronometer_user_id', tokenData.user_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
    
    // Clear the state cookie
    response.cookies.delete('cronometer_oauth_state');
    
    return response;
  } catch (err) {
    console.error('Cronometer token exchange error:', err);
    return NextResponse.redirect(
      new URL(`/settings?cronometer_error=${encodeURIComponent('token_exchange_failed')}`, request.url)
    );
  }
}
