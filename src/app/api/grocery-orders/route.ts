import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getStaffFromAuthUser } from '@/lib/kroger-client';

/**
 * GET — List grocery orders for the current staff member.
 * Optional ?client_id= filter.
 */
export async function GET(request: NextRequest) {
  try {
    const db = createServerClient();
    if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const staff = await getStaffFromAuthUser(user.id);
    if (!staff) return NextResponse.json({ error: 'Not a staff member' }, { status: 403 });

    const clientId = request.nextUrl.searchParams.get('client_id');
    let query = db
      .from('grocery_orders')
      .select('*, clients(name, email)')
      .eq('staff_id', staff.id)
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ orders: data || [] });
  } catch (err) {
    console.error('[Grocery Orders GET]', err);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

/**
 * POST — Create a new grocery order (after product matching).
 * Body: { clientId, groceryItems, krogerMatchedItems, estimatedCost, deliveryAddress? }
 */
export async function POST(request: NextRequest) {
  try {
    const db = createServerClient();
    if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const staff = await getStaffFromAuthUser(user.id);
    if (!staff) return NextResponse.json({ error: 'Not a staff member' }, { status: 403 });

    const body = await request.json();
    const { clientId, groceryItems, krogerMatchedItems, estimatedCost, deliveryAddress } = body;

    if (!clientId || !groceryItems?.length) {
      return NextResponse.json({ error: 'clientId and groceryItems are required' }, { status: 400 });
    }

    // Get markup settings
    const { data: staffData } = await db
      .from('staff')
      .select('grocery_markup_type, grocery_markup_value')
      .eq('id', staff.id)
      .single();

    const { data: order, error } = await db
      .from('grocery_orders')
      .insert({
        client_id: clientId,
        staff_id: staff.id,
        grocery_items: groceryItems,
        kroger_matched_items: krogerMatchedItems || [],
        item_count: krogerMatchedItems?.filter((m: { krogerProduct: unknown }) => m.krogerProduct).length || 0,
        estimated_cost: estimatedCost || null,
        markup_type: staffData?.grocery_markup_type || 'percentage',
        markup_value: staffData?.grocery_markup_value || 15,
        delivery_address: deliveryAddress || null,
        status: 'matched',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ order });
  } catch (err) {
    console.error('[Grocery Orders POST]', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
