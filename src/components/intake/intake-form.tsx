'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Check, Loader2, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormBlockConfig, FormBlockId, CustomField } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────

interface IntakeFormProps {
  token: string;
  initialData: {
    clientId: string;
    name: string;
    email: string;
    userProfile: Record<string, unknown>;
    dietPreferences: Record<string, unknown>;
    weeklySchedule: Record<string, unknown>;
  };
  formConfig?: FormBlockConfig[];
  stripeEnabled?: boolean;
  onCheckout?: () => void;
  welcomeTitle?: string;
  successTitle?: string;
  successMessage?: string;
  formId?: string;
}

interface FormState {
  name: string;
  gender: 'Male' | 'Female';
  age: string;
  dateOfBirth: string;
  useDOB: boolean;
  heightFt: string;
  heightIn: string;
  weightLbs: string;
  bodyFatSource: 'estimate' | 'measured';
  bodyFatPercent: string;
  wakeTime: string;
  bedTime: string;
  workType: string;
  workStartTime: string;
  workEndTime: string;
  activityLevel: string;
  workoutsPerWeek: number;
  defaultWorkoutType: string;
  defaultDuration: number;
  defaultIntensity: string;
  defaultTimeSlot: string;
  mealsPerDay: number;
  snacksPerDay: number;
  fastingProtocol: string;
  feedingWindowStart: string;
  feedingWindowEnd: string;
  energyDistribution: string;
  includePreWorkoutSnack: boolean;
  preWorkoutPreference: string;
  includePostWorkoutMeal: boolean;
  postWorkoutPreference: string;
  supplements: string[];
  customSupplement: string;
  dietaryRestrictions: string[];
  allergies: string[];
  preferredProteins: string[];
  preferredCarbs: string[];
  preferredFats: string[];
  cuisinePreferences: string[];
  foodsToEmphasize: string;
  foodsToAvoid: string;
  varietyLevel: number;
  cookingTime: string;
  budgetPreference: string;
  spiceLevel: number;
  flavorProfiles: string[];
  healthGoals: string;
  performanceGoals: string;
  additionalNotes: string;
  addresses: { label: string; street: string; city: string; state: string; zipCode: string }[];
  // Team Standard fields
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  unitSystem: 'imperial' | 'metric';
  heightCm: string;
  weightKg: string;
  goalType: 'fat_loss' | 'muscle_gain' | 'recomposition';
  goalRate: 'conservative' | 'moderate' | 'aggressive';
  recompBias: 'maintenance' | 'deficit' | 'surplus';
  goalWeight: string;
  goalBodyFatPercent: string;
  goalFatMass: string;
  goalFFM: string;
  useMeasuredRMR: boolean;
  measuredRMR: string;
  weeklyActivity: ActivityBout[][];
}

interface ActivityBout {
  type: string;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  timeOfDay?: string;
}

// ── Block ID to default label mapping ──────────────────────────────────────

const BLOCK_LABELS: Record<FormBlockId, string> = {
  personal_info: 'Personal Info',
  body_composition: 'Body Composition',
  lifestyle: 'Lifestyle',
  training: 'Training',
  meals: 'Meals',
  supplements: 'Supplements',
  diet_preferences: 'Diet Preferences',
  cuisine_foods: 'Cuisine & Foods',
  practical_flavor: 'Practical & Flavor',
  goals_notes: 'Goals & Notes',
  team_personal: 'Personal Info',
  team_units: 'Unit Preferences',
  team_body_comp: 'Body Composition',
  team_goals: 'Goals',
  team_rmr: 'Metabolic Rate',
  team_activity: 'Weekly Activity',
  custom_questions: 'Additional Questions',
};

const ALL_BLOCKS: FormBlockConfig[] = [
  { id: 'personal_info', required: true },
  { id: 'body_composition', required: false },
  { id: 'lifestyle', required: true },
  { id: 'training', required: true },
  { id: 'meals', required: true },
  { id: 'supplements', required: false },
  { id: 'diet_preferences', required: false },
  { id: 'cuisine_foods', required: false },
  { id: 'practical_flavor', required: false },
  { id: 'goals_notes', required: false },
];

// ── Constants ──────────────────────────────────────────────────────────────

const ACTIVITY_LEVELS = [
  { value: 'Sedentary (0-5k steps/day)', label: 'Sedentary', desc: 'Desk job, < 5k steps/day' },
  { value: 'Light Active (5-10k steps/day)', label: 'Lightly Active', desc: '5-10k steps/day' },
  { value: 'Active (10-15k steps/day)', label: 'Active', desc: '10-15k steps/day' },
  { value: 'Labor Intensive (>15k steps/day)', label: 'Very Active', desc: '> 15k steps/day, physical job' },
];
const WORKOUT_TYPES = ['Resistance Training', 'Cardio', 'HIIT', 'Yoga/Mobility', 'Sports', 'Mixed'];
const INTENSITIES = ['Low', 'Medium', 'High'];
const TIME_SLOTS = [
  { value: 'early_morning', label: 'Early AM (5-7)' },
  { value: 'morning', label: 'Morning (7-10)' },
  { value: 'midday', label: 'Midday (10-1)' },
  { value: 'afternoon', label: 'Afternoon (1-4)' },
  { value: 'evening', label: 'Evening (4-7)' },
  { value: 'night', label: 'Night (7-10)' },
];
const FASTING_PROTOCOLS = [
  { value: 'none', label: 'No restriction' },
  { value: '14_10', label: '14:10' },
  { value: '16_8', label: '16:8' },
  { value: '18_6', label: '18:6' },
  { value: '20_4', label: '20:4' },
];
const COMMON_SUPPLEMENTS = ['Protein Powder', 'Creatine', 'Multivitamin', 'Fish Oil / Omega-3', 'Vitamin D', 'Magnesium', 'Zinc', 'Pre-Workout', 'BCAAs / EAAs', 'Collagen', 'Probiotics', 'Fiber Supplement', 'Caffeine', 'Ashwagandha', 'Electrolytes'];
const RESTRICTIONS = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo', 'Low-FODMAP', 'Low-Sodium', 'Diabetic-Friendly'];
const ALLERGIES = ['Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Eggs', 'Milk/Dairy', 'Wheat', 'Soy', 'Sesame', 'Mustard'];
const PROTEINS = ['Chicken Breast', 'Ground Turkey', 'Salmon', 'Tuna', 'Shrimp', 'Ground Beef', 'Steak', 'Pork Tenderloin', 'Eggs', 'Egg Whites', 'Tofu', 'Tempeh', 'Greek Yogurt', 'Cottage Cheese', 'Whey Protein', 'Plant Protein', 'Bison', 'Lamb', 'Turkey Breast', 'Cod/White Fish'];
const CARBS = ['White Rice', 'Brown Rice', 'Oats', 'Sweet Potato', 'White Potato', 'Quinoa', 'Whole Wheat Bread', 'Sourdough', 'Pasta', 'Whole Wheat Pasta', 'Fruit', 'Beans/Lentils', 'Tortillas', 'Bagels', 'Cream of Rice', 'Couscous'];
const FATS = ['Olive Oil', 'Avocado', 'Butter', 'Coconut Oil', 'Nuts', 'Nut Butter', 'Cheese', 'Cream Cheese', 'Ghee', 'Seeds (chia, flax, hemp)', 'Dark Chocolate', 'Whole Eggs', 'Fatty Fish', 'MCT Oil'];
const CUISINES = ['American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Vietnamese', 'Indian', 'Mediterranean', 'Greek', 'Middle Eastern', 'Korean', 'French', 'Spanish', 'Brazilian', 'Caribbean'];
const FLAVORS = ['Savory/Umami', 'Sweet', 'Spicy/Hot', 'Tangy/Citrus', 'Smoky', 'Herbal/Fresh', 'Garlicky', 'Earthy', 'Creamy', 'Rich/Buttery'];

// ── Helpers ────────────────────────────────────────────────────────────────

function initFormState(data: IntakeFormProps['initialData']): FormState {
  const up = data.userProfile as Record<string, unknown>;
  const dp = data.dietPreferences as Record<string, unknown>;
  const ws = data.weeklySchedule as Record<string, unknown>;
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const firstDay = DAYS.reduce<Record<string, unknown> | null>((found, d) => found || (ws[d] as Record<string, unknown> | null), null) || {};

  return {
    name: data.name || '',
    gender: (up.gender as 'Male' | 'Female') || 'Male',
    age: String(up.age || ''),
    dateOfBirth: (up.dateOfBirth as string) || '',
    useDOB: !!(up.dateOfBirth),
    heightFt: String(up.heightFt || ''),
    heightIn: String(up.heightIn ?? ''),
    weightLbs: String(up.weightLbs || ''),
    bodyFatSource: 'estimate',
    bodyFatPercent: String(up.bodyFatPercentage || ''),
    wakeTime: (firstDay.wakeTime as string) || '7:00 AM',
    bedTime: (firstDay.sleepTime as string) || '10:00 PM',
    workType: (firstDay.workStartTime ? 'office' : 'none'),
    workStartTime: (firstDay.workStartTime as string) || '9:00 AM',
    workEndTime: (firstDay.workEndTime as string) || '5:00 PM',
    activityLevel: (up.activityLevel as string) || 'Active (10-15k steps/day)',
    workoutsPerWeek: (up.workoutsPerWeek as number) || 3,
    defaultWorkoutType: ((up.workoutDefaults as Record<string, unknown>)?.type as string) || 'Resistance Training',
    defaultDuration: ((up.workoutDefaults as Record<string, unknown>)?.duration as number) || 60,
    defaultIntensity: ((up.workoutDefaults as Record<string, unknown>)?.intensity as string) || 'Medium',
    defaultTimeSlot: ((up.workoutDefaults as Record<string, unknown>)?.timeSlot as string) || 'evening',
    mealsPerDay: (firstDay.mealCount as number) || 3,
    snacksPerDay: (firstDay.snackCount as number) || 2,
    fastingProtocol: (dp.fastingProtocol as string) || 'none',
    feedingWindowStart: (dp.feedingWindowStart as string) || '8:00 AM',
    feedingWindowEnd: (dp.feedingWindowEnd as string) || '8:00 PM',
    energyDistribution: (dp.energyDistribution as string) || 'steady',
    includePreWorkoutSnack: (dp.includePreWorkoutSnack as boolean) ?? true,
    preWorkoutPreference: (dp.preWorkoutPreference as string) || 'light_snack',
    includePostWorkoutMeal: (dp.includePostWorkoutMeal as boolean) ?? true,
    postWorkoutPreference: (dp.postWorkoutPreference as string) || 'full_meal',
    supplements: Array.isArray(up.supplements)
      ? (up.supplements as Array<string | { name: string }>).map(s => typeof s === 'string' ? s : s.name)
      : [],
    customSupplement: '',
    dietaryRestrictions: (dp.dietaryRestrictions as string[]) || [],
    allergies: (dp.allergies as string[]) || [],
    preferredProteins: (dp.preferredProteins as string[]) || [],
    preferredCarbs: (dp.preferredCarbs as string[]) || [],
    preferredFats: (dp.preferredFats as string[]) || [],
    cuisinePreferences: (dp.cuisinePreferences as string[]) || [],
    foodsToEmphasize: ((dp.foodsToEmphasize as string[]) || []).join(', '),
    foodsToAvoid: ((dp.foodsToAvoid as string[]) || []).join(', '),
    varietyLevel: (dp.varietyLevel as number) || 3,
    cookingTime: (dp.cookingTimePreference as string) || 'medium',
    budgetPreference: (dp.budgetPreference as string) || 'moderate',
    spiceLevel: (dp.spiceLevel as number) || 2,
    flavorProfiles: (dp.flavorProfiles as string[]) || [],
    healthGoals: (up.healthGoals as string) || '',
    performanceGoals: (up.performanceGoals as string) || '',
    additionalNotes: (up.additionalNotes as string) || '',
    addresses: (up.addresses as FormState['addresses']) || [],
    // Team Standard
    firstName: (up.firstName as string) || (data.name || '').split(' ')[0] || '',
    middleName: (up.middleName as string) || '',
    lastName: (up.lastName as string) || (data.name || '').split(' ').slice(1).join(' ') || '',
    email: data.email || '',
    phone: (up.phone as string) || '',
    unitSystem: (up.unitSystem as 'imperial' | 'metric') || 'imperial',
    heightCm: String(up.heightCm || ''),
    weightKg: String(up.weightKg || ''),
    goalType: (up.goalType as 'fat_loss' | 'muscle_gain' | 'recomposition') || 'fat_loss',
    goalRate: (up.goalRate as 'conservative' | 'moderate' | 'aggressive') || 'moderate',
    recompBias: (up.recompBias as 'maintenance' | 'deficit' | 'surplus') || 'maintenance',
    goalWeight: String(up.goalWeight || ''),
    goalBodyFatPercent: String(up.goalBodyFatPercent || ''),
    goalFatMass: String(up.goalFatMass || ''),
    goalFFM: String(up.goalFFM || ''),
    useMeasuredRMR: !!((up.metabolicAssessment as Record<string, unknown>)?.useMeasuredRMR),
    measuredRMR: String((up.metabolicAssessment as Record<string, unknown>)?.measuredRMR || ''),
    weeklyActivity: (up.weeklyActivity as ActivityBout[][]) || Array.from({ length: 7 }, () => []),
  };
}

