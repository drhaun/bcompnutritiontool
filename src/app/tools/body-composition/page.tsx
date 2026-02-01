'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  CheckCircle2,
  User,
  Activity,
  BarChart3,
  Clock,
  Info,
  Crosshair,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// =============================================================================
// CONSTANTS & CITATIONS
// =============================================================================

const CITATIONS = {
  bfPercentile: {
    title: 'Body Fat Percentile Norms',
    source: 'NHANES (National Health and Nutrition Examination Survey)',
    details: 'CDC/NCHS. Body composition data from nationally representative samples of U.S. adults.',
    year: '2017-2020',
  },
  ffmiPercentile: {
    title: 'Fat-Free Mass Index Norms',
    source: 'Schutz Y, Kyle UU, Pichard C. Fat-free mass index and fat mass index percentiles in Caucasians aged 18-98 y.',
    journal: 'Int J Obes Relat Metab Disord. 2002;26(7):953-960',
    doi: '10.1038/sj.ijo.0802037',
  },
  mortalityRisk: {
    title: 'Mortality Risk by Body Composition',
    source: 'Sedlmeier AM, et al. Relation of body fat mass and fat-free mass to total mortality.',
    journal: 'Am J Clin Nutr. 2021;113(3):639-646',
    doi: '10.1093/ajcn/nqaa321',
    details: 'Pooled analysis of 7 prospective cohorts (n=16,155, 14-year median follow-up)',
  },
};

