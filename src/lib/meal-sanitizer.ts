/**
 * Meal Sanitizer
 * 
 * Strips AI reasoning/thinking text from meal fields and validates
 * per-meal macro accuracy. Prevents AI "internal monologue" from
 * leaking into stored meal data and PDF output.
 */

import type { Meal, DayMealPlan } from '@/types';

// Patterns that indicate AI reasoning/thinking text rather than actual content
const AI_REASONING_PATTERNS = [
  /\bstill off\b/i,
  /\blet me recalculate\b/i,
  /\blet me re-?calculate\b/i,
  /\blet me try again\b/i,
  /\blet me adjust\b/i,
  /\blet me fix\b/i,
  /\blet me redo\b/i,
  /\bI('ll| will| need to| should| can)\b/i,
  /\bI'm (going to|trying|adjusting|recalculating|fixing)\b/i,
  /\bhmm\b/i,
  /\bwait,?\s/i,
  /\bactually,?\s/i,
  /\boops\b/i,
  /\bmy (mistake|error|bad|apologies)\b/i,
  /\bthat('s| is) (not right|wrong|incorrect|off|too (high|low|much))\b/i,
  /\bneed(s)? to (be |)(adjust|fix|correct|recalcul|chang|lower|rais|reduc|increas)/i,
  /\btoo (many|much|few|little|high|low) (calories|cal|protein|carbs?|fat|macro)/i,
  /\bover (budget|target|limit)\b/i,
  /\bunder (budget|target|limit)\b/i,
  /\bthis (doesn't|does not|won't|will not) (work|fit|add up|match)\b/i,
  /\btrying to (hit|meet|match|reach|get)\b/i,
  /\bthe math (doesn't|does not|isn't)\b/i,
  /\bcalculation/i,
  /\bapolog(y|ies|ize)\b/i,
  /\bcorrecting?\b.*\bmacros?\b/i,
  /\bhere'?s? (my|the|a) (revised|updated|corrected|fixed|new)\b/i,
  /\b(revising|updating|correcting|fixing)\b/i,
  /\brevised\b/i,
  /\bcorrection needed\b/i,
  /\brecalculat/i,
  /\bsee (corrected|revised|updated) version\b/i,
  /\brecalculating (below|above|all|to|precisely)\b/i,
];

// Placeholder ingredient names that indicate the AI failed to generate real content
const PLACEHOLDER_INGREDIENTS = new Set([
  'protein source',
  'carb source',
  'carbohydrate source',
  'fat source',
  'vegetables',
  'vegetable',
  'ingredient 1',
  'ingredient 2',
  'ingredient 3',
  'ingredient',
]);

/**
 * Check if an ingredient looks like a placeholder rather than a real food item.
 */
export function isPlaceholderIngredient(name: string): boolean {
  if (!name) return true;
  return PLACEHOLDER_INGREDIENTS.has(name.toLowerCase().trim());
}

/**
 * Check if a meal has placeholder/fallback content instead of real recipes.
 * Used to detect meals where the AI failed to generate real ingredients.
 */
export function isPlaceholderMeal(meal: { ingredients?: { item?: string }[] | string[]; instructions?: string[] }): boolean {
  if (!meal) return true;
  const ings = meal.ingredients;
  if (!ings || ings.length === 0) return true;

  const placeholderCount = ings.filter(i => {
    const name = typeof i === 'string' ? i : (i?.item || '');
    return isPlaceholderIngredient(name);
  }).length;

  return placeholderCount >= ings.length * 0.5;
}

/**
 * Check if a string contains AI reasoning/thinking text
 */
export function containsAIReasoning(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return AI_REASONING_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Sanitize a single text field — returns undefined if it's pure AI reasoning
 */
function sanitizeTextField(text: string | undefined): string | undefined {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (containsAIReasoning(trimmed)) return undefined;
  return trimmed;
}

/**
 * Sanitize all text fields on a meal object to strip AI reasoning.
 * Returns a new meal with cleaned fields.
 */
export function sanitizeMealFields(meal: Meal): Meal {
  if (!meal) return meal;

  const cleaned = { ...meal };

  cleaned.aiRationale = sanitizeTextField(meal.aiRationale);
  cleaned.staffNote = sanitizeTextField(meal.staffNote);

  if (Array.isArray(cleaned.instructions)) {
    cleaned.instructions = cleaned.instructions.filter(
      inst => inst && typeof inst === 'string' && !containsAIReasoning(inst)
    );
  }

  if (!cleaned.name || containsAIReasoning(cleaned.name)) {
    cleaned.name = cleaned.type === 'snack' ? 'Snack' : 'Meal';
  }
  if (!cleaned.context || containsAIReasoning(cleaned.context)) {
    cleaned.context = '';
  }

  return cleaned;
}

/**
 * Recompute a meal's totalMacros from its ingredient sums to prevent
 * AI-reported totals from drifting from ingredient-level data.
 * Does NOT scale ingredients — only reconciles the totals.
 */
export function reconcileMealMacros(meal: Meal): Meal {
  if (!meal?.ingredients?.length) return meal;

  const sum = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const ing of meal.ingredients) {
    sum.calories += ing.calories || 0;
    sum.protein += ing.protein || 0;
    sum.carbs += ing.carbs || 0;
    sum.fat += ing.fat || 0;
  }

  return {
    ...meal,
    totalMacros: {
      calories: Math.round(sum.calories),
      protein: Math.round(sum.protein),
      carbs: Math.round(sum.carbs),
      fat: Math.round(sum.fat),
    },
  };
}

/**
 * Check if a meal's macros are wildly off its target, indicating it
 * needs to be regenerated entirely (not just scaled).
 * 
 * Returns the calorie variance ratio (0 = perfect, 1 = 100% off).
 */
export function getMealCalorieVariance(meal: Meal): number {
  if (!meal?.targetMacros?.calories || meal.targetMacros.calories <= 0) return 0;
  if (!meal?.totalMacros?.calories) return 1;
  return Math.abs(meal.totalMacros.calories - meal.targetMacros.calories) / meal.targetMacros.calories;
}

/**
 * Sanitize and validate an entire DayMealPlan.
 * - Strips AI reasoning from all meal text fields
 * - Reconciles per-meal totalMacros from ingredient sums
 * - Recomputes daily totals from corrected meals
 * - Returns indices of meals that are too far off target and need regeneration
 */
export function sanitizeDayPlan(dayPlan: DayMealPlan): { plan: DayMealPlan; badMealIndices: number[] } {
  if (!dayPlan?.meals) return { plan: dayPlan, badMealIndices: [] };

  const fixed = { ...dayPlan };
  const badMealIndices: number[] = [];

  fixed.meals = dayPlan.meals.map((meal, idx) => {
    if (!meal) return meal;
    let cleaned = sanitizeMealFields(meal);
    cleaned = reconcileMealMacros(cleaned);

    const variance = getMealCalorieVariance(cleaned);
    if (variance > 0.20) {
      badMealIndices.push(idx);
    }

    return cleaned;
  });

  // Recompute daily totals
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const meal of fixed.meals) {
    if (!meal?.totalMacros) continue;
    totals.calories += meal.totalMacros.calories;
    totals.protein += meal.totalMacros.protein;
    totals.carbs += meal.totalMacros.carbs;
    totals.fat += meal.totalMacros.fat;
  }
  fixed.dailyTotals = totals;

  if (fixed.mealStructureRationale && containsAIReasoning(fixed.mealStructureRationale)) {
    fixed.mealStructureRationale = '';
  }

  return { plan: fixed, badMealIndices };
}
