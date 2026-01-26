import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { 
  UserProfile, 
  BodyCompGoals, 
  DietPreferences,
  Meal,
  MealSwapRequest
} from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
- Foods to Avoid: ${(dietPreferences.foodsToAvoid || []).slice(0, 10).join(', ') || 'None'}

FOOD PREFERENCES:
- Foods to Emphasize: ${(dietPreferences.foodsToEmphasize || []).slice(0, 10).join(', ') || 'None'}
- Proteins: ${(dietPreferences.preferredProteins || []).slice(0, 6).join(', ') || 'Any'}
- Carbs: ${(dietPreferences.preferredCarbs || []).slice(0, 6).join(', ') || 'Any'}
- Cuisines: ${(dietPreferences.cuisinePreferences || []).slice(0, 4).join(', ') || 'Any'}
`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userProfile,
      bodyCompGoals,
      dietPreferences,
      swapRequest,
    }: {
      userProfile: Partial<UserProfile>;
      bodyCompGoals: Partial<BodyCompGoals>;
      dietPreferences: Partial<DietPreferences>;
      swapRequest: MealSwapRequest;
    } = body;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    const openai = new OpenAI({ apiKey });
    
    const dietaryContext = buildDietaryContext(dietPreferences);
    
    const { currentMeal, targetMacros, day, slotLabel, excludeMeals } = swapRequest;
    
    const prompt = `
You are a professional nutritionist suggesting alternative meals.

CURRENT MEAL TO REPLACE:
- Name: ${currentMeal.name}
- Type: ${slotLabel}
- Day: ${day}

${dietaryContext}

TARGET MACROS (alternatives must match within ±10%):
- Calories: ${targetMacros.calories}
- Protein: ${targetMacros.protein}g
- Carbs: ${targetMacros.carbs}g
- Fat: ${targetMacros.fat}g

EXCLUDE THESE MEALS (already in plan): ${excludeMeals.join(', ') || 'None'}

Generate 3 alternative meal options that:
1. Match the target macros within ±10%
2. Respect all dietary restrictions and allergies
3. Are different from the current meal and excluded meals
4. Include variety in protein sources and cuisines

Return a JSON object with this EXACT structure:
{
  "alternatives": [
    {
      "name": "Alternative Meal Name",
      "prepTime": "X minutes",
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
        "calories": ${targetMacros.calories},
        "protein": ${targetMacros.protein},
        "carbs": ${targetMacros.carbs},
        "fat": ${targetMacros.fat}
      },
      "briefDescription": "One sentence describing why this is a good alternative"
    }
  ]
}

Categories: "protein", "carbs", "fats", "vegetables", "seasonings", "other"
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a precision nutrition expert. Generate meal alternatives with exact macro calculations.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 3000,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }
    
    const result = JSON.parse(content);
    
    // Process alternatives and add metadata
    const alternatives = result.alternatives.map((alt: Meal & { briefDescription: string }) => {
      // Calculate actual macros from ingredients
      const actualCals = alt.ingredients.reduce((sum, ing) => sum + (ing.calories || 0), 0);
      const actualProtein = alt.ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);
      const actualCarbs = alt.ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
      const actualFat = alt.ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
      
      return {
        ...alt,
        time: currentMeal.time,
        context: `${slotLabel} - ${alt.briefDescription || 'Alternative option'}`,
        type: currentMeal.type,
        workoutRelation: currentMeal.workoutRelation,
        targetMacros,
        totalMacros: {
          calories: Math.round(actualCals),
          protein: Math.round(actualProtein),
          carbs: Math.round(actualCarbs),
          fat: Math.round(actualFat),
        },
        source: 'swapped' as const,
        lastModified: new Date().toISOString(),
        isLocked: false,
        // Calculate variance from target
        macroVariance: {
          calories: Math.round(actualCals - targetMacros.calories),
          protein: Math.round(actualProtein - targetMacros.protein),
          carbs: Math.round(actualCarbs - targetMacros.carbs),
          fat: Math.round(actualFat - targetMacros.fat),
        },
      };
    });
    
    return NextResponse.json({ 
      success: true, 
      alternatives,
    });
    
  } catch (error) {
    console.error('Meal swap suggestion error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate alternatives' },
      { status: 500 }
    );
  }
}
