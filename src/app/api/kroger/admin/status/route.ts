import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isAdminKrogerConnected, isClientKrogerConnected, getStaffMarkupSettings } from '@/lib/kroger-client';

/**
 * GET — Check Kroger connection status for both admin (staff) and client accounts.
 * Accepts optional ?client_id= to also check if that client has their own Kroger connected.
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

    const adminConnected = await isAdminKrogerConnected(staff.id);
    const markup = await getStaffMarkupSettings(staff.id);

    const clientId = request.nextUrl.searchParams.get('client_id');
    let clientConnected = false;
    if (clientId) {
      clientConnected = await isClientKrogerConnected(clientId);
    }

    return NextResponse.json({
      connected: adminConnected,
      clientConnected,
      staffId: staff.id,
      markup: markup || { markupType: 'percentage', markupValue: 15 },
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
