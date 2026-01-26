/**
 * Food Search API
 * Searches the Supabase foods table for ingredients
 * Falls back to USDA API if needed
 */

import { NextResponse } from 'next/server';
import { searchFoodsInDb, dbFoodToFoodItem, isSupabaseConfigured } from '@/lib/supabase';
import { searchFoods } from '@/lib/food-database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!query.trim()) {
    return NextResponse.json({ foods: [] });
  }

  try {
    let foods: Array<{
      id: string;
      name: string;
      description: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      serving_size: number;
      serving_unit: string;
      category: string;
    }> = [];

    // First try Supabase
    if (isSupabaseConfigured) {
      const supabaseFoods = await searchFoodsInDb(query, {
        category: category && category !== 'all' ? category : undefined,
        limit,
      });

      foods = supabaseFoods.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        calories: Number(f.calories),
        protein: Number(f.protein),
        carbs: Number(f.carbs),
        fat: Number(f.fat),
        serving_size: Number(f.serving_size),
        serving_unit: f.serving_unit,
        category: f.category,
      }));
    }

    // If we didn't get many results, supplement with USDA/fallback
    if (foods.length < 5) {
      try {
        const usdaFoods = await searchFoods(query, {
          pageSize: limit - foods.length,
          preferRaw: true,
        });

        const usdaFormatted = usdaFoods.map(f => ({
          id: `usda-${f.fdcId}`,
          name: f.description.split(',')[0], // Take first part as name
          description: f.description,
          calories: Math.round(f.nutrients.calories),
          protein: Math.round(f.nutrients.protein * 10) / 10,
          carbs: Math.round(f.nutrients.carbs * 10) / 10,
          fat: Math.round(f.nutrients.fat * 10) / 10,
          serving_size: f.servingSize || 100,
          serving_unit: f.servingSizeUnit || 'g',
          category: f.category || 'other',
        }));

        // Merge, avoiding duplicates by name similarity
        const existingNames = new Set(foods.map(f => f.name.toLowerCase()));
        for (const usdaFood of usdaFormatted) {
          if (!existingNames.has(usdaFood.name.toLowerCase())) {
            foods.push(usdaFood);
          }
        }
      } catch (error) {
        console.error('USDA search error:', error);
      }
    }

    // Sort by relevance (exact matches first, then partial)
    const queryLower = query.toLowerCase();
    foods.sort((a, b) => {
      const aExact = a.name.toLowerCase() === queryLower;
      const bExact = b.name.toLowerCase() === queryLower;
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
      
      const aStarts = a.name.toLowerCase().startsWith(queryLower);
      const bStarts = b.name.toLowerCase().startsWith(queryLower);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      
      return 0;
    });

    return NextResponse.json({ 
      foods: foods.slice(0, limit),
      source: isSupabaseConfigured ? 'supabase' : 'fallback',
    });
  } catch (error) {
    console.error('Food search error:', error);
    return NextResponse.json(
      { error: 'Failed to search foods', foods: [] },
      { status: 500 }
    );
  }
}
