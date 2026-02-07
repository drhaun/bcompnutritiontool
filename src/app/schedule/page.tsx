'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProgressSteps } from '@/components/layout/progress-steps';
import { ProgressSummary } from '@/components/layout/progress-summary';
import { useFitomicsStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  Briefcase, 
  Dumbbell, 
  Utensils,
  Moon,
  Sun,
  Zap,
  Settings,
  ChefHat,
  Package,
  Truck,
  X,
  Check,
  Calendar,
  Plus,
  RefreshCw
} from 'lucide-react';
import type { 
  DayOfWeek, 
  WorkType, 
  WorkoutType, 
  WorkoutTimeSlot, 
  MealPrepMethod, 
  MealLocation,
  WorkoutConfig,
  MealContext,
  DaySchedule,
  TrainingZone
} from '@/types';
import { 
  estimateWorkoutCaloriesMET, 
  calculateZoneBasedCalories, 
  getDefaultZoneCalories,
  getTypicalZoneForWorkout,
  lbsToKg
} from '@/lib/nutrition-calc';

// ============ CONSTANTS ============

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'office', label: 'Office/On-site' },
  { value: 'remote', label: 'Remote Work' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'shift', label: 'Shift Work' },
  { value: 'none', label: 'Not Working' },
];

const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: 'Resistance Training', label: 'Resistance Training' },
  { value: 'Cardio', label: 'Cardio' },
  { value: 'HIIT', label: 'HIIT' },
  { value: 'Yoga/Mobility', label: 'Yoga/Mobility' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Mixed', label: 'Mixed Training' },
];

const WORKOUT_TIME_SLOTS: { value: WorkoutTimeSlot; label: string; range: string }[] = [
  { value: 'early_morning', label: 'Early Morning', range: '5:00-7:00 AM' },
  { value: 'morning', label: 'Morning', range: '7:00-10:00 AM' },
  { value: 'midday', label: 'Midday', range: '10:00 AM-2:00 PM' },
  { value: 'afternoon', label: 'Afternoon', range: '2:00-5:00 PM' },
  { value: 'evening', label: 'Evening', range: '5:00-8:00 PM' },
  { value: 'night', label: 'Night', range: '8:00-11:00 PM' },
];

const MEAL_PREP_METHODS: { value: MealPrepMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cook', label: 'Cook from scratch', icon: <ChefHat className="h-4 w-4" /> },
  { value: 'leftovers', label: 'Leftovers/Pre-prepped', icon: <Package className="h-4 w-4" /> },
  { value: 'pickup', label: 'Pickup or takeout', icon: <Utensils className="h-4 w-4" /> },
  { value: 'delivery', label: 'Meal delivery', icon: <Truck className="h-4 w-4" /> },
  { value: 'skip', label: 'Skip this meal', icon: <X className="h-4 w-4" /> },
];

const MEAL_LOCATIONS: { value: MealLocation; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'office', label: 'Office/Work' },
  { value: 'on_the_go', label: 'On the Go' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'gym', label: 'Gym' },
];

const PREP_TIMES = ['<5 min', '5-15 min', '15-30 min', '30+ min'];

const MEAL_TIME_RANGES = [
  'Early Morning (5:00-7:00 AM)',
  'Morning (7:00-10:00 AM)',
  'Late Morning (10:00 AM-12:00 PM)',
  'Midday (12:00-2:00 PM)',
  'Afternoon (2:00-5:00 PM)',
  'Evening (5:00-8:00 PM)',
  'Night (8:00-10:00 PM)',
];

// ============ COMPONENT ============

