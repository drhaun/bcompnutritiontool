import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CurrentPattern {
  mealGroup: string;
  commonFoods: { name: string; serving: string; frequency: number }[];
  avgMacros: { calories: number; protein: number; carbs: number; fat: number };
  daysSampled: number;
}

interface SlotInfo {
  label: string;
  type: 'meal' | 'snack';
  targetMacros: { calories: number; protein: number; carbs: number; fat: number };
  timeSlot?: string;
  workoutRelation?: 'pre-workout' | 'post-workout' | 'none';
}

interface ClientContext {
  name?: string;
  goalType?: string;
  phaseName?: string;
  dietaryRestrictions?: string[];
  preferredProteins?: string[];
  foodsToAvoid?: string[];
  foodsToEmphasize?: string[];
  allergies?: string[];
}

interface AdaptiveRequest {
  mode: 'tips' | 'improve';
  slot: SlotInfo;
  currentPattern: CurrentPattern;
  dailyTargets: { calories: number; protein: number; carbs: number; fat: number };
  clientContext: ClientContext;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: AdaptiveRequest = await request.json();
    const { mode, slot, currentPattern, dailyTargets, clientContext } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Format current eating pattern
    const foodsList = currentPattern.commonFoods
      .slice(0, 8)
      .map(f => `- ${f.name} (${f.serving}) — eaten ${f.frequency} of ${currentPattern.daysSampled} days`)
      .join('\n');

    const macroGap = {
      calories: Math.round(slot.targetMacros.calories - currentPattern.avgMacros.calories),
      protein: Math.round(slot.targetMacros.protein - currentPattern.avgMacros.protein),
      carbs: Math.round(slot.targetMacros.carbs - currentPattern.avgMacros.carbs),
      fat: Math.round(slot.targetMacros.fat - currentPattern.avgMacros.fat),
    };

    const goalLabel = formatGoal(clientContext.goalType);
    const restrictionsStr = clientContext.dietaryRestrictions?.length
      ? clientContext.dietaryRestrictions.join(', ')
      : 'None';
    const avoidStr = clientContext.foodsToAvoid?.length
      ? clientContext.foodsToAvoid.join(', ')
      : 'None';
    const allergiesStr = clientContext.allergies?.length
      ? clientContext.allergies.join(', ')
      : 'None';

    // ─── TIPS MODE ───────────────────────────────────────────────────────────

