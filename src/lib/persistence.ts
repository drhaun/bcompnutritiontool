import { supabase, isLocalOnly } from '@/lib/supabase';
import type {
  UserProfile,
  BodyCompGoals,
  DietPreferences,
  WeeklySchedule,
  DayNutritionTargets,
  WeeklyMealPlan,
} from '@/types';

const CLIENT_ID_KEY = 'fitomics-client-id';

export function getClientId(): string {
  if (typeof window === 'undefined') return '';
  let clientId = window.localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = globalThis.crypto?.randomUUID?.() || `client_${Date.now()}`;
    window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

export async function saveAllData(payload: {
  userProfile: Partial<UserProfile>;
  bodyCompGoals: Partial<BodyCompGoals>;
  dietPreferences: Partial<DietPreferences>;
  weeklySchedule: Partial<WeeklySchedule>;
  nutritionTargets: DayNutritionTargets[];
  mealPlan: WeeklyMealPlan | null;
}) {
  if (isLocalOnly) return;
  const clientId = getClientId();
  if (!clientId || !supabase) return;

  const userProfilePayload = {
    user_id: clientId,
    name: payload.userProfile.name || null,
    gender: payload.userProfile.gender || null,
    age: payload.userProfile.age || null,
    height_ft: payload.userProfile.heightFt || null,
    height_in: payload.userProfile.heightIn || null,
    height_cm: payload.userProfile.heightCm || null,
    weight_lbs: payload.userProfile.weightLbs || null,
    weight_kg: payload.userProfile.weightKg || null,
    body_fat_percentage: payload.userProfile.bodyFatPercentage || null,
    activity_level: payload.userProfile.activityLevel || null,
    workouts_per_week: payload.userProfile.workoutsPerWeek || null,
    goal_focus: payload.userProfile.goalFocus || null,
    lifestyle_commitment: payload.userProfile.lifestyleCommitment || null,
  };

  await supabase.from('user_profiles').upsert(userProfilePayload, { onConflict: 'user_id' });

  if (Object.keys(payload.bodyCompGoals).length > 0) {
    await supabase.from('body_comp_goals').upsert({
      user_id: clientId,
      goal_type: payload.bodyCompGoals.goalType || null,
      target_weight_lbs: payload.bodyCompGoals.targetWeightLbs || null,
      target_body_fat: payload.bodyCompGoals.targetBodyFat || null,
      timeline_weeks: payload.bodyCompGoals.timelineWeeks || null,
      weekly_weight_change_pct: payload.bodyCompGoals.weeklyWeightChangePct || null,
      performance_preference: payload.bodyCompGoals.performancePreference || null,
      body_comp_preference: payload.bodyCompGoals.bodyCompPreference || null,
    }, { onConflict: 'user_id' });
  }

  if (Object.keys(payload.dietPreferences).length > 0) {
    await supabase.from('diet_preferences').upsert({
      user_id: clientId,
      dietary_restrictions: payload.dietPreferences.dietaryRestrictions || [],
      allergies: payload.dietPreferences.allergies || [],
      preferred_proteins: payload.dietPreferences.preferredProteins || [],
      preferred_carbs: payload.dietPreferences.preferredCarbs || [],
      preferred_fats: payload.dietPreferences.preferredFats || [],
      preferred_vegetables: payload.dietPreferences.preferredVegetables || [],
      cuisine_preferences: payload.dietPreferences.cuisinePreferences || [],
      disliked_foods: payload.dietPreferences.dislikedFoods || [],
      spice_level: payload.dietPreferences.spiceLevel || null,
      flavor_profiles: payload.dietPreferences.flavorProfiles || [],
      preferred_seasonings: payload.dietPreferences.preferredSeasonings || [],
      cooking_time_preference: payload.dietPreferences.cookingTimePreference || null,
      budget_preference: payload.dietPreferences.budgetPreference || null,
      cooking_for: payload.dietPreferences.cookingFor || null,
      leftovers_preference: payload.dietPreferences.leftoversPreference || null,
      variety_level: payload.dietPreferences.varietyLevel || null,
    }, { onConflict: 'user_id' });
  }

  if (payload.weeklySchedule && Object.keys(payload.weeklySchedule).length > 0) {
    await supabase.from('weekly_schedules').upsert({
      user_id: clientId,
      schedule: payload.weeklySchedule,
    }, { onConflict: 'user_id' });
  }

  if (payload.nutritionTargets && payload.nutritionTargets.length > 0) {
    await supabase.from('nutrition_targets').upsert({
      user_id: clientId,
      targets: payload.nutritionTargets,
    }, { onConflict: 'user_id' });
  }

  if (payload.mealPlan) {
    await supabase.from('meal_plans').upsert({
      user_id: clientId,
      plan: payload.mealPlan,
    }, { onConflict: 'user_id' });
  }
}

export async function loadAllData() {
  if (isLocalOnly) return null;
  const clientId = getClientId();
  if (!clientId || !supabase) return null;

  const [profile, goals, prefs, schedule, targets, plan] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', clientId).maybeSingle(),
    supabase.from('body_comp_goals').select('*').eq('user_id', clientId).maybeSingle(),
    supabase.from('diet_preferences').select('*').eq('user_id', clientId).maybeSingle(),
    supabase.from('weekly_schedules').select('*').eq('user_id', clientId).maybeSingle(),
    supabase.from('nutrition_targets').select('*').eq('user_id', clientId).maybeSingle(),
    supabase.from('meal_plans').select('*').eq('user_id', clientId).maybeSingle(),
  ]);

  const userProfile = profile.data
    ? {
        name: profile.data.name || undefined,
        gender: profile.data.gender || undefined,
        age: profile.data.age || undefined,
        heightFt: profile.data.height_ft || undefined,
        heightIn: profile.data.height_in || undefined,
        heightCm: profile.data.height_cm || undefined,
        weightLbs: profile.data.weight_lbs || undefined,
        weightKg: profile.data.weight_kg || undefined,
        bodyFatPercentage: profile.data.body_fat_percentage || undefined,
        activityLevel: profile.data.activity_level || undefined,
        workoutsPerWeek: profile.data.workouts_per_week || undefined,
        goalFocus: profile.data.goal_focus || undefined,
        lifestyleCommitment: profile.data.lifestyle_commitment || undefined,
      }
    : null;

  const bodyCompGoals = goals.data
    ? {
        goalType: goals.data.goal_type || undefined,
        targetWeightLbs: goals.data.target_weight_lbs || undefined,
        targetBodyFat: goals.data.target_body_fat || undefined,
        timelineWeeks: goals.data.timeline_weeks || undefined,
        weeklyWeightChangePct: goals.data.weekly_weight_change_pct || undefined,
        performancePreference: goals.data.performance_preference || undefined,
        bodyCompPreference: goals.data.body_comp_preference || undefined,
      }
    : null;

  const dietPreferences = prefs.data
    ? {
        dietaryRestrictions: prefs.data.dietary_restrictions || [],
        allergies: prefs.data.allergies || [],
        preferredProteins: prefs.data.preferred_proteins || [],
        preferredCarbs: prefs.data.preferred_carbs || [],
        preferredFats: prefs.data.preferred_fats || [],
        preferredVegetables: prefs.data.preferred_vegetables || [],
        cuisinePreferences: prefs.data.cuisine_preferences || [],
        dislikedFoods: prefs.data.disliked_foods || [],
        spiceLevel: prefs.data.spice_level || undefined,
        flavorProfiles: prefs.data.flavor_profiles || [],
        preferredSeasonings: prefs.data.preferred_seasonings || [],
        cookingTimePreference: prefs.data.cooking_time_preference || undefined,
        budgetPreference: prefs.data.budget_preference || undefined,
        cookingFor: prefs.data.cooking_for || undefined,
        leftoversPreference: prefs.data.leftovers_preference || undefined,
        varietyLevel: prefs.data.variety_level || undefined,
      }
    : null;

  return {
    userProfile,
    bodyCompGoals,
    dietPreferences,
    weeklySchedule: schedule.data?.schedule || null,
    nutritionTargets: targets.data?.targets || null,
    mealPlan: plan.data?.plan || null,
  };
}
