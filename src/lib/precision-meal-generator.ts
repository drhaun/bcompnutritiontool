/**
 * Precision Meal Generator
 * Combines AI meal concepts with database-accurate nutrition calculations
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

/**
 * Get AI meal concept (what foods to use, not the macros)
 * Creates delicious, varied meals with proper culinary consideration
 */
async function getMealConcept(
  openai: OpenAI,
  options: GeneratePreciseMealOptions,
  targetMacros: FoodNutrients
): Promise<MealConcept> {
  const { dietPreferences, slotLabel, workoutRelation, previousMeals, isWorkoutDay, day, timeSlot } = options;

  const restrictions = dietPreferences.dietaryRestrictions || [];
  const allergies = dietPreferences.allergies || [];
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
    if (m.toLowerCase().includes('asian') || m.toLowerCase().includes('stir') || m.toLowerCase().includes('teriyaki')) return 'asian';
    if (m.toLowerCase().includes('mexican') || m.toLowerCase().includes('taco') || m.toLowerCase().includes('burrito')) return 'mexican';
    if (m.toLowerCase().includes('mediterranean') || m.toLowerCase().includes('greek')) return 'mediterranean';
    if (m.toLowerCase().includes('italian') || m.toLowerCase().includes('pasta')) return 'italian';
    return 'american';
  });
  
  const cuisinesToAvoid = recentMealTypes.slice(-3);
  const suggestedCuisines = cuisines.length > 0 
    ? cuisines.filter(c => !cuisinesToAvoid.includes(c.toLowerCase())).slice(0, 3)
    : ['Mediterranean', 'Asian', 'Mexican', 'American', 'Italian'].filter(c => !cuisinesToAvoid.includes(c.toLowerCase())).slice(0, 3);

  const prompt = `
You are an expert culinary nutritionist and chef. Design a DELICIOUS, restaurant-quality meal that hits specific macros.

═══════════════════════════════════════════════════════════
MEAL CONTEXT - CRITICAL FOR VARIETY
═══════════════════════════════════════════════════════════
- Day: ${day}
- Slot: ${slotLabel} at ${timeSlot || 'midday'}
- Time Context: ${isEarlyMeal ? 'EARLY MORNING (breakfast-style: eggs, oatmeal, smoothies, toast)' : isMidDayMeal ? 'MIDDAY (lunch-style: salads, bowls, sandwiches, wraps)' : isEveningMeal ? 'EVENING (dinner-style: more elaborate, hearty meals)' : isAfternoonMeal ? 'LATE AFTERNOON (lighter meal or substantial snack)' : 'Regular meal'}
- Workout Timing: ${isWorkoutDay ? (workoutRelation === 'pre-workout' ? '⚡ PRE-WORKOUT - needs quick-digesting carbs, moderate protein, lower fat' : workoutRelation === 'post-workout' ? '💪 POST-WORKOUT - recovery focused: prioritize protein + carbs for glycogen replenishment' : 'Workout day but not around training') : 'Rest day - no workout timing considerations'}
${isSnack ? '- This is a SNACK: lighter portion, portable-friendly, quick to prepare' : ''}

═══════════════════════════════════════════════════════════
VARIETY REQUIREMENTS - MUST CREATE SOMETHING DIFFERENT!
═══════════════════════════════════════════════════════════
Recent meals to AVOID repeating (must be SIGNIFICANTLY different):
${previousMeals.slice(-8).map((m, i) => `  ${i + 1}. ${m}`).join('\n') || '  None yet'}

${previousMeals.length > 0 ? `⚠️ DO NOT create another "${previousMeals[previousMeals.length - 1]}" or similar!` : ''}

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
DIETARY CONSTRAINTS
═══════════════════════════════════════════════════════════
- Restrictions: ${restrictions.join(', ') || 'None'}
- ALLERGIES (NEVER USE): ${allergies.join(', ') || 'None'}
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
        content: 'You are an expert chef-nutritionist. Create delicious, varied meals that hit macro targets. Never repeat similar meals. Make food that people WANT to eat. Include proper seasonings and cooking techniques.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.85, // Higher temperature for more variety
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
    
    // Apply reasonable limits
    const limits: Record<string, { min: number; max: number }> = {
      primary_protein: { min: 100, max: 220 },
      primary_carb: { min: 100, max: 300 },
      fat_source: { min: 10, max: 40 },
      vegetable: { min: 75, max: 200 },
      flavor: { min: 5, max: 20 },
    };
    const limit = limits[role] || { min: 50, max: 150 };
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
      
      // Apply limits
      const limits: Record<string, { min: number; max: number }> = {
        primary_protein: { min: 80, max: 220 },
        primary_carb: { min: 80, max: 350 },
        fat_source: { min: 8, max: 50 },
        vegetable: { min: 50, max: 200 },
        flavor: { min: 3, max: 30 },
      };
      const limit = limits[portion.role] || { min: 30, max: 200 };
      newGrams = Math.max(limit.min, Math.min(limit.max, newGrams));
      
      return scaleFood(portion.food, newGrams);
    });
    
    totals = calculateTotalMacros(scaledFoods);
  }
  
  // Fourth pass: Balance macros - reduce excess protein, adjust carbs
  // This is critical because scaling for calories often overshoots protein
  
  // If protein is significantly over, reduce protein source
  let proteinVar = (totals.protein - targetMacros.protein) / targetMacros.protein;
  if (proteinVar > 0.15) {
    const proteinIdx = naivePortions.findIndex(p => p.role === 'primary_protein');
    if (proteinIdx >= 0) {
      const proteinFood = naivePortions[proteinIdx].food;
      const per100g = proteinFood.nutrients.protein;
      if (per100g > 0) {
        const excess = totals.protein - targetMacros.protein;
        const gramsToRemove = (excess / per100g) * 100 * 0.8; // Remove 80% of excess
        let newGrams = scaledFoods[proteinIdx].scaledAmount - gramsToRemove;
        newGrams = Math.max(80, Math.min(220, newGrams));
        scaledFoods[proteinIdx] = scaleFood(proteinFood, newGrams);
        totals = calculateTotalMacros(scaledFoods);
      }
    }
  }
  
  // If calories dropped below target after protein reduction, add more carbs
  const calorieDeficit = targetMacros.calories - totals.calories;
  if (calorieDeficit > 30) {
    const carbIdx = naivePortions.findIndex(p => p.role === 'primary_carb');
    if (carbIdx >= 0) {
      const carbFood = naivePortions[carbIdx].food;
      const calsper100g = carbFood.nutrients.calories;
      if (calsper100g > 0) {
        const gramsToAdd = (calorieDeficit / calsper100g) * 100 * 0.7;
        let newGrams = scaledFoods[carbIdx].scaledAmount + gramsToAdd;
        newGrams = Math.max(80, Math.min(400, newGrams));
        scaledFoods[carbIdx] = scaleFood(carbFood, newGrams);
        totals = calculateTotalMacros(scaledFoods);
      }
    }
  }
  
  // If fat is significantly under, add more fat source
  const fatVar = (totals.fat - targetMacros.fat) / targetMacros.fat;
  if (fatVar < -0.2) {
    const fatIdx = naivePortions.findIndex(p => p.role === 'fat_source');
    if (fatIdx >= 0) {
      const fatFood = naivePortions[fatIdx].food;
      const per100g = fatFood.nutrients.fat;
      if (per100g > 0) {
        const deficit = targetMacros.fat - totals.fat;
        const gramsToAdd = (deficit / per100g) * 100 * 0.8;
        let newGrams = scaledFoods[fatIdx].scaledAmount + gramsToAdd;
        newGrams = Math.max(8, Math.min(50, newGrams));
        scaledFoods[fatIdx] = scaleFood(fatFood, newGrams);
      }
    }
  }

  return scaledFoods;
}

/**
 * Calculate total macros from scaled foods
 */
function calculateTotalMacros(foods: ScaledFood[]): FoodNutrients {
  return foods.reduce(
    (total, food) => ({
      calories: total.calories + food.scaledNutrients.calories,
      protein: total.protein + food.scaledNutrients.protein,
      carbs: total.carbs + food.scaledNutrients.carbs,
      fat: total.fat + food.scaledNutrients.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Fine-tune portions to get closer to targets
 * IMPORTANT: This function should only make minor adjustments and NEVER exceed calorie target
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

  // If already within 5% on all macros, don't adjust
  if (calorieVariance < 0.05 && proteinVariance < 0.1 && carbsVariance < 0.1) {
    return foods;
  }

  // If we're OVER on calories, don't try to refine further - scaling should have handled this
  if (current.calories > target.calories * 1.02) {
    return foods;
  }

  // Only make small adjustments if we're UNDER target and need more of a specific macro
  // This prevents the common case of adding too much and going over
  const refined = [...foods];
  
  // If protein is significantly under and we have room in calories
  const proteinDeficit = target.protein - current.protein;
  const calorieRoom = target.calories - current.calories;
  
  if (proteinDeficit > 5 && calorieRoom > 50) {
    const proteinIdx = foods.findIndex(f => f.category === 'protein');
    if (proteinIdx >= 0 && foodItems && foodItems[proteinIdx]) {
      const proteinFood = foods[proteinIdx];
      const per100g = proteinFood.nutrients.protein;
      if (per100g > 0) {
        // Only add enough to not exceed calorie target
        const maxAddGrams = (calorieRoom / proteinFood.nutrients.calories) * 100;
        const neededGrams = (proteinDeficit / per100g) * 100;
        const addGrams = Math.min(maxAddGrams * 0.8, neededGrams); // Use 80% of available room
        const newGrams = proteinFood.scaledAmount + addGrams;
        refined[proteinIdx] = scaleFood(foodItems[proteinIdx].food, newGrams);
      }
    }
  }

  return refined;
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
