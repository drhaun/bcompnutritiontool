'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ProgressSteps } from '@/components/layout/progress-steps';
import { ProgressSummary } from '@/components/layout/progress-summary';
import { MealSlotCard, ManualMealForm, MealSwapDialog, RecipeRecommendations } from '@/components/meal-plan';
import { useFitomicsStore } from '@/lib/store';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Download, 
  Dumbbell, 
  Utensils,
  Sparkles,
  Moon,
  Sun,
  Target,
  CheckCircle,
  Loader2,
  Trash2,
  FileText,
  X,
  Copy,
  ShoppingCart,
  Eye,
  EyeOff,
  ChefHat,
  Calendar,
  Zap,
  Coffee,
  Undo2,
  Redo2,
  Info,
  ChevronRight
} from 'lucide-react';
import type { DayOfWeek, MealSlot, Meal, Macros } from '@/types';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ============ UTILITY FUNCTIONS ============

// Generate meal slot labels - chronological order
const getMealSlotLabels = (mealsCount: number, snacksCount: number) => {
  const labels: { type: 'meal' | 'snack'; label: string }[] = [];
  let mealNum = 1;
  let snackNum = 1;
  let snacksPlaced = 0;
  
  for (let i = 0; i < mealsCount; i++) {
    labels.push({ type: 'meal', label: `Meal ${mealNum}` });
    mealNum++;
    
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
  
  while (snacksPlaced < snacksCount) {
    labels.push({ type: 'snack', label: `Snack ${snackNum}` });
    snackNum++;
    snacksPlaced++;
  }
  
  return labels;
};

const parseTimeToMinutes = (t: string): number => {
  const [time, period] = t.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

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

const calculateSlotTargets = (
  dayTargets: { targetCalories: number; protein: number; carbs: number; fat: number },
  slotLabels: { type: 'meal' | 'snack'; label: string }[]
): Macros[] => {
  const mealCount = slotLabels.filter(s => s.type === 'meal').length;
  const snackCount = slotLabels.filter(s => s.type === 'snack').length;
  
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

// ============ DAY TYPE GROUPING ============

interface DayType {
  id: string;
  label: string;
  description: string;
  icon: 'workout' | 'rest' | 'active';
  days: DayOfWeek[];
  isWorkoutDay: boolean;
  workoutType?: string;
  mealsCount: number;
  snacksCount: number;
  avgCalories: number;
  avgProtein: number;
}

export default function MealPlanPage() {
  const router = useRouter();
  const {
    userProfile,
    bodyCompGoals,
    dietPreferences,
    weeklySchedule,
    nutritionTargets,
    mealPlan,
    updateMeal,
    updateMealNote,
    updateMealRationale,
    setMealLocked,
    deleteMeal,
    clearDayMeals,
    clearAllMeals,
    canUndo,
    canRedo,
    undoMealPlan,
    redoMealPlan,
  } = useFitomicsStore();
  
  // State
  const [isHydrated, setIsHydrated] = useState(false);
  const [viewMode, setViewMode] = useState<'day-types' | 'weekly'>('day-types');
  const [selectedDayType, setSelectedDayType] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [generatingSlots, setGeneratingSlots] = useState<Record<number, boolean>>({});
  const [generatingNotes, setGeneratingNotes] = useState<Record<number, boolean>>({});
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [swappingSlot, setSwappingSlot] = useState<number | null>(null);
  const [browsingRecipesSlot, setBrowsingRecipesSlot] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showGroceryList, setShowGroceryList] = useState(false);
  const cancelGenerationRef = useRef(false);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // ============ COMPUTE DAY TYPES ============
  
  const dayTypes = useMemo((): DayType[] => {
    const types: Map<string, DayType> = new Map();
    
    DAYS.forEach(day => {
      const schedule = weeklySchedule[day];
      const targets = nutritionTargets.find(t => t.day === day);
      const workouts = schedule?.workouts?.filter(w => w.enabled) || [];
      const isWorkoutDay = workouts.length > 0;
      const workoutType = isWorkoutDay ? workouts[0]?.type : undefined;
      const mealsCount = schedule?.mealCount || 3;
      const snacksCount = schedule?.snackCount || 2;
      
      // Create a key based on workout status and meal structure
      const typeKey = `${isWorkoutDay ? `workout-${workoutType || 'general'}` : 'rest'}-${mealsCount}m-${snacksCount}s`;
      
      if (types.has(typeKey)) {
        const existing = types.get(typeKey)!;
        existing.days.push(day);
        // Update averages
        existing.avgCalories = Math.round((existing.avgCalories * (existing.days.length - 1) + (targets?.targetCalories || 0)) / existing.days.length);
        existing.avgProtein = Math.round((existing.avgProtein * (existing.days.length - 1) + (targets?.protein || 0)) / existing.days.length);
      } else {
        types.set(typeKey, {
          id: typeKey,
          label: isWorkoutDay 
            ? `${workoutType || 'Workout'} Day` 
            : 'Rest Day',
          description: `${mealsCount} meals, ${snacksCount} snacks`,
          icon: isWorkoutDay ? 'workout' : 'rest',
          days: [day],
          isWorkoutDay,
          workoutType,
          mealsCount,
          snacksCount,
          avgCalories: targets?.targetCalories || 0,
          avgProtein: targets?.protein || 0,
        });
      }
    });
    
    return Array.from(types.values());
  }, [weeklySchedule, nutritionTargets]);

  // Auto-select first day type
  useEffect(() => {
    if (dayTypes.length > 0 && !selectedDayType) {
      setSelectedDayType(dayTypes[0].id);
    }
  }, [dayTypes, selectedDayType]);

  // Get current context
  const currentDayType = useMemo(() => 
    dayTypes.find(dt => dt.id === selectedDayType) || dayTypes[0],
    [dayTypes, selectedDayType]
  );
  
  const currentDay = useMemo(() => 
    viewMode === 'day-types' ? currentDayType?.days[0] || 'Monday' : selectedDay,
    [viewMode, currentDayType, selectedDay]
  );

  const daySchedule = weeklySchedule[currentDay];
  const dayTargets = nutritionTargets.find(t => t.day === currentDay);
  const dayPlan = mealPlan?.[currentDay];
  
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
    
    let preWorkoutIdx = -1;
    let postWorkoutIdx = -1;
    
    if (workoutMinutes !== null) {
      for (let i = 0; i < timeSlots.length; i++) {
        const slotMinutes = parseTimeToMinutes(timeSlots[i]);
        if (slotMinutes < workoutMinutes) {
          preWorkoutIdx = i;
        } else if (postWorkoutIdx === -1) {
          postWorkoutIdx = i;
        }
      }
    }
    
    return slotLabels.map((slot, idx) => {
      const existingMeal = dayPlan?.meals?.[idx] || null;
      
      let workoutRelation: 'pre-workout' | 'post-workout' | 'none' = 'none';
      if (idx === preWorkoutIdx) workoutRelation = 'pre-workout';
      if (idx === postWorkoutIdx) workoutRelation = 'post-workout';
      
      return {
        id: `${currentDay}-${idx}`,
        day: currentDay,
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
  }, [currentDay, slotLabels, timeSlots, slotTargets, dayPlan, daySchedule]);

  // Progress calculations
  const dayProgress = useMemo(() => {
    if (!dayTargets) return { filled: 0, total: slotLabels.length, calories: 0, targetCalories: 0, protein: 0, carbs: 0, fat: 0 };
    const filled = mealSlots.filter(s => s.meal !== null).length;
    const calories = Math.round(mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.calories || 0), 0));
    return {
      filled,
      total: slotLabels.length,
      calories,
      targetCalories: Math.round(dayTargets.targetCalories),
      protein: Math.round(mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.protein || 0), 0)),
      carbs: Math.round(mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.carbs || 0), 0)),
      fat: Math.round(mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.fat || 0), 0)),
    };
  }, [mealSlots, dayTargets, slotLabels.length]);

  const overallProgress = useMemo(() => {
    let totalSlots = 0;
    let filledSlots = 0;
    
    DAYS.forEach(day => {
      const schedule = weeklySchedule[day];
      const daySlots = (schedule?.mealCount || 3) + (schedule?.snackCount || 2);
      totalSlots += daySlots;
      filledSlots += mealPlan?.[day]?.meals?.filter(m => m !== null).length || 0;
    });
    
    return { filledSlots, totalSlots, percent: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0 };
  }, [mealPlan, weeklySchedule]);

  // Get all meal names for variety
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

  // Consolidated grocery list
  const groceryList = useMemo(() => {
    const ingredientMap: Map<string, { qty: number; unit: string }> = new Map();
    
    if (mealPlan) {
      DAYS.forEach(day => {
        mealPlan[day]?.meals?.forEach(meal => {
          meal?.ingredients?.forEach(ingredient => {
            const name = ingredient.item.toLowerCase();
            const existing = ingredientMap.get(name);
            if (existing) {
              existing.qty += 1;
            } else {
              ingredientMap.set(name, { 
                qty: 1, 
                unit: ingredient.amount || 'serving' 
              });
            }
          });
        });
      });
    }
    
    return Array.from(ingredientMap.entries())
      .map(([name, data]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        ...data 
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
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
            day: currentDay,
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
      updateMeal(currentDay, slotIndex, data.meal);
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
            day: currentDay,
            clientGoal: bodyCompGoals?.goalType,
            isWorkoutDay: dayTargets?.isWorkoutDay || false,
            slotLabel: slot.label,
          },
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate note');
      
      const data = await response.json();
      updateMealRationale(currentDay, slotIndex, data.rationale);
      toast.success('AI rationale added!');
    } catch (error) {
      toast.error('Failed to generate note');
    } finally {
      setGeneratingNotes(prev => ({ ...prev, [slotIndex]: false }));
    }
  };

  const handleSaveMeal = (slotIndex: number, meal: Meal) => {
    updateMeal(currentDay, slotIndex, meal);
    setEditingSlot(null);
    toast.success('Meal saved!');
  };

  const handleSwapSelect = (meal: Meal) => {
    if (swappingSlot !== null) {
      updateMeal(currentDay, swappingSlot, meal);
      setSwappingSlot(null);
      toast.success('Meal swapped!');
    }
  };

  const handleGenerateDayType = async () => {
    if (!currentDayType) return;
    
    setIsGenerating(true);
    cancelGenerationRef.current = false;
    
    try {
      // Generate meals for the first day of this type
      const firstDay = currentDayType.days[0];
      
      for (let idx = 0; idx < mealSlots.length; idx++) {
        if (cancelGenerationRef.current) break;
        if (mealSlots[idx].meal?.isLocked) continue;
        
        await handleGenerateMeal(idx);
      }
      
      toast.success(`${currentDayType.label} template created!`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToSimilarDays = () => {
    if (!currentDayType || !dayPlan?.meals) return;
    
    // Copy meals from first day to all other days of same type
    currentDayType.days.slice(1).forEach(targetDay => {
      dayPlan.meals.forEach((meal, idx) => {
        if (meal) {
          updateMeal(targetDay, idx, { ...meal, lastModified: new Date().toISOString() });
        }
      });
    });
    
    toast.success(`Copied to ${currentDayType.days.length - 1} other days!`);
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
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
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
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c19962]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProgressSteps currentStep={5} />
      
      <div className="container max-w-[1600px] mx-auto py-6 px-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/targets')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#00263d]">Meal Plan Builder</h1>
              <p className="text-sm text-muted-foreground">
                {userProfile.name ? `${userProfile.name}'s` : ''} personalized nutrition plan
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <div className="flex border rounded-md">
              <Button variant="ghost" size="icon" onClick={undoMealPlan} disabled={!canUndo()} className="h-8 w-8">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={redoMealPlan} disabled={!canRedo()} className="h-8 w-8 border-l">
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Preview Toggle */}
            <Button
              variant={showPreview ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className={showPreview ? 'bg-[#00263d]' : ''}
            >
              {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              Preview
            </Button>
            
            {/* Grocery List */}
            <Button
              variant={showGroceryList ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowGroceryList(!showGroceryList)}
              className={showGroceryList ? 'bg-[#00263d]' : ''}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Grocery
            </Button>
            
            {/* Download */}
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloading || overallProgress.filledSlots === 0}
              className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
            >
              {isDownloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              Export PDF
            </Button>
          </div>
        </div>

        {/* Overall Progress */}
        <Card className="mb-4 border-[#c19962]/30">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-[#c19962]/20 flex items-center justify-center">
                    <ChefHat className="h-5 w-5 text-[#c19962]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{overallProgress.filledSlots} of {overallProgress.totalSlots} meals planned</p>
                    <p className="text-xs text-muted-foreground">{overallProgress.percent}% complete</p>
                  </div>
                </div>
                <Progress value={overallProgress.percent} className="w-48 h-2" />
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'day-types' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day-types')}
                  className={viewMode === 'day-types' ? 'bg-[#00263d]' : ''}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  By Day Type
                </Button>
                <Button
                  variant={viewMode === 'weekly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('weekly')}
                  className={viewMode === 'weekly' ? 'bg-[#00263d]' : ''}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Weekly View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          {/* Main Content */}
          <div className={`flex-1 transition-all ${showPreview || showGroceryList ? 'max-w-[60%]' : ''}`}>
            {viewMode === 'day-types' ? (
              // ============ DAY TYPES VIEW ============
              <div className="space-y-4">
                {/* Day Type Selector */}
                <div className="flex gap-2 flex-wrap">
                  {dayTypes.map(dt => {
                    const filledForType = dt.days.reduce((sum, day) => {
                      return sum + (mealPlan?.[day]?.meals?.filter(m => m !== null).length || 0);
                    }, 0);
                    const totalForType = dt.days.length * (dt.mealsCount + dt.snacksCount);
                    const isComplete = filledForType === totalForType;
                    
                    return (
                      <Button
                        key={dt.id}
                        variant={selectedDayType === dt.id ? 'default' : 'outline'}
                        className={`flex-col h-auto py-3 px-4 min-w-[140px] ${
                          selectedDayType === dt.id ? 'bg-[#00263d] hover:bg-[#003b59]' : ''
                        }`}
                        onClick={() => setSelectedDayType(dt.id)}
                      >
                        <div className="flex items-center gap-2">
                          {dt.isWorkoutDay ? (
                            <Dumbbell className="h-4 w-4" />
                          ) : (
                            <Coffee className="h-4 w-4" />
                          )}
                          <span className="font-medium">{dt.label}</span>
                          {isComplete && <CheckCircle className="h-3 w-3 text-green-400" />}
                        </div>
                        <span className="text-xs opacity-70 mt-1">
                          {dt.days.map(d => d.substring(0, 3)).join(', ')}
                        </span>
                        <span className="text-xs opacity-50 mt-0.5">
                          {dt.description} • ~{dt.avgCalories} cal
                        </span>
                      </Button>
                    );
                  })}
                </div>

                {currentDayType && (
                  <>
                    {/* Day Type Context */}
                    <Card className="bg-gradient-to-r from-[#00263d] to-[#003b59] text-white">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                              {currentDayType.isWorkoutDay ? (
                                <Dumbbell className="h-5 w-5 text-[#c19962]" />
                              ) : (
                                <Coffee className="h-5 w-5 text-[#c19962]" />
                              )}
                              {currentDayType.label} Template
                            </h2>
                            <p className="text-sm opacity-80 mt-1">
                              Applies to: <span className="font-medium">{currentDayType.days.join(', ')}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Target className="h-5 w-5 text-[#c19962]" />
                              <span className="text-2xl font-bold">{Math.round(dayTargets?.targetCalories || 0)}</span>
                              <span className="text-sm opacity-70">kcal</span>
                            </div>
                            <div className="text-sm opacity-70">
                              {Math.round(dayTargets?.protein || 0)}g P • {Math.round(dayTargets?.carbs || 0)}g C • {Math.round(dayTargets?.fat || 0)}g F
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Diet Preferences Panel - ALWAYS VISIBLE */}
                    <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Info className="h-4 w-4 text-amber-600" />
                          Client Diet Preferences
                          <span className="text-xs font-normal text-muted-foreground ml-auto">
                            AI & recipes will respect these
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-0 pb-3 space-y-2">
                        {/* Restrictions & Allergies Row */}
                        {((dietPreferences?.allergies?.length || 0) > 0 || 
                          (dietPreferences?.customAllergies?.length || 0) > 0 ||
                          (dietPreferences?.dietaryRestrictions?.length || 0) > 0 ||
                          dietPreferences?.dietaryPattern) && (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-xs font-medium text-red-700">⛔ Avoid:</span>
                            {dietPreferences?.dietaryPattern && (
                              <Badge className="bg-purple-100 text-purple-800 text-xs">{dietPreferences.dietaryPattern}</Badge>
                            )}
                            {dietPreferences?.dietaryRestrictions?.map(r => (
                              <Badge key={r} className="bg-orange-100 text-orange-800 text-xs">{r}</Badge>
                            ))}
                            {[...(dietPreferences?.allergies || []), ...(dietPreferences?.customAllergies || [])].map(a => (
                              <Badge key={a} className="bg-red-100 text-red-800 text-xs">🚨 {a}</Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Foods to Avoid Row */}
                        {(dietPreferences?.foodsToAvoid?.length || 0) > 0 && (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-xs font-medium text-orange-700">❌ Foods to Avoid:</span>
                            {dietPreferences?.foodsToAvoid?.map(f => (
                              <Badge key={f} variant="outline" className="text-xs border-orange-300 text-orange-700">{f}</Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Foods to Emphasize Row */}
                        {(dietPreferences?.foodsToEmphasize?.length || 0) > 0 && (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-xs font-medium text-green-700">✅ Emphasize:</span>
                            {dietPreferences?.foodsToEmphasize?.map(f => (
                              <Badge key={f} className="bg-green-100 text-green-800 text-xs">⭐ {f}</Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Preferred Foods Row */}
                        {((dietPreferences?.preferredProteins?.length || 0) > 0 || 
                          (dietPreferences?.preferredCarbs?.length || 0) > 0 ||
                          (dietPreferences?.preferredVegetables?.length || 0) > 0) && (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-xs font-medium text-blue-700">💙 Prefers:</span>
                            {dietPreferences?.preferredProteins?.slice(0, 3).map(p => (
                              <Badge key={p} variant="outline" className="text-xs border-blue-300 text-blue-700">{p}</Badge>
                            ))}
                            {dietPreferences?.preferredCarbs?.slice(0, 2).map(c => (
                              <Badge key={c} variant="outline" className="text-xs border-blue-300 text-blue-700">{c}</Badge>
                            ))}
                            {dietPreferences?.preferredVegetables?.slice(0, 2).map(v => (
                              <Badge key={v} variant="outline" className="text-xs border-blue-300 text-blue-700">{v}</Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* No preferences set */}
                        {!(dietPreferences?.allergies?.length || dietPreferences?.customAllergies?.length ||
                           dietPreferences?.dietaryRestrictions?.length || dietPreferences?.dietaryPattern ||
                           dietPreferences?.foodsToAvoid?.length || dietPreferences?.foodsToEmphasize?.length ||
                           dietPreferences?.preferredProteins?.length || dietPreferences?.preferredCarbs?.length ||
                           dietPreferences?.preferredVegetables?.length) && (
                          <p className="text-xs text-muted-foreground">
                            No dietary preferences set. <Button variant="link" className="h-auto p-0 text-xs" onClick={() => router.push('/preferences')}>Add preferences →</Button>
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleGenerateDayType}
                        disabled={isGenerating}
                        className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Generate {currentDayType.label}
                      </Button>
                      
                      {currentDayType.days.length > 1 && dayProgress.filled > 0 && (
                        <Button
                          variant="outline"
                          onClick={handleCopyToSimilarDays}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy to {currentDayType.days.length - 1} Similar Days
                        </Button>
                      )}
                      
                      {dayProgress.filled > 0 && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            clearDayMeals(currentDay);
                            toast.success('Template cleared');
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      )}
                      
                      <div className="ml-auto text-sm text-muted-foreground">
                        {dayProgress.filled}/{dayProgress.total} meals • {dayProgress.calories}/{dayProgress.targetCalories} cal
                      </div>
                    </div>

                    {/* Meal Slots */}
                    {editingSlot !== null ? (
                      <ManualMealForm
                        slot={mealSlots[editingSlot]}
                        existingMeal={mealSlots[editingSlot]?.meal}
                        dietPreferences={dietPreferences}
                        onSave={(meal) => handleSaveMeal(editingSlot, meal)}
                        onCancel={() => setEditingSlot(null)}
                      />
                    ) : (
                      <div className="space-y-3">
                        {mealSlots.map((slot, idx) => (
                          <MealSlotCard
                            key={slot.id}
                            slot={slot}
                            onGenerateMeal={handleGenerateMeal}
                            onManualEntry={(i) => setEditingSlot(i)}
                            onEditMeal={(i) => setEditingSlot(i)}
                            onSwapMeal={(i) => setSwappingSlot(i)}
                            onBrowseRecipes={(i) => setBrowsingRecipesSlot(i)}
                            onDeleteMeal={(i) => {
                              deleteMeal(currentDay, i);
                              toast.success('Meal removed');
                            }}
                            onToggleLock={(i) => setMealLocked(currentDay, i, !slot.isLocked)}
                            onUpdateNote={(i, note) => updateMealNote(currentDay, i, note)}
                            onGenerateNote={handleGenerateNote}
                            isGenerating={generatingSlots[idx] || false}
                            isGeneratingNote={generatingNotes[idx] || false}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              // ============ WEEKLY VIEW ============
              <Tabs value={selectedDay} onValueChange={(v) => setSelectedDay(v as DayOfWeek)}>
                <TabsList className="grid grid-cols-7 mb-4">
                  {DAYS.map(day => {
                    const schedule = weeklySchedule[day];
                    const hasWorkout = schedule?.workouts?.some(w => w.enabled);
                    const filled = mealPlan?.[day]?.meals?.filter(m => m !== null).length || 0;
                    const total = (schedule?.mealCount || 3) + (schedule?.snackCount || 2);
                    
                    return (
                      <TabsTrigger 
                        key={day} 
                        value={day}
                        className="data-[state=active]:bg-[#c19962] data-[state=active]:text-[#00263d]"
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-xs">{day.substring(0, 3)}</span>
                          <div className="flex items-center gap-0.5 text-[10px]">
                            {hasWorkout && <Dumbbell className="h-3 w-3" />}
                            {filled === total ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <span>{filled}/{total}</span>
                            )}
                          </div>
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                
                {DAYS.map(day => (
                  <TabsContent key={day} value={day} className="space-y-3">
                    {/* Day Header */}
                    <Card className="bg-gradient-to-r from-[#00263d] to-[#003b59] text-white">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold">{day}</h2>
                            {dayTargets?.isWorkoutDay && (
                              <Badge className="bg-[#c19962] text-[#00263d]">
                                <Dumbbell className="h-3 w-3 mr-1" />
                                Workout
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{Math.round(dayTargets?.targetCalories || 0)}</span>
                            <span className="text-sm opacity-70">kcal</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Meal Slots for Weekly View */}
                    {editingSlot !== null ? (
                      <ManualMealForm
                        slot={mealSlots[editingSlot]}
                        existingMeal={mealSlots[editingSlot]?.meal}
                        dietPreferences={dietPreferences}
                        onSave={(meal) => handleSaveMeal(editingSlot, meal)}
                        onCancel={() => setEditingSlot(null)}
                      />
                    ) : (
                      <div className="space-y-3">
                        {mealSlots.map((slot, idx) => (
                          <MealSlotCard
                            key={slot.id}
                            slot={slot}
                            onGenerateMeal={handleGenerateMeal}
                            onManualEntry={(i) => setEditingSlot(i)}
                            onEditMeal={(i) => setEditingSlot(i)}
                            onSwapMeal={(i) => setSwappingSlot(i)}
                            onBrowseRecipes={(i) => setBrowsingRecipesSlot(i)}
                            onDeleteMeal={(i) => {
                              deleteMeal(selectedDay, i);
                              toast.success('Meal removed');
                            }}
                            onToggleLock={(i) => setMealLocked(selectedDay, i, !slot.isLocked)}
                            onUpdateNote={(i, note) => updateMealNote(selectedDay, i, note)}
                            onGenerateNote={handleGenerateNote}
                            isGenerating={generatingSlots[idx] || false}
                            isGeneratingNote={generatingNotes[idx] || false}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>

          {/* Side Panel - Progress Summary (default), PDF Preview, or Grocery List */}
          {!(showPreview || showGroceryList) && (
            <div className="w-[320px] hidden xl:block">
              <div className="sticky top-20">
                <ProgressSummary currentStep={5} />
              </div>
            </div>
          )}
          
          {(showPreview || showGroceryList) && (
            <div className="w-[40%] max-w-[500px]">
              <Card className="sticky top-20 h-[calc(100vh-140px)] flex flex-col">
                <CardHeader className="py-3 border-b flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {showGroceryList ? (
                        <>
                          <ShoppingCart className="h-4 w-4 text-[#c19962]" />
                          Grocery List
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 text-[#c19962]" />
                          PDF Preview
                        </>
                      )}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setShowPreview(false);
                        setShowGroceryList(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <ScrollArea className="flex-1">
                  <CardContent className="py-4">
                    {showGroceryList ? (
                      // Grocery List
                      <div className="space-y-4">
                        {groceryList.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Add meals to see your grocery list
                          </p>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">
                              {groceryList.length} items from {overallProgress.filledSlots} meals
                            </p>
                            <div className="space-y-1">
                              {groceryList.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0">
                                  <span className="text-sm">{item.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(item.qty)} {item.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      // PDF Preview
                      <div className="space-y-4">
                        {/* Client Info */}
                        <div className="p-3 bg-[#00263d] text-white rounded-lg">
                          <div className="flex items-center gap-2">
                            <img 
                              src="/fitomics-logo.svg" 
                              alt="Fitomics" 
                              className="h-6 w-6 invert"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span className="font-bold text-sm">Personalized Nutrition Strategy</span>
                          </div>
                          <p className="text-xs opacity-70 mt-1">Prepared for {userProfile.name || 'Client'}</p>
                        </div>

                        {/* Summary */}
                        <div className="p-3 border rounded-lg space-y-2">
                          <h4 className="font-medium text-sm">Goal: {bodyCompGoals?.goalType?.replace('_', ' ') || 'Maintain'}</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Avg Calories:</span>
                              <span className="ml-1 font-medium">
                                {Math.round(nutritionTargets.reduce((s, t) => s + t.targetCalories, 0) / 7)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Avg Protein:</span>
                              <span className="ml-1 font-medium">
                                {Math.round(nutritionTargets.reduce((s, t) => s + t.protein, 0) / 7)}g
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Day Types Preview */}
                        <Accordion type="multiple" className="w-full">
                          {dayTypes.map(dt => {
                            const firstDayPlan = mealPlan?.[dt.days[0]];
                            const meals = firstDayPlan?.meals?.filter(m => m !== null) || [];
                            
                            return (
                              <AccordionItem key={dt.id} value={dt.id}>
                                <AccordionTrigger className="text-sm py-2">
                                  <div className="flex items-center gap-2">
                                    {dt.isWorkoutDay ? (
                                      <Dumbbell className="h-3 w-3 text-[#c19962]" />
                                    ) : (
                                      <Coffee className="h-3 w-3 text-[#c19962]" />
                                    )}
                                    {dt.label}
                                    <Badge variant="outline" className="text-[10px] ml-2">
                                      {dt.days.map(d => d.substring(0, 3)).join(', ')}
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  {meals.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2">No meals planned yet</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {meals.map((meal, idx) => (
                                        <div key={idx} className="p-2 bg-muted/50 rounded text-xs">
                                          <div className="font-medium">{meal?.name}</div>
                                          <div className="text-muted-foreground">
                                            {meal?.totalMacros?.calories} cal • {meal?.totalMacros?.protein}g P
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>

                        {overallProgress.filledSlots > 0 && (
                          <Button
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            className="w-full bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                          >
                            {isDownloading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            Download Full PDF
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </ScrollArea>
              </Card>
            </div>
          )}
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

      {/* Recipe Recommendations Dialog */}
      {browsingRecipesSlot !== null && (
        <RecipeRecommendations
          isOpen={browsingRecipesSlot !== null}
          onClose={() => setBrowsingRecipesSlot(null)}
          slot={mealSlots[browsingRecipesSlot]}
          dietPreferences={dietPreferences}
          excludeRecipes={allMealNames.map(n => n.toLowerCase().replace(/\s+/g, '-'))}
          onSelectRecipe={(meal) => {
            updateMeal(currentDay, browsingRecipesSlot, meal);
            setBrowsingRecipesSlot(null);
          }}
        />
      )}
    </div>
  );
}
