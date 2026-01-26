import { NextRequest, NextResponse } from 'next/server';
import { getProClients } from '@/lib/cronometer';

/**
 * Get list of Cronometer Pro clients
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('cronometer_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not connected to Cronometer' },
      { status: 401 }
    );
  }
  
  try {
    const data = await getProClients(accessToken);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cronometer clients error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get clients' },
      { status: 500 }
    );
  }
}
