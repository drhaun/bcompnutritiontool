import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getStaffFromAuthUser } from '@/lib/kroger-client';

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

    const { markupType, markupValue } = await request.json();

    const { error } = await db
      .from('staff')
      .update({
        grocery_markup_type: markupType,
        grocery_markup_value: markupValue,
      })
      .eq('id', staff.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Kroger Markup]', err);
    return NextResponse.json({ error: 'Failed to save markup' }, { status: 500 });
  }
}
