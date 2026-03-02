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

const SENSITIVE_USER_PROFILE_KEYS = new Set([
  'metabolicAssessment',
  'goalType', 'goalRate', 'recompBias', 'rateOfChange',
  'goalWeight', 'goalBodyFatPercent', 'goalFatMass', 'goalFFM',
]);

function stripSensitiveKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (!SENSITIVE_USER_PROFILE_KEYS.has(key)) result[key] = val;
  }
  return result;
}

/**
 * Final submission endpoint for forms with client_creation_mode = 'on_submit' or 'none'.
 * - on_submit: creates client + group tag + form_submission + draft phase
 * - none: creates form_submission only (no client record)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

    const mode: string = body.mode; // 'on_submit' | 'none'
    if (!mode || !['on_submit', 'none'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const sourceTag = { _dataSource: { source: 'intake_form', updatedAt: now } };
    const userProfile = body.userProfile || {};
    const dietPreferences = body.dietPreferences || {};
    const customAnswers = body.customAnswers || {};
    const name: string = body.name || '';
    const email: string = body.email || '';
    const formId: string | null = body.formId || null;
    const groupSlug: string | null = body.groupSlug || null;

    // Resolve group
    let groupId: string | null = null;
    let groupName: string | null = null;
    let resolvedGroupSlug: string | null = null;
    let formConfig: unknown[] = [];
    let stripeEnabled = false;

    if (groupSlug) {
      const { data: group } = await supabase
        .from('client_groups')
        .select('id, name, slug, form_config, default_form_id, stripe_enabled')
        .eq('slug', groupSlug)
        .single();
      if (group) {
        groupId = group.id as string;
        groupName = group.name as string;
        resolvedGroupSlug = group.slug as string;
        formConfig = (group.form_config as unknown[]) || [];
        stripeEnabled = !!(group.stripe_enabled);
      } else {
        const { data: form } = await supabase
          .from('intake_forms')
          .select('group_id')
          .eq('slug', groupSlug)
          .limit(1)
          .single();
        if (form?.group_id) {
          const { data: g2 } = await supabase
            .from('client_groups')
            .select('id, name, slug, form_config, stripe_enabled')
            .eq('id', form.group_id)
            .single();
          if (g2) {
            groupId = g2.id as string;
            groupName = g2.name as string;
            resolvedGroupSlug = g2.slug as string;
            formConfig = (g2.form_config as unknown[]) || [];
            stripeEnabled = !!(g2.stripe_enabled);
          }
        }
      }
    }

    let clientId: string | null = null;
    let intakeToken: string | null = null;
    const needsPayment = stripeEnabled && mode === 'on_submit';
    const clientStatus = needsPayment ? 'payment_pending' : 'completed';

    if (mode === 'on_submit') {
      if (!name || !email) {
        return NextResponse.json({ error: 'Name and email required for on_submit mode' }, { status: 400 });
      }

      // Check for existing client with this email that's pending/in_progress/payment_pending
      const { data: existing } = await supabase
        .from('clients')
        .select('id, intake_token')
        .eq('email', email.trim().toLowerCase())
        .in('intake_status', ['pending', 'in_progress', 'payment_pending'])
        .limit(1)
        .single();

      if (existing) {
        clientId = existing.id as string;
        intakeToken = existing.intake_token as string;
        const safeProfile = stripSensitiveKeys(userProfile);
        const { data: currentClient } = await supabase
          .from('clients')
          .select('user_profile, diet_preferences, weekly_schedule')
          .eq('id', clientId)
          .single();

        await supabase.from('clients').update({
          name,
          email: email.trim().toLowerCase(),
          user_profile: {
            ...deepMerge((currentClient?.user_profile as Record<string, unknown>) || {}, safeProfile),
            ...sourceTag,
            ...(Object.keys(customAnswers).length > 0 ? { customAnswers } : {}),
          },
          diet_preferences: {
            ...deepMerge((currentClient?.diet_preferences as Record<string, unknown>) || {}, dietPreferences),
            ...sourceTag,
          },
          intake_status: clientStatus,
          ...(clientStatus === 'completed' ? { intake_completed_at: now } : {}),
          updated_at: now,
        }).eq('id', clientId);
      } else {
        const safeProfile = stripSensitiveKeys(userProfile);
        const token = randomUUID();
        intakeToken = token;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: newClient, error: insertErr } = await supabase
          .from('clients')
          .insert({
            name,
            email: email.trim().toLowerCase(),
            coach_id: null,
            intake_token: token,
            intake_token_expires_at: expiresAt,
            intake_status: clientStatus,
            ...(clientStatus === 'completed' ? { intake_completed_at: now } : {}),
            user_profile: {
              ...safeProfile,
              ...sourceTag,
              name,
              ...(Object.keys(customAnswers).length > 0 ? { customAnswers } : {}),
            },
            diet_preferences: { ...dietPreferences, ...sourceTag },
          })
          .select('id')
          .single();

        if (insertErr) {
          console.error('[Intake Submit] Client insert error:', insertErr);
          return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
        }
        clientId = newClient!.id as string;
      }

      // Tag client into group
      if (groupId && clientId) {
        const { data: existingTag } = await supabase
          .from('client_group_tags')
          .select('id')
          .eq('client_id', clientId)
          .eq('group_id', groupId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (!existingTag) {
          await supabase.from('client_group_tags').insert({ client_id: clientId, group_id: groupId });
        }
      }
    }

    // Create form_submission
    const submissionStatus = needsPayment ? 'pending_payment' : 'submitted';
    try {
      await supabase.from('form_submissions').insert({
        client_id: clientId,
        group_id: groupId,
        form_id: formId,
        group_name: groupName,
        group_slug: resolvedGroupSlug,
        form_config: formConfig,
        form_data: {
          userProfile,
          dietPreferences,
          weeklySchedule: {},
          name,
          email,
          customAnswers,
        },
        status: submissionStatus,
        submitted_at: now,
      });
      console.log('[Intake Submit] Form submission created, mode:', mode, 'status:', submissionStatus);
    } catch (subErr) {
      console.error('[Intake Submit] form_submission insert error:', subErr);
    }

    // Create draft body comp phase (only for on_submit with a client, skip if Stripe payment pending)
    if (mode === 'on_submit' && clientId && !needsPayment) {
      const up = userProfile;
      const GOAL_TYPE_NORMALIZE: Record<string, string> = { lose_fat: 'fat_loss', gain_muscle: 'muscle_gain', recomp: 'recomposition' };
      const rawGoalType = up.goalType as string | undefined;
      const goalType = rawGoalType ? (GOAL_TYPE_NORMALIZE[rawGoalType] || rawGoalType) : undefined;

      if (goalType === 'fat_loss' || goalType === 'muscle_gain' || goalType === 'recomposition') {
        try {
          const { data: phaseRow, error: phaseReadErr } = await supabase
            .from('clients')
            .select('phases')
            .eq('id', clientId)
            .single();

          if (!phaseReadErr) {
            const existingPhases = (Array.isArray(phaseRow?.phases) ? phaseRow.phases : []) as unknown[];
            const phaseId = randomUUID();
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const GOAL_LABELS: Record<string, string> = { fat_loss: 'Fat Loss', muscle_gain: 'Muscle Gain', recomposition: 'Recomp' };

            const isMetric = up.unitSystem === 'metric';
            const toLbs = (v: number) => isMetric ? v * 2.205 : v;
            const weightLbs = up.weightLbs || (isMetric && up.weightKg ? (up.weightKg as number) * 2.205 : 170);
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

            const { error: phasesErr } = await supabase
              .from('clients')
              .update({ phases: [...existingPhases, newPhase] })
              .eq('id', clientId);

            if (!phasesErr) {
              console.log('[Intake Submit] Phase created:', phaseId, goalType);
              await supabase.from('clients').update({ active_phase_id: phaseId }).eq('id', clientId);
            } else {
              console.error('[Intake Submit] Phase write failed:', phasesErr.message);
            }
          }
        } catch (err) {
          console.error('[Intake Submit] Phase exception:', err);
        }
      }
    }

    return NextResponse.json({ success: true, clientId, token: intakeToken, stripeRequired: needsPayment });
  } catch (err) {
    console.error('[Intake Submit] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
