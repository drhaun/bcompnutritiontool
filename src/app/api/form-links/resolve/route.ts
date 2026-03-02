import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * GET /api/form-links/resolve?groupId=...&targetFormId=...
 *
 * Returns active form link data for a target form within a group,
 * including the source_data (coach's filled data) and field_mappings.
 * Used by the intake form to pre-populate and lock fields.
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
      return NextResponse.json({ formLink: null });
    }

    if (!data || !data.source_data) {
      return NextResponse.json({ formLink: null });
    }

    return NextResponse.json({
      formLink: {
        id: data.id,
        fieldMappings: data.field_mappings || [],
        sourceData: data.source_data,
        sourceFilledAt: data.source_filled_at,
      },
    });
  } catch (err) {
    console.error('[FormLinks Resolve] Error:', err);
    return NextResponse.json({ formLink: null });
  }
}
