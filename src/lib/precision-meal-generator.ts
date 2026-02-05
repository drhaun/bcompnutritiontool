/**
 * Precision Meal Generator
 * Combines AI meal concepts with database-accurate nutrition calculations
 * 
 * ACCURACY TARGETS:
 * - Calories: ±5%
 * - Protein: ±10%
 * - Carbs: ±15%
 * - Fat: ±10%
 */

import OpenAI from 'openai';
import {
  searchFoods,
  scaleFood,
  calculatePortions,
  adjustForNutrientTiming,
  COMMON_FOODS,
  type FoodItem,
  type ScaledFood,
  type FoodNutrients,
} from './food-database';
import type {
  Meal,
  Ingredient,
  Macros,
  DietPreferences,
  DayOfWeek,
} from '@/types';

// Accuracy thresholds - tighter than before
export const ACCURACY_THRESHOLDS = {
  calories: 0.05,    // ±5%
  protein: 0.10,     // ±10%
  carbs: 0.15,       // ±15% (more flexible as it fills remaining)
  fat: 0.10,         // ±10%
};

// Reasonable portion limits to prevent extraordinary amounts
const PORTION_LIMITS: Record<string, { min: number; max: number; typical: number }> = {
  primary_protein: { min: 100, max: 200, typical: 150 },   // Was 80-220
  primary_carb: { min: 80, max: 250, typical: 150 },       // Was 80-350 (350g rice is absurd)
  fat_source: { min: 8, max: 40, typical: 15 },            // Was 8-50
  vegetable: { min: 75, max: 150, typical: 100 },          // Was 50-200
  flavor: { min: 3, max: 20, typical: 10 },
  default: { min: 30, max: 150, typical: 75 },
};

// Portion warnings for unusual amounts
export const PORTION_WARNINGS = {
  protein_high: 'This meal contains over 200g of protein source - consider splitting into two meals',
  carbs_high: 'Carb portion exceeds typical serving (>250g) - verify this is intentional',
  fat_low: 'Fat is under 5g - may affect satiety and nutrient absorption',
  fat_high: 'Fat source exceeds 40g - consider using a leaner protein or reducing added fats',
  vegetable_low: 'Low vegetable content - consider adding more for fiber and micronutrients',
};

interface MealConcept {
  name: string;
  description: string;
  foods: {
    searchTerm: string;
    role: 'primary_protein' | 'primary_carb' | 'fat_source' | 'vegetable' | 'flavor';
    targetPct: number; // % of meal's target macros this should provide
  }[];
  instructions: string[];
  prepTime: string;
}

interface GeneratePreciseMealOptions {
  day: DayOfWeek;
  slotLabel: string;
  targetMacros: Macros;
  timeSlot: string;
  workoutRelation: 'pre-workout' | 'post-workout' | 'none';
  isWorkoutDay: boolean;
  dietPreferences: Partial<DietPreferences>;
  previousMeals: string[];
  goalType?: string;
}

/**
 * Generate a meal with database-accurate macros
 */
export async function generatePreciseMeal(
  apiKey: string,
  options: GeneratePreciseMealOptions
): Promise<Meal> {
  const openai = new OpenAI({ apiKey });

  // Step 1: Adjust targets for nutrient timing
  const adjustedTargets = adjustForNutrientTiming(
    {
      calories: options.targetMacros.calories,
      protein: options.targetMacros.protein,
      carbs: options.targetMacros.carbs,
      fat: options.targetMacros.fat,
    },
    options.workoutRelation,
    (options.goalType as 'lose_fat' | 'gain_muscle' | 'maintain' | 'performance') || 'maintain'
  );

  // Step 2: Get AI meal concept (foods to use, not macros)
  const concept = await getMealConcept(openai, options, adjustedTargets);

  // Step 3: Look up foods in database and calculate precise portions
  const scaledFoods = await buildMealFromConcept(concept, adjustedTargets);

  // Step 4: Calculate actual totals from database foods
  const totalMacros = calculateTotalMacros(scaledFoods);

  // Step 5: Fine-tune portions if needed to hit targets more precisely
  const refinedFoods = refineMacros(scaledFoods, adjustedTargets, totalMacros);
  const finalMacros = calculateTotalMacros(refinedFoods);

  // Step 6: Convert to meal format
  const meal = convertToMeal(concept, refinedFoods, finalMacros, options);

  return meal;
}

// Chef persona for AI prompts - emphasizes flavor and culinary expertise
const CHEF_PERSONA = `
You are an AWARD-WINNING MICHELIN-TRAINED CHEF who specializes in nutrition-optimized cuisine.
Your food must be DELICIOUS FIRST - hitting macros means nothing if the client won't enjoy eating it.

FLAVOR PRINCIPLES YOU LIVE BY:
• Balance: Every dish needs acid (lemon, vinegar), fat, salt, and umami
• Texture contrast: Combine crispy + creamy, crunchy + tender elements
• Fresh herbs and aromatics transform simple ingredients into restaurant-quality meals
• Proper seasoning is NON-NEGOTIABLE - taste as you cook
• Visual appeal matters - we eat with our eyes first
• Temperature contrast can make a dish memorable (warm protein on cool salad)

COOKING EXCELLENCE:
• Proteins should be properly seared, not steamed - get that Maillard reaction
• Vegetables should have color and crunch, never mushy or gray
• Grains should be fluffy and well-seasoned, never bland
• Sauces and dressings tie everything together`;

