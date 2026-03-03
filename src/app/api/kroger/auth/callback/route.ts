import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, buildTokenCookies } from '@/lib/kroger-client';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.redirect(new URL('/meal-plan?kroger_error=no_code', request.url));
    }

    const codeVerifier = request.cookies.get('kroger_code_verifier')?.value;
    const tokens = await exchangeCode(code, codeVerifier);
    const cookies = buildTokenCookies(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);

    const redirectUrl = new URL('/meal-plan?kroger_connected=1', request.url);
    const response = NextResponse.redirect(redirectUrl);
    for (const cookie of cookies) {
      response.headers.append('Set-Cookie', cookie);
    }
    response.headers.append('Set-Cookie', 'kroger_oauth_state=; Path=/; Max-Age=0');
    response.headers.append('Set-Cookie', 'kroger_code_verifier=; Path=/; Max-Age=0');
    return response;
  } catch (err) {
    console.error('[Kroger Callback]', err);
    return NextResponse.redirect(new URL('/meal-plan?kroger_error=auth_failed', request.url));
  }
}
