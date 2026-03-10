import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireStaffSession } from '@/lib/api-auth';

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
    const staffSession = await requireStaffSession();
    const { id } = await params;
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const body = await request.json().catch(() => ({}));
    const publishedBy = body.publishedBy || staffSession.user.id;

    const { data: submission, error } = await supabase
      .from('form_submissions')
      .select('id, group_id, form_id, form_data, reviewed_form_data')
      .eq('id', id)
      .single();

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (!submission.group_id || !submission.form_id) {
      return NextResponse.json({ error: 'Submission is not attached to a group source form' }, { status: 400 });
    }

    const publishData = (submission.reviewed_form_data || submission.form_data || {}) as Record<string, unknown>;
    const now = new Date().toISOString();

    const { data: links, error: linksError } = await supabase
      .from('group_form_links')
      .update({
        source_data: publishData,
        source_filled_at: now,
        source_filled_by: publishedBy,
        updated_at: now,
      })
      .eq('group_id', submission.group_id)
      .eq('source_form_id', submission.form_id)
      .eq('is_active', true)
      .select('id');

    if (linksError) {
      console.error('[Submission Publish] Link publish error:', linksError);
      return NextResponse.json({ error: 'Failed to publish linked form data' }, { status: 500 });
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ error: 'No active linked target forms found for this source submission' }, { status: 400 });
    }

    await supabase
      .from('form_submissions')
      .update({
        review_status: 'published',
        status: 'reviewed',
        reviewed_at: now,
        reviewed_by: publishedBy,
        published_at: now,
        published_by: publishedBy,
        published_link_id: links?.[0]?.id || null,
        updated_at: now,
      })
      .eq('id', id);

    return NextResponse.json({ success: true, publishedLinkIds: (links || []).map(link => link.id) });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[Submission Publish] Error:', err);
    return NextResponse.json({ error: 'Failed to publish submission' }, { status: 500 });
  }
}
