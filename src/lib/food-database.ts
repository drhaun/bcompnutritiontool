/**
 * Food Database Service
 * Primary: Supabase (curated foods database)
 * Fallback: USDA FoodData Central API
 * https://fdc.nal.usda.gov/api-guide.html
 */

import { searchFoodsInDb, dbFoodToFoodItem, isSupabaseConfigured } from './supabase';

export interface FoodNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface FoodItem {
  fdcId: number;
  description: string;
  brandName?: string;
  servingSize: number;      // in grams
  servingSizeUnit: string;
  householdServing?: string; // e.g., "1 cup", "1 medium"
  nutrients: FoodNutrients; // per 100g
  category: 'protein' | 'carbs' | 'fats' | 'vegetables' | 'dairy' | 'fruit' | 'grain' | 'other';
  dataType: 'Foundation' | 'SR Legacy' | 'Branded' | 'Survey';
}

export interface ScaledFood extends FoodItem {
  scaledAmount: number;      // grams needed
  scaledNutrients: FoodNutrients;
  displayAmount: string;     // "150g" or "1.5 cups"
}

export interface MealTemplate {
  name: string;
  foods: {
    foodId: number;
    role: 'primary_protein' | 'primary_carb' | 'fat_source' | 'vegetable' | 'flavor' | 'other';
    defaultProportion: number; // % of meal macros this food provides
  }[];
  prepTime: string;
  instructions: string[];
  cuisineType?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  tags: string[];
}

// Cache for food lookups (with short TTL for development)
const foodCache = new Map<number, FoodItem>();
const searchCache = new Map<string, FoodItem[]>();

// Clear caches periodically (every 5 minutes) to pick up fixes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    foodCache.clear();
    searchCache.clear();
  }, 5 * 60 * 1000);
}

// USDA FoodData Central nutrient IDs
const NUTRIENT_IDS = {
  energy: 1008,      // kcal
  protein: 1003,     // g
  carbs: 1005,       // g
  fat: 1004,         // g
  fiber: 1079,       // g
  sugar: 2000,       // g
  sodium: 1093,      // mg
};

/**
 * Search for foods
 * Priority: 1) Supabase curated DB, 2) Local fallback, 3) USDA API
 */
