import { NextRequest, NextResponse } from 'next/server';
import { getServiceToken, krogerGet } from '@/lib/kroger-client';
import { requireStaffSession } from '@/lib/api-auth';

interface KrogerLocation {
  locationId: string;
  chain: string;
  name: string;
  address: { addressLine1: string; city: string; state: string; zipCode: string };
  geolocation: { latitude: number; longitude: number };
  phone: string;
}

export async function GET(request: NextRequest) {
  try {
    await requireStaffSession();
    const zip = request.nextUrl.searchParams.get('zip');
    if (!zip || !/^\d{5}$/.test(zip)) {
      return NextResponse.json({ error: 'Valid 5-digit zip code required' }, { status: 400 });
    }

    const token = await getServiceToken();
    const data = await krogerGet(`/locations?filter.zipCode.near=${zip}&filter.limit=10`, token) as {
      data: KrogerLocation[];
    };

    const stores = (data.data || []).map(loc => ({
      locationId: loc.locationId,
      name: loc.name || loc.chain,
      chain: loc.chain,
      address: `${loc.address.addressLine1}, ${loc.address.city}, ${loc.address.state} ${loc.address.zipCode}`,
      phone: loc.phone,
    }));

    return NextResponse.json({ stores });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[Kroger Locations]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to search stores' },
      { status: 500 }
    );
  }
}
