import { NextRequest, NextResponse } from 'next/server';
import { getCustomerToken, krogerPut } from '@/lib/kroger-client';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const auth = await getCustomerToken(cookieHeader);
    if (!auth) {
      return NextResponse.json({ error: 'Not connected to Kroger. Please sign in.' }, { status: 401 });
    }

    const body = await request.json();
    const items: { upc: string; quantity: number }[] = body.items;

    if (!items?.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    await krogerPut('/cart/add', auth.accessToken, {
      items: items.map(i => ({ upc: i.upc, quantity: i.quantity })),
    });

    const response = NextResponse.json({ success: true, itemCount: items.length });

    if (auth.newCookies) {
      for (const cookie of auth.newCookies) {
        response.headers.append('Set-Cookie', cookie);
      }
    }

    return response;
  } catch (err) {
    console.error('[Kroger Cart]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add to cart' },
      { status: 500 }
    );
  }
}