export async function searchFoods(
  query: string,
  options: {
    dataType?: ('Foundation' | 'SR Legacy' | 'Branded' | 'Survey')[];
    pageSize?: number;
    category?: string;
    preferRaw?: boolean;
  } = {}
): Promise<FoodItem[]> {
  const cacheKey = `${query}-${JSON.stringify(options)}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  // 1. First try Supabase curated database (fastest, most accurate)
  if (isSupabaseConfigured) {
    try {
      const supabaseFoods = await searchFoodsInDb(query, {
        category: options.category,
        limit: options.pageSize || 25,
        verified_only: false,
      });
      
      if (supabaseFoods.length > 0) {
        const foods = supabaseFoods.map(dbFoodToFoodItem);
        searchCache.set(cacheKey, foods);
        return foods;
      }
    } catch (error) {
      console.warn('Supabase search failed, falling back:', error);
    }
  }

  // 2. Check local fallback foods - curated common ingredients
  const fallbackMatches = getFallbackFoods(query);
  if (fallbackMatches.length > 0 && options.preferRaw !== false) {
    const queryWords = query.toLowerCase().split(' ');
    const exactMatch = fallbackMatches.find(f => 
      queryWords.every(w => f.description.toLowerCase().includes(w))
    );
    if (exactMatch) {
      return [exactMatch, ...fallbackMatches.filter(f => f !== exactMatch)];
    }
  }

  const apiKey = process.env.USDA_API_KEY || process.env.NEXT_PUBLIC_USDA_API_KEY;
  if (!apiKey) {
    console.warn('USDA API key not configured, using fallback data');
    return fallbackMatches;
  }

  try {
    // Prioritize Foundation and SR Legacy (whole foods) over Branded
    const params = new URLSearchParams({
      api_key: apiKey,
      query,
      pageSize: String(options.pageSize || 50), // Get more to filter
      dataType: (options.dataType || ['Foundation', 'SR Legacy']).join(','),
    });

    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?${params}`
    );

    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data = await response.json();
    let foods = data.foods?.map(parseUSDAFood).filter(Boolean) as FoodItem[];
    
    // Filter out processed/breaded/fried versions when looking for raw ingredients
    if (options.preferRaw !== false) {
      const processedTerms = ['breaded', 'fried', 'battered', 'nugget', 'patty', 'spread', 'meatless', 'imitation', 'flavored', 'canned', 'dried'];
      const queryLower = query.toLowerCase();
      
      // Check if this is a grain/carb search where we want COOKED versions
      const isGrainSearch = ['rice', 'quinoa', 'oats', 'pasta', 'noodle', 'barley', 'bulgur', 'couscous', 'farro'].some(g => queryLower.includes(g));
      const wantsCooked = queryLower.includes('cooked') || queryLower.includes('prepared');
      
      // Score foods based on query context
      foods = foods.map(f => {
        let score = 0;
        const desc = f.description.toLowerCase();
        
        // Penalize processed foods
        processedTerms.forEach(term => {
          if (desc.includes(term)) score -= 10;
        });
        
        // For grains - STRONGLY prefer cooked over raw
        if (isGrainSearch || wantsCooked) {
          if (desc.includes('cooked')) score += 20;
          else if (desc.includes('raw') || desc.includes('dry') || desc.includes('uncooked')) score -= 15;
        } else {
          // For proteins/vegetables - prefer raw or simple preparations
          const rawTerms = ['raw', 'fresh', 'plain'];
          rawTerms.forEach(term => {
            if (desc.includes(term)) score += 5;
          });
          // Cooked preparations are ok too
          const cookedTerms = ['cooked', 'baked', 'grilled', 'roasted'];
          cookedTerms.forEach(term => {
            if (desc.includes(term)) score += 3;
          });
        }
        
        // Prefer Foundation data type (most accurate)
        if (f.dataType === 'Foundation') score += 3;
        if (f.dataType === 'SR Legacy') score += 2;
        
        // Bonus if description closely matches query
        const queryWords = queryLower.split(' ').filter(w => w.length > 2);
        const matchingWords = queryWords.filter(w => desc.includes(w));
        score += matchingWords.length * 2;
        
        return { ...f, _score: score };
      }).sort((a, b) => (b as FoodItem & {_score: number})._score - (a as FoodItem & {_score: number})._score);
    }
    
    // Combine with fallback matches (fallback first as they're curated)
    const combined = [...fallbackMatches, ...foods.filter(f => 
      !fallbackMatches.some(fb => fb.fdcId === f.fdcId)
    )].slice(0, options.pageSize || 25);
    
    searchCache.set(cacheKey, combined);
    return combined;
  } catch (error) {
    console.error('Food search error:', error);
    return fallbackMatches;
  }
}

/**
 * Get detailed food info by FDC ID
 */
export async function getFoodById(fdcId: number): Promise<FoodItem | null> {
  if (foodCache.has(fdcId)) {
    return foodCache.get(fdcId)!;
  }

  const apiKey = process.env.USDA_API_KEY || process.env.NEXT_PUBLIC_USDA_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data = await response.json();
    const food = parseUSDAFood(data);
    
    if (food) {
      foodCache.set(fdcId, food);
    }
    return food;
  } catch (error) {
    console.error('Food lookup error:', error);
    return null;
  }
}

/**
 * Parse USDA API response into our format
 */
function parseUSDAFood(data: Record<string, unknown>): FoodItem | null {
  if (!data) return null;

  const getNutrient = (id: number): number => {
    const nutrients = (data.foodNutrients || []) as Array<{
      nutrientId?: number;
      nutrient?: { id: number };
      amount?: number;
      value?: number;
    }>;
    const nutrient = nutrients.find(
      n => (n.nutrientId || n.nutrient?.id) === id
    );
    return nutrient?.amount ?? nutrient?.value ?? 0;
  };

  let calories = getNutrient(NUTRIENT_IDS.energy);
  const protein = getNutrient(NUTRIENT_IDS.protein);
  const carbs = getNutrient(NUTRIENT_IDS.carbs);
  const fat = getNutrient(NUTRIENT_IDS.fat);

  // Skip foods with no macro data
  if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
    return null;
  }

  // Calculate calories from macros if not provided (common with Foundation data)
  if (calories === 0 && (protein > 0 || carbs > 0 || fat > 0)) {
    calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  }

  return {
    fdcId: data.fdcId as number,
    description: data.description as string,
    brandName: data.brandName as string | undefined,
    servingSize: (data.servingSize as number) || 100,
    servingSizeUnit: (data.servingSizeUnit as string) || 'g',
    householdServing: data.householdServingFullText as string | undefined,
    nutrients: {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round(getNutrient(NUTRIENT_IDS.fiber) * 10) / 10,
      sugar: Math.round(getNutrient(NUTRIENT_IDS.sugar) * 10) / 10,
      sodium: Math.round(getNutrient(NUTRIENT_IDS.sodium)),
    },
    category: categorizeFood(data.description as string, data.foodCategory as string),
    dataType: data.dataType as FoodItem['dataType'],
  };
}

