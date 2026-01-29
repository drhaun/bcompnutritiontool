import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RecipeRecommendationRequest {
  targetMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  mealContext: {
    slotType: 'meal' | 'snack';
    slotLabel: string;
    workoutRelation: 'pre-workout' | 'post-workout' | 'none';
    isWorkoutDay: boolean;
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
  };
  dietPreferences?: {
    dietaryPattern?: string;
    dietaryRestrictions?: string[];
    allergies?: string[];
    customAllergies?: string[];
    foodsToAvoid?: string[];
    foodsToEmphasize?: string[];
    cuisinePreferences?: string[];
    preferredProteins?: string[];
    preferredCarbs?: string[];
    preferredVegetables?: string[];
  };
  excludeRecipes?: string[]; // Slugs of recipes to exclude (for variety)
  limit?: number;
}

interface ScaledRecipe {
  id: string;
  slug: string;
  name: string;
  cronometer_name: string | null;
  category: string;
  tags: string[];
  // Original nutrition (1 serving)
  original: {
    serving_size_g: number | null;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  // Scaled to target
  scaled: {
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  // Variance from target
  variance: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    caloriesPct: number;
    proteinPct: number;
  };
  // Recipe details
  ingredients: { item: string; amount: string }[];
  directions: string[];
  image_url: string | null;
  // Match info
  matchScore: number;
  matchReasons: string[];
  // Flags
  is_high_protein: boolean;
  is_low_carb: boolean;
  is_meal_prep_friendly: boolean;
  is_quick_prep: boolean;
}

// Calculate the optimal serving size to match target macros
function calculateOptimalServings(
  recipe: { calories: number; protein: number; carbs: number; fat: number },
  target: { calories: number; protein: number; carbs: number; fat: number },
  prioritize: 'calories' | 'protein' = 'protein'
): number {
  // Primary: Match protein (most important for body comp goals)
  // Secondary: Stay within calorie target
  
  if (prioritize === 'protein' && target.protein > 0 && recipe.protein > 0) {
    const proteinServings = target.protein / recipe.protein;
    // Don't exceed calorie target by more than 10%
    const maxServingsByCalories = (target.calories * 1.1) / recipe.calories;
    return Math.min(proteinServings, maxServingsByCalories);
  }
  
  // Fall back to calorie matching
  if (target.calories > 0 && recipe.calories > 0) {
    return target.calories / recipe.calories;
  }
  
  return 1;
}

// Calculate match score based on how well recipe fits the context
function calculateMatchScore(
  recipe: {
    calories: number;
    protein: number;
    suitable_for_pre_workout: boolean;
    suitable_for_post_workout: boolean;
    is_high_protein: boolean;
    is_meal_prep_friendly: boolean;
    is_quick_prep: boolean;
    tags: string[];
    category: string;
    ingredients: { item: string; amount: string }[];
  },
  context: RecipeRecommendationRequest['mealContext'],
  scaledVariance: { caloriesPct: number; proteinPct: number },
  dietPreferences?: RecipeRecommendationRequest['dietPreferences']
): { score: number; reasons: string[] } {
  let score = 100;
  const reasons: string[] = [];
  
  // Get all ingredient names for matching
  const ingredientText = recipe.ingredients.map(i => i.item.toLowerCase()).join(' ');
  
  // Penalize for variance from targets
  score -= scaledVariance.caloriesPct * 2; // -2 points per % variance
  score -= scaledVariance.proteinPct * 3;  // -3 points per % protein variance
  
  // ============ DIETARY PREFERENCE MATCHING ============
  
  // MAJOR BONUS for containing emphasized foods (client specifically wants these!)
  if (dietPreferences?.foodsToEmphasize) {
    const emphasizedMatches = dietPreferences.foodsToEmphasize.filter(food => 
      ingredientText.includes(food.toLowerCase())
    );
    if (emphasizedMatches.length > 0) {
      score += 25; // Big bonus!
      reasons.push(`✓ Contains emphasized foods: ${emphasizedMatches.join(', ')}`);
    }
  }
  
  // Bonus for matching preferred proteins
  if (dietPreferences?.preferredProteins) {
    const proteinMatches = dietPreferences.preferredProteins.filter(p =>
      ingredientText.includes(p.toLowerCase())
    );
    if (proteinMatches.length > 0) {
      score += 15;
      reasons.push(`Uses preferred protein: ${proteinMatches[0]}`);
    }
  }
  
  // Bonus for matching preferred carbs
  if (dietPreferences?.preferredCarbs) {
    const carbMatches = dietPreferences.preferredCarbs.filter(c =>
      ingredientText.includes(c.toLowerCase())
    );
    if (carbMatches.length > 0) {
      score += 10;
      reasons.push(`Uses preferred carb: ${carbMatches[0]}`);
    }
  }
  
  // Bonus for matching preferred vegetables
  if (dietPreferences?.preferredVegetables) {
    const vegMatches = dietPreferences.preferredVegetables.filter(v =>
      ingredientText.includes(v.toLowerCase())
    );
    if (vegMatches.length > 0) {
      score += 8;
      reasons.push(`Includes preferred veggies`);
    }
  }
  
  // ============ WORKOUT TIMING ============
  
  // Bonus for workout timing match
  if (context.workoutRelation === 'pre-workout' && recipe.suitable_for_pre_workout) {
    score += 15;
    reasons.push('Great for pre-workout');
  }
  if (context.workoutRelation === 'post-workout' && recipe.suitable_for_post_workout) {
    score += 15;
    reasons.push('Ideal for post-workout recovery');
  }
  
  // Bonus for high protein on workout days
  if (context.isWorkoutDay && recipe.is_high_protein) {
    score += 10;
    reasons.push('High protein for workout day');
  }
  
  // ============ CONVENIENCE ============
  
  // Bonus for meal prep friendly
  if (recipe.is_meal_prep_friendly) {
    score += 5;
    reasons.push('Meal prep friendly');
  }
  
  // Bonus for quick prep
  if (recipe.is_quick_prep) {
    score += 3;
    reasons.push('Quick to prepare');
  }
  
  // ============ TIME OF DAY ============
  
  // Category matching for time of day
  if (context.timeOfDay === 'morning' && recipe.category.includes('breakfast')) {
    score += 10;
    reasons.push('Perfect for breakfast');
  }
  if (context.timeOfDay === 'evening' && recipe.category.includes('dinner')) {
    score += 10;
    reasons.push('Great for dinner');
  }
  
  // Snack appropriateness
  if (context.slotType === 'snack' && (recipe.tags.includes('snack') || recipe.calories < 300)) {
    score += 8;
    reasons.push('Suitable as a snack');
  }
  
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export async function POST(request: NextRequest) {
  try {
    const body: RecipeRecommendationRequest = await request.json();
    const { targetMacros, mealContext, dietPreferences, excludeRecipes, limit = 5 } = body;

    // Build the query - only get recipes with complete data (ingredients + directions)
    let query = supabase
      .from('ni_recipes')
      .select('*')
      .eq('is_active', true)
      .not('ingredients', 'is', null)
      .not('directions', 'is', null);

    // Filter by dietary restrictions
    if (dietPreferences?.dietaryPattern?.toLowerCase().includes('vegetarian')) {
      query = query.eq('is_vegetarian', true);
    }
    if (dietPreferences?.dietaryPattern?.toLowerCase().includes('vegan')) {
      query = query.eq('is_vegan', true);
    }
    
    // Exclude already used recipes
    if (excludeRecipes && excludeRecipes.length > 0) {
      query = query.not('slug', 'in', `(${excludeRecipes.join(',')})`);
    }

    // For pre-workout, prefer suitable recipes
    if (mealContext.workoutRelation === 'pre-workout') {
      query = query.order('suitable_for_pre_workout', { ascending: false });
    }
    if (mealContext.workoutRelation === 'post-workout') {
      query = query.order('suitable_for_post_workout', { ascending: false });
    }

    // Get recipes
    const { data: recipes, error } = await query.limit(50); // Get more to filter/rank

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
    }

    if (!recipes || recipes.length === 0) {
      return NextResponse.json({ 
        recipes: [],
        message: 'No matching recipes found' 
      });
    }

    // Process and rank recipes
    const processedRecipes: ScaledRecipe[] = [];
    
    // Combine all allergies
    const allAllergies = [
      ...(dietPreferences?.allergies || []),
      ...(dietPreferences?.customAllergies || []),
    ].filter(Boolean).map(a => a.toLowerCase());
    
    // Foods to avoid
    const foodsToAvoid = (dietPreferences?.foodsToAvoid || []).map(f => f.toLowerCase());

    for (const recipe of recipes) {
      // Skip recipes without complete ingredient/direction data
      if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
        console.log(`[Recipes] Skipping "${recipe.name}" - missing ingredients`);
        continue;
      }
      if (!recipe.directions || !Array.isArray(recipe.directions) || recipe.directions.length === 0) {
        console.log(`[Recipes] Skipping "${recipe.name}" - missing directions`);
        continue;
      }
      
      const ingredientText = JSON.stringify(recipe.ingredients).toLowerCase();
      const recipeName = recipe.name.toLowerCase();
      const allText = ingredientText + ' ' + recipeName;
      
      // ========== STRICT ALLERGY CHECK ==========
      // Allergies are CRITICAL - must filter these out completely
      if (allAllergies.length > 0) {
        const allergenFound = allAllergies.find(allergen => allText.includes(allergen));
        if (allergenFound) {
          console.log(`[Recipes] Excluding "${recipe.name}" - contains allergen: ${allergenFound}`);
          continue; // Skip this recipe entirely
        }
      }
      
      // ========== FOODS TO AVOID CHECK ==========
      // Client explicitly doesn't want these foods
      if (foodsToAvoid.length > 0) {
        const avoidedFound = foodsToAvoid.find(food => allText.includes(food));
        if (avoidedFound) {
          console.log(`[Recipes] Excluding "${recipe.name}" - contains avoided food: ${avoidedFound}`);
          continue; // Skip this recipe entirely
        }
      }
      
      // ========== DIETARY PATTERN CHECK ==========
      // Check vegetarian/vegan requirements
      if (dietPreferences?.dietaryPattern) {
        const pattern = dietPreferences.dietaryPattern.toLowerCase();
        if (pattern.includes('vegan') && !recipe.is_vegan) continue;
        if (pattern.includes('vegetarian') && !recipe.is_vegetarian) continue;
      }
      if (dietPreferences?.dietaryRestrictions) {
        const restrictions = dietPreferences.dietaryRestrictions.map(r => r.toLowerCase());
        if (restrictions.includes('vegan') && !recipe.is_vegan) continue;
        if (restrictions.includes('vegetarian') && !recipe.is_vegetarian) continue;
        if (restrictions.includes('gluten-free') && !recipe.is_gluten_free) continue;
        if (restrictions.includes('dairy-free') && !recipe.is_dairy_free) continue;
      }

      // Calculate optimal servings
      const optimalServings = calculateOptimalServings(
        { 
          calories: recipe.calories, 
          protein: recipe.protein, 
          carbs: recipe.carbs, 
          fat: recipe.fat 
        },
        targetMacros,
        mealContext.isWorkoutDay ? 'protein' : 'calories'
      );

      // Clamp servings to reasonable range
      const servings = Math.max(0.5, Math.min(3, optimalServings));

      // Calculate scaled nutrition
      const scaled = {
        servings: Math.round(servings * 10) / 10,
        calories: Math.round(recipe.calories * servings),
        protein: Math.round(recipe.protein * servings),
        carbs: Math.round(recipe.carbs * servings),
        fat: Math.round(recipe.fat * servings),
        fiber: Math.round(recipe.fiber * servings),
      };

      // Calculate variance
      const variance = {
        calories: scaled.calories - targetMacros.calories,
        protein: scaled.protein - targetMacros.protein,
        carbs: scaled.carbs - targetMacros.carbs,
        fat: scaled.fat - targetMacros.fat,
        caloriesPct: targetMacros.calories > 0 
          ? Math.abs(scaled.calories - targetMacros.calories) / targetMacros.calories * 100 
          : 0,
        proteinPct: targetMacros.protein > 0 
          ? Math.abs(scaled.protein - targetMacros.protein) / targetMacros.protein * 100 
          : 0,
      };

      // Skip if variance is too high (>30% off target calories)
      if (variance.caloriesPct > 30) continue;

      // Calculate match score
      const { score, reasons } = calculateMatchScore(
        {
          calories: recipe.calories,
          protein: recipe.protein,
          suitable_for_pre_workout: recipe.suitable_for_pre_workout,
          suitable_for_post_workout: recipe.suitable_for_post_workout,
          is_high_protein: recipe.is_high_protein,
          is_meal_prep_friendly: recipe.is_meal_prep_friendly,
          is_quick_prep: recipe.is_quick_prep,
          tags: recipe.tags || [],
          category: recipe.category,
          ingredients: recipe.ingredients || [],
        },
        mealContext,
        { caloriesPct: variance.caloriesPct, proteinPct: variance.proteinPct },
        dietPreferences
      );

      processedRecipes.push({
        id: recipe.id,
        slug: recipe.slug,
        name: recipe.name,
        cronometer_name: recipe.cronometer_name,
        category: recipe.category,
        tags: recipe.tags || [],
        original: {
          serving_size_g: recipe.serving_size_g,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          fiber: recipe.fiber,
        },
        scaled,
        variance,
        ingredients: recipe.ingredients,
        directions: recipe.directions,
        image_url: recipe.image_url,
        matchScore: Math.round(score),
        matchReasons: reasons,
        is_high_protein: recipe.is_high_protein,
        is_low_carb: recipe.is_low_carb,
        is_meal_prep_friendly: recipe.is_meal_prep_friendly,
        is_quick_prep: recipe.is_quick_prep,
      });
    }

    // Sort by match score (highest first)
    processedRecipes.sort((a, b) => b.matchScore - a.matchScore);

    // Return top results
    return NextResponse.json({
      recipes: processedRecipes.slice(0, limit),
      total: processedRecipes.length,
      targetMacros,
    });

  } catch (error) {
    console.error('Recipe recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}

// GET endpoint for simple search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const highProtein = searchParams.get('highProtein') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    let dbQuery = supabase
      .from('ni_recipes')
      .select('id, slug, name, category, calories, protein, carbs, fat, tags, image_url, is_high_protein, is_meal_prep_friendly')
      .eq('is_active', true);

    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,tags.cs.{${query.toLowerCase()}}`);
    }

    if (category) {
      dbQuery = dbQuery.ilike('category', `%${category}%`);
    }

    if (highProtein) {
      dbQuery = dbQuery.eq('is_high_protein', true);
    }

    const { data, error } = await dbQuery.limit(limit);

    if (error) {
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    return NextResponse.json({ recipes: data });
  } catch (error) {
    console.error('Recipe search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
