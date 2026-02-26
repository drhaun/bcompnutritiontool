import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function dbToSubmission(row: Record<string, unknown>) {
  return {
    id: row.id,
    clientId: row.client_id,
    groupId: row.group_id,
    groupName: row.group_name,
    groupSlug: row.group_slug,
    formConfig: row.form_config || [],
    formData: row.form_data || {},
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    notes: row.notes,
    stripePaymentId: row.stripe_payment_id,
  };
}

// GET: List all submissions for a client
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('client_id', id)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('[Submissions] GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json({ submissions: (data || []).map(dbToSubmission) });
  } catch (err) {
    console.error('[Submissions] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update submission status/notes (for coach review)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const body = await request.json();
    const { submissionId, status, notes, reviewedBy } = body;
    if (!submissionId) return NextResponse.json({ error: 'submissionId required' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (status === 'reviewed') {
      updates.reviewed_at = new Date().toISOString();
      if (reviewedBy) updates.reviewed_by = reviewedBy;
    }

    const { data, error } = await supabase
      .from('form_submissions')
      .update(updates)
      .eq('id', submissionId)
      .eq('client_id', clientId)
      .select('*')
      .single();

    if (error) {
      console.error('[Submissions] PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ submission: dbToSubmission(data) });
  } catch (err) {
    console.error('[Submissions] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
