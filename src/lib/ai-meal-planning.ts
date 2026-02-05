import OpenAI from 'openai';
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
  
  return `
DIETARY RESTRICTIONS & SAFETY:
- Restrictions: ${restrictions.length > 0 ? restrictions.join(', ') : 'None'}
- ALLERGIES (STRICTLY AVOID): ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Disliked Foods: ${(dietPreferences.dislikedFoods || []).slice(0, 8).join(', ')}

FOOD PREFERENCES:
- Proteins: ${(dietPreferences.preferredProteins || []).slice(0, 8).join(', ')}
- Carbs: ${(dietPreferences.preferredCarbs || []).slice(0, 8).join(', ')}
- Fats: ${(dietPreferences.preferredFats || []).slice(0, 8).join(', ')}
- Vegetables: ${(dietPreferences.preferredVegetables || []).slice(0, 8).join(', ')}
- Cuisines: ${(dietPreferences.cuisinePreferences || []).slice(0, 5).join(', ')}

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
 * Generate a single day's meal plan
 */
async function generateDayMealPlan(
  openai: OpenAI,
  day: DayOfWeek,
  dayTargets: DayNutritionTargets,
  userContext: string,
  dietaryContext: string,
  scheduleContext: string,
  previousMeals: string[] = []
): Promise<DayMealPlan> {
  // Extract used proteins for variety tracking
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

${scheduleContext}

═══════════════════════════════════════════════════════════
🎯 VARIETY REQUIREMENTS (STRICTLY ENFORCE)
═══════════════════════════════════════════════════════════
${previousMeals.length > 0 ? `MEALS TO AVOID REPEATING: ${previousMeals.slice(-14).join(', ')}` : 'First day - establish variety!'}
${overusedProteins.length > 0 ? `⚠️ OVERUSED PROTEINS - USE DIFFERENT: ${overusedProteins.join(', ')}` : ''}

CRITICAL REQUIREMENTS:
1. Create 3 meals and 2 snacks - each should be DELICIOUS and UNIQUE
2. Every meal needs proper seasoning - specify herbs, spices, aromatics
3. Each meal/snack must have EXACT portion sizes in grams
4. Include macros per ingredient (calories, protein, carbs, fat)
5. Total daily macros MUST be within ±5% of targets
6. Make these meals something the client will LOOK FORWARD to eating
7. Avoid repetitive "chicken and rice" meals - add creativity and flavor

Return a JSON object with this EXACT structure:
{
  "day": "${day}",
  "meals": [
    {
      "name": "Meal name",
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

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: CHEF_SYSTEM_PROMPT + '\n\nReturn ONLY valid JSON. Ensure all macro calculations are accurate.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5, // Balanced for consistency + creativity
    presence_penalty: 0.2, // Discourage repetition
    frequency_penalty: 0.1,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  const dayPlan = JSON.parse(content) as DayMealPlan;
  
  // Validate macro accuracy
  const validation = validateMacroAccuracy(
    dayPlan.dailyTotals,
    dayPlan.dailyTargets,
    0.05
  );
  
  dayPlan.accuracyValidated = validation.isValid;
  
  return dayPlan;
}

/**
 * Generate a complete weekly meal plan
 */
export async function generateWeeklyMealPlan(
  apiKey: string,
  userProfile: Partial<UserProfile>,
  bodyCompGoals: Partial<BodyCompGoals>,
  dietPreferences: Partial<DietPreferences>,
  weeklySchedule: Partial<WeeklySchedule>,
  nutritionTargets: DayNutritionTargets[],
  daysToGenerate: DayOfWeek[] = DAYS_OF_WEEK,
  onProgress?: (day: DayOfWeek, progress: number) => void
): Promise<WeeklyMealPlan> {
  const openai = new OpenAI({ 
    apiKey,
    dangerouslyAllowBrowser: true 
  });
  
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
      openai,
      day,
      dayTargets,
      userContext,
      dietaryContext,
      scheduleContext,
      allMealNames.slice(-10) // Last 10 meal names for variety
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
  apiKey: string,
  mealIndex: number,
  dayPlan: DayMealPlan,
  userProfile: Partial<UserProfile>,
  dietPreferences: Partial<DietPreferences>,
  avoidIngredients: string[] = []
): Promise<Meal> {
  const openai = new OpenAI({ 
    apiKey,
    dangerouslyAllowBrowser: true 
  });
  
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
  "name": "New meal name",
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

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a precise nutritionist. Return ONLY valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  return JSON.parse(content) as Meal;
}

/**
 * Consolidate grocery list from weekly meal plan
 */
export function consolidateGroceryList(mealPlan: WeeklyMealPlan): Record<string, { name: string; totalAmount: string; category: string; meals: string[] }[]> {
  const groceryMap: Map<string, { 
    amounts: { value: number; unit: string }[]; 
    category: string; 
    meals: string[];
  }> = new Map();
  
  // Process all days and meals
  for (const [day, dayPlan] of Object.entries(mealPlan)) {
    // Skip if dayPlan doesn't have meals
    if (!dayPlan?.meals) continue;
    
    for (const meal of dayPlan.meals) {
      // Skip null/undefined meals (unfilled slots)
      if (!meal?.ingredients) continue;
      
      for (const ingredient of meal.ingredients) {
        // Skip if ingredient is malformed
        if (!ingredient?.item) continue;
        
        const key = ingredient.item.toLowerCase().trim();
        const existing = groceryMap.get(key);
        
        // Parse amount - handle various formats
        const amountStr = ingredient.amount || '1 serving';
        const amountMatch = amountStr.match(/^([\d.\/]+)\s*(.*)$/);
        let value = 1;
        let unit = 'serving';
        
        if (amountMatch) {
          // Handle fractions like 1/2
          if (amountMatch[1].includes('/')) {
            const [num, denom] = amountMatch[1].split('/');
            value = parseFloat(num) / parseFloat(denom);
          } else {
            value = parseFloat(amountMatch[1]) || 1;
          }
          unit = amountMatch[2]?.trim() || 'serving';
        }
        
        if (existing) {
          // Try to combine with same unit
          const sameUnit = existing.amounts.find(a => a.unit === unit);
          if (sameUnit) {
            sameUnit.value += value;
          } else {
            existing.amounts.push({ value, unit });
          }
          if (!existing.meals.includes(`${day} - ${meal.name}`)) {
            existing.meals.push(`${day} - ${meal.name}`);
          }
        } else {
          groceryMap.set(key, {
            amounts: [{ value, unit }],
            category: ingredient.category || 'other',
            meals: [`${day} - ${meal.name}`],
          });
        }
      }
    }
  }
  
  // Convert to categorized list
  const result: Record<string, { name: string; totalAmount: string; category: string; meals: string[] }[]> = {
    protein: [],
    carbs: [],
    fats: [],
    vegetables: [],
    seasonings: [],
    other: [],
  };
  
  for (const [name, data] of groceryMap) {
    // Round amounts to practical values
    const totalAmount = data.amounts
      .map(a => {
        // Round to practical amounts based on unit
        let roundedValue = a.value;
        const unit = a.unit.toLowerCase();
        
        if (unit.includes('oz') || unit.includes('lb') || unit.includes('g')) {
          // Round to nearest 0.5 for weights
          roundedValue = Math.round(a.value * 2) / 2;
        } else if (unit.includes('cup') || unit.includes('tbsp') || unit.includes('tsp')) {
          // Round to nearest 0.25 for volume measurements
          roundedValue = Math.round(a.value * 4) / 4;
        } else if (unit.includes('slice') || unit.includes('serving') || unit.includes('piece')) {
          // Round up to whole numbers for countable items
          roundedValue = Math.ceil(a.value);
        } else if (unit.includes('dash') || unit.includes('pinch')) {
          // Round up dashes and pinches
          roundedValue = Math.ceil(a.value);
        } else {
          // Default: round to 1 decimal
          roundedValue = Math.round(a.value * 10) / 10;
        }
        
        // Format the value - no decimals for whole numbers
        const formattedValue = roundedValue % 1 === 0 
          ? roundedValue.toString() 
          : roundedValue.toFixed(roundedValue % 0.25 === 0 ? 2 : 1).replace(/\.?0+$/, '');
        
        return `${formattedValue} ${a.unit}`;
      })
      .join(' + ');
    
    const category = data.category in result ? data.category : 'other';
    
    result[category].push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      totalAmount,
      category,
      meals: data.meals,
    });
  }
  
  // Sort each category alphabetically
  for (const category of Object.keys(result)) {
    result[category].sort((a, b) => a.name.localeCompare(b.name));
  }
  
  return result;
}
