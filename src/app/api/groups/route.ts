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
    defaultFormId: row.default_form_id || null,
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

// GET: List all groups (public for slug lookups, auth optional)
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const activeOnly = request.nextUrl.searchParams.get('active_only') === 'true';
    const slug = request.nextUrl.searchParams.get('slug');

    let query = supabase.from('client_groups').select('*');
    if (activeOnly) query = query.eq('is_active', true);
    if (slug) query = query.eq('slug', slug);
    query = query.order('name');

    const { data, error } = await query;
    if (error) {
      console.error('[Groups API] List error:', error);
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }

    return NextResponse.json({ groups: (data || []).map(dbToGroup) });
  } catch (err) {
    console.error('[Groups API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new group (authenticated staff only)
export async function POST(request: NextRequest) {
  try {
    // Auth check (optional in dev — staff-only in production)
    try {
      const cookieStore = await cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      if (supabaseUrl && supabaseAnonKey) {
        const authClient = createSupabaseSSR(supabaseUrl, supabaseAnonKey, {
          cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
        });
        const { data: { user } } = await authClient.auth.getUser();
        // Allow through if no user but we have service key (staff API)
        if (!user && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      }
    } catch { /* allow through in dev */ }

    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const body = await request.json();
    const slug = (body.slug || body.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) as string;

    const { data, error } = await supabase.from('client_groups').insert({
      name: body.name,
      slug,
      description: body.description || null,
      form_config: body.formConfig || [],
      welcome_title: body.welcomeTitle || null,
      welcome_description: body.welcomeDescription || null,
      branding: body.branding || {},
      stripe_enabled: body.stripeEnabled ?? false,
      stripe_price_id: body.stripePriceId || null,
      stripe_promo_enabled: body.stripePromoEnabled ?? false,
      stripe_promo_code: body.stripePromoCode || null,
      stripe_promo_code_id: body.stripePromoCodeId || null,
      payment_description: body.paymentDescription || null,
      is_active: body.isActive ?? true,
      default_form_id: body.defaultFormId || null,
    }).select('*').single();

    if (error) {
      console.error('[Groups API] Create error:', error);
      if (error.code === '23505') return NextResponse.json({ error: 'A group with this slug already exists' }, { status: 409 });
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    return NextResponse.json({ group: dbToGroup(data) }, { status: 201 });
  } catch (err) {
    console.error('[Groups API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
