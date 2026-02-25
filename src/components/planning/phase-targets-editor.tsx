'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  calculateTDEE, 
  calculateTargetCalories, 
  calculateMacrosAdvanced,
  calculateBMR,
  lbsToKg,
  heightToCm,
  getProteinCoefficientInfo,
  getFatCoefficientInfo,
  getProteinCoefficient,
  getFatCoefficient,
  getActivityMultiplier,
  estimateWorkoutCaloriesMET,
  calculateZoneBasedCalories,
  getTypicalZoneForWorkout,
  getDefaultZoneCalories,
  type ProteinLevel,
  type FatLevel,
} from '@/lib/nutrition-calc';
import {
  ArrowRight,
  Target,
  Flame,
  Dumbbell,
  CheckCircle2,
  Settings2,
  RefreshCw,
  Edit2,
  Calendar,
  TrendingDown,
  TrendingUp,
  Scale,
  Zap,
  Heart,
  Info,
  Coffee,
  Activity,
  ChevronRight,
  HelpCircle,
  BarChart3,
  PieChart,
  Copy,
  Sparkles,
  Clock,
  Sun,
  Moon,
  Utensils,
  MapPin,
  ChefHat,
  X,
  Check,
  Plus,
  Trash2,
  Droplet,
  Pill,
  Leaf,
  ChevronDown,
  ChevronUp,
  Beaker,
  Download,
  Loader2,
  Tag
} from 'lucide-react';
import type { 
  Phase, 
  GoalType, 
  UserProfile, 
  WeeklySchedule, 
  DayNutritionTargets, 
  DayOfWeek, 
  Macros,
  DaySchedule,
  MealContext,
  WorkoutConfig,
  WorkoutType,
  WorkoutTimeSlot,
  MacroBasis,
  MacroSettings,
  MicronutrientTargets,
  MicronutrientTarget
} from '@/types';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const GOAL_COLORS: Record<GoalType, { bg: string; border: string; text: string; gradient: string }> = {
  fat_loss: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', gradient: 'from-orange-500/20 to-orange-600/10' },
  muscle_gain: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', gradient: 'from-blue-500/20 to-blue-600/10' },
  recomposition: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', gradient: 'from-purple-500/20 to-purple-600/10' },
  performance: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', gradient: 'from-green-500/20 to-green-600/10' },
  health: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300', gradient: 'from-pink-500/20 to-pink-600/10' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', gradient: 'from-gray-500/20 to-gray-600/10' },
};

const GOAL_ICONS: Record<GoalType, React.ReactNode> = {
  fat_loss: <TrendingDown className="h-4 w-4" />,
  muscle_gain: <TrendingUp className="h-4 w-4" />,
  recomposition: <Scale className="h-4 w-4" />,
  performance: <Zap className="h-4 w-4" />,
  health: <Heart className="h-4 w-4" />,
  other: <Target className="h-4 w-4" />,
};

const GOAL_LABELS: Record<GoalType, string> = {
  fat_loss: 'Fat Loss',
  muscle_gain: 'Muscle Gain',
  recomposition: 'Recomposition',
  performance: 'Performance',
  health: 'Health Focus',
  other: 'Custom',
};

const WORKOUT_TYPES: WorkoutType[] = ['Resistance Training', 'Cardio', 'HIIT', 'Yoga/Mobility', 'Sports', 'Mixed'];
const WORKOUT_TIME_SLOTS: { value: WorkoutTimeSlot; label: string }[] = [
  { value: 'early_morning', label: 'Early Morning (5-7 AM)' },
  { value: 'morning', label: 'Morning (7-10 AM)' },
  { value: 'midday', label: 'Midday (10 AM-2 PM)' },
  { value: 'afternoon', label: 'Afternoon (2-5 PM)' },
  { value: 'evening', label: 'Evening (5-8 PM)' },
  { value: 'night', label: 'Night (8-11 PM)' },
];
const WORKOUT_INTENSITIES: ('Low' | 'Medium' | 'High')[] = ['Low', 'Medium', 'High'];
const PREP_METHODS = ['Fresh cooking', 'Meal prep', 'Quick prep', 'Ready-to-eat', 'Dining out', 'Delivery'];
const MEAL_LOCATIONS = ['Home', 'Office', 'Gym', 'Restaurant', 'On-the-go', 'Travel'];

// Map workout time slots to approximate hour of day (24h)
const TIME_SLOT_HOURS: Record<string, number> = {
  early_morning: 6,
  morning: 8.5,
  midday: 12,
  afternoon: 15.5,
  evening: 18.5,
  night: 21,
};

/**
 * Compute per-meal macro targets with nutrient timing around workouts.
 * - Pre-workout: extra carbs for fuel
 * - Post-workout: extra protein for recovery + carbs for glycogen
 * - Other meals: even distribution
 */
function computeMealSlotTargets(
  config: DayConfig,
): MealSlotTarget[] {
  const { mealCount, snackCount, calories, protein, carbs, fat, isWorkoutDay, workouts, preWorkoutMeal, postWorkoutMeal, wakeTime, sleepTime } = config;
  const totalMeals = mealCount || 3;
  const totalSnacks = snackCount || 2;
  const totalCal = calories || 0;
  const totalP = protein || 0;
  const totalC = carbs || 0;
  const totalF = fat || 0;

  const mealLabels = ['Breakfast', 'Lunch', 'Dinner', 'Meal 4', 'Meal 5', 'Meal 6'];
  const slots: { label: string; type: 'meal' | 'snack'; hour: number }[] = [];

  const parseTimeStr = (t?: string, fallback: number = 7) => {
    if (!t) return fallback;
    const match = t.match(/(\d+):?(\d*)\s*(am|pm)?/i);
    if (!match) return fallback;
    let h = parseInt(match[1]);
    if (match[3]?.toLowerCase() === 'pm' && h < 12) h += 12;
    if (match[3]?.toLowerCase() === 'am' && h === 12) h = 0;
    return h;
  };
  const wakeHour = parseTimeStr(wakeTime, 7);
  const sleepHour = parseTimeStr(sleepTime, 22);
  const totalSlots = totalMeals + totalSnacks;
  const interval = totalSlots > 1 ? (sleepHour - wakeHour) / (totalSlots) : 4;

  let mealIdx = 0;
  let snackIdx = 0;
  // Interleave: meal, snack, meal, snack, meal, [remaining snacks]
  for (let i = 0; i < totalSlots; i++) {
    const hour = wakeHour + interval * (i + 0.5);
    if (mealIdx < totalMeals && (snackIdx >= totalSnacks || i % 2 === 0 || mealIdx <= snackIdx)) {
      slots.push({ label: mealLabels[mealIdx] || `Meal ${mealIdx + 1}`, type: 'meal', hour });
      mealIdx++;
    } else if (snackIdx < totalSnacks) {
      slots.push({ label: `Snack ${snackIdx + 1}`, type: 'snack', hour });
      snackIdx++;
    }
  }

  // Determine workout hour and which slots are pre/post
  const workoutTimeSlot = workouts?.[0]?.timeSlot || 'evening';
  const workoutHour = TIME_SLOT_HOURS[workoutTimeSlot] || 18.5;

  let preIdx = -1;
  let postIdx = -1;
  if (isWorkoutDay && workouts?.length > 0) {
    // Pre-workout: last slot before workout hour
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].hour < workoutHour) preIdx = i;
    }
    // Post-workout: first slot after workout hour
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].hour >= workoutHour && postIdx === -1) postIdx = i;
    }
  }

  // Base distribution: meals get equal large share, snacks get ~10% each
  const snackBasePct = 0.08;
  const snackTotalPct = totalSnacks * snackBasePct;
  const mealBasePct = totalMeals > 0 ? (1 - snackTotalPct) / totalMeals : 0;

  // Build weight arrays for each macro (1.0 = normal share)
  const calW = slots.map((s, i) => s.type === 'snack' ? snackBasePct : mealBasePct);
  const protW = [...calW];
  const carbW = [...calW];
  const fatW = [...calW];

  // Apply nutrient timing adjustments for workout days
  if (isWorkoutDay && (preIdx >= 0 || postIdx >= 0)) {
    // Post-workout gets more protein (+40%) and carbs (+35%)
    if (postIdx >= 0 && postWorkoutMeal) {
      protW[postIdx] *= 1.40;
      carbW[postIdx] *= 1.35;
      fatW[postIdx] *= 0.85; // slightly less fat for faster absorption
    }
    // Pre-workout gets more carbs (+25%) for fuel
    if (preIdx >= 0 && preWorkoutMeal && preIdx !== postIdx) {
      carbW[preIdx] *= 1.25;
      protW[preIdx] *= 1.05;
      fatW[preIdx] *= 0.90; // slightly less fat pre-workout
    }
  }

  // Normalize each macro's weights to sum to 1
  const normalize = (w: number[]) => {
    const sum = w.reduce((a, b) => a + b, 0);
    return sum > 0 ? w.map(v => v / sum) : w.map(() => 1 / w.length);
  };

  const calPcts = normalize(calW);
  const protPcts = normalize(protW);
  const carbPcts = normalize(carbW);
  const fatPcts = normalize(fatW);

  return slots.map((slot, i) => {
    const relation = i === preIdx ? 'pre-workout' as const :
                     i === postIdx ? 'post-workout' as const :
                     'none' as const;

    let rationale: string;
    if (relation === 'post-workout') {
      rationale = 'Recovery: extra protein for MPS + carbs for glycogen';
    } else if (relation === 'pre-workout') {
      rationale = 'Pre-training: extra carbs for fuel, moderate fat';
    } else if (slot.type === 'snack') {
      rationale = 'Bridges meals, sustains blood sugar & satiety';
    } else if (i === 0) {
      rationale = 'Supports morning energy & protein synthesis';
    } else if (i === slots.length - 1 && slot.type === 'meal') {
      rationale = 'Final meal: supports overnight recovery';
    } else {
      rationale = `Balanced distribution (~${Math.round(calPcts[i] * 100)}% of daily)`;
    }

    const slotCal = Math.round(totalCal * calPcts[i]);
    const slotP = Math.round(totalP * protPcts[i]);
    const slotC = Math.round(totalC * carbPcts[i]);
    const slotF = Math.round(totalF * fatPcts[i]);

    return {
      label: slot.label,
      type: slot.type,
      calories: Math.max(slot.type === 'snack' ? 50 : 100, slotCal),
      protein: Math.max(slot.type === 'snack' ? 3 : 10, slotP),
      carbs: Math.max(0, slotC),
      fat: Math.max(slot.type === 'snack' ? 2 : 5, slotF),
      rationale,
      workoutRelation: relation,
    };
  });
}

// Evidence-based coefficient ranges
const PROTEIN_RANGE = { min: 1.2, max: 3.5 }; // g/kg
const PROTEIN_FFM_RANGE = { min: 1.6, max: 4.0 }; // g/kg FFM (typically higher)
const FAT_RANGE = { min: 0.4, max: 1.8 }; // g/kg
const FAT_FFM_RANGE = { min: 0.5, max: 2.2 }; // g/kg FFM

// Evidence-based micronutrient defaults (based on DRIs, athlete considerations)
// Values for adult male; female values typically slightly lower
const getDefaultMicronutrients = (
  gender: 'Male' | 'Female' | 'male' | 'female' | undefined,
  age: number | undefined,
  isAthlete: boolean = true,
  goalType: GoalType = 'fat_loss'
): MicronutrientTargets => {
  const g = gender?.toLowerCase() || 'male';
  const a = age || 30;
  const isFemale = g === 'female';
  
  // Athlete multiplier (generally higher needs)
  const am = isAthlete ? 1.2 : 1.0;
  
  return {
    // Vitamins
    vitaminA: { value: isFemale ? 700 : 900, unit: 'mcg RAE', isCustom: false, minSafe: 300, maxSafe: 3000, rdaReference: isFemale ? 700 : 900 },
    vitaminC: { value: Math.round((isFemale ? 75 : 90) * am), unit: 'mg', isCustom: false, minSafe: 30, maxSafe: 2000, rdaReference: isFemale ? 75 : 90 },
    vitaminD: { value: isAthlete ? 50 : 20, unit: 'mcg', isCustom: false, minSafe: 10, maxSafe: 100, rdaReference: 20 }, // 800-2000 IU for athletes
    vitaminE: { value: 15, unit: 'mg', isCustom: false, minSafe: 4, maxSafe: 1000, rdaReference: 15 },
    vitaminK: { value: isFemale ? 90 : 120, unit: 'mcg', isCustom: false, minSafe: 30, rdaReference: isFemale ? 90 : 120 },
    thiamin: { value: Number(((isFemale ? 1.1 : 1.2) * am).toFixed(1)), unit: 'mg', isCustom: false, minSafe: 0.5, rdaReference: isFemale ? 1.1 : 1.2 },
    riboflavin: { value: Number(((isFemale ? 1.1 : 1.3) * am).toFixed(1)), unit: 'mg', isCustom: false, minSafe: 0.5, rdaReference: isFemale ? 1.1 : 1.3 },
    niacin: { value: Math.round((isFemale ? 14 : 16) * am), unit: 'mg', isCustom: false, minSafe: 5, maxSafe: 35, rdaReference: isFemale ? 14 : 16 },
    pantothenicAcid: { value: 5, unit: 'mg', isCustom: false, minSafe: 2, rdaReference: 5 },
    vitaminB6: { value: Number((1.3 * am).toFixed(1)), unit: 'mg', isCustom: false, minSafe: 0.5, maxSafe: 100, rdaReference: 1.3 },
    biotin: { value: 30, unit: 'mcg', isCustom: false, minSafe: 10, rdaReference: 30 },
    folate: { value: Math.round(400 * am), unit: 'mcg DFE', isCustom: false, minSafe: 100, maxSafe: 1000, rdaReference: 400 },
    vitaminB12: { value: Number((2.4 * am).toFixed(1)), unit: 'mcg', isCustom: false, minSafe: 1, rdaReference: 2.4 },
    
    // Major Minerals
    calcium: { value: a > 50 ? 1200 : 1000, unit: 'mg', isCustom: false, minSafe: 500, maxSafe: 2500, rdaReference: a > 50 ? 1200 : 1000 },
    phosphorus: { value: 700, unit: 'mg', isCustom: false, minSafe: 400, maxSafe: 4000, rdaReference: 700 },
    magnesium: { value: Math.round((isFemale ? 320 : 420) * am), unit: 'mg', isCustom: false, minSafe: 150, maxSafe: 350, rdaReference: isFemale ? 320 : 420 }, // UL is for supplements only
    sodium: { value: goalType === 'performance' ? 3000 : 2300, unit: 'mg', isCustom: false, minSafe: 500, maxSafe: 3500, rdaReference: 2300 },
    potassium: { value: isAthlete ? 4700 : 3400, unit: 'mg', isCustom: false, minSafe: 2000, rdaReference: isFemale ? 2600 : 3400 },
    
    // Trace Minerals
    iron: { value: isFemale && a < 51 ? 18 : 8, unit: 'mg', isCustom: false, minSafe: 5, maxSafe: 45, rdaReference: isFemale && a < 51 ? 18 : 8 },
    zinc: { value: Math.round((isFemale ? 8 : 11) * am), unit: 'mg', isCustom: false, minSafe: 4, maxSafe: 40, rdaReference: isFemale ? 8 : 11 },
    copper: { value: 0.9, unit: 'mg', isCustom: false, minSafe: 0.3, maxSafe: 10, rdaReference: 0.9 },
    manganese: { value: isFemale ? 1.8 : 2.3, unit: 'mg', isCustom: false, minSafe: 1, maxSafe: 11, rdaReference: isFemale ? 1.8 : 2.3 },
    selenium: { value: Math.round(55 * am), unit: 'mcg', isCustom: false, minSafe: 20, maxSafe: 400, rdaReference: 55 },
    iodine: { value: 150, unit: 'mcg', isCustom: false, minSafe: 75, maxSafe: 1100, rdaReference: 150 },
    chromium: { value: isFemale ? 25 : 35, unit: 'mcg', isCustom: false, minSafe: 15, rdaReference: isFemale ? 25 : 35 },
    
    // Other Important Nutrients
    fiber: { value: isFemale ? 25 : 38, unit: 'g', isCustom: false, minSafe: 20, rdaReference: isFemale ? 25 : 38 },
    omega3: { value: isAthlete ? 2 : 1.1, unit: 'g', isCustom: false, minSafe: 0.25, rdaReference: isFemale ? 1.1 : 1.6 }, // EPA+DHA
    choline: { value: isFemale ? 425 : 550, unit: 'mg', isCustom: false, minSafe: 200, maxSafe: 3500, rdaReference: isFemale ? 425 : 550 },
  };
};

