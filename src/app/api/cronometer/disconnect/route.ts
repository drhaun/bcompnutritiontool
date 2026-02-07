import { NextRequest, NextResponse } from 'next/server';
import { deauthorizeUser } from '@/lib/cronometer';
import { resolveCronometerToken, clearCronometerTokenFromDatabase } from '@/lib/cronometer-token';

/**
 * Disconnect from Cronometer
 * Clears token from:
 *   1. Cronometer's side (revoke token via API)
 *   2. Supabase database (cross-device persistence)
 *   3. Local cookies
 */
export async function POST(request: NextRequest) {
  // Resolve the token to revoke it on Cronometer's side
  const tokenResult = await resolveCronometerToken(request);
  const accessToken = tokenResult.accessToken;
  
  // Try to revoke the token on Cronometer's side (optional, may fail)
  if (accessToken) {
    try {
      await deauthorizeUser(accessToken);
      console.log('[Cronometer] Token revoked on Cronometer side');
    } catch (error) {
      // Token revocation failed - that's okay, we'll still clear local storage
      console.log('[Cronometer] Token revocation failed (may already be invalid):', error);
    }
  }
  
  // Clear the token from the database
  try {
    await clearCronometerTokenFromDatabase(request);
    console.log('[Cronometer] Token cleared from database');
  } catch (error) {
    console.error('[Cronometer] Failed to clear token from database:', error);
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
