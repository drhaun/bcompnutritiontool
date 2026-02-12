import { NextRequest, NextResponse } from 'next/server';
import { getDiarySummary, getDataSummary, getNutritionTargets, CronometerDiarySummary } from '@/lib/cronometer';
import { resolveCronometerToken, backfillCronometerCookies } from '@/lib/cronometer-token';

// Chunk size for diary requests (days). Cronometer's diary_summary with food=true
// returns full nutrient profiles, meal groups, and food lists per day. For ranges
// greater than this many days we split into parallel windows to avoid timeouts.
const CHUNK_SIZE_DAYS = 14;

/**
 * Import Cronometer diary data for nutrition analysis
 * 
 * Query params:
 * - client_id: Cronometer client ID (optional for Pro accounts)
 * - start: Start date (YYYY-MM-DD)
 * - end: End date (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  // Resolve token from cookie → DB → env
  const tokenResult = await resolveCronometerToken(request);
  
  if (!tokenResult.accessToken) {
    return NextResponse.json(
      { error: 'Not connected to Cronometer' },
      { status: 401 }
    );
  }

  const accessToken = tokenResult.accessToken;
  
  const searchParams = request.nextUrl.searchParams;
  const clientIdParam = searchParams.get('client_id');
  const clientId = clientIdParam && clientIdParam !== 'self' ? clientIdParam : undefined;
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  
  console.log('[Cronometer Import] Request params:', { clientId, start, end });
  
  if (!start || !end) {
    return NextResponse.json(
      { error: 'Start and end dates are required' },
      { status: 400 }
    );
  }
  
  try {
    // STEP 1: First get data_summary to find which days have actual entries
    let daysWithData: string[] = [];
    try {
      console.log('[Cronometer Import] Fetching data summary to find days with entries...');
      const dataSummary = await getDataSummary(
        { accessToken, clientId },
        start,
        end
      );
      daysWithData = dataSummary.days || [];
      console.log(`[Cronometer Import] Found ${daysWithData.length} days with data:`, daysWithData);
    } catch (summaryError) {
      console.warn('[Cronometer Import] Could not fetch data summary, will try diary directly:', summaryError);
    }
    
    // If no days with data found in the range, return early
    if (daysWithData.length === 0) {
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
        message: 'No diary entries found for the selected date range. Make sure the client has logged food in Cronometer.',
      });
    }
    
    // STEP 2: Fetch diary data with food breakdown, using chunking for large ranges
    // to avoid timeouts (same approach as the Cronometer Dashboard route)
    let days: CronometerDiarySummary[];
    try {
      console.log('[Cronometer Import] Fetching detailed diary summary...');
      days = await fetchDiaryInChunks(
        { accessToken, clientId },
        start,
        end,
        CHUNK_SIZE_DAYS
      );
      console.log(`[Cronometer Import] Received ${days.length} diary days`);
    } catch (diaryError) {
      console.error('Cronometer diary fetch error:', diaryError);
      return NextResponse.json(
        { error: `Failed to fetch diary data: ${diaryError instanceof Error ? diaryError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
    
    // STEP 3: Fetch targets for comparison (non-critical, use empty if fails)
    let targets: Record<string, { min?: number; max?: number; unit: string }> = {};
    try {
      targets = await getNutritionTargets({ accessToken, clientId });
      console.log('[Cronometer Import] Targets received:', Object.keys(targets).length, 'nutrients');
    } catch (targetError) {
      console.warn('Could not fetch Cronometer targets:', targetError);
    }
    
    // Filter to only days with logged data and non-zero calories
    const filteredDays = days.filter(d => 
      d && 
      d.macros && 
      d.macros.kcal > 0
    );
    
    console.log(`[Cronometer Import] Filtered to ${filteredDays.length} days with actual food logged (from ${days.length} total)`);
    
    if (filteredDays.length === 0) {
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
        targets,
        message: 'Days found but no calorie data logged. Make sure the client has logged food (not just biometrics) in Cronometer.',
      });
    }
    
    // Transform to format expected by Nutrition Analysis
    const transformedData = transformCronometerData(filteredDays, targets);
    
    let response = NextResponse.json({
      success: true,
      daysImported: transformedData.summary.daysAnalyzed,
      daysWithEntries: daysWithData,
      data: transformedData,
      targets,
    });

    // Backfill cookies if token came from database
    response = backfillCronometerCookies(response, tokenResult);
    return response;
  } catch (error) {
    console.error('Cronometer import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import data' },
      { status: 500 }
    );
  }
}

// ─── Chunking helpers ──────────────────────────────────────────────────────────

/**
 * Fetch diary data in chunks to avoid Cronometer API timeouts on large ranges.
 * 
 * With food=true, each day's response includes full nutrient profiles, meal groups,
 * and food lists. For 30+ day ranges this can exceed serverless function timeouts.
 * We split into smaller windows and fetch in parallel, then merge results.
 */
