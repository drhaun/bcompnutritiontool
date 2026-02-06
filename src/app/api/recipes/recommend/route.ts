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
    recipe_servings: number; // How many servings the full recipe makes
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
  // Recipe details - already scaled to per-serving amounts
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
  // Substitution info (new - for soft filtering)
  complianceStatus: 'strict' | 'adaptable' | 'excluded';
  substitutionSuggestions?: string[];
}

// ============ SUBSTITUTION MAP ============
// Common ingredient substitutions for dietary restrictions
const SUBSTITUTION_MAP: Record<string, { pattern: RegExp; alternatives: string[]; restriction: string }[]> = {
  'gluten-free': [
    { pattern: /\b(wheat|bread|pasta|flour)\b/i, alternatives: ['gluten-free alternative', 'almond flour', 'rice flour', 'gluten-free pasta'], restriction: 'gluten-free' },
    { pattern: /\b(soy sauce)\b/i, alternatives: ['tamari', 'coconut aminos'], restriction: 'gluten-free' },
    { pattern: /\b(tortilla)\b/i, alternatives: ['corn tortilla', 'lettuce wrap'], restriction: 'gluten-free' },
    { pattern: /\b(oats|oatmeal)\b/i, alternatives: ['certified gluten-free oats'], restriction: 'gluten-free' },
    { pattern: /\b(breadcrumbs)\b/i, alternatives: ['almond flour', 'crushed pork rinds', 'gluten-free breadcrumbs'], restriction: 'gluten-free' },
  ],
  'dairy-free': [
    { pattern: /\b(milk|cream)\b/i, alternatives: ['almond milk', 'coconut milk', 'oat milk'], restriction: 'dairy-free' },
    { pattern: /\b(cheese|parmesan)\b/i, alternatives: ['nutritional yeast', 'dairy-free cheese'], restriction: 'dairy-free' },
    { pattern: /\b(butter)\b/i, alternatives: ['olive oil', 'coconut oil', 'vegan butter'], restriction: 'dairy-free' },
    { pattern: /\b(yogurt|greek yogurt)\b/i, alternatives: ['coconut yogurt', 'dairy-free yogurt'], restriction: 'dairy-free' },
    { pattern: /\b(sour cream)\b/i, alternatives: ['cashew cream', 'dairy-free sour cream'], restriction: 'dairy-free' },
  ],
  'low-carb': [
    { pattern: /\b(rice)\b/i, alternatives: ['cauliflower rice', 'riced broccoli'], restriction: 'low-carb' },
    { pattern: /\b(potato)\b/i, alternatives: ['cauliflower', 'turnip', 'radishes'], restriction: 'low-carb' },
    { pattern: /\b(bread|tortilla)\b/i, alternatives: ['lettuce wrap', 'low-carb tortilla'], restriction: 'low-carb' },
    { pattern: /\b(pasta|noodles)\b/i, alternatives: ['zucchini noodles', 'shirataki noodles', 'spaghetti squash'], restriction: 'low-carb' },
  ],
  'keto': [
    { pattern: /\b(rice)\b/i, alternatives: ['cauliflower rice'], restriction: 'keto' },
    { pattern: /\b(potato)\b/i, alternatives: ['cauliflower mash', 'turnip'], restriction: 'keto' },
    { pattern: /\b(bread)\b/i, alternatives: ['cloud bread', 'lettuce wrap'], restriction: 'keto' },
    { pattern: /\b(sugar)\b/i, alternatives: ['erythritol', 'stevia', 'monk fruit'], restriction: 'keto' },
    { pattern: /\b(honey|maple syrup)\b/i, alternatives: ['sugar-free syrup', 'stevia'], restriction: 'keto' },
  ],
};

// Check if a recipe can be adapted for dietary restrictions
function checkSubstitutions(
  ingredientText: string,
  restrictions: string[]
): { canAdapt: boolean; suggestions: string[] } {
  const suggestions: string[] = [];
  
  for (const restriction of restrictions) {
    const restrictionSubs = SUBSTITUTION_MAP[restriction.toLowerCase()];
    if (!restrictionSubs) continue;
    
    for (const sub of restrictionSubs) {
      if (sub.pattern.test(ingredientText)) {
        const matched = ingredientText.match(sub.pattern)?.[0] || 'ingredient';
        suggestions.push(`Replace ${matched} with ${sub.alternatives[0]} (for ${restriction})`);
      }
    }
  }
  
  return {
    canAdapt: suggestions.length > 0,
    suggestions,
  };
}

