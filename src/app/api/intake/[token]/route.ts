import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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

    const isFinalSave = body.completed || body.preCheckout;

    if (body.completed) {
      updates.intake_status = 'completed';
      updates.intake_completed_at = now;
    } else if (body.preCheckout) {
      updates.intake_status = 'payment_pending';
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

    // On final save (completion or pre-checkout), create the form_submission snapshot
    // and draft body composition phase from goal data
    if (isFinalSave) {
      // Fetch context data needed for both form_submission and phase creation
      let tagRow: { group_id: string } | null = null;
      let fullClient: Record<string, unknown> | null = null;
      let groupName: string | null = null;
      let groupSlug: string | null = null;
      let formConfig: unknown[] = [];
      let formId: string | null = body.formId || null;

      try {
        const { data: tag } = await supabase
          .from('client_group_tags')
          .select('group_id')
          .eq('client_id', client.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        tagRow = tag;

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

        const { data: fc } = await supabase
          .from('clients')
          .select('user_profile, diet_preferences, weekly_schedule, name, email, stripe_payment_id, phases')
          .eq('id', client.id)
          .single();
        fullClient = fc as Record<string, unknown> | null;
      } catch (ctxErr) {
        console.error('[Intake Save] Context fetch error:', ctxErr);
      }

      // 1) Create form_submission snapshot (independent try-catch)
      try {
        const submissionStatus = body.preCheckout ? 'pending_payment' : 'submitted';
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
          status: submissionStatus,
          submitted_at: now,
          stripe_payment_id: (fullClient?.stripe_payment_id as string) || null,
        });
        console.log('[Intake Save] Form submission created, status:', submissionStatus);
      } catch (subErr) {
        console.error('[Intake Save] form_submission insert error:', subErr);
      }

      // 2) Create draft body composition phase — completely independent of context above
      let phaseCreated = false;
      let phaseError: string | null = null;
      const up = body.userProfile || {};
      const goalType = up.goalType as string | undefined;
      console.log('[Phase Draft] goalType from body:', goalType, '| completed:', body.completed, '| preCheckout:', body.preCheckout);

      if (goalType === 'fat_loss' || goalType === 'muscle_gain' || goalType === 'recomposition') {
        try {
          // Fetch ONLY the phases column — simple, direct query
          const { data: phaseRow, error: phaseReadErr } = await supabase
            .from('clients')
            .select('phases')
            .eq('id', client.id)
            .single();

          if (phaseReadErr) {
            phaseError = `Read phases failed: ${phaseReadErr.message}`;
            console.error('[Phase Draft]', phaseError);
          } else {
            const existingPhases = (Array.isArray(phaseRow?.phases) ? phaseRow.phases : []) as unknown[];
            const phaseId = randomUUID();
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const GOAL_LABELS: Record<string, string> = { fat_loss: 'Fat Loss', muscle_gain: 'Muscle Gain', recomposition: 'Recomp' };

            const isMetric = up.unitSystem === 'metric';
            const toLbs = (v: number) => isMetric ? v * 2.205 : v;
            const weightLbs = up.weightLbs || (isMetric && up.weightKg ? up.weightKg * 2.205 : 170);
            const bodyFatPct = up.bodyFatPercentage || 20;
            const targetWeightLbs = up.goalWeight ? toLbs(up.goalWeight as number) : weightLbs;
            const targetBodyFat = up.goalBodyFatPercent || bodyFatPct;
            const targetFatMassLbs = up.goalFatMass ? toLbs(up.goalFatMass as number) : ((targetWeightLbs as number) * ((targetBodyFat as number) / 100));
            const targetFFMLbs = up.goalFFM ? toLbs(up.goalFFM as number) : ((targetWeightLbs as number) - (targetFatMassLbs as number));

            const newPhase = {
              id: phaseId,
              name: `${GOAL_LABELS[goalType] || 'Body Comp'} Phase (Draft)`,
              goalType,
              status: 'planned',
              startDate,
              endDate,
              startingWeightLbs: weightLbs,
              startingBodyFat: bodyFatPct,
              targetWeightLbs,
              targetBodyFat,
              targetFatMassLbs,
              targetFFMLbs,
              rateOfChange: up.rateOfChange || 0.5,
              performancePriority: 'body_comp_priority',
              musclePreservation: 'preserve_all',
              fatGainTolerance: 'minimize_fat_gain',
              lifestyleCommitment: 'fully_committed',
              trackingCommitment: 'committed_tracking',
              scheduleOverrides: null,
              nutritionTargets: [],
              mealPlan: null,
              notes: `Auto-created from intake form on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
              createdAt: now,
              updatedAt: now,
            };

            // Write phases FIRST (jsonb, always succeeds)
            const { error: phasesErr } = await supabase
              .from('clients')
              .update({ phases: [...existingPhases, newPhase] })
              .eq('id', client.id);

            if (phasesErr) {
              phaseError = `Phases write failed: ${phasesErr.message}`;
              console.error('[Phase Draft]', phaseError);
            } else {
              phaseCreated = true;
              console.log('[Phase Draft] SUCCESS — wrote phase', phaseId, goalType);

              // Set active phase separately so a uuid type mismatch can't block the phases write
              const { error: activeErr } = await supabase
                .from('clients')
                .update({ active_phase_id: phaseId })
                .eq('id', client.id);
              if (activeErr) {
                console.error('[Phase Draft] active_phase_id write failed (phase still saved):', activeErr.message);
              }
            }
          }
        } catch (err) {
          phaseError = `Exception: ${err instanceof Error ? err.message : String(err)}`;
          console.error('[Phase Draft] Caught exception:', phaseError);
        }
      } else {
        phaseError = `No valid goalType (got: ${goalType})`;
        console.log('[Phase Draft]', phaseError);
      }
    }

    return NextResponse.json({ success: true, status: updates.intake_status });
  } catch (err) {
    console.error('[Intake Save] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
