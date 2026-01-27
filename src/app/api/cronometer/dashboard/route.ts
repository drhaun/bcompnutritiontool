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
  const accessToken = request.cookies.get('cronometer_access_token')?.value;
  
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
      calories: Math.round(day.macros.kcal || 0),
      protein: Math.round(day.macros.protein || 0),
      carbs: Math.round(day.macros.total_carbs || 0),
      fat: Math.round(day.macros.fat || 0),
      fiber: Math.round(day.macros.fiber || 0),
      sodium: Math.round(day.macros.sodium || 0),
      completed: day.completed,
      foodGrams: Math.round(day.food_grams || 0),
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate averages
    const totalDays = validDays.length || 1;
    const averages = {
      calories: Math.round(validDays.reduce((sum, d) => sum + (d.macros.kcal || 0), 0) / totalDays),
      protein: Math.round(validDays.reduce((sum, d) => sum + (d.macros.protein || 0), 0) / totalDays),
      carbs: Math.round(validDays.reduce((sum, d) => sum + (d.macros.total_carbs || 0), 0) / totalDays),
      fat: Math.round(validDays.reduce((sum, d) => sum + (d.macros.fat || 0), 0) / totalDays),
      fiber: Math.round(validDays.reduce((sum, d) => sum + (d.macros.fiber || 0), 0) / totalDays),
    };
    
    // Calculate macro percentages for pie chart
    const totalMacroCalories = (averages.protein * 4) + (averages.carbs * 4) + (averages.fat * 9);
    const macroDistribution = [
      { name: 'Protein', value: Math.round((averages.protein * 4 / totalMacroCalories) * 100) || 0, grams: averages.protein, color: '#ef4444' },
      { name: 'Carbs', value: Math.round((averages.carbs * 4 / totalMacroCalories) * 100) || 0, grams: averages.carbs, color: '#3b82f6' },
      { name: 'Fat', value: Math.round((averages.fat * 9 / totalMacroCalories) * 100) || 0, grams: averages.fat, color: '#eab308' },
    ];
    
    // Build detailed food log
    const foodLog = validDays.map(day => ({
      date: day.day,
      completed: day.completed,
      totalCalories: Math.round(day.macros.kcal || 0),
      meals: (day.foods || []).map(meal => ({
        name: meal.name,
        calories: Math.round(meal.macros?.kcal || 0),
        protein: Math.round((meal.macros?.protein || 0) * 10) / 10,
        carbs: Math.round((meal.macros?.total_carbs || 0) * 10) / 10,
        fat: Math.round((meal.macros?.fat || 0) * 10) / 10,
        foods: (meal.foods || []).map(f => ({
          name: f.name,
          serving: f.serving,
        })),
      })),
    })).sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
    
    // Extract any biometric/metric data
    const biometrics: Array<{
      date: string;
      type: string;
      value: number;
      unit: string;
    }> = [];
    
    for (const day of validDays) {
      if (day.metrics && Array.isArray(day.metrics)) {
        for (const metric of day.metrics) {
          if (metric && typeof metric === 'object') {
            biometrics.push({
              date: day.day,
              type: metric.name || metric.type || 'Unknown',
              value: metric.value || 0,
              unit: metric.unit || '',
            });
          }
        }
      }
    }
    
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
      value: Math.round((total / totalDays) * 10) / 10,
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
