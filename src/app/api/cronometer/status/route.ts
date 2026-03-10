import { NextRequest, NextResponse } from 'next/server';
import { isCronometerConfigured } from '@/lib/cronometer';
import { resolveCronometerToken, backfillCronometerCookies } from '@/lib/cronometer-token';
import { requireStaffSession } from '@/lib/api-auth';

/**
 * Check Cronometer connection status
 * 
 * Token resolution order (database is source of truth):
 * 1. Database (Supabase staff record - cross-device, always latest)
 * 2. Cookie (fast fallback when DB unavailable)
 * 3. Environment variable (for local development convenience)
 */
export async function GET(request: NextRequest) {
  try {
    await requireStaffSession();
    const isConfigured = isCronometerConfigured();
    
    // Use the shared token resolver (DB → cookie → env)
    const tokenResult = await resolveCronometerToken(request);
    
    let response = NextResponse.json({
      configured: isConfigured,
      connected: !!(tokenResult.accessToken && tokenResult.userId),
      userId: tokenResult.userId || null,
      tokenSource: tokenResult.source,
    });

    response = backfillCronometerCookies(response, tokenResult);
    
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to resolve Cronometer status' }, { status: 500 });
  }
}
