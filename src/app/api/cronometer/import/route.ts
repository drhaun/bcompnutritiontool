import { NextRequest, NextResponse } from 'next/server';
import { getDiarySummary, getNutritionTargets, CronometerDiarySummary } from '@/lib/cronometer';

/**
 * Import Cronometer diary data for nutrition analysis
 * 
 * Query params:
 * - client_id: Cronometer client ID (optional for Pro accounts)
 * - start: Start date (YYYY-MM-DD)
 * - end: End date (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('cronometer_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not connected to Cronometer' },
      { status: 401 }
    );
  }
  
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('client_id') || undefined;
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  
  if (!start || !end) {
    return NextResponse.json(
      { error: 'Start and end dates are required' },
      { status: 400 }
    );
  }
  
  try {
    // Fetch diary data with food breakdown
    let diaryData;
    try {
      diaryData = await getDiarySummary(
        { accessToken, clientId },
        { start, end, food: true }
      );
    } catch (diaryError) {
      console.error('Cronometer diary fetch error:', diaryError);
      return NextResponse.json(
        { error: `Failed to fetch diary data: ${diaryError instanceof Error ? diaryError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
    
    // Check if we got any data
    if (!diaryData) {
      return NextResponse.json({
        success: true,
        daysImported: 0,
        data: {
          summary: { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0, daysAnalyzed: 0 },
          dailyAverages: [],
          topFoods: [],
          dailyBreakdown: [],
          rawDays: [],
        },
        targets: {},
        message: 'No diary data found for the selected date range',
      });
    }
    
    // Fetch targets for comparison (non-critical, use empty if fails)
    let targets: Record<string, { min?: number; max?: number; unit: string }> = {};
    try {
      targets = await getNutritionTargets({ accessToken, clientId });
    } catch (targetError) {
      console.warn('Could not fetch Cronometer targets:', targetError);
    }
    
    // Normalize to array
    const days = Array.isArray(diaryData) ? diaryData : [diaryData];
    
    // Transform to format expected by Nutrition Analysis
    const transformedData = transformCronometerData(days, targets);
    
    return NextResponse.json({
      success: true,
      daysImported: transformedData.summary.daysAnalyzed,
      data: transformedData,
      targets,
    });
  } catch (error) {
    console.error('Cronometer import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import data' },
      { status: 500 }
    );
  }
}

/**
 * Transform Cronometer diary data to Nutrition Analysis format
 */
function transformCronometerData(
  days: CronometerDiarySummary[],
  targets: Record<string, { min?: number; max?: number; unit: string }>
) {
  // Calculate daily averages - filter out days without valid macros data
  const validDays = days.filter(d => d && d.macros && d.macros.kcal > 0);
  const daysCount = validDays.length || 1;
  
  // If no valid days, return empty summary
  if (validDays.length === 0) {
    return {
      summary: {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0,
        daysAnalyzed: 0,
      },
      dailyAverages: [],
      topFoods: [],
      dailyBreakdown: [],
      rawDays: [],
    };
  }
  
  // Sum up all nutrients across days
  const totalNutrients: Record<string, number> = {};
  const allFoods: Array<{
    name: string;
    amount: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    meal: string;
    date: string;
  }> = [];
  
  for (const day of validDays) {
    // Add macros
    totalNutrients['Energy'] = (totalNutrients['Energy'] || 0) + day.macros.kcal;
    totalNutrients['Protein'] = (totalNutrients['Protein'] || 0) + day.macros.protein;
    totalNutrients['Carbs'] = (totalNutrients['Carbs'] || 0) + day.macros.total_carbs;
    totalNutrients['Fat'] = (totalNutrients['Fat'] || 0) + day.macros.fat;
    totalNutrients['Fiber'] = (totalNutrients['Fiber'] || 0) + day.macros.fiber;
    totalNutrients['Net Carbs'] = (totalNutrients['Net Carbs'] || 0) + day.macros.net_carbs;
    totalNutrients['Sodium'] = (totalNutrients['Sodium'] || 0) + day.macros.sodium;
    totalNutrients['Potassium'] = (totalNutrients['Potassium'] || 0) + day.macros.potassium;
    totalNutrients['Magnesium'] = (totalNutrients['Magnesium'] || 0) + day.macros.magnesium;
    
    // Add all detailed nutrients from the nutrients object
    if (day.nutrients) {
      for (const [key, value] of Object.entries(day.nutrients)) {
        const cleanKey = formatNutrientName(key);
        totalNutrients[cleanKey] = (totalNutrients[cleanKey] || 0) + (value || 0);
      }
    }
    
    // Extract foods from meal groups
    if (day.foods) {
      for (const mealGroup of day.foods) {
        for (const food of mealGroup.foods) {
          allFoods.push({
            name: food.name,
            amount: food.serving,
            calories: 0, // Individual food macros not provided, only meal totals
            protein: 0,
            carbs: 0,
            fat: 0,
            meal: mealGroup.name,
            date: day.day,
          });
        }
      }
    }
  }
  
  // Calculate averages
  const averageNutrients: Record<string, number> = {};
  for (const [key, value] of Object.entries(totalNutrients)) {
    averageNutrients[key] = value / daysCount;
  }
  
  // Build nutrient data with targets
  const nutrientData = Object.entries(averageNutrients).map(([name, value]) => {
    const targetInfo = findTarget(name, targets);
    const target = targetInfo?.min || targetInfo?.max || 0;
    return {
      name,
      value: Math.round(value * 10) / 10,
      unit: targetInfo?.unit || getDefaultUnit(name),
      target,
      percentage: target > 0 ? Math.round((value / target) * 100) : 0,
    };
  });
  
  // Calculate food frequency
  const foodCounts: Record<string, { count: number }> = {};
  for (const food of allFoods) {
    const key = food.name.toLowerCase();
    if (!foodCounts[key]) {
      foodCounts[key] = { count: 0 };
    }
    foodCounts[key].count++;
  }
  
  const topFoods = Object.entries(foodCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count: data.count,
      totalCalories: 0, // Not available from Cronometer food entries
    }));
  
  // Build daily breakdown
  const dailyBreakdown = validDays.map(day => ({
    date: day.day,
    nutrients: {
      Energy: day.macros.kcal,
      Protein: day.macros.protein,
      Carbs: day.macros.total_carbs,
      Fat: day.macros.fat,
      Fiber: day.macros.fiber,
      ...day.nutrients,
    },
    foods: (day.foods || []).flatMap(mealGroup =>
      mealGroup.foods.map(food => ({
        name: food.name,
        amount: food.serving,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        meal: mealGroup.name,
        category: 'Imported',
      }))
    ),
  }));
  
  return {
    summary: {
      totalCalories: Math.round(averageNutrients['Energy'] || 0),
      totalProtein: Math.round(averageNutrients['Protein'] || 0),
      totalCarbs: Math.round(averageNutrients['Carbs'] || 0),
      totalFat: Math.round(averageNutrients['Fat'] || 0),
      totalFiber: Math.round(averageNutrients['Fiber'] || 0),
      daysAnalyzed: daysCount,
    },
    dailyAverages: nutrientData,
    topFoods,
    dailyBreakdown,
    rawDays: validDays, // Include raw data for detailed analysis
  };
}

