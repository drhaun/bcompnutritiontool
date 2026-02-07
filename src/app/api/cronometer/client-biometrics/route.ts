import { NextRequest, NextResponse } from 'next/server';
import { getBiometricSummary, getDiarySummary, getDataSummary } from '@/lib/cronometer';
import { resolveCronometerToken, backfillCronometerCookies } from '@/lib/cronometer-token';

/**
 * Lightweight endpoint that returns only the latest biometric readings
 * (weight, body fat %, recent calories) for a given Cronometer client.
 *
 * This avoids loading the full dashboard payload and is designed for
 * quick inline references on the Basics / profile page.
 *
 * Query params:
 *   - client_id: Cronometer client ID (required unless fetching own data)
 */
export async function GET(request: NextRequest) {
  const tokenResult = await resolveCronometerToken(request);

  if (!tokenResult.accessToken) {
    return NextResponse.json(
      { error: 'Not connected to Cronometer' },
      { status: 401 }
    );
  }

  const { accessToken } = tokenResult;
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id') || undefined;

  // Date range: look back up to 2 years so we always find the most recent
  // weight/body fat entry even if the client hasn't logged in a while.
  // The biometric_summary and data_summary calls are lightweight.
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 2);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const startStr = fmt(start);
  const endStr = fmt(end);

  try {
    // Fetch biometric summary + recent active days in parallel
    const [bioResult, dataSummary] = await Promise.all([
      getBiometricSummary({ accessToken, clientId }, startStr, endStr).catch(() => ({
        biometrics: [],
      })),
      getDataSummary({ accessToken, clientId }, startStr, endStr).catch(() => ({
        days: [] as string[],
        signup: '',
      })),
    ]);

    // --- Extract latest weight & body fat from biometric_summary ---
    let latestWeight: { value: number; unit: string; date: string } | null = null;
    let latestBodyFat: { value: number; date: string } | null = null;

    const bios = bioResult.biometrics || [];
    for (const bio of bios) {
      if (!bio || typeof bio !== 'object') continue;
      const name = String(bio.name || bio['type'] || '').toLowerCase();
      const day = String(bio.day || bio['date'] || '');
      const value = Number(bio.value ?? bio['amount'] ?? 0);
      const unit = String(bio.unit || bio['units'] || '');

      if (value === 0 || !day) continue;

      if (name.includes('weight')) {
        if (!latestWeight || day > latestWeight.date) {
          latestWeight = { value, unit, date: day };
        }
      }

      if (name.includes('body fat') || name.includes('body_fat') || name.includes('bodyfat') || name === 'bf%') {
        if (!latestBodyFat || day > latestBodyFat.date) {
          latestBodyFat = { value, date: day };
        }
      }
    }

    // --- Fallback: try to extract from diary_summary metrics for the most recent day ---
    const activeDays = (dataSummary.days || []).sort().reverse(); // most recent first
    if (activeDays.length > 0 && (!latestWeight || !latestBodyFat)) {
      // Check the 3 most recent active days for metrics
      const daysToCheck = activeDays.slice(0, 3);
      const diaryResults = await Promise.all(
        daysToCheck.map((day) =>
          getDiarySummary({ accessToken, clientId }, { day, food: false }).catch(
            () => null
          )
        )
      );

      for (const result of diaryResults) {
        if (!result || Array.isArray(result)) continue;
        const day = result.day;
        const metrics = result.metrics || [];

        for (const metric of metrics) {
          if (!metric || typeof metric !== 'object') continue;
          const name = String(metric.name || metric.type || '').toLowerCase();
          const value = Number(metric.value ?? metric.amount ?? 0);
          const unit = String(metric.unit || metric.units || '');

          if (value === 0) continue;

          if (name.includes('weight') && !latestWeight) {
            latestWeight = { value, unit, date: day };
          }
          if (
            (name.includes('body fat') || name.includes('body_fat') || name.includes('bodyfat') || name === 'bf%') &&
            !latestBodyFat
          ) {
            latestBodyFat = { value, date: day };
          }
        }
      }
    }

    // --- Get most recent day's calorie total ---
    let latestCalories: { value: number; date: string } | null = null;
    if (activeDays.length > 0) {
      try {
        const recentDay = activeDays[0];
        const dayResult = await getDiarySummary(
          { accessToken, clientId },
          { day: recentDay, food: false }
        );
        if (dayResult && !Array.isArray(dayResult) && dayResult.macros?.kcal > 0) {
          latestCalories = {
            value: Math.round(dayResult.macros.kcal),
            date: recentDay,
          };
        }
      } catch {
        // non-fatal
      }
    }

    let response = NextResponse.json({
      success: true,
      latestWeight,
      latestBodyFat,
      latestCalories,
      activeDaysCount: activeDays.length,
    });

    response = backfillCronometerCookies(response, tokenResult);
    return response;
  } catch (error) {
    console.error('[client-biometrics] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch biometrics',
        latestWeight: null,
        latestBodyFat: null,
        latestCalories: null,
      },
      { status: 500 }
    );
  }
}
