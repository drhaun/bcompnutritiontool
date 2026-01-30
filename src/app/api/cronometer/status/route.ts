import { NextRequest, NextResponse } from 'next/server';
import { isCronometerConfigured } from '@/lib/cronometer';

/**
 * Check Cronometer connection status
 * 
 * Token resolution order:
 * 1. Cookie (set after OAuth flow)
 * 2. Environment variable (for local development convenience)
 */
export async function GET(request: NextRequest) {
  const isConfigured = isCronometerConfigured();
  
  // Check cookie first, then fall back to env var for local dev
  const accessToken = request.cookies.get('cronometer_access_token')?.value 
    || process.env.CRONOMETER_ACCESS_TOKEN;
  const userId = request.cookies.get('cronometer_user_id')?.value
    || process.env.CRONOMETER_USER_ID;
  
  return NextResponse.json({
    configured: isConfigured,
    connected: !!(accessToken && userId),
    userId: userId || null,
  });
}
