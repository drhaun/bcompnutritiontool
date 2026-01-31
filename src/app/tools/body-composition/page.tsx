'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, 
  TrendingDown, 
  TrendingUp,
  Activity,
  Flame,
  Scale,
  Calculator,
  ArrowRight,
  Info,
  Zap,
  Dumbbell,
  Heart,
  Clock,
  Calendar,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Table,
  LineChart,
  Settings2,
  ShieldAlert,
  RefreshCcw,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// =============================================================================
// EVIDENCE-BASED CONSTANTS AND MODELS
// =============================================================================

/**
 * RATE OF CHANGE PRESETS
 * Evidence-based rates with associated tradeoffs
 * Reference: Helms et al. (2014), Garthe et al. (2011), Mero et al. (2010)
 */
const RATE_PRESETS = {
  fat_loss: {
    conservative: { 
      rate: 0.5, 
      label: 'Conservative (0.5%/wk)', 
      description: 'Maximum muscle retention, sustainable',
      ffmLossRatio: 0.10, // 10% of weight loss from FFM
      adherence: 'High',
      hormonal: 'Minimal impact',
    },
    moderate: { 
      rate: 0.75, 
      label: 'Moderate (0.75%/wk)', 
      description: 'Good balance of speed and retention',
      ffmLossRatio: 0.15,
      adherence: 'Moderate-High',
      hormonal: 'Mild impact',
    },
    aggressive: { 
      rate: 1.0, 
      label: 'Aggressive (1.0%/wk)', 
      description: 'Faster results, more muscle loss risk',
      ffmLossRatio: 0.25,
      adherence: 'Moderate',
      hormonal: 'Moderate impact',
    },
    very_aggressive: { 
      rate: 1.25, 
      label: 'Very Aggressive (1.25%/wk)', 
      description: 'Contest prep, significant tradeoffs',
      ffmLossRatio: 0.35,
      adherence: 'Low',
      hormonal: 'Significant impact',
    },
  },
  muscle_gain: {
    slow: { 
      rate: 0.25, 
      label: 'Slow (0.25%/wk)', 
      description: 'Minimal fat gain, advanced trainees',
      fatGainRatio: 0.30, // 30% of weight gain from fat
      timeToResults: 'Slow but lean',
    },
    moderate: { 
      rate: 0.5, 
      label: 'Moderate (0.5%/wk)', 
      description: 'Good muscle:fat ratio for intermediates',
      fatGainRatio: 0.45,
      timeToResults: 'Balanced',
    },
    aggressive: { 
      rate: 0.75, 
      label: 'Aggressive (0.75%/wk)', 
      description: 'Faster gains, more fat accumulation',
      fatGainRatio: 0.55,
      timeToResults: 'Faster',
    },
    very_aggressive: { 
      rate: 1.0, 
      label: 'Very Aggressive (1.0%/wk)', 
      description: 'Beginner gains, or off-season bulking',
      fatGainRatio: 0.65,
      timeToResults: 'Fastest',
    },
  },
};

/**
 * RECOMPOSITION EXPECTATIONS
 * Evidence-based rates for simultaneous fat loss and muscle gain
 * Reference: Barakat et al. (2020), Ribeiro et al. (2022)
 */
const RECOMP_EXPECTATIONS = {
  untrained: {
    label: 'Untrained (<1 yr)',
    monthlyFatLoss: 1.5, // lbs/month
    monthlyMuscleGain: 1.5, // lbs/month
    probability: 'High',
    notes: 'Newbie gains make recomp highly effective',
  },
  novice: {
    label: 'Novice (1-2 yrs)',
    monthlyFatLoss: 1.0,
    monthlyMuscleGain: 0.75,
    probability: 'Moderate-High',
    notes: 'Still can achieve meaningful recomp',
  },
  intermediate: {
    label: 'Intermediate (2-4 yrs)',
    monthlyFatLoss: 0.75,
    monthlyMuscleGain: 0.5,
    probability: 'Moderate',
    notes: 'Slower progress, patience required',
  },
  advanced: {
    label: 'Advanced (4+ yrs)',
    monthlyFatLoss: 0.5,
    monthlyMuscleGain: 0.25,
    probability: 'Low',
    notes: 'Very slow; dedicated phases often more effective',
  },
};

/**
 * FMI/FFMI MORTALITY RISK DATA
 * Based on Sedlmeier et al. (2021) - Am J Clin Nutr
 * "Relation of body fat mass and fat-free mass to total mortality"
 * n=16,155, median follow-up 14 years
 */
const MORTALITY_RISK = {
  fmi: {
    // Spline points from Figure 1 - J-shaped curve
    // Reference: FMI 7.3 kg/m² (HR = 1.0)
    points: [
      { x: 3, hr: 1.5, lower: 0.8, upper: 2.8 },
      { x: 5, hr: 1.1, lower: 0.95, upper: 1.25 },
      { x: 7.3, hr: 1.0, lower: 1.0, upper: 1.0 }, // Reference
      { x: 9, hr: 1.15, lower: 1.05, upper: 1.25 },
      { x: 11, hr: 1.35, lower: 1.2, upper: 1.55 },
      { x: 13, hr: 1.56, lower: 1.30, upper: 1.87 },
      { x: 15, hr: 1.85, lower: 1.45, upper: 2.35 },
      { x: 17, hr: 2.2, lower: 1.6, upper: 3.0 },
      { x: 20, hr: 2.8, lower: 1.9, upper: 4.0 },
    ],
    optimal: { min: 5, max: 9 },
    reference: 7.3,
  },
  ffmi: {
    // Inverse J-shaped curve - higher FFMI = lower mortality
    // Reference: FFMI 16.1 kg/m² (HR = 1.0)
    points: [
      { x: 14, hr: 2.5, lower: 1.5, upper: 3.5 },
      { x: 15, hr: 1.5, lower: 1.1, upper: 2.0 },
      { x: 16.1, hr: 1.0, lower: 1.0, upper: 1.0 }, // Reference
      { x: 17.8, hr: 0.83, lower: 0.76, upper: 0.91 },
      { x: 19.2, hr: 0.73, lower: 0.63, upper: 0.85 },
      { x: 21.9, hr: 0.70, lower: 0.56, upper: 0.87 },
      { x: 24, hr: 0.72, lower: 0.55, upper: 0.95 },
      { x: 26, hr: 0.78, lower: 0.55, upper: 1.1 },
    ],
    optimal: { min: 19, max: 24 },
    reference: 16.1,
  },
};

/**
 * MEASUREMENT ERROR CONSTANTS
 * Based on: Tinsley et al. (2021) "A Field-Based Three-Compartment Model"
 */
const MEASUREMENT_ERROR = {
  field_3c: {
    label: '3C Field Model (BIA + Anthropometrics)',
    bodyFatPct: { see: 2.0, tem: 0.8 },
    fatMassKg: { see: 1.5, tem: 0.5 },
    ffmKg: { see: 1.5, tem: 0.4 },
  },
  dxa: {
    label: 'DXA',
    bodyFatPct: { see: 1.0, tem: 0.5 },
    fatMassKg: { see: 0.5, tem: 0.3 },
    ffmKg: { see: 0.4, tem: 0.3 },
  },
  bia: {
    label: 'BIA Only',
    bodyFatPct: { see: 3.5, tem: 1.0 },
    fatMassKg: { see: 2.5, tem: 0.8 },
    ffmKg: { see: 2.8, tem: 0.7 },
  },
  skinfolds: {
    label: 'Skinfolds',
    bodyFatPct: { see: 3.0, tem: 1.5 },
    fatMassKg: { see: 2.0, tem: 1.0 },
    ffmKg: { see: 2.0, tem: 1.0 },
  },
};

function calculateMDC(tem: number, confidenceLevel: number = 0.95): number {
  const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.90 ? 1.645 : 2.58;
  return tem * Math.sqrt(2) * zScore;
}

