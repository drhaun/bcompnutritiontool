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
 * MEASUREMENT ERROR CONSTANTS
 * Based on: Tinsley et al. (2021) "A Field-Based Three-Compartment Model"
 * and meta-analyses of body composition measurement precision
 * 
 * SEE = Standard Error of Estimate (prediction accuracy)
 * TEM = Technical Error of Measurement (repeatability)
 * 
 * For 3C model field-based assessments:
 * - Body Fat %: SEE ~1.5-2.5%, TEM ~0.5-1.0%
 * - Fat Mass: SEE ~1.0-2.0 kg, TEM ~0.3-0.6 kg
 * - FFM: SEE ~1.0-2.0 kg, TEM ~0.3-0.5 kg
 */
const MEASUREMENT_ERROR = {
  // 3C Field Model (Tinsley et al. style - BIA + anthropometrics)
  field_3c: {
    label: '3C Field Model (BIA + Anthropometrics)',
    bodyFatPct: { see: 2.0, tem: 0.8 },  // percentage points
    fatMassKg: { see: 1.5, tem: 0.5 },   // kg
    ffmKg: { see: 1.5, tem: 0.4 },       // kg
  },
  // DXA (gold standard for clinical)
  dxa: {
    label: 'DXA',
    bodyFatPct: { see: 1.0, tem: 0.5 },
    fatMassKg: { see: 0.5, tem: 0.3 },
    ffmKg: { see: 0.4, tem: 0.3 },
  },
  // BIA only
  bia: {
    label: 'BIA Only',
    bodyFatPct: { see: 3.5, tem: 1.0 },
    fatMassKg: { see: 2.5, tem: 0.8 },
    ffmKg: { see: 2.8, tem: 0.7 },
  },
  // Skinfolds (trained technician)
  skinfolds: {
    label: 'Skinfolds',
    bodyFatPct: { see: 3.0, tem: 1.5 },
    fatMassKg: { see: 2.0, tem: 1.0 },
    ffmKg: { see: 2.0, tem: 1.0 },
  },
};

/**
 * Minimum Detectable Change (MDC) calculation
 * MDC = SEM × √2 × z-score
 * For 95% confidence: MDC95 = TEM × √2 × 1.96 ≈ TEM × 2.77
 */
function calculateMDC(tem: number, confidenceLevel: number = 0.95): number {
  const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.90 ? 1.645 : 2.58;
  return tem * Math.sqrt(2) * zScore;
}

/**
 * Forbes Rule: Lean mass loss as a function of fat mass
 * Reference: Forbes GB. Body fat content influences the body composition response to nutrition and exercise. Ann N Y Acad Sci. 2000
 */
const FORBES_CONSTANT = 10.4; // kg

/**
 * Protein leverage effects on P-ratio
 * Reference: Heymsfield SB et al. Int J Obes. 2014
 */
const PROTEIN_EFFECT = {
  low: { threshold: 1.0, multiplier: 1.3, label: 'Low (<1.0 g/kg)' },
  moderate: { threshold: 1.6, multiplier: 1.0, label: 'Moderate (1.0-1.6 g/kg)' },
  high: { threshold: 2.2, multiplier: 0.65, label: 'High (1.6-2.2 g/kg)' },
  very_high: { threshold: 3.0, multiplier: 0.5, label: 'Very High (>2.2 g/kg)' },
};

/**
 * Resistance training effects on P-ratio
 * Reference: Longland TM et al. Am J Clin Nutr. 2016
 */
const TRAINING_EFFECT = {
  none: { multiplier: 1.4, label: 'No resistance training' },
  light: { multiplier: 1.15, label: 'Light (1-2x/week)' },
  moderate: { multiplier: 0.85, label: 'Moderate (3-4x/week)' },
  intense: { multiplier: 0.6, label: 'Intense (5-6x/week, progressive)' },
};

/**
 * Energy deficit effects on P-ratio
 */
const DEFICIT_EFFECT = {
  mild: { range: [0, 300], multiplier: 0.85, label: 'Mild (<300 kcal)' },
  moderate: { range: [300, 500], multiplier: 1.0, label: 'Moderate (300-500 kcal)' },
  aggressive: { range: [500, 750], multiplier: 1.2, label: 'Aggressive (500-750 kcal)' },
  severe: { range: [750, 2000], multiplier: 1.5, label: 'Severe (>750 kcal)' },
};

/**
 * Muscle gain partitioning during surplus
 * Reference: Slater GJ et al. Front Nutr. 2019
 */
const SURPLUS_PARTITIONING = {
  untrained: { muscleRatio: 0.3, label: 'Untrained' },
  novice: { muscleRatio: 0.45, label: 'Novice (0-1 year)' },
  intermediate: { muscleRatio: 0.55, label: 'Intermediate (1-3 years)' },
  advanced: { muscleRatio: 0.4, label: 'Advanced (3+ years)' },
};