const RATE_PRESETS = {
  fat_loss: { conservative: 0.3, moderate: 0.5, aggressive: 0.75 },
  muscle_gain: { conservative: 0.15, moderate: 0.25, aggressive: 0.35 },
  recomposition: { maintenance: 0, deficit: 0.15, surplus: 0.15 },
};

function getRateValue(goalType: string, goalRate: string, recompBias: string): number {
  if (goalType === 'recomposition') {
    return RATE_PRESETS.recomposition[recompBias as keyof typeof RATE_PRESETS.recomposition] ?? 0;
  }
  const rates = RATE_PRESETS[goalType as keyof typeof RATE_PRESETS];
  if (!rates) return 0.5;
  return (rates as Record<string, number>)[goalRate] ?? 0.5;
}

function computeGoalPayload(f: FormState) {
  const isMetric = f.unitSystem === 'metric';
  const curWt = isMetric ? (parseFloat(f.weightKg) || 0) : (parseFloat(f.weightLbs) || 0);
  const curBf = parseFloat(f.bodyFatPercent) || 0;
  const userFM = parseFloat(f.goalFatMass) || 0;
  const userFFM = parseFloat(f.goalFFM) || 0;

  if (userFM > 0 || userFFM > 0) {
    const fm = userFM > 0 ? userFM : curWt * (curBf / 100);
    const ffm = userFFM > 0 ? userFFM : curWt * (1 - curBf / 100);
    const wt = fm + ffm;
    const bf = wt > 0 ? (fm / wt) * 100 : 0;
    return { goalWeight: wt, goalBodyFatPercent: bf, goalFatMass: fm, goalFFM: ffm };
  }

  if (curWt <= 0 || curBf <= 0) {
    return { goalWeight: parseFloat(f.goalWeight) || undefined, goalBodyFatPercent: parseFloat(f.goalBodyFatPercent) || undefined, goalFatMass: undefined, goalFFM: undefined };
  }

  const rate = getRateValue(f.goalType, f.goalRate, f.recompBias);
  const wkly = (rate / 100) * curWt;
  const total = wkly * 12;
  const curFM = curWt * (curBf / 100);
  const curFFM = curWt - curFM;

  let pFM: number, pFFM: number;
  if (f.goalType === 'fat_loss') {
    const loss = total; pFM = Math.max(0, curFM - loss + loss * 0.1); pFFM = Math.max(0, curFFM - loss * 0.1);
  } else if (f.goalType === 'muscle_gain') {
    pFFM = curFFM + total * 0.6; pFM = curFM + total * 0.4;
  } else {
    pFM = Math.max(0, curFM - curWt * 0.003 * 12);
    pFFM = curFFM + curWt * 0.001 * 12;
  }
  const pWt = pFM + pFFM;
  const pBf = pWt > 0 ? (pFM / pWt) * 100 : 0;
  return { goalWeight: pWt, goalBodyFatPercent: pBf, goalFatMass: pFM, goalFFM: pFFM };
}

function formToPayload(f: FormState) {
  const age = f.useDOB && f.dateOfBirth
    ? Math.floor((Date.now() - new Date(f.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : parseInt(f.age) || 30;
  const heightFt = parseInt(f.heightFt) || 5;
  const heightIn = parseInt(f.heightIn) || 10;
  const weightLbs = parseFloat(f.weightLbs) || 170;
  const heightCm = Math.round((heightFt * 12 + heightIn) * 2.54);
  const weightKg = Math.round(weightLbs / 2.205 * 10) / 10;

  // Team Standard: use the split name fields if they're populated, else fall back to the single name field
  const resolvedName = f.firstName ? [f.firstName, f.middleName, f.lastName].filter(Boolean).join(' ') : f.name;

  // Team Standard: unit-aware weight/height
  const teamHeightCm = f.unitSystem === 'metric' && f.heightCm ? parseFloat(f.heightCm) : heightCm;
  const teamWeightKg = f.unitSystem === 'metric' && f.weightKg ? parseFloat(f.weightKg) : weightKg;
  const teamWeightLbs = f.unitSystem === 'metric' && f.weightKg ? parseFloat(f.weightKg) * 2.205 : weightLbs;

  return {
    name: resolvedName,
    email: f.email || undefined,
    userProfile: {
      name: resolvedName, firstName: f.firstName, middleName: f.middleName, lastName: f.lastName,
      gender: f.gender, age,
      dateOfBirth: f.useDOB ? f.dateOfBirth : undefined,
      phone: f.phone || undefined,
      unitSystem: f.unitSystem,
      heightFt, heightIn, heightCm: Math.round(teamHeightCm), weightLbs: Math.round(teamWeightLbs * 10) / 10, weightKg: Math.round(teamWeightKg * 10) / 10,
      bodyFatPercentage: parseFloat(f.bodyFatPercent) || 20,
      bodyFatSource: f.bodyFatSource,
      goalType: f.goalType,
      goalRate: f.goalRate,
      recompBias: f.goalType === 'recomposition' ? f.recompBias : undefined,
      rateOfChange: getRateValue(f.goalType, f.goalRate, f.recompBias),
      ...computeGoalPayload(f),
      activityLevel: f.activityLevel,
      workoutsPerWeek: f.weeklyActivity.filter(d => d.length > 0).length || f.workoutsPerWeek,
      workoutDefaults: { type: f.defaultWorkoutType, duration: f.defaultDuration, intensity: f.defaultIntensity, timeSlot: f.defaultTimeSlot },
      metabolicAssessment: (() => {
        const ma: Record<string, unknown> = {};
        if (f.useMeasuredRMR) {
          ma.useMeasuredRMR = true;
          ma.measuredRMR = parseInt(f.measuredRMR) || undefined;
        }
        const bfVal = parseFloat(f.bodyFatPercent) || 0;
        if (bfVal > 0) {
          const isMeasuredBF = f.bodyFatSource === 'measured';
          ma.useMeasuredBF = isMeasuredBF;
          if (isMeasuredBF) {
            ma.measuredBFPercent = bfVal;
          } else {
            ma.estimatedBFPercent = bfVal;
          }
        }
        return Object.keys(ma).length > 0 ? ma : undefined;
      })(),
      weeklyActivity: f.weeklyActivity,
      healthGoals: f.healthGoals, performanceGoals: f.performanceGoals, additionalNotes: f.additionalNotes,
      addresses: f.addresses,
      supplements: f.supplements.map(name => ({ name, timing: ['as_needed'] as string[] })),
    },
    dietPreferences: {
      dietaryRestrictions: f.dietaryRestrictions, allergies: f.allergies, customAllergies: [],
      preferredProteins: f.preferredProteins, preferredCarbs: f.preferredCarbs, preferredFats: f.preferredFats, preferredVegetables: [],
      cuisinePreferences: f.cuisinePreferences,
      foodsToAvoid: f.foodsToAvoid.split(',').map(s => s.trim()).filter(Boolean),
      foodsToEmphasize: f.foodsToEmphasize.split(',').map(s => s.trim()).filter(Boolean),
      fastingProtocol: f.fastingProtocol, feedingWindowStart: f.feedingWindowStart, feedingWindowEnd: f.feedingWindowEnd,
      energyDistribution: f.energyDistribution,
      includePreWorkoutSnack: f.includePreWorkoutSnack, preWorkoutPreference: f.preWorkoutPreference,
      includePostWorkoutMeal: f.includePostWorkoutMeal, postWorkoutPreference: f.postWorkoutPreference,
      cookingTimePreference: f.cookingTime, budgetPreference: f.budgetPreference,
      spiceLevel: f.spiceLevel, flavorProfiles: f.flavorProfiles, varietyLevel: f.varietyLevel,
    },
    weeklySchedule: (() => {
      // Map weeklyActivity (Sun=0..Sat=6) to named days for the schedule
      const DAY_MAP: [string, number][] = [
        ['Monday', 1], ['Tuesday', 2], ['Wednesday', 3], ['Thursday', 4],
        ['Friday', 5], ['Saturday', 6], ['Sunday', 0],
      ];
      const TIME_SLOT_MAP: Record<string, string> = {
        early_am: 'early_morning', morning: 'morning', midday: 'midday',
        afternoon: 'afternoon', evening: 'evening', night: 'night',
      };
      const INTENSITY_MAP: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };

      const s: Record<string, unknown> = {};
      DAY_MAP.forEach(([dayName, dayIdx]) => {
        const bouts = f.weeklyActivity[dayIdx] || [];
        const workouts = bouts.map(b => ({
          enabled: true,
          type: b.type || 'Resistance Training',
          timeSlot: TIME_SLOT_MAP[b.timeOfDay || 'morning'] || 'morning',
          duration: b.duration || 60,
          intensity: INTENSITY_MAP[b.intensity] || 'Medium',
        }));
        s[dayName] = {
          wakeTime: f.wakeTime, sleepTime: f.bedTime,
          workStartTime: f.workType !== 'none' ? f.workStartTime : undefined,
          workEndTime: f.workType !== 'none' ? f.workEndTime : undefined,
          workouts,
          mealCount: f.mealsPerDay, snackCount: f.snacksPerDay, mealContexts: [],
        };
      });
      return s;
    })(),
  };
}

// ── Shared UI Atoms ────────────────────────────────────────────────────────

function ChipSelect({ options, selected, onToggle, columns = 3 }: { options: string[]; selected: string[]; onToggle: (v: string) => void; columns?: number }) {
  return (
    <div className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : columns === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3')}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onToggle(opt)}
          className={cn('px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left',
            selected.includes(opt) ? 'bg-[#c19962] border-[#c19962] text-[#00263d]' : 'bg-white border-gray-200 text-gray-700 hover:border-[#c19962]/50'
          )}>{opt}</button>
      ))}
    </div>
  );
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}{optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', inputMode, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; inputMode?: 'numeric' | 'decimal' | 'email' | 'tel'; className?: string;
}) {
  return (
    <input type={type} inputMode={inputMode} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={cn('w-full h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#c19962] focus:border-transparent', className)} />
  );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-12 px-4 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962] focus:border-transparent appearance-none">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SliderInput({ value, onChange, min, max, step = 1, labels }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; labels?: string[];
}) {
  return (
    <div className="space-y-2">
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#c19962]" />
      {labels && <div className="flex justify-between text-xs text-gray-400">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>}
    </div>
  );
}

