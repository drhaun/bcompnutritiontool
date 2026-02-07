import { NextRequest, NextResponse } from 'next/server';
import { getProClients } from '@/lib/cronometer';
import { resolveCronometerToken, backfillCronometerCookies } from '@/lib/cronometer-token';

/**
 * Get list of Cronometer Pro clients
 * Note: This only works for Cronometer Pro accounts. 
 * Regular accounts can still use "My Data" option.
 */
export async function GET(request: NextRequest) {
  // Resolve token from cookie → DB → env
  const tokenResult = await resolveCronometerToken(request);
  
  if (!tokenResult.accessToken) {
    return NextResponse.json(
      { error: 'Not connected to Cronometer' },
      { status: 401 }
    );
  }
  
  try {
    const data = await getProClients(tokenResult.accessToken);
    let response = NextResponse.json(data);
    // Backfill cookies if token came from database
    response = backfillCronometerCookies(response, tokenResult);
    return response;
  } catch (error) {
    console.error('Cronometer clients error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get clients';
    
    // If access denied (401), the token has expired
    if (errorMessage.includes('401') || errorMessage.includes('Access Denied') || errorMessage.includes('access_denied')) {
      console.log('Cronometer access token expired - user needs to re-authenticate');
      return NextResponse.json(
        { 
          error: 'Session expired. Please reconnect to Cronometer in Settings.', 
          clients: [],
          tokenExpired: true 
        },
        { status: 200 } // Return 200 so UI doesn't break, but include error message
      );
    }
    
    // If the error is about not being a Pro account, return empty clients
    if (errorMessage.includes('pro') || errorMessage.includes('Pro') || errorMessage.includes('subscription')) {
      console.log('User may not have Cronometer Pro - returning empty clients list');
      return NextResponse.json({ clients: [] });
    }
    
    return NextResponse.json(
      { error: errorMessage, clients: [] },
      { status: 200 } // Return 200 with empty clients so the UI doesn't break
    );
  }
}
