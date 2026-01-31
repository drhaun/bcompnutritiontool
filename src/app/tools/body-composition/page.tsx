'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
  Zap,
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
  Heart,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// =============================================================================
// EVIDENCE-BASED CONSTANTS
// =============================================================================

const RATE_PRESETS = {
  fat_loss: {
    conservative: { rate: 0.5, label: 'Conservative', description: '0.5%/wk - Max retention', ffmLossRatio: 0.10, adherence: 'High', hormonal: 'Minimal' },
    moderate: { rate: 0.75, label: 'Moderate', description: '0.75%/wk - Balanced', ffmLossRatio: 0.15, adherence: 'Mod-High', hormonal: 'Mild' },
    aggressive: { rate: 1.0, label: 'Aggressive', description: '1.0%/wk - Faster', ffmLossRatio: 0.25, adherence: 'Moderate', hormonal: 'Moderate' },
    very_aggressive: { rate: 1.25, label: 'Very Aggressive', description: '1.25%/wk - Contest prep', ffmLossRatio: 0.35, adherence: 'Low', hormonal: 'Significant' },
  },
  muscle_gain: {
    slow: { rate: 0.25, label: 'Lean Gain', description: '0.25%/wk - Minimal fat', fatGainRatio: 0.30 },
    moderate: { rate: 0.5, label: 'Moderate', description: '0.5%/wk - Balanced', fatGainRatio: 0.45 },
    aggressive: { rate: 0.75, label: 'Aggressive', description: '0.75%/wk - Faster', fatGainRatio: 0.55 },
    very_aggressive: { rate: 1.0, label: 'Max Gain', description: '1.0%/wk - Beginner/bulk', fatGainRatio: 0.65 },
  },
};

const RECOMP_EXPECTATIONS = {
  untrained: { label: 'Untrained (<1 yr)', monthlyFatLoss: 1.5, monthlyMuscleGain: 1.5, probability: 85, notes: 'Newbie gains make recomp very effective' },
  novice: { label: 'Novice (1-2 yrs)', monthlyFatLoss: 1.0, monthlyMuscleGain: 0.75, probability: 70, notes: 'Still achievable with discipline' },
  intermediate: { label: 'Intermediate (2-4 yrs)', monthlyFatLoss: 0.75, monthlyMuscleGain: 0.5, probability: 50, notes: 'Slower progress, patience required' },
  advanced: { label: 'Advanced (4+ yrs)', monthlyFatLoss: 0.5, monthlyMuscleGain: 0.25, probability: 25, notes: 'Very slow; dedicated phases often better' },
};

// Sedlmeier et al. (2021) - Hazard ratio data with smoother interpolation points
const MORTALITY_RISK = {
  fmi: {
    points: [
      { x: 2, hr: 1.8 }, { x: 3, hr: 1.5 }, { x: 4, hr: 1.25 }, { x: 5, hr: 1.1 }, { x: 6, hr: 1.02 },
      { x: 7, hr: 0.98 }, { x: 7.3, hr: 1.0 }, { x: 8, hr: 1.02 }, { x: 9, hr: 1.1 }, { x: 10, hr: 1.2 },
      { x: 11, hr: 1.35 }, { x: 12, hr: 1.45 }, { x: 13, hr: 1.56 }, { x: 14, hr: 1.7 }, { x: 15, hr: 1.85 },
      { x: 16, hr: 2.0 }, { x: 17, hr: 2.2 }, { x: 18, hr: 2.45 }, { x: 19, hr: 2.65 }, { x: 20, hr: 2.8 },
    ],
    optimal: { min: 5, max: 9 },
    reference: 7.3,
  },
  ffmi: {
    points: [
      { x: 13, hr: 3.0 }, { x: 14, hr: 2.5 }, { x: 15, hr: 1.5 }, { x: 16, hr: 1.1 }, { x: 16.1, hr: 1.0 },
      { x: 17, hr: 0.9 }, { x: 17.8, hr: 0.83 }, { x: 18.5, hr: 0.78 }, { x: 19.2, hr: 0.73 }, { x: 20, hr: 0.71 },
      { x: 21, hr: 0.70 }, { x: 21.9, hr: 0.70 }, { x: 23, hr: 0.72 }, { x: 24, hr: 0.74 }, { x: 25, hr: 0.76 },
      { x: 26, hr: 0.78 }, { x: 27, hr: 0.82 },
    ],
    optimal: { min: 19, max: 24 },
    reference: 16.1,
  },
};

const MEASUREMENT_ERROR = {
  field_3c: { label: '3C Field Model', bodyFatPct: { see: 2.0, tem: 0.8 }, fatMassKg: { see: 1.5, tem: 0.5 }, ffmKg: { see: 1.5, tem: 0.4 } },
  dxa: { label: 'DXA', bodyFatPct: { see: 1.0, tem: 0.5 }, fatMassKg: { see: 0.5, tem: 0.3 }, ffmKg: { see: 0.4, tem: 0.3 } },
  bia: { label: 'BIA Only', bodyFatPct: { see: 3.5, tem: 1.0 }, fatMassKg: { see: 2.5, tem: 0.8 }, ffmKg: { see: 2.8, tem: 0.7 } },
};

const PROTEIN_EFFECT = {
  low: { multiplier: 1.3, label: 'Low (<1.0 g/kg)' },
  moderate: { multiplier: 1.0, label: 'Moderate (1.0-1.6 g/kg)' },
  high: { multiplier: 0.65, label: 'High (1.6-2.2 g/kg)' },
  very_high: { multiplier: 0.5, label: 'Very High (>2.2 g/kg)' },
};

const TRAINING_EFFECT = {
  none: { multiplier: 1.4, label: 'None' },
  light: { multiplier: 1.15, label: 'Light (1-2x/wk)' },
  moderate: { multiplier: 0.85, label: 'Moderate (3-4x/wk)' },
  intense: { multiplier: 0.6, label: 'Intense (5-6x/wk)' },
};

const SURPLUS_PARTITIONING = {
  untrained: { muscleRatio: 0.3, label: 'Untrained' },
  novice: { muscleRatio: 0.45, label: 'Novice' },
  intermediate: { muscleRatio: 0.55, label: 'Intermediate' },
  advanced: { muscleRatio: 0.4, label: 'Advanced' },
};

// Utility functions
const formatDate = (date: Date): string => date.toISOString().split('T')[0];
const addWeeks = (date: Date, weeks: number): Date => { const r = new Date(date); r.setDate(r.getDate() + weeks * 7); return r; };
const weeksBetween = (start: Date, end: Date): number => Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
const calculateMDC = (tem: number, cl: number = 0.95): number => tem * Math.sqrt(2) * (cl === 0.95 ? 1.96 : cl === 0.90 ? 1.645 : 2.58);

// Smooth spline interpolation
const catmullRomSpline = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};

const getHazardRatio = (value: number, type: 'fmi' | 'ffmi'): number => {
  const data = MORTALITY_RISK[type].points;
  for (let i = 0; i < data.length - 1; i++) {
    if (value >= data[i].x && value <= data[i + 1].x) {
      const t = (value - data[i].x) / (data[i + 1].x - data[i].x);
      return data[i].hr + t * (data[i + 1].hr - data[i].hr);
    }
  }
  return value < data[0].x ? data[0].hr : data[data.length - 1].hr;
};

