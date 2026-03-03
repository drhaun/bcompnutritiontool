import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAuthorizationUrl, generateCodeVerifier, generateCodeChallenge } from '@/lib/kroger-client';

export async function GET() {
  try {
    const state = randomUUID();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const url = await getAuthorizationUrl(state, codeChallenge);

    console.log('[Kroger Auth] Generated authorize URL:', url);
    const response = NextResponse.json({ url, state });
    const secure = process.env.NODE_ENV === 'production';
    const cookieOpts = `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=600`;
    response.headers.append('Set-Cookie', `kroger_oauth_state=${state}; ${cookieOpts}`);
    response.headers.append('Set-Cookie', `kroger_code_verifier=${codeVerifier}; ${cookieOpts}`);
    return response;
  } catch (err) {
    console.error('[Kroger Auth URL]', err);
    return NextResponse.json({ error: 'Kroger not configured' }, { status: 503 });
  }
}
