import { NextRequest, NextResponse } from 'next/server';
import { isCronometerConfigured } from '@/lib/cronometer';

/**
 * Check Cronometer connection status
 */
export async function GET(request: NextRequest) {
  const isConfigured = isCronometerConfigured();
  const accessToken = request.cookies.get('cronometer_access_token')?.value;
  const userId = request.cookies.get('cronometer_user_id')?.value;
  
  return NextResponse.json({
    configured: isConfigured,
    connected: !!(accessToken && userId),
    userId: userId || null,
  });
}