// Benchmarks
const FFMI_BENCHMARKS = [
  { range: [0, 18], label: 'Below Avg', color: 'text-red-500', bg: 'bg-red-500/20' },
  { range: [18, 20], label: 'Average', color: 'text-orange-500', bg: 'bg-orange-500/20' },
  { range: [20, 22], label: 'Above Avg', color: 'text-yellow-500', bg: 'bg-yellow-500/20' },
  { range: [22, 24], label: 'Excellent', color: 'text-green-500', bg: 'bg-green-500/20' },
  { range: [24, 26], label: 'Superior', color: 'text-blue-500', bg: 'bg-blue-500/20' },
  { range: [26, 30], label: 'Elite', color: 'text-purple-500', bg: 'bg-purple-500/20' },
];

const FMI_BENCHMARKS_MALE = [
  { range: [0, 3], label: 'Essential', color: 'text-red-500', bg: 'bg-red-500/20' },
  { range: [3, 6], label: 'Athletic', color: 'text-blue-500', bg: 'bg-blue-500/20' },
  { range: [6, 9], label: 'Fitness', color: 'text-green-500', bg: 'bg-green-500/20' },
  { range: [9, 13], label: 'Average', color: 'text-yellow-500', bg: 'bg-yellow-500/20' },
  { range: [13, 100], label: 'Above Avg', color: 'text-orange-500', bg: 'bg-orange-500/20' },
];

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
  
  // Metabolism - RMR
  const [rmrSource, setRmrSource] = useState<'estimated' | 'measured'>('estimated');
  const [measuredRmr, setMeasuredRmr] = useState<number>(1800);
  const [neatLevel, setNeatLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>('light');
  const [tef, setTef] = useState<number>(10);
  const [eee, setEee] = useState<number>(300);
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState<number>(4);
  
  // Goal settings
  const [phaseType, setPhaseType] = useState<'fat_loss' | 'muscle_gain' | 'recomposition'>('fat_loss');
  const [targetMethod, setTargetMethod] = useState<'rate' | 'body_fat' | 'fmi' | 'ffmi' | 'fat_mass' | 'ffm'>('rate');
  
  // Targets
  const [targetBodyFat, setTargetBodyFat] = useState<number>(12);
  const [targetFMI, setTargetFMI] = useState<number>(5);
  const [targetFFMI, setTargetFFMI] = useState<number>(22);
  const [targetFatMass, setTargetFatMass] = useState<number>(20);
  const [targetFFM, setTargetFFM] = useState<number>(150);
  
  // Rate
  const [useCustomRate, setUseCustomRate] = useState<boolean>(false);
  const [customRate, setCustomRate] = useState<number>(0.75);
  const [fatLossRateKey, setFatLossRateKey] = useState<string>('moderate');
  const [muscleGainRateKey, setMuscleGainRateKey] = useState<string>('moderate');
  const [recompExperience, setRecompExperience] = useState<keyof typeof RECOMP_EXPECTATIONS>('intermediate');
  
  // Timeline
  const [startDate, setStartDate] = useState<string>(formatDate(new Date()));
  const [endDate, setEndDate] = useState<string>(formatDate(addWeeks(new Date(), 16)));
  
  // Parameters
  const [proteinLevel, setProteinLevel] = useState<keyof typeof PROTEIN_EFFECT>('high');
  const [trainingLevel, setTrainingLevel] = useState<keyof typeof TRAINING_EFFECT>('moderate');
  const [trainingExperience, setTrainingExperience] = useState<keyof typeof SURPLUS_PARTITIONING>('intermediate');
  const [includeWaterChanges, setIncludeWaterChanges] = useState<boolean>(true);
  const [measurementMethod, setMeasurementMethod] = useState<keyof typeof MEASUREMENT_ERROR>('field_3c');
  const [showCI, setShowCI] = useState<boolean>(true);
  
  // View
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  
  // Derived calculations
  const heightCm = useMemo(() => (heightFt * 12 + heightIn) * 2.54, [heightFt, heightIn]);
  const heightM = heightCm / 100;
  const weightKg = currentWeight * 0.453592;
  
  const estimatedRmr = useMemo(() => {
    return gender === 'male' 
      ? Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5)
      : Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }, [weightKg, heightCm, age, gender]);
  
  const effectiveRmr = rmrSource === 'estimated' ? estimatedRmr : measuredRmr;
  
  const neatEstimates = useMemo(() => ({
    sedentary: Math.round(effectiveRmr * 0.15),
    light: Math.round(effectiveRmr * 0.25),
    moderate: Math.round(effectiveRmr * 0.35),
    active: Math.round(effectiveRmr * 0.45),
    very_active: Math.round(effectiveRmr * 0.55),
  }), [effectiveRmr]);
  
  const tdee = useMemo(() => {
    return Math.round(effectiveRmr + neatEstimates[neatLevel] + (effectiveRmr * tef / 100) + (eee * workoutsPerWeek / 7));
  }, [effectiveRmr, neatEstimates, neatLevel, tef, eee, workoutsPerWeek]);
  
  const currentMetrics = useMemo(() => {
    const fatMassLbs = currentWeight * (currentBodyFat / 100);
    const ffmLbs = currentWeight - fatMassLbs;
    const fatMassKg = fatMassLbs * 0.453592;
    const ffmKg = ffmLbs * 0.453592;
    return {
      fatMassLbs: Math.round(fatMassLbs * 10) / 10,
      ffmLbs: Math.round(ffmLbs * 10) / 10,
      fatMassKg: Math.round(fatMassKg * 10) / 10,
      ffmKg: Math.round(ffmKg * 10) / 10,
      fmi: Math.round((fatMassKg / (heightM * heightM)) * 10) / 10,
      ffmi: Math.round((ffmKg / (heightM * heightM)) * 10) / 10,
    };
  }, [currentWeight, currentBodyFat, heightM]);
  
  const totalWeeks = useMemo(() => weeksBetween(new Date(startDate), new Date(endDate)), [startDate, endDate]);
  
  // Effective rate calculation
  const effectiveRate = useMemo(() => {
    if (useCustomRate) return customRate;
    if (phaseType === 'fat_loss') return RATE_PRESETS.fat_loss[fatLossRateKey as keyof typeof RATE_PRESETS.fat_loss]?.rate || 0.75;
    if (phaseType === 'muscle_gain') return RATE_PRESETS.muscle_gain[muscleGainRateKey as keyof typeof RATE_PRESETS.muscle_gain]?.rate || 0.5;
    return 0;
  }, [useCustomRate, customRate, phaseType, fatLossRateKey, muscleGainRateKey]);
  
  // Target metrics calculation
  const targetMetrics = useMemo(() => {
    let targetWeightLbs: number, targetBfPct: number, targetFatMassLbs: number, targetFfmLbs: number;
    const currentFfmLbs = currentMetrics.ffmLbs;
    const currentFatMassLbs = currentMetrics.fatMassLbs;
    
    if (phaseType === 'recomposition') {
      const recomp = RECOMP_EXPECTATIONS[recompExperience];
      const months = totalWeeks / 4.33;
      targetFatMassLbs = currentFatMassLbs - recomp.monthlyFatLoss * months;
      targetFfmLbs = currentFfmLbs + recomp.monthlyMuscleGain * months;
      targetWeightLbs = targetFfmLbs + targetFatMassLbs;
      targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
    } else if (targetMethod === 'rate') {
      const weeklyChange = currentWeight * (effectiveRate / 100) * (phaseType === 'fat_loss' ? -1 : 1);
      const totalChange = weeklyChange * totalWeeks;
      targetWeightLbs = currentWeight + totalChange;
      
      if (phaseType === 'fat_loss') {
        const preset = RATE_PRESETS.fat_loss[fatLossRateKey as keyof typeof RATE_PRESETS.fat_loss];
        const ffmLossRatio = preset?.ffmLossRatio || 0.15;
        targetFfmLbs = currentFfmLbs - Math.abs(totalChange) * ffmLossRatio;
        targetFatMassLbs = currentFatMassLbs - Math.abs(totalChange) * (1 - ffmLossRatio);
      } else {
        const preset = RATE_PRESETS.muscle_gain[muscleGainRateKey as keyof typeof RATE_PRESETS.muscle_gain];
        const fatGainRatio = preset?.fatGainRatio || 0.45;
        targetFfmLbs = currentFfmLbs + totalChange * (1 - fatGainRatio);
        targetFatMassLbs = currentFatMassLbs + totalChange * fatGainRatio;
      }
      targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
    } else if (targetMethod === 'body_fat') {
      targetBfPct = targetBodyFat;
      targetFfmLbs = currentFfmLbs;
      targetFatMassLbs = (targetBfPct / (100 - targetBfPct)) * targetFfmLbs;
      targetWeightLbs = targetFfmLbs + targetFatMassLbs;
    } else if (targetMethod === 'fmi') {
      const targetFatKg = targetFMI * (heightM * heightM);
      targetFatMassLbs = targetFatKg / 0.453592;
      targetFfmLbs = currentFfmLbs;
      targetWeightLbs = targetFfmLbs + targetFatMassLbs;
      targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
    } else if (targetMethod === 'ffmi') {
      const targetFfmKg = targetFFMI * (heightM * heightM);
      targetFfmLbs = targetFfmKg / 0.453592;
      targetFatMassLbs = currentFatMassLbs;
      targetWeightLbs = targetFfmLbs + targetFatMassLbs;
      targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
    } else if (targetMethod === 'fat_mass') {
      targetFatMassLbs = targetFatMass;
      targetFfmLbs = currentFfmLbs;
      targetWeightLbs = targetFfmLbs + targetFatMassLbs;
      targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
    } else if (targetMethod === 'ffm') {
      targetFfmLbs = targetFFM;
      targetFatMassLbs = currentFatMassLbs;
      targetWeightLbs = targetFfmLbs + targetFatMassLbs;
      targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
    } else {
      targetWeightLbs = currentWeight; targetBfPct = currentBodyFat;
      targetFatMassLbs = currentFatMassLbs; targetFfmLbs = currentFfmLbs;
    }
    
    const targetFfmKg = targetFfmLbs * 0.453592;
    const targetFatMassKg = targetFatMassLbs * 0.453592;
    
    return {
      weightLbs: Math.round(targetWeightLbs * 10) / 10,
      bodyFat: Math.round(Math.max(3, targetBfPct) * 10) / 10,
      fatMassLbs: Math.round(Math.max(5, targetFatMassLbs) * 10) / 10,
      ffmLbs: Math.round(targetFfmLbs * 10) / 10,
      fmi: Math.round((targetFatMassKg / (heightM * heightM)) * 10) / 10,
      ffmi: Math.round((targetFfmKg / (heightM * heightM)) * 10) / 10,
    };
  }, [phaseType, targetMethod, targetBodyFat, targetFMI, targetFFMI, targetFatMass, targetFFM, currentMetrics, currentWeight, effectiveRate, totalWeeks, fatLossRateKey, muscleGainRateKey, recompExperience, heightM, currentBodyFat]);
  
  // Required rate to hit target
  const requiredRate = useMemo(() => {
    const weightChange = targetMetrics.weightLbs - currentWeight;
    const weeklyChange = weightChange / totalWeeks;
    return Math.abs((weeklyChange / currentWeight) * 100);
  }, [targetMetrics, currentWeight, totalWeeks]);
  
  // Feasibility assessment
  const feasibility = useMemo(() => {
    const isLoss = targetMetrics.weightLbs < currentWeight;
    const rate = requiredRate;
    
    if (phaseType === 'recomposition') {
      const exp = RECOMP_EXPECTATIONS[recompExperience];
      return { probability: exp.probability, rating: exp.probability > 60 ? 'High' : exp.probability > 40 ? 'Moderate' : 'Low', 
        message: exp.probability > 60 ? 'Good probability with consistent effort' : 'Challenging - consider dedicated phases' };
    }
    
    if (isLoss) {
      if (rate <= 0.5) return { probability: 95, rating: 'High', message: 'Very achievable with good adherence' };
      if (rate <= 0.75) return { probability: 85, rating: 'High', message: 'Achievable with consistent effort' };
      if (rate <= 1.0) return { probability: 70, rating: 'Moderate', message: 'Challenging but possible' };
      if (rate <= 1.25) return { probability: 50, rating: 'Low', message: 'Aggressive - expect some muscle loss' };
      return { probability: 25, rating: 'Very Low', message: 'Unsustainable rate - extend timeline' };
    } else {
      if (rate <= 0.25) return { probability: 90, rating: 'High', message: 'Lean gains achievable' };
      if (rate <= 0.5) return { probability: 80, rating: 'High', message: 'Good balance of muscle and fat' };
      if (rate <= 0.75) return { probability: 65, rating: 'Moderate', message: 'Expect significant fat gain' };
      return { probability: 40, rating: 'Low', message: 'High fat accumulation expected' };
    }
  }, [targetMetrics, currentWeight, requiredRate, phaseType, recompExperience]);
  
  // Weekly projections
  const weeklyProjections = useMemo(() => {
    const projections: Array<{
      week: number; date: string; weight: number; fatMass: number; ffm: number;
      bodyFat: number; fmi: number; ffmi: number; waterChange: number;
    }> = [];
    
    const totalWeightChange = targetMetrics.weightLbs - currentWeight;
    const isDeficit = totalWeightChange < 0;
    const weeklyChange = totalWeightChange / totalWeeks;
    
    let fm = currentMetrics.fatMassLbs;
    let ffm = currentMetrics.ffmLbs;
    let glycogen = 0;
    
    for (let w = 0; w <= totalWeeks; w++) {
      const date = addWeeks(new Date(startDate), w);
      
      if (w > 0) {
        if (phaseType === 'recomposition') {
          const exp = RECOMP_EXPECTATIONS[recompExperience];
          fm -= exp.monthlyFatLoss / 4.33;
          ffm += exp.monthlyMuscleGain / 4.33;
        } else {
          const pRatio = isDeficit ? (useCustomRate ? 0.15 : 
            (RATE_PRESETS.fat_loss[fatLossRateKey as keyof typeof RATE_PRESETS.fat_loss]?.ffmLossRatio || 0.15)) :
            (1 - SURPLUS_PARTITIONING[trainingExperience].muscleRatio);
          
          if (isDeficit) {
            fm -= Math.abs(weeklyChange) * (1 - pRatio);
            ffm -= Math.abs(weeklyChange) * pRatio;
          } else {
            fm += weeklyChange * pRatio;
            ffm += weeklyChange * (1 - pRatio);
          }
        }
        
        if (includeWaterChanges) {
          glycogen += isDeficit ? (w <= 2 ? -150 : -20) : (w <= 2 ? 100 : 10);
          glycogen = Math.max(-550, Math.min(0, glycogen));
        }
      }
      
      const wt = fm + ffm;
      const fmKg = fm * 0.453592;
      const ffmKg = ffm * 0.453592;
      const waterLbs = includeWaterChanges ? glycogen * 3 / 453.592 : 0;
      
      projections.push({
        week: w, date: formatDate(date),
        weight: Math.round(wt * 10) / 10,
        fatMass: Math.round(fm * 10) / 10,
        ffm: Math.round(ffm * 10) / 10,
        bodyFat: Math.round((fm / wt) * 1000) / 10,
        fmi: Math.round((fmKg / (heightM * heightM)) * 10) / 10,
        ffmi: Math.round((ffmKg / (heightM * heightM)) * 10) / 10,
        waterChange: Math.round(waterLbs * 10) / 10,
      });
    }
    
    return projections;
  }, [currentWeight, currentMetrics, targetMetrics, totalWeeks, startDate, phaseType, recompExperience, fatLossRateKey, trainingExperience, includeWaterChanges, useCustomRate, heightM]);
  
  // Summary stats
  const summary = useMemo(() => {
    const final = weeklyProjections[weeklyProjections.length - 1];
    const initial = weeklyProjections[0];
    return {
      totalWeightChange: Math.round((final.weight - initial.weight) * 10) / 10,
      totalFatChange: Math.round((final.fatMass - initial.fatMass) * 10) / 10,
      totalFFMChange: Math.round((final.ffm - initial.ffm) * 10) / 10,
      pctFromFat: final.weight !== initial.weight ? Math.round(Math.abs((final.fatMass - initial.fatMass) / (final.weight - initial.weight)) * 100) : 0,
      pctFromFFM: final.weight !== initial.weight ? Math.round(Math.abs((final.ffm - initial.ffm) / (final.weight - initial.weight)) * 100) : 0,
    };
  }, [weeklyProjections]);
  
  // Nutrition targets
  const nutritionTargets = useMemo(() => {
    const deficit = (summary.totalWeightChange / totalWeeks * 3500) / 7;
    const cals = Math.round(tdee + deficit);
    const proteinGPerKg = proteinLevel === 'very_high' ? 2.4 : proteinLevel === 'high' ? 1.8 : proteinLevel === 'moderate' ? 1.4 : 1.0;
    const protein = Math.round(weightKg * proteinGPerKg);
    const fatG = Math.round((cals * 0.27) / 9);
    const carbG = Math.round((cals - protein * 4 - fatG * 9) / 4);
    return { calories: cals, protein, carbs: Math.max(50, carbG), fat: fatG, deficit: Math.round(deficit) };
  }, [tdee, summary, totalWeeks, weightKg, proteinLevel]);
  
  // Helper functions
  const getFFMIBenchmark = (v: number) => FFMI_BENCHMARKS.find(b => v >= b.range[0] && v < b.range[1]) || FFMI_BENCHMARKS[0];
  const getFMIBenchmark = (v: number) => FMI_BENCHMARKS_MALE.find(b => v >= b.range[0] && v < b.range[1]) || FMI_BENCHMARKS_MALE[0];

  // Smooth SVG curve generation
  const generateSmoothPath = (points: Array<{x: number; y: number}>, width: number, height: number, padding: number = 10) => {
    if (points.length < 2) return '';
    
    const xVals = points.map(p => p.x);
    const yVals = points.map(p => p.y);
    const minX = Math.min(...xVals), maxX = Math.max(...xVals);
    const minY = Math.min(...yVals) * 0.9, maxY = Math.max(...yVals) * 1.1;
    
    const scaleX = (x: number) => padding + ((x - minX) / (maxX - minX)) * (width - padding * 2);
    const scaleY = (y: number) => height - padding - ((y - minY) / (maxY - minY)) * (height - padding * 2);
    
    let path = `M ${scaleX(points[0].x)} ${scaleY(points[0].y)}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      
      for (let t = 0; t <= 1; t += 0.1) {
        const x = catmullRomSpline(p0.x, p1.x, p2.x, p3.x, t);
        const y = catmullRomSpline(p0.y, p1.y, p2.y, p3.y, t);
        path += ` L ${scaleX(x)} ${scaleY(y)}`;
      }
    }
    
    return path;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-[#00263d] via-[#003a5c] to-[#00263d] p-4 lg:p-6">
        <div className="max-w-[1900px] mx-auto space-y-5">
          {/* Header */}
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-[#c19962] to-[#d4af7a] rounded-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Body Composition Calculator
              </h1>
            </div>
            <p className="text-sm text-white/60 max-w-2xl mx-auto">
              Evidence-based planning with Forbes partitioning, mortality risk visualization, and measurement uncertainty
            </p>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Column 1: Current Stats (3 cols) */}
            <Card className="lg:col-span-3 bg-white/95 backdrop-blur border-0 shadow-xl">
              <CardHeader className="pb-3 bg-gradient-to-r from-[#c19962]/20 to-transparent rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-[#00263d]">
                  <Scale className="h-5 w-5 text-[#c19962]" />
                  Current Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500">Gender</Label>
                    <Select value={gender} onValueChange={(v: 'male' | 'female') => setGender(v)}>
                      <SelectTrigger className="h-9 bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Age</Label>
                    <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200" />
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-slate-500">Height</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input type="number" value={heightFt} onChange={(e) => setHeightFt(Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200 pr-8" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">ft</span>
                    </div>
                    <div className="relative flex-1">
                      <Input type="number" value={heightIn} onChange={(e) => setHeightIn(Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200 pr-8" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">in</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500">Weight (lbs)</Label>
                    <Input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200 font-semibold" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Body Fat %</Label>
                    <Input type="number" step="0.1" value={currentBodyFat} onChange={(e) => setCurrentBodyFat(Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200 font-semibold" />
                  </div>
                </div>
                
                {/* Composition breakdown */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Fat Mass</span>
                    <span className="font-bold text-[#00263d]">{currentMetrics.fatMassLbs} lbs</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Fat-Free Mass</span>
                    <span className="font-bold text-[#00263d]">{currentMetrics.ffmLbs} lbs</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">FMI</span>
                    <Badge className={`${getFMIBenchmark(currentMetrics.fmi).bg} ${getFMIBenchmark(currentMetrics.fmi).color} border-0`}>
                      {currentMetrics.fmi} kg/m²
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">FFMI</span>
                    <Badge className={`${getFFMIBenchmark(currentMetrics.ffmi).bg} ${getFFMIBenchmark(currentMetrics.ffmi).color} border-0`}>
                      {currentMetrics.ffmi} kg/m²
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                {/* RMR Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      Resting Metabolic Rate
                    </Label>
                    <div className="flex gap-1">
                      <Button variant={rmrSource === 'estimated' ? 'default' : 'outline'} size="sm" 
                        onClick={() => setRmrSource('estimated')} 
                        className={`h-6 text-xs px-2 ${rmrSource === 'estimated' ? 'bg-[#00263d]' : ''}`}>Est.</Button>
                      <Button variant={rmrSource === 'measured' ? 'default' : 'outline'} size="sm" 
                        onClick={() => setRmrSource('measured')} 
                        className={`h-6 text-xs px-2 ${rmrSource === 'measured' ? 'bg-[#00263d]' : ''}`}>Meas.</Button>
                    </div>
                  </div>
                  
                  {rmrSource === 'measured' ? (
                    <Input type="number" value={measuredRmr} onChange={(e) => setMeasuredRmr(Number(e.target.value))} 
                      className="h-9 bg-slate-50 border-slate-200 font-semibold" placeholder="Measured RMR" />
                  ) : (
                    <div className="bg-orange-50 rounded-lg p-2 text-center">
                      <span className="text-lg font-bold text-orange-600">{estimatedRmr}</span>
                      <span className="text-xs text-orange-500 ml-1">kcal (Mifflin-St Jeor)</span>
                    </div>
                  )}
                  
                  <Select value={neatLevel} onValueChange={(v: any) => setNeatLevel(v)}>
                    <SelectTrigger className="h-9 bg-slate-50 border-slate-200 text-sm">
                      <SelectValue placeholder="Activity Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (+{neatEstimates.sedentary})</SelectItem>
                      <SelectItem value="light">Light Activity (+{neatEstimates.light})</SelectItem>
                      <SelectItem value="moderate">Moderate Activity (+{neatEstimates.moderate})</SelectItem>
                      <SelectItem value="active">Active (+{neatEstimates.active})</SelectItem>
                      <SelectItem value="very_active">Very Active (+{neatEstimates.very_active})</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <Label className="text-[10px] text-slate-400">TEF %</Label>
                      <Input type="number" value={tef} onChange={(e) => setTef(Number(e.target.value))} className="h-8 text-xs bg-slate-50" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400">EEE/day</Label>
                      <Input type="number" value={eee} onChange={(e) => setEee(Number(e.target.value))} className="h-8 text-xs bg-slate-50" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400">Days/wk</Label>
                      <Input type="number" value={workoutsPerWeek} onChange={(e) => setWorkoutsPerWeek(Number(e.target.value))} className="h-8 text-xs bg-slate-50" min={0} max={7} />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">{tdee}</div>
                    <div className="text-xs text-white/80">Total Daily Energy Expenditure</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 2: Goal & Rate (3 cols) */}
            <Card className="lg:col-span-3 bg-white/95 backdrop-blur border-0 shadow-xl">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/20 to-transparent rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-[#00263d]">
                  <Target className="h-5 w-5 text-blue-500" />
                  Goal & Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Phase Type Selection */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'fat_loss', label: 'Fat Loss', icon: TrendingDown, gradient: 'from-red-500 to-orange-500' },
                    { value: 'muscle_gain', label: 'Build', icon: TrendingUp, gradient: 'from-blue-500 to-cyan-500' },
                    { value: 'recomposition', label: 'Recomp', icon: RefreshCcw, gradient: 'from-purple-500 to-pink-500' },
                  ].map(({ value, label, icon: Icon, gradient }) => (
                    <button
                      key={value}
                      onClick={() => { setPhaseType(value as any); if (value !== 'recomposition') setTargetMethod('rate'); }}
                      className={`relative p-3 rounded-xl transition-all duration-300 ${
                        phaseType === value 
                          ? `bg-gradient-to-br ${gradient} text-white shadow-lg scale-[1.02]` 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mx-auto mb-1 ${phaseType === value ? 'text-white' : 'text-slate-400'}`} />
                      <div className="text-xs font-semibold">{label}</div>
                    </button>
                  ))}
                </div>
                
                <Separator />
                
                {/* Target Method Selection (for fat_loss and muscle_gain) */}
                {phaseType !== 'recomposition' && (
                  <>
                    <div>
                      <Label className="text-xs text-slate-500 mb-2 block">Set Target By</Label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { value: 'rate', label: 'Rate' },
                          { value: 'body_fat', label: 'BF%' },
                          { value: 'fmi', label: 'FMI' },
                          { value: 'ffmi', label: 'FFMI' },
                          { value: 'fat_mass', label: 'FM lbs' },
                          { value: 'ffm', label: 'FFM lbs' },
                        ].map(({ value, label }) => (
                          <Button key={value} variant={targetMethod === value ? 'default' : 'outline'} size="sm"
                            onClick={() => setTargetMethod(value as any)}
                            className={`text-xs h-7 ${targetMethod === value ? 'bg-[#00263d]' : ''}`}>
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <Separator />
                  </>
                )}
                
                {/* Rate/Target Input */}
                {phaseType === 'recomposition' ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Training Experience</Label>
                    {Object.entries(RECOMP_EXPECTATIONS).map(([key, val]) => (
                      <button key={key} onClick={() => setRecompExperience(key as any)}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          recompExperience === key 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                            : 'bg-slate-100 hover:bg-slate-200'
                        }`}>
                        <div className="font-semibold text-sm">{val.label}</div>
                        <div className={`text-xs ${recompExperience === key ? 'text-white/80' : 'text-slate-500'}`}>
                          -{val.monthlyFatLoss} FM / +{val.monthlyMuscleGain} FFM per month
                        </div>
                      </button>
                    ))}
                  </div>
                ) : targetMethod === 'rate' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-500">Custom Rate</Label>
                      <Switch checked={useCustomRate} onCheckedChange={setUseCustomRate} />
                    </div>
                    
                    {useCustomRate ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Slider value={[customRate]} onValueChange={([v]) => setCustomRate(v)} min={0.1} max={1.5} step={0.05} className="flex-1" />
                          <div className="w-16 text-center">
                            <span className="text-lg font-bold text-[#00263d]">{customRate}%</span>
                            <div className="text-[10px] text-slate-400">/week</div>
                          </div>
                        </div>
                        <div className="text-xs text-center text-slate-500">
                          ≈ {Math.round(currentWeight * customRate / 100 * 10) / 10} lbs/week
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(phaseType === 'fat_loss' ? RATE_PRESETS.fat_loss : RATE_PRESETS.muscle_gain).map(([key, val]) => {
                          const isSelected = phaseType === 'fat_loss' ? fatLossRateKey === key : muscleGainRateKey === key;
                          return (
                            <button key={key} 
                              onClick={() => phaseType === 'fat_loss' ? setFatLossRateKey(key) : setMuscleGainRateKey(key)}
                              className={`w-full p-3 rounded-xl text-left transition-all ${
                                isSelected 
                                  ? `bg-gradient-to-r ${phaseType === 'fat_loss' ? 'from-red-500 to-orange-500' : 'from-blue-500 to-cyan-500'} text-white shadow-lg` 
                                  : 'bg-slate-100 hover:bg-slate-200'
                              }`}>
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-sm">{val.label}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-slate-200'}`}>
                                  {val.rate}%/wk
                                </span>
                              </div>
                              <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{val.description}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4">
                      {targetMethod === 'body_fat' && (
                        <div>
                          <Label className="text-xs text-slate-500">Target Body Fat %</Label>
                          <div className="flex items-center gap-3 mt-2">
                            <Slider value={[targetBodyFat]} onValueChange={([v]) => setTargetBodyFat(v)} min={5} max={35} step={0.5} className="flex-1" />
                            <Input type="number" value={targetBodyFat} onChange={(e) => setTargetBodyFat(Number(e.target.value))} className="w-20 h-9" />
                          </div>
                          <div className="text-xs text-slate-400 mt-1">Current: {currentBodyFat}%</div>
                        </div>
                      )}
                      {targetMethod === 'fmi' && (
                        <div>
                          <Label className="text-xs text-slate-500">Target FMI (kg/m²)</Label>
                          <div className="flex items-center gap-3 mt-2">
                            <Slider value={[targetFMI]} onValueChange={([v]) => setTargetFMI(v)} min={2} max={15} step={0.5} className="flex-1" />
                            <Input type="number" value={targetFMI} onChange={(e) => setTargetFMI(Number(e.target.value))} className="w-20 h-9" />
                          </div>
                          <div className="text-xs text-slate-400 mt-1">Current: {currentMetrics.fmi}</div>
                        </div>
                      )}
                      {targetMethod === 'ffmi' && (
                        <div>
                          <Label className="text-xs text-slate-500">Target FFMI (kg/m²)</Label>
                          <div className="flex items-center gap-3 mt-2">
                            <Slider value={[targetFFMI]} onValueChange={([v]) => setTargetFFMI(v)} min={16} max={28} step={0.5} className="flex-1" />
                            <Input type="number" value={targetFFMI} onChange={(e) => setTargetFFMI(Number(e.target.value))} className="w-20 h-9" />
                          </div>
                          <div className="text-xs text-slate-400 mt-1">Current: {currentMetrics.ffmi}</div>
                        </div>
                      )}
                      {targetMethod === 'fat_mass' && (
                        <div>
                          <Label className="text-xs text-slate-500">Target Fat Mass (lbs)</Label>
                          <Input type="number" value={targetFatMass} onChange={(e) => setTargetFatMass(Number(e.target.value))} className="h-9 mt-2" />
                          <div className="text-xs text-slate-400 mt-1">Current: {currentMetrics.fatMassLbs} lbs</div>
                        </div>
                      )}
                      {targetMethod === 'ffm' && (
                        <div>
                          <Label className="text-xs text-slate-500">Target FFM (lbs)</Label>
                          <Input type="number" value={targetFFM} onChange={(e) => setTargetFFM(Number(e.target.value))} className="h-9 mt-2" />
                          <div className="text-xs text-slate-400 mt-1">Current: {currentMetrics.ffmLbs} lbs</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Required rate display */}
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                      <div className="flex items-center gap-2 text-amber-800">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">Required Rate: {requiredRate.toFixed(2)}%/week</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column 3: Timeline & Feasibility (3 cols) */}
            <Card className="lg:col-span-3 bg-white/95 backdrop-blur border-0 shadow-xl">
              <CardHeader className="pb-3 bg-gradient-to-r from-green-500/20 to-transparent rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-[#00263d]">
                  <Calendar className="h-5 w-5 text-green-500" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 bg-slate-50" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">End Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 bg-slate-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-center text-white">
                  <div className="text-3xl font-bold">{totalWeeks}</div>
                  <div className="text-sm opacity-80">weeks ({Math.round(totalWeeks / 4.33)} months)</div>
                </div>
                
                {/* Feasibility */}
                <div className={`rounded-xl p-4 border-2 ${
                  feasibility.probability >= 70 ? 'bg-green-50 border-green-200' :
                  feasibility.probability >= 40 ? 'bg-amber-50 border-amber-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Success Probability</span>
                    <Badge className={`${
                      feasibility.probability >= 70 ? 'bg-green-500' :
                      feasibility.probability >= 40 ? 'bg-amber-500' :
                      'bg-red-500'
                    } text-white`}>
                      {feasibility.probability}%
                    </Badge>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${
                      feasibility.probability >= 70 ? 'bg-green-500' :
                      feasibility.probability >= 40 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`} style={{ width: `${feasibility.probability}%` }} />
                  </div>
                  <p className="text-xs mt-2 text-slate-600">{feasibility.message}</p>
                </div>
                
                <Separator />
                
                {/* Parameters */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 flex items-center gap-1">
                    <Settings2 className="h-3 w-3" />
                    Partitioning Parameters
                  </Label>
                  <Select value={proteinLevel} onValueChange={(v: any) => setProteinLevel(v)}>
                    <SelectTrigger className="h-8 text-xs bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROTEIN_EFFECT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={trainingLevel} onValueChange={(v: any) => setTrainingLevel(v)}>
                    <SelectTrigger className="h-8 text-xs bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRAINING_EFFECT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-500">Water Changes</Label>
                    <Switch checked={includeWaterChanges} onCheckedChange={setIncludeWaterChanges} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-500">Show CI</Label>
                    <Switch checked={showCI} onCheckedChange={setShowCI} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 4: Results (3 cols) */}
            <Card className="lg:col-span-3 bg-white/95 backdrop-blur border-0 shadow-xl">
              <CardHeader className="pb-3 bg-gradient-to-r from-[#c19962]/30 to-transparent rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-[#00263d]">
                  <Zap className="h-5 w-5 text-[#c19962]" />
                  Projected Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Target composition */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-[#00263d]">{targetMetrics.weightLbs}</div>
                    <div className="text-xs text-slate-500">Target Weight</div>
                    <div className={`text-xs mt-1 ${targetMetrics.weightLbs < currentWeight ? 'text-green-500' : 'text-blue-500'}`}>
                      {targetMetrics.weightLbs < currentWeight ? '' : '+'}{(targetMetrics.weightLbs - currentWeight).toFixed(1)} lbs
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-[#00263d]">{targetMetrics.bodyFat}%</div>
                    <div className="text-xs text-slate-500">Body Fat</div>
                    <div className={`text-xs mt-1 ${targetMetrics.bodyFat < currentBodyFat ? 'text-green-500' : 'text-orange-500'}`}>
                      {targetMetrics.bodyFat < currentBodyFat ? '' : '+'}{(targetMetrics.bodyFat - currentBodyFat).toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fat Mass</span>
                    <span className="font-semibold">{targetMetrics.fatMassLbs} lbs 
                      <span className={`ml-1 text-xs ${targetMetrics.fatMassLbs < currentMetrics.fatMassLbs ? 'text-green-500' : 'text-red-500'}`}>
                        ({(targetMetrics.fatMassLbs - currentMetrics.fatMassLbs).toFixed(1)})
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">FFM</span>
                    <span className="font-semibold">{targetMetrics.ffmLbs} lbs 
                      <span className={`ml-1 text-xs ${targetMetrics.ffmLbs >= currentMetrics.ffmLbs ? 'text-green-500' : 'text-red-500'}`}>
                        ({targetMetrics.ffmLbs >= currentMetrics.ffmLbs ? '+' : ''}{(targetMetrics.ffmLbs - currentMetrics.ffmLbs).toFixed(1)})
                      </span>
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-slate-500">FMI</span>
                    <Badge className={`${getFMIBenchmark(targetMetrics.fmi).bg} ${getFMIBenchmark(targetMetrics.fmi).color} border-0`}>
                      {targetMetrics.fmi}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">FFMI</span>
                    <Badge className={`${getFFMIBenchmark(targetMetrics.ffmi).bg} ${getFFMIBenchmark(targetMetrics.ffmi).color} border-0`}>
                      {targetMetrics.ffmi}
                    </Badge>
                  </div>
                </div>
                
                {/* Partitioning bar */}
                <div className="bg-slate-100 rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-2">Weight Change Composition</div>
                  <div className="h-4 rounded-full overflow-hidden flex">
                    <div className="bg-gradient-to-r from-yellow-400 to-amber-500" style={{ width: `${summary.pctFromFat}%` }} />
                    <div className="bg-gradient-to-r from-red-400 to-rose-500" style={{ width: `${summary.pctFromFFM}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-amber-600">● Fat: {summary.pctFromFat}%</span>
                    <span className="text-rose-600">● FFM: {summary.pctFromFFM}%</span>
                  </div>
                </div>
                
                <Separator />
                
                {/* Nutrition */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
                  <div className="text-center mb-3">
                    <div className="text-3xl font-bold">{nutritionTargets.calories}</div>
                    <div className="text-xs opacity-80">
                      {nutritionTargets.deficit < 0 ? `${Math.abs(nutritionTargets.deficit)} cal deficit` : `${nutritionTargets.deficit} cal surplus`}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/20 rounded-lg p-2">
                      <div className="font-bold">{nutritionTargets.protein}g</div>
                      <div className="text-[10px] opacity-80">Protein</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2">
                      <div className="font-bold">{nutritionTargets.carbs}g</div>
                      <div className="text-[10px] opacity-80">Carbs</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2">
                      <div className="font-bold">{nutritionTargets.fat}g</div>
                      <div className="text-[10px] opacity-80">Fat</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Curves */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardHeader className="pb-2 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-[#00263d]">
                  <Heart className="h-5 w-5 text-red-500" />
                  Mortality Risk Analysis
                  <Badge variant="outline" className="ml-2 text-xs">Sedlmeier et al. 2021</Badge>
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Based on 7 prospective cohorts (n=16,155, 14-year median follow-up). Green zone = optimal range for lowest mortality risk.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* FMI Risk Curve */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-[#00263d]">Fat Mass Index (FMI)</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        Current: {currentMetrics.fmi} (HR: {getHazardRatio(currentMetrics.fmi, 'fmi').toFixed(2)})
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#c19962]" />
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        Target: {targetMetrics.fmi} (HR: {getHazardRatio(targetMetrics.fmi, 'fmi').toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 h-56">
                    <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="fmiGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                      </defs>
                      
                      {/* Grid */}
                      {[0.25, 0.5, 0.75].map(pct => (
                        <line key={pct} x1="40" y1={20 + 160 * pct} x2="480" y2={20 + 160 * pct} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />
                      ))}
                      
                      {/* HR=1 reference */}
                      <line x1="40" y1={20 + 160 * (1 - (1 - 0.9) / (3 - 0.9))} x2="480" y2={20 + 160 * (1 - (1 - 0.9) / (3 - 0.9))} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="8,4" />
                      <text x="485" y={20 + 160 * (1 - (1 - 0.9) / (3 - 0.9)) + 4} fontSize="10" fill="#94a3b8">HR=1</text>
                      
                      {/* Optimal zone */}
                      {(() => {
                        const minX = 2, maxX = 20, minY = 0.9, maxY = 3;
                        const scaleX = (x: number) => 40 + ((x - minX) / (maxX - minX)) * 440;
                        const scaleY = (y: number) => 180 - ((y - minY) / (maxY - minY)) * 160;
                        return (
                          <rect x={scaleX(5)} y="20" width={scaleX(9) - scaleX(5)} height="160" fill="#22c55e" fillOpacity="0.15" rx="4" />
                        );
                      })()}
                      
                      {/* Smooth curve */}
                      <path
                        d={generateSmoothPath(MORTALITY_RISK.fmi.points.map(p => ({ x: p.x, y: p.hr })), 440, 160, 0)
                          .replace(/M (\d+\.?\d*) (\d+\.?\d*)/, (_, x, y) => `M ${40 + parseFloat(x)} ${20 + parseFloat(y)}`)
                          .replace(/L (\d+\.?\d*) (\d+\.?\d*)/g, (_, x, y) => `L ${40 + parseFloat(x)} ${20 + parseFloat(y)}`)}
                        fill="none"
                        stroke="url(#fmiGradient)"
                        strokeWidth="0"
                      />
                      <path
                        d={generateSmoothPath(MORTALITY_RISK.fmi.points.map(p => ({ x: p.x, y: p.hr })), 440, 160, 0)
                          .replace(/M (\d+\.?\d*) (\d+\.?\d*)/, (_, x, y) => `M ${40 + parseFloat(x)} ${20 + parseFloat(y)}`)
                          .replace(/L (\d+\.?\d*) (\d+\.?\d*)/g, (_, x, y) => `L ${40 + parseFloat(x)} ${20 + parseFloat(y)}`)}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3"
                        strokeLinecap="round"
                        filter="url(#glow)"
                      />
                      
                      {/* Current position */}
                      {(() => {
                        const minX = 2, maxX = 20, minY = 0.9, maxY = 3;
                        const cx = 40 + ((currentMetrics.fmi - minX) / (maxX - minX)) * 440;
                        const cy = 180 - ((getHazardRatio(currentMetrics.fmi, 'fmi') - minY) / (maxY - minY)) * 160;
                        const tx = 40 + ((targetMetrics.fmi - minX) / (maxX - minX)) * 440;
                        const ty = 180 - ((getHazardRatio(targetMetrics.fmi, 'fmi') - minY) / (maxY - minY)) * 160;
                        return (
                          <>
                            <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#c19962" strokeWidth="2" strokeDasharray="6,3" />
                            <circle cx={cx} cy={cy} r="10" fill="#ef4444" stroke="#fff" strokeWidth="3" filter="url(#glow)" />
                            <circle cx={tx} cy={ty} r="10" fill="#22c55e" stroke="#fff" strokeWidth="3" filter="url(#glow)" />
                          </>
                        );
                      })()}
                      
                      {/* Axis labels */}
                      <text x="260" y="198" fontSize="11" fill="#64748b" textAnchor="middle">Fat Mass Index (kg/m²)</text>
                    </svg>
                  </div>
                </div>
                
                {/* FFMI Risk Curve */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-[#00263d]">Fat-Free Mass Index (FFMI)</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        Current: {currentMetrics.ffmi} (HR: {getHazardRatio(currentMetrics.ffmi, 'ffmi').toFixed(2)})
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#c19962]" />
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        Target: {targetMetrics.ffmi} (HR: {getHazardRatio(targetMetrics.ffmi, 'ffmi').toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 h-56">
                    <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="ffmiGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid */}
                      {[0.25, 0.5, 0.75].map(pct => (
                        <line key={pct} x1="40" y1={20 + 160 * pct} x2="480" y2={20 + 160 * pct} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />
                      ))}
                      
                      {/* HR=1 reference */}
                      <line x1="40" y1={20 + 160 * (1 - (1 - 0.6) / (3.5 - 0.6))} x2="480" y2={20 + 160 * (1 - (1 - 0.6) / (3.5 - 0.6))} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="8,4" />
                      <text x="485" y={20 + 160 * (1 - (1 - 0.6) / (3.5 - 0.6)) + 4} fontSize="10" fill="#94a3b8">HR=1</text>
                      
                      {/* Optimal zone */}
                      {(() => {
                        const minX = 13, maxX = 27, minY = 0.6, maxY = 3.5;
                        const scaleX = (x: number) => 40 + ((x - minX) / (maxX - minX)) * 440;
                        return (
                          <rect x={scaleX(19)} y="20" width={scaleX(24) - scaleX(19)} height="160" fill="#22c55e" fillOpacity="0.15" rx="4" />
                        );
                      })()}
                      
                      {/* Smooth curve */}
                      <path
                        d={generateSmoothPath(MORTALITY_RISK.ffmi.points.map(p => ({ x: p.x, y: p.hr })), 440, 160, 0)
                          .replace(/M (\d+\.?\d*) (\d+\.?\d*)/, (_, x, y) => `M ${40 + parseFloat(x)} ${20 + parseFloat(y)}`)
                          .replace(/L (\d+\.?\d*) (\d+\.?\d*)/g, (_, x, y) => `L ${40 + parseFloat(x)} ${20 + parseFloat(y)}`)}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        filter="url(#glow)"
                      />
                      
                      {/* Current and target positions */}
                      {(() => {
                        const minX = 13, maxX = 27, minY = 0.6, maxY = 3.5;
                        const cx = 40 + ((currentMetrics.ffmi - minX) / (maxX - minX)) * 440;
                        const cy = 180 - ((getHazardRatio(currentMetrics.ffmi, 'ffmi') - minY) / (maxY - minY)) * 160;
                        const tx = 40 + ((targetMetrics.ffmi - minX) / (maxX - minX)) * 440;
                        const ty = 180 - ((getHazardRatio(targetMetrics.ffmi, 'ffmi') - minY) / (maxY - minY)) * 160;
                        return (
                          <>
                            <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#c19962" strokeWidth="2" strokeDasharray="6,3" />
                            <circle cx={cx} cy={cy} r="10" fill="#ef4444" stroke="#fff" strokeWidth="3" filter="url(#glow)" />
                            <circle cx={tx} cy={ty} r="10" fill="#22c55e" stroke="#fff" strokeWidth="3" filter="url(#glow)" />
                          </>
                        );
                      })()}
                      
                      <text x="260" y="198" fontSize="11" fill="#64748b" textAnchor="middle">Fat-Free Mass Index (kg/m²)</text>
                    </svg>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Projection */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-[#00263d]">
                  <LineChart className="h-5 w-5 text-purple-500" />
                  Timeline Projection
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant={viewMode === 'graph' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('graph')}
                    className={`${viewMode === 'graph' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}`}>
                    <LineChart className="h-4 w-4 mr-1" />Graph
                  </Button>
                  <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}
                    className={`${viewMode === 'table' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}`}>
                    <Table className="h-4 w-4 mr-1" />Table
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'graph' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Weight */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4">
                    <div className="font-semibold text-sm text-[#00263d] mb-2">Weight (lbs)</div>
                    <div className="h-44">
                      <svg className="w-full h-full" viewBox="0 0 400 160">
                        <defs>
                          <linearGradient id="weightFill" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[0.25, 0.5, 0.75].map(pct => (
                          <line key={pct} x1="0" y1={160 * pct} x2="400" y2={160 * pct} stroke="#e2e8f0" strokeWidth="1" />
                        ))}
                        {(() => {
                          const weights = weeklyProjections.map(p => p.weight);
                          const min = Math.min(...weights) - 3, max = Math.max(...weights) + 3;
                          const points = weeklyProjections.map((p, i) => ({
                            x: (i / (weeklyProjections.length - 1)) * 400,
                            y: 150 - ((p.weight - min) / (max - min)) * 140
                          }));
                          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                          return (
                            <>
                              <path d={`${pathD} L 400 150 L 0 150 Z`} fill="url(#weightFill)" />
                              <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                              <circle cx={points[0].x} cy={points[0].y} r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
                              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="6" fill="#22c55e" stroke="#fff" strokeWidth="2" />
                              <text x="5" y="15" fontSize="10" fill="#64748b">{max.toFixed(0)}</text>
                              <text x="5" y="150" fontSize="10" fill="#64748b">{min.toFixed(0)}</text>
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                  
                  {/* Composition */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4">
                    <div className="font-semibold text-sm text-[#00263d] mb-2">Fat Mass & FFM (lbs)</div>
                    <div className="h-44">
                      <svg className="w-full h-full" viewBox="0 0 400 160">
                        {[0.25, 0.5, 0.75].map(pct => (
                          <line key={pct} x1="0" y1={160 * pct} x2="400" y2={160 * pct} stroke="#e2e8f0" strokeWidth="1" />
                        ))}
                        {(() => {
                          const allVals = [...weeklyProjections.map(p => p.fatMass), ...weeklyProjections.map(p => p.ffm)];
                          const min = Math.min(...allVals) - 3, max = Math.max(...allVals) + 3;
                          const fmPoints = weeklyProjections.map((p, i) => ({
                            x: (i / (weeklyProjections.length - 1)) * 400,
                            y: 150 - ((p.fatMass - min) / (max - min)) * 140
                          }));
                          const ffmPoints = weeklyProjections.map((p, i) => ({
                            x: (i / (weeklyProjections.length - 1)) * 400,
                            y: 150 - ((p.ffm - min) / (max - min)) * 140
                          }));
                          return (
                            <>
                              <path d={fmPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                              <path d={ffmPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                              <text x="320" y="15" fontSize="9" fill="#f59e0b">● Fat Mass</text>
                              <text x="320" y="28" fontSize="9" fill="#ef4444">● FFM</text>
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                  
                  {/* Body Fat % */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4">
                    <div className="font-semibold text-sm text-[#00263d] mb-2">Body Fat %</div>
                    <div className="h-44">
                      <svg className="w-full h-full" viewBox="0 0 400 160">
                        <defs>
                          <linearGradient id="bfFill" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[0.25, 0.5, 0.75].map(pct => (
                          <line key={pct} x1="0" y1={160 * pct} x2="400" y2={160 * pct} stroke="#e2e8f0" strokeWidth="1" />
                        ))}
                        {(() => {
                          const bfs = weeklyProjections.map(p => p.bodyFat);
                          const min = Math.min(...bfs) - 2, max = Math.max(...bfs) + 2;
                          const points = weeklyProjections.map((p, i) => ({
                            x: (i / (weeklyProjections.length - 1)) * 400,
                            y: 150 - ((p.bodyFat - min) / (max - min)) * 140
                          }));
                          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                          return (
                            <>
                              <path d={`${pathD} L 400 150 L 0 150 Z`} fill="url(#bfFill)" />
                              <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
                              <circle cx={points[0].x} cy={points[0].y} r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
                              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="6" fill="#22c55e" stroke="#fff" strokeWidth="2" />
                              <text x="5" y="15" fontSize="10" fill="#64748b">{max.toFixed(1)}%</text>
                              <text x="5" y="150" fontSize="10" fill="#64748b">{min.toFixed(1)}%</text>
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b-2">
                      <tr className="text-left">
                        <th className="p-2">Week</th>
                        <th className="p-2">Date</th>
                        <th className="p-2 text-right">Weight</th>
                        <th className="p-2 text-right">Fat Mass</th>
                        <th className="p-2 text-right">FFM</th>
                        <th className="p-2 text-right">BF%</th>
                        <th className="p-2 text-right">FMI</th>
                        <th className="p-2 text-right">FFMI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyProjections.map((p, i) => (
                        <tr key={p.week} className={`${i % 2 === 0 ? 'bg-slate-50' : ''} hover:bg-blue-50 transition-colors`}>
                          <td className="p-2 font-medium">{p.week}</td>
                          <td className="p-2 text-slate-500">{p.date}</td>
                          <td className="p-2 text-right font-semibold">{p.weight}</td>
                          <td className="p-2 text-right text-amber-600">{p.fatMass}</td>
                          <td className="p-2 text-right text-red-600">{p.ffm}</td>
                          <td className="p-2 text-right text-green-600">{p.bodyFat}%</td>
                          <td className="p-2 text-right">{p.fmi}</td>
                          <td className="p-2 text-right">{p.ffmi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-white/50 text-xs py-4">
            <p>Evidence-based models: Forbes (2000), Heymsfield (2014), Sedlmeier et al. (2021), Tinsley (2021)</p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
