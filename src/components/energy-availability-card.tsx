'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  Pencil,
  Zap,
} from 'lucide-react';

// ============================================================
// Energy Availability Calculation
// ============================================================
//
// EA = (Energy Intake - Exercise Energy Expenditure) / Fat-Free Mass (kg)
//
// Thresholds (aligned with phase-targets-editor.tsx):
//   < 15 kcal/kg FFM  → Clinically low (RED-S risk)
//   15-25 kcal/kg FFM → Low
//   25-30 kcal/kg FFM → Reduced
//   30-45 kcal/kg FFM → Optimal
//   > 45 kcal/kg FFM  → High / surplus
// ============================================================

export interface EnergyAvailabilityData {
  /** Average daily calorie intake (kcal) */
  calorieIntake: number | null;
  /** Exercise energy expenditure (kcal/day) — optional */
  exerciseExpenditure?: number | null;
  /** Client body weight in lbs — optional if weightKg provided */
  weightLbs?: number | null;
  /** Client body weight in kg — optional if weightLbs provided */
  weightKg?: number | null;
  /** Body fat percentage (0-100) — optional, coach can enter manually */
  bodyFatPercent?: number | null;
}

interface EAResult {
  value: number;
  status: 'clinically_low' | 'low' | 'reduced' | 'optimal' | 'high';
  label: string;
  message: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

function calculateEA(
  calorieIntake: number,
  exerciseExpenditure: number,
  ffmKg: number
): EAResult {
  const ea = (calorieIntake - exerciseExpenditure) / ffmKg;
  const value = Math.round(ea * 10) / 10;

  if (ea < 15) {
    return {
      value,
      status: 'clinically_low',
      label: 'Clinically Low',
      message: 'RED-S risk — significantly increase calorie intake',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    };
  }
  if (ea < 25) {
    return {
      value,
      status: 'low',
      label: 'Low',
      message: 'Below recommended — consider increasing intake',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    };
  }
  if (ea < 30) {
    return {
      value,
      status: 'reduced',
      label: 'Reduced',
      message: 'Slightly low — monitor closely',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    };
  }
  if (ea <= 45) {
    return {
      value,
      status: 'optimal',
      label: 'Optimal',
      message: 'Energy availability is in the ideal range',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    };
  }
  return {
    value,
    status: 'high',
    label: 'High',
    message: 'Surplus — may support muscle gain',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  };
}

function lbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

// ============================================================
// Component
// ============================================================

interface EnergyAvailabilityCardProps {
  data: EnergyAvailabilityData;
  /** Compact = inline card (Cronometer Dashboard). Full = standalone with more detail. */
  variant?: 'compact' | 'full';
  className?: string;
}

export function EnergyAvailabilityCard({
  data,
  variant = 'full',
  className,
}: EnergyAvailabilityCardProps) {
  // Allow coach to manually override values that aren't available from data
  const [manualWeightLbs, setManualWeightLbs] = useState<string>('');
  const [manualBodyFat, setManualBodyFat] = useState<string>('');
  const [manualExerciseCal, setManualExerciseCal] = useState<string>('');
  const [manualCalories, setManualCalories] = useState<string>('');
  const [editorOpen, setEditorOpen] = useState(false);

  // Resolve values: prefer data props, fall back to manual overrides
  const resolvedWeightKg = useMemo(() => {
    if (data.weightKg && data.weightKg > 0) return data.weightKg;
    if (data.weightLbs && data.weightLbs > 0) return lbsToKg(data.weightLbs);
    const manual = parseFloat(manualWeightLbs);
    if (manual > 0) return lbsToKg(manual);
    return null;
  }, [data.weightKg, data.weightLbs, manualWeightLbs]);

  const resolvedBodyFat = useMemo(() => {
    if (data.bodyFatPercent != null && data.bodyFatPercent > 0) return data.bodyFatPercent;
    const manual = parseFloat(manualBodyFat);
    if (manual > 0 && manual < 100) return manual;
    return null;
  }, [data.bodyFatPercent, manualBodyFat]);

  const resolvedCalories = useMemo(() => {
    if (data.calorieIntake != null && data.calorieIntake > 0) return data.calorieIntake;
    const manual = parseFloat(manualCalories);
    if (manual > 0) return manual;
    return null;
  }, [data.calorieIntake, manualCalories]);

  const resolvedExercise = useMemo(() => {
    if (data.exerciseExpenditure != null && data.exerciseExpenditure > 0) return data.exerciseExpenditure;
    const manual = parseFloat(manualExerciseCal);
    if (manual >= 0) return manual;
    return 0; // Default to 0 if not provided
  }, [data.exerciseExpenditure, manualExerciseCal]);

  // Calculate FFM and EA
  const ffmKg = resolvedWeightKg && resolvedBodyFat != null
    ? resolvedWeightKg * (1 - resolvedBodyFat / 100)
    : null;

  const eaResult = useMemo(() => {
    if (!resolvedCalories || !ffmKg || ffmKg <= 0) return null;
    return calculateEA(resolvedCalories, resolvedExercise, ffmKg);
  }, [resolvedCalories, resolvedExercise, ffmKg]);

  // What's missing?
  const missingFields: string[] = [];
  if (!resolvedCalories) missingFields.push('calorie intake');
  if (!resolvedWeightKg) missingFields.push('body weight');
  if (resolvedBodyFat == null) missingFields.push('body fat %');

  const statusIcon = eaResult ? (
    eaResult.status === 'clinically_low' || eaResult.status === 'low' ? (
      <AlertTriangle className="h-4 w-4" />
    ) : eaResult.status === 'reduced' ? (
      <Info className="h-4 w-4" />
    ) : eaResult.status === 'optimal' ? (
      <CheckCircle2 className="h-4 w-4" />
    ) : (
      <Zap className="h-4 w-4" />
    )
  ) : null;

  // ---- Manual entry popover ----
  const manualEntryPopover = (
    <Popover open={editorOpen} onOpenChange={setEditorOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
          <Pencil className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <p className="text-sm font-medium">Estimate Energy Availability</p>
          <p className="text-xs text-muted-foreground">
            Enter values not available from client data or Cronometer.
          </p>

          {(!data.calorieIntake || data.calorieIntake <= 0) && (
            <div className="space-y-1">
              <Label className="text-xs">Avg Daily Calories (kcal)</Label>
              <Input
                type="number"
                placeholder="e.g. 2000"
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          )}

          {(!data.weightLbs && !data.weightKg) && (
            <div className="space-y-1">
              <Label className="text-xs">Body Weight (lbs)</Label>
              <Input
                type="number"
                placeholder="e.g. 180"
                value={manualWeightLbs}
                onChange={(e) => setManualWeightLbs(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          )}

          {(data.bodyFatPercent == null || data.bodyFatPercent <= 0) && (
            <div className="space-y-1">
              <Label className="text-xs">Estimated Body Fat %</Label>
              <Input
                type="number"
                placeholder="e.g. 18"
                value={manualBodyFat}
                onChange={(e) => setManualBodyFat(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          )}

          {(!data.exerciseExpenditure || data.exerciseExpenditure <= 0) && (
            <div className="space-y-1">
              <Label className="text-xs">Avg Exercise Expenditure (kcal/day)</Label>
              <Input
                type="number"
                placeholder="e.g. 400"
                value={manualExerciseCal}
                onChange={(e) => setManualExerciseCal(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          )}

          <Button
            size="sm"
            className="w-full"
            onClick={() => setEditorOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  // ============================================================
  // COMPACT variant (for Cronometer Dashboard summary row)
  // ============================================================
  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'bg-gradient-to-br',
          eaResult ? `${eaResult.bgColor} border ${eaResult.borderColor}` : 'from-purple-50 to-white',
          className
        )}
      >
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-purple-600">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">Energy Availability</span>
            </div>
            {missingFields.length > 0 && manualEntryPopover}
          </div>

          {eaResult ? (
            <>
              <p className={cn('text-2xl font-bold', eaResult.color)}>
                {eaResult.value}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {statusIcon}
                <span className={cn('text-xs font-medium', eaResult.color)}>
                  {eaResult.label}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">kcal/kg FFM</p>
            </>
          ) : (
            <div className="mt-1">
              <p className="text-sm text-muted-foreground">
                Need {missingFields.join(', ')}
              </p>
              {missingFields.length > 0 && !editorOpen && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Click <Pencil className="h-2.5 w-2.5 inline" /> to enter manually
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // FULL variant (for Nutrition Analysis page)
  // ============================================================
  return (
    <Card
      className={cn(
        eaResult
          ? `${eaResult.bgColor} border ${eaResult.borderColor}`
          : 'border-dashed',
        className
      )}
    >
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-semibold">Energy Availability</span>
          </div>
          <div className="flex items-center gap-2">
            {eaResult && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  eaResult.color,
                  eaResult.borderColor
                )}
              >
                {eaResult.label}
              </Badge>
            )}
            {manualEntryPopover}
          </div>
        </div>

        {eaResult ? (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <p className={cn('text-3xl font-bold', eaResult.color)}>
                {eaResult.value}
              </p>
              <span className="text-sm text-muted-foreground">kcal/kg FFM</span>
            </div>

            <div className="flex items-center gap-1.5">
              {statusIcon}
              <span className={cn('text-sm', eaResult.color)}>
                {eaResult.message}
              </span>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Intake</p>
                <p className="text-sm font-semibold">{resolvedCalories} kcal</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Exercise</p>
                <p className="text-sm font-semibold">{resolvedExercise} kcal</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">FFM</p>
                <p className="text-sm font-semibold">{ffmKg?.toFixed(1)} kg</p>
              </div>
            </div>

            {/* Reference ranges */}
            <div className="mt-2 pt-2 border-t">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Reference Ranges</p>
              <div className="flex gap-1 flex-wrap">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">&lt;15 Clinical</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">15-25 Low</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600">25-30 Reduced</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600">30-45 Optimal</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">&gt;45 High</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-1">
              Missing: {missingFields.join(', ')}
            </p>
            <p className="text-xs text-muted-foreground">
              Click the <Pencil className="h-3 w-3 inline" /> icon to enter estimated values.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
