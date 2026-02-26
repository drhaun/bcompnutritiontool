import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const clientIds = request.nextUrl.searchParams.get('clientIds');
    if (!clientIds) return NextResponse.json({ tags: [] });

    const ids = clientIds.split(',').filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ tags: [] });

    const includeHistory = request.nextUrl.searchParams.get('history') === 'true';

    let query = supabase
      .from('client_group_tags')
      .select('client_id, group_id, joined_at, left_at, is_active')
      .in('client_id', ids);

    if (!includeHistory) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Groups Tags] Error:', error);
      return NextResponse.json({ tags: [] });
    }

    return NextResponse.json({ tags: data || [] });
  } catch (err) {
    console.error('[Groups Tags] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add a tag: { clientId, groupId }
// Preserves history: reactivates an old row if one exists, otherwise inserts new
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const body = await request.json();
    const { clientId, groupId } = body;
    if (!clientId || !groupId) return NextResponse.json({ error: 'clientId and groupId required' }, { status: 400 });

    // Check for existing active membership
    const { data: activeRow } = await supabase
      .from('client_group_tags')
      .select('id')
      .eq('client_id', clientId)
      .eq('group_id', groupId)
      .eq('is_active', true)
      .maybeSingle();

    if (activeRow) return NextResponse.json({ success: true });

    // Insert new membership row (old inactive rows are preserved as history)
    const { error } = await supabase
      .from('client_group_tags')
      .insert({ client_id: clientId, group_id: groupId, is_active: true, joined_at: new Date().toISOString() });

    if (error) {
      console.error('[Groups Tags] POST error:', error);
      return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Groups Tags] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove a tag: { clientId, groupId }
// Soft-delete: marks is_active = false and sets left_at, preserving historical record
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const body = await request.json();
    const { clientId, groupId } = body;
    if (!clientId || !groupId) return NextResponse.json({ error: 'clientId and groupId required' }, { status: 400 });

    const { error } = await supabase
      .from('client_group_tags')
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (error) {
      console.error('[Groups Tags] DELETE error:', error);
      return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Groups Tags] DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
