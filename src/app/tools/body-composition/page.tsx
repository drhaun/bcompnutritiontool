'use client';

import { useState, useMemo } from 'react';
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
  Flame,
  Scale,
  Zap,
  Calendar,
  Table,
  LineChart,
  Settings2,
  RefreshCcw,
  Heart,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';

// =============================================================================
// EVIDENCE-BASED CONSTANTS
// =============================================================================

const RATE_PRESETS = {
  fat_loss: {
    conservative: { rate: 0.5, label: 'Conservative', description: '0.5%/wk - Max retention', ffmLossRatio: 0.10 },
    moderate: { rate: 0.75, label: 'Moderate', description: '0.75%/wk - Balanced', ffmLossRatio: 0.15 },
    aggressive: { rate: 1.0, label: 'Aggressive', description: '1.0%/wk - Faster', ffmLossRatio: 0.25 },
    very_aggressive: { rate: 1.25, label: 'Very Aggressive', description: '1.25%/wk - Contest prep', ffmLossRatio: 0.35 },
  },
  muscle_gain: {
    slow: { rate: 0.25, label: 'Lean Gain', description: '0.25%/wk - Minimal fat', fatGainRatio: 0.30 },
    moderate: { rate: 0.5, label: 'Moderate', description: '0.5%/wk - Balanced', fatGainRatio: 0.45 },
    aggressive: { rate: 0.75, label: 'Aggressive', description: '0.75%/wk - Faster', fatGainRatio: 0.55 },
    very_aggressive: { rate: 1.0, label: 'Max Gain', description: '1.0%/wk - Beginner/bulk', fatGainRatio: 0.65 },
  },
};

const RECOMP_EXPECTATIONS = {
  untrained: { label: 'Untrained (<1 yr)', monthlyFatLoss: 1.5, monthlyMuscleGain: 1.5, probability: 85 },
  novice: { label: 'Novice (1-2 yrs)', monthlyFatLoss: 1.0, monthlyMuscleGain: 0.75, probability: 70 },
  intermediate: { label: 'Intermediate (2-4 yrs)', monthlyFatLoss: 0.75, monthlyMuscleGain: 0.5, probability: 50 },
  advanced: { label: 'Advanced (4+ yrs)', monthlyFatLoss: 0.5, monthlyMuscleGain: 0.25, probability: 25 },
};

const MORTALITY_RISK = {
  fmi: {
    points: [
      { x: 2, hr: 1.8 }, { x: 3, hr: 1.5 }, { x: 4, hr: 1.25 }, { x: 5, hr: 1.1 }, { x: 6, hr: 1.02 },
      { x: 7, hr: 0.98 }, { x: 7.3, hr: 1.0 }, { x: 8, hr: 1.02 }, { x: 9, hr: 1.1 }, { x: 10, hr: 1.2 },
      { x: 11, hr: 1.35 }, { x: 12, hr: 1.45 }, { x: 13, hr: 1.56 }, { x: 14, hr: 1.7 }, { x: 15, hr: 1.85 },
      { x: 16, hr: 2.0 }, { x: 17, hr: 2.2 }, { x: 18, hr: 2.45 }, { x: 19, hr: 2.65 }, { x: 20, hr: 2.8 },
    ],
    optimal: { min: 5, max: 9 },
  },
  ffmi: {
    points: [
      { x: 13, hr: 3.0 }, { x: 14, hr: 2.5 }, { x: 15, hr: 1.5 }, { x: 16, hr: 1.1 }, { x: 16.1, hr: 1.0 },
      { x: 17, hr: 0.9 }, { x: 17.8, hr: 0.83 }, { x: 18.5, hr: 0.78 }, { x: 19.2, hr: 0.73 }, { x: 20, hr: 0.71 },
      { x: 21, hr: 0.70 }, { x: 21.9, hr: 0.70 }, { x: 23, hr: 0.72 }, { x: 24, hr: 0.74 }, { x: 25, hr: 0.76 },
      { x: 26, hr: 0.78 }, { x: 27, hr: 0.82 },
    ],
    optimal: { min: 19, max: 24 },
  },
};

const PROTEIN_EFFECT = {
  low: { label: 'Low (<1.0 g/kg)' },
  moderate: { label: 'Moderate (1.0-1.6 g/kg)' },
  high: { label: 'High (1.6-2.2 g/kg)' },
  very_high: { label: 'Very High (>2.2 g/kg)' },
};

