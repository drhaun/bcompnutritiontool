import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

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

    // Find the group for this client to get Stripe config
    const { data: tags } = await supabase
      .from('client_group_tags')
      .select('group_id')
      .eq('client_id', client.id)
      .limit(1);

    if (!tags?.length) {
      return NextResponse.json({ error: 'No group associated' }, { status: 400 });
    }

    const { data: group } = await supabase
      .from('client_groups')
      .select('stripe_enabled, stripe_price_id, stripe_promo_enabled, payment_description, name')
      .eq('id', tags[0].group_id)
      .single();

    if (!group?.stripe_enabled || !group?.stripe_price_id) {
      return NextResponse.json({ error: 'Payment not required for this group' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = request.headers.get('origin') || request.nextUrl.origin;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: [{ price: group.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/intake/${token}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/intake/${token}`,
      customer_email: client.email || undefined,
      metadata: { client_id: client.id, intake_token: token },
    };

    if (group.stripe_promo_enabled) {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Checkout API] Error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
