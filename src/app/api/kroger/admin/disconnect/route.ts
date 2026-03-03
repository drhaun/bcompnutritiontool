import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { disconnectAdminKroger } from '@/lib/kroger-client';

export async function POST(request: NextRequest) {
  try {
    const db = createServerClient();
    if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: staff } = await db
      .from('staff')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    if (!staff) return NextResponse.json({ error: 'Not a staff member' }, { status: 403 });

    await disconnectAdminKroger(staff.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Kroger Admin Disconnect]', err);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