export default function SchedulePage() {
  const router = useRouter();
  const { userProfile, weeklySchedule, setWeeklySchedule, calculateNutritionTargets, setUserProfile } = useFitomicsStore();
  
  // Handle hydration mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const [activeTab, setActiveTab] = useState('general');
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);

  // ============ GENERAL SCHEDULE STATE ============
  const [wakeTime, setWakeTime] = useState('07:00');
  const [bedTime, setBedTime] = useState('22:30');
  const [workType, setWorkType] = useState<WorkType>('remote');
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');

  // ============ WORKOUT STATE ============
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(4);
  const [selectedWorkoutDays, setSelectedWorkoutDays] = useState<DayOfWeek[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday']);
  const [allowMultipleWorkouts, setAllowMultipleWorkouts] = useState(false);
  const [avoidBedtimeWorkouts, setAvoidBedtimeWorkouts] = useState(true);
  const [allowFastedWorkouts, setAllowFastedWorkouts] = useState(false);
  
  // Workout defaults
  const [defaultWorkoutType, setDefaultWorkoutType] = useState<WorkoutType>('Resistance Training');
  const [defaultTimeSlot, setDefaultTimeSlot] = useState<WorkoutTimeSlot>('evening');
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [defaultIntensity, setDefaultIntensity] = useState<'Low' | 'Medium' | 'High'>('High');

  // Per-day workout configs (now supports multiple workouts per day)
  const [dayWorkouts, setDayWorkouts] = useState<Record<DayOfWeek, WorkoutConfig[]>>(() => {
    const initial: Record<DayOfWeek, WorkoutConfig[]> = {} as Record<DayOfWeek, WorkoutConfig[]>;
    DAYS.forEach(day => {
      initial[day] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(day) 
        ? [{
            enabled: true,
            type: 'Resistance Training',
            timeSlot: 'evening',
            duration: 60,
            intensity: 'High',
          }]
        : [];
    });
    return initial;
  });

  // ============ MEAL PLANNING STATE ============
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [snacksPerDay, setSnacksPerDay] = useState(2);
  const [mealContexts, setMealContexts] = useState<MealContext[]>([]);
  
  // Meal defaults
  const [defaultMealPrepMethod, setDefaultMealPrepMethod] = useState<MealPrepMethod>('cook');
  const [defaultMealPrepTime, setDefaultMealPrepTime] = useState('15-30 min');
  const [defaultMealLocation, setDefaultMealLocation] = useState<MealLocation>('home');
  
  // Snack defaults
  const [defaultSnackPrepMethod, setDefaultSnackPrepMethod] = useState<MealPrepMethod>('leftovers');
  const [defaultSnackPrepTime, setDefaultSnackPrepTime] = useState('<5 min');
  const [defaultSnackLocation, setDefaultSnackLocation] = useState<MealLocation>('home');

  // ============ METABOLIC ZONE DATA STATE ============
  // Get body weight in kg for calculations (needed before zoneCaloriesInput state)
  const bodyWeightKg = userProfile.weightKg || lbsToKg(userProfile.weightLbs || 70);
  
  const [useZoneData, setUseZoneData] = useState(
    userProfile.metabolicAssessment?.hasZoneData || false
  );
  const [zoneCaloriesInput, setZoneCaloriesInput] = useState(
    userProfile.metabolicAssessment?.zoneCaloriesPerMin || getDefaultZoneCalories(bodyWeightKg)
  );

  // ============ NUTRIENT TIMING STATE ============
  const [includePreWorkoutMeal, setIncludePreWorkoutMeal] = useState(false);
  const [includePreWorkoutSnack, setIncludePreWorkoutSnack] = useState(true);
  const [includePostWorkoutMeal, setIncludePostWorkoutMeal] = useState(true);
  const [energyDistribution, setEnergyDistribution] = useState('steady');
  const [liquidCalories, setLiquidCalories] = useState('minimize');

  // ============ EFFECTS ============

  // Restore workout defaults from user profile (saved during setup)
  useEffect(() => {
    if (!isHydrated) return;
    if (userProfile.workoutsPerWeek !== undefined) {
      setWorkoutsPerWeek(userProfile.workoutsPerWeek);
    }
    if (userProfile.workoutDefaults) {
      const wd = userProfile.workoutDefaults;
      if (wd.type) setDefaultWorkoutType(wd.type);
      if (wd.timeSlot) setDefaultTimeSlot(wd.timeSlot);
      if (wd.duration) setDefaultDuration(wd.duration);
      if (wd.intensity) setDefaultIntensity(wd.intensity);
    }
    // Restore schedule from weeklySchedule if available
    const mondaySchedule = weeklySchedule?.Monday;
    if (mondaySchedule) {
      if (mondaySchedule.wakeTime) setWakeTime(mondaySchedule.wakeTime);
      if (mondaySchedule.sleepTime) setBedTime(mondaySchedule.sleepTime);
      if (mondaySchedule.workStartTime) {
        setWorkStartTime(mondaySchedule.workStartTime);
        setWorkType('office');
      }
      if (mondaySchedule.workEndTime) setWorkEndTime(mondaySchedule.workEndTime);
      if (mondaySchedule.mealCount !== undefined) setMealsPerDay(mondaySchedule.mealCount);
      if (mondaySchedule.snackCount !== undefined) setSnacksPerDay(mondaySchedule.snackCount);
      if (mondaySchedule.mealContexts?.length) setMealContexts(mondaySchedule.mealContexts);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  // Generate meal contexts when meals/snacks change
  useEffect(() => {
    const contexts: MealContext[] = [];
    
    // Default time ranges for meals (can be customized by user)
    const defaultMealTimes = [
      'Morning (7:00-10:00 AM)',
      'Midday (12:00-2:00 PM)', 
      'Evening (5:00-8:00 PM)',
      'Night (8:00-10:00 PM)',
      'Late Night (10:00 PM+)'
    ];
    
    // Default time ranges for snacks
    const defaultSnackTimes = [
      'Late Morning (10:00 AM-12:00 PM)',
      'Afternoon (2:00-5:00 PM)',
      'Evening (5:00-8:00 PM)',
      'Night (8:00-10:00 PM)'
    ];
    
    for (let i = 0; i < mealsPerDay; i++) {
      contexts.push({
        id: `meal-${i}`,
        type: 'meal',
        label: `Meal ${i + 1}`,
        prepMethod: 'cook',
        prepTime: '15-30 min',
        location: 'home',
        timeRange: defaultMealTimes[i] || defaultMealTimes[0],
        isRoutine: true,
      });
    }
    
    for (let i = 0; i < snacksPerDay; i++) {
      contexts.push({
        id: `snack-${i}`,
        type: 'snack',
        label: `Snack ${i + 1}`,
        prepMethod: 'leftovers',
        prepTime: '<5 min',
        location: 'home',
        timeRange: defaultSnackTimes[i] || defaultSnackTimes[0],
        isRoutine: true,
      });
    }
    
    setMealContexts(contexts);
  }, [mealsPerDay, snacksPerDay]);

  // Update workout days when workouts per week changes
  useEffect(() => {
    const currentCount = selectedWorkoutDays.length;
    if (workoutsPerWeek > currentCount) {
      // Add more days
      const availableDays = DAYS.filter(d => !selectedWorkoutDays.includes(d));
      const toAdd = availableDays.slice(0, workoutsPerWeek - currentCount);
      setSelectedWorkoutDays([...selectedWorkoutDays, ...toAdd]);
    } else if (workoutsPerWeek < currentCount) {
      // Remove days from the end
      setSelectedWorkoutDays(selectedWorkoutDays.slice(0, workoutsPerWeek));
    }
  }, [workoutsPerWeek]);

  // Update day workouts when selected days change
  useEffect(() => {
    setDayWorkouts(prev => {
      const updated = { ...prev };
      DAYS.forEach(day => {
        const isSelected = selectedWorkoutDays.includes(day);
        if (isSelected && updated[day].length === 0) {
          // Add default workout if day is selected but has no workouts
          updated[day] = [{
            enabled: true,
            type: defaultWorkoutType,
            timeSlot: defaultTimeSlot,
            duration: defaultDuration,
            intensity: defaultIntensity,
          }];
        } else if (!isSelected) {
          // Clear workouts if day is deselected
          updated[day] = [];
        }
      });
      return updated;
    });
  }, [selectedWorkoutDays, defaultWorkoutType, defaultTimeSlot, defaultDuration, defaultIntensity]);

  // ============ HELPERS ============

  const calculateSleepHours = () => {
    const [wH, wM] = wakeTime.split(':').map(Number);
    const [bH, bM] = bedTime.split(':').map(Number);
    
    // Convert to minutes from midnight
    let wakeMinutes = wH * 60 + wM;
    const bedMinutes = bH * 60 + bM;
    
    // If wake time is earlier than bed time, it means wake is next day
    if (wakeMinutes <= bedMinutes) {
      wakeMinutes += 24 * 60; // Add 24 hours
    }
    
    const sleepMinutes = wakeMinutes - bedMinutes;
    const sleepHours = sleepMinutes / 60;
    
    return sleepHours.toFixed(1);
  };

  const applyDefaultsToAllDays = () => {
    setDayWorkouts(prev => {
      const updated = { ...prev };
      DAYS.forEach(day => {
        if (selectedWorkoutDays.includes(day)) {
          // Apply defaults to all workouts on this day, or create one if none exist
          if (updated[day].length === 0) {
            updated[day] = [{
              enabled: true,
              type: defaultWorkoutType,
              timeSlot: defaultTimeSlot,
              duration: defaultDuration,
              intensity: defaultIntensity,
            }];
          } else {
            updated[day] = updated[day].map(w => ({
              ...w,
              type: defaultWorkoutType,
              timeSlot: defaultTimeSlot,
              duration: defaultDuration,
              intensity: defaultIntensity,
            }));
          }
        }
      });
      return updated;
    });
    toast.success('Defaults applied to all workout days');
  };
  
  const addWorkoutToDay = (day: DayOfWeek) => {
    setDayWorkouts(prev => ({
      ...prev,
      [day]: [...prev[day], {
        enabled: true,
        type: defaultWorkoutType,
        timeSlot: 'morning' as WorkoutTimeSlot, // Different time slot for 2nd workout
        duration: defaultDuration,
        intensity: defaultIntensity,
      }],
    }));
  };
  
  const removeWorkoutFromDay = (day: DayOfWeek, index: number) => {
    setDayWorkouts(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };
  
  const updateWorkout = (day: DayOfWeek, index: number, field: keyof WorkoutConfig, value: unknown) => {
    setDayWorkouts(prev => ({
      ...prev,
      [day]: prev[day].map((w, i) => i === index ? { ...w, [field]: value } : w),
    }));
  };

  const updateMealContext = (id: string, field: keyof MealContext, value: string | boolean) => {
    setMealContexts(prev => prev.map(ctx => 
      ctx.id === id ? { ...ctx, [field]: value } : ctx
    ));
  };
  
  const applyDefaultsToAllMeals = () => {
    setMealContexts(prev => prev.map(ctx => 
      ctx.type === 'meal' 
        ? { ...ctx, prepMethod: defaultMealPrepMethod, prepTime: defaultMealPrepTime, location: defaultMealLocation }
        : ctx
    ));
    toast.success('Defaults applied to all meals');
  };
  
  const applyDefaultsToAllSnacks = () => {
    setMealContexts(prev => prev.map(ctx => 
      ctx.type === 'snack' 
        ? { ...ctx, prepMethod: defaultSnackPrepMethod, prepTime: defaultSnackPrepTime, location: defaultSnackLocation }
        : ctx
    ));
    toast.success('Defaults applied to all snacks');
  };
  
  const applyDefaultsToAll = () => {
    setMealContexts(prev => prev.map(ctx => 
      ctx.type === 'meal' 
        ? { ...ctx, prepMethod: defaultMealPrepMethod, prepTime: defaultMealPrepTime, location: defaultMealLocation }
        : { ...ctx, prepMethod: defaultSnackPrepMethod, prepTime: defaultSnackPrepTime, location: defaultSnackLocation }
    ));
    toast.success('Defaults applied to all meals and snacks');
  };

  const toggleWorkoutDay = (day: DayOfWeek) => {
    if (selectedWorkoutDays.includes(day)) {
      const newDays = selectedWorkoutDays.filter(d => d !== day);
      setSelectedWorkoutDays(newDays);
      setWorkoutsPerWeek(newDays.length);
    } else {
      const newDays = [...selectedWorkoutDays, day];
      setSelectedWorkoutDays(newDays);
      setWorkoutsPerWeek(newDays.length);
    }
  };

  // Use local state for zone data (reflects current UI, not persisted store)
  // This allows real-time updates as user enters zone data
  const activeZoneCalories = useZoneData ? zoneCaloriesInput : getDefaultZoneCalories(bodyWeightKg);
  
  const estimateWorkoutCalories = (config: WorkoutConfig): number => {
    // Priority 1: If zone data is enabled AND workout has specified zone
    if (useZoneData && config.averageZone) {
      return calculateZoneBasedCalories(config.averageZone, config.duration, activeZoneCalories);
    }
    
    // Priority 2: Use zone data with estimated zone for workout type
    if (useZoneData) {
      const estimatedZone = getTypicalZoneForWorkout(config.type, config.intensity);
      return calculateZoneBasedCalories(estimatedZone, config.duration, activeZoneCalories);
    }
    
    // Priority 3: Use MET-based calculation (validated, conservative)
    return estimateWorkoutCaloriesMET(config.type, config.intensity, config.duration, bodyWeightKg);
  };

  // ============ SAVE HANDLER ============

  const handleSave = () => {
    const schedule: Record<DayOfWeek, DaySchedule> = {} as Record<DayOfWeek, DaySchedule>;
    
    DAYS.forEach(day => {
      const workouts = dayWorkouts[day];
      const workoutConfigs: WorkoutConfig[] = workouts.map(w => ({
        ...w,
        estimatedCalories: estimateWorkoutCalories(w),
      }));

      schedule[day] = {
        wakeTime,
        sleepTime: bedTime,
        workStartTime: workType !== 'none' ? workStartTime : undefined,
        workEndTime: workType !== 'none' ? workEndTime : undefined,
        workouts: workoutConfigs,
        mealCount: mealsPerDay,
        snackCount: snacksPerDay,
        mealContexts,
      };
    });

    // Save metabolic zone data if provided
    if (useZoneData) {
      setUserProfile({
        metabolicAssessment: {
          ...userProfile.metabolicAssessment,
          useMeasuredRMR: userProfile.metabolicAssessment?.useMeasuredRMR || false,
          selectedRMREquations: userProfile.metabolicAssessment?.selectedRMREquations || ['mifflin'],
          useAverageRMR: userProfile.metabolicAssessment?.useAverageRMR || false,
          calculatedRMR: userProfile.metabolicAssessment?.calculatedRMR || 0,
          useMeasuredBF: userProfile.metabolicAssessment?.useMeasuredBF || false,
          hasZoneData: true,
          zoneCaloriesPerMin: zoneCaloriesInput,
        }
      });
    }

    setWeeklySchedule(schedule);
    calculateNutritionTargets();
    
    toast.success('Schedule saved!');
    router.push('/preferences');
  };
  
  // Calculate total calories for a day's workouts
  const getDayWorkoutCalories = (day: DayOfWeek): number => {
    return dayWorkouts[day].reduce((sum, w) => sum + estimateWorkoutCalories(w), 0);
  };

  // ============ SCHEDULE PREVIEW DATA ============

  const schedulePreview = useMemo(() => {
    return DAYS.map(day => {
      const workouts = dayWorkouts[day];
      const workoutCalories = workouts.reduce((sum, w) => sum + estimateWorkoutCalories(w), 0);
      const baseTDEE = 2200; // Placeholder - would come from user profile
      
      const workoutSummary = workouts.length > 0
        ? workouts.map(w => `${w.duration}min ${w.type}`).join(' + ')
        : 'Rest Day';
      
      return {
        day,
        sleep: `${wakeTime} - ${bedTime} (${calculateSleepHours()}h)`,
        work: workType !== 'none' ? `${workStartTime} - ${workEndTime}` : 'Rest',
        workout: workoutSummary,
        workoutCount: workouts.length,
        meals: `${mealsPerDay} meals, ${snacksPerDay} snacks`,
        tdee: baseTDEE + workoutCalories,
        workoutCalories,
      };
    });
  }, [dayWorkouts, wakeTime, bedTime, workType, workStartTime, workEndTime, mealsPerDay, snacksPerDay]);

  // ============ RENDER ============

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">
          <ProgressSteps currentStep={2} />
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Weekly Schedule</h1>
            <p className="text-muted-foreground">Create a comprehensive schedule to optimize your meal planning</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="xl:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="general" className="text-xs px-2 py-2">
                  <Clock className="h-4 w-4 mr-1 hidden sm:inline" />
                  General
                </TabsTrigger>
                <TabsTrigger value="workouts" className="text-xs px-2 py-2">
                  <Dumbbell className="h-4 w-4 mr-1 hidden sm:inline" />
                  Workouts
                </TabsTrigger>
                <TabsTrigger value="meals" className="text-xs px-2 py-2">
                  <Utensils className="h-4 w-4 mr-1 hidden sm:inline" />
                  Meals
                </TabsTrigger>
                <TabsTrigger value="timing" className="text-xs px-2 py-2">
                  <Zap className="h-4 w-4 mr-1 hidden sm:inline" />
                  Timing
                </TabsTrigger>
              </TabsList>

              {/* ============ TAB 1: GENERAL SCHEDULE ============ */}
              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Moon className="h-5 w-5 text-[#c19962]" />
                      Sleep Schedule
                    </CardTitle>
                    <CardDescription>Your typical daily sleep routine</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="wakeTime">Wake Up Time</Label>
                        <Input
                          id="wakeTime"
                          type="time"
                          value={wakeTime}
                          onChange={(e) => setWakeTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bedTime">Bed Time</Label>
                        <Input
                          id="bedTime"
                          type="time"
                          value={bedTime}
                          onChange={(e) => setBedTime(e.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="p-3 bg-muted rounded-lg w-full text-center">
                          <p className="text-sm text-muted-foreground">Sleep Duration</p>
                          <p className="text-2xl font-bold">{calculateSleepHours()} hours</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-[#c19962]" />
                      Work Schedule
                    </CardTitle>
                    <CardDescription>Your typical work routine</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>Work Type</Label>
                        <Select value={workType} onValueChange={(v) => setWorkType(v as WorkType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WORK_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {workType !== 'none' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="workStart">Work Start Time</Label>
                            <Input
                              id="workStart"
                              type="time"
                              value={workStartTime}
                              onChange={(e) => setWorkStartTime(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="workEnd">Work End Time</Label>
                            <Input
                              id="workEnd"
                              type="time"
                              value={workEndTime}
                              onChange={(e) => setWorkEndTime(e.target.value)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => setActiveTab('workouts')} size="lg">
                    Continue to Workouts
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* ============ TAB 2: WORKOUTS ============ */}
              <TabsContent value="workouts" className="space-y-6">
                {/* Workout Defaults */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-[#c19962]" />
                      Workout Defaults
                    </CardTitle>
                    <CardDescription>Set defaults to save time configuring each day</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Workout Type</Label>
                        <Select value={defaultWorkoutType} onValueChange={(v) => setDefaultWorkoutType(v as WorkoutType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WORKOUT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Time Slot</Label>
                        <Select value={defaultTimeSlot} onValueChange={(v) => setDefaultTimeSlot(v as WorkoutTimeSlot)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WORKOUT_TIME_SLOTS.map((slot) => (
                              <SelectItem key={slot.value} value={slot.value}>
                                {slot.label} ({slot.range})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Duration: {defaultDuration} min</Label>
                        <Slider
                          min={15}
                          max={180}
                          step={15}
                          value={[defaultDuration]}
                          onValueChange={(v) => setDefaultDuration(v[0])}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Intensity</Label>
                        <Select value={defaultIntensity} onValueChange={(v) => setDefaultIntensity(v as 'Low' | 'Medium' | 'High')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button variant="outline" onClick={applyDefaultsToAllDays}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Apply Defaults to All Workout Days
                    </Button>
                  </CardContent>
                </Card>

                {/* Workout Options */}
                <Card>
                  <CardHeader>
                    <CardTitle>Workout Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="multipleWorkouts"
                        checked={allowMultipleWorkouts}
                        onCheckedChange={(checked) => setAllowMultipleWorkouts(checked as boolean)}
                      />
                      <Label htmlFor="multipleWorkouts">Allow multiple workouts per day</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="avoidBedtime"
                        checked={avoidBedtimeWorkouts}
                        onCheckedChange={(checked) => setAvoidBedtimeWorkouts(checked as boolean)}
                      />
                      <Label htmlFor="avoidBedtime">Avoid workouts within 3 hours of bedtime</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fastedWorkouts"
                        checked={allowFastedWorkouts}
                        onCheckedChange={(checked) => setAllowFastedWorkouts(checked as boolean)}
                      />
                      <Label htmlFor="fastedWorkouts">Allow fasted morning workouts</Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Metabolic Zone Data */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-[#c19962]" />
                      Active Metabolic Rate Data
                    </CardTitle>
                    <CardDescription>
                      Enter your cal/min from metabolic testing for more accurate workout calorie estimates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useZoneData"
                        checked={useZoneData}
                        onCheckedChange={(checked) => setUseZoneData(checked as boolean)}
                      />
                      <Label htmlFor="useZoneData">I have metabolic testing data (cal/min by zone)</Label>
                    </div>
                    
                    {useZoneData && (
                      <div className="grid grid-cols-5 gap-3 pt-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Zone 1 (Easy)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={zoneCaloriesInput.zone1}
                            onChange={(e) => setZoneCaloriesInput({
                              ...zoneCaloriesInput,
                              zone1: parseFloat(e.target.value) || 0
                            })}
                            className="h-8"
                          />
                          <span className="text-xs text-muted-foreground">cal/min</span>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Zone 2 (Aerobic)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={zoneCaloriesInput.zone2}
                            onChange={(e) => setZoneCaloriesInput({
                              ...zoneCaloriesInput,
                              zone2: parseFloat(e.target.value) || 0
                            })}
                            className="h-8"
                          />
                          <span className="text-xs text-muted-foreground">cal/min</span>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Zone 3 (Tempo)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={zoneCaloriesInput.zone3}
                            onChange={(e) => setZoneCaloriesInput({
                              ...zoneCaloriesInput,
                              zone3: parseFloat(e.target.value) || 0
                            })}
                            className="h-8"
                          />
                          <span className="text-xs text-muted-foreground">cal/min</span>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Zone 4 (Threshold)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={zoneCaloriesInput.zone4}
                            onChange={(e) => setZoneCaloriesInput({
                              ...zoneCaloriesInput,
                              zone4: parseFloat(e.target.value) || 0
                            })}
                            className="h-8"
                          />
                          <span className="text-xs text-muted-foreground">cal/min</span>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Zone 5 (VO2max)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={zoneCaloriesInput.zone5}
                            onChange={(e) => setZoneCaloriesInput({
                              ...zoneCaloriesInput,
                              zone5: parseFloat(e.target.value) || 0
                            })}
                            className="h-8"
                          />
                          <span className="text-xs text-muted-foreground">cal/min</span>
                        </div>
                      </div>
                    )}
                    
                    {!useZoneData && (
                      <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                        Using MET-based estimates for workout calories. These are conservative and validated but less personalized than metabolic testing data.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Workout Days Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Dumbbell className="h-5 w-5 text-[#c19962]" />
                      Workout Schedule
                    </CardTitle>
                    <CardDescription>Select your workout days and configure each one</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Total workouts per week: {workoutsPerWeek}</Label>
                      <Slider
                        min={0}
                        max={7}
                        step={1}
                        value={[workoutsPerWeek]}
                        onValueChange={(v) => setWorkoutsPerWeek(v[0])}
                      />
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {DAYS.map((day) => (
                        <div
                          key={day}
                          onClick={() => toggleWorkoutDay(day)}
                          className={cn(
                            'flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all',
                            selectedWorkoutDays.includes(day)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted border-border'
                          )}
                        >
                          <span className="text-sm font-medium">{day.substring(0, 3)}</span>
                          {selectedWorkoutDays.includes(day) && (
                            <Dumbbell className="h-4 w-4 mt-1" />
                          )}
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Per-day Configuration */}
                    <Accordion type="multiple" className="w-full">
                      {DAYS.filter(day => selectedWorkoutDays.includes(day)).map((day) => (
                        <AccordionItem key={day} value={day}>
                          <AccordionTrigger>
                            <div className="flex items-center gap-2">
                              <Dumbbell className="h-4 w-4" />
                              {day}
                              {dayWorkouts[day].length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                  {dayWorkouts[day].length} workout{dayWorkouts[day].length > 1 ? 's' : ''} • ~{getDayWorkoutCalories(day)} cal
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-4">
                              {dayWorkouts[day].map((workout, idx) => (
                                <div key={idx} className="p-4 border rounded-lg space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">
                                      Workout {idx + 1}
                                      {dayWorkouts[day].length > 1 && (
                                        <span className="text-muted-foreground ml-2">
                                          ({WORKOUT_TIME_SLOTS.find(s => s.value === workout.timeSlot)?.label})
                                        </span>
                                      )}
                                    </h4>
                                    {(allowMultipleWorkouts || dayWorkouts[day].length > 1) && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeWorkoutFromDay(day, idx)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                      <Label>Type</Label>
                                      <Select 
                                        value={workout.type} 
                                        onValueChange={(v) => updateWorkout(day, idx, 'type', v as WorkoutType)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {WORKOUT_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                              {type.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Time</Label>
                                      <Select 
                                        value={workout.timeSlot}
                                        onValueChange={(v) => updateWorkout(day, idx, 'timeSlot', v as WorkoutTimeSlot)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {WORKOUT_TIME_SLOTS.map((slot) => (
                                            <SelectItem key={slot.value} value={slot.value}>
                                              {slot.label} ({slot.range})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Duration: {workout.duration} min</Label>
                                      <Slider
                                        min={15}
                                        max={180}
                                        step={15}
                                        value={[workout.duration]}
                                        onValueChange={(v) => updateWorkout(day, idx, 'duration', v[0])}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Intensity</Label>
                                      <Select 
                                        value={workout.intensity}
                                        onValueChange={(v) => updateWorkout(day, idx, 'intensity', v as 'Low' | 'Medium' | 'High')}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Low">Low</SelectItem>
                                          <SelectItem value="Medium">Medium</SelectItem>
                                          <SelectItem value="High">High</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {useZoneData && (
                                      <div className="space-y-2">
                                        <Label>Avg Zone</Label>
                                        <Select 
                                          value={workout.averageZone?.toString() || 'auto'}
                                          onValueChange={(v) => updateWorkout(day, idx, 'averageZone', v === 'auto' ? undefined : parseInt(v) as TrainingZone)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Auto" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="auto">Auto (based on type)</SelectItem>
                                            <SelectItem value="1">Zone 1 (Easy)</SelectItem>
                                            <SelectItem value="2">Zone 2 (Aerobic)</SelectItem>
                                            <SelectItem value="3">Zone 3 (Tempo)</SelectItem>
                                            <SelectItem value="4">Zone 4 (Threshold)</SelectItem>
                                            <SelectItem value="5">Zone 5 (VO2max)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-2 bg-muted rounded text-sm text-muted-foreground">
                                    Estimated burn: ~{estimateWorkoutCalories(workout)} calories
                                    {useZoneData && !workout.averageZone && (
                                      <span className="text-xs ml-1">(Zone {getTypicalZoneForWorkout(workout.type, workout.intensity)})</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {/* Add another workout button */}
                              {allowMultipleWorkouts && (
                                <Button
                                  variant="outline"
                                  onClick={() => addWorkoutToDay(day)}
                                  className="w-full"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Another Workout
                                </Button>
                              )}
                              
                              {/* Day total */}
                              {dayWorkouts[day].length > 1 && (
                                <div className="p-3 bg-[#c19962]/10 rounded-lg text-sm font-medium">
                                  Day Total: ~{getDayWorkoutCalories(day)} calories from {dayWorkouts[day].length} workouts
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('general')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={() => setActiveTab('meals')} size="lg">
                    Continue to Meals
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* ============ TAB 3: MEALS ============ */}
              <TabsContent value="meals" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-[#c19962]" />
                      Meal Planning Context
                    </CardTitle>
                    <CardDescription>How many meals and snacks do you prefer?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Meals per day: {mealsPerDay}</Label>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[mealsPerDay]}
                          onValueChange={(v) => setMealsPerDay(v[0])}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Snacks per day: {snacksPerDay}</Label>
                        <Slider
                          min={0}
                          max={4}
                          step={1}
                          value={[snacksPerDay]}
                          onValueChange={(v) => setSnacksPerDay(v[0])}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
                      <p><strong>Meal vs Snack:</strong></p>
                      <p><strong>Meal:</strong> A larger, structured eating occasion with multiple food groups.</p>
                      <p><strong>Snack:</strong> A smaller intake to bridge hunger between meals.</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Meal Context Builder - Defaults */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-[#c19962]" />
                      Meal Context Builder - Defaults
                    </CardTitle>
                    <CardDescription>Set defaults for quick setup, then customize individual meals below if needed</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Meal Defaults */}
                    <div className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Utensils className="h-4 w-4 text-[#c19962]" />
                          Meal Defaults
                        </h4>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={applyDefaultsToAllMeals}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Apply to All Meals
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Default Prep Method</Label>
                          <Select value={defaultMealPrepMethod} onValueChange={(v) => setDefaultMealPrepMethod(v as MealPrepMethod)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MEAL_PREP_METHODS.map((method) => (
                                <SelectItem key={method.value} value={method.value}>
                                  <div className="flex items-center gap-2">
                                    {method.icon}
                                    {method.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Default Prep Time</Label>
                          <Select value={defaultMealPrepTime} onValueChange={setDefaultMealPrepTime}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PREP_TIMES.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Default Location</Label>
                          <Select value={defaultMealLocation} onValueChange={(v) => setDefaultMealLocation(v as MealLocation)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MEAL_LOCATIONS.map((loc) => (
                                <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Snack Defaults */}
                    <div className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Package className="h-4 w-4 text-[#c19962]" />
                          Snack Defaults
                        </h4>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={applyDefaultsToAllSnacks}
                          disabled={snacksPerDay === 0}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Apply to All Snacks
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Default Prep Method</Label>
                          <Select value={defaultSnackPrepMethod} onValueChange={(v) => setDefaultSnackPrepMethod(v as MealPrepMethod)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MEAL_PREP_METHODS.map((method) => (
                                <SelectItem key={method.value} value={method.value}>
                                  <div className="flex items-center gap-2">
                                    {method.icon}
                                    {method.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Default Prep Time</Label>
                          <Select value={defaultSnackPrepTime} onValueChange={setDefaultSnackPrepTime}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PREP_TIMES.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Default Location</Label>
                          <Select value={defaultSnackLocation} onValueChange={(v) => setDefaultSnackLocation(v as MealLocation)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MEAL_LOCATIONS.map((loc) => (
                                <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Apply All Button */}
                    <div className="flex justify-center">
                      <Button onClick={applyDefaultsToAll} className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]">
                        <Check className="h-4 w-4 mr-2" />
                        Apply All Defaults to Meals & Snacks
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Individual Meal Customization */}
                <Card>
                  <CardHeader>
                    <CardTitle>Individual Customization</CardTitle>
                    <CardDescription>Fine-tune each meal and snack (optional - only if different from defaults)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {mealContexts.map((meal) => (
                        <AccordionItem key={meal.id} value={meal.id}>
                          <AccordionTrigger>
                            <div className="flex items-center gap-2">
                              {meal.type === 'meal' ? <Utensils className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                              {meal.label}
                              <Badge variant="outline" className="ml-2 capitalize">{meal.type}</Badge>
                              <span className="text-xs text-muted-foreground ml-2">
                                {MEAL_PREP_METHODS.find(m => m.value === meal.prepMethod)?.label} • {meal.prepTime} • {MEAL_LOCATIONS.find(l => l.value === meal.location)?.label}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4 space-y-4">
                            <div className="space-y-3">
                              <Label>Preparation Method</Label>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                {MEAL_PREP_METHODS.map((method) => (
                                  <Button
                                    key={method.value}
                                    type="button"
                                    variant={meal.prepMethod === method.value ? 'default' : 'outline'}
                                    className="h-auto py-2 px-3 flex flex-col items-center gap-1"
                                    onClick={() => updateMealContext(meal.id, 'prepMethod', method.value)}
                                  >
                                    {method.icon}
                                    <span className="text-xs">{method.label}</span>
                                  </Button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Prep Time</Label>
                                <Select 
                                  value={meal.prepTime}
                                  onValueChange={(v) => updateMealContext(meal.id, 'prepTime', v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PREP_TIMES.map((time) => (
                                      <SelectItem key={time} value={time}>{time}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Location</Label>
                                <Select 
                                  value={meal.location}
                                  onValueChange={(v) => updateMealContext(meal.id, 'location', v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MEAL_LOCATIONS.map((loc) => (
                                      <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Time Range</Label>
                                <Select 
                                  value={meal.timeRange}
                                  onValueChange={(v) => updateMealContext(meal.id, 'timeRange', v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MEAL_TIME_RANGES.map((range) => (
                                      <SelectItem key={range} value={range}>{range}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('workouts')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={() => setActiveTab('timing')} size="lg">
                    Continue to Nutrient Timing
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* ============ TAB 4: NUTRIENT TIMING ============ */}
              <TabsContent value="timing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-[#c19962]" />
                      Workout Nutrition Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="preWorkoutMeal"
                        checked={includePreWorkoutMeal}
                        onCheckedChange={(checked) => setIncludePreWorkoutMeal(checked as boolean)}
                      />
                      <Label htmlFor="preWorkoutMeal">Include pre-workout meal (1-2 hours before)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="preWorkoutSnack"
                        checked={includePreWorkoutSnack}
                        onCheckedChange={(checked) => setIncludePreWorkoutSnack(checked as boolean)}
                      />
                      <Label htmlFor="preWorkoutSnack">Include pre-workout snack (30-60 min before)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="postWorkoutMeal"
                        checked={includePostWorkoutMeal}
                        onCheckedChange={(checked) => setIncludePostWorkoutMeal(checked as boolean)}
                      />
                      <Label htmlFor="postWorkoutMeal">Include post-workout meal within 2 hours</Label>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Energy Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label>Energy Distribution Preference</Label>
                      <RadioGroup value={energyDistribution} onValueChange={setEnergyDistribution}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="front_loaded" id="ed1" />
                          <Label htmlFor="ed1" className="font-normal">Front-loaded (more calories early in the day)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="steady" id="ed2" />
                          <Label htmlFor="ed2" className="font-normal">Steady energy throughout day</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="back_loaded" id="ed3" />
                          <Label htmlFor="ed3" className="font-normal">Back-loaded (more calories later in the day)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="workout_focused" id="ed4" />
                          <Label htmlFor="ed4" className="font-normal">Workout-focused (calories around training)</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Liquid Calories Preference</Label>
                      <RadioGroup value={liquidCalories} onValueChange={setLiquidCalories}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="minimize" id="lc1" />
                          <Label htmlFor="lc1" className="font-normal">Minimize liquid calories</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="moderate" id="lc2" />
                          <Label htmlFor="lc2" className="font-normal">Moderate (occasional smoothies/shakes)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="include_shakes" id="lc3" />
                          <Label htmlFor="lc3" className="font-normal">Include protein shakes regularly</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>

                {/* Schedule Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-[#c19962]" />
                        Weekly Schedule Preview
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowSchedulePreview(!showSchedulePreview)}
                      >
                        {showSchedulePreview ? 'Hide' : 'Show'} Preview
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  {showSchedulePreview && (
                    <CardContent>
                      <ScrollArea className="w-full">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Day</TableHead>
                              <TableHead>Sleep</TableHead>
                              <TableHead>Work</TableHead>
                              <TableHead>Workout</TableHead>
                              <TableHead>Meals</TableHead>
                              <TableHead className="text-right">Est. TDEE</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {schedulePreview.map((row) => (
                              <TableRow key={row.day}>
                                <TableCell className="font-medium">{row.day}</TableCell>
                                <TableCell className="text-sm">{row.sleep}</TableCell>
                                <TableCell className="text-sm">{row.work}</TableCell>
                                <TableCell>
                                  {row.workout === 'Rest Day' ? (
                                    <span className="text-muted-foreground">{row.workout}</span>
                                  ) : (
                                    <Badge variant="secondary">{row.workout}</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">{row.meals}</TableCell>
                                <TableCell className="text-right font-medium">{row.tdee} cal</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  )}
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('meals')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleSave} size="lg" className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]">
                    Save Schedule & Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Progress Summary Sidebar */}
          <div className="xl:col-span-1">
            <div className="sticky top-24">
              <ProgressSummary currentStep={2} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