/**
 * Categorize food based on description
 */
function categorizeFood(description: string, category?: string): FoodItem['category'] {
  const desc = (description + ' ' + (category || '')).toLowerCase();
  
  if (/chicken|beef|pork|fish|salmon|tuna|shrimp|turkey|egg|tofu|tempeh|seitan/.test(desc)) {
    return 'protein';
  }
  if (/rice|pasta|bread|oat|cereal|quinoa|potato|sweet potato/.test(desc)) {
    return 'carbs';
  }
  if (/oil|butter|avocado|nut|almond|peanut|olive/.test(desc)) {
    return 'fats';
  }
  if (/milk|cheese|yogurt|cream/.test(desc)) {
    return 'dairy';
  }
  if (/apple|banana|berry|orange|grape|mango|fruit/.test(desc)) {
    return 'fruit';
  }
  if (/spinach|broccoli|carrot|lettuce|kale|pepper|onion|tomato|vegetable/.test(desc)) {
    return 'vegetables';
  }
  
  return 'other';
}

/**
 * Calculate exact portion size to hit target macros
 * Uses linear optimization to find best serving sizes
 */
export function calculatePortions(
  foods: FoodItem[],
  targetMacros: FoodNutrients,
  options: {
    primaryMacro?: 'calories' | 'protein' | 'carbs' | 'fat';
    minPortionG?: number;
    maxPortionG?: number;
  } = {}
): ScaledFood[] {
  const {
    primaryMacro = 'protein',
    minPortionG = 20,
    maxPortionG = 500,
  } = options;

  if (foods.length === 0) return [];

  // For single food, scale to hit primary macro
  if (foods.length === 1) {
    const food = foods[0];
    const per100g = food.nutrients[primaryMacro];
    if (per100g === 0) {
      return [scaleFood(food, 100)]; // Default to 100g if no data
    }
    const targetValue = targetMacros[primaryMacro];
    const grams = Math.min(maxPortionG, Math.max(minPortionG, (targetValue / per100g) * 100));
    return [scaleFood(food, grams)];
  }

  // For multiple foods, use role-based allocation
  // Primary protein source gets scaled to hit protein target
  // Primary carb source gets scaled to hit remaining carbs
  // Fat source adjusts for remaining fat
  
  const result: ScaledFood[] = [];
  let remainingMacros = { ...targetMacros };

  // Sort by category priority
  const sortedFoods = [...foods].sort((a, b) => {
    const priority: Record<string, number> = {
      protein: 1,
      carbs: 2,
      fats: 3,
      dairy: 4,
      vegetables: 5,
      fruit: 6,
      grain: 7,
      other: 8,
    };
    return (priority[a.category] || 99) - (priority[b.category] || 99);
  });

  for (const food of sortedFoods) {
    // Determine which macro to optimize for based on category
    let optimizeMacro: keyof FoodNutrients = 'calories';
    if (food.category === 'protein' || food.category === 'dairy') {
      optimizeMacro = 'protein';
    } else if (food.category === 'carbs' || food.category === 'grain' || food.category === 'fruit') {
      optimizeMacro = 'carbs';
    } else if (food.category === 'fats') {
      optimizeMacro = 'fat';
    }

    const per100g = food.nutrients[optimizeMacro];
    if (per100g === 0) {
      result.push(scaleFood(food, 50)); // Default small portion
      continue;
    }

    // Calculate portion to hit target (but limit to max)
    const targetValue = Math.max(0, remainingMacros[optimizeMacro]);
    let grams = (targetValue / per100g) * 100;
    grams = Math.min(maxPortionG, Math.max(minPortionG, grams));

    const scaled = scaleFood(food, grams);
    result.push(scaled);

    // Subtract from remaining
    remainingMacros.calories -= scaled.scaledNutrients.calories;
    remainingMacros.protein -= scaled.scaledNutrients.protein;
    remainingMacros.carbs -= scaled.scaledNutrients.carbs;
    remainingMacros.fat -= scaled.scaledNutrients.fat;
  }

  return result;
}

