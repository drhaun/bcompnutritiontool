import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Get ALL recipes without any filtering
    const { data: allRecipes, error } = await supabase
      .from('ni_recipes')
      .select('id, name, slug, is_active, ingredients, directions')
      .eq('is_active', true)
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Analyze ingredient data
    let emptyIngredients = 0;
    let hasIngredients = 0;
    let emptyDirections = 0;
    let hasDirections = 0;
    
    const emptyIngredientRecipes: string[] = [];
    const sampleWithData: any[] = [];
    const sampleEmpty: any[] = [];

    allRecipes?.forEach(r => {
      const ingLength = Array.isArray(r.ingredients) ? r.ingredients.length : 0;
      const dirLength = Array.isArray(r.directions) ? r.directions.length : 0;
      
      if (ingLength > 0) {
        hasIngredients++;
        if (sampleWithData.length < 3) {
          sampleWithData.push({
            name: r.name,
            ingredientCount: ingLength,
            firstIngredient: r.ingredients[0],
          });
        }
      } else {
        emptyIngredients++;
        emptyIngredientRecipes.push(r.name);
        if (sampleEmpty.length < 3) {
          sampleEmpty.push({
            name: r.name,
            ingredients: r.ingredients,
            ingredientsType: typeof r.ingredients,
          });
        }
      }
      
      if (dirLength > 0) hasDirections++;
      else emptyDirections++;
    });

    return NextResponse.json({
      totalFromDb: allRecipes?.length || 0,
      summary: {
        withIngredients: hasIngredients,
        emptyIngredients: emptyIngredients,
        withDirections: hasDirections,
        emptyDirections: emptyDirections,
      },
      sampleRecipesWithData: sampleWithData,
      sampleRecipesEmpty: sampleEmpty,
      emptyIngredientRecipes: emptyIngredientRecipes.slice(0, 50),
      message: emptyIngredients > 0 
        ? `${emptyIngredients} recipes have empty ingredients arrays - data needs to be re-imported`
        : 'All recipes have ingredient data',
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
