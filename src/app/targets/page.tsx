'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ProgressSteps } from '@/components/layout/progress-steps';
import { ProgressSummary } from '@/components/layout/progress-summary';
import { useFitomicsStore } from '@/lib/store';
import { 
  calculateTDEE, 
  calculateTargetCalories, 
  calculateMacros,
  calculateMacrosAdvanced,
  calculateMacrosWithRationale,
  calculateBodyComposition,
  lbsToKg,
  kgToLbs,
  heightToCm,
  getProteinCoefficientInfo,
  getFatCoefficientInfo,
  getProteinCoefficient,
  getFatCoefficient,
  distributeWithNutrientTiming,
  getNutrientTimingRecommendations,
  PROTEIN_COEFFICIENTS,
  FAT_COEFFICIENTS,
  NUTRIENT_TIMING,
  type ProteinLevel,
  type FatLevel,
  type MealSlot,
  type NutrientTimingMeal,
} from '@/lib/nutrition-calc';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Dumbbell, 
  Target,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  Utensils,
  Zap,
  Download,
  Loader2,
} from 'lucide-react';
import type { DayOfWeek, Macros } from '@/types';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DayTargets {
  day: DayOfWeek;
  isWorkoutDay: boolean;
  workoutType?: string;
  workoutDuration?: number;
  workoutIntensity?: string;
  baseTDEE: number;
  workoutCalories: number;
  totalTDEE: number;
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealDistribution {
  id: string;
  label: string;
  type: 'meal' | 'snack';
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function TargetsPage() {
  const router = useRouter();
  const { 
    userProfile, 
    bodyCompGoals, 
    weeklySchedule,
    nutritionTargets,
    setNutritionTargets,
    calculateNutritionTargets 
  } = useFitomicsStore();

  // Handle hydration mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [showCustomization, setShowCustomization] = useState(false);
  const [showCoefficientSettings, setShowCoefficientSettings] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [confirmedTargets, setConfirmedTargets] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // Macro coefficient settings
  const [proteinLevel, setProteinLevel] = useState<ProteinLevel>('moderate');
  const [fatLevel, setFatLevel] = useState<FatLevel>('moderate');
  const [customProteinPerKg, setCustomProteinPerKg] = useState<number | null>(null);
  const [customFatPerKg, setCustomFatPerKg] = useState<number | null>(null);
  
  // Custom overrides for each day's targets
  const [customOverrides, setCustomOverrides] = useState<Record<DayOfWeek, {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    isCustomized: boolean;
  }>>({
    Monday: { isCustomized: false },
    Tuesday: { isCustomized: false },
    Wednesday: { isCustomized: false },
    Thursday: { isCustomized: false },
    Friday: { isCustomized: false },
    Saturday: { isCustomized: false },
    Sunday: { isCustomized: false },
  });

  // Calculate body composition
  const bodyComp = useMemo(() => {
    if (!userProfile.weightLbs || !userProfile.heightFt || !userProfile.bodyFatPercentage || !userProfile.gender) {
      return null;
    }
    const weightKg = lbsToKg(userProfile.weightLbs);
    const heightCm = heightToCm(userProfile.heightFt, userProfile.heightIn || 0);
    return calculateBodyComposition(weightKg, heightCm, userProfile.bodyFatPercentage, userProfile.gender);
  }, [userProfile]);

  // Get goal type
  const goalType = bodyCompGoals.goalType || 'maintain';
  
  // Get coefficient info for UI
  const proteinOptions = useMemo(() => getProteinCoefficientInfo(goalType), [goalType]);
  const fatOptions = useMemo(() => getFatCoefficientInfo(goalType), [goalType]);
  
  // Current effective coefficients
  const effectiveProteinPerKg = customProteinPerKg ?? getProteinCoefficient(goalType, proteinLevel);
  const effectiveFatPerKg = customFatPerKg ?? getFatCoefficient(goalType, fatLevel);

  // Calculate base targets with rationale
  const baseTargetsWithRationale = useMemo(() => {
    if (!userProfile.weightLbs || !userProfile.heightFt || !userProfile.age || !userProfile.gender) {
      return null;
    }
    const weightKg = lbsToKg(userProfile.weightLbs);
    const heightCm = heightToCm(userProfile.heightFt, userProfile.heightIn || 0);
    
    const baseTDEE = calculateTDEE(
      userProfile.gender,
      weightKg,
      heightCm,
      userProfile.age,
      userProfile.activityLevel || 'Active (10-15k steps/day)'
    );
    
    const weeklyChangeKg = bodyCompGoals.weeklyWeightChangePct 
      ? weightKg * bodyCompGoals.weeklyWeightChangePct
      : goalType === 'lose_fat' ? 0.5 : goalType === 'gain_muscle' ? 0.25 : 0;
    
    const targetCalories = calculateTargetCalories(baseTDEE, goalType, weeklyChangeKg);
    
    return calculateMacrosWithRationale(
      targetCalories,
      weightKg,
      goalType,
      proteinLevel,
      fatLevel
    );
  }, [userProfile, bodyCompGoals, goalType, proteinLevel, fatLevel]);

  // Calculate base targets (from body composition goals only)
  const baseTargets = useMemo((): Macros | null => {
    if (!userProfile.weightLbs || !userProfile.heightFt || !userProfile.age || !userProfile.gender) {
      return null;
    }
    const weightKg = lbsToKg(userProfile.weightLbs);
    const heightCm = heightToCm(userProfile.heightFt, userProfile.heightIn || 0);
    
    const baseTDEE = calculateTDEE(
      userProfile.gender,
      weightKg,
      heightCm,
      userProfile.age,
      userProfile.activityLevel || 'Active (10-15k steps/day)'
    );
    
    const weeklyChangeKg = bodyCompGoals.weeklyWeightChangePct 
      ? weightKg * bodyCompGoals.weeklyWeightChangePct
      : goalType === 'lose_fat' ? 0.5 : goalType === 'gain_muscle' ? 0.25 : 0;
    
    const targetCalories = calculateTargetCalories(baseTDEE, goalType, weeklyChangeKg);
    return calculateMacrosAdvanced(
      targetCalories, 
      weightKg, 
      goalType, 
      proteinLevel, 
      fatLevel,
      customProteinPerKg ?? undefined,
      customFatPerKg ?? undefined
    );
  }, [userProfile, bodyCompGoals, goalType, proteinLevel, fatLevel, customProteinPerKg, customFatPerKg]);

  // Calculate day-specific targets
  const dayTargets = useMemo((): DayTargets[] => {
    if (!userProfile.weightLbs || !userProfile.heightFt || !userProfile.age || !userProfile.gender) {
      return [];
    }
    
    const weightKg = lbsToKg(userProfile.weightLbs);
    const heightCm = heightToCm(userProfile.heightFt, userProfile.heightIn || 0);
    
    const baseTDEE = calculateTDEE(
      userProfile.gender,
      weightKg,
      heightCm,
      userProfile.age,
      userProfile.activityLevel || 'Active (10-15k steps/day)'
    );
    
    const weeklyChangeKg = bodyCompGoals.weeklyWeightChangePct 
      ? weightKg * bodyCompGoals.weeklyWeightChangePct
      : goalType === 'lose_fat' ? 0.5 : goalType === 'gain_muscle' ? 0.25 : 0;

    return DAYS.map(day => {
      const daySchedule = weeklySchedule[day];
      const hasWorkout = daySchedule?.workouts && daySchedule.workouts.length > 0;
      const workout = hasWorkout ? daySchedule.workouts[0] : null;
      
      // Estimate workout calories
      let workoutCalories = 0;
      if (workout) {
        const baseCalories: Record<string, number> = {
          'Resistance Training': 8,
          'Cardio': 10,
          'HIIT': 12,
          'Yoga/Mobility': 4,
          'Sports': 9,
          'Mixed': 9,
        };
        const intensityMult: Record<string, number> = { 'Low': 0.7, 'Medium': 1.0, 'High': 1.3 };
        workoutCalories = Math.round(
          (baseCalories[workout.type] || 8) * 
          workout.duration * 
          (intensityMult[workout.intensity] || 1.0)
        );
      }

      const totalTDEE = baseTDEE + workoutCalories;
      const targetCalories = calculateTargetCalories(totalTDEE, goalType, weeklyChangeKg);
      const macros = calculateMacrosAdvanced(
        targetCalories, 
        weightKg, 
        goalType, 
        proteinLevel, 
        fatLevel,
        customProteinPerKg ?? undefined,
        customFatPerKg ?? undefined
      );

      return {
        day,
        isWorkoutDay: hasWorkout,
        workoutType: workout?.type,
        workoutDuration: workout?.duration,
        workoutIntensity: workout?.intensity,
        baseTDEE,
        workoutCalories,
        totalTDEE,
        targetCalories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      };
    });
  }, [userProfile, bodyCompGoals, weeklySchedule, goalType, proteinLevel, fatLevel, customProteinPerKg, customFatPerKg]);

  // Calculate suggested (average) targets
  const suggestedTargets = useMemo((): Macros | null => {
    if (dayTargets.length === 0) return null;
    return {
      calories: Math.round(dayTargets.reduce((sum, d) => sum + d.targetCalories, 0) / dayTargets.length),
      protein: Math.round(dayTargets.reduce((sum, d) => sum + d.protein, 0) / dayTargets.length),
      carbs: Math.round(dayTargets.reduce((sum, d) => sum + d.carbs, 0) / dayTargets.length),
      fat: Math.round(dayTargets.reduce((sum, d) => sum + d.fat, 0) / dayTargets.length),
    };
  }, [dayTargets]);

  // Calculate energy availability
  const energyAvailability = useMemo(() => {
    if (!suggestedTargets || !bodyComp) return null;
    const ea = suggestedTargets.calories / bodyComp.ffmKg;
    let status: 'low' | 'moderate' | 'optimal' = 'optimal';
    let message = 'Optimal energy availability';
    
    if (ea < 30) {
      status = 'low';
      message = 'Low EA - Consider increasing intake';
    } else if (ea < 40) {
      status = 'moderate';
      message = 'Moderate EA';
    }
    
    return { value: Math.round(ea), status, message };
  }, [suggestedTargets, bodyComp]);

  // Get meal structure from schedule
  const mealStructure = useMemo(() => {
    const firstDay = weeklySchedule['Monday'];
    return {
      mealsPerDay: firstDay?.mealCount || 3,
      snacksPerDay: firstDay?.snackCount || 2,
      mealContexts: firstDay?.mealContexts || [],
    };
  }, [weeklySchedule]);

  // Get workout info for selected day (for nutrient timing)
  const selectedDaySchedule = weeklySchedule[selectedDay];
  const selectedDayWorkout = selectedDaySchedule?.workouts?.[0] || null;
  const workoutTime = selectedDayWorkout?.time || null;
  
  // Calculate meal distribution with intelligent nutrient timing
  const mealDistributionWithTiming = useMemo((): NutrientTimingMeal[] => {
    if (!suggestedTargets) return [];
    
    const { mealsPerDay, snacksPerDay, mealContexts } = mealStructure;
    const weightKg = userProfile.weightLbs ? lbsToKg(userProfile.weightLbs) : 70;
    
    // Build meal slots from schedule
    const mealSlots: MealSlot[] = [];
    const mealTimes = ['08:00', '12:00', '18:00', '21:00', '22:00'];
    const snackTimes = ['10:00', '15:00', '20:00', '22:00'];
    
    // Use meal contexts if available, otherwise default times
    for (let i = 0; i < mealsPerDay; i++) {
      const context = mealContexts?.[i];
      mealSlots.push({
        id: `meal-${i}`,
        label: `Meal ${i + 1}`,
        type: 'meal',
        time: context?.time || mealTimes[i] || '12:00',
        workoutRelation: 'none',
      });
    }
    
    for (let i = 0; i < snacksPerDay; i++) {
      mealSlots.push({
        id: `snack-${i}`,
        label: `Snack ${i + 1}`,
        type: 'snack',
        time: snackTimes[i] || '15:00',
        workoutRelation: 'none',
      });
    }
    
    // Use intelligent nutrient timing based on workout
    return distributeWithNutrientTiming(
      suggestedTargets,
      mealSlots,
      workoutTime,
      selectedDayWorkout?.type || null,
      weightKg,
      goalType
    );
  }, [suggestedTargets, mealStructure, workoutTime, selectedDayWorkout, userProfile.weightLbs, goalType]);

  // Simple meal distribution for display (backwards compatible)
  const mealDistribution = useMemo((): MealDistribution[] => {
    return mealDistributionWithTiming.map(meal => ({
      id: meal.id,
      label: meal.label,
      type: meal.type,
      time: meal.time,
      calories: meal.targets.calories,
      protein: meal.targets.protein,
      carbs: meal.targets.carbs,
      fat: meal.targets.fat,
    }));
  }, [mealDistributionWithTiming]);
  
  // Get nutrient timing recommendations for selected day
  const nutrientTimingRecs = useMemo(() => {
    if (!selectedDayWorkout || !userProfile.weightLbs) return null;
    return getNutrientTimingRecommendations(
      selectedDayWorkout.type,
      selectedDayWorkout.duration,
      selectedDayWorkout.intensity as 'Low' | 'Medium' | 'High',
      lbsToKg(userProfile.weightLbs)
    );
  }, [selectedDayWorkout, userProfile.weightLbs]);

  // Calculate nutrition targets on mount
  useEffect(() => {
    if (nutritionTargets.length === 0) {
      calculateNutritionTargets();
    }
  }, [nutritionTargets.length, calculateNutritionTargets]);

  // Get selected day's targets
  const selectedDayTargets = dayTargets.find(d => d.day === selectedDay);

  // Macro percentage calculations
  const getMacroPercentages = (macros: Macros) => {
    const totalCals = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
    return {
      protein: totalCals > 0 ? Math.round((macros.protein * 4 / totalCals) * 100) : 0,
      carbs: totalCals > 0 ? Math.round((macros.carbs * 4 / totalCals) * 100) : 0,
      fat: totalCals > 0 ? Math.round((macros.fat * 9 / totalCals) * 100) : 0,
    };
  };

  // Get the effective targets for a day (custom or calculated)
  const getEffectiveTargets = (day: DayOfWeek) => {
    const calculated = dayTargets.find(d => d.day === day);
    if (!calculated) return null;
    
    const override = customOverrides[day];
    if (!override.isCustomized) return calculated;
    
    return {
      ...calculated,
      targetCalories: override.calories ?? calculated.targetCalories,
      protein: override.protein ?? calculated.protein,
      carbs: override.carbs ?? calculated.carbs,
      fat: override.fat ?? calculated.fat,
    };
  };

  // Update custom override for a day
  const updateCustomOverride = (day: DayOfWeek, field: 'calories' | 'protein' | 'carbs' | 'fat', value: number) => {
    setCustomOverrides(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
        isCustomized: true,
      }
    }));
  };

  // Reset a day to calculated values
  const resetDayToCalculated = (day: DayOfWeek) => {
    setCustomOverrides(prev => ({
      ...prev,
      [day]: { isCustomized: false }
    }));
    toast.success(`${day} reset to calculated values`);
  };

  // Apply same customization to all days
  const applyToAllDays = () => {
    const currentOverride = customOverrides[selectedDay];
    if (!currentOverride.isCustomized) {
      toast.error('Please customize the current day first');
      return;
    }
    
    const newOverrides = { ...customOverrides };
    DAYS.forEach(day => {
      newOverrides[day] = { ...currentOverride };
    });
    setCustomOverrides(newOverrides);
    toast.success('Applied to all days');
  };

  // Apply to workout days only
  const applyToWorkoutDays = () => {
    const currentOverride = customOverrides[selectedDay];
    if (!currentOverride.isCustomized) {
      toast.error('Please customize the current day first');
      return;
    }
    
    const newOverrides = { ...customOverrides };
    DAYS.forEach(day => {
      const dt = dayTargets.find(d => d.day === day);
      if (dt?.isWorkoutDay) {
        newOverrides[day] = { ...currentOverride };
      }
    });
    setCustomOverrides(newOverrides);
    toast.success('Applied to workout days');
  };

  // Apply to rest days only
  const applyToRestDays = () => {
    const currentOverride = customOverrides[selectedDay];
    if (!currentOverride.isCustomized) {
      toast.error('Please customize the current day first');
      return;
    }
    
    const newOverrides = { ...customOverrides };
    DAYS.forEach(day => {
      const dt = dayTargets.find(d => d.day === day);
      if (!dt?.isWorkoutDay) {
        newOverrides[day] = { ...currentOverride };
      }
    });
    setCustomOverrides(newOverrides);
    toast.success('Applied to rest days');
  };

  const handleConfirmTargets = () => {
    // Save the day targets to the store (using custom overrides if set)
    const targets = dayTargets.map(d => {
      const effective = getEffectiveTargets(d.day);
      return {
        day: d.day,
        isWorkoutDay: d.isWorkoutDay,
        tdee: d.totalTDEE,
        targetCalories: effective?.targetCalories || d.targetCalories,
        protein: effective?.protein || d.protein,
        carbs: effective?.carbs || d.carbs,
        fat: effective?.fat || d.fat,
      };
    });
    
    setNutritionTargets(targets);
    setConfirmedTargets(true);
    toast.success('Nutrition targets confirmed!');
    router.push('/meal-plan');
  };

  const handleRecalculate = () => {
    calculateNutritionTargets();
    toast.success('Targets recalculated!');
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      // Calculate average targets
      const avgCalories = Math.round(dayTargets.reduce((sum, d) => sum + d.targetCalories, 0) / 7);
      const avgProtein = Math.round(dayTargets.reduce((sum, d) => sum + d.protein, 0) / 7);
      const avgCarbs = Math.round(dayTargets.reduce((sum, d) => sum + d.carbs, 0) / 7);
      const avgFat = Math.round(dayTargets.reduce((sum, d) => sum + d.fat, 0) / 7);

      // Get current and target stats
      const currentWeight = userProfile.weightLbs || 0;
      const currentBodyFat = userProfile.bodyFatPercentage || 0;
      const currentFatMass = currentWeight * (currentBodyFat / 100);
      const currentLeanMass = currentWeight - currentFatMass;
      
      const targetWeight = bodyCompGoals.targetWeightLbs || currentWeight;
      const targetBodyFat = bodyCompGoals.targetBodyFat || currentBodyFat;
      const targetFatMass = targetWeight * (targetBodyFat / 100);
      const targetLeanMass = targetWeight - targetFatMass;
      
      // Calculate TDEE from day targets
      const avgTDEE = Math.round(dayTargets.reduce((sum, d) => sum + d.totalTDEE, 0) / 7);

      const pdfData = {
        clientName: userProfile.name || '',
        phase: {
          name: `${goalType === 'lose_fat' ? 'Fat Loss' : goalType === 'gain_muscle' ? 'Muscle Building' : 'Maintenance'} Phase`,
          goalType: goalType,
          startDate: bodyCompGoals.startDate || new Date().toLocaleDateString(),
          endDate: bodyCompGoals.timelineWeeks 
            ? new Date(Date.now() + (bodyCompGoals.timelineWeeks * 7 * 24 * 60 * 60 * 1000)).toLocaleDateString()
            : 'Ongoing',
          durationWeeks: bodyCompGoals.timelineWeeks || 12,
          weeklyChange: bodyCompGoals.weeklyWeightChange || 0,
        },
        currentStats: {
          weight: currentWeight,
          bodyFat: currentBodyFat,
          fatMass: currentFatMass,
          leanMass: currentLeanMass,
          tdee: avgTDEE,
        },
        targetStats: {
          weight: targetWeight,
          bodyFat: targetBodyFat,
          fatMass: targetFatMass,
          leanMass: targetLeanMass,
        },
        averageTargets: {
          calories: avgCalories,
          protein: avgProtein,
          carbs: avgCarbs,
          fat: avgFat,
        },
        dayTargets: dayTargets.map(d => ({
          day: d.day,
          isWorkout: d.isWorkoutDay,
          calories: d.targetCalories,
          protein: d.protein,
          carbs: d.carbs,
          fat: d.fat,
        })),
      };

      const response = await fetch('/api/generate-phase-targets-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${userProfile.name ? userProfile.name.replace(/\s+/g, '-') + '-' : ''}nutrition-phase-plan.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Phase plan PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Stats calculations
  const workoutDays = dayTargets.filter(d => d.isWorkoutDay).length;
  const restDays = 7 - workoutDays;
  const weightKg = userProfile.weightLbs ? lbsToKg(userProfile.weightLbs) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">
          <ProgressSteps currentStep={4} />
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Nutrition Targets</h1>
            <p className="text-muted-foreground">Review and confirm your personalized nutrition targets</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Profile Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Your Profile Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">Personal Info</h4>
                    <p className="text-sm">Age: {userProfile.age}</p>
                    <p className="text-sm">Gender: {userProfile.gender}</p>
                    <p className="text-sm">Weight: {userProfile.weightLbs} lbs</p>
                    <p className="text-sm">Height: {userProfile.heightFt}'{userProfile.heightIn}"</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">Body Composition Goals</h4>
                    <p className="text-sm">Current BF%: {Number(userProfile.bodyFatPercentage).toFixed(1)}%</p>
                    <p className="text-sm">Target BF%: {Number(bodyCompGoals.targetBodyFat || 0).toFixed(1)}%</p>
                    <p className="text-sm capitalize">Goal: {bodyCompGoals.goalType?.replace('_', ' ')}</p>
                    <p className="text-sm">Timeline: {bodyCompGoals.timelineWeeks} weeks</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">Activity & Schedule</h4>
                    <p className="text-sm">{workoutDays} workout days / {restDays} rest days</p>
                    <p className="text-sm">{mealStructure.mealsPerDay} meals + {mealStructure.snacksPerDay} snacks/day</p>
                    <p className="text-sm">{mealStructure.mealsPerDay + mealStructure.snacksPerDay} total eating occasions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Macro Coefficient Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-[#c19962]" />
                    Macro Coefficient Settings
                  </span>
                  <Switch
                    checked={showCoefficientSettings}
                    onCheckedChange={setShowCoefficientSettings}
                  />
                </CardTitle>
                <CardDescription>
                  Evidence-based protein and fat targets - adjust based on your preferences and training
                </CardDescription>
              </CardHeader>
              {showCoefficientSettings && (
                <CardContent className="space-y-6">
                  {/* Protein Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-semibold">Protein Target</Label>
                        <p className="text-sm text-muted-foreground">
                          Current: <span className="font-bold text-[#00263d]">{effectiveProteinPerKg.toFixed(1)} g/kg</span>
                          ({(effectiveProteinPerKg / 2.20462).toFixed(2)} g/lb)
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[#c19962] border-[#c19962]">
                        {baseTargets ? `${baseTargets.protein}g daily` : ''}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      {proteinOptions.map((option) => (
                        <Button
                          key={option.level}
                          variant={proteinLevel === option.level && !customProteinPerKg ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setProteinLevel(option.level);
                            setCustomProteinPerKg(null);
                          }}
                          className={cn(
                            'flex flex-col h-auto py-2',
                            proteinLevel === option.level && !customProteinPerKg && 'bg-[#00263d] hover:bg-[#003b59]'
                          )}
                        >
                          <span className="font-bold">{option.value} g/kg</span>
                          <span className="text-xs opacity-80">{option.label}</span>
                        </Button>
                      ))}
                    </div>
                    
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      <p className="font-medium mb-1">
                        {proteinOptions.find(o => o.level === proteinLevel)?.label || 'Custom'}
                      </p>
                      <p className="text-muted-foreground">
                        {proteinOptions.find(o => o.level === proteinLevel)?.description}
                      </p>
                    </div>

                    {/* Custom protein slider */}
                    <div className="space-y-2">
                      <Label className="text-sm">Fine-tune (custom value)</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[customProteinPerKg ?? effectiveProteinPerKg]}
                          onValueChange={([val]) => setCustomProteinPerKg(val)}
                          min={1.2}
                          max={3.2}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="w-20 text-sm font-mono">
                          {(customProteinPerKg ?? effectiveProteinPerKg).toFixed(1)} g/kg
                        </span>
                      </div>
                      {customProteinPerKg && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setCustomProteinPerKg(null)}
                          className="text-xs"
                        >
                          Reset to preset
                        </Button>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Fat Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-semibold">Fat Target</Label>
                        <p className="text-sm text-muted-foreground">
                          Current: <span className="font-bold text-[#00263d]">{effectiveFatPerKg.toFixed(1)} g/kg</span>
                          ({(effectiveFatPerKg / 2.20462).toFixed(2)} g/lb)
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[#c19962] border-[#c19962]">
                        {baseTargets ? `${baseTargets.fat}g daily` : ''}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      {fatOptions.map((option) => (
                        <Button
                          key={option.level}
                          variant={fatLevel === option.level && !customFatPerKg ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setFatLevel(option.level as FatLevel);
                            setCustomFatPerKg(null);
                          }}
                          className={cn(
                            'flex flex-col h-auto py-2',
                            fatLevel === option.level && !customFatPerKg && 'bg-[#00263d] hover:bg-[#003b59]'
                          )}
                        >
                          <span className="font-bold">{option.value} g/kg</span>
                          <span className="text-xs opacity-80">{option.label}</span>
                        </Button>
                      ))}
                    </div>
                    
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      <p className="font-medium mb-1">
                        {fatOptions.find(o => o.level === fatLevel)?.label || 'Custom'}
                      </p>
                      <p className="text-muted-foreground">
                        {fatOptions.find(o => o.level === fatLevel)?.description}
                      </p>
                    </div>

                    {/* Custom fat slider */}
                    <div className="space-y-2">
                      <Label className="text-sm">Fine-tune (custom value)</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[customFatPerKg ?? effectiveFatPerKg]}
                          onValueChange={([val]) => setCustomFatPerKg(val)}
                          min={0.4}
                          max={1.5}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="w-20 text-sm font-mono">
                          {(customFatPerKg ?? effectiveFatPerKg).toFixed(1)} g/kg
                        </span>
                      </div>
                      {customFatPerKg && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setCustomFatPerKg(null)}
                          className="text-xs"
                        >
                          Reset to preset
                        </Button>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Scientific Rationale */}
                  {baseTargetsWithRationale && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="rationale">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Evidence & Scientific Rationale
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 text-sm">
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="font-semibold text-blue-800 mb-1">Protein</p>
                            <p className="text-blue-700">{baseTargetsWithRationale.rationale.protein}</p>
                          </div>
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="font-semibold text-amber-800 mb-1">Fat</p>
                            <p className="text-amber-700">{baseTargetsWithRationale.rationale.fat}</p>
                          </div>
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="font-semibold text-green-800 mb-1">Carbohydrates</p>
                            <p className="text-green-700">{baseTargetsWithRationale.rationale.carbs}</p>
                          </div>
                          <div className="p-2 bg-muted text-xs text-muted-foreground rounded">
                            <p className="font-medium mb-1">Key Citations:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              <li>Helms et al. (2014): Protein during caloric restriction</li>
                              <li>Morton et al. (2018): Protein supplementation meta-analysis</li>
                              <li>Jäger et al. (2017): ISSN Position Stand on protein</li>
                              <li>Kerksick et al. (2018): ISSN Position Stand on diets</li>
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Calculated Targets Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Base Targets */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Base Daily Targets</CardTitle>
                  <CardDescription>From Body Composition Goals</CardDescription>
                </CardHeader>
                <CardContent>
                  {baseTargets && (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">{baseTargets.calories}</p>
                          <p className="text-xs text-muted-foreground">Calories</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">{baseTargets.protein}g</p>
                          <p className="text-xs text-muted-foreground">Protein</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">{baseTargets.carbs}g</p>
                          <p className="text-xs text-muted-foreground">Carbs</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">{baseTargets.fat}g</p>
                          <p className="text-xs text-muted-foreground">Fat</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        P: {getMacroPercentages(baseTargets).protein}% • 
                        C: {getMacroPercentages(baseTargets).carbs}% • 
                        F: {getMacroPercentages(baseTargets).fat}%
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Suggested Targets */}
              <Card className="border-[#c19962] bg-gradient-to-br from-[#c19962]/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-[#c19962]" />
                    Suggested Daily Targets
                  </CardTitle>
                  <CardDescription>Adjusted for Weekly Schedule</CardDescription>
                </CardHeader>
                <CardContent>
                  {suggestedTargets && (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-background rounded-lg border">
                          <p className="text-2xl font-bold text-[#c19962]">{suggestedTargets.calories}</p>
                          <p className="text-xs text-muted-foreground">Calories</p>
                        </div>
                        <div className="text-center p-3 bg-background rounded-lg border">
                          <p className="text-2xl font-bold text-[#c19962]">{suggestedTargets.protein}g</p>
                          <p className="text-xs text-muted-foreground">Protein</p>
                        </div>
                        <div className="text-center p-3 bg-background rounded-lg border">
                          <p className="text-2xl font-bold text-[#c19962]">{suggestedTargets.carbs}g</p>
                          <p className="text-xs text-muted-foreground">Carbs</p>
                        </div>
                        <div className="text-center p-3 bg-background rounded-lg border">
                          <p className="text-2xl font-bold text-[#c19962]">{suggestedTargets.fat}g</p>
                          <p className="text-xs text-muted-foreground">Fat</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        P: {getMacroPercentages(suggestedTargets).protein}% • 
                        C: {getMacroPercentages(suggestedTargets).carbs}% • 
                        F: {getMacroPercentages(suggestedTargets).fat}%
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Day-Specific Targets */}
            <Card>
              <CardHeader>
                <CardTitle>Day-Specific Nutrition Targets</CardTitle>
                <CardDescription>Your targets vary by day based on activity levels</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Day</TableHead>
                        <TableHead className="text-center">Workout</TableHead>
                        <TableHead className="text-right">TDEE</TableHead>
                        <TableHead className="text-right">Calories</TableHead>
                        <TableHead className="text-right">Protein</TableHead>
                        <TableHead className="text-right">Carbs</TableHead>
                        <TableHead className="text-right">Fat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayTargets.map((day) => {
                        const effective = getEffectiveTargets(day.day);
                        const isCustomized = customOverrides[day.day]?.isCustomized;
                        return (
                          <TableRow key={day.day} className={cn(
                            day.isWorkoutDay ? 'bg-[#c19962]/5' : '',
                            isCustomized && 'bg-blue-50/50'
                          )}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1">
                                {day.day}
                                {isCustomized && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 text-blue-600 border-blue-400">
                                    Custom
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {day.isWorkoutDay ? (
                                <Badge variant="default" className="bg-[#c19962]">
                                  <Dumbbell className="h-3 w-3 mr-1" />
                                  {day.workoutDuration}min
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">Rest</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{Math.round(day.totalTDEE)}</TableCell>
                            <TableCell className={cn("text-right font-medium", isCustomized && "text-blue-700")}>
                              {Math.round(effective?.targetCalories || day.targetCalories)}
                            </TableCell>
                            <TableCell className={cn("text-right", isCustomized && "text-blue-700")}>
                              {Math.round(effective?.protein || day.protein)}g
                            </TableCell>
                            <TableCell className={cn("text-right", isCustomized && "text-blue-700")}>
                              {Math.round(effective?.carbs || day.carbs)}g
                            </TableCell>
                            <TableCell className={cn("text-right", isCustomized && "text-blue-700")}>
                              {Math.round(effective?.fat || day.fat)}g
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Personalized Targets Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#c19962]" />
                  Your Personalized Targets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Average Calories */}
                  <div className="text-center p-4 bg-gradient-to-br from-[#00263d] to-[#003b59] text-white rounded-lg">
                    <p className="text-[#82c2d7] text-sm mb-1">Average Daily Calories</p>
                    <p className="text-4xl font-bold">{suggestedTargets?.calories || 0}</p>
                  </div>
                  
                  {/* Fat-Free Mass */}
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-muted-foreground text-sm mb-1">Fat-Free Mass</p>
                    <p className="text-2xl font-bold">{bodyComp?.ffmKg.toFixed(1)} kg</p>
                    <p className="text-sm text-muted-foreground">{bodyComp?.ffmLbs.toFixed(1)} lbs</p>
                  </div>
                  
                  {/* Energy Availability */}
                  <div className={cn(
                    "text-center p-4 rounded-lg",
                    energyAvailability?.status === 'low' && 'bg-red-50 border border-red-200',
                    energyAvailability?.status === 'moderate' && 'bg-yellow-50 border border-yellow-200',
                    energyAvailability?.status === 'optimal' && 'bg-green-50 border border-green-200'
                  )}>
                    <p className="text-muted-foreground text-sm mb-1">Energy Availability</p>
                    <p className="text-2xl font-bold">{energyAvailability?.value} kcal/kg FFM</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {energyAvailability?.status === 'low' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {energyAvailability?.status === 'moderate' && <Info className="h-4 w-4 text-yellow-500" />}
                      {energyAvailability?.status === 'optimal' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      <span className={cn(
                        "text-xs",
                        energyAvailability?.status === 'low' && 'text-red-600',
                        energyAvailability?.status === 'moderate' && 'text-yellow-600',
                        energyAvailability?.status === 'optimal' && 'text-green-600'
                      )}>
                        {energyAvailability?.message}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Macronutrient Breakdown */}
                <h4 className="font-semibold mb-4">Macronutrient Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Protein */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Protein</span>
                      <Badge variant="outline">{suggestedTargets ? getMacroPercentages(suggestedTargets).protein : 0}%</Badge>
                    </div>
                    <p className="text-3xl font-bold text-[#00263d]">{suggestedTargets?.protein}g</p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>• {weightKg > 0 ? ((suggestedTargets?.protein || 0) / weightKg).toFixed(1) : 0}g per kg body weight</p>
                      <p>• {bodyComp?.ffmKg ? ((suggestedTargets?.protein || 0) / bodyComp.ffmKg).toFixed(1) : 0}g per kg FFM</p>
                    </div>
                  </div>
                  
                  {/* Carbs */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Carbs</span>
                      <Badge variant="outline">{suggestedTargets ? getMacroPercentages(suggestedTargets).carbs : 0}%</Badge>
                    </div>
                    <p className="text-3xl font-bold text-[#003b59]">{suggestedTargets?.carbs}g</p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>• {weightKg > 0 ? ((suggestedTargets?.carbs || 0) / weightKg).toFixed(1) : 0}g per kg body weight</p>
                      <p>• Primary energy source for brain & muscles</p>
                    </div>
                  </div>
                  
                  {/* Fat */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Fat</span>
                      <Badge variant="outline">{suggestedTargets ? getMacroPercentages(suggestedTargets).fat : 0}%</Badge>
                    </div>
                    <p className="text-3xl font-bold text-[#c19962]">{suggestedTargets?.fat}g</p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>• {weightKg > 0 ? ((suggestedTargets?.fat || 0) / weightKg).toFixed(1) : 0}g per kg body weight</p>
                      <p>• Essential for hormone production</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meal Distribution with Nutrient Timing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-[#c19962]" />
                  Meal Distribution & Nutrient Timing
                </CardTitle>
                <CardDescription>
                  Intelligent distribution based on your workout schedule
                  {selectedDayWorkout && (
                    <span className="ml-2 text-[#c19962]">
                      • {selectedDay} workout at {workoutTime}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Day Selector for viewing timing */}
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => {
                    const dt = dayTargets.find(d => d.day === day);
                    return (
                      <Button
                        key={day}
                        variant={selectedDay === day ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          selectedDay === day && 'bg-[#c19962] hover:bg-[#e4ac61]',
                          dt?.isWorkoutDay && selectedDay !== day && 'border-[#c19962]'
                        )}
                      >
                        {day.substring(0, 3)}
                        {dt?.isWorkoutDay && <Dumbbell className="h-3 w-3 ml-1" />}
                      </Button>
                    );
                  })}
                </div>

                {/* Nutrient Timing Recommendations for Workout Days */}
                {nutrientTimingRecs && (
                  <div className="p-4 border-2 border-[#c19962]/30 bg-gradient-to-r from-[#c19962]/10 to-transparent rounded-lg">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Flame className="h-4 w-4 text-[#c19962]" />
                      Workout Day Nutrient Timing ({selectedDay})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-1">Pre-Workout ({nutrientTimingRecs.preWorkout.timing})</p>
                        <div className="flex gap-3 text-sm">
                          <span><strong>{nutrientTimingRecs.preWorkout.protein}g</strong> protein</span>
                          <span><strong>{nutrientTimingRecs.preWorkout.carbs}g</strong> carbs</span>
                          <span><strong>{nutrientTimingRecs.preWorkout.fat}g</strong> fat</span>
                        </div>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-1">Post-Workout ({nutrientTimingRecs.postWorkout.timing})</p>
                        <div className="flex gap-3 text-sm">
                          <span><strong>{nutrientTimingRecs.postWorkout.protein}g</strong> protein</span>
                          <span><strong>{nutrientTimingRecs.postWorkout.carbs}g</strong> carbs</span>
                          <span><strong>{nutrientTimingRecs.postWorkout.fat}g</strong> fat</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{nutrientTimingRecs.rationale}</p>
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Each Meal (~{mealStructure.mealsPerDay} per day)</p>
                    <p className="text-xl font-bold">~{mealDistribution.find(m => m.type === 'meal')?.calories || 0} calories</p>
                    <p className="text-sm text-muted-foreground">
                      ~{mealDistribution.find(m => m.type === 'meal')?.protein || 0}g protein
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Each Snack (~{mealStructure.snacksPerDay} per day)</p>
                    <p className="text-xl font-bold">~{mealDistribution.find(m => m.type === 'snack')?.calories || 0} calories</p>
                    <p className="text-sm text-muted-foreground">
                      ~{mealDistribution.find(m => m.type === 'snack')?.protein || 0}g protein
                    </p>
                  </div>
                </div>

                {/* Detailed Meal Table with Timing Info */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Meal</TableHead>
                      <TableHead className="text-right">Calories</TableHead>
                      <TableHead className="text-right">Protein</TableHead>
                      <TableHead className="text-right">Carbs</TableHead>
                      <TableHead className="text-right">Fat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mealDistributionWithTiming.map((meal) => (
                      <TableRow 
                        key={meal.id}
                        className={cn(
                          meal.workoutRelation === 'pre-workout' && 'bg-amber-50/50',
                          meal.workoutRelation === 'post-workout' && 'bg-green-50/50'
                        )}
                      >
                        <TableCell>{meal.time}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {meal.type === 'meal' ? (
                              <Utensils className="h-4 w-4 text-[#c19962]" />
                            ) : (
                              <Zap className="h-4 w-4 text-blue-500" />
                            )}
                            {meal.label}
                            {meal.workoutRelation === 'pre-workout' && (
                              <Badge className="bg-amber-500 text-white text-xs">Pre-Workout</Badge>
                            )}
                            {meal.workoutRelation === 'post-workout' && (
                              <Badge className="bg-green-500 text-white text-xs">Post-Workout</Badge>
                            )}
                            {meal.workoutRelation === 'none' && (
                              <Badge variant="secondary" className="text-xs capitalize">{meal.type}</Badge>
                            )}
                          </div>
                          {meal.rationale && (
                            <p className="text-xs text-muted-foreground mt-0.5">{meal.rationale}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">{meal.targets.calories}</TableCell>
                        <TableCell className="text-right">{meal.targets.protein}g</TableCell>
                        <TableCell className="text-right">{meal.targets.carbs}g</TableCell>
                        <TableCell className="text-right">{meal.targets.fat}g</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={2}>Daily Total</TableCell>
                      <TableCell className="text-right">
                        {mealDistributionWithTiming.reduce((sum, m) => sum + m.targets.calories, 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {mealDistributionWithTiming.reduce((sum, m) => sum + m.targets.protein, 0)}g
                      </TableCell>
                      <TableCell className="text-right">
                        {mealDistributionWithTiming.reduce((sum, m) => sum + m.targets.carbs, 0)}g
                      </TableCell>
                      <TableCell className="text-right">
                        {mealDistributionWithTiming.reduce((sum, m) => sum + m.targets.fat, 0)}g
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {/* Nutrient Timing Evidence */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="timing-evidence">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Nutrient Timing Research
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-2">
                      <p className="text-muted-foreground">
                        <strong>Pre-Workout:</strong> 1-4 hours before training, consume 0.4-0.5 g/kg protein and 1-4 g/kg carbs 
                        for optimal energy and performance (Kerksick et al., 2017).
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Post-Workout:</strong> Within 2 hours after training, 0.4-0.5 g/kg protein maximizes muscle 
                        protein synthesis. Carbs help replenish glycogen stores (ISSN Position Stand, 2017).
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Important:</strong> Total daily intake matters more than timing for most individuals. 
                        Timing becomes more important for multiple daily sessions or fasted training (Aragon & Schoenfeld, 2013).
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Customization Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Customize Targets (Optional)</span>
                  <Switch
                    checked={showCustomization}
                    onCheckedChange={setShowCustomization}
                  />
                </CardTitle>
                <CardDescription>
                  Adjust your targets if needed, or use the suggested values
                </CardDescription>
              </CardHeader>
              {showCustomization && (
                <CardContent>
                  <div className="space-y-6">
                    {/* Day Selection */}
                    <div>
                      <Label className="text-base font-semibold">Select Day to Customize</Label>
                      <div className="grid grid-cols-7 gap-2 mt-2">
                        {DAYS.map((day) => {
                          const dt = dayTargets.find(d => d.day === day);
                          const hasCustom = customOverrides[day]?.isCustomized;
                          return (
                            <Button
                              key={day}
                              variant={selectedDay === day ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSelectedDay(day)}
                              className={cn(
                                selectedDay === day && 'bg-[#c19962] hover:bg-[#e4ac61]',
                                dt?.isWorkoutDay && selectedDay !== day && 'border-[#c19962]',
                                hasCustom && selectedDay !== day && 'bg-blue-50 border-blue-300'
                              )}
                            >
                              <div className="flex flex-col items-center">
                                <span>{day.substring(0, 3)}</span>
                                {hasCustom && <span className="text-[8px] text-blue-600">Custom</span>}
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Customization Panel for Selected Day */}
                    {selectedDayTargets && (
                      <div className="p-4 border-2 border-[#c19962]/30 bg-[#c19962]/5 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{selectedDay} Targets</h4>
                            {customOverrides[selectedDay]?.isCustomized && (
                              <Badge variant="outline" className="text-blue-600 border-blue-600">Customized</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedDayTargets.isWorkoutDay && (
                              <Badge className="bg-[#c19962]">
                                <Dumbbell className="h-3 w-3 mr-1" />
                                {selectedDayTargets.workoutType}
                              </Badge>
                            )}
                            {customOverrides[selectedDay]?.isCustomized && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => resetDayToCalculated(selectedDay)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Calculated vs Custom Display */}
                        <div className="text-xs text-muted-foreground mb-2">
                          TDEE: {selectedDayTargets.totalTDEE} cal 
                          {selectedDayTargets.isWorkoutDay && ` (includes ${selectedDayTargets.workoutCalories} workout calories)`}
                        </div>

                        {/* Editable Fields */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Calories</Label>
                            <Input
                              type="number"
                              value={customOverrides[selectedDay]?.calories ?? selectedDayTargets.targetCalories}
                              onChange={(e) => updateCustomOverride(selectedDay, 'calories', Number(e.target.value))}
                              className="text-center font-bold"
                            />
                            <p className="text-[10px] text-muted-foreground text-center">
                              Calc: {selectedDayTargets.targetCalories}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Protein (g)</Label>
                            <Input
                              type="number"
                              value={customOverrides[selectedDay]?.protein ?? selectedDayTargets.protein}
                              onChange={(e) => updateCustomOverride(selectedDay, 'protein', Number(e.target.value))}
                              className="text-center font-bold"
                            />
                            <p className="text-[10px] text-muted-foreground text-center">
                              Calc: {selectedDayTargets.protein}g
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Carbs (g)</Label>
                            <Input
                              type="number"
                              value={customOverrides[selectedDay]?.carbs ?? selectedDayTargets.carbs}
                              onChange={(e) => updateCustomOverride(selectedDay, 'carbs', Number(e.target.value))}
                              className="text-center font-bold"
                            />
                            <p className="text-[10px] text-muted-foreground text-center">
                              Calc: {selectedDayTargets.carbs}g
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Fat (g)</Label>
                            <Input
                              type="number"
                              value={customOverrides[selectedDay]?.fat ?? selectedDayTargets.fat}
                              onChange={(e) => updateCustomOverride(selectedDay, 'fat', Number(e.target.value))}
                              className="text-center font-bold"
                            />
                            <p className="text-[10px] text-muted-foreground text-center">
                              Calc: {selectedDayTargets.fat}g
                            </p>
                          </div>
                        </div>

                        {/* Macro Check */}
                        {customOverrides[selectedDay]?.isCustomized && (() => {
                          const override = customOverrides[selectedDay];
                          const customCals = override.calories ?? selectedDayTargets.targetCalories;
                          const customP = override.protein ?? selectedDayTargets.protein;
                          const customC = override.carbs ?? selectedDayTargets.carbs;
                          const customF = override.fat ?? selectedDayTargets.fat;
                          const macroCals = customP * 4 + customC * 4 + customF * 9;
                          const diff = customCals - macroCals;
                          return (
                            <div className={cn(
                              "p-2 rounded text-xs",
                              Math.abs(diff) > 100 ? "bg-orange-50 text-orange-700" : "bg-green-50 text-green-700"
                            )}>
                              Macros = {macroCals} cal ({customP}×4 + {customC}×4 + {customF}×9)
                              {Math.abs(diff) > 10 && (
                                <span className="ml-2">
                                  {diff > 0 ? `(${diff} cal unaccounted)` : `(${Math.abs(diff)} cal over from macros)`}
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Apply to Multiple Days */}
                        <Separator />
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={applyToAllDays}>
                            Apply to All Days
                          </Button>
                          <Button variant="outline" size="sm" onClick={applyToWorkoutDays}>
                            Apply to Workout Days
                          </Button>
                          <Button variant="outline" size="sm" onClick={applyToRestDays}>
                            Apply to Rest Days
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Custom Overrides Summary */}
                    {Object.values(customOverrides).some(o => o.isCustomized) && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="font-semibold text-sm text-blue-800 mb-2">Customized Days Summary</h5>
                        <div className="grid grid-cols-7 gap-1 text-xs">
                          {DAYS.map(day => {
                            const override = customOverrides[day];
                            const calc = dayTargets.find(d => d.day === day);
                            if (!override.isCustomized) return (
                              <div key={day} className="text-center text-muted-foreground">
                                <div className="font-medium">{day.substring(0, 3)}</div>
                                <div>{calc?.targetCalories}</div>
                              </div>
                            );
                            return (
                              <div key={day} className="text-center text-blue-700 bg-blue-100 rounded p-1">
                                <div className="font-medium">{day.substring(0, 3)}</div>
                                <div className="font-bold">{override.calories ?? calc?.targetCalories}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Confirm Actions */}
            <Card className="border-[#c19962]">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  {/* Export PDF Notice */}
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-800">
                        <strong>Export targets only?</strong> Download a PDF with phase design and nutrition targets (no meal plan).
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleExportPDF}
                      disabled={isExportingPDF}
                      className="border-amber-400 text-amber-700 hover:bg-amber-100"
                    >
                      {isExportingPDF ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Export Phase Plan PDF
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={handleRecalculate}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Recalculate
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => router.push('/preferences')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Preferences
                      </Button>
                      <Button 
                        onClick={handleConfirmTargets} 
                        size="lg"
                        className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Confirm & Generate Meal Plan
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Summary Sidebar */}
          <div className="xl:col-span-1">
            <div className="sticky top-24">
              <ProgressSummary currentStep={4} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
