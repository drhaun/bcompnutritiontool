import { NextResponse } from 'next/server';
import { generatePreciseMeal, ACCURACY_THRESHOLDS, checkPortionWarnings } from '@/lib/precision-meal-generator';
import { getActiveProvider } from '@/lib/ai-client';
import { sanitizeMealFields, reconcileMealMacros } from '@/lib/meal-sanitizer';
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
    
    if (!getActiveProvider()) {
      return NextResponse.json(
        { message: 'AI provider not configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.' },
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
      isWorkoutDay,
      prepMethod,
      location,
      maxIngredients,
      availableFoods,
      cronometerPattern,
      micronutrientGuidance,
    } = mealRequest;
    
    const effectiveMaxIngredients = maxIngredients ?? dietPreferences.maxIngredientsPerMeal;
    const effectiveAvailableFoods = (availableFoods && availableFoods.length > 0)
      ? availableFoods
      : dietPreferences.availableFoods;
    
    // Use precision meal generator (database-backed)
    const meal = await generatePreciseMeal('', {
      day,
      slotLabel,
      targetMacros,
      timeSlot,
      workoutRelation,
      isWorkoutDay,
      dietPreferences,
      previousMeals,
      goalType: bodyCompGoals.goalType,
      prepMethod,
      location,
      maxIngredients: effectiveMaxIngredients,
      availableFoods: effectiveAvailableFoods,
      cronometerPattern,
      micronutrientGuidance,
    });
    
    // Hard clamp: if calories overshoot by more than 5%, proportionally scale
    // all ingredient macros down so the meal lands on target
    const calOvershoot = meal.totalMacros.calories - targetMacros.calories;
    if (calOvershoot > 0 && targetMacros.calories > 0) {
      const overPct = calOvershoot / targetMacros.calories;
      if (overPct > ACCURACY_THRESHOLDS.calories) {
        const scale = targetMacros.calories / meal.totalMacros.calories;
        for (const ing of meal.ingredients) {
          ing.calories = Math.round((ing.calories || 0) * scale);
          ing.protein = Math.round(((ing.protein || 0) * scale) * 10) / 10;
          ing.carbs = Math.round(((ing.carbs || 0) * scale) * 10) / 10;
          ing.fat = Math.round(((ing.fat || 0) * scale) * 10) / 10;
        }
        meal.totalMacros = {
          calories: Math.round(meal.ingredients.reduce((s, i) => s + (i.calories || 0), 0)),
          protein: Math.round(meal.ingredients.reduce((s, i) => s + (i.protein || 0), 0)),
          carbs: Math.round(meal.ingredients.reduce((s, i) => s + (i.carbs || 0), 0)),
          fat: Math.round(meal.ingredients.reduce((s, i) => s + (i.fat || 0), 0)),
        };
      }
    }

    // Sanitize AI text fields and reconcile macros from ingredients
    let sanitizedMeal = sanitizeMealFields(meal);
    sanitizedMeal = reconcileMealMacros(sanitizedMeal);

    // Validate macro accuracy using tighter thresholds
    const variance = {
      calories: Math.abs(sanitizedMeal.totalMacros.calories - targetMacros.calories) / targetMacros.calories,
      protein: Math.abs(sanitizedMeal.totalMacros.protein - targetMacros.protein) / targetMacros.protein,
      carbs: targetMacros.carbs > 0 ? Math.abs(sanitizedMeal.totalMacros.carbs - targetMacros.carbs) / targetMacros.carbs : 0,
      fat: targetMacros.fat > 0 ? Math.abs(sanitizedMeal.totalMacros.fat - targetMacros.fat) / targetMacros.fat : 0,
    };
    
    // Check against tighter accuracy thresholds
    const isAccurate = 
      variance.calories <= ACCURACY_THRESHOLDS.calories &&
      variance.protein <= ACCURACY_THRESHOLDS.protein &&
      variance.carbs <= ACCURACY_THRESHOLDS.carbs &&
      variance.fat <= ACCURACY_THRESHOLDS.fat;
    
    // Get portion warnings if any
    const warnings: string[] = [];
    if (sanitizedMeal.totalMacros.fat < 5) {
      warnings.push('Low fat content may affect satiety');
    }
    
    return NextResponse.json({ 
      success: true, 
      meal: sanitizedMeal,
      accuracy: {
        withinTarget: isAccurate,
        thresholds: {
          calories: ACCURACY_THRESHOLDS.calories * 100,
          protein: ACCURACY_THRESHOLDS.protein * 100,
          carbs: ACCURACY_THRESHOLDS.carbs * 100,
          fat: ACCURACY_THRESHOLDS.fat * 100,
        },
        variance: {
          calories: Math.round(variance.calories * 100),
          protein: Math.round(variance.protein * 100),
          carbs: Math.round(variance.carbs * 100),
          fat: Math.round(variance.fat * 100),
        },
      },
      warnings,
    });
    
  } catch (error) {
    console.error('Single meal generation error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate meal' },
      { status: 500 }
    );
  }
}