// Micronutrient display categories
const MICRONUTRIENT_CATEGORIES = {
  vitamins: {
    label: 'Vitamins',
    icon: Pill,
    items: [
      { key: 'vitaminA', label: 'Vitamin A', description: 'Vision, immune function, skin health' },
      { key: 'vitaminC', label: 'Vitamin C', description: 'Antioxidant, collagen synthesis, immune support' },
      { key: 'vitaminD', label: 'Vitamin D', description: 'Bone health, muscle function, immune modulation' },
      { key: 'vitaminE', label: 'Vitamin E', description: 'Antioxidant, cell membrane protection' },
      { key: 'vitaminK', label: 'Vitamin K', description: 'Blood clotting, bone metabolism' },
      { key: 'thiamin', label: 'Thiamin (B1)', description: 'Energy metabolism, nervous system' },
      { key: 'riboflavin', label: 'Riboflavin (B2)', description: 'Energy production, cell function' },
      { key: 'niacin', label: 'Niacin (B3)', description: 'Energy metabolism, DNA repair' },
      { key: 'pantothenicAcid', label: 'Pantothenic Acid (B5)', description: 'Coenzyme A synthesis' },
      { key: 'vitaminB6', label: 'Vitamin B6', description: 'Protein metabolism, neurotransmitter synthesis' },
      { key: 'biotin', label: 'Biotin (B7)', description: 'Fatty acid synthesis, gluconeogenesis' },
      { key: 'folate', label: 'Folate (B9)', description: 'DNA synthesis, cell division' },
      { key: 'vitaminB12', label: 'Vitamin B12', description: 'Nerve function, red blood cell formation' },
    ]
  },
  majorMinerals: {
    label: 'Major Minerals',
    icon: Beaker,
    items: [
      { key: 'calcium', label: 'Calcium', description: 'Bone health, muscle contraction, nerve signaling' },
      { key: 'phosphorus', label: 'Phosphorus', description: 'Bone structure, energy transfer (ATP)' },
      { key: 'magnesium', label: 'Magnesium', description: 'Muscle/nerve function, energy production, protein synthesis' },
      { key: 'sodium', label: 'Sodium', description: 'Fluid balance, nerve impulses, muscle function' },
      { key: 'potassium', label: 'Potassium', description: 'Fluid balance, muscle contractions, heart rhythm' },
    ]
  },
  traceMinerals: {
    label: 'Trace Minerals',
    icon: Droplet,
    items: [
      { key: 'iron', label: 'Iron', description: 'Oxygen transport, energy metabolism' },
      { key: 'zinc', label: 'Zinc', description: 'Immune function, protein synthesis, wound healing' },
      { key: 'copper', label: 'Copper', description: 'Iron metabolism, connective tissue' },
      { key: 'manganese', label: 'Manganese', description: 'Bone formation, metabolism' },
      { key: 'selenium', label: 'Selenium', description: 'Antioxidant, thyroid function' },
      { key: 'iodine', label: 'Iodine', description: 'Thyroid hormone production' },
      { key: 'chromium', label: 'Chromium', description: 'Insulin function, glucose metabolism' },
    ]
  },
  other: {
    label: 'Other Essentials',
    icon: Leaf,
    items: [
      { key: 'fiber', label: 'Fiber', description: 'Digestive health, satiety, blood sugar control' },
      { key: 'omega3', label: 'Omega-3 (EPA+DHA)', description: 'Brain function, inflammation, heart health' },
      { key: 'choline', label: 'Choline', description: 'Brain development, liver function, metabolism' },
    ]
  }
};

// Extended day configuration for meal planning
interface MealSlotTarget {
  label: string;
  type: 'meal' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  rationale: string;
  workoutRelation?: 'pre-workout' | 'post-workout' | 'none';
}

interface DayConfig {
  day: DayOfWeek;
  // Schedule
  wakeTime: string;
  sleepTime: string;
  // Workouts
  workouts: WorkoutConfig[];
  // Meal structure
  mealCount: number;
  snackCount: number;
  // Meal contexts
  mealContexts: MealContext[];
  // Nutrient timing
  preWorkoutMeal: boolean;
  postWorkoutMeal: boolean;
  // Targets
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // Per-meal slot targets (user overrides)
  mealSlotTargets?: MealSlotTarget[];
  // Custom day label (e.g. "Refeed Day", "Deload Day")
  dayLabel?: string;
  // Derived
  isWorkoutDay: boolean;
  totalTDEE: number;
  workoutCalories: number;
  energyAvailability: number;
}

interface PhaseTargetsEditorProps {
  phase: Phase;
  userProfile: Partial<UserProfile>;
  weeklySchedule: Partial<WeeklySchedule>;
  onSaveTargets: (targets: DayNutritionTargets[], macroSettings?: MacroSettings) => void;
  onNavigateToMealPlan: () => void;
  onEditPhase: () => void;
}

