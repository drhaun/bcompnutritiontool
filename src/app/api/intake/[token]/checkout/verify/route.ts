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
    const body = await request.json();
    const sessionId = body.sessionId as string;

    if (!sessionId || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
    }

    // Verify the session matches this token
    if (session.metadata?.intake_token !== token) {
      return NextResponse.json({ error: 'Token mismatch' }, { status: 403 });
    }

    // Update client with payment info and mark intake as completed
    const { data: updatedClient, error: updateErr } = await supabase
      .from('clients')
      .update({
        stripe_payment_id: session.id,
        intake_status: 'completed',
        intake_completed_at: new Date().toISOString(),
      })
      .eq('intake_token', token)
      .select('id')
      .single();

    if (updateErr) {
      console.error('[Checkout Verify] Update error:', updateErr);
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
    }

    // Finalize any pending_payment form_submissions for this client
    if (updatedClient?.id) {
      await supabase
        .from('form_submissions')
        .update({ status: 'submitted', stripe_payment_id: session.id })
        .eq('client_id', updatedClient.id)
        .eq('status', 'pending_payment');
    }

    return NextResponse.json({ success: true, paymentStatus: session.payment_status });
  } catch (err) {
    console.error('[Checkout Verify] Error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
