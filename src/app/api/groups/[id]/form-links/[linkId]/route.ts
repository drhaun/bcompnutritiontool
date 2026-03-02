import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSupabaseSSR } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authenticate() {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (supabaseUrl && supabaseAnonKey) {
      const authClient = createSupabaseSSR(supabaseUrl, supabaseAnonKey, {
        cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
      });
      const { data: { user } } = await authClient.auth.getUser();
      if (user) return user;
    }
  } catch { /* */ }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return { id: 'service' } as { id: string };
  return null;
}

function dbToFormLink(row: Record<string, unknown>) {
  return {
    id: row.id,
    groupId: row.group_id,
    sourceFormId: row.source_form_id,
    targetFormId: row.target_form_id,
    fieldMappings: row.field_mappings || [],
    sourceData: row.source_data || null,
    sourceFilledAt: row.source_filled_at || null,
    sourceFilledBy: row.source_filled_by || null,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type RouteParams = { params: Promise<{ id: string; linkId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: groupId, linkId } = await params;
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const { data, error } = await supabase
      .from('group_form_links')
      .select('*')
      .eq('id', linkId)
      .eq('group_id', groupId)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Form link not found' }, { status: 404 });
    return NextResponse.json({ formLink: dbToFormLink(data) });
  } catch (err) {
    console.error('[FormLinks API] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await authenticate();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: groupId, linkId } = await params;
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.fieldMappings !== undefined) updates.field_mappings = body.fieldMappings;
    if (body.sourceData !== undefined) updates.source_data = body.sourceData;
    if (body.sourceFilledAt !== undefined) updates.source_filled_at = body.sourceFilledAt;
    if (body.sourceFilledBy !== undefined) updates.source_filled_by = body.sourceFilledBy;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.sourceFormId !== undefined) updates.source_form_id = body.sourceFormId;
    if (body.targetFormId !== undefined) updates.target_form_id = body.targetFormId;

    const { data, error } = await supabase
      .from('group_form_links')
      .update(updates)
      .eq('id', linkId)
      .eq('group_id', groupId)
      .select('*')
      .single();

    if (error) {
      console.error('[FormLinks API] PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update form link' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Form link not found' }, { status: 404 });

    return NextResponse.json({ formLink: dbToFormLink(data) });
  } catch (err) {
    console.error('[FormLinks API] PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await authenticate();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: groupId, linkId } = await params;
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const { error } = await supabase
      .from('group_form_links')
      .delete()
      .eq('id', linkId)
      .eq('group_id', groupId);

    if (error) {
      console.error('[FormLinks API] DELETE error:', error);
      return NextResponse.json({ error: 'Failed to delete form link' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[FormLinks API] DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
