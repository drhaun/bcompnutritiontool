import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, saveAdminKrogerTokens } from '@/lib/kroger-client';

/**
 * GET — Kroger OAuth callback for admin master account.
 * Exchanges the code for tokens and saves them to the staff record in the DB.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const returnedState = request.nextUrl.searchParams.get('state');

    if (!code) {
      return NextResponse.redirect(new URL('/admin?kroger_error=no_code', request.url));
    }

    const savedState = request.cookies.get('kroger_admin_state')?.value;
    if (savedState && returnedState !== savedState) {
      return NextResponse.redirect(new URL('/admin?kroger_error=state_mismatch', request.url));
    }

    const codeVerifier = request.cookies.get('kroger_admin_verifier')?.value;
    const staffId = request.cookies.get('kroger_admin_staff_id')?.value;

    if (!staffId) {
      return NextResponse.redirect(new URL('/admin?kroger_error=no_staff', request.url));
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const adminRedirectUri = `${baseUrl}/api/kroger/admin/callback`;
    const tokens = await exchangeCode(code, codeVerifier, adminRedirectUri);
    const saved = await saveAdminKrogerTokens(staffId, tokens);

    if (!saved) {
      return NextResponse.redirect(new URL('/admin?kroger_error=save_failed', request.url));
    }

    const redirectUrl = new URL('/admin?kroger_connected=1', request.url);
    const response = NextResponse.redirect(redirectUrl);

    // Clear temporary cookies
    response.headers.append('Set-Cookie', 'kroger_admin_state=; Path=/; Max-Age=0');
    response.headers.append('Set-Cookie', 'kroger_admin_verifier=; Path=/; Max-Age=0');
    response.headers.append('Set-Cookie', 'kroger_admin_staff_id=; Path=/; Max-Age=0');

    return response;
  } catch (err) {
    console.error('[Kroger Admin Callback]', err);
    return NextResponse.redirect(new URL('/admin?kroger_error=auth_failed', request.url));
  }
}
