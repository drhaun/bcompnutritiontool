import { NextRequest, NextResponse } from 'next/server';
import { aiChatJSON, getActiveProvider } from '@/lib/ai-client';

interface MealSlot {
  id: string;
  type: 'meal' | 'snack';
  time: string;
  name: string;
  location?: string;
  prepMethod?: string;
}

interface DayPlanRequest {
  clientName: string;
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  dietaryRestriction: string;
  allergies: string[];
  preferredProteins: string[];
  preferredCarbs: string[];
  foodsToAvoid: string[];
  dayContext: {
    dayType: string;
    workoutTiming: string;
    workoutType: string | null;
    wakeTime: string;
    sleepTime: string;
    specialNotes: string;
  };
  mealSlots: MealSlot[];
  groceryBudgetCap?: number;
  groceryBudgetPeriod?: 'daily' | 'weekly';
  budgetPreference?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DayPlanRequest = await request.json();
    const {
      clientName,
      targets,
      dietaryRestriction,
      allergies,
      preferredProteins,
      preferredCarbs,
      foodsToAvoid,
      dayContext,
      mealSlots,
      groceryBudgetCap,
      groceryBudgetPeriod,
      budgetPreference,
    } = body;

    if (!getActiveProvider()) {
      return NextResponse.json(
        { message: 'AI provider not configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.' },
        { status: 500 }
      );
    }

    // Calculate macro distribution per meal/snack — must sum to exactly 100%
    const mealCount = mealSlots.filter(s => s.type === 'meal').length;
    const snackCount = mealSlots.filter(s => s.type === 'snack').length;
    const snackPct = snackCount > 0 ? 0.10 : 0;
    const mealPct = mealCount > 0 ? (1.0 - snackCount * snackPct) / mealCount : 0;

    // Compute explicit per-slot targets that sum to the daily total
    const slotTargets = mealSlots.map(slot => {
      const pct = slot.type === 'meal' ? mealPct : snackPct;
      return {
        calories: Math.round(targets.calories * pct),
        protein: Math.round(targets.protein * pct),
        carbs: Math.round(targets.carbs * pct),
        fat: Math.round(targets.fat * pct),
      };
    });

    const prompt = `You are an expert sports nutritionist. Create a complete day's meal plan.

CLIENT: ${clientName || 'Client'}
DAILY TARGETS (MUST HIT EXACTLY): ${targets.calories} cal | ${targets.protein}g protein | ${targets.carbs}g carbs | ${targets.fat}g fat

DIETARY INFO:
- Restriction: ${dietaryRestriction || 'None'}
- Allergies (NEVER USE): ${allergies.join(', ') || 'None'}
- Preferred proteins: ${preferredProteins.join(', ') || 'chicken, fish, eggs'}
- Preferred carbs: ${preferredCarbs.join(', ') || 'rice, oats, potatoes'}
- Foods to avoid: ${foodsToAvoid.join(', ') || 'None'}
${groceryBudgetCap ? `
GROCERY BUDGET: $${groceryBudgetCap} ${groceryBudgetPeriod || 'weekly'}${groceryBudgetPeriod === 'weekly' ? ` (~$${Math.round(groceryBudgetCap / 7)}/day)` : ` (~$${groceryBudgetCap * 7}/week)`} — ${budgetPreference || 'moderate'} style
- Prefer cost-effective ingredients: bulk staples, seasonal produce, affordable proteins (chicken thighs, eggs, beans, canned fish)
- Avoid premium/specialty items unless budget allows` : ''}

DAY CONTEXT:
- Day type: ${dayContext.dayType}
- Wake time: ${dayContext.wakeTime}
- Sleep time: ${dayContext.sleepTime}
${dayContext.dayType === 'workout' ? `- Workout timing: ${dayContext.workoutTiming}
- Workout type: ${dayContext.workoutType}` : ''}
${dayContext.specialNotes ? `- Special notes: ${dayContext.specialNotes}` : ''}

MEAL SCHEDULE WITH PER-SLOT TARGETS:
${mealSlots.map((slot, i) => {
      const ctx: string[] = [];
      if (slot.prepMethod) {
        const labels: Record<string, string> = { cook: 'Cook from scratch', leftovers: 'Leftovers/reheated', packaged: 'Packaged/ready-to-eat', pickup: 'Pickup/takeout', delivery: 'Delivery', skip: 'Skip' };
        ctx.push(labels[slot.prepMethod] || slot.prepMethod);
      }
      if (slot.location) {
        const locs: Record<string, string> = { home: 'at home', office: 'at office', on_the_go: 'on the go', restaurant: 'restaurant', gym: 'at gym' };
        ctx.push(locs[slot.location] || slot.location);
      }
      return `- ${slot.time}: ${slot.name} (${slot.type}) → ${slotTargets[i].calories} cal | ${slotTargets[i].protein}g P | ${slotTargets[i].carbs}g C | ${slotTargets[i].fat}g F${ctx.length > 0 ? ' [' + ctx.join(', ') + ']' : ''}`;
    }).join('\n')}

CRITICAL: The sum of ALL meals MUST equal the daily targets above. Each meal MUST match its per-slot targets closely.

Create a meal for each slot. Each meal should:
1. Have a creative, appetizing name
2. Include 3-5 ingredients with exact gram portions and per-ingredient macros
3. MATCH the per-slot calorie and macro targets shown above (within ±5%)
4. Consider workout timing for pre/post workout meals
5. Match the prep method context: packaged meals should be grab-and-go items, leftovers should reheat well, etc.

Return JSON:
{
  "meals": [
    {
      "slotId": "slot id from input",
      "name": "Creative Meal Name",
      "time": "scheduled time",
      "type": "meal or snack",
      "ingredients": [
        { "item": "Food item", "amount": "portion", "calories": number, "protein": number, "carbs": number, "fat": number }
      ],
      "instructions": ["Step 1", "Step 2"],
      "totalMacros": { "calories": number, "protein": number, "carbs": number, "fat": number },
      "notes": "Brief note about this meal's purpose"
    }
  ],
  "dailyTotals": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "summary": "Brief overview of the day's nutrition strategy"
}`;

