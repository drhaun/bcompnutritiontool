import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { normalizePricingConfig, resolveFormPricing } from '@/lib/form-pricing';

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
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const { data: form, error } = await supabase
      .from('intake_forms')
      .select('pricing_config, stripe_price_id')
      .eq('id', id)
      .single();

    if (error || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const customAnswers = (body.customAnswers || {}) as Record<string, unknown>;
    const pricingConfig = normalizePricingConfig(form.pricing_config, form.stripe_price_id);

    if (!pricingConfig) {
      return NextResponse.json({ pricing: null });
    }

    const priceIds = [
      ...(pricingConfig.mode === 'fixed' ? [pricingConfig.fixedPriceId] : []),
      ...(pricingConfig.mode === 'per_player' ? [pricingConfig.perPlayerPriceId] : []),
      ...(pricingConfig.mode === 'base_plus_per_player' ? [pricingConfig.basePriceId, pricingConfig.perPlayerPriceId] : []),
      ...(pricingConfig.mode === 'tiered' ? pricingConfig.tiers.map(tier => tier.flatPriceId) : []),
    ].filter((priceId): priceId is string => typeof priceId === 'string' && priceId.trim().length > 0);

    let priceLookup: Record<string, { unitAmount: number | null; currency: string | null }> = {};
    if (priceIds.length > 0 && process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const prices = await Promise.all(Array.from(new Set(priceIds)).map(async priceId => {
        const price = await stripe.prices.retrieve(priceId);
        return [priceId, { unitAmount: price.unit_amount, currency: price.currency }] as const;
      }));
      priceLookup = Object.fromEntries(prices);
    }

    const pricing = resolveFormPricing(pricingConfig, customAnswers, priceLookup);
    return NextResponse.json({ pricing });
  } catch (err) {
    console.error('[Form Pricing Preview] Error:', err);
    return NextResponse.json({ error: 'Failed to preview pricing' }, { status: 500 });
  }
}
