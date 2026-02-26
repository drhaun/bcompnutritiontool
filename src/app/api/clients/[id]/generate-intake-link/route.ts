import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSupabaseSSR } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate the coach
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const authClient = createSupabaseSSR(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* read-only in API routes */ },
      },
    });

    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = getServiceClient();
    if (!serviceClient) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify the coach owns this client (or is admin)
    const { data: client, error: lookupErr } = await serviceClient
      .from('clients')
      .select('id, coach_id, name, intake_token')
      .eq('id', id)
      .single();

    if (lookupErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (client.coach_id && client.coach_id !== user.id) {
      const { data: staff } = await serviceClient
        .from('staff')
        .select('role, can_view_all_clients')
        .eq('auth_user_id', user.id)
        .single();

      if (staff?.role !== 'admin' && !staff?.can_view_all_clients) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Generate or refresh the token
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const { error: updateErr } = await serviceClient
      .from('clients')
      .update({
        intake_token: token,
        intake_token_expires_at: expiresAt,
        intake_status: 'pending',
        intake_completed_at: null,
      })
      .eq('id', id);

    if (updateErr) {
      console.error('[Generate Intake Link] Update error:', updateErr);
      return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
    }

    // Optionally tag client to a group
    const body = await request.json().catch(() => ({}));
    if (body.groupId) {
      // Check for existing active tag
      const { data: existingTag } = await serviceClient
        .from('client_group_tags')
        .select('id')
        .eq('client_id', id)
        .eq('group_id', body.groupId)
        .eq('is_active', true)
        .maybeSingle();

      if (!existingTag) {
        await serviceClient.from('client_group_tags').insert({
          client_id: id,
          group_id: body.groupId,
          is_active: true,
          joined_at: new Date().toISOString(),
        });
      }
    }

    // Use production domain for intake URLs
    const PRODUCTION_DOMAIN = 'https://nutrition.fitomics.com';
    const origin = request.headers.get('host')?.includes('localhost')
      ? request.headers.get('origin') || request.nextUrl.origin
      : PRODUCTION_DOMAIN;
    const intakeUrl = `${origin}/intake/${token}`;

    return NextResponse.json({
      token,
      url: intakeUrl,
      expiresAt,
      clientName: client.name,
    });
  } catch (err) {
    console.error('[Generate Intake Link] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
