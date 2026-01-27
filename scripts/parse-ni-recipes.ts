/**
 * Parser for Nutrition Insiders Recipes CSV
 * 
 * This script parses the ni_recipes_126.csv file and generates SQL insert statements
 * to seed the ni_recipes table in Supabase.
 * 
 * Usage: npx ts-node scripts/parse-ni-recipes.ts /path/to/ni_recipes_126.csv
 */

import * as fs from 'fs';
import * as path from 'path';

interface ParsedRecipe {
  slug: string;
  name: string;
  cronometer_name: string | null;
  category: string;
  tags: string[];
  serving_size_g: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  ingredients: { item: string; amount: string }[];
  directions: string[];
  description: string;
  image_url: string | null;
  suitable_for_pre_workout: boolean;
  suitable_for_post_workout: boolean;
  is_high_protein: boolean;
  is_low_carb: boolean;
  is_low_fat: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_dairy_free: boolean;
  is_meal_prep_friendly: boolean;
  is_quick_prep: boolean;
}

// Parse nutrition data from HTML content
function parseNutritionData(html: string): {
  serving_size_g: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
} {
  // Default values
  const result = {
    serving_size_g: null as number | null,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };

  // Try different patterns for nutrition data
  // Pattern 1: "1 Serving: 114 g, Calories: 389, Fat: 11 g, Carbohydrates: 39 g, Fiber: 5 g, Protein: 35 g"
  // Pattern 2: "1 burrito, 493 calories, 29 g carbs, 4 g fiber, 27 g fat, 35 g protein"
  // Pattern 3: "504 calories, 41 g carbs, 21.3 g fat, 42.3 g protein"

  // Extract serving size
  const servingMatch = html.match(/(\d+(?:\.\d+)?)\s*g(?:,|\s)/i);
  if (servingMatch) {
    result.serving_size_g = parseFloat(servingMatch[1]);
  }

  // Extract calories
  const calMatch = html.match(/Calories?[:\s]*(\d+(?:\.\d+)?)/i) || 
                   html.match(/(\d+(?:\.\d+)?)\s*cal(?:ories)?/i);
  if (calMatch) {
    result.calories = parseFloat(calMatch[1]);
  }

  // Extract protein
  const proteinMatch = html.match(/Protein[:\s]*(\d+(?:\.\d+)?)/i) ||
                       html.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:of\s+)?protein/i);
  if (proteinMatch) {
    result.protein = parseFloat(proteinMatch[1]);
  }

  // Extract carbs
  const carbMatch = html.match(/Carbohydrates?[:\s]*(\d+(?:\.\d+)?)/i) ||
                    html.match(/(\d+(?:\.\d+)?)\s*g?\s*carbs?/i);
  if (carbMatch) {
    result.carbs = parseFloat(carbMatch[1]);
  }

  // Extract fat
  const fatMatch = html.match(/Fat[:\s]*(\d+(?:\.\d+)?)/i) ||
                   html.match(/(\d+(?:\.\d+)?)\s*g?\s*fat/i);
  if (fatMatch) {
    result.fat = parseFloat(fatMatch[1]);
  }

  // Extract fiber
  const fiberMatch = html.match(/Fiber[:\s]*(\d+(?:\.\d+)?)/i) ||
                     html.match(/(\d+(?:\.\d+)?)\s*g?\s*fiber/i);
  if (fiberMatch) {
    result.fiber = parseFloat(fiberMatch[1]);
  }

  return result;
}