export function PhaseTargetsEditor({
  phase,
  userProfile,
  weeklySchedule,
  onSaveTargets,
  onNavigateToMealPlan,
  onEditPhase,
}: PhaseTargetsEditorProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'daily'>('overview');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [durationStr, setDurationStr] = useState('60');
  const [showDayEditor, setShowDayEditor] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copySourceDay, setCopySourceDay] = useState<DayOfWeek | null>(null);
  const [copyTargetDays, setCopyTargetDays] = useState<DayOfWeek[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Detect if any saved targets had inconsistent macros (stale data was recalculated)
  const [hadStaleTargets] = useState(() => {
    if (!phase.nutritionTargets || phase.nutritionTargets.length === 0) return false;
    return phase.nutritionTargets.some(target => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const st = target as any;
      const cal = st.calories || target.targetCalories || 0;
      const p = target.protein || 0;
      const c = target.carbs || 0;
      const f = target.fat || 0;
      return c <= 0 || Math.abs(p * 4 + c * 4 + f * 9 - cal) > 20;
    });
  });
  const [targetsConfirmed, setTargetsConfirmed] = useState(phase.nutritionTargets?.length > 0 && !hadStaleTargets);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [editingDayLabel, setEditingDayLabel] = useState(false);
  const [dayLabelDraft, setDayLabelDraft] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(hadStaleTargets);
  
  // Macro coefficient settings - slider-based
  const [proteinLevel, setProteinLevel] = useState<ProteinLevel>('moderate');
  const [fatLevel, setFatLevel] = useState<FatLevel>('moderate');
  const [customProteinPerKg, setCustomProteinPerKg] = useState<number | null>(null);
  const [customFatPerKg, setCustomFatPerKg] = useState<number | null>(null);
  
  // Auto-switch to FFM basis for high body-fat clients when no prior
  // macro settings are saved for this phase.
  // Thresholds: >25% BF male, >35% BF female (Hector & Phillips, 2018).
  // Above these levels, total-body-weight coefficients produce unreasonably
  // high protein/fat targets because excess fat mass doesn't drive protein
  // needs for muscle preservation or fat needs for hormone health.
  const autoFFM = !phase.macroSettings?.basis && (
    (userProfile.gender === 'Male' && (userProfile.bodyFatPercentage || 20) > 25) ||
    (userProfile.gender === 'Female' && (userProfile.bodyFatPercentage || 25) > 35)
  );
  const [macroBasis, setMacroBasis] = useState<MacroBasis>(
    phase.macroSettings?.basis || (autoFFM ? 'fat_free_mass' : 'total_weight')
  );
  
  // Default coefficients: FFM basis uses higher per-kg values because the
  // denominator (lean mass) is smaller. Evidence-based ranges:
  // - Protein per FFM: 2.2–3.1 g/kg (Helms et al., 2014; Hector & Phillips, 2018)
  // - Fat per FFM: 0.8–1.2 g/kg (Iraki et al., 2019)
  // - Protein per BW: 1.6–2.2 g/kg (Morton et al., 2018)
  // - Fat per BW: 0.7–1.0 g/kg
  const defaultBasis = phase.macroSettings?.basis || (autoFFM ? 'fat_free_mass' : 'total_weight');
  const [proteinSlider, setProteinSlider] = useState<number>(
    phase.macroSettings?.proteinPerKg || (defaultBasis === 'fat_free_mass' ? 2.4 : 2.0)
  );
  const [fatSlider, setFatSlider] = useState<number>(
    phase.macroSettings?.fatPerKg || (defaultBasis === 'fat_free_mass' ? 1.0 : 0.9)
  );
  
  // Micronutrient targets
  const [microTargets, setMicroTargets] = useState<MicronutrientTargets>(
    phase.micronutrientTargets || 
    getDefaultMicronutrients(userProfile.gender, userProfile.age, true, phase.goalType)
  );
  const [showMicronutrients, setShowMicronutrients] = useState(false);
  const [expandedMicroCategory, setExpandedMicroCategory] = useState<string | null>(null);
  
  // Day configurations (overrides from profile defaults)
  // Initialize from saved phase targets if they exist
  const [dayConfigs, setDayConfigs] = useState<Record<DayOfWeek, Partial<DayConfig>>>(() => {
    const initialConfigs: Record<DayOfWeek, Partial<DayConfig>> = {
      Monday: {},
      Tuesday: {},
      Wednesday: {},
      Thursday: {},
      Friday: {},
      Saturday: {},
      Sunday: {},
    };
    
    // If phase has saved nutrition targets, restore them as overrides
    if (phase.nutritionTargets && phase.nutritionTargets.length > 0) {
      phase.nutritionTargets.forEach(target => {
        const day = target.day as DayOfWeek;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const savedTarget = target as any; // For accessing extended fields (meals, snacks, etc.)
        
        // Only restore macro overrides if they're internally consistent.
        // Stale saves (e.g. P+F > Cal with C=0) are dropped so the slider-
        // based calculation with the carb floor produces correct values.
        const savedCal = savedTarget.calories || target.targetCalories || 0;
        const savedP = target.protein || 0;
        const savedC = target.carbs || 0;
        const savedF = target.fat || 0;
        const macroSum = savedP * 4 + savedC * 4 + savedF * 9;
        const macrosConsistent = savedC > 0 && Math.abs(macroSum - savedCal) <= 20;

        initialConfigs[day] = {
          ...(macrosConsistent ? {
            calories: savedCal,
            protein: savedP,
            carbs: savedC,
            fat: savedF,
          } : {}),
          mealCount: savedTarget.meals,
          snackCount: savedTarget.snacks,
          wakeTime: savedTarget.wakeTime,
          sleepTime: savedTarget.sleepTime,
          preWorkoutMeal: savedTarget.preWorkoutMeal,
          postWorkoutMeal: savedTarget.postWorkoutMeal,
          mealContexts: savedTarget.mealContexts,
          // Restore per-meal slot targets if saved
          mealSlotTargets: savedTarget.mealSlotTargets,
          // Restore custom day label
          dayLabel: savedTarget.dayLabel || target.dayLabel,
          // Restore workouts - either from saved workouts array or create one if it was a workout day
          workouts: savedTarget.workouts?.length > 0 
            ? savedTarget.workouts 
            : (target.isWorkoutDay ? [{
                enabled: true,
                type: 'Resistance Training' as WorkoutType,
                timeSlot: 'evening' as WorkoutTimeSlot,
                duration: 60,
                intensity: 'Medium' as const,
              }] : []),
        };
      });
    }
    
    return initialConfigs;
  });

  // Map goal type for nutrition calc
  const goalType = useMemo(() => {
    const mapping: Record<GoalType, 'lose_fat' | 'gain_muscle' | 'maintain' | 'recomp'> = {
      fat_loss: 'lose_fat',
      muscle_gain: 'gain_muscle',
      recomposition: 'recomp',
      performance: 'maintain',
      health: 'maintain',
      other: 'maintain',
    };
    return mapping[phase.goalType] || 'maintain';
  }, [phase.goalType]);

  // Get body measurements
  const weightKg = useMemo(() => 
    userProfile.weightLbs ? lbsToKg(userProfile.weightLbs) : 0, 
    [userProfile.weightLbs]
  );
  
  const heightCm = useMemo(() => 
    userProfile.heightFt ? heightToCm(userProfile.heightFt, userProfile.heightIn || 0) : 0,
    [userProfile.heightFt, userProfile.heightIn]
  );

  const bodyFatPct = userProfile.bodyFatPercentage || 20;
  const leanMassKg = weightKg * (1 - bodyFatPct / 100);

  // Get coefficient info (for preset reference)
  const proteinOptions = useMemo(() => getProteinCoefficientInfo(goalType === 'recomp' ? 'maintain' : goalType), [goalType]);
  const fatOptions = useMemo(() => getFatCoefficientInfo(goalType === 'recomp' ? 'maintain' : goalType), [goalType]);
  
  // Calculate the reference weight based on selected basis
  const basisWeight = macroBasis === 'fat_free_mass' ? leanMassKg : weightKg;
  const basisLabel = macroBasis === 'fat_free_mass' ? 'FFM' : 'BW';
  
  // Effective coefficients from sliders
  const effectiveProteinPerKg = proteinSlider;
  const effectiveFatPerKg = fatSlider;
  
  // Track previous slider/basis values so we can clear per-day macro overrides
  // when the global coefficient sliders change (allows slider to take effect globally)
  const prevSlidersRef = useRef({ protein: proteinSlider, fat: fatSlider, basis: macroBasis });
  useEffect(() => {
    const prev = prevSlidersRef.current;
    const slidersChanged = 
      Math.abs(prev.protein - proteinSlider) > 0.001 || 
      Math.abs(prev.fat - fatSlider) > 0.001 ||
      prev.basis !== macroBasis;
    
    if (slidersChanged) {
      // Clear all macro overrides (including calories) so the new slider values
      // recalculate a fully consistent set. Keep structural overrides intact.
      setDayConfigs(prevConfigs => {
        const cleared: Record<DayOfWeek, Partial<DayConfig>> = {} as Record<DayOfWeek, Partial<DayConfig>>;
        DAYS.forEach(day => {
          const existing = prevConfigs[day] || {};
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { protein, fat, carbs, calories, ...rest } = existing as Record<string, unknown>;
          cleared[day] = rest as Partial<DayConfig>;
        });
        return cleared;
      });
      // Mark targets as needing re-confirmation since macros changed
      setTargetsConfirmed(false);
      prevSlidersRef.current = { protein: proteinSlider, fat: fatSlider, basis: macroBasis };
    }
  }, [proteinSlider, fatSlider, macroBasis]);
  
  // Actual grams based on basis
  const proteinGrams = Math.round(effectiveProteinPerKg * basisWeight);
  const fatGrams = Math.round(effectiveFatPerKg * basisWeight);
  
  // For display: also show per total body weight for comparison
  const proteinPerTotalBW = macroBasis === 'fat_free_mass' 
    ? (proteinGrams / weightKg).toFixed(1) 
    : effectiveProteinPerKg.toFixed(1);
  const fatPerTotalBW = macroBasis === 'fat_free_mass'
    ? (fatGrams / weightKg).toFixed(1)
    : effectiveFatPerKg.toFixed(1);

  // Calculate base metabolic values - use measured/saved RMR if available
  const baseMetrics = useMemo(() => {
    if (!weightKg || !heightCm || !userProfile.age || !userProfile.gender) {
      return null;
    }
    
    // Use the saved RMR from profile (which could be measured or calculated)
    // Fall back to formula-based calculation if not available
    let rmr: number;
    let rmrSource: 'measured' | 'calculated' = 'calculated';
    
    if (userProfile.rmr && userProfile.rmr > 0) {
      // Use the final saved RMR value from profile
      rmr = userProfile.rmr;
      rmrSource = userProfile.metabolicAssessment?.useMeasuredRMR ? 'measured' : 'calculated';
    } else if (userProfile.metabolicAssessment?.calculatedRMR && userProfile.metabolicAssessment.calculatedRMR > 0) {
      // Use the metabolic assessment's calculated RMR
      rmr = userProfile.metabolicAssessment.calculatedRMR;
      rmrSource = userProfile.metabolicAssessment.useMeasuredRMR ? 'measured' : 'calculated';
    } else {
      // Fallback to formula-based calculation
      rmr = calculateBMR(userProfile.gender, weightKg, heightCm, userProfile.age);
    }
    
    const activityMultiplier = getActivityMultiplier(userProfile.activityLevel || 'Active (10-15k steps/day)');
    const neat = rmr * (activityMultiplier - 1);
    const tef = rmr * 0.1;
    
    return { rmr, neat, tef, activityMultiplier, rmrSource };
  }, [weightKg, heightCm, userProfile.age, userProfile.gender, userProfile.activityLevel, userProfile.rmr, userProfile.metabolicAssessment]);

  // Build full day configurations merging profile defaults with overrides
  const fullDayConfigs = useMemo((): Record<DayOfWeek, DayConfig> => {
    if (!baseMetrics) {
      return {} as Record<DayOfWeek, DayConfig>;
    }

    const weeklyChangeKg = phase.rateOfChange 
      ? weightKg * (phase.rateOfChange / 100)
      : goalType === 'lose_fat' ? 0.5 : goalType === 'gain_muscle' ? 0.25 : 0;

    const configs: Partial<Record<DayOfWeek, DayConfig>> = {};
    
    DAYS.forEach(day => {
      const profileSchedule = (weeklySchedule[day] || {}) as Partial<DaySchedule>;
      const overrides = dayConfigs[day] || {};
      
      // Merge profile defaults with any overrides
      const wakeTime = overrides.wakeTime ?? profileSchedule.wakeTime ?? '7:00 AM';
      const sleepTime = overrides.sleepTime ?? profileSchedule.sleepTime ?? '10:00 PM';
      const enabledWorkouts = profileSchedule.workouts?.filter((w: WorkoutConfig) => w.enabled) ?? [];
      // Prefer override workouts, but fall back to profile when override is empty
      // (stale phase data saved before workouts were configured)
      const workouts = (overrides.workouts && overrides.workouts.length > 0)
        ? overrides.workouts
        : enabledWorkouts;
      const mealCount = overrides.mealCount ?? profileSchedule.mealCount ?? 3;
      const snackCount = overrides.snackCount ?? profileSchedule.snackCount ?? 2;
      const mealContexts = overrides.mealContexts ?? profileSchedule.mealContexts ?? [];
      const preWorkoutMeal = overrides.preWorkoutMeal ?? true;
      const postWorkoutMeal = overrides.postWorkoutMeal ?? true;
      
      const isWorkoutDay = workouts.length > 0;
      
      // Calculate workout calories - use zone data if available, otherwise MET estimates
      let workoutCalories = 0;
      const hasZoneData = userProfile.metabolicAssessment?.hasZoneData && userProfile.metabolicAssessment?.zoneCaloriesPerMin;
      const zoneCalories = hasZoneData 
        ? userProfile.metabolicAssessment!.zoneCaloriesPerMin!
        : getDefaultZoneCalories(weightKg);
      
      workouts.forEach((workout: WorkoutConfig) => {
        if (workout.averageZone) {
          // User explicitly selected a zone — use it with available cal/min data
          workoutCalories += calculateZoneBasedCalories(
            workout.averageZone as 1 | 2 | 3 | 4 | 5,
            workout.duration,
            zoneCalories
          );
        } else {
          // Fall back to MET-based estimate
          const typicalZone = getTypicalZoneForWorkout(workout.type, workout.intensity as 'Low' | 'Medium' | 'High');
          workoutCalories += calculateZoneBasedCalories(
            typicalZone,
            workout.duration,
            zoneCalories
          );
        }
      });

      const restTDEE = baseMetrics.rmr + baseMetrics.neat + baseMetrics.tef;
      const totalTDEE = restTDEE + workoutCalories;
      const targetCalories = calculateTargetCalories(totalTDEE, goalType === 'recomp' ? 'maintain' : goalType, weeklyChangeKg);
      const energyAvailability = leanMassKg > 0 
        ? (targetCalories - workoutCalories) / leanMassKg 
        : 0;

      // Base macros from slider coefficients (rest-day baseline)
      const baseProteinG = Math.round(effectiveProteinPerKg * basisWeight);
      const baseFatG = Math.round(effectiveFatPerKg * basisWeight);

      // On workout days, distribute extra energy with sport nutrition split:
      // 25% protein, 65% carbs, 10% fat
      let workoutProteinBonus = 0;
      let workoutFatBonus = 0;
      if (isWorkoutDay && workoutCalories > 0) {
        const restCalories = calculateTargetCalories(restTDEE, goalType === 'recomp' ? 'maintain' : goalType, weeklyChangeKg);
        const extraCalories = Math.max(0, targetCalories - restCalories);
        workoutProteinBonus = Math.round((extraCalories * 0.25) / 4);
        workoutFatBonus = Math.round((extraCalories * 0.10) / 9);
        // Carbs absorb the remainder (~65%) via the fill calculation below
      }

      const dayCalories = overrides.calories ?? targetCalories;

      // Check if overrides are internally consistent (user-edited macros that add up)
      const hasAllOverrides = overrides.protein != null && overrides.fat != null
        && overrides.carbs != null;
      let overridesConsistent = false;
      if (hasAllOverrides) {
        const oSum = overrides.protein! * 4 + overrides.carbs! * 4 + overrides.fat! * 9;
        overridesConsistent = Math.abs(oSum - dayCalories) <= 20;
      }

      let finalProtein: number;
      let finalFat: number;
      let finalCarbs: number;

      if (overridesConsistent) {
        finalProtein = overrides.protein!;
        finalFat = overrides.fat!;
        finalCarbs = overrides.carbs!;
      } else {
        // Protein and fat come from slider coefficients, capped to prevent
        // extreme values for very heavy or very lean individuals.
        // Absolute caps: protein 300g (Helms 2014 ceiling even at contest
        // prep), fat 180g (~40% of a 4000 cal diet).
        // Calorie ceiling: protein + fat cannot exceed 75% of day calories,
        // reserving at least 25% (~125g at 2000 cal) for carbohydrates.
        finalProtein = Math.min(baseProteinG + workoutProteinBonus, 300);
        finalFat = Math.min(baseFatG + workoutFatBonus, 180);

        const pfCalories = finalProtein * 4 + finalFat * 9;
        const maxPFCalories = dayCalories * 0.75;
        if (pfCalories > maxPFCalories && pfCalories > 0) {
          const scale = maxPFCalories / pfCalories;
          finalProtein = Math.round(finalProtein * scale);
          finalFat = Math.round(finalFat * scale);
        }

        finalCarbs = Math.max(0, Math.round((dayCalories - finalProtein * 4 - finalFat * 9) / 4));
      }

      // Calories always derived from macros to stay consistent
      const finalCalories = finalProtein * 4 + finalCarbs * 4 + finalFat * 9;

      configs[day] = {
        day,
        wakeTime,
        sleepTime,
        workouts: workouts as WorkoutConfig[],
        mealCount,
        snackCount,
        mealContexts: mealContexts as MealContext[],
        preWorkoutMeal,
        postWorkoutMeal,
        isWorkoutDay,
        totalTDEE,
        workoutCalories,
        energyAvailability,
        calories: finalCalories,
        protein: finalProtein,
        carbs: finalCarbs,
        fat: finalFat,
        dayLabel: overrides.dayLabel,
      };
    });

    return configs as Record<DayOfWeek, DayConfig>;
  }, [baseMetrics, weeklySchedule, dayConfigs, phase.rateOfChange, goalType, weightKg, leanMassKg, proteinSlider, fatSlider, basisWeight, macroBasis, userProfile.metabolicAssessment]);

  // Calculate weekly averages
  const weeklyAverages = useMemo(() => {
    const days = Object.values(fullDayConfigs);
    if (days.length === 0) return null;
    
    const workoutDays = days.filter(d => d.isWorkoutDay);
    const restDays = days.filter(d => !d.isWorkoutDay);
    
    return {
      avgCalories: Math.round(days.reduce((sum, d) => sum + d.calories, 0) / 7),
      avgProtein: Math.round(days.reduce((sum, d) => sum + d.protein, 0) / 7),
      avgCarbs: Math.round(days.reduce((sum, d) => sum + d.carbs, 0) / 7),
      avgFat: Math.round(days.reduce((sum, d) => sum + d.fat, 0) / 7),
      avgTDEE: Math.round(days.reduce((sum, d) => sum + d.totalTDEE, 0) / 7),
      avgEA: days.reduce((sum, d) => sum + d.energyAvailability, 0) / 7,
      workoutDayCount: workoutDays.length,
      restDayCount: restDays.length,
      workoutAvgCals: workoutDays.length > 0 
        ? Math.round(workoutDays.reduce((sum, d) => sum + d.calories, 0) / workoutDays.length)
        : 0,
      restAvgCals: restDays.length > 0
        ? Math.round(restDays.reduce((sum, d) => sum + d.calories, 0) / restDays.length)
        : 0,
      weeklyTotalCals: days.reduce((sum, d) => sum + d.calories, 0),
    };
  }, [fullDayConfigs]);

  // Update a day's configuration
  // When workouts change, clear macro overrides so the recalculated values
  // (including workout energy with proper P/C/F split) flow through
  const updateDayConfig = (day: DayOfWeek, updates: Partial<DayConfig>) => {
    setDayConfigs(prev => {
      const existing = prev[day] || {};
      const merged = { ...existing, ...updates };

      // If workouts were changed, clear stale macro overrides
      if ('workouts' in updates) {
        delete (merged as Record<string, unknown>).calories;
        delete (merged as Record<string, unknown>).protein;
        delete (merged as Record<string, unknown>).carbs;
        delete (merged as Record<string, unknown>).fat;
      }

      return { ...prev, [day]: merged };
    });
    setHasUnsavedChanges(true);
  };

  // Reset a day to profile defaults
  const resetDayToDefaults = (day: DayOfWeek) => {
    setDayConfigs(prev => ({
      ...prev,
      [day]: {}
    }));
    toast.success(`${day} reset to profile defaults`);
  };

  // Copy day settings to other days
  const handleCopyToOtherDays = () => {
    if (!copySourceDay || copyTargetDays.length === 0) return;
    
    const sourceConfig = dayConfigs[copySourceDay];
    const fullSourceConfig = fullDayConfigs[copySourceDay];
    
    copyTargetDays.forEach(targetDay => {
      setDayConfigs(prev => ({
        ...prev,
        [targetDay]: {
          ...prev[targetDay],
          // Copy schedule settings
          wakeTime: fullSourceConfig.wakeTime,
          sleepTime: fullSourceConfig.sleepTime,
          // Copy workouts (this is key for workout vs rest day)
          workouts: fullSourceConfig.workouts ? [...fullSourceConfig.workouts] : [],
          // Copy meal structure
          mealCount: fullSourceConfig.mealCount,
          snackCount: fullSourceConfig.snackCount,
          mealContexts: fullSourceConfig.mealContexts ? [...fullSourceConfig.mealContexts] : [],
          preWorkoutMeal: fullSourceConfig.preWorkoutMeal,
          postWorkoutMeal: fullSourceConfig.postWorkoutMeal,
          // Copy macros (always copy the full source values to ensure consistency)
          calories: fullSourceConfig.calories,
          protein: fullSourceConfig.protein,
          carbs: fullSourceConfig.carbs,
          fat: fullSourceConfig.fat,
        }
      }));
    });
    
    setShowCopyDialog(false);
    setCopySourceDay(null);
    setCopyTargetDays([]);
    toast.success(`Settings copied to ${copyTargetDays.length} day${copyTargetDays.length !== 1 ? 's' : ''}`);
  };

  // Save and confirm targets
  const handleConfirmTargets = () => {
    const targets: DayNutritionTargets[] = DAYS.map(day => {
      const config = fullDayConfigs[day];
      return {
        day,
        isWorkoutDay: config?.isWorkoutDay || false,
        tdee: config?.totalTDEE || 0,
        targetCalories: config?.calories || 0,
        calories: config?.calories || 0,
        protein: config?.protein || 0,
        carbs: config?.carbs || 0,
        fat: config?.fat || 0,
        fiber: Math.round((config?.calories || 0) / 100),
        meals: config?.mealCount || 3,
        snacks: config?.snackCount || 2,
        // Include additional data for meal planning
        workoutCalories: config?.workoutCalories || 0,
        energyAvailability: config?.energyAvailability || 0,
        wakeTime: config?.wakeTime,
        sleepTime: config?.sleepTime,
        preWorkoutMeal: config?.preWorkoutMeal,
        postWorkoutMeal: config?.postWorkoutMeal,
        // Save workout details for restoration
        workouts: config?.workouts || [],
        mealContexts: config?.mealContexts || [],
        // Save per-meal slot targets (user-customized or computed)
        mealSlotTargets: dayConfigs[day]?.mealSlotTargets || (config ? computeMealSlotTargets(config) : []),
        // Save custom day label
        dayLabel: dayConfigs[day]?.dayLabel || undefined,
      } as DayNutritionTargets & { 
        wakeTime?: string; 
        sleepTime?: string;
        preWorkoutMeal?: boolean;
        postWorkoutMeal?: boolean;
        workoutCalories?: number;
        energyAvailability?: number;
        workouts?: WorkoutConfig[];
        mealContexts?: MealContext[];
        mealSlotTargets?: MealSlotTarget[];
      };
    });
    
    // Also save macro coefficient settings so they persist across sessions
    const macroSettings: MacroSettings = {
      basis: macroBasis,
      proteinPerKg: proteinSlider,
      fatPerKg: fatSlider,
    };
    
    onSaveTargets(targets, macroSettings);
    setTargetsConfirmed(true);
    setHasUnsavedChanges(false);
    toast.success('Nutrition targets and meal settings saved for this phase');
  };

  // Export phase targets PDF
  const handleExportPDF = async () => {
    if (!weeklyAverages || !fullDayConfigs) {
      toast.error('Please configure nutrition targets first');
      return;
    }
    
    setIsExportingPDF(true);
    
    try {
      // Build day targets for PDF - use saved phase targets if available, otherwise use full configs
      const savedTargets = phase.nutritionTargets || [];
      const dayTargets = DAYS.map(day => {
        const config = fullDayConfigs[day];
        const savedTarget = savedTargets.find(t => t.day === day);
        return {
          day,
          isWorkout: savedTarget?.isWorkoutDay ?? config?.isWorkoutDay ?? false,
          calories: (savedTarget as any)?.calories ?? savedTarget?.targetCalories ?? config?.calories ?? 0,
          protein: savedTarget?.protein ?? config?.protein ?? 0,
          carbs: savedTarget?.carbs ?? config?.carbs ?? 0,
          fat: savedTarget?.fat ?? config?.fat ?? 0,
        };
      });
      
      // Calculate current stats from profile
      const currentWeight = userProfile.weightLbs || 0;
      const currentBodyFat = userProfile.bodyFatPercentage || 0;
      const currentFatMass = currentWeight * (currentBodyFat / 100);
      const currentLeanMass = currentWeight - currentFatMass;
      
      // Calculate target stats from phase
      const targetWeight = phase.targetWeightLbs || currentWeight;
      const targetBodyFat = phase.targetBodyFat || currentBodyFat;
      const targetFatMass = targetWeight * (targetBodyFat / 100);
      const targetLeanMass = targetWeight - targetFatMass;
      
      const response = await fetch('/api/generate-phase-targets-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: userProfile.name || 'Client',
          phase: {
            name: phase.name,
            goalType: phase.goalType,
            durationWeeks: phaseDuration,
            weeklyChange: phase.rateOfChange ? (phase.rateOfChange / 100) * currentWeight : 0,
            startDate: new Date(phase.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            endDate: new Date(phase.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          },
          currentStats: {
            weight: currentWeight,
            bodyFat: currentBodyFat,
            fatMass: currentFatMass,
            leanMass: currentLeanMass,
            tdee: weeklyAverages.avgTDEE,
          },
          targetStats: {
            weight: targetWeight,
            bodyFat: targetBodyFat,
            fatMass: targetFatMass,
            leanMass: targetLeanMass,
          },
          averageTargets: {
            calories: weeklyAverages.avgCalories,
            protein: weeklyAverages.avgProtein,
            carbs: weeklyAverages.avgCarbs,
            fat: weeklyAverages.avgFat,
          },
          dayTargets,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${userProfile.name || 'Client'}-${phase.name.replace(/\s+/g, '-')}-targets.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Phase targets PDF downloaded!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Calculate phase duration
  const phaseDuration = useMemo(() => {
    const start = new Date(phase.startDate);
    const end = new Date(phase.endDate);
    const weeks = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
    return weeks;
  }, [phase.startDate, phase.endDate]);

  const colors = GOAL_COLORS[phase.goalType];
  const selectedDayConfig = fullDayConfigs[selectedDay];
  const hasOverrides = Object.keys(dayConfigs[selectedDay] || {}).length > 0;

  // Keep duration string in sync with the actual workout config
  const currentDuration = selectedDayConfig?.workouts?.[0]?.duration;
  useEffect(() => {
    setDurationStr(String(currentDuration ?? 60));
  }, [selectedDay, currentDuration]);

  if (!baseMetrics) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">Missing Client Information</h3>
          <p className="text-muted-foreground mb-4">
            To calculate nutrition targets, please ensure the client profile has weight, height, age, and gender set.
          </p>
          <Button variant="outline" onClick={onEditPhase}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Phase
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
    <div className="space-y-6 overflow-x-hidden">
      {/* Stale targets banner */}
      {hadStaleTargets && hasUnsavedChanges && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Targets recalculated from your current settings</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Previously saved targets had inconsistent macros. The values below have been freshly calculated
              from your protein/fat sliders. Review and click <strong>Save Targets</strong> to confirm.
            </p>
          </div>
        </div>
      )}

      {/* Phase Header */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-lg", colors.bg)}>
                <span className={colors.text}>{GOAL_ICONS[phase.goalType]}</span>
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {phase.name}
                  <Badge variant="outline" className={cn("text-[10px]", colors.text, colors.bg)}>
                    {GOAL_LABELS[phase.goalType]}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Editing targets for this phase • {new Date(phase.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(phase.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {phaseDuration} weeks
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportPDF}
                disabled={isExportingPDF || !weeklyAverages}
                className="h-9 border-[#c19962] text-[#c19962] hover:bg-[#c19962]/10"
              >
                {isExportingPDF ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export PDF
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={onEditPhase} className="h-9">
                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            </div>
          </div>
          {/* Top Save / Generate buttons */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <Button
              size="sm"
              className={cn(
                "h-9 font-medium",
                hasUnsavedChanges
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              )}
              onClick={handleConfirmTargets}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              {hasUnsavedChanges ? 'Save Targets' : (targetsConfirmed ? 'Targets Saved' : 'Save Targets')}
            </Button>
            <Button
              size="sm"
              className="h-9 bg-[#c19962] hover:bg-[#a8843e] text-white font-medium"
              onClick={() => {
                if (hasUnsavedChanges) {
                  handleConfirmTargets();
                }
                onNavigateToMealPlan();
              }}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Generate Meal Plan
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-2 h-11 p-1">
          <TabsTrigger value="overview" className="text-sm font-medium data-[state=active]:bg-[#c19962] data-[state=active]:text-[#00263d]">
            <PieChart className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="daily" className="text-sm font-medium data-[state=active]:bg-[#c19962] data-[state=active]:text-[#00263d]">
            <Calendar className="h-4 w-4 mr-2" />
            Daily Targets
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Energy Balance Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Avg TDEE</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{weeklyAverages?.avgTDEE.toLocaleString()}</p>
                <p className="text-xs text-blue-600">kcal/day</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-600 uppercase tracking-wide">Avg Intake</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">{weeklyAverages?.avgCalories.toLocaleString()}</p>
                <p className="text-xs text-orange-600">kcal/day</p>
              </CardContent>
            </Card>
            
            <Card className={cn(
              "border",
              goalType === 'lose_fat' ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' :
              goalType === 'gain_muscle' ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200' :
              'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
            )}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  {goalType === 'lose_fat' ? <TrendingDown className="h-4 w-4 text-green-600" /> : 
                   goalType === 'gain_muscle' ? <TrendingUp className="h-4 w-4 text-purple-600" /> :
                   <Scale className="h-4 w-4 text-gray-600" />}
                  <span className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    goalType === 'lose_fat' ? 'text-green-600' : 
                    goalType === 'gain_muscle' ? 'text-purple-600' : 'text-gray-600'
                  )}>
                    {goalType === 'lose_fat' ? 'Deficit' : goalType === 'gain_muscle' ? 'Surplus' : 'Balance'}
                  </span>
                </div>
                <p className={cn(
                  "text-2xl font-bold",
                  goalType === 'lose_fat' ? 'text-green-700' : 
                  goalType === 'gain_muscle' ? 'text-purple-700' : 'text-gray-700'
                )}>
                  {weeklyAverages ? (weeklyAverages.avgTDEE - weeklyAverages.avgCalories > 0 ? '-' : '+') : ''}
                  {Math.abs((weeklyAverages?.avgTDEE || 0) - (weeklyAverages?.avgCalories || 0))}
                </p>
                <p className={cn(
                  "text-xs",
                  goalType === 'lose_fat' ? 'text-green-600' : 
                  goalType === 'gain_muscle' ? 'text-purple-600' : 'text-gray-600'
                )}>kcal/day avg</p>
              </CardContent>
            </Card>
            
            <Card className={cn(
              "border",
              (weeklyAverages?.avgEA || 0) >= 30 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200' :
              (weeklyAverages?.avgEA || 0) >= 25 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200' :
              'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
            )}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={cn(
                    "h-4 w-4",
                    (weeklyAverages?.avgEA || 0) >= 30 ? 'text-emerald-600' :
                    (weeklyAverages?.avgEA || 0) >= 25 ? 'text-yellow-600' : 'text-red-600'
                  )} />
                  <span className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    (weeklyAverages?.avgEA || 0) >= 30 ? 'text-emerald-600' :
                    (weeklyAverages?.avgEA || 0) >= 25 ? 'text-yellow-600' : 'text-red-600'
                  )}>Energy Avail.</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        <strong>Energy Availability</strong> = (Intake - Exercise) / Lean Mass<br/>
                        <span className="text-green-600">≥30 kcal/kg: Optimal</span><br/>
                        <span className="text-yellow-600">25-30 kcal/kg: Moderate deficit</span><br/>
                        <span className="text-red-600">&lt;25 kcal/kg: Risk of metabolic adaptation</span>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className={cn(
                  "text-2xl font-bold",
                  (weeklyAverages?.avgEA || 0) >= 30 ? 'text-emerald-700' :
                  (weeklyAverages?.avgEA || 0) >= 25 ? 'text-yellow-700' : 'text-red-700'
                )}>{weeklyAverages?.avgEA.toFixed(1)}</p>
                <p className={cn(
                  "text-xs",
                  (weeklyAverages?.avgEA || 0) >= 30 ? 'text-emerald-600' :
                  (weeklyAverages?.avgEA || 0) >= 25 ? 'text-yellow-600' : 'text-red-600'
                )}>kcal/kg FFM</p>
              </CardContent>
            </Card>
          </div>

          {/* Macro Summary */}
          {weeklyAverages && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#c19962]" />
                  Weekly Average Macros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Calories</p>
                    <p className="text-xl font-bold">{weeklyAverages.avgCalories.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-blue-600 mb-1">Protein</p>
                    <p className="text-xl font-bold text-blue-700">{weeklyAverages.avgProtein}g</p>
                    <p className="text-[10px] text-blue-500">{(weeklyAverages.avgProtein / weightKg).toFixed(1)} g/kg</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-600 mb-1">Carbs</p>
                    <p className="text-xl font-bold text-amber-700">{weeklyAverages.avgCarbs}g</p>
                    <p className="text-[10px] text-amber-500">{(weeklyAverages.avgCarbs / weightKg).toFixed(1)} g/kg</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <p className="text-xs text-purple-600 mb-1">Fat</p>
                    <p className="text-xl font-bold text-purple-700">{weeklyAverages.avgFat}g</p>
                    <p className="text-[10px] text-purple-500">{(weeklyAverages.avgFat / weightKg).toFixed(1)} g/kg</p>
                  </div>
                </div>

                {/* Day type comparison */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Workout Days ({weeklyAverages.workoutDayCount})</span>
                    </div>
                    <span className="font-mono">{weeklyAverages.workoutAvgCals.toLocaleString()} kcal avg</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Rest Days ({weeklyAverages.restDayCount})</span>
                    </div>
                    <span className="font-mono">{weeklyAverages.restAvgCals.toLocaleString()} kcal avg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guided Macro Setup — 3 Steps */}
          <Card className="border-[#c19962]/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-[#c19962]" />
                  Set Macronutrient Targets
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
                  {showAdvanced ? 'Hide Citations' : 'Show Citations'}
                  <ChevronRight className={cn("h-4 w-4 ml-1 transition-transform", showAdvanced && "rotate-90")} />
                </Button>
              </div>
              <div className="mt-2 p-3 rounded-lg bg-[#00263d]/5 border border-[#00263d]/10">
                <p className="text-xs font-medium text-[#00263d] mb-1">How it works — 3 steps:</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li><strong>Set protein</strong> — the most important macro for body composition goals</li>
                  <li><strong>Set fat</strong> — essential for hormones, satiety, and nutrient absorption</li>
                  <li><strong>Carbs auto-fill</strong> — remaining calories become carbohydrates</li>
                </ol>
                <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-[#00263d]/10">
                  These set the <strong>weekly average</strong> targets. Switch to the <strong>Daily Targets</strong> tab to customize each day individually.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Calculation Basis Toggle */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Calculation Basis</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm p-3">
                        <p className="font-medium text-xs mb-2">Body Weight vs Fat-Free Mass</p>
                        <div className="space-y-2 text-xs">
                          <p><strong>Total Body Weight:</strong> Standard approach used in most research. Simpler to calculate.</p>
                          <p><strong>Fat-Free Mass (FFM):</strong> More precise for individuals with higher body fat. Accounts for metabolically active tissue only.</p>
                          <p className="text-muted-foreground mt-1 pt-1 border-t">Example: At 200 lbs with 25% BF, FFM = 150 lbs. 2.0 g/kg FFM ≈ 136g protein vs 2.0 g/kg BW ≈ 181g.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs", macroBasis === 'total_weight' ? 'font-medium' : 'text-muted-foreground')}>
                      Body Weight
                    </span>
                    <Switch
                      checked={macroBasis === 'fat_free_mass'}
                      onCheckedChange={(checked) => {
                        const newBasis = checked ? 'fat_free_mass' : 'total_weight';
                        setMacroBasis(newBasis);
                        // Adjust slider values when switching basis
                        if (newBasis === 'fat_free_mass') {
                          setProteinSlider(Math.min(PROTEIN_FFM_RANGE.max, proteinSlider * 1.2));
                          setFatSlider(Math.min(FAT_FFM_RANGE.max, fatSlider * 1.15));
                        } else {
                          setProteinSlider(Math.max(PROTEIN_RANGE.min, proteinSlider / 1.2));
                          setFatSlider(Math.max(FAT_RANGE.min, fatSlider / 1.15));
                        }
                      }}
                    />
                    <span className={cn("text-xs", macroBasis === 'fat_free_mass' ? 'font-medium' : 'text-muted-foreground')}>
                      Fat-Free Mass
                    </span>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                  <div className="p-2 bg-white/50 rounded">
                    <p className="text-muted-foreground">Total Body Weight</p>
                    <p className="font-bold">{weightKg.toFixed(1)} kg ({userProfile.weightLbs?.toFixed(0) || 0} lbs)</p>
                  </div>
                  <div className={cn("p-2 rounded", macroBasis === 'fat_free_mass' ? 'bg-[#c19962]/10 border border-[#c19962]/30' : 'bg-white/50')}>
                    <p className="text-muted-foreground">Fat-Free Mass (FFM)</p>
                    <p className="font-bold">{leanMassKg.toFixed(1)} kg ({Math.round(leanMassKg * 2.205)} lbs)</p>
                    <p className="text-[10px] text-muted-foreground">Based on {bodyFatPct}% body fat</p>
                  </div>
                </div>
              </div>

              {/* Step 1: Protein */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">1</span>
                  <span className="text-sm font-semibold">Confirm or Adjust Protein Target</span>
                </div>
                <p className="text-xs text-muted-foreground -mt-1 ml-7">
                  {goalType === 'lose_fat'
                    ? `Set to ${proteinSlider.toFixed(1)} g/kg ${basisLabel} to maximize muscle preservation during a calorie deficit (Helms et al., 2014).`
                    : goalType === 'gain_muscle'
                    ? `Set to ${proteinSlider.toFixed(1)} g/kg ${basisLabel} to support muscle protein synthesis during a surplus (Morton et al., 2018).`
                    : `Set to ${proteinSlider.toFixed(1)} g/kg ${basisLabel} to maintain lean mass at maintenance calories.`
                  }
                  {macroBasis === 'fat_free_mass' && ' Using fat-free mass basis for more accurate dosing.'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Protein</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm p-3">
                        <p className="font-medium text-xs mb-2">Evidence-Based Protein Guidelines</p>
                        <div className="space-y-2 text-xs">
                          <p><strong>Fat Loss (per BW):</strong> 2.3-3.1 g/kg for lean individuals in deficit (Helms et al., 2014)</p>
                          <p><strong>Fat Loss (per FFM):</strong> 2.8-3.5 g/kg FFM typical recommendation</p>
                          <p><strong>Muscle Gain:</strong> 1.6-2.2 g/kg with diminishing returns above (Morton et al., 2018)</p>
                          <p className="text-muted-foreground mt-1 pt-1 border-t">Higher protein during deficits preserves muscle mass. Leaner individuals need more.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {proteinSlider.toFixed(1)} g/kg {basisLabel}
                    </Badge>
                    {macroBasis === 'fat_free_mass' && (
                      <Badge variant="secondary" className="text-[10px]">
                        ≈ {proteinPerTotalBW} g/kg BW
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Protein Slider with range zones */}
                <div className="space-y-2">
                  <div className="relative pt-1">
                    <div className="h-2 bg-gradient-to-r from-yellow-300 via-green-400 to-orange-400 rounded-full" />
                    <Slider
                      value={[proteinSlider]}
                      onValueChange={(v) => setProteinSlider(v[0])}
                      min={macroBasis === 'fat_free_mass' ? PROTEIN_FFM_RANGE.min : PROTEIN_RANGE.min}
                      max={macroBasis === 'fat_free_mass' ? PROTEIN_FFM_RANGE.max : PROTEIN_RANGE.max}
                      step={0.1}
                      className="absolute inset-0"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{macroBasis === 'fat_free_mass' ? PROTEIN_FFM_RANGE.min : PROTEIN_RANGE.min} g/kg</span>
                    <span className="text-green-600 font-medium">
                      {macroBasis === 'fat_free_mass' ? '2.4-3.0 optimal' : '2.0-2.4 optimal'}
                    </span>
                    <span>{macroBasis === 'fat_free_mass' ? PROTEIN_FFM_RANGE.max : PROTEIN_RANGE.max} g/kg</span>
                  </div>
                </div>

                {/* Protein quick presets */}
                <div className="flex gap-1.5 flex-wrap">
                  {(macroBasis === 'fat_free_mass' 
                    ? [{ v: 2.0, l: 'Moderate' }, { v: 2.4, l: 'Standard' }, { v: 2.8, l: 'High' }, { v: 3.2, l: 'Very High' }]
                    : [{ v: 1.6, l: 'Moderate' }, { v: 2.0, l: 'Standard' }, { v: 2.4, l: 'High' }, { v: 2.8, l: 'Very High' }]
                  ).map(preset => (
                    <Button
                      key={preset.v}
                      variant={Math.abs(proteinSlider - preset.v) < 0.05 ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => setProteinSlider(preset.v)}
                    >
                      {preset.l} ({preset.v})
                    </Button>
                  ))}
                </div>

                {/* Protein Summary */}
                <div className="grid grid-cols-4 gap-2 p-2 bg-blue-50/50 border border-blue-200 rounded-lg">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-700">{proteinSlider.toFixed(1)}</p>
                    <p className="text-[10px] text-blue-600">g/kg {basisLabel}</p>
                  </div>
                  <div className="text-center border-x border-blue-200">
                    <p className="text-lg font-bold text-blue-700">{proteinGrams}</p>
                    <p className="text-[10px] text-blue-600">grams/day</p>
                  </div>
                  <div className="text-center border-r border-blue-200">
                    <p className="text-lg font-bold text-blue-700">{proteinGrams * 4}</p>
                    <p className="text-[10px] text-blue-600">kcal/day</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-700">
                      {Math.round((proteinGrams * 4) / (weeklyAverages?.avgCalories || 2000) * 100)}%
                    </p>
                    <p className="text-[10px] text-blue-600">of calories</p>
                  </div>
                </div>
              </div>

              {/* Step 2: Fat */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold shrink-0">2</span>
                  <span className="text-sm font-semibold">Confirm or Adjust Fat Target</span>
                </div>
                <p className="text-xs text-muted-foreground -mt-1 ml-7">
                  Set to {fatSlider.toFixed(2)} g/kg {basisLabel} ({fatGrams}g/day). Minimum ~0.5 g/kg BW needed for hormone function and fat-soluble vitamin absorption.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Fat</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm p-3">
                        <p className="font-medium text-xs mb-2">Evidence-Based Fat Guidelines</p>
                        <div className="space-y-2 text-xs">
                          <p><strong>Minimum:</strong> 0.5 g/kg BW for hormone function (Helms et al., 2014)</p>
                          <p><strong>Health:</strong> 20-35% of total calories recommended (Dietary Guidelines)</p>
                          <p><strong>Hormones:</strong> Low fat (&lt;15% kcal) may impair testosterone/menstrual function</p>
                          <p className="text-muted-foreground mt-1 pt-1 border-t">Essential for fat-soluble vitamins (A, D, E, K) and satiety.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {fatSlider.toFixed(1)} g/kg {basisLabel}
                    </Badge>
                    {macroBasis === 'fat_free_mass' && (
                      <Badge variant="secondary" className="text-[10px]">
                        ≈ {fatPerTotalBW} g/kg BW
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Fat Slider with range zones */}
                <div className="space-y-2">
                  <div className="relative pt-1">
                    <div className="h-2 bg-gradient-to-r from-red-300 via-green-400 to-yellow-400 rounded-full" />
                    <Slider
                      value={[fatSlider]}
                      onValueChange={(v) => setFatSlider(v[0])}
                      min={macroBasis === 'fat_free_mass' ? FAT_FFM_RANGE.min : FAT_RANGE.min}
                      max={macroBasis === 'fat_free_mass' ? FAT_FFM_RANGE.max : FAT_RANGE.max}
                      step={0.05}
                      className="absolute inset-0"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="text-red-600">{macroBasis === 'fat_free_mass' ? FAT_FFM_RANGE.min : FAT_RANGE.min} min</span>
                    <span className="text-green-600 font-medium">
                      {macroBasis === 'fat_free_mass' ? '0.9-1.3 optimal' : '0.8-1.1 optimal'}
                    </span>
                    <span>{macroBasis === 'fat_free_mass' ? FAT_FFM_RANGE.max : FAT_RANGE.max} g/kg</span>
                  </div>
                </div>

                {/* Fat quick presets */}
                <div className="flex gap-1.5 flex-wrap">
                  {(macroBasis === 'fat_free_mass'
                    ? [{ v: 0.7, l: 'Low' }, { v: 1.0, l: 'Moderate' }, { v: 1.3, l: 'Standard' }, { v: 1.6, l: 'Higher' }]
                    : [{ v: 0.6, l: 'Low' }, { v: 0.8, l: 'Moderate' }, { v: 1.0, l: 'Standard' }, { v: 1.2, l: 'Higher' }]
                  ).map(preset => (
                    <Button
                      key={preset.v}
                      variant={Math.abs(fatSlider - preset.v) < 0.05 ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => setFatSlider(preset.v)}
                    >
                      {preset.l} ({preset.v})
                    </Button>
                  ))}
                </div>

                {/* Fat Warning */}
                {((macroBasis === 'total_weight' && fatSlider < 0.5) || (macroBasis === 'fat_free_mass' && fatSlider < 0.6)) && (
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-800">
                    <p className="text-xs flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      <strong>Warning:</strong> Fat below minimum threshold may impair hormone function. Not recommended long-term.
                    </p>
                  </div>
                )}

                {/* Fat Summary */}
                <div className="grid grid-cols-4 gap-2 p-2 bg-purple-50/50 border border-purple-200 rounded-lg">
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-700">{fatSlider.toFixed(1)}</p>
                    <p className="text-[10px] text-purple-600">g/kg {basisLabel}</p>
                  </div>
                  <div className="text-center border-x border-purple-200">
                    <p className="text-lg font-bold text-purple-700">{fatGrams}</p>
                    <p className="text-[10px] text-purple-600">grams/day</p>
                  </div>
                  <div className="text-center border-r border-purple-200">
                    <p className="text-lg font-bold text-purple-700">{fatGrams * 9}</p>
                    <p className="text-[10px] text-purple-600">kcal/day</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-700">
                      {Math.round((fatGrams * 9) / (weeklyAverages?.avgCalories || 2000) * 100)}%
                    </p>
                    <p className="text-[10px] text-purple-600">of calories</p>
                  </div>
                </div>
              </div>

              {/* Step 3: Carbohydrate Auto-Fill */}
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-bold shrink-0">3</span>
                <span className="text-sm font-semibold">Carbohydrates (auto-calculated from remaining calories)</span>
              </div>
              <p className="text-xs text-muted-foreground -mt-1 ml-7 mb-2">
                After protein and fat are set, remaining calories fill carbohydrates. To customize carbs for specific days (e.g., higher on workout days, lower on rest days), use the <strong>Daily Targets</strong> tab.
              </p>
              {(() => {
                const carbGrams = weeklyAverages?.avgCarbs || 0;
                const carbCal = carbGrams * 4;
                const avgCalories = weeklyAverages?.avgCalories || 2000;
                const carbPerKg = carbGrams / weightKg;
                
                let carbStatus: 'low' | 'adequate' | 'high' = 'adequate';
                let carbMessage = '';
                
                if (carbGrams === 0) {
                  carbStatus = 'low';
                  carbMessage = 'Protein + fat exceed calorie target. Reduce protein/fat or increase calories.';
                } else if (carbGrams < 100) {
                  carbStatus = 'low';
                  carbMessage = `Very low carbs — may impair performance and recovery. Consider reducing protein or fat.`;
                } else if (carbGrams < 130) {
                  carbStatus = 'low';
                  carbMessage = 'Below 130g recommendation for brain function. Consider adjusting protein/fat or calories.';
                } else if (carbPerKg < 3) {
                  carbStatus = 'low';
                  carbMessage = 'Low carb availability may impact high-intensity training performance.';
                } else if (carbPerKg > 7) {
                  carbStatus = 'high';
                  carbMessage = 'High carb intake appropriate for endurance training or high activity.';
                } else {
                  carbMessage = 'Carbohydrate intake adequate for moderate training demands.';
                }
                
                return (
                  <div className={cn(
                    "p-3 rounded-lg border",
                    carbStatus === 'low' ? 'bg-amber-50 border-amber-200' : 
                    carbStatus === 'high' ? 'bg-blue-50 border-blue-200' : 
                    'bg-amber-50/30 border-amber-200/50'
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className={cn("h-4 w-4", carbStatus === 'low' ? 'text-amber-600' : 'text-amber-500')} />
                        <span className="text-sm font-medium">Carbohydrates (auto-calculated)</span>
                      </div>
                      <Badge variant={carbStatus === 'low' ? 'destructive' : 'secondary'} className="text-xs">
                        {carbPerKg.toFixed(1)} g/kg BW
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <div className="text-center p-1.5 bg-white/50 rounded">
                        <p className="text-sm font-bold">{carbGrams}g</p>
                        <p className="text-[10px] text-muted-foreground">Daily</p>
                      </div>
                      <div className="text-center p-1.5 bg-white/50 rounded">
                        <p className="text-sm font-bold">{Math.round(carbCal)}</p>
                        <p className="text-[10px] text-muted-foreground">kcal</p>
                      </div>
                      <div className="text-center p-1.5 bg-white/50 rounded">
                        <p className="text-sm font-bold">{Math.round(carbCal / avgCalories * 100)}%</p>
                        <p className="text-[10px] text-muted-foreground">of total</p>
                      </div>
                      <div className="text-center p-1.5 bg-white/50 rounded">
                        <p className="text-sm font-bold">{carbPerKg.toFixed(1)}</p>
                        <p className="text-[10px] text-muted-foreground">g/kg</p>
                      </div>
                    </div>
                    <p className={cn("text-xs", carbStatus === 'low' ? 'text-amber-700' : 'text-muted-foreground')}>
                      {carbMessage}
                    </p>
                  </div>
                );
              })()}

              {/* Advanced: Research & Direct Input */}
              {showAdvanced && (
                <div className="p-4 rounded-lg border bg-muted/20 space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Research & Direct Input
                  </h4>
                  
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Key Citations:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li><strong>Helms et al. (2014)</strong> - 2.3-3.1 g/kg protein in deficit</li>
                      <li><strong>Morton et al. (2018)</strong> - ~1.6 g/kg optimal for growth</li>
                      <li><strong>Phillips et al. (2011)</strong> - FFM-based calculations for athletes</li>
                      <li><strong>Burke et al. (2011)</strong> - 3-10 g/kg carbs based on activity</li>
                    </ul>
                  </div>

                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Direct Protein (g/kg {basisLabel})</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={proteinSlider}
                        onChange={(e) => setProteinSlider(Number(e.target.value) || proteinSlider)}
                        className="h-8 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Direct Fat (g/kg {basisLabel})</Label>
                      <Input
                        type="number"
                        step="0.05"
                        value={fatSlider}
                        onChange={(e) => setFatSlider(Number(e.target.value) || fatSlider)}
                        className="h-8 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Micronutrient Targets */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Micronutrient Targets
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowMicronutrients(!showMicronutrients)}>
                  {showMicronutrients ? 'Collapse' : 'Expand'}
                  {showMicronutrients ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Evidence-based defaults from DRIs with athlete considerations. Customize as needed.
              </p>
            </CardHeader>
            
            {showMicronutrients && (
              <CardContent className="space-y-4">
                {/* Quick Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setMicroTargets(getDefaultMicronutrients(userProfile.gender, userProfile.age, true, phase.goalType))}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reset to Defaults
                  </Button>
                  <Badge variant="secondary" className="text-xs">
                    {userProfile.gender === 'Female' ? 'Female' : 'Male'} • Age {userProfile.age || '~30'} • Athlete Optimized
                  </Badge>
                </div>

                {/* Micronutrient Categories */}
                {Object.entries(MICRONUTRIENT_CATEGORIES).map(([catKey, category]) => {
                  const IconComponent = category.icon;
                  const isExpanded = expandedMicroCategory === catKey;
                  
                  return (
                    <div key={catKey} className="border rounded-lg overflow-hidden">
                      <button
                        className="w-full p-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedMicroCategory(isExpanded ? null : catKey)}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{category.label}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {category.items.length} nutrients
                          </Badge>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      
                      {isExpanded && (
                        <div className="p-3 space-y-3 bg-white">
                          {category.items.map(item => {
                            const target = microTargets[item.key as keyof MicronutrientTargets] as MicronutrientTarget | undefined;
                            if (!target) return null;
                            
                            return (
                              <div key={item.key} className="flex items-center gap-3 p-2 rounded bg-muted/20">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{item.label}</span>
                                    {target.isCustom && (
                                      <Badge variant="outline" className="text-[10px] h-4">Custom</Badge>
                                    )}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="text-xs">{item.description}</p>
                                        {target.rdaReference && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            RDA: {target.rdaReference} {target.unit}
                                            {target.maxSafe && ` • UL: ${target.maxSafe} ${target.unit}`}
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={target.value}
                                    onChange={(e) => {
                                      const newValue = Number(e.target.value);
                                      setMicroTargets(prev => ({
                                        ...prev,
                                        [item.key]: { ...target, value: newValue, isCustom: true }
                                      }));
                                    }}
                                    className="h-7 w-20 text-xs font-mono text-right"
                                  />
                                  <span className="text-xs text-muted-foreground w-12">{target.unit}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Summary of customizations */}
                {Object.values(microTargets).some(t => t && typeof t === 'object' && 'isCustom' in t && t.isCustom) && (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    <p className="flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Some micronutrient targets have been customized from defaults.
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* DAILY TAB */}
        <TabsContent value="daily" className="space-y-4 mt-4">
          {/* Day Selector - Grid ensures all 7 days are visible */}
          <div className="grid grid-cols-7 gap-1.5 bg-muted/50 p-1.5 rounded-lg w-full">
            {DAYS.map((day, idx) => {
              const config = fullDayConfigs[day];
              const hasCustom = Object.keys(dayConfigs[day] || {}).length > 0;
              
              return (
                <Button
                  key={day}
                  variant={selectedDay === day ? 'default' : 'ghost'}
                  className={cn(
                    "flex-col h-auto py-2 px-1 min-w-0",
                    selectedDay === day && 'bg-[#00263d] hover:bg-[#003b59]'
                  )}
                  onClick={() => setSelectedDay(day)}
                >
                  <div className="flex items-center gap-0.5">
                    {config?.isWorkoutDay ? (
                      <Dumbbell className="h-3 w-3 text-green-400 shrink-0" />
                    ) : (
                      <Coffee className="h-3 w-3 opacity-50 shrink-0" />
                    )}
                    <span className="text-xs font-medium truncate">{SHORT_DAYS[idx]}</span>
                    {hasCustom && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c19962] shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] opacity-70 mt-0.5">
                    {config?.calories?.toLocaleString() || 0}
                  </span>
                  {dayConfigs[day]?.dayLabel && (
                    <span className="text-[9px] opacity-60 mt-0.5 truncate max-w-[56px]" title={dayConfigs[day]?.dayLabel}>
                      {dayConfigs[day]?.dayLabel}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Selected Day Details */}
          {selectedDayConfig && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedDayConfig.isWorkoutDay ? (
                      <div className="p-2 rounded-lg bg-green-100">
                        <Dumbbell className="h-5 w-5 text-green-700" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-gray-100">
                        <Coffee className="h-5 w-5 text-gray-700" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {selectedDay}
                        {hasOverrides && (
                          <Badge variant="outline" className="text-xs text-[#c19962] border-[#c19962]">
                            Customized
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1.5">
                        {editingDayLabel ? (
                          <span className="flex items-center gap-1">
                            <input
                              type="text"
                              className="text-xs border rounded px-1.5 py-0.5 w-32 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#c19962]"
                              value={dayLabelDraft}
                              autoFocus
                              onChange={(e) => setDayLabelDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateDayConfig(selectedDay, { dayLabel: dayLabelDraft || undefined });
                                  setEditingDayLabel(false);
                                } else if (e.key === 'Escape') {
                                  setEditingDayLabel(false);
                                }
                              }}
                              onBlur={() => {
                                updateDayConfig(selectedDay, { dayLabel: dayLabelDraft || undefined });
                                setEditingDayLabel(false);
                              }}
                              placeholder={selectedDayConfig.isWorkoutDay ? 'Workout Day' : 'Rest Day'}
                            />
                            <button
                              className="text-green-600 hover:text-green-700"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                updateDayConfig(selectedDay, { dayLabel: dayLabelDraft || undefined });
                                setEditingDayLabel(false);
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ) : (
                          <button
                            className="flex items-center gap-1 hover:text-foreground transition-colors group"
                            onClick={() => {
                              setDayLabelDraft(dayConfigs[selectedDay]?.dayLabel || '');
                              setEditingDayLabel(true);
                            }}
                          >
                            <Tag className="h-3 w-3" />
                            <span>
                              {dayConfigs[selectedDay]?.dayLabel || 
                                (selectedDayConfig.isWorkoutDay ? 
                                  `${selectedDayConfig.workouts[0]?.type || 'Workout'} • ${selectedDayConfig.workouts[0]?.duration || 60}min` : 
                                  'Rest Day'
                                )
                              }
                            </span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </button>
                        )}
                        {editingDayLabel && (
                          <span className="flex flex-wrap gap-1 ml-1">
                            {['Refeed Day', 'Deload Day', 'Active Recovery', 'High Carb Day', 'Low Carb Day'].map(preset => (
                              <button
                                key={preset}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-[#c19962]/20 hover:text-[#c19962] transition-colors"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setDayLabelDraft(preset);
                                  updateDayConfig(selectedDay, { dayLabel: preset });
                                  setEditingDayLabel(false);
                                }}
                              >
                                {preset}
                              </button>
                            ))}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCopySourceDay(selectedDay);
                        setCopyTargetDays([]);
                        setShowCopyDialog(true);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy To...
                    </Button>
                    {hasOverrides && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => resetDayToDefaults(selectedDay)}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Energy Breakdown */}
                <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Energy Breakdown
                  </h4>
                  <div className="grid grid-cols-5 gap-2 text-center text-sm">
                    <div className="p-2 rounded bg-background">
                      <p className="text-xs text-muted-foreground">
                        RMR {baseMetrics.rmrSource === 'measured' && <span className="text-green-600">(M)</span>}
                      </p>
                      <p className="font-mono font-medium">{Math.round(baseMetrics.rmr)}</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-xs text-muted-foreground">NEAT</p>
                      <p className="font-mono font-medium">{Math.round(baseMetrics.neat)}</p>
                    </div>
                    <div className="p-2 rounded bg-background">
                      <p className="text-xs text-muted-foreground">TEF</p>
                      <p className="font-mono font-medium">{Math.round(baseMetrics.tef)}</p>
                    </div>
                    <div className="p-2 rounded bg-green-50 border border-green-200">
                      <p className="text-xs text-green-600">Exercise</p>
                      <p className="font-mono font-medium text-green-700">{selectedDayConfig.workoutCalories}</p>
                    </div>
                    <div className="p-2 rounded bg-blue-50 border border-blue-200">
                      <p className="text-xs text-blue-600">TDEE</p>
                      <p className="font-mono font-bold text-blue-700">{Math.round(selectedDayConfig.totalTDEE)}</p>
                    </div>
                  </div>
                </div>

                {/* Macro Targets */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#c19962]" />
                    Day Nutrition Targets
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    Edit any field below. Changing calories adjusts carbs to fill the remainder. Changing a macro recalculates total calories. Per-meal targets below will need to be recalculated if you change these.
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Calories</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={selectedDayConfig.calories}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+$/.test(val)) {
                            const newCal = val === '' ? 0 : parseInt(val, 10);
                            const p = selectedDayConfig.protein;
                            const f = selectedDayConfig.fat;
                            const newCarbs = Math.max(0, Math.round((newCal - p * 4 - f * 9) / 4));
                            updateDayConfig(selectedDay, { calories: newCal, protein: p, carbs: newCarbs, fat: f });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Protein (g)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={selectedDayConfig.protein}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+$/.test(val)) {
                            const newP = val === '' ? 0 : parseInt(val, 10);
                            const c = selectedDayConfig.carbs;
                            const f = selectedDayConfig.fat;
                            updateDayConfig(selectedDay, { protein: newP, carbs: c, fat: f, calories: newP * 4 + c * 4 + f * 9 });
                          }
                        }}
                      />
                      <p className="text-[10px] text-muted-foreground">{(selectedDayConfig.protein / weightKg).toFixed(1)} g/kg</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={selectedDayConfig.carbs}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+$/.test(val)) {
                            const newC = val === '' ? 0 : parseInt(val, 10);
                            const p = selectedDayConfig.protein;
                            const f = selectedDayConfig.fat;
                            updateDayConfig(selectedDay, { protein: p, carbs: newC, fat: f, calories: p * 4 + newC * 4 + f * 9 });
                          }
                        }}
                      />
                      <p className="text-[10px] text-muted-foreground">{(selectedDayConfig.carbs / weightKg).toFixed(1)} g/kg</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fat (g)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={selectedDayConfig.fat}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+$/.test(val)) {
                            const newF = val === '' ? 0 : parseInt(val, 10);
                            const p = selectedDayConfig.protein;
                            const c = selectedDayConfig.carbs;
                            updateDayConfig(selectedDay, { protein: p, carbs: c, fat: newF, calories: p * 4 + c * 4 + newF * 9 });
                          }
                        }}
                      />
                      <p className="text-[10px] text-muted-foreground">{(selectedDayConfig.fat / weightKg).toFixed(1)} g/kg</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Schedule & Meal Structure */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Schedule */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Schedule
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Sun className="h-3 w-3" /> Wake Time
                        </Label>
                        <Input
                          type="text"
                          value={selectedDayConfig.wakeTime}
                          onChange={(e) => updateDayConfig(selectedDay, { wakeTime: e.target.value })}
                          placeholder="7:00 AM"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Moon className="h-3 w-3" /> Sleep Time
                        </Label>
                        <Input
                          type="text"
                          value={selectedDayConfig.sleepTime}
                          onChange={(e) => updateDayConfig(selectedDay, { sleepTime: e.target.value })}
                          placeholder="10:00 PM"
                          className="h-8"
                        />
                      </div>
                    </div>
                    
                    {/* Workout Configuration - Prominent Section */}
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Dumbbell className="h-4 w-4 text-green-600" />
                          Workout
                        </h4>
                        {selectedDayConfig.isWorkoutDay && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => updateDayConfig(selectedDay, { workouts: [] })}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                      
                      {selectedDayConfig.isWorkoutDay && selectedDayConfig.workouts.length > 0 ? (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-green-700">Type</Label>
                              <Select
                                value={selectedDayConfig.workouts[0]?.type || 'Resistance Training'}
                                onValueChange={(v) => {
                                  const updatedWorkouts = [...selectedDayConfig.workouts];
                                  updatedWorkouts[0] = { ...updatedWorkouts[0], type: v as WorkoutType };
                                  updateDayConfig(selectedDay, { workouts: updatedWorkouts });
                                }}
                              >
                                <SelectTrigger className="h-9 text-sm bg-white border-green-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={4} align="start">
                                  {WORKOUT_TYPES.map(type => (
                                    <SelectItem key={type} value={type} className="text-sm">{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-green-700">Time Slot</Label>
                              <Select
                                value={selectedDayConfig.workouts[0]?.timeSlot || 'evening'}
                                onValueChange={(v) => {
                                  const updatedWorkouts = [...selectedDayConfig.workouts];
                                  updatedWorkouts[0] = { ...updatedWorkouts[0], timeSlot: v as WorkoutTimeSlot };
                                  updateDayConfig(selectedDay, { workouts: updatedWorkouts });
                                }}
                              >
                                <SelectTrigger className="h-9 text-sm bg-white border-green-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={4} align="start">
                                  {WORKOUT_TIME_SLOTS.map(slot => (
                                    <SelectItem key={slot.value} value={slot.value} className="text-sm">{slot.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-green-700">Duration (min)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={durationStr}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '');
                                  setDurationStr(val);
                                }}
                                onBlur={() => {
                                  const num = parseInt(durationStr);
                                  const clamped = isNaN(num) || num < 5 ? 5 : num > 300 ? 300 : num;
                                  setDurationStr(String(clamped));
                                  const updatedWorkouts = [...selectedDayConfig.workouts];
                                  updatedWorkouts[0] = { ...updatedWorkouts[0], duration: clamped };
                                  updateDayConfig(selectedDay, { workouts: updatedWorkouts });
                                }}
                                className="h-9 text-sm bg-white border-green-200"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-green-700">Intensity</Label>
                              <Select
                                value={selectedDayConfig.workouts[0]?.intensity || 'Medium'}
                                onValueChange={(v) => {
                                  const updatedWorkouts = [...selectedDayConfig.workouts];
                                  updatedWorkouts[0] = { ...updatedWorkouts[0], intensity: v as 'Low' | 'Medium' | 'High' };
                                  updateDayConfig(selectedDay, { workouts: updatedWorkouts });
                                }}
                              >
                                <SelectTrigger className="h-9 text-sm bg-white border-green-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={4} align="start">
                                  {WORKOUT_INTENSITIES.map(i => (
                                    <SelectItem key={i} value={i} className="text-sm">{i}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {/* Zone Selector — uses measured data from Profile if available */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-green-700">
                                Zone Override <span className="font-normal text-green-600">(or use intensity above)</span>
                              </Label>
                              <Badge variant="outline" className={cn("text-[9px] h-4",
                                userProfile.metabolicAssessment?.hasZoneData
                                  ? "border-green-400 text-green-700 bg-green-50"
                                  : "border-amber-300 text-amber-700 bg-amber-50"
                              )}>
                                {userProfile.metabolicAssessment?.hasZoneData ? 'Measured cal/min from profile' : 'Estimated — add zone data in Profile'}
                              </Badge>
                            </div>
                            <div className="flex gap-1.5">
                              {([1, 2, 3, 4, 5] as const).map(zone => {
                                const zoneData = userProfile.metabolicAssessment?.hasZoneData && userProfile.metabolicAssessment?.zoneCaloriesPerMin
                                  ? userProfile.metabolicAssessment.zoneCaloriesPerMin
                                  : getDefaultZoneCalories(weightKg);
                                const calPerMin = zoneData[`zone${zone}` as keyof typeof zoneData];
                                const currentZone = selectedDayConfig.workouts[0]?.averageZone;
                                const isSelected = currentZone === zone;
                                // Also show what zone the intensity would map to (as a visual hint)
                                const mappedZone = getTypicalZoneForWorkout(
                                  selectedDayConfig.workouts[0]?.type || 'Resistance Training',
                                  selectedDayConfig.workouts[0]?.intensity || 'Medium'
                                );
                                const isMapped = !currentZone && mappedZone === zone;
                                
                                return (
                                  <button
                                    key={zone}
                                    type="button"
                                    className={cn(
                                      "flex-1 rounded-md border py-1.5 px-1 text-center transition-all",
                                      isSelected
                                        ? "bg-green-600 border-green-700 text-white shadow-sm"
                                        : isMapped
                                        ? "bg-green-100 border-green-300 text-green-800"
                                        : "bg-white border-green-200 text-green-700 hover:bg-green-50"
                                    )}
                                    onClick={() => {
                                      const updatedWorkouts = [...selectedDayConfig.workouts];
                                      // Toggle off if already selected (fall back to intensity-based)
                                      const newZone = isSelected ? undefined : zone;
                                      updatedWorkouts[0] = { ...updatedWorkouts[0], averageZone: newZone };
                                      updateDayConfig(selectedDay, { workouts: updatedWorkouts });
                                    }}
                                  >
                                    <div className="text-xs font-bold">Z{zone}</div>
                                    <div className={cn("text-[9px]", isSelected ? "text-green-100" : "text-green-500")}>
                                      {calPerMin.toFixed(1)}/min
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[9px] text-muted-foreground">
                              {selectedDayConfig.workouts[0]?.averageZone 
                                ? `Zone ${selectedDayConfig.workouts[0].averageZone} selected — using ${
                                    (userProfile.metabolicAssessment?.hasZoneData 
                                      ? userProfile.metabolicAssessment?.zoneCaloriesPerMin 
                                      : getDefaultZoneCalories(weightKg)
                                    )?.[`zone${selectedDayConfig.workouts[0].averageZone}` as 'zone1' | 'zone2' | 'zone3' | 'zone4' | 'zone5']?.toFixed(1)
                                  } cal/min × ${selectedDayConfig.workouts[0]?.duration || 60} min`
                                : `Using intensity → Zone ${getTypicalZoneForWorkout(
                                    selectedDayConfig.workouts[0]?.type || 'Resistance Training',
                                    selectedDayConfig.workouts[0]?.intensity || 'Medium'
                                  )} estimate. Select a zone for more precision.`
                              }
                            </p>
                          </div>

                          <div className="pt-3 border-t border-green-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Flame className="h-4 w-4 text-green-600" />
                              <span className="text-xs text-green-700">
                                {selectedDayConfig.workouts[0]?.averageZone 
                                  ? `Zone ${selectedDayConfig.workouts[0].averageZone}` 
                                  : userProfile.metabolicAssessment?.hasZoneData ? 'Zone-based' : 'Estimated'} EEE:
                              </span>
                            </div>
                            <span className="text-lg font-bold text-green-700">
                              {selectedDayConfig.workoutCalories} kcal
                            </span>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => updateDayConfig(selectedDay, {
                            workouts: [{
                              enabled: true,
                              type: 'Resistance Training' as WorkoutType,
                              timeSlot: 'evening' as WorkoutTimeSlot,
                              duration: 60,
                              intensity: 'Medium' as const,
                            }]
                          })}
                          className="w-full p-4 rounded-xl border-2 border-dashed border-green-300 bg-green-50/50 hover:bg-green-100 hover:border-green-400 transition-all group"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="p-2 rounded-full bg-green-100 group-hover:bg-green-200 transition-colors">
                              <Plus className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-semibold text-green-700">Add Workout</p>
                              <p className="text-xs text-green-600 mt-0.5">Convert this to a training day</p>
                            </div>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Meal Structure */}
                  <div className="space-y-3 mt-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-[#c19962]" />
                      Meal Structure
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Meals</Label>
                        <Select
                          value={String(selectedDayConfig.mealCount)}
                          onValueChange={(v) => updateDayConfig(selectedDay, { mealCount: Number(v) })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper" sideOffset={4} align="start">
                            {[2, 3, 4, 5, 6].map(n => (
                              <SelectItem key={n} value={String(n)}>{n} meals</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Snacks</Label>
                        <Select
                          value={String(selectedDayConfig.snackCount)}
                          onValueChange={(v) => updateDayConfig(selectedDay, { snackCount: Number(v) })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper" sideOffset={4} align="start">
                            {[0, 1, 2, 3, 4].map(n => (
                              <SelectItem key={n} value={String(n)}>{n} snacks</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Per-Meal Macro Targets - Workout-Aware & Editable */}
                    {selectedDayConfig && (() => {
                      const computed = computeMealSlotTargets(selectedDayConfig);
                      const overrides = dayConfigs[selectedDay]?.mealSlotTargets;
                      // Use overrides if they match the current slot count, otherwise recompute
                      const slots = overrides && overrides.length === computed.length ? overrides : computed;
                      const totalCal = slots.reduce((s, sl) => s + sl.calories, 0);
                      const totalP = slots.reduce((s, sl) => s + sl.protein, 0);
                      const totalC = slots.reduce((s, sl) => s + sl.carbs, 0);
                      const totalF = slots.reduce((s, sl) => s + sl.fat, 0);

                      const updateSlot = (idx: number, field: 'calories' | 'protein' | 'carbs' | 'fat', value: number) => {
                        const updated = slots.map((sl, i) => i === idx ? { ...sl, [field]: value } : sl);
                        updateDayConfig(selectedDay, { mealSlotTargets: updated });
                      };

                      const resetToComputed = () => {
                        updateDayConfig(selectedDay, { mealSlotTargets: computed });
                      };

                      const mismatch = Math.abs(totalCal - (selectedDayConfig.calories || 0)) > 10;

                      return (
                        <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">Per-Meal Targets</span>
                              {selectedDayConfig.isWorkoutDay && (
                                <Badge variant="outline" className="text-[9px] h-4 border-green-300 text-green-700 bg-green-50">
                                  <Dumbbell className="h-2.5 w-2.5 mr-0.5" />
                                  Nutrient timing active
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button variant={mismatch ? 'default' : 'ghost'} size="sm" className={cn("h-6 text-[10px]", mismatch ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-blue-500')} onClick={resetToComputed}>
                                <RefreshCw className="h-3 w-3 mr-1" /> Recalculate
                              </Button>
                              <span className="text-[10px] text-blue-500">
                                {selectedDayConfig.mealCount} meals + {selectedDayConfig.snackCount} snacks
                              </span>
                            </div>
                          </div>
                          <p className="text-[9px] text-blue-600">
                            {overrides
                              ? 'Custom per-meal targets. Click "Recalculate" to redistribute from day totals.'
                              : selectedDayConfig.isWorkoutDay
                              ? 'Auto-distributed with nutrient timing: extra protein + carbs post-workout, extra carbs pre-workout.'
                              : 'Auto-distributed evenly across meals; snacks get ~8% each.'
                            }
                          </p>
                          
                          <div className="space-y-1">
                            {/* Header */}
                            <div className="grid grid-cols-[1fr_58px_48px_48px_48px] gap-1 text-[10px] text-muted-foreground font-medium px-1">
                              <span>Slot</span>
                              <span className="text-center">Cal</span>
                              <span className="text-center text-blue-600">P (g)</span>
                              <span className="text-center text-amber-600">C (g)</span>
                              <span className="text-center text-purple-600">F (g)</span>
                            </div>
                            {slots.map((slot, idx) => (
                              <div key={idx} className={cn(
                                "grid grid-cols-[1fr_58px_48px_48px_48px] gap-1 items-center px-1 py-1.5 rounded-md text-xs",
                                slot.workoutRelation === 'post-workout' ? 'bg-green-50 border border-green-200' :
                                slot.workoutRelation === 'pre-workout' ? 'bg-amber-50 border border-amber-200' :
                                slot.type === 'meal' ? 'bg-white border border-blue-100' : 'bg-gray-50 border border-gray-100'
                              )}>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {slot.type === 'meal' ? (
                                      <Utensils className="h-3 w-3 text-blue-500 shrink-0" />
                                    ) : (
                                      <Coffee className="h-3 w-3 text-gray-400 shrink-0" />
                                    )}
                                    <span className="font-medium truncate">{slot.label}</span>
                                    {slot.workoutRelation === 'post-workout' && (
                                      <Badge className="h-3.5 text-[8px] bg-green-600 px-1">Post</Badge>
                                    )}
                                    {slot.workoutRelation === 'pre-workout' && (
                                      <Badge className="h-3.5 text-[8px] bg-amber-600 px-1">Pre</Badge>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-muted-foreground mt-0.5 italic truncate">{slot.rationale}</p>
                                </div>
                                <Input
                                  type="number"
                                  className="h-6 text-[11px] font-mono text-center px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={slot.calories}
                                  onChange={(e) => updateSlot(idx, 'calories', Number(e.target.value) || 0)}
                                />
                                <Input
                                  type="number"
                                  className="h-6 text-[11px] font-mono text-center px-1 border-blue-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={slot.protein}
                                  onChange={(e) => updateSlot(idx, 'protein', Number(e.target.value) || 0)}
                                />
                                <Input
                                  type="number"
                                  className="h-6 text-[11px] font-mono text-center px-1 border-amber-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={slot.carbs}
                                  onChange={(e) => updateSlot(idx, 'carbs', Number(e.target.value) || 0)}
                                />
                                <Input
                                  type="number"
                                  className="h-6 text-[11px] font-mono text-center px-1 border-purple-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={slot.fat}
                                  onChange={(e) => updateSlot(idx, 'fat', Number(e.target.value) || 0)}
                                />
                              </div>
                            ))}
                            {/* Totals */}
                            <div className="grid grid-cols-[1fr_58px_48px_48px_48px] gap-1 px-1 pt-1.5 border-t text-xs font-semibold">
                              <span>Total</span>
                              <span className={cn("text-center font-mono", Math.abs(totalCal - (selectedDayConfig.calories || 0)) > 5 && 'text-red-500')}>{totalCal}</span>
                              <span className={cn("text-center font-mono text-blue-600", Math.abs(totalP - (selectedDayConfig.protein || 0)) > 2 && 'text-red-500')}>{totalP}g</span>
                              <span className={cn("text-center font-mono text-amber-600", Math.abs(totalC - (selectedDayConfig.carbs || 0)) > 2 && 'text-red-500')}>{totalC}g</span>
                              <span className={cn("text-center font-mono text-purple-600", Math.abs(totalF - (selectedDayConfig.fat || 0)) > 2 && 'text-red-500')}>{totalF}g</span>
                            </div>
                            {/* Warning if totals don't match day targets */}
                            {mismatch && (
                              <div className="px-2 py-1.5 rounded bg-red-50 border border-red-200 flex items-center justify-between">
                                <p className="text-[10px] text-red-600">
                                  Per-meal total ({totalCal} cal) does not match day target ({selectedDayConfig.calories} cal).
                                </p>
                                <Button variant="destructive" size="sm" className="h-5 text-[9px] ml-2 shrink-0" onClick={resetToComputed}>
                                  <RefreshCw className="h-2.5 w-2.5 mr-0.5" /> Fix: Recalculate
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Meal Contexts - Editable */}
                    <div className="p-3 rounded-lg bg-[#c19962]/5 border border-[#c19962]/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ChefHat className="h-4 w-4 text-[#c19962]" />
                          <span className="text-sm font-medium text-[#c19962]">Meal Contexts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {weeklySchedule[selectedDay]?.mealContexts && weeklySchedule[selectedDay].mealContexts.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-[#c19962] hover:text-[#a88347] hover:bg-[#c19962]/10"
                              onClick={() => {
                                // Load from profile defaults for this day
                                updateDayConfig(selectedDay, { 
                                  mealContexts: weeklySchedule[selectedDay]?.mealContexts || [] 
                                });
                              }}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Load from Profile
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-[#c19962] hover:text-[#a88347] hover:bg-[#c19962]/10"
                            onClick={() => {
                              const newContext: MealContext = {
                                id: `ctx-${Date.now()}`,
                                type: 'meal',
                                label: selectedDayConfig.mealContexts?.length 
                                  ? `Meal ${selectedDayConfig.mealContexts.filter(c => c.type === 'meal').length + 1}`
                                  : 'Breakfast',
                                prepMethod: 'cook',
                                prepTime: '15-30min',
                                location: 'home',
                                timeRange: '',
                                isRoutine: true,
                              };
                              updateDayConfig(selectedDay, { 
                                mealContexts: [...(selectedDayConfig.mealContexts || []), newContext] 
                              });
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                      
                      {selectedDayConfig.mealContexts && selectedDayConfig.mealContexts.length > 0 ? (
                        <div className="space-y-2">
                          {selectedDayConfig.mealContexts.map((ctx, idx) => (
                            <div key={ctx.id || idx} className="p-2.5 rounded-lg bg-white border border-[#c19962]/20 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={ctx.type}
                                    onValueChange={(v) => {
                                      const updated = [...selectedDayConfig.mealContexts];
                                      updated[idx] = { ...updated[idx], type: v as 'meal' | 'snack' };
                                      updateDayConfig(selectedDay, { mealContexts: updated });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 w-[90px] text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                      <SelectItem value="meal" className="text-xs">Meal</SelectItem>
                                      <SelectItem value="snack" className="text-xs">Snack</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    value={ctx.label}
                                    onChange={(e) => {
                                      const updated = [...selectedDayConfig.mealContexts];
                                      updated[idx] = { ...updated[idx], label: e.target.value };
                                      updateDayConfig(selectedDay, { mealContexts: updated });
                                    }}
                                    placeholder="Label (e.g., Breakfast)"
                                    className="h-7 w-[120px] text-xs"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    const updated = selectedDayConfig.mealContexts.filter((_, i) => i !== idx);
                                    updateDayConfig(selectedDay, { mealContexts: updated });
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-muted-foreground">Prep</Label>
                                  <Select
                                    value={ctx.prepMethod}
                                    onValueChange={(v) => {
                                      const updated = [...selectedDayConfig.mealContexts];
                                      updated[idx] = { ...updated[idx], prepMethod: v as MealContext['prepMethod'] };
                                      updateDayConfig(selectedDay, { mealContexts: updated });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                      <SelectItem value="cook" className="text-xs">Cook</SelectItem>
                                      <SelectItem value="leftovers" className="text-xs">Leftovers</SelectItem>
                                      <SelectItem value="pickup" className="text-xs">Pickup</SelectItem>
                                      <SelectItem value="delivery" className="text-xs">Delivery</SelectItem>
                                      <SelectItem value="skip" className="text-xs">Skip</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-muted-foreground">Location</Label>
                                  <Select
                                    value={ctx.location}
                                    onValueChange={(v) => {
                                      const updated = [...selectedDayConfig.mealContexts];
                                      updated[idx] = { ...updated[idx], location: v as MealContext['location'] };
                                      updateDayConfig(selectedDay, { mealContexts: updated });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                      <SelectItem value="home" className="text-xs">Home</SelectItem>
                                      <SelectItem value="office" className="text-xs">Office</SelectItem>
                                      <SelectItem value="on_the_go" className="text-xs">On-the-go</SelectItem>
                                      <SelectItem value="restaurant" className="text-xs">Restaurant</SelectItem>
                                      <SelectItem value="gym" className="text-xs">Gym</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-muted-foreground">Time</Label>
                                  <Select
                                    value={ctx.prepTime}
                                    onValueChange={(v) => {
                                      const updated = [...selectedDayConfig.mealContexts];
                                      updated[idx] = { ...updated[idx], prepTime: v };
                                      updateDayConfig(selectedDay, { mealContexts: updated });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                      <SelectItem value="<5min" className="text-xs">&lt;5 min</SelectItem>
                                      <SelectItem value="5-15min" className="text-xs">5-15 min</SelectItem>
                                      <SelectItem value="15-30min" className="text-xs">15-30 min</SelectItem>
                                      <SelectItem value="30+min" className="text-xs">30+ min</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <p className="text-xs text-muted-foreground mb-2">
                            No meal contexts configured for this day
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Click &quot;Add&quot; to create contexts or &quot;Load from Profile&quot; to use your defaults
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Nutrient Timing */}
                    {selectedDayConfig.isWorkoutDay && (
                      <div className="space-y-2 mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <Label className="text-xs font-medium text-blue-700 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Nutrient Timing
                        </Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`pre-${selectedDay}`}
                              checked={selectedDayConfig.preWorkoutMeal}
                              onCheckedChange={(checked) => 
                                updateDayConfig(selectedDay, { preWorkoutMeal: Boolean(checked) })
                              }
                            />
                            <Label htmlFor={`pre-${selectedDay}`} className="text-xs">
                              Pre-workout meal/snack
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`post-${selectedDay}`}
                              checked={selectedDayConfig.postWorkoutMeal}
                              onCheckedChange={(checked) => 
                                updateDayConfig(selectedDay, { postWorkoutMeal: Boolean(checked) })
                              }
                            />
                            <Label htmlFor={`post-${selectedDay}`} className="text-xs">
                              Post-workout recovery meal
                            </Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Energy Availability Warning */}
                {selectedDayConfig.energyAvailability < 30 && (
                  <div className={cn(
                    "p-3 rounded-lg border",
                    selectedDayConfig.energyAvailability < 25 
                      ? "bg-red-50 border-red-200" 
                      : "bg-yellow-50 border-yellow-200"
                  )}>
                    <div className="flex items-start gap-2">
                      <Zap className={cn(
                        "h-4 w-4 mt-0.5",
                        selectedDayConfig.energyAvailability < 25 ? "text-red-600" : "text-yellow-600"
                      )} />
                      <div className="text-sm">
                        <p className={cn(
                          "font-medium",
                          selectedDayConfig.energyAvailability < 25 ? "text-red-700" : "text-yellow-700"
                        )}>
                          {selectedDayConfig.energyAvailability < 25 
                            ? 'Low Energy Availability Warning'
                            : 'Moderate Energy Availability'
                          }
                        </p>
                        <p className={cn(
                          "text-xs",
                          selectedDayConfig.energyAvailability < 25 ? "text-red-600" : "text-yellow-600"
                        )}>
                          EA = {selectedDayConfig.energyAvailability.toFixed(1)} kcal/kg FFM. 
                          {selectedDayConfig.energyAvailability < 25 
                            ? ' Consider increasing intake or reducing deficit.'
                            : ' Monitor for signs of fatigue.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Weekly Summary Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Weekly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-20">Day</TableHead>
                      <TableHead className="text-center w-20">Type</TableHead>
                      <TableHead className="text-center">Wake</TableHead>
                      <TableHead className="text-center">Meals</TableHead>
                      <TableHead className="text-center">Calories</TableHead>
                      <TableHead className="text-center">Protein</TableHead>
                      <TableHead className="text-center w-12">EA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DAYS.map(day => {
                      const config = fullDayConfigs[day];
                      const hasCustom = Object.keys(dayConfigs[day] || {}).length > 0;
                      
                      return (
                        <TableRow 
                          key={day}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50 transition-colors",
                            selectedDay === day && "bg-[#c19962]/10"
                          )}
                          onClick={() => setSelectedDay(day)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              {day.substring(0, 3)}
                              {hasCustom && <span className="w-1.5 h-1.5 rounded-full bg-[#c19962]" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {config?.isWorkoutDay ? (
                              <Badge variant="default" className="bg-green-600 text-[10px]">
                                <Dumbbell className="h-2.5 w-2.5 mr-0.5" />
                                {config.workouts[0]?.type?.split(' ')[0]}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Rest</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono">{config?.wakeTime}</TableCell>
                          <TableCell className="text-center text-xs">{config?.mealCount}M + {config?.snackCount}S</TableCell>
                          <TableCell className="text-center font-mono text-sm">{config?.calories?.toLocaleString()}</TableCell>
                          <TableCell className="text-center font-mono text-sm">{config?.protein}g</TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px]",
                                (config?.energyAvailability || 0) >= 30 ? "border-green-300 text-green-700 bg-green-50" :
                                (config?.energyAvailability || 0) >= 25 ? "border-yellow-300 text-yellow-700 bg-yellow-50" :
                                "border-red-300 text-red-700 bg-red-50"
                              )}
                            >
                              {config?.energyAvailability?.toFixed(0)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Footer - Two-step flow: Confirm then Generate */}
      <Card className={cn(
        "border-2 transition-all",
        targetsConfirmed 
          ? "border-green-500/50 bg-green-50/30" 
          : "border-amber-500/50 bg-amber-50/30"
      )}>
        <CardContent className="py-5 px-6">
          {!targetsConfirmed ? (
            /* STEP 1: Confirm Targets - Prominent CTA */
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-100 shrink-0">
                  <Target className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-amber-800">Confirm Your Nutrition Targets</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Review the targets above, then confirm to enable meal plan generation.
                    {weeklyAverages && (
                      <span className="font-medium"> Weekly total: {weeklyAverages.weeklyTotalCals.toLocaleString()} kcal</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  size="lg"
                  onClick={handleConfirmTargets}
                  className="flex-1 h-12 text-base font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Confirm Nutrition Targets
                </Button>
                <Button 
                  size="lg"
                  onClick={onNavigateToMealPlan}
                  variant="outline"
                  className="h-12 opacity-50"
                  disabled
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Meal Plan
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            /* STEP 2: Confirmed - Now can generate */
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-green-100 shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-800">Targets Confirmed</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Ready to generate your personalized meal plan.
                    {weeklyAverages && (
                      <span className="font-medium"> Weekly: {weeklyAverages.weeklyTotalCals.toLocaleString()} kcal • {Math.round(weeklyAverages.avgProtein)}g protein/day</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={handleConfirmTargets}
                  className="h-12"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Targets
                </Button>
                <Button 
                  size="lg"
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      handleConfirmTargets();
                    }
                    onNavigateToMealPlan();
                  }}
                  className="flex-1 h-12 text-base font-semibold bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d] shadow-lg shadow-[#c19962]/30"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Meal Plan
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Copy Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-[#c19962]" />
              Copy {copySourceDay}&apos;s Settings
            </DialogTitle>
            <DialogDescription>
              Select which days to copy the schedule and meal settings to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <Label className="text-sm font-medium">Copy to:</Label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS.filter(d => d !== copySourceDay).map(day => {
                const config = fullDayConfigs[day];
                const isSelected = copyTargetDays.includes(day);
                
                return (
                  <div
                    key={day}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                      isSelected ? "border-[#c19962] bg-[#c19962]/10" : "hover:border-muted-foreground/50"
                    )}
                    onClick={() => {
                      setCopyTargetDays(prev => 
                        isSelected 
                          ? prev.filter(d => d !== day)
                          : [...prev, day]
                      );
                    }}
                  >
                    <Checkbox checked={isSelected} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{day}</p>
                      <p className="text-xs text-muted-foreground">
                        {config?.isWorkoutDay ? config.workouts[0]?.type : 'Rest'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCopyTargetDays(DAYS.filter(d => d !== copySourceDay))}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Select only same type days
                  const sourceConfig = fullDayConfigs[copySourceDay!];
                  const sameDays = DAYS.filter(d => {
                    const config = fullDayConfigs[d];
                    return d !== copySourceDay && config?.isWorkoutDay === sourceConfig?.isWorkoutDay;
                  });
                  setCopyTargetDays(sameDays);
                }}
              >
                Same Type
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCopyTargetDays([])}
              >
                Clear
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCopyToOtherDays}
              disabled={copyTargetDays.length === 0}
              className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
            >
              <Check className="h-4 w-4 mr-2" />
              Copy to {copyTargetDays.length} Day{copyTargetDays.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
