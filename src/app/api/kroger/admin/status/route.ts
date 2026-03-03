import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isAdminKrogerConnected, getStaffMarkupSettings } from '@/lib/kroger-client';

/**
 * GET — Check if the current admin has Kroger connected + return markup settings.
 */
export async function GET(request: NextRequest) {
  try {
    const db = createServerClient();
    if (!db) return NextResponse.json({ connected: false });

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ connected: false });

    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return NextResponse.json({ connected: false });

    const { data: staff } = await db
      .from('staff')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    if (!staff) return NextResponse.json({ connected: false });

    const connected = await isAdminKrogerConnected(staff.id);
    const markup = await getStaffMarkupSettings(staff.id);

    return NextResponse.json({
      connected,
      staffId: staff.id,
      markup: markup || { markupType: 'percentage', markupValue: 15 },
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
