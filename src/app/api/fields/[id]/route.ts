import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dbToReusableField } from '@/lib/form-resolution';
import { requireStaffSession } from '@/lib/api-auth';
import { makeFieldName } from '@/lib/form-fields';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { data, error } = await supabase.from('custom_fields').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Field not found' }, { status: 404 });

  return NextResponse.json({ field: dbToReusableField(data as Record<string, unknown>) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = makeFieldName(body.name, id);
  if (body.label !== undefined) updates.label = body.label;
  if (body.type !== undefined) updates.type = body.type;
  if (body.required !== undefined) updates.required_default = body.required;
  if (body.placeholder !== undefined) updates.placeholder = body.placeholder;
  if (body.helpText !== undefined) updates.help_text = body.helpText;
  if (body.options !== undefined) updates.options = body.options;
  if (body.isActive !== undefined) updates.is_active = body.isActive;
  if (body.fieldKind !== undefined) updates.field_kind = body.fieldKind;
  if (body.builtInKey !== undefined) updates.built_in_key = body.builtInKey;
  if (body.supportedBlockIds !== undefined) updates.supported_block_ids = body.supportedBlockIds;
  if (body.dataKeys !== undefined) updates.data_keys = body.dataKeys;

  const { data, error } = await supabase
    .from('custom_fields')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Field name already exists' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ field: dbToReusableField(data as Record<string, unknown>) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { data: field } = await supabase.from('custom_fields').select('field_kind').eq('id', id).maybeSingle();
  if (field?.field_kind === 'built_in') {
    return NextResponse.json({ error: 'Built-in fields cannot be deleted' }, { status: 400 });
  }

  const { error } = await supabase.from('custom_fields').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
