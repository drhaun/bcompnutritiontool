import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Get total count
    const { count: totalCount } = await supabase
      .from('ni_recipes')
      .select('*', { count: 'exact', head: true });

    // Get active count
    const { count: activeCount } = await supabase
      .from('ni_recipes')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get count with ingredients
    const { count: withIngredientsCount } = await supabase
      .from('ni_recipes')
      .select('*', { count: 'exact', head: true })
      .not('ingredients', 'is', null);

    // Get count with directions
    const { count: withDirectionsCount } = await supabase
      .from('ni_recipes')
      .select('*', { count: 'exact', head: true })
      .not('directions', 'is', null);

    // Get count with all filters (what we actually query)
    const { count: fullFilterCount } = await supabase
      .from('ni_recipes')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .not('ingredients', 'is', null)
      .not('directions', 'is', null);

    // Get sample recipes to check data format
    const { data: sampleRecipes } = await supabase
      .from('ni_recipes')
      .select('name, slug, ingredients, directions')
      .eq('is_active', true)
      .limit(5);

    // Check ingredients format
    const ingredientFormats = sampleRecipes?.map(r => {
      const ing = r.ingredients;
      return {
        name: r.name,
        ingredientsType: typeof ing,
        isArray: Array.isArray(ing),
        length: Array.isArray(ing) ? ing.length : (typeof ing === 'string' ? ing.length : 0),
        sample: Array.isArray(ing) ? ing[0] : (typeof ing === 'string' ? ing.substring(0, 100) : ing),
        directionsType: typeof r.directions,
        directionsIsArray: Array.isArray(r.directions),
        directionsLength: Array.isArray(r.directions) ? r.directions.length : 0,
      };
    });

    // Count how many would pass the array check
    const { data: allRecipes } = await supabase
      .from('ni_recipes')
      .select('name, ingredients, directions')
      .eq('is_active', true);

    let passArrayCheck = 0;
    let failArrayCheck = 0;
    const failedRecipes: string[] = [];

    allRecipes?.forEach(r => {
      const ingIsArray = Array.isArray(r.ingredients) && r.ingredients.length > 0;
      const dirIsArray = Array.isArray(r.directions) && r.directions.length > 0;
      if (ingIsArray && dirIsArray) {
        passArrayCheck++;
      } else {
        failArrayCheck++;
        failedRecipes.push(`${r.name} (ing:${Array.isArray(r.ingredients)}, dir:${Array.isArray(r.directions)})`);
      }
    });

    return NextResponse.json({
      counts: {
        total: totalCount,
        active: activeCount,
        withIngredients: withIngredientsCount,
        withDirections: withDirectionsCount,
        passAllFilters: fullFilterCount,
        passArrayCheck,
        failArrayCheck,
      },
      ingredientFormats,
      failedRecipes: failedRecipes.slice(0, 20),
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
