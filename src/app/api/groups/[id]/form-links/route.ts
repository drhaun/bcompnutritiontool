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
    sourceFormName: row.source_form_name,
    targetFormName: row.target_form_name,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const { data, error } = await supabase
      .from('group_form_links')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[FormLinks API] List error:', error);
      return NextResponse.json({ error: 'Failed to fetch form links' }, { status: 500 });
    }

    // Join form names
    const formIds = new Set<string>();
    for (const row of data || []) {
      if (row.source_form_id) formIds.add(row.source_form_id as string);
      if (row.target_form_id) formIds.add(row.target_form_id as string);
    }
    let formNameMap: Record<string, string> = {};
    if (formIds.size > 0) {
      const { data: forms } = await supabase
        .from('intake_forms')
        .select('id, name')
        .in('id', Array.from(formIds));
      if (forms) {
        formNameMap = Object.fromEntries(forms.map((f: Record<string, unknown>) => [f.id, f.name]));
      }
    }

    const links = (data || []).map((row: Record<string, unknown>) => dbToFormLink({
      ...row,
      source_form_name: formNameMap[row.source_form_id as string] || null,
      target_form_name: formNameMap[row.target_form_id as string] || null,
    }));

    return NextResponse.json({ formLinks: links });
  } catch (err) {
    console.error('[FormLinks API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: groupId } = await params;
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const body = await request.json();
    if (!body.sourceFormId || !body.targetFormId) {
      return NextResponse.json({ error: 'sourceFormId and targetFormId are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('group_form_links')
      .insert({
        group_id: groupId,
        source_form_id: body.sourceFormId,
        target_form_id: body.targetFormId,
        field_mappings: body.fieldMappings || [],
        is_active: body.isActive ?? true,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[FormLinks API] Create error:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A link between these forms already exists for this group' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create form link' }, { status: 500 });
    }

    return NextResponse.json({ formLink: dbToFormLink(data) }, { status: 201 });
  } catch (err) {
    console.error('[FormLinks API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