// Variety enforcement rules for preventing repetitive meals
const buildVarietyRules = (
  previousMeals: string[],
  usedProteins: string[],
  yesterdayCuisine: string
): string => {
  return `
═══════════════════════════════════════════════════════════
🎯 VARIETY REQUIREMENTS (STRICTLY ENFORCE)
═══════════════════════════════════════════════════════════
• NEVER repeat an exact meal name within 14 days
• Same protein source MAX 2x per week
  ${usedProteins.length > 0 ? `→ Already used this week: ${usedProteins.join(', ')}` : '→ No proteins used yet this week'}
• Rotate cuisines daily - yesterday was ${yesterdayCuisine || 'unknown'}, choose DIFFERENT today
• Include at least 3 different vegetables this week
• Avoid similar cooking methods back-to-back (don't do stir-fry twice in a row)

❌ RECENT MEALS TO AVOID (make something SIGNIFICANTLY different):
${previousMeals.slice(-14).map((m, i) => `  ${i + 1}. ${m}`).join('\n') || '  None yet'}
`;
};

/**
 * Get AI meal concept (what foods to use, not the macros)
 * Creates delicious, varied meals with proper culinary consideration
 * 
 * Enhanced with:
 * - Chef persona for flavor emphasis
 * - Strong personalization 
 * - 14-meal variety tracking
 * - Cuisine rotation
 */
