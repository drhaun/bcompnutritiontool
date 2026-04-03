import { NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import MealPlanPDF from '@/lib/pdf-generator';
import { consolidateGroceryList } from '@/lib/grocery-utils';
import type { RawIngredient } from '@/lib/grocery-utils';
import type { WeeklyMealPlan, Meal } from '@/types';
// Instacart integration paused until production API access is granted
// import { isInstacartConfigured, createInstacartShoppingList } from '@/lib/instacart-client';

export const runtime = 'nodejs';

const GROCERY_DEPARTMENT_ORDER = [
  'produce',
  'meat_seafood',
  'dairy_eggs',
  'grains_bread',
  'fats_oils',
  'pantry',
  'seasonings',
] as const;

/**
 * Categorise an ingredient into a grocery-store department
 * based on its name and AI-assigned macro category.
 */
function getGroceryDepartment(name: string, macroCategory: string): string {
  const n = name.toLowerCase();

  if (/\b(chicken|beef|turkey|pork|salmon|tuna|shrimp|fish|steak|lamb|tofu|tempeh|ground\s?(meat|beef|turkey|chicken)|breast|thigh|fillet|loin|sirloin|cod|tilapia|sausage|ham|deli|bison|sardine|mahi|halibut|scallop|crab|lobster|venison|duck|jerky)\b/.test(n)) return 'meat_seafood';
  if (/\b(yogurt|cheese|milk|cream cheese|sour cream|cottage|ricotta|mozzarella|parmesan|cheddar|feta|egg|eggs|whey|cream|kefir|half.and.half)\b/.test(n)) return 'dairy_eggs';
  if (/\b(berry|berries|banana|apple|orange|mango|grape|melon|peach|pear|plum|cherry|strawberr|blueberr|raspberr|blackberr|pineapple|kiwi|lemon|lime|date|fig|raisin|cranberr|watermelon|pomegranate|papaya|apricot|nectarine|tangerine|clementine|grapefruit)\b/.test(n)) return 'produce';
  if (/\b(rice|bread|pasta|oats|oatmeal|quinoa|tortilla|wrap|noodle|cereal|granola|bagel|muffin|flour|couscous|barley|farro|bulgur|cracker|pita|english muffin|pancake|waffle|cornmeal|polenta|bun|roll|sourdough|flatbread)\b/.test(n)) return 'grains_bread';
  if (/\b(broccoli|spinach|kale|lettuce|tomato|onion|pepper|carrot|celery|cucumber|zucchini|squash|asparagus|cauliflower|cabbage|mushroom|pea|arugula|bok choy|brussels|green bean|snap pea|snow pea|scallion|leek|shallot|artichoke|eggplant|beet|radish|turnip|corn|sweet potato|potato|yam|avocado|jalapeno|poblano|habanero|serrano)\b/.test(n)) return 'produce';
  if (/\b(olive oil|coconut oil|avocado oil|canola oil|vegetable oil|sesame oil|ghee|butter(?!\s*milk)|almond|walnut|pecan|cashew|peanut(?!\s*butter)|pistachio|macadamia|flax|chia|hemp|sunflower seed|pumpkin seed|pine nut|tahini)\b/.test(n)) return 'fats_oils';
  if (/\b(peanut butter|almond butter|nut butter|mayo|mayonnaise|dressing|soy sauce|hot sauce|vinegar|mustard|sriracha|worcestershire|balsamic|ketchup|salsa|tomato sauce|tomato paste|coconut milk|almond milk|oat milk|broth|stock|protein powder|whey protein|collagen|supplement|honey|maple|syrup|sugar|canned|extract|vanilla|cocoa|chocolate|baking|jam|jelly)\b/.test(n)) return 'pantry';
  if (/\b(salt|pepper|cumin|paprika|cinnamon|turmeric|oregano|basil|thyme|rosemary|parsley|cilantro|chili|cayenne|nutmeg|ginger|garlic powder|onion powder|dill|sage|bay leaf|coriander|cardamom|allspice|clove|fennel|saffron|mint|chive|tarragon|italian seasoning|taco seasoning|curry|za.atar|everything bagel|red pepper flake|garlic(?!\s))\b/.test(n)) return 'seasonings';
  if (/\b(bean|lentil|chickpea|black bean|kidney bean|pinto bean|edamame|hummus)\b/.test(n)) return 'pantry';

  if (macroCategory === 'protein') return 'meat_seafood';
  if (macroCategory === 'carbs') return 'grains_bread';
  if (macroCategory === 'fats') return 'fats_oils';
  if (macroCategory === 'vegetables') return 'produce';
  if (macroCategory === 'seasonings') return 'seasonings';
  return 'pantry';
}

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
      resources,
      logoUrl,
      options,
    } = body;

    if (!mealPlan) {
      return NextResponse.json({ message: 'Meal plan is required' }, { status: 400 });
    }

    // Build grocery list using the same consolidation as the UI
    let groceryList: Record<string, { name: string; totalAmount: string }[]> = {};

    if (options?.includeGroceryList !== false) {
      const rawIngredients: RawIngredient[] = [];
      for (const [, dayPlan] of Object.entries(mealPlan as WeeklyMealPlan)) {
        if (!dayPlan?.meals) continue;
        for (const meal of dayPlan.meals as Meal[]) {
          if (!meal?.ingredients) continue;
          for (const ing of meal.ingredients) {
            if (!ing?.item) continue;
            rawIngredients.push({
              item: ing.item,
              amount: ing.amount || '1 serving',
              category: ing.category || 'other',
              mealMultiplier: 1,
            });
          }
        }
      }

      const flatItems = consolidateGroceryList(rawIngredients, 1);

      // Group into grocery departments for PDF layout
      const grouped: Record<string, { name: string; totalAmount: string }[]> = {};
      for (const dept of GROCERY_DEPARTMENT_ORDER) grouped[dept] = [];

      for (const item of flatItems) {
        const dept = getGroceryDepartment(item.name, item.category);
        if (!grouped[dept]) grouped[dept] = [];
        grouped[dept].push({
          name: item.name,
          totalAmount: `${item.qty} ${item.unit}`,
        });
      }
      groceryList = grouped;
    }

    // Extract client supplements for the PDF supplement schedule page
    const supplements = (userProfile?.supplements || []).map((s: { name: string; dosage?: string; timing?: string[]; notes?: string }) => ({
      name: s.name,
      dosage: s.dosage,
      timing: s.timing || [],
      notes: s.notes,
    }));

    const fullscriptUrl =
      process.env.NEXT_PUBLIC_FULLSCRIPT_DISPENSARY_URL || 'https://us.fullscript.com/welcome/fitomics';

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
        supplements: supplements.length > 0 ? supplements : undefined,
        fullscriptUrl: supplements.length > 0 ? fullscriptUrl : undefined,
        resources: resources || [],
        logoUrl,
        options: options || {},
      }) as any,
    );

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
      { status: 500 },
    );
  }
}
