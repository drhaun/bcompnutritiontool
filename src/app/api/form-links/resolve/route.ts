import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractPrePopulatedFields, getLockedFormStateKeys } from '@/lib/field-mapping-utils';
import type { FieldMapping } from '@/types';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * GET /api/form-links/resolve?groupId=...&targetFormId=...
 *
 * Returns the minimum mapped payload needed to pre-populate and lock
 * a linked target form without exposing the full stored source submission.
 */
export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get('groupId');
    const targetFormId = request.nextUrl.searchParams.get('targetFormId');

    if (!groupId || !targetFormId) {
      return NextResponse.json({ formLink: null });
    }

    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const [{ data: group }, { data: targetForm }] = await Promise.all([
      supabase
        .from('client_groups')
        .select('id, is_active')
        .eq('id', groupId)
        .maybeSingle(),
      supabase
        .from('intake_forms')
        .select('id, is_active')
        .eq('id', targetFormId)
        .maybeSingle(),
    ]);

    if (!group || group.is_active === false || !targetForm || targetForm.is_active === false) {
      return NextResponse.json({ formLink: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const { data, error } = await supabase
      .from('group_form_links')
      .select('*')
      .eq('group_id', groupId)
      .eq('target_form_id', targetFormId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[FormLinks Resolve] Error:', error);
      return NextResponse.json({ formLink: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (!data || !data.source_data) {
      return NextResponse.json({ formLink: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const fieldMappings = Array.isArray(data.field_mappings)
      ? (data.field_mappings as FieldMapping[])
      : [];

    if (fieldMappings.length === 0) {
      return NextResponse.json({ formLink: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const prePopulatedFields = extractPrePopulatedFields(
      data.source_data as Record<string, unknown>,
      fieldMappings,
    );
    const lockedFields = Array.from(getLockedFormStateKeys(fieldMappings));

    return NextResponse.json(
      {
        formLink: {
          id: data.id,
          prePopulatedFields,
          lockedFields,
          sourceFilledAt: data.source_filled_at,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[FormLinks Resolve] Error:', err);
    return NextResponse.json({ formLink: null }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
