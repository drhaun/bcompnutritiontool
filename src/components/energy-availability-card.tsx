'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  Pencil,
  Zap,
  Calculator,
  ArrowRight,
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

function kgToLbs(kg: number): number {
  return kg / 0.453592;
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
  const [dialogOpen, setDialogOpen] = useState(false);

  // Editable fields — initialized from data props, always editable by coach
  const dataWeightLbs = data.weightKg && data.weightKg > 0
    ? kgToLbs(data.weightKg)
    : data.weightLbs && data.weightLbs > 0
      ? data.weightLbs
      : null;

  const [editCalories, setEditCalories] = useState<string>(
    data.calorieIntake && data.calorieIntake > 0 ? String(Math.round(data.calorieIntake)) : ''
  );
  const [editWeightLbs, setEditWeightLbs] = useState<string>(
    dataWeightLbs ? String(Math.round(dataWeightLbs)) : ''
  );
  const [editBodyFat, setEditBodyFat] = useState<string>(
    data.bodyFatPercent && data.bodyFatPercent > 0 ? String(data.bodyFatPercent) : ''
  );
  const [editExercise, setEditExercise] = useState<string>(
    data.exerciseExpenditure && data.exerciseExpenditure > 0 ? String(Math.round(data.exerciseExpenditure)) : '0'
  );

  // Sync from data props when they change (e.g. new Cronometer data loaded)
  useEffect(() => {
    if (data.calorieIntake && data.calorieIntake > 0) {
      setEditCalories(String(Math.round(data.calorieIntake)));
    }
  }, [data.calorieIntake]);

  useEffect(() => {
    const wLbs = data.weightKg && data.weightKg > 0
      ? kgToLbs(data.weightKg)
      : data.weightLbs && data.weightLbs > 0
        ? data.weightLbs
        : null;
    if (wLbs) setEditWeightLbs(String(Math.round(wLbs)));
  }, [data.weightLbs, data.weightKg]);

  useEffect(() => {
    if (data.bodyFatPercent && data.bodyFatPercent > 0) {
      setEditBodyFat(String(data.bodyFatPercent));
    }
  }, [data.bodyFatPercent]);

  useEffect(() => {
    if (data.exerciseExpenditure && data.exerciseExpenditure > 0) {
      setEditExercise(String(Math.round(data.exerciseExpenditure)));
    }
  }, [data.exerciseExpenditure]);

  // Resolve numeric values from editable fields
  const calories = parseFloat(editCalories) || 0;
  const weightLbs = parseFloat(editWeightLbs) || 0;
  const bodyFat = parseFloat(editBodyFat) || 0;
  const exercise = parseFloat(editExercise) || 0;
  const weightKg = weightLbs > 0 ? lbsToKg(weightLbs) : 0;
  const ffmKg = weightKg > 0 && bodyFat > 0 && bodyFat < 100
    ? weightKg * (1 - bodyFat / 100)
    : 0;

  const eaResult = useMemo(() => {
    if (calories <= 0 || ffmKg <= 0) return null;
    return calculateEA(calories, exercise, ffmKg);
  }, [calories, exercise, ffmKg]);

  // What's missing for the calculation?
  const missingFields: string[] = [];
  if (calories <= 0) missingFields.push('calorie intake');
  if (weightLbs <= 0) missingFields.push('body weight');
  if (bodyFat <= 0) missingFields.push('body fat %');

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

  // ---- Shared detail dialog ----
  const detailDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-purple-600" />
            Energy Availability Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Formula explanation */}
          <div className="p-3 bg-muted/50 rounded-lg border text-sm">
            <p className="font-medium mb-1">Formula</p>
            <p className="text-muted-foreground font-mono text-xs">
              EA = (Calorie Intake − Exercise Expenditure) ÷ Fat-Free Mass
            </p>
          </div>

          {/* Editable inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Avg Daily Calories (kcal)
              </Label>
              <Input
                type="number"
                placeholder="e.g. 2000"
                value={editCalories}
                onChange={(e) => setEditCalories(e.target.value)}
                className="h-9"
              />
              {data.calorieIntake && data.calorieIntake > 0 && (
                <p className="text-[10px] text-muted-foreground">From Cronometer avg</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Exercise Expenditure (kcal/day)
              </Label>
              <Input
                type="number"
                placeholder="e.g. 400"
                value={editExercise}
                onChange={(e) => setEditExercise(e.target.value)}
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">Avg daily from training</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Body Weight (lbs)
              </Label>
              <Input
                type="number"
                placeholder="e.g. 180"
                value={editWeightLbs}
                onChange={(e) => setEditWeightLbs(e.target.value)}
                className="h-9"
              />
              {weightKg > 0 && (
                <p className="text-[10px] text-muted-foreground">{weightKg.toFixed(1)} kg</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Body Fat %
              </Label>
              <Input
                type="number"
                placeholder="e.g. 18"
                value={editBodyFat}
                onChange={(e) => setEditBodyFat(e.target.value)}
                className="h-9"
              />
              {data.bodyFatPercent && data.bodyFatPercent > 0 && (
                <p className="text-[10px] text-muted-foreground">From client profile</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Live calculation breakdown */}
          {ffmKg > 0 && calories > 0 ? (
            <div className="space-y-3">
              {/* Step-by-step breakdown */}
              <div className="p-3 bg-muted/30 rounded-lg space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fat-Free Mass</span>
                  <span className="font-mono font-medium">
                    {weightKg.toFixed(1)} kg × (1 − {bodyFat}%) = <strong>{ffmKg.toFixed(1)} kg</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Available Energy</span>
                  <span className="font-mono font-medium">
                    {calories} − {exercise} = <strong>{calories - exercise} kcal</strong>
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Energy Availability</span>
                  <span className="font-mono font-medium">
                    {calories - exercise} ÷ {ffmKg.toFixed(1)} = <strong>{eaResult?.value ?? '—'} kcal/kg FFM</strong>
                  </span>
                </div>
              </div>

              {/* Result */}
              {eaResult && (
                <div className={cn(
                  'p-4 rounded-lg border text-center',
                  eaResult.bgColor,
                  eaResult.borderColor,
                )}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {statusIcon}
                    <span className={cn('text-3xl font-bold', eaResult.color)}>
                      {eaResult.value}
                    </span>
                    <span className="text-sm text-muted-foreground">kcal/kg FFM</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-sm', eaResult.color, eaResult.borderColor)}
                  >
                    {eaResult.label}
                  </Badge>
                  <p className={cn('text-sm mt-2', eaResult.color)}>
                    {eaResult.message}
                  </p>
                </div>
              )}

              {/* Reference ranges */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Reference Ranges (kcal/kg FFM)</p>
                <div className="grid grid-cols-5 gap-1 text-center">
                  <div className={cn('rounded py-1.5 text-[10px] font-medium', eaResult?.status === 'clinically_low' ? 'ring-2 ring-red-400' : '', 'bg-red-100 text-red-700')}>
                    &lt;15<br />Clinical
                  </div>
                  <div className={cn('rounded py-1.5 text-[10px] font-medium', eaResult?.status === 'low' ? 'ring-2 ring-red-400' : '', 'bg-red-50 text-red-600')}>
                    15-25<br />Low
                  </div>
                  <div className={cn('rounded py-1.5 text-[10px] font-medium', eaResult?.status === 'reduced' ? 'ring-2 ring-yellow-400' : '', 'bg-yellow-50 text-yellow-600')}>
                    25-30<br />Reduced
                  </div>
                  <div className={cn('rounded py-1.5 text-[10px] font-medium', eaResult?.status === 'optimal' ? 'ring-2 ring-green-400' : '', 'bg-green-50 text-green-600')}>
                    30-45<br />Optimal
                  </div>
                  <div className={cn('rounded py-1.5 text-[10px] font-medium', eaResult?.status === 'high' ? 'ring-2 ring-blue-400' : '', 'bg-blue-50 text-blue-600')}>
                    &gt;45<br />High
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <p>Enter the values above to calculate energy availability.</p>
              {missingFields.length > 0 && (
                <p className="mt-1 text-xs">Still needed: {missingFields.join(', ')}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // ============================================================
  // COMPACT variant (for Cronometer Dashboard summary row)
  // ============================================================
  if (variant === 'compact') {
    return (
      <>
        {detailDialog}
        <Card
          className={cn(
            'bg-gradient-to-br cursor-pointer hover:shadow-md transition-shadow',
            eaResult ? `${eaResult.bgColor} border ${eaResult.borderColor}` : 'from-purple-50 to-white',
            className
          )}
          onClick={() => setDialogOpen(true)}
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-purple-600">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-medium">Energy Availability</span>
              </div>
              <Pencil className="h-3 w-3 text-muted-foreground" />
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
                <p className="text-xs text-muted-foreground">
                  Need {missingFields.join(', ')}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  Click to enter <ArrowRight className="h-2.5 w-2.5" />
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  // ============================================================
  // FULL variant (for Nutrition Analysis page)
  // ============================================================
  return (
    <>
      {detailDialog}
      <Card
        className={cn(
          'cursor-pointer hover:shadow-md transition-shadow',
          eaResult
            ? `${eaResult.bgColor} border ${eaResult.borderColor}`
            : 'border-dashed',
          className
        )}
        onClick={() => setDialogOpen(true)}
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
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
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
                  <p className="text-sm font-semibold">{calories} kcal</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Exercise</p>
                  <p className="text-sm font-semibold">{exercise} kcal</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">FFM</p>
                  <p className="text-sm font-semibold">{ffmKg.toFixed(1)} kg</p>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground text-center pt-1">
                Click to edit inputs and see full calculation
              </p>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-sm text-muted-foreground mb-1">
                Missing: {missingFields.join(', ')}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Click to enter values and calculate <ArrowRight className="h-3 w-3" />
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