function SummarySection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-3 rounded-xl bg-white border border-gray-100">
      <p className="text-xs font-semibold text-[#c19962] uppercase tracking-wide mb-1">{title}</p>
      {items.map((item, i) => <p key={i} className="text-sm text-gray-700">{item}</p>)}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function IntakeForm({ token, initialData, formConfig, stripeEnabled, onCheckout, welcomeTitle, successTitle, successMessage, formId }: IntakeFormProps) {
  const blocks = useMemo(() => formConfig && formConfig.length > 0 ? formConfig : ALL_BLOCKS, [formConfig]);

  // Build the step list: configured blocks + review step
  const steps = useMemo(() => {
    const s = blocks.map(b => ({
      blockId: b.id,
      label: b.label || BLOCK_LABELS[b.id],
      required: b.required,
      description: b.description,
      helpText: b.helpText,
      hiddenFields: b.hiddenFields,
      customFields: b.customFields,
    }));
    s.push({ blockId: 'review' as FormBlockId, label: 'Review & Submit', required: true, description: undefined, helpText: undefined, hiddenFields: undefined, customFields: undefined });
    return s;
  }, [blocks]);

  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<FormState>(() => initFormState(initialData));
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[] | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const set = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleArray = useCallback((field: keyof FormState, value: string) => {
    setForm(prev => {
      const arr = (prev[field] as string[]) || [];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }, []);

  const save = useCallback(async (completed = false) => {
    setSaving(true);
    try {
      await fetch(`/api/intake/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formToPayload(form), customAnswers, completed, formId }),
      });
    } catch { /* silent */ }
    setSaving(false);
  }, [form, token]);

  const goNext = useCallback(async () => {
    const isLastStep = stepIdx === steps.length - 1;
    if (isLastStep) {
      if (stripeEnabled && onCheckout) {
        await save(false);
        onCheckout();
        return;
      }
      await save(true);
      setSubmitted(true);
      return;
    }
    await save(false);
    setStepIdx(s => s + 1);
    scrollRef.current?.scrollTo(0, 0);
  }, [stepIdx, steps.length, save, stripeEnabled, onCheckout]);

  const goBack = useCallback(() => {
    setStepIdx(s => Math.max(0, s - 1));
    scrollRef.current?.scrollTo(0, 0);
  }, []);

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00263d] to-[#001a2b] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="relative w-48 h-14 mx-auto mb-8">
            <Image src="/images/fitomicshorizontalgold.png" alt="Fitomics" fill className="object-contain" priority />
          </div>
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-[#00263d]">{successTitle || 'All Done!'}</h1>
            <p className="text-gray-600 text-sm">{successMessage || 'Your information has been submitted. Your coach will use this to build your personalized plan.'}</p>
            {successMessage && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                <p className="font-medium">Questions?</p>
                <a href="mailto:nutrition@fitomics.org" className="text-[#c19962] hover:underline">nutrition@fitomics.org</a>
              </div>
            )}
          </div>
          <p className="text-white/30 text-xs mt-6">&copy; {new Date().getFullYear()} Fitomics. All rights reserved.</p>
        </div>
      </div>
    );
  }

  const currentStep = steps[stepIdx];
  const isLastStep = stepIdx === steps.length - 1;
  const isOptional = !currentStep.required && !isLastStep;

  // ── Block Renderers ────────────────────────────────────────────────────

  const hidden = new Set(currentStep.hiddenFields || []);
  const show = (key: string) => !hidden.has(key);

  const renderBlock = (blockId: string) => {
    switch (blockId) {
      case 'personal_info': return (
        <div className="space-y-5">
          {show('name') && <div><FieldLabel>Full Name</FieldLabel><TextInput value={form.name} onChange={v => set('name', v)} placeholder="Jane Smith" /></div>}
          {show('gender') && <div><FieldLabel>Gender</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              {(['Male', 'Female'] as const).map(g => (
                <button key={g} type="button" onClick={() => set('gender', g)}
                  className={cn('h-12 rounded-xl border text-sm font-medium transition-all', form.gender === g ? 'bg-[#c19962] border-[#c19962] text-[#00263d]' : 'bg-white border-gray-200 text-gray-700 hover:border-[#c19962]/50')}>{g}</button>
              ))}
            </div>
          </div>}
          {show('age') && <>
            <div className="flex items-center gap-3 mb-2">
              <button type="button" onClick={() => set('useDOB', !form.useDOB)}
                className={cn('relative w-10 h-6 rounded-full transition-colors', form.useDOB ? 'bg-[#c19962]' : 'bg-gray-300')}>
                <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform', form.useDOB && 'translate-x-4')} />
              </button>
              <span className="text-sm text-gray-600">Use date of birth instead of age</span>
            </div>
            {form.useDOB ? (
              <div><FieldLabel>Date of Birth</FieldLabel><TextInput type="date" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} /></div>
            ) : (
              <div><FieldLabel>Age</FieldLabel><TextInput value={form.age} onChange={v => set('age', v)} inputMode="numeric" placeholder="30" /></div>
            )}
          </>}
          {show('height') && <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Height (ft)</FieldLabel><TextInput value={form.heightFt} onChange={v => set('heightFt', v)} inputMode="numeric" placeholder="5" /></div>
            <div><FieldLabel>Height (in)</FieldLabel><TextInput value={form.heightIn} onChange={v => set('heightIn', v)} inputMode="numeric" placeholder="10" /></div>
          </div>}
          {show('weight') && <div><FieldLabel>Weight (lbs)</FieldLabel><TextInput value={form.weightLbs} onChange={v => set('weightLbs', v)} inputMode="decimal" placeholder="170" /></div>}
        </div>
      );

      case 'body_composition': return (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">If you know your body fat percentage, enter it below. Otherwise, provide your best estimate.</p>
          {show('bodyFatSource') && <div><FieldLabel>How was it measured?</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              {([{ v: 'estimate', l: 'Estimate' }, { v: 'measured', l: 'Measured' }] as const).map(o => (
                <button key={o.v} type="button" onClick={() => set('bodyFatSource', o.v as 'estimate' | 'measured')}
                  className={cn('h-12 rounded-xl border text-sm font-medium transition-all', form.bodyFatSource === o.v ? 'bg-[#c19962] border-[#c19962] text-[#00263d]' : 'bg-white border-gray-200 text-gray-700 hover:border-[#c19962]/50')}>{o.l}</button>
              ))}
            </div>
          </div>}
          {show('bodyFatPercent') && <>
            <div><FieldLabel>Body Fat %</FieldLabel><TextInput value={form.bodyFatPercent} onChange={v => set('bodyFatPercent', v)} inputMode="decimal" placeholder="20" /></div>
            <p className="text-xs text-gray-400">Not sure? Men: 15-20% is average. Women: 25-30% is average. Your coach can help refine this.</p>
          </>}
        </div>
      );

      case 'lifestyle': return (
        <div className="space-y-5">
          {show('wakeTime') && <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Wake Time</FieldLabel><TextInput value={form.wakeTime} onChange={v => set('wakeTime', v)} placeholder="7:00 AM" /></div>
            <div><FieldLabel>Bed Time</FieldLabel><TextInput value={form.bedTime} onChange={v => set('bedTime', v)} placeholder="10:00 PM" /></div>
          </div>}
          {show('workType') && <>
            <div><FieldLabel>Work Type</FieldLabel>
              <SelectInput value={form.workType} onChange={v => set('workType', v)}
                options={[{ value: 'office', label: 'Office' }, { value: 'remote', label: 'Remote/WFH' }, { value: 'hybrid', label: 'Hybrid' }, { value: 'shift', label: 'Shift Work' }, { value: 'none', label: 'N/A' }]} />
            </div>
            {form.workType !== 'none' && (
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Work Start</FieldLabel><TextInput value={form.workStartTime} onChange={v => set('workStartTime', v)} placeholder="9:00 AM" /></div>
                <div><FieldLabel>Work End</FieldLabel><TextInput value={form.workEndTime} onChange={v => set('workEndTime', v)} placeholder="5:00 PM" /></div>
              </div>
            )}
          </>}
          {show('activityLevel') && <div><FieldLabel>Daily Activity Level</FieldLabel>
            <div className="space-y-2">
              {ACTIVITY_LEVELS.map(al => (
                <button key={al.value} type="button" onClick={() => set('activityLevel', al.value)}
                  className={cn('w-full p-3 rounded-xl border text-left transition-all', form.activityLevel === al.value ? 'bg-[#c19962]/10 border-[#c19962] ring-1 ring-[#c19962]' : 'bg-white border-gray-200 hover:border-[#c19962]/50')}>
                  <p className="text-sm font-medium text-gray-900">{al.label}</p><p className="text-xs text-gray-500">{al.desc}</p>
                </button>
              ))}
            </div>
          </div>}
        </div>
      );

      case 'training': return (
        <div className="space-y-5">
          {show('workoutsPerWeek') && <div><FieldLabel>Workouts Per Week</FieldLabel>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-[#c19962] w-8 text-center">{form.workoutsPerWeek}</span>
              <SliderInput value={form.workoutsPerWeek} onChange={v => set('workoutsPerWeek', v)} min={0} max={7} labels={['0','1','2','3','4','5','6','7']} />
            </div>
          </div>}
          {show('workoutType') && <div><FieldLabel>Primary Workout Type</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {WORKOUT_TYPES.map(t => (
                <button key={t} type="button" onClick={() => set('defaultWorkoutType', t)}
                  className={cn('px-3 py-2.5 rounded-xl border text-sm font-medium transition-all', form.defaultWorkoutType === t ? 'bg-[#c19962] border-[#c19962] text-[#00263d]' : 'bg-white border-gray-200 text-gray-700 hover:border-[#c19962]/50')}>{t}</button>
              ))}
            </div>
          </div>}
          {show('duration') && <div><FieldLabel>Average Duration (minutes)</FieldLabel>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-[#c19962] w-12 text-center">{form.defaultDuration}</span>
              <SliderInput value={form.defaultDuration} onChange={v => set('defaultDuration', v)} min={15} max={180} step={15} labels={['15','60','120','180']} />
            </div>
          </div>}
          {show('intensity') && <div><FieldLabel>Typical Intensity</FieldLabel>
            <div className="grid grid-cols-3 gap-3">
              {INTENSITIES.map(i => (
                <button key={i} type="button" onClick={() => set('defaultIntensity', i)}
                  className={cn('h-12 rounded-xl border text-sm font-medium transition-all', form.defaultIntensity === i ? 'bg-[#c19962] border-[#c19962] text-[#00263d]' : 'bg-white border-gray-200 text-gray-700 hover:border-[#c19962]/50')}>{i}</button>
              ))}
            </div>
          </div>}
          {show('timeSlot') && <div><FieldLabel>Preferred Time</FieldLabel><SelectInput value={form.defaultTimeSlot} onChange={v => set('defaultTimeSlot', v)} options={TIME_SLOTS} /></div>}
        </div>
      );

      case 'meals': return (
        <div className="space-y-5">
          {show('mealsPerDay') && <div><FieldLabel>Meals Per Day</FieldLabel><div className="flex items-center gap-4"><span className="text-2xl font-bold text-[#c19962] w-8 text-center">{form.mealsPerDay}</span><SliderInput value={form.mealsPerDay} onChange={v => set('mealsPerDay', v)} min={2} max={6} labels={['2','3','4','5','6']} /></div></div>}
          {show('snacksPerDay') && <div><FieldLabel>Snacks Per Day</FieldLabel><div className="flex items-center gap-4"><span className="text-2xl font-bold text-[#c19962] w-8 text-center">{form.snacksPerDay}</span><SliderInput value={form.snacksPerDay} onChange={v => set('snacksPerDay', v)} min={0} max={4} labels={['0','1','2','3','4']} /></div></div>}
          {show('fasting') && <>
            <div><FieldLabel>Time-Restricted Eating</FieldLabel><SelectInput value={form.fastingProtocol} onChange={v => set('fastingProtocol', v)} options={FASTING_PROTOCOLS} /></div>
            {form.fastingProtocol !== 'none' && (
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>First Meal</FieldLabel><TextInput value={form.feedingWindowStart} onChange={v => set('feedingWindowStart', v)} placeholder="8:00 AM" /></div>
                <div><FieldLabel>Last Meal</FieldLabel><TextInput value={form.feedingWindowEnd} onChange={v => set('feedingWindowEnd', v)} placeholder="8:00 PM" /></div>
              </div>
            )}
          </>}
          {show('periWorkout') && <>
            <div><FieldLabel>Pre-Workout Nutrition</FieldLabel>
              <div className="flex items-center gap-3 mb-2">
                <button type="button" onClick={() => set('includePreWorkoutSnack', !form.includePreWorkoutSnack)} className={cn('relative w-10 h-6 rounded-full transition-colors', form.includePreWorkoutSnack ? 'bg-[#c19962]' : 'bg-gray-300')}><span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform', form.includePreWorkoutSnack && 'translate-x-4')} /></button>
                <span className="text-sm text-gray-600">Include pre-workout meal/snack</span>
              </div>
            </div>
            <div><FieldLabel>Post-Workout Nutrition</FieldLabel>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('includePostWorkoutMeal', !form.includePostWorkoutMeal)} className={cn('relative w-10 h-6 rounded-full transition-colors', form.includePostWorkoutMeal ? 'bg-[#c19962]' : 'bg-gray-300')}><span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform', form.includePostWorkoutMeal && 'translate-x-4')} /></button>
                <span className="text-sm text-gray-600">Include post-workout meal</span>
              </div>
            </div>
          </>}
        </div>
      );

      case 'supplements': return (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">Select any supplements you currently take. This is optional.</p>
          {show('supplements') && <ChipSelect options={COMMON_SUPPLEMENTS} selected={form.supplements} onToggle={v => toggleArray('supplements', v)} />}
          {show('customSupplement') && <div><FieldLabel optional>Add Other</FieldLabel>
            <div className="flex gap-2">
              <TextInput value={form.customSupplement} onChange={v => set('customSupplement', v)} placeholder="e.g. Vitamin K2" className="flex-1" />
              <button type="button" disabled={!form.customSupplement.trim()}
                onClick={() => { if (form.customSupplement.trim()) { toggleArray('supplements', form.customSupplement.trim()); set('customSupplement', ''); } }}
                className="h-12 px-4 rounded-xl bg-[#c19962] text-[#00263d] font-medium text-sm disabled:opacity-40">Add</button>
            </div>
          </div>}
        </div>
      );

      case 'diet_preferences': return (
        <div className="space-y-6">
          {show('restrictions') && <div><FieldLabel>Dietary Restrictions</FieldLabel><ChipSelect options={RESTRICTIONS} selected={form.dietaryRestrictions} onToggle={v => toggleArray('dietaryRestrictions', v)} /></div>}
          {show('allergies') && <div><FieldLabel>Food Allergies</FieldLabel><ChipSelect options={ALLERGIES} selected={form.allergies} onToggle={v => toggleArray('allergies', v)} /></div>}
          {show('proteinPrefs') && <div><FieldLabel>Preferred Proteins</FieldLabel><ChipSelect options={PROTEINS} selected={form.preferredProteins} onToggle={v => toggleArray('preferredProteins', v)} columns={2} /></div>}
          {show('carbPrefs') && <div><FieldLabel>Preferred Carbs</FieldLabel><ChipSelect options={CARBS} selected={form.preferredCarbs} onToggle={v => toggleArray('preferredCarbs', v)} columns={2} /></div>}
          {show('fatPrefs') && <div><FieldLabel>Preferred Fats</FieldLabel><ChipSelect options={FATS} selected={form.preferredFats} onToggle={v => toggleArray('preferredFats', v)} columns={2} /></div>}
        </div>
      );

      case 'cuisine_foods': return (
        <div className="space-y-5">
          {show('cuisines') && <div><FieldLabel>Cuisine Styles You Enjoy</FieldLabel><ChipSelect options={CUISINES} selected={form.cuisinePreferences} onToggle={v => toggleArray('cuisinePreferences', v)} /></div>}
          {show('foodsToEmphasize') && <div><FieldLabel optional>Foods to Emphasize</FieldLabel>
            <textarea value={form.foodsToEmphasize} onChange={e => set('foodsToEmphasize', e.target.value)} placeholder="e.g. salmon, avocado, blueberries (comma-separated)" rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]" />
          </div>}
          {show('foodsToAvoid') && <div><FieldLabel optional>Foods to Avoid</FieldLabel>
            <textarea value={form.foodsToAvoid} onChange={e => set('foodsToAvoid', e.target.value)} placeholder="e.g. liver, beets, cilantro (comma-separated)" rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]" />
          </div>}
        </div>
      );

      case 'practical_flavor': return (
        <div className="space-y-5">
          {show('variety') && <div><FieldLabel>Meal Variety</FieldLabel><p className="text-xs text-gray-400 mb-2">How much variety do you want in your meals?</p>
            <div className="flex items-center gap-4"><span className="text-2xl font-bold text-[#c19962] w-8 text-center">{form.varietyLevel}</span><SliderInput value={form.varietyLevel} onChange={v => set('varietyLevel', v)} min={1} max={5} labels={['Repeat','','Moderate','','Max variety']} /></div>
          </div>}
          {show('cookingTime') && <div><FieldLabel>Cooking Time Per Meal</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {[{v:'quick',l:'< 15 min'},{v:'short',l:'15-30 min'},{v:'medium',l:'30-60 min'},{v:'any',l:'No limit'}].map(o => (
                <button key={o.v} type="button" onClick={() => set('cookingTime', o.v)} className={cn('px-3 py-2.5 rounded-xl border text-sm font-medium transition-all', form.cookingTime === o.v ? 'bg-[#c19962] border-[#c19962] text-[#00263d]' : 'bg-white border-gray-200 text-gray-700 hover:border-[#c19962]/50')}>{o.l}</button>
              ))}
            </div>
          </div>}
          {show('budget') && <div><FieldLabel>Budget</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {[{v:'budget',l:'Budget'},{v:'moderate',l:'Moderate'},{v:'flexible',l:'Flexible'}].map(o => (
                <button key={o.v} type="button" onClick={() => set('budgetPreference', o.v)} className={cn('h-12 rounded-xl border text-sm font-medium transition-all', form.budgetPreference === o.v ? 'bg-[#c19962] border-[#c19962] text-[#00263d]' : 'bg-white border-gray-200 text-gray-700 hover:border-[#c19962]/50')}>{o.l}</button>
              ))}
            </div>
          </div>}
          {show('spice') && <div><FieldLabel>Spice Tolerance</FieldLabel><div className="flex items-center gap-4"><span className="text-2xl font-bold text-[#c19962] w-8 text-center">{form.spiceLevel}</span><SliderInput value={form.spiceLevel} onChange={v => set('spiceLevel', v)} min={0} max={4} labels={['None','Mild','Medium','Hot','Fire']} /></div></div>}
          {show('flavors') && <div><FieldLabel>Flavor Profiles You Enjoy</FieldLabel><ChipSelect options={FLAVORS} selected={form.flavorProfiles} onToggle={v => toggleArray('flavorProfiles', v)} columns={2} /></div>}
        </div>
      );

      case 'goals_notes': return (
        <div className="space-y-5">
          {show('healthGoals') && <div><FieldLabel optional>Health Goals</FieldLabel><textarea value={form.healthGoals} onChange={e => set('healthGoals', e.target.value)} placeholder="e.g. Improve energy, reduce inflammation, better sleep..." rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]" /></div>}
          {show('performanceGoals') && <div><FieldLabel optional>Performance Goals</FieldLabel><textarea value={form.performanceGoals} onChange={e => set('performanceGoals', e.target.value)} placeholder="e.g. Increase strength, run a marathon, improve recovery..." rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]" /></div>}
          {show('notes') && <div><FieldLabel optional>Anything Else?</FieldLabel><textarea value={form.additionalNotes} onChange={e => set('additionalNotes', e.target.value)} placeholder="Anything else your coach should know..." rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]" /></div>}
        </div>
      );

      case 'review': {
        const p = formToPayload(form);
        const up = p.userProfile;
        const dp = p.dietPreferences;
        const activeBlockIds = new Set(blocks.map(b => b.id));
        const sections: { title: string; items: string[] }[] = [];

        if (activeBlockIds.has('personal_info')) sections.push({ title: 'Personal', items: [`${up.name}, ${up.gender}, age ${up.age}`, `${up.heightFt}'${up.heightIn}" / ${up.weightLbs} lbs`, `Body fat: ~${up.bodyFatPercentage}%`] });
        if (activeBlockIds.has('lifestyle')) sections.push({ title: 'Lifestyle', items: [`Wake ${form.wakeTime}, Sleep ${form.bedTime}`, `Activity: ${form.activityLevel}`, ...(form.workType !== 'none' ? [`Work: ${form.workType} (${form.workStartTime} – ${form.workEndTime})`] : [])] });
        if (activeBlockIds.has('training')) sections.push({ title: 'Training', items: [`${form.workoutsPerWeek}x/week, ${form.defaultWorkoutType}`, `${form.defaultDuration} min, ${form.defaultIntensity} intensity`] });
        if (activeBlockIds.has('meals')) sections.push({ title: 'Meals', items: [`${form.mealsPerDay} meals + ${form.snacksPerDay} snacks`, form.fastingProtocol !== 'none' ? `Fasting: ${form.fastingProtocol.replace('_', ':')}` : 'No fasting'] });
        if (activeBlockIds.has('supplements') && form.supplements.length > 0) sections.push({ title: 'Supplements', items: [form.supplements.join(', ')] });
        if (activeBlockIds.has('diet_preferences')) {
          const ri: string[] = [];
          if (dp.dietaryRestrictions.length > 0) ri.push(`Diet: ${dp.dietaryRestrictions.join(', ')}`);
          if (dp.allergies.length > 0) ri.push(`Allergies: ${dp.allergies.join(', ')}`);
          if (ri.length > 0) sections.push({ title: 'Restrictions', items: ri });
          const fi: string[] = [];
          if (form.preferredProteins.length > 0) fi.push(`Proteins: ${form.preferredProteins.join(', ')}`);
          if (form.preferredCarbs.length > 0) fi.push(`Carbs: ${form.preferredCarbs.join(', ')}`);
          if (form.preferredFats.length > 0) fi.push(`Fats: ${form.preferredFats.join(', ')}`);
          if (fi.length > 0) sections.push({ title: 'Food Preferences', items: fi });
        }
        if (activeBlockIds.has('cuisine_foods') && dp.cuisinePreferences.length > 0) sections.push({ title: 'Cuisines', items: [dp.cuisinePreferences.join(', ')] });
        if (activeBlockIds.has('practical_flavor')) sections.push({ title: 'Practical & Flavor', items: [`Variety: ${form.varietyLevel}/5`, `Cooking: ${form.cookingTime}`, `Budget: ${form.budgetPreference}`, `Spice: ${form.spiceLevel}/4`] });
        if (activeBlockIds.has('goals_notes')) {
          const gi: string[] = [];
          if (form.healthGoals) gi.push(`Health: ${form.healthGoals}`);
          if (form.performanceGoals) gi.push(`Performance: ${form.performanceGoals}`);
          if (form.additionalNotes) gi.push(`Notes: ${form.additionalNotes}`);
          if (gi.length > 0) sections.push({ title: 'Goals & Notes', items: gi });
        }

        // Team Standard review sections
        if (activeBlockIds.has('team_personal')) {
          const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');
          sections.push({ title: 'Personal', items: [fullName, form.gender, form.email, form.phone, form.useDOB ? `DOB: ${form.dateOfBirth}` : `Age: ${form.age}`].filter(Boolean) });
        }
        if (activeBlockIds.has('team_units')) sections.push({ title: 'Units', items: [form.unitSystem === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lbs, ft/in)'] });
        if (activeBlockIds.has('team_body_comp')) {
          const isM = form.unitSystem === 'metric';
          const wt = isM ? form.weightKg : form.weightLbs;
          const ht = isM ? `${form.heightCm} cm` : `${form.heightFt}'${form.heightIn}"`;
          sections.push({ title: 'Body Composition', items: [`Height: ${ht}`, `Weight: ${wt} ${isM ? 'kg' : 'lbs'}`, `Body Fat: ${form.bodyFatPercent}%`] });
        }
        if (activeBlockIds.has('team_goals')) {
          const goalLabel = form.goalType === 'fat_loss' ? 'Fat Loss' : form.goalType === 'muscle_gain' ? 'Muscle Gain' : 'Recomposition';
          const isM = form.unitSystem === 'metric';
          const wu = isM ? 'kg' : 'lbs';
          const rateLabel = form.goalType === 'recomposition'
            ? (form.recompBias === 'deficit' ? 'Fat loss lean' : form.recompBias === 'surplus' ? 'Muscle lean' : 'Steady recomp')
            : `${form.goalRate.charAt(0).toUpperCase() + form.goalRate.slice(1)}`;
          const rateNum = getRateValue(form.goalType, form.goalRate, form.recompBias);
          const goalItems = [`Goal: ${goalLabel} (${rateLabel}, ${rateNum}% BW/wk)`];
          // Compute projected targets for review
          const curWt = isM ? (parseFloat(form.weightKg) || 0) : (parseFloat(form.weightLbs) || 0);
          const curBf = parseFloat(form.bodyFatPercent) || 0;
          if (curWt > 0 && curBf > 0) {
            const curFM = curWt * (curBf / 100);
            const curFFM = curWt - curFM;
            const userFM = parseFloat(form.goalFatMass) || 0;
            const userFFM = parseFloat(form.goalFFM) || 0;
            const wkly = (rateNum / 100) * curWt;
            const totalChange = wkly * 8;
            let pFM: number, pFFM: number;
            if (userFM > 0 || userFFM > 0) {
              pFM = userFM > 0 ? userFM : curFM;
              pFFM = userFFM > 0 ? userFFM : curFFM;
            } else if (form.goalType === 'fat_loss') {
              const loss = totalChange; pFM = curFM - loss + loss * 0.1; pFFM = curFFM - loss * 0.1;
            } else if (form.goalType === 'muscle_gain') {
              pFFM = curFFM + totalChange * 0.6; pFM = curFM + totalChange * 0.4;
            } else { pFM = curFM; pFFM = curFFM; }
            const pWt = pFM + pFFM;
            const pBf = pWt > 0 ? (pFM / pWt) * 100 : 0;
            goalItems.push(`Projected: ${pWt.toFixed(1)} ${wu} at ${pBf.toFixed(1)}% BF`);
            goalItems.push(`Fat Mass: ${curFM.toFixed(1)} → ${pFM.toFixed(1)} ${wu}`);
            goalItems.push(`Lean Mass: ${curFFM.toFixed(1)} → ${pFFM.toFixed(1)} ${wu}`);
          }
          sections.push({ title: 'Goals', items: goalItems });
        }
        if (activeBlockIds.has('team_rmr')) {
          sections.push({ title: 'Metabolic Rate', items: [form.useMeasuredRMR ? `Measured: ${form.measuredRMR} kcal/day` : 'Using estimated RMR'] });
        }
        if (activeBlockIds.has('team_activity')) {
          const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const actItems = form.weeklyActivity.map((bouts, i) => bouts.length > 0 ? `${DAYS_SHORT[i]}: ${bouts.map(b => `${b.type} (${b.duration}m, ${b.intensity}${b.timeOfDay ? ', ' + b.timeOfDay : ''})`).join(', ')}` : null).filter(Boolean) as string[];
          if (actItems.length > 0) sections.push({ title: 'Weekly Activity', items: actItems });
          else sections.push({ title: 'Weekly Activity', items: ['No activity scheduled'] });
        }

        // Custom question answers
        const allCustomFields = blocks.flatMap(b => b.customFields || []);
        if (allCustomFields.length > 0) {
          const cItems: string[] = [];
          for (const cf of allCustomFields) {
            const ans = customAnswers[cf.id];
            if (ans == null || ans === '' || (Array.isArray(ans) && ans.length === 0)) continue;
            const display = typeof ans === 'boolean' ? (ans ? 'Yes' : 'No')
              : Array.isArray(ans) ? ans.join(', ')
              : String(ans);
            cItems.push(`${cf.label}: ${display}`);
          }
          if (cItems.length > 0) sections.push({ title: 'Additional Info', items: cItems });
        }

        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Review your entries below, then {stripeEnabled ? 'proceed to payment' : 'submit'}.</p>
            {sections.map(s => <SummarySection key={s.title} title={s.title} items={s.items} />)}
          </div>
        );
      }

      // ── Team Standard Blocks ─────────────────────────────────────────────

      case 'team_personal': return (
        <div className="space-y-5">
          {(show('firstName') || show('lastName')) && <div className="grid grid-cols-2 gap-3">
            {show('firstName') && <div className="col-span-2 sm:col-span-1"><FieldLabel>First Name *</FieldLabel><TextInput value={form.firstName} onChange={v => set('firstName', v)} placeholder="Jane" /></div>}
            {show('lastName') && <div className="col-span-2 sm:col-span-1"><FieldLabel>Last Name *</FieldLabel><TextInput value={form.lastName} onChange={v => set('lastName', v)} placeholder="Smith" /></div>}
          </div>}
          {show('middleName') && <div><FieldLabel optional>Middle Name</FieldLabel><TextInput value={form.middleName} onChange={v => set('middleName', v)} placeholder="Marie" /></div>}
          {show('email') && <div><FieldLabel>Email *</FieldLabel><TextInput value={form.email} onChange={v => set('email', v)} type="email" inputMode="email" placeholder="jane@example.com" /></div>}
          {show('phone') && <div><FieldLabel>Phone *</FieldLabel><TextInput value={form.phone} onChange={v => set('phone', v)} type="tel" inputMode="tel" placeholder="(555) 123-4567" /></div>}
          {show('gender') && <div><FieldLabel>Gender</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              {(['Male', 'Female'] as const).map(g => (
                <button key={g} type="button" onClick={() => set('gender', g)}
                  className={cn('h-12 rounded-xl border text-sm font-medium transition-all', form.gender === g ? 'bg-[#c19962] border-[#c19962] text-[#00263d]' : 'bg-white border-gray-200 text-gray-700 hover:border-[#c19962]/50')}>{g}</button>
              ))}
            </div>
          </div>}
          {show('ageDOB') && <>
            <div className="flex items-center gap-3 mb-2">
              <button type="button" onClick={() => set('useDOB', !form.useDOB)}
                className={cn('relative w-10 h-6 rounded-full transition-colors', form.useDOB ? 'bg-[#c19962]' : 'bg-gray-300')}>
                <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform', form.useDOB && 'translate-x-4')} />
              </button>
              <span className="text-sm text-gray-600">Use date of birth instead of age</span>
            </div>
            {form.useDOB ? (
              <div><FieldLabel>Date of Birth</FieldLabel><TextInput type="date" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} /></div>
            ) : (
              <div><FieldLabel>Age</FieldLabel><TextInput value={form.age} onChange={v => set('age', v)} inputMode="numeric" placeholder="30" /></div>
            )}
          </>}
        </div>
      );

      case 'team_units': {
        return (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">Choose your preferred unit system. All measurements on the following steps will use these units.</p>
            <div className="grid grid-cols-2 gap-3">
              {([{ v: 'imperial', l: 'Imperial', d: 'lbs, ft/in' }, { v: 'metric', l: 'Metric', d: 'kg, cm' }] as const).map(o => (
                <button key={o.v} type="button" onClick={() => set('unitSystem', o.v)}
                  className={cn('p-4 rounded-xl border text-center transition-all', form.unitSystem === o.v ? 'bg-[#c19962] border-[#c19962] text-[#00263d] ring-2 ring-[#c19962]' : 'bg-white border-gray-200 text-gray-700 hover:border-[#c19962]/50')}>
                  <p className="text-lg font-bold">{o.l}</p><p className="text-xs opacity-70">{o.d}</p>
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'team_body_comp': {
        const isMetric = form.unitSystem === 'metric';
        const weightNum = isMetric ? parseFloat(form.weightKg) || 0 : parseFloat(form.weightLbs) || 0;
        const weightKg = isMetric ? weightNum : weightNum / 2.205;
        const bfPct = parseFloat(form.bodyFatPercent) || 0;
        const fatMass = bfPct > 0 && weightKg > 0 ? weightKg * (bfPct / 100) : 0;
        const ffm = weightKg > 0 && fatMass >= 0 ? weightKg - fatMass : 0;
        const displayFM = isMetric ? fatMass : fatMass * 2.205;
        const displayFFM = isMetric ? ffm : ffm * 2.205;
        const wUnit = isMetric ? 'kg' : 'lbs';

        return (
          <div className="space-y-5">
            {show('height') && (isMetric ? (
              <div><FieldLabel>Height (cm)</FieldLabel><TextInput value={form.heightCm} onChange={v => set('heightCm', v)} inputMode="numeric" placeholder="178" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Height (ft)</FieldLabel><TextInput value={form.heightFt} onChange={v => set('heightFt', v)} inputMode="numeric" placeholder="5" /></div>
                <div><FieldLabel>Height (in)</FieldLabel><TextInput value={form.heightIn} onChange={v => set('heightIn', v)} inputMode="numeric" placeholder="10" /></div>
              </div>
            ))}
            {show('weight') && (isMetric ? (
              <div><FieldLabel>Current Weight (kg)</FieldLabel><TextInput value={form.weightKg} onChange={v => set('weightKg', v)} inputMode="decimal" placeholder="77" /></div>
            ) : (
              <div><FieldLabel>Current Weight (lbs)</FieldLabel><TextInput value={form.weightLbs} onChange={v => set('weightLbs', v)} inputMode="decimal" placeholder="170" /></div>
            ))}
            {show('bodyFat') && <div><FieldLabel>Current Body Fat %</FieldLabel><TextInput value={form.bodyFatPercent} onChange={v => set('bodyFatPercent', v)} inputMode="decimal" placeholder="20" /></div>}
            {(show('fatMass') || show('fatFreeMass')) && bfPct > 0 && weightNum > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {show('fatMass') && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-center">
                  <p className="text-xs text-red-600 font-medium">Fat Mass</p>
                  <p className="text-lg font-bold text-red-700">{displayFM.toFixed(1)} {wUnit}</p>
                </div>}
                {show('fatFreeMass') && <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
                  <p className="text-xs text-blue-600 font-medium">Fat-Free Mass</p>
                  <p className="text-lg font-bold text-blue-700">{displayFFM.toFixed(1)} {wUnit}</p>
                </div>}
              </div>
            )}
            <p className="text-xs text-gray-400">Not sure of your body fat %? Men: 15-20% is average. Women: 25-30% is average.</p>
          </div>
        );
      }

      case 'team_goals': {
        const isMetric = form.unitSystem === 'metric';
        const wUnit = isMetric ? 'kg' : 'lbs';
        const currentWt = isMetric ? (parseFloat(form.weightKg) || 0) : (parseFloat(form.weightLbs) || 0);
        const currentWtKg = isMetric ? currentWt : currentWt / 2.205;
        const currentBf = parseFloat(form.bodyFatPercent) || 0;
        const currentFMkg = currentBf > 0 && currentWtKg > 0 ? currentWtKg * (currentBf / 100) : 0;
        const currentFFMkg = currentBf > 0 && currentWtKg > 0 ? currentWtKg * (1 - currentBf / 100) : 0;
        const currentFM = isMetric ? currentFMkg : currentFMkg * 2.205;
        const currentFFM = isMetric ? currentFFMkg : currentFFMkg * 2.205;
        const hasBodyComp = currentWt > 0 && currentBf > 0;

        // Rate presets per goal type
        const ratePercent = getRateValue(form.goalType, form.goalRate, form.recompBias);
        const weeklyChangeLbs = (ratePercent / 100) * currentWt;
        const phaseWeeks = 12;

        // Projection: compute 12-week targets from rate
        const computeProjection = () => {
          if (!hasBodyComp) return { wt: 0, bf: 0, fm: 0, ffm: 0 };
          const gt = form.goalType;
          const totalWeightChange = weeklyChangeLbs * phaseWeeks;

          if (gt === 'fat_loss') {
            const fatLoss = totalWeightChange;
            const muscleLoss = fatLoss * 0.1; // ~10% of loss from lean mass when training
            const projFM = Math.max(0, currentFM - fatLoss + muscleLoss);
            const projFFM = Math.max(0, currentFFM - muscleLoss);
            const projWt = projFM + projFFM;
            const projBf = projWt > 0 ? (projFM / projWt) * 100 : 0;
            return { wt: projWt, bf: projBf, fm: projFM, ffm: projFFM };
          }
          if (gt === 'muscle_gain') {
            const totalGain = totalWeightChange;
            const muscleGain = totalGain * 0.6; // ~60% lean at moderate surplus
            const fatGain = totalGain * 0.4;
            const projFFM = currentFFM + muscleGain;
            const projFM = currentFM + fatGain;
            const projWt = projFM + projFFM;
            const projBf = projWt > 0 ? (projFM / projWt) * 100 : 0;
            return { wt: projWt, bf: projBf, fm: projFM, ffm: projFFM };
          }
          // Recomposition
          const bias = form.recompBias;
          const fatLoss = bias === 'deficit' ? weeklyChangeLbs * phaseWeeks : (bias === 'maintenance' ? currentWt * 0.003 * phaseWeeks : 0);
          const muscleGain = bias === 'surplus' ? weeklyChangeLbs * phaseWeeks * 0.5 : (bias === 'maintenance' ? currentWt * 0.001 * phaseWeeks : currentWt * 0.0005 * phaseWeeks);
          const projFM = Math.max(0, currentFM - fatLoss);
          const projFFM = currentFFM + muscleGain;
          const projWt = projFM + projFFM;
          const projBf = projWt > 0 ? (projFM / projWt) * 100 : 0;
          return { wt: projWt, bf: projBf, fm: projFM, ffm: projFFM };
        };

        const proj = computeProjection();

        // When rate changes, auto-update the goal fields from projections (unless user overrode)
        const userOverrideFM = parseFloat(form.goalFatMass) || 0;
        const userOverrideFFM = parseFloat(form.goalFFM) || 0;
        const effectiveFM = userOverrideFM > 0 ? userOverrideFM : proj.fm;
        const effectiveFFM = userOverrideFFM > 0 ? userOverrideFFM : proj.ffm;
        const effectiveWt = effectiveFM + effectiveFFM;
        const effectiveBf = effectiveWt > 0 ? (effectiveFM / effectiveWt) * 100 : 0;

        // Change deltas
        const fatChange = currentFM - effectiveFM;
        const muscleChange = effectiveFFM - currentFFM;

        // Feasibility warnings
        const warnings: string[] = [];
        if (effectiveBf > 0 && effectiveBf < 5) warnings.push('Body fat below 5% is not recommended for health.');
        if (fatChange > 0 && fatChange / phaseWeeks > (isMetric ? 0.75 : 1.5)) {
          warnings.push(`This projects ~${(fatChange / phaseWeeks).toFixed(1)} ${wUnit}/week of fat loss — this is aggressive. Our team will review for feasibility.`);
        }
        if (muscleChange > 0 && muscleChange / phaseWeeks > (isMetric ? 0.15 : 0.3)) {
          warnings.push(`Projected lean mass gain of ~${(muscleChange / phaseWeeks).toFixed(2)} ${wUnit}/week is ambitious. We'll tailor your plan accordingly.`);
        }

        // Rate UI presets
        type RateOption = { key: string; label: string; desc: string; color: string; recommended?: boolean };
        const fatLossRates: RateOption[] = [
          { key: 'conservative', label: 'Conservative', desc: '~0.3% BW/wk · Best for muscle retention', color: 'green' },
          { key: 'moderate', label: 'Moderate', desc: '~0.5% BW/wk · Optimal balance', color: 'blue', recommended: true },
          { key: 'aggressive', label: 'Aggressive', desc: '~0.75% BW/wk · Faster but harder', color: 'orange' },
        ];
        const muscleGainRates: RateOption[] = [
          { key: 'conservative', label: 'Conservative', desc: '~0.15% BW/wk · Minimal fat gain', color: 'green' },
          { key: 'moderate', label: 'Moderate', desc: '~0.25% BW/wk · Lean bulk', color: 'blue', recommended: true },
          { key: 'aggressive', label: 'Aggressive', desc: '~0.35% BW/wk · Maximum growth', color: 'purple' },
        ];
        type BiasOption = { key: string; label: string; desc: string; color: string; recommended?: boolean };
        const recompBiases: BiasOption[] = [
          { key: 'maintenance', label: 'Steady Recomp', desc: 'Eat at maintenance · Gradual shift', color: 'green', recommended: true },
          { key: 'deficit', label: 'Fat Loss Lean', desc: 'Small deficit · Prioritize fat loss', color: 'blue' },
          { key: 'surplus', label: 'Muscle Lean', desc: 'Small surplus · Prioritize muscle', color: 'purple' },
        ];

        const rateColorClasses: Record<string, { active: string; text: string }> = {
          green: { active: 'border-green-500 bg-green-50', text: 'text-green-700' },
          blue: { active: 'border-blue-500 bg-blue-50', text: 'text-blue-700' },
          orange: { active: 'border-orange-500 bg-orange-50', text: 'text-orange-700' },
          purple: { active: 'border-purple-500 bg-purple-50', text: 'text-purple-700' },
        };

        return (
          <div className="space-y-5">
            {show('goalType') && <div><FieldLabel>Goal</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {([{ v: 'fat_loss', l: 'Fat Loss' }, { v: 'muscle_gain', l: 'Muscle Gain' }, { v: 'recomposition', l: 'Recomp' }] as const).map(o => (
                  <button key={o.v} type="button" onClick={() => { set('goalType', o.v); set('goalRate', 'moderate'); set('goalFatMass', ''); set('goalFFM', ''); }}
                    className={cn('py-3 rounded-xl border text-sm font-medium transition-all', form.goalType === o.v ? 'bg-[#c19962] border-[#c19962] text-[#00263d]' : 'bg-white border-gray-200 text-gray-700 hover:border-[#c19962]/50')}>{o.l}</button>
                ))}
              </div>
            </div>}

            {/* Rate selector */}
            {form.goalType !== 'recomposition' ? (
              <div className="space-y-2">
                <FieldLabel>Approach</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {(form.goalType === 'fat_loss' ? fatLossRates : muscleGainRates).map(opt => {
                    const isActive = form.goalRate === opt.key;
                    const colors = rateColorClasses[opt.color];
                    return (
                      <button key={opt.key} type="button"
                        onClick={() => { set('goalRate', opt.key as 'conservative' | 'moderate' | 'aggressive'); set('goalFatMass', ''); set('goalFFM', ''); }}
                        className={cn('p-3 rounded-xl border-2 text-center transition-all relative',
                          isActive ? colors.active : 'border-gray-200 bg-white hover:border-gray-300')}>
                        {opt.recommended && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">Recommended</span>}
                        <p className={cn('text-sm font-semibold', isActive ? colors.text : 'text-gray-700')}>{opt.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <FieldLabel>Approach</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {recompBiases.map(opt => {
                    const isActive = form.recompBias === opt.key;
                    const colors = rateColorClasses[opt.color];
                    return (
                      <button key={opt.key} type="button"
                        onClick={() => { set('recompBias', opt.key as 'maintenance' | 'deficit' | 'surplus'); set('goalFatMass', ''); set('goalFFM', ''); }}
                        className={cn('p-3 rounded-xl border-2 text-center transition-all relative',
                          isActive ? colors.active : 'border-gray-200 bg-white hover:border-gray-300')}>
                        {opt.recommended && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-green-600 text-white px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">Recommended</span>}
                        <p className={cn('text-sm font-semibold', isActive ? colors.text : 'text-gray-700')}>{opt.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Current Measurements Reference */}
            {hasBodyComp && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-600">Your Current Measurements</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-gray-100">
                  <div className="p-3 text-center">
                    <p className="text-[10px] text-gray-400 font-medium">Weight</p>
                    <p className="text-sm font-bold text-gray-800">{currentWt.toFixed(0)} {wUnit}</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-[10px] text-gray-400 font-medium">Body Fat</p>
                    <p className="text-sm font-bold text-gray-800">{currentBf.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-[10px] text-red-400 font-medium">Fat Mass</p>
                    <p className="text-sm font-bold text-red-600">{currentFM.toFixed(1)} {wUnit}</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-[10px] text-blue-400 font-medium">Lean Mass</p>
                    <p className="text-sm font-bold text-blue-600">{currentFFM.toFixed(1)} {wUnit}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 12-Week Projection */}
            {hasBodyComp && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 bg-[#00263d]/5 border-b border-gray-200">
                  <p className="text-xs font-semibold text-[#00263d]">12-Week Projection</p>
                  <p className="text-[10px] text-gray-500">Based on your current stats and selected approach</p>
                </div>
                <div className="grid grid-cols-4 text-center text-[10px] font-medium text-gray-400 bg-gray-50 py-1.5 border-b border-gray-100">
                  <span></span><span>Now</span><span>Projected</span><span>Change</span>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="grid grid-cols-4 text-center py-2 text-sm">
                    <span className="text-xs text-gray-500 self-center">Weight</span>
                    <span className="font-medium text-gray-700">{currentWt.toFixed(0)}</span>
                    <span className="font-medium text-gray-900">{effectiveWt.toFixed(1)}</span>
                    <span className={cn('text-xs font-medium', effectiveWt < currentWt ? 'text-red-500' : effectiveWt > currentWt ? 'text-green-600' : 'text-gray-400')}>
                      {effectiveWt !== currentWt ? `${effectiveWt > currentWt ? '+' : ''}${(effectiveWt - currentWt).toFixed(1)}` : '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 text-center py-2 text-sm">
                    <span className="text-xs text-gray-500 self-center">Body Fat</span>
                    <span className="font-medium text-gray-700">{currentBf.toFixed(1)}%</span>
                    <span className="font-medium text-gray-900">{effectiveBf.toFixed(1)}%</span>
                    <span className={cn('text-xs font-medium', effectiveBf < currentBf ? 'text-green-600' : effectiveBf > currentBf ? 'text-orange-500' : 'text-gray-400')}>
                      {Math.abs(effectiveBf - currentBf) > 0.1 ? `${effectiveBf > currentBf ? '+' : ''}${(effectiveBf - currentBf).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 text-center py-2 text-sm">
                    <span className="text-xs text-red-400 self-center">Fat Mass</span>
                    <span className="font-medium text-gray-700">{currentFM.toFixed(1)}</span>
                    <span className="font-medium text-red-600">{effectiveFM.toFixed(1)}</span>
                    <span className={cn('text-xs font-medium', fatChange > 0 ? 'text-green-600' : fatChange < 0 ? 'text-red-500' : 'text-gray-400')}>
                      {Math.abs(fatChange) > 0.1 ? `${fatChange > 0 ? '-' : '+'}${Math.abs(fatChange).toFixed(1)}` : '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 text-center py-2 text-sm">
                    <span className="text-xs text-blue-400 self-center">Lean Mass</span>
                    <span className="font-medium text-gray-700">{currentFFM.toFixed(1)}</span>
                    <span className="font-medium text-blue-600">{effectiveFFM.toFixed(1)}</span>
                    <span className={cn('text-xs font-medium', muscleChange > 0 ? 'text-green-600' : muscleChange < 0 ? 'text-red-500' : 'text-gray-400')}>
                      {Math.abs(muscleChange) > 0.1 ? `${muscleChange > 0 ? '+' : ''}${muscleChange.toFixed(1)}` : '—'}
                    </span>
                  </div>
                </div>
                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 text-center">
                    ~{weeklyChangeLbs.toFixed(1)} {wUnit}/week · Values are projections — your Fitomics plan will be personalized
                  </p>
                </div>
              </div>
            )}

            {/* Override targets */}
            {hasBodyComp && (show('goalFM') || show('goalFFM')) && (
              <div className="space-y-3">
                <button type="button" onClick={() => {
                  if (form.goalFatMass || form.goalFFM) {
                    set('goalFatMass', ''); set('goalFFM', '');
                  } else {
                    set('goalFatMass', proj.fm > 0 ? proj.fm.toFixed(1) : '');
                    set('goalFFM', proj.ffm > 0 ? proj.ffm.toFixed(1) : '');
                  }
                }} className={cn(
                  'w-full py-3 px-4 rounded-xl border-2 border-dashed text-sm font-semibold transition-all text-center',
                  (form.goalFatMass || form.goalFFM)
                    ? 'border-gray-300 text-gray-500 hover:border-gray-400 bg-gray-50'
                    : 'border-[#c19962] text-[#c19962] hover:bg-[#c19962]/5 bg-[#c19962]/[0.03]'
                )}>
                  {(form.goalFatMass || form.goalFFM) ? 'Reset to projected values' : 'SET CUSTOM TARGETS HERE'}
                </button>
                {(form.goalFatMass || form.goalFFM) ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Target Fat Mass ({wUnit})</FieldLabel>
                      <TextInput value={form.goalFatMass} onChange={v => {
                        set('goalFatMass', v);
                        const fmVal = parseFloat(v) || 0;
                        if (fmVal > 0 && parseFloat(form.goalFFM) > 0) {
                          const newWt = fmVal + parseFloat(form.goalFFM);
                          set('goalWeight', newWt.toFixed(1));
                          set('goalBodyFatPercent', ((fmVal / newWt) * 100).toFixed(1));
                        }
                      }} inputMode="decimal" />
                    </div>
                    <div>
                      <FieldLabel>Target Lean Mass ({wUnit})</FieldLabel>
                      <TextInput value={form.goalFFM} onChange={v => {
                        set('goalFFM', v);
                        const ffmVal = parseFloat(v) || 0;
                        if (ffmVal > 0 && parseFloat(form.goalFatMass) > 0) {
                          const newWt = parseFloat(form.goalFatMass) + ffmVal;
                          set('goalWeight', newWt.toFixed(1));
                          set('goalBodyFatPercent', ((parseFloat(form.goalFatMass) / newWt) * 100).toFixed(1));
                        }
                      }} inputMode="decimal" />
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-600 bg-amber-50 border border-amber-100 p-2.5 rounded-lg">{w}</p>
            ))}
          </div>
        );
      }

      case 'team_rmr': {
        const isMetric = form.unitSystem === 'metric';
        const weightKg = isMetric ? (parseFloat(form.weightKg) || 77) : ((parseFloat(form.weightLbs) || 170) / 2.205);
        const heightCm = isMetric ? (parseFloat(form.heightCm) || 178) : ((parseInt(form.heightFt) || 5) * 12 + (parseInt(form.heightIn) || 10)) * 2.54;
        const ageNum = form.useDOB && form.dateOfBirth
          ? Math.floor((Date.now() - new Date(form.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : parseInt(form.age) || 30;
        const isMale = form.gender === 'Male';
        const estimatedRMR = Math.round(isMale
          ? 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5
          : 10 * weightKg + 6.25 * heightCm - 5 * ageNum - 161);

        return (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">Your Resting Metabolic Rate (RMR) is the energy your body needs at rest. If you have a measured value from a metabolic test, enter it below.</p>
            {show('rmrToggle') && <div className="flex items-center gap-3 mb-2">
              <button type="button" onClick={() => set('useMeasuredRMR', !form.useMeasuredRMR)}
                className={cn('relative w-10 h-6 rounded-full transition-colors', form.useMeasuredRMR ? 'bg-[#c19962]' : 'bg-gray-300')}>
                <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform', form.useMeasuredRMR && 'translate-x-4')} />
              </button>
              <span className="text-sm text-gray-600">I have a measured RMR</span>
            </div>}
            {form.useMeasuredRMR && show('measuredRMR') ? (
              <div><FieldLabel>Measured RMR (kcal/day)</FieldLabel><TextInput value={form.measuredRMR} onChange={v => set('measuredRMR', v)} inputMode="numeric" placeholder="1800" /></div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Estimated RMR (Mifflin-St Jeor)</p>
                <p className="text-2xl font-bold text-[#c19962]">{estimatedRMR} <span className="text-sm font-normal text-gray-500">kcal/day</span></p>
                <p className="text-xs text-gray-400 mt-1">Based on your height, weight, age, and gender.</p>
              </div>
            )}
          </div>
        );
      }

      case 'team_activity': {
        const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const ACTIVITY_TYPES = ['Resistance Training', 'Sport Practice', 'Conditioning', 'Cardio', 'Yoga/Mobility', 'Other'];
        const TIME_OPTIONS = [
          { value: 'early_am', label: 'Early AM (5-7)' },
          { value: 'morning', label: 'Morning (7-10)' },
          { value: 'midday', label: 'Midday (10-1)' },
          { value: 'afternoon', label: 'Afternoon (1-4)' },
          { value: 'evening', label: 'Evening (4-7)' },
          { value: 'night', label: 'Night (7+)' },
        ];
        const INTENSITY_INFO: Record<string, string> = {
          low: 'Conversational pace. Could maintain for a long time. RPE 3-4/10.',
          medium: 'Moderate effort. Breathing harder but sustainable. RPE 5-7/10.',
          high: 'Hard effort. Difficult to talk. Near max output. RPE 8-10/10.',
        };

        const addBout = (dayIdx: number) => {
          setForm(prev => {
            const wa = prev.weeklyActivity.map((d, i) => i === dayIdx ? [...d, { type: 'Resistance Training', duration: 60, intensity: 'medium' as const, timeOfDay: 'morning' }] : d);
            return { ...prev, weeklyActivity: wa };
          });
        };
        const removeBout = (dayIdx: number, boutIdx: number) => {
          setForm(prev => {
            const wa = prev.weeklyActivity.map((d, i) => i === dayIdx ? d.filter((_, bi) => bi !== boutIdx) : d);
            return { ...prev, weeklyActivity: wa };
          });
        };
        const updateBout = (dayIdx: number, boutIdx: number, field: keyof ActivityBout, value: string | number) => {
          setForm(prev => {
            const wa = prev.weeklyActivity.map((d, i) => i === dayIdx ? d.map((b, bi) => bi === boutIdx ? { ...b, [field]: value } : b) : d);
            return { ...prev, weeklyActivity: wa };
          });
        };

        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Add your typical weekly activity. You can add up to 3 sessions per day. This information is critical for accurately estimating your daily energy needs.</p>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-medium text-blue-700">About Duration &amp; Intensity</p>
              <p className="text-[11px] text-blue-600"><strong>Duration</strong> = time you are <em>actively working</em> (not including warm-up, rest between sets where you&apos;re standing around, or cool-down). If your gym session is 75 min but you&apos;re actively training for ~50 min, enter 50.</p>
              <p className="text-[11px] text-blue-600"><strong>Intensity</strong> reflects your average perceived effort across the session:</p>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {(['low', 'medium', 'high'] as const).map(lvl => (
                  <div key={lvl} className="bg-white rounded-lg p-2 border border-blue-100">
                    <p className="text-[10px] font-bold text-gray-700 uppercase">{lvl}</p>
                    <p className="text-[10px] text-gray-500">{INTENSITY_INFO[lvl]}</p>
                  </div>
                ))}
              </div>
            </div>

            {DAYS_SHORT.map((day, dayIdx) => {
              const bouts = form.weeklyActivity[dayIdx];
              return (
                <div key={day} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">{day}</span>
                      {bouts.length > 0 && <span className="text-[10px] text-gray-400">{bouts.length} session{bouts.length > 1 ? 's' : ''}</span>}
                    </div>
                    {bouts.length < 3 && (
                      <button type="button" onClick={() => addBout(dayIdx)} className="text-xs text-[#c19962] font-medium hover:text-[#a8833e]">+ Add Session</button>
                    )}
                  </div>
                  {bouts.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-gray-400 text-center">Rest day</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {bouts.map((bout, bIdx) => (
                        <div key={bIdx} className="px-3 py-2.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <select value={bout.type} onChange={e => updateBout(dayIdx, bIdx, 'type', e.target.value)}
                              className="flex-1 h-9 px-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#c19962]">
                              {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select value={bout.timeOfDay || 'morning'} onChange={e => updateBout(dayIdx, bIdx, 'timeOfDay', e.target.value)}
                              className="w-32 h-9 px-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#c19962]">
                              {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <button type="button" onClick={() => removeBout(dayIdx, bIdx)} className="text-gray-400 hover:text-red-500 text-xs flex-shrink-0">✕</button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-gray-500 font-medium">Active Duration (min)</span>
                              <input type="text" inputMode="numeric" value={bout.duration || ''} onChange={e => updateBout(dayIdx, bIdx, 'duration', parseInt(e.target.value) || 0)}
                                className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#c19962]"
                                placeholder="e.g. 45" />
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-500 font-medium">Avg. Intensity</span>
                              <div className="flex gap-1">
                                {(['low', 'medium', 'high'] as const).map(lvl => (
                                  <button key={lvl} type="button" onClick={() => updateBout(dayIdx, bIdx, 'intensity', lvl)}
                                    title={INTENSITY_INFO[lvl]}
                                    className={cn('flex-1 h-8 rounded-lg text-[10px] font-medium border transition-colors',
                                      bout.intensity === lvl ? 'bg-[#c19962] border-[#c19962] text-[#00263d]' : 'bg-white border-gray-200 text-gray-500 hover:border-[#c19962]/50')}>
                                    {lvl[0].toUpperCase() + lvl.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      case 'custom_questions': return renderCustomFields(currentStep.customFields || []);

      default: return null;
    }
  };

  function renderCustomFields(fields: CustomField[]) {
    if (fields.length === 0) return null;
    return (
      <div className="space-y-5">
        {fields.map(field => {
          const val = customAnswers[field.id];
          switch (field.type) {
            case 'text':
              return (
                <div key={field.id}>
                  <FieldLabel optional={!field.required}>{field.label}</FieldLabel>
                  <TextInput
                    value={(val as string) || ''}
                    onChange={v => setCustomAnswers(prev => ({ ...prev, [field.id]: v }))}
                    placeholder={field.placeholder || ''} />
                </div>
              );
            case 'textarea':
              return (
                <div key={field.id}>
                  <FieldLabel optional={!field.required}>{field.label}</FieldLabel>
                  <textarea
                    value={(val as string) || ''}
                    onChange={e => setCustomAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.placeholder || ''}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]" />
                </div>
              );
            case 'number':
              return (
                <div key={field.id}>
                  <FieldLabel optional={!field.required}>{field.label}</FieldLabel>
                  <TextInput
                    value={(val as string) || ''}
                    onChange={v => setCustomAnswers(prev => ({ ...prev, [field.id]: v }))}
                    inputMode="decimal"
                    placeholder={field.placeholder || ''} />
                </div>
              );
            case 'date':
              return (
                <div key={field.id}>
                  <FieldLabel optional={!field.required}>{field.label}</FieldLabel>
                  <TextInput
                    type="date"
                    value={(val as string) || ''}
                    onChange={v => setCustomAnswers(prev => ({ ...prev, [field.id]: v }))} />
                </div>
              );
            case 'select':
              return (
                <div key={field.id}>
                  <FieldLabel optional={!field.required}>{field.label}</FieldLabel>
                  <SelectInput
                    value={(val as string) || ''}
                    onChange={v => setCustomAnswers(prev => ({ ...prev, [field.id]: v }))}
                    options={(field.options || []).map(o => ({ value: o, label: o }))} />
                </div>
              );
            case 'multiselect':
              return (
                <div key={field.id}>
                  <FieldLabel optional={!field.required}>{field.label}</FieldLabel>
                  <ChipSelect
                    options={field.options || []}
                    selected={(val as string[]) || []}
                    onToggle={v => {
                      setCustomAnswers(prev => {
                        const arr = (prev[field.id] as string[]) || [];
                        return { ...prev, [field.id]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] };
                      });
                    }} />
                </div>
              );
            case 'toggle':
              return (
                <div key={field.id} className="flex items-center gap-3">
                  <button type="button"
                    onClick={() => setCustomAnswers(prev => ({ ...prev, [field.id]: !prev[field.id] }))}
                    className={cn('relative w-10 h-6 rounded-full transition-colors', val ? 'bg-[#c19962]' : 'bg-gray-300')}>
                    <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform', val && 'translate-x-4')} />
                  </button>
                  <span className="text-sm text-gray-700">{field.label}</span>
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    );
  }

  const renderBlockWithCustomFields = (blockId: string) => {
    const blockContent = renderBlock(blockId);
    const customFields = currentStep.customFields;
    if (!customFields || customFields.length === 0 || blockId === 'custom_questions') {
      return blockContent;
    }
    return (
      <>
        {blockContent}
        <div className="mt-6 pt-6 border-t border-gray-200">
          {renderCustomFields(customFields)}
        </div>
      </>
    );
  };

  return (
    <div ref={scrollRef} className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-[#00263d] px-4 py-3 safe-area-top shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-24 h-8 flex-shrink-0">
              <Image src="/images/fitomicshorizontalgold.png" alt="Fitomics" fill className="object-contain object-left" priority />
            </div>
            <span className="text-xs font-medium text-white/70 hidden sm:inline">{welcomeTitle || 'Nutrition Intake'}</span>
          </div>
          <div className="text-xs text-white/50">
            {saving ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving...</span> : 'Auto-saved'}
          </div>
        </div>
        <div className="max-w-lg mx-auto mt-2">
          <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
            <span>Step {stepIdx + 1} of {steps.length}</span><span className="text-[#c19962]/80">{currentStep.label}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#c19962] rounded-full transition-all duration-300" style={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{currentStep.label}</h2>
          {currentStep.description && (
            <p className="text-sm text-gray-500 mt-1 mb-2">{currentStep.description}</p>
          )}
          <div className="mt-4">{renderBlockWithCustomFields(currentStep.blockId)}</div>
          {currentStep.helpText && (
            <div className="mt-5 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-700">{currentStep.helpText}</p>
            </div>
          )}
        </div>
      </main>

      <footer className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {stepIdx > 0 && (
            <button type="button" onClick={goBack} className="h-12 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm flex items-center gap-1 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          <div className="flex-1" />
          {isOptional && (
            <button type="button" onClick={() => { setStepIdx(s => s + 1); scrollRef.current?.scrollTo(0, 0); }}
              className="h-12 px-4 rounded-xl text-gray-400 font-medium text-sm flex items-center gap-1 hover:text-gray-600 transition-colors">
              Skip <SkipForward className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={goNext} disabled={saving}
            className={cn('h-12 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50',
              isLastStep ? (stripeEnabled ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white') : 'bg-[#c19962] hover:bg-[#a8833e] text-[#00263d]'
            )}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLastStep ? (stripeEnabled ? <>Proceed to Payment <ChevronRight className="h-4 w-4" /></> : <>Submit <Check className="h-4 w-4" /></>) : <>Next <ChevronRight className="h-4 w-4" /></>}
          </button>
        </div>
      </footer>
    </div>
  );
}
