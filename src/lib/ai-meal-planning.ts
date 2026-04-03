import type { 
  UserProfile, 
  BodyCompGoals, 
  DietPreferences, 
  WeeklySchedule,
  DayNutritionTargets,
  DayMealPlan,
  WeeklyMealPlan,
  Meal,
  Macros,
  DayOfWeek 
} from '@/types';
import { validateMacroAccuracy } from './nutrition-calc';
import { aiChatJSON } from './ai-client';
import { sanitizeMealFields, reconcileMealMacros, sanitizeDayPlan, isPlaceholderMeal } from './meal-sanitizer';

const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Build user profile context for AI prompts
 */
function buildUserProfileContext(
  userProfile: Partial<UserProfile>,
  bodyCompGoals: Partial<BodyCompGoals>
): string {
  let context = '';
  
  if (userProfile) {
    context += `
USER PROFILE:
- Age: ${userProfile.age || 'Not specified'} years
- Gender: ${userProfile.gender || 'Not specified'}
- Height: ${userProfile.heightFt || ''}' ${userProfile.heightIn || ''}"
- Current Weight: ${userProfile.weightLbs || 'Not specified'} lbs
- Activity Level: ${userProfile.activityLevel || 'Not specified'}
- Goal Focus: ${userProfile.goalFocus || 'Not specified'}
`;
  }
  
  if (bodyCompGoals) {
    context += `
BODY COMPOSITION GOALS:
- Primary Goal: ${bodyCompGoals.goalType || 'Not specified'}
- Target Weight: ${bodyCompGoals.targetWeightLbs || 'Not specified'} lbs
- Target Body Fat: ${bodyCompGoals.targetBodyFat || 'Not specified'}%
- Timeline: ${bodyCompGoals.timelineWeeks || 'Not specified'} weeks
`;
  }
  
  return context;
}

/**
 * Build dietary context for AI prompts
 */
function buildDietaryContext(dietPreferences: Partial<DietPreferences>): string {
  const restrictions = dietPreferences.dietaryRestrictions || [];
  const allergies = dietPreferences.allergies || [];
  const allAvoided = [...new Set([...(dietPreferences.foodsToAvoid || []), ...(dietPreferences.dislikedFoods || [])])];

  const ratings = dietPreferences.ingredientRatings || {};
  const splitByRating = (items: string[]) => ({
    staple: items.filter(i => (ratings[i] || 1) === 3),
    love: items.filter(i => (ratings[i] || 1) === 2),
    like: items.filter(i => (ratings[i] || 1) <= 1),
  });

  const proteins = splitByRating(dietPreferences.preferredProteins || []);
  const carbs = splitByRating(dietPreferences.preferredCarbs || []);
  const fats = splitByRating(dietPreferences.preferredFats || []);
  const vegetables = splitByRating(dietPreferences.preferredVegetables || []);
  const cuisines = splitByRating(dietPreferences.cuisinePreferences || []);

  const tierLine = (label: string, tiers: { staple: string[]; love: string[]; like: string[] }) => {
    const parts: string[] = [];
    if (tiers.staple.length) parts.push(`STAPLE (use most often): ${tiers.staple.join(', ')}`);
    if (tiers.love.length) parts.push(`LOVE: ${tiers.love.join(', ')}`);
    if (tiers.like.length) parts.push(`Like: ${tiers.like.join(', ')}`);
    return parts.length > 0 ? `- ${label}: ${parts.join(' | ')}` : '';
  };

  return `
DIETARY RESTRICTIONS & SAFETY:
- Restrictions: ${restrictions.length > 0 ? restrictions.join(', ') : 'None'}
- ALLERGIES (STRICTLY AVOID): ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Foods to Avoid: ${allAvoided.length > 0 ? allAvoided.slice(0, 12).join(', ') : 'None'}

FOOD PREFERENCES — CRITICAL RULES:
• STAPLE items MUST appear in the majority of meals. These are the client's go-to foods.
• LOVE items should appear frequently — rotate them in alongside staples.
• Like items can fill remaining spots for variety.
• NEVER ignore STAPLE/LOVE preferences by defaulting to generic ingredients.
${tierLine('Proteins', proteins)}
${tierLine('Carbs', carbs)}
${tierLine('Fats', fats)}
${tierLine('Vegetables', vegetables)}
${tierLine('Cuisines', cuisines)}

FLAVOR PREFERENCES:
- Spice Level: ${dietPreferences.spiceLevel || 'Medium'}
- Flavor Profiles: ${(dietPreferences.flavorProfiles || []).slice(0, 5).join(', ')}
- Seasonings: ${(dietPreferences.preferredSeasonings || []).slice(0, 8).join(', ')}

PRACTICAL CONSTRAINTS:
- Cooking Time: ${dietPreferences.cookingTimePreference || 'Medium (30-60 min)'}
- Budget: ${dietPreferences.budgetPreference || 'Moderate'}
- Cooking For: ${dietPreferences.cookingFor || 'Just myself'}
- Leftovers: ${dietPreferences.leftoversPreference || 'Okay with leftovers occasionally'}
- Variety Level: ${dietPreferences.varietyLevel || 'Moderate Variety'}
`;
}