// Get the number of servings the full recipe makes
// Uses the database column if available, otherwise falls back to estimation
function getRecipeServings(
  recipe: { 
    recipe_servings?: number | null; 
    serving_size_g?: number | null;
    calories: number;
    ingredients: { item: string; amount: string }[];
  }
): number {
  // If database has explicit servings, use that (preferred!)
  if (recipe.recipe_servings && recipe.recipe_servings > 0) {
    return recipe.recipe_servings;
  }
  
  // Fallback: Estimate based on ingredient quantities
  // Look for common bulk indicators in ingredients
  let estimatedServings = 1;
  
  for (const ing of recipe.ingredients || []) {
    const amount = ing.amount?.toLowerCase() || '';
    const item = ing.item?.toLowerCase() || '';
    
    // Protein indicators (chicken, beef, etc.)
    if (item.includes('chicken') || item.includes('beef') || item.includes('pork') || 
        item.includes('turkey') || item.includes('fish') || item.includes('salmon')) {
      // Parse the amount
      const lbMatch = amount.match(/([\d.]+)\s*(lb|lbs|pound|pounds)/i);
      const ozMatch = amount.match(/([\d.]+)\s*(oz|ounce|ounces)/i);
      const gMatch = amount.match(/([\d.]+)\s*(g|gram|grams)/i);
      
      if (lbMatch) {
        const lbs = parseFloat(lbMatch[1]);
        // 4oz (113g) is typical serving of protein
        // 1 lb = 16oz = ~4 servings
        estimatedServings = Math.max(estimatedServings, Math.round(lbs * 4));
      } else if (ozMatch) {
        const oz = parseFloat(ozMatch[1]);
        estimatedServings = Math.max(estimatedServings, Math.round(oz / 4));
      } else if (gMatch) {
        const g = parseFloat(gMatch[1]);
        // ~115g per serving
        estimatedServings = Math.max(estimatedServings, Math.round(g / 115));
      }
    }
    
    // Rice/grain indicators
    if (item.includes('rice') || item.includes('pasta') || item.includes('quinoa')) {
      const cupMatch = amount.match(/([\d.]+)\s*(cup|cups)/i);
      if (cupMatch) {
        const cups = parseFloat(cupMatch[1]);
        // 1 cup cooked is about 1 serving, but dry rice expands 3x
        if (amount.includes('dry') || amount.includes('uncooked')) {
          estimatedServings = Math.max(estimatedServings, Math.round(cups * 3));
        } else {
          estimatedServings = Math.max(estimatedServings, Math.round(cups));
        }
      }
    }
  }
  
  // Sanity check - most recipes make 2-6 servings
  return Math.max(1, Math.min(8, estimatedServings));
}

