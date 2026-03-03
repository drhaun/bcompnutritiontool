import { NextRequest, NextResponse } from 'next/server';
import { getCustomerToken } from '@/lib/kroger-client';

export async function GET(request: NextRequest) {
  const configured = !!(process.env.KROGER_CLIENT_ID && process.env.KROGER_CLIENT_SECRET);
  if (!configured) {
    return NextResponse.json({ configured: false, authenticated: false });
  }

  const cookieHeader = request.headers.get('cookie');
  const auth = await getCustomerToken(cookieHeader);

  const response = NextResponse.json({
    configured: true,
    authenticated: !!auth,
  });

  if (auth?.newCookies) {
    for (const cookie of auth.newCookies) {
      response.headers.append('Set-Cookie', cookie);
    }
  }

  return response;
}