const TRAINING_EFFECT = {
  none: { label: 'None' },
  light: { label: 'Light (1-2x/wk)' },
  moderate: { label: 'Moderate (3-4x/wk)' },
  intense: { label: 'Intense (5-6x/wk)' },
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
  { range: [0, 18], label: 'Below Avg', color: 'text-red-500', bg: 'bg-red-500/10' },
  { range: [18, 20], label: 'Average', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { range: [20, 22], label: 'Above Avg', color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  { range: [22, 24], label: 'Excellent', color: 'text-green-600', bg: 'bg-green-500/10' },
  { range: [24, 26], label: 'Superior', color: 'text-blue-600', bg: 'bg-blue-500/10' },
  { range: [26, 30], label: 'Elite', color: 'text-purple-600', bg: 'bg-purple-500/10' },
];

const FMI_BENCHMARKS_MALE = [
  { range: [0, 3], label: 'Essential', color: 'text-red-500', bg: 'bg-red-500/10' },
  { range: [3, 6], label: 'Athletic', color: 'text-blue-600', bg: 'bg-blue-500/10' },
  { range: [6, 9], label: 'Fitness', color: 'text-green-600', bg: 'bg-green-500/10' },
  { range: [9, 13], label: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  { range: [13, 100], label: 'Above Avg', color: 'text-orange-500', bg: 'bg-orange-500/10' },
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
  
  const effectiveRate = useMemo(() => {
    if (useCustomRate) return customRate;
    if (phaseType === 'fat_loss') return RATE_PRESETS.fat_loss[fatLossRateKey as keyof typeof RATE_PRESETS.fat_loss]?.rate || 0.75;
    if (phaseType === 'muscle_gain') return RATE_PRESETS.muscle_gain[muscleGainRateKey as keyof typeof RATE_PRESETS.muscle_gain]?.rate || 0.5;
    return 0;
  }, [useCustomRate, customRate, phaseType, fatLossRateKey, muscleGainRateKey]);
  
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
  
  const requiredRate = useMemo(() => {
    const weightChange = targetMetrics.weightLbs - currentWeight;
    const weeklyChange = weightChange / totalWeeks;
    return Math.abs((weeklyChange / currentWeight) * 100);
  }, [targetMetrics, currentWeight, totalWeeks]);
  
  const feasibility = useMemo(() => {
    const isLoss = targetMetrics.weightLbs < currentWeight;
    const rate = requiredRate;
    
    if (phaseType === 'recomposition') {
      const exp = RECOMP_EXPECTATIONS[recompExperience];
      return { probability: exp.probability, message: exp.probability > 60 ? 'Good probability with consistent effort' : 'Challenging - consider dedicated phases' };
    }
    
    if (isLoss) {
      if (rate <= 0.5) return { probability: 95, message: 'Very achievable with good adherence' };
      if (rate <= 0.75) return { probability: 85, message: 'Achievable with consistent effort' };
      if (rate <= 1.0) return { probability: 70, message: 'Challenging but possible' };
      if (rate <= 1.25) return { probability: 50, message: 'Aggressive - expect some muscle loss' };
      return { probability: 25, message: 'Unsustainable rate - extend timeline' };
    } else {
      if (rate <= 0.25) return { probability: 90, message: 'Lean gains achievable' };
      if (rate <= 0.5) return { probability: 80, message: 'Good balance of muscle and fat' };
      if (rate <= 0.75) return { probability: 65, message: 'Expect significant fat gain' };
      return { probability: 40, message: 'High fat accumulation expected' };
    }
  }, [targetMetrics, currentWeight, requiredRate, phaseType, recompExperience]);
  
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
  
  const nutritionTargets = useMemo(() => {
    const deficit = (summary.totalWeightChange / totalWeeks * 3500) / 7;
    const cals = Math.round(tdee + deficit);
    const proteinGPerKg = proteinLevel === 'very_high' ? 2.4 : proteinLevel === 'high' ? 1.8 : proteinLevel === 'moderate' ? 1.4 : 1.0;
    const protein = Math.round(weightKg * proteinGPerKg);
    const fatG = Math.round((cals * 0.27) / 9);
    const carbG = Math.round((cals - protein * 4 - fatG * 9) / 4);
    return { calories: cals, protein, carbs: Math.max(50, carbG), fat: fatG, deficit: Math.round(deficit) };
  }, [tdee, summary, totalWeeks, weightKg, proteinLevel]);
  
  const getFFMIBenchmark = (v: number) => FFMI_BENCHMARKS.find(b => v >= b.range[0] && v < b.range[1]) || FFMI_BENCHMARKS[0];
  const getFMIBenchmark = (v: number) => FMI_BENCHMARKS_MALE.find(b => v >= b.range[0] && v < b.range[1]) || FMI_BENCHMARKS_MALE[0];

  // SVG curve helper with smooth bezier
  const createSmoothCurve = (points: Array<{x: number; y: number}>) => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-[#00263d] via-[#003a5c] to-[#00263d] p-4 lg:p-6">
        <div className="max-w-[1920px] mx-auto space-y-4">
          
          {/* Header */}
          <div className="flex items-center justify-center gap-3 py-3">
            <div className="p-2.5 bg-gradient-to-br from-[#c19962] to-[#d4af7a] rounded-xl shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Body Composition Calculator</h1>
              <p className="text-xs text-white/50">Evidence-based planning with Forbes partitioning & mortality risk visualization</p>
            </div>
          </div>

          {/* Main Grid - 4 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            
            {/* Card 1: Current Stats */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="p-1.5 bg-[#c19962]/10 rounded-lg">
                    <Scale className="h-4 w-4 text-[#c19962]" />
                  </div>
                  Current Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Gender</Label>
                    <Select value={gender} onValueChange={(v: 'male' | 'female') => setGender(v)}>
                      <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Age</Label>
                    <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200 rounded-lg" />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Height</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input type="number" value={heightFt} onChange={(e) => setHeightFt(Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200 rounded-lg pr-7" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">ft</span>
                    </div>
                    <div className="relative flex-1">
                      <Input type="number" value={heightIn} onChange={(e) => setHeightIn(Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200 rounded-lg pr-7" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">in</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Weight (lbs)</Label>
                    <Input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200 rounded-lg font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Body Fat %</Label>
                    <Input type="number" step="0.1" value={currentBodyFat} onChange={(e) => setCurrentBodyFat(Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200 rounded-lg font-semibold" />
                  </div>
                </div>
                
                {/* Composition */}
                <div className="bg-slate-50 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Fat Mass</span>
                    <span className="font-bold text-sm text-[#00263d]">{currentMetrics.fatMassLbs} lbs</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Fat-Free Mass</span>
                    <span className="font-bold text-sm text-[#00263d]">{currentMetrics.ffmLbs} lbs</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">FMI</span>
                    <Badge className={`${getFMIBenchmark(currentMetrics.fmi).bg} ${getFMIBenchmark(currentMetrics.fmi).color} border-0 font-semibold`}>
                      {currentMetrics.fmi} kg/m²
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">FFMI</span>
                    <Badge className={`${getFFMIBenchmark(currentMetrics.ffmi).bg} ${getFFMIBenchmark(currentMetrics.ffmi).color} border-0 font-semibold`}>
                      {currentMetrics.ffmi} kg/m²
                    </Badge>
                  </div>
                </div>
                
                {/* RMR Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      Resting Metabolic Rate
                    </Label>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200">
                      <button onClick={() => setRmrSource('estimated')} 
                        className={`px-2.5 py-1 text-xs font-medium transition-colors ${rmrSource === 'estimated' ? 'bg-[#00263d] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                        Est.
                      </button>
                      <button onClick={() => setRmrSource('measured')} 
                        className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-slate-200 ${rmrSource === 'measured' ? 'bg-[#00263d] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                        Meas.
                      </button>
                    </div>
                  </div>
                  
                  {rmrSource === 'measured' ? (
                    <Input type="number" value={measuredRmr} onChange={(e) => setMeasuredRmr(Number(e.target.value))} 
                      className="h-9 bg-slate-50 border-slate-200 rounded-lg font-semibold" placeholder="Measured RMR" />
                  ) : (
                    <div className="bg-orange-50 rounded-lg p-2.5 text-center border border-orange-100">
                      <span className="text-lg font-bold text-orange-600">{estimatedRmr}</span>
                      <span className="text-xs text-orange-500 ml-1.5">kcal (Mifflin-St Jeor)</span>
                    </div>
                  )}
                  
                  <Select value={neatLevel} onValueChange={(v: any) => setNeatLevel(v)}>
                    <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-sm">
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
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">TEF %</Label>
                      <Input type="number" value={tef} onChange={(e) => setTef(Number(e.target.value))} className="h-8 text-xs bg-slate-50 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">EEE/day</Label>
                      <Input type="number" value={eee} onChange={(e) => setEee(Number(e.target.value))} className="h-8 text-xs bg-slate-50 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Days/wk</Label>
                      <Input type="number" value={workoutsPerWeek} onChange={(e) => setWorkoutsPerWeek(Number(e.target.value))} className="h-8 text-xs bg-slate-50 rounded-lg" min={0} max={7} />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-3.5 text-center shadow-md">
                    <div className="text-2xl font-bold text-white">{tdee}</div>
                    <div className="text-xs text-white/80">Total Daily Energy Expenditure</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Goal & Rate */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg">
                    <Target className="h-4 w-4 text-blue-500" />
                  </div>
                  Goal & Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Phase Type */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'fat_loss', label: 'Fat Loss', icon: TrendingDown, color: 'from-red-500 to-orange-500', iconColor: 'text-red-500', bgColor: 'bg-red-50' },
                    { value: 'muscle_gain', label: 'Build', icon: TrendingUp, color: 'from-blue-500 to-cyan-500', iconColor: 'text-blue-500', bgColor: 'bg-blue-50' },
                    { value: 'recomposition', label: 'Recomp', icon: RefreshCcw, color: 'from-purple-500 to-pink-500', iconColor: 'text-purple-500', bgColor: 'bg-purple-50' },
                  ].map(({ value, label, icon: Icon, color, iconColor, bgColor }) => (
                    <button
                      key={value}
                      onClick={() => { setPhaseType(value as any); if (value !== 'recomposition') setTargetMethod('rate'); }}
                      className={`relative p-3 rounded-xl transition-all duration-200 ${
                        phaseType === value 
                          ? `bg-gradient-to-br ${color} text-white shadow-lg` 
                          : `${bgColor} hover:shadow-md`
                      }`}
                    >
                      <Icon className={`h-5 w-5 mx-auto mb-1 ${phaseType === value ? 'text-white' : iconColor}`} />
                      <div className={`text-xs font-semibold ${phaseType === value ? 'text-white' : 'text-slate-700'}`}>{label}</div>
                    </button>
                  ))}
                </div>
                
                {/* Target Method (non-recomp) */}
                {phaseType !== 'recomposition' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500">Set Target By</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { value: 'rate', label: 'Rate' },
                        { value: 'body_fat', label: 'BF%' },
                        { value: 'fmi', label: 'FMI' },
                        { value: 'ffmi', label: 'FFMI' },
                        { value: 'fat_mass', label: 'FM lbs' },
                        { value: 'ffm', label: 'FFM lbs' },
                      ].map(({ value, label }) => (
                        <button key={value} 
                          onClick={() => setTargetMethod(value as any)}
                          className={`text-xs font-medium h-7 rounded-lg transition-colors ${
                            targetMethod === value 
                              ? 'bg-[#00263d] text-white' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <Separator />
                
                {/* Rate/Target Controls */}
                {phaseType === 'recomposition' ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500">Training Experience</Label>
                    <div className="space-y-1.5">
                      {Object.entries(RECOMP_EXPECTATIONS).map(([key, val]) => (
                        <button key={key} onClick={() => setRecompExperience(key as any)}
                          className={`w-full p-3 rounded-xl text-left transition-all ${
                            recompExperience === key 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' 
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}>
                          <div className="font-semibold text-sm">{val.label}</div>
                          <div className={`text-xs ${recompExperience === key ? 'text-white/80' : 'text-slate-500'}`}>
                            -{val.monthlyFatLoss} FM / +{val.monthlyMuscleGain} FFM per month
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : targetMethod === 'rate' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-slate-500">Custom Rate</Label>
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
                      <div className="space-y-1.5">
                        {Object.entries(phaseType === 'fat_loss' ? RATE_PRESETS.fat_loss : RATE_PRESETS.muscle_gain).map(([key, val]) => {
                          const isSelected = phaseType === 'fat_loss' ? fatLossRateKey === key : muscleGainRateKey === key;
                          const gradient = phaseType === 'fat_loss' ? 'from-red-500 to-orange-500' : 'from-blue-500 to-cyan-500';
                          return (
                            <button key={key} 
                              onClick={() => phaseType === 'fat_loss' ? setFatLossRateKey(key) : setMuscleGainRateKey(key)}
                              className={`w-full p-3 rounded-xl text-left transition-all ${
                                isSelected 
                                  ? `bg-gradient-to-r ${gradient} text-white shadow-md` 
                                  : 'bg-slate-50 hover:bg-slate-100'
                              }`}>
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-sm">{val.label}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                  {val.rate}%/wk
                                </span>
                              </div>
                              <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{val.description}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-xl p-4">
                      {targetMethod === 'body_fat' && (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-slate-500">Target Body Fat %</Label>
                          <div className="flex items-center gap-3">
                            <Slider value={[targetBodyFat]} onValueChange={([v]) => setTargetBodyFat(v)} min={5} max={35} step={0.5} className="flex-1" />
                            <Input type="number" value={targetBodyFat} onChange={(e) => setTargetBodyFat(Number(e.target.value))} className="w-20 h-9 rounded-lg" />
                          </div>
                          <div className="text-xs text-slate-400">Current: {currentBodyFat}%</div>
                        </div>
                      )}
                      {targetMethod === 'fmi' && (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-slate-500">Target FMI (kg/m²)</Label>
                          <div className="flex items-center gap-3">
                            <Slider value={[targetFMI]} onValueChange={([v]) => setTargetFMI(v)} min={2} max={15} step={0.5} className="flex-1" />
                            <Input type="number" value={targetFMI} onChange={(e) => setTargetFMI(Number(e.target.value))} className="w-20 h-9 rounded-lg" />
                          </div>
                          <div className="text-xs text-slate-400">Current: {currentMetrics.fmi}</div>
                        </div>
                      )}
                      {targetMethod === 'ffmi' && (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-slate-500">Target FFMI (kg/m²)</Label>
                          <div className="flex items-center gap-3">
                            <Slider value={[targetFFMI]} onValueChange={([v]) => setTargetFFMI(v)} min={16} max={28} step={0.5} className="flex-1" />
                            <Input type="number" value={targetFFMI} onChange={(e) => setTargetFFMI(Number(e.target.value))} className="w-20 h-9 rounded-lg" />
                          </div>
                          <div className="text-xs text-slate-400">Current: {currentMetrics.ffmi}</div>
                        </div>
                      )}
                      {targetMethod === 'fat_mass' && (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-slate-500">Target Fat Mass (lbs)</Label>
                          <Input type="number" value={targetFatMass} onChange={(e) => setTargetFatMass(Number(e.target.value))} className="h-9 rounded-lg" />
                          <div className="text-xs text-slate-400">Current: {currentMetrics.fatMassLbs} lbs</div>
                        </div>
                      )}
                      {targetMethod === 'ffm' && (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-slate-500">Target FFM (lbs)</Label>
                          <Input type="number" value={targetFFM} onChange={(e) => setTargetFFM(Number(e.target.value))} className="h-9 rounded-lg" />
                          <div className="text-xs text-slate-400">Current: {currentMetrics.ffmLbs} lbs</div>
                        </div>
                      )}
                    </div>
                    
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

            {/* Card 3: Timeline */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="p-1.5 bg-green-500/10 rounded-lg">
                    <Calendar className="h-4 w-4 text-green-500" />
                  </div>
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 bg-slate-50 rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">End Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 bg-slate-50 rounded-lg" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-center shadow-md">
                  <div className="text-3xl font-bold text-white">{totalWeeks}</div>
                  <div className="text-sm text-white/80">weeks ({Math.round(totalWeeks / 4.33)} months)</div>
                </div>
                
                {/* Feasibility */}
                <div className={`rounded-xl p-4 border ${
                  feasibility.probability >= 70 ? 'bg-green-50 border-green-200' :
                  feasibility.probability >= 40 ? 'bg-amber-50 border-amber-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">Success Probability</span>
                    <Badge className={`${
                      feasibility.probability >= 70 ? 'bg-green-500' :
                      feasibility.probability >= 40 ? 'bg-amber-500' :
                      'bg-red-500'
                    } text-white border-0`}>
                      {feasibility.probability}%
                    </Badge>
                  </div>
                  <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 rounded-full ${
                      feasibility.probability >= 70 ? 'bg-green-500' :
                      feasibility.probability >= 40 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`} style={{ width: `${feasibility.probability}%` }} />
                  </div>
                  <p className="text-xs mt-2 text-slate-600">{feasibility.message}</p>
                </div>
                
                <Separator />
                
                {/* Parameters */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" />
                    Partitioning Parameters
                  </Label>
                  <Select value={proteinLevel} onValueChange={(v: any) => setProteinLevel(v)}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROTEIN_EFFECT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={trainingLevel} onValueChange={(v: any) => setTrainingLevel(v)}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRAINING_EFFECT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between py-1">
                    <Label className="text-xs text-slate-500">Water Changes</Label>
                    <Switch checked={includeWaterChanges} onCheckedChange={setIncludeWaterChanges} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <Label className="text-xs text-slate-500">Show CI</Label>
                    <Switch checked={showCI} onCheckedChange={setShowCI} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Projected Results */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="p-1.5 bg-[#c19962]/10 rounded-lg">
                    <Zap className="h-4 w-4 text-[#c19962]" />
                  </div>
                  Projected Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-[#00263d]">{targetMetrics.weightLbs}</div>
                    <div className="text-xs text-slate-500">Target Weight</div>
                    <div className={`text-xs mt-1 font-medium ${targetMetrics.weightLbs < currentWeight ? 'text-green-600' : 'text-blue-600'}`}>
                      {targetMetrics.weightLbs < currentWeight ? '' : '+'}{(targetMetrics.weightLbs - currentWeight).toFixed(1)} lbs
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-[#00263d]">{targetMetrics.bodyFat}%</div>
                    <div className="text-xs text-slate-500">Body Fat</div>
                    <div className={`text-xs mt-1 font-medium ${targetMetrics.bodyFat < currentBodyFat ? 'text-green-600' : 'text-orange-600'}`}>
                      {targetMetrics.bodyFat < currentBodyFat ? '' : '+'}{(targetMetrics.bodyFat - currentBodyFat).toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-3.5 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fat Mass</span>
                    <span className="font-semibold text-[#00263d]">{targetMetrics.fatMassLbs} lbs 
                      <span className={`ml-1.5 text-xs font-medium ${targetMetrics.fatMassLbs < currentMetrics.fatMassLbs ? 'text-green-600' : 'text-red-500'}`}>
                        ({(targetMetrics.fatMassLbs - currentMetrics.fatMassLbs).toFixed(1)})
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">FFM</span>
                    <span className="font-semibold text-[#00263d]">{targetMetrics.ffmLbs} lbs 
                      <span className={`ml-1.5 text-xs font-medium ${targetMetrics.ffmLbs >= currentMetrics.ffmLbs ? 'text-green-600' : 'text-red-500'}`}>
                        ({targetMetrics.ffmLbs >= currentMetrics.ffmLbs ? '+' : ''}{(targetMetrics.ffmLbs - currentMetrics.ffmLbs).toFixed(1)})
                      </span>
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">FMI</span>
                    <Badge className={`${getFMIBenchmark(targetMetrics.fmi).bg} ${getFMIBenchmark(targetMetrics.fmi).color} border-0 font-semibold`}>
                      {targetMetrics.fmi}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">FFMI</span>
                    <Badge className={`${getFFMIBenchmark(targetMetrics.ffmi).bg} ${getFFMIBenchmark(targetMetrics.ffmi).color} border-0 font-semibold`}>
                      {targetMetrics.ffmi}
                    </Badge>
                  </div>
                </div>
                
                {/* Partitioning bar */}
                <div className="bg-slate-50 rounded-xl p-3.5">
                  <div className="text-xs text-slate-500 mb-2">Weight Change Composition</div>
                  <div className="h-3 rounded-full overflow-hidden flex bg-slate-200">
                    <div className="bg-gradient-to-r from-amber-400 to-amber-500 transition-all" style={{ width: `${summary.pctFromFat}%` }} />
                    <div className="bg-gradient-to-r from-rose-400 to-rose-500 transition-all" style={{ width: `${summary.pctFromFFM}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-amber-600 font-medium">● Fat: {summary.pctFromFat}%</span>
                    <span className="text-rose-600 font-medium">● FFM: {summary.pctFromFFM}%</span>
                  </div>
                </div>
                
                {/* Nutrition */}
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white shadow-md">
                  <div className="text-center mb-3">
                    <div className="text-3xl font-bold">{nutritionTargets.calories}</div>
                    <div className="text-xs text-white/80">
                      {nutritionTargets.deficit < 0 ? `${Math.abs(nutritionTargets.deficit)} cal deficit` : `${nutritionTargets.deficit} cal surplus`}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/15 rounded-lg p-2">
                      <div className="font-bold">{nutritionTargets.protein}g</div>
                      <div className="text-[10px] text-white/70">Protein</div>
                    </div>
                    <div className="bg-white/15 rounded-lg p-2">
                      <div className="font-bold">{nutritionTargets.carbs}g</div>
                      <div className="text-[10px] text-white/70">Carbs</div>
                    </div>
                    <div className="bg-white/15 rounded-lg p-2">
                      <div className="font-bold">{nutritionTargets.fat}g</div>
                      <div className="text-[10px] text-white/70">Fat</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Curves */}
          <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="p-1.5 bg-red-500/10 rounded-lg">
                    <Heart className="h-4 w-4 text-red-500" />
                  </div>
                  Mortality Risk Analysis
                  <Badge variant="outline" className="ml-2 text-[10px] font-medium">Sedlmeier et al. 2021</Badge>
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Based on 7 prospective cohorts (n=16,155, 14-year median follow-up). Green zone = optimal range.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* FMI Risk Curve */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#00263d]">Fat Mass Index (FMI)</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        Current: {currentMetrics.fmi}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#c19962]" />
                      <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        Target: {targetMetrics.fmi}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 h-52">
                    <svg className="w-full h-full" viewBox="0 0 480 180" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="fmiCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="50%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                        <filter id="glow1" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur"/>
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                      </defs>
                      
                      {/* Grid */}
                      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                        <line key={pct} x1="50" y1={15 + 140 * pct} x2="460" y2={15 + 140 * pct} stroke="#e2e8f0" strokeWidth="1" />
                      ))}
                      
                      {/* Optimal zone */}
                      {(() => {
                        const minX = 2, maxX = 20;
                        const scaleX = (x: number) => 50 + ((x - minX) / (maxX - minX)) * 410;
                        return <rect x={scaleX(5)} y="15" width={scaleX(9) - scaleX(5)} height="140" fill="#22c55e" fillOpacity="0.12" rx="6" />;
                      })()}
                      
                      {/* HR=1 line */}
                      {(() => {
                        const minY = 0.9, maxY = 3;
                        const y = 155 - ((1 - minY) / (maxY - minY)) * 140;
                        return (
                          <>
                            <line x1="50" y1={y} x2="460" y2={y} stroke="#94a3b8" strokeWidth="1" strokeDasharray="6,3" />
                            <text x="465" y={y + 3} fontSize="9" fill="#94a3b8">HR=1</text>
                          </>
                        );
                      })()}
                      
                      {/* Smooth curve */}
                      {(() => {
                        const minX = 2, maxX = 20, minY = 0.9, maxY = 3;
                        const points = MORTALITY_RISK.fmi.points.map(p => ({
                          x: 50 + ((p.x - minX) / (maxX - minX)) * 410,
                          y: 155 - ((p.hr - minY) / (maxY - minY)) * 140
                        }));
                        const path = createSmoothCurve(points);
                        
                        const cx = 50 + ((currentMetrics.fmi - minX) / (maxX - minX)) * 410;
                        const cy = 155 - ((getHazardRatio(currentMetrics.fmi, 'fmi') - minY) / (maxY - minY)) * 140;
                        const tx = 50 + ((targetMetrics.fmi - minX) / (maxX - minX)) * 410;
                        const ty = 155 - ((getHazardRatio(targetMetrics.fmi, 'fmi') - minY) / (maxY - minY)) * 140;
                        
                        return (
                          <>
                            <path d={path} fill="none" stroke="url(#fmiCurveGrad)" strokeWidth="3.5" strokeLinecap="round" filter="url(#glow1)" />
                            <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#c19962" strokeWidth="2" strokeDasharray="5,3" />
                            <circle cx={cx} cy={cy} r="8" fill="#ef4444" stroke="#fff" strokeWidth="2.5" />
                            <circle cx={tx} cy={ty} r="8" fill="#22c55e" stroke="#fff" strokeWidth="2.5" />
                          </>
                        );
                      })()}
                      
                      {/* Axis labels */}
                      <text x="255" y="175" fontSize="10" fill="#64748b" textAnchor="middle" fontWeight="500">Fat Mass Index (kg/m²)</text>
                      <text x="25" y="90" fontSize="9" fill="#64748b" textAnchor="middle" transform="rotate(-90, 25, 90)">Hazard Ratio</text>
                    </svg>
                  </div>
                </div>
                
                {/* FFMI Risk Curve */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#00263d]">Fat-Free Mass Index (FFMI)</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        Current: {currentMetrics.ffmi}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#c19962]" />
                      <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        Target: {targetMetrics.ffmi}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 h-52">
                    <svg className="w-full h-full" viewBox="0 0 480 180" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="ffmiCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="50%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid */}
                      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                        <line key={pct} x1="50" y1={15 + 140 * pct} x2="460" y2={15 + 140 * pct} stroke="#e2e8f0" strokeWidth="1" />
                      ))}
                      
                      {/* Optimal zone */}
                      {(() => {
                        const minX = 13, maxX = 27;
                        const scaleX = (x: number) => 50 + ((x - minX) / (maxX - minX)) * 410;
                        return <rect x={scaleX(19)} y="15" width={scaleX(24) - scaleX(19)} height="140" fill="#22c55e" fillOpacity="0.12" rx="6" />;
                      })()}
                      
                      {/* HR=1 line */}
                      {(() => {
                        const minY = 0.6, maxY = 3.5;
                        const y = 155 - ((1 - minY) / (maxY - minY)) * 140;
                        return (
                          <>
                            <line x1="50" y1={y} x2="460" y2={y} stroke="#94a3b8" strokeWidth="1" strokeDasharray="6,3" />
                            <text x="465" y={y + 3} fontSize="9" fill="#94a3b8">HR=1</text>
                          </>
                        );
                      })()}
                      
                      {/* Smooth curve */}
                      {(() => {
                        const minX = 13, maxX = 27, minY = 0.6, maxY = 3.5;
                        const points = MORTALITY_RISK.ffmi.points.map(p => ({
                          x: 50 + ((p.x - minX) / (maxX - minX)) * 410,
                          y: 155 - ((p.hr - minY) / (maxY - minY)) * 140
                        }));
                        const path = createSmoothCurve(points);
                        
                        const cx = 50 + ((currentMetrics.ffmi - minX) / (maxX - minX)) * 410;
                        const cy = 155 - ((getHazardRatio(currentMetrics.ffmi, 'ffmi') - minY) / (maxY - minY)) * 140;
                        const tx = 50 + ((targetMetrics.ffmi - minX) / (maxX - minX)) * 410;
                        const ty = 155 - ((getHazardRatio(targetMetrics.ffmi, 'ffmi') - minY) / (maxY - minY)) * 140;
                        
                        return (
                          <>
                            <path d={path} fill="none" stroke="url(#ffmiCurveGrad)" strokeWidth="3.5" strokeLinecap="round" filter="url(#glow1)" />
                            <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#c19962" strokeWidth="2" strokeDasharray="5,3" />
                            <circle cx={cx} cy={cy} r="8" fill="#ef4444" stroke="#fff" strokeWidth="2.5" />
                            <circle cx={tx} cy={ty} r="8" fill="#22c55e" stroke="#fff" strokeWidth="2.5" />
                          </>
                        );
                      })()}
                      
                      <text x="255" y="175" fontSize="10" fill="#64748b" textAnchor="middle" fontWeight="500">Fat-Free Mass Index (kg/m²)</text>
                      <text x="25" y="90" fontSize="9" fill="#64748b" textAnchor="middle" transform="rotate(-90, 25, 90)">Hazard Ratio</text>
                    </svg>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Projection */}
          <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg">
                    <LineChart className="h-4 w-4 text-purple-500" />
                  </div>
                  Timeline Projection
                </CardTitle>
                <div className="flex rounded-lg overflow-hidden border border-slate-200">
                  <button onClick={() => setViewMode('graph')}
                    className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${viewMode === 'graph' ? 'bg-purple-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <LineChart className="h-3.5 w-3.5" />Graph
                  </button>
                  <button onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors border-l border-slate-200 ${viewMode === 'table' ? 'bg-purple-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <Table className="h-3.5 w-3.5" />Table
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {viewMode === 'graph' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Weight */}
                  <div className="space-y-2">
                    <div className="font-semibold text-sm text-[#00263d]">Weight (lbs)</div>
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 h-48">
                      <svg className="w-full h-full" viewBox="0 0 380 160" preserveAspectRatio="xMidYMid meet">
                        <defs>
                          <linearGradient id="weightFill" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[0.25, 0.5, 0.75].map(pct => (
                          <line key={pct} x1="30" y1={10 + 130 * pct} x2="370" y2={10 + 130 * pct} stroke="#e2e8f0" strokeWidth="1" />
                        ))}
                        {(() => {
                          const weights = weeklyProjections.map(p => p.weight);
                          const min = Math.min(...weights) - 3, max = Math.max(...weights) + 3;
                          const points = weeklyProjections.map((p, i) => ({
                            x: 30 + (i / Math.max(1, weeklyProjections.length - 1)) * 340,
                            y: 140 - ((p.weight - min) / (max - min)) * 130
                          }));
                          const path = createSmoothCurve(points);
                          const areaPath = path + ` L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`;
                          return (
                            <>
                              <path d={areaPath} fill="url(#weightFill)" />
                              <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                              <circle cx={points[0].x} cy={points[0].y} r="5" fill="#ef4444" stroke="#fff" strokeWidth="2" />
                              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="5" fill="#22c55e" stroke="#fff" strokeWidth="2" />
                              <text x="35" y="18" fontSize="9" fill="#64748b">{max.toFixed(0)}</text>
                              <text x="35" y="145" fontSize="9" fill="#64748b">{min.toFixed(0)}</text>
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                  
                  {/* Composition */}
                  <div className="space-y-2">
                    <div className="font-semibold text-sm text-[#00263d]">Fat Mass & FFM (lbs)</div>
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 h-48">
                      <svg className="w-full h-full" viewBox="0 0 380 160" preserveAspectRatio="xMidYMid meet">
                        {[0.25, 0.5, 0.75].map(pct => (
                          <line key={pct} x1="30" y1={10 + 130 * pct} x2="370" y2={10 + 130 * pct} stroke="#e2e8f0" strokeWidth="1" />
                        ))}
                        {(() => {
                          const allVals = [...weeklyProjections.map(p => p.fatMass), ...weeklyProjections.map(p => p.ffm)];
                          const min = Math.min(...allVals) - 3, max = Math.max(...allVals) + 3;
                          const fmPoints = weeklyProjections.map((p, i) => ({
                            x: 30 + (i / Math.max(1, weeklyProjections.length - 1)) * 340,
                            y: 140 - ((p.fatMass - min) / (max - min)) * 130
                          }));
                          const ffmPoints = weeklyProjections.map((p, i) => ({
                            x: 30 + (i / Math.max(1, weeklyProjections.length - 1)) * 340,
                            y: 140 - ((p.ffm - min) / (max - min)) * 130
                          }));
                          return (
                            <>
                              <path d={createSmoothCurve(fmPoints)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                              <path d={createSmoothCurve(ffmPoints)} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                              <text x="290" y="18" fontSize="9" fill="#f59e0b" fontWeight="500">● Fat Mass</text>
                              <text x="290" y="30" fontSize="9" fill="#ef4444" fontWeight="500">● FFM</text>
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                  
                  {/* Body Fat % */}
                  <div className="space-y-2">
                    <div className="font-semibold text-sm text-[#00263d]">Body Fat %</div>
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 h-48">
                      <svg className="w-full h-full" viewBox="0 0 380 160" preserveAspectRatio="xMidYMid meet">
                        <defs>
                          <linearGradient id="bfFill" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[0.25, 0.5, 0.75].map(pct => (
                          <line key={pct} x1="30" y1={10 + 130 * pct} x2="370" y2={10 + 130 * pct} stroke="#e2e8f0" strokeWidth="1" />
                        ))}
                        {(() => {
                          const bfs = weeklyProjections.map(p => p.bodyFat);
                          const min = Math.min(...bfs) - 2, max = Math.max(...bfs) + 2;
                          const points = weeklyProjections.map((p, i) => ({
                            x: 30 + (i / Math.max(1, weeklyProjections.length - 1)) * 340,
                            y: 140 - ((p.bodyFat - min) / (max - min)) * 130
                          }));
                          const path = createSmoothCurve(points);
                          const areaPath = path + ` L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`;
                          return (
                            <>
                              <path d={areaPath} fill="url(#bfFill)" />
                              <path d={path} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
                              <circle cx={points[0].x} cy={points[0].y} r="5" fill="#ef4444" stroke="#fff" strokeWidth="2" />
                              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="5" fill="#22c55e" stroke="#fff" strokeWidth="2" />
                              <text x="35" y="18" fontSize="9" fill="#64748b">{max.toFixed(1)}%</text>
                              <text x="35" y="145" fontSize="9" fill="#64748b">{min.toFixed(1)}%</text>
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
                    <thead className="sticky top-0 bg-white border-b-2 border-slate-100">
                      <tr className="text-left text-slate-500">
                        <th className="p-3 font-medium">Week</th>
                        <th className="p-3 font-medium">Date</th>
                        <th className="p-3 text-right font-medium">Weight</th>
                        <th className="p-3 text-right font-medium">Fat Mass</th>
                        <th className="p-3 text-right font-medium">FFM</th>
                        <th className="p-3 text-right font-medium">BF%</th>
                        <th className="p-3 text-right font-medium">FMI</th>
                        <th className="p-3 text-right font-medium">FFMI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyProjections.map((p, i) => (
                        <tr key={p.week} className={`${i % 2 === 0 ? 'bg-slate-50/50' : ''} hover:bg-blue-50/50 transition-colors`}>
                          <td className="p-3 font-semibold text-[#00263d]">{p.week}</td>
                          <td className="p-3 text-slate-500">{p.date}</td>
                          <td className="p-3 text-right font-semibold">{p.weight}</td>
                          <td className="p-3 text-right text-amber-600">{p.fatMass}</td>
                          <td className="p-3 text-right text-rose-600">{p.ffm}</td>
                          <td className="p-3 text-right text-green-600">{p.bodyFat}%</td>
                          <td className="p-3 text-right">{p.fmi}</td>
                          <td className="p-3 text-right">{p.ffmi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-white/40 text-xs py-3">
            <p>Evidence-based models: Forbes (2000), Heymsfield (2014), Sedlmeier et al. (2021), Tinsley (2021)</p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
