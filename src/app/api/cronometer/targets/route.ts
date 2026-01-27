import { NextRequest, NextResponse } from 'next/server';
import { getNutritionTargets } from '@/lib/cronometer';

/**
 * Fetch nutrition targets from Cronometer for a specific client
 * 
 * Query params:
 * - client_id: Cronometer client ID (optional, defaults to own account)
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('cronometer_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not connected to Cronometer' },
      { status: 401 }
    );
  }
  
  const searchParams = request.nextUrl.searchParams;
  const clientIdParam = searchParams.get('client_id');
  const clientId = clientIdParam && clientIdParam !== 'self' ? clientIdParam : undefined;
  
  try {
    const targets = await getNutritionTargets({ accessToken, clientId });
    
    return NextResponse.json({
      success: true,
      targets,
    });
  } catch (error) {
    console.error('Cronometer targets error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch targets' },
      { status: 500 }
    );
  }
}