const RATE_PRESETS = {
  fat_loss: {
    conservative: { rate: 0.5, label: 'Conservative', description: 'Max muscle retention', ffmLossRatio: 0.10 },
    moderate: { rate: 0.75, label: 'Moderate', description: 'Balanced approach', ffmLossRatio: 0.15 },
    aggressive: { rate: 1.0, label: 'Aggressive', description: 'Faster results', ffmLossRatio: 0.25 },
    very_aggressive: { rate: 1.25, label: 'Very Aggressive', description: 'Contest prep', ffmLossRatio: 0.35 },
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

// Citation Tooltip Component
const CitationTooltip = ({ citation }: { citation: typeof CITATIONS.bfPercentile | typeof CITATIONS.ffmiPercentile | typeof CITATIONS.mortalityRisk }) => (
  <TooltipContent className="max-w-xs p-3 bg-slate-900 text-white border-0">
    <div className="space-y-1.5">
      <div className="font-semibold text-sm">{citation.title}</div>
      <div className="text-xs text-slate-300">{citation.source}</div>
      {'journal' in citation && <div className="text-xs text-slate-400 italic">{citation.journal}</div>}
      {'details' in citation && <div className="text-[10px] text-slate-400">{citation.details}</div>}
      {'doi' in citation && <div className="text-[10px] text-blue-400">DOI: {citation.doi}</div>}
    </div>
  </TooltipContent>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BodyCompositionPage() {
  // Current stats
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<number>(35);
  const [heightFt, setHeightFt] = useState<number>(5);
  const [heightIn, setHeightIn] = useState<number>(10);
  const [currentWeight, setCurrentWeight] = useState<number>(200);
  const [currentBodyFat, setCurrentBodyFat] = useState<number>(20);
  
  // Theoretical/Explorer values
  const [useTheoretical, setUseTheoretical] = useState<boolean>(false);
  const [theoreticalBF, setTheoreticalBF] = useState<number>(15);
  const [theoreticalFM, setTheoreticalFM] = useState<number>(25);
  const [theoreticalFFM, setTheoreticalFFM] = useState<number>(165);
  
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
  
  // Current metrics from actual stats
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
  
  // Theoretical metrics for explorer
  const theoreticalMetrics = useMemo(() => {
    const theoreticalWeight = theoreticalFM + theoreticalFFM;
    const theoreticalBFCalc = (theoreticalFM / theoreticalWeight) * 100;
    const fmKg = theoreticalFM * 0.453592;
    const ffmKg = theoreticalFFM * 0.453592;
    const fmi = fmKg / (heightM * heightM);
    const ffmi = ffmKg / (heightM * heightM);
    return {
      weight: Math.round(theoreticalWeight * 10) / 10,
      bodyFat: Math.round(theoreticalBFCalc * 10) / 10,
      fatMassLbs: theoreticalFM,
      ffmLbs: theoreticalFFM,
      fmi: Math.round(fmi * 10) / 10,
      ffmi: Math.round(ffmi * 10) / 10,
      bfPercentile: getPercentile(theoreticalBFCalc, BF_PERCENTILES_MALE, 'bf'),
      ffmiPercentile: getPercentile(ffmi, FFMI_PERCENTILES_MALE, 'ffmi'),
    };
  }, [theoreticalFM, theoreticalFFM, heightM]);
  
  // Display metrics (current or theoretical based on toggle)
  const displayMetrics = useTheoretical ? {
    ...theoreticalMetrics,
    weight: theoreticalMetrics.weight,
    bodyFat: theoreticalMetrics.bodyFat,
  } : {
    ...currentMetrics,
    weight: currentWeight,
    bodyFat: currentBodyFat,
  };
  
  // Effective rate
  const effectiveRate = useMemo(() => {
    if (useCustomRate) return customRate;
    if (phaseType === 'fat_loss') return RATE_PRESETS.fat_loss[fatLossRateKey as keyof typeof RATE_PRESETS.fat_loss]?.rate || 0.75;
    if (phaseType === 'muscle_gain') return RATE_PRESETS.muscle_gain[muscleGainRateKey as keyof typeof RATE_PRESETS.muscle_gain]?.rate || 0.5;
    return 0;
  }, [useCustomRate, customRate, phaseType, fatLossRateKey, muscleGainRateKey]);
  
  // Target metrics
  const targetMetrics = useMemo(() => {
    if (phaseType === 'recomposition') return null;
    
    let targetFatMassLbs: number, targetFfmLbs: number;
    const currentFfmLbs = currentMetrics.ffmLbs;
    const currentFatMassLbs = currentMetrics.fatMassLbs;
    
    if (targetMethod === 'body_fat') {
      targetFfmLbs = currentFfmLbs;
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
  
  // Timeline calculation
  const calculatedTimeline = useMemo(() => {
    if (phaseType === 'recomposition') {
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
  
  // Projected metrics
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
    const projections: Array<{ week: number; date: string; weight: number; fatMass: number; ffm: number; bodyFat: number; fmi: number; ffmi: number; }> = [];
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
        week: w, date: formatDate(addWeeks(new Date(), w)),
        weight: Math.round(wt * 10) / 10, fatMass: Math.round(fm * 10) / 10, ffm: Math.round(ffm * 10) / 10,
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
        <div className="max-w-[1600px] mx-auto space-y-4">
          
          {/* Header */}
          <div className="flex items-center justify-center gap-3 py-2">
            <div className="p-2.5 bg-gradient-to-br from-[#c19962] to-[#d4af7a] rounded-xl shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Body Composition Planner</h1>
              <p className="text-xs text-white/50">Evidence-based goal setting with interactive risk analysis</p>
            </div>
          </div>

          {/* Row 1: Current Stats + Where You Stand + Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Current Stats - 3 cols */}
            <Card className="lg:col-span-3 bg-white border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#00263d] text-white text-[10px] font-bold">1</div>
                  <User className="h-4 w-4 text-[#c19962]" />
                  Current Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Gender</Label>
                    <Select value={gender} onValueChange={(v: 'male' | 'female') => setGender(v)}>
                      <SelectTrigger className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Age</Label>
                    <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg" />
                  </div>
                </div>
                
                <div>
                  <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Height</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input type="number" value={heightFt} onChange={(e) => setHeightFt(Number(e.target.value))} className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg pr-6" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">ft</span>
                    </div>
                    <div className="relative flex-1">
                      <Input type="number" value={heightIn} onChange={(e) => setHeightIn(Number(e.target.value))} className="h-8 text-sm bg-slate-50 border-slate-200 rounded-lg pr-6" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">in</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Weight (lbs)</Label>
                    <Input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(Number(e.target.value))} className="h-10 text-lg font-bold bg-slate-50 border-slate-200 rounded-lg text-center" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Body Fat %</Label>
                    <Input type="number" step="0.1" value={currentBodyFat} onChange={(e) => setCurrentBodyFat(Number(e.target.value))} className="h-10 text-lg font-bold bg-slate-50 border-slate-200 rounded-lg text-center" />
                  </div>
                </div>
                
                {/* Derived */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
                    <div className="text-lg font-bold text-amber-700">{currentMetrics.fatMassLbs}</div>
                    <div className="text-[10px] text-amber-600">Fat Mass (lbs)</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                    <div className="text-lg font-bold text-blue-700">{currentMetrics.ffmLbs}</div>
                    <div className="text-[10px] text-blue-600">FFM (lbs)</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <Badge className={`${getFMIBenchmark(currentMetrics.fmi).bg} ${getFMIBenchmark(currentMetrics.fmi).color} border-0 text-xs`}>
                      {currentMetrics.fmi} FMI
                    </Badge>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <Badge className={`${getFFMIBenchmark(currentMetrics.ffmi).bg} ${getFFMIBenchmark(currentMetrics.ffmi).color} border-0 text-xs`}>
                      {currentMetrics.ffmi} FFMI
                    </Badge>
                  </div>
                </div>
                
                {/* RMR compact */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-white">{tdee}</div>
                  <div className="text-[10px] text-white/80">TDEE (kcal/day)</div>
                </div>
              </CardContent>
            </Card>

            {/* Where You Stand + Explorer - 5 cols */}
            <Card className="lg:col-span-5 bg-white border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    Where You Stand
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-slate-500">Explore</Label>
                    <Switch checked={useTheoretical} onCheckedChange={setUseTheoretical} />
                    <Crosshair className={`h-4 w-4 ${useTheoretical ? 'text-purple-500' : 'text-slate-300'}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Explorer inputs */}
                {useTheoretical && (
                  <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Crosshair className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-semibold text-purple-700">Theoretical Values</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[9px] text-purple-600">Fat Mass (lbs)</Label>
                        <Input type="number" value={theoreticalFM} onChange={(e) => setTheoreticalFM(Number(e.target.value))} className="h-8 text-sm bg-white border-purple-200 rounded-lg text-center font-semibold" />
                      </div>
                      <div>
                        <Label className="text-[9px] text-purple-600">FFM (lbs)</Label>
                        <Input type="number" value={theoreticalFFM} onChange={(e) => setTheoreticalFFM(Number(e.target.value))} className="h-8 text-sm bg-white border-purple-200 rounded-lg text-center font-semibold" />
                      </div>
                      <div>
                        <Label className="text-[9px] text-purple-600">Result BF%</Label>
                        <div className="h-8 bg-purple-100 rounded-lg flex items-center justify-center text-sm font-bold text-purple-700">
                          {theoreticalMetrics.bodyFat}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Body Fat Percentile */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-700">Body Fat Percentile</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <CitationTooltip citation={CITATIONS.bfPercentile} />
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                      {useTheoretical && (
                        <span className="text-xs text-purple-600 font-medium">{100 - theoreticalMetrics.bfPercentile}th →</span>
                      )}
                      <span className="text-sm font-bold text-slate-700">{100 - displayMetrics.bfPercentile}th percentile</span>
                    </div>
                  </div>
                  <div className="relative h-10 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-xl overflow-hidden shadow-inner">
                    {[10, 25, 50, 75, 90].map(p => (
                      <div key={p} className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: `${p}%` }}>
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white font-medium">{p}</span>
                      </div>
                    ))}
                    {/* Current marker */}
                    <div className="absolute top-0 bottom-0 w-1 bg-[#00263d] shadow-lg transition-all duration-300" style={{ left: `${100 - currentMetrics.bfPercentile}%` }}>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#00263d] rotate-45" />
                    </div>
                    {/* Theoretical marker */}
                    {useTheoretical && (
                      <div className="absolute top-0 bottom-0 w-1 bg-purple-600 shadow-lg transition-all duration-300" style={{ left: `${100 - theoreticalMetrics.bfPercentile}%` }}>
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-600 rotate-45" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Leaner →</span>
                    <span>← Higher BF%</span>
                  </div>
                </div>
                
                {/* FFMI Percentile */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-700">Muscularity (FFMI) Percentile</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <CitationTooltip citation={CITATIONS.ffmiPercentile} />
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                      {useTheoretical && (
                        <span className="text-xs text-purple-600 font-medium">{theoreticalMetrics.ffmiPercentile}th →</span>
                      )}
                      <span className="text-sm font-bold text-slate-700">{displayMetrics.ffmiPercentile}th percentile</span>
                    </div>
                  </div>
                  <div className="relative h-10 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-xl overflow-hidden shadow-inner">
                    {[10, 25, 50, 75, 90].map(p => (
                      <div key={p} className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: `${p}%` }}>
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white font-medium">{p}</span>
                      </div>
                    ))}
                    <div className="absolute top-0 bottom-0 w-1 bg-[#00263d] shadow-lg transition-all duration-300" style={{ left: `${currentMetrics.ffmiPercentile}%` }}>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#00263d] rotate-45" />
                    </div>
                    {useTheoretical && (
                      <div className="absolute top-0 bottom-0 w-1 bg-purple-600 shadow-lg transition-all duration-300" style={{ left: `${theoreticalMetrics.ffmiPercentile}%` }}>
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-600 rotate-45" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>← Less Muscle</span>
                    <span>More Muscle →</span>
                  </div>
                </div>
                
                {/* Summary badges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 text-center border border-amber-200">
                    <div className="text-[10px] text-amber-600 mb-1">Body Fat Category</div>
                    <Badge className={`${getFMIBenchmark(displayMetrics.fmi).bg} ${getFMIBenchmark(displayMetrics.fmi).color} border-0 text-sm px-3`}>
                      {getFMIBenchmark(displayMetrics.fmi).label}
                    </Badge>
                    <div className="text-xs text-amber-700 mt-1 font-semibold">{displayMetrics.bodyFat}% / {displayMetrics.fmi} FMI</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center border border-blue-200">
                    <div className="text-[10px] text-blue-600 mb-1">Muscularity</div>
                    <Badge className={`${getFFMIBenchmark(displayMetrics.ffmi).bg} ${getFFMIBenchmark(displayMetrics.ffmi).color} border-0 text-sm px-3`}>
                      {getFFMIBenchmark(displayMetrics.ffmi).label}
                    </Badge>
                    <div className="text-xs text-blue-700 mt-1 font-semibold">{displayMetrics.ffmi} FFMI</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mortality Risk - 4 cols */}
            <Card className="lg:col-span-4 bg-white border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                    <Heart className="h-4 w-4 text-red-500" />
                    Mortality Risk Curves
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <CitationTooltip citation={CITATIONS.mortalityRisk} />
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* FMI Risk Curve */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600">Fat Mass Index (FMI)</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-500">HR: <span className={`font-bold ${getHazardRatio(displayMetrics.fmi, 'fmi') <= 1.1 ? 'text-green-600' : getHazardRatio(displayMetrics.fmi, 'fmi') <= 1.5 ? 'text-amber-600' : 'text-red-600'}`}>{getHazardRatio(displayMetrics.fmi, 'fmi').toFixed(2)}</span></span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-2 h-36">
                    <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="fmiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="30%" stopColor="#22c55e" />
                          <stop offset="50%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                        <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                      </defs>
                      {/* Grid */}
                      {[0.25, 0.5, 0.75].map(p => <line key={p} x1="30" y1={10 + 90 * p} x2="380" y2={10 + 90 * p} stroke="#e2e8f0" strokeWidth="1" />)}
                      {/* Optimal zone */}
                      {(() => {
                        const minX = 2, maxX = 18;
                        const scaleX = (x: number) => 30 + ((x - minX) / (maxX - minX)) * 350;
                        return <rect x={scaleX(5)} y="10" width={scaleX(9) - scaleX(5)} height="90" fill="#22c55e" fillOpacity="0.15" rx="4" />;
                      })()}
                      {/* HR=1 line */}
                      {(() => {
                        const minY = 0.9, maxY = 2.5;
                        const y = 100 - ((1 - minY) / (maxY - minY)) * 90;
                        return <><line x1="30" y1={y} x2="380" y2={y} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4" /><text x="385" y={y + 3} fontSize="8" fill="#94a3b8">1.0</text></>;
                      })()}
                      {/* Curve */}
                      {(() => {
                        const minX = 2, maxX = 18, minY = 0.9, maxY = 2.5;
                        const points = MORTALITY_RISK.fmi.points.filter(p => p.x <= maxX).map(p => ({
                          x: 30 + ((p.x - minX) / (maxX - minX)) * 350,
                          y: 100 - ((p.hr - minY) / (maxY - minY)) * 90
                        }));
                        const cx = 30 + ((currentMetrics.fmi - minX) / (maxX - minX)) * 350;
                        const cy = 100 - ((getHazardRatio(currentMetrics.fmi, 'fmi') - minY) / (maxY - minY)) * 90;
                        const tx = useTheoretical ? 30 + ((theoreticalMetrics.fmi - minX) / (maxX - minX)) * 350 : cx;
                        const ty = useTheoretical ? 100 - ((getHazardRatio(theoreticalMetrics.fmi, 'fmi') - minY) / (maxY - minY)) * 90 : cy;
                        return (
                          <>
                            <path d={createSmoothCurve(points)} fill="none" stroke="url(#fmiGrad)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />
                            {useTheoretical && <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#c19962" strokeWidth="2" strokeDasharray="4" />}
                            <circle cx={cx} cy={cy} r="7" fill="#00263d" stroke="#fff" strokeWidth="2" />
                            {useTheoretical && <circle cx={tx} cy={ty} r="7" fill="#9333ea" stroke="#fff" strokeWidth="2" />}
                          </>
                        );
                      })()}
                      <text x="205" y="115" fontSize="9" fill="#64748b" textAnchor="middle">FMI (kg/m²)</text>
                      {/* X-axis labels */}
                      {[4, 8, 12, 16].map(v => {
                        const x = 30 + ((v - 2) / (18 - 2)) * 350;
                        return <text key={v} x={x} y="108" fontSize="8" fill="#94a3b8" textAnchor="middle">{v}</text>;
                      })}
                    </svg>
                  </div>
                </div>
                
                {/* FFMI Risk Curve */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600">Fat-Free Mass Index (FFMI)</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-500">HR: <span className={`font-bold ${getHazardRatio(displayMetrics.ffmi, 'ffmi') <= 0.85 ? 'text-green-600' : getHazardRatio(displayMetrics.ffmi, 'ffmi') <= 1.1 ? 'text-amber-600' : 'text-red-600'}`}>{getHazardRatio(displayMetrics.ffmi, 'ffmi').toFixed(2)}</span></span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-2 h-36">
                    <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="ffmiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="40%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                      {[0.25, 0.5, 0.75].map(p => <line key={p} x1="30" y1={10 + 90 * p} x2="380" y2={10 + 90 * p} stroke="#e2e8f0" strokeWidth="1" />)}
                      {(() => {
                        const minX = 14, maxX = 26;
                        const scaleX = (x: number) => 30 + ((x - minX) / (maxX - minX)) * 350;
                        return <rect x={scaleX(19)} y="10" width={scaleX(24) - scaleX(19)} height="90" fill="#22c55e" fillOpacity="0.15" rx="4" />;
                      })()}
                      {(() => {
                        const minY = 0.6, maxY = 2.5;
                        const y = 100 - ((1 - minY) / (maxY - minY)) * 90;
                        return <><line x1="30" y1={y} x2="380" y2={y} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4" /><text x="385" y={y + 3} fontSize="8" fill="#94a3b8">1.0</text></>;
                      })()}
                      {(() => {
                        const minX = 14, maxX = 26, minY = 0.6, maxY = 2.5;
                        const points = MORTALITY_RISK.ffmi.points.filter(p => p.x >= minX && p.x <= maxX).map(p => ({
                          x: 30 + ((p.x - minX) / (maxX - minX)) * 350,
                          y: 100 - ((p.hr - minY) / (maxY - minY)) * 90
                        }));
                        const cx = 30 + ((Math.min(Math.max(currentMetrics.ffmi, minX), maxX) - minX) / (maxX - minX)) * 350;
                        const cy = 100 - ((getHazardRatio(currentMetrics.ffmi, 'ffmi') - minY) / (maxY - minY)) * 90;
                        const tx = useTheoretical ? 30 + ((Math.min(Math.max(theoreticalMetrics.ffmi, minX), maxX) - minX) / (maxX - minX)) * 350 : cx;
                        const ty = useTheoretical ? 100 - ((getHazardRatio(theoreticalMetrics.ffmi, 'ffmi') - minY) / (maxY - minY)) * 90 : cy;
                        return (
                          <>
                            <path d={createSmoothCurve(points)} fill="none" stroke="url(#ffmiGrad)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />
                            {useTheoretical && <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#c19962" strokeWidth="2" strokeDasharray="4" />}
                            <circle cx={cx} cy={cy} r="7" fill="#00263d" stroke="#fff" strokeWidth="2" />
                            {useTheoretical && <circle cx={tx} cy={ty} r="7" fill="#9333ea" stroke="#fff" strokeWidth="2" />}
                          </>
                        );
                      })()}
                      <text x="205" y="115" fontSize="9" fill="#64748b" textAnchor="middle">FFMI (kg/m²)</text>
                      {[16, 18, 20, 22, 24].map(v => {
                        const x = 30 + ((v - 14) / (26 - 14)) * 350;
                        return <text key={v} x={x} y="108" fontSize="8" fill="#94a3b8" textAnchor="middle">{v}</text>;
                      })}
                    </svg>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#00263d]" />Current</span>
                  {useTheoretical && <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-600" />Theoretical</span>}
                  <span className="flex items-center gap-1"><div className="w-6 h-3 rounded bg-green-500/20" />Optimal</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Goal, Target, Rate */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Goal */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#00263d] text-white text-[10px] font-bold">2</div>
                  <Target className="h-4 w-4 text-blue-500" />
                  Select Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {[
                  { value: 'fat_loss', label: 'Fat Loss', desc: 'Reduce body fat', icon: TrendingDown, color: 'from-red-500 to-orange-500', iconColor: 'text-red-500', bgColor: 'bg-red-50' },
                  { value: 'muscle_gain', label: 'Build Muscle', desc: 'Add lean mass', icon: TrendingUp, color: 'from-blue-500 to-cyan-500', iconColor: 'text-blue-500', bgColor: 'bg-blue-50' },
                  { value: 'recomposition', label: 'Recomposition', desc: 'Both simultaneously', icon: RefreshCcw, color: 'from-purple-500 to-pink-500', iconColor: 'text-purple-500', bgColor: 'bg-purple-50' },
                ].map(({ value, label, desc, icon: Icon, color, iconColor, bgColor }) => (
                  <button key={value} onClick={() => setPhaseType(value as any)}
                    className={`w-full p-3 rounded-xl text-left transition-all ${phaseType === value ? `bg-gradient-to-r ${color} text-white shadow-lg` : `${bgColor} hover:shadow-md`}`}>
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${phaseType === value ? 'text-white' : iconColor}`} />
                      <div className="flex-1">
                        <div className={`font-semibold text-sm ${phaseType === value ? 'text-white' : 'text-slate-700'}`}>{label}</div>
                        <div className={`text-[10px] ${phaseType === value ? 'text-white/80' : 'text-slate-500'}`}>{desc}</div>
                      </div>
                      {phaseType === value && <CheckCircle2 className="h-5 w-5 text-white" />}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Target */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#00263d] text-white text-[10px] font-bold">3</div>
                  <Scale className="h-4 w-4 text-green-500" />
                  Set Target
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {phaseType === 'recomposition' ? (
                  <div className="space-y-2">
                    {Object.entries(RECOMP_EXPECTATIONS).map(([key, val]) => (
                      <button key={key} onClick={() => setRecompExperience(key as any)}
                        className={`w-full p-3 rounded-xl text-left transition-all ${recompExperience === key ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100'}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">{val.label}</span>
                          <span className={`text-[10px] ${recompExperience === key ? 'text-white/80' : 'text-slate-500'}`}>{val.probability}%</span>
                        </div>
                        <div className={`text-[10px] mt-0.5 ${recompExperience === key ? 'text-white/70' : 'text-slate-400'}`}>
                          -{val.monthlyFatLoss} FM / +{val.monthlyMuscleGain} FFM /mo
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-5 gap-1">
                      {[{ value: 'body_fat', label: 'BF%' }, { value: 'fmi', label: 'FMI' }, { value: 'ffmi', label: 'FFMI' }, { value: 'fat_mass', label: 'FM' }, { value: 'ffm', label: 'FFM' }].map(({ value, label }) => (
                        <button key={value} onClick={() => setTargetMethod(value as any)}
                          className={`text-[10px] font-semibold py-2 rounded-lg transition-colors ${targetMethod === value ? 'bg-[#00263d] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      {targetMethod === 'body_fat' && (
                        <div className="space-y-2">
                          <div className="flex justify-between"><Label className="text-xs text-slate-500">Target BF%</Label><span className="text-sm font-bold text-[#00263d]">{targetBodyFat}%</span></div>
                          <Slider value={[targetBodyFat]} onValueChange={([v]) => setTargetBodyFat(v)} min={5} max={35} step={0.5} />
                          <div className="text-[10px] text-slate-400">Current: {currentBodyFat}%</div>
                        </div>
                      )}
                      {targetMethod === 'fmi' && (
                        <div className="space-y-2">
                          <div className="flex justify-between"><Label className="text-xs text-slate-500">Target FMI</Label><span className="text-sm font-bold text-[#00263d]">{targetFMI}</span></div>
                          <Slider value={[targetFMI]} onValueChange={([v]) => setTargetFMI(v)} min={2} max={15} step={0.5} />
                          <div className="text-[10px] text-slate-400">Current: {currentMetrics.fmi}</div>
                        </div>
                      )}
                      {targetMethod === 'ffmi' && (
                        <div className="space-y-2">
                          <div className="flex justify-between"><Label className="text-xs text-slate-500">Target FFMI</Label><span className="text-sm font-bold text-[#00263d]">{targetFFMI}</span></div>
                          <Slider value={[targetFFMI]} onValueChange={([v]) => setTargetFFMI(v)} min={16} max={28} step={0.5} />
                          <div className="text-[10px] text-slate-400">Current: {currentMetrics.ffmi}</div>
                        </div>
                      )}
                      {targetMethod === 'fat_mass' && (
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-500">Target Fat Mass (lbs)</Label>
                          <Input type="number" value={targetFatMass} onChange={(e) => setTargetFatMass(Number(e.target.value))} className="h-9 text-center font-bold" />
                          <div className="text-[10px] text-slate-400">Current: {currentMetrics.fatMassLbs} lbs</div>
                        </div>
                      )}
                      {targetMethod === 'ffm' && (
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-500">Target FFM (lbs)</Label>
                          <Input type="number" value={targetFFM} onChange={(e) => setTargetFFM(Number(e.target.value))} className="h-9 text-center font-bold" />
                          <div className="text-[10px] text-slate-400">Current: {currentMetrics.ffmLbs} lbs</div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Rate & Timeline */}
            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#00263d] text-white text-[10px] font-bold">4</div>
                  <Clock className="h-4 w-4 text-amber-500" />
                  Rate & Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {phaseType !== 'recomposition' && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-500">Custom Rate</Label>
                      <Switch checked={useCustomRate} onCheckedChange={setUseCustomRate} />
                    </div>
                    {useCustomRate ? (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <Slider value={[customRate]} onValueChange={([v]) => setCustomRate(v)} min={0.1} max={1.5} step={0.05} className="flex-1" />
                          <span className="text-lg font-bold text-[#00263d] w-16 text-center">{customRate}%</span>
                        </div>
                        <div className="text-[10px] text-center text-slate-400 mt-1">≈ {Math.round(currentWeight * customRate / 100 * 10) / 10} lbs/week</div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {Object.entries(phaseType === 'fat_loss' ? RATE_PRESETS.fat_loss : RATE_PRESETS.muscle_gain).map(([key, val]) => {
                          const isSelected = phaseType === 'fat_loss' ? fatLossRateKey === key : muscleGainRateKey === key;
                          return (
                            <button key={key} onClick={() => phaseType === 'fat_loss' ? setFatLossRateKey(key) : setMuscleGainRateKey(key)}
                              className={`w-full p-2 rounded-lg text-left transition-all ${isSelected ? `bg-gradient-to-r ${phaseType === 'fat_loss' ? 'from-red-500 to-orange-500' : 'from-blue-500 to-cyan-500'} text-white` : 'bg-slate-50 hover:bg-slate-100'}`}>
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-xs">{val.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20' : 'bg-slate-200'}`}>{val.rate}%/wk</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-3 text-white text-center">
                  <Calendar className="h-4 w-4 mx-auto mb-1 text-white/80" />
                  <div className="text-2xl font-bold">{calculatedTimeline.weeks} weeks</div>
                  <div className="text-[10px] text-white/80">End: {formatDate(calculatedTimeline.endDate)}</div>
                </div>
                
                <div className={`rounded-xl p-3 border ${feasibility.probability >= 70 ? 'bg-green-50 border-green-200' : feasibility.probability >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-700">Success Probability</span>
                    <Badge className={`${feasibility.probability >= 70 ? 'bg-green-500' : feasibility.probability >= 40 ? 'bg-amber-500' : 'bg-red-500'} text-white border-0 text-xs`}>{feasibility.probability}%</Badge>
                  </div>
                  <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${feasibility.probability >= 70 ? 'bg-green-500' : feasibility.probability >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${feasibility.probability}%` }} />
                  </div>
                  <p className="text-[10px] mt-1.5 text-slate-600">{feasibility.message}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Parameters + Results */}
          {projectedMetrics && summary && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Parameters - 2 cols */}
              <Card className="lg:col-span-2 bg-white border-0 shadow-lg rounded-2xl">
                <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                    <Settings2 className="h-4 w-4 text-slate-500" />
                    Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <Label className="text-[9px] text-slate-400 uppercase">Protein</Label>
                    <Select value={proteinLevel} onValueChange={(v: any) => setProteinLevel(v)}>
                      <SelectTrigger className="h-8 text-[11px] bg-slate-50"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(PROTEIN_EFFECT).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] text-slate-400 uppercase">Training</Label>
                    <Select value={trainingLevel} onValueChange={(v: any) => setTrainingLevel(v)}>
                      <SelectTrigger className="h-8 text-[11px] bg-slate-50"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(TRAINING_EFFECT).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <Label className="text-[10px] text-slate-500">Water</Label>
                    <Switch checked={includeWaterChanges} onCheckedChange={setIncludeWaterChanges} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <Label className="text-[10px] text-slate-500">Show CI</Label>
                    <Switch checked={showCI} onCheckedChange={setShowCI} />
                  </div>
                </CardContent>
              </Card>

              {/* Results Summary - 3 cols */}
              <Card className="lg:col-span-3 bg-white border-0 shadow-lg rounded-2xl">
                <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                    <Zap className="h-4 w-4 text-[#c19962]" />
                    Projected Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="text-xl font-bold text-[#00263d]">{projectedMetrics.weightLbs}</div>
                      <div className="text-[9px] text-slate-500">Weight</div>
                      <div className={`text-[10px] font-medium ${summary.totalWeightChange < 0 ? 'text-green-600' : 'text-blue-600'}`}>{summary.totalWeightChange < 0 ? '' : '+'}{summary.totalWeightChange}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="text-xl font-bold text-[#00263d]">{projectedMetrics.bodyFat}%</div>
                      <div className="text-[9px] text-slate-500">Body Fat</div>
                      <div className={`text-[10px] font-medium ${projectedMetrics.bodyFat < currentBodyFat ? 'text-green-600' : 'text-orange-600'}`}>{(projectedMetrics.bodyFat - currentBodyFat).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500 text-xs">FM</span><span className="font-semibold">{projectedMetrics.fatMassLbs} <span className={`text-[10px] ${summary.totalFatChange < 0 ? 'text-green-600' : 'text-red-500'}`}>({summary.totalFatChange})</span></span></div>
                    <div className="flex justify-between"><span className="text-slate-500 text-xs">FFM</span><span className="font-semibold">{projectedMetrics.ffmLbs} <span className={`text-[10px] ${summary.totalFFMChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>({summary.totalFFMChange >= 0 ? '+' : ''}{summary.totalFFMChange})</span></span></div>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden flex bg-slate-200">
                    <div className="bg-amber-500" style={{ width: `${summary.pctFromFat}%` }} />
                    <div className="bg-rose-500" style={{ width: `${summary.pctFromFFM}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span className="text-amber-600">Fat: {summary.pctFromFat}%</span>
                    <span className="text-rose-600">FFM: {summary.pctFromFFM}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline Graphs - 7 cols */}
              <Card className="lg:col-span-7 bg-white border-0 shadow-lg rounded-2xl">
                <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                      <LineChart className="h-4 w-4 text-purple-500" />
                      Timeline
                    </CardTitle>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200">
                      <button onClick={() => setViewMode('graph')} className={`px-2 py-1 text-[10px] font-medium ${viewMode === 'graph' ? 'bg-purple-500 text-white' : 'bg-white text-slate-600'}`}>Graph</button>
                      <button onClick={() => setViewMode('table')} className={`px-2 py-1 text-[10px] font-medium border-l border-slate-200 ${viewMode === 'table' ? 'bg-purple-500 text-white' : 'bg-white text-slate-600'}`}>Table</button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  {viewMode === 'graph' ? (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { title: 'Weight', data: weeklyProjections.map(p => p.weight), color: '#3b82f6', unit: 'lbs' },
                        { title: 'Fat Mass', data: weeklyProjections.map(p => p.fatMass), color: '#f59e0b', unit: 'lbs' },
                        { title: 'Body Fat %', data: weeklyProjections.map(p => p.bodyFat), color: '#22c55e', unit: '%' },
                      ].map(({ title, data, color, unit }) => {
                        const min = Math.min(...data) - 1, max = Math.max(...data) + 1;
                        const points = data.map((v, i) => ({ x: 15 + (i / (data.length - 1)) * 170, y: 75 - ((v - min) / (max - min)) * 60 }));
                        return (
                          <div key={title} className="bg-slate-50 rounded-lg p-2">
                            <div className="text-[10px] font-semibold text-slate-600 mb-1">{title}</div>
                            <svg className="w-full h-20" viewBox="0 0 200 90">
                              <defs><linearGradient id={`fill-${title}`} x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
                              <path d={createSmoothCurve(points) + ` L ${points[points.length - 1].x} 75 L ${points[0].x} 75 Z`} fill={`url(#fill-${title})`} />
                              <path d={createSmoothCurve(points)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
                              <circle cx={points[0].x} cy={points[0].y} r="3" fill="#ef4444" stroke="#fff" strokeWidth="1" />
                              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill="#22c55e" stroke="#fff" strokeWidth="1" />
                              <text x="5" y="18" fontSize="7" fill="#94a3b8">{max.toFixed(1)}</text>
                              <text x="5" y="72" fontSize="7" fill="#94a3b8">{min.toFixed(1)}</text>
                            </svg>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <ScrollArea className="h-32">
                      <table className="w-full text-[10px]">
                        <thead className="sticky top-0 bg-white"><tr className="text-slate-500"><th className="p-1 text-left">Wk</th><th className="p-1">Weight</th><th className="p-1">FM</th><th className="p-1">FFM</th><th className="p-1">BF%</th></tr></thead>
                        <tbody>{weeklyProjections.map((p, i) => <tr key={p.week} className={i % 2 === 0 ? 'bg-slate-50/50' : ''}><td className="p-1 font-medium">{p.week}</td><td className="p-1 text-center">{p.weight}</td><td className="p-1 text-center text-amber-600">{p.fatMass}</td><td className="p-1 text-center text-blue-600">{p.ffm}</td><td className="p-1 text-center text-green-600">{p.bodyFat}%</td></tr>)}</tbody>
                      </table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Row 4: Nutrition */}
          {nutritionTargets && (
            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#00263d] text-white text-[10px] font-bold">5</div>
                  <Activity className="h-4 w-4 text-green-500" />
                  Recommended Nutrition
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white text-center">
                    <div className="text-4xl font-bold">{nutritionTargets.calories}</div>
                    <div className="text-xs text-white/80">Daily Calories</div>
                    <div className="text-[10px] text-white/60 mt-1">{nutritionTargets.deficit < 0 ? `${Math.abs(nutritionTargets.deficit)} deficit` : `${nutritionTargets.deficit} surplus`}</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">{nutritionTargets.protein}g</div>
                    <div className="text-[10px] text-blue-500">Protein</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                    <div className="text-2xl font-bold text-amber-600">{nutritionTargets.carbs}g</div>
                    <div className="text-[10px] text-amber-500">Carbs</div>
                  </div>
                  <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
                    <div className="text-2xl font-bold text-rose-600">{nutritionTargets.fat}g</div>
                    <div className="text-[10px] text-rose-500">Fat</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center text-white/40 text-[10px] py-2">
            <p>Evidence: Forbes (2000), Heymsfield (2014), Sedlmeier et al. (2021), Schutz et al. (2002), NHANES</p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