async function getMealConcept(
  openai: OpenAI,
  options: GeneratePreciseMealOptions,
  targetMacros: FoodNutrients
): Promise<MealConcept> {
  const { dietPreferences, slotLabel, workoutRelation, previousMeals, isWorkoutDay, day, timeSlot } = options;

  const restrictions = dietPreferences.dietaryRestrictions || [];
  const allergies = dietPreferences.allergies || [];
  const customAllergies = dietPreferences.customAllergies || [];
  const allAllergies = [...allergies, ...customAllergies].filter(Boolean);
  const foodsToAvoid = dietPreferences.foodsToAvoid || [];
  const foodsToEmphasize = dietPreferences.foodsToEmphasize || [];
  const cuisines = dietPreferences.cuisinePreferences || [];
  const flavorProfiles = dietPreferences.flavorProfiles || [];
  const spiceLevel = dietPreferences.spiceLevel || 'medium';
  const seasonings = dietPreferences.preferredSeasonings || [];
  
  const preferred = {
    proteins: dietPreferences.preferredProteins || [],
    carbs: dietPreferences.preferredCarbs || [],
    fats: dietPreferences.preferredFats || [],
    vegetables: dietPreferences.preferredVegetables || [],
  };
  
  // Get supplements the client is currently taking
  const supplements = dietPreferences.supplements || [];
  const takingSupplements = supplements.filter(s => s.status === 'taking').map(s => ({
    name: s.name,
    notes: s.notes || '',
  }));
  const hasProteinPowder = takingSupplements.some(s => 
    s.name.toLowerCase().includes('protein') || s.name.toLowerCase().includes('whey') || s.name.toLowerCase().includes('casein')
  );
  const hasCreatine = takingSupplements.some(s => s.name.toLowerCase().includes('creatine'));
  const hasBCAAs = takingSupplements.some(s => s.name.toLowerCase().includes('bcaa') || s.name.toLowerCase().includes('eaa'));

  // Calculate the macro profile
  const proteinCals = targetMacros.protein * 4;
  const carbsCals = targetMacros.carbs * 4;
  const fatCals = targetMacros.fat * 9;
  const totalTargetCals = proteinCals + carbsCals + fatCals;
  const fatPct = Math.round((fatCals / totalTargetCals) * 100);
  const isLowFat = fatPct < 30;
  const isHighProtein = targetMacros.protein > 40;
  
  // Determine meal type context based on time of day, not label
  // Parse time slot to determine meal context
  const parseTimeToHour = (t: string): number => {
    if (!t) return 12;
    const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 12;
    let hour = parseInt(match[1]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour;
  };
  
  const mealHour = parseTimeToHour(timeSlot);
  const isSnack = slotLabel.toLowerCase().includes('snack');
  const isEarlyMeal = mealHour < 10; // Before 10 AM = breakfast-style
  const isMidDayMeal = mealHour >= 10 && mealHour < 15; // 10 AM - 3 PM = lunch-style
  const isEveningMeal = mealHour >= 17; // 5 PM+ = dinner-style
  const isAfternoonMeal = mealHour >= 15 && mealHour < 17; // 3-5 PM = late afternoon
  
  // Extract meal number for context
  const mealNumber = slotLabel.match(/\d+/)?.[0] || '1';

  // Build cuisine variety guidance
  const recentMealTypes = previousMeals.map(m => {
    const lower = m.toLowerCase();
    if (lower.includes('asian') || lower.includes('stir') || lower.includes('teriyaki') || lower.includes('thai') || lower.includes('chinese') || lower.includes('korean')) return 'asian';
    if (lower.includes('mexican') || lower.includes('taco') || lower.includes('burrito') || lower.includes('southwest')) return 'mexican';
    if (lower.includes('mediterranean') || lower.includes('greek') || lower.includes('falafel') || lower.includes('hummus')) return 'mediterranean';
    if (lower.includes('italian') || lower.includes('pasta') || lower.includes('risotto')) return 'italian';
    if (lower.includes('indian') || lower.includes('curry') || lower.includes('tikka') || lower.includes('masala')) return 'indian';
    return 'american';
  });
  
  // Extract used proteins from previous meals for variety tracking
  const usedProteins: string[] = [];
  previousMeals.slice(-14).forEach(m => {
    const lower = m.toLowerCase();
    if (lower.includes('chicken')) usedProteins.push('chicken');
    if (lower.includes('salmon')) usedProteins.push('salmon');
    if (lower.includes('beef') || lower.includes('steak')) usedProteins.push('beef');
    if (lower.includes('turkey')) usedProteins.push('turkey');
    if (lower.includes('shrimp') || lower.includes('prawn')) usedProteins.push('shrimp');
    if (lower.includes('fish') || lower.includes('cod') || lower.includes('tilapia') || lower.includes('tuna')) usedProteins.push('fish');
    if (lower.includes('egg')) usedProteins.push('eggs');
    if (lower.includes('pork') || lower.includes('ham')) usedProteins.push('pork');
    if (lower.includes('tofu') || lower.includes('tempeh')) usedProteins.push('tofu');
  });
  
  // Count protein frequency to identify overused ones
  const proteinCounts: Record<string, number> = {};
  usedProteins.forEach(p => { proteinCounts[p] = (proteinCounts[p] || 0) + 1; });
  const overusedProteins = Object.entries(proteinCounts)
    .filter(([_, count]) => count >= 2)
    .map(([protein]) => protein);
  
  const yesterdayCuisine = recentMealTypes.length > 0 ? recentMealTypes[recentMealTypes.length - 1] : 'unknown';
  
  const cuisinesToAvoid = recentMealTypes.slice(-3);
  const suggestedCuisines = cuisines.length > 0 
    ? cuisines.filter(c => !cuisinesToAvoid.includes(c.toLowerCase())).slice(0, 3)
    : ['Mediterranean', 'Asian', 'Mexican', 'American', 'Italian', 'Indian'].filter(c => !cuisinesToAvoid.includes(c.toLowerCase())).slice(0, 3);

  // Build variety rules with enhanced tracking
  const varietyRules = buildVarietyRules(previousMeals, [...new Set(usedProteins)], yesterdayCuisine);

  const prompt = `
${CHEF_PERSONA}

═══════════════════════════════════════════════════════════
🍳 MEAL CONTEXT
═══════════════════════════════════════════════════════════
- Day: ${day}
- Slot: ${slotLabel} at ${timeSlot || 'midday'}
- Time Context: ${isEarlyMeal ? 'EARLY MORNING (breakfast-style: eggs, oatmeal, smoothies, toast)' : isMidDayMeal ? 'MIDDAY (lunch-style: salads, bowls, sandwiches, wraps)' : isEveningMeal ? 'EVENING (dinner-style: more elaborate, hearty meals)' : isAfternoonMeal ? 'LATE AFTERNOON (lighter meal or substantial snack)' : 'Regular meal'}
- Workout Timing: ${isWorkoutDay ? (workoutRelation === 'pre-workout' ? '⚡ PRE-WORKOUT - needs quick-digesting carbs, moderate protein, lower fat' : workoutRelation === 'post-workout' ? '💪 POST-WORKOUT - recovery focused: prioritize protein + carbs for glycogen replenishment' : 'Workout day but not around training') : 'Rest day - no workout timing considerations'}
${isSnack ? '- This is a SNACK: lighter portion, portable-friendly, quick to prepare' : ''}

${varietyRules}
${overusedProteins.length > 0 ? `
⚠️ OVERUSED PROTEINS THIS WEEK - USE DIFFERENT: ${overusedProteins.join(', ')}
Consider alternatives like: ${['chicken', 'salmon', 'beef', 'turkey', 'shrimp', 'fish', 'eggs', 'tofu'].filter(p => !overusedProteins.includes(p)).slice(0, 4).join(', ')}
` : ''}

SUGGESTED CUISINE DIRECTION (pick ONE, make it authentic):
${suggestedCuisines.map(c => `  • ${c}`).join('\n')}

═══════════════════════════════════════════════════════════
CLIENT TASTE PREFERENCES
═══════════════════════════════════════════════════════════
- Cuisines loved: ${cuisines.join(', ') || 'Open to variety'}
- Flavor profiles: ${flavorProfiles.join(', ') || 'Balanced, savory'}
- Spice tolerance: ${spiceLevel}
- Favorite seasonings: ${seasonings.join(', ') || 'Garlic, herbs, citrus'}

═══════════════════════════════════════════════════════════
MACRO TARGETS
═══════════════════════════════════════════════════════════
- Calories: ~${Math.round(targetMacros.calories)} kcal
- Protein: ${targetMacros.protein}g ${isHighProtein ? '(HIGH - prioritize lean protein)' : ''}
- Carbs: ${targetMacros.carbs}g ${targetMacros.carbs > 60 ? '(substantial carb source needed)' : targetMacros.carbs < 30 ? '(lower carb)' : ''}
- Fat: ${targetMacros.fat}g (${fatPct}% of cals) ${isLowFat ? '→ LEAN proteins required' : '→ Include healthy fats'}

═══════════════════════════════════════════════════════════
⛔ CRITICAL DIETARY RESTRICTIONS - DO NOT VIOLATE
═══════════════════════════════════════════════════════════
- Dietary restrictions: ${restrictions.join(', ') || 'None'}
- 🚨 ALLERGIES (NEVER USE - DANGEROUS): ${allAllergies.join(', ') || 'None'}
- ❌ FOODS TO AVOID (client dislikes/cannot eat): ${foodsToAvoid.join(', ') || 'None'}

${allAllergies.length > 0 || foodsToAvoid.length > 0 ? `
⚠️ IMPORTANT: Double-check EVERY ingredient against the allergies and foods to avoid list above.
If ANY ingredient matches, DO NOT include it - find an alternative!
` : ''}

═══════════════════════════════════════════════════════════
✅ FOODS TO PRIORITIZE & EMPHASIZE
═══════════════════════════════════════════════════════════
${foodsToEmphasize.length > 0 ? `🌟 CLIENT WANTS THESE FOODS: ${foodsToEmphasize.join(', ')}
→ Try to incorporate at least ONE of these emphasized foods in this meal when appropriate!` : 'No specific foods to emphasize'}

- Preferred proteins: ${preferred.proteins.join(', ') || 'chicken, fish, eggs, beef, turkey'}
- Preferred carbs: ${preferred.carbs.join(', ') || 'rice, potatoes, oats, quinoa'}
- Preferred vegetables: ${preferred.vegetables.join(', ') || 'broccoli, spinach, peppers, asparagus'}

═══════════════════════════════════════════════════════════
CLIENT'S SUPPLEMENT ROUTINE
═══════════════════════════════════════════════════════════
${takingSupplements.length > 0 ? takingSupplements.map(s => `- ${s.name}${s.notes ? `: ${s.notes}` : ''}`).join('\n') : 'No supplements specified'}
${hasProteinPowder ? '→ Client uses protein powder - consider adding to smoothies, oatmeal, or as a component when extra protein is needed' : ''}
${hasCreatine ? '→ Client takes creatine - can be added to any liquid (smoothie, shake) or with food' : ''}
${hasBCAAs ? '→ Client takes BCAAs/EAAs - ideal around workouts, can include in pre/post workout meals' : ''}

═══════════════════════════════════════════════════════════
FOOD SEARCH TERMS (use these exact formats for database lookup)
═══════════════════════════════════════════════════════════
PROTEINS:
- Lean: "chicken breast boneless skinless raw", "turkey breast raw", "tilapia raw", "shrimp raw", "egg white raw", "cod raw", "tuna raw"
- Fatty: "salmon atlantic raw", "beef ribeye raw", "egg whole raw", "ground beef 85% lean raw", "pork tenderloin raw"

CARBS:
- Grains: "rice white long grain cooked", "rice brown cooked", "quinoa cooked", "oats regular dry", "pasta cooked"
- Starchy: "sweet potato cooked baked", "potato russet baked", "bread whole wheat"

VEGETABLES:
"broccoli raw", "spinach raw", "asparagus raw", "bell pepper raw", "zucchini raw", "mushrooms raw", "onion raw", "tomato raw", "kale raw", "green beans raw"

FATS:
"olive oil", "avocado raw", "almonds raw", "peanut butter", "coconut oil"

═══════════════════════════════════════════════════════════
YOUR TASK: Create ONE delicious ${isSnack ? 'snack' : 'meal'}
═══════════════════════════════════════════════════════════
${isEarlyMeal ? `
EARLY MORNING IDEAS: Protein pancakes, veggie egg scramble, overnight oats with berries, smoked salmon avocado toast, Greek yogurt parfait, breakfast burrito, shakshuka, egg white frittata, turkey sausage hash
` : isSnack ? `
SNACK IDEAS: Protein smoothie, Greek yogurt with almonds, apple with almond butter, cottage cheese with berries, turkey & cheese roll-ups, hummus with veggie sticks, protein energy balls, rice cakes with nut butter
` : isEveningMeal ? `
EVENING MEAL IDEAS: Herb-crusted salmon with asparagus, chicken stir-fry with vegetables, lean beef tacos, Mediterranean quinoa bowl, Thai basil chicken, grilled steak with roasted vegetables, shrimp scampi, chicken tikka masala, baked cod with sweet potato
` : isMidDayMeal ? `
MIDDAY MEAL IDEAS: Asian sesame chicken salad, Mediterranean power bowl, turkey avocado wrap, poke bowl, chicken burrito bowl, Greek salad with grilled protein, Thai beef salad, Buddha bowl, tuna nicoise salad
` : `
MEAL IDEAS: Grilled protein with roasted vegetables, stir-fry bowl, grain bowl with lean protein, salad with substantial protein, wrap or sandwich with balanced macros
`}
${workoutRelation === 'pre-workout' ? `
PRE-WORKOUT FOCUS: Quick-digesting carbs (rice, toast, fruit), moderate protein, minimal fat/fiber. Think: rice bowl, banana with protein, toast with turkey.
${hasBCAAs ? '→ Can include BCAAs/EAAs with this meal for muscle support' : ''}
` : ''}
${workoutRelation === 'post-workout' ? `
POST-WORKOUT FOCUS: High protein for recovery, fast carbs to replenish glycogen. Think: chicken with rice, protein smoothie with fruit, lean meat with potato.
${hasProteinPowder ? '→ Protein shake can be a component of this meal for quick absorption' : ''}
${hasCreatine ? '→ Good time to take creatine with carbs' : ''}
` : ''}

Return JSON:
{
  "name": "Creative, Appetizing Name (e.g., 'Thai Basil Chicken Stir-Fry', 'Mediterranean Salmon Bowl', 'Spicy Southwest Scramble')",
  "description": "One sentence describing the flavors and appeal",
  "foods": [
    { "searchTerm": "exact database search term", "role": "primary_protein", "targetPct": 40-50 },
    { "searchTerm": "exact database search term", "role": "primary_carb", "targetPct": 30-40 },
    { "searchTerm": "exact database search term", "role": "vegetable", "targetPct": 10-15 },
    ${!isLowFat ? '{ "searchTerm": "olive oil or avocado raw", "role": "fat_source", "targetPct": 10-15 }' : '// Skip fat_source for low-fat meals'}
  ],
  "instructions": ["Detailed step 1 with seasoning", "Step 2 with cooking method", "Step 3 with plating/finishing"],
  "prepTime": "X minutes"
}

IMPORTANT:
- Create something UNIQUE and DELICIOUS - not generic "chicken rice broccoli"
- Include seasonings/spices in the instructions (garlic, ginger, cumin, paprika, herbs, etc.)
- Make it sound appetizing - this is restaurant quality!
- Match the meal type (breakfast should feel like breakfast, etc.)
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an AWARD-WINNING MICHELIN-TRAINED CHEF who specializes in nutrition-optimized cuisine.
        
Your meals must be DELICIOUS FIRST - hitting macros means nothing if the client won't enjoy eating it.

RULES:
1. NEVER create generic "chicken rice broccoli" meals - every dish should have personality
2. Proper seasoning is mandatory - include specific spices, herbs, and aromatics
3. Texture and color variety make meals exciting
4. Consider how flavors complement each other (acid balances richness, herbs brighten heavy proteins)
5. Instructions should include cooking TECHNIQUES, not just "cook the chicken"
6. Create something you'd be PROUD to serve in your restaurant

Return ONLY valid JSON. Make food people CRAVE to eat.`,
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7, // Reduced from 0.85 for better consistency while maintaining creativity
    presence_penalty: 0.3, // Discourage repetition
    frequency_penalty: 0.2, // Encourage varied vocabulary
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No AI response');

  return JSON.parse(content) as MealConcept;
}

/**
 * Look up foods and calculate portions to hit targets
 * Uses iterative refinement to get close to target macros
 */
async function buildMealFromConcept(
  concept: MealConcept,
  targetMacros: FoodNutrients
): Promise<ScaledFood[]> {
  const foodItems: { food: FoodItem; role: string; targetPct: number }[] = [];

  // First pass: find all foods
  for (const foodSpec of concept.foods) {
    // Search for the food with preference for raw/whole foods
    const foods = await searchFoods(foodSpec.searchTerm, { pageSize: 10, preferRaw: true });

    if (foods.length === 0) {
      console.warn(`No food found for: ${foodSpec.searchTerm}`);
      continue;
    }

    // Pick the best match (first one after sorting)
    const food = foods[0];
    foodItems.push({ food, role: foodSpec.role, targetPct: foodSpec.targetPct });
  }

  if (foodItems.length === 0) {
    return [];
  }
  
  // Ensure we have a fat source if target fat is significant
  // But check if primary protein is already high-fat
  const hasFatSource = foodItems.some(f => f.role === 'fat_source');
  const proteinFood = foodItems.find(f => f.role === 'primary_protein');
  const proteinFatPer100g = proteinFood?.food.nutrients.fat || 0;
  const isHighFatProtein = proteinFatPer100g > 8; // >8g fat per 100g = fatty protein
  
  // Only add fat source if protein isn't fatty AND we need significant fat
  if (!hasFatSource && targetMacros.fat > 15 && !isHighFatProtein) {
    // Add olive oil as default fat source
    const oliveOil = await searchFoods('olive oil', { pageSize: 5 });
    if (oliveOil.length > 0) {
      foodItems.push({
        food: oliveOil[0],
        role: 'fat_source',
        targetPct: 15,
      });
    }
  }

  // Second pass: Smart initial portion calculation
  // Calculate how much of each food we need to hit the PRIMARY macro for its role
  // Then account for the "spillover" macros from other foods
  let scaledFoods: ScaledFood[] = [];
  
  // First, calculate naive portions based on primary macros
  const naivePortions: { food: FoodItem; role: string; grams: number; primaryMacro: keyof FoodNutrients }[] = [];
  
  for (const { food, role, targetPct } of foodItems) {
    let primaryMacro: keyof FoodNutrients = 'calories';
    let targetValue = targetMacros.calories * (targetPct / 100);
    
    if (role === 'primary_protein') {
      // Protein source should provide most of the protein
      // Other sources (grains, vegetables) contribute ~8-12g protein
      primaryMacro = 'protein';
      const proteinFromOthers = 10;
      targetValue = Math.max(20, targetMacros.protein - proteinFromOthers);
    } else if (role === 'primary_carb') {
      primaryMacro = 'carbs';
      targetValue = targetMacros.carbs * 0.85; // Primary carb provides 85% of target
    } else if (role === 'fat_source') {
      primaryMacro = 'fat';
      // Fat source needs to provide most of the fat
      // Protein/carb sources typically contribute 5-8g fat
      const estimatedFatFromOtherSources = 6;
      targetValue = Math.max(5, targetMacros.fat - estimatedFatFromOtherSources);
    } else if (role === 'vegetable') {
      // Vegetables are for fiber and volume, use calorie target
      primaryMacro = 'calories';
      targetValue = 50; // ~50 cal from vegetables is reasonable
    }

    const per100g = food.nutrients[primaryMacro];
    let grams = per100g > 0 ? (targetValue / per100g) * 100 : 100;
    
    // Apply reasonable limits from constants
    const limit = PORTION_LIMITS[role] || PORTION_LIMITS.default;
    grams = Math.max(limit.min, Math.min(limit.max, grams));
    
    naivePortions.push({ food, role, grams, primaryMacro });
  }
  
  // Calculate initial totals
  for (const portion of naivePortions) {
    scaledFoods.push(scaleFood(portion.food, portion.grams));
  }
  
  let totals = calculateTotalMacros(scaledFoods);
  
  // Adjust fat source if we have one and fat is off
  const fatIdx = naivePortions.findIndex(p => p.role === 'fat_source');
  if (fatIdx >= 0) {
    const fatDeficit = targetMacros.fat - totals.fat;
    if (fatDeficit > 3) {
      // Need more fat
      const fatFood = naivePortions[fatIdx].food;
      const per100g = fatFood.nutrients.fat;
      if (per100g > 0) {
        const additionalGrams = (fatDeficit / per100g) * 100;
        const newGrams = Math.min(50, naivePortions[fatIdx].grams + additionalGrams);
        scaledFoods[fatIdx] = scaleFood(fatFood, newGrams);
      }
    } else if (fatDeficit < -5) {
      // Too much fat, reduce fat source
      const fatFood = naivePortions[fatIdx].food;
      const per100g = fatFood.nutrients.fat;
      if (per100g > 0) {
        const reduceGrams = (-fatDeficit / per100g) * 100;
        const newGrams = Math.max(5, naivePortions[fatIdx].grams - reduceGrams);
        scaledFoods[fatIdx] = scaleFood(fatFood, newGrams);
      }
    }
  }
  
  // Recalculate totals after fat adjustment
  totals = calculateTotalMacros(scaledFoods);

  // Third pass: Scale to hit calorie target while preserving macro ratios
  const calorieVariance = Math.abs(totals.calories - targetMacros.calories) / targetMacros.calories;
  
  if (calorieVariance > 0.03) {
    const scale = targetMacros.calories / totals.calories;
    
    scaledFoods = naivePortions.map((portion, idx) => {
      const currentGrams = scaledFoods[idx].scaledAmount;
      let adjustedScale = scale;
      
      // Fat sources should scale less aggressively to maintain fat target
      if (portion.role === 'fat_source') {
        adjustedScale = scale < 1 ? Math.max(0.7, scale) : Math.min(1.3, scale);
      }
      
      let newGrams = currentGrams * adjustedScale;
      
      // Apply limits from constants
      const limit = PORTION_LIMITS[portion.role] || PORTION_LIMITS.default;
      newGrams = Math.max(limit.min, Math.min(limit.max, newGrams));
      
      return scaleFood(portion.food, newGrams);
    });
    
    totals = calculateTotalMacros(scaledFoods);
  }
  
  // Fourth pass: Constraint-based macro balancing
  // Uses ACCURACY_THRESHOLDS for tighter control
  
  // If protein is significantly over threshold, reduce protein source
  let proteinVar = (totals.protein - targetMacros.protein) / targetMacros.protein;
  if (proteinVar > ACCURACY_THRESHOLDS.protein) {
    const proteinIdx = naivePortions.findIndex(p => p.role === 'primary_protein');
    if (proteinIdx >= 0) {
      const proteinFood = naivePortions[proteinIdx].food;
      const per100g = proteinFood.nutrients.protein;
      if (per100g > 0) {
        const excess = totals.protein - targetMacros.protein;
        const gramsToRemove = (excess / per100g) * 100 * 0.9; // Remove 90% of excess for tighter control
        let newGrams = scaledFoods[proteinIdx].scaledAmount - gramsToRemove;
        const limit = PORTION_LIMITS.primary_protein;
        newGrams = Math.max(limit.min, Math.min(limit.max, newGrams));
        scaledFoods[proteinIdx] = scaleFood(proteinFood, newGrams);
        totals = calculateTotalMacros(scaledFoods);
      }
    }
  }
  
  // If calories dropped below target after protein reduction, add more carbs
  // But respect the carb limit to avoid unreasonable portions
  const calorieDeficit = targetMacros.calories - totals.calories;
  if (calorieDeficit > 20) {  // More sensitive threshold
    const carbIdx = naivePortions.findIndex(p => p.role === 'primary_carb');
    if (carbIdx >= 0) {
      const carbFood = naivePortions[carbIdx].food;
      const calsper100g = carbFood.nutrients.calories;
      if (calsper100g > 0) {
        const gramsToAdd = (calorieDeficit / calsper100g) * 100 * 0.85;
        let newGrams = scaledFoods[carbIdx].scaledAmount + gramsToAdd;
        const limit = PORTION_LIMITS.primary_carb;
        newGrams = Math.max(limit.min, Math.min(limit.max, newGrams));
        scaledFoods[carbIdx] = scaleFood(carbFood, newGrams);
        totals = calculateTotalMacros(scaledFoods);
      }
    }
  }
  
  // If fat is under threshold, add more fat source
  const fatVar = (totals.fat - targetMacros.fat) / targetMacros.fat;
  if (fatVar < -ACCURACY_THRESHOLDS.fat) {
    const fatIdx = naivePortions.findIndex(p => p.role === 'fat_source');
    if (fatIdx >= 0) {
      const fatFood = naivePortions[fatIdx].food;
      const per100g = fatFood.nutrients.fat;
      if (per100g > 0) {
        const deficit = targetMacros.fat - totals.fat;
        const gramsToAdd = (deficit / per100g) * 100 * 0.9;
        let newGrams = scaledFoods[fatIdx].scaledAmount + gramsToAdd;
        const limit = PORTION_LIMITS.fat_source;
        newGrams = Math.max(limit.min, Math.min(limit.max, newGrams));
        scaledFoods[fatIdx] = scaleFood(fatFood, newGrams);
      }
    }
  }
  
  // Fifth pass: Final precision tuning for calories within ±5%
  // If still off target, make micro-adjustments to the primary carb
  totals = calculateTotalMacros(scaledFoods);
  const finalCalorieVar = Math.abs(totals.calories - targetMacros.calories) / targetMacros.calories;
  if (finalCalorieVar > ACCURACY_THRESHOLDS.calories) {
    const carbIdx = naivePortions.findIndex(p => p.role === 'primary_carb');
    if (carbIdx >= 0) {
      const carbFood = naivePortions[carbIdx].food;
      const calsper100g = carbFood.nutrients.calories;
      if (calsper100g > 0) {
        const diff = targetMacros.calories - totals.calories;
        const gramsAdjust = (diff / calsper100g) * 100;
        let newGrams = scaledFoods[carbIdx].scaledAmount + gramsAdjust;
        const limit = PORTION_LIMITS.primary_carb;
        newGrams = Math.max(limit.min, Math.min(limit.max, newGrams));
        scaledFoods[carbIdx] = scaleFood(carbFood, newGrams);
      }
    }
  }

  return scaledFoods;
}

/**
 * Calculate total macros from scaled foods
 */
function calculateTotalMacros(foods: ScaledFood[]): FoodNutrients {
  const totals = foods.reduce(
    (total, food) => ({
      calories: total.calories + food.scaledNutrients.calories,
      protein: total.protein + food.scaledNutrients.protein,
      carbs: total.carbs + food.scaledNutrients.carbs,
      fat: total.fat + food.scaledNutrients.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  // Round all values to whole numbers for display
  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
  };
}

/**
 * Fine-tune portions to get closer to targets using constraint-based optimization
 * IMPORTANT: Uses ACCURACY_THRESHOLDS for precision control
 */
function refineMacros(
  foods: ScaledFood[],
  target: FoodNutrients,
  current: FoodNutrients,
  foodItems?: { food: FoodItem; role: string }[]
): ScaledFood[] {
  // Calculate variance percentages
  const calorieVariance = Math.abs(current.calories - target.calories) / target.calories;
  const proteinVariance = Math.abs(current.protein - target.protein) / target.protein;
  const carbsVariance = Math.abs(current.carbs - target.carbs) / target.carbs;
  const fatVariance = Math.abs(current.fat - target.fat) / (target.fat || 1);

  // If already within thresholds, don't adjust
  if (
    calorieVariance < ACCURACY_THRESHOLDS.calories &&
    proteinVariance < ACCURACY_THRESHOLDS.protein &&
    carbsVariance < ACCURACY_THRESHOLDS.carbs &&
    fatVariance < ACCURACY_THRESHOLDS.fat
  ) {
    return foods;
  }

  // If we're significantly OVER on calories, scale down proportionally
  if (current.calories > target.calories * (1 + ACCURACY_THRESHOLDS.calories)) {
    const scaleFactor = target.calories / current.calories;
    return foods.map((food, idx) => {
      if (foodItems && foodItems[idx]) {
        const newGrams = Math.max(PORTION_LIMITS.default.min, food.scaledAmount * scaleFactor);
        return scaleFood(foodItems[idx].food, newGrams);
      }
      return food;
    });
  }

  const refined = [...foods];
  
  // If protein is significantly under and we have room in calories
  const proteinDeficit = target.protein - current.protein;
  const calorieRoom = target.calories - current.calories;
  
  if (proteinDeficit > 3 && calorieRoom > 30) {
    const proteinIdx = foods.findIndex(f => f.category === 'protein');
    if (proteinIdx >= 0 && foodItems && foodItems[proteinIdx]) {
      const proteinFood = foods[proteinIdx];
      const per100g = proteinFood.nutrients.protein;
      if (per100g > 0) {
        // Only add enough to not exceed calorie target
        const maxAddGrams = (calorieRoom / proteinFood.nutrients.calories) * 100;
        const neededGrams = (proteinDeficit / per100g) * 100;
        const addGrams = Math.min(maxAddGrams * 0.9, neededGrams); // Use 90% of available room for precision
        let newGrams = proteinFood.scaledAmount + addGrams;
        const limit = PORTION_LIMITS.primary_protein;
        newGrams = Math.max(limit.min, Math.min(limit.max, newGrams));
        refined[proteinIdx] = scaleFood(foodItems[proteinIdx].food, newGrams);
      }
    }
  }

  return refined;
}

/**
 * Check portions for warnings about unusual amounts
 */
export function checkPortionWarnings(foods: ScaledFood[]): string[] {
  const warnings: string[] = [];
  
  for (const food of foods) {
    // Check for excessive protein portions
    if (food.category === 'protein' && food.scaledAmount > PORTION_LIMITS.primary_protein.max) {
      warnings.push(PORTION_WARNINGS.protein_high);
    }
    
    // Check for excessive carb portions  
    if ((food.category === 'grain' || food.category === 'carb') && 
        food.scaledAmount > PORTION_LIMITS.primary_carb.max) {
      warnings.push(PORTION_WARNINGS.carbs_high);
    }
  }
  
  // Check total fat
  const totalFat = foods.reduce((sum, f) => sum + f.scaledNutrients.fat, 0);
  if (totalFat < 5) {
    warnings.push(PORTION_WARNINGS.fat_low);
  }
  
  // Check vegetable content
  const hasVegetables = foods.some(f => f.category === 'vegetable');
  if (!hasVegetables) {
    warnings.push(PORTION_WARNINGS.vegetable_low);
  }
  
  return [...new Set(warnings)]; // Remove duplicates
}

/**
 * Convert to the Meal type used by the app
 */
function convertToMeal(
  concept: MealConcept,
  scaledFoods: ScaledFood[],
  totalMacros: FoodNutrients,
  options: GeneratePreciseMealOptions
): Meal {
  const ingredients: Ingredient[] = scaledFoods.map(food => ({
    item: food.description,
    amount: food.displayAmount,
    calories: food.scaledNutrients.calories,
    protein: Math.round(food.scaledNutrients.protein),
    carbs: Math.round(food.scaledNutrients.carbs),
    fat: Math.round(food.scaledNutrients.fat),
    category: food.category === 'grain' ? 'carbs' : 
              food.category === 'dairy' ? 'protein' :
              food.category === 'fruit' ? 'carbs' :
              food.category as Ingredient['category'],
  }));

  // Generate rationale based on timing
  let rationale = `This ${options.slotLabel.toLowerCase()} provides ${Math.round(totalMacros.protein)}g protein to support your ${options.goalType || 'nutrition'} goals.`;
  
  if (options.workoutRelation === 'pre-workout') {
    rationale = `Pre-workout meal with easily digestible carbs for energy and moderate protein. Lower fat ensures faster digestion before training.`;
  } else if (options.workoutRelation === 'post-workout') {
    rationale = `Post-workout meal optimized for recovery with ${Math.round(totalMacros.protein)}g protein and ${Math.round(totalMacros.carbs)}g carbs to replenish glycogen and support muscle repair.`;
  }

  return {
    name: concept.name,
    time: options.timeSlot,
    context: `${options.slotLabel} - ${concept.description}`,
    prepTime: concept.prepTime,
    type: options.slotLabel.toLowerCase().includes('snack') ? 'snack' : 'meal',
    ingredients,
    instructions: concept.instructions,
    totalMacros: {
      calories: Math.round(totalMacros.calories),
      protein: Math.round(totalMacros.protein),
      carbs: Math.round(totalMacros.carbs),
      fat: Math.round(totalMacros.fat),
    },
    targetMacros: options.targetMacros,
    workoutRelation: options.workoutRelation,
    aiRationale: rationale,
    source: 'ai',
    lastModified: new Date().toISOString(),
    isLocked: false,
  };
}

/**
 * Calculate serving size needed for a specific food to hit a target macro
 */
export function calculateServingForTarget(
  food: FoodItem,
  targetMacro: 'calories' | 'protein' | 'carbs' | 'fat',
  targetValue: number
): { grams: number; scaledFood: ScaledFood } {
  const per100g = food.nutrients[targetMacro];
  if (per100g === 0) {
    return { grams: 100, scaledFood: scaleFood(food, 100) };
  }

  const grams = (targetValue / per100g) * 100;
  const clampedGrams = Math.max(10, Math.min(500, grams));

  return {
    grams: Math.round(clampedGrams),
    scaledFood: scaleFood(food, clampedGrams),
  };
}

/**
 * Quick meal from template (no AI, database only)
 * For fast generation of common meals
 */
export function generateQuickMeal(
  template: 'chicken_rice' | 'salmon_potato' | 'eggs_oats' | 'greek_yogurt_berries',
  targetMacros: Macros
): Meal {
  const templates: Record<string, { name: string; foodIds: number[]; instructions: string[] }> = {
    chicken_rice: {
      name: 'Grilled Chicken & Rice',
      foodIds: [171705, 168880, 170379], // chicken, rice, broccoli
      instructions: ['Season chicken with salt and pepper', 'Grill chicken 6-7 min per side', 'Steam rice', 'Steam broccoli'],
    },
    salmon_potato: {
      name: 'Baked Salmon with Sweet Potato',
      foodIds: [168917, 170285, 168462], // salmon, sweet potato, spinach
      instructions: ['Preheat oven to 400°F', 'Bake salmon 12-15 min', 'Bake sweet potato 45 min', 'Sauté spinach'],
    },
    eggs_oats: {
      name: 'Protein Oatmeal with Eggs',
      foodIds: [173424, 168875, 173944], // eggs, oats, banana
      instructions: ['Cook oats with water', 'Scramble eggs', 'Slice banana on top'],
    },
    greek_yogurt_berries: {
      name: 'Greek Yogurt Parfait',
      foodIds: [171706, 171711, 170407], // greek yogurt, blueberries, almonds
      instructions: ['Layer yogurt in bowl', 'Top with berries and almonds'],
    },
  };

  const t = templates[template];
  if (!t) throw new Error(`Unknown template: ${template}`);

  const foods = t.foodIds.map(id => COMMON_FOODS.find(f => f.fdcId === id)!).filter(Boolean);
  const scaled = calculatePortions(foods, {
    calories: targetMacros.calories,
    protein: targetMacros.protein,
    carbs: targetMacros.carbs,
    fat: targetMacros.fat,
  });

  const totalMacros = calculateTotalMacros(scaled);

  return {
    name: t.name,
    time: '12:00 PM',
    context: 'Quick meal from template',
    prepTime: '15 minutes',
    type: 'meal',
    ingredients: scaled.map(f => ({
      item: f.description,
      amount: f.displayAmount,
      calories: f.scaledNutrients.calories,
      protein: Math.round(f.scaledNutrients.protein),
      carbs: Math.round(f.scaledNutrients.carbs),
      fat: Math.round(f.scaledNutrients.fat),
      category: f.category as Ingredient['category'],
    })),
    instructions: t.instructions,
    totalMacros: {
      calories: Math.round(totalMacros.calories),
      protein: Math.round(totalMacros.protein),
      carbs: Math.round(totalMacros.carbs),
      fat: Math.round(totalMacros.fat),
    },
    targetMacros,
    workoutRelation: 'none',
    source: 'ai',
    lastModified: new Date().toISOString(),
  };
}
