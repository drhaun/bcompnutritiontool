import { NextRequest, NextResponse } from 'next/server';
import { getDiarySummary } from '@/lib/cronometer';

/**
 * Get diary summary for a client
 * 
 * Query params:
 * - client_id: Cronometer client ID
 * - day: Single day (YYYY-MM-DD) OR
 * - start/end: Date range (YYYY-MM-DD)
 * - food: Include food breakdown (true/false)
 */
export async function GET(request: NextRequest) {
  // Check cookie first, then fall back to env var for local dev
  const accessToken = request.cookies.get('cronometer_access_token')?.value
    || process.env.CRONOMETER_ACCESS_TOKEN;
  
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not connected to Cronometer' },
      { status: 401 }
    );
  }
  
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('client_id') || undefined;
  const day = searchParams.get('day') || undefined;
  const start = searchParams.get('start') || undefined;
  const end = searchParams.get('end') || undefined;
  const food = searchParams.get('food') === 'true';
  
  if (!day && (!start || !end)) {
    return NextResponse.json(
      { error: 'Must provide either day or start/end date range' },
      { status: 400 }
    );
  }
  
  try {
    const data = await getDiarySummary(
      { accessToken, clientId },
      { day, start, end, food }
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cronometer diary error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get diary' },
      { status: 500 }
    );
  }
}
