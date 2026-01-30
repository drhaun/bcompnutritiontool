import { NextRequest, NextResponse } from 'next/server';
import { deauthorizeUser } from '@/lib/cronometer';

/**
 * Disconnect from Cronometer
 * Clears local cookies and optionally revokes the token on Cronometer's side
 */
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('cronometer_access_token')?.value
    || process.env.CRONOMETER_ACCESS_TOKEN;
  
  // Try to revoke the token on Cronometer's side (optional, may fail)
  if (accessToken) {
    try {
      await deauthorizeUser(accessToken);
      console.log('[Cronometer] Token revoked successfully');
    } catch (error) {
      // Token revocation failed - that's okay, we'll still clear local cookies
      console.log('[Cronometer] Token revocation failed (may already be invalid):', error);
    }
  }
  
  // Create response
  const response = NextResponse.json({ 
    success: true, 
    message: 'Disconnected from Cronometer' 
  });
  
  // Clear all Cronometer cookies
  response.cookies.delete('cronometer_access_token');
  response.cookies.delete('cronometer_user_id');
  response.cookies.delete('cronometer_oauth_state');
  
  return response;
}