// Chef persona for enhanced meal quality
const CHEF_SYSTEM_PROMPT = `You are an AWARD-WINNING CHEF who also holds a nutrition certification.
Your food must be DELICIOUS FIRST - macros mean nothing if the client won't enjoy eating.

KEY PRINCIPLES:
• Every dish needs proper seasoning - salt, pepper, herbs, spices, aromatics
• Balance acid (lemon, vinegar), fat, salt, and umami in each meal
• Texture contrast makes meals exciting - combine crispy, creamy, crunchy elements
• Use fresh herbs to elevate simple ingredients
• Make food that looks beautiful and tastes even better

You NEVER create boring "plain chicken and rice" meals. Every dish should have personality and flavor.`;

/**
 * Pre-calculate per-slot macro targets for a day.
 * Meals get the bulk of macros; snacks get smaller shares.
 * The sum of all slot targets equals the daily targets exactly.
 */
function calculatePerSlotTargets(
  dailyTargets: DayNutritionTargets,
  mealCount = 3,
  snackCount = 2
): { type: 'meal' | 'snack'; targets: Macros }[] {
  const snackPct = snackCount > 0 ? 0.10 : 0; // each snack gets ~10%
  const mealPct = mealCount > 0 ? (1.0 - snackCount * snackPct) / mealCount : 0;

  const slots: { type: 'meal' | 'snack'; targets: Macros }[] = [];
  for (let i = 0; i < mealCount; i++) {
    slots.push({
      type: 'meal',
      targets: {
        calories: Math.round(dailyTargets.targetCalories * mealPct),
        protein: Math.round(dailyTargets.protein * mealPct),
        carbs: Math.round(dailyTargets.carbs * mealPct),
        fat: Math.round(dailyTargets.fat * mealPct),
      },
    });
  }
  for (let i = 0; i < snackCount; i++) {
    slots.push({
      type: 'snack',
      targets: {
        calories: Math.round(dailyTargets.targetCalories * snackPct),
        protein: Math.round(dailyTargets.protein * snackPct),
        carbs: Math.round(dailyTargets.carbs * snackPct),
        fat: Math.round(dailyTargets.fat * snackPct),
      },
    });
  }
  return slots;
}

/**
 * Generate a single day's meal plan
 */
