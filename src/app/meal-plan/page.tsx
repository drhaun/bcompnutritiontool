'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProgressSteps } from '@/components/layout/progress-steps';
import { ProgressSummary } from '@/components/layout/progress-summary';
import { MealSlotCard, ManualMealForm, MealSwapDialog } from '@/components/meal-plan';
import { useFitomicsStore } from '@/lib/store';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Download, 
  Dumbbell, 
  Clock, 
  Utensils,
  Sparkles,
  Moon,
  Sun,
  Target,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Undo2,
  Redo2,
  Trash2
} from 'lucide-react';
import type { DayOfWeek, MealSlot, Meal, Macros } from '@/types';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Generate meal slot labels - chronological order (Meal 1, Snack 1, Meal 2, etc.)
const getMealSlotLabels = (mealsCount: number, snacksCount: number) => {
  const labels: { type: 'meal' | 'snack'; label: string }[] = [];
  
  // Calculate total eating occasions and distribute snacks between meals
  // Pattern: M1, (S1?), M2, (S2?), M3, (remaining snacks)
  let mealNum = 1;
  let snackNum = 1;
  let snacksPlaced = 0;
  
  for (let i = 0; i < mealsCount; i++) {
    labels.push({ type: 'meal', label: `Meal ${mealNum}` });
    mealNum++;
    
    // Place snacks between meals (distribute evenly)
    // For 3 meals + 2 snacks: M1, S1, M2, S2, M3
    // For 2 meals + 1 snack: M1, S1, M2
    const snacksBetweenMeals = Math.floor(snacksCount / Math.max(mealsCount - 1, 1));
    const snacksToPlace = i < mealsCount - 1 
      ? Math.min(snacksBetweenMeals + (snacksPlaced < snacksCount % Math.max(mealsCount - 1, 1) ? 1 : 0), snacksCount - snacksPlaced)
      : 0;
    
    for (let j = 0; j < snacksToPlace && snacksPlaced < snacksCount; j++) {
      labels.push({ type: 'snack', label: `Snack ${snackNum}` });
      snackNum++;
      snacksPlaced++;
    }
  }
  
  // Add any remaining snacks at the end
  while (snacksPlaced < snacksCount) {
    labels.push({ type: 'snack', label: `Snack ${snackNum}` });
    snackNum++;
    snacksPlaced++;
  }
  
  return labels;
};

// Parse time string to minutes from midnight (for proper time comparison)
const parseTimeToMinutes = (t: string): number => {
  const [time, period] = t.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

// Calculate time slots based on wake/sleep times
const getTimeSlots = (wakeTime: string, sleepTime: string, slotCount: number) => {
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };
  
  const wake = parseTimeToMinutes(wakeTime || '7:00 AM');
  const sleep = parseTimeToMinutes(sleepTime || '10:00 PM');
  const awakeMinutes = sleep > wake ? sleep - wake : (24 * 60 - wake) + sleep;
  const interval = Math.floor(awakeMinutes / (slotCount + 1));
  
  return Array(slotCount).fill(0).map((_, i) => formatTime(wake + interval * (i + 1)));
};

// Calculate target macros per slot
const calculateSlotTargets = (
  dayTargets: { targetCalories: number; protein: number; carbs: number; fat: number },
  slotLabels: { type: 'meal' | 'snack'; label: string }[]
): Macros[] => {
  const mealCount = slotLabels.filter(s => s.type === 'meal').length;
  const snackCount = slotLabels.filter(s => s.type === 'snack').length;
  
  // Meals get ~30% each, snacks get ~10% each (roughly)
  const mealPct = mealCount > 0 ? (0.9 - snackCount * 0.1) / mealCount : 0;
  const snackPct = 0.1;
  
  return slotLabels.map(slot => {
    const pct = slot.type === 'meal' ? mealPct : snackPct;
    return {
      calories: Math.round(dayTargets.targetCalories * pct),
      protein: Math.round(dayTargets.protein * pct),
      carbs: Math.round(dayTargets.carbs * pct),
      fat: Math.round(dayTargets.fat * pct),
    };
  });
};

