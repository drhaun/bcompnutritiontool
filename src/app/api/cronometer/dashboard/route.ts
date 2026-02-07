import { NextRequest, NextResponse } from 'next/server';
import { 
  getDiarySummary, 
  getDataSummary, 
  getFastingSummary, 
  getNutritionTargets,
  getBiometricSummary,
  CronometerDiarySummary 
} from '@/lib/cronometer';
import { resolveCronometerToken, backfillCronometerCookies } from '@/lib/cronometer-token';

/**
 * Fetch comprehensive Cronometer data for dashboard visualization
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
  
  if (!start || !end) {
    return NextResponse.json(
      { error: 'Start and end dates are required' },
      { status: 400 }
    );
  }
  
  try {
    // Fetch non-diary data in parallel (these are lightweight)
    const [dataSummary, fastingData, targets, biometricSummary] = await Promise.all([
      getDataSummary({ accessToken, clientId }, start, end).catch(() => ({ days: [], signup: '' })),
      getFastingSummary({ accessToken, clientId }, start, end).catch(() => ({ fasts: [] })),
      getNutritionTargets({ accessToken, clientId }).catch(() => ({})),
      // Try the biometric_summary endpoint — may not be officially documented but can return
      // weight, body fat %, blood pressure, blood glucose, and other wearable/manual entries
      getBiometricSummary({ accessToken, clientId }, start, end).catch((err) => {
        console.log('[Dashboard] biometric_summary endpoint unavailable or failed:', err instanceof Error ? err.message : err);
        return { biometrics: [] };
      }),
    ]);
    
    // Fetch diary data in chunks to avoid timeouts on large date ranges.
    // Cronometer's diary_summary with food=true returns a LOT of data per day
    // (full nutrient profiles, meal groups, food lists). For ranges > 14 days
    // we split into 14-day windows and merge results.
    const CHUNK_SIZE_DAYS = 14;
    const allDiaryDays = await fetchDiaryInChunks(
      { accessToken, clientId },
      start,
      end,
      CHUNK_SIZE_DAYS
    );
    
    // Convert to array format
    let days: CronometerDiarySummary[] = allDiaryDays;
    
    // Filter to valid days with data
    const validDays = days.filter(d => d && d.macros && d.macros.kcal > 0);
    
    // Build trend data for charts
    const trendData = validDays.map(day => ({
      date: day.day,
      calories: round(day.macros.kcal || 0, 0),
      protein: round(day.macros.protein || 0, 1),
      carbs: round(day.macros.total_carbs || 0, 1),
      fat: round(day.macros.fat || 0, 1),
      fiber: round(day.macros.fiber || 0, 1),
      sodium: round(day.macros.sodium || 0, 0),
      completed: day.completed,
      foodGrams: round(day.food_grams || 0, 0),
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate averages
    const totalDays = validDays.length || 1;
    const averages = {
      calories: round(validDays.reduce((sum, d) => sum + (d.macros.kcal || 0), 0) / totalDays, 0),
      protein: round(validDays.reduce((sum, d) => sum + (d.macros.protein || 0), 0) / totalDays, 1),
      carbs: round(validDays.reduce((sum, d) => sum + (d.macros.total_carbs || 0), 0) / totalDays, 1),
      fat: round(validDays.reduce((sum, d) => sum + (d.macros.fat || 0), 0) / totalDays, 1),
      fiber: round(validDays.reduce((sum, d) => sum + (d.macros.fiber || 0), 0) / totalDays, 1),
    };
    
    // Calculate macro percentages for pie chart
    const totalMacroCalories = (averages.protein * 4) + (averages.carbs * 4) + (averages.fat * 9);
    const macroDistribution = [
      { name: 'Protein', value: Math.round((averages.protein * 4 / totalMacroCalories) * 100) || 0, grams: averages.protein, color: '#ef4444' },
      { name: 'Carbs', value: Math.round((averages.carbs * 4 / totalMacroCalories) * 100) || 0, grams: averages.carbs, color: '#3b82f6' },
      { name: 'Fat', value: Math.round((averages.fat * 9 / totalMacroCalories) * 100) || 0, grams: averages.fat, color: '#eab308' },
    ];
    
    // Build detailed food log with full nutrient data for day summaries
    const foodLog = validDays.map(day => {
      // Extract key micronutrients for this day
      const nutrients = day.nutrients || {};
      
      return {
        date: day.day,
        completed: day.completed,
        // Macros
        totalCalories: round(day.macros.kcal || 0, 0),
        protein: round(day.macros.protein || 0, 1),
        carbs: round(day.macros.total_carbs || 0, 1),
        fat: round(day.macros.fat || 0, 1),
        fiber: round(day.macros.fiber || 0, 1),
        sodium: round(day.macros.sodium || 0, 0),
        potassium: round(day.macros.potassium || 0, 0),
        // Full micronutrient profile (all available from Cronometer API)
        micronutrients: {
          // Vitamins
          vitaminA: round(nutrients['Vitamin A'] || 0, 1),
          vitaminC: round(nutrients['Vitamin C'] || 0, 1),
          vitaminD: round(nutrients['Vitamin D'] || 0, 1),
          vitaminE: round(nutrients['Vitamin E'] || 0, 1),
          vitaminK: round(nutrients['Vitamin K'] || 0, 1),
          // B-Vitamins
          b1Thiamine: round(nutrients['B1 (Thiamine)'] || 0, 2),
          b2Riboflavin: round(nutrients['B2 (Riboflavin)'] || 0, 2),
          b3Niacin: round(nutrients['B3 (Niacin)'] || 0, 1),
          b5PantothenicAcid: round(nutrients['B5 (Pantothenic Acid)'] || 0, 2),
          b6Pyridoxine: round(nutrients['B6 (Pyridoxine)'] || 0, 2),
          b12Cobalamin: round(nutrients['B12 (Cobalamin)'] || 0, 2),
          folate: round(nutrients['Folate'] || 0, 0),
          choline: round(nutrients['Choline'] || 0, 1),
          // Minerals
          calcium: round(nutrients['Calcium'] || 0, 0),
          iron: round(nutrients['Iron'] || 0, 1),
          magnesium: round(nutrients['Magnesium'] || 0, 0),
          zinc: round(nutrients['Zinc'] || 0, 1),
          copper: round(nutrients['Copper'] || 0, 2),
          manganese: round(nutrients['Manganese'] || 0, 2),
          phosphorus: round(nutrients['Phosphorus'] || 0, 0),
          selenium: round(nutrients['Selenium'] || 0, 1),
          // Lipids
          cholesterol: round(nutrients['Cholesterol'] || 0, 0),
          saturatedFat: round(nutrients['Saturated'] || 0, 1),
          monounsaturatedFat: round(nutrients['Monounsaturated'] || 0, 1),
          polyunsaturatedFat: round(nutrients['Polyunsaturated'] || 0, 1),
          transFat: round(nutrients['Trans-Fats'] || 0, 2),
          omega3: round(nutrients['Omega-3'] || 0, 2),
          omega6: round(nutrients['Omega-6'] || 0, 2),
          // Sugars & carb breakdown
          sugars: round(nutrients['Sugars'] || 0, 1),
          starch: round(nutrients['Starch'] || 0, 1),
          // Other
          caffeine: round(nutrients['Caffeine'] || 0, 0),
          water: round(nutrients['Water'] || 0, 0),
          // Amino acids (essential)
          histidine: round(nutrients['Histidine'] || 0, 2),
          isoleucine: round(nutrients['Isoleucine'] || 0, 2),
          leucine: round(nutrients['Leucine'] || 0, 2),
          lysine: round(nutrients['Lysine'] || 0, 2),
          methionine: round(nutrients['Methionine'] || 0, 2),
          phenylalanine: round(nutrients['Phenylalanine'] || 0, 2),
          threonine: round(nutrients['Threonine'] || 0, 2),
          tryptophan: round(nutrients['Tryptophan'] || 0, 2),
          valine: round(nutrients['Valine'] || 0, 2),
          // Amino acids (non-essential / conditionally essential)
          alanine: round(nutrients['Alanine'] || 0, 2),
          arginine: round(nutrients['Arginine'] || 0, 2),
          cystine: round(nutrients['Cystine'] || 0, 2),
          glycine: round(nutrients['Glycine'] || 0, 2),
          proline: round(nutrients['Proline'] || 0, 2),
          serine: round(nutrients['Serine'] || 0, 2),
          tyrosine: round(nutrients['Tyrosine'] || 0, 2),
          // Carotenoids & antioxidants
          betaCarotene: round(nutrients['Beta-carotene'] || 0, 1),
          alphaCarotene: round(nutrients['Alpha-carotene'] || 0, 1),
          lycopene: round(nutrients['Lycopene'] || 0, 1),
          luteinZeaxanthin: round(nutrients['Lutein+Zeaxanthin'] || 0, 1),
        },
        // Pass through the FULL raw nutrients object so the frontend can access anything
        // we haven't explicitly mapped above
        rawNutrients: nutrients,
        // Meal breakdown
        meals: (day.foods || []).map(meal => ({
          name: meal.name,
          calories: round(meal.macros?.kcal || 0, 0),
          protein: round(meal.macros?.protein || 0, 1),
          carbs: round(meal.macros?.total_carbs || 0, 1),
          fat: round(meal.macros?.fat || 0, 1),
          foods: (meal.foods || []).map(f => ({
            name: f.name,
            serving: f.serving,
          })),
        })),
      };
    }).sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
    
    // ── Biometric data: merge from TWO sources ──────────────────────
    // Source 1: biometric_summary endpoint (weight, body fat, blood pressure, etc.)
    // Source 2: diary_summary metrics[] field per day (may include wearable data)
    // We check ALL diary days (not just food-logged ones) because someone may log
    // weight/biometrics without logging food.
    const biometrics: Array<{
      date: string;
      type: string;
      value: number;
      unit: string;
      source: string;
    }> = [];
    
    // Source 1: biometric_summary endpoint data
    const biometricData = biometricSummary?.biometrics || [];
    if (biometricData.length > 0) {
      console.log(`[Dashboard] biometric_summary returned ${biometricData.length} entries`);
      for (const bio of biometricData) {
        if (bio && typeof bio === 'object') {
          const val = Number(bio.value ?? bio['amount'] ?? 0);
          if (val !== 0) {
            biometrics.push({
              date: String(bio.day || bio['date'] || ''),
              type: String(bio.name || bio['type'] || bio['metric'] || 'Unknown'),
              value: val,
              unit: String(bio.unit || bio['units'] || ''),
              source: 'biometric_summary',
            });
          }
        }
      }
    } else {
      console.log(`[Dashboard] biometric_summary returned no entries`);
    }
    
    // Source 2: diary_summary metrics[] from ALL days (including days with no food)
    const allDays = allDiaryDays; // Use full day list, not filtered validDays
    for (const day of allDays) {
      if (day.metrics && Array.isArray(day.metrics) && day.metrics.length > 0) {
        console.log(`[Dashboard] Day ${day.day} has ${day.metrics.length} diary metrics:`, JSON.stringify(day.metrics));
        for (const metric of day.metrics) {
          if (metric && typeof metric === 'object') {
            const metricValue = metric.value ?? metric.amount ?? 0;
            if (metricValue !== 0) {
              biometrics.push({
                date: day.day,
                type: metric.name || metric.type || metric.metric || 'Unknown',
                value: metricValue,
                unit: metric.unit || metric.units || '',
                source: 'diary_metrics',
              });
            }
          }
        }
      }
    }
    
    // Deduplicate: if both sources return the same (date, type, value), keep only one
    const biometricKey = (b: typeof biometrics[0]) => `${b.date}|${b.type}|${b.value}`;
    const seen = new Set<string>();
    const deduped = biometrics.filter(b => {
      const key = biometricKey(b);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log(`[Dashboard] Total biometrics: ${deduped.length} (${biometrics.length} before dedup)`);
    
    // Process fasting data with notes
    const fasts = (fastingData.fasts || []).map(fast => ({
      name: fast.name,
      start: fast.start,
      finish: fast.finish,
      comments: fast.comments,
      duration: fast.finish ? calculateFastDuration(fast.start, fast.finish) : null,
      ongoing: !fast.finish,
    }));
    
    // Micronutrient averages (for nutrient breakdown)
    const micronutrients: Record<string, number> = {};
    for (const day of validDays) {
      if (day.nutrients) {
        for (const [key, value] of Object.entries(day.nutrients)) {
          if (typeof value === 'number') {
            micronutrients[key] = (micronutrients[key] || 0) + value;
          }
        }
      }
    }
    // Calculate averages for micronutrients
    const micronutrientAverages = Object.entries(micronutrients).map(([name, total]) => ({
      name,
      value: round(total / totalDays, 1),
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    let response = NextResponse.json({
      success: true,
      daysAnalyzed: validDays.length,
      daysWithEntries: dataSummary.days || [],
      dateRange: { start, end },
      
      // Chart data
      trendData,
      macroDistribution,
      averages,
      
      // Detailed logs
      foodLog,
      
      // Fasting with notes
      fasts,
      
      // Biometrics (merged from biometric_summary + diary metrics)
      biometrics: deduped,
      
      // Micronutrients
      micronutrientAverages,
      
      // Targets for comparison
      targets,
    });

    // Backfill cookies if token came from database
    response = backfillCronometerCookies(response, tokenResult);
    return response;
  } catch (error) {
    console.error('Cronometer dashboard error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

/**
 * Round a number to specified decimal places
 */
