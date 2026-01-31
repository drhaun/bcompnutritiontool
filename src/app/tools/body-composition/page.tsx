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
 * Forbes Rule: Lean mass loss as a function of fat mass
 * Reference: Forbes GB. Body fat content influences the body composition response to nutrition and exercise. Ann N Y Acad Sci. 2000
 * 
 * The Forbes equation predicts the proportion of weight change from lean mass (P-ratio)
 * P = C / (C + FM) where C ≈ 10.4 kg for most individuals
 * 
 * This means leaner individuals lose proportionally more lean mass during energy deficit
 */
const FORBES_CONSTANT = 10.4; // kg - represents the "crossover" point

/**
 * Protein leverage effects on P-ratio
 * Reference: Heymsfield SB et al. Weight loss composition is one-fourth fat-free mass. Int J Obes. 2014
 * High protein (>1.6g/kg) can reduce lean mass loss by ~35-50%
 */
const PROTEIN_EFFECT = {
  low: { threshold: 1.0, multiplier: 1.3, label: 'Low (<1.0 g/kg)' },      // More muscle loss
  moderate: { threshold: 1.6, multiplier: 1.0, label: 'Moderate (1.0-1.6 g/kg)' }, // Baseline
  high: { threshold: 2.2, multiplier: 0.65, label: 'High (1.6-2.2 g/kg)' },    // Less muscle loss
  very_high: { threshold: 3.0, multiplier: 0.5, label: 'Very High (>2.2 g/kg)' }, // Minimal muscle loss
};

/**
 * Resistance training effects on P-ratio
 * Reference: Longland TM et al. Higher compared with lower dietary protein during an energy deficit combined with intense exercise promotes greater lean mass gain. Am J Clin Nutr. 2016
 */
const TRAINING_EFFECT = {
  none: { multiplier: 1.4, label: 'No resistance training' },
  light: { multiplier: 1.15, label: 'Light (1-2x/week)' },
  moderate: { multiplier: 0.85, label: 'Moderate (3-4x/week)' },
  intense: { multiplier: 0.6, label: 'Intense (5-6x/week, progressive)' },
};

/**
 * Energy deficit effects on P-ratio
 * Reference: Areta JL et al. Timing and distribution of protein ingestion during prolonged recovery from resistance exercise alters myofibrillar protein synthesis. J Physiol. 2013
 * Larger deficits increase protein oxidation and muscle loss
 */
const DEFICIT_EFFECT = {
  mild: { range: [0, 300], multiplier: 0.85, label: 'Mild (<300 kcal)' },
  moderate: { range: [300, 500], multiplier: 1.0, label: 'Moderate (300-500 kcal)' },
  aggressive: { range: [500, 750], multiplier: 1.2, label: 'Aggressive (500-750 kcal)' },
  severe: { range: [750, 2000], multiplier: 1.5, label: 'Severe (>750 kcal)' },
};

/**
 * Muscle gain partitioning during surplus
 * Reference: Slater GJ et al. Is an Energy Surplus Required to Maximize Skeletal Muscle Hypertrophy? Front Nutr. 2019
 * Trained individuals partition surplus better toward muscle
 */
const SURPLUS_PARTITIONING = {
  untrained: { muscleRatio: 0.3, label: 'Untrained' },  // 30% muscle, 70% fat
  novice: { muscleRatio: 0.45, label: 'Novice (0-1 year)' },
  intermediate: { muscleRatio: 0.55, label: 'Intermediate (1-3 years)' },
  advanced: { muscleRatio: 0.4, label: 'Advanced (3+ years)' },  // Harder to gain muscle
};

/**
 * Body water changes with glycogen
 * Reference: Kreitzman SN et al. Glycogen storage: illusions of easy weight loss. Am J Clin Nutr. 1992
 * Each gram of glycogen binds ~3g of water
 * Muscle glycogen capacity: ~400-500g, Liver: ~100g
 */
