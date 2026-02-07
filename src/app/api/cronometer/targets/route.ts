import { NextRequest, NextResponse } from 'next/server';
import { getNutritionTargets } from '@/lib/cronometer';
import { resolveCronometerToken, backfillCronometerCookies } from '@/lib/cronometer-token';

/**
 * Fetch nutrition targets from Cronometer for a specific client
 * 
 * Query params:
 * - client_id: Cronometer client ID (optional, defaults to own account)
 * - day: Specific day (optional, defaults to today)
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
  
  const searchParams = request.nextUrl.searchParams;
  const clientIdParam = searchParams.get('client_id');
  const clientId = clientIdParam && clientIdParam !== 'self' ? clientIdParam : undefined;
  const day = searchParams.get('day') || undefined;
  
  try {
    const rawTargets = await getNutritionTargets({ accessToken: tokenResult.accessToken, clientId }, day);
    
    // Extract macro targets from the raw response
    // Cronometer returns targets as { nutrientName: { min?: number, max?: number, unit: string } }
    const extractedTargets = {
      // Energy/Calories
      kcal: extractTargetValue(rawTargets, ['Energy', 'Calories', 'kcal']),
      // Protein
      protein: extractTargetValue(rawTargets, ['Protein']),
      // Carbohydrates
      total_carbs: extractTargetValue(rawTargets, ['Carbohydrates', 'Carbs', 'Total Carbs']),
      // Fat
      fat: extractTargetValue(rawTargets, ['Fat', 'Total Fat']),
      // Fiber
      fiber: extractTargetValue(rawTargets, ['Fiber']),
      // Include raw targets for advanced use
      raw: rawTargets,
    };
    
    let response = NextResponse.json({
      success: true,
      targets: extractedTargets,
    });
    // Backfill cookies if token came from database
    response = backfillCronometerCookies(response, tokenResult);
    return response;
  } catch (error) {
    console.error('Cronometer targets error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch targets' },
      { status: 500 }
    );
  }
}

/**
 * Extract a target value from the raw Cronometer targets object
 * Tries multiple possible key names
 */
function extractTargetValue(
  targets: Record<string, { min?: number; max?: number; unit: string }>,
  possibleKeys: string[]
): number | null {
  for (const key of possibleKeys) {
    // Try exact match
    if (targets[key]) {
      const target = targets[key];
      return target.min || target.max || null;
    }
    
    // Try case-insensitive match
    const lowerKey = key.toLowerCase();
    for (const [targetKey, targetValue] of Object.entries(targets)) {
      if (targetKey.toLowerCase() === lowerKey || 
          targetKey.toLowerCase().includes(lowerKey) ||
          lowerKey.includes(targetKey.toLowerCase())) {
        return targetValue.min || targetValue.max || null;
      }
    }
  }
  
  return null;
}