/**
 * Body water changes with glycogen
 * Reference: Kreitzman SN et al. Am J Clin Nutr. 1992
 */
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

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function calculatePRatio(
  fatMassKg: number,
  proteinLevel: keyof typeof PROTEIN_EFFECT,
  trainingLevel: keyof typeof TRAINING_EFFECT,
  deficitLevel: keyof typeof DEFICIT_EFFECT,
  isDeficit: boolean
): number {
  const basePRatio = FORBES_CONSTANT / (FORBES_CONSTANT + fatMassKg);
  
  if (!isDeficit) return basePRatio;
  
  const proteinMod = PROTEIN_EFFECT[proteinLevel].multiplier;
  const trainingMod = TRAINING_EFFECT[trainingLevel].multiplier;
  const deficitMod = DEFICIT_EFFECT[deficitLevel].multiplier;
  
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
  
  // Metabolism data
  const [rmrSource, setRmrSource] = useState<'estimated' | 'measured'>('estimated');
  const [measuredRmr, setMeasuredRmr] = useState<number>(1800);
  const [neatLevel, setNeatLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>('light');
  const [tef, setTef] = useState<number>(10);
  const [eee, setEee] = useState<number>(300);
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState<number>(4);
  
  // Goal settings - expanded
  const [goalType, setGoalType] = useState<'body_fat' | 'weight' | 'ffmi' | 'fmi' | 'fat_mass' | 'ffm'>('body_fat');
  const [targetBodyFat, setTargetBodyFat] = useState<number>(12);
  const [targetWeight, setTargetWeight] = useState<number>(170);
  const [targetFFMI, setTargetFFMI] = useState<number>(22);
  const [targetFMI, setTargetFMI] = useState<number>(5);
  const [targetFatMass, setTargetFatMass] = useState<number>(20);
  const [targetFFM, setTargetFFM] = useState<number>(150);
  
  // Date planning
  const [startDate, setStartDate] = useState<string>(formatDate(new Date()));
  const [endDate, setEndDate] = useState<string>(formatDate(addWeeks(new Date(), 16)));
  const [useDateRange, setUseDateRange] = useState<boolean>(true);
  
  // Evidence-based parameters
  const [proteinLevel, setProteinLevel] = useState<keyof typeof PROTEIN_EFFECT>('high');
  const [trainingLevel, setTrainingLevel] = useState<keyof typeof TRAINING_EFFECT>('moderate');
  const [trainingExperience, setTrainingExperience] = useState<keyof typeof SURPLUS_PARTITIONING>('intermediate');
  const [includeWaterChanges, setIncludeWaterChanges] = useState<boolean>(true);
  
  // Measurement error settings
  const [measurementMethod, setMeasurementMethod] = useState<keyof typeof MEASUREMENT_ERROR>('field_3c');
  const [showConfidenceInterval, setShowConfidenceInterval] = useState<boolean>(true);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.95);
  
  // View settings
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  
  // Calculated values
  const heightCm = useMemo(() => (heightFt * 12 + heightIn) * 2.54, [heightFt, heightIn]);
  const heightM = heightCm / 100;
  const weightKg = currentWeight * 0.453592;
  
  // Measurement error values
  const measurementErrors = useMemo(() => {
    const method = MEASUREMENT_ERROR[measurementMethod];
    const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.90 ? 1.645 : 2.58;
    
    return {
      bodyFatPct: {
        see: method.bodyFatPct.see,
        tem: method.bodyFatPct.tem,
        ci: method.bodyFatPct.see * zScore,
        mdc: calculateMDC(method.bodyFatPct.tem, confidenceLevel),
      },
      fatMassKg: {
        see: method.fatMassKg.see,
        tem: method.fatMassKg.tem,
        ci: method.fatMassKg.see * zScore,
        mdc: calculateMDC(method.fatMassKg.tem, confidenceLevel),
      },
      ffmKg: {
        see: method.ffmKg.see,
        tem: method.ffmKg.tem,
        ci: method.ffmKg.see * zScore,
        mdc: calculateMDC(method.ffmKg.tem, confidenceLevel),
      },
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
  
  // Estimated RMR (Mifflin-St Jeor)
  const estimatedRmr = useMemo(() => {
    if (gender === 'male') {
      return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
    } else {
      return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
    }
  }, [weightKg, heightCm, age, gender]);
  
  const effectiveRmr = rmrSource === 'estimated' ? estimatedRmr : measuredRmr;
  
  // NEAT estimates
  const neatEstimates = useMemo(() => ({
    sedentary: Math.round(effectiveRmr * 0.15),
    light: Math.round(effectiveRmr * 0.25),
    moderate: Math.round(effectiveRmr * 0.35),
    active: Math.round(effectiveRmr * 0.45),
    very_active: Math.round(effectiveRmr * 0.55),
  }), [effectiveRmr]);
  
  const effectiveNeat = neatEstimates[neatLevel];
  
  // TDEE
  const tdee = useMemo(() => {
    const tefCals = effectiveRmr * (tef / 100);
    const dailyEee = (eee * workoutsPerWeek) / 7;
    return Math.round(effectiveRmr + effectiveNeat + tefCals + dailyEee);
  }, [effectiveRmr, effectiveNeat, tef, eee, workoutsPerWeek]);
  
  // Target metrics based on goal type
  const targetMetrics = useMemo(() => {
    let targetWeightLbs: number;
    let targetBfPct: number;
    let targetFatMassLbs: number;
    let targetFfmLbs: number;
    
    const currentFfmLbs = currentMetrics.ffmLbs;
    const currentFatMassLbs = currentMetrics.fatMassLbs;
    
    switch (goalType) {
      case 'body_fat':
        targetBfPct = targetBodyFat;
        targetFfmLbs = currentFfmLbs;
        targetFatMassLbs = (targetBfPct / (100 - targetBfPct)) * targetFfmLbs;
        targetWeightLbs = targetFfmLbs + targetFatMassLbs;
        break;
        
      case 'weight':
        targetWeightLbs = targetWeight;
        targetFatMassLbs = currentFatMassLbs;
        targetFfmLbs = currentFfmLbs;
        targetBfPct = currentBodyFat;
        break;
        
      case 'ffmi':
        const targetFfmKgFromFFMI = targetFFMI * (heightM * heightM);
        targetFfmLbs = targetFfmKgFromFFMI / 0.453592;
        targetBfPct = currentBodyFat;
        targetFatMassLbs = (targetBfPct / (100 - targetBfPct)) * targetFfmLbs;
        targetWeightLbs = targetFfmLbs + targetFatMassLbs;
        break;
        
      case 'fmi':
        const targetFatMassKgFromFMI = targetFMI * (heightM * heightM);
        targetFatMassLbs = targetFatMassKgFromFMI / 0.453592;
        targetFfmLbs = currentFfmLbs;
        targetWeightLbs = targetFfmLbs + targetFatMassLbs;
        targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
        break;
        
      case 'fat_mass':
        targetFatMassLbs = targetFatMass;
        targetFfmLbs = currentFfmLbs;
        targetWeightLbs = targetFfmLbs + targetFatMassLbs;
        targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
        break;
        
      case 'ffm':
        targetFfmLbs = targetFFM;
        targetFatMassLbs = currentFatMassLbs;
        targetWeightLbs = targetFfmLbs + targetFatMassLbs;
        targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
        break;
        
      default:
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
  }, [goalType, targetBodyFat, targetWeight, targetFFMI, targetFMI, targetFatMass, targetFFM, currentMetrics, heightM, currentBodyFat]);
  
  // Timeline calculation
  const totalWeeks = useMemo(() => {
    if (useDateRange) {
      return weeksBetween(new Date(startDate), new Date(endDate));
    }
    return 16;
  }, [startDate, endDate, useDateRange]);
  
  // Weekly projections with evidence-based partitioning and confidence intervals
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
      // Confidence interval bounds (±)
      weightCI: number;
      fatMassCI: number;
      ffmCI: number;
      bodyFatCI: number;
    }> = [];
    
    const totalWeightChange = targetMetrics.weightLbs - currentWeight;
    const isDeficit = totalWeightChange < 0;
    const weeklyWeightChange = totalWeightChange / totalWeeks;
    
    // Determine deficit level
    const dailyDeficit = Math.abs((weeklyWeightChange * 3500) / 7);
    let deficitLevel: keyof typeof DEFICIT_EFFECT = 'moderate';
    if (dailyDeficit < 300) deficitLevel = 'mild';
    else if (dailyDeficit > 750) deficitLevel = 'severe';
    else if (dailyDeficit > 500) deficitLevel = 'aggressive';
    
    let currentFatMass = currentMetrics.fatMassLbs;
    let currentFfm = currentMetrics.ffmLbs;
    let currentWt = currentWeight;
    let cumulativeGlycogenChange = 0;
    
    // Error propagation: errors compound over time
    // Using √(n) rule for independent measurements
    const baseErrors = measurementErrors;
    
    for (let week = 0; week <= totalWeeks; week++) {
      const date = addWeeks(new Date(startDate), week);
      
      // Error grows with sqrt of weeks for model uncertainty
      // Plus measurement error for each assessment point
      const modelUncertaintyFactor = Math.sqrt(week + 1);
      const weightCILbs = (baseErrors.fatMassKg.ci + baseErrors.ffmKg.ci) * 2.205 * modelUncertaintyFactor * 0.3;
      const fatMassCILbs = baseErrors.fatMassKg.ci * 2.205 * modelUncertaintyFactor * 0.5;
      const ffmCILbs = baseErrors.ffmKg.ci * 2.205 * modelUncertaintyFactor * 0.5;
      const bodyFatCI = baseErrors.bodyFatPct.ci * modelUncertaintyFactor * 0.3;
      
      if (week === 0) {
        projections.push({
          week,
          date: formatDate(date),
          weight: currentWt,
          fatMass: currentFatMass,
          ffm: currentFfm,
          bodyFat: (currentFatMass / currentWt) * 100,
          waterChange: 0,
          scaleWeight: currentWt,
          weightCI: weightCILbs,
          fatMassCI: fatMassCILbs,
          ffmCI: ffmCILbs,
          bodyFatCI: bodyFatCI,
        });
        continue;
      }
      
      const currentFatMassKg = currentFatMass * 0.453592;
      const pRatio = calculatePRatio(currentFatMassKg, proteinLevel, trainingLevel, deficitLevel, isDeficit);
      
      if (isDeficit) {
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
        const weeklyGlycogenChange = isDeficit 
          ? (week <= 2 ? -150 : -20)
          : (week <= 2 ? 100 : 10);
        cumulativeGlycogenChange += weeklyGlycogenChange;
        cumulativeGlycogenChange = Math.max(-(MUSCLE_GLYCOGEN_CAPACITY + LIVER_GLYCOGEN_CAPACITY), 
          Math.min(0, cumulativeGlycogenChange));
        waterChange = (cumulativeGlycogenChange * GLYCOGEN_WATER_RATIO) / 453.592;
      }
      
      projections.push({
        week,
        date: formatDate(date),
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
      });
    }
    
    return projections;
  }, [currentWeight, currentMetrics, targetMetrics, totalWeeks, startDate, proteinLevel, trainingLevel, trainingExperience, includeWaterChanges, measurementErrors]);
  
  // Summary stats
  const summary = useMemo(() => {
    const final = weeklyProjections[weeklyProjections.length - 1];
    const initial = weeklyProjections[0];
    
    const totalFatChange = final.fatMass - initial.fatMass;
    const totalFFMChange = final.ffm - initial.ffm;
    const totalWeightChange = final.weight - initial.weight;
    
    // Check if change exceeds MDC
    const fatChangeMDC = measurementErrors.fatMassKg.mdc * 2.205; // Convert to lbs
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
      // MDC comparisons
      fatChangeExceedsMDC: Math.abs(totalFatChange) > fatChangeMDC,
      ffmChangeExceedsMDC: Math.abs(totalFFMChange) > ffmChangeMDC,
      fatChangeMDC: Math.round(fatChangeMDC * 10) / 10,
      ffmChangeMDC: Math.round(ffmChangeMDC * 10) / 10,
      finalCI: final,
    };
  }, [weeklyProjections, totalWeeks, measurementErrors]);
  
  // Calorie and macro targets
  const nutritionTargets = useMemo(() => {
    const dailyDeficit = (summary.weeklyWeightChange * 3500) / 7;
    const targetCals = Math.round(tdee + dailyDeficit);
    
    const proteinGPerKg = proteinLevel === 'very_high' ? 2.4 : 
                          proteinLevel === 'high' ? 1.8 :
                          proteinLevel === 'moderate' ? 1.4 : 1.0;
    const proteinG = Math.round(weightKg * proteinGPerKg);
    const proteinCal = proteinG * 4;
    
    const fatPct = summary.isDeficit ? 0.25 : 0.30;
    const fatCal = targetCals * fatPct;
    const fatG = Math.round(fatCal / 9);
    
    const carbCal = targetCals - proteinCal - fatCal;
    const carbG = Math.round(Math.max(50, carbCal / 4));
    
    return {
      calories: targetCals,
      protein: proteinG,
      carbs: carbG,
      fat: fatG,
      proteinPct: Math.round((proteinCal / targetCals) * 100),
      carbsPct: Math.round((carbCal / targetCals) * 100),
      fatPct: Math.round((fatCal / targetCals) * 100),
      deficit: Math.round(dailyDeficit),
    };
  }, [tdee, summary, weightKg, proteinLevel]);
  
  // Benchmark helpers
  const getFFMIBenchmark = (ffmi: number) => {
    return FFMI_BENCHMARKS.find(b => ffmi >= b.range[0] && ffmi < b.range[1]) || FFMI_BENCHMARKS[0];
  };
  
  const getFMIBenchmark = (fmi: number) => {
    const benchmarks = gender === 'male' ? FMI_BENCHMARKS_MALE : FMI_BENCHMARKS_FEMALE;
    return benchmarks.find(b => fmi >= b.range[0] && fmi < b.range[1]) || benchmarks[benchmarks.length - 1];
  };

  // SVG Graph helper for confidence interval shading
  const generateGraphWithCI = (
    data: typeof weeklyProjections,
    valueKey: 'weight' | 'fatMass' | 'ffm' | 'bodyFat',
    ciKey: 'weightCI' | 'fatMassCI' | 'ffmCI' | 'bodyFatCI',
    color: string,
    height: number = 120
  ) => {
    const values = data.map(d => d[valueKey]);
    const minVal = Math.min(...values.map((v, i) => v - data[i][ciKey]));
    const maxVal = Math.max(...values.map((v, i) => v + data[i][ciKey]));
    const range = maxVal - minVal || 1;
    const padding = 10;
    const graphHeight = height - padding * 2;
    
    const getY = (val: number) => padding + graphHeight - ((val - minVal) / range) * graphHeight;
    const getX = (i: number) => (i / (data.length - 1)) * 400;
    
    // Build CI polygon path
    const ciPathPoints: string[] = [];
    // Top edge (upper bound)
    for (let i = 0; i < data.length; i++) {
      const x = getX(i);
      const y = getY(data[i][valueKey] + data[i][ciKey]);
      ciPathPoints.push(`${x},${y}`);
    }
    // Bottom edge (lower bound) - reverse order
    for (let i = data.length - 1; i >= 0; i--) {
      const x = getX(i);
      const y = getY(data[i][valueKey] - data[i][ciKey]);
      ciPathPoints.push(`${x},${y}`);
    }
    
    // Main line points
    const linePoints = data.map((d, i) => `${getX(i)},${getY(d[valueKey])}`).join(' ');
    
    return { ciPathPoints: ciPathPoints.join(' '), linePoints, minVal, maxVal };
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 lg:p-6">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#00263d] mb-2">
              Body Composition Calculator
            </h1>
            <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
              Evidence-based body composition planning with Forbes partitioning model, 
              measurement uncertainty, and confidence intervals based on 3C field model methodology.
            </p>
          </div>

          {/* Main Cards Grid - 4 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Column 1: Current Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scale className="h-4 w-4 text-[#c19962]" />
                  Current Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Gender</Label>
                    <Select value={gender} onValueChange={(v: 'male' | 'female') => setGender(v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Age</Label>
                    <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs">Height</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={heightFt} onChange={(e) => setHeightFt(Number(e.target.value))} className="h-8 text-sm" placeholder="ft" />
                    <Input type="number" value={heightIn} onChange={(e) => setHeightIn(Number(e.target.value))} className="h-8 text-sm" placeholder="in" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Weight (lbs)</Label>
                    <Input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Body Fat %</Label>
                    <Input type="number" step="0.1" value={currentBodyFat} onChange={(e) => setCurrentBodyFat(Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                </div>
                
                {/* Current breakdown */}
                <div className="bg-slate-50 rounded-lg p-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fat Mass</span>
                    <span className="font-medium">{currentMetrics.fatMassLbs} lbs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fat-Free Mass</span>
                    <span className="font-medium">{currentMetrics.ffmLbs} lbs</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FMI</span>
                    <Badge className={`text-[10px] ${getFMIBenchmark(currentMetrics.fmi).bgColor} ${getFMIBenchmark(currentMetrics.fmi).color}`}>
                      {currentMetrics.fmi}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FFMI</span>
                    <Badge className={`text-[10px] ${getFFMIBenchmark(currentMetrics.ffmi).bgColor} ${getFFMIBenchmark(currentMetrics.ffmi).color}`}>
                      {currentMetrics.ffmi}
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                {/* Metabolism mini-section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      Metabolism
                    </Label>
                    <Select value={rmrSource} onValueChange={(v: any) => setRmrSource(v)}>
                      <SelectTrigger className="h-6 w-20 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estimated">Est.</SelectItem>
                        <SelectItem value="measured">Meas.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {rmrSource === 'measured' && (
                    <Input type="number" value={measuredRmr} onChange={(e) => setMeasuredRmr(Number(e.target.value))} className="h-7 text-xs" placeholder="RMR" />
                  )}
                  
                  <Select value={neatLevel} onValueChange={(v: any) => setNeatLevel(v)}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="very_active">Very Active</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <Label className="text-[10px]">TEF%</Label>
                      <Input type="number" value={tef} onChange={(e) => setTef(Number(e.target.value))} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">EEE</Label>
                      <Input type="number" value={eee} onChange={(e) => setEee(Number(e.target.value))} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Days</Label>
                      <Input type="number" value={workoutsPerWeek} onChange={(e) => setWorkoutsPerWeek(Number(e.target.value))} className="h-7 text-xs" min={0} max={7} />
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 rounded p-2 border border-orange-200 text-center">
                    <span className="text-xs text-orange-700">TDEE:</span>
                    <span className="text-base font-bold text-orange-600 ml-2">{tdee} kcal</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 2: Goal & Parameters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-[#00263d]" />
                  Goal Setting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs mb-1 block">Goal Type</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { value: 'body_fat', label: 'Body Fat %' },
                      { value: 'weight', label: 'Weight' },
                      { value: 'fat_mass', label: 'Fat Mass' },
                      { value: 'ffm', label: 'FFM (lbs)' },
                      { value: 'ffmi', label: 'FFMI' },
                      { value: 'fmi', label: 'FMI' },
                    ].map((type) => (
                      <Button
                        key={type.value}
                        variant={goalType === type.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setGoalType(type.value as any)}
                        className={`text-xs h-7 ${goalType === type.value ? 'bg-[#00263d]' : ''}`}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Goal-specific input */}
                <div className="bg-slate-50 rounded-lg p-2">
                  {goalType === 'body_fat' && (
                    <div>
                      <Label className="text-xs">Target Body Fat %</Label>
                      <div className="flex gap-2 items-center">
                        <Slider value={[targetBodyFat]} onValueChange={([v]) => setTargetBodyFat(v)} min={5} max={35} step={0.5} className="flex-1" />
                        <Input type="number" value={targetBodyFat} onChange={(e) => setTargetBodyFat(Number(e.target.value))} className="h-7 w-14 text-xs" />
                      </div>
                    </div>
                  )}
                  
                  {goalType === 'weight' && (
                    <div>
                      <Label className="text-xs">Target Weight (lbs)</Label>
                      <Input type="number" value={targetWeight} onChange={(e) => setTargetWeight(Number(e.target.value))} className="h-7 text-xs" />
                    </div>
                  )}
                  
                  {goalType === 'fat_mass' && (
                    <div>
                      <Label className="text-xs">Target Fat Mass (lbs)</Label>
                      <Input type="number" value={targetFatMass} onChange={(e) => setTargetFatMass(Number(e.target.value))} className="h-7 text-xs" />
                      <p className="text-[10px] text-muted-foreground mt-1">Current: {currentMetrics.fatMassLbs} lbs</p>
                    </div>
                  )}
                  
                  {goalType === 'ffm' && (
                    <div>
                      <Label className="text-xs">Target FFM (lbs)</Label>
                      <Input type="number" value={targetFFM} onChange={(e) => setTargetFFM(Number(e.target.value))} className="h-7 text-xs" />
                      <p className="text-[10px] text-muted-foreground mt-1">Current: {currentMetrics.ffmLbs} lbs</p>
                    </div>
                  )}
                  
                  {goalType === 'ffmi' && (
                    <div>
                      <Label className="text-xs">Target FFMI</Label>
                      <div className="flex gap-2 items-center">
                        <Slider value={[targetFFMI]} onValueChange={([v]) => setTargetFFMI(v)} min={16} max={28} step={0.5} className="flex-1" />
                        <Input type="number" value={targetFFMI} onChange={(e) => setTargetFFMI(Number(e.target.value))} className="h-7 w-14 text-xs" />
                      </div>
                    </div>
                  )}
                  
                  {goalType === 'fmi' && (
                    <div>
                      <Label className="text-xs">Target FMI</Label>
                      <div className="flex gap-2 items-center">
                        <Slider value={[targetFMI]} onValueChange={([v]) => setTargetFMI(v)} min={2} max={15} step={0.5} className="flex-1" />
                        <Input type="number" value={targetFMI} onChange={(e) => setTargetFMI(Number(e.target.value))} className="h-7 w-14 text-xs" />
                      </div>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                {/* Date Range */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Timeline
                    </Label>
                    <Switch checked={useDateRange} onCheckedChange={setUseDateRange} />
                  </div>
                  {useDateRange && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Start</Label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-7 text-[10px]" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">End</Label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-7 text-[10px]" />
                      </div>
                    </div>
                  )}
                  <div className="mt-1 text-center">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {totalWeeks} weeks
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                {/* Partitioning Parameters */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Settings2 className="h-3 w-3 text-purple-500" />
                    Partitioning Factors
                  </Label>
                  
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Protein Intake</Label>
                    <Select value={proteinLevel} onValueChange={(v: any) => setProteinLevel(v)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROTEIN_EFFECT).map(([key, val]) => (
                          <SelectItem key={key} value={key} className="text-xs">{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Resistance Training</Label>
                    <Select value={trainingLevel} onValueChange={(v: any) => setTrainingLevel(v)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TRAINING_EFFECT).map(([key, val]) => (
                          <SelectItem key={key} value={key} className="text-xs">{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {!summary.isDeficit && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Training Experience</Label>
                      <Select value={trainingExperience} onValueChange={(v: any) => setTrainingExperience(v)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SURPLUS_PARTITIONING).map(([key, val]) => (
                            <SelectItem key={key} value={key} className="text-xs">{val.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px]">Include Water Changes</Label>
                    <Switch checked={includeWaterChanges} onCheckedChange={setIncludeWaterChanges} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 3: Target & Partitioning */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[#00263d]">Target Composition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-[#00263d]">{targetMetrics.weightLbs}</div>
                    <div className="text-[10px] text-muted-foreground">Weight (lbs)</div>
                  </div>
                  <div className="bg-slate-50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-[#00263d]">{targetMetrics.bodyFat}%</div>
                    <div className="text-[10px] text-muted-foreground">Body Fat</div>
                  </div>
                </div>
                
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fat Mass</span>
                    <span>
                      {targetMetrics.fatMassLbs} lbs
                      <span className={`ml-1 ${targetMetrics.fatMassLbs < currentMetrics.fatMassLbs ? 'text-green-600' : 'text-red-600'}`}>
                        ({targetMetrics.fatMassLbs < currentMetrics.fatMassLbs ? '' : '+'}
                        {(targetMetrics.fatMassLbs - currentMetrics.fatMassLbs).toFixed(1)})
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FFM</span>
                    <span>
                      {targetMetrics.ffmLbs} lbs
                      <span className={`ml-1 ${targetMetrics.ffmLbs >= currentMetrics.ffmLbs ? 'text-green-600' : 'text-red-600'}`}>
                        ({targetMetrics.ffmLbs >= currentMetrics.ffmLbs ? '+' : ''}
                        {(targetMetrics.ffmLbs - currentMetrics.ffmLbs).toFixed(1)})
                      </span>
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FMI</span>
                    <Badge className={`text-[10px] ${getFMIBenchmark(targetMetrics.fmi).bgColor} ${getFMIBenchmark(targetMetrics.fmi).color}`}>
                      {targetMetrics.fmi}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FFMI</span>
                    <Badge className={`text-[10px] ${getFFMIBenchmark(targetMetrics.ffmi).bgColor} ${getFFMIBenchmark(targetMetrics.ffmi).color}`}>
                      {targetMetrics.ffmi}
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                {/* Partitioning Summary */}
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <div className="text-center mb-2">
                    <div className={`text-xl font-bold ${summary.isDeficit ? 'text-green-600' : 'text-blue-600'}`}>
                      {summary.isDeficit ? '' : '+'}{summary.totalWeightChange} lbs
                    </div>
                    <div className="text-[10px] text-muted-foreground">Total Weight Change</div>
                  </div>
                  
                  {/* Partitioning bar */}
                  <div className="h-5 rounded-full overflow-hidden flex mb-1">
                    <div className="bg-yellow-400" style={{ width: `${Math.abs(summary.pctFromFat)}%` }} />
                    <div className="bg-red-400" style={{ width: `${Math.abs(summary.pctFromFFM)}%` }} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-400 rounded" />
                      <span>Fat: {summary.totalFatChange} lbs ({summary.pctFromFat}%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-400 rounded" />
                      <span>FFM: {summary.totalFFMChange} lbs ({summary.pctFromFFM}%)</span>
                    </div>
                  </div>
                  
                  {includeWaterChanges && summary.expectedWaterChange !== 0 && (
                    <div className="mt-1 pt-1 border-t border-blue-200">
                      <div className="flex items-center gap-1 text-[10px] text-blue-700">
                        <Droplets className="h-3 w-3" />
                        <span>Water: {summary.expectedWaterChange > 0 ? '+' : ''}{summary.expectedWaterChange} lbs</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <div className="flex justify-between">
                    <span>Weekly rate:</span>
                    <span className="font-medium">{Math.abs(summary.weeklyWeightChange)} lbs/week</span>
                  </div>
                  <div className="flex justify-between">
                    <span>% of body weight:</span>
                    <span className="font-medium">{((Math.abs(summary.weeklyWeightChange) / currentWeight) * 100).toFixed(2)}%/week</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 4: Nutrition & Error */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-green-800">
                  <Zap className="h-4 w-4 inline mr-1" />
                  Daily Targets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{nutritionTargets.calories}</div>
                  <div className="text-xs text-green-700">
                    {summary.isDeficit ? `${Math.abs(nutritionTargets.deficit)} cal deficit` : `${nutritionTargets.deficit} cal surplus`}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center p-1.5 bg-red-50 rounded text-xs">
                    <span className="text-red-700">Protein</span>
                    <span className="font-bold text-red-600">{nutritionTargets.protein}g ({nutritionTargets.proteinPct}%)</span>
                  </div>
                  <div className="flex justify-between items-center p-1.5 bg-blue-50 rounded text-xs">
                    <span className="text-blue-700">Carbs</span>
                    <span className="font-bold text-blue-600">{nutritionTargets.carbs}g ({nutritionTargets.carbsPct}%)</span>
                  </div>
                  <div className="flex justify-between items-center p-1.5 bg-yellow-50 rounded text-xs">
                    <span className="text-yellow-700">Fat</span>
                    <span className="font-bold text-yellow-600">{nutritionTargets.fat}g ({nutritionTargets.fatPct}%)</span>
                  </div>
                </div>
                
                <Separator />
                
                {/* Measurement Error Settings */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 text-amber-500" />
                    Measurement Uncertainty
                  </Label>
                  
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Assessment Method</Label>
                    <Select value={measurementMethod} onValueChange={(v: any) => setMeasurementMethod(v)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MEASUREMENT_ERROR).map(([key, val]) => (
                          <SelectItem key={key} value={key} className="text-xs">{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px]">Show Confidence Interval</Label>
                    <Switch checked={showConfidenceInterval} onCheckedChange={setShowConfidenceInterval} />
                  </div>
                  
                  {showConfidenceInterval && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Confidence Level</Label>
                      <Select value={String(confidenceLevel)} onValueChange={(v) => setConfidenceLevel(Number(v))}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.90" className="text-xs">90% CI</SelectItem>
                          <SelectItem value="0.95" className="text-xs">95% CI</SelectItem>
                          <SelectItem value="0.99" className="text-xs">99% CI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* MDC Info */}
                  <div className="bg-amber-50 rounded p-2 border border-amber-200 text-[10px]">
                    <div className="font-medium text-amber-800 mb-1">Minimum Detectable Change ({Math.round(confidenceLevel * 100)}%)</div>
                    <div className="space-y-0.5 text-amber-700">
                      <div className="flex justify-between">
                        <span>Fat Mass:</span>
                        <span className="font-medium">±{summary.fatChangeMDC} lbs</span>
                      </div>
                      <div className="flex justify-between">
                        <span>FFM:</span>
                        <span className="font-medium">±{summary.ffmChangeMDC} lbs</span>
                      </div>
                    </div>
                    <Separator className="my-1" />
                    <div className="text-amber-600">
                      {summary.fatChangeExceedsMDC ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Fat change exceeds MDC
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Fat change within measurement error
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visualization Section - Full Width Below Cards */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-purple-500" />
                  Timeline Projection
                  {showConfidenceInterval && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {Math.round(confidenceLevel * 100)}% CI Shaded
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'graph' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('graph')}
                    className={`h-8 px-3 ${viewMode === 'graph' ? 'bg-[#00263d]' : ''}`}
                  >
                    <LineChart className="h-4 w-4 mr-1" />
                    Graph
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className={`h-8 px-3 ${viewMode === 'table' ? 'bg-[#00263d]' : ''}`}
                  >
                    <Table className="h-4 w-4 mr-1" />
                    Table
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'graph' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Weight Graph */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Weight (lbs)</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-blue-500" />
                          True Weight
                        </span>
                        {includeWaterChanges && (
                          <span className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-blue-300 opacity-50" style={{ borderStyle: 'dashed' }} />
                            Scale Weight
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-48 relative bg-slate-50 rounded-lg border p-2">
                      {(() => {
                        const { ciPathPoints, linePoints, minVal, maxVal } = generateGraphWithCI(
                          weeklyProjections, 'weight', 'weightCI', '#3b82f6', 180
                        );
                        return (
                          <svg className="w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="none">
                            {/* Grid lines */}
                            {[0.25, 0.5, 0.75].map((pct) => (
                              <line key={pct} x1="0" y1={180 * pct} x2="400" y2={180 * pct} stroke="#e5e7eb" strokeWidth="1" />
                            ))}
                            
                            {/* CI Shading */}
                            {showConfidenceInterval && (
                              <polygon
                                points={ciPathPoints}
                                fill="#3b82f6"
                                fillOpacity="0.15"
                                stroke="none"
                              />
                            )}
                            
                            {/* Main weight line */}
                            <polyline
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="2.5"
                              points={linePoints}
                            />
                            
                            {/* Scale weight line (with water) */}
                            {includeWaterChanges && (
                              <polyline
                                fill="none"
                                stroke="#93c5fd"
                                strokeWidth="1.5"
                                strokeDasharray="6,4"
                                points={weeklyProjections.map((p, i) => {
                                  const x = (i / (weeklyProjections.length - 1)) * 400;
                                  const range = maxVal - minVal || 1;
                                  const y = 10 + 160 - ((p.scaleWeight - minVal) / range) * 160;
                                  return `${x},${y}`;
                                }).join(' ')}
                              />
                            )}
                            
                            {/* Start/End markers */}
                            <circle cx="0" cy={10 + 160 - ((weeklyProjections[0].weight - minVal) / (maxVal - minVal || 1)) * 160} r="4" fill="#3b82f6" />
                            <circle cx="400" cy={10 + 160 - ((weeklyProjections[weeklyProjections.length - 1].weight - minVal) / (maxVal - minVal || 1)) * 160} r="4" fill="#3b82f6" />
                          </svg>
                        );
                      })()}
                      <div className="absolute top-2 left-2 text-xs text-muted-foreground">
                        {Math.max(...weeklyProjections.map(p => p.weight + p.weightCI)).toFixed(0)}
                      </div>
                      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                        {Math.min(...weeklyProjections.map(p => p.weight - p.weightCI)).toFixed(0)}
                      </div>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                        Weeks 0 → {totalWeeks}
                      </div>
                    </div>
                  </div>
                  
                  {/* Composition Graph */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Body Composition (lbs)</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-yellow-500 rounded" />
                          Fat Mass
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-500 rounded" />
                          FFM
                        </span>
                      </div>
                    </div>
                    <div className="h-48 relative bg-slate-50 rounded-lg border p-2">
                      {(() => {
                        const fatData = generateGraphWithCI(weeklyProjections, 'fatMass', 'fatMassCI', '#eab308', 180);
                        const ffmData = generateGraphWithCI(weeklyProjections, 'ffm', 'ffmCI', '#ef4444', 180);
                        
                        // Combined min/max for shared scale
                        const allVals = [
                          ...weeklyProjections.map(p => p.fatMass - p.fatMassCI),
                          ...weeklyProjections.map(p => p.fatMass + p.fatMassCI),
                          ...weeklyProjections.map(p => p.ffm - p.ffmCI),
                          ...weeklyProjections.map(p => p.ffm + p.ffmCI),
                        ];
                        const minVal = Math.min(...allVals);
                        const maxVal = Math.max(...allVals);
                        const range = maxVal - minVal || 1;
                        
                        const getY = (val: number) => 10 + 160 - ((val - minVal) / range) * 160;
                        const getX = (i: number) => (i / (weeklyProjections.length - 1)) * 400;
                        
                        // Build CI polygons
                        const fatCIPoints = [
                          ...weeklyProjections.map((p, i) => `${getX(i)},${getY(p.fatMass + p.fatMassCI)}`),
                          ...weeklyProjections.map((p, i) => `${getX(weeklyProjections.length - 1 - i)},${getY(weeklyProjections[weeklyProjections.length - 1 - i].fatMass - weeklyProjections[weeklyProjections.length - 1 - i].fatMassCI)}`),
                        ].join(' ');
                        
                        const ffmCIPoints = [
                          ...weeklyProjections.map((p, i) => `${getX(i)},${getY(p.ffm + p.ffmCI)}`),
                          ...weeklyProjections.map((p, i) => `${getX(weeklyProjections.length - 1 - i)},${getY(weeklyProjections[weeklyProjections.length - 1 - i].ffm - weeklyProjections[weeklyProjections.length - 1 - i].ffmCI)}`),
                        ].join(' ');
                        
                        return (
                          <svg className="w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="none">
                            {/* Grid */}
                            {[0.25, 0.5, 0.75].map((pct) => (
                              <line key={pct} x1="0" y1={180 * pct} x2="400" y2={180 * pct} stroke="#e5e7eb" strokeWidth="1" />
                            ))}
                            
                            {/* CI Shading */}
                            {showConfidenceInterval && (
                              <>
                                <polygon points={fatCIPoints} fill="#eab308" fillOpacity="0.15" />
                                <polygon points={ffmCIPoints} fill="#ef4444" fillOpacity="0.15" />
                              </>
                            )}
                            
                            {/* Fat Mass line */}
                            <polyline
                              fill="none"
                              stroke="#eab308"
                              strokeWidth="2.5"
                              points={weeklyProjections.map((p, i) => `${getX(i)},${getY(p.fatMass)}`).join(' ')}
                            />
                            
                            {/* FFM line */}
                            <polyline
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="2.5"
                              points={weeklyProjections.map((p, i) => `${getX(i)},${getY(p.ffm)}`).join(' ')}
                            />
                          </svg>
                        );
                      })()}
                      <div className="absolute top-2 left-2 text-xs text-muted-foreground">
                        {Math.max(...weeklyProjections.map(p => Math.max(p.fatMass + p.fatMassCI, p.ffm + p.ffmCI))).toFixed(0)}
                      </div>
                      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                        {Math.min(...weeklyProjections.map(p => Math.min(p.fatMass - p.fatMassCI, p.ffm - p.ffmCI))).toFixed(0)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Body Fat % Graph */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Body Fat %</span>
                    </div>
                    <div className="h-40 relative bg-slate-50 rounded-lg border p-2">
                      {(() => {
                        const { ciPathPoints, linePoints, minVal, maxVal } = generateGraphWithCI(
                          weeklyProjections, 'bodyFat', 'bodyFatCI', '#22c55e', 150
                        );
                        return (
                          <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                            {/* Grid */}
                            {[0.25, 0.5, 0.75].map((pct) => (
                              <line key={pct} x1="0" y1={150 * pct} x2="400" y2={150 * pct} stroke="#e5e7eb" strokeWidth="1" />
                            ))}
                            
                            {/* CI Shading */}
                            {showConfidenceInterval && (
                              <polygon points={ciPathPoints} fill="#22c55e" fillOpacity="0.15" />
                            )}
                            
                            {/* Line */}
                            <polyline fill="none" stroke="#22c55e" strokeWidth="2.5" points={linePoints} />
                            
                            {/* Markers */}
                            <circle cx="0" cy={10 + 130 - ((weeklyProjections[0].bodyFat - minVal) / (maxVal - minVal || 1)) * 130} r="4" fill="#22c55e" />
                            <circle cx="400" cy={10 + 130 - ((weeklyProjections[weeklyProjections.length - 1].bodyFat - minVal) / (maxVal - minVal || 1)) * 130} r="4" fill="#22c55e" />
                          </svg>
                        );
                      })()}
                      <div className="absolute top-2 left-2 text-xs text-muted-foreground">
                        {Math.max(...weeklyProjections.map(p => p.bodyFat + p.bodyFatCI)).toFixed(1)}%
                      </div>
                      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                        {Math.min(...weeklyProjections.map(p => p.bodyFat - p.bodyFatCI)).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary Stats Box */}
                  <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg p-4 border">
                    <h4 className="font-medium text-sm mb-3">Projection Summary</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Start → End</div>
                        <div className="text-sm font-medium">
                          {weeklyProjections[0].date.slice(5)} → {weeklyProjections[weeklyProjections.length - 1].date.slice(5)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Duration</div>
                        <div className="text-sm font-medium">{totalWeeks} weeks</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Final Weight</div>
                        <div className="text-sm font-medium">
                          {weeklyProjections[weeklyProjections.length - 1].weight} lbs
                          {showConfidenceInterval && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ±{weeklyProjections[weeklyProjections.length - 1].weightCI}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Final Body Fat</div>
                        <div className="text-sm font-medium">
                          {weeklyProjections[weeklyProjections.length - 1].bodyFat}%
                          {showConfidenceInterval && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ±{weeklyProjections[weeklyProjections.length - 1].bodyFatCI}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {showConfidenceInterval && (
                      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                        <Info className="h-3 w-3 inline mr-1" />
                        Shaded regions represent {Math.round(confidenceLevel * 100)}% confidence intervals accounting for 
                        measurement error (SEE) and model uncertainty propagation over time.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr>
                        <th className="text-left p-2 font-medium">Week</th>
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-right p-2 font-medium">Weight</th>
                        <th className="text-right p-2 font-medium">Fat Mass</th>
                        <th className="text-right p-2 font-medium">FFM</th>
                        <th className="text-right p-2 font-medium">BF%</th>
                        {includeWaterChanges && <th className="text-right p-2 font-medium">H₂O</th>}
                        {showConfidenceInterval && <th className="text-right p-2 font-medium">±CI</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyProjections.map((p, i) => (
                        <tr key={p.week} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
                          <td className="p-2">{p.week}</td>
                          <td className="p-2 text-muted-foreground">{p.date}</td>
                          <td className="p-2 text-right font-medium">{p.weight}</td>
                          <td className="p-2 text-right text-yellow-600">{p.fatMass}</td>
                          <td className="p-2 text-right text-red-600">{p.ffm}</td>
                          <td className="p-2 text-right text-green-600">{p.bodyFat}%</td>
                          {includeWaterChanges && (
                            <td className="p-2 text-right text-blue-600">{p.waterChange}</td>
                          )}
                          {showConfidenceInterval && (
                            <td className="p-2 text-right text-muted-foreground text-xs">
                              W: ±{p.weightCI}<br/>
                              FM: ±{p.fatMassCI}<br/>
                              FFM: ±{p.ffmCI}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Warnings */}
          {(targetMetrics.ffmi > 25 || targetMetrics.bodyFat < (gender === 'male' ? 6 : 14) || Math.abs(summary.pctFromFFM) > 30 || !summary.fatChangeExceedsMDC) && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-amber-800">Considerations</div>
                    <ul className="text-sm text-amber-700 mt-1 space-y-1">
                      {!summary.fatChangeExceedsMDC && (
                        <li>• Projected fat mass change ({Math.abs(summary.totalFatChange)} lbs) is within measurement error (MDC: ±{summary.fatChangeMDC} lbs). Consider a longer timeline or ensure standardized assessment conditions.</li>
                      )}
                      {targetMetrics.ffmi > 25 && (
                        <li>• FFMI &gt;25 is rare naturally - ensure realistic expectations</li>
                      )}
                      {targetMetrics.bodyFat < (gender === 'male' ? 6 : 14) && (
                        <li>• Very low body fat may impact hormones, performance, and health</li>
                      )}
                      {Math.abs(summary.pctFromFFM) > 30 && summary.isDeficit && (
                        <li>• High FFM loss predicted ({summary.pctFromFFM}%). Consider higher protein or slower rate.</li>
                      )}
                      {totalWeeks > 52 && (
                        <li>• Long timeline ({totalWeeks} weeks) - consider intermediate milestones</li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* References */}
          <div className="text-[10px] text-muted-foreground text-center space-y-1">
            <p><strong>Partitioning Models:</strong> Forbes GB (2000), Heymsfield SB et al. (2014), Longland TM et al. (2016), Kreitzman SN et al. (1992)</p>
            <p><strong>Measurement Error:</strong> Tinsley GM et al. (2021) "A Field-Based Three-Compartment Model" - MSSE</p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