const GLYCOGEN_WATER_RATIO = 3; // grams water per gram glycogen
const MUSCLE_GLYCOGEN_CAPACITY = 450; // grams (varies with muscle mass)
const LIVER_GLYCOGEN_CAPACITY = 100; // grams

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

/**
 * Calculate P-ratio (proportion of weight change from lean mass) using Forbes equation
 * Modified by protein intake, resistance training, and deficit size
 */
function calculatePRatio(
  fatMassKg: number,
  proteinLevel: keyof typeof PROTEIN_EFFECT,
  trainingLevel: keyof typeof TRAINING_EFFECT,
  deficitLevel: keyof typeof DEFICIT_EFFECT,
  isDeficit: boolean
): number {
  // Base Forbes P-ratio: proportion from lean mass
  const basePRatio = FORBES_CONSTANT / (FORBES_CONSTANT + fatMassKg);
  
  if (!isDeficit) {
    // During surplus, P-ratio represents muscle gain proportion (inverted logic)
    return basePRatio;
  }
  
  // Apply modifiers for deficit
  const proteinMod = PROTEIN_EFFECT[proteinLevel].multiplier;
  const trainingMod = TRAINING_EFFECT[trainingLevel].multiplier;
  const deficitMod = DEFICIT_EFFECT[deficitLevel].multiplier;
  
  // Adjusted P-ratio (capped between 0.05 and 0.6)
  const adjustedPRatio = Math.max(0.05, Math.min(0.6, basePRatio * proteinMod * trainingMod * deficitMod));
  
  return adjustedPRatio;
}

/**
 * Calculate water weight changes based on glycogen depletion/repletion
 */