    interface AIDayPlanResponse {
      meals?: {
        slotId?: string;
        name?: string;
        notes?: string;
        description?: string;
        totalMacros?: { calories?: number; protein?: number; carbs?: number; fat?: number };
        ingredients?: { item?: string; amount?: string }[];
        instructions?: string[];
      }[];
      dailyTotals?: { calories?: number; protein?: number; carbs?: number; fat?: number };
      summary?: string;
    }
    const aiResponse = await aiChatJSON<AIDayPlanResponse>({
      system: 'You are an expert nutritionist. Return only valid JSON.',
      userMessage: prompt,
      temperature: 0.7,
      maxTokens: 4000,
      jsonMode: true,
      tier: 'fast',
    });
    
    // Transform to expected structure
    const rawMeals = mealSlots.map((slot, index) => {
      const aiMeal = aiResponse.meals?.find((m: { slotId?: string }) => m.slotId === slot.id) 
        || aiResponse.meals?.[index];
      
      return {
        slot,
        meal: {
          name: aiMeal?.name || `${slot.name}`,
          description: aiMeal?.notes || aiMeal?.description || 'A balanced meal for your goals',
          calories: Math.round(aiMeal?.totalMacros?.calories || slotTargets[index].calories),
          protein: Math.round(aiMeal?.totalMacros?.protein || slotTargets[index].protein),
          carbs: Math.round(aiMeal?.totalMacros?.carbs || slotTargets[index].carbs),
          fat: Math.round(aiMeal?.totalMacros?.fat || slotTargets[index].fat),
          ingredients: aiMeal?.ingredients?.map((i: { item?: string; amount?: string; calories?: number; protein?: number; carbs?: number; fat?: number }) => 
            typeof i === 'string' ? i : `${i.amount || ''} ${i.item || ''}`.trim()
          ) || ['Protein source', 'Carb source', 'Vegetables'],
          instructions: aiMeal?.instructions || ['Prepare ingredients', 'Cook according to preference', 'Serve and enjoy'],
          prepTime: slot.prepMethod === 'cook' ? 30 : slot.prepMethod === 'leftovers' ? 5 : slot.prepMethod === 'packaged' ? 0 : slot.prepMethod === 'pickup' || slot.prepMethod === 'delivery' ? 5 : 20,
        },
      };
    });

    // Post-generation reconciliation: scale all meals proportionally so the
    // day total matches the daily targets exactly.
    const rawSum = {
      calories: rawMeals.reduce((s, m) => s + m.meal.calories, 0),
      protein: rawMeals.reduce((s, m) => s + m.meal.protein, 0),
      carbs: rawMeals.reduce((s, m) => s + m.meal.carbs, 0),
      fat: rawMeals.reduce((s, m) => s + m.meal.fat, 0),
    };

    const calDrift = rawSum.calories > 0 ? Math.abs(rawSum.calories - targets.calories) / targets.calories : 0;
    if (calDrift > 0.03 && rawSum.calories > 0) {
      const cScale = targets.calories / rawSum.calories;
      const pScale = rawSum.protein > 0 ? targets.protein / rawSum.protein : 1;
      const carbScale = rawSum.carbs > 0 ? targets.carbs / rawSum.carbs : 1;
      const fScale = rawSum.fat > 0 ? targets.fat / rawSum.fat : 1;
      for (const m of rawMeals) {
        m.meal.calories = Math.round(m.meal.calories * cScale);
        m.meal.protein = Math.round(m.meal.protein * pScale);
        m.meal.carbs = Math.round(m.meal.carbs * carbScale);
        m.meal.fat = Math.round(m.meal.fat * fScale);
      }
    }

    const dayPlan = {
      meals: rawMeals,
      totalCalories: rawMeals.reduce((s, m) => s + m.meal.calories, 0),
      totalProtein: rawMeals.reduce((s, m) => s + m.meal.protein, 0),
      totalCarbs: rawMeals.reduce((s, m) => s + m.meal.carbs, 0),
      totalFat: rawMeals.reduce((s, m) => s + m.meal.fat, 0),
      summary: aiResponse.summary || '',
    };

    return NextResponse.json({ dayPlan });
  } catch (error) {
    console.error('Day plan generation error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate day plan' },
      { status: 500 }
    );
  }
}
