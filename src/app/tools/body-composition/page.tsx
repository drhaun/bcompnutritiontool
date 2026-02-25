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
  
  // Calculate optimal FM/FFM for explore mode based on current height
  // Uses 95th percentile values for both leanness and muscularity
  const getOptimalExploreValues = (hM: number) => {
    // 95th percentile values from population data:
    // - Body Fat: 6% (leaner than 95% of population)
    // - FFMI: 24.5 (more muscular than 95% of population)
    const targetBFPercent = 6;  // 95th percentile leanness
    const targetFFMI = 24.5;    // 95th percentile muscularity
    
    // Calculate FFM from FFMI: FFM (kg) = FFMI * height²
    const optimalFFMKg = targetFFMI * (hM * hM);
    
    // Calculate FM from body fat %: if BF% = FM/(FM+FFM), then FM = (BF%/(100-BF%)) * FFM
    const optimalFatMassKg = (targetBFPercent / (100 - targetBFPercent)) * optimalFFMKg;
    
    return {
      fatMassLbs: Math.round(optimalFatMassKg / 0.453592 * 10) / 10,
      ffmLbs: Math.round(optimalFFMKg / 0.453592 * 10) / 10,
    };
  };
  
  // Effect to set optimal explore values when toggled on
  const handleExploreToggle = (enabled: boolean) => {
    setUseTheoretical(enabled);
    if (enabled) {
      const hM = heightCm / 100;
      const optimal = getOptimalExploreValues(hM);
      setTheoreticalFM(optimal.fatMassLbs);
      setTheoreticalFFM(optimal.ffmLbs);
    }
  };
  
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
  
  // Conservative NEAT estimates aligned with Pontzer (2016) constrained
  // energy model and Westerterp (2013). Traditional multipliers (0.15–0.55)
  // substantially overestimate NEAT for most modern populations.
  const neatEstimates = useMemo(() => ({
    sedentary: Math.round(effectiveRmr * 0.05),     // <5k steps, desk job
    light: Math.round(effectiveRmr * 0.10),          // 5-8k steps
    moderate: Math.round(effectiveRmr * 0.15),       // 8-12k steps
    active: Math.round(effectiveRmr * 0.20),         // 12-15k steps
    very_active: Math.round(effectiveRmr * 0.28),    // >15k steps, physical job
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
  
  // Nutrition targets — uses FFM-aware logic consistent with the planning step.
  // High-BF% clients (>25% male, >35% female) use fat-free mass as the
  // reference weight so excess fat mass doesn't inflate protein/fat targets.
  const nutritionTargets = useMemo(() => {
    if (!summary) return null;
    const deficit = (summary.totalWeightChange / calculatedTimeline.weeks * 3500) / 7;
    const cals = Math.max(1200, Math.round(tdee + deficit));

    const bf = currentBodyFat;
    const highBF = (gender === 'female' && bf > 35) || (gender !== 'female' && bf > 25);
    const ffmKg = weightKg * (1 - bf / 100);
    const refWeight = highBF ? ffmKg : weightKg;

    const proteinGPerKg = PROTEIN_EFFECT[proteinLevel].mult;
    // Fat: ~0.9 g/kg BW or ~1.0 g/kg FFM (evidence-based moderate default)
    const fatGPerKg = highBF ? 1.0 : 0.9;

    let protein = Math.min(Math.round(refWeight * proteinGPerKg), 300);
    let fatG = Math.min(Math.round(refWeight * fatGPerKg), 180);

    // Protein + fat cannot exceed 75% of calories to preserve carb budget
    const pfCal = protein * 4 + fatG * 9;
    const maxPFCal = cals * 0.75;
    if (pfCal > maxPFCal && pfCal > 0) {
      const scale = maxPFCal / pfCal;
      protein = Math.round(protein * scale);
      fatG = Math.round(fatG * scale);
    }

    const carbG = Math.max(100, Math.round((cals - protein * 4 - fatG * 9) / 4));

    return { calories: cals, protein, carbs: carbG, fat: fatG, deficit: Math.round(deficit) };
  }, [tdee, summary, calculatedTimeline.weeks, weightKg, proteinLevel, currentBodyFat, gender]);

  // PDF Export handler
  const handleExportPDF = async () => {
    if (!nutritionTargets || !summary || !projectedMetrics) {
      toast.error('Please complete the body composition setup first');
      return;
    }

    setIsExportingPDF(true);
    try {
      // Calculate metabolic data
      const neat = neatEstimates[neatLevel];
      const tefValue = Math.round(effectiveRmr * (tef / 100));
      const calculatedBmi = weightKg / (heightM * heightM);
      
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
          fatMass: currentMetrics.fatMassLbs,
          leanMass: currentMetrics.ffmLbs,
          bmi: Math.round(calculatedBmi * 10) / 10,
          fmi: currentMetrics.fmi,
          ffmi: currentMetrics.ffmi,
        },
        targetStats: {
          weight: projectedMetrics.weightLbs,
          bodyFat: projectedMetrics.bodyFat,
          fatMass: projectedMetrics.fatMassLbs,
          leanMass: projectedMetrics.ffmLbs,
          fmi: projectedMetrics.fmi,
          ffmi: projectedMetrics.ffmi,
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
    
    const padding = { left: 58, right: 24, top: 20, bottom: 44 };
    const width = 720;
    const height = 310;
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    const dataMin = Math.min(...data);
    const dataMax = Math.max(...data);
    const dataRange = dataMax - dataMin;
    const min = dataMin - dataRange * 0.08;
    const max = dataMax + dataRange * 0.08;
    const range = max - min || 1;
    
    const points = data.map((v, i) => ({
      x: padding.left + (i / Math.max(1, data.length - 1)) * graphWidth,
      y: padding.top + graphHeight - ((v - min) / range) * graphHeight,
      value: v,
      week: i
    }));
    
    const yTicks = 6;
    const yTickValues = Array.from({ length: yTicks }, (_, i) => min + (range * i) / (yTicks - 1));
    
    const xTickInterval = Math.max(1, Math.floor(data.length / 10));
    const xTicks = data.map((_, i) => i).filter(i => i % xTickInterval === 0 || i === data.length - 1);
    
    return (
      <svg 
        className="w-full cursor-crosshair select-none" 
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoveredWeek(null)}
      >
        <defs>
          <linearGradient id="graphAreaFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={config.color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={config.color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        
        {/* Clean background */}
        <rect x={padding.left} y={padding.top} width={graphWidth} height={graphHeight} fill="#fafbfc" rx="2" />
        
        {/* Horizontal grid lines — subtle */}
        {yTickValues.map((val, i) => {
          const y = padding.top + graphHeight - ((val - min) / range) * graphHeight;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={padding.left + graphWidth} y2={y} stroke="#e8ecf0" strokeWidth="0.75" />
              <text x={padding.left - 10} y={y + 3.5} fontSize="10" fill="#8896a4" textAnchor="end" fontFamily="ui-monospace, monospace" fontWeight="500">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}
        
        {/* X-axis labels */}
        {xTicks.map(i => {
          const x = padding.left + (i / Math.max(1, data.length - 1)) * graphWidth;
          const dateStr = weeklyProjections[i]?.date || '';
          const dateObj = new Date(dateStr);
          const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
          const day = dateObj.getDate();
          return (
            <g key={i}>
              <line x1={x} y1={padding.top + graphHeight} x2={x} y2={padding.top + graphHeight + 4} stroke="#cbd5e1" strokeWidth="0.75" />
              <text x={x} y={height - 14} fontSize="9" fill="#8896a4" textAnchor="middle" fontFamily="ui-monospace, monospace" fontWeight="500">
                {month} {day}
              </text>
            </g>
          );
        })}
        
        {/* Area fill */}
        {points.length > 0 && (
          <path 
            d={createSmoothCurve(points) + ` L ${points[points.length - 1].x} ${padding.top + graphHeight} L ${points[0].x} ${padding.top + graphHeight} Z`} 
            fill="url(#graphAreaFill)" 
          />
        )}
        
        {/* Main line — clean and precise */}
        <path 
          d={createSmoothCurve(points)} 
          fill="none" 
          stroke={config.color} 
          strokeWidth="2.5" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Interactive hit areas and points */}
        {points.map((p, i) => (
          <g key={i}>
            <rect 
              x={p.x - 15} y={padding.top} 
              width={30} height={graphHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredWeek(i)}
            />
            {i === 0 && (
              <circle cx={p.x} cy={p.y} r="5" fill="#ef4444" stroke="#fff" strokeWidth="2" />
            )}
            {i === points.length - 1 && (
              <circle cx={p.x} cy={p.y} r="5" fill="#22c55e" stroke="#fff" strokeWidth="2" />
            )}
            {hoveredWeek === i && i !== 0 && i !== points.length - 1 && (
              <>
                <line x1={p.x} y1={padding.top} x2={p.x} y2={padding.top + graphHeight} stroke={config.color} strokeWidth="0.75" strokeDasharray="3,3" opacity="0.4" />
                <circle cx={p.x} cy={p.y} r="5" fill={config.color} stroke="#fff" strokeWidth="2" />
              </>
            )}
          </g>
        ))}
        
        {/* Hover tooltip */}
        {hoveredWeek !== null && points[hoveredWeek] && weeklyProjections[hoveredWeek] && (() => {
          const dateStr = weeklyProjections[hoveredWeek].date;
          const dateObj = new Date(dateStr);
          const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const tooltipX = Math.min(width - 120, Math.max(5, points[hoveredWeek].x - 60));
          const tooltipY = Math.max(5, points[hoveredWeek].y - 62);
          return (
            <g>
              <rect x={tooltipX} y={tooltipY} width="120" height="55" rx="8" fill="#0f172a" fillOpacity="0.95" />
              <text x={tooltipX + 60} y={tooltipY + 16} fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="500" fontFamily="ui-monospace, monospace">
                Wk {hoveredWeek}
              </text>
              <text x={tooltipX + 60} y={tooltipY + 31} fontSize="10" fill="#cbd5e1" textAnchor="middle" fontWeight="500">
                {formattedDate}
              </text>
              <text x={tooltipX + 60} y={tooltipY + 48} fontSize="15" fill={config.color} textAnchor="middle" fontWeight="700" fontFamily="ui-monospace, monospace">
                {data[hoveredWeek]}{config.unit}
              </text>
            </g>
          );
        })()}
        
        {/* Axis labels */}
        <text x={padding.left + graphWidth / 2} y={height - 1} fontSize="9" fill="#94a3b8" textAnchor="middle" letterSpacing="0.5">
          TIMELINE
        </text>
        <text 
          x={10} y={padding.top + graphHeight / 2} 
          fontSize="9" fill="#94a3b8" textAnchor="middle" letterSpacing="0.5"
          transform={`rotate(-90, 10, ${padding.top + graphHeight / 2})`}
        >
          {config.label.toUpperCase()} ({config.unit.trim()})
        </text>
      </svg>
    );
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#001a2c] to-slate-950 p-4 lg:p-8">
        <div className="max-w-[1680px] mx-auto space-y-6">
          
          {/* Header */}
          <header className="text-center py-6">
            <div className="inline-flex items-center gap-4 mb-2">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#c19962]/60" />
              <h1 className="text-3xl lg:text-4xl font-light text-white tracking-tight">
                Body Composition <span className="font-semibold">Planner</span>
              </h1>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#c19962]/60" />
            </div>
            <p className="text-sm text-slate-400 font-light tracking-wide">Evidence-based goal setting &middot; Interactive risk analysis &middot; Projected outcomes</p>
          </header>

          {/* ═══ Section 1: Assessment ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Current Stats & Metabolism */}
            <Card className="lg:col-span-4 bg-white/[0.97] backdrop-blur border border-slate-200/60 shadow-xl shadow-black/5 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 px-5 pt-5">
                <CardTitle className="flex items-center gap-3 text-[#00263d]">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#00263d] text-[#c19962] text-xs font-bold">1</div>
                  <div>
                    <div className="text-sm font-semibold tracking-tight">Current Stats & Metabolism</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">Biometrics &middot; Energy expenditure</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                {/* Biometrics Row */}
                <div className="grid grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Gender</Label>
                    <Select value={gender} onValueChange={(v: 'male' | 'female') => setGender(v)}>
                      <SelectTrigger className="h-8 text-xs bg-slate-50/80 border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Age</Label>
                    <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="h-8 text-xs bg-slate-50/80 border-slate-200 rounded-lg text-center font-mono" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Height</Label>
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Input type="number" value={heightFt} onChange={(e) => setHeightFt(Number(e.target.value))} className="h-8 text-xs bg-slate-50/80 border-slate-200 rounded-lg pr-6 text-center font-mono" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">ft</span>
                      </div>
                      <div className="relative flex-1">
                        <Input type="number" value={heightIn} onChange={(e) => setHeightIn(Number(e.target.value))} className="h-8 text-xs bg-slate-50/80 border-slate-200 rounded-lg pr-6 text-center font-mono" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">in</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Weight & BF */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Weight (lbs)</Label>
                    <Input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(Number(e.target.value))} className="h-10 text-base font-bold font-mono bg-slate-50/80 border-slate-200 rounded-lg text-center" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Body Fat %</Label>
                    <Input type="number" step="0.1" value={currentBodyFat} onChange={(e) => setCurrentBodyFat(Number(e.target.value))} className="h-10 text-base font-bold font-mono bg-slate-50/80 border-slate-200 rounded-lg text-center" />
                  </div>
                </div>
                
                {/* Derived Composition — clean data row */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-amber-50/70 rounded-lg p-2 border border-amber-100/80">
                    <div className="text-sm font-bold font-mono text-amber-700">{currentMetrics.fatMassLbs}</div>
                    <div className="text-[9px] text-amber-600/80 font-medium">FM (lbs)</div>
                  </div>
                  <div className="bg-blue-50/70 rounded-lg p-2 border border-blue-100/80">
                    <div className="text-sm font-bold font-mono text-blue-700">{currentMetrics.ffmLbs}</div>
                    <div className="text-[9px] text-blue-600/80 font-medium">FFM (lbs)</div>
                  </div>
                  <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                    <Badge className={`${getFMIBenchmark(currentMetrics.fmi).bg} ${getFMIBenchmark(currentMetrics.fmi).color} border-0 text-[10px] font-mono px-1.5`}>
                      {currentMetrics.fmi}
                    </Badge>
                    <div className="text-[9px] text-slate-500 mt-0.5">FMI</div>
                  </div>
                  <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                    <Badge className={`${getFFMIBenchmark(currentMetrics.ffmi).bg} ${getFFMIBenchmark(currentMetrics.ffmi).color} border-0 text-[10px] font-mono px-1.5`}>
                      {currentMetrics.ffmi}
                    </Badge>
                    <div className="text-[9px] text-slate-500 mt-0.5">FFMI</div>
                  </div>
                </div>
                
                <Separator className="my-1.5" />
                
                {/* RMR Section */}
                <div className="bg-slate-50/60 rounded-xl p-3 space-y-2.5 border border-slate-100/80">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      Resting Metabolic Rate
                    </Label>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200">
                      <button 
                        onClick={() => setRmrSource('estimated')} 
                        className={`px-2.5 py-1 text-[9px] font-semibold transition-colors ${rmrSource === 'estimated' ? 'bg-[#00263d] text-[#c19962]' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        Estimated
                      </button>
                      <button 
                        onClick={() => setRmrSource('measured')} 
                        className={`px-2.5 py-1 text-[9px] font-semibold border-l border-slate-200 transition-colors ${rmrSource === 'measured' ? 'bg-[#00263d] text-[#c19962]' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        Measured
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="text-center">
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider">Mifflin-St Jeor</div>
                      <div className={`text-lg font-bold font-mono ${rmrSource === 'estimated' ? 'text-[#00263d]' : 'text-slate-300'}`}>{estimatedRmr}</div>
                    </div>
                    {rmrSource === 'measured' ? (
                      <div className="space-y-0.5">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider text-center">Measured RMR</div>
                        <Input 
                          type="number" 
                          value={measuredRmr} 
                          onChange={(e) => setMeasuredRmr(Number(e.target.value))} 
                          className="h-8 text-sm font-bold font-mono bg-white rounded-lg text-center border-[#c19962]/30" 
                        />
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider">Using</div>
                        <div className="text-lg font-bold font-mono text-[#00263d]">{effectiveRmr} <span className="text-xs font-normal text-slate-400">kcal</span></div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* NEAT & Activity */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">NEAT Level</Label>
                    <Select value={neatLevel} onValueChange={(v: any) => setNeatLevel(v)}>
                      <SelectTrigger className="h-8 text-[10px] bg-slate-50/80 border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary" className="text-xs">Sedentary (+{neatEstimates.sedentary})</SelectItem>
                        <SelectItem value="light" className="text-xs">Light (+{neatEstimates.light})</SelectItem>
                        <SelectItem value="moderate" className="text-xs">Moderate (+{neatEstimates.moderate})</SelectItem>
                        <SelectItem value="active" className="text-xs">Active (+{neatEstimates.active})</SelectItem>
                        <SelectItem value="very_active" className="text-xs">Very Active (+{neatEstimates.very_active})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">TEF (%)</Label>
                    <Input type="number" value={tef} onChange={(e) => setTef(Number(e.target.value))} className="h-8 text-xs font-mono bg-slate-50/80 border-slate-200 rounded-lg text-center" />
                  </div>
                </div>
                
                {/* Exercise */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">EEE (net kcal/session)</Label>
                    <Input type="number" value={eee} onChange={(e) => setEee(Number(e.target.value))} className="h-8 text-xs font-mono bg-slate-50/80 border-slate-200 rounded-lg text-center" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Workouts/Week</Label>
                    <Input type="number" value={workoutsPerWeek} onChange={(e) => setWorkoutsPerWeek(Number(e.target.value))} className="h-8 text-xs font-mono bg-slate-50/80 border-slate-200 rounded-lg text-center" />
                  </div>
                </div>
                
                {/* TDEE Result — prominent display */}
                <div className="bg-[#00263d] rounded-xl p-3 text-center">
                  <div className="text-[9px] text-[#c19962]/80 uppercase tracking-widest font-semibold mb-0.5">Total Daily Energy Expenditure</div>
                  <div className="text-2xl font-bold font-mono text-white">{tdee} <span className="text-sm font-normal text-slate-400">kcal/day</span></div>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono">
                    RMR {effectiveRmr} + NEAT {neatEstimates[neatLevel]} + TEF {Math.round(effectiveRmr * tef / 100)} + EEE {Math.round(eee * workoutsPerWeek / 7)}/day
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Where You Stand + Explorer */}
            <Card className="lg:col-span-4 bg-white/[0.97] backdrop-blur border border-slate-200/60 shadow-xl shadow-black/5 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 px-5 pt-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-[#00263d]">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    <div>
                      <div className="text-sm font-semibold tracking-tight">Where You Stand</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">Population percentiles</div>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200/80">
                    <Label className="text-[10px] text-slate-500 font-medium">Explore</Label>
                    <Switch checked={useTheoretical} onCheckedChange={handleExploreToggle} />
                    <Crosshair className={`h-3.5 w-3.5 ${useTheoretical ? 'text-indigo-500' : 'text-slate-300'}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {/* Explorer inputs */}
                {useTheoretical && (
                  <div className="bg-indigo-50/60 rounded-xl p-3.5 border border-indigo-200/60">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Crosshair className="h-4 w-4 text-indigo-500" />
                      <span className="text-xs font-semibold text-indigo-700">Theoretical Composition Explorer</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[9px] text-indigo-600 uppercase tracking-wider font-medium">Fat Mass (lbs)</Label>
                        <Input type="number" value={theoreticalFM} onChange={(e) => setTheoreticalFM(Number(e.target.value))} className="h-9 text-sm bg-white border-indigo-200 rounded-lg text-center font-bold font-mono" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] text-indigo-600 uppercase tracking-wider font-medium">FFM (lbs)</Label>
                        <Input type="number" value={theoreticalFFM} onChange={(e) => setTheoreticalFFM(Number(e.target.value))} className="h-9 text-sm bg-white border-indigo-200 rounded-lg text-center font-bold font-mono" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] text-indigo-600 uppercase tracking-wider font-medium">Result</Label>
                        <div className="h-9 bg-indigo-100/80 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-sm font-bold font-mono text-indigo-700">{theoreticalMetrics.bodyFat}%</span>
                          <span className="text-[8px] text-indigo-500 font-medium">{theoreticalMetrics.weight} lbs</span>
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
                      <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-slate-200 text-slate-500">Leanness</Badge>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3.5 w-3.5 text-slate-400 cursor-help" /></TooltipTrigger>
                        <CitationTooltip citation={CITATIONS.bfPercentile} />
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                      {useTheoretical && (
                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100 px-1.5 py-0.5 rounded font-mono">{theoreticalMetrics.bfPercentile}th</span>
                      )}
                      <span className="text-sm font-bold font-mono text-slate-700">{currentMetrics.bfPercentile}<sup className="text-[8px] font-normal">th</sup></span>
                    </div>
                  </div>
                  <div className="relative h-7 bg-gradient-to-r from-red-400 via-amber-400 to-green-400 rounded-md overflow-hidden shadow-inner">
                    {[10, 25, 50, 75, 90].map(p => (
                      <div key={p} className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: `${p}%` }}>
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] text-white/80 font-mono">{p}</span>
                      </div>
                    ))}
                    <div className="absolute top-0 bottom-0 w-1 bg-[#00263d] shadow-lg transition-all duration-500 rounded-full" style={{ left: `${Math.max(2, Math.min(98, currentMetrics.bfPercentile))}%`, transform: 'translateX(-50%)' }}>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[5px] border-l-transparent border-r-transparent border-b-[#00263d]" />
                    </div>
                    {useTheoretical && (
                      <div className="absolute top-0 bottom-0 w-1 bg-indigo-600 shadow-lg transition-all duration-500 rounded-full" style={{ left: `${Math.max(2, Math.min(98, theoreticalMetrics.bfPercentile))}%`, transform: 'translateX(-50%)' }}>
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[5px] border-l-transparent border-r-transparent border-b-indigo-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                    <span>&larr; Less lean</span>
                    <span>Leaner &rarr;</span>
                  </div>
                </div>
                
                {/* FFMI Percentile */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-700">FFMI Percentile</span>
                      <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-slate-200 text-slate-500">Muscularity</Badge>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3.5 w-3.5 text-slate-400 cursor-help" /></TooltipTrigger>
                        <CitationTooltip citation={CITATIONS.ffmiPercentile} />
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                      {useTheoretical && (
                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100 px-1.5 py-0.5 rounded font-mono">{theoreticalMetrics.ffmiPercentile}th</span>
                      )}
                      <span className="text-sm font-bold font-mono text-slate-700">{currentMetrics.ffmiPercentile}<sup className="text-[8px] font-normal">th</sup></span>
                    </div>
                  </div>
                  <div className="relative h-7 bg-gradient-to-r from-red-400 via-amber-400 to-green-400 rounded-md overflow-hidden shadow-inner">
                    {[10, 25, 50, 75, 90].map(p => (
                      <div key={p} className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: `${p}%` }}>
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] text-white/80 font-mono">{p}</span>
                      </div>
                    ))}
                    <div className="absolute top-0 bottom-0 w-1 bg-[#00263d] shadow-lg transition-all duration-500 rounded-full" style={{ left: `${Math.max(2, Math.min(98, currentMetrics.ffmiPercentile))}%`, transform: 'translateX(-50%)' }}>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[5px] border-l-transparent border-r-transparent border-b-[#00263d]" />
                    </div>
                    {useTheoretical && (
                      <div className="absolute top-0 bottom-0 w-1 bg-indigo-600 shadow-lg transition-all duration-500 rounded-full" style={{ left: `${Math.max(2, Math.min(98, theoreticalMetrics.ffmiPercentile))}%`, transform: 'translateX(-50%)' }}>
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[5px] border-l-transparent border-r-transparent border-b-indigo-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                    <span>&larr; Less muscular</span>
                    <span>More muscular &rarr;</span>
                  </div>
                </div>
                
                {/* Summary badges */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-amber-50/60 rounded-xl p-2.5 text-center border border-amber-100/80">
                    <div className="text-[9px] text-amber-600/80 uppercase tracking-wider font-medium mb-1">Body Fat</div>
                    <Badge className={`${getFMIBenchmark(useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi).bg} ${getFMIBenchmark(useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi).color} border-0 text-[11px] px-2 font-semibold`}>
                      {getFMIBenchmark(useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi).label}
                    </Badge>
                    <div className="text-[10px] text-amber-700 mt-1 font-semibold font-mono">{useTheoretical ? theoreticalMetrics.bodyFat : currentBodyFat}% &middot; {useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi} FMI</div>
                  </div>
                  <div className="bg-blue-50/60 rounded-xl p-2.5 text-center border border-blue-100/80">
                    <div className="text-[9px] text-blue-600/80 uppercase tracking-wider font-medium mb-1">Muscularity</div>
                    <Badge className={`${getFFMIBenchmark(useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi).bg} ${getFFMIBenchmark(useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi).color} border-0 text-[11px] px-2 font-semibold`}>
                      {getFFMIBenchmark(useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi).label}
                    </Badge>
                    <div className="text-[10px] text-blue-700 mt-1 font-semibold font-mono">{useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi} FFMI</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mortality Risk */}
            <Card className="lg:col-span-4 bg-white/[0.97] backdrop-blur border border-slate-200/60 shadow-xl shadow-black/5 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 px-5 pt-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-[#00263d]">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <div>
                      <div className="text-sm font-semibold tracking-tight">Mortality Risk</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">Hazard ratio by body composition</div>
                    </div>
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-4 w-4 text-slate-400 cursor-help" /></TooltipTrigger>
                    <CitationTooltip citation={CITATIONS.mortalityRisk} />
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {/* FMI Risk Curve */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-600">Fat Mass Index (FMI)</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      HR: <span className={`font-bold ${getHazardRatio(useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi, 'fmi') <= 1.1 ? 'text-green-600' : getHazardRatio(useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi, 'fmi') <= 1.5 ? 'text-amber-600' : 'text-red-600'}`}>
                        {getHazardRatio(useTheoretical ? theoreticalMetrics.fmi : currentMetrics.fmi, 'fmi').toFixed(2)}
                      </span>
                    </span>
                  </div>
                  <div className="bg-slate-50/60 rounded-xl p-2.5 h-40 border border-slate-100/80">
                    <svg className="w-full h-full" viewBox="0 0 380 120" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="fmiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="30%" stopColor="#22c55e" />
                          <stop offset="50%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                        <filter id="glow"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                      </defs>
                      {[0.25, 0.5, 0.75].map(p => <line key={p} x1="30" y1={10 + 85 * p} x2="360" y2={10 + 85 * p} stroke="#e8ecf0" strokeWidth="0.5" />)}
                      {(() => {
                        const minX = 2, maxX = 18;
                        const scaleX = (x: number) => 30 + ((x - minX) / (maxX - minX)) * 330;
                        return <rect x={scaleX(5)} y="10" width={scaleX(9) - scaleX(5)} height="85" fill="#22c55e" fillOpacity="0.08" rx="4" />;
                      })()}
                      {(() => {
                        const minY = 0.9, maxY = 2.5;
                        const y = 95 - ((1 - minY) / (maxY - minY)) * 85;
                        return <><line x1="30" y1={y} x2="360" y2={y} stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="3" /><text x="365" y={y + 3} fontSize="7" fill="#94a3b8" fontFamily="ui-monospace, monospace">1.0</text></>;
                      })()}
                      {(() => {
                        const minX = 2, maxX = 18, minY = 0.9, maxY = 2.5;
                        const points = MORTALITY_RISK.fmi.points.filter(p => p.x <= maxX).map(p => ({
                          x: 30 + ((p.x - minX) / (maxX - minX)) * 330,
                          y: 95 - ((p.hr - minY) / (maxY - minY)) * 85
                        }));
                        const currentFMI = currentMetrics.fmi;
                        const theoreticalFMI = theoreticalMetrics.fmi;
                        const cx = 30 + ((currentFMI - minX) / (maxX - minX)) * 330;
                        const cy = 95 - ((getHazardRatio(currentFMI, 'fmi') - minY) / (maxY - minY)) * 85;
                        const tx = 30 + ((theoreticalFMI - minX) / (maxX - minX)) * 330;
                        const ty = 95 - ((getHazardRatio(theoreticalFMI, 'fmi') - minY) / (maxY - minY)) * 85;
                        return (
                          <>
                            <path d={createSmoothCurve(points)} fill="none" stroke="url(#fmiGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#glow)" />
                            {useTheoretical && <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#c19962" strokeWidth="1.5" strokeDasharray="4" />}
                            <circle cx={cx} cy={cy} r="5" fill="#00263d" stroke="#fff" strokeWidth="2" />
                            {useTheoretical && <circle cx={tx} cy={ty} r="5" fill="#6366f1" stroke="#fff" strokeWidth="2" />}
                          </>
                        );
                      })()}
                      <text x="195" y="113" fontSize="8" fill="#8896a4" textAnchor="middle" fontFamily="ui-monospace, monospace">FMI (kg/m²)</text>
                      {[4, 8, 12, 16].map(v => <text key={v} x={30 + ((v - 2) / 16) * 330} y="108" fontSize="7" fill="#94a3b8" textAnchor="middle" fontFamily="ui-monospace, monospace">{v}</text>)}
                    </svg>
                  </div>
                </div>
                
                {/* FFMI Risk Curve */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-600">Fat-Free Mass Index (FFMI)</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      HR: <span className={`font-bold ${getHazardRatio(useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi, 'ffmi') <= 0.85 ? 'text-green-600' : getHazardRatio(useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi, 'ffmi') <= 1.1 ? 'text-amber-600' : 'text-red-600'}`}>
                        {getHazardRatio(useTheoretical ? theoreticalMetrics.ffmi : currentMetrics.ffmi, 'ffmi').toFixed(2)}
                      </span>
                    </span>
                  </div>
                  <div className="bg-slate-50/60 rounded-xl p-2.5 h-40 border border-slate-100/80">
                    <svg className="w-full h-full" viewBox="0 0 380 120" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="ffmiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="40%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                      {[0.25, 0.5, 0.75].map(p => <line key={p} x1="30" y1={10 + 85 * p} x2="360" y2={10 + 85 * p} stroke="#e8ecf0" strokeWidth="0.5" />)}
                      {(() => {
                        const minX = 14, maxX = 26;
                        const scaleX = (x: number) => 30 + ((x - minX) / (maxX - minX)) * 330;
                        return <rect x={scaleX(19)} y="10" width={scaleX(24) - scaleX(19)} height="85" fill="#22c55e" fillOpacity="0.08" rx="4" />;
                      })()}
                      {(() => {
                        const minY = 0.6, maxY = 2.5;
                        const y = 95 - ((1 - minY) / (maxY - minY)) * 85;
                        return <><line x1="30" y1={y} x2="360" y2={y} stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="3" /><text x="365" y={y + 3} fontSize="7" fill="#94a3b8" fontFamily="ui-monospace, monospace">1.0</text></>;
                      })()}
                      {(() => {
                        const minX = 14, maxX = 26, minY = 0.6, maxY = 2.5;
                        const points = MORTALITY_RISK.ffmi.points.filter(p => p.x >= minX && p.x <= maxX).map(p => ({
                          x: 30 + ((p.x - minX) / (maxX - minX)) * 330,
                          y: 95 - ((p.hr - minY) / (maxY - minY)) * 85
                        }));
                        const currentFFMI = Math.min(Math.max(currentMetrics.ffmi, minX), maxX);
                        const theoreticalFFMI = Math.min(Math.max(theoreticalMetrics.ffmi, minX), maxX);
                        const cx = 30 + ((currentFFMI - minX) / (maxX - minX)) * 330;
                        const cy = 95 - ((getHazardRatio(currentMetrics.ffmi, 'ffmi') - minY) / (maxY - minY)) * 85;
                        const tx = 30 + ((theoreticalFFMI - minX) / (maxX - minX)) * 330;
                        const ty = 95 - ((getHazardRatio(theoreticalMetrics.ffmi, 'ffmi') - minY) / (maxY - minY)) * 85;
                        return (
                          <>
                            <path d={createSmoothCurve(points)} fill="none" stroke="url(#ffmiGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#glow)" />
                            {useTheoretical && <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#c19962" strokeWidth="1.5" strokeDasharray="4" />}
                            <circle cx={cx} cy={cy} r="5" fill="#00263d" stroke="#fff" strokeWidth="2" />
                            {useTheoretical && <circle cx={tx} cy={ty} r="5" fill="#6366f1" stroke="#fff" strokeWidth="2" />}
                          </>
                        );
                      })()}
                      <text x="195" y="113" fontSize="8" fill="#8896a4" textAnchor="middle" fontFamily="ui-monospace, monospace">FFMI (kg/m²)</text>
                      {[16, 18, 20, 22, 24].map(v => <text key={v} x={30 + ((v - 14) / 12) * 330} y="108" fontSize="7" fill="#94a3b8" textAnchor="middle" fontFamily="ui-monospace, monospace">{v}</text>)}
                    </svg>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#00263d]" />Current</span>
                  {useTheoretical && <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />Theoretical</span>}
                  <span className="flex items-center gap-1.5"><div className="w-5 h-2.5 rounded bg-green-500/15 border border-green-500/20" />Optimal Range</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ═══ Section 2: Goal Configuration ═══ */}
          <Card className="bg-white/[0.97] backdrop-blur border border-slate-200/60 shadow-xl shadow-black/5 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 pt-5 px-6 border-b border-slate-100/80">
              <CardTitle className="flex items-center gap-3 text-[#00263d]">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#00263d] text-[#c19962] text-xs font-bold">2</div>
                <Target className="h-5 w-5 text-[#c19962]" />
                <div>
                  <div className="text-base font-semibold tracking-tight">Goal Configuration</div>
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">Define phase type, target, and rate of change</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Goal Type Selection */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-600">A</span>
                    </div>
                    Select Your Goal
                  </h3>
                  <div className="space-y-2.5">
                    {[
                      { value: 'fat_loss', label: 'Fat Loss', desc: 'Reduce body fat while preserving muscle', icon: TrendingDown, activeColor: 'bg-[#00263d]', iconColor: 'text-rose-500', bgColor: 'bg-white', borderColor: 'border-slate-200' },
                      { value: 'muscle_gain', label: 'Build Muscle', desc: 'Add lean mass with controlled fat gain', icon: TrendingUp, activeColor: 'bg-[#00263d]', iconColor: 'text-blue-500', bgColor: 'bg-white', borderColor: 'border-slate-200' },
                      { value: 'recomposition', label: 'Recomposition', desc: 'Lose fat and gain muscle simultaneously', icon: RefreshCcw, activeColor: 'bg-[#00263d]', iconColor: 'text-indigo-500', bgColor: 'bg-white', borderColor: 'border-slate-200' },
                    ].map(({ value, label, desc, icon: Icon, activeColor, iconColor, bgColor, borderColor }) => (
                      <button key={value} onClick={() => setPhaseType(value as any)}
                        className={`w-full p-4 rounded-xl text-left transition-all border ${phaseType === value ? `${activeColor} text-white shadow-lg border-transparent` : `${bgColor} ${borderColor} hover:border-slate-300 hover:shadow-sm`}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${phaseType === value ? 'bg-white/15' : 'bg-slate-50'}`}>
                            <Icon className={`h-5 w-5 ${phaseType === value ? 'text-[#c19962]' : iconColor}`} />
                          </div>
                          <div className="flex-1">
                            <div className={`font-semibold text-sm ${phaseType === value ? 'text-white' : 'text-slate-700'}`}>{label}</div>
                            <div className={`text-xs mt-0.5 ${phaseType === value ? 'text-white/70' : 'text-slate-500'}`}>{desc}</div>
                          </div>
                          {phaseType === value && <CheckCircle2 className="h-5 w-5 text-[#c19962]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Setting */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-600">B</span>
                    </div>
                    Set Your Target
                  </h3>
                  {phaseType === 'recomposition' ? (
                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-500">Select your training experience level:</p>
                      {Object.entries(RECOMP_EXPECTATIONS).map(([key, val]) => (
                        <button key={key} onClick={() => setRecompExperience(key as any)}
                          className={`w-full p-3.5 rounded-xl text-left transition-all border ${recompExperience === key ? 'bg-[#00263d] text-white shadow-lg border-transparent' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm">{val.label}</span>
                            <Badge className={`${recompExperience === key ? 'bg-[#c19962]/20 text-[#c19962]' : 'bg-slate-100 text-slate-600'} border-0 font-mono text-[10px]`}>{val.probability}%</Badge>
                          </div>
                          <div className={`text-xs mt-1 font-mono ${recompExperience === key ? 'text-slate-400' : 'text-slate-500'}`}>
                            -{val.monthlyFatLoss} lbs fat / +{val.monthlyMuscleGain} lbs muscle per month
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Target Method Selector */}
                      <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-slate-50/80">
                        {[{ value: 'body_fat', label: 'BF%' }, { value: 'fmi', label: 'FMI' }, { value: 'ffmi', label: 'FFMI' }, { value: 'fat_mass', label: 'FM' }, { value: 'ffm', label: 'FFM' }].map(({ value, label }) => (
                          <button key={value} onClick={() => setTargetMethod(value as any)}
                            className={`flex-1 text-[11px] font-semibold py-2.5 transition-colors ${targetMethod === value ? 'bg-[#00263d] text-[#c19962]' : 'text-slate-500 hover:bg-slate-100'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      
                      {/* Target Input Area */}
                      <div className="bg-slate-50/60 rounded-xl p-5 border border-slate-100/80">
                        {targetMethod === 'body_fat' && (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label className="text-sm font-medium text-slate-600">Target Body Fat %</Label>
                              <span className="text-2xl font-bold text-[#00263d]">{targetBodyFat}%</span>
                            </div>
                            <Slider value={[targetBodyFat]} onValueChange={([v]) => setTargetBodyFat(v)} min={5} max={35} step={0.5} className="py-2" />
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>5% (Essential)</span>
                              <span className="font-medium text-slate-600">Current: {currentBodyFat}%</span>
                              <span>35%</span>
                            </div>
                          </div>
                        )}
                        {targetMethod === 'fmi' && (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label className="text-sm font-medium text-slate-600">Target Fat Mass Index</Label>
                              <span className="text-2xl font-bold text-[#00263d]">{targetFMI}</span>
                            </div>
                            <Slider value={[targetFMI]} onValueChange={([v]) => setTargetFMI(v)} min={2} max={15} step={0.5} className="py-2" />
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>2 (Very Lean)</span>
                              <span className="font-medium text-slate-600">Current: {currentMetrics.fmi}</span>
                              <span>15</span>
                            </div>
                          </div>
                        )}
                        {targetMethod === 'ffmi' && (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label className="text-sm font-medium text-slate-600">Target Fat-Free Mass Index</Label>
                              <span className="text-2xl font-bold text-[#00263d]">{targetFFMI}</span>
                            </div>
                            <Slider value={[targetFFMI]} onValueChange={([v]) => setTargetFFMI(v)} min={16} max={28} step={0.5} className="py-2" />
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>16 (Below Avg)</span>
                              <span className="font-medium text-slate-600">Current: {currentMetrics.ffmi}</span>
                              <span>28 (Elite)</span>
                            </div>
                          </div>
                        )}
                        {targetMethod === 'fat_mass' && (
                          <div className="space-y-4">
                            <Label className="text-sm font-medium text-slate-600">Target Fat Mass (lbs)</Label>
                            <Input type="number" value={targetFatMass} onChange={(e) => setTargetFatMass(Number(e.target.value))} className="h-12 text-xl text-center font-bold bg-white" />
                            <p className="text-xs text-slate-500 text-center">Current: {currentMetrics.fatMassLbs} lbs</p>
                          </div>
                        )}
                        {targetMethod === 'ffm' && (
                          <div className="space-y-4">
                            <Label className="text-sm font-medium text-slate-600">Target Fat-Free Mass (lbs)</Label>
                            <Input type="number" value={targetFFM} onChange={(e) => setTargetFFM(Number(e.target.value))} className="h-12 text-xl text-center font-bold bg-white" />
                            <p className="text-xs text-slate-500 text-center">Current: {currentMetrics.ffmLbs} lbs</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rate & Timeline */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-600">C</span>
                    </div>
                    Rate & Timeline
                  </h3>
                  
                  {phaseType !== 'recomposition' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50/60 rounded-xl border border-slate-100/80">
                        <Label className="text-sm text-slate-600 font-medium">Custom Rate</Label>
                        <Switch checked={useCustomRate} onCheckedChange={setUseCustomRate} />
                      </div>
                      
                      {useCustomRate ? (
                        <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100/80">
                          <div className="flex items-center gap-3">
                            <Slider value={[customRate]} onValueChange={([v]) => setCustomRate(v)} min={0.1} max={1.5} step={0.05} className="flex-1" />
                            <span className="text-xl font-bold font-mono text-[#00263d] w-16 text-center">{customRate}%</span>
                          </div>
                          <div className="text-xs text-center text-slate-500 mt-2 font-mono">
                            &asymp; {Math.round(currentWeight * customRate / 100 * 10) / 10} lbs per week
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(phaseType === 'fat_loss' ? RATE_PRESETS.fat_loss : RATE_PRESETS.muscle_gain).map(([key, val]) => {
                            const isSelected = phaseType === 'fat_loss' ? fatLossRateKey === key : muscleGainRateKey === key;
                            return (
                              <button key={key} onClick={() => phaseType === 'fat_loss' ? setFatLossRateKey(key) : setMuscleGainRateKey(key)}
                                className={`w-full p-3 rounded-xl text-left transition-all border ${isSelected ? 'bg-[#00263d] text-white border-transparent shadow-md' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-semibold text-sm">{val.label}</span>
                                    <span className={`text-xs ml-2 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>{val.description}</span>
                                  </div>
                                  <Badge className={`${isSelected ? 'bg-[#c19962]/20 text-[#c19962]' : 'bg-slate-100 text-slate-600'} border-0 font-mono text-[11px]`}>{val.rate}%/wk</Badge>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Start Date */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Start Date</Label>
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      className="h-10 text-sm bg-slate-50/80 border-slate-200 rounded-lg text-center font-mono"
                    />
                  </div>
                  
                  {/* Timeline Summary */}
                  <div className="bg-[#00263d] rounded-xl p-4 text-center">
                    <Calendar className="h-4 w-4 mx-auto mb-1 text-[#c19962]/60" />
                    <div className="text-3xl font-bold font-mono text-white">{calculatedTimeline.weeks} <span className="text-sm font-normal text-slate-400">weeks</span></div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">
                      {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &rarr; {new Date(weeklyProjections[weeklyProjections.length - 1]?.date || startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  
                  {/* Success Probability */}
                  <div className={`rounded-xl p-4 border ${feasibility.probability >= 70 ? 'bg-green-50/50 border-green-200/60' : feasibility.probability >= 40 ? 'bg-amber-50/50 border-amber-200/60' : 'bg-red-50/50 border-red-200/60'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Success Probability</span>
                      <span className={`font-bold font-mono text-lg ${feasibility.probability >= 70 ? 'text-green-600' : feasibility.probability >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{feasibility.probability}%</span>
                    </div>
                    <div className="h-2 bg-slate-200/50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${feasibility.probability >= 70 ? 'bg-green-500' : feasibility.probability >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${feasibility.probability}%` }} />
                    </div>
                    <p className="text-[11px] mt-2 text-slate-500">{feasibility.message}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ═══ Section 3: Projected Results ═══ */}
          {projectedMetrics && summary && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Parameters + Results */}
              <Card className="lg:col-span-4 bg-white/[0.97] backdrop-blur border border-slate-200/60 shadow-xl shadow-black/5 rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 px-5 pt-5">
                  <CardTitle className="flex items-center gap-3 text-[#00263d]">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#00263d] text-[#c19962] text-xs font-bold">3</div>
                    <div>
                      <div className="text-sm font-semibold tracking-tight">Projected Results</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">Estimated outcomes</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-3">
                  {/* Parameter controls */}
                  <div className="grid grid-cols-4 gap-2.5">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Protein Level</Label>
                      <Select value={proteinLevel} onValueChange={(v: any) => setProteinLevel(v)}>
                        <SelectTrigger className="h-8 text-[10px] bg-slate-50/80 border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(PROTEIN_EFFECT).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col items-center justify-end gap-1 pb-0.5">
                      <Label className="text-[9px] text-slate-400 uppercase">Water</Label>
                      <Switch checked={includeWaterChanges} onCheckedChange={setIncludeWaterChanges} />
                    </div>
                    <div className="flex flex-col items-center justify-end gap-1 pb-0.5">
                      <Label className="text-[9px] text-slate-400 uppercase">CI</Label>
                      <Switch checked={showCI} onCheckedChange={setShowCI} />
                    </div>
                  </div>
                  
                  {/* Key outcomes */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-50/60 rounded-xl p-3 text-center border border-slate-100/80">
                      <div className="text-2xl font-bold font-mono text-[#00263d]">{projectedMetrics.weightLbs}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Weight (lbs)</div>
                      <div className={`text-[11px] font-semibold font-mono mt-0.5 ${summary.totalWeightChange < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                        {summary.totalWeightChange < 0 ? '' : '+'}{summary.totalWeightChange}
                      </div>
                    </div>
                    <div className="bg-slate-50/60 rounded-xl p-3 text-center border border-slate-100/80">
                      <div className="text-2xl font-bold font-mono text-[#00263d]">{projectedMetrics.bodyFat}%</div>
                      <div className="text-[10px] text-slate-500 font-medium">Body Fat</div>
                      <div className={`text-[11px] font-semibold font-mono mt-0.5 ${projectedMetrics.bodyFat < currentBodyFat ? 'text-green-600' : 'text-amber-600'}`}>
                        {(projectedMetrics.bodyFat - currentBodyFat).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Composition breakdown */}
                  <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-100/80 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Fat Mass</span>
                      <span className="text-sm font-bold font-mono text-[#00263d]">
                        {projectedMetrics.fatMassLbs}
                        <span className={`text-[10px] ml-1.5 ${summary.totalFatChange < 0 ? 'text-green-600' : 'text-red-500'}`}>
                          ({summary.totalFatChange})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Fat-Free Mass</span>
                      <span className="text-sm font-bold font-mono text-[#00263d]">
                        {projectedMetrics.ffmLbs}
                        <span className={`text-[10px] ml-1.5 ${summary.totalFFMChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          ({summary.totalFFMChange >= 0 ? '+' : ''}{summary.totalFFMChange})
                        </span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Weight change composition bar */}
                  <div>
                    <div className="h-2 rounded-full overflow-hidden flex bg-slate-200/60">
                      <div className="bg-amber-500 transition-all" style={{ width: `${summary.pctFromFat}%` }} />
                      <div className="bg-rose-400 transition-all" style={{ width: `${summary.pctFromFFM}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] mt-1">
                      <span className="text-amber-600 font-medium">Fat: {summary.pctFromFat}%</span>
                      <span className="text-rose-500 font-medium">FFM: {summary.pctFromFFM}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline Graphs */}
              <Card className="lg:col-span-8 bg-white/[0.97] backdrop-blur border border-slate-200/60 shadow-xl shadow-black/5 rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 px-5 pt-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="flex items-center gap-3 text-[#00263d]">
                      <LineChart className="h-4 w-4 text-indigo-500" />
                      <div>
                        <div className="text-sm font-semibold tracking-tight">Timeline Projection</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">Weekly trajectory</div>
                      </div>
                    </CardTitle>
                    <div className="flex items-center gap-2.5">
                      {/* Variable selector tabs */}
                      <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-slate-50/80">
                        {[
                          { key: 'weight', label: 'Weight', color: '#6366f1' },
                          { key: 'bodyFat', label: 'BF%', color: '#f59e0b' },
                          { key: 'fatMass', label: 'FM', color: '#ef4444' },
                          { key: 'ffm', label: 'FFM', color: '#22c55e' },
                        ].map(({ key, label, color }) => (
                          <button 
                            key={key}
                            onClick={() => setSelectedGraphVar(key as any)} 
                            className={`px-3 py-1.5 text-[11px] font-semibold transition-all ${
                              selectedGraphVar === key 
                                ? 'text-white' 
                                : 'text-slate-500 hover:bg-slate-100'
                            }`}
                            style={{ backgroundColor: selectedGraphVar === key ? color : undefined }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {/* Graph/Table toggle */}
                      <div className="flex rounded-lg overflow-hidden border border-slate-200">
                        <button onClick={() => setViewMode('graph')} className={`px-2.5 py-1.5 transition-colors ${viewMode === 'graph' ? 'bg-[#00263d] text-[#c19962]' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>
                          <LineChart className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setViewMode('table')} className={`px-2.5 py-1.5 border-l border-slate-200 transition-colors ${viewMode === 'table' ? 'bg-[#00263d] text-[#c19962]' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>
                          <Table className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {viewMode === 'graph' ? (
                    <div className="space-y-3">
                      {/* Summary stats */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-5">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <span className="text-[11px] text-slate-500">Start: <span className="font-bold font-mono text-slate-700">{graphConfigs[selectedGraphVar].data[0]}{graphConfigs[selectedGraphVar].unit}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            <span className="text-[11px] text-slate-500">End: <span className="font-bold font-mono text-slate-700">{graphConfigs[selectedGraphVar].data[graphConfigs[selectedGraphVar].data.length - 1]}{graphConfigs[selectedGraphVar].unit}</span></span>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          &Delta; <span className={`font-bold font-mono ${(graphConfigs[selectedGraphVar].data[graphConfigs[selectedGraphVar].data.length - 1] - graphConfigs[selectedGraphVar].data[0]) < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                            {(graphConfigs[selectedGraphVar].data[graphConfigs[selectedGraphVar].data.length - 1] - graphConfigs[selectedGraphVar].data[0]) > 0 ? '+' : ''}
                            {(graphConfigs[selectedGraphVar].data[graphConfigs[selectedGraphVar].data.length - 1] - graphConfigs[selectedGraphVar].data[0]).toFixed(1)}{graphConfigs[selectedGraphVar].unit}
                          </span>
                        </span>
                      </div>
                      
                      {/* Chart */}
                      <div className="bg-slate-50/40 rounded-xl border border-slate-100/60 p-3">
                        <LargeGraph />
                      </div>
                      
                      <p className="text-center text-[10px] text-slate-400">Hover over the chart to inspect values at each week</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[320px]">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 text-left text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Wk</th>
                            <th className="py-2.5 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Weight</th>
                            <th className="py-2.5 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">BF%</th>
                            <th className="py-2.5 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">FM</th>
                            <th className="py-2.5 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">FFM</th>
                            <th className="py-2.5 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">FMI</th>
                            <th className="py-2.5 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">FFMI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeklyProjections.map((p, i) => (
                            <tr key={i} className={`border-b border-slate-50 ${i === 0 ? 'bg-red-50/40' : i === weeklyProjections.length - 1 ? 'bg-green-50/40' : 'hover:bg-slate-50/50'}`}>
                              <td className="py-2 px-3 font-semibold font-mono text-slate-600 text-xs">{p.week}</td>
                              <td className="py-2 px-3 text-center font-mono text-xs">{p.weight}</td>
                              <td className="py-2 px-3 text-center font-mono text-xs">{p.bodyFat}%</td>
                              <td className="py-2 px-3 text-center font-mono text-xs">{p.fatMass}</td>
                              <td className="py-2 px-3 text-center font-mono text-xs">{p.ffm}</td>
                              <td className="py-2 px-3 text-center font-mono text-xs text-slate-400">{p.fmi}</td>
                              <td className="py-2 px-3 text-center font-mono text-xs text-slate-400">{p.ffmi}</td>
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

          {/* ═══ Section 4: Nutrition Targets ═══ */}
          {nutritionTargets && (
            <Card className="bg-white/[0.97] backdrop-blur border border-slate-200/60 shadow-xl shadow-black/5 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 px-6 pt-5 border-b border-slate-100/80">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-[#00263d]">
                    <Activity className="h-4 w-4 text-[#c19962]" />
                    <div>
                      <div className="text-sm font-semibold tracking-tight">Estimated Nutrition Targets</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">Starting point &middot; Adjust based on biofeedback</div>
                    </div>
                  </CardTitle>
                  <Button
                    onClick={handleExportPDF}
                    disabled={isExportingPDF}
                    size="sm"
                    className="bg-[#00263d] hover:bg-[#003a5c] text-[#c19962] text-xs h-9 px-4 rounded-lg"
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
              <CardContent className="px-6 pb-6 pt-5">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  <div className="bg-[#00263d] rounded-xl p-3.5 text-center">
                    <div className="text-2xl font-bold font-mono text-white">{nutritionTargets.calories}</div>
                    <div className="text-[9px] text-[#c19962]/80 uppercase tracking-wider font-medium mt-0.5">Calories</div>
                    <div className={`text-[10px] font-mono mt-0.5 ${nutritionTargets.deficit < 0 ? 'text-green-400' : 'text-blue-400'}`}>
                      {nutritionTargets.deficit < 0 ? '' : '+'}{nutritionTargets.deficit}/day
                    </div>
                  </div>
                  <div className="bg-rose-50/60 rounded-xl p-3.5 text-center border border-rose-100/80">
                    <div className="text-2xl font-bold font-mono text-rose-600">{nutritionTargets.protein}g</div>
                    <div className="text-[9px] text-rose-500/80 uppercase tracking-wider font-medium mt-0.5">Protein</div>
                    <div className="text-[10px] text-rose-400 font-mono">{Math.round(nutritionTargets.protein * 4)} kcal</div>
                  </div>
                  <div className="bg-amber-50/60 rounded-xl p-3.5 text-center border border-amber-100/80">
                    <div className="text-2xl font-bold font-mono text-amber-600">{nutritionTargets.carbs}g</div>
                    <div className="text-[9px] text-amber-500/80 uppercase tracking-wider font-medium mt-0.5">Carbs</div>
                    <div className="text-[10px] text-amber-400 font-mono">{Math.round(nutritionTargets.carbs * 4)} kcal</div>
                  </div>
                  <div className="bg-blue-50/60 rounded-xl p-3.5 text-center border border-blue-100/80">
                    <div className="text-2xl font-bold font-mono text-blue-600">{nutritionTargets.fat}g</div>
                    <div className="text-[9px] text-blue-500/80 uppercase tracking-wider font-medium mt-0.5">Fat</div>
                    <div className="text-[10px] text-blue-400 font-mono">{Math.round(nutritionTargets.fat * 9)} kcal</div>
                  </div>
                  <div className="bg-slate-50/60 rounded-xl p-3.5 text-center border border-slate-100/80">
                    <div className="text-2xl font-bold font-mono text-slate-700">{tdee}</div>
                    <div className="text-[9px] text-slate-500/80 uppercase tracking-wider font-medium mt-0.5">TDEE</div>
                    <div className="text-[10px] text-slate-400 font-mono">Maintenance</div>
                  </div>
                </div>
                
                {/* Disclaimer */}
                <div className="bg-slate-50/60 border border-slate-200/60 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    <strong className="text-slate-600">Disclaimer:</strong> These are estimated starting targets based on predictive equations and should be used as a baseline only. 
                    <span className="text-slate-600 font-semibold"> Fitomics coaching and programming</span> utilizes dynamic monitoring and ongoing adjustments 
                    as your body composition and physiology change. Nutrition should be periodized and adjusted based on real-world progress, biofeedback, and metabolic adaptation.
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