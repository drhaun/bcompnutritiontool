import { NextResponse } from 'next/server';
import { 
  searchFoods, 
  scaleFood, 
  findSimilarFoods,
  type FoodItem 
} from '@/lib/food-database';
import type { Ingredient } from '@/types';

export const runtime = 'nodejs';

interface SwapRequest {
  currentIngredient: Ingredient;
  newFoodSearch?: string;      // Search term for new food
  newFoodId?: number;          // Or specific FDC ID
  maintainMacro: 'calories' | 'protein' | 'carbs' | 'fat';  // Which macro to preserve
}

/**
 * Swap an ingredient with auto-calculated portion size
 * POST /api/swap-ingredient
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currentIngredient, newFoodSearch, newFoodId, maintainMacro = 'protein' } = body as SwapRequest;

    if (!currentIngredient) {
      return NextResponse.json(
        { message: 'currentIngredient is required' },
        { status: 400 }
      );
    }

    // Get the new food
    let newFood: FoodItem | null = null;

    if (newFoodId) {
      // Look up specific food by ID
      const foods = await searchFoods(String(newFoodId), { pageSize: 1 });
      newFood = foods[0] || null;
    } else if (newFoodSearch) {
      // Search for food
      const foods = await searchFoods(newFoodSearch, { pageSize: 1 });
      newFood = foods[0] || null;
    }

    if (!newFood) {
      return NextResponse.json(
        { message: 'Could not find replacement food' },
        { status: 404 }
      );
    }

    // Get the target value from current ingredient
    const targetValue = currentIngredient[maintainMacro] as number;
    
    // Calculate serving size needed
    const per100g = newFood.nutrients[maintainMacro];
    if (per100g === 0) {
      return NextResponse.json(
        { message: `New food has no ${maintainMacro} data` },
        { status: 400 }
      );
    }

    let grams = (targetValue / per100g) * 100;
    
    // Apply reasonable limits based on food category
    const limits: Record<string, { min: number; max: number }> = {
      protein: { min: 50, max: 400 },
      carbs: { min: 30, max: 500 },
      fats: { min: 5, max: 100 },
      vegetables: { min: 30, max: 300 },
      dairy: { min: 50, max: 400 },
      fruit: { min: 50, max: 300 },
      grain: { min: 30, max: 400 },
      other: { min: 10, max: 200 },
    };
    const limit = limits[newFood.category] || { min: 30, max: 300 };
    grams = Math.max(limit.min, Math.min(limit.max, grams));

    // Scale the food
    const scaled = scaleFood(newFood, grams);

    // Convert to Ingredient format
    const newIngredient: Ingredient = {
      item: scaled.description,
      amount: scaled.displayAmount,
      calories: scaled.scaledNutrients.calories,
      protein: Math.round(scaled.scaledNutrients.protein),
      carbs: Math.round(scaled.scaledNutrients.carbs),
      fat: Math.round(scaled.scaledNutrients.fat),
      category: scaled.category === 'grain' ? 'carbs' : 
                scaled.category === 'dairy' ? 'protein' :
                scaled.category === 'fruit' ? 'carbs' :
                scaled.category as Ingredient['category'],
    };

    // Calculate the macro difference
    const macroDiff = {
      calories: newIngredient.calories - currentIngredient.calories,
      protein: newIngredient.protein - currentIngredient.protein,
      carbs: newIngredient.carbs - currentIngredient.carbs,
      fat: newIngredient.fat - currentIngredient.fat,
    };

    return NextResponse.json({
      success: true,
      newIngredient,
      macroDiff,
      foodData: {
        fdcId: newFood.fdcId,
        servingSizeG: Math.round(grams),
        nutrients: newFood.nutrients,
      },
    });

  } catch (error) {
    console.error('Ingredient swap error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Swap failed' },
      { status: 500 }
    );
  }
}

/**
 * Get similar foods for swapping
 * GET /api/swap-ingredient/suggestions?category=protein&limit=10
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!category && !search) {
      return NextResponse.json(
        { message: 'category or search parameter required' },
        { status: 400 }
      );
    }

    // Search for alternatives
    const searchTerms: Record<string, string> = {
      protein: 'chicken breast salmon turkey tuna',
      carbs: 'rice potato oats bread quinoa',
      fats: 'avocado olive oil almonds',
      vegetables: 'broccoli spinach asparagus',
    };

    const query = search || searchTerms[category || ''] || category || '';
    const foods = await searchFoods(query, { pageSize: limit * 2 });

    // Filter by category if specified
    const filtered = category 
      ? foods.filter(f => f.category === category)
      : foods;

    // Return with basic nutrition info
    const suggestions = filtered.slice(0, limit).map(f => ({
      fdcId: f.fdcId,
      name: f.description,
      category: f.category,
      per100g: f.nutrients,
      servingInfo: f.householdServing,
    }));

    return NextResponse.json({
      success: true,
      suggestions,
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}