async function generateDayMealPlan(
  day: DayOfWeek,
  dayTargets: DayNutritionTargets,
  userContext: string,
  dietaryContext: string,
  scheduleContext: string,
  previousMeals: string[] = [],
  dietPreferences?: Partial<DietPreferences>
): Promise<DayMealPlan> {
  // Pre-calculate per-slot targets so the AI knows exact budgets
  const slotTargets = calculatePerSlotTargets(dayTargets);

  const usedProteins: string[] = [];
  previousMeals.forEach(m => {
    const lower = m.toLowerCase();
    if (lower.includes('chicken')) usedProteins.push('chicken');
    if (lower.includes('salmon')) usedProteins.push('salmon');
    if (lower.includes('beef') || lower.includes('steak')) usedProteins.push('beef');
    if (lower.includes('turkey')) usedProteins.push('turkey');
    if (lower.includes('shrimp')) usedProteins.push('shrimp');
    if (lower.includes('fish') || lower.includes('cod') || lower.includes('tilapia')) usedProteins.push('fish');
  });
  const uniqueProteins = [...new Set(usedProteins)];
  const overusedProteins = uniqueProteins.filter(p => usedProteins.filter(x => x === p).length >= 2);

  // Build the per-slot target section for the prompt
  const slotTargetLines = slotTargets.map((slot, i) => {
    const label = slot.type === 'meal' ? `Meal ${i + 1}` : `Snack ${i - 2}`;
    return `  ${label} (${slot.type}): ${slot.targets.calories} cal | ${slot.targets.protein}g P | ${slot.targets.carbs}g C | ${slot.targets.fat}g F`;
  }).join('\n');

  const prompt = `
You are creating a ${day} meal plan as an award-winning chef-nutritionist.

${userContext}

${dietaryContext}

═══════════════════════════════════════════════════════════
DAILY NUTRITION TARGETS (MUST HIT WITHIN ±5%)
═══════════════════════════════════════════════════════════
- Calories: ${dayTargets.targetCalories}
- Protein: ${dayTargets.protein}g
- Carbs: ${dayTargets.carbs}g
- Fat: ${dayTargets.fat}g

═══════════════════════════════════════════════════════════
⚠️ PER-MEAL / PER-SNACK MACRO BUDGETS (MUST FOLLOW)
═══════════════════════════════════════════════════════════
Each meal and snack has its OWN calorie & macro budget.
Each MUST be within ±10% of these targets:

${slotTargetLines}

SNACKS ARE SMALLER MEALS. A snack targeting ~${slotTargets.find(s => s.type === 'snack')?.targets.calories || 200} cal
should have 2-3 simple ingredients — NOT a full meal scaled down.
Good snack examples: Greek yogurt + berries, apple + almond butter,
turkey roll-ups, protein shake, cottage cheese + fruit.

${scheduleContext}

═══════════════════════════════════════════════════════════
🎯 VARIETY REQUIREMENTS (STRICTLY ENFORCE)
═══════════════════════════════════════════════════════════
${previousMeals.length > 0 ? `MEALS TO AVOID REPEATING: ${previousMeals.slice(-14).join(', ')}` : 'First day - establish variety!'}
${overusedProteins.length > 0 ? `⚠️ OVERUSED PROTEINS - USE DIFFERENT: ${overusedProteins.join(', ')}` : ''}

CRITICAL REQUIREMENTS:
1. Create exactly 3 meals and 2 snacks
2. Each meal/snack MUST match its per-slot calorie budget above (±10%)
3. Each meal/snack must have EXACT portion sizes in grams
4. Include accurate macros per ingredient (calories, protein, carbs, fat)
5. Ingredient macros must SUM to the meal's totalMacros
6. Ingredient amounts must be realistic, grocery-store-friendly portions
7. Avoid repetitive "chicken and rice" meals - add creativity and flavor

Return a JSON object with this EXACT structure:
{
  "day": "${day}",
  "meals": [
    {
      "name": "Creative name that mentions the primary protein/star ingredient",
      "time": "7:00 AM",
      "context": "Pre-workout breakfast",
      "prepTime": "15 minutes",
      "type": "meal",
      "workoutRelation": "none",
      "ingredients": [
        {
          "item": "Ingredient name",
          "amount": "150g",
          "calories": 180,
          "protein": 25,
          "carbs": 0,
          "fat": 8,
          "category": "protein"
        }
      ],
      "instructions": ["Step 1", "Step 2"],
      "totalMacros": {
        "calories": 500,
        "protein": 40,
        "carbs": 45,
        "fat": 15
      },
      "targetMacros": {
        "calories": 500,
        "protein": 40,
        "carbs": 45,
        "fat": 15
      }
    }
  ],
  "dailyTotals": {
    "calories": ${dayTargets.targetCalories},
    "protein": ${dayTargets.protein},
    "carbs": ${dayTargets.carbs},
    "fat": ${dayTargets.fat}
  },
  "dailyTargets": {
    "calories": ${dayTargets.targetCalories},
    "protein": ${dayTargets.protein},
    "carbs": ${dayTargets.carbs},
    "fat": ${dayTargets.fat}
  },
  "accuracyValidated": true,
  "mealStructureRationale": "Why this structure works"
}
`;

  const dayPlan = await aiChatJSON<DayMealPlan>({
    system: CHEF_SYSTEM_PROMPT + '\n\nReturn ONLY valid JSON. No commentary. Ensure all macro calculations are accurate and each meal matches its per-slot budget.',
    userMessage: prompt,
    temperature: 0.5,
    maxTokens: 8000,
    jsonMode: true,
    tier: 'standard',
  });

  // Ensure each meal has a targetMacros from our pre-calculated slots
  for (let i = 0; i < dayPlan.meals.length && i < slotTargets.length; i++) {
    if (!dayPlan.meals[i]) continue;
    dayPlan.meals[i].targetMacros = slotTargets[i].targets;
    if (!dayPlan.meals[i].type) {
      dayPlan.meals[i].type = slotTargets[i].type;
    }
    // Ensure ingredients is always an array (AI may omit it)
    if (!Array.isArray(dayPlan.meals[i].ingredients)) {
      dayPlan.meals[i].ingredients = [];
    }
  }

  // Reconcile: recompute each meal's totalMacros from its ingredients
  for (const meal of dayPlan.meals) {
    if (!meal?.ingredients?.length) continue;
    const sum = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const ing of meal.ingredients) {
      sum.calories += ing.calories || 0;
      sum.protein += ing.protein || 0;
      sum.carbs += ing.carbs || 0;
      sum.fat += ing.fat || 0;
    }
    meal.totalMacros = {
      calories: Math.round(sum.calories),
      protein: Math.round(sum.protein),
      carbs: Math.round(sum.carbs),
      fat: Math.round(sum.fat),
    };
  }

  // Regenerate any meals that have empty or placeholder ingredients
  for (let i = 0; i < dayPlan.meals.length; i++) {
    const meal = dayPlan.meals[i];
    if (!meal) continue;
    const needsRegen = !meal.ingredients || meal.ingredients.length === 0 || isPlaceholderMeal(meal);
    if (!needsRegen) continue;
    try {
      const replacement = await regenerateMeal(
        '',
        i,
        dayPlan,
        {},
        dietPreferences || {},
        []
      );
      if (replacement.ingredients && replacement.ingredients.length > 0 && !isPlaceholderMeal(replacement)) {
        dayPlan.meals[i] = { ...replacement, targetMacros: meal.targetMacros, type: meal.type };
      }
    } catch (e) {
      console.warn(`Failed to regenerate placeholder/empty meal ${i} for ${day}:`, e);
    }
  }

  // Sanitize text and identify meals that are wildly off target
  const { plan: sanitized, badMealIndices } = sanitizeDayPlan(dayPlan);

  // Regenerate any meals that are >20% off their per-slot calorie target.
  // Uses a focused AI call with tight ±3% tolerance to produce a properly
  // sized meal with realistic ingredients — NOT a scaled-down version.
  if (badMealIndices.length > 0) {
    for (const idx of badMealIndices) {
      const badMeal = sanitized.meals[idx];
      if (!badMeal) continue;

      try {
        const replacement = await regenerateMeal(
          '',
          idx,
          sanitized,
          {}, // userProfile not needed for regeneration prompt
          dietPreferences || {},
          []
        );
        sanitized.meals[idx] = replacement;
      } catch (e) {
        console.warn(`Failed to regenerate meal ${idx} for ${day}, keeping original:`, e);
      }
    }

    // Recompute daily totals after regeneration
    const newTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const meal of sanitized.meals) {
      if (!meal?.totalMacros) continue;
      newTotals.calories += meal.totalMacros.calories;
      newTotals.protein += meal.totalMacros.protein;
      newTotals.carbs += meal.totalMacros.carbs;
      newTotals.fat += meal.totalMacros.fat;
    }
    sanitized.dailyTotals = newTotals;
  }

  // Validate overall daily macro accuracy
  const validation = validateMacroAccuracy(
    sanitized.dailyTotals,
    sanitized.dailyTargets,
    0.05
  );
  
  sanitized.accuracyValidated = validation.isValid;
  
  return sanitized;
}

