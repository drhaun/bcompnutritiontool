import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getStaffFromAuthUser } from '@/lib/kroger-client';
import Stripe from 'stripe';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/**
 * POST — Create a Stripe Payment Link for a grocery order and send it to the client.
 * The order must be in 'cost_confirmed' status with a total_charged set.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServerClient();
    if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const staff = await getStaffFromAuthUser(user.id);
    if (!staff) return NextResponse.json({ error: 'Not a staff member' }, { status: 403 });

    const { data: order } = await db
      .from('grocery_orders')
      .select('*, clients(name, email)')
      .eq('id', id)
      .eq('staff_id', staff.id)
      .single();

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (!order.total_charged) {
      return NextResponse.json({ error: 'Confirm the actual cost before invoicing' }, { status: 400 });
    }

    const client = order.clients as { name: string; email: string } | null;
    if (!client?.email) {
      return NextResponse.json({ error: 'Client has no email address' }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

    const amountCents = Math.round(order.total_charged * 100);
    const itemCount = order.item_count || 0;

    const price = await stripe.prices.create({
      unit_amount: amountCents,
      currency: 'usd',
      product_data: {
        name: `Grocery Order — ${itemCount} items`,
        metadata: { grocery_order_id: id },
      },
    });

    // Create a payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        grocery_order_id: id,
        client_id: order.client_id,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/grocery-order-confirmed?order_id=${id}`,
        },
      },
    });

    // Update the order
    const { data: updated, error: updateErr } = await db
      .from('grocery_orders')
      .update({
        stripe_payment_link_id: paymentLink.id,
        stripe_payment_link_url: paymentLink.url,
        stripe_payment_status: 'sent',
        status: 'invoiced',
        invoiced_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      order: updated,
      paymentLink: {
        id: paymentLink.id,
        url: paymentLink.url,
      },
      clientEmail: client.email,
      clientName: client.name,
    });
  } catch (err) {
    console.error('[Grocery Invoice]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
