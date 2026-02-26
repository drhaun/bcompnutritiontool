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

    // Fetch existing client data so we can merge (preserving coach-only fields)
    const { data: client, error: lookupErr } = await supabase
      .from('clients')
      .select('id, intake_token_expires_at, intake_status, user_profile, body_comp_goals, diet_preferences, weekly_schedule')
      .eq('intake_token', token)
      .single();

    if (lookupErr || !client) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    if (client.intake_token_expires_at && new Date(client.intake_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 410 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Merge JSONB columns instead of overwriting — preserves coach-set fields
    // like metabolicAssessment, rmr, scheduleNotes, workoutNotes, mealContexts, etc.
    if (body.userProfile !== undefined) {
      updates.user_profile = deepMerge(
        (client.user_profile as Record<string, unknown>) || {},
        body.userProfile
      );
    }
    if (body.dietPreferences !== undefined) {
      updates.diet_preferences = deepMerge(
        (client.diet_preferences as Record<string, unknown>) || {},
        body.dietPreferences
      );
    }
    if (body.weeklySchedule !== undefined) {
      updates.weekly_schedule = deepMerge(
        (client.weekly_schedule as Record<string, unknown>) || {},
        body.weeklySchedule
      );
    }
    if (body.name !== undefined) updates.name = body.name;
    if (body.email !== undefined) updates.email = body.email;

    if (body.customAnswers !== undefined) {
      const existing = (updates.user_profile || client.user_profile || {}) as Record<string, unknown>;
      updates.user_profile = { ...existing, customAnswers: body.customAnswers };
    }

    if (body.completed) {
      updates.intake_status = 'completed';
      updates.intake_completed_at = new Date().toISOString();

      // Derive body_comp_goals from the submitted userProfile goal fields
      const up = (updates.user_profile || body.userProfile || {}) as Record<string, unknown>;
      const intakeGoalType = up.goalType as string;
      if (intakeGoalType) {
        // Map intake goalType → setup page goalType convention
        const goalTypeMap: Record<string, string> = {
          fat_loss: 'lose_fat',
          muscle_gain: 'gain_muscle',
          recomposition: 'maintain',
        };
        const existingBCG = (client.body_comp_goals as Record<string, unknown>) || {};
        updates.body_comp_goals = {
          ...existingBCG,
          goalType: goalTypeMap[intakeGoalType] || intakeGoalType,
          intakeGoalType, // preserve the original for the planning page
          targetWeightLbs: up.goalWeight ?? existingBCG.targetWeightLbs,
          targetBodyFat: up.goalBodyFatPercent ?? existingBCG.targetBodyFat,
          targetFatMassLbs: up.goalFatMass ?? existingBCG.targetFatMassLbs,
          targetFFMLbs: up.goalFFM ?? existingBCG.targetFFMLbs,
          rateOfChange: up.rateOfChange ?? existingBCG.rateOfChange,
          goalRate: up.goalRate ?? existingBCG.goalRate,
          recompBias: up.recompBias ?? existingBCG.recompBias,
        };
      }
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

    // On completion, create an immutable form_submission record
    if (body.completed) {
      try {
        // Look up group association for this client
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

        if (tagRow?.group_id) {
          const { data: group } = await supabase
            .from('client_groups')
            .select('name, slug, form_config')
            .eq('id', tagRow.group_id)
            .single();
          if (group) {
            groupName = group.name;
            groupSlug = group.slug;
            formConfig = group.form_config as unknown[] || [];
          }
        }

        // Snapshot the full client data at submission time
        const { data: fullClient } = await supabase
          .from('clients')
          .select('user_profile, diet_preferences, weekly_schedule, name, email, stripe_payment_id')
          .eq('id', client.id)
          .single();

        await supabase.from('form_submissions').insert({
          client_id: client.id,
          group_id: tagRow?.group_id || null,
          group_name: groupName,
          group_slug: groupSlug,
          form_config: formConfig,
          form_data: {
            userProfile: fullClient?.user_profile || {},
            dietPreferences: fullClient?.diet_preferences || {},
            weeklySchedule: fullClient?.weekly_schedule || {},
            name: fullClient?.name,
            email: fullClient?.email,
            customAnswers: body.customAnswers || {},
          },
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          stripe_payment_id: fullClient?.stripe_payment_id || null,
        });
      } catch (subErr) {
        // Non-fatal: submission record is supplementary
        console.error('[Intake Save] form_submission insert error:', subErr);
      }

      // Auto-create a draft body composition phase from submitted goals
      try {
        const up = ((await supabase.from('clients').select('user_profile, phases').eq('id', client.id).single()).data) as {
          user_profile: Record<string, unknown>;
          phases: unknown[];
        } | null;

        const intakeGoal = up?.user_profile?.goalType as string | undefined;
        const bodyCompGoals = ['fat_loss', 'muscle_gain', 'recomposition'];

        if (intakeGoal && bodyCompGoals.includes(intakeGoal) && (!up?.phases || up.phases.length === 0)) {
          const profile = up!.user_profile;
          const weightLbs = (profile.weightLbs as number) || 180;
          const bf = (profile.bodyFatPercentage as number) || 20;
          const now = new Date().toISOString();
          const startDate = now.split('T')[0];
          const endDate = new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          const goalLabels: Record<string, string> = { fat_loss: 'Fat Loss', muscle_gain: 'Muscle Gain', recomposition: 'Recomposition' };
          const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
          const year = new Date().getFullYear();

          const phaseId = `phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const draftPhase = {
            id: phaseId,
            name: `${quarter} ${year} ${goalLabels[intakeGoal] || 'Phase'} (from intake)`,
            goalType: intakeGoal,
            status: 'planned',
            startDate,
            endDate,
            startingWeightLbs: weightLbs,
            startingBodyFat: bf,
            targetWeightLbs: (profile.goalWeight as number) || weightLbs,
            targetBodyFat: (profile.goalBodyFatPercent as number) || bf,
            targetFatMassLbs: (profile.goalFatMass as number) || weightLbs * (bf / 100),
            targetFFMLbs: (profile.goalFFM as number) || weightLbs * (1 - bf / 100),
            rateOfChange: (profile.rateOfChange as number) || 0.5,
            performancePriority: 'body_comp_priority',
            musclePreservation: intakeGoal === 'fat_loss' ? 'preserve_all' : 'not_applicable',
            fatGainTolerance: intakeGoal === 'muscle_gain' ? 'minimize_fat_gain' : 'not_applicable',
            lifestyleCommitment: 'fully_committed',
            trackingCommitment: 'committed_tracking',
            scheduleOverrides: null,
            nutritionTargets: [],
            mealPlan: null,
            createdAt: now,
            updatedAt: now,
          };

          await supabase
            .from('clients')
            .update({ phases: [draftPhase], active_phase_id: phaseId })
            .eq('id', client.id);

          console.log('[Intake Save] Auto-created draft phase:', phaseId, 'for client:', client.id);
        }
      } catch (phaseErr) {
        console.error('[Intake Save] Auto-phase creation error (non-fatal):', phaseErr);
      }
    }

    return NextResponse.json({ success: true, status: updates.intake_status });
  } catch (err) {
    console.error('[Intake Save] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