/**
 * Scale a food to a specific gram amount
 */
export function scaleFood(food: FoodItem, grams: number): ScaledFood {
  const scale = grams / 100;
  
  return {
    ...food,
    scaledAmount: Math.round(grams),
    scaledNutrients: {
      calories: Math.round(food.nutrients.calories * scale),
      protein: Math.round(food.nutrients.protein * scale * 10) / 10,
      carbs: Math.round(food.nutrients.carbs * scale * 10) / 10,
      fat: Math.round(food.nutrients.fat * scale * 10) / 10,
      fiber: food.nutrients.fiber ? Math.round(food.nutrients.fiber * scale * 10) / 10 : undefined,
      sugar: food.nutrients.sugar ? Math.round(food.nutrients.sugar * scale * 10) / 10 : undefined,
      sodium: food.nutrients.sodium ? Math.round(food.nutrients.sodium * scale) : undefined,
    },
    displayAmount: formatAmount(grams, food.householdServing),
  };
}

/**
 * Format gram amount to human-readable
 */
function formatAmount(grams: number, householdServing?: string): string {
  // If we have household serving info, try to convert
  if (householdServing) {
    // Parse "1 cup (240g)" format
    const match = householdServing.match(/([0-9.]+)\s*(\w+)\s*\((\d+)g?\)/);
    if (match) {
      const [, qty, unit, refGrams] = match;
      const servings = grams / parseInt(refGrams);
      if (servings >= 0.25 && servings <= 4) {
        return `${formatFraction(servings)} ${unit}`;
      }
    }
  }
  
  return `${Math.round(grams)}g`;
}

/**
 * Format decimal to fraction for display
 */
function formatFraction(n: number): string {
  if (Math.abs(n - Math.round(n)) < 0.1) return String(Math.round(n));
  if (Math.abs(n - 0.25) < 0.05) return '¼';
  if (Math.abs(n - 0.33) < 0.05) return '⅓';
  if (Math.abs(n - 0.5) < 0.05) return '½';
  if (Math.abs(n - 0.67) < 0.05) return '⅔';
  if (Math.abs(n - 0.75) < 0.05) return '¾';
  if (Math.abs(n - 1.5) < 0.1) return '1½';
  return n.toFixed(1);
}

/**
 * Find similar foods for swapping (same category, similar macros)
 */
export async function findSimilarFoods(
  food: FoodItem,
  options: { maxResults?: number } = {}
): Promise<FoodItem[]> {
  const { maxResults = 10 } = options;
  
  // Search for foods in same category
  const categoryTerms: Record<string, string> = {
    protein: 'chicken breast fish salmon',
    carbs: 'rice potato bread',
    fats: 'avocado olive oil nuts',
    vegetables: 'broccoli spinach vegetables',
    dairy: 'yogurt cheese milk',
    fruit: 'banana apple berries',
    grain: 'oats quinoa bread',
    other: food.description.split(' ')[0],
  };

  const searchTerm = categoryTerms[food.category] || food.category;
  const results = await searchFoods(searchTerm, { pageSize: maxResults * 2 });
  
  // Filter to similar macro profile and exclude original
  return results
    .filter(f => f.fdcId !== food.fdcId)
    .filter(f => {
      // Similar protein density (within 50%)
      const proteinRatio = f.nutrients.protein / Math.max(food.nutrients.protein, 1);
      return proteinRatio > 0.5 && proteinRatio < 1.5;
    })
    .slice(0, maxResults);
}

/**
 * Adjust meal for nutrient timing (pre/post workout)
 */