// Scale ingredient amounts to per-serving
function scaleIngredientsToPerServing(
  ingredients: { item: string; amount: string }[],
  recipeServings: number
): { item: string; amount: string }[] {
  if (recipeServings <= 1) return ingredients;
  
  return ingredients.map(ing => {
    const amount = ing.amount || '';
    
    // Try to parse the amount and scale it down
    const numMatch = amount.match(/^([\d.\/]+)\s*(.*)$/);
    if (numMatch) {
      let value: number;
      // Handle fractions like 1/2
      if (numMatch[1].includes('/')) {
        const parts = numMatch[1].split('/');
        value = parseFloat(parts[0]) / parseFloat(parts[1]);
      } else {
        value = parseFloat(numMatch[1]) || 1;
      }
      
      // Scale down to per-serving
      const scaledValue = value / recipeServings;
      const unit = numMatch[2]?.trim() || '';
      
      // Format nicely
      if (scaledValue >= 1) {
        return { item: ing.item, amount: `${Math.round(scaledValue * 10) / 10} ${unit}`.trim() };
      } else if (scaledValue >= 0.25) {
        // Convert to fractions for readability
        if (scaledValue >= 0.75) return { item: ing.item, amount: `3/4 ${unit}`.trim() };
        if (scaledValue >= 0.5) return { item: ing.item, amount: `1/2 ${unit}`.trim() };
        if (scaledValue >= 0.33) return { item: ing.item, amount: `1/3 ${unit}`.trim() };
        return { item: ing.item, amount: `1/4 ${unit}`.trim() };
      } else {
        return { item: ing.item, amount: `${Math.round(scaledValue * 100) / 100} ${unit}`.trim() };
      }
    }
    
    return ing;
  });
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
      // Check vegetarian/vegan requirements (these are STRICT - can't substitute meat)
      if (dietPreferences?.dietaryPattern) {
        const pattern = dietPreferences.dietaryPattern.toLowerCase();
        if (pattern.includes('vegan') && !recipe.is_vegan) continue;
        if (pattern.includes('vegetarian') && !recipe.is_vegetarian) continue;
      }
      
      // Track compliance status and substitution suggestions
      let complianceStatus: 'strict' | 'adaptable' | 'excluded' = 'strict';
      let substitutionSuggestions: string[] = [];
      
      if (dietPreferences?.dietaryRestrictions) {
        const restrictions = dietPreferences.dietaryRestrictions.map(r => r.toLowerCase());
        
        // Vegan/vegetarian are strict (can't substitute meat/animal products easily)
        if (restrictions.includes('vegan') && !recipe.is_vegan) continue;
        if (restrictions.includes('vegetarian') && !recipe.is_vegetarian) continue;
        
        // For gluten-free and dairy-free, check if adaptable with substitutions
        const softRestrictions = restrictions.filter(r => 
          ['gluten-free', 'dairy-free', 'low-carb', 'keto'].includes(r)
        );
        
        for (const restriction of softRestrictions) {
          const isCompliant = 
            (restriction === 'gluten-free' && recipe.is_gluten_free) ||
            (restriction === 'dairy-free' && recipe.is_dairy_free) ||
            (restriction === 'low-carb' && recipe.is_low_carb);
          
          if (!isCompliant) {
            // Check if we can suggest substitutions
            const { canAdapt, suggestions } = checkSubstitutions(ingredientText, [restriction]);
            if (canAdapt) {
              complianceStatus = 'adaptable';
              substitutionSuggestions.push(...suggestions);
            } else {
              // No easy substitution available - still include but note it
              complianceStatus = 'adaptable';
              substitutionSuggestions.push(`Consider ${restriction} alternatives for this recipe`);
            }
          }
        }
      }

      // Get how many servings the full recipe makes (from DB or estimate)
      const recipeServings = getRecipeServings({
        recipe_servings: recipe.recipe_servings,
        serving_size_g: recipe.serving_size_g,
        calories: recipe.calories,
        ingredients: recipe.ingredients,
      });
      
      // Scale ingredients to per-serving amounts
      const perServingIngredients = scaleIngredientsToPerServing(
        recipe.ingredients,
        recipeServings
      );
      
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
      let { score, reasons } = calculateMatchScore(
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

      // Adjust score based on compliance status
      if (complianceStatus === 'strict') {
        score += 10; // Bonus for strictly compliant recipes
        reasons.push('✓ Fully compliant with dietary restrictions');
      } else if (complianceStatus === 'adaptable') {
        // Slight penalty but still include
        score -= 5;
        reasons.push('⚠️ Can be adapted with substitutions');
      }

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
          recipe_servings: recipeServings, // How many servings the full recipe makes
        },
        scaled,
        variance,
        ingredients: perServingIngredients, // Now scaled to per-serving amounts!
        directions: recipe.directions,
        image_url: recipe.image_url,
        matchScore: Math.round(score),
        matchReasons: reasons,
        is_high_protein: recipe.is_high_protein,
        is_low_carb: recipe.is_low_carb,
        is_meal_prep_friendly: recipe.is_meal_prep_friendly,
        is_quick_prep: recipe.is_quick_prep,
        complianceStatus,
        substitutionSuggestions: substitutionSuggestions.length > 0 ? substitutionSuggestions : undefined,
      });
    }

    // Sort by match score (highest first), but prioritize strict compliance
    processedRecipes.sort((a, b) => {
      // First sort by compliance (strict > adaptable)
      if (a.complianceStatus === 'strict' && b.complianceStatus !== 'strict') return -1;
      if (b.complianceStatus === 'strict' && a.complianceStatus !== 'strict') return 1;
      // Then by match score
      return b.matchScore - a.matchScore;
    });

    // Count compliance types for user feedback
    const strictCount = processedRecipes.filter(r => r.complianceStatus === 'strict').length;
    const adaptableCount = processedRecipes.filter(r => r.complianceStatus === 'adaptable').length;

    // Return top results with metadata about filtering
    return NextResponse.json({
      recipes: processedRecipes.slice(0, limit),
      total: processedRecipes.length,
      targetMacros,
      filteringSummary: {
        strictlyCompliant: strictCount,
        adaptableWithSubstitutions: adaptableCount,
        hasActiveRestrictions: (dietPreferences?.dietaryRestrictions?.length || 0) > 0,
        message: adaptableCount > 0 
          ? `Found ${strictCount} fully compliant recipes and ${adaptableCount} that can be adapted with simple substitutions.`
          : undefined,
      },
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