/**
 * Generate a complete weekly meal plan
 */
export async function generateWeeklyMealPlan(
  _apiKey: string,
  userProfile: Partial<UserProfile>,
  bodyCompGoals: Partial<BodyCompGoals>,
  dietPreferences: Partial<DietPreferences>,
  weeklySchedule: Partial<WeeklySchedule>,
  nutritionTargets: DayNutritionTargets[],
  daysToGenerate: DayOfWeek[] = DAYS_OF_WEEK,
  onProgress?: (day: DayOfWeek, progress: number) => void
): Promise<WeeklyMealPlan> {
  const userContext = buildUserProfileContext(userProfile, bodyCompGoals);
  const dietaryContext = buildDietaryContext(dietPreferences);
  
  const weeklyPlan: WeeklyMealPlan = {};
  const allMealNames: string[] = [];
  
  for (let i = 0; i < daysToGenerate.length; i++) {
    const day = daysToGenerate[i];
    const dayTargets = nutritionTargets.find(t => t.day === day);
    
    if (!dayTargets) {
      console.warn(`No nutrition targets found for ${day}`);
      continue;
    }
    
    // Build schedule context for this day
    const daySchedule = weeklySchedule[day];
    const scheduleContext = daySchedule ? `
SCHEDULE FOR ${day.toUpperCase()}:
- Wake Time: ${daySchedule.wakeTime || '7:00 AM'}
- Sleep Time: ${daySchedule.sleepTime || '10:00 PM'}
- Workouts: ${daySchedule.workouts?.map(w => `${w.type} at ${w.time}`).join(', ') || 'None'}
- Is Workout Day: ${dayTargets.isWorkoutDay ? 'Yes' : 'No'}
` : '';
    
    // Generate the day's meal plan
    const dayPlan = await generateDayMealPlan(
      day,
      dayTargets,
      userContext,
      dietaryContext,
      scheduleContext,
      allMealNames.slice(-10), // Last 10 meal names for variety
      dietPreferences
    );
    
    weeklyPlan[day] = dayPlan;
    
    // Track meal names for variety
    dayPlan.meals.forEach(meal => allMealNames.push(meal.name));
    
    // Report progress
    if (onProgress) {
      onProgress(day, ((i + 1) / daysToGenerate.length) * 100);
    }
  }
  
  return weeklyPlan;
}

/**
 * Regenerate a single meal within a day
 */
export async function regenerateMeal(
  _apiKey: string,
  mealIndex: number,
  dayPlan: DayMealPlan,
  userProfile: Partial<UserProfile>,
  dietPreferences: Partial<DietPreferences>,
  avoidIngredients: string[] = []
): Promise<Meal> {
  const currentMeal = dayPlan.meals[mealIndex];
  const targetMacros = currentMeal.targetMacros;
  const dietaryContext = buildDietaryContext(dietPreferences);
  
  const prompt = `
Create a new ${currentMeal.type} to replace "${currentMeal.name}".

EXACT MACRO TARGETS (±3% tolerance):
- Calories: ${targetMacros.calories}
- Protein: ${targetMacros.protein}g
- Carbs: ${targetMacros.carbs}g
- Fat: ${targetMacros.fat}g

${dietaryContext}

MUST AVOID these ingredients: ${avoidIngredients.join(', ')}

Return ONLY a JSON object with this structure:
{
  "name": "Creative name that mentions the primary protein/star ingredient",
  "time": "${currentMeal.time}",
  "context": "${currentMeal.context}",
  "prepTime": "Time needed",
  "type": "${currentMeal.type}",
  "workoutRelation": "${currentMeal.workoutRelation}",
  "ingredients": [
    {
      "item": "Name",
      "amount": "150g",
      "calories": 100,
      "protein": 20,
      "carbs": 5,
      "fat": 2,
      "category": "protein"
    }
  ],
  "instructions": ["Step 1", "Step 2"],
  "totalMacros": {
    "calories": ${targetMacros.calories},
    "protein": ${targetMacros.protein},
    "carbs": ${targetMacros.carbs},
    "fat": ${targetMacros.fat}
  },
  "targetMacros": {
    "calories": ${targetMacros.calories},
    "protein": ${targetMacros.protein},
    "carbs": ${targetMacros.carbs},
    "fat": ${targetMacros.fat}
  }
}
`;

  const meal = await aiChatJSON<Meal>({
    system: 'You are a precise nutritionist. Return ONLY valid JSON.',
    userMessage: prompt,
    temperature: 0.5,
    maxTokens: 2500,
    jsonMode: true,
    tier: 'standard',
  });

  // Reconcile totalMacros from ingredient sums
  if (meal?.ingredients?.length) {
    const sum = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const ing of meal.ingredients) {
      sum.calories += ing.calories || 0;
      sum.protein += ing.protein || 0;
      sum.carbs += ing.carbs || 0;
      sum.fat += ing.fat || 0;
    }
    meal.totalMacros = {
      calories: Math.round(sum.calories),
      protein: Math.round(sum.protein),
      carbs: Math.round(sum.carbs),
      fat: Math.round(sum.fat),
    };
  }

  // Sanitize AI text and reconcile macros from ingredients
  let cleaned = sanitizeMealFields(meal);
  cleaned = reconcileMealMacros(cleaned);
  return cleaned;
}

