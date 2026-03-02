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

/**
 * POST: Coach submits source form data for a group form link.
 * Stores the data directly on the group_form_links row.
 *
 * Body: { formLinkId, formData }
 */
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
    const { formLinkId, formData } = body;
    if (!formLinkId || !formData) {
      return NextResponse.json({ error: 'formLinkId and formData are required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('group_form_links')
      .update({
        source_data: formData,
        source_filled_at: now,
        source_filled_by: user.id,
        updated_at: now,
      })
      .eq('id', formLinkId)
      .eq('group_id', groupId)
      .select('id')
      .single();

    if (error) {
      console.error('[FillSource API] Update error:', error);
      return NextResponse.json({ error: 'Failed to save source data' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Form link not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[FillSource API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
