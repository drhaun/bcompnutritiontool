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

    // Get some sample recipes that are missing ingredients or directions
    const { data: missingData } = await supabase
      .from('ni_recipes')
      .select('name, slug, is_active, ingredients, directions')
      .or('ingredients.is.null,directions.is.null')
      .limit(10);

    // Get inactive recipes
    const { data: inactiveRecipes } = await supabase
      .from('ni_recipes')
      .select('name, slug')
      .eq('is_active', false)
      .limit(20);

    return NextResponse.json({
      counts: {
        total: totalCount,
        active: activeCount,
        withIngredients: withIngredientsCount,
        withDirections: withDirectionsCount,
        passAllFilters: fullFilterCount,
      },
      sampleMissingData: missingData?.map(r => ({
        name: r.name,
        slug: r.slug,
        is_active: r.is_active,
        hasIngredients: !!r.ingredients,
        hasDirections: !!r.directions,
      })),
      inactiveRecipes: inactiveRecipes?.map(r => r.name),
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
