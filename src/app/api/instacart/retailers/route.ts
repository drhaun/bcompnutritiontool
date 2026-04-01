import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api-auth';
import { getNearbyRetailers, isInstacartConfigured } from '@/lib/instacart-client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await requireStaffSession();

    if (!isInstacartConfigured()) {
      return NextResponse.json(
        { error: 'Instacart API key not configured' },
        { status: 503 },
      );
    }

    const postalCode = request.nextUrl.searchParams.get('postal_code');
    const countryCode =
      request.nextUrl.searchParams.get('country_code') || 'US';

    if (!postalCode) {
      return NextResponse.json(
        { error: 'postal_code is required' },
        { status: 400 },
      );
    }

    const retailers = await getNearbyRetailers(postalCode, countryCode);
    return NextResponse.json({ retailers });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[Instacart Retailers]', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to fetch retailers',
      },
      { status: 500 },
    );
  }
}
