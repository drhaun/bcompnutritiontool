import { NextRequest, NextResponse } from 'next/server';
import { clearCronometerTokenFromDatabase } from '@/lib/cronometer-token';

/**
 * Disconnect the CURRENT staff member from Cronometer.
 *
 * IMPORTANT: We intentionally do NOT call Cronometer's /oauth/deauthorize
 * endpoint because per their API docs it "will invalidate ALL access tokens
 * associated with the user." Since the entire team shares one Cronometer
 * Pro account, revoking the token would disconnect every staff member.
 *
 * Instead we:
 *   1. Clear the token from the current user's staff DB row only
 *   2. Clear the local cookies
 *
 * Other staff members are unaffected. If the user wants to fully revoke
 * API access, they can do so from the Cronometer website under
 * Profile → Sharing.
 */
export async function POST(request: NextRequest) {
  // Clear the token from the current user's database row
  try {
    await clearCronometerTokenFromDatabase(request);
    console.log('[Cronometer] Token cleared from current user\'s DB row');
  } catch (error) {
    console.error('[Cronometer] Failed to clear token from database:', error);
  }

  // Create response
  const response = NextResponse.json({
    success: true,
    message: 'Disconnected from Cronometer (other staff members are unaffected)',
  });

  // Clear local cookies
  response.cookies.delete('cronometer_access_token');
  response.cookies.delete('cronometer_user_id');
  response.cookies.delete('cronometer_oauth_state');

  return response;
}
