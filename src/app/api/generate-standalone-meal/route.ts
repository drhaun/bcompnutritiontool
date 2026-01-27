import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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

export async function POST(request: Request) {
  try {
    const body: MealRequest = await request.json();
    const { mealType, targets, preferences, context } = body;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional nutritionist and chef. Always respond with valid JSON only, no markdown.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    let meal;
    try {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      meal = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse meal JSON:', content);
      throw new Error('Failed to parse meal response');
    }

    // Ensure all required fields exist
    const completeMeal = {
      name: meal.name || `${preferences.cuisine} ${mealType} Bowl`,
      description: meal.description || 'A balanced, nutritious meal.',
      calories: Math.round(meal.calories || targets.calories),
      protein: Math.round(meal.protein || targets.protein),
      carbs: Math.round(meal.carbs || targets.carbs),
      fat: Math.round(meal.fat || targets.fat),
      fiber: Math.round(meal.fiber || 5),
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