// Extract ingredients from HTML
function parseIngredients(html: string): { item: string; amount: string }[] {
  const ingredients: { item: string; amount: string }[] = [];
  
  // Find content between Ingredients and Directions
  const ingredientsSection = html.match(/<h[23]>(?:<strong>)?Ingredients?:?(?:<\/strong>)?<\/h[23]>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
  
  if (ingredientsSection) {
    // Extract list items
    const listItems = ingredientsSection[1].match(/<li[^>]*><p>(.*?)<\/p><\/li>/gi) || [];
    
    for (const item of listItems) {
      const text = item.replace(/<[^>]*>/g, '').trim();
      
      // Try to separate amount from item
      // Pattern: "1/3 cup oats" -> amount: "1/3 cup", item: "oats"
      const amountMatch = text.match(/^([\d\/\.\s]+(?:cup|tbsp|tsp|oz|g|lb|ml|scoop|slice|clove|dash|pinch|small|medium|large)?s?)\s+(.+)$/i);
      
      if (amountMatch) {
        ingredients.push({
          amount: amountMatch[1].trim(),
          item: amountMatch[2].trim(),
        });
      } else {
        ingredients.push({
          amount: '',
          item: text,
        });
      }
    }
  }
  
  return ingredients;
}

// Extract directions from HTML
function parseDirections(html: string): string[] {
  const directions: string[] = [];
  
  // Find content between Directions and Nutrition Data
  const directionsSection = html.match(/<h[23]>(?:<strong>)?Directions?:?(?:<\/strong>)?<\/h[23]>[\s\S]*?<ol[^>]*>([\s\S]*?)<\/ol>/i);
  
  if (directionsSection) {
    const listItems = directionsSection[1].match(/<li[^>]*><p>(.*?)<\/p><\/li>/gi) || [];
    
    for (const item of listItems) {
      const text = item.replace(/<[^>]*>/g, '').trim();
      if (text) {
        directions.push(text);
      }
    }
  }
  
  return directions;
}

// Extract Cronometer recipe name
function parseCronometerName(html: string): string | null {
  const match = html.match(/Cronometer Recipe Name:?<\/(?:h\d|p|strong)>\s*<p>([^<]+)<\/p>/i) ||
                html.match(/Cronometer Recipe Name:?\s*<\/(?:h\d|strong)>\s*<span>([^<]+)<\/span>/i) ||
                html.match(/Cronometer Recipe Name:?<\/(?:h\d|strong)>\s*([^<]+)/i);
  return match ? match[1].trim() : null;
}

// Extract hashtags/tags
function parseTags(html: string): string[] {
  const tags: string[] = [];
  
  // Find hashtags section or inline hashtags
  const hashtagMatch = html.match(/#(\w+)/gi);
  if (hashtagMatch) {
    for (const tag of hashtagMatch) {
      const cleanTag = tag.replace('#', '').toLowerCase();
      if (!tags.includes(cleanTag) && cleanTag !== 'recipes') {
        tags.push(cleanTag);
      }
    }
  }
  
  return tags;
}

// Determine recipe characteristics based on nutrition and tags
function determineCharacteristics(
  nutrition: { calories: number; protein: number; carbs: number; fat: number },
  tags: string[],
  ingredients: { item: string; amount: string }[]
): {
  suitable_for_pre_workout: boolean;
  suitable_for_post_workout: boolean;
  is_high_protein: boolean;
  is_low_carb: boolean;
  is_low_fat: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_dairy_free: boolean;
  is_meal_prep_friendly: boolean;
  is_quick_prep: boolean;
} {
  const ingredientText = ingredients.map(i => i.item.toLowerCase()).join(' ');
  
  // Meat/fish indicators
  const hasMeat = /chicken|beef|turkey|pork|bacon|sausage|steak|ham|lamb|duck|fish|salmon|tuna|shrimp|crab|lobster/i.test(ingredientText);
  
  // Dairy indicators
  const hasDairy = /milk|cheese|yogurt|cream|butter|whey/i.test(ingredientText);
  
  // Animal products
  const hasEggs = /egg/i.test(ingredientText);
  const hasAnimalProducts = hasMeat || hasDairy || hasEggs;
  
  // Gluten indicators
  const hasGluten = /bread|tortilla|pasta|flour|oats|barley|rye|muffin|bagel|cereal/i.test(ingredientText);
  
  return {
    // Pre-workout: moderate carbs, not too heavy
    suitable_for_pre_workout: nutrition.carbs >= 20 && nutrition.fat <= 15 && nutrition.calories <= 500,
    
    // Post-workout: high protein, moderate-high carbs for recovery
    suitable_for_post_workout: nutrition.protein >= 25 && nutrition.carbs >= 20,
    
    // High protein: >= 25g
    is_high_protein: nutrition.protein >= 25 || tags.includes('highprotein'),
    
    // Low carb: <= 20g
    is_low_carb: nutrition.carbs <= 20 || tags.includes('lowcarb'),
    
    // Low fat: <= 10g
    is_low_fat: nutrition.fat <= 10 || tags.includes('lowfat'),
    
    // Vegetarian: no meat
    is_vegetarian: !hasMeat,
    
    // Vegan: no animal products at all
    is_vegan: !hasAnimalProducts && tags.includes('vegan'),
    
    // Gluten free: no obvious gluten sources
    is_gluten_free: !hasGluten || tags.includes('glutenfree'),
    
    // Dairy free
    is_dairy_free: !hasDairy || tags.includes('dairyfree'),
    
    // Meal prep friendly
    is_meal_prep_friendly: tags.includes('mealprep'),
    
    // Quick prep (based on tags)
    is_quick_prep: tags.includes('easy') || tags.includes('quick'),
  };
}

// Parse category from URL path
function parseCategory(categoryPath: string): string {
  // Remove leading slash and convert to readable format
  return categoryPath.replace(/^\//, '').replace(/-/g, '_').toLowerCase() || 'general';
}

// Parse a single CSV line (handling quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Main parsing function
function parseRecipesCSV(csvContent: string): ParsedRecipe[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const recipes: ParsedRecipe[] = [];
  
  for (const line of lines) {
    try {
      const fields = parseCSVLine(line);
      
      if (fields.length < 4) {
        console.warn('Skipping line with insufficient fields:', line.substring(0, 50));
        continue;
      }
      
      const [slug, name, description, categoryPath, imageUrl] = fields;
      
      // Skip if no slug or name
      if (!slug || !name) {
        console.warn('Skipping line without slug/name');
        continue;
      }
      
      // Parse components
      const nutrition = parseNutritionData(description);
      const ingredients = parseIngredients(description);
      const directions = parseDirections(description);
      const cronometer_name = parseCronometerName(description);
      const tags = parseTags(description);
      const category = parseCategory(categoryPath || '/general');
      
      const characteristics = determineCharacteristics(nutrition, tags, ingredients);
      
      const recipe: ParsedRecipe = {
        slug,
        name,
        cronometer_name,
        category,
        tags,
        serving_size_g: nutrition.serving_size_g,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        ingredients,
        directions,
        description,
        image_url: imageUrl?.trim() || null,
        ...characteristics,
      };
      
      recipes.push(recipe);
    } catch (error) {
      console.error('Error parsing line:', error);
    }
  }
  
  return recipes;
}

// Generate SQL INSERT statements
function generateSQL(recipes: ParsedRecipe[]): string {
  const escapeString = (str: string | null): string => {
    if (str === null) return 'NULL';
    return `'${str.replace(/'/g, "''")}'`;
  };
  
  const escapeBool = (val: boolean): string => val ? 'true' : 'false';
  
  const escapeArray = (arr: string[]): string => {
    if (arr.length === 0) return "'{}'";
    return `ARRAY[${arr.map(s => escapeString(s)).join(', ')}]`;
  };
  
  const escapeJson = (obj: unknown): string => {
    return escapeString(JSON.stringify(obj));
  };
  
  const escapeTextArray = (arr: string[]): string => {
    if (arr.length === 0) return "'{}'";
    return `ARRAY[${arr.map(s => escapeString(s)).join(', ')}]::TEXT[]`;
  };

  let sql = `-- Nutrition Insiders Recipes Seed Data
-- Generated: ${new Date().toISOString()}
-- Total recipes: ${recipes.length}

-- Clear existing data (optional - uncomment if needed)
-- TRUNCATE public.ni_recipes;

INSERT INTO public.ni_recipes (
  slug, name, cronometer_name, category, tags,
  serving_size_g, calories, protein, carbs, fat, fiber,
  ingredients, directions, description, image_url,
  suitable_for_pre_workout, suitable_for_post_workout,
  is_high_protein, is_low_carb, is_low_fat,
  is_vegetarian, is_vegan, is_gluten_free, is_dairy_free,
  is_meal_prep_friendly, is_quick_prep
) VALUES\n`;

  const values = recipes.map(r => `(
  ${escapeString(r.slug)},
  ${escapeString(r.name)},
  ${escapeString(r.cronometer_name)},
  ${escapeString(r.category)},
  ${escapeArray(r.tags)},
  ${r.serving_size_g ?? 'NULL'},
  ${r.calories},
  ${r.protein},
  ${r.carbs},
  ${r.fat},
  ${r.fiber},
  ${escapeJson(r.ingredients)}::JSONB,
  ${escapeTextArray(r.directions)},
  ${escapeString(r.description)},
  ${escapeString(r.image_url)},
  ${escapeBool(r.suitable_for_pre_workout)},
  ${escapeBool(r.suitable_for_post_workout)},
  ${escapeBool(r.is_high_protein)},
  ${escapeBool(r.is_low_carb)},
  ${escapeBool(r.is_low_fat)},
  ${escapeBool(r.is_vegetarian)},
  ${escapeBool(r.is_vegan)},
  ${escapeBool(r.is_gluten_free)},
  ${escapeBool(r.is_dairy_free)},
  ${escapeBool(r.is_meal_prep_friendly)},
  ${escapeBool(r.is_quick_prep)}
)`);

  sql += values.join(',\n');
  sql += '\nON CONFLICT (slug) DO UPDATE SET\n';
  sql += `  name = EXCLUDED.name,
  cronometer_name = EXCLUDED.cronometer_name,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  serving_size_g = EXCLUDED.serving_size_g,
  calories = EXCLUDED.calories,
  protein = EXCLUDED.protein,
  carbs = EXCLUDED.carbs,
  fat = EXCLUDED.fat,
  fiber = EXCLUDED.fiber,
  ingredients = EXCLUDED.ingredients,
  directions = EXCLUDED.directions,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  suitable_for_pre_workout = EXCLUDED.suitable_for_pre_workout,
  suitable_for_post_workout = EXCLUDED.suitable_for_post_workout,
  is_high_protein = EXCLUDED.is_high_protein,
  is_low_carb = EXCLUDED.is_low_carb,
  is_low_fat = EXCLUDED.is_low_fat,
  is_vegetarian = EXCLUDED.is_vegetarian,
  is_vegan = EXCLUDED.is_vegan,
  is_gluten_free = EXCLUDED.is_gluten_free,
  is_dairy_free = EXCLUDED.is_dairy_free,
  is_meal_prep_friendly = EXCLUDED.is_meal_prep_friendly,
  is_quick_prep = EXCLUDED.is_quick_prep,
  updated_at = NOW();\n`;

  return sql;
}

// Generate JSON for API seeding
function generateJSON(recipes: ParsedRecipe[]): string {
  return JSON.stringify(recipes, null, 2);
}

// Main execution
async function main() {
  const csvPath = process.argv[2] || '/Users/drcodyhaun/Desktop/ni_recipes_126.csv';
  const outputDir = '/Users/drcodyhaun/FitomicsNutritionTool/fitomics-web';
  
  console.log(`Reading CSV from: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  console.log(`CSV loaded: ${csvContent.length} characters`);
  
  const recipes = parseRecipesCSV(csvContent);
  console.log(`Parsed ${recipes.length} recipes`);
  
  // Show sample
  if (recipes.length > 0) {
    console.log('\nSample recipe:');
    console.log(JSON.stringify(recipes[0], null, 2));
  }
  
  // Generate outputs
  const sqlOutput = generateSQL(recipes);
  const jsonOutput = generateJSON(recipes);
  
  // Write SQL file
  const sqlPath = path.join(outputDir, 'supabase-seed-recipes.sql');
  fs.writeFileSync(sqlPath, sqlOutput);
  console.log(`\nSQL written to: ${sqlPath}`);
  
  // Write JSON file
  const jsonPath = path.join(outputDir, 'ni-recipes.json');
  fs.writeFileSync(jsonPath, jsonOutput);
  console.log(`JSON written to: ${jsonPath}`);
  
  // Summary stats
  console.log('\n=== Recipe Statistics ===');
  console.log(`Total recipes: ${recipes.length}`);
  console.log(`High protein: ${recipes.filter(r => r.is_high_protein).length}`);
  console.log(`Low carb: ${recipes.filter(r => r.is_low_carb).length}`);
  console.log(`Pre-workout suitable: ${recipes.filter(r => r.suitable_for_pre_workout).length}`);
  console.log(`Post-workout suitable: ${recipes.filter(r => r.suitable_for_post_workout).length}`);
  console.log(`Meal prep friendly: ${recipes.filter(r => r.is_meal_prep_friendly).length}`);
  console.log(`Quick prep: ${recipes.filter(r => r.is_quick_prep).length}`);
  
  // Category breakdown
  const categories = new Map<string, number>();
  recipes.forEach(r => {
    categories.set(r.category, (categories.get(r.category) || 0) + 1);
  });
  console.log('\nCategories:');
  categories.forEach((count, cat) => {
    console.log(`  ${cat}: ${count}`);
  });
}

main().catch(console.error);