/**
 * Forbes Rule: P-ratio based on fat mass
 */
const FORBES_CONSTANT = 10.4;

const PROTEIN_EFFECT = {
  low: { threshold: 1.0, multiplier: 1.3, label: 'Low (<1.0 g/kg)' },
  moderate: { threshold: 1.6, multiplier: 1.0, label: 'Moderate (1.0-1.6 g/kg)' },
  high: { threshold: 2.2, multiplier: 0.65, label: 'High (1.6-2.2 g/kg)' },
  very_high: { threshold: 3.0, multiplier: 0.5, label: 'Very High (>2.2 g/kg)' },
};

const TRAINING_EFFECT = {
  none: { multiplier: 1.4, label: 'No resistance training' },
  light: { multiplier: 1.15, label: 'Light (1-2x/week)' },
  moderate: { multiplier: 0.85, label: 'Moderate (3-4x/week)' },
  intense: { multiplier: 0.6, label: 'Intense (5-6x/week)' },
};

const SURPLUS_PARTITIONING = {
  untrained: { muscleRatio: 0.3, label: 'Untrained' },
  novice: { muscleRatio: 0.45, label: 'Novice (0-1 year)' },
  intermediate: { muscleRatio: 0.55, label: 'Intermediate (1-3 years)' },
  advanced: { muscleRatio: 0.4, label: 'Advanced (3+ years)' },
};

const GLYCOGEN_WATER_RATIO = 3;
const MUSCLE_GLYCOGEN_CAPACITY = 450;
const LIVER_GLYCOGEN_CAPACITY = 100;