export default function MealPlanPage() {
  const router = useRouter();
  const {
    userProfile,
    bodyCompGoals,
    dietPreferences,
    weeklySchedule,
    nutritionTargets,
    mealPlan,
    setMealPlan,
    updateMeal,
    updateMealNote,
    updateMealRationale,
    setMealLocked,
    deleteMeal,
    initializeDayPlan,
    clearDayMeals,
    clearAllMeals,
    canUndo,
    canRedo,
    undoMealPlan,
    redoMealPlan,
  } = useFitomicsStore();
  
  // State
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [generatingSlots, setGeneratingSlots] = useState<Record<number, boolean>>({});
  const [generatingNotes, setGeneratingNotes] = useState<Record<number, boolean>>({});
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [swappingSlot, setSwappingSlot] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingDay, setIsGeneratingDay] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, day: '' });
  const cancelGenerationRef = useRef(false);
  
  // Hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // Get day context
  const daySchedule = weeklySchedule[selectedDay];
  const dayTargets = nutritionTargets.find(t => t.day === selectedDay);
  const dayPlan = mealPlan?.[selectedDay];
  
  // Calculate slots for selected day
  const mealsCount = daySchedule?.mealCount || 3;
  const snacksCount = daySchedule?.snackCount || 2;
  const slotLabels = useMemo(() => getMealSlotLabels(mealsCount, snacksCount), [mealsCount, snacksCount]);
  const timeSlots = useMemo(() => 
    getTimeSlots(daySchedule?.wakeTime || '7:00 AM', daySchedule?.sleepTime || '10:00 PM', slotLabels.length),
    [daySchedule?.wakeTime, daySchedule?.sleepTime, slotLabels.length]
  );
  const slotTargets = useMemo(() => 
    dayTargets ? calculateSlotTargets(dayTargets, slotLabels) : [],
    [dayTargets, slotLabels]
  );
  
  // Build meal slots
  const mealSlots: MealSlot[] = useMemo(() => {
    const workouts = daySchedule?.workouts?.filter(w => w.enabled) || [];
    const workoutTimeStr = workouts.length > 0 ? workouts[0]?.timeSlot || '5:00 PM' : null;
    const workoutMinutes = workoutTimeStr ? parseTimeToMinutes(workoutTimeStr) : null;
    
    // Find which slot is pre-workout (last slot before workout) and post-workout (first slot after workout)
    let preWorkoutIdx = -1;
    let postWorkoutIdx = -1;
    
    if (workoutMinutes !== null) {
      // Convert slot times to minutes for proper comparison
      for (let i = 0; i < timeSlots.length; i++) {
        const slotMinutes = parseTimeToMinutes(timeSlots[i]);
        if (slotMinutes < workoutMinutes) {
          preWorkoutIdx = i; // Keep updating - we want the LAST one before workout
        } else if (postWorkoutIdx === -1) {
          postWorkoutIdx = i; // First slot after workout time
        }
      }
    }
    
    return slotLabels.map((slot, idx) => {
      const existingMeal = dayPlan?.meals?.[idx] || null;
      
      // Only mark ONE slot as pre-workout and ONE as post-workout
      let workoutRelation: 'pre-workout' | 'post-workout' | 'none' = 'none';
      if (idx === preWorkoutIdx) workoutRelation = 'pre-workout';
      if (idx === postWorkoutIdx) workoutRelation = 'post-workout';
      
      return {
        id: `${selectedDay}-${idx}`,
        day: selectedDay,
        slotIndex: idx,
        type: slot.type,
        label: slot.label,
        targetMacros: slotTargets[idx] || { calories: 0, protein: 0, carbs: 0, fat: 0 },
        meal: existingMeal,
        isLocked: existingMeal?.isLocked || false,
        timeSlot: timeSlots[idx],
        workoutRelation,
      };
    });
  }, [selectedDay, slotLabels, timeSlots, slotTargets, dayPlan, daySchedule]);
  
  // Calculate day progress
  const dayProgress = useMemo(() => {
    if (!dayTargets) return { filled: 0, total: slotLabels.length, calories: 0, targetCalories: 0 };
    const filled = mealSlots.filter(s => s.meal !== null).length;
    const calories = mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.calories || 0), 0);
    return {
      filled,
      total: slotLabels.length,
      calories,
      targetCalories: dayTargets.targetCalories,
      protein: mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.protein || 0), 0),
      carbs: mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.carbs || 0), 0),
      fat: mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.fat || 0), 0),
    };
  }, [mealSlots, dayTargets, slotLabels.length]);
  
  // Weekly progress
  const weeklyProgress = useMemo(() => {
    let filledDays = 0;
    let totalSlots = 0;
    let filledSlots = 0;
    
    DAYS.forEach(day => {
      const dayPlanData = mealPlan?.[day];
      const schedule = weeklySchedule[day];
      const meals = schedule?.mealCount || 3;
      const snacks = schedule?.snackCount || 2;
      const daySlots = meals + snacks;
      totalSlots += daySlots;
      
      if (dayPlanData?.meals) {
        const filled = dayPlanData.meals.filter(m => m !== null).length;
        filledSlots += filled;
        if (filled === daySlots) filledDays++;
      }
    });
    
    return { filledDays, totalDays: 7, filledSlots, totalSlots };
  }, [mealPlan, weeklySchedule]);
  
  // Get all meal names for variety checking
  const allMealNames = useMemo(() => {
    const names: string[] = [];
    if (mealPlan) {
      DAYS.forEach(day => {
        mealPlan[day]?.meals?.forEach(m => {
          if (m?.name) names.push(m.name);
        });
      });
    }
    return names;
  }, [mealPlan]);
  
  // ============ HANDLERS ============
  
  const handleGenerateMeal = async (slotIndex: number) => {
    if (!dayTargets) return;
    
    setGeneratingSlots(prev => ({ ...prev, [slotIndex]: true }));
    
    try {
      const slot = mealSlots[slotIndex];
      
      const response = await fetch('/api/generate-single-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          bodyCompGoals,
          dietPreferences,
          mealRequest: {
            day: selectedDay,
            slotIndex,
            slotLabel: slot.label,
            targetMacros: slot.targetMacros,
            previousMeals: allMealNames,
            timeSlot: slot.timeSlot,
            workoutRelation: slot.workoutRelation,
            isWorkoutDay: dayTargets.isWorkoutDay,
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate meal');
      }
      
      const data = await response.json();
      updateMeal(selectedDay, slotIndex, data.meal);
      toast.success(`${slot.label} generated!`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate meal');
    } finally {
      setGeneratingSlots(prev => ({ ...prev, [slotIndex]: false }));
    }
  };
  
  const handleGenerateNote = async (slotIndex: number) => {
    const slot = mealSlots[slotIndex];
    if (!slot.meal) return;
    
    setGeneratingNotes(prev => ({ ...prev, [slotIndex]: true }));
    
    try {
      const response = await fetch('/api/generate-meal-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          bodyCompGoals,
          noteRequest: {
            meal: slot.meal,
            day: selectedDay,
            clientGoal: bodyCompGoals?.goalType,
            isWorkoutDay: dayTargets?.isWorkoutDay || false,
            slotLabel: slot.label,
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate note');
      }
      
      const data = await response.json();
      updateMealRationale(selectedDay, slotIndex, data.rationale);
      toast.success('AI rationale added!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate note');
    } finally {
      setGeneratingNotes(prev => ({ ...prev, [slotIndex]: false }));
    }
  };
  
  const handleSaveMeal = (slotIndex: number, meal: Meal) => {
    updateMeal(selectedDay, slotIndex, meal);
    setEditingSlot(null);
    toast.success('Meal saved!');
  };
  
  const handleSwapSelect = (meal: Meal) => {
    if (swappingSlot !== null) {
      updateMeal(selectedDay, swappingSlot, meal);
      setSwappingSlot(null);
      toast.success('Meal swapped!');
    }
  };
  
  const handleGenerateRemaining = async () => {
    const emptySlots = mealSlots
      .map((s, idx) => ({ ...s, idx }))
      .filter(s => !s.meal && !s.isLocked);
    
    for (const slot of emptySlots) {
      if (cancelGenerationRef.current) break;
      await handleGenerateMeal(slot.idx);
    }
  };
  
  // Helper to generate meals for a single day
  const generateMealsForDay = async (
    day: DayOfWeek, 
    previousMealNames: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<string[]> => {
    const schedule = weeklySchedule[day];
    const targets = nutritionTargets.find(t => t.day === day);
    if (!targets) return [];
    
    const mealsCount = schedule?.mealCount || 3;
    const snacksCount = schedule?.snackCount || 2;
    const labels = getMealSlotLabels(mealsCount, snacksCount);
    const times = getTimeSlots(schedule?.wakeTime || '7:00 AM', schedule?.sleepTime || '10:00 PM', labels.length);
    const slotTargetsForDay = calculateSlotTargets(targets, labels);
    
    // Determine pre/post workout slots
    const workouts = schedule?.workouts?.filter(w => w.enabled) || [];
    const workoutTimeStr = workouts.length > 0 ? workouts[0]?.timeSlot || '5:00 PM' : null;
    const workoutMinutes = workoutTimeStr ? parseTimeToMinutes(workoutTimeStr) : null;
    let preWorkoutIdx = -1;
    let postWorkoutIdx = -1;
    
    if (workoutMinutes !== null) {
      for (let i = 0; i < times.length; i++) {
        const slotMinutes = parseTimeToMinutes(times[i]);
        if (slotMinutes < workoutMinutes) {
          preWorkoutIdx = i;
        } else if (postWorkoutIdx === -1) {
          postWorkoutIdx = i;
        }
      }
    }
    
    const generatedNames: string[] = [];
    
    for (let idx = 0; idx < labels.length; idx++) {
      // Check for cancellation
      if (cancelGenerationRef.current) {
        toast.info('Generation stopped');
        break;
      }
      
      const existingMeal = mealPlan?.[day]?.meals?.[idx];
      if (existingMeal?.isLocked) continue;
      
      onProgress?.(idx + 1, labels.length);
      
      const slot = labels[idx];
      let workoutRelation: 'pre-workout' | 'post-workout' | 'none' = 'none';
      if (idx === preWorkoutIdx) workoutRelation = 'pre-workout';
      if (idx === postWorkoutIdx) workoutRelation = 'post-workout';
      
      try {
        const response = await fetch('/api/generate-single-meal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userProfile,
            bodyCompGoals,
            dietPreferences,
            mealRequest: {
              day,
              slotIndex: idx,
              slotLabel: slot.label,
              targetMacros: slotTargetsForDay[idx],
              previousMeals: [...previousMealNames, ...generatedNames],
              timeSlot: times[idx],
              workoutRelation,
              isWorkoutDay: targets.isWorkoutDay,
            },
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          updateMeal(day, idx, data.meal);
          generatedNames.push(data.meal.name);
        }
      } catch (error) {
        console.error(`Failed to generate ${day} ${slot.label}:`, error);
      }
    }
    
    return generatedNames;
  };
  
  // Generate meals for just the current day
  const handleGenerateDayMeals = async () => {
    setIsGeneratingDay(true);
    cancelGenerationRef.current = false;
    setGenerationProgress({ current: 0, total: slotLabels.length, day: selectedDay });
    
    try {
      await generateMealsForDay(selectedDay, allMealNames, (current, total) => {
        setGenerationProgress({ current, total, day: selectedDay });
      });
      
      if (!cancelGenerationRef.current) {
        toast.success(`${selectedDay} meals generated!`);
      }
    } catch (error) {
      console.error('Day generation error:', error);
      toast.error('Failed to generate meals');
    } finally {
      setIsGeneratingDay(false);
      setGenerationProgress({ current: 0, total: 0, day: '' });
    }
  };
  
  // Generate meals for the entire week
  const handleGenerateAllMeals = async () => {
    setIsGeneratingAll(true);
    cancelGenerationRef.current = false;
    const allMealNamesGenerated: string[] = [];
    
    // Count total meals across all days
    let totalMeals = 0;
    let processedMeals = 0;
    DAYS.forEach(day => {
      const schedule = weeklySchedule[day];
      totalMeals += (schedule?.mealCount || 3) + (schedule?.snackCount || 2);
    });
    
    try {
      for (const day of DAYS) {
        if (cancelGenerationRef.current) break;
        
        setGenerationProgress({ current: processedMeals, total: totalMeals, day });
        
        const generatedNames = await generateMealsForDay(
          day, 
          [...allMealNames, ...allMealNamesGenerated],
          (current, dayTotal) => {
            setGenerationProgress({ 
              current: processedMeals + current, 
              total: totalMeals, 
              day 
            });
          }
        );
        
        allMealNamesGenerated.push(...generatedNames);
        
        const schedule = weeklySchedule[day];
        processedMeals += (schedule?.mealCount || 3) + (schedule?.snackCount || 2);
      }
      
      if (!cancelGenerationRef.current) {
        toast.success('All meals generated!');
      }
    } catch (error) {
      console.error('Bulk generation error:', error);
      toast.error('Failed to generate all meals');
    } finally {
      setIsGeneratingAll(false);
      setGenerationProgress({ current: 0, total: 0, day: '' });
    }
  };
  
  // Stop generation
  const handleStopGeneration = () => {
    cancelGenerationRef.current = true;
    toast.info('Stopping generation...');
  };
  
  const handleDownloadPDF = async () => {
    if (!mealPlan) return;
    
    try {
      setIsDownloading(true);
      
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          bodyCompGoals,
          dietPreferences,
          weeklySchedule,
          nutritionTargets,
          mealPlan,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const clientName = userProfile.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'client';
      link.download = `${clientName}_nutrition_strategy_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProgressSteps currentStep={5} />
      
      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/targets')}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Targets
            </Button>
            <h1 className="text-2xl font-bold text-[#00263d]">
              Meal Plan Builder
            </h1>
            <p className="text-muted-foreground">
              Build {userProfile.name ? `${userProfile.name}'s` : 'the'} personalized nutrition plan meal by meal
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <div className="flex border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                onClick={undoMealPlan}
                disabled={!canUndo()}
                className="h-9 w-9 rounded-r-none"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={redoMealPlan}
                disabled={!canRedo()}
                className="h-9 w-9 rounded-l-none border-l"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Clear */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Clear all meals for the entire week? This can be undone.')) {
                  clearAllMeals();
                  toast.success('All meals cleared. Click Undo to restore.');
                }
              }}
              disabled={weeklyProgress.filledSlots === 0}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
            
            <div className="h-6 w-px bg-border mx-1" />
            
            {/* Generate Week / Stop */}
            {(isGeneratingAll || isGeneratingDay) ? (
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                  {generationProgress.day} ({generationProgress.current}/{generationProgress.total})
                </div>
                <Button
                  onClick={handleStopGeneration}
                  variant="destructive"
                  size="sm"
                >
                  Stop
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleGenerateAllMeals}
                className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Week
              </Button>
            )}
            
            {/* Download */}
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={isDownloading || weeklyProgress.filledSlots === 0 || isGeneratingAll || isGeneratingDay}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Weekly Progress Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Weekly Progress</CardTitle>
                  <Badge variant={weeklyProgress.filledDays === 7 ? 'default' : 'secondary'}>
                    {weeklyProgress.filledDays}/7 Days Complete
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={(weeklyProgress.filledSlots / weeklyProgress.totalSlots) * 100} 
                  className="h-2 mb-3"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{weeklyProgress.filledSlots} of {weeklyProgress.totalSlots} meals planned</span>
                  <span>{Math.round((weeklyProgress.filledSlots / weeklyProgress.totalSlots) * 100)}%</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Day Tabs */}
            <Tabs value={selectedDay} onValueChange={(v) => setSelectedDay(v as DayOfWeek)}>
              <TabsList className="grid grid-cols-7 mb-4">
                {DAYS.map(day => {
                  const schedule = weeklySchedule[day];
                  const hasWorkout = schedule?.workouts?.some(w => w.enabled);
                  const dayPlanData = mealPlan?.[day];
                  const filled = dayPlanData?.meals?.filter(m => m !== null).length || 0;
                  const total = (schedule?.mealCount || 3) + (schedule?.snackCount || 2);
                  const isComplete = filled === total;
                  
                  return (
                    <TabsTrigger 
                      key={day} 
                      value={day}
                      className="relative data-[state=active]:bg-[#c19962] data-[state=active]:text-[#00263d]"
                    >
                      <div className="flex flex-col items-center py-1">
                        <span className="text-xs font-medium">{day.substring(0, 3)}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {hasWorkout && <Dumbbell className="h-3 w-3" />}
                          {isComplete ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : filled > 0 ? (
                            <span className="text-[10px]">{filled}/{total}</span>
                          ) : null}
                        </div>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              
              {DAYS.map(day => (
                <TabsContent key={day} value={day} className="space-y-4">
                  {/* Day Context Header */}
                  <Card className="bg-gradient-to-r from-[#00263d] to-[#003b59] text-white">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2">
                            {day}
                            {dayTargets?.isWorkoutDay && (
                              <Badge className="bg-[#c19962] text-[#00263d]">
                                <Dumbbell className="h-3 w-3 mr-1" />
                                Workout Day
                              </Badge>
                            )}
                          </h2>
                          <div className="flex items-center gap-4 mt-2 text-sm opacity-90">
                            <span className="flex items-center gap-1">
                              <Sun className="h-4 w-4" />
                              {daySchedule?.wakeTime || '7:00 AM'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Moon className="h-4 w-4" />
                              {daySchedule?.sleepTime || '10:00 PM'}
                            </span>
                            {daySchedule?.workouts?.filter(w => w.enabled).map((w, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <Dumbbell className="h-4 w-4" />
                                {w.type} @ {w.timeSlot}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-[#c19962]" />
                            <span className="text-2xl font-bold">{dayTargets?.targetCalories || 0}</span>
                            <span className="text-sm opacity-70">kcal</span>
                          </div>
                          <div className="text-sm opacity-70 mt-1">
                            {dayTargets?.protein || 0}g P • {dayTargets?.carbs || 0}g C • {dayTargets?.fat || 0}g F
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Day Progress Bar */}
                  <Card>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Day Progress: {dayProgress.filled}/{dayProgress.total} meals
                        </span>
                        <div className="flex items-center gap-2">
                          {/* Generate Day Button */}
                          {!isGeneratingDay && !isGeneratingAll && (
                            <Button
                              size="sm"
                              onClick={handleGenerateDayMeals}
                              className="h-7 text-xs bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              Generate {selectedDay}
                            </Button>
                          )}
                          {dayProgress.filled > 0 && !isGeneratingDay && !isGeneratingAll && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                clearDayMeals(selectedDay);
                                toast.success(`${selectedDay} cleared. Click Undo to restore.`);
                              }}
                              className="h-7 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Clear
                            </Button>
                          )}
                          <span className={`text-sm font-bold ml-2 ${
                            Math.abs(dayProgress.calories - dayProgress.targetCalories) / dayProgress.targetCalories <= 0.05
                              ? 'text-green-600'
                              : dayProgress.calories > 0 ? 'text-yellow-600' : 'text-muted-foreground'
                          }`}>
                            {dayProgress.calories} / {dayProgress.targetCalories} cal
                          </span>
                        </div>
                      </div>
                      <Progress value={(dayProgress.filled / dayProgress.total) * 100} className="h-2" />
                      {dayProgress.filled > 0 && (
                        <div className="flex justify-end gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{dayProgress.protein}g P</span>
                          <span>{dayProgress.carbs}g C</span>
                          <span>{dayProgress.fat}g F</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Editing Mode */}
                  {editingSlot !== null && (
                    <ManualMealForm
                      slot={mealSlots[editingSlot]}
                      existingMeal={mealSlots[editingSlot]?.meal}
                      dietPreferences={dietPreferences}
                      onSave={(meal) => handleSaveMeal(editingSlot, meal)}
                      onCancel={() => setEditingSlot(null)}
                    />
                  )}
                  
                  {/* Meal Slots */}
                  {editingSlot === null && (
                    <div className="space-y-4">
                      {mealSlots.map((slot, idx) => (
                        <MealSlotCard
                          key={slot.id}
                          slot={slot}
                          onGenerateMeal={handleGenerateMeal}
                          onManualEntry={(i) => setEditingSlot(i)}
                          onEditMeal={(i) => setEditingSlot(i)}
                          onSwapMeal={(i) => setSwappingSlot(i)}
                          onDeleteMeal={(i) => {
                            deleteMeal(selectedDay, i);
                            toast.success('Meal removed');
                          }}
                          onToggleLock={(i) => {
                            setMealLocked(selectedDay, i, !slot.isLocked);
                          }}
                          onUpdateNote={(i, note) => updateMealNote(selectedDay, i, note)}
                          onGenerateNote={handleGenerateNote}
                          isGenerating={generatingSlots[idx] || false}
                          isGeneratingNote={generatingNotes[idx] || false}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Bulk Actions */}
                  {editingSlot === null && dayProgress.filled < dayProgress.total && (
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={handleGenerateRemaining}
                        className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                        disabled={Object.values(generatingSlots).some(v => v)}
                      >
                        {Object.values(generatingSlots).some(v => v) ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Generate Remaining ({dayProgress.total - dayProgress.filled} meals)
                      </Button>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
          
          {/* Sidebar */}
          <div className="xl:col-span-1">
            <div className="sticky top-20">
              <ProgressSummary currentStep={5} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Swap Dialog */}
      {swappingSlot !== null && mealSlots[swappingSlot]?.meal && (
        <MealSwapDialog
          isOpen={swappingSlot !== null}
          onClose={() => setSwappingSlot(null)}
          slot={mealSlots[swappingSlot]}
          currentMeal={mealSlots[swappingSlot].meal!}
          excludeMeals={allMealNames}
          userProfile={userProfile}
          bodyCompGoals={bodyCompGoals}
          dietPreferences={dietPreferences}
          onSelectAlternative={handleSwapSelect}
        />
      )}
    </div>
  );
}