    if (mode === 'tips') {
      const tipsPrompt = `You are an expert sports nutritionist coaching a client toward their goals.

CLIENT: ${clientContext.name || 'Client'}
GOAL: ${goalLabel}${clientContext.phaseName ? ` (Phase: ${clientContext.phaseName})` : ''}
DIETARY RESTRICTIONS: ${restrictionsStr}
ALLERGIES (NEVER suggest): ${allergiesStr}
FOODS TO AVOID: ${avoidStr}

CURRENT ${slot.label.toUpperCase()} PATTERN (based on last ${currentPattern.daysSampled} days of food logging):
${foodsList}

Current avg macros for this meal: ${currentPattern.avgMacros.calories} cal | ${currentPattern.avgMacros.protein}g P | ${currentPattern.avgMacros.carbs}g C | ${currentPattern.avgMacros.fat}g F

TARGET macros for this meal: ${slot.targetMacros.calories} cal | ${slot.targetMacros.protein}g P | ${slot.targetMacros.carbs}g C | ${slot.targetMacros.fat}g F

DAILY TARGETS: ${dailyTargets.calories} cal | ${dailyTargets.protein}g P | ${dailyTargets.carbs}g C | ${dailyTargets.fat}g F

MACRO GAP (target minus current):
- Calories: ${macroGap.calories > 0 ? '+' : ''}${macroGap.calories} cal
- Protein: ${macroGap.protein > 0 ? '+' : ''}${macroGap.protein}g
- Carbs: ${macroGap.carbs > 0 ? '+' : ''}${macroGap.carbs}g
- Fat: ${macroGap.fat > 0 ? '+' : ''}${macroGap.fat}g

Analyze what this client currently eats for ${slot.label} and provide 3-4 specific, actionable coaching tips to move closer to their targets while keeping their familiar foods. Be very specific with portions and food items (e.g., "Add 1 scoop whey protein to your oatmeal to add ~25g protein" not "increase protein intake"). Consider:
1. What's already working well in their current pattern
2. Simple portion adjustments that make a big macro impact
3. Easy food swaps or additions that fit their existing routine
4. How changes align with their ${goalLabel} goal

Return JSON:
{
  "summary": "1-2 sentence overview of what's working and the main gap",
  "tips": [
    "Specific actionable tip 1",
    "Specific actionable tip 2",
    "Specific actionable tip 3",
    "Specific actionable tip 4 (optional)"
  ],
  "macroGap": {
    "calories": ${macroGap.calories},
    "protein": ${macroGap.protein},
    "carbs": ${macroGap.carbs},
    "fat": ${macroGap.fat}
  }
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert nutritionist. Return only valid JSON.' },
          { role: 'user', content: tipsPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI tips response');
      }

      const tipsResult = JSON.parse(jsonMatch[0]);

      return NextResponse.json({
        success: true,
        mode: 'tips',
        tips: tipsResult.tips || [],
        summary: tipsResult.summary || '',
        macroGap,
      });
    }

    // ─── IMPROVE MODE ────────────────────────────────────────────────────────

    const improvePrompt = `You are an expert sports nutritionist. A client has been eating a certain way and you need to design an IMPROVED version of their ${slot.label.toLowerCase()} that keeps 50-70% of their familiar foods but adjusts portions and swaps/adds items to hit their macro targets.

CLIENT: ${clientContext.name || 'Client'}
GOAL: ${goalLabel}${clientContext.phaseName ? ` (Phase: ${clientContext.phaseName})` : ''}
DIETARY RESTRICTIONS: ${restrictionsStr}
ALLERGIES (NEVER USE): ${allergiesStr}
FOODS TO AVOID: ${avoidStr}
${clientContext.preferredProteins?.length ? `PREFERRED PROTEINS: ${clientContext.preferredProteins.join(', ')}` : ''}
${clientContext.foodsToEmphasize?.length ? `FOODS TO EMPHASIZE: ${clientContext.foodsToEmphasize.join(', ')}` : ''}

CURRENT ${slot.label.toUpperCase()} PATTERN (last ${currentPattern.daysSampled} days):
${foodsList}

Current avg macros: ${currentPattern.avgMacros.calories} cal | ${currentPattern.avgMacros.protein}g P | ${currentPattern.avgMacros.carbs}g C | ${currentPattern.avgMacros.fat}g F
TARGET macros: ${slot.targetMacros.calories} cal | ${slot.targetMacros.protein}g P | ${slot.targetMacros.carbs}g C | ${slot.targetMacros.fat}g F
${slot.workoutRelation && slot.workoutRelation !== 'none' ? `TIMING: This is a ${slot.workoutRelation} meal` : ''}

Design an improved meal that:
1. Keeps familiar foods the client already enjoys (at least 50% of items)
2. Adjusts portions to better hit targets
3. Swaps or adds 1-3 items to close the macro gap
4. Remains practical and realistic for this client
5. Includes a full recipe with exact portions

Return JSON:
{
  "meal": {
    "name": "Creative appetizing meal name",
    "prepTime": "estimated minutes as string (e.g. '15 minutes')",
    "ingredients": [
      { "item": "Food item", "amount": "exact portion", "calories": number, "protein": number, "carbs": number, "fat": number, "category": "protein|carbs|fats|vegetables|seasonings|other" }
    ],
    "instructions": ["Step 1...", "Step 2...", "Step 3..."],
    "totalMacros": { "calories": number, "protein": number, "carbs": number, "fat": number }
  },
  "adaptiveContext": {
    "whatChanged": "2-3 sentence explanation of what was kept, changed, and why",
    "keptFoods": ["food1", "food2"],
    "swappedFoods": [
      { "from": "original food", "to": "replacement food" }
    ]
  }
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert nutritionist. Return only valid JSON.' },
        { role: 'user', content: improvePrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI improve response');
    }

    const improveResult = JSON.parse(jsonMatch[0]);
    const aiMeal = improveResult.meal || {};

    // Normalize ingredients to the Ingredient type
    const ingredients = (aiMeal.ingredients || []).map((ing: Record<string, unknown>) => ({
      item: String(ing.item || ''),
      amount: String(ing.amount || ''),
      calories: Number(ing.calories || 0),
      protein: Number(ing.protein || 0),
      carbs: Number(ing.carbs || 0),
      fat: Number(ing.fat || 0),
      category: String(ing.category || 'other'),
    }));

    return NextResponse.json({
      success: true,
      mode: 'improve',
      meal: {
        name: aiMeal.name || `Improved ${slot.label}`,
        time: slot.timeSlot || '',
        context: improveResult.adaptiveContext?.whatChanged || '',
        prepTime: String(aiMeal.prepTime || '20 minutes'),
        type: slot.type,
        ingredients,
        instructions: aiMeal.instructions || [],
        totalMacros: aiMeal.totalMacros || slot.targetMacros,
        targetMacros: slot.targetMacros,
        workoutRelation: slot.workoutRelation || 'none',
        source: 'ai' as const,
        aiRationale: improveResult.adaptiveContext?.whatChanged || '',
        adaptiveContext: {
          whatChanged: improveResult.adaptiveContext?.whatChanged || '',
          keptFoods: improveResult.adaptiveContext?.keptFoods || [],
          swappedFoods: improveResult.adaptiveContext?.swappedFoods || [],
          basedOnDays: currentPattern.daysSampled,
        },
      },
    });
  } catch (error) {
    console.error('Adaptive plan generation error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate adaptive plan' },
      { status: 500 }
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatGoal(goalType?: string): string {
  switch (goalType) {
    case 'lose_fat':
    case 'fat_loss':
      return 'Fat Loss';
    case 'gain_muscle':
    case 'muscle_gain':
      return 'Muscle Gain';
    case 'maintain':
    case 'maintenance':
      return 'Maintenance';
    case 'recomposition':
    case 'recomp':
      return 'Recomposition';
    case 'performance':
      return 'Performance';
    default:
      return goalType || 'General Health';
  }
}