async function fetchDiaryInChunks(
  options: { accessToken: string; clientId?: string },
  startStr: string,
  endStr: string,
  chunkDays: number
): Promise<CronometerDiarySummary[]> {
  const startDate = new Date(startStr + 'T00:00:00');
  const endDate = new Date(endStr + 'T00:00:00');
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // If the range is small enough, make a single request
  if (totalDays <= chunkDays) {
    const data = await getDiarySummary(options, { start: startStr, end: endStr, food: true }).catch(() => null);
    return parseDiaryResponse(data);
  }

  console.log(`[Cronometer Import] Chunking ${totalDays}-day range into ${chunkDays}-day windows`);

  // Build chunk ranges
  const chunks: Array<{ start: string; end: string }> = [];
  let cursor = startDate;
  while (cursor < endDate) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setDate(chunkEnd.getDate() + chunkDays - 1);
    const effectiveEnd = chunkEnd > endDate ? endDate : chunkEnd;

    chunks.push({
      start: fmtDate(cursor),
      end: fmtDate(effectiveEnd),
    });

    cursor = new Date(effectiveEnd);
    cursor.setDate(cursor.getDate() + 1);
  }

  console.log(`[Cronometer Import] Fetching ${chunks.length} diary chunks:`, chunks.map(c => `${c.start}..${c.end}`));

  // Fetch all chunks in parallel
  const chunkResults = await Promise.all(
    chunks.map(chunk =>
      getDiarySummary(options, { start: chunk.start, end: chunk.end, food: true })
        .catch((err) => {
          console.error(`[Cronometer Import] Chunk ${chunk.start}..${chunk.end} failed:`, err);
          return null;
        })
    )
  );

  // Merge all chunk results into a single array
  const allDays: CronometerDiarySummary[] = [];
  for (const result of chunkResults) {
    allDays.push(...parseDiaryResponse(result));
  }

  console.log(`[Cronometer Import] Merged ${allDays.length} days from ${chunks.length} chunks`);
  return allDays;
}

/**
 * Parse diary_summary response into a flat array.
 * Cronometer returns either an array (single day) or an object keyed by date.
 */
function parseDiaryResponse(data: CronometerDiarySummary | CronometerDiarySummary[] | null): CronometerDiarySummary[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') {
    return Object.entries(data).map(([dateKey, dayData]: [string, any]) => ({
      day: dateKey,
      completed: dayData.completed ?? false,
      food_grams: dayData.food_grams ?? 0,
      macros: dayData.macros || {},
      nutrients: dayData.nutrients || {},
      foods: dayData.foods || [],
      metrics: dayData.metrics || [],
    }));
  }
  return [];
}

/** Format a Date as YYYY-MM-DD */
function fmtDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Transform Cronometer diary data to Nutrition Analysis format
 */
