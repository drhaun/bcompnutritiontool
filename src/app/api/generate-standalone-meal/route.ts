import { NextResponse } from 'next/server';
import { aiChatJSON, getActiveProvider } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface MealRequest {
  mealType: string;
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    flexibility: number;
  };
  preferences: {
    prepComplexity: string;
    mealStyle: string;
    cuisine: string;
    preferredProtein: string;
    dietaryRestriction: string;
    allergies: string[];
    dislikes: string[];
  };
  context: {
    mealTime: string;
    location: string;
    specialRequests: string;
  };
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export async function POST(request: Request) {
  try {
    const body: MealRequest = await request.json();
    const { mealType, targets, preferences, context } = body;
    
    if (!getActiveProvider()) {
      return NextResponse.json(
        { message: 'AI provider not configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.' },
        { status: 500 }
      );
    }

    const prompt = `You are an expert nutritionist and chef. Create a detailed, delicious meal that meets specific macro targets.

MEAL TYPE: ${mealType.replace('_', ' ')}
TIME: ${context.mealTime}
LOCATION: ${context.location}

MACRO TARGETS (±${targets.flexibility}% flexibility):
- Calories: ${targets.calories}
- Protein: ${targets.protein}g
- Carbs: ${targets.carbs}g
- Fat: ${targets.fat}g

PREFERENCES:
- Prep Complexity: ${preferences.prepComplexity.replace('_', ' ')}
- Style: ${preferences.mealStyle.replace('_', ' ')}
- Cuisine: ${preferences.cuisine}
- Main Protein: ${preferences.preferredProtein}
- Dietary: ${preferences.dietaryRestriction}
${preferences.allergies.length > 0 ? `- Allergies: ${preferences.allergies.join(', ')}` : ''}
${preferences.dislikes.length > 0 ? `- Foods to Avoid: ${preferences.dislikes.join(', ')}` : ''}
${context.specialRequests ? `- Special Requests: ${context.specialRequests}` : ''}

Create a meal with:
1. A creative, appetizing name
2. Brief description
3. Precise macros that match targets closely
4. Detailed ingredients with exact amounts
5. Step-by-step instructions
6. Prep and cook times
7. Pro tips
8. Substitution options
9. Nutrition highlights

Return JSON in this exact format:
{
  "name": "Creative Meal Name",
  "description": "Brief appetizing description",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "ingredients": [
    { "item": "Ingredient name", "amount": "150g", "notes": "optional prep notes" }
  ],
  "instructions": ["Step 1...", "Step 2..."],
  "prepTime": number (minutes),
  "cookTime": number (minutes),
  "tips": ["Tip 1...", "Tip 2..."],
  "substitutions": [
    { "original": "Item", "substitute": "Alternative", "reason": "Why" }
  ],
  "nutritionHighlights": ["Highlight 1", "Highlight 2"]
}

IMPORTANT: The macros MUST be accurate and within ${targets.flexibility}% of targets. Use real portion sizes.`;

    const meal = await aiChatJSON<Record<string, unknown>>({
      system: 'You are a professional nutritionist and chef. Always respond with valid JSON only, no markdown.',
      userMessage: prompt,
      temperature: 0.8,
      maxTokens: 2000,
      jsonMode: true,
      tier: 'fast',
    });

    // Ensure all required fields exist
    const completeMeal = {
      name: meal.name || `${preferences.cuisine} ${mealType} Bowl`,
      description: meal.description || 'A balanced, nutritious meal.',
      calories: Math.round(asNumber(meal.calories, targets.calories)),
      protein: Math.round(asNumber(meal.protein, targets.protein)),
      carbs: Math.round(asNumber(meal.carbs, targets.carbs)),
      fat: Math.round(asNumber(meal.fat, targets.fat)),
      fiber: Math.round(asNumber(meal.fiber, 5)),
      ingredients: meal.ingredients || [],
      instructions: meal.instructions || [],
      prepTime: meal.prepTime || 15,
      cookTime: meal.cookTime || 20,
      tips: meal.tips || [],
      substitutions: meal.substitutions || [],
      nutritionHighlights: meal.nutritionHighlights || [],
    };

    return NextResponse.json({ 
      success: true, 
      meal: completeMeal,
      alternatives: [], // Could generate alternatives in future
    });
    
  } catch (error) {
    console.error('Standalone meal generation error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate meal' },
      { status: 500 }
    );
  }
}
