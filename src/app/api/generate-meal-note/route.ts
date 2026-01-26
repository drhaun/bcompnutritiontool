import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { 
  UserProfile, 
  BodyCompGoals, 
  Meal,
  DayOfWeek,
  MealNoteRequest
} from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userProfile,
      bodyCompGoals,
      noteRequest,
    }: {
      userProfile: Partial<UserProfile>;
      bodyCompGoals: Partial<BodyCompGoals>;
      noteRequest: MealNoteRequest;
    } = body;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    const openai = new OpenAI({ apiKey });
    
    const { meal, day, clientGoal, isWorkoutDay, slotLabel } = noteRequest;
    
    const prompt = `
You are a professional nutritionist explaining a meal choice to a client.

MEAL DETAILS:
- Name: ${meal.name}
- Type: ${slotLabel}
- Day: ${day} (${isWorkoutDay ? 'Workout Day' : 'Rest Day'})
- Time: ${meal.time}
- Workout Relation: ${meal.workoutRelation}

MACROS:
- Calories: ${meal.totalMacros.calories}
- Protein: ${meal.totalMacros.protein}g
- Carbs: ${meal.totalMacros.carbs}g  
- Fat: ${meal.totalMacros.fat}g

KEY INGREDIENTS:
${meal.ingredients.slice(0, 5).map(i => `- ${i.amount} ${i.item}`).join('\n')}

CLIENT CONTEXT:
- Goal: ${clientGoal || bodyCompGoals?.goalType || 'General health'}
- Gender: ${userProfile?.gender || 'Not specified'}
- Age: ${userProfile?.age || 'Not specified'}

Write a 2-3 sentence rationale explaining why this meal is a good choice for this client at this time. 
Focus on:
1. How the macros support their goal
2. Why the timing/context makes sense
3. Any nutritional benefits of key ingredients

Be concise, professional, and encouraging. Return ONLY the rationale text, no JSON.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a friendly nutrition coach writing brief meal rationales. Be concise and supportive.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });
    
    const rationale = response.choices[0]?.message?.content?.trim();
    if (!rationale) {
      throw new Error('No content in AI response');
    }
    
    return NextResponse.json({ 
      success: true, 
      rationale,
    });
    
  } catch (error) {
    console.error('Meal note generation error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate note' },
      { status: 500 }
    );
  }
}
