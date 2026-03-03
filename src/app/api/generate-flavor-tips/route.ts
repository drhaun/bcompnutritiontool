import { NextRequest, NextResponse } from 'next/server';
import { aiChat, getActiveProvider } from '@/lib/ai-client';

interface Ingredient {
  name: string;
  grams: number;
  category?: string;
}

interface FlavorTipsRequest {
  ingredients: Ingredient[];
  cuisinePreferences?: string[];
  allergies?: string[];
  mealContext?: string; // e.g., "breakfast", "post-workout", etc.
}

export async function POST(request: NextRequest) {
  try {
    const body: FlavorTipsRequest = await request.json();
    const { ingredients, cuisinePreferences, allergies, mealContext } = body;

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'No ingredients provided' },
        { status: 400 }
      );
    }

    const ingredientsList = ingredients
      .map((ing) => `- ${ing.grams}g ${ing.name}`)
      .join('\n');

    const cuisineContext = cuisinePreferences?.length
      ? `Client prefers: ${cuisinePreferences.join(', ')} cuisines.`
      : 'No specific cuisine preference.';

    const allergyContext = allergies?.length
      ? `AVOID these allergens: ${allergies.join(', ')}`
      : '';

    const mealInfo = mealContext ? `This is for: ${mealContext}` : '';

    const prompt = `You are an expert culinary nutritionist. A client has selected the following ingredients for their meal:

${ingredientsList}

${cuisineContext}
${allergyContext}
${mealInfo}

Provide SPECIFIC, actionable advice to make this meal taste amazing. Include:

1. **Seasoning Recommendations**: Exact amounts of spices, herbs, and seasonings that complement these specific ingredients
2. **Cooking Method**: The best way to prepare each protein/carb for maximum flavor (e.g., "pan-sear chicken on high heat for 3 min per side for crispy exterior")
3. **Flavor Boosters**: Low-calorie additions that dramatically improve taste (citrus, aromatics, vinegars, etc.)
4. **Sauce/Dressing Idea**: A simple sauce or dressing recipe using minimal additional calories
5. **Pro Tips**: 2-3 chef secrets for this combination (e.g., "let protein rest 5 min after cooking", "toast your spices first")

Be specific to THESE ingredients - don't give generic advice. Keep it practical for home cooking.
Format as a numbered list with clear, concise instructions.`;

    if (!getActiveProvider()) {
      return NextResponse.json({ error: 'AI provider not configured' }, { status: 500 });
    }

    const tips = await aiChat({
      system: 'You are a culinary expert who helps people make their healthy meals taste delicious. Be specific, practical, and focused on maximum flavor with minimal added calories. Always consider the nutritional context.',
      userMessage: prompt,
      temperature: 0.7,
      maxTokens: 800,
      tier: 'fast',
    });

    // Parse into structured format
    const sections = {
      seasoning: extractSection(tips, 'Seasoning', 'Cooking'),
      cookingMethod: extractSection(tips, 'Cooking', 'Flavor'),
      flavorBoosters: extractSection(tips, 'Flavor', 'Sauce'),
      sauce: extractSection(tips, 'Sauce', 'Pro'),
      proTips: extractSection(tips, 'Pro', null),
      fullText: tips,
    };

    return NextResponse.json({
      success: true,
      tips: sections,
      rawText: tips,
    });
  } catch (error) {
    console.error('Flavor tips generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate flavor tips' },
      { status: 500 }
    );
  }
}

// Helper to extract sections from the response
function extractSection(
  text: string,
  startMarker: string,
  endMarker: string | null
): string {
  const startRegex = new RegExp(`\\*\\*${startMarker}[^*]*\\*\\*:?`, 'i');
  const startMatch = text.match(startRegex);
  if (!startMatch) return '';

  const startIndex = text.indexOf(startMatch[0]) + startMatch[0].length;
  let endIndex = text.length;

  if (endMarker) {
    const endRegex = new RegExp(`\\*\\*${endMarker}`, 'i');
    const endMatch = text.substring(startIndex).match(endRegex);
    if (endMatch) {
      endIndex = startIndex + text.substring(startIndex).indexOf(endMatch[0]);
    }
  }

  return text.substring(startIndex, endIndex).trim();
}
