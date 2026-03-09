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
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Look up client by intake token
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id, name, email, intake_token, stripe_payment_id')
      .eq('intake_token', token)
      .single();

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    if (client.stripe_payment_id) {
      return NextResponse.json({ error: 'Payment already completed' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = request.headers.get('origin') || request.nextUrl.origin;

    const { data: submission, error: submissionErr } = await supabase
      .from('form_submissions')
      .select('id, form_id, form_data, pricing_snapshot, status')
      .eq('client_id', client.id)
      .in('status', ['pending_payment', 'submitted'])
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (submissionErr || !submission?.form_id) {
      return NextResponse.json({ error: 'No payable form submission found' }, { status: 400 });
    }

    const { data: form, error: formErr } = await supabase
      .from('intake_forms')
      .select('name, stripe_enabled, stripe_promo_enabled, payment_description, pricing_config, stripe_price_id')
      .eq('id', submission.form_id)
      .single();

    if (formErr || !form) {
      return NextResponse.json({ error: 'Form configuration not found' }, { status: 404 });
    }

    const pricingConfig = normalizePricingConfig(form.pricing_config, form.stripe_price_id);
    if (!form.stripe_enabled || !pricingConfig) {
      return NextResponse.json({ error: 'Payment not required for this form' }, { status: 400 });
    }

    const priceIds = [
      ...(pricingConfig.mode === 'fixed' ? [pricingConfig.fixedPriceId] : []),
      ...(pricingConfig.mode === 'per_player' ? [pricingConfig.perPlayerPriceId] : []),
      ...(pricingConfig.mode === 'base_plus_per_player' ? [pricingConfig.basePriceId, pricingConfig.perPlayerPriceId] : []),
      ...(pricingConfig.mode === 'tiered' ? pricingConfig.tiers.map(tier => tier.flatPriceId) : []),
    ].filter((priceId): priceId is string => typeof priceId === 'string' && priceId.trim().length > 0);

    const prices = await Promise.all(Array.from(new Set(priceIds)).map(async priceId => {
      const price = await stripe.prices.retrieve(priceId);
      return [priceId, { unitAmount: price.unit_amount, currency: price.currency }] as const;
    }));
    const priceLookup = Object.fromEntries(prices);
    const customAnswers = ((submission.form_data as Record<string, unknown>)?.customAnswers || {}) as Record<string, unknown>;
    const pricing = resolveFormPricing(pricingConfig, customAnswers, priceLookup);

    if (!pricing.requiresCheckout || pricing.lineItems.length === 0) {
      return NextResponse.json({ error: pricing.message || 'This form does not have a payable pricing configuration' }, { status: 400 });
    }

    await supabase
      .from('form_submissions')
      .update({
        pricing_snapshot: pricing,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submission.id);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: pricing.lineItems.map(item => ({ price: item.priceId, quantity: item.quantity })),
      success_url: `${origin}/intake/${token}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/intake/${token}`,
      customer_email: client.email || undefined,
      metadata: {
        client_id: client.id,
        intake_token: token,
        submission_id: submission.id,
        pricing_mode: pricing.mode,
        player_count: pricing.playerCount != null ? String(pricing.playerCount) : '',
      },
    };

    if (form.stripe_promo_enabled) {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url, pricing });
  } catch (err) {
    console.error('[Checkout API] Error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
