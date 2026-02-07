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
 * POST handler: Best-effort attempt to push nutrition targets to Cronometer.
 * 
 * Cronometer's documented API only supports reading targets (not writing).
 * This handler attempts an undocumented write approach and gracefully handles failure.
 */
export async function POST(request: NextRequest) {
  const tokenResult = await resolveCronometerToken(request);
  
  if (!tokenResult.accessToken) {
    return NextResponse.json(
      { error: 'Not connected to Cronometer' },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    const { client_id, calories, protein, carbs, fat } = body;
    
    if (!calories && !protein && !carbs && !fat) {
      return NextResponse.json(
        { error: 'At least one target value (calories, protein, carbs, fat) is required' },
        { status: 400 }
      );
    }
    
    // Attempt undocumented set_targets endpoint
    const setTargetBody: Record<string, unknown> = {};
    if (client_id) setTargetBody.client_id = client_id;
    
    // Try to structure targets matching Cronometer's expected format
    const targets: Record<string, { min: number; max: number; unit: string }> = {};
    if (calories) targets['Energy'] = { min: calories, max: calories, unit: 'kcal' };
    if (protein) targets['Protein'] = { min: protein, max: protein, unit: 'g' };
    if (carbs) targets['Carbohydrates'] = { min: carbs, max: carbs, unit: 'g' };
    if (fat) targets['Fat'] = { min: fat, max: fat, unit: 'g' };
    
    setTargetBody.targets = targets;
    
    // Best-effort: try the undocumented endpoint
    const res = await fetch('https://cronometer.com/api_v1/set_targets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenResult.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(setTargetBody),
    });
    
    if (res.ok) {
      let response = NextResponse.json({ success: true, message: 'Targets updated in Cronometer' });
      response = backfillCronometerCookies(response, tokenResult);
      return response;
    }
    
    // If the endpoint doesn't exist or returns an error, handle gracefully
    const errorText = await res.text().catch(() => 'Unknown error');
    console.warn('[Cronometer] set_targets attempt failed:', res.status, errorText);
    
    return NextResponse.json({
      success: false,
      error: 'Cronometer API does not currently support remote target updates. Please update targets manually in the Cronometer app.',
      details: `API returned ${res.status}`,
    }, { status: 200 }); // Return 200 so frontend handles it as a known limitation
    
  } catch (error) {
    console.error('Cronometer push targets error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to push targets. Please update them manually in the Cronometer app.' },
      { status: 200 }
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
