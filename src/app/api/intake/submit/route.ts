import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { getConfiguredPlayerCount, normalizePricingConfig, resolveFormPricing } from '@/lib/form-pricing';
import { fetchResolvedFormConfig } from '@/lib/form-resolution';
import { buildBodyCompGoalsFromIntake, buildDraftNutritionTargetsFromIntake } from '@/lib/intake-derived';

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

function buildLocalSuccessPath(slug: string, submissionId: string) {
  return `/intake/${slug}/success?session_id={CHECKOUT_SESSION_ID}&submission_id=${submissionId}`;
}

function buildLocalCancelPath(slug: string, formId?: string | null) {
  return formId ? `/intake/${slug}?form=${formId}` : `/intake/${slug}`;
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
    const weeklySchedule = body.weeklySchedule || {};
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
    let formStripeEnabled = false;
    let formStripePromoEnabled = false;
    let resolvedFormSlug: string | null = null;
    let resolvedPricingConfig: ReturnType<typeof normalizePricingConfig> = null;
    let pricingSnapshot: Record<string, unknown> | null = null;

    if (groupSlug) {
      const { data: group } = await supabase
        .from('client_groups')
        .select('id, name, slug, form_config, default_form_id, stripe_enabled, is_active')
        .eq('slug', groupSlug)
        .single();
      if (group?.is_active === false) {
        return NextResponse.json({ error: 'This group is no longer accepting submissions.' }, { status: 404 });
      }
      if (group) {
        groupId = group.id as string;
        groupName = group.name as string;
        resolvedGroupSlug = group.slug as string;
        formConfig = (group.form_config as unknown[]) || [];
      }
    }

    if (formId) {
      const { data: selectedForm, error: selectedFormError } = await supabase
        .from('intake_forms')
        .select('form_config, slug, stripe_enabled, stripe_promo_enabled, pricing_config, stripe_price_id, is_active')
        .eq('id', formId)
        .maybeSingle();
      if (selectedForm?.is_active === false) {
        return NextResponse.json({ error: 'This form is no longer available.' }, { status: 404 });
      }
      if (selectedForm?.form_config) {
        formConfig = (await fetchResolvedFormConfig(supabase as never, formId)) as unknown[];
        resolvedFormSlug = (selectedForm.slug as string | null) || null;
        formStripeEnabled = !!selectedForm.stripe_enabled;
        formStripePromoEnabled = !!selectedForm.stripe_promo_enabled;
        resolvedPricingConfig = normalizePricingConfig(selectedForm.pricing_config, selectedForm.stripe_price_id);
        pricingSnapshot = resolvedPricingConfig ? {
          mode: resolvedPricingConfig.mode,
          playerCount: getConfiguredPlayerCount(resolvedPricingConfig, customAnswers),
        } : null;
      } else if (selectedFormError) {
        console.error('[Intake Submit] Form config lookup error:', selectedFormError);
      }
    }

    let clientId: string | null = null;
    let intakeToken: string | null = null;
    const needsPayment = formStripeEnabled;
    // Keep client intake_status compatible with the current DB constraint.
    // pending payment is tracked on form_submissions.status instead.
    const clientStatus = needsPayment ? 'in_progress' : 'completed';

    if (mode === 'on_submit') {
      if (!name || !email) {
        return NextResponse.json({ error: 'Name and email required for on_submit mode' }, { status: 400 });
      }

      // Check for existing client with this email that's still mid-intake
      const { data: existing } = await supabase
        .from('clients')
        .select('id, intake_token')
        .eq('email', email.trim().toLowerCase())
        .in('intake_status', ['pending', 'in_progress'])
        .limit(1)
        .single();

      if (existing) {
        clientId = existing.id as string;
        intakeToken = existing.intake_token as string;
        const safeProfile = stripSensitiveKeys(userProfile);
        const { data: currentClient } = await supabase
          .from('clients')
          .select('user_profile, diet_preferences, weekly_schedule, body_comp_goals')
          .eq('id', clientId)
          .single();

        const safeBodyCompGoals = buildBodyCompGoalsFromIntake(userProfile);
        const draftTargets = buildDraftNutritionTargetsFromIntake(userProfile, weeklySchedule);
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
          weekly_schedule: {
            ...deepMerge((currentClient?.weekly_schedule as Record<string, unknown>) || {}, weeklySchedule),
            ...sourceTag,
          },
          body_comp_goals: {
            ...deepMerge((currentClient?.body_comp_goals as Record<string, unknown>) || {}, safeBodyCompGoals),
            ...sourceTag,
          },
          nutrition_targets: draftTargets,
          intake_status: clientStatus,
          ...(clientStatus === 'completed' ? { intake_completed_at: now } : {}),
          updated_at: now,
        }).eq('id', clientId);
      } else {
        const safeProfile = stripSensitiveKeys(userProfile);
        const safeBodyCompGoals = buildBodyCompGoalsFromIntake(userProfile);
        const draftTargets = buildDraftNutritionTargetsFromIntake(userProfile, weeklySchedule);
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
            weekly_schedule: { ...weeklySchedule, ...sourceTag },
            body_comp_goals: { ...safeBodyCompGoals, ...sourceTag },
            nutrition_targets: draftTargets,
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
    const submissionFormData = {
      userProfile,
      dietPreferences,
      weeklySchedule,
      name,
      email,
      customAnswers,
    };

    let submissionId: string | null = null;
    try {
      const { data: insertedSubmission, error: submissionInsertError } = await supabase.from('form_submissions').insert({
        client_id: clientId,
        group_id: groupId,
        form_id: formId,
        group_name: groupName,
        group_slug: resolvedGroupSlug,
        form_config: formConfig,
        form_data: submissionFormData,
        reviewed_form_data: submissionFormData,
        pricing_snapshot: pricingSnapshot,
        status: submissionStatus,
        submitted_at: now,
        updated_at: now,
      }).select('id').single();
      if (submissionInsertError) throw submissionInsertError;
      submissionId = insertedSubmission?.id || null;
      console.log('[Intake Submit] Form submission created, mode:', mode, 'status:', submissionStatus);
    } catch (subErr) {
      console.error('[Intake Submit] form_submission insert error:', subErr);
    }

    if (needsPayment && mode === 'none' && submissionId) {
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
      }
      if (!resolvedPricingConfig) {
        return NextResponse.json({ error: 'Payment configuration is incomplete for this form' }, { status: 400 });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const priceIds = [
        ...(resolvedPricingConfig.mode === 'fixed' ? [resolvedPricingConfig.fixedPriceId] : []),
        ...(resolvedPricingConfig.mode === 'per_player' ? [resolvedPricingConfig.perPlayerPriceId] : []),
        ...(resolvedPricingConfig.mode === 'base_plus_per_player' ? [resolvedPricingConfig.basePriceId, resolvedPricingConfig.perPlayerPriceId] : []),
        ...(resolvedPricingConfig.mode === 'tiered' ? resolvedPricingConfig.tiers.map(tier => tier.flatPriceId) : []),
      ].filter((priceId): priceId is string => typeof priceId === 'string' && priceId.trim().length > 0);

      const prices = await Promise.all(Array.from(new Set(priceIds)).map(async priceId => {
        const price = await stripe.prices.retrieve(priceId);
        return [priceId, { unitAmount: price.unit_amount, currency: price.currency }] as const;
      }));
      const pricing = resolveFormPricing(resolvedPricingConfig, customAnswers, Object.fromEntries(prices));

      if (!pricing.requiresCheckout || pricing.lineItems.length === 0) {
        return NextResponse.json({ error: pricing.message || 'This form does not have a payable pricing configuration' }, { status: 400 });
      }

      await supabase
        .from('form_submissions')
        .update({
          pricing_snapshot: pricing,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      const origin = request.headers.get('origin') || request.nextUrl.origin;
      const returnSlug = resolvedGroupSlug || resolvedFormSlug || groupSlug || formId;
      if (!returnSlug) {
        return NextResponse.json({ error: 'Unable to determine return path for checkout' }, { status: 500 });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: pricing.lineItems.map(item => ({ price: item.priceId, quantity: item.quantity })),
        success_url: `${origin}${buildLocalSuccessPath(returnSlug, submissionId)}`,
        cancel_url: `${origin}${buildLocalCancelPath(returnSlug, formId)}`,
        customer_email: email.trim().toLowerCase() || undefined,
        allow_promotion_codes: formStripePromoEnabled || undefined,
        metadata: {
          checkout_context: 'submission',
          submission_id: submissionId,
          intake_slug: returnSlug,
          form_id: formId || '',
          group_id: groupId || '',
          pricing_mode: pricing.mode,
          player_count: pricing.playerCount != null ? String(pricing.playerCount) : '',
        },
      });

      return NextResponse.json({
        success: true,
        clientId,
        token: intakeToken,
        stripeRequired: true,
        checkoutUrl: session.url,
        submissionId,
      });
    }

    // Create draft body comp phase (only for on_submit with a client, skip if Stripe payment pending)
    if (mode === 'on_submit' && clientId && !needsPayment) {
      const up = userProfile as Record<string, unknown>;
      const rawGoalType = up.goalType;
      const goalType = rawGoalType === 'fat_loss' || rawGoalType === 'muscle_gain' || rawGoalType === 'recomposition'
        ? rawGoalType
        : undefined;

      if (goalType) {
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

            const bodyCompGoals = buildBodyCompGoalsFromIntake(up);
            const weightLbs = (typeof up.weightLbs === 'number' ? up.weightLbs : Number(up.weightLbs)) || 170;
            const bodyFatPct = (typeof up.bodyFatPercentage === 'number' ? up.bodyFatPercentage : Number(up.bodyFatPercentage)) || 20;
            const targetWeightLbs = bodyCompGoals.targetWeightLbs || weightLbs;
            const targetBodyFat = bodyCompGoals.targetBodyFat || bodyFatPct;
            const targetFatMassLbs = bodyCompGoals.targetFatMassLbs || (targetWeightLbs * (targetBodyFat / 100));
            const targetFFMLbs = bodyCompGoals.targetFFMLbs || (targetWeightLbs - targetFatMassLbs);
            const draftTargets = buildDraftNutritionTargetsFromIntake(up, weeklySchedule);

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
              rateOfChange: (typeof up.rateOfChange === 'number' ? up.rateOfChange : Number(up.rateOfChange)) || 0.5,
              performancePriority: 'body_comp_priority',
              musclePreservation: 'preserve_all',
              fatGainTolerance: 'minimize_fat_gain',
              lifestyleCommitment: 'fully_committed',
              trackingCommitment: 'committed_tracking',
              scheduleOverrides: null,
              nutritionTargets: draftTargets,
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

    return NextResponse.json({ success: true, clientId, token: intakeToken, stripeRequired: needsPayment, submissionId });
  } catch (err) {
    console.error('[Intake Submit] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
