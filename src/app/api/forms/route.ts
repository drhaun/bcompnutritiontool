import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyResolvedFormConfig, dbToFormFieldAssignment } from '@/lib/form-resolution';
import { normalizeFormConfig } from '@/lib/form-fields';
import { syncUnifiedFieldLibrary } from '@/lib/unified-field-library';
import { getOptionalStaffSession, requireStaffSession } from '@/lib/api-auth';
import type { ClientCreationMode, FormPricingConfig, IntakeForm } from '@/types';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function dbToForm(row: Record<string, unknown>): IntakeForm {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    slug: String(row.slug || ''),
    description: String(row.description || ''),
    formConfig: normalizeFormConfig((row.form_config || []) as []),
    welcomeTitle: String(row.welcome_title || ''),
    welcomeDescription: String(row.welcome_description || ''),
    stripeEnabled: !!row.stripe_enabled,
    stripePriceId: row.stripe_price_id ? String(row.stripe_price_id) : '',
    stripePromoEnabled: !!row.stripe_promo_enabled,
    stripePromoCode: row.stripe_promo_code ? String(row.stripe_promo_code) : null,
    stripePromoCodeId: row.stripe_promo_code_id ? String(row.stripe_promo_code_id) : null,
    paymentDescription: String(row.payment_description || ''),
    pricingConfig: (row.pricing_config as FormPricingConfig | null) || null,
    clientCreationMode: (row.client_creation_mode as ClientCreationMode) || 'on_start',
    isActive: typeof row.is_active === 'boolean' ? row.is_active : true,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  await syncUnifiedFieldLibrary(supabase as never);

  const staffSession = await getOptionalStaffSession();
  const slug = request.nextUrl.searchParams.get('slug');
  const activeOnly = request.nextUrl.searchParams.get('active_only') === 'true';

  let query = supabase.from('intake_forms').select('*').order('created_at', { ascending: false });

  if (!staffSession) query = query.eq('is_active', true);
  if (slug) query = query.eq('slug', slug);
  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const forms = (data || []).map(dbToForm);
  const formIds = forms.map(form => form.id);

  let assignmentsByFormId: Record<string, ReturnType<typeof dbToFormFieldAssignment>[]> = {};
  if (formIds.length > 0) {
    const { data: assignmentRows } = await supabase
      .from('form_field_assignments')
      .select('*, field:custom_fields(*)')
      .in('form_id', formIds)
      .order('sort_order', { ascending: true });

    assignmentsByFormId = Object.create(null) as Record<string, ReturnType<typeof dbToFormFieldAssignment>[]>;
    for (const row of assignmentRows || []) {
      const assignment = dbToFormFieldAssignment(row as Record<string, unknown>);
      if (!assignmentsByFormId[assignment.formId]) assignmentsByFormId[assignment.formId] = [];
      assignmentsByFormId[assignment.formId].push(assignment);
    }
  }

  return NextResponse.json({
    forms: forms.map(form => applyResolvedFormConfig(form, assignmentsByFormId[form.id] || [])),
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireStaffSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      form_config: normalizeFormConfig(body.formConfig || []),
      welcome_title: body.welcomeTitle || null,
      welcome_description: body.welcomeDescription || null,
      stripe_enabled: body.stripeEnabled || false,
      stripe_price_id: body.stripePriceId || null,
      stripe_promo_enabled: body.stripePromoEnabled || false,
      stripe_promo_code: body.stripePromoCode || null,
      stripe_promo_code_id: body.stripePromoCodeId || null,
      payment_description: body.paymentDescription || null,
      pricing_config: body.pricingConfig || null,
      client_creation_mode: body.clientCreationMode || 'on_start',
      is_active: body.isActive ?? true,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A form with this slug already exists' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ form: applyResolvedFormConfig(dbToForm(data), []) }, { status: 201 });
}
