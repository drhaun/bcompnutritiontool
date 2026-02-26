import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function deepMerge(existing: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> {
  const result = { ...existing };
  for (const key of Object.keys(incoming)) {
    const val = incoming[key];
    if (val !== undefined && val !== null && typeof val === 'object' && !Array.isArray(val) && typeof existing[key] === 'object' && !Array.isArray(existing[key]) && existing[key] !== null) {
      result[key] = deepMerge(existing[key] as Record<string, unknown>, val as Record<string, unknown>);
    } else if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}

// Fields that should NOT auto-write to the client record from intake.
// Coach reviews these via "Apply" buttons in the admin UI.
// They are still captured in form_submissions.form_data.
const SENSITIVE_USER_PROFILE_KEYS = new Set([
  'metabolicAssessment',
  'goalType', 'goalRate', 'recompBias', 'rateOfChange',
  'goalWeight', 'goalBodyFatPercent', 'goalFatMass', 'goalFFM',
]);

function stripSensitiveKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (!SENSITIVE_USER_PROFILE_KEYS.has(key)) {
      result[key] = val;
    }
  }
  return result;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const supabase = getServiceClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data: client, error: lookupErr } = await supabase
      .from('clients')
      .select('id, intake_token_expires_at, intake_status, user_profile, diet_preferences, weekly_schedule')
      .eq('intake_token', token)
      .single();

    if (lookupErr || !client) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    if (client.intake_token_expires_at && new Date(client.intake_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 410 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };
    const sourceTag = { _dataSource: { source: 'intake_form', updatedAt: now } };

    // Auto-populate most fields via deep merge, but strip sensitive keys from userProfile
    if (body.userProfile !== undefined) {
      const safeProfile = stripSensitiveKeys(body.userProfile);
      updates.user_profile = {
        ...deepMerge(
          (client.user_profile as Record<string, unknown>) || {},
          safeProfile
        ),
        ...sourceTag,
      };
    }
    if (body.dietPreferences !== undefined) {
      updates.diet_preferences = {
        ...deepMerge(
          (client.diet_preferences as Record<string, unknown>) || {},
          body.dietPreferences
        ),
        ...sourceTag,
      };
    }
    if (body.weeklySchedule !== undefined) {
      updates.weekly_schedule = {
        ...deepMerge(
          (client.weekly_schedule as Record<string, unknown>) || {},
          body.weeklySchedule
        ),
        ...sourceTag,
      };
    }
    if (body.name !== undefined) updates.name = body.name;
    if (body.email !== undefined) updates.email = body.email;

    if (body.customAnswers !== undefined) {
      const existing = (updates.user_profile || client.user_profile || {}) as Record<string, unknown>;
      updates.user_profile = { ...existing, customAnswers: body.customAnswers };
    }

    if (body.completed) {
      updates.intake_status = 'completed';
      updates.intake_completed_at = now;
    } else if (client.intake_status === 'pending') {
      updates.intake_status = 'in_progress';
    }

    const { error: updateErr } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', client.id);

    if (updateErr) {
      console.error('[Intake Save] Update error:', updateErr);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    // On completion, create an immutable form_submission snapshot (includes ALL fields, even sensitive ones)
    if (body.completed) {
      try {
        const { data: tagRow } = await supabase
          .from('client_group_tags')
          .select('group_id')
          .eq('client_id', client.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        let groupName: string | null = null;
        let groupSlug: string | null = null;
        let formConfig: unknown[] = [];
        let formId: string | null = body.formId || null;

        if (tagRow?.group_id) {
          const { data: group } = await supabase
            .from('client_groups')
            .select('name, slug, form_config, default_form_id')
            .eq('id', tagRow.group_id)
            .single();
          if (group) {
            groupName = group.name;
            groupSlug = group.slug;
            formConfig = group.form_config as unknown[] || [];
            if (!formId && group.default_form_id) formId = group.default_form_id as string;
          }
        }

        const { data: fullClient } = await supabase
          .from('clients')
          .select('user_profile, diet_preferences, weekly_schedule, name, email, stripe_payment_id')
          .eq('id', client.id)
          .single();

        await supabase.from('form_submissions').insert({
          client_id: client.id,
          group_id: tagRow?.group_id || null,
          form_id: formId,
          group_name: groupName,
          group_slug: groupSlug,
          form_config: formConfig,
          form_data: {
            userProfile: body.userProfile || {},
            dietPreferences: body.dietPreferences || {},
            weeklySchedule: body.weeklySchedule || {},
            name: fullClient?.name,
            email: fullClient?.email,
            customAnswers: body.customAnswers || {},
          },
          status: 'submitted',
          submitted_at: now,
          stripe_payment_id: fullClient?.stripe_payment_id || null,
        });
      } catch (subErr) {
        console.error('[Intake Save] form_submission insert error:', subErr);
      }
    }

    return NextResponse.json({ success: true, status: updates.intake_status });
  } catch (err) {
    console.error('[Intake Save] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
