import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, saveClientKrogerTokens } from '@/lib/kroger-client';

/**
 * GET — Kroger OAuth callback for per-client account connection.
 * Exchanges the code for tokens and saves them to the client record.
 */
export async function GET(request: NextRequest) {
  const returnTo = request.cookies.get('kroger_client_return_to')?.value || '/meal-plan';
  const errorUrl = (reason: string) =>
    new URL(`${returnTo}${returnTo.includes('?') ? '&' : '?'}kroger_error=${reason}`, request.url);
  const successUrl = () =>
    new URL(`${returnTo}${returnTo.includes('?') ? '&' : '?'}kroger_connected=1&kroger_mode=client`, request.url);

  function clearOAuthCookies(response: NextResponse) {
    for (const name of [
      'kroger_client_state',
      'kroger_client_verifier',
      'kroger_client_id',
      'kroger_client_return_to',
    ]) {
      response.headers.append('Set-Cookie', `${name}=; Path=/; Max-Age=0`);
    }
    return response;
  }

  try {
    const code = request.nextUrl.searchParams.get('code');
    const returnedState = request.nextUrl.searchParams.get('state');

    if (!code) {
      return clearOAuthCookies(NextResponse.redirect(errorUrl('no_code')));
    }

    const savedState = request.cookies.get('kroger_client_state')?.value;
    if (!savedState || returnedState !== savedState) {
      return clearOAuthCookies(NextResponse.redirect(errorUrl('state_mismatch')));
    }

    const codeVerifier = request.cookies.get('kroger_client_verifier')?.value;
    const clientId = request.cookies.get('kroger_client_id')?.value;

    if (!clientId) {
      return clearOAuthCookies(NextResponse.redirect(errorUrl('no_client')));
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return clearOAuthCookies(NextResponse.redirect(errorUrl('server_misconfigured')));
    }

    const clientRedirectUri = `${baseUrl}/api/kroger/client/callback`;
    const tokens = await exchangeCode(code, codeVerifier, clientRedirectUri);
    const saved = await saveClientKrogerTokens(clientId, tokens);

    if (!saved) {
      return clearOAuthCookies(NextResponse.redirect(errorUrl('save_failed')));
    }

    return clearOAuthCookies(NextResponse.redirect(successUrl()));
  } catch (err) {
    console.error('[Kroger Client Callback]', err);
    return clearOAuthCookies(NextResponse.redirect(errorUrl('auth_failed')));
  }
}
