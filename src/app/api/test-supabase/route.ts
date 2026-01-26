/**
 * Test Supabase Connection
 * GET /api/test-supabase - Test connection and return food count
 * GET /api/test-supabase?search=chicken - Search foods
 */

import { NextResponse } from 'next/server';
import { 
  testSupabaseConnection, 
  searchFoodsInDb, 
  getFoodsByCategory,
  isSupabaseConfigured 
} from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('search');
  const category = searchParams.get('category');

  // Check if configured
  if (!isSupabaseConfigured) {
    return NextResponse.json({
      success: false,
      error: 'Supabase not configured',
      configured: false,
    });
  }

  try {
    // Test connection
    const connected = await testSupabaseConnection();
    
    if (!connected) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Supabase',
        configured: true,
      });
    }

    // If search query provided, search foods
    if (searchQuery) {
      const foods = await searchFoodsInDb(searchQuery, { limit: 10 });
      return NextResponse.json({
        success: true,
        query: searchQuery,
        results: foods.length,
        foods: foods.map(f => ({
          name: f.name,
          description: f.description,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          category: f.category,
        })),
      });
    }

    // If category provided, get foods by category
    if (category) {
      const foods = await getFoodsByCategory(category as any, 20);
      return NextResponse.json({
        success: true,
        category,
        results: foods.length,
        foods: foods.map(f => ({
          name: f.name,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
        })),
      });
    }

    // Default: return connection status and summary
    const proteins = await getFoodsByCategory('protein', 100);
    const carbs = await getFoodsByCategory('carbs', 100);
    const fats = await getFoodsByCategory('fats', 100);
    const vegetables = await getFoodsByCategory('vegetables', 100);

    return NextResponse.json({
      success: true,
      message: 'Supabase connected successfully!',
      configured: true,
      foodCounts: {
        proteins: proteins.length,
        carbs: carbs.length,
        fats: fats.length,
        vegetables: vegetables.length,
        total: proteins.length + carbs.length + fats.length + vegetables.length,
      },
    });
  } catch (error) {
    console.error('Supabase test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      configured: true,
    });
  }
}
