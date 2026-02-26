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

function dbToGroup(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    formConfig: row.form_config || [],
    welcomeTitle: row.welcome_title,
    welcomeDescription: row.welcome_description,
    branding: row.branding || {},
    stripeEnabled: row.stripe_enabled ?? false,
    stripePriceId: row.stripe_price_id,
    stripePromoEnabled: row.stripe_promo_enabled ?? false,
    stripePromoCode: row.stripe_promo_code ?? null,
    stripePromoCodeId: row.stripe_promo_code_id ?? null,
    paymentDescription: row.payment_description,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
  // Allow through if service key is configured (staff API)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return { id: 'service' } as { id: string };
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const { data, error } = await supabase.from('client_groups').select('*').eq('id', id).single();
    if (error || !data) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    return NextResponse.json({ group: dbToGroup(data) });
  } catch (err) {
    console.error('[Groups API] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.description !== undefined) updates.description = body.description;
    if (body.formConfig !== undefined) updates.form_config = body.formConfig;
    if (body.welcomeTitle !== undefined) updates.welcome_title = body.welcomeTitle;
    if (body.welcomeDescription !== undefined) updates.welcome_description = body.welcomeDescription;
    if (body.branding !== undefined) updates.branding = body.branding;
    if (body.stripeEnabled !== undefined) updates.stripe_enabled = body.stripeEnabled;
    if (body.stripePriceId !== undefined) updates.stripe_price_id = body.stripePriceId;
    if (body.stripePromoEnabled !== undefined) updates.stripe_promo_enabled = body.stripePromoEnabled;
    if (body.stripePromoCode !== undefined) updates.stripe_promo_code = body.stripePromoCode || null;
    if (body.stripePromoCodeId !== undefined) updates.stripe_promo_code_id = body.stripePromoCodeId || null;
    if (body.paymentDescription !== undefined) updates.payment_description = body.paymentDescription;
    if (body.isActive !== undefined) updates.is_active = body.isActive;

    const { data, error } = await supabase
      .from('client_groups').update(updates).eq('id', id).select('*').single();

    if (error) {
      console.error('[Groups API] PATCH error:', error);
      if (error.code === '23505') return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    return NextResponse.json({ group: dbToGroup(data) });
  } catch (err) {
    console.error('[Groups API] PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const { error } = await supabase.from('client_groups').delete().eq('id', id);
    if (error) {
      console.error('[Groups API] DELETE error:', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Groups API] DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
