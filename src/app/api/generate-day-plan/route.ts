import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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
    } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Calculate macro distribution per meal/snack
    const mealCount = mealSlots.filter(s => s.type === 'meal').length;
    const snackCount = mealSlots.filter(s => s.type === 'snack').length;
    const mealPct = mealCount > 0 ? 0.3 : 0;
    const snackPct = snackCount > 0 ? 0.1 : 0;

    const prompt = `You are an expert sports nutritionist. Create a complete day's meal plan.

CLIENT: ${clientName || 'Client'}
DAILY TARGETS: ${targets.calories} cal | ${targets.protein}g protein | ${targets.carbs}g carbs | ${targets.fat}g fat

DIETARY INFO:
- Restriction: ${dietaryRestriction || 'None'}
- Allergies (NEVER USE): ${allergies.join(', ') || 'None'}
- Preferred proteins: ${preferredProteins.join(', ') || 'chicken, fish, eggs'}
- Preferred carbs: ${preferredCarbs.join(', ') || 'rice, oats, potatoes'}
- Foods to avoid: ${foodsToAvoid.join(', ') || 'None'}

DAY CONTEXT:
- Day type: ${dayContext.dayType}
- Wake time: ${dayContext.wakeTime}
- Sleep time: ${dayContext.sleepTime}
${dayContext.dayType === 'workout' ? `- Workout timing: ${dayContext.workoutTiming}
- Workout type: ${dayContext.workoutType}` : ''}
${dayContext.specialNotes ? `- Special notes: ${dayContext.specialNotes}` : ''}

MEAL SCHEDULE:
${mealSlots.map(slot => `- ${slot.time}: ${slot.name} (${slot.type})`).join('\n')}

Create a meal for each slot. Each meal should:
1. Have a creative, appetizing name
2. Include 3-5 ingredients with exact portions
3. Match the macro targets for that meal type
4. Consider workout timing for pre/post workout meals

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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert nutritionist. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const aiResponse = JSON.parse(jsonMatch[0]);
    
    // Transform to expected structure
    const dayPlan = {
      meals: mealSlots.map((slot, index) => {
        const aiMeal = aiResponse.meals?.find((m: { slotId?: string }) => m.slotId === slot.id) 
          || aiResponse.meals?.[index];
        
        return {
          slot: slot,
          meal: {
            name: aiMeal?.name || `${slot.name}`,
            description: aiMeal?.notes || aiMeal?.description || 'A balanced meal for your goals',
            calories: aiMeal?.totalMacros?.calories || Math.round(targets.calories / mealSlots.length),
            protein: aiMeal?.totalMacros?.protein || Math.round(targets.protein / mealSlots.length),
            carbs: aiMeal?.totalMacros?.carbs || Math.round(targets.carbs / mealSlots.length),
            fat: aiMeal?.totalMacros?.fat || Math.round(targets.fat / mealSlots.length),
            ingredients: aiMeal?.ingredients?.map((i: { item?: string; amount?: string }) => 
              typeof i === 'string' ? i : `${i.amount || ''} ${i.item || ''}`.trim()
            ) || ['Protein source', 'Carb source', 'Vegetables'],
            instructions: aiMeal?.instructions || ['Prepare ingredients', 'Cook according to preference', 'Serve and enjoy'],
            prepTime: slot.prepMethod === 'quick' ? 5 : slot.prepMethod === 'meal_prep' ? 30 : 20,
          },
        };
      }),
      totalCalories: aiResponse.dailyTotals?.calories || targets.calories,
      totalProtein: aiResponse.dailyTotals?.protein || targets.protein,
      totalCarbs: aiResponse.dailyTotals?.carbs || targets.carbs,
      totalFat: aiResponse.dailyTotals?.fat || targets.fat,
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
