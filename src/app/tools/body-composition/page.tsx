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
  CheckCircle2,
  ChevronRight,
  User,
  Activity,
  BarChart3,
  Clock,
} from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_PRESETS = {
  fat_loss: {
    conservative: { rate: 0.5, label: 'Conservative', description: 'Max muscle retention', ffmLossRatio: 0.10, weeksFor10lbs: 11 },
    moderate: { rate: 0.75, label: 'Moderate', description: 'Balanced approach', ffmLossRatio: 0.15, weeksFor10lbs: 7 },
    aggressive: { rate: 1.0, label: 'Aggressive', description: 'Faster results', ffmLossRatio: 0.25, weeksFor10lbs: 5 },
    very_aggressive: { rate: 1.25, label: 'Very Aggressive', description: 'Contest prep', ffmLossRatio: 0.35, weeksFor10lbs: 4 },
  },
  muscle_gain: {
    lean: { rate: 0.25, label: 'Lean Gain', description: 'Minimal fat gain', fatGainRatio: 0.30 },
    moderate: { rate: 0.5, label: 'Moderate', description: 'Balanced approach', fatGainRatio: 0.45 },
    aggressive: { rate: 0.75, label: 'Aggressive', description: 'Faster muscle', fatGainRatio: 0.55 },
    bulk: { rate: 1.0, label: 'Max Gain', description: 'Beginner bulk', fatGainRatio: 0.65 },
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
  low: { label: 'Low (<1.0 g/kg)', mult: 1.0 },
  moderate: { label: 'Moderate (1.0-1.6 g/kg)', mult: 1.4 },
  high: { label: 'High (1.6-2.2 g/kg)', mult: 1.8 },
  very_high: { label: 'Very High (>2.2 g/kg)', mult: 2.4 },
};

const TRAINING_EFFECT = {
  none: { label: 'None' },
  light: { label: 'Light (1-2x/wk)' },
  moderate: { label: 'Moderate (3-4x/wk)' },
  intense: { label: 'Intense (5-6x/wk)' },
};

const SURPLUS_PARTITIONING = {
  untrained: { muscleRatio: 0.3 },
  novice: { muscleRatio: 0.45 },
  intermediate: { muscleRatio: 0.55 },
  advanced: { muscleRatio: 0.4 },
};

// Body Fat Percentile Data (Males, approximate)
const BF_PERCENTILES_MALE = [
  { pct: 5, bf: 6 }, { pct: 10, bf: 8 }, { pct: 25, bf: 12 }, { pct: 50, bf: 18 },
  { pct: 75, bf: 24 }, { pct: 90, bf: 30 }, { pct: 95, bf: 35 },
];

const FFMI_PERCENTILES_MALE = [
  { pct: 5, ffmi: 16 }, { pct: 10, ffmi: 17 }, { pct: 25, ffmi: 18.5 }, { pct: 50, ffmi: 20 },
  { pct: 75, ffmi: 21.5 }, { pct: 90, ffmi: 23 }, { pct: 95, ffmi: 24.5 },
];

// Utility functions
const formatDate = (date: Date): string => date.toISOString().split('T')[0];
const addWeeks = (date: Date, weeks: number): Date => { const r = new Date(date); r.setDate(r.getDate() + weeks * 7); return r; };

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

const getPercentile = (value: number, data: Array<{pct: number; bf?: number; ffmi?: number}>, key: 'bf' | 'ffmi'): number => {
  const vals = data.map(d => ({ pct: d.pct, v: key === 'bf' ? d.bf! : d.ffmi! }));
  if (value <= vals[0].v) return vals[0].pct;
  if (value >= vals[vals.length - 1].v) return vals[vals.length - 1].pct;
  for (let i = 0; i < vals.length - 1; i++) {
    if (value >= vals[i].v && value <= vals[i + 1].v) {
      const t = (value - vals[i].v) / (vals[i + 1].v - vals[i].v);
      return Math.round(vals[i].pct + t * (vals[i + 1].pct - vals[i].pct));
    }
  }
  return 50;
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

const FMI_BENCHMARKS = [
  { range: [0, 3], label: 'Essential', color: 'text-red-500', bg: 'bg-red-500/10' },
  { range: [3, 6], label: 'Athletic', color: 'text-blue-600', bg: 'bg-blue-500/10' },
  { range: [6, 9], label: 'Fitness', color: 'text-green-600', bg: 'bg-green-500/10' },
  { range: [9, 13], label: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  { range: [13, 100], label: 'Above Avg', color: 'text-orange-500', bg: 'bg-orange-500/10' },
];

const getFFMIBenchmark = (v: number) => FFMI_BENCHMARKS.find(b => v >= b.range[0] && v < b.range[1]) || FFMI_BENCHMARKS[0];
const getFMIBenchmark = (v: number) => FMI_BENCHMARKS.find(b => v >= b.range[0] && v < b.range[1]) || FMI_BENCHMARKS[0];

// SVG curve helper
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
  
  // Goal
  const [phaseType, setPhaseType] = useState<'fat_loss' | 'muscle_gain' | 'recomposition'>('fat_loss');
  const [targetMethod, setTargetMethod] = useState<'body_fat' | 'fmi' | 'ffmi' | 'fat_mass' | 'ffm'>('body_fat');
  
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
    const fmi = fatMassKg / (heightM * heightM);
    const ffmi = ffmKg / (heightM * heightM);
    return {
      fatMassLbs: Math.round(fatMassLbs * 10) / 10,
      ffmLbs: Math.round(ffmLbs * 10) / 10,
      fmi: Math.round(fmi * 10) / 10,
      ffmi: Math.round(ffmi * 10) / 10,
      bfPercentile: getPercentile(currentBodyFat, BF_PERCENTILES_MALE, 'bf'),
      ffmiPercentile: getPercentile(ffmi, FFMI_PERCENTILES_MALE, 'ffmi'),
    };
  }, [currentWeight, currentBodyFat, heightM]);
  
  // Effective rate
  const effectiveRate = useMemo(() => {
    if (useCustomRate) return customRate;
    if (phaseType === 'fat_loss') return RATE_PRESETS.fat_loss[fatLossRateKey as keyof typeof RATE_PRESETS.fat_loss]?.rate || 0.75;
    if (phaseType === 'muscle_gain') return RATE_PRESETS.muscle_gain[muscleGainRateKey as keyof typeof RATE_PRESETS.muscle_gain]?.rate || 0.5;
    return 0;
  }, [useCustomRate, customRate, phaseType, fatLossRateKey, muscleGainRateKey]);
  
  // Target metrics based on target method
  const targetMetrics = useMemo(() => {
    let targetFatMassLbs: number, targetFfmLbs: number;
    const currentFfmLbs = currentMetrics.ffmLbs;
    const currentFatMassLbs = currentMetrics.fatMassLbs;
    
    if (phaseType === 'recomposition') {
      // For recomp, we'll calculate based on duration later
      return null;
    }
    
    if (targetMethod === 'body_fat') {
      targetFfmLbs = currentFfmLbs; // Assume FFM stays same for target calc
      targetFatMassLbs = (targetBodyFat / (100 - targetBodyFat)) * targetFfmLbs;
    } else if (targetMethod === 'fmi') {
      const targetFatKg = targetFMI * (heightM * heightM);
      targetFatMassLbs = targetFatKg / 0.453592;
      targetFfmLbs = currentFfmLbs;
    } else if (targetMethod === 'ffmi') {
      const targetFfmKg = targetFFMI * (heightM * heightM);
      targetFfmLbs = targetFfmKg / 0.453592;
      targetFatMassLbs = currentFatMassLbs;
    } else if (targetMethod === 'fat_mass') {
      targetFatMassLbs = targetFatMass;
      targetFfmLbs = currentFfmLbs;
    } else {
      targetFfmLbs = targetFFM;
      targetFatMassLbs = currentFatMassLbs;
    }
    
    const targetWeightLbs = targetFfmLbs + targetFatMassLbs;
    const targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
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
  }, [targetMethod, targetBodyFat, targetFMI, targetFFMI, targetFatMass, targetFFM, currentMetrics, heightM, phaseType]);
  
  // Calculate required weeks to reach target
  const calculatedTimeline = useMemo(() => {
    if (phaseType === 'recomposition') {
      // For recomp, use a default 12 weeks
      return { weeks: 12, endDate: addWeeks(new Date(), 12) };
    }
    
    if (!targetMetrics) return { weeks: 12, endDate: addWeeks(new Date(), 12) };
    
    const weightChange = Math.abs(targetMetrics.weightLbs - currentWeight);
    const weeklyChange = currentWeight * (effectiveRate / 100);
    const weeks = Math.max(4, Math.ceil(weightChange / weeklyChange));
    
    return { weeks, endDate: addWeeks(new Date(), weeks) };
  }, [targetMetrics, currentWeight, effectiveRate, phaseType]);
  
  // Feasibility
  const feasibility = useMemo(() => {
    if (phaseType === 'recomposition') {
      const exp = RECOMP_EXPECTATIONS[recompExperience];
      return { probability: exp.probability, message: exp.probability > 60 ? 'Good probability with consistent effort' : 'Challenging - consider dedicated phases' };
    }
    
    const rate = effectiveRate;
    const isLoss = phaseType === 'fat_loss';
    
    if (isLoss) {
      if (rate <= 0.5) return { probability: 95, message: 'Very achievable with good adherence' };
      if (rate <= 0.75) return { probability: 85, message: 'Achievable with consistent effort' };
      if (rate <= 1.0) return { probability: 70, message: 'Challenging but possible' };
      if (rate <= 1.25) return { probability: 50, message: 'Aggressive - expect some muscle loss' };
      return { probability: 25, message: 'Unsustainable rate' };
    } else {
      if (rate <= 0.25) return { probability: 90, message: 'Lean gains achievable' };
      if (rate <= 0.5) return { probability: 80, message: 'Good balance of muscle and fat' };
      if (rate <= 0.75) return { probability: 65, message: 'Expect significant fat gain' };
      return { probability: 40, message: 'High fat accumulation expected' };
    }
  }, [effectiveRate, phaseType, recompExperience]);
  
  // Final projected metrics (accounting for partitioning)
  const projectedMetrics = useMemo(() => {
    if (phaseType === 'recomposition') {
      const exp = RECOMP_EXPECTATIONS[recompExperience];
      const months = calculatedTimeline.weeks / 4.33;
      const newFatMass = currentMetrics.fatMassLbs - exp.monthlyFatLoss * months;
      const newFfm = currentMetrics.ffmLbs + exp.monthlyMuscleGain * months;
      const newWeight = newFatMass + newFfm;
      const newBf = (newFatMass / newWeight) * 100;
      const newFfmKg = newFfm * 0.453592;
      const newFmKg = newFatMass * 0.453592;
      return {
        weightLbs: Math.round(newWeight * 10) / 10,
        bodyFat: Math.round(newBf * 10) / 10,
        fatMassLbs: Math.round(newFatMass * 10) / 10,
        ffmLbs: Math.round(newFfm * 10) / 10,
        fmi: Math.round((newFmKg / (heightM * heightM)) * 10) / 10,
        ffmi: Math.round((newFfmKg / (heightM * heightM)) * 10) / 10,
      };
    }
    
    if (!targetMetrics) return null;
    
    // Apply partitioning adjustments
    const totalChange = targetMetrics.weightLbs - currentWeight;
    const isLoss = totalChange < 0;
    
    let finalFfm = currentMetrics.ffmLbs;
    let finalFm = currentMetrics.fatMassLbs;
    
    if (isLoss) {
      const preset = RATE_PRESETS.fat_loss[fatLossRateKey as keyof typeof RATE_PRESETS.fat_loss];
      const ffmLossRatio = useCustomRate ? 0.15 : (preset?.ffmLossRatio || 0.15);
      finalFfm = currentMetrics.ffmLbs - Math.abs(totalChange) * ffmLossRatio;
      finalFm = currentMetrics.fatMassLbs - Math.abs(totalChange) * (1 - ffmLossRatio);
    } else {
      const preset = RATE_PRESETS.muscle_gain[muscleGainRateKey as keyof typeof RATE_PRESETS.muscle_gain];
      const fatGainRatio = useCustomRate ? 0.45 : (preset?.fatGainRatio || 0.45);
      finalFfm = currentMetrics.ffmLbs + totalChange * (1 - fatGainRatio);
      finalFm = currentMetrics.fatMassLbs + totalChange * fatGainRatio;
    }
    
    const finalWeight = finalFfm + finalFm;
    const finalBf = (finalFm / finalWeight) * 100;
    const finalFfmKg = finalFfm * 0.453592;
    const finalFmKg = finalFm * 0.453592;
    
    return {
      weightLbs: Math.round(finalWeight * 10) / 10,
      bodyFat: Math.round(Math.max(3, finalBf) * 10) / 10,
      fatMassLbs: Math.round(Math.max(5, finalFm) * 10) / 10,
      ffmLbs: Math.round(finalFfm * 10) / 10,
      fmi: Math.round((finalFmKg / (heightM * heightM)) * 10) / 10,
      ffmi: Math.round((finalFfmKg / (heightM * heightM)) * 10) / 10,
    };
  }, [targetMetrics, currentMetrics, phaseType, recompExperience, calculatedTimeline.weeks, fatLossRateKey, muscleGainRateKey, useCustomRate, heightM, currentWeight]);
  
  // Weekly projections
  const weeklyProjections = useMemo(() => {
    if (!projectedMetrics) return [];
    
    const projections: Array<{
      week: number; date: string; weight: number; fatMass: number; ffm: number;
      bodyFat: number; fmi: number; ffmi: number;
    }> = [];
    
    const totalWeeks = calculatedTimeline.weeks;
    const startFm = currentMetrics.fatMassLbs;
    const startFfm = currentMetrics.ffmLbs;
    const endFm = projectedMetrics.fatMassLbs;
    const endFfm = projectedMetrics.ffmLbs;
    
    for (let w = 0; w <= totalWeeks; w++) {
      const t = w / totalWeeks;
      const fm = startFm + (endFm - startFm) * t;
      const ffm = startFfm + (endFfm - startFfm) * t;
      const wt = fm + ffm;
      const fmKg = fm * 0.453592;
      const ffmKg = ffm * 0.453592;
      
      projections.push({
        week: w,
        date: formatDate(addWeeks(new Date(), w)),
        weight: Math.round(wt * 10) / 10,
        fatMass: Math.round(fm * 10) / 10,
        ffm: Math.round(ffm * 10) / 10,
        bodyFat: Math.round((fm / wt) * 1000) / 10,
        fmi: Math.round((fmKg / (heightM * heightM)) * 10) / 10,
        ffmi: Math.round((ffmKg / (heightM * heightM)) * 10) / 10,
      });
    }
    
    return projections;
  }, [currentMetrics, projectedMetrics, calculatedTimeline.weeks, heightM]);
  
  // Summary
  const summary = useMemo(() => {
    if (!projectedMetrics) return null;
    const totalWeightChange = projectedMetrics.weightLbs - currentWeight;
    const totalFatChange = projectedMetrics.fatMassLbs - currentMetrics.fatMassLbs;
    const totalFFMChange = projectedMetrics.ffmLbs - currentMetrics.ffmLbs;
    return {
      totalWeightChange: Math.round(totalWeightChange * 10) / 10,
      totalFatChange: Math.round(totalFatChange * 10) / 10,
      totalFFMChange: Math.round(totalFFMChange * 10) / 10,
      pctFromFat: totalWeightChange !== 0 ? Math.round(Math.abs(totalFatChange / totalWeightChange) * 100) : 0,
      pctFromFFM: totalWeightChange !== 0 ? Math.round(Math.abs(totalFFMChange / totalWeightChange) * 100) : 0,
    };
  }, [projectedMetrics, currentWeight, currentMetrics]);
  
  // Nutrition targets
  const nutritionTargets = useMemo(() => {
    if (!summary) return null;
    const deficit = (summary.totalWeightChange / calculatedTimeline.weeks * 3500) / 7;
    const cals = Math.round(tdee + deficit);
    const proteinGPerKg = PROTEIN_EFFECT[proteinLevel].mult;
    const protein = Math.round(weightKg * proteinGPerKg);
    const fatG = Math.round((cals * 0.27) / 9);
    const carbG = Math.round((cals - protein * 4 - fatG * 9) / 4);
    return { calories: cals, protein, carbs: Math.max(50, carbG), fat: fatG, deficit: Math.round(deficit) };
  }, [tdee, summary, calculatedTimeline.weeks, weightKg, proteinLevel]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-[#00263d] via-[#003a5c] to-[#00263d] p-4 lg:p-6">
        <div className="max-w-[1400px] mx-auto space-y-4">
          
          {/* Header */}
          <div className="flex items-center justify-center gap-3 py-3">
            <div className="p-2.5 bg-gradient-to-br from-[#c19962] to-[#d4af7a] rounded-xl shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Body Composition Planner</h1>
              <p className="text-xs text-white/50">Evidence-based goal setting with mortality risk analysis</p>
            </div>
          </div>

          {/* Step 1: Current Stats & Benchmarks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Current Stats Input */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00263d] text-white text-xs font-bold">1</div>
                  <User className="h-4 w-4 text-[#c19962]" />
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
                <div className="bg-slate-50 rounded-xl p-3.5 space-y-2">
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
                
                {/* RMR */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      Resting Metabolic Rate
                    </Label>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200">
                      <button onClick={() => setRmrSource('estimated')} 
                        className={`px-2.5 py-1 text-xs font-medium ${rmrSource === 'estimated' ? 'bg-[#00263d] text-white' : 'bg-white text-slate-600'}`}>
                        Est.
                      </button>
                      <button onClick={() => setRmrSource('measured')} 
                        className={`px-2.5 py-1 text-xs font-medium border-l border-slate-200 ${rmrSource === 'measured' ? 'bg-[#00263d] text-white' : 'bg-white text-slate-600'}`}>
                        Meas.
                      </button>
                    </div>
                  </div>
                  
                  {rmrSource === 'measured' ? (
                    <Input type="number" value={measuredRmr} onChange={(e) => setMeasuredRmr(Number(e.target.value))} className="h-9 bg-slate-50 rounded-lg" />
                  ) : (
                    <div className="bg-orange-50 rounded-lg p-2 text-center border border-orange-100">
                      <span className="text-lg font-bold text-orange-600">{estimatedRmr}</span>
                      <span className="text-xs text-orange-500 ml-1">kcal</span>
                    </div>
                  )}
                  
                  <Select value={neatLevel} onValueChange={(v: any) => setNeatLevel(v)}>
                    <SelectTrigger className="h-8 text-xs bg-slate-50 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (+{neatEstimates.sedentary})</SelectItem>
                      <SelectItem value="light">Light (+{neatEstimates.light})</SelectItem>
                      <SelectItem value="moderate">Moderate (+{neatEstimates.moderate})</SelectItem>
                      <SelectItem value="active">Active (+{neatEstimates.active})</SelectItem>
                      <SelectItem value="very_active">Very Active (+{neatEstimates.very_active})</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">TEF %</Label>
                      <Input type="number" value={tef} onChange={(e) => setTef(Number(e.target.value))} className="h-7 text-xs bg-slate-50 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">EEE</Label>
                      <Input type="number" value={eee} onChange={(e) => setEee(Number(e.target.value))} className="h-7 text-xs bg-slate-50 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Days</Label>
                      <Input type="number" value={workoutsPerWeek} onChange={(e) => setWorkoutsPerWeek(Number(e.target.value))} className="h-7 text-xs bg-slate-50 rounded-lg" min={0} max={7} />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-white">{tdee}</div>
                    <div className="text-[10px] text-white/80">TDEE</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Percentile Rankings & Visual */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                  </div>
                  Where You Stand
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Body Fat Percentile */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">Body Fat Percentile</span>
                    <span className="text-sm font-bold text-purple-600">{100 - currentMetrics.bfPercentile}th</span>
                  </div>
                  <div className="relative h-8 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex">
                      {[10, 25, 50, 75, 90].map(p => (
                        <div key={p} className="flex-1 border-r border-white/30 flex items-end justify-center pb-0.5">
                          <span className="text-[8px] text-white/70">{p}th</span>
                        </div>
                      ))}
                    </div>
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-[#00263d] shadow-lg"
                      style={{ left: `${100 - currentMetrics.bfPercentile}%` }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#00263d] rotate-45" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Leaner →</span>
                    <span>← Higher BF</span>
                  </div>
                </div>
                
                {/* FFMI Percentile */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">Muscularity Percentile (FFMI)</span>
                    <span className="text-sm font-bold text-blue-600">{currentMetrics.ffmiPercentile}th</span>
                  </div>
                  <div className="relative h-8 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex">
                      {[10, 25, 50, 75, 90].map(p => (
                        <div key={p} className="flex-1 border-r border-white/30 flex items-end justify-center pb-0.5">
                          <span className="text-[8px] text-white/70">{p}th</span>
                        </div>
                      ))}
                    </div>
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-[#00263d] shadow-lg"
                      style={{ left: `${currentMetrics.ffmiPercentile}%` }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#00263d] rotate-45" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>← Less Muscle</span>
                    <span>More Muscle →</span>
                  </div>
                </div>
                
                {/* Visual representation */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-500 mb-3 text-center">Body Composition Visual</div>
                  <div className="flex justify-center gap-6">
                    {/* Fat indicator */}
                    <div className="text-center">
                      <div className="relative w-16 h-24 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-400 to-amber-300 transition-all"
                          style={{ height: `${Math.min(100, currentBodyFat * 3)}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs font-semibold text-amber-600">{currentBodyFat}% BF</div>
                    </div>
                    {/* Muscle indicator */}
                    <div className="text-center">
                      <div className="relative w-16 h-24 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-400 transition-all"
                          style={{ height: `${Math.min(100, (currentMetrics.ffmi / 25) * 100)}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs font-semibold text-blue-600">{currentMetrics.ffmi} FFMI</div>
                    </div>
                  </div>
                </div>
                
                {/* Category badges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                    <div className="text-xs text-amber-600 mb-1">Body Fat Category</div>
                    <Badge className={`${getFMIBenchmark(currentMetrics.fmi).bg} ${getFMIBenchmark(currentMetrics.fmi).color} border-0`}>
                      {getFMIBenchmark(currentMetrics.fmi).label}
                    </Badge>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                    <div className="text-xs text-blue-600 mb-1">Muscularity</div>
                    <Badge className={`${getFFMIBenchmark(currentMetrics.ffmi).bg} ${getFFMIBenchmark(currentMetrics.ffmi).color} border-0`}>
                      {getFFMIBenchmark(currentMetrics.ffmi).label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mortality Risk */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="p-1.5 bg-red-500/10 rounded-lg">
                    <Heart className="h-4 w-4 text-red-500" />
                  </div>
                  Mortality Risk
                  <Badge variant="outline" className="ml-auto text-[9px]">Sedlmeier 2021</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* FMI Risk */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">FMI Risk</span>
                    <span className={`text-xs font-semibold ${getHazardRatio(currentMetrics.fmi, 'fmi') <= 1.1 ? 'text-green-600' : getHazardRatio(currentMetrics.fmi, 'fmi') <= 1.5 ? 'text-amber-600' : 'text-red-600'}`}>
                      HR: {getHazardRatio(currentMetrics.fmi, 'fmi').toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 h-32">
                    <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="fmiG" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="40%" stopColor="#22c55e" />
                          <stop offset="60%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                      </defs>
                      {/* Optimal zone */}
                      {(() => {
                        const minX = 2, maxX = 18;
                        const scaleX = (x: number) => 20 + ((x - minX) / (maxX - minX)) * 260;
                        return <rect x={scaleX(5)} y="10" width={scaleX(9) - scaleX(5)} height="70" fill="#22c55e" fillOpacity="0.1" rx="4" />;
                      })()}
                      {/* Curve */}
                      {(() => {
                        const minX = 2, maxX = 18, minY = 0.9, maxY = 2.5;
                        const points = MORTALITY_RISK.fmi.points.filter(p => p.x <= maxX).map(p => ({
                          x: 20 + ((p.x - minX) / (maxX - minX)) * 260,
                          y: 80 - ((p.hr - minY) / (maxY - minY)) * 65
                        }));
                        const cx = 20 + ((currentMetrics.fmi - minX) / (maxX - minX)) * 260;
                        const cy = 80 - ((getHazardRatio(currentMetrics.fmi, 'fmi') - minY) / (maxY - minY)) * 65;
                        return (
                          <>
                            <path d={createSmoothCurve(points)} fill="none" stroke="url(#fmiG)" strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx={cx} cy={cy} r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
                          </>
                        );
                      })()}
                      <text x="150" y="95" fontSize="9" fill="#64748b" textAnchor="middle">FMI (kg/m²)</text>
                    </svg>
                  </div>
                </div>
                
                {/* FFMI Risk */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">FFMI Risk</span>
                    <span className={`text-xs font-semibold ${getHazardRatio(currentMetrics.ffmi, 'ffmi') <= 0.85 ? 'text-green-600' : getHazardRatio(currentMetrics.ffmi, 'ffmi') <= 1.1 ? 'text-amber-600' : 'text-red-600'}`}>
                      HR: {getHazardRatio(currentMetrics.ffmi, 'ffmi').toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 h-32">
                    <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="ffmiG" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="50%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                      {/* Optimal zone */}
                      {(() => {
                        const minX = 14, maxX = 26;
                        const scaleX = (x: number) => 20 + ((x - minX) / (maxX - minX)) * 260;
                        return <rect x={scaleX(19)} y="10" width={scaleX(24) - scaleX(19)} height="70" fill="#22c55e" fillOpacity="0.1" rx="4" />;
                      })()}
                      {/* Curve */}
                      {(() => {
                        const minX = 14, maxX = 26, minY = 0.6, maxY = 2.5;
                        const points = MORTALITY_RISK.ffmi.points.filter(p => p.x >= minX && p.x <= maxX).map(p => ({
                          x: 20 + ((p.x - minX) / (maxX - minX)) * 260,
                          y: 80 - ((p.hr - minY) / (maxY - minY)) * 65
                        }));
                        const cx = 20 + ((currentMetrics.ffmi - minX) / (maxX - minX)) * 260;
                        const cy = 80 - ((getHazardRatio(currentMetrics.ffmi, 'ffmi') - minY) / (maxY - minY)) * 65;
                        return (
                          <>
                            <path d={createSmoothCurve(points)} fill="none" stroke="url(#ffmiG)" strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx={cx} cy={cy} r="6" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
                          </>
                        );
                      })()}
                      <text x="150" y="95" fontSize="9" fill="#64748b" textAnchor="middle">FFMI (kg/m²)</text>
                    </svg>
                  </div>
                </div>
                
                <div className="text-[10px] text-slate-400 text-center">
                  Green zone = optimal range for lowest mortality risk
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 2: Goal, Target, Rate */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Goal Type */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00263d] text-white text-xs font-bold">2</div>
                  <Target className="h-4 w-4 text-blue-500" />
                  Select Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  {[
                    { value: 'fat_loss', label: 'Fat Loss', desc: 'Reduce body fat while preserving muscle', icon: TrendingDown, color: 'from-red-500 to-orange-500', iconColor: 'text-red-500', bgColor: 'bg-red-50' },
                    { value: 'muscle_gain', label: 'Build Muscle', desc: 'Add lean mass with some fat gain', icon: TrendingUp, color: 'from-blue-500 to-cyan-500', iconColor: 'text-blue-500', bgColor: 'bg-blue-50' },
                    { value: 'recomposition', label: 'Recomposition', desc: 'Simultaneous fat loss & muscle gain', icon: RefreshCcw, color: 'from-purple-500 to-pink-500', iconColor: 'text-purple-500', bgColor: 'bg-purple-50' },
                  ].map(({ value, label, desc, icon: Icon, color, iconColor, bgColor }) => (
                    <button
                      key={value}
                      onClick={() => setPhaseType(value as any)}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        phaseType === value 
                          ? `bg-gradient-to-r ${color} text-white shadow-lg` 
                          : `${bgColor} hover:shadow-md`
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${phaseType === value ? 'text-white' : iconColor}`} />
                        <div>
                          <div className={`font-semibold ${phaseType === value ? 'text-white' : 'text-slate-700'}`}>{label}</div>
                          <div className={`text-xs ${phaseType === value ? 'text-white/80' : 'text-slate-500'}`}>{desc}</div>
                        </div>
                        {phaseType === value && <CheckCircle2 className="h-5 w-5 ml-auto text-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Target Selection */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00263d] text-white text-xs font-bold">3</div>
                  <Scale className="h-4 w-4 text-green-500" />
                  Set Target
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {phaseType === 'recomposition' ? (
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-slate-500">Training Experience</Label>
                    {Object.entries(RECOMP_EXPECTATIONS).map(([key, val]) => (
                      <button key={key} onClick={() => setRecompExperience(key as any)}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          recompExperience === key 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' 
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">{val.label}</span>
                          <span className={`text-xs ${recompExperience === key ? 'text-white/80' : 'text-slate-500'}`}>{val.probability}% success</span>
                        </div>
                        <div className={`text-xs mt-1 ${recompExperience === key ? 'text-white/70' : 'text-slate-400'}`}>
                          -{val.monthlyFatLoss} FM / +{val.monthlyMuscleGain} FFM per month
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500">Target Metric</Label>
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { value: 'body_fat', label: 'BF%' },
                          { value: 'fmi', label: 'FMI' },
                          { value: 'ffmi', label: 'FFMI' },
                          { value: 'fat_mass', label: 'FM' },
                          { value: 'ffm', label: 'FFM' },
                        ].map(({ value, label }) => (
                          <button key={value} 
                            onClick={() => setTargetMethod(value as any)}
                            className={`text-xs font-medium py-2 rounded-lg transition-colors ${
                              targetMethod === value 
                                ? 'bg-[#00263d] text-white' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                      {targetMethod === 'body_fat' && (
                        <>
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-medium text-slate-500">Target Body Fat %</Label>
                            <Input type="number" value={targetBodyFat} onChange={(e) => setTargetBodyFat(Number(e.target.value))} className="w-20 h-8 text-center rounded-lg" />
                          </div>
                          <Slider value={[targetBodyFat]} onValueChange={([v]) => setTargetBodyFat(v)} min={5} max={35} step={0.5} />
                          <div className="text-xs text-slate-400">Current: {currentBodyFat}%</div>
                        </>
                      )}
                      {targetMethod === 'fmi' && (
                        <>
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-medium text-slate-500">Target FMI (kg/m²)</Label>
                            <Input type="number" value={targetFMI} onChange={(e) => setTargetFMI(Number(e.target.value))} className="w-20 h-8 text-center rounded-lg" />
                          </div>
                          <Slider value={[targetFMI]} onValueChange={([v]) => setTargetFMI(v)} min={2} max={15} step={0.5} />
                          <div className="text-xs text-slate-400">Current: {currentMetrics.fmi}</div>
                        </>
                      )}
                      {targetMethod === 'ffmi' && (
                        <>
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-medium text-slate-500">Target FFMI (kg/m²)</Label>
                            <Input type="number" value={targetFFMI} onChange={(e) => setTargetFFMI(Number(e.target.value))} className="w-20 h-8 text-center rounded-lg" />
                          </div>
                          <Slider value={[targetFFMI]} onValueChange={([v]) => setTargetFFMI(v)} min={16} max={28} step={0.5} />
                          <div className="text-xs text-slate-400">Current: {currentMetrics.ffmi}</div>
                        </>
                      )}
                      {targetMethod === 'fat_mass' && (
                        <>
                          <Label className="text-xs font-medium text-slate-500">Target Fat Mass (lbs)</Label>
                          <Input type="number" value={targetFatMass} onChange={(e) => setTargetFatMass(Number(e.target.value))} className="h-9 rounded-lg" />
                          <div className="text-xs text-slate-400">Current: {currentMetrics.fatMassLbs} lbs</div>
                        </>
                      )}
                      {targetMethod === 'ffm' && (
                        <>
                          <Label className="text-xs font-medium text-slate-500">Target FFM (lbs)</Label>
                          <Input type="number" value={targetFFM} onChange={(e) => setTargetFFM(Number(e.target.value))} className="h-9 rounded-lg" />
                          <div className="text-xs text-slate-400">Current: {currentMetrics.ffmLbs} lbs</div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Rate & Timeline */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00263d] text-white text-xs font-bold">4</div>
                  <Clock className="h-4 w-4 text-amber-500" />
                  Rate & Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {phaseType !== 'recomposition' && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-slate-500">Custom Rate</Label>
                      <Switch checked={useCustomRate} onCheckedChange={setUseCustomRate} />
                    </div>
                    
                    {useCustomRate ? (
                      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Slider value={[customRate]} onValueChange={([v]) => setCustomRate(v)} min={0.1} max={1.5} step={0.05} className="flex-1" />
                          <div className="w-20 text-center">
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
                  </>
                )}
                
                {/* Calculated End Date */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/80">Estimated Duration</span>
                    <Calendar className="h-4 w-4 text-white/80" />
                  </div>
                  <div className="text-2xl font-bold">{calculatedTimeline.weeks} weeks</div>
                  <div className="text-xs text-white/80">End date: {formatDate(calculatedTimeline.endDate)}</div>
                </div>
                
                {/* Success Probability */}
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
                    <div className={`h-full rounded-full ${
                      feasibility.probability >= 70 ? 'bg-green-500' :
                      feasibility.probability >= 40 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`} style={{ width: `${feasibility.probability}%` }} />
                  </div>
                  <p className="text-xs mt-2 text-slate-600">{feasibility.message}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 3: Parameters */}
          <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-6 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00263d] text-white text-xs font-bold">5</div>
                <Settings2 className="h-4 w-4 text-slate-500" />
                Partitioning Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">Protein Intake</Label>
                  <Select value={proteinLevel} onValueChange={(v: any) => setProteinLevel(v)}>
                    <SelectTrigger className="h-9 bg-slate-50 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROTEIN_EFFECT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">Training Frequency</Label>
                  <Select value={trainingLevel} onValueChange={(v: any) => setTrainingLevel(v)}>
                    <SelectTrigger className="h-9 bg-slate-50 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRAINING_EFFECT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                  <Label className="text-xs font-medium text-slate-500">Water Changes</Label>
                  <Switch checked={includeWaterChanges} onCheckedChange={setIncludeWaterChanges} />
                </div>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                  <Label className="text-xs font-medium text-slate-500">Show CI</Label>
                  <Switch checked={showCI} onCheckedChange={setShowCI} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Projected Results */}
          {projectedMetrics && summary && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Results Summary */}
              <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00263d] text-white text-xs font-bold">6</div>
                    <Zap className="h-4 w-4 text-[#c19962]" />
                    Projected Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <div className="text-xl font-bold text-[#00263d]">{projectedMetrics.weightLbs}</div>
                      <div className="text-xs text-slate-500">Target Weight</div>
                      <div className={`text-xs font-medium ${summary.totalWeightChange < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                        {summary.totalWeightChange < 0 ? '' : '+'}{summary.totalWeightChange} lbs
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <div className="text-xl font-bold text-[#00263d]">{projectedMetrics.bodyFat}%</div>
                      <div className="text-xs text-slate-500">Body Fat</div>
                      <div className={`text-xs font-medium ${projectedMetrics.bodyFat < currentBodyFat ? 'text-green-600' : 'text-orange-600'}`}>
                        {projectedMetrics.bodyFat < currentBodyFat ? '' : '+'}{(projectedMetrics.bodyFat - currentBodyFat).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fat Mass</span>
                      <span className="font-semibold">{projectedMetrics.fatMassLbs} lbs 
                        <span className={`ml-1 text-xs ${summary.totalFatChange < 0 ? 'text-green-600' : 'text-red-500'}`}>
                          ({summary.totalFatChange})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">FFM</span>
                      <span className="font-semibold">{projectedMetrics.ffmLbs} lbs 
                        <span className={`ml-1 text-xs ${summary.totalFFMChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          ({summary.totalFFMChange >= 0 ? '+' : ''}{summary.totalFFMChange})
                        </span>
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">FMI</span>
                      <Badge className={`${getFMIBenchmark(projectedMetrics.fmi).bg} ${getFMIBenchmark(projectedMetrics.fmi).color} border-0`}>
                        {projectedMetrics.fmi}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">FFMI</span>
                      <Badge className={`${getFFMIBenchmark(projectedMetrics.ffmi).bg} ${getFFMIBenchmark(projectedMetrics.ffmi).color} border-0`}>
                        {projectedMetrics.ffmi}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Partitioning */}
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-500 mb-2">Weight Change Composition</div>
                    <div className="h-3 rounded-full overflow-hidden flex bg-slate-200">
                      <div className="bg-amber-500" style={{ width: `${summary.pctFromFat}%` }} />
                      <div className="bg-rose-500" style={{ width: `${summary.pctFromFFM}%` }} />
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-amber-600">● Fat: {summary.pctFromFat}%</span>
                      <span className="text-rose-600">● FFM: {summary.pctFromFFM}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline Graphs */}
              <Card className="lg:col-span-3 bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="pb-2 pt-4 px-5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                      <LineChart className="h-4 w-4 text-purple-500" />
                      Timeline Projection
                    </CardTitle>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200">
                      <button onClick={() => setViewMode('graph')}
                        className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${viewMode === 'graph' ? 'bg-purple-500 text-white' : 'bg-white text-slate-600'}`}>
                        <LineChart className="h-3 w-3" />Graph
                      </button>
                      <button onClick={() => setViewMode('table')}
                        className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 border-l border-slate-200 ${viewMode === 'table' ? 'bg-purple-500 text-white' : 'bg-white text-slate-600'}`}>
                        <Table className="h-3 w-3" />Table
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  {viewMode === 'graph' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Weight */}
                      <div className="space-y-2">
                        <div className="font-semibold text-sm text-[#00263d]">Weight (lbs)</div>
                        <div className="bg-slate-50 rounded-xl p-3 h-40">
                          <svg className="w-full h-full" viewBox="0 0 300 120">
                            <defs>
                              <linearGradient id="wFill" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            {(() => {
                              const weights = weeklyProjections.map(p => p.weight);
                              const min = Math.min(...weights) - 2, max = Math.max(...weights) + 2;
                              const points = weeklyProjections.map((p, i) => ({
                                x: 20 + (i / Math.max(1, weeklyProjections.length - 1)) * 260,
                                y: 100 - ((p.weight - min) / (max - min)) * 85
                              }));
                              const path = createSmoothCurve(points);
                              const areaPath = path + ` L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;
                              return (
                                <>
                                  <path d={areaPath} fill="url(#wFill)" />
                                  <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                                  <circle cx={points[0].x} cy={points[0].y} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                                  <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill="#22c55e" stroke="#fff" strokeWidth="1.5" />
                                  <text x="25" y="15" fontSize="8" fill="#64748b">{max.toFixed(0)}</text>
                                  <text x="25" y="105" fontSize="8" fill="#64748b">{min.toFixed(0)}</text>
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                      </div>
                      
                      {/* Composition */}
                      <div className="space-y-2">
                        <div className="font-semibold text-sm text-[#00263d]">Fat Mass & FFM</div>
                        <div className="bg-slate-50 rounded-xl p-3 h-40">
                          <svg className="w-full h-full" viewBox="0 0 300 120">
                            {(() => {
                              const allVals = [...weeklyProjections.map(p => p.fatMass), ...weeklyProjections.map(p => p.ffm)];
                              const min = Math.min(...allVals) - 2, max = Math.max(...allVals) + 2;
                              const fmPoints = weeklyProjections.map((p, i) => ({
                                x: 20 + (i / Math.max(1, weeklyProjections.length - 1)) * 260,
                                y: 100 - ((p.fatMass - min) / (max - min)) * 85
                              }));
                              const ffmPoints = weeklyProjections.map((p, i) => ({
                                x: 20 + (i / Math.max(1, weeklyProjections.length - 1)) * 260,
                                y: 100 - ((p.ffm - min) / (max - min)) * 85
                              }));
                              return (
                                <>
                                  <path d={createSmoothCurve(fmPoints)} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                                  <path d={createSmoothCurve(ffmPoints)} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                                  <text x="220" y="12" fontSize="8" fill="#f59e0b">● Fat</text>
                                  <text x="250" y="12" fontSize="8" fill="#ef4444">● FFM</text>
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                      </div>
                      
                      {/* Body Fat % */}
                      <div className="space-y-2">
                        <div className="font-semibold text-sm text-[#00263d]">Body Fat %</div>
                        <div className="bg-slate-50 rounded-xl p-3 h-40">
                          <svg className="w-full h-full" viewBox="0 0 300 120">
                            <defs>
                              <linearGradient id="bfFill" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            {(() => {
                              const bfs = weeklyProjections.map(p => p.bodyFat);
                              const min = Math.min(...bfs) - 1, max = Math.max(...bfs) + 1;
                              const points = weeklyProjections.map((p, i) => ({
                                x: 20 + (i / Math.max(1, weeklyProjections.length - 1)) * 260,
                                y: 100 - ((p.bodyFat - min) / (max - min)) * 85
                              }));
                              const path = createSmoothCurve(points);
                              const areaPath = path + ` L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;
                              return (
                                <>
                                  <path d={areaPath} fill="url(#bfFill)" />
                                  <path d={path} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
                                  <circle cx={points[0].x} cy={points[0].y} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                                  <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill="#22c55e" stroke="#fff" strokeWidth="1.5" />
                                  <text x="25" y="15" fontSize="8" fill="#64748b">{max.toFixed(1)}%</text>
                                  <text x="25" y="105" fontSize="8" fill="#64748b">{min.toFixed(1)}%</text>
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white border-b-2 border-slate-100">
                          <tr className="text-left text-slate-500">
                            <th className="p-2 font-medium">Week</th>
                            <th className="p-2 font-medium">Date</th>
                            <th className="p-2 text-right font-medium">Weight</th>
                            <th className="p-2 text-right font-medium">Fat</th>
                            <th className="p-2 text-right font-medium">FFM</th>
                            <th className="p-2 text-right font-medium">BF%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeklyProjections.map((p, i) => (
                            <tr key={p.week} className={`${i % 2 === 0 ? 'bg-slate-50/50' : ''}`}>
                              <td className="p-2 font-semibold">{p.week}</td>
                              <td className="p-2 text-slate-500 text-xs">{p.date}</td>
                              <td className="p-2 text-right">{p.weight}</td>
                              <td className="p-2 text-right text-amber-600">{p.fatMass}</td>
                              <td className="p-2 text-right text-rose-600">{p.ffm}</td>
                              <td className="p-2 text-right text-green-600">{p.bodyFat}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Nutrition Targets */}
          {nutritionTargets && (
            <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-6 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2.5 text-[#00263d] text-base font-semibold">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00263d] text-white text-xs font-bold">7</div>
                  <Activity className="h-4 w-4 text-green-500" />
                  Recommended Nutrition
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-5 text-white">
                    <div className="text-center">
                      <div className="text-4xl font-bold">{nutritionTargets.calories}</div>
                      <div className="text-sm text-white/80 mt-1">Daily Calories</div>
                      <div className="text-xs text-white/60 mt-2">
                        {nutritionTargets.deficit < 0 ? `${Math.abs(nutritionTargets.deficit)} cal deficit from TDEE` : `${nutritionTargets.deficit} cal surplus from TDEE`}
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                    <div className="text-3xl font-bold text-blue-600">{nutritionTargets.protein}g</div>
                    <div className="text-xs text-blue-500 mt-1">Protein</div>
                    <div className="text-[10px] text-blue-400 mt-1">{Math.round(nutritionTargets.protein * 4)} kcal</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                    <div className="text-3xl font-bold text-amber-600">{nutritionTargets.carbs}g</div>
                    <div className="text-xs text-amber-500 mt-1">Carbs</div>
                    <div className="text-[10px] text-amber-400 mt-1">{Math.round(nutritionTargets.carbs * 4)} kcal</div>
                  </div>
                  <div className="bg-rose-50 rounded-xl p-4 text-center border border-rose-100">
                    <div className="text-3xl font-bold text-rose-600">{nutritionTargets.fat}g</div>
                    <div className="text-xs text-rose-500 mt-1">Fat</div>
                    <div className="text-[10px] text-rose-400 mt-1">{Math.round(nutritionTargets.fat * 9)} kcal</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center text-white/40 text-xs py-3">
            <p>Evidence-based models: Forbes (2000), Heymsfield (2014), Sedlmeier et al. (2021), Tinsley (2021)</p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