/**
 * Clean and format ingredient name for display
 * - Removes leading special characters (., -, etc.)
 * - Converts to title case
 * - Handles common formatting issues from parsing
 */
function cleanIngredientName(name: string): string {
  if (!name) return '';
  
  // Trim and remove leading special characters (period, dash, bullet, etc.)
  let cleaned = name.trim().replace(/^[.\-•*]+\s*/, '');
  
  // Fix common parsing issues where first letter got captured as part of amount unit
  // e.g., "reen onion stalks" -> "Green onion stalks"
  // e.g., "arlic cloves" -> "Garlic cloves"
  // Check if name starts with lowercase and looks like a truncated word
  const commonTruncatedWords: Record<string, string> = {
    'reen': 'Green',
    'arlic': 'Garlic', 
    'pinach': 'Spinach',
    'roccoli': 'Broccoli',
    'arrot': 'Carrot',
    'nion': 'Onion',
    'hicken': 'Chicken',
    'eef': 'Beef',
    'almon': 'Salmon',
    'hrimp': 'Shrimp',
    'urkey': 'Turkey',
    'ggs': 'Eggs',
    'utter': 'Butter',
    'heese': 'Cheese',
    'ilk': 'Milk',
    'ream': 'Cream',
    'rown': 'Brown',
    'hite': 'White',
    'utternut': 'Butternut',
    'one': 'Bone',
    'haved': 'Shaved',
  };
  
  for (const [truncated, full] of Object.entries(commonTruncatedWords)) {
    if (cleaned.toLowerCase().startsWith(truncated)) {
      cleaned = full + cleaned.slice(truncated.length);
      break;
    }
  }
  
  // Also remove any leading single lowercase letter followed by space (parsing artifacts)
  // e.g., "s brown rice" -> "brown rice"
  cleaned = cleaned.replace(/^([a-z])\s+(?=[a-zA-Z])/, '');
  
  // Convert to title case (capitalize first letter of each word)
  cleaned = cleaned
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Don't capitalize certain small words unless first word
      const smallWords = ['a', 'an', 'the', 'and', 'or', 'of', 'to', 'for', 'with', 'in', 'on'];
      if (index > 0 && smallWords.includes(word)) {
        return word;
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  
  return cleaned;
}

/**
 * Normalize unit string to a canonical form for merging.
 * "oz", "ounce", "ounces" -> "oz"
 */
function normalizeUnitForMerge(unit: string): string {
  const u = unit.toLowerCase().trim();
  if (['oz', 'ounce', 'ounces'].includes(u)) return 'oz';
  if (['lb', 'lbs', 'pound', 'pounds'].includes(u)) return 'lb';
  if (['g', 'gram', 'grams'].includes(u)) return 'g';
  if (['kg', 'kilogram', 'kilograms'].includes(u)) return 'kg';
  if (['cup', 'cups'].includes(u)) return 'cup';
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(u)) return 'tbsp';
  if (['tsp', 'teaspoon', 'teaspoons'].includes(u)) return 'tsp';
  if (['ml', 'milliliter', 'milliliters'].includes(u)) return 'ml';
  if (['l', 'liter', 'liters'].includes(u)) return 'l';
  if (['slice', 'slices'].includes(u)) return 'slice';
  if (['scoop', 'scoops'].includes(u)) return 'scoop';
  if (['serving', 'servings'].includes(u)) return 'serving';
  if (['piece', 'pieces'].includes(u)) return 'piece';
  return u;
}

/**
 * Convert to a common base unit for addition.
 * Weight -> oz, Volume -> tbsp, Count -> as-is
 */
function convertToBaseUnit(value: number, unit: string): { value: number; unit: string } {
  const n = normalizeUnitForMerge(unit);
  // Weight -> oz
  if (n === 'lb') return { value: value * 16, unit: 'oz' };
  if (n === 'g') return { value: value / 28.35, unit: 'oz' };
  if (n === 'kg') return { value: value * 35.274, unit: 'oz' };
  if (n === 'oz') return { value, unit: 'oz' };
  // Volume -> tbsp
  if (n === 'cup') return { value: value * 16, unit: 'tbsp' };
  if (n === 'tsp') return { value: value / 3, unit: 'tbsp' };
  if (n === 'tbsp') return { value, unit: 'tbsp' };
  if (n === 'ml') return { value: value / 15, unit: 'tbsp' };
  if (n === 'l') return { value: value * 66.67, unit: 'tbsp' };
  // Count units stay as-is
  return { value, unit: n };
}

