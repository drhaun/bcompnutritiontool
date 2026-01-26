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
  calculateBodyComposition,
  lbsToKg,
  kgToLbs,
  heightToCm
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
  Zap
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
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [confirmedTargets, setConfirmedTargets] = useState(false);
  
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
    
    const goalType = bodyCompGoals.goalType || 'maintain';
    const weeklyChangeKg = bodyCompGoals.weeklyWeightChangePct 
      ? weightKg * bodyCompGoals.weeklyWeightChangePct
      : goalType === 'lose_fat' ? 0.5 : goalType === 'gain_muscle' ? 0.25 : 0;
    
    const targetCalories = calculateTargetCalories(baseTDEE, goalType, weeklyChangeKg);
    return calculateMacros(targetCalories, weightKg, goalType);
  }, [userProfile, bodyCompGoals]);

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
    
    const goalType = bodyCompGoals.goalType || 'maintain';
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
      const macros = calculateMacros(targetCalories, weightKg, goalType);

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
  }, [userProfile, bodyCompGoals, weeklySchedule]);

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

  // Calculate meal distribution
  const mealDistribution = useMemo((): MealDistribution[] => {
    if (!suggestedTargets) return [];
    
    const { mealsPerDay, snacksPerDay } = mealStructure;
    const totalOccasions = mealsPerDay + snacksPerDay;
    
    // Meals get 75% of calories, snacks get 25%
    const mealCalories = Math.round((suggestedTargets.calories * 0.75) / mealsPerDay);
    const snackCalories = snacksPerDay > 0 ? Math.round((suggestedTargets.calories * 0.25) / snacksPerDay) : 0;
    
    const mealProtein = Math.round((suggestedTargets.protein * 0.75) / mealsPerDay);
    const snackProtein = snacksPerDay > 0 ? Math.round((suggestedTargets.protein * 0.25) / snacksPerDay) : 0;
    
    const mealCarbs = Math.round((suggestedTargets.carbs * 0.75) / mealsPerDay);
    const snackCarbs = snacksPerDay > 0 ? Math.round((suggestedTargets.carbs * 0.25) / snacksPerDay) : 0;
    
    const mealFat = Math.round((suggestedTargets.fat * 0.75) / mealsPerDay);
    const snackFat = snacksPerDay > 0 ? Math.round((suggestedTargets.fat * 0.25) / snacksPerDay) : 0;
    
    const distribution: MealDistribution[] = [];
    const mealTimes = ['08:00', '12:00', '18:00', '21:00', '22:00'];
    const snackTimes = ['10:00', '15:00', '20:00', '22:00'];
    
    for (let i = 0; i < mealsPerDay; i++) {
      distribution.push({
        id: `meal-${i}`,
        label: `Meal ${i + 1}`,
        type: 'meal',
        time: mealTimes[i] || '12:00',
        calories: mealCalories,
        protein: mealProtein,
        carbs: mealCarbs,
        fat: mealFat,
      });
    }
    
    for (let i = 0; i < snacksPerDay; i++) {
      distribution.push({
        id: `snack-${i}`,
        label: `Snack ${i + 1}`,
        type: 'snack',
        time: snackTimes[i] || '15:00',
        calories: snackCalories,
        protein: snackProtein,
        carbs: snackCarbs,
        fat: snackFat,
      });
    }
    
    return distribution.sort((a, b) => a.time.localeCompare(b.time));
  }, [suggestedTargets, mealStructure]);

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
                            <TableCell className="text-right">{day.totalTDEE}</TableCell>
                            <TableCell className={cn("text-right font-medium", isCustomized && "text-blue-700")}>
                              {effective?.targetCalories || day.targetCalories}
                            </TableCell>
                            <TableCell className={cn("text-right", isCustomized && "text-blue-700")}>
                              {effective?.protein || day.protein}g
                            </TableCell>
                            <TableCell className={cn("text-right", isCustomized && "text-blue-700")}>
                              {effective?.carbs || day.carbs}g
                            </TableCell>
                            <TableCell className={cn("text-right", isCustomized && "text-blue-700")}>
                              {effective?.fat || day.fat}g
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

            {/* Meal Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-[#c19962]" />
                  Meal & Snack Distribution
                </CardTitle>
                <CardDescription>How your daily nutrition is distributed across eating occasions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                    {mealDistribution.map((meal) => (
                      <TableRow key={meal.id}>
                        <TableCell>{meal.time}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {meal.type === 'meal' ? (
                              <Utensils className="h-4 w-4 text-[#c19962]" />
                            ) : (
                              <Zap className="h-4 w-4 text-blue-500" />
                            )}
                            {meal.label}
                            <Badge variant="secondary" className="text-xs capitalize">{meal.type}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{meal.calories}</TableCell>
                        <TableCell className="text-right">{meal.protein}g</TableCell>
                        <TableCell className="text-right">{meal.carbs}g</TableCell>
                        <TableCell className="text-right">{meal.fat}g</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={2}>Daily Total</TableCell>
                      <TableCell className="text-right">
                        {mealDistribution.reduce((sum, m) => sum + m.calories, 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {mealDistribution.reduce((sum, m) => sum + m.protein, 0)}g
                      </TableCell>
                      <TableCell className="text-right">
                        {mealDistribution.reduce((sum, m) => sum + m.carbs, 0)}g
                      </TableCell>
                      <TableCell className="text-right">
                        {mealDistribution.reduce((sum, m) => sum + m.fat, 0)}g
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
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
