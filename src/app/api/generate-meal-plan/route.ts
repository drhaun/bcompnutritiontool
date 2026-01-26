import { NextResponse } from 'next/server';
import { generateWeeklyMealPlan } from '@/lib/ai-meal-planning';
import type { DayNutritionTargets, WeeklySchedule } from '@/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userProfile,
      bodyCompGoals,
      dietPreferences,
      weeklySchedule,
      nutritionTargets,
      daysToGenerate,
    } = body;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'OPENAI_API_KEY is not configured' },
        { status: 500 }
      );
    }
    
    if (!nutritionTargets || nutritionTargets.length === 0) {
      return NextResponse.json(
        { message: 'Nutrition targets are required' },
        { status: 400 }
      );
    }
    
    const mealPlan = await generateWeeklyMealPlan(
      apiKey,
      userProfile,
      bodyCompGoals,
      dietPreferences,
      weeklySchedule as WeeklySchedule,
      nutritionTargets as DayNutritionTargets[],
      Array.isArray(daysToGenerate) && daysToGenerate.length > 0 ? daysToGenerate : undefined
    );
    
    return NextResponse.json({ mealPlan });
  } catch (error) {
    console.error('Meal plan generation error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate meal plan' },
      { status: 500 }
    );
  }
}
