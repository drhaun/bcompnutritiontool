import { NextResponse } from 'next/server';
import { generatePreciseMeal } from '@/lib/precision-meal-generator';
import type { 
  UserProfile, 
  BodyCompGoals, 
  DietPreferences,
  SingleMealRequest
} from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userProfile,
      bodyCompGoals,
      dietPreferences,
      mealRequest,
    }: {
      userProfile: Partial<UserProfile>;
      bodyCompGoals: Partial<BodyCompGoals>;
      dietPreferences: Partial<DietPreferences>;
      mealRequest: SingleMealRequest;
    } = body;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    const { 
      day, 
      slotLabel, 
      targetMacros, 
      previousMeals, 
      timeSlot, 
      workoutRelation,
      isWorkoutDay 
    } = mealRequest;
    
    // Use precision meal generator (database-backed)
    const meal = await generatePreciseMeal(apiKey, {
      day,
      slotLabel,
      targetMacros,
      timeSlot,
      workoutRelation,
      isWorkoutDay,
      dietPreferences,
      previousMeals,
      goalType: bodyCompGoals.goalType,
    });
    
    // Validate macro accuracy
    const variance = {
      calories: Math.abs(meal.totalMacros.calories - targetMacros.calories) / targetMacros.calories,
      protein: Math.abs(meal.totalMacros.protein - targetMacros.protein) / targetMacros.protein,
      carbs: targetMacros.carbs > 0 ? Math.abs(meal.totalMacros.carbs - targetMacros.carbs) / targetMacros.carbs : 0,
      fat: targetMacros.fat > 0 ? Math.abs(meal.totalMacros.fat - targetMacros.fat) / targetMacros.fat : 0,
    };
    
    const isAccurate = variance.calories < 0.15 && variance.protein < 0.15;
    
    return NextResponse.json({ 
      success: true, 
      meal,
      accuracy: {
        withinTarget: isAccurate,
        variance: {
          calories: Math.round(variance.calories * 100),
          protein: Math.round(variance.protein * 100),
          carbs: Math.round(variance.carbs * 100),
          fat: Math.round(variance.fat * 100),
        },
      },
    });
    
  } catch (error) {
    console.error('Single meal generation error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate meal' },
      { status: 500 }
    );
  }
}
