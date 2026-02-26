import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const groupId = request.nextUrl.searchParams.get('groupId');

  let query = supabase
    .from('form_submissions')
    .select('id, client_id, group_id, group_name, group_slug, form_config, form_data, status, submitted_at, reviewed_at, reviewed_by, notes, stripe_payment_id')
    .order('submitted_at', { ascending: false })
    .limit(200);

  if (groupId) {
    query = query.eq('group_id', groupId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with client names
  const clientIds = [...new Set((data || []).map(s => s.client_id))];
  let clientMap: Record<string, { name: string; email: string }> = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, email')
      .in('id', clientIds);
    if (clients) {
      clientMap = Object.fromEntries(clients.map(c => [c.id, { name: c.name, email: c.email }]));
    }
  }

  const submissions = (data || []).map(s => ({
    ...s,
    clientName: clientMap[s.client_id]?.name || 'Unknown',
    clientEmail: clientMap[s.client_id]?.email || '',
  }));

  return NextResponse.json({ submissions });
}

export async function PATCH(request: NextRequest) {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const body = await request.json();
  const { id, status, notes, reviewedBy } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (status === 'reviewed') {
    updates.reviewed_at = new Date().toISOString();
    updates.reviewed_by = reviewedBy || 'admin';
  }

  const { error } = await supabase.from('form_submissions').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
