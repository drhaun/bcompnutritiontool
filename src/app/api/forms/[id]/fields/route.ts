import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dbToFormFieldAssignment } from '@/lib/form-resolution';
import { syncUnifiedFieldLibrary } from '@/lib/unified-field-library';

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
  const { id } = await params;
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  await syncUnifiedFieldLibrary(supabase as never);

  const { data, error } = await supabase
    .from('form_field_assignments')
    .select('*, field:custom_fields(*)')
    .eq('form_id', id)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ assignments: (data || []).map(row => dbToFormFieldAssignment(row as Record<string, unknown>)) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const body = await request.json();
  if (!body.fieldId || !body.blockId || !body.blockInstanceId) {
    return NextResponse.json({ error: 'Missing field or block target' }, { status: 400 });
  }

  const { data: existingRows } = await supabase
    .from('form_field_assignments')
    .select('id, sort_order')
    .eq('form_id', id)
    .eq('block_instance_id', body.blockInstanceId)
    .order('sort_order', { ascending: true });

  const nextSortOrder = existingRows?.length ? Number(existingRows[existingRows.length - 1].sort_order || 0) + 1 : 0;
  const { data, error } = await supabase
    .from('form_field_assignments')
    .insert({
      form_id: id,
      block_id: body.blockId,
      block_instance_id: body.blockInstanceId,
      field_id: body.fieldId,
      sort_order: nextSortOrder,
        is_visible: body.isVisible ?? true,
      required_override: body.requiredOverride ?? null,
        label_override: body.labelOverride ?? null,
        help_text_override: body.helpTextOverride ?? null,
        placeholder_override: body.placeholderOverride ?? null,
    })
    .select('*, field:custom_fields(*)')
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Field is already assigned to this block' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignment: dbToFormFieldAssignment(data as Record<string, unknown>) }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const body = await request.json();
  const assignments = Array.isArray(body.assignments) ? body.assignments : [];

  if (body.replaceAll) {
    const now = new Date().toISOString();
    const { error: deleteError } = await supabase
      .from('form_field_assignments')
      .delete()
      .eq('form_id', id);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    if (assignments.length > 0) {
      const { error: insertError } = await supabase
        .from('form_field_assignments')
        .insert(assignments.map((assignment: Record<string, unknown>, index: number) => ({
          form_id: id,
          block_id: assignment.blockId,
          block_instance_id: assignment.blockInstanceId,
          field_id: assignment.fieldId,
          sort_order: assignment.sortOrder ?? index,
          is_visible: assignment.isVisible ?? true,
          required_override: assignment.requiredOverride ?? null,
          label_override: assignment.labelOverride ?? null,
          help_text_override: assignment.helpTextOverride ?? null,
          placeholder_override: assignment.placeholderOverride ?? null,
          created_at: now,
          updated_at: now,
        })));

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { data: replacedRows, error: replacedError } = await supabase
      .from('form_field_assignments')
      .select('*, field:custom_fields(*)')
      .eq('form_id', id)
      .order('sort_order', { ascending: true });

    if (replacedError) return NextResponse.json({ error: replacedError.message }, { status: 500 });
    return NextResponse.json({ assignments: (replacedRows || []).map(row => dbToFormFieldAssignment(row as Record<string, unknown>)) });
  }

  for (const assignment of assignments) {
    await supabase
      .from('form_field_assignments')
      .update({
        sort_order: assignment.sortOrder,
        is_visible: assignment.isVisible ?? true,
        required_override: assignment.requiredOverride ?? null,
        label_override: assignment.labelOverride ?? null,
        help_text_override: assignment.helpTextOverride ?? null,
        placeholder_override: assignment.placeholderOverride ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment.id)
      .eq('form_id', id);
  }

  const { data, error } = await supabase
    .from('form_field_assignments')
    .select('*, field:custom_fields(*)')
    .eq('form_id', id)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: (data || []).map(row => dbToFormFieldAssignment(row as Record<string, unknown>)) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  if (!body.assignmentId) return NextResponse.json({ error: 'Missing assignmentId' }, { status: 400 });

  const { error } = await supabase
    .from('form_field_assignments')
    .delete()
    .eq('id', body.assignmentId)
    .eq('form_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
