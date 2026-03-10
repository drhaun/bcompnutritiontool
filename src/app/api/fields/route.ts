import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dbToReusableField } from '@/lib/form-resolution';
import { makeFieldName } from '@/lib/form-fields';
import { syncUnifiedFieldLibrary } from '@/lib/unified-field-library';
import { requireStaffSession } from '@/lib/api-auth';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    await requireStaffSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  await syncUnifiedFieldLibrary(supabase as never);

  const includeInactive = request.nextUrl.searchParams.get('include_inactive') === 'true';
  let query = supabase
    .from('custom_fields')
    .select('*, form_field_assignments(count)')
    .order('created_at', { ascending: false });

  if (!includeInactive) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    fields: (data || []).map(row => {
      const field = dbToReusableField(row as Record<string, unknown>);
      const usageCount = Array.isArray((row as Record<string, unknown>).form_field_assignments)
        ? Number((((row as Record<string, unknown>).form_field_assignments as Array<Record<string, unknown>>)[0] || {}).count || 0)
        : 0;
      return { ...field, usageCount };
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireStaffSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const body = await request.json();
  if (!body.label?.trim()) return NextResponse.json({ error: 'Label is required' }, { status: 400 });
  if (!body.type) return NextResponse.json({ error: 'Type is required' }, { status: 400 });

  const name = makeFieldName(body.name || body.label, body.id);
  const fieldId = body.id || `field_${Date.now()}`;
  const { data, error } = await supabase
    .from('custom_fields')
    .insert({
      id: fieldId,
      name,
      label: body.label.trim(),
      type: body.type,
      required_default: !!body.required,
      placeholder: body.placeholder || null,
      help_text: body.helpText || null,
      options: body.options || [],
      is_active: body.isActive ?? true,
      field_kind: body.fieldKind || 'custom',
      built_in_key: body.builtInKey || null,
      supported_block_ids: body.supportedBlockIds || [],
      data_keys: body.dataKeys || [],
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Field id or name already exists' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ field: dbToReusableField(data as Record<string, unknown>) }, { status: 201 });
}
