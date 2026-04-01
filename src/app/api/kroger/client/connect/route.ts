import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServerClient } from '@/lib/supabase';
import { getAuthorizationUrl, generateCodeVerifier, generateCodeChallenge } from '@/lib/kroger-client';

/**
 * GET — Start Kroger OAuth flow for a specific client.
 * Requires ?client_id=<uuid> and staff Bearer auth.
 * Tokens will be saved to the client's record, not the staff's.
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Server misconfigured — NEXT_PUBLIC_BASE_URL is required for OAuth' },
        { status: 500 },
      );
    }

    const db = createServerClient();
    if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: staff } = await db
      .from('staff')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    if (!staff) return NextResponse.json({ error: 'Not a staff member' }, { status: 403 });

    const clientId = request.nextUrl.searchParams.get('client_id');
    if (!clientId) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .single();
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const state = randomUUID();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const clientRedirectUri = `${baseUrl}/api/kroger/client/callback`;
    const url = await getAuthorizationUrl(state, codeChallenge, clientRedirectUri);

    const referer = request.headers.get('referer');
    const returnTo = referer ? new URL(referer).pathname : '/meal-plan';

    const response = NextResponse.json({ url, state });
    const secure = process.env.NODE_ENV === 'production';
    const cookieOpts = `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=600`;
    response.headers.append('Set-Cookie', `kroger_client_state=${state}; ${cookieOpts}`);
    response.headers.append('Set-Cookie', `kroger_client_verifier=${codeVerifier}; ${cookieOpts}`);
    response.headers.append('Set-Cookie', `kroger_client_id=${clientId}; ${cookieOpts}`);
    response.headers.append('Set-Cookie', `kroger_client_return_to=${returnTo}; ${cookieOpts}`);
    return response;
  } catch (err) {
    console.error('[Kroger Client Connect]', err);
    return NextResponse.json({ error: 'Failed to start Kroger connection for client' }, { status: 500 });
  }
}
