import { NextRequest, NextResponse } from 'next/server';
import { 
  getDiarySummary, 
  getDataSummary, 
  getFastingSummary, 
  getNutritionTargets,
  CronometerDiarySummary 
} from '@/lib/cronometer';

/**
 * Fetch comprehensive Cronometer data for dashboard visualization
 * 
 * Query params:
 * - client_id: Cronometer client ID (optional for Pro accounts)
 * - start: Start date (YYYY-MM-DD)
 * - end: End date (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  // Check cookie first, then fall back to env var for local dev
  const accessToken = request.cookies.get('cronometer_access_token')?.value
    || process.env.CRONOMETER_ACCESS_TOKEN;
  
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not connected to Cronometer' },
      { status: 401 }
    );
  }
  
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
    // Fetch all data in parallel for speed
    // Note: Cronometer API does NOT have a biometric_summary endpoint - biometric data is not available via API
    const [dataSummary, diaryData, fastingData, targets] = await Promise.all([
      getDataSummary({ accessToken, clientId }, start, end).catch(() => ({ days: [], signup: '' })),
      getDiarySummary({ accessToken, clientId }, { start, end, food: true }).catch(() => null),
      getFastingSummary({ accessToken, clientId }, start, end).catch(() => ({ fasts: [] })),
      getNutritionTargets({ accessToken, clientId }).catch(() => ({})),
    ]);
    
    // Convert diary data to array format (handle object with date keys)
    let days: CronometerDiarySummary[] = [];
    if (diaryData) {
      if (Array.isArray(diaryData)) {
        days = diaryData;
      } else if (typeof diaryData === 'object') {
        days = Object.entries(diaryData).map(([dateKey, dayData]: [string, any]) => ({
          day: dateKey,
          completed: dayData.completed ?? false,
          food_grams: dayData.food_grams ?? 0,
          macros: dayData.macros || {},
          nutrients: dayData.nutrients || {},
          foods: dayData.foods || [],
          metrics: dayData.metrics || [],
        }));
      }
    }
    
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
        // Key micronutrients
        micronutrients: {
          vitaminA: round(nutrients['Vitamin A'] || 0, 1),
          vitaminC: round(nutrients['Vitamin C'] || 0, 1),
          vitaminD: round(nutrients['Vitamin D'] || 0, 1),
          vitaminE: round(nutrients['Vitamin E'] || 0, 1),
          vitaminK: round(nutrients['Vitamin K'] || 0, 1),
          vitaminB12: round(nutrients['B12 (Cobalamin)'] || 0, 2),
          folate: round(nutrients['Folate'] || 0, 0),
          calcium: round(nutrients['Calcium'] || 0, 0),
          iron: round(nutrients['Iron'] || 0, 1),
          magnesium: round(nutrients['Magnesium'] || 0, 0),
          zinc: round(nutrients['Zinc'] || 0, 1),
          omega3: round(nutrients['Omega-3'] || 0, 2),
        },
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
    
    // Extract biometric data from diary metrics
    // Metrics include things like weight, body fat %, etc. that users log in Cronometer
    const biometrics: Array<{
      date: string;
      type: string;
      value: number;
      unit: string;
    }> = [];
    
    // Check each day's metrics array for biometric data
    for (const day of validDays) {
      console.log(`[Dashboard] Day ${day.day} metrics:`, JSON.stringify(day.metrics));
      
      if (day.metrics && Array.isArray(day.metrics) && day.metrics.length > 0) {
        for (const metric of day.metrics) {
          console.log(`[Dashboard] Processing metric:`, JSON.stringify(metric));
          if (metric && typeof metric === 'object') {
            // Cronometer metrics format: { name: string, value: number, unit: string }
            const metricValue = metric.value ?? metric.amount ?? 0;
            if (metricValue !== 0) {
              biometrics.push({
                date: day.day,
                type: metric.name || metric.type || metric.metric || 'Unknown',
                value: metricValue,
                unit: metric.unit || metric.units || '',
              });
            }
          }
        }
      }
    }
    
    console.log(`[Dashboard] Total biometrics extracted:`, biometrics.length, biometrics);
    
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
    
    return NextResponse.json({
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
      
      // Biometrics (may be limited by API)
      biometrics,
      
      // Micronutrients
      micronutrientAverages,
      
      // Targets for comparison
      targets,
    });
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
