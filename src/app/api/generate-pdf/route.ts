import { NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import MealPlanPDF from '@/lib/pdf-generator';
import { consolidateGroceryList } from '@/lib/ai-meal-planning';
import type { WeeklyMealPlan } from '@/types';

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
      mealPlan,
    } = body;
    
    if (!mealPlan) {
      return NextResponse.json(
        { message: 'Meal plan is required' },
        { status: 400 }
      );
    }
    
    const groceryList = consolidateGroceryList(mealPlan as WeeklyMealPlan);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      React.createElement(MealPlanPDF, {
        userProfile,
        bodyCompGoals,
        dietPreferences,
        weeklySchedule: weeklySchedule || {},
        nutritionTargets,
        mealPlan,
        groceryList,
      }) as any
    );
    
    // Create a client-friendly filename
    const clientName = userProfile?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'client';
    const date = new Date().toISOString().split('T')[0];
    const filename = `${clientName}_nutrition_strategy_${date}.pdf`;
    
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