/**
 * Format Cronometer nutrient names to readable format
 */
function formatNutrientName(key: string): string {
  const nameMap: Record<string, string> = {
    'kcal': 'Energy',
    'protein': 'Protein',
    'total_carbs': 'Carbs',
    'net_carbs': 'Net Carbs',
    'fat': 'Fat',
    'fiber': 'Fiber',
    'sugar': 'Sugar',
    'sodium': 'Sodium',
    'potassium': 'Potassium',
    'magnesium': 'Magnesium',
    'calcium': 'Calcium',
    'iron': 'Iron',
    'zinc': 'Zinc',
    'vitamin_a': 'Vitamin A',
    'vitamin_c': 'Vitamin C',
    'vitamin_d': 'Vitamin D',
    'vitamin_e': 'Vitamin E',
    'vitamin_k': 'Vitamin K',
    'vitamin_b1': 'Vitamin B1',
    'vitamin_b2': 'Vitamin B2',
    'vitamin_b3': 'Vitamin B3',
    'vitamin_b5': 'Vitamin B5',
    'vitamin_b6': 'Vitamin B6',
    'vitamin_b12': 'Vitamin B12',
    'folate': 'Folate',
    'omega_3': 'Omega-3',
    'omega_6': 'Omega-6',
    'saturated_fat': 'Saturated Fat',
    'monounsaturated_fat': 'Monounsaturated Fat',
    'polyunsaturated_fat': 'Polyunsaturated Fat',
    'cholesterol': 'Cholesterol',
  };
  
  return nameMap[key.toLowerCase()] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Find target for a nutrient
 */
function findTarget(
  name: string,
  targets: Record<string, { min?: number; max?: number; unit: string }>
): { min?: number; max?: number; unit: string } | undefined {
  // Try exact match
  if (targets[name]) return targets[name];
  
  // Try lowercase
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(targets)) {
    if (key.toLowerCase() === lowerName) return value;
  }
  
  return undefined;
}

/**
 * Get default unit for a nutrient
 */
function getDefaultUnit(name: string): string {
  const units: Record<string, string> = {
    'Energy': 'kcal',
    'Protein': 'g',
    'Carbs': 'g',
    'Fat': 'g',
    'Fiber': 'g',
    'Sugar': 'g',
    'Sodium': 'mg',
    'Potassium': 'mg',
    'Magnesium': 'mg',
    'Calcium': 'mg',
    'Iron': 'mg',
    'Zinc': 'mg',
    'Vitamin A': 'mcg',
    'Vitamin C': 'mg',
    'Vitamin D': 'mcg',
    'Vitamin E': 'mg',
    'Vitamin K': 'mcg',
    'Vitamin B12': 'mcg',
    'Folate': 'mcg',
    'Cholesterol': 'mg',
  };
  
  return units[name] || 'g';
}