function transformCronometerData(
  days: CronometerDiarySummary[],
  targets: Record<string, { min?: number; max?: number; unit: string }>
) {
  // Days should already be filtered, but double check
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
  
  console.log(`[Cronometer Transform] Processing ${validDays.length} valid days`);
  
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
    // Cronometer's detailed nutrients object has everything - use it first if available
    if (day.nutrients && Object.keys(day.nutrients).length > 0) {
      for (const [key, value] of Object.entries(day.nutrients)) {
        if (typeof value === 'number' && !isNaN(value)) {
          const cleanKey = formatNutrientName(key);
          totalNutrients[cleanKey] = (totalNutrients[cleanKey] || 0) + value;
        }
      }
    } else {
      // Fallback to macros object if detailed nutrients not available
      totalNutrients['Energy'] = (totalNutrients['Energy'] || 0) + (day.macros.kcal || 0);
      totalNutrients['Protein'] = (totalNutrients['Protein'] || 0) + (day.macros.protein || 0);
      totalNutrients['Carbs'] = (totalNutrients['Carbs'] || 0) + (day.macros.total_carbs || 0);
      totalNutrients['Fat'] = (totalNutrients['Fat'] || 0) + (day.macros.fat || 0);
      totalNutrients['Fiber'] = (totalNutrients['Fiber'] || 0) + (day.macros.fiber || 0);
    }
    
    // Always add these from macros for consistency in summary
    if (!totalNutrients['Energy']) {
      totalNutrients['Energy'] = (totalNutrients['Energy'] || 0) + (day.macros.kcal || 0);
    }
    
    // Extract foods from meal groups
    // Note: Cronometer API only provides meal-level macros, not per-food data
    // So we track food counts/frequency but NOT per-food calories
    if (day.foods) {
      for (const mealGroup of day.foods) {
        for (const food of (mealGroup.foods || [])) {
          // Don't assign fake calorie values to individual foods
          // We only have meal-level totals from the API
          allFoods.push({
            name: food.name,
            amount: food.serving,
            calories: 0, // Unknown - API doesn't provide per-food data
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
  
  console.log(`[Cronometer Transform] Aggregated ${Object.keys(totalNutrients).length} nutrients, ${allFoods.length} food entries`);
  
  // Calculate averages
  const averageNutrients: Record<string, number> = {};
  for (const [key, value] of Object.entries(totalNutrients)) {
    averageNutrients[key] = value / daysCount;
  }
  
  // Build nutrient data with targets - sort by importance
  const priorityNutrients = [
    'Energy', 'Protein', 'Carbs', 'Fat', 'Fiber', 'Net Carbs',
    'Sodium', 'Potassium', 'Magnesium', 'Calcium', 'Iron', 'Zinc',
    'Vitamin A', 'Vitamin C', 'Vitamin D', 'Vitamin E', 'Vitamin K',
    'B1 (Thiamine)', 'B2 (Riboflavin)', 'B3 (Niacin)', 'B5 (Pantothenic Acid)',
    'B6 (Pyridoxine)', 'B12 (Cobalamin)', 'Folate', 'Choline',
    'Omega-3', 'Omega-6', 'Saturated', 'Monounsaturated', 'Polyunsaturated',
    'Cholesterol', 'Sugar', 'Water'
  ];
  
  const nutrientData = Object.entries(averageNutrients)
    .map(([name, value]) => {
      const targetInfo = findTarget(name, targets);
      const target = targetInfo?.min || targetInfo?.max || 0;
      return {
        name,
        value: Math.round(value * 10) / 10,
        unit: targetInfo?.unit || getDefaultUnit(name),
        target,
        percentage: target > 0 ? Math.round((value / target) * 100) : 0,
      };
    })
    .sort((a, b) => {
      const aIndex = priorityNutrients.indexOf(a.name);
      const bIndex = priorityNutrients.indexOf(b.name);
      if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  
  // Calculate food frequency
  // Note: We don't have per-food calorie data from Cronometer API
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
      totalCalories: 0, // Not available from Cronometer API
    }));
  
  // Build daily breakdown with full details
  // Note: Per-food macros are not available from Cronometer API - only meal totals
  const dailyBreakdown = validDays.map(day => ({
    date: day.day,
    completed: day.completed,
    foodGrams: day.food_grams,
    nutrients: {
      Energy: day.macros?.kcal || 0,
      Protein: day.macros?.protein || 0,
      Carbs: day.macros?.total_carbs || 0,
      Fat: day.macros?.fat || 0,
      Fiber: day.macros?.fiber || 0,
      ...(day.nutrients || {}),
    },
    foods: (day.foods || []).flatMap(mealGroup =>
      (mealGroup.foods || []).map(food => ({
        name: food.name,
        amount: food.serving,
        calories: 0, // Per-food data not available from API
        protein: 0,
        carbs: 0,
        fat: 0,
        meal: mealGroup.name,
        category: 'Imported',
      }))
    ),
    mealSummary: (day.foods || []).map(mealGroup => ({
      name: mealGroup.name,
      calories: Math.round(mealGroup.macros?.kcal || 0),
      protein: Math.round((mealGroup.macros?.protein || 0) * 10) / 10,
      carbs: Math.round((mealGroup.macros?.total_carbs || 0) * 10) / 10,
      fat: Math.round((mealGroup.macros?.fat || 0) * 10) / 10,
      foodCount: mealGroup.foods?.length || 0,
    })),
  }));
  
  return {
    summary: {
      totalCalories: Math.round(averageNutrients['Energy'] || 0),
      totalProtein: Math.round(averageNutrients['Protein'] || 0),
      totalCarbs: Math.round(averageNutrients['Carbs'] || 0),
      totalFat: Math.round(averageNutrients['Fat'] || 0),
      totalFiber: Math.round(averageNutrients['Fiber'] || 0),
      daysAnalyzed: validDays.length,
    },
    dailyAverages: nutrientData,
    topFoods,
    dailyBreakdown,
    rawDays: validDays.map(d => ({
      day: d.day,
      completed: d.completed,
      foodGrams: d.food_grams,
      macros: d.macros,
    })),
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