export function adjustForNutrientTiming(
  targetMacros: FoodNutrients,
  timing: 'pre-workout' | 'post-workout' | 'none',
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain' | 'performance'
): FoodNutrients {
  if (timing === 'none') return targetMacros;
  
  const adjusted = { ...targetMacros };
  
  if (timing === 'pre-workout') {
    // Pre-workout: Higher carbs, moderate protein, lower fat
    // Carbs for energy, lower fat for faster digestion
    adjusted.carbs = Math.round(adjusted.carbs * 1.2);  // +20% carbs
    adjusted.fat = Math.round(adjusted.fat * 0.7);      // -30% fat
    // Recalculate calories
    adjusted.calories = Math.round(
      adjusted.protein * 4 + adjusted.carbs * 4 + adjusted.fat * 9
    );
  } else if (timing === 'post-workout') {
    // Post-workout: Higher protein and carbs for recovery
    adjusted.protein = Math.round(adjusted.protein * 1.25); // +25% protein
    adjusted.carbs = Math.round(adjusted.carbs * 1.15);     // +15% carbs
    adjusted.fat = Math.round(adjusted.fat * 0.8);          // -20% fat
    // Recalculate calories
    adjusted.calories = Math.round(
      adjusted.protein * 4 + adjusted.carbs * 4 + adjusted.fat * 9
    );
  }
  
  return adjusted;
}

// ============ FALLBACK DATA ============
// Common foods with accurate USDA data for when API is unavailable

const COMMON_FOODS: FoodItem[] = [
  {
    fdcId: 171705,
    description: 'Chicken breast, boneless, skinless, raw',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '1 breast (172g)',
    nutrients: { calories: 120, protein: 22.5, carbs: 0, fat: 2.6 },
    category: 'protein',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 168917,
    description: 'Salmon, Atlantic, raw',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '1 fillet (198g)',
    nutrients: { calories: 208, protein: 20.4, carbs: 0, fat: 13.4 },
    category: 'protein',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 173424,
    description: 'Egg, whole, raw',
    servingSize: 50,
    servingSizeUnit: 'g',
    householdServing: '1 large (50g)',
    nutrients: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 },
    category: 'protein',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 168880,
    description: 'Rice, white, long grain, cooked',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '1 cup (158g)',
    nutrients: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
    category: 'carbs',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 170285,
    description: 'Sweet potato, cooked, baked',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '1 medium (114g)',
    nutrients: { calories: 90, protein: 2, carbs: 20.7, fat: 0.1 },
    category: 'carbs',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 168875,
    description: 'Oats, regular and quick, dry',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '½ cup dry (40g)',
    nutrients: { calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
    category: 'carbs',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 171706,
    description: 'Greek yogurt, plain, nonfat',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '1 container (170g)',
    nutrients: { calories: 59, protein: 10.2, carbs: 3.6, fat: 0.7 },
    category: 'dairy',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 171411,
    description: 'Avocado, raw',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '1 avocado (201g)',
    nutrients: { calories: 160, protein: 2, carbs: 8.5, fat: 14.7 },
    category: 'fats',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 172336,
    description: 'Olive oil',
    servingSize: 100,
    servingSizeUnit: 'ml',
    householdServing: '1 tbsp (14ml)',
    nutrients: { calories: 884, protein: 0, carbs: 0, fat: 100 },
    category: 'fats',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 170407,
    description: 'Almonds, raw',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '¼ cup (36g)',
    nutrients: { calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9 },
    category: 'fats',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 170379,
    description: 'Broccoli, raw',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '1 cup chopped (91g)',
    nutrients: { calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4 },
    category: 'vegetables',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 168462,
    description: 'Spinach, raw',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '1 cup (30g)',
    nutrients: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
    category: 'vegetables',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 173944,
    description: 'Banana, raw',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '1 medium (118g)',
    nutrients: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
    category: 'fruit',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 171711,
    description: 'Blueberries, raw',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '1 cup (148g)',
    nutrients: { calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3 },
    category: 'fruit',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 175167,
    description: 'Beef, ground, 90% lean, cooked',
    servingSize: 100,
    servingSizeUnit: 'g',
    nutrients: { calories: 217, protein: 26.1, carbs: 0, fat: 11.7 },
    category: 'protein',
    dataType: 'SR Legacy',
  },
  {
    fdcId: 173757,
    description: 'Pasta, whole wheat, cooked',
    servingSize: 100,
    servingSizeUnit: 'g',
    householdServing: '1 cup (140g)',
    nutrients: { calories: 124, protein: 5.3, carbs: 26.5, fat: 0.5 },
    category: 'carbs',
    dataType: 'SR Legacy',
  },
];

function getFallbackFoods(query: string): FoodItem[] {
  const q = query.toLowerCase();
  return COMMON_FOODS.filter(f => 
    f.description.toLowerCase().includes(q) ||
    f.category.includes(q)
  );
}

export { COMMON_FOODS };
