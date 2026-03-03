import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServerClient } from '@/lib/supabase';
import { getAuthorizationUrl, generateCodeVerifier, generateCodeChallenge } from '@/lib/kroger-client';

/**
 * GET — Start admin Kroger OAuth flow.
 * Stores state + verifier in cookies and returns the authorization URL.
 */
export async function GET(request: NextRequest) {
  try {
    const db = createServerClient();
    if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    // Verify the caller is an authenticated staff member
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

    const state = randomUUID();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const adminRedirectUri = `${baseUrl}/api/kroger/admin/callback`;

    // Try without PKCE first to isolate 400 errors — PKCE can be re-enabled once basic flow works
    const usePkce = process.env.KROGER_USE_PKCE === 'true';
    const url = await getAuthorizationUrl(state, usePkce ? codeChallenge : undefined, adminRedirectUri);

    console.log('[Kroger Admin Connect] ═══════════════════════════════════');
    console.log('[Kroger Admin Connect] Authorization URL:', url);
    console.log('[Kroger Admin Connect] Redirect URI:', adminRedirectUri);
    console.log('[Kroger Admin Connect] Client ID:', process.env.KROGER_CLIENT_ID);
    console.log('[Kroger Admin Connect] Scopes:', process.env.KROGER_SCOPES || 'product.compact cart.basic:write');
    console.log('[Kroger Admin Connect] API Base:', process.env.KROGER_API_BASE);
    console.log('[Kroger Admin Connect] PKCE:', usePkce ? 'enabled' : 'disabled');
    console.log('[Kroger Admin Connect] ═══════════════════════════════════');

    const response = NextResponse.json({ url, state });
    const secure = process.env.NODE_ENV === 'production';
    const cookieOpts = `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=600`;
    response.headers.append('Set-Cookie', `kroger_admin_state=${state}; ${cookieOpts}`);
    response.headers.append('Set-Cookie', `kroger_admin_verifier=${codeVerifier}; ${cookieOpts}`);
    response.headers.append('Set-Cookie', `kroger_admin_staff_id=${staff.id}; ${cookieOpts}`);
    return response;
  } catch (err) {
    console.error('[Kroger Admin Connect]', err);
    return NextResponse.json({ error: 'Failed to start Kroger connection' }, { status: 500 });
  }
}