function calculateWaterChange(
  glycogenChangeG: number,
  weekNumber: number,
  isDeficit: boolean
): number {
  // First 1-2 weeks have rapid water loss from glycogen
  const weeklyGlycogenLoss = isDeficit 
    ? weekNumber <= 2 ? 150 : 30  // Rapid initial, then gradual
    : weekNumber <= 2 ? -100 : -20; // Rapid initial refill
  
  const effectiveGlycogenChange = Math.max(-MUSCLE_GLYCOGEN_CAPACITY - LIVER_GLYCOGEN_CAPACITY, 
    Math.min(0, glycogenChangeG + weeklyGlycogenLoss * weekNumber));
  
  return effectiveGlycogenChange * GLYCOGEN_WATER_RATIO / 1000; // Convert to kg
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Add weeks to date
 */
function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

/**
 * Calculate weeks between dates
 */
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
  
  // View settings
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  
  // Calculated values
  const heightCm = useMemo(() => (heightFt * 12 + heightIn) * 2.54, [heightFt, heightIn]);
  const heightM = heightCm / 100;
  const weightKg = currentWeight * 0.453592;
  
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
        // Will be calculated with partitioning model
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
    return 16; // Default
  }, [startDate, endDate, useDateRange]);
  
  // Weekly projections with evidence-based partitioning
  const weeklyProjections = useMemo(() => {
    const projections: Array<{
      week: number;
      date: string;
      weight: number;
      fatMass: number;
      ffm: number;
      bodyFat: number;
      waterChange: number;
      scaleWeight: number; // Includes water
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
    
    for (let week = 0; week <= totalWeeks; week++) {
      const date = addWeeks(new Date(startDate), week);
      
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
        });
        continue;
      }
      
      // Calculate P-ratio for this week (changes as fat mass changes)
      const currentFatMassKg = currentFatMass * 0.453592;
      const pRatio = calculatePRatio(currentFatMassKg, proteinLevel, trainingLevel, deficitLevel, isDeficit);
      
      // Apply weight change with evidence-based partitioning
      if (isDeficit) {
        // Weight loss: pRatio is proportion from lean mass
        const leanLoss = Math.abs(weeklyWeightChange) * pRatio;
        const fatLoss = Math.abs(weeklyWeightChange) * (1 - pRatio);
        currentFfm -= leanLoss;
        currentFatMass -= fatLoss;
      } else {
        // Weight gain: use training experience partitioning
        const muscleRatio = SURPLUS_PARTITIONING[trainingExperience].muscleRatio;
        const muscleGain = weeklyWeightChange * muscleRatio;
        const fatGain = weeklyWeightChange * (1 - muscleRatio);
        currentFfm += muscleGain;
        currentFatMass += fatGain;
      }
      
      currentWt = currentFfm + currentFatMass;
      
      // Water changes (glycogen)
      let waterChange = 0;
      if (includeWaterChanges) {
        // Glycogen depletion/repletion affects water
        const weeklyGlycogenChange = isDeficit 
          ? (week <= 2 ? -150 : -20) // Rapid initial loss
          : (week <= 2 ? 100 : 10);  // Gradual refill
        cumulativeGlycogenChange += weeklyGlycogenChange;
        cumulativeGlycogenChange = Math.max(-(MUSCLE_GLYCOGEN_CAPACITY + LIVER_GLYCOGEN_CAPACITY), 
          Math.min(0, cumulativeGlycogenChange));
        waterChange = (cumulativeGlycogenChange * GLYCOGEN_WATER_RATIO) / 453.592; // Convert g to lbs
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
      });
    }
    
    return projections;
  }, [currentWeight, currentMetrics, targetMetrics, totalWeeks, startDate, proteinLevel, trainingLevel, trainingExperience, includeWaterChanges]);
  
  // Summary stats
  const summary = useMemo(() => {
    const final = weeklyProjections[weeklyProjections.length - 1];
    const initial = weeklyProjections[0];
    
    return {
      totalWeightChange: Math.round((final.weight - initial.weight) * 10) / 10,
      totalFatChange: Math.round((final.fatMass - initial.fatMass) * 10) / 10,
      totalFFMChange: Math.round((final.ffm - initial.ffm) * 10) / 10,
      weeklyWeightChange: Math.round((final.weight - initial.weight) / totalWeeks * 100) / 100,
      isDeficit: final.weight < initial.weight,
      pctFromFat: Math.round(Math.abs((final.fatMass - initial.fatMass) / (final.weight - initial.weight)) * 100),
      pctFromFFM: Math.round(Math.abs((final.ffm - initial.ffm) / (final.weight - initial.weight)) * 100),
      finalBodyFat: final.bodyFat,
      expectedWaterChange: final.waterChange,
    };
  }, [weeklyProjections, totalWeeks]);
  
  // Calorie and macro targets
  const nutritionTargets = useMemo(() => {
    const dailyDeficit = (summary.weeklyWeightChange * 3500) / 7;
    const targetCals = Math.round(tdee + dailyDeficit);
    
    // Protein based on selected level
    const proteinGPerKg = proteinLevel === 'very_high' ? 2.4 : 
                          proteinLevel === 'high' ? 1.8 :
                          proteinLevel === 'moderate' ? 1.4 : 1.0;
    const proteinG = Math.round(weightKg * proteinGPerKg);
    const proteinCal = proteinG * 4;
    
    // Fat: 25-30%
    const fatPct = summary.isDeficit ? 0.25 : 0.30;
    const fatCal = targetCals * fatPct;
    const fatG = Math.round(fatCal / 9);
    
    // Carbs: remainder
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

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#00263d] mb-2">
              Body Composition Calculator
            </h1>
            <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
              Evidence-based body composition planning with Forbes partitioning model, 
              protein leverage effects, and resistance training modifiers.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-6">
            {/* Column 1: Current Stats */}
            <div className="space-y-4">
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
                </CardContent>
              </Card>

              {/* Metabolism */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Metabolism
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label className="text-xs">RMR</Label>
                      <Select value={rmrSource} onValueChange={(v: any) => setRmrSource(v)}>
                        <SelectTrigger className="h-6 w-24 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="estimated">Estimated</SelectItem>
                          <SelectItem value="measured">Measured</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {rmrSource === 'measured' ? (
                      <Input type="number" value={measuredRmr} onChange={(e) => setMeasuredRmr(Number(e.target.value))} className="h-8 text-sm" />
                    ) : (
                      <div className="h-8 px-2 py-1.5 bg-slate-100 rounded text-sm">{estimatedRmr} kcal</div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-xs">NEAT Level</Label>
                    <Select value={neatLevel} onValueChange={(v: any) => setNeatLevel(v)}>
                      <SelectTrigger className="h-8 text-sm">
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
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">TEF %</Label>
                      <Input type="number" value={tef} onChange={(e) => setTef(Number(e.target.value))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">EEE</Label>
                      <Input type="number" value={eee} onChange={(e) => setEee(Number(e.target.value))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Days/wk</Label>
                      <Input type="number" value={workoutsPerWeek} onChange={(e) => setWorkoutsPerWeek(Number(e.target.value))} className="h-8 text-sm" min={0} max={7} />
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-orange-800">TDEE</span>
                      <span className="text-lg font-bold text-orange-600">{tdee} kcal</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 2: Goal & Parameters */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-[#00263d]" />
                    Goal Setting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs mb-2 block">Goal Type</Label>
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
                  
                  <Separator />
                  
                  {/* Goal-specific input */}
                  {goalType === 'body_fat' && (
                    <div>
                      <Label className="text-xs">Target Body Fat %</Label>
                      <div className="flex gap-2 items-center">
                        <Slider value={[targetBodyFat]} onValueChange={([v]) => setTargetBodyFat(v)} min={5} max={35} step={0.5} className="flex-1" />
                        <Input type="number" value={targetBodyFat} onChange={(e) => setTargetBodyFat(Number(e.target.value))} className="h-8 w-16 text-sm" />
                      </div>
                    </div>
                  )}
                  
                  {goalType === 'weight' && (
                    <div>
                      <Label className="text-xs">Target Weight (lbs)</Label>
                      <Input type="number" value={targetWeight} onChange={(e) => setTargetWeight(Number(e.target.value))} className="h-8 text-sm" />
                    </div>
                  )}
                  
                  {goalType === 'fat_mass' && (
                    <div>
                      <Label className="text-xs">Target Fat Mass (lbs)</Label>
                      <Input type="number" value={targetFatMass} onChange={(e) => setTargetFatMass(Number(e.target.value))} className="h-8 text-sm" />
                      <p className="text-[10px] text-muted-foreground mt-1">Current: {currentMetrics.fatMassLbs} lbs</p>
                    </div>
                  )}
                  
                  {goalType === 'ffm' && (
                    <div>
                      <Label className="text-xs">Target Fat-Free Mass (lbs)</Label>
                      <Input type="number" value={targetFFM} onChange={(e) => setTargetFFM(Number(e.target.value))} className="h-8 text-sm" />
                      <p className="text-[10px] text-muted-foreground mt-1">Current: {currentMetrics.ffmLbs} lbs</p>
                    </div>
                  )}
                  
                  {goalType === 'ffmi' && (
                    <div>
                      <Label className="text-xs">Target FFMI</Label>
                      <div className="flex gap-2 items-center">
                        <Slider value={[targetFFMI]} onValueChange={([v]) => setTargetFFMI(v)} min={16} max={28} step={0.5} className="flex-1" />
                        <Input type="number" value={targetFFMI} onChange={(e) => setTargetFFMI(Number(e.target.value))} className="h-8 w-16 text-sm" />
                      </div>
                    </div>
                  )}
                  
                  {goalType === 'fmi' && (
                    <div>
                      <Label className="text-xs">Target FMI</Label>
                      <div className="flex gap-2 items-center">
                        <Slider value={[targetFMI]} onValueChange={([v]) => setTargetFMI(v)} min={2} max={15} step={0.5} className="flex-1" />
                        <Input type="number" value={targetFMI} onChange={(e) => setTargetFMI(Number(e.target.value))} className="h-8 w-16 text-sm" />
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Date Range */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs">Timeline</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Use dates</span>
                        <Switch checked={useDateRange} onCheckedChange={setUseDateRange} />
                      </div>
                    </div>
                    {useDateRange && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Start</Label>
                          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">End</Label>
                          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs" />
                        </div>
                      </div>
                    )}
                    <div className="mt-2 text-center">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {totalWeeks} weeks
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Evidence-Based Parameters */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings2 className="h-4 w-4 text-purple-500" />
                    Partitioning Parameters
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Evidence-based factors affecting body composition change
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      Protein Intake
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">Higher protein preserves lean mass during deficit. Based on Heymsfield et al. research.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select value={proteinLevel} onValueChange={(v: any) => setProteinLevel(v)}>
                      <SelectTrigger className="h-8 text-xs">
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
                    <Label className="text-xs flex items-center gap-1">
                      Resistance Training
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">Progressive resistance training significantly reduces muscle loss. Based on Longland et al. research.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select value={trainingLevel} onValueChange={(v: any) => setTrainingLevel(v)}>
                      <SelectTrigger className="h-8 text-xs">
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
                      <Label className="text-xs flex items-center gap-1">
                        Training Experience
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Affects muscle:fat ratio during weight gain. Novices gain muscle more easily.</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select value={trainingExperience} onValueChange={(v: any) => setTrainingExperience(v)}>
                        <SelectTrigger className="h-8 text-xs">
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
                    <Label className="text-xs flex items-center gap-1">
                      Include Water Changes
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">Models glycogen-bound water loss/gain. ~3g water per 1g glycogen. Based on Kreitzman et al.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Switch checked={includeWaterChanges} onCheckedChange={setIncludeWaterChanges} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 3: Results Summary */}
            <div className="space-y-4">
              {/* Target Composition */}
              <Card className="border-[#c19962] border-2">
                <CardHeader className="pb-2 bg-[#c19962]/10">
                  <CardTitle className="text-base text-[#00263d]">Target Composition</CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded p-2 text-center">
                      <div className="text-xl font-bold text-[#00263d]">{targetMetrics.weightLbs}</div>
                      <div className="text-[10px] text-muted-foreground">Weight (lbs)</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2 text-center">
                      <div className="text-xl font-bold text-[#00263d]">{targetMetrics.bodyFat}%</div>
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
                        {targetMetrics.fmi} - {getFMIBenchmark(targetMetrics.fmi).label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FFMI</span>
                      <Badge className={`text-[10px] ${getFFMIBenchmark(targetMetrics.ffmi).bgColor} ${getFFMIBenchmark(targetMetrics.ffmi).color}`}>
                        {targetMetrics.ffmi} - {getFFMIBenchmark(targetMetrics.ffmi).label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Partitioning Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Composition Change
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="text-center mb-2">
                      <div className={`text-2xl font-bold ${summary.isDeficit ? 'text-green-600' : 'text-blue-600'}`}>
                        {summary.isDeficit ? '' : '+'}{summary.totalWeightChange} lbs
                      </div>
                      <div className="text-xs text-muted-foreground">Total Weight Change</div>
                    </div>
                    
                    {/* Partitioning bar */}
                    <div className="h-6 rounded-full overflow-hidden flex mb-2">
                      <div className="bg-yellow-400" style={{ width: `${Math.abs(summary.pctFromFat)}%` }} />
                      <div className="bg-red-400" style={{ width: `${Math.abs(summary.pctFromFFM)}%` }} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-400 rounded" />
                        <span>Fat: {summary.totalFatChange} lbs ({summary.pctFromFat}%)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-400 rounded" />
                        <span>FFM: {summary.totalFFMChange} lbs ({summary.pctFromFFM}%)</span>
                      </div>
                    </div>
                    
                    {includeWaterChanges && summary.expectedWaterChange !== 0 && (
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        <div className="flex items-center gap-1 text-xs text-blue-700">
                          <Droplets className="h-3 w-3" />
                          <span>Expected water change: {summary.expectedWaterChange > 0 ? '+' : ''}{summary.expectedWaterChange} lbs</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
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

              {/* Nutrition Targets */}
              <Card className="border-green-300 border-2">
                <CardHeader className="pb-2 bg-green-50">
                  <CardTitle className="text-base text-green-800">
                    <Zap className="h-4 w-4 inline mr-1" />
                    Daily Targets
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="text-center mb-3">
                    <div className="text-3xl font-bold text-green-600">{nutritionTargets.calories}</div>
                    <div className="text-xs text-green-700">
                      {summary.isDeficit ? `${Math.abs(nutritionTargets.deficit)} cal deficit` : `${nutritionTargets.deficit} cal surplus`}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded text-xs">
                      <span className="text-red-700">Protein</span>
                      <span className="font-bold text-red-600">{nutritionTargets.protein}g ({nutritionTargets.proteinPct}%)</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded text-xs">
                      <span className="text-blue-700">Carbs</span>
                      <span className="font-bold text-blue-600">{nutritionTargets.carbs}g ({nutritionTargets.carbsPct}%)</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-yellow-50 rounded text-xs">
                      <span className="text-yellow-700">Fat</span>
                      <span className="font-bold text-yellow-600">{nutritionTargets.fat}g ({nutritionTargets.fatPct}%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 4: Timeline Visualization */}
            <div className="space-y-4">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-purple-500" />
                      Timeline Projection
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant={viewMode === 'graph' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('graph')}
                        className="h-6 px-2 text-xs"
                      >
                        <LineChart className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={viewMode === 'table' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className="h-6 px-2 text-xs"
                      >
                        <Table className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {viewMode === 'graph' ? (
                    <div className="space-y-4">
                      {/* Weight Graph */}
                      <div>
                        <div className="text-xs font-medium mb-1">Weight (lbs)</div>
                        <div className="h-32 relative bg-slate-50 rounded border">
                          <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                            {/* Grid lines */}
                            <line x1="0" y1="30" x2="400" y2="30" stroke="#e5e7eb" strokeWidth="1" />
                            <line x1="0" y1="60" x2="400" y2="60" stroke="#e5e7eb" strokeWidth="1" />
                            <line x1="0" y1="90" x2="400" y2="90" stroke="#e5e7eb" strokeWidth="1" />
                            
                            {/* Weight line */}
                            <polyline
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="2"
                              points={weeklyProjections.map((p, i) => {
                                const x = (i / (weeklyProjections.length - 1)) * 400;
                                const minW = Math.min(...weeklyProjections.map(p => p.weight));
                                const maxW = Math.max(...weeklyProjections.map(p => p.weight));
                                const range = maxW - minW || 1;
                                const y = 110 - ((p.weight - minW) / range) * 100;
                                return `${x},${y}`;
                              }).join(' ')}
                            />
                            
                            {/* Scale weight line (with water) */}
                            {includeWaterChanges && (
                              <polyline
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="1"
                                strokeDasharray="4,4"
                                opacity="0.5"
                                points={weeklyProjections.map((p, i) => {
                                  const x = (i / (weeklyProjections.length - 1)) * 400;
                                  const minW = Math.min(...weeklyProjections.map(p => p.scaleWeight));
                                  const maxW = Math.max(...weeklyProjections.map(p => p.scaleWeight));
                                  const range = maxW - minW || 1;
                                  const y = 110 - ((p.scaleWeight - minW) / range) * 100;
                                  return `${x},${y}`;
                                }).join(' ')}
                              />
                            )}
                          </svg>
                          <div className="absolute top-1 left-1 text-[10px] text-muted-foreground">
                            {Math.max(...weeklyProjections.map(p => p.weight))}
                          </div>
                          <div className="absolute bottom-1 left-1 text-[10px] text-muted-foreground">
                            {Math.min(...weeklyProjections.map(p => p.weight))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Composition Graph */}
                      <div>
                        <div className="text-xs font-medium mb-1">Composition (lbs)</div>
                        <div className="h-32 relative bg-slate-50 rounded border">
                          <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                            {/* Fat Mass */}
                            <polyline
                              fill="none"
                              stroke="#eab308"
                              strokeWidth="2"
                              points={weeklyProjections.map((p, i) => {
                                const x = (i / (weeklyProjections.length - 1)) * 400;
                                const minF = Math.min(...weeklyProjections.map(p => p.fatMass));
                                const maxF = Math.max(...weeklyProjections.map(p => p.fatMass));
                                const range = maxF - minF || 1;
                                const y = 110 - ((p.fatMass - minF) / range) * 100;
                                return `${x},${y}`;
                              }).join(' ')}
                            />
                            
                            {/* FFM */}
                            <polyline
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="2"
                              points={weeklyProjections.map((p, i) => {
                                const x = (i / (weeklyProjections.length - 1)) * 400;
                                const minF = Math.min(...weeklyProjections.map(p => p.ffm));
                                const maxF = Math.max(...weeklyProjections.map(p => p.ffm));
                                const range = maxF - minF || 1;
                                const y = 110 - ((p.ffm - minF) / range) * 100;
                                return `${x},${y}`;
                              }).join(' ')}
                            />
                          </svg>
                          <div className="absolute top-1 right-1 text-[10px] flex gap-2">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded" />FM</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded" />FFM</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Body Fat % Graph */}
                      <div>
                        <div className="text-xs font-medium mb-1">Body Fat %</div>
                        <div className="h-24 relative bg-slate-50 rounded border">
                          <svg className="w-full h-full" viewBox="0 0 400 90" preserveAspectRatio="none">
                            <polyline
                              fill="none"
                              stroke="#22c55e"
                              strokeWidth="2"
                              points={weeklyProjections.map((p, i) => {
                                const x = (i / (weeklyProjections.length - 1)) * 400;
                                const minBf = Math.min(...weeklyProjections.map(p => p.bodyFat));
                                const maxBf = Math.max(...weeklyProjections.map(p => p.bodyFat));
                                const range = maxBf - minBf || 1;
                                const y = 80 - ((p.bodyFat - minBf) / range) * 70;
                                return `${x},${y}`;
                              }).join(' ')}
                            />
                          </svg>
                          <div className="absolute top-1 left-1 text-[10px] text-muted-foreground">
                            {Math.max(...weeklyProjections.map(p => p.bodyFat)).toFixed(1)}%
                          </div>
                          <div className="absolute bottom-1 left-1 text-[10px] text-muted-foreground">
                            {Math.min(...weeklyProjections.map(p => p.bodyFat)).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b">
                            <th className="text-left p-1">Wk</th>
                            <th className="text-left p-1">Date</th>
                            <th className="text-right p-1">Weight</th>
                            <th className="text-right p-1">FM</th>
                            <th className="text-right p-1">FFM</th>
                            <th className="text-right p-1">BF%</th>
                            {includeWaterChanges && <th className="text-right p-1">H₂O</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {weeklyProjections.map((p, i) => (
                            <tr key={p.week} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
                              <td className="p-1">{p.week}</td>
                              <td className="p-1">{p.date.slice(5)}</td>
                              <td className="p-1 text-right font-medium">{p.weight}</td>
                              <td className="p-1 text-right text-yellow-600">{p.fatMass}</td>
                              <td className="p-1 text-right text-red-600">{p.ffm}</td>
                              <td className="p-1 text-right text-green-600">{p.bodyFat}%</td>
                              {includeWaterChanges && (
                                <td className="p-1 text-right text-blue-600">{p.waterChange}</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Warnings */}
          {(targetMetrics.ffmi > 25 || targetMetrics.bodyFat < (gender === 'male' ? 6 : 14) || Math.abs(summary.pctFromFFM) > 30) && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-amber-800">Considerations</div>
                    <ul className="text-sm text-amber-700 mt-1 space-y-1">
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
          <div className="text-[10px] text-muted-foreground text-center">
            <p>Models based on: Forbes GB (2000), Heymsfield SB et al. (2014), Longland TM et al. (2016), Kreitzman SN et al. (1992)</p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
