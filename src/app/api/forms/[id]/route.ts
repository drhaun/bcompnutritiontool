import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyResolvedFormConfig, dbToFormFieldAssignment } from '@/lib/form-resolution';
import { normalizeFormConfig } from '@/lib/form-fields';
import { syncUnifiedFieldLibrary } from '@/lib/unified-field-library';

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
    formConfig: normalizeFormConfig((row.form_config || []) as []),
    welcomeTitle: row.welcome_title || '',
    welcomeDescription: row.welcome_description || '',
    stripeEnabled: row.stripe_enabled || false,
    stripePriceId: row.stripe_price_id || '',
    stripePromoEnabled: row.stripe_promo_enabled || false,
    stripePromoCode: row.stripe_promo_code || null,
    stripePromoCodeId: row.stripe_promo_code_id || null,
    paymentDescription: row.payment_description || '',
    pricingConfig: row.pricing_config || null,
    clientCreationMode: row.client_creation_mode || 'on_start',
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  await syncUnifiedFieldLibrary(supabase as never);

  const { data, error } = await supabase.from('intake_forms').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  const { data: assignmentRows } = await supabase
    .from('form_field_assignments')
    .select('*, field:custom_fields(*)')
    .eq('form_id', id)
    .order('sort_order', { ascending: true });

  return NextResponse.json({
    form: applyResolvedFormConfig(dbToForm(data), (assignmentRows || []).map(row => dbToFormFieldAssignment(row as Record<string, unknown>))),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.name !== undefined) updates.name = body.name;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.description !== undefined) updates.description = body.description;
  if (body.formConfig !== undefined) updates.form_config = normalizeFormConfig(body.formConfig);
  if (body.welcomeTitle !== undefined) updates.welcome_title = body.welcomeTitle;
  if (body.welcomeDescription !== undefined) updates.welcome_description = body.welcomeDescription;
  if (body.stripeEnabled !== undefined) updates.stripe_enabled = body.stripeEnabled;
  if (body.stripePriceId !== undefined) updates.stripe_price_id = body.stripePriceId;
  if (body.stripePromoEnabled !== undefined) updates.stripe_promo_enabled = body.stripePromoEnabled;
  if (body.stripePromoCode !== undefined) updates.stripe_promo_code = body.stripePromoCode;
  if (body.stripePromoCodeId !== undefined) updates.stripe_promo_code_id = body.stripePromoCodeId;
  if (body.paymentDescription !== undefined) updates.payment_description = body.paymentDescription;
  if (body.pricingConfig !== undefined) updates.pricing_config = body.pricingConfig;
  if (body.clientCreationMode !== undefined) updates.client_creation_mode = body.clientCreationMode;
  if (body.isActive !== undefined) updates.is_active = body.isActive;

  const { data, error } = await supabase.from('intake_forms').update(updates).eq('id', id).select('*').single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: assignmentRows } = await supabase
    .from('form_field_assignments')
    .select('*, field:custom_fields(*)')
    .eq('form_id', id)
    .order('sort_order', { ascending: true });

  return NextResponse.json({
    form: applyResolvedFormConfig(dbToForm(data), (assignmentRows || []).map(row => dbToFormFieldAssignment(row as Record<string, unknown>))),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { error } = await supabase.from('intake_forms').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
