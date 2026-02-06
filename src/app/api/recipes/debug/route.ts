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
      .not('ingredients', 'is', null)
      .not('directions', 'is', null)
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Test the array check that happens in the recommend API
    let passArrayCheck = 0;
    let failArrayCheck = 0;
    const failedRecipes: string[] = [];
    const passedRecipes: string[] = [];

    allRecipes?.forEach(r => {
      const ingIsArray = Array.isArray(r.ingredients) && r.ingredients.length > 0;
      const dirIsArray = Array.isArray(r.directions) && r.directions.length > 0;
      
      if (ingIsArray && dirIsArray) {
        passArrayCheck++;
        passedRecipes.push(r.name);
      } else {
        failArrayCheck++;
        failedRecipes.push(`${r.name} (ing:${typeof r.ingredients}/${Array.isArray(r.ingredients)}, dir:${typeof r.directions}/${Array.isArray(r.directions)})`);
      }
    });

    // Sample the first recipe's ingredient format
    const sampleRecipe = allRecipes?.[0];
    const sampleIngredient = sampleRecipe?.ingredients?.[0];

    return NextResponse.json({
      totalFromDb: allRecipes?.length || 0,
      passArrayCheck,
      failArrayCheck,
      sampleIngredientFormat: {
        type: typeof sampleIngredient,
        value: sampleIngredient,
        ingredientsIsArray: Array.isArray(sampleRecipe?.ingredients),
        ingredientsLength: sampleRecipe?.ingredients?.length,
      },
      failedRecipes: failedRecipes.slice(0, 30),
      passedRecipesSample: passedRecipes.slice(0, 10),
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