// Benchmark arrays
const FFMI_BENCHMARKS = [
  { range: [0, 18], label: 'Below Average', color: 'text-red-600', bgColor: 'bg-red-100' },
  { range: [18, 20], label: 'Average', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { range: [20, 22], label: 'Above Average', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { range: [22, 24], label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' },
  { range: [24, 26], label: 'Superior', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { range: [26, 30], label: 'Elite/Suspicious', color: 'text-purple-600', bgColor: 'bg-purple-100' },
];

const FMI_BENCHMARKS_MALE = [
  { range: [0, 3], label: 'Essential Fat', color: 'text-red-600', bgColor: 'bg-red-100' },
  { range: [3, 6], label: 'Athletic', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { range: [6, 9], label: 'Fitness', color: 'text-green-600', bgColor: 'bg-green-100' },
  { range: [9, 13], label: 'Average', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { range: [13, 100], label: 'Above Average', color: 'text-orange-600', bgColor: 'bg-orange-100' },
];

const FMI_BENCHMARKS_FEMALE = [
  { range: [0, 5], label: 'Essential Fat', color: 'text-red-600', bgColor: 'bg-red-100' },
  { range: [5, 9], label: 'Athletic', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { range: [9, 13], label: 'Fitness', color: 'text-green-600', bgColor: 'bg-green-100' },
  { range: [13, 18], label: 'Average', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { range: [18, 100], label: 'Above Average', color: 'text-orange-600', bgColor: 'bg-orange-100' },
];

// Utility functions
function calculatePRatio(
  fatMassKg: number,
  proteinLevel: keyof typeof PROTEIN_EFFECT,
  trainingLevel: keyof typeof TRAINING_EFFECT,
  dailyDeficit: number,
  isDeficit: boolean
): number {
  const basePRatio = FORBES_CONSTANT / (FORBES_CONSTANT + fatMassKg);
  
  if (!isDeficit) return basePRatio;
  
  const proteinMod = PROTEIN_EFFECT[proteinLevel].multiplier;
  const trainingMod = TRAINING_EFFECT[trainingLevel].multiplier;
  
  // Deficit modifier
  let deficitMod = 1.0;
  if (dailyDeficit < 300) deficitMod = 0.85;
  else if (dailyDeficit > 750) deficitMod = 1.5;
  else if (dailyDeficit > 500) deficitMod = 1.2;
  
  return Math.max(0.05, Math.min(0.6, basePRatio * proteinMod * trainingMod * deficitMod));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function weeksBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
}

// Interpolate hazard ratio from mortality data
function getHazardRatio(value: number, type: 'fmi' | 'ffmi'): { hr: number; lower: number; upper: number } {
  const data = MORTALITY_RISK[type].points;
  
  // Find surrounding points
  for (let i = 0; i < data.length - 1; i++) {
    if (value >= data[i].x && value <= data[i + 1].x) {
      const t = (value - data[i].x) / (data[i + 1].x - data[i].x);
      return {
        hr: data[i].hr + t * (data[i + 1].hr - data[i].hr),
        lower: data[i].lower + t * (data[i + 1].lower - data[i].lower),
        upper: data[i].upper + t * (data[i + 1].upper - data[i].upper),
      };
    }
  }
  
  // Extrapolate if out of range
  if (value < data[0].x) return data[0];
  return data[data.length - 1];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BodyCompositionPage() {
  // Current stats
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<number>(30);
  const [heightFt, setHeightFt] = useState<number>(5);
  const [heightIn, setHeightIn] = useState<number>(10);
  const [currentWeight, setCurrentWeight] = useState<number>(180);
  const [currentBodyFat, setCurrentBodyFat] = useState<number>(20);
  
  // Metabolism
  const [rmrSource, setRmrSource] = useState<'estimated' | 'measured'>('estimated');
  const [measuredRmr, setMeasuredRmr] = useState<number>(1800);
  const [neatLevel, setNeatLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>('light');
  const [tef, setTef] = useState<number>(10);
  const [eee, setEee] = useState<number>(300);
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState<number>(4);
  
  // Goal type with recomposition
  const [goalType, setGoalType] = useState<'fat_loss' | 'muscle_gain' | 'recomposition' | 'body_fat' | 'weight' | 'fat_mass' | 'ffm' | 'ffmi' | 'fmi'>('fat_loss');
  const [targetBodyFat, setTargetBodyFat] = useState<number>(12);
  const [targetWeight, setTargetWeight] = useState<number>(170);
  const [targetFFMI, setTargetFFMI] = useState<number>(22);
  const [targetFMI, setTargetFMI] = useState<number>(5);
  const [targetFatMass, setTargetFatMass] = useState<number>(20);
  const [targetFFM, setTargetFFM] = useState<number>(150);
  
  // Rate presets
  const [fatLossRate, setFatLossRate] = useState<keyof typeof RATE_PRESETS.fat_loss>('moderate');
  const [muscleGainRate, setMuscleGainRate] = useState<keyof typeof RATE_PRESETS.muscle_gain>('moderate');
  const [recompExperience, setRecompExperience] = useState<keyof typeof RECOMP_EXPECTATIONS>('intermediate');
  const [useCustomRate, setUseCustomRate] = useState<boolean>(false);
  const [customRate, setCustomRate] = useState<number>(0.75);
  
  // Timeline
  const [startDate, setStartDate] = useState<string>(formatDate(new Date()));
  const [endDate, setEndDate] = useState<string>(formatDate(addWeeks(new Date(), 16)));
  const [useDateRange, setUseDateRange] = useState<boolean>(true);
  
  // Partitioning parameters
  const [proteinLevel, setProteinLevel] = useState<keyof typeof PROTEIN_EFFECT>('high');
  const [trainingLevel, setTrainingLevel] = useState<keyof typeof TRAINING_EFFECT>('moderate');
  const [trainingExperience, setTrainingExperience] = useState<keyof typeof SURPLUS_PARTITIONING>('intermediate');
  const [includeWaterChanges, setIncludeWaterChanges] = useState<boolean>(true);
  
  // Measurement error
  const [measurementMethod, setMeasurementMethod] = useState<keyof typeof MEASUREMENT_ERROR>('field_3c');
  const [showConfidenceInterval, setShowConfidenceInterval] = useState<boolean>(true);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.95);
  
  // View
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  
  // Calculations
  const heightCm = useMemo(() => (heightFt * 12 + heightIn) * 2.54, [heightFt, heightIn]);
  const heightM = heightCm / 100;
  const weightKg = currentWeight * 0.453592;
  
  const measurementErrors = useMemo(() => {
    const method = MEASUREMENT_ERROR[measurementMethod];
    const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.90 ? 1.645 : 2.58;
    return {
      bodyFatPct: { see: method.bodyFatPct.see, tem: method.bodyFatPct.tem, ci: method.bodyFatPct.see * zScore, mdc: calculateMDC(method.bodyFatPct.tem, confidenceLevel) },
      fatMassKg: { see: method.fatMassKg.see, tem: method.fatMassKg.tem, ci: method.fatMassKg.see * zScore, mdc: calculateMDC(method.fatMassKg.tem, confidenceLevel) },
      ffmKg: { see: method.ffmKg.see, tem: method.ffmKg.tem, ci: method.ffmKg.see * zScore, mdc: calculateMDC(method.ffmKg.tem, confidenceLevel) },
    };
  }, [measurementMethod, confidenceLevel]);
  
  // Current metrics
  const currentMetrics = useMemo(() => {
    const fatMassLbs = currentWeight * (currentBodyFat / 100);
    const ffmLbs = currentWeight - fatMassLbs;
    const fatMassKg = fatMassLbs * 0.453592;
    const ffmKg = ffmLbs * 0.453592;
    const fmi = fatMassKg / (heightM * heightM);
    const ffmi = ffmKg / (heightM * heightM);
    
    return {
      fatMassLbs: Math.round(fatMassLbs * 10) / 10,
      ffmLbs: Math.round(ffmLbs * 10) / 10,
      fatMassKg: Math.round(fatMassKg * 10) / 10,
      ffmKg: Math.round(ffmKg * 10) / 10,
      fmi: Math.round(fmi * 10) / 10,
      ffmi: Math.round(ffmi * 10) / 10,
    };
  }, [currentWeight, currentBodyFat, heightM]);
  
  // RMR
  const estimatedRmr = useMemo(() => {
    if (gender === 'male') return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }, [weightKg, heightCm, age, gender]);
  
  const effectiveRmr = rmrSource === 'estimated' ? estimatedRmr : measuredRmr;
  
  const neatEstimates = useMemo(() => ({
    sedentary: Math.round(effectiveRmr * 0.15),
    light: Math.round(effectiveRmr * 0.25),
    moderate: Math.round(effectiveRmr * 0.35),
    active: Math.round(effectiveRmr * 0.45),
    very_active: Math.round(effectiveRmr * 0.55),
  }), [effectiveRmr]);
  
  const effectiveNeat = neatEstimates[neatLevel];
  
  const tdee = useMemo(() => {
    const tefCals = effectiveRmr * (tef / 100);
    const dailyEee = (eee * workoutsPerWeek) / 7;
    return Math.round(effectiveRmr + effectiveNeat + tefCals + dailyEee);
  }, [effectiveRmr, effectiveNeat, tef, eee, workoutsPerWeek]);
  
  // Effective rate based on goal type
  const effectiveRate = useMemo(() => {
    if (useCustomRate) return customRate;
    
    if (goalType === 'fat_loss') {
      return RATE_PRESETS.fat_loss[fatLossRate].rate;
    } else if (goalType === 'muscle_gain') {
      return RATE_PRESETS.muscle_gain[muscleGainRate].rate;
    } else if (goalType === 'recomposition') {
      return 0; // Maintenance for recomp
    }
    return 0.75; // Default
  }, [goalType, fatLossRate, muscleGainRate, useCustomRate, customRate]);
  
  // Timeline
  const totalWeeks = useMemo(() => {
    if (useDateRange) return weeksBetween(new Date(startDate), new Date(endDate));
    return 16;
  }, [startDate, endDate, useDateRange]);
  
  // Target metrics based on goal type and rate
  const targetMetrics = useMemo(() => {
    let targetWeightLbs: number;
    let targetBfPct: number;
    let targetFatMassLbs: number;
    let targetFfmLbs: number;
    
    const currentFfmLbs = currentMetrics.ffmLbs;
    const currentFatMassLbs = currentMetrics.fatMassLbs;
    
    if (goalType === 'fat_loss') {
      // Calculate based on rate and timeline
      const weeklyLoss = currentWeight * (effectiveRate / 100);
      const totalLoss = weeklyLoss * totalWeeks;
      targetWeightLbs = currentWeight - totalLoss;
      
      // Partitioning based on preset
      const ffmLossRatio = RATE_PRESETS.fat_loss[fatLossRate].ffmLossRatio;
      const ffmLoss = totalLoss * ffmLossRatio;
      const fatLoss = totalLoss * (1 - ffmLossRatio);
      
      targetFfmLbs = currentFfmLbs - ffmLoss;
      targetFatMassLbs = currentFatMassLbs - fatLoss;
      targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
      
    } else if (goalType === 'muscle_gain') {
      const weeklyGain = currentWeight * (effectiveRate / 100);
      const totalGain = weeklyGain * totalWeeks;
      targetWeightLbs = currentWeight + totalGain;
      
      const fatGainRatio = RATE_PRESETS.muscle_gain[muscleGainRate].fatGainRatio;
      const muscleGain = totalGain * (1 - fatGainRatio);
      const fatGain = totalGain * fatGainRatio;
      
      targetFfmLbs = currentFfmLbs + muscleGain;
      targetFatMassLbs = currentFatMassLbs + fatGain;
      targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
      
    } else if (goalType === 'recomposition') {
      const recomp = RECOMP_EXPECTATIONS[recompExperience];
      const months = totalWeeks / 4.33;
      
      const fatLoss = recomp.monthlyFatLoss * months;
      const muscleGain = recomp.monthlyMuscleGain * months;
      
      targetFatMassLbs = currentFatMassLbs - fatLoss;
      targetFfmLbs = currentFfmLbs + muscleGain;
      targetWeightLbs = targetFfmLbs + targetFatMassLbs;
      targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
      
    } else if (goalType === 'body_fat') {
      targetBfPct = targetBodyFat;
      targetFfmLbs = currentFfmLbs;
      targetFatMassLbs = (targetBfPct / (100 - targetBfPct)) * targetFfmLbs;
      targetWeightLbs = targetFfmLbs + targetFatMassLbs;
      
    } else if (goalType === 'weight') {
      targetWeightLbs = targetWeight;
      targetFatMassLbs = currentFatMassLbs;
      targetFfmLbs = currentFfmLbs;
      targetBfPct = currentBodyFat;
      
    } else if (goalType === 'fat_mass') {
      targetFatMassLbs = targetFatMass;
      targetFfmLbs = currentFfmLbs;
      targetWeightLbs = targetFfmLbs + targetFatMassLbs;
      targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
      
    } else if (goalType === 'ffm') {
      targetFfmLbs = targetFFM;
      targetFatMassLbs = currentFatMassLbs;
      targetWeightLbs = targetFfmLbs + targetFatMassLbs;
      targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
      
    } else if (goalType === 'ffmi') {
      const targetFfmKgFromFFMI = targetFFMI * (heightM * heightM);
      targetFfmLbs = targetFfmKgFromFFMI / 0.453592;
      targetBfPct = currentBodyFat;
      targetFatMassLbs = (targetBfPct / (100 - targetBfPct)) * targetFfmLbs;
      targetWeightLbs = targetFfmLbs + targetFatMassLbs;
      
    } else if (goalType === 'fmi') {
      const targetFatMassKgFromFMI = targetFMI * (heightM * heightM);
      targetFatMassLbs = targetFatMassKgFromFMI / 0.453592;
      targetFfmLbs = currentFfmLbs;
      targetWeightLbs = targetFfmLbs + targetFatMassLbs;
      targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
      
    } else {
      targetWeightLbs = currentWeight;
      targetBfPct = currentBodyFat;
      targetFatMassLbs = currentFatMassLbs;
      targetFfmLbs = currentFfmLbs;
    }
    
    const targetWeightKg = targetWeightLbs * 0.453592;
    const targetFfmKg = targetFfmLbs * 0.453592;
    const targetFatMassKg = targetFatMassLbs * 0.453592;
    const fmi = targetFatMassKg / (heightM * heightM);
    const ffmi = targetFfmKg / (heightM * heightM);
    
    return {
      weightLbs: Math.round(targetWeightLbs * 10) / 10,
      weightKg: Math.round(targetWeightKg * 10) / 10,
      bodyFat: Math.round(targetBfPct * 10) / 10,
      fatMassLbs: Math.round(targetFatMassLbs * 10) / 10,
      ffmLbs: Math.round(targetFfmLbs * 10) / 10,
      fatMassKg: Math.round(targetFatMassKg * 10) / 10,
      ffmKg: Math.round(targetFfmKg * 10) / 10,
      fmi: Math.round(fmi * 10) / 10,
      ffmi: Math.round(ffmi * 10) / 10,
    };
  }, [goalType, targetBodyFat, targetWeight, targetFFMI, targetFMI, targetFatMass, targetFFM, currentMetrics, heightM, currentBodyFat, currentWeight, effectiveRate, totalWeeks, fatLossRate, muscleGainRate, recompExperience]);
  
  // Risk calculations
  const currentRisk = useMemo(() => ({
    fmi: getHazardRatio(currentMetrics.fmi, 'fmi'),
    ffmi: getHazardRatio(currentMetrics.ffmi, 'ffmi'),
  }), [currentMetrics]);
  
  const targetRisk = useMemo(() => ({
    fmi: getHazardRatio(targetMetrics.fmi, 'fmi'),
    ffmi: getHazardRatio(targetMetrics.ffmi, 'ffmi'),
  }), [targetMetrics]);
  
  // Weekly projections
  const weeklyProjections = useMemo(() => {
    const projections: Array<{
      week: number;
      date: string;
      weight: number;
      fatMass: number;
      ffm: number;
      bodyFat: number;
      waterChange: number;
      scaleWeight: number;
      weightCI: number;
      fatMassCI: number;
      ffmCI: number;
      bodyFatCI: number;
      fmi: number;
      ffmi: number;
    }> = [];
    
    const totalWeightChange = targetMetrics.weightLbs - currentWeight;
    const isDeficit = totalWeightChange < 0;
    const weeklyWeightChange = totalWeightChange / totalWeeks;
    const dailyDeficit = Math.abs((weeklyWeightChange * 3500) / 7);
    
    let currentFatMass = currentMetrics.fatMassLbs;
    let currentFfm = currentMetrics.ffmLbs;
    let currentWt = currentWeight;
    let cumulativeGlycogenChange = 0;
    
    const baseErrors = measurementErrors;
    
    for (let week = 0; week <= totalWeeks; week++) {
      const date = addWeeks(new Date(startDate), week);
      const modelUncertaintyFactor = Math.sqrt(week + 1);
      const weightCILbs = (baseErrors.fatMassKg.ci + baseErrors.ffmKg.ci) * 2.205 * modelUncertaintyFactor * 0.3;
      const fatMassCILbs = baseErrors.fatMassKg.ci * 2.205 * modelUncertaintyFactor * 0.5;
      const ffmCILbs = baseErrors.ffmKg.ci * 2.205 * modelUncertaintyFactor * 0.5;
      const bodyFatCI = baseErrors.bodyFatPct.ci * modelUncertaintyFactor * 0.3;
      
      if (week === 0) {
        projections.push({
          week, date: formatDate(date), weight: currentWt, fatMass: currentFatMass, ffm: currentFfm,
          bodyFat: (currentFatMass / currentWt) * 100, waterChange: 0, scaleWeight: currentWt,
          weightCI: weightCILbs, fatMassCI: fatMassCILbs, ffmCI: ffmCILbs, bodyFatCI: bodyFatCI,
          fmi: currentMetrics.fmi, ffmi: currentMetrics.ffmi,
        });
        continue;
      }
      
      const currentFatMassKg = currentFatMass * 0.453592;
      const pRatio = calculatePRatio(currentFatMassKg, proteinLevel, trainingLevel, dailyDeficit, isDeficit);
      
      if (goalType === 'recomposition') {
        // Recomp: gradual fat loss and muscle gain
        const recomp = RECOMP_EXPECTATIONS[recompExperience];
        currentFatMass -= recomp.monthlyFatLoss / 4.33; // Per week
        currentFfm += recomp.monthlyMuscleGain / 4.33;
      } else if (isDeficit) {
        const leanLoss = Math.abs(weeklyWeightChange) * pRatio;
        const fatLoss = Math.abs(weeklyWeightChange) * (1 - pRatio);
        currentFfm -= leanLoss;
        currentFatMass -= fatLoss;
      } else {
        const muscleRatio = SURPLUS_PARTITIONING[trainingExperience].muscleRatio;
        const muscleGain = weeklyWeightChange * muscleRatio;
        const fatGain = weeklyWeightChange * (1 - muscleRatio);
        currentFfm += muscleGain;
        currentFatMass += fatGain;
      }
      
      currentWt = currentFfm + currentFatMass;
      
      let waterChange = 0;
      if (includeWaterChanges) {
        const weeklyGlycogenChange = isDeficit ? (week <= 2 ? -150 : -20) : (week <= 2 ? 100 : 10);
        cumulativeGlycogenChange += weeklyGlycogenChange;
        cumulativeGlycogenChange = Math.max(-(MUSCLE_GLYCOGEN_CAPACITY + LIVER_GLYCOGEN_CAPACITY), Math.min(0, cumulativeGlycogenChange));
        waterChange = (cumulativeGlycogenChange * GLYCOGEN_WATER_RATIO) / 453.592;
      }
      
      const currentFatMassKgNow = currentFatMass * 0.453592;
      const currentFfmKgNow = currentFfm * 0.453592;
      const fmiNow = currentFatMassKgNow / (heightM * heightM);
      const ffmiNow = currentFfmKgNow / (heightM * heightM);
      
      projections.push({
        week, date: formatDate(date),
        weight: Math.round(currentWt * 10) / 10,
        fatMass: Math.round(currentFatMass * 10) / 10,
        ffm: Math.round(currentFfm * 10) / 10,
        bodyFat: Math.round((currentFatMass / currentWt) * 1000) / 10,
        waterChange: Math.round(waterChange * 10) / 10,
        scaleWeight: Math.round((currentWt + waterChange) * 10) / 10,
        weightCI: Math.round(weightCILbs * 10) / 10,
        fatMassCI: Math.round(fatMassCILbs * 10) / 10,
        ffmCI: Math.round(ffmCILbs * 10) / 10,
        bodyFatCI: Math.round(bodyFatCI * 10) / 10,
        fmi: Math.round(fmiNow * 10) / 10,
        ffmi: Math.round(ffmiNow * 10) / 10,
      });
    }
    
    return projections;
  }, [currentWeight, currentMetrics, targetMetrics, totalWeeks, startDate, proteinLevel, trainingLevel, trainingExperience, includeWaterChanges, measurementErrors, goalType, recompExperience, heightM]);
  
  // Summary
  const summary = useMemo(() => {
    const final = weeklyProjections[weeklyProjections.length - 1];
    const initial = weeklyProjections[0];
    const totalFatChange = final.fatMass - initial.fatMass;
    const totalFFMChange = final.ffm - initial.ffm;
    const totalWeightChange = final.weight - initial.weight;
    const fatChangeMDC = measurementErrors.fatMassKg.mdc * 2.205;
    const ffmChangeMDC = measurementErrors.ffmKg.mdc * 2.205;
    
    return {
      totalWeightChange: Math.round(totalWeightChange * 10) / 10,
      totalFatChange: Math.round(totalFatChange * 10) / 10,
      totalFFMChange: Math.round(totalFFMChange * 10) / 10,
      weeklyWeightChange: Math.round(totalWeightChange / totalWeeks * 100) / 100,
      isDeficit: totalWeightChange < 0,
      pctFromFat: totalWeightChange !== 0 ? Math.round(Math.abs(totalFatChange / totalWeightChange) * 100) : 0,
      pctFromFFM: totalWeightChange !== 0 ? Math.round(Math.abs(totalFFMChange / totalWeightChange) * 100) : 0,
      finalBodyFat: final.bodyFat,
      expectedWaterChange: final.waterChange,
      fatChangeExceedsMDC: Math.abs(totalFatChange) > fatChangeMDC,
      ffmChangeExceedsMDC: Math.abs(totalFFMChange) > ffmChangeMDC,
      fatChangeMDC: Math.round(fatChangeMDC * 10) / 10,
      ffmChangeMDC: Math.round(ffmChangeMDC * 10) / 10,
    };
  }, [weeklyProjections, totalWeeks, measurementErrors]);
  
  // Nutrition targets
  const nutritionTargets = useMemo(() => {
    const dailyDeficit = (summary.weeklyWeightChange * 3500) / 7;
    const targetCals = Math.round(tdee + dailyDeficit);
    const proteinGPerKg = proteinLevel === 'very_high' ? 2.4 : proteinLevel === 'high' ? 1.8 : proteinLevel === 'moderate' ? 1.4 : 1.0;
    const proteinG = Math.round(weightKg * proteinGPerKg);
    const proteinCal = proteinG * 4;
    const fatPct = summary.isDeficit ? 0.25 : 0.30;
    const fatCal = targetCals * fatPct;
    const fatG = Math.round(fatCal / 9);
    const carbCal = targetCals - proteinCal - fatCal;
    const carbG = Math.round(Math.max(50, carbCal / 4));
    
    return {
      calories: targetCals, protein: proteinG, carbs: carbG, fat: fatG,
      proteinPct: Math.round((proteinCal / targetCals) * 100),
      carbsPct: Math.round((carbCal / targetCals) * 100),
      fatPct: Math.round((fatCal / targetCals) * 100),
      deficit: Math.round(dailyDeficit),
    };
  }, [tdee, summary, weightKg, proteinLevel]);
  
  // Helpers
  const getFFMIBenchmark = (ffmi: number) => FFMI_BENCHMARKS.find(b => ffmi >= b.range[0] && ffmi < b.range[1]) || FFMI_BENCHMARKS[0];
  const getFMIBenchmark = (fmi: number) => {
    const benchmarks = gender === 'male' ? FMI_BENCHMARKS_MALE : FMI_BENCHMARKS_FEMALE;
    return benchmarks.find(b => fmi >= b.range[0] && fmi < b.range[1]) || benchmarks[benchmarks.length - 1];
  };

  // SVG Risk Curve Component
  const RiskCurve = ({ type, currentVal, targetVal }: { type: 'fmi' | 'ffmi'; currentVal: number; targetVal: number }) => {
    const data = MORTALITY_RISK[type].points;
    const minX = data[0].x - 1;
    const maxX = data[data.length - 1].x + 1;
    const maxY = Math.max(...data.map(d => d.upper)) + 0.5;
    const minY = Math.min(...data.map(d => d.lower)) - 0.2;
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    
    const toSvgX = (x: number) => ((x - minX) / rangeX) * 380 + 10;
    const toSvgY = (y: number) => 140 - ((y - minY) / rangeY) * 120;
    
    // Build paths
    const mainLine = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(d.x)} ${toSvgY(d.hr)}`).join(' ');
    const upperLine = data.map(d => `${toSvgX(d.x)},${toSvgY(d.upper)}`).join(' ');
    const lowerLine = data.map(d => `${toSvgX(d.x)},${toSvgY(d.lower)}`).reverse().join(' ');
    const ciPath = `${upperLine} ${lowerLine}`;
    
    const currentHR = getHazardRatio(currentVal, type);
    const targetHR = getHazardRatio(targetVal, type);
    const optimal = MORTALITY_RISK[type].optimal;
    
    return (
      <svg className="w-full h-40" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        <line x1="10" y1="140" x2="390" y2="140" stroke="#e5e7eb" strokeWidth="1" />
        <line x1="10" y1="20" x2="10" y2="140" stroke="#e5e7eb" strokeWidth="1" />
        
        {/* HR = 1 reference line */}
        <line x1="10" y1={toSvgY(1)} x2="390" y2={toSvgY(1)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,4" />
        <text x="395" y={toSvgY(1) + 3} fontSize="8" fill="#94a3b8">HR=1</text>
        
        {/* Optimal zone */}
        <rect x={toSvgX(optimal.min)} y="20" width={toSvgX(optimal.max) - toSvgX(optimal.min)} height="120" fill="#22c55e" fillOpacity="0.1" />
        
        {/* CI shading */}
        <polygon points={ciPath} fill="#64748b" fillOpacity="0.15" />
        
        {/* Main curve */}
        <path d={mainLine} fill="none" stroke="#334155" strokeWidth="2.5" />
        
        {/* Current position */}
        <circle cx={toSvgX(currentVal)} cy={toSvgY(currentHR.hr)} r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
        <text x={toSvgX(currentVal)} y={toSvgY(currentHR.hr) - 12} fontSize="9" fill="#ef4444" textAnchor="middle" fontWeight="bold">Current</text>
        
        {/* Target position */}
        {Math.abs(currentVal - targetVal) > 0.5 && (
          <>
            <circle cx={toSvgX(targetVal)} cy={toSvgY(targetHR.hr)} r="6" fill="#22c55e" stroke="#fff" strokeWidth="2" />
            <text x={toSvgX(targetVal)} y={toSvgY(targetHR.hr) - 12} fontSize="9" fill="#22c55e" textAnchor="middle" fontWeight="bold">Target</text>
            {/* Arrow */}
            <line x1={toSvgX(currentVal)} y1={toSvgY(currentHR.hr)} x2={toSvgX(targetVal)} y2={toSvgY(targetHR.hr)} stroke="#c19962" strokeWidth="1.5" strokeDasharray="4,4" markerEnd="url(#arrowhead)" />
          </>
        )}
        
        {/* Arrow marker */}
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#c19962" />
          </marker>
        </defs>
        
        {/* X-axis label */}
        <text x="200" y="155" fontSize="10" fill="#64748b" textAnchor="middle">{type === 'fmi' ? 'Fat Mass Index (kg/m²)' : 'Fat-Free Mass Index (kg/m²)'}</text>
        
        {/* Y-axis label */}
        <text x="5" y="80" fontSize="9" fill="#64748b" transform="rotate(-90, 5, 80)">Hazard Ratio</text>
      </svg>
    );
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 lg:p-6">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#00263d] mb-2">Body Composition Calculator</h1>
            <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
              Evidence-based body composition planning with Forbes partitioning, measurement uncertainty, and mortality risk curves.
            </p>
          </div>

          {/* Main Cards - 5 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {/* Column 1: Current Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Scale className="h-4 w-4 text-[#c19962]" />
                  Current Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Gender</Label>
                    <Select value={gender} onValueChange={(v: 'male' | 'female') => setGender(v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Age</Label>
                    <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="h-7 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" value={heightFt} onChange={(e) => setHeightFt(Number(e.target.value))} className="h-7 text-xs" placeholder="ft" />
                  <Input type="number" value={heightIn} onChange={(e) => setHeightIn(Number(e.target.value))} className="h-7 text-xs" placeholder="in" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Weight (lbs)</Label>
                    <Input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(Number(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Body Fat %</Label>
                    <Input type="number" step="0.1" value={currentBodyFat} onChange={(e) => setCurrentBodyFat(Number(e.target.value))} className="h-7 text-xs" />
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded p-2 space-y-1 text-[10px]">
                  <div className="flex justify-between"><span>Fat Mass</span><span className="font-medium">{currentMetrics.fatMassLbs} lbs</span></div>
                  <div className="flex justify-between"><span>FFM</span><span className="font-medium">{currentMetrics.ffmLbs} lbs</span></div>
                  <Separator className="my-1" />
                  <div className="flex justify-between"><span>FMI</span><Badge className={`text-[8px] ${getFMIBenchmark(currentMetrics.fmi).bgColor}`}>{currentMetrics.fmi}</Badge></div>
                  <div className="flex justify-between"><span>FFMI</span><Badge className={`text-[8px] ${getFFMIBenchmark(currentMetrics.ffmi).bgColor}`}>{currentMetrics.ffmi}</Badge></div>
                </div>
                
                <Separator />
                
                {/* TDEE Mini */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] flex items-center gap-1"><Flame className="h-3 w-3 text-orange-500" />Metabolism</Label>
                    <Select value={neatLevel} onValueChange={(v: any) => setNeatLevel(v)}>
                      <SelectTrigger className="h-6 w-20 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentary</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="very_active">Very Active</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-orange-50 rounded p-2 text-center border border-orange-200">
                    <span className="text-[10px] text-orange-700">TDEE:</span>
                    <span className="text-sm font-bold text-orange-600 ml-1">{tdee} kcal</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 2: Goal Type & Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-[#00263d]" />
                  Goal & Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-[10px] mb-1 block">Phase Type</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { value: 'fat_loss', label: 'Fat Loss', icon: TrendingDown },
                      { value: 'muscle_gain', label: 'Build', icon: TrendingUp },
                      { value: 'recomposition', label: 'Recomp', icon: RefreshCcw },
                    ].map((type) => (
                      <Button
                        key={type.value}
                        variant={goalType === type.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setGoalType(type.value as any)}
                        className={`text-[10px] h-7 flex flex-col items-center gap-0.5 ${goalType === type.value ? 'bg-[#00263d]' : ''}`}
                      >
                        <type.icon className="h-3 w-3" />
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                {/* Rate Selection based on goal */}
                {goalType === 'fat_loss' && (
                  <div className="space-y-2">
                    <Label className="text-[10px]">Rate of Loss</Label>
                    {Object.entries(RATE_PRESETS.fat_loss).map(([key, val]) => (
                      <Button
                        key={key}
                        variant={fatLossRate === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFatLossRate(key as any)}
                        className={`w-full justify-start text-[10px] h-auto py-1 ${fatLossRate === key ? 'bg-[#00263d]' : ''}`}
                      >
                        <div className="text-left">
                          <div className="font-medium">{val.label}</div>
                          <div className="text-[8px] opacity-70">{val.description}</div>
                        </div>
                      </Button>
                    ))}
                    <div className="bg-amber-50 rounded p-2 text-[10px] border border-amber-200">
                      <div className="font-medium text-amber-800">Tradeoffs:</div>
                      <div className="text-amber-700">
                        <div>• FFM loss: ~{Math.round(RATE_PRESETS.fat_loss[fatLossRate].ffmLossRatio * 100)}%</div>
                        <div>• Adherence: {RATE_PRESETS.fat_loss[fatLossRate].adherence}</div>
                        <div>• Hormonal: {RATE_PRESETS.fat_loss[fatLossRate].hormonal}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {goalType === 'muscle_gain' && (
                  <div className="space-y-2">
                    <Label className="text-[10px]">Rate of Gain</Label>
                    {Object.entries(RATE_PRESETS.muscle_gain).map(([key, val]) => (
                      <Button
                        key={key}
                        variant={muscleGainRate === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMuscleGainRate(key as any)}
                        className={`w-full justify-start text-[10px] h-auto py-1 ${muscleGainRate === key ? 'bg-[#00263d]' : ''}`}
                      >
                        <div className="text-left">
                          <div className="font-medium">{val.label}</div>
                          <div className="text-[8px] opacity-70">{val.description}</div>
                        </div>
                      </Button>
                    ))}
                    <div className="bg-blue-50 rounded p-2 text-[10px] border border-blue-200">
                      <div className="font-medium text-blue-800">Expected:</div>
                      <div className="text-blue-700">
                        <div>• Fat gain: ~{Math.round(RATE_PRESETS.muscle_gain[muscleGainRate].fatGainRatio * 100)}%</div>
                        <div>• Results: {RATE_PRESETS.muscle_gain[muscleGainRate].timeToResults}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {goalType === 'recomposition' && (
                  <div className="space-y-2">
                    <Label className="text-[10px]">Training Experience</Label>
                    {Object.entries(RECOMP_EXPECTATIONS).map(([key, val]) => (
                      <Button
                        key={key}
                        variant={recompExperience === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRecompExperience(key as any)}
                        className={`w-full justify-start text-[10px] h-auto py-1 ${recompExperience === key ? 'bg-[#00263d]' : ''}`}
                      >
                        <div className="text-left">
                          <div className="font-medium">{val.label}</div>
                          <div className="text-[8px] opacity-70">{val.notes}</div>
                        </div>
                      </Button>
                    ))}
                    <div className="bg-purple-50 rounded p-2 text-[10px] border border-purple-200">
                      <div className="font-medium text-purple-800">Recomp Expectations:</div>
                      <div className="text-purple-700">
                        <div>• Fat loss: ~{RECOMP_EXPECTATIONS[recompExperience].monthlyFatLoss} lbs/mo</div>
                        <div>• Muscle gain: ~{RECOMP_EXPECTATIONS[recompExperience].monthlyMuscleGain} lbs/mo</div>
                        <div>• Success likelihood: {RECOMP_EXPECTATIONS[recompExperience].probability}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Other goal types */}
                {!['fat_loss', 'muscle_gain', 'recomposition'].includes(goalType) && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      {['body_fat', 'weight', 'fat_mass', 'ffm', 'ffmi', 'fmi'].map((t) => (
                        <Button key={t} variant={goalType === t ? 'default' : 'outline'} size="sm" onClick={() => setGoalType(t as any)} className={`text-[10px] h-6 ${goalType === t ? 'bg-[#00263d]' : ''}`}>
                          {t.replace('_', ' ').toUpperCase()}
                        </Button>
                      ))}
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                      {goalType === 'body_fat' && <div><Label className="text-[10px]">Target BF%</Label><Slider value={[targetBodyFat]} onValueChange={([v]) => setTargetBodyFat(v)} min={5} max={35} step={0.5} /></div>}
                      {goalType === 'weight' && <div><Label className="text-[10px]">Target Weight</Label><Input type="number" value={targetWeight} onChange={(e) => setTargetWeight(Number(e.target.value))} className="h-7 text-xs" /></div>}
                      {goalType === 'fat_mass' && <div><Label className="text-[10px]">Target FM (lbs)</Label><Input type="number" value={targetFatMass} onChange={(e) => setTargetFatMass(Number(e.target.value))} className="h-7 text-xs" /></div>}
                      {goalType === 'ffm' && <div><Label className="text-[10px]">Target FFM (lbs)</Label><Input type="number" value={targetFFM} onChange={(e) => setTargetFFM(Number(e.target.value))} className="h-7 text-xs" /></div>}
                      {goalType === 'ffmi' && <div><Label className="text-[10px]">Target FFMI</Label><Slider value={[targetFFMI]} onValueChange={([v]) => setTargetFFMI(v)} min={16} max={28} step={0.5} /></div>}
                      {goalType === 'fmi' && <div><Label className="text-[10px]">Target FMI</Label><Slider value={[targetFMI]} onValueChange={([v]) => setTargetFMI(v)} min={2} max={15} step={0.5} /></div>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column 3: Timeline & Parameters */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  Timeline & Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Start</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-7 text-[10px]" />
                  </div>
                  <div>
                    <Label className="text-[10px]">End</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-7 text-[10px]" />
                  </div>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />{totalWeeks} weeks</Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label className="text-[10px] flex items-center gap-1"><Settings2 className="h-3 w-3" />Partitioning Factors</Label>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Protein</Label>
                    <Select value={proteinLevel} onValueChange={(v: any) => setProteinLevel(v)}>
                      <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROTEIN_EFFECT).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Training</Label>
                    <Select value={trainingLevel} onValueChange={(v: any) => setTrainingLevel(v)}>
                      <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TRAINING_EFFECT).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px]">Water Changes</Label>
                    <Switch checked={includeWaterChanges} onCheckedChange={setIncludeWaterChanges} />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-1">
                  <Label className="text-[10px] flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-amber-500" />Measurement</Label>
                  <Select value={measurementMethod} onValueChange={(v: any) => setMeasurementMethod(v)}>
                    <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MEASUREMENT_ERROR).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px]">Show CI</Label>
                    <Switch checked={showConfidenceInterval} onCheckedChange={setShowConfidenceInterval} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 4: Target Composition */}
            <Card className="border-[#c19962]">
              <CardHeader className="pb-2 bg-[#c19962]/10">
                <CardTitle className="text-sm text-[#00263d]">Target Composition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-[#00263d]">{targetMetrics.weightLbs}</div>
                    <div className="text-[10px] text-muted-foreground">Weight</div>
                  </div>
                  <div className="bg-slate-50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-[#00263d]">{targetMetrics.bodyFat}%</div>
                    <div className="text-[10px] text-muted-foreground">Body Fat</div>
                  </div>
                </div>
                
                <div className="text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span>Fat Mass</span>
                    <span>{targetMetrics.fatMassLbs} lbs <span className={targetMetrics.fatMassLbs < currentMetrics.fatMassLbs ? 'text-green-600' : 'text-red-600'}>({(targetMetrics.fatMassLbs - currentMetrics.fatMassLbs).toFixed(1)})</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span>FFM</span>
                    <span>{targetMetrics.ffmLbs} lbs <span className={targetMetrics.ffmLbs >= currentMetrics.ffmLbs ? 'text-green-600' : 'text-red-600'}>({targetMetrics.ffmLbs >= currentMetrics.ffmLbs ? '+' : ''}{(targetMetrics.ffmLbs - currentMetrics.ffmLbs).toFixed(1)})</span></span>
                  </div>
                  <Separator />
                  <div className="flex justify-between"><span>FMI</span><Badge className={`text-[8px] ${getFMIBenchmark(targetMetrics.fmi).bgColor}`}>{targetMetrics.fmi}</Badge></div>
                  <div className="flex justify-between"><span>FFMI</span><Badge className={`text-[8px] ${getFFMIBenchmark(targetMetrics.ffmi).bgColor}`}>{targetMetrics.ffmi}</Badge></div>
                </div>
                
                <Separator />
                
                {/* Composition change bar */}
                <div className="bg-blue-50 rounded p-2 border border-blue-200">
                  <div className="text-center mb-1">
                    <div className={`text-lg font-bold ${summary.isDeficit ? 'text-green-600' : 'text-blue-600'}`}>
                      {summary.isDeficit ? '' : '+'}{summary.totalWeightChange} lbs
                    </div>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden flex mb-1">
                    <div className="bg-yellow-400" style={{ width: `${Math.abs(summary.pctFromFat)}%` }} />
                    <div className="bg-red-400" style={{ width: `${Math.abs(summary.pctFromFFM)}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>Fat: {summary.pctFromFat}%</span>
                    <span>FFM: {summary.pctFromFFM}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 5: Nutrition */}
            <Card className="border-green-300">
              <CardHeader className="pb-2 bg-green-50">
                <CardTitle className="text-sm text-green-800"><Zap className="h-4 w-4 inline mr-1" />Daily Targets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{nutritionTargets.calories}</div>
                  <div className="text-[10px] text-green-700">
                    {summary.isDeficit ? `${Math.abs(nutritionTargets.deficit)} deficit` : `${nutritionTargets.deficit} surplus`}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center p-1.5 bg-red-50 rounded text-[10px]">
                    <span className="text-red-700">Protein</span>
                    <span className="font-bold text-red-600">{nutritionTargets.protein}g ({nutritionTargets.proteinPct}%)</span>
                  </div>
                  <div className="flex justify-between items-center p-1.5 bg-blue-50 rounded text-[10px]">
                    <span className="text-blue-700">Carbs</span>
                    <span className="font-bold text-blue-600">{nutritionTargets.carbs}g ({nutritionTargets.carbsPct}%)</span>
                  </div>
                  <div className="flex justify-between items-center p-1.5 bg-yellow-50 rounded text-[10px]">
                    <span className="text-yellow-700">Fat</span>
                    <span className="font-bold text-yellow-600">{nutritionTargets.fat}g ({nutritionTargets.fatPct}%)</span>
                  </div>
                </div>
                
                <Separator />
                
                {/* MDC Info */}
                <div className="bg-amber-50 rounded p-2 text-[10px] border border-amber-200">
                  <div className="font-medium text-amber-800">Min. Detectable Change</div>
                  <div className="text-amber-700 space-y-0.5">
                    <div className="flex justify-between"><span>Fat Mass:</span><span>±{summary.fatChangeMDC} lbs</span></div>
                    <div className="flex justify-between"><span>FFM:</span><span>±{summary.ffmChangeMDC} lbs</span></div>
                  </div>
                  <div className="mt-1 pt-1 border-t border-amber-200">
                    {summary.fatChangeExceedsMDC ? (
                      <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" />Fat change detectable</span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-3 w-3" />Within measurement error</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Curves - Full Width */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Mortality Risk Curves
                <Badge variant="outline" className="ml-2 text-xs">Sedlmeier et al. 2021</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Based on pooled analysis of 7 prospective cohorts (n=16,155, 14-year follow-up). 
                Shaded region = 95% CI. Green zone = optimal range.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Fat Mass Index (FMI)</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-red-600">Current: HR {currentRisk.fmi.hr.toFixed(2)}</span>
                      {Math.abs(currentMetrics.fmi - targetMetrics.fmi) > 0.5 && (
                        <span className="text-green-600">→ Target: HR {targetRisk.fmi.hr.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <RiskCurve type="fmi" currentVal={currentMetrics.fmi} targetVal={targetMetrics.fmi} />
                  <div className="text-[10px] text-muted-foreground mt-1">
                    J-shaped curve: Both very low and high FMI increase mortality risk. Optimal range: 5-9 kg/m²
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Fat-Free Mass Index (FFMI)</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-red-600">Current: HR {currentRisk.ffmi.hr.toFixed(2)}</span>
                      {Math.abs(currentMetrics.ffmi - targetMetrics.ffmi) > 0.5 && (
                        <span className="text-green-600">→ Target: HR {targetRisk.ffmi.hr.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <RiskCurve type="ffmi" currentVal={currentMetrics.ffmi} targetVal={targetMetrics.ffmi} />
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Inverse curve: Higher FFMI is protective. Low FFMI significantly increases mortality risk. Optimal: 19-24 kg/m²
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Projection - Full Width */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-purple-500" />
                  Timeline Projection
                  {showConfidenceInterval && <Badge variant="outline" className="ml-2 text-xs">{Math.round(confidenceLevel * 100)}% CI</Badge>}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant={viewMode === 'graph' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('graph')} className={`h-7 ${viewMode === 'graph' ? 'bg-[#00263d]' : ''}`}>
                    <LineChart className="h-4 w-4 mr-1" />Graph
                  </Button>
                  <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')} className={`h-7 ${viewMode === 'table' ? 'bg-[#00263d]' : ''}`}>
                    <Table className="h-4 w-4 mr-1" />Table
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'graph' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Weight Graph */}
                  <div>
                    <div className="text-sm font-medium mb-1">Weight (lbs)</div>
                    <div className="h-40 bg-slate-50 rounded border p-1">
                      {(() => {
                        const vals = weeklyProjections.map(p => p.weight);
                        const minW = Math.min(...vals) - 5;
                        const maxW = Math.max(...vals) + 5;
                        const range = maxW - minW;
                        const getY = (v: number) => 150 - ((v - minW) / range) * 140;
                        const getX = (i: number) => (i / (weeklyProjections.length - 1)) * 380 + 10;
                        
                        return (
                          <svg className="w-full h-full" viewBox="0 0 400 160">
                            {showConfidenceInterval && (
                              <polygon
                                points={[
                                  ...weeklyProjections.map((p, i) => `${getX(i)},${getY(p.weight + p.weightCI)}`),
                                  ...weeklyProjections.map((p, i) => `${getX(weeklyProjections.length - 1 - i)},${getY(weeklyProjections[weeklyProjections.length - 1 - i].weight - weeklyProjections[weeklyProjections.length - 1 - i].weightCI)}`),
                                ].join(' ')}
                                fill="#3b82f6" fillOpacity="0.15"
                              />
                            )}
                            <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={weeklyProjections.map((p, i) => `${getX(i)},${getY(p.weight)}`).join(' ')} />
                            <circle cx={getX(0)} cy={getY(weeklyProjections[0].weight)} r="4" fill="#ef4444" />
                            <circle cx={getX(weeklyProjections.length - 1)} cy={getY(weeklyProjections[weeklyProjections.length - 1].weight)} r="4" fill="#22c55e" />
                            <text x="5" y="15" fontSize="9" fill="#64748b">{maxW.toFixed(0)}</text>
                            <text x="5" y="150" fontSize="9" fill="#64748b">{minW.toFixed(0)}</text>
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Composition Graph */}
                  <div>
                    <div className="text-sm font-medium mb-1">Fat Mass & FFM (lbs)</div>
                    <div className="h-40 bg-slate-50 rounded border p-1">
                      {(() => {
                        const allVals = [...weeklyProjections.map(p => p.fatMass), ...weeklyProjections.map(p => p.ffm)];
                        const minV = Math.min(...allVals) - 5;
                        const maxV = Math.max(...allVals) + 5;
                        const range = maxV - minV;
                        const getY = (v: number) => 150 - ((v - minV) / range) * 140;
                        const getX = (i: number) => (i / (weeklyProjections.length - 1)) * 380 + 10;
                        
                        return (
                          <svg className="w-full h-full" viewBox="0 0 400 160">
                            {showConfidenceInterval && (
                              <>
                                <polygon points={[...weeklyProjections.map((p, i) => `${getX(i)},${getY(p.fatMass + p.fatMassCI)}`), ...weeklyProjections.map((p, i) => `${getX(weeklyProjections.length - 1 - i)},${getY(weeklyProjections[weeklyProjections.length - 1 - i].fatMass - weeklyProjections[weeklyProjections.length - 1 - i].fatMassCI)}`),].join(' ')} fill="#eab308" fillOpacity="0.15" />
                                <polygon points={[...weeklyProjections.map((p, i) => `${getX(i)},${getY(p.ffm + p.ffmCI)}`), ...weeklyProjections.map((p, i) => `${getX(weeklyProjections.length - 1 - i)},${getY(weeklyProjections[weeklyProjections.length - 1 - i].ffm - weeklyProjections[weeklyProjections.length - 1 - i].ffmCI)}`),].join(' ')} fill="#ef4444" fillOpacity="0.15" />
                              </>
                            )}
                            <polyline fill="none" stroke="#eab308" strokeWidth="2" points={weeklyProjections.map((p, i) => `${getX(i)},${getY(p.fatMass)}`).join(' ')} />
                            <polyline fill="none" stroke="#ef4444" strokeWidth="2" points={weeklyProjections.map((p, i) => `${getX(i)},${getY(p.ffm)}`).join(' ')} />
                            <text x="370" y="15" fontSize="8" fill="#64748b">
                              <tspan fill="#eab308">●</tspan> FM
                              <tspan fill="#ef4444" dx="5">●</tspan> FFM
                            </text>
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Body Fat % Graph */}
                  <div>
                    <div className="text-sm font-medium mb-1">Body Fat %</div>
                    <div className="h-40 bg-slate-50 rounded border p-1">
                      {(() => {
                        const vals = weeklyProjections.map(p => p.bodyFat);
                        const minBf = Math.min(...vals) - 2;
                        const maxBf = Math.max(...vals) + 2;
                        const range = maxBf - minBf;
                        const getY = (v: number) => 150 - ((v - minBf) / range) * 140;
                        const getX = (i: number) => (i / (weeklyProjections.length - 1)) * 380 + 10;
                        
                        return (
                          <svg className="w-full h-full" viewBox="0 0 400 160">
                            {showConfidenceInterval && (
                              <polygon
                                points={[
                                  ...weeklyProjections.map((p, i) => `${getX(i)},${getY(p.bodyFat + p.bodyFatCI)}`),
                                  ...weeklyProjections.map((p, i) => `${getX(weeklyProjections.length - 1 - i)},${getY(weeklyProjections[weeklyProjections.length - 1 - i].bodyFat - weeklyProjections[weeklyProjections.length - 1 - i].bodyFatCI)}`),
                                ].join(' ')}
                                fill="#22c55e" fillOpacity="0.15"
                              />
                            )}
                            <polyline fill="none" stroke="#22c55e" strokeWidth="2" points={weeklyProjections.map((p, i) => `${getX(i)},${getY(p.bodyFat)}`).join(' ')} />
                            <circle cx={getX(0)} cy={getY(weeklyProjections[0].bodyFat)} r="4" fill="#ef4444" />
                            <circle cx={getX(weeklyProjections.length - 1)} cy={getY(weeklyProjections[weeklyProjections.length - 1].bodyFat)} r="4" fill="#22c55e" />
                            <text x="5" y="15" fontSize="9" fill="#64748b">{maxBf.toFixed(1)}%</text>
                            <text x="5" y="150" fontSize="9" fill="#64748b">{minBf.toFixed(1)}%</text>
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[350px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr>
                        <th className="text-left p-1">Week</th>
                        <th className="text-left p-1">Date</th>
                        <th className="text-right p-1">Weight</th>
                        <th className="text-right p-1">FM</th>
                        <th className="text-right p-1">FFM</th>
                        <th className="text-right p-1">BF%</th>
                        <th className="text-right p-1">FMI</th>
                        <th className="text-right p-1">FFMI</th>
                        {includeWaterChanges && <th className="text-right p-1">H₂O</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyProjections.map((p, i) => (
                        <tr key={p.week} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
                          <td className="p-1">{p.week}</td>
                          <td className="p-1 text-muted-foreground">{p.date}</td>
                          <td className="p-1 text-right font-medium">{p.weight}</td>
                          <td className="p-1 text-right text-yellow-600">{p.fatMass}</td>
                          <td className="p-1 text-right text-red-600">{p.ffm}</td>
                          <td className="p-1 text-right text-green-600">{p.bodyFat}%</td>
                          <td className="p-1 text-right">{p.fmi}</td>
                          <td className="p-1 text-right">{p.ffmi}</td>
                          {includeWaterChanges && <td className="p-1 text-right text-blue-600">{p.waterChange}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* References */}
          <div className="text-[10px] text-muted-foreground text-center space-y-1">
            <p><strong>Partitioning:</strong> Forbes GB (2000), Heymsfield SB (2014), Longland TM (2016)</p>
            <p><strong>Mortality Risk:</strong> Sedlmeier AM et al. (2021) Am J Clin Nutr - FMI/FFMI hazard ratios</p>
            <p><strong>Measurement:</strong> Tinsley GM (2021) 3C Field Model - MSSE</p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
