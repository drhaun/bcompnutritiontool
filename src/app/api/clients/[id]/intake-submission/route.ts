import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ submission: null });
    }

    const { data, error } = await supabase
      .from('form_submissions')
      .select('id, form_data, submitted_at, group_name, group_slug, status, stripe_payment_id')
      .eq('client_id', clientId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ submission: null });
    }

    return NextResponse.json({
      submission: {
        id: data.id,
        submittedAt: data.submitted_at,
        formData: data.form_data,
        groupName: data.group_name,
        groupSlug: data.group_slug,
        status: data.status,
        paymentId: data.stripe_payment_id,
      },
    });
  } catch (err) {
    console.error('[Intake Submission] Error:', err);
    return NextResponse.json({ submission: null });
  }
}
