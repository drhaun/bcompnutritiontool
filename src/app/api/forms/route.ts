import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function dbToForm(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    formConfig: row.form_config || [],
    welcomeTitle: row.welcome_title || '',
    welcomeDescription: row.welcome_description || '',
    stripeEnabled: row.stripe_enabled || false,
    stripePriceId: row.stripe_price_id || '',
    stripePromoEnabled: row.stripe_promo_enabled || false,
    stripePromoCode: row.stripe_promo_code || null,
    stripePromoCodeId: row.stripe_promo_code_id || null,
    paymentDescription: row.payment_description || '',
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const slug = request.nextUrl.searchParams.get('slug');
  const activeOnly = request.nextUrl.searchParams.get('active_only') === 'true';

  let query = supabase.from('intake_forms').select('*').order('created_at', { ascending: false });

  if (slug) query = query.eq('slug', slug);
  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ forms: (data || []).map(dbToForm) });
}

export async function POST(request: NextRequest) {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const body = await request.json();
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const slug = (body.slug || body.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });

  const { data, error } = await supabase
    .from('intake_forms')
    .insert({
      name: body.name.trim(),
      slug,
      description: body.description || null,
      form_config: body.formConfig || [],
      welcome_title: body.welcomeTitle || null,
      welcome_description: body.welcomeDescription || null,
      stripe_enabled: body.stripeEnabled || false,
      stripe_price_id: body.stripePriceId || null,
      stripe_promo_enabled: body.stripePromoEnabled || false,
      stripe_promo_code: body.stripePromoCode || null,
      stripe_promo_code_id: body.stripePromoCodeId || null,
      payment_description: body.paymentDescription || null,
      is_active: body.isActive ?? true,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A form with this slug already exists' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ form: dbToForm(data) }, { status: 201 });
}