function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Fetch diary data in chunks to avoid Cronometer API timeouts on large ranges.
 * 
 * With food=true, each day's response includes full nutrient profiles, meal groups,
 * and food lists. For 30+ day ranges this can exceed serverless function timeouts.
 * We split into smaller windows and merge the results.
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

  console.log(`[Dashboard] Chunking ${totalDays}-day range into ${chunkDays}-day windows`);

  // Build chunk ranges
  const chunks: Array<{ start: string; end: string }> = [];
  let cursor = startDate;
  while (cursor < endDate) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setDate(chunkEnd.getDate() + chunkDays - 1);
    const effectiveEnd = chunkEnd > endDate ? endDate : chunkEnd;

    chunks.push({
      start: formatDateStr(cursor),
      end: formatDateStr(effectiveEnd),
    });

    cursor = new Date(effectiveEnd);
    cursor.setDate(cursor.getDate() + 1);
  }

  console.log(`[Dashboard] Fetching ${chunks.length} diary chunks:`, chunks.map(c => `${c.start}..${c.end}`));

  // Fetch all chunks in parallel (they're now small enough to avoid timeouts)
  const chunkResults = await Promise.all(
    chunks.map(chunk =>
      getDiarySummary(options, { start: chunk.start, end: chunk.end, food: true })
        .catch((err) => {
          console.error(`[Dashboard] Chunk ${chunk.start}..${chunk.end} failed:`, err);
          return null;
        })
    )
  );

  // Merge all chunk results into a single array
  const allDays: CronometerDiarySummary[] = [];
  for (const result of chunkResults) {
    allDays.push(...parseDiaryResponse(result));
  }

  console.log(`[Dashboard] Merged ${allDays.length} days from ${chunks.length} chunks`);
  return allDays;
}

/**
 * Parse the diary_summary response into an array of CronometerDiarySummary.
 * Cronometer can return either an array (single day) or an object keyed by date.
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

/**
 * Format a Date as YYYY-MM-DD
 */
function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculate fast duration from start and finish timestamps
 */
function calculateFastDuration(start: string, finish: string): string {
  try {
    // Cronometer format: "MM/dd/yyyy HH:mm:ss"
    const parseDate = (str: string) => {
      const [datePart, timePart] = str.split(' ');
      const [month, day, year] = datePart.split('/').map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes, seconds);
    };
    
    const startDate = parseDate(start);
    const finishDate = parseDate(finish);
    const diffMs = finishDate.getTime() - startDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours >= 24) {
      const days = Math.floor(diffHours / 24);
      const hours = diffHours % 24;
      return `${days}d ${hours}h`;
    }
    return `${diffHours}h ${diffMinutes}m`;
  } catch {
    return 'Unknown';
  }
}