/**
 * Normalize ingredient name to a canonical key for grocery list grouping.
 * "Chicken, Breast, Boneless, Skinless, Raw" and "chicken" should merge.
 * "Avocado, Hass, Peeled, Raw" and "avocado" should merge.
 */
function normalizeIngredientKey(name: string): string {
  let key = name.toLowerCase().trim();
  
  // Remove common qualifiers that don't affect the grocery item
  key = key.replace(/,?\s*(raw|cooked|fresh|organic|boneless|skinless|peeled|frozen|canned|dried|ground|farm raised|atlantic|hass|green|cos|romaine|extra virgin)\b/gi, '');
  // Remove parenthetical notes
  key = key.replace(/\(.*?\)/g, '');
  // Remove "can sub..." / "can opt..." notes
  key = key.replace(/\bcan\s+(sub|opt)\b.*$/i, '');
  // Collapse whitespace and trim commas
  key = key.replace(/[,]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Remove trailing commas or dashes
  key = key.replace(/[,\-\s]+$/, '');
  
  return key;
}

/**
 * Pick the best display name between two ingredient names
 * (prefer the longer, more descriptive one)
 */
function pickBestDisplayName(existing: string, incoming: string): string {
  // Prefer the more specific/descriptive name
  if (incoming.length > existing.length) return incoming;
  return existing;
}

/**
 * Assign grocery-store-friendly category based on ingredient name.
 * Maps to actual store departments rather than macro roles.
 */
function getGroceryCategory(name: string, macroCategory: string): string {
  const n = name.toLowerCase();

  if (/\b(chicken|beef|turkey|pork|salmon|tuna|shrimp|fish|steak|lamb|tofu|tempeh|ground\s?(meat|beef|turkey|chicken)|breast|thigh|fillet|loin|sirloin|cod|tilapia|sausage|ham|deli|bison|sardine|mahi|halibut|scallop|crab|lobster|venison|duck|jerky)\b/.test(n)) return 'meat_seafood';

  if (/\b(yogurt|cheese|milk|cream cheese|sour cream|cottage|ricotta|mozzarella|parmesan|cheddar|feta|egg|eggs|whey|cream|kefir|half.and.half)\b/.test(n)) return 'dairy_eggs';

  if (/\b(berry|berries|banana|apple|orange|mango|grape|melon|peach|pear|plum|cherry|strawberr|blueberr|raspberr|blackberr|pineapple|kiwi|lemon|lime|date|fig|raisin|cranberr|watermelon|pomegranate|papaya|apricot|nectarine|tangerine|clementine|grapefruit)\b/.test(n)) return 'produce';

  if (/\b(rice|bread|pasta|oats|oatmeal|quinoa|tortilla|wrap|noodle|cereal|granola|bagel|muffin|flour|couscous|barley|farro|bulgur|cracker|pita|english muffin|pancake|waffle|cornmeal|polenta|bun|roll|sourdough|flatbread)\b/.test(n)) return 'grains_bread';

  if (/\b(broccoli|spinach|kale|lettuce|tomato|onion|pepper|carrot|celery|cucumber|zucchini|squash|asparagus|cauliflower|cabbage|mushroom|pea|arugula|bok choy|brussels|green bean|snap pea|snow pea|scallion|leek|shallot|artichoke|eggplant|beet|radish|turnip|corn|sweet potato|potato|yam|avocado|jalapeno|poblano|habanero|serrano)\b/.test(n)) return 'produce';

  if (/\b(olive oil|coconut oil|avocado oil|canola oil|vegetable oil|sesame oil|ghee|butter(?!\s*milk)|almond|walnut|pecan|cashew|peanut(?!\s*butter)|pistachio|macadamia|flax|chia|hemp|sunflower seed|pumpkin seed|pine nut|tahini)\b/.test(n)) return 'fats_oils';

  if (/\b(peanut butter|almond butter|nut butter|mayo|mayonnaise|dressing|soy sauce|hot sauce|vinegar|mustard|sriracha|worcestershire|balsamic|ketchup|salsa|tomato sauce|tomato paste|coconut milk|almond milk|oat milk|broth|stock|protein powder|whey protein|collagen|supplement|honey|maple|syrup|sugar|canned|extract|vanilla|cocoa|chocolate|baking|jam|jelly)\b/.test(n)) return 'pantry';

  if (/\b(salt|pepper|cumin|paprika|cinnamon|turmeric|oregano|basil|thyme|rosemary|parsley|cilantro|chili|cayenne|nutmeg|ginger|garlic powder|onion powder|dill|sage|bay leaf|coriander|cardamom|allspice|clove|fennel|saffron|mint|chive|tarragon|italian seasoning|taco seasoning|curry|za.atar|everything bagel|red pepper flake|garlic(?!\s))\b/.test(n)) return 'seasonings';

  if (/\b(bean|lentil|chickpea|black bean|kidney bean|pinto bean|edamame|hummus)\b/.test(n)) return 'pantry';

  if (macroCategory === 'protein') return 'meat_seafood';
  if (macroCategory === 'carbs') return 'grains_bread';
  if (macroCategory === 'fats') return 'fats_oils';
  if (macroCategory === 'vegetables') return 'produce';
  if (macroCategory === 'seasonings') return 'seasonings';
  return 'pantry';
}

/**
 * When an ingredient has amount "1 serving", estimate a real
 * grocery-purchasable amount using the ingredient's calorie data.
 */
function estimateServingAmount(
  ingredientName: string,
  calories: number,
  macroCategory: string
): { value: number; unit: string } | null {
  if (!calories || calories <= 0) return null;

  const n = ingredientName.toLowerCase();

  // Known serving-size anchors (calories → typical household amount)
  if (/protein powder|whey/.test(n)) {
    const scoops = Math.max(1, Math.round(calories / 120));
    return { value: scoops * 30, unit: 'g' };
  }
  if (/yogurt/.test(n)) return { value: Math.round(calories / 0.59), unit: 'g' }; // Greek yogurt ~0.59 cal/g
  if (/egg/.test(n)) return { value: Math.max(1, Math.round(calories / 72)), unit: 'large' };
  if (/bread|english muffin|bagel/.test(n)) return { value: Math.max(1, Math.round(calories / 80)), unit: 'slice' };
  if (/tortilla|wrap/.test(n)) return { value: Math.max(1, Math.round(calories / 120)), unit: 'piece' };

  // Estimate grams from calorie density by category
  const calPerGram: Record<string, number> = {
    protein: 1.5, carbs: 1.3, fats: 7, vegetables: 0.3, seasonings: 2.5, other: 1.5,
  };
  const density = calPerGram[macroCategory] || 1.5;
  const grams = calories / density;

  const oz = grams / 28.35;
  if (oz >= 16) return { value: Math.ceil(oz / 16 * 2) / 2, unit: 'lb' };
  if (oz >= 2) return { value: Math.ceil(oz), unit: 'oz' };
  if (grams >= 5) return { value: Math.round(grams), unit: 'g' };
  return null;
}

/**
 * Consolidate grocery list from weekly meal plan.
 * Groups by grocery-store department, converts amounts to
 * purchase-friendly units, and handles page-break-safe ordering.
 */
export function consolidateGroceryList(mealPlan: WeeklyMealPlan): Record<string, { name: string; totalAmount: string; category: string; meals: string[] }[]> {
  const groceryMap: Map<string, {
    amounts: { value: number; unit: string }[];
    groceryCategory: string;
    meals: string[];
    originalName: string;
  }> = new Map();

  for (const [day, dayPlan] of Object.entries(mealPlan)) {
    if (!dayPlan?.meals) continue;

    for (const meal of dayPlan.meals) {
      if (!meal?.ingredients) continue;

      for (const ingredient of meal.ingredients) {
        if (!ingredient?.item) continue;

        const cleanedName = cleanIngredientName(ingredient.item);
        if (!cleanedName) continue;

        const key = normalizeIngredientKey(cleanedName);
        if (!key) continue;

        const existing = groceryMap.get(key);

        const amountStr = ingredient.amount || '1 serving';
        const isNonScalable = /\b(to taste|as needed|optional|pinch|dash|garnish)\b/i.test(amountStr);

        let value = 1;
        let unit = 'serving';

        if (!isNonScalable) {
          const amountMatch = amountStr.match(/^([\d.\/]+)\s*(.*)$/);
          if (amountMatch) {
            if (amountMatch[1].includes('/')) {
              const [num, denom] = amountMatch[1].split('/');
              value = parseFloat(num) / parseFloat(denom);
            } else {
              value = parseFloat(amountMatch[1]) || 1;
            }
            unit = amountMatch[2]?.trim() || 'serving';
          }

          // Convert vague "serving" amounts to real grocery quantities
          if (normalizeUnitForMerge(unit) === 'serving') {
            const estimated = estimateServingAmount(
              cleanedName,
              ingredient.calories || 0,
              ingredient.category || 'other'
            );
            if (estimated) {
              value = estimated.value;
              unit = estimated.unit;
            }
          }
        } else {
          value = 0;
          unit = 'to taste';
        }

        // Determine shopping-friendly category from ingredient name
        const groceryCategory = getGroceryCategory(cleanedName, ingredient.category || 'other');

        if (existing) {
          existing.originalName = pickBestDisplayName(existing.originalName, cleanedName);

          if (unit === 'to taste') {
            if (!existing.amounts.some(a => a.unit === 'to taste')) {
              existing.amounts.push({ value: 0, unit: 'to taste' });
            }
          } else {
            const normalizedUnit = normalizeUnitForMerge(unit);
            const sameUnit = existing.amounts.find(a => normalizeUnitForMerge(a.unit) === normalizedUnit);
            if (sameUnit) {
              const base1 = convertToBaseUnit(sameUnit.value, sameUnit.unit);
              const base2 = convertToBaseUnit(value, unit);
              if (base1.unit === base2.unit) {
                sameUnit.value = base1.value + base2.value;
                sameUnit.unit = base1.unit;
              } else {
                existing.amounts.push({ value, unit });
              }
            } else {
              existing.amounts.push({ value, unit });
            }
          }
          if (!existing.meals.includes(`${day} - ${meal.name}`)) {
            existing.meals.push(`${day} - ${meal.name}`);
          }
        } else {
          groceryMap.set(key, {
            amounts: unit === 'to taste' ? [{ value: 0, unit: 'to taste' }] : [{ value, unit }],
            groceryCategory,
            meals: [`${day} - ${meal.name}`],
            originalName: cleanedName,
          });
        }
      }
    }
  }

  // Grocery-store-ordered result bins
  const result: Record<string, { name: string; totalAmount: string; category: string; meals: string[] }[]> = {
    produce: [],
    meat_seafood: [],
    dairy_eggs: [],
    grains_bread: [],
    fats_oils: [],
    pantry: [],
    seasonings: [],
  };

  const normalizeDisplayUnit = (unit: string): string => {
    const unitLower = unit.toLowerCase().trim();
    const unitMap: Record<string, string> = {
      tbsp: 'tbsp', tsp: 'tsp', oz: 'oz', lb: 'lb', lbs: 'lb',
      g: 'g', kg: 'kg', ml: 'ml', l: 'L',
      cup: 'cup', cups: 'cups',
      large: 'large', piece: 'piece', pieces: 'pieces',
      slice: 'slice', slices: 'slices',
      scoop: 'scoop', scoops: 'scoops',
    };
    return unitMap[unitLower] || unit.charAt(0).toLowerCase() + unit.slice(1);
  };

  for (const [, data] of groceryMap) {
    const amountParts = data.amounts
      .map(a => {
        if (a.unit === 'to taste') return 'to taste';

        const unitNorm = normalizeUnitForMerge(a.unit);
        let roundedValue = a.value;
        let displayUnit = normalizeDisplayUnit(a.unit);

        if (unitNorm === 'oz') {
          if (roundedValue >= 16) {
            roundedValue = Math.ceil(roundedValue / 16 * 2) / 2;
            displayUnit = 'lb';
          } else {
            roundedValue = Math.ceil(roundedValue);
          }
        } else if (unitNorm === 'tbsp') {
          if (roundedValue >= 16) {
            roundedValue = Math.ceil(roundedValue / 16 * 4) / 4;
            displayUnit = roundedValue === 1 ? 'cup' : 'cups';
          } else if (roundedValue < 1) {
            roundedValue = Math.ceil(roundedValue * 3);
            displayUnit = 'tsp';
          } else {
            roundedValue = Math.ceil(roundedValue * 2) / 2;
          }
        } else if (['slice', 'scoop', 'piece', 'large'].includes(unitNorm)) {
          roundedValue = Math.ceil(roundedValue);
          if (roundedValue > 1) {
            const plurals: Record<string, string> = { slice: 'slices', scoop: 'scoops', piece: 'pieces', large: 'large' };
            displayUnit = plurals[unitNorm] || displayUnit;
          }
        } else if (unitNorm === 'g') {
          // Convert large gram totals to oz/lb for grocery shopping
          const totalOz = roundedValue / 28.35;
          if (totalOz >= 16) {
            roundedValue = Math.ceil(totalOz / 16 * 2) / 2;
            displayUnit = 'lb';
          } else if (totalOz >= 2) {
            roundedValue = Math.ceil(totalOz);
            displayUnit = 'oz';
          } else {
            roundedValue = Math.round(roundedValue);
          }
        } else if (unitNorm === 'serving') {
          roundedValue = Math.ceil(roundedValue);
          displayUnit = roundedValue === 1 ? 'serving' : 'servings';
        } else {
          roundedValue = Math.round(a.value * 10) / 10;
        }

        if (roundedValue === 0) return null;

        if (roundedValue < 1) {
          if (roundedValue >= 0.7) return `1 ${displayUnit}`;
          if (roundedValue >= 0.4) return `1/2 ${displayUnit}`;
          if (roundedValue >= 0.2) return `1/4 ${displayUnit}`;
          return `${roundedValue} ${displayUnit}`;
        }

        const whole = Math.floor(roundedValue);
        const frac = roundedValue - whole;
        if (frac >= 0.7) return `${whole + 1} ${displayUnit}`;
        if (frac >= 0.4) return `${whole} 1/2 ${displayUnit}`;
        if (frac >= 0.2) return `${whole} 1/4 ${displayUnit}`;

        const formattedValue = roundedValue % 1 === 0
          ? roundedValue.toString()
          : roundedValue.toFixed(1).replace(/\.0$/, '');

        return `${formattedValue} ${displayUnit}`;
      })
      .filter(Boolean);

    if (amountParts.length === 0) continue;

    const totalAmount = amountParts.join(' + ');
    const category = data.groceryCategory in result ? data.groceryCategory : 'pantry';

    result[category].push({
      name: data.originalName,
      totalAmount,
      category,
      meals: data.meals,
    });
  }

  for (const category of Object.keys(result)) {
    result[category].sort((a, b) => a.name.localeCompare(b.name));
  }

  return result;
}
