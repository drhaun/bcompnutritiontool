import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
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
    groupName: row.group_name,
  };
}

export async function GET() {
  try {
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const { data, error } = await supabase
      .from('group_form_links')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[FormLinks API] All links error:', error);
      return NextResponse.json({ error: 'Failed to fetch form links' }, { status: 500 });
    }

    const formIds = new Set<string>();
    const groupIds = new Set<string>();
    for (const row of data || []) {
      if (row.source_form_id) formIds.add(row.source_form_id as string);
      if (row.target_form_id) formIds.add(row.target_form_id as string);
      if (row.group_id) groupIds.add(row.group_id as string);
    }

    let formNameMap: Record<string, string> = {};
    if (formIds.size > 0) {
      const { data: forms } = await supabase.from('intake_forms').select('id, name').in('id', Array.from(formIds));
      if (forms) formNameMap = Object.fromEntries(forms.map((f: Record<string, unknown>) => [f.id, f.name]));
    }

    let groupNameMap: Record<string, string> = {};
    if (groupIds.size > 0) {
      const { data: groups } = await supabase.from('client_groups').select('id, name').in('id', Array.from(groupIds));
      if (groups) groupNameMap = Object.fromEntries(groups.map((g: Record<string, unknown>) => [g.id, g.name]));
    }

    const links = (data || []).map((row: Record<string, unknown>) => dbToFormLink({
      ...row,
      source_form_name: formNameMap[row.source_form_id as string] || null,
      target_form_name: formNameMap[row.target_form_id as string] || null,
      group_name: groupNameMap[row.group_id as string] || null,
    }));

    return NextResponse.json({ formLinks: links });
  } catch (err) {
    console.error('[FormLinks API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
