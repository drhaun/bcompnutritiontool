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
  AlertTriangle,
  Download,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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

// Body Fat Percentile Data - note: lower BF = leaner = HIGHER percentile rank
// These are "percentile of population with HIGHER body fat"
const BF_PERCENTILES_MALE = [
  { pct: 95, bf: 6 },   // 6% BF = leaner than 95%
  { pct: 90, bf: 8 },   // 8% BF = leaner than 90%
  { pct: 75, bf: 12 },  // 12% BF = leaner than 75%
  { pct: 50, bf: 18 },  // 18% BF = average
  { pct: 25, bf: 24 },  // 24% BF = leaner than 25%
  { pct: 10, bf: 30 },  // 30% BF = leaner than 10%
  { pct: 5, bf: 35 },   // 35% BF = leaner than 5%
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

// For BF: lower BF = higher "leanness percentile"
const getBFPercentile = (bf: number): number => {
  const data = BF_PERCENTILES_MALE;
  // Data is sorted high pct to low pct (low BF to high BF)
  if (bf <= data[0].bf) return data[0].pct; // Very lean
  if (bf >= data[data.length - 1].bf) return data[data.length - 1].pct; // High BF
  for (let i = 0; i < data.length - 1; i++) {
    if (bf >= data[i].bf && bf <= data[i + 1].bf) {
      const t = (bf - data[i].bf) / (data[i + 1].bf - data[i].bf);
      return Math.round(data[i].pct - t * (data[i].pct - data[i + 1].pct));
    }
  }
  return 50;
};

// For FFMI: higher FFMI = higher percentile
const getFFMIPercentile = (ffmi: number): number => {
  const data = FFMI_PERCENTILES_MALE;
  if (ffmi <= data[0].ffmi) return data[0].pct;
  if (ffmi >= data[data.length - 1].ffmi) return data[data.length - 1].pct;
  for (let i = 0; i < data.length - 1; i++) {
    if (ffmi >= data[i].ffmi && ffmi <= data[i + 1].ffmi) {
      const t = (ffmi - data[i].ffmi) / (data[i + 1].ffmi - data[i].ffmi);
      return Math.round(data[i].pct + t * (data[i + 1].pct - data[i].pct));
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
  const [theoreticalFM, setTheoreticalFM] = useState<number>(25);
  const [theoreticalFFM, setTheoreticalFFM] = useState<number>(165);
  
  // Timeline start date
  const [startDate, setStartDate] = useState<string>(formatDate(new Date()));
  
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
  const [includeWaterChanges, setIncludeWaterChanges] = useState<boolean>(true);
  const [showCI, setShowCI] = useState<boolean>(true);
  
  // View
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [selectedGraphVar, setSelectedGraphVar] = useState<'weight' | 'bodyFat' | 'fatMass' | 'ffm'>('weight');
  
  // PDF Export
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
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
      fmi: Math.round(fmi * 10) / 10,
      ffmi: Math.round(ffmi * 10) / 10,
      bfPercentile: getBFPercentile(currentBodyFat),
      ffmiPercentile: getFFMIPercentile(ffmi),
    };
  }, [currentWeight, currentBodyFat, heightM]);
  
  // Theoretical metrics
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
      bfPercentile: getBFPercentile(theoreticalBFCalc),
      ffmiPercentile: getFFMIPercentile(ffmi),
    };
  }, [theoreticalFM, theoreticalFFM, heightM]);
  
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
  
  // Timeline
  const calculatedTimeline = useMemo(() => {
    const baseDate = new Date(startDate);
    if (phaseType === 'recomposition') return { weeks: 12, endDate: addWeeks(baseDate, 12) };
    if (!targetMetrics) return { weeks: 12, endDate: addWeeks(baseDate, 12) };
    const weightChange = Math.abs(targetMetrics.weightLbs - currentWeight);
    const weeklyChange = currentWeight * (effectiveRate / 100);
    const weeks = Math.max(4, Math.ceil(weightChange / weeklyChange));
    return { weeks, endDate: addWeeks(baseDate, weeks) };
  }, [targetMetrics, currentWeight, effectiveRate, phaseType, startDate]);
  
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
    const baseDate = new Date(startDate);
    for (let w = 0; w <= totalWeeks; w++) {
      const t = w / totalWeeks;
      const fm = startFm + (endFm - startFm) * t;
      const ffm = startFfm + (endFfm - startFfm) * t;
      const wt = fm + ffm;
      const fmKg = fm * 0.453592;
      const ffmKg = ffm * 0.453592;
      projections.push({
        week: w, date: formatDate(addWeeks(baseDate, w)),
        weight: Math.round(wt * 10) / 10, fatMass: Math.round(fm * 10) / 10, ffm: Math.round(ffm * 10) / 10,
        bodyFat: Math.round((fm / wt) * 1000) / 10,
        fmi: Math.round((fmKg / (heightM * heightM)) * 10) / 10,
        ffmi: Math.round((ffmKg / (heightM * heightM)) * 10) / 10,
      });
    }
    return projections;
  }, [currentMetrics, projectedMetrics, calculatedTimeline.weeks, heightM, startDate]);
  
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

  // PDF Export handler
  const handleExportPDF = async () => {
    if (!nutritionTargets || !summary) {
      toast.error('Please complete the body composition setup first');
      return;
    }

    setIsExportingPDF(true);
    try {
      // Calculate metabolic data
      const neat = neatEstimates[neatLevel];
      const tefValue = Math.round(tdee * (tef / 100));
      
      // Build projections array (first 8 weeks + final)
      const projectionsForPDF = weeklyProjections
        .filter((_, idx) => idx % Math.max(1, Math.floor(weeklyProjections.length / 8)) === 0 || idx === weeklyProjections.length - 1)
        .slice(0, 9)
        .map(p => ({
          week: p.week,
          weight: p.weight,
          bodyFat: p.bodyFat,
          fatMass: p.fatMass,
          leanMass: p.ffm,
        }));

      const pdfData = {
        clientName: '', // No client name for standalone calculator
        currentStats: {
          weight: currentWeight,
          height: heightFt * 12 + heightIn,
          age: age,
          gender: gender,
          bodyFat: currentBodyFat,
          fatMass: fatMassLbs,
          leanMass: ffmLbs,
          bmi: bmi,
          fmi: fmi,
          ffmi: ffmi,
        },
        targetStats: {
          weight: targetWeightResult,
          bodyFat: targetBFResult,
          fatMass: targetFMLbs,
          leanMass: targetFFMLbs,
          fmi: targetFMI,
          ffmi: targetFFMI,
        },
        metabolicData: {
          rmr: effectiveRmr,
          neat: neat,
          tef: tefValue,
          eee: eee,
          tdee: tdee,
        },
        phase: {
          goalType: phaseType === 'fat_loss' ? 'lose_fat' : phaseType === 'muscle_gain' ? 'gain_muscle' : 'recomp',
          durationWeeks: calculatedTimeline.weeks,
          weeklyChange: effectiveRate,
          startDate: startDate,
        },
        projections: projectionsForPDF,
        startingTargets: {
          calories: nutritionTargets.calories,
          protein: nutritionTargets.protein,
          carbs: nutritionTargets.carbs,
          fat: nutritionTargets.fat,
        },
      };

      const response = await fetch('/api/generate-body-comp-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'body-composition-report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Body composition report exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Graph variable configurations
  const graphConfigs = {
    weight: { label: 'Weight', unit: ' lbs', color: '#6366f1', data: weeklyProjections.map(p => p.weight) },
    bodyFat: { label: 'Body Fat', unit: '%', color: '#f59e0b', data: weeklyProjections.map(p => p.bodyFat) },
    fatMass: { label: 'Fat Mass', unit: ' lbs', color: '#ef4444', data: weeklyProjections.map(p => p.fatMass) },
    ffm: { label: 'FFM', unit: ' lbs', color: '#22c55e', data: weeklyProjections.map(p => p.ffm) },
  };

  // Large interactive graph component
  const LargeGraph = () => {
    const config = graphConfigs[selectedGraphVar];
    const data = config.data;
    if (data.length === 0) return null;
    
    const padding = { left: 55, right: 20, top: 25, bottom: 40 };
    const width = 600;
    const height = 220;
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    const min = Math.min(...data) - (Math.max(...data) - Math.min(...data)) * 0.1;
    const max = Math.max(...data) + (Math.max(...data) - Math.min(...data)) * 0.1;
    const range = max - min || 1;
    
    const points = data.map((v, i) => ({
      x: padding.left + (i / Math.max(1, data.length - 1)) * graphWidth,
      y: padding.top + graphHeight - ((v - min) / range) * graphHeight,
      value: v,
      week: i
    }));
    
    // Y-axis ticks
    const yTicks = 5;
    const yTickValues = Array.from({ length: yTicks }, (_, i) => min + (range * i) / (yTicks - 1));
    
    // X-axis ticks (show every few weeks)
    const xTickInterval = Math.max(1, Math.floor(data.length / 8));
    const xTicks = data.map((_, i) => i).filter(i => i % xTickInterval === 0 || i === data.length - 1);
    
    return (
      <svg 
        className="w-full cursor-crosshair" 
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoveredWeek(null)}
      >
        <defs>
          <linearGradient id="graphAreaFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={config.color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={config.color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        
        {/* Background */}
        <rect x={padding.left} y={padding.top} width={graphWidth} height={graphHeight} fill="#f8fafc" rx="4" />
        
        {/* Horizontal grid lines */}
        {yTickValues.map((val, i) => {
          const y = padding.top + graphHeight - ((val - min) / range) * graphHeight;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={padding.left + graphWidth} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} fontSize="11" fill="#64748b" textAnchor="end" fontWeight="500">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}
        
        {/* X-axis labels - show dates */}
        {xTicks.map(i => {
          const x = padding.left + (i / Math.max(1, data.length - 1)) * graphWidth;
          const dateStr = weeklyProjections[i]?.date || '';
          const dateObj = new Date(dateStr);
          const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
          const day = dateObj.getDate();
          return (
            <text key={i} x={x} y={height - 12} fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="500">
              {month} {day}
            </text>
          );
        })}
        
        {/* Area fill */}
        {points.length > 0 && (
          <path 
            d={createSmoothCurve(points) + ` L ${points[points.length - 1].x} ${padding.top + graphHeight} L ${points[0].x} ${padding.top + graphHeight} Z`} 
            fill="url(#graphAreaFill)" 
          />
        )}
        
        {/* Main line */}
        <path 
          d={createSmoothCurve(points)} 
          fill="none" 
          stroke={config.color} 
          strokeWidth="3" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Interactive hit areas and points */}
        {points.map((p, i) => (
          <g key={i}>
            {/* Invisible hit area */}
            <rect 
              x={p.x - 15} y={padding.top} 
              width={30} height={graphHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredWeek(i)}
            />
            {/* Start point */}
            {i === 0 && (
              <circle cx={p.x} cy={p.y} r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
            )}
            {/* End point */}
            {i === points.length - 1 && (
              <circle cx={p.x} cy={p.y} r="6" fill="#22c55e" stroke="#fff" strokeWidth="2" />
            )}
            {/* Hovered point */}
            {hoveredWeek === i && i !== 0 && i !== points.length - 1 && (
              <circle cx={p.x} cy={p.y} r="6" fill={config.color} stroke="#fff" strokeWidth="2" />
            )}
          </g>
        ))}
        
        {/* Hover vertical line and tooltip */}
        {hoveredWeek !== null && points[hoveredWeek] && weeklyProjections[hoveredWeek] && (() => {
          const dateStr = weeklyProjections[hoveredWeek].date;
          const dateObj = new Date(dateStr);
          const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return (
            <g>
              <line 
                x1={points[hoveredWeek].x} y1={padding.top} 
                x2={points[hoveredWeek].x} y2={padding.top + graphHeight} 
                stroke={config.color} strokeWidth="1" strokeDasharray="4" opacity="0.5"
              />
              <rect 
                x={Math.min(width - 110, Math.max(5, points[hoveredWeek].x - 55))} 
                y={Math.max(5, points[hoveredWeek].y - 58)} 
                width="110" height="53" rx="6" 
                fill="#1e293b" 
                filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
              />
              <text 
                x={Math.min(width - 110, Math.max(5, points[hoveredWeek].x - 55)) + 55} 
                y={Math.max(5, points[hoveredWeek].y - 58) + 16} 
                fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="500"
              >
                Week {hoveredWeek}
              </text>
              <text 
                x={Math.min(width - 110, Math.max(5, points[hoveredWeek].x - 55)) + 55} 
                y={Math.max(5, points[hoveredWeek].y - 58) + 32} 
                fontSize="11" fill="#fff" textAnchor="middle" fontWeight="600"
              >
                {formattedDate}
              </text>
              <text 
                x={Math.min(width - 110, Math.max(5, points[hoveredWeek].x - 55)) + 55} 
                y={Math.max(5, points[hoveredWeek].y - 58) + 48} 
                fontSize="14" fill={config.color} textAnchor="middle" fontWeight="700"
              >
                {data[hoveredWeek]}{config.unit}
              </text>
            </g>
          );
        })()}
        
        {/* Axis labels */}
        <text x={width / 2} y={height - 2} fontSize="10" fill="#94a3b8" textAnchor="middle">Timeline</text>
        <text 
          x={12} y={height / 2} 
          fontSize="10" fill="#94a3b8" textAnchor="middle" 
          transform={`rotate(-90, 12, ${height / 2})`}
        >
          {config.label} ({config.unit.trim()})
        </text>
      </svg>
    );
  };

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
            
            {/* Current Stats & Metabolism */}
            <Card className="lg:col-span-4 bg-white border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#00263d] text-white text-[10px] font-bold">1</div>
                  <User className="h-4 w-4 text-[#c19962]" />
                  Current Stats & Metabolism
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {/* Biometrics Row */}
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[9px] font-medium text-slate-500 uppercase">Gender</Label>
                    <Select value={gender} onValueChange={(v: 'male' | 'female') => setGender(v)}>
                      <SelectTrigger className="h-7 text-xs bg-slate-50 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] font-medium text-slate-500 uppercase">Age</Label>
                    <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="h-7 text-xs bg-slate-50 rounded-lg text-center" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[9px] font-medium text-slate-500 uppercase">Height</Label>
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <Input type="number" value={heightFt} onChange={(e) => setHeightFt(Number(e.target.value))} className="h-7 text-xs bg-slate-50 rounded-lg pr-5 text-center" />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-400">ft</span>
                      </div>
                      <div className="relative flex-1">
                        <Input type="number" value={heightIn} onChange={(e) => setHeightIn(Number(e.target.value))} className="h-7 text-xs bg-slate-50 rounded-lg pr-5 text-center" />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-400">in</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Weight & BF */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] font-medium text-slate-500 uppercase">Weight (lbs)</Label>
                    <Input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(Number(e.target.value))} className="h-9 text-base font-bold bg-slate-50 rounded-lg text-center" />
                  </div>
                  <div>
                    <Label className="text-[9px] font-medium text-slate-500 uppercase">Body Fat %</Label>
                    <Input type="number" step="0.1" value={currentBodyFat} onChange={(e) => setCurrentBodyFat(Number(e.target.value))} className="h-9 text-base font-bold bg-slate-50 rounded-lg text-center" />
                  </div>
                </div>
                
                {/* Derived Composition */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="bg-amber-50 rounded-lg p-1.5 border border-amber-100">
                    <div className="text-sm font-bold text-amber-700">{currentMetrics.fatMassLbs}</div>
                    <div className="text-[8px] text-amber-600">FM (lbs)</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-100">
                    <div className="text-sm font-bold text-blue-700">{currentMetrics.ffmLbs}</div>
                    <div className="text-[8px] text-blue-600">FFM (lbs)</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-1.5">
                    <Badge className={`${getFMIBenchmark(currentMetrics.fmi).bg} ${getFMIBenchmark(currentMetrics.fmi).color} border-0 text-[9px] px-1`}>
                      {currentMetrics.fmi}
                    </Badge>
                    <div className="text-[8px] text-slate-500">FMI</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-1.5">
                    <Badge className={`${getFFMIBenchmark(currentMetrics.ffmi).bg} ${getFFMIBenchmark(currentMetrics.ffmi).color} border-0 text-[9px] px-1`}>
                      {currentMetrics.ffmi}
                    </Badge>
                    <div className="text-[8px] text-slate-500">FFMI</div>
                  </div>
                </div>
                
                <Separator className="my-1" />
                
                {/* RMR Section */}
                <div className="bg-slate-50 rounded-lg p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[9px] font-semibold text-slate-600 uppercase flex items-center gap-1">
                      <Zap className="h-3 w-3 text-orange-500" />
                      Resting Metabolic Rate
                    </Label>
                    <div className="flex rounded-md overflow-hidden border border-slate-200">
                      <button 
                        onClick={() => setRmrSource('estimated')} 
                        className={`px-2 py-0.5 text-[8px] font-medium ${rmrSource === 'estimated' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600'}`}
                      >
                        Estimated
                      </button>
                      <button 
                        onClick={() => setRmrSource('measured')} 
                        className={`px-2 py-0.5 text-[8px] font-medium border-l border-slate-200 ${rmrSource === 'measured' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600'}`}
                      >
                        Measured
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <div className="text-[8px] text-slate-400 uppercase">Mifflin-St Jeor</div>
                      <div className={`text-base font-bold ${rmrSource === 'estimated' ? 'text-orange-600' : 'text-slate-400'}`}>{estimatedRmr}</div>
                    </div>
                    {rmrSource === 'measured' ? (
                      <div>
                        <div className="text-[8px] text-slate-400 uppercase text-center">Measured RMR</div>
                        <Input 
                          type="number" 
                          value={measuredRmr} 
                          onChange={(e) => setMeasuredRmr(Number(e.target.value))} 
                          className="h-7 text-sm font-bold bg-white rounded-lg text-center border-orange-200" 
                        />
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-[8px] text-slate-400 uppercase">Using</div>
                        <div className="text-base font-bold text-orange-600">{effectiveRmr} kcal</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* NEAT & Activity */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] font-medium text-slate-500 uppercase">NEAT Level</Label>
                    <Select value={neatLevel} onValueChange={(v: any) => setNeatLevel(v)}>
                      <SelectTrigger className="h-7 text-[10px] bg-slate-50 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary" className="text-xs">Sedentary (+{neatEstimates.sedentary})</SelectItem>
                        <SelectItem value="light" className="text-xs">Light (+{neatEstimates.light})</SelectItem>
                        <SelectItem value="moderate" className="text-xs">Moderate (+{neatEstimates.moderate})</SelectItem>
                        <SelectItem value="active" className="text-xs">Active (+{neatEstimates.active})</SelectItem>
                        <SelectItem value="very_active" className="text-xs">Very Active (+{neatEstimates.very_active})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] font-medium text-slate-500 uppercase">TEF (%)</Label>
                    <Input type="number" value={tef} onChange={(e) => setTef(Number(e.target.value))} className="h-7 text-xs bg-slate-50 rounded-lg text-center" />
                  </div>
                </div>
                
                {/* Exercise */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] font-medium text-slate-500 uppercase">EEE (kcal/session)</Label>
                    <Input type="number" value={eee} onChange={(e) => setEee(Number(e.target.value))} className="h-7 text-xs bg-slate-50 rounded-lg text-center" />
                  </div>
                  <div>
                    <Label className="text-[9px] font-medium text-slate-500 uppercase">Workouts/Week</Label>
                    <Input type="number" value={workoutsPerWeek} onChange={(e) => setWorkoutsPerWeek(Number(e.target.value))} className="h-7 text-xs bg-slate-50 rounded-lg text-center" />
                  </div>
                </div>
                
                {/* TDEE Result */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-2 text-center">
                  <div className="text-lg font-bold text-white">{tdee} <span className="text-xs font-normal opacity-80">kcal/day</span></div>
                  <div className="text-[8px] text-white/70">
                    RMR {effectiveRmr} + NEAT {neatEstimates[neatLevel]} + TEF {Math.round(effectiveRmr * tef / 100)} + EEE {Math.round(eee * workoutsPerWeek / 7)}/day
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Where You Stand + Explorer */}
            <Card className="lg:col-span-4 bg-white border-0 shadow-lg rounded-2xl">
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
              <CardContent className="p-4 space-y-3">
                {/* Explorer inputs */}
                {useTheoretical && (
                  <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Crosshair className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-semibold text-purple-700">Explore Theoretical Values</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[9px] text-purple-600">Fat Mass (lbs)</Label>
                        <Input type="number" value={theoreticalFM} onChange={(e) => setTheoreticalFM(Number(e.target.value))} className="h-9 text-sm bg-white border-purple-200 rounded-lg text-center font-bold" />
                      </div>
                      <div>
                        <Label className="text-[9px] text-purple-600">FFM (lbs)</Label>
                        <Input type="number" value={theoreticalFFM} onChange={(e) => setTheoreticalFFM(Number(e.target.value))} className="h-9 text-sm bg-white border-purple-200 rounded-lg text-center font-bold" />
                      </div>
                      <div>
                        <Label className="text-[9px] text-purple-600">Result</Label>
                        <div className="h-9 bg-purple-100 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-sm font-bold text-purple-700">{theoreticalMetrics.bodyFat}%</span>
                          <span className="text-[8px] text-purple-500">{theoreticalMetrics.weight} lbs</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Body Fat Percentile */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-700">Body Fat Percentile (Leanness)</span>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3.5 w-3.5 text-slate-400 cursor-help" /></TooltipTrigger>
                        <CitationTooltip citation={CITATIONS.bfPercentile} />
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                      {useTheoretical && (
                        <span className="text-[10px] text-purple-600 font-semibold bg-purple-100 px-1.5 py-0.5 rounded">{theoreticalMetrics.bfPercentile}th</span>
                      )}
                      <span className="text-sm font-bold text-slate-700">{currentMetrics.bfPercentile}th percentile</span>
                    </div>
                  </div>
                  <div className="relative h-8 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-lg overflow-hidden shadow-inner">
                    {[10, 25, 50, 75, 90].map(p => (
                      <div key={p} className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: `${p}%` }}>
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] text-white font-medium">{p}</span>
                      </div>
                    ))}
                    {/* Current marker */}
                    <div className="absolute top-0 bottom-0 w-1.5 bg-[#00263d] shadow-lg transition-all duration-300 rounded-full" style={{ left: `${Math.max(2, Math.min(98, currentMetrics.bfPercentile))}%`, transform: 'translateX(-50%)' }}>
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-[#00263d]" />
                    </div>
                    {/* Theoretical marker */}
                    {useTheoretical && (
                      <div className="absolute top-0 bottom-0 w-1.5 bg-purple-600 shadow-lg transition-all duration-300 rounded-full" style={{ left: `${Math.max(2, Math.min(98, theoreticalMetrics.bfPercentile))}%`, transform: 'translateX(-50%)' }}>
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-purple-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                    <span>← Less lean</span>
                    <span>Leaner →</span>
                  </div>
                </div>
                
                {/* FFMI Percentile */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-700">Muscularity (FFMI) Percentile</span>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3.5 w-3.5 text-slate-400 cursor-help" /></TooltipTrigger>
                        <CitationTooltip citation={CITATIONS.ffmiPercentile} />
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                      {useTheoretical && (
                        <span className="text-[10px] text-purple-600 font-semibold bg-purple-100 px-1.5 py-0.5 rounded">{theoreticalMetrics.ffmiPercentile}th</span>
                      )}
                      <span className="text-sm font-bold text-slate-700">{currentMetrics.ffmiPercentile}th percentile</span>
                    </div>
                  </div>
                  <div className="relative h-8 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-lg overflow-hidden shadow-inner">
                    {[10, 25, 50, 75, 90].map(p => (
                      <div key={p} className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: `${p}%` }}>
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] text-white font-medium">{p}</span>
                      </div>
                    ))}
                    <div className="absolute top-0 bottom-0 w-1.5 bg-[#00263d] shadow-lg transition-all duration-300 rounded-full" style={{ left: `${Math.max(2, Math.min(98, currentMetrics.ffmiPercentile))}%`, transform: 'translateX(-50%)' }}>
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-[#00263d]" />
                    </div>
                    {useTheoretical && (
                      <div className="absolute top-0 bottom-0 w-1.5 bg-purple-600 shadow-lg transition-all duration-300 rounded-full" style={{ left: `${Math.max(2, Math.min(98, theoreticalMetrics.ffmiPercentile))}%`, transform: 'translateX(-50%)' }}>
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-purple-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                    <span>← Less muscular</span>
                    <span>More muscular →</span>
                  </div>
                </div>
                
                {/* Summary badges */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-2 text-center border border-amber-200">
                    <div className="text-[9px] text-amber-600 mb-0.5">Body Fat</div>
                    <Badge className={`${getFMIBenchmark(useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi).bg} ${getFMIBenchmark(useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi).color} border-0 text-[11px] px-2`}>
                      {getFMIBenchmark(useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi).label}
                    </Badge>
                    <div className="text-[10px] text-amber-700 mt-0.5 font-semibold">{useTheoretical ? theoreticalMetrics.bodyFat : currentBodyFat}% / {useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi} FMI</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 text-center border border-blue-200">
                    <div className="text-[9px] text-blue-600 mb-0.5">Muscularity</div>
                    <Badge className={`${getFFMIBenchmark(useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi).bg} ${getFFMIBenchmark(useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi).color} border-0 text-[11px] px-2`}>
                      {getFFMIBenchmark(useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi).label}
                    </Badge>
                    <div className="text-[10px] text-blue-700 mt-0.5 font-semibold">{useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi} FFMI</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mortality Risk */}
            <Card className="lg:col-span-4 bg-white border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                    <Heart className="h-4 w-4 text-red-500" />
                    Mortality Risk
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-4 w-4 text-slate-400 cursor-help" /></TooltipTrigger>
                    <CitationTooltip citation={CITATIONS.mortalityRisk} />
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* FMI Risk Curve */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-slate-600">Fat Mass Index (FMI)</span>
                    <span className="text-[10px] text-slate-500">
                      HR: <span className={`font-bold ${getHazardRatio(useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi, 'fmi') <= 1.1 ? 'text-green-600' : getHazardRatio(useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi, 'fmi') <= 1.5 ? 'text-amber-600' : 'text-red-600'}`}>
                        {getHazardRatio(useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi, 'fmi').toFixed(2)}
                      </span>
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-2 h-32">
                    <svg className="w-full h-full" viewBox="0 0 380 100" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="fmiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="30%" stopColor="#22c55e" />
                          <stop offset="50%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                        <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                      </defs>
                      {[0.25, 0.5, 0.75].map(p => <line key={p} x1="30" y1={10 + 70 * p} x2="360" y2={10 + 70 * p} stroke="#e2e8f0" strokeWidth="0.5" />)}
                      {(() => {
                        const minX = 2, maxX = 18;
                        const scaleX = (x: number) => 30 + ((x - minX) / (maxX - minX)) * 330;
                        return <rect x={scaleX(5)} y="10" width={scaleX(9) - scaleX(5)} height="70" fill="#22c55e" fillOpacity="0.12" rx="4" />;
                      })()}
                      {(() => {
                        const minY = 0.9, maxY = 2.5;
                        const y = 80 - ((1 - minY) / (maxY - minY)) * 70;
                        return <><line x1="30" y1={y} x2="360" y2={y} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3" /><text x="365" y={y + 3} fontSize="7" fill="#94a3b8">1</text></>;
                      })()}
                      {(() => {
                        const minX = 2, maxX = 18, minY = 0.9, maxY = 2.5;
                        const points = MORTALITY_RISK.fmi.points.filter(p => p.x <= maxX).map(p => ({
                          x: 30 + ((p.x - minX) / (maxX - minX)) * 330,
                          y: 80 - ((p.hr - minY) / (maxY - minY)) * 70
                        }));
                        const currentFMI = currentMetrics.fmi;
                        const theoreticalFMI = theoreticalMetrics.fmi;
                        const cx = 30 + ((currentFMI - minX) / (maxX - minX)) * 330;
                        const cy = 80 - ((getHazardRatio(currentFMI, 'fmi') - minY) / (maxY - minY)) * 70;
                        const tx = 30 + ((theoreticalFMI - minX) / (maxX - minX)) * 330;
                        const ty = 80 - ((getHazardRatio(theoreticalFMI, 'fmi') - minY) / (maxY - minY)) * 70;
                        return (
                          <>
                            <path d={createSmoothCurve(points)} fill="none" stroke="url(#fmiGrad)" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />
                            {useTheoretical && <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#c19962" strokeWidth="1.5" strokeDasharray="4" />}
                            <circle cx={cx} cy={cy} r="6" fill="#00263d" stroke="#fff" strokeWidth="2" />
                            {useTheoretical && <circle cx={tx} cy={ty} r="6" fill="#9333ea" stroke="#fff" strokeWidth="2" />}
                          </>
                        );
                      })()}
                      <text x="195" y="95" fontSize="8" fill="#64748b" textAnchor="middle">FMI (kg/m²)</text>
                      {[4, 8, 12, 16].map(v => <text key={v} x={30 + ((v - 2) / 16) * 330} y="90" fontSize="7" fill="#94a3b8" textAnchor="middle">{v}</text>)}
                    </svg>
                  </div>
                </div>
                
                {/* FFMI Risk Curve */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-slate-600">Fat-Free Mass Index (FFMI)</span>
                    <span className="text-[10px] text-slate-500">
                      HR: <span className={`font-bold ${getHazardRatio(useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi, 'ffmi') <= 0.85 ? 'text-green-600' : getHazardRatio(useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi, 'ffmi') <= 1.1 ? 'text-amber-600' : 'text-red-600'}`}>
                        {getHazardRatio(useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi, 'ffmi').toFixed(2)}
                      </span>
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-2 h-32">
                    <svg className="w-full h-full" viewBox="0 0 380 100" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="ffmiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="40%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                      {[0.25, 0.5, 0.75].map(p => <line key={p} x1="30" y1={10 + 70 * p} x2="360" y2={10 + 70 * p} stroke="#e2e8f0" strokeWidth="0.5" />)}
                      {(() => {
                        const minX = 14, maxX = 26;
                        const scaleX = (x: number) => 30 + ((x - minX) / (maxX - minX)) * 330;
                        return <rect x={scaleX(19)} y="10" width={scaleX(24) - scaleX(19)} height="70" fill="#22c55e" fillOpacity="0.12" rx="4" />;
                      })()}
                      {(() => {
                        const minY = 0.6, maxY = 2.5;
                        const y = 80 - ((1 - minY) / (maxY - minY)) * 70;
                        return <><line x1="30" y1={y} x2="360" y2={y} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3" /><text x="365" y={y + 3} fontSize="7" fill="#94a3b8">1</text></>;
                      })()}
                      {(() => {
                        const minX = 14, maxX = 26, minY = 0.6, maxY = 2.5;
                        const points = MORTALITY_RISK.ffmi.points.filter(p => p.x >= minX && p.x <= maxX).map(p => ({
                          x: 30 + ((p.x - minX) / (maxX - minX)) * 330,
                          y: 80 - ((p.hr - minY) / (maxY - minY)) * 70
                        }));
                        const currentFFMI = Math.min(Math.max(currentMetrics.ffmi, minX), maxX);
                        const theoreticalFFMI = Math.min(Math.max(theoreticalMetrics.ffmi, minX), maxX);
                        const cx = 30 + ((currentFFMI - minX) / (maxX - minX)) * 330;
                        const cy = 80 - ((getHazardRatio(currentMetrics.ffmi, 'ffmi') - minY) / (maxY - minY)) * 70;
                        const tx = 30 + ((theoreticalFFMI - minX) / (maxX - minX)) * 330;
                        const ty = 80 - ((getHazardRatio(theoreticalMetrics.ffmi, 'ffmi') - minY) / (maxY - minY)) * 70;
                        return (
                          <>
                            <path d={createSmoothCurve(points)} fill="none" stroke="url(#ffmiGrad)" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />
                            {useTheoretical && <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#c19962" strokeWidth="1.5" strokeDasharray="4" />}
                            <circle cx={cx} cy={cy} r="6" fill="#00263d" stroke="#fff" strokeWidth="2" />
                            {useTheoretical && <circle cx={tx} cy={ty} r="6" fill="#9333ea" stroke="#fff" strokeWidth="2" />}
                          </>
                        );
                      })()}
                      <text x="195" y="95" fontSize="8" fill="#64748b" textAnchor="middle">FFMI (kg/m²)</text>
                      {[16, 18, 20, 22, 24].map(v => <text key={v} x={30 + ((v - 14) / 12) * 330} y="90" fontSize="7" fill="#94a3b8" textAnchor="middle">{v}</text>)}
                    </svg>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-3 text-[9px] text-slate-500">
                  <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-[#00263d]" />Current</span>
                  {useTheoretical && <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-purple-600" />Theoretical</span>}
                  <span className="flex items-center gap-1"><div className="w-5 h-2.5 rounded bg-green-500/20" />Optimal</span>
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
              <CardContent className="p-3 space-y-2">
                {[
                  { value: 'fat_loss', label: 'Fat Loss', desc: 'Reduce body fat', icon: TrendingDown, color: 'from-red-500 to-orange-500', iconColor: 'text-red-500', bgColor: 'bg-red-50' },
                  { value: 'muscle_gain', label: 'Build Muscle', desc: 'Add lean mass', icon: TrendingUp, color: 'from-blue-500 to-cyan-500', iconColor: 'text-blue-500', bgColor: 'bg-blue-50' },
                  { value: 'recomposition', label: 'Recomposition', desc: 'Both simultaneously', icon: RefreshCcw, color: 'from-purple-500 to-pink-500', iconColor: 'text-purple-500', bgColor: 'bg-purple-50' },
                ].map(({ value, label, desc, icon: Icon, color, iconColor, bgColor }) => (
                  <button key={value} onClick={() => setPhaseType(value as any)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all ${phaseType === value ? `bg-gradient-to-r ${color} text-white shadow-lg` : `${bgColor} hover:shadow-md`}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${phaseType === value ? 'text-white' : iconColor}`} />
                      <div className="flex-1">
                        <div className={`font-semibold text-sm ${phaseType === value ? 'text-white' : 'text-slate-700'}`}>{label}</div>
                        <div className={`text-[9px] ${phaseType === value ? 'text-white/80' : 'text-slate-500'}`}>{desc}</div>
                      </div>
                      {phaseType === value && <CheckCircle2 className="h-4 w-4 text-white" />}
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
              <CardContent className="p-3 space-y-2">
                {phaseType === 'recomposition' ? (
                  <div className="space-y-1.5">
                    {Object.entries(RECOMP_EXPECTATIONS).map(([key, val]) => (
                      <button key={key} onClick={() => setRecompExperience(key as any)}
                        className={`w-full p-2.5 rounded-xl text-left transition-all ${recompExperience === key ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100'}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs">{val.label}</span>
                          <span className={`text-[10px] ${recompExperience === key ? 'text-white/80' : 'text-slate-500'}`}>{val.probability}%</span>
                        </div>
                        <div className={`text-[9px] mt-0.5 ${recompExperience === key ? 'text-white/70' : 'text-slate-400'}`}>
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
                          className={`text-[9px] font-semibold py-1.5 rounded-lg transition-colors ${targetMethod === value ? 'bg-[#00263d] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      {targetMethod === 'body_fat' && (
                        <div className="space-y-2">
                          <div className="flex justify-between"><Label className="text-[10px] text-slate-500">Target BF%</Label><span className="text-sm font-bold text-[#00263d]">{targetBodyFat}%</span></div>
                          <Slider value={[targetBodyFat]} onValueChange={([v]) => setTargetBodyFat(v)} min={5} max={35} step={0.5} />
                          <div className="text-[9px] text-slate-400">Current: {currentBodyFat}%</div>
                        </div>
                      )}
                      {targetMethod === 'fmi' && (
                        <div className="space-y-2">
                          <div className="flex justify-between"><Label className="text-[10px] text-slate-500">Target FMI</Label><span className="text-sm font-bold text-[#00263d]">{targetFMI}</span></div>
                          <Slider value={[targetFMI]} onValueChange={([v]) => setTargetFMI(v)} min={2} max={15} step={0.5} />
                          <div className="text-[9px] text-slate-400">Current: {currentMetrics.fmi}</div>
                        </div>
                      )}
                      {targetMethod === 'ffmi' && (
                        <div className="space-y-2">
                          <div className="flex justify-between"><Label className="text-[10px] text-slate-500">Target FFMI</Label><span className="text-sm font-bold text-[#00263d]">{targetFFMI}</span></div>
                          <Slider value={[targetFFMI]} onValueChange={([v]) => setTargetFFMI(v)} min={16} max={28} step={0.5} />
                          <div className="text-[9px] text-slate-400">Current: {currentMetrics.ffmi}</div>
                        </div>
                      )}
                      {targetMethod === 'fat_mass' && (
                        <div className="space-y-2">
                          <Label className="text-[10px] text-slate-500">Target Fat Mass (lbs)</Label>
                          <Input type="number" value={targetFatMass} onChange={(e) => setTargetFatMass(Number(e.target.value))} className="h-8 text-center font-bold" />
                          <div className="text-[9px] text-slate-400">Current: {currentMetrics.fatMassLbs} lbs</div>
                        </div>
                      )}
                      {targetMethod === 'ffm' && (
                        <div className="space-y-2">
                          <Label className="text-[10px] text-slate-500">Target FFM (lbs)</Label>
                          <Input type="number" value={targetFFM} onChange={(e) => setTargetFFM(Number(e.target.value))} className="h-8 text-center font-bold" />
                          <div className="text-[9px] text-slate-400">Current: {currentMetrics.ffmLbs} lbs</div>
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
              <CardContent className="p-3 space-y-2">
                {phaseType !== 'recomposition' && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-slate-500">Custom Rate</Label>
                      <Switch checked={useCustomRate} onCheckedChange={setUseCustomRate} />
                    </div>
                    {useCustomRate ? (
                      <div className="bg-slate-50 rounded-xl p-2.5">
                        <div className="flex items-center gap-2">
                          <Slider value={[customRate]} onValueChange={([v]) => setCustomRate(v)} min={0.1} max={1.5} step={0.05} className="flex-1" />
                          <span className="text-sm font-bold text-[#00263d] w-14 text-center">{customRate}%</span>
                        </div>
                        <div className="text-[9px] text-center text-slate-400 mt-1">≈ {Math.round(currentWeight * customRate / 100 * 10) / 10} lbs/wk</div>
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {Object.entries(phaseType === 'fat_loss' ? RATE_PRESETS.fat_loss : RATE_PRESETS.muscle_gain).map(([key, val]) => {
                          const isSelected = phaseType === 'fat_loss' ? fatLossRateKey === key : muscleGainRateKey === key;
                          return (
                            <button key={key} onClick={() => phaseType === 'fat_loss' ? setFatLossRateKey(key) : setMuscleGainRateKey(key)}
                              className={`w-full p-2 rounded-lg text-left transition-all ${isSelected ? `bg-gradient-to-r ${phaseType === 'fat_loss' ? 'from-red-500 to-orange-500' : 'from-blue-500 to-cyan-500'} text-white` : 'bg-slate-50 hover:bg-slate-100'}`}>
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-[11px]">{val.label}</span>
                                <span className={`text-[9px] px-1 py-0.5 rounded ${isSelected ? 'bg-white/20' : 'bg-slate-200'}`}>{val.rate}%</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                
                {/* Start Date Input */}
                <div>
                  <Label className="text-[9px] font-medium text-slate-500 uppercase">Start Date</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="h-8 text-xs bg-slate-50 rounded-lg text-center"
                  />
                </div>
                
                {/* Timeline Summary */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-2.5 text-white text-center">
                  <Calendar className="h-3.5 w-3.5 mx-auto mb-0.5 text-white/80" />
                  <div className="text-xl font-bold">{calculatedTimeline.weeks} weeks</div>
                  <div className="text-[9px] text-white/80">
                    {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(weeklyProjections[weeklyProjections.length - 1]?.date || startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                
                <div className={`rounded-xl p-2.5 border ${feasibility.probability >= 70 ? 'bg-green-50 border-green-200' : feasibility.probability >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-slate-700">Success Probability</span>
                    <Badge className={`${feasibility.probability >= 70 ? 'bg-green-500' : feasibility.probability >= 40 ? 'bg-amber-500' : 'bg-red-500'} text-white border-0 text-[10px]`}>{feasibility.probability}%</Badge>
                  </div>
                  <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${feasibility.probability >= 70 ? 'bg-green-500' : feasibility.probability >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${feasibility.probability}%` }} />
                  </div>
                  <p className="text-[9px] mt-1 text-slate-600">{feasibility.message}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Results */}
          {projectedMetrics && summary && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Parameters + Results */}
              <Card className="lg:col-span-4 bg-white border-0 shadow-lg rounded-2xl">
                <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                    <Zap className="h-4 w-4 text-[#c19962]" />
                    Projected Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <Label className="text-[9px] text-slate-400 uppercase">Protein</Label>
                      <Select value={proteinLevel} onValueChange={(v: any) => setProteinLevel(v)}>
                        <SelectTrigger className="h-7 text-[10px] bg-slate-50"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(PROTEIN_EFFECT).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end justify-center gap-1 pb-1">
                      <Label className="text-[8px] text-slate-400">Water</Label>
                      <Switch checked={includeWaterChanges} onCheckedChange={setIncludeWaterChanges} />
                    </div>
                    <div className="flex items-end justify-center gap-1 pb-1">
                      <Label className="text-[8px] text-slate-400">CI</Label>
                      <Switch checked={showCI} onCheckedChange={setShowCI} />
                    </div>
                  </div>
                  
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
                    <div className="flex justify-between"><span className="text-slate-500 text-[10px]">FM</span><span className="font-semibold text-xs">{projectedMetrics.fatMassLbs} <span className={`text-[9px] ${summary.totalFatChange < 0 ? 'text-green-600' : 'text-red-500'}`}>({summary.totalFatChange})</span></span></div>
                    <div className="flex justify-between"><span className="text-slate-500 text-[10px]">FFM</span><span className="font-semibold text-xs">{projectedMetrics.ffmLbs} <span className={`text-[9px] ${summary.totalFFMChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>({summary.totalFFMChange >= 0 ? '+' : ''}{summary.totalFFMChange})</span></span></div>
                  </div>
                  
                  <div className="h-2 rounded-full overflow-hidden flex bg-slate-200">
                    <div className="bg-amber-500" style={{ width: `${summary.pctFromFat}%` }} />
                    <div className="bg-rose-500" style={{ width: `${summary.pctFromFFM}%` }} />
                  </div>
                  <div className="flex justify-between text-[8px]">
                    <span className="text-amber-600">Fat: {summary.pctFromFat}%</span>
                    <span className="text-rose-600">FFM: {summary.pctFromFFM}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline Graphs */}
              <Card className="lg:col-span-8 bg-white border-0 shadow-lg rounded-2xl">
                <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                      <LineChart className="h-4 w-4 text-purple-500" />
                      Timeline Projection
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {/* Variable selector tabs */}
                      <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        {[
                          { key: 'weight', label: 'Weight', color: '#6366f1' },
                          { key: 'bodyFat', label: 'Body Fat', color: '#f59e0b' },
                          { key: 'fatMass', label: 'Fat Mass', color: '#ef4444' },
                          { key: 'ffm', label: 'FFM', color: '#22c55e' },
                        ].map(({ key, label, color }) => (
                          <button 
                            key={key}
                            onClick={() => setSelectedGraphVar(key as any)} 
                            className={`px-3 py-1.5 text-xs font-medium transition-all ${
                              selectedGraphVar === key 
                                ? 'text-white shadow-sm' 
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                            style={{ backgroundColor: selectedGraphVar === key ? color : undefined }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {/* Graph/Table toggle */}
                      <div className="flex rounded-lg overflow-hidden border border-slate-200">
                        <button onClick={() => setViewMode('graph')} className={`px-2.5 py-1.5 text-xs font-medium ${viewMode === 'graph' ? 'bg-[#00263d] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                          <LineChart className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setViewMode('table')} className={`px-2.5 py-1.5 text-xs font-medium border-l border-slate-200 ${viewMode === 'table' ? 'bg-[#00263d] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                          <Table className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {viewMode === 'graph' ? (
                    <div className="space-y-3">
                      {/* Summary stats for selected variable */}
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-xs text-slate-600">Start: <span className="font-bold text-slate-800">{graphConfigs[selectedGraphVar].data[0]}{graphConfigs[selectedGraphVar].unit}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-xs text-slate-600">End: <span className="font-bold text-slate-800">{graphConfigs[selectedGraphVar].data[graphConfigs[selectedGraphVar].data.length - 1]}{graphConfigs[selectedGraphVar].unit}</span></span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">
                          Change: <span className={`font-bold ${(graphConfigs[selectedGraphVar].data[graphConfigs[selectedGraphVar].data.length - 1] - graphConfigs[selectedGraphVar].data[0]) < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                            {(graphConfigs[selectedGraphVar].data[graphConfigs[selectedGraphVar].data.length - 1] - graphConfigs[selectedGraphVar].data[0]) > 0 ? '+' : ''}
                            {(graphConfigs[selectedGraphVar].data[graphConfigs[selectedGraphVar].data.length - 1] - graphConfigs[selectedGraphVar].data[0]).toFixed(1)}{graphConfigs[selectedGraphVar].unit}
                          </span>
                        </div>
                      </div>
                      
                      {/* Large graph */}
                      <div className="bg-white rounded-xl border border-slate-100 p-2">
                        <LargeGraph />
                      </div>
                      
                      {/* Hint */}
                      <p className="text-center text-[10px] text-slate-400">Hover over the graph to see values at each week</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-64">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-2 text-left text-xs text-slate-500 font-semibold">Week</th>
                            <th className="py-2 px-2 text-xs text-slate-500 font-semibold">Weight</th>
                            <th className="py-2 px-2 text-xs text-slate-500 font-semibold">BF%</th>
                            <th className="py-2 px-2 text-xs text-slate-500 font-semibold">Fat Mass</th>
                            <th className="py-2 px-2 text-xs text-slate-500 font-semibold">FFM</th>
                            <th className="py-2 px-2 text-xs text-slate-500 font-semibold">FMI</th>
                            <th className="py-2 px-2 text-xs text-slate-500 font-semibold">FFMI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeklyProjections.map((p, i) => (
                            <tr key={i} className={`border-b border-slate-50 ${i === 0 ? 'bg-red-50' : i === weeklyProjections.length - 1 ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
                              <td className="py-2 px-2 font-semibold text-slate-700">{p.week}</td>
                              <td className="py-2 px-2 text-center font-medium">{p.weight}</td>
                              <td className="py-2 px-2 text-center font-medium">{p.bodyFat}%</td>
                              <td className="py-2 px-2 text-center font-medium">{p.fatMass}</td>
                              <td className="py-2 px-2 text-center font-medium">{p.ffm}</td>
                              <td className="py-2 px-2 text-center text-slate-500">{p.fmi}</td>
                              <td className="py-2 px-2 text-center text-slate-500">{p.ffmi}</td>
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

          {/* Estimated Nutrition Targets */}
          {nutritionTargets && (
            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#00263d] text-sm font-semibold">
                    <Activity className="h-4 w-4 text-[#c19962]" />
                    Estimated Nutrition Targets
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px] ml-1">Starting Point</Badge>
                  </CardTitle>
                  <Button
                    onClick={handleExportPDF}
                    disabled={isExportingPDF}
                    size="sm"
                    className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d] text-xs h-8"
                  >
                    {isExportingPDF ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1.5" />
                        Export Report PDF
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                  <div className="bg-gradient-to-br from-[#c19962] to-[#d4af7a] rounded-xl p-2.5 text-center text-white">
                    <div className="text-xl font-bold">{nutritionTargets.calories}</div>
                    <div className="text-[9px] opacity-80">Est. Calories</div>
                    <div className={`text-[10px] ${nutritionTargets.deficit < 0 ? 'text-green-200' : 'text-blue-200'}`}>
                      {nutritionTargets.deficit < 0 ? '' : '+'}{nutritionTargets.deficit}/day
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-2.5 text-center border border-red-100">
                    <div className="text-xl font-bold text-red-600">{nutritionTargets.protein}g</div>
                    <div className="text-[9px] text-red-500">Est. Protein</div>
                    <div className="text-[10px] text-red-400">{Math.round(nutritionTargets.protein * 4)} kcal</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-2.5 text-center border border-amber-100">
                    <div className="text-xl font-bold text-amber-600">{nutritionTargets.carbs}g</div>
                    <div className="text-[9px] text-amber-500">Est. Carbs</div>
                    <div className="text-[10px] text-amber-400">{Math.round(nutritionTargets.carbs * 4)} kcal</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2.5 text-center border border-blue-100">
                    <div className="text-xl font-bold text-blue-600">{nutritionTargets.fat}g</div>
                    <div className="text-[9px] text-blue-500">Est. Fat</div>
                    <div className="text-[10px] text-blue-400">{Math.round(nutritionTargets.fat * 9)} kcal</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200">
                    <div className="text-lg font-bold text-slate-700">{tdee}</div>
                    <div className="text-[9px] text-slate-500">Est. TDEE</div>
                    <div className="text-[10px] text-slate-400">Maintenance</div>
                  </div>
                </div>
                
                {/* Disclaimer */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-[10px] text-amber-800 leading-relaxed">
                    <strong>Important:</strong> These are estimated starting targets based on predictive equations and should be used as a baseline only. 
                    <span className="text-amber-600 font-semibold"> Fitomics coaching and programming</span> utilizes dynamic monitoring and ongoing adjustments 
                    as your body composition and physiology change. Static intake recommendations are not recommended for optimal results—nutrition should be 
                    periodized and adjusted based on real-world progress, biofeedback, and metabolic adaptation.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </TooltipProvider>
  );
}