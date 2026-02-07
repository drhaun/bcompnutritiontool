import { NextRequest, NextResponse } from 'next/server';
import { isCronometerConfigured } from '@/lib/cronometer';
import { resolveCronometerToken, backfillCronometerCookies } from '@/lib/cronometer-token';

/**
 * Check Cronometer connection status
 * 
 * Token resolution order (database is source of truth):
 * 1. Database (Supabase staff record - cross-device, always latest)
 * 2. Cookie (fast fallback when DB unavailable)
 * 3. Environment variable (for local development convenience)
 */
export async function GET(request: NextRequest) {
  const isConfigured = isCronometerConfigured();
  
  // Use the shared token resolver (DB → cookie → env)
  const tokenResult = await resolveCronometerToken(request);
  
  let response = NextResponse.json({
    configured: isConfigured,
    connected: !!(tokenResult.accessToken && tokenResult.userId),
    userId: tokenResult.userId || null,
    tokenSource: tokenResult.source, // Helpful for debugging
  });

  // If the token came from the database, backfill/update the cookie
  // so subsequent requests on this device are fast and use the latest token
  response = backfillCronometerCookies(response, tokenResult);
  
  return response;
}
