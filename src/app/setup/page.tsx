'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ProgressSteps } from '@/components/layout/progress-steps';
import { ProgressSummary } from '@/components/layout/progress-summary';
import { useFitomicsStore } from '@/lib/store';
import { toast } from 'sonner';
import { 
  ArrowRight, 
  User, 
  Target, 
  Calculator,
  Scale,
  Dumbbell,
  Activity,
  Heart,
  Brain,
  Zap,
  HelpCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import type { PerformancePriority, MusclePreservation, FatGainTolerance, LifestyleCommitment, TrackingCommitment } from '@/types';

// ============ TYPES ============

type RMREquation = 'mifflin' | 'harris' | 'cunningham';

interface BodyCompMetrics {
  fatMassKg: number;
  fatMassLbs: number;
  ffmKg: number;
  ffmLbs: number;
  fmi: number;
  ffmi: number;
  fmiCategory: string;
  ffmiCategory: string;
}

// ============ CONSTANTS ============

const FMI_CATEGORIES = {
  Male: [
    { max: 3, label: 'Extremely Lean', color: 'bg-blue-100 text-blue-800' },
    { max: 4, label: 'Lean', color: 'bg-green-100 text-green-800' },
    { max: 6, label: 'Considered Healthy', color: 'bg-emerald-100 text-emerald-800' },
    { max: 7, label: 'Slightly Overfat', color: 'bg-yellow-100 text-yellow-800' },
    { max: 9, label: 'Overfat', color: 'bg-orange-100 text-orange-800' },
    { max: Infinity, label: 'Significantly Overfat', color: 'bg-red-100 text-red-800' },
  ],
  Female: [
    { max: 5, label: 'Extremely Lean', color: 'bg-blue-100 text-blue-800' },
    { max: 6, label: 'Lean', color: 'bg-green-100 text-green-800' },
    { max: 9, label: 'Considered Healthy', color: 'bg-emerald-100 text-emerald-800' },
    { max: 10, label: 'Slightly Overfat', color: 'bg-yellow-100 text-yellow-800' },
    { max: 13, label: 'Overfat', color: 'bg-orange-100 text-orange-800' },
    { max: Infinity, label: 'Significantly Overfat', color: 'bg-red-100 text-red-800' },
  ],
};

const FFMI_CATEGORIES = {
  Male: [
    { max: 17, label: 'Undermuscled', color: 'bg-red-100 text-red-800' },
    { max: 18, label: 'Moderately Undermuscled', color: 'bg-orange-100 text-orange-800' },
    { max: 20, label: 'Considered Healthy', color: 'bg-emerald-100 text-emerald-800' },
    { max: 22, label: 'Muscular', color: 'bg-blue-100 text-blue-800' },
    { max: Infinity, label: 'Highly Muscular', color: 'bg-purple-100 text-purple-800' },
  ],
  Female: [
    { max: 14, label: 'Undermuscled', color: 'bg-red-100 text-red-800' },
    { max: 15, label: 'Moderately Undermuscled', color: 'bg-orange-100 text-orange-800' },
    { max: 17, label: 'Considered Healthy', color: 'bg-emerald-100 text-emerald-800' },
    { max: 18, label: 'Muscular', color: 'bg-blue-100 text-blue-800' },
    { max: Infinity, label: 'Highly Muscular', color: 'bg-purple-100 text-purple-800' },
  ],
};

const RMR_EQUATIONS: { value: RMREquation; label: string; description: string; formula: string }[] = [
  { 
    value: 'mifflin', 
    label: 'Mifflin-St Jeor', 
    description: 'Most validated for modern populations. Recommended default.',
    formula: 'Men: 10×weight(kg) + 6.25×height(cm) − 5×age + 5\nWomen: 10×weight(kg) + 6.25×height(cm) − 5×age − 161'
  },
  { 
    value: 'harris', 
    label: 'Harris-Benedict (Revised)', 
    description: 'Classic equation, may overestimate slightly.',
    formula: 'Men: 88.362 + 13.397×weight(kg) + 4.799×height(cm) − 5.677×age\nWomen: 447.593 + 9.247×weight(kg) + 3.098×height(cm) − 4.330×age'
  },
  { 
    value: 'cunningham', 
    label: 'Cunningham', 
    description: 'Based on lean body mass. Best for athletic populations.',
    formula: 'RMR = 500 + 22 × Lean Body Mass (kg)'
  },
];

// Rate of change options by goal type
const FAT_LOSS_RATES = [
  { value: 0.25, label: 'Gradual', description: '0.25% body weight/week', lbsPerWeek: 0.5 },
  { value: 0.5, label: 'Moderate', description: '0.5% body weight/week', lbsPerWeek: 1 },
  { value: 0.75, label: 'Aggressive', description: '0.75% body weight/week', lbsPerWeek: 1.5 },
  { value: 1.0, label: 'Very Aggressive', description: '1% body weight/week', lbsPerWeek: 2 },
];

const MUSCLE_GAIN_RATES = [
  { value: 0.12, label: 'Gradual', description: '0.12% body weight/week', lbsPerWeek: 0.25 },
  { value: 0.25, label: 'Moderate', description: '0.25% body weight/week', lbsPerWeek: 0.5 },
  { value: 0.5, label: 'Aggressive', description: '0.5% body weight/week', lbsPerWeek: 1 },
  { value: 0.75, label: 'Very Aggressive', description: '0.75% body weight/week', lbsPerWeek: 1.5 },
];

const MAINTENANCE_RATES = [
  { value: 0, label: 'Pure Maintenance', description: '0% change/week', lbsPerWeek: 0 },
  { value: -0.1, label: 'Slight Deficit', description: '0.1% deficit/week', lbsPerWeek: -0.2 },
  { value: 0.1, label: 'Slight Surplus', description: '0.1% surplus/week', lbsPerWeek: 0.2 },
];

// ============ CALCULATION FUNCTIONS ============

function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

function heightToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function calculateMifflinRMR(gender: 'Male' | 'Female', weightKg: number, heightCm: number, age: number): number {
  if (gender === 'Male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

function calculateHarrisRMR(gender: 'Male' | 'Female', weightKg: number, heightCm: number, age: number): number {
  if (gender === 'Male') {
    return 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
  }
  return 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.330 * age;
}

function calculateCunninghamRMR(leanMassKg: number): number {
  return 500 + 22 * leanMassKg;
}

function getFMICategory(fmi: number, gender: 'Male' | 'Female'): { label: string; color: string } {
  const categories = FMI_CATEGORIES[gender];
  for (const cat of categories) {
    if (fmi < cat.max) {
      return { label: cat.label, color: cat.color };
    }
  }
  return categories[categories.length - 1];
}

function getFFMICategory(ffmi: number, gender: 'Male' | 'Female'): { label: string; color: string } {
  const categories = FFMI_CATEGORIES[gender];
  for (const cat of categories) {
    if (ffmi < cat.max) {
      return { label: cat.label, color: cat.color };
    }
  }
  return categories[categories.length - 1];
}

function calculateBodyComp(weightKg: number, heightCm: number, bodyFatPct: number, gender: 'Male' | 'Female'): BodyCompMetrics {
  const heightM = heightCm / 100;
  const fatMassKg = weightKg * (bodyFatPct / 100);
  const ffmKg = weightKg - fatMassKg;
  const fmi = fatMassKg / (heightM * heightM);
  const ffmi = ffmKg / (heightM * heightM);
  
  const fmiCat = getFMICategory(fmi, gender);
  const ffmiCat = getFFMICategory(ffmi, gender);
  
  return {
    fatMassKg,
    fatMassLbs: kgToLbs(fatMassKg),
    ffmKg,
    ffmLbs: kgToLbs(ffmKg),
    fmi,
    ffmi,
    fmiCategory: fmiCat.label,
    ffmiCategory: ffmiCat.label,
  };
}

// ============ COMPONENT ============

export default function SetupPage() {
  const router = useRouter();
  const { 
    userProfile, 
    bodyCompGoals, 
    setUserProfile, 
    setBodyCompGoals,
    activeClientId,
    getActiveClient
  } = useFitomicsStore();
  
  // Handle hydration mismatch - wait for client-side store to be ready
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const activeClient = isHydrated ? getActiveClient() : null;
  
  // ============ BASIC INFO STATE ============
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [useDOB, setUseDOB] = useState(false);
  const [dob, setDob] = useState('');
  const [age, setAge] = useState(30);
  const [heightFt, setHeightFt] = useState(5);
  const [heightIn, setHeightIn] = useState(10);
  const [weightLbs, setWeightLbs] = useState(180);
  
  // Sync state with store after hydration
  useEffect(() => {
    if (isHydrated) {
      setName(userProfile.name || activeClient?.name || '');
      setGender(userProfile.gender || 'Male');
      setAge(userProfile.age || 30);
      setHeightFt(userProfile.heightFt || 5);
      setHeightIn(userProfile.heightIn || 10);
      setWeightLbs(userProfile.weightLbs || 180);
      setMeasuredBFPercent(userProfile.bodyFatPercentage || 20);
      setEstimatedBFPercent(userProfile.bodyFatPercentage || 20);
      setPerformancePriority(bodyCompGoals.performancePriority || 'body_comp_priority');
      setMusclePreservation(bodyCompGoals.musclePreservation || 'preserve_all');
      setFatGainTolerance(bodyCompGoals.fatGainTolerance || 'minimize_fat_gain');
      setLifestyleCommitment(bodyCompGoals.lifestyleCommitment || 'fully_committed');
      setTrackingCommitment(bodyCompGoals.trackingCommitment || 'committed_tracking');
      setGoalType(bodyCompGoals.goalType || 'lose_fat');
      
      // Restore target composition if previously saved
      if (bodyCompGoals.targetFatMassLbs) {
        setTargetFatMassLbs(bodyCompGoals.targetFatMassLbs);
      }
      if (bodyCompGoals.targetFFMLbs) {
        setTargetFFMLbs(bodyCompGoals.targetFFMLbs);
      }
      if (bodyCompGoals.startDate) {
        setStartDate(bodyCompGoals.startDate);
      }
    }
  }, [isHydrated, userProfile, bodyCompGoals, activeClient]);

  // ============ BODY COMPOSITION STATE ============
  const [useMeasuredBF, setUseMeasuredBF] = useState(false);
  const [measuredBFPercent, setMeasuredBFPercent] = useState(20);
  const [estimatedBFPercent, setEstimatedBFPercent] = useState(20);
  
  // ============ METABOLIC STATE ============
  const [useMeasuredRMR, setUseMeasuredRMR] = useState(false);
  const [measuredRMR, setMeasuredRMR] = useState(1800);
  const [selectedEquations, setSelectedEquations] = useState<RMREquation[]>(['mifflin']);
  const [useAverageRMR, setUseAverageRMR] = useState(false);

  // ============ CLIENT CONTEXT STATE ============
  const [performancePriority, setPerformancePriority] = useState<PerformancePriority>('body_comp_priority');
  const [musclePreservation, setMusclePreservation] = useState<MusclePreservation>('preserve_all');
  const [fatGainTolerance, setFatGainTolerance] = useState<FatGainTolerance>('minimize_fat_gain');
  const [lifestyleCommitment, setLifestyleCommitment] = useState<LifestyleCommitment>('fully_committed');
  const [trackingCommitment, setTrackingCommitment] = useState<TrackingCommitment>('committed_tracking');
  const [healthGoals, setHealthGoals] = useState('');
  const [performanceGoals, setPerformanceGoals] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // ============ GOAL STATE ============
  const [goalType, setGoalType] = useState<'lose_fat' | 'gain_muscle' | 'maintain' | 'performance'>('lose_fat');
  
  // ============ TARGET COMPOSITION STATE ============
  // Target approach - how the user wants to set their targets
  type TargetApproach = 'body_fat_percent' | 'fmi' | 'ffmi' | 'fat_mass' | 'ffm' | 'custom';
  const [targetApproach, setTargetApproach] = useState<TargetApproach>('body_fat_percent');
  
  // Core target values - these drive all calculations
  const [targetFatMassLbs, setTargetFatMassLbs] = useState(30);
  const [targetFFMLbs, setTargetFFMLbs] = useState(150);
  
  // Derived target values (calculated from fat mass + FFM)
  const targetWeightLbs = targetFatMassLbs + targetFFMLbs;
  const targetBodyFatPercent = targetWeightLbs > 0 ? (targetFatMassLbs / targetWeightLbs) * 100 : 0;
  
  // Rate and timeline
  const [rateOfChange, setRateOfChange] = useState(0.5); // % body weight per week
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  
  // Helper functions to set targets from different approaches
  const setTargetFromBodyFatPercent = (bfPercent: number, preserveFFM: boolean = true) => {
    if (preserveFFM) {
      // Keep current FFM, calculate new fat mass for target BF%
      const currentFFM = bodyComp.ffmLbs;
      const newFatMass = currentFFM * (bfPercent / (100 - bfPercent));
      setTargetFFMLbs(Math.round(currentFFM * 10) / 10);
      setTargetFatMassLbs(Math.round(newFatMass * 10) / 10);
    } else {
      // Keep current weight, adjust composition
      const newFatMass = weightLbs * (bfPercent / 100);
      const newFFM = weightLbs - newFatMass;
      setTargetFatMassLbs(Math.round(newFatMass * 10) / 10);
      setTargetFFMLbs(Math.round(newFFM * 10) / 10);
    }
  };
  
  const setTargetFromFMI = (targetFMI: number) => {
    // FMI = Fat Mass (kg) / Height (m)^2
    // Fat Mass (kg) = FMI * Height (m)^2
    const heightM = heightCm / 100;
    const targetFatMassKg = targetFMI * (heightM * heightM);
    const targetFatMassLbsCalc = targetFatMassKg * 2.20462;
    setTargetFatMassLbs(Math.round(targetFatMassLbsCalc * 10) / 10);
    // Keep current FFM unless it would result in unrealistic composition
    setTargetFFMLbs(bodyComp.ffmLbs);
  };
  
  const setTargetFromFFMI = (targetFFMI: number) => {
    // FFMI = FFM (kg) / Height (m)^2
    // FFM (kg) = FFMI * Height (m)^2
    const heightM = heightCm / 100;
    const targetFFMKg = targetFFMI * (heightM * heightM);
    const targetFFMLbsCalc = targetFFMKg * 2.20462;
    setTargetFFMLbs(Math.round(targetFFMLbsCalc * 10) / 10);
    // Keep current fat mass unless explicitly changing
    setTargetFatMassLbs(bodyComp.fatMassLbs);
  };
  
  const setTargetFromWeight = (weight: number, bfPercent: number) => {
    const newFatMass = weight * (bfPercent / 100);
    const newFFM = weight - newFatMass;
    setTargetFatMassLbs(Math.round(newFatMass * 10) / 10);
    setTargetFFMLbs(Math.round(newFFM * 10) / 10);
  };

  // ============ DERIVED VALUES ============
  
  const weightKg = useMemo(() => lbsToKg(weightLbs), [weightLbs]);
  const heightCm = useMemo(() => heightToCm(heightFt, heightIn), [heightFt, heightIn]);
  const bodyFatPercent = useMemo(() => useMeasuredBF ? measuredBFPercent : estimatedBFPercent, [useMeasuredBF, measuredBFPercent, estimatedBFPercent]);
  
  // Body composition metrics
  const bodyComp = useMemo(() => {
    return calculateBodyComp(weightKg, heightCm, bodyFatPercent, gender);
  }, [weightKg, heightCm, bodyFatPercent, gender]);

  // RMR calculations
  const calculatedRMRs = useMemo(() => {
    const results: { equation: RMREquation; value: number }[] = [];
    
    if (selectedEquations.includes('mifflin')) {
      results.push({ equation: 'mifflin', value: calculateMifflinRMR(gender, weightKg, heightCm, age) });
    }
    if (selectedEquations.includes('harris')) {
      results.push({ equation: 'harris', value: calculateHarrisRMR(gender, weightKg, heightCm, age) });
    }
    if (selectedEquations.includes('cunningham') && bodyFatPercent) {
      results.push({ equation: 'cunningham', value: calculateCunninghamRMR(bodyComp.ffmKg) });
    }
    
    return results;
  }, [selectedEquations, gender, weightKg, heightCm, age, bodyFatPercent, bodyComp.ffmKg]);

  const averageRMR = useMemo(() => {
    if (calculatedRMRs.length === 0) return 0;
    const sum = calculatedRMRs.reduce((acc, r) => acc + r.value, 0);
    return Math.round(sum / calculatedRMRs.length);
  }, [calculatedRMRs]);

  const finalRMR = useMemo(() => {
    if (useMeasuredRMR) return measuredRMR;
    if (useAverageRMR) return averageRMR;
    if (calculatedRMRs.length > 0) return Math.round(calculatedRMRs[0].value);
    return 0;
  }, [useMeasuredRMR, measuredRMR, useAverageRMR, averageRMR, calculatedRMRs]);

  // NEAT estimate (will be refined in Schedule step)
  const estimatedNEAT = useMemo(() => {
    // Base NEAT typically 15-30% of TDEE
    // Using conservative 20% estimate
    return Math.round(finalRMR * 0.2);
  }, [finalRMR]);

  // Calculate age from DOB
  useEffect(() => {
    if (useDOB && dob) {
      const calculatedAge = calculateAge(new Date(dob));
      if (calculatedAge > 0 && calculatedAge < 120) {
        setAge(calculatedAge);
      }
    }
  }, [useDOB, dob]);

  // Get recommended goal based on body composition
  const recommendedGoal = useMemo(() => {
    const fmiCat = bodyComp.fmiCategory;
    const ffmiCat = bodyComp.ffmiCategory;
    
    if (['Overfat', 'Significantly Overfat', 'Slightly Overfat'].includes(fmiCat)) {
      return { goal: 'lose_fat' as const, reason: `FMI indicates ${fmiCat.toLowerCase()}. Fat loss recommended.` };
    }
    if (['Undermuscled', 'Moderately Undermuscled'].includes(ffmiCat)) {
      return { goal: 'gain_muscle' as const, reason: `FFMI indicates ${ffmiCat.toLowerCase()}. Building muscle recommended.` };
    }
    if (['Extremely Lean', 'Lean'].includes(fmiCat)) {
      return { goal: 'gain_muscle' as const, reason: 'Already lean. Focus on building muscle.' };
    }
    return { goal: 'maintain' as const, reason: 'Body composition is healthy. Maintenance or recomposition.' };
  }, [bodyComp]);

  // Target body composition calculations - using direct fat mass and FFM values
  const targetWeightKg = useMemo(() => lbsToKg(targetWeightLbs), [targetWeightLbs]);
  const targetFatMassKg = useMemo(() => lbsToKg(targetFatMassLbs), [targetFatMassLbs]);
  const targetFFMKg = useMemo(() => lbsToKg(targetFFMLbs), [targetFFMLbs]);
  
  const targetBodyComp = useMemo(() => {
    const heightM = heightCm / 100;
    const fmi = targetFatMassKg / (heightM * heightM);
    const ffmi = targetFFMKg / (heightM * heightM);
    
    // Get categories
    const fmiCategories = gender === 'Male' ? FMI_CATEGORIES.Male : FMI_CATEGORIES.Female;
    const ffmiCategories = gender === 'Male' ? FFMI_CATEGORIES.Male : FFMI_CATEGORIES.Female;
    
    const fmiCat = fmiCategories.find(c => fmi <= c.max);
    const ffmiCat = ffmiCategories.find(c => ffmi <= c.max);
    
    return {
      fatMassKg: targetFatMassKg,
      fatMassLbs: targetFatMassLbs,
      ffmKg: targetFFMKg,
      ffmLbs: targetFFMLbs,
      fmi,
      ffmi,
      fmiCategory: fmiCat?.label || 'Unknown',
      fmiColor: fmiCat?.color || '',
      ffmiCategory: ffmiCat?.label || 'Unknown',
      ffmiColor: ffmiCat?.color || '',
    };
  }, [targetFatMassKg, targetFFMKg, targetFatMassLbs, targetFFMLbs, heightCm, gender]);

  // Calculate weight change needed
  const weightChangeNeeded = useMemo(() => {
    const change = targetWeightLbs - weightLbs;
    return {
      lbs: change,
      kg: lbsToKg(Math.abs(change)),
      direction: change < 0 ? 'lose' : change > 0 ? 'gain' : 'maintain',
    };
  }, [targetWeightLbs, weightLbs]);

  // Calculate timeline based on rate
  const timelineCalc = useMemo(() => {
    const weeklyChangeLbs = (rateOfChange / 100) * weightLbs;
    if (weeklyChangeLbs === 0 || weightChangeNeeded.lbs === 0) {
      return { weeks: 0, endDate: startDate };
    }
    
    const weeks = Math.ceil(Math.abs(weightChangeNeeded.lbs) / weeklyChangeLbs);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + weeks * 7);
    
    return { 
      weeks: Math.min(weeks, 52), // Cap at 52 weeks
      endDate: endDate.toISOString().split('T')[0],
      weeklyChangeLbs,
    };
  }, [rateOfChange, weightLbs, weightChangeNeeded.lbs, startDate]);

  // Calculate fat loss efficiency based on client context
  // This determines what % of weight loss comes from fat vs lean mass
  const fatLossEfficiency = useMemo(() => {
    // Base efficiency: with proper nutrition/training, ~85-95% of weight loss can be fat
    let efficiency = 0.85; // 85% baseline
    
    // Muscle preservation setting
    if (musclePreservation === 'preserve_all') {
      efficiency += 0.08; // Up to 93%
    } else if (musclePreservation === 'some_loss_ok') {
      efficiency += 0.03; // 88%
    }
    
    // Lifestyle commitment affects adherence to protein/training
    if (lifestyleCommitment === 'fully_committed') {
      efficiency += 0.05; // Better adherence = better preservation
    } else if (lifestyleCommitment === 'moderately_committed') {
      efficiency += 0.02;
    }
    // Limited commitment: no bonus
    
    // Rate of change - faster rates reduce efficiency
    if (rateOfChange <= 0.25) {
      efficiency += 0.02; // Slow = more efficient
    } else if (rateOfChange >= 0.75) {
      efficiency -= 0.05; // Fast = less efficient
    } else if (rateOfChange >= 1.0) {
      efficiency -= 0.10; // Very fast = poor efficiency
    }
    
    // Cap between 75% and 98%
    return Math.max(0.75, Math.min(0.98, efficiency));
  }, [musclePreservation, lifestyleCommitment, rateOfChange]);

  // Calculate muscle gain efficiency for muscle gain goals
  // This determines what % of weight gain comes from muscle vs fat
  const muscleGainEfficiency = useMemo(() => {
    // Base efficiency depends on fat gain tolerance
    // "maximize_muscle" = more aggressive surplus, accepts more fat gain
    // "minimize_fat_gain" = leaner approach, slower but cleaner gains
    let efficiency = fatGainTolerance === 'minimize_fat_gain' ? 0.70 : 0.55;
    
    // With minimize_fat_gain, we're being more careful so higher % is muscle
    // With maximize_muscle, we're in surplus so more total muscle but also more fat
    
    // Performance priority
    if (performancePriority === 'performance_priority') {
      efficiency += 0.05; // More focus on training
    }
    
    // Lifestyle commitment
    if (lifestyleCommitment === 'fully_committed') {
      efficiency += 0.08; // Better adherence
    } else if (lifestyleCommitment === 'moderately_committed') {
      efficiency += 0.04;
    }
    
    // Tracking commitment affects nutrition accuracy
    if (trackingCommitment === 'committed_tracking') {
      efficiency += 0.05;
    }
    
    // Rate of change - slower = more muscle ratio, faster = more fat ratio
    if (rateOfChange <= 0.12) {
      efficiency += 0.05; // Lean bulk
    } else if (rateOfChange >= 0.5) {
      efficiency -= 0.08; // Aggressive = more fat
    } else if (rateOfChange >= 0.75) {
      efficiency -= 0.15; // Very aggressive = much more fat
    }
    
    // Fat gain tolerance affects the approach
    if (fatGainTolerance === 'minimize_fat_gain') {
      // Cap higher for lean gainers (they're being more precise)
      return Math.max(0.55, Math.min(0.85, efficiency));
    } else {
      // "maximize_muscle" accepts more fat, so efficiency is naturally lower
      // but total muscle gained may still be higher due to larger surplus
      return Math.max(0.40, Math.min(0.70, efficiency));
    }
  }, [performancePriority, lifestyleCommitment, trackingCommitment, rateOfChange, fatGainTolerance]);

  // Calculate recomposition potential for maintenance/performance goals
  // This determines if/how body composition can change at maintenance calories
  const recompPotential = useMemo(() => {
    // Recomp potential varies by factors - higher BF%, less trained = more potential
    let potential = 0.3; // Base: 30% of "ideal" recomp rate
    
    // Higher body fat = more recomp potential (more fuel available)
    if (bodyFatPercent >= 25) {
      potential += 0.25;
    } else if (bodyFatPercent >= 20) {
      potential += 0.15;
    } else if (bodyFatPercent >= 15) {
      potential += 0.05;
    }
    // Very lean = minimal recomp potential
    
    // Lifestyle commitment (training quality matters most for recomp)
    if (lifestyleCommitment === 'fully_committed') {
      potential += 0.20;
    } else if (lifestyleCommitment === 'moderately_committed') {
      potential += 0.10;
    }
    
    // Tracking helps optimize nutrient timing for recomp
    if (trackingCommitment === 'committed_tracking') {
      potential += 0.10;
    }
    
    // Performance priority = more training focus = better recomp
    if (performancePriority === 'performance_priority') {
      potential += 0.10;
    }
    
    // Cap between 10% and 80%
    return Math.max(0.10, Math.min(0.80, potential));
  }, [bodyFatPercent, lifestyleCommitment, trackingCommitment, performancePriority]);

  // For maintenance with slight deficit/surplus, determine composition preference
  const maintenanceCompositionChange = useMemo(() => {
    if (goalType !== 'maintain' && goalType !== 'performance') {
      return { weeklyFatChange: 0, weeklyMuscleChange: 0 };
    }
    
    const weeklyWeightChange = (rateOfChange / 100) * weightLbs;
    
    if (rateOfChange === 0) {
      // Pure maintenance - potential for recomposition
      // Can simultaneously lose fat and gain muscle at same weight
      const recompRate = recompPotential * 0.15; // Max ~0.15 lbs/week recomp at high potential
      return {
        weeklyFatChange: -recompRate, // Lose small amount of fat
        weeklyMuscleChange: recompRate, // Gain equal amount of muscle
        isRecomp: true,
      };
    } else if (rateOfChange < 0) {
      // Slight deficit - primarily fat loss with potential muscle gain
      const fatLossRate = Math.abs(weeklyWeightChange) * (0.80 + recompPotential * 0.15);
      const muscleChange = Math.abs(weeklyWeightChange) * (recompPotential * 0.1); // Slight muscle gain possible
      return {
        weeklyFatChange: -fatLossRate,
        weeklyMuscleChange: muscleChange,
        isDeficit: true,
      };
    } else {
      // Slight surplus - primarily muscle gain with minimal fat
      const muscleGainRate = weeklyWeightChange * (0.50 + recompPotential * 0.25);
      const fatGainRate = weeklyWeightChange - muscleGainRate;
      return {
        weeklyFatChange: fatGainRate,
        weeklyMuscleChange: muscleGainRate,
        isSurplus: true,
      };
    }
  }, [goalType, rateOfChange, weightLbs, recompPotential]);

  // Generate projection data for timeline table
  const projectionData = useMemo(() => {
    if (timelineCalc.weeks === 0) return [];
    
    const data: { week: number; date: string; weight: number; bf: number; fatMass: number; ffm: number }[] = [];
    const weeklyWeightChange = weightChangeNeeded.direction === 'lose' 
      ? -Math.abs(timelineCalc.weeklyChangeLbs!) 
      : Math.abs(timelineCalc.weeklyChangeLbs!);
    
    // Starting values
    const startFatMass = bodyComp.fatMassLbs;
    const startFFM = bodyComp.ffmLbs;
    
    for (let week = 0; week <= Math.min(timelineCalc.weeks, 12); week++) {
      const projDate = new Date(startDate);
      projDate.setDate(projDate.getDate() + week * 7);
      
      let projFatMass: number;
      let projFFM: number;
      
      if (goalType === 'lose_fat') {
        // Fat loss: Apply fat loss efficiency
        // Weight loss is distributed: efficiency% from fat, (1-efficiency)% from lean
        const totalWeightLost = Math.abs(weeklyWeightChange) * week;
        const fatLost = totalWeightLost * fatLossEfficiency;
        const leanLost = totalWeightLost * (1 - fatLossEfficiency);
        
        projFatMass = Math.max(startFatMass - fatLost, 0);
        projFFM = Math.max(startFFM - leanLost, startFFM * 0.9); // Don't lose more than 10% FFM
      } else if (goalType === 'gain_muscle') {
        // Muscle gain: Apply muscle gain efficiency
        const totalWeightGained = Math.abs(weeklyWeightChange) * week;
        const muscleGained = totalWeightGained * muscleGainEfficiency;
        const fatGained = totalWeightGained * (1 - muscleGainEfficiency);
        
        projFatMass = startFatMass + fatGained;
        projFFM = startFFM + muscleGained;
      } else {
        // Maintenance/Performance: Use composition change calculations
        const fatChange = maintenanceCompositionChange.weeklyFatChange * week;
        const muscleChange = maintenanceCompositionChange.weeklyMuscleChange * week;
        
        projFatMass = Math.max(startFatMass + fatChange, startFatMass * 0.7); // Don't project losing more than 30% of fat
        projFFM = startFFM + muscleChange;
      }
      
      const projWeight = projFatMass + projFFM;
      const projBF = projWeight > 0 ? (projFatMass / projWeight) * 100 : bodyFatPercent;
      
      data.push({
        week,
        date: projDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: Math.round(projWeight * 10) / 10,
        bf: Math.round(projBF * 10) / 10,
        fatMass: Math.round(projFatMass * 10) / 10,
        ffm: Math.round(projFFM * 10) / 10,
      });
    }
    
    // Add final target if more than 12 weeks
    if (timelineCalc.weeks > 12) {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + timelineCalc.weeks * 7);
      
      let finalFatMass: number;
      let finalFFM: number;
      
      if (goalType === 'lose_fat') {
        const totalWeightLost = Math.abs(weightChangeNeeded.lbs);
        const fatLost = totalWeightLost * fatLossEfficiency;
        const leanLost = totalWeightLost * (1 - fatLossEfficiency);
        finalFatMass = Math.max(startFatMass - fatLost, 0);
        finalFFM = Math.max(startFFM - leanLost, startFFM * 0.9);
      } else if (goalType === 'gain_muscle') {
        const totalWeightGained = Math.abs(weightChangeNeeded.lbs);
        const muscleGained = totalWeightGained * muscleGainEfficiency;
        const fatGained = totalWeightGained * (1 - muscleGainEfficiency);
        finalFatMass = startFatMass + fatGained;
        finalFFM = startFFM + muscleGained;
      } else {
        // Maintenance/Performance: Use composition change calculations
        const totalFatChange = maintenanceCompositionChange.weeklyFatChange * timelineCalc.weeks;
        const totalMuscleChange = maintenanceCompositionChange.weeklyMuscleChange * timelineCalc.weeks;
        finalFatMass = Math.max(startFatMass + totalFatChange, startFatMass * 0.7);
        finalFFM = startFFM + totalMuscleChange;
      }
      
      const finalWeight = finalFatMass + finalFFM;
      const finalBF = finalWeight > 0 ? (finalFatMass / finalWeight) * 100 : targetBodyFatPercent;
      
      data.push({
        week: timelineCalc.weeks,
        date: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: Math.round(finalWeight * 10) / 10,
        bf: Math.round(finalBF * 10) / 10,
        fatMass: Math.round(finalFatMass * 10) / 10,
        ffm: Math.round(finalFFM * 10) / 10,
      });
    }
    
    return data;
  }, [timelineCalc, weightChangeNeeded, weightLbs, bodyFatPercent, bodyComp, goalType, fatLossEfficiency, muscleGainEfficiency, startDate]);

  // Initialize targets when goal changes - using direct fat mass and FFM values
  useEffect(() => {
    // Initialize target values based on current composition
    const currentFatMass = bodyComp.fatMassLbs;
    const currentFFM = bodyComp.ffmLbs;
    
    if (goalType === 'lose_fat') {
      // Fat loss: Preserve FFM (with slight expected loss), reduce fat mass
      const minHealthyBF = gender === 'Male' ? 10 : 18;
      const targetBF = Math.max(minHealthyBF, bodyFatPercent - 5);
      
      // Expected FFM retention based on muscle preservation setting
      const ffmRetention = musclePreservation === 'preserve_all' ? 0.97 : 0.93;
      const newFFM = currentFFM * ffmRetention;
      
      // Calculate fat mass needed for target BF% with preserved FFM
      const newFatMass = newFFM * (targetBF / (100 - targetBF));
      
      setTargetFFMLbs(Math.round(newFFM * 10) / 10);
      setTargetFatMassLbs(Math.round(newFatMass * 10) / 10);
      setTargetApproach('body_fat_percent');
      setRateOfChange(0.5);
    } else if (goalType === 'gain_muscle') {
      // Muscle gain: Add FFM, control fat gain
      if (fatGainTolerance === 'maximize_muscle') {
        // Traditional bulk: more total mass gain
        const ffmGain = 10; // lbs target muscle gain
        const fatGain = ffmGain * 0.6; // Expect ~60% as much fat
        
        setTargetFFMLbs(Math.round((currentFFM + ffmGain) * 10) / 10);
        setTargetFatMassLbs(Math.round((currentFatMass + fatGain) * 10) / 10);
        setRateOfChange(0.5);
      } else {
        // Lean bulk: controlled gains
        const ffmGain = 6; // lbs target muscle gain
        const fatGain = ffmGain * 0.25; // Expect only ~25% as much fat
        
        setTargetFFMLbs(Math.round((currentFFM + ffmGain) * 10) / 10);
        setTargetFatMassLbs(Math.round((currentFatMass + fatGain) * 10) / 10);
        setRateOfChange(0.25);
      }
      setTargetApproach('ffm');
    } else if (goalType === 'maintain') {
      // Maintenance: recomposition potential
      if (bodyFatPercent > 20 && gender === 'Male') {
        setRateOfChange(-0.1);
      } else if (bodyFatPercent > 28 && gender === 'Female') {
        setRateOfChange(-0.1);
      } else {
        setRateOfChange(0);
      }
      
      // Slight recomp: lose a bit of fat, gain a bit of muscle
      const recompFatChange = -recompPotential * 2; // Lose some fat
      const recompFFMChange = recompPotential * 1.5; // Gain some muscle
      
      setTargetFatMassLbs(Math.round((currentFatMass + recompFatChange) * 10) / 10);
      setTargetFFMLbs(Math.round((currentFFM + recompFFMChange) * 10) / 10);
    } else {
      // Performance - maintain current composition, focus on performance
      setRateOfChange(0);
      setTargetFatMassLbs(currentFatMass);
      setTargetFFMLbs(currentFFM);
      setTargetApproach('body_fat_percent');
    }
  }, [goalType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get rate options based on goal type
  const rateOptions = useMemo(() => {
    switch (goalType) {
      case 'lose_fat': return FAT_LOSS_RATES;
      case 'gain_muscle': return MUSCLE_GAIN_RATES;
      case 'maintain':
      case 'performance': 
      default: return MAINTENANCE_RATES;
    }
  }, [goalType]);

  // ============ SAVE HANDLER ============
  
  const handleSaveAndContinue = () => {
    if (!name.trim()) {
      toast.error('Please enter client name');
      return;
    }
    
    // Save user profile
    setUserProfile({
      name: name.trim(),
      gender,
      age,
      heightFt,
      heightIn,
      heightCm,
      weightLbs,
      weightKg,
      bodyFatPercentage: bodyFatPercent,
      // Note: We'll add RMR and other metabolic fields to the type
    });
    
    // Save body comp goals (round all values for clean display)
    setBodyCompGoals({
      goalType: goalType === 'performance' ? 'maintain' : goalType,
      targetWeightLbs: Math.round(targetWeightLbs * 10) / 10,
      targetBodyFat: Math.round(targetBodyFatPercent * 10) / 10,
      weeklyWeightChange: Math.round((timelineCalc.weeklyChangeLbs || 0) * 100) / 100,
      timelineWeeks: timelineCalc.weeks,
      startDate,
      targetFatMassLbs: Math.round(targetFatMassLbs * 10) / 10,
      targetFFMLbs: Math.round(targetFFMLbs * 10) / 10,
      targetFMI: Math.round(targetBodyComp.fmi * 10) / 10,
      targetFFMI: Math.round(targetBodyComp.ffmi * 10) / 10,
      performancePriority,
      musclePreservation,
      fatGainTolerance,
      lifestyleCommitment,
      trackingCommitment,
    });
    
    toast.success('Profile saved!');
    router.push('/schedule');
  };

  const handleEquationToggle = (equation: RMREquation) => {
    setSelectedEquations(prev => {
      if (prev.includes(equation)) {
        return prev.filter(e => e !== equation);
      }
      return [...prev, equation];
    });
  };

  // ============ RENDER ============

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="max-w-4xl mx-auto">
            <ProgressSteps currentStep={1} />
            
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold mb-2">Client Profile</h1>
              <p className="text-muted-foreground">
                {isHydrated && activeClient ? `Editing: ${activeClient.name}` : 'Enter client information and assessment'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Section 1: Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-[#c19962]" />
                      Basic Information
                    </CardTitle>
                    <CardDescription>Essential client demographics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Client Name</Label>
                      <Input
                        id="name"
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    {/* Gender */}
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <RadioGroup
                        value={gender}
                        onValueChange={(v) => setGender(v as 'Male' | 'Female')}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Male" id="male" />
                          <Label htmlFor="male">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Female" id="female" />
                          <Label htmlFor="female">Female</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Age / DOB */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Age</Label>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={useDOB}
                            onCheckedChange={setUseDOB}
                            id="use-dob"
                          />
                          <Label htmlFor="use-dob" className="text-sm text-muted-foreground">
                            Use date of birth
                          </Label>
                        </div>
                      </div>
                      
                      {useDOB ? (
                        <div className="flex gap-4 items-end">
                          <div className="flex-1">
                            <Input
                              type="date"
                              value={dob}
                              onChange={(e) => setDob(e.target.value)}
                              max={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div className="text-sm text-muted-foreground pb-2">
                            Age: <span className="font-medium">{age} years</span>
                          </div>
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min={18}
                          max={100}
                          value={age}
                          onChange={(e) => setAge(parseInt(e.target.value) || 30)}
                        />
                      )}
                    </div>

                    {/* Height */}
                    <div className="space-y-2">
                      <Label>Height</Label>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Input
                            type="number"
                            min={4}
                            max={7}
                            value={heightFt}
                            onChange={(e) => setHeightFt(parseInt(e.target.value) || 5)}
                          />
                          <span className="text-xs text-muted-foreground">feet</span>
                        </div>
                        <div className="flex-1">
                          <Input
                            type="number"
                            min={0}
                            max={11}
                            value={heightIn}
                            onChange={(e) => setHeightIn(parseInt(e.target.value) || 0)}
                          />
                          <span className="text-xs text-muted-foreground">inches</span>
                        </div>
                        <div className="text-sm text-muted-foreground self-center">
                          = {heightCm.toFixed(1)} cm
                        </div>
                      </div>
                    </div>

                    {/* Weight */}
                    <div className="space-y-2">
                      <Label htmlFor="weight">Current Weight</Label>
                      <div className="flex gap-3 items-center">
                        <Input
                          id="weight"
                          type="number"
                          min={80}
                          max={500}
                          value={weightLbs}
                          onChange={(e) => setWeightLbs(parseFloat(e.target.value) || 180)}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">lbs</span>
                        <span className="text-sm text-muted-foreground">= {weightKg.toFixed(1)} kg</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 2: Body Composition */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-[#c19962]" />
                      Body Composition
                    </CardTitle>
                    <CardDescription>
                      Enter measured values if available, or estimate
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Body Fat % Toggle */}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <Label className="font-medium">Body Fat Percentage</Label>
                        <p className="text-sm text-muted-foreground">
                          {useMeasuredBF ? 'Using measured value (DEXA, BodPod, etc.)' : 'Using estimated value'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Estimate</span>
                        <Switch
                          checked={useMeasuredBF}
                          onCheckedChange={setUseMeasuredBF}
                        />
                        <span className="text-sm">Measured</span>
                      </div>
                    </div>

                    {useMeasuredBF ? (
                      <div className="space-y-2">
                        <Label>Measured Body Fat %</Label>
                        <div className="flex items-center gap-4">
                          <Input
                            type="number"
                            min={3}
                            max={60}
                            step={0.1}
                            value={measuredBFPercent}
                            onChange={(e) => setMeasuredBFPercent(parseFloat(e.target.value) || 20)}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          From DEXA scan, BodPod, hydrostatic weighing, or other validated method
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Estimated Body Fat %</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            min={5}
                            max={50}
                            step={1}
                            value={[estimatedBFPercent]}
                            onValueChange={(v) => setEstimatedBFPercent(v[0])}
                            className="flex-1"
                          />
                          <span className="w-16 text-right font-medium">{estimatedBFPercent}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Visual estimate or mirror/photo-based assessment
                        </p>
                      </div>
                    )}

                    <Separator />

                    {/* Body Composition Analysis */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Calculated Body Composition
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="text-center p-3 bg-background border rounded-lg">
                          <p className="text-xs text-muted-foreground">Fat Mass</p>
                          <p className="text-lg font-bold">{bodyComp.fatMassLbs.toFixed(1)} lbs</p>
                          <p className="text-xs text-muted-foreground">{bodyComp.fatMassKg.toFixed(1)} kg</p>
                        </div>
                        <div className="text-center p-3 bg-background border rounded-lg">
                          <p className="text-xs text-muted-foreground">Lean Mass</p>
                          <p className="text-lg font-bold">{bodyComp.ffmLbs.toFixed(1)} lbs</p>
                          <p className="text-xs text-muted-foreground">{bodyComp.ffmKg.toFixed(1)} kg</p>
                        </div>
                        <div className="text-center p-3 bg-background border rounded-lg">
                          <p className="text-xs text-muted-foreground">FMI</p>
                          <p className="text-lg font-bold">{bodyComp.fmi.toFixed(1)}</p>
                          <Badge className={getFMICategory(bodyComp.fmi, gender).color}>
                            {bodyComp.fmiCategory}
                          </Badge>
                        </div>
                        <div className="text-center p-3 bg-background border rounded-lg">
                          <p className="text-xs text-muted-foreground">FFMI</p>
                          <p className="text-lg font-bold">{bodyComp.ffmi.toFixed(1)}</p>
                          <Badge className={getFFMICategory(bodyComp.ffmi, gender).color}>
                            {bodyComp.ffmiCategory}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                        <strong>FMI</strong> (Fat Mass Index) = Fat Mass ÷ Height² | 
                        <strong> FFMI</strong> (Fat-Free Mass Index) = Lean Mass ÷ Height²
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 3: Metabolic Assessment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-[#c19962]" />
                      Metabolic Assessment
                    </CardTitle>
                    <CardDescription>
                      Resting Metabolic Rate (RMR) - foundation for energy expenditure calculations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* RMR Toggle */}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <Label className="font-medium">Resting Metabolic Rate (RMR)</Label>
                        <p className="text-sm text-muted-foreground">
                          {useMeasuredRMR ? 'Using measured value (indirect calorimetry)' : 'Using equation-based estimate'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Calculate</span>
                        <Switch
                          checked={useMeasuredRMR}
                          onCheckedChange={setUseMeasuredRMR}
                        />
                        <span className="text-sm">Measured</span>
                      </div>
                    </div>

                    {useMeasuredRMR ? (
                      <div className="space-y-2">
                        <Label>Measured RMR</Label>
                        <div className="flex items-center gap-4">
                          <Input
                            type="number"
                            min={800}
                            max={4000}
                            value={measuredRMR}
                            onChange={(e) => setMeasuredRMR(parseInt(e.target.value) || 1800)}
                            className="w-32"
                          />
                          <span className="text-sm text-muted-foreground">kcal/day</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          From indirect calorimetry or metabolic testing
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Label>Select Equation(s) for RMR Calculation</Label>
                        <div className="space-y-3">
                          {RMR_EQUATIONS.map((eq) => (
                            <div 
                              key={eq.value}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedEquations.includes(eq.value) 
                                  ? 'border-[#c19962] bg-[#c19962]/5' 
                                  : 'hover:border-muted-foreground/50'
                              }`}
                              onClick={() => handleEquationToggle(eq.value)}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox 
                                  checked={selectedEquations.includes(eq.value)}
                                  className="pointer-events-none"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{eq.label}</span>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm">
                                        <p className="font-medium mb-1">{eq.label}</p>
                                        <p className="text-xs whitespace-pre-wrap">{eq.formula}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{eq.description}</p>
                                </div>
                                {selectedEquations.includes(eq.value) && calculatedRMRs.find(r => r.equation === eq.value) && (
                                  <div className="text-right">
                                    <p className="font-bold text-lg">
                                      {Math.round(calculatedRMRs.find(r => r.equation === eq.value)!.value)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">kcal/day</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {selectedEquations.length > 1 && (
                          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                            <Checkbox 
                              id="use-average"
                              checked={useAverageRMR}
                              onCheckedChange={(c) => setUseAverageRMR(c as boolean)}
                            />
                            <Label htmlFor="use-average" className="flex-1">
                              Use average of selected equations ({averageRMR} kcal/day)
                            </Label>
                          </div>
                        )}
                      </div>
                    )}

                    <Separator />

                    {/* Energy Expenditure Components */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Energy Expenditure Components
                      </h4>
                      
                      <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">RMR</span>
                            <span className="text-sm text-muted-foreground">(Resting Metabolic Rate)</span>
                          </div>
                          <span className="font-bold">{finalRMR} kcal</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>NEAT</span>
                            <span className="text-sm">(Non-Exercise Activity Thermogenesis)</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Daily movement outside of exercise. Refined in Schedule step based on activity level.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span>~{estimatedNEAT} kcal <span className="text-xs">(estimated)</span></span>
                        </div>
                        
                        <div className="flex items-center justify-between text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>TEF</span>
                            <span className="text-sm">(Thermic Effect of Food)</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Energy to digest food. ~10% of intake. Calculated after nutrition targets are set.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className="text-xs italic">Calculated from targets</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>EEE</span>
                            <span className="text-sm">(Exercise Energy Expenditure)</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Calories burned during exercise. Set in Schedule step based on workouts.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className="text-xs italic">Calculated from schedule</span>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Base TDEE Estimate</span>
                          <span className="font-bold text-[#c19962]">~{finalRMR + estimatedNEAT} kcal/day</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          TDEE = RMR + NEAT + TEF + EEE. Final TDEE calculated after Schedule step.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 4: Primary Goal */}
                <Card className="border-[#c19962]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-[#c19962]" />
                      Primary Goal
                    </CardTitle>
                    <CardDescription>
                      What is the client&apos;s primary objective?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Recommendation based on body composition */}
                    <div className="p-4 bg-[#00263d]/5 border border-[#00263d]/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-[#c19962] mt-0.5" />
                        <div>
                          <p className="font-medium">Recommended: {recommendedGoal.goal.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">{recommendedGoal.reason}</p>
                        </div>
                      </div>
                    </div>

                    {/* Goal Selection */}
                    <RadioGroup
                      value={goalType}
                      onValueChange={(v) => setGoalType(v as typeof goalType)}
                      className="grid grid-cols-2 gap-3"
                    >
                      <div className="relative">
                        <RadioGroupItem value="lose_fat" id="lose_fat" className="peer sr-only" />
                        <Label
                          htmlFor="lose_fat"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#c19962] peer-data-[state=checked]:bg-[#c19962]/5 cursor-pointer"
                        >
                          <Scale className="h-6 w-6 mb-2 text-orange-500" />
                          <span className="font-semibold">Fat Loss</span>
                        </Label>
                      </div>
                      <div className="relative">
                        <RadioGroupItem value="gain_muscle" id="gain_muscle" className="peer sr-only" />
                        <Label
                          htmlFor="gain_muscle"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#c19962] peer-data-[state=checked]:bg-[#c19962]/5 cursor-pointer"
                        >
                          <Dumbbell className="h-6 w-6 mb-2 text-blue-500" />
                          <span className="font-semibold">Muscle Gain</span>
                        </Label>
                      </div>
                      <div className="relative">
                        <RadioGroupItem value="maintain" id="maintain" className="peer sr-only" />
                        <Label
                          htmlFor="maintain"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#c19962] peer-data-[state=checked]:bg-[#c19962]/5 cursor-pointer"
                        >
                          <Activity className="h-6 w-6 mb-2 text-green-500" />
                          <span className="font-semibold">Maintenance</span>
                        </Label>
                      </div>
                      <div className="relative">
                        <RadioGroupItem value="performance" id="performance" className="peer sr-only" />
                        <Label
                          htmlFor="performance"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#c19962] peer-data-[state=checked]:bg-[#c19962]/5 cursor-pointer"
                        >
                          <Heart className="h-6 w-6 mb-2 text-purple-500" />
                          <span className="font-semibold">Performance</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Section 5: Client Context & Assessment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-[#c19962]" />
                      Client Context & Assessment
                    </CardTitle>
                    <CardDescription>
                      Staff assessment of client priorities and commitment level for {goalType === 'lose_fat' ? 'fat loss' : goalType === 'gain_muscle' ? 'muscle building' : goalType === 'maintain' ? 'maintenance' : 'performance'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Performance vs Body Comp Priority - show for body comp goals */}
                    {(goalType === 'lose_fat' || goalType === 'gain_muscle' || goalType === 'maintain') && (
                      <div className="space-y-3">
                        <Label>Training Performance Priority</Label>
                        <RadioGroup
                          value={performancePriority}
                          onValueChange={(v) => setPerformancePriority(v as PerformancePriority)}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                            <RadioGroupItem value="body_comp_priority" id="bcp" />
                            <Label htmlFor="bcp" className="flex-1 cursor-pointer">
                              <span className="font-medium">Body composition focused</span>
                              <p className="text-sm text-muted-foreground">Client accepts potential performance impact to achieve body comp goals faster</p>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                            <RadioGroupItem value="performance_priority" id="pp" />
                            <Label htmlFor="pp" className="flex-1 cursor-pointer">
                              <span className="font-medium">Performance focused</span>
                              <p className="text-sm text-muted-foreground">Prioritize training performance and recovery over rate of body comp change</p>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    {/* Muscle Preservation - only for fat loss */}
                    {goalType === 'lose_fat' && (
                      <div className="space-y-3">
                        <Label>Muscle Preservation Preference</Label>
                        <RadioGroup
                          value={musclePreservation}
                          onValueChange={(v) => setMusclePreservation(v as MusclePreservation)}
                          className="grid gap-2"
                        >
                          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                            <RadioGroupItem value="preserve_all" id="pa" className="mt-0.5" />
                            <Label htmlFor="pa" className="cursor-pointer">
                              <span className="font-medium">Maximize muscle retention</span>
                              <p className="text-sm text-muted-foreground font-normal">
                                Prioritize keeping all muscle mass, even if fat loss is slower
                              </p>
                            </Label>
                          </div>
                          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                            <RadioGroupItem value="accept_some_loss" id="asl" className="mt-0.5" />
                            <Label htmlFor="asl" className="cursor-pointer">
                              <span className="font-medium">Accept some loss for faster progress</span>
                              <p className="text-sm text-muted-foreground font-normal">
                                OK with minimal muscle loss if it means faster fat loss
                              </p>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    {/* Fat Gain Tolerance - only for muscle gain */}
                    {goalType === 'gain_muscle' && (
                      <div className="space-y-3">
                        <Label>Fat Gain Tolerance</Label>
                        <RadioGroup
                          value={fatGainTolerance}
                          onValueChange={(v) => setFatGainTolerance(v as FatGainTolerance)}
                          className="grid gap-2"
                        >
                          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                            <RadioGroupItem value="maximize_muscle" id="mm" className="mt-0.5" />
                            <Label htmlFor="mm" className="cursor-pointer">
                              <span className="font-medium">Maximize muscle growth</span>
                              <p className="text-sm text-muted-foreground font-normal">
                                OK with gaining some body fat to maximize muscle building potential
                              </p>
                            </Label>
                          </div>
                          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                            <RadioGroupItem value="minimize_fat_gain" id="mfg" className="mt-0.5" />
                            <Label htmlFor="mfg" className="cursor-pointer">
                              <span className="font-medium">Minimize fat gain (lean bulk)</span>
                              <p className="text-sm text-muted-foreground font-normal">
                                Stay as lean as possible while building muscle, even if gains are slower
                              </p>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    <Separator />

                    {/* Lifestyle Commitment */}
                    <div className="space-y-3">
                      <Label>Lifestyle Commitment Assessment</Label>
                      <Select value={lifestyleCommitment} onValueChange={(v) => setLifestyleCommitment(v as LifestyleCommitment)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fully_committed">
                            <div>
                              <span className="font-medium">Fully Committed</span>
                              <span className="text-muted-foreground ml-2">— 4+ workouts, prioritizes sleep & nutrition</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="moderately_committed">
                            <div>
                              <span className="font-medium">Moderately Committed</span>
                              <span className="text-muted-foreground ml-2">— 2-3 workouts, tries to prioritize</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="limited_commitment">
                            <div>
                              <span className="font-medium">Limited Commitment</span>
                              <span className="text-muted-foreground ml-2">— Inconsistent availability</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tracking Commitment */}
                    <div className="space-y-3">
                      <Label>Tracking Commitment</Label>
                      <RadioGroup
                        value={trackingCommitment}
                        onValueChange={(v) => setTrackingCommitment(v as TrackingCommitment)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="committed_tracking" id="ct" />
                          <Label htmlFor="ct">Will track food/progress</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="casual_tracking" id="cat" />
                          <Label htmlFor="cat">Casual/intuitive approach</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    {/* Health & Performance Goals */}
                    <div className="space-y-3">
                      <Label htmlFor="health-goals">Health Goals (beyond body composition)</Label>
                      <Textarea
                        id="health-goals"
                        placeholder="e.g., improve blood pressure, manage blood sugar, increase energy levels, better sleep..."
                        value={healthGoals}
                        onChange={(e) => setHealthGoals(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="performance-goals">Performance Goals</Label>
                      <Textarea
                        id="performance-goals"
                        placeholder="e.g., increase squat 1RM, run 5K under 25min, compete in physique show, improve endurance..."
                        value={performanceGoals}
                        onChange={(e) => setPerformanceGoals(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any other relevant information about this client..."
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Target Body Composition */}
                <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-[#c19962]" />
                        Target Body Composition
                      </CardTitle>
                      <CardDescription>
                        Set targets by body fat %, FMI, FFMI, or direct mass values. All values update together.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      
                      {/* Current Composition Summary */}
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold text-sm mb-3 text-muted-foreground flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Current Composition
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Weight</span>
                            <p className="font-bold text-lg">{weightLbs} lbs</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Body Fat</span>
                            <p className="font-bold text-lg">{bodyFatPercent.toFixed(1)}%</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fat Mass</span>
                            <p className="font-bold text-lg">{bodyComp.fatMassLbs.toFixed(1)} lbs</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Lean Mass</span>
                            <p className="font-bold text-lg">{bodyComp.ffmLbs.toFixed(1)} lbs</p>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">FMI:</span>
                            <Badge className={bodyComp.fmiColor}>{bodyComp.fmi.toFixed(1)}</Badge>
                            <span className="text-xs text-muted-foreground">{bodyComp.fmiCategory}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">FFMI:</span>
                            <Badge className={bodyComp.ffmiColor}>{bodyComp.ffmi.toFixed(1)}</Badge>
                            <span className="text-xs text-muted-foreground">{bodyComp.ffmiCategory}</span>
                          </div>
                        </div>
                      </div>

                      {/* Target Approach Selection */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">How would you like to set the target?</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {[
                            { value: 'body_fat_percent', label: 'Target BF%', desc: 'Common approach' },
                            { value: 'fmi', label: 'Target FMI', desc: 'Fat mass index' },
                            { value: 'ffmi', label: 'Target FFMI', desc: 'Lean mass index' },
                            { value: 'fat_mass', label: 'Target Fat Mass', desc: 'Direct lbs' },
                            { value: 'ffm', label: 'Target Lean Mass', desc: 'Direct lbs' },
                            { value: 'custom', label: 'Custom', desc: 'Set both' },
                          ].map((approach) => (
                            <Button
                              key={approach.value}
                              variant={targetApproach === approach.value ? 'default' : 'outline'}
                              className={targetApproach === approach.value ? 'bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]' : ''}
                              onClick={() => setTargetApproach(approach.value as typeof targetApproach)}
                            >
                              <div className="text-center">
                                <div className="font-medium">{approach.label}</div>
                                <div className="text-[10px] opacity-70">{approach.desc}</div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Target Input Based on Approach */}
                      <div className="p-4 bg-[#c19962]/10 border border-[#c19962]/30 rounded-lg space-y-4">
                        <h4 className="font-semibold text-sm text-[#c19962] flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Set Your Target
                        </h4>

                        {targetApproach === 'body_fat_percent' && (
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm">Target Body Fat Percentage</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={targetBodyFatPercent.toFixed(1)}
                                  onChange={(e) => setTargetFromBodyFatPercent(Number(e.target.value), true)}
                                  className="w-24 text-center font-bold text-lg"
                                />
                                <span className="text-2xl font-bold">%</span>
                                <Slider
                                  value={[targetBodyFatPercent]}
                                  onValueChange={([v]) => setTargetFromBodyFatPercent(v, true)}
                                  min={gender === 'Male' ? 6 : 14}
                                  max={40}
                                  step={0.5}
                                  className="flex-1"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Assumes preservation of lean mass. Current: {bodyFatPercent.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        )}

                        {targetApproach === 'fmi' && (
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm">Target Fat Mass Index (FMI)</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={targetBodyComp.fmi.toFixed(1)}
                                  onChange={(e) => setTargetFromFMI(Number(e.target.value))}
                                  className="w-24 text-center font-bold text-lg"
                                />
                                <Slider
                                  value={[targetBodyComp.fmi]}
                                  onValueChange={([v]) => setTargetFromFMI(v)}
                                  min={gender === 'Male' ? 2 : 4}
                                  max={15}
                                  step={0.1}
                                  className="flex-1"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                FMI = Fat Mass / Height². Lower FMI = lower health risk. Current: {bodyComp.fmi.toFixed(1)} ({bodyComp.fmiCategory})
                              </p>
                            </div>
                            {/* FMI Reference */}
                            <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                              <p className="font-medium">FMI Categories ({gender}):</p>
                              {(gender === 'Male' ? FMI_CATEGORIES.Male : FMI_CATEGORIES.Female).map(cat => (
                                <span key={cat.label} className={`inline-block px-2 py-0.5 rounded mr-1 ${cat.color}`}>
                                  ≤{cat.max === Infinity ? '+' : cat.max}: {cat.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {targetApproach === 'ffmi' && (
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm">Target Fat-Free Mass Index (FFMI)</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={targetBodyComp.ffmi.toFixed(1)}
                                  onChange={(e) => setTargetFromFFMI(Number(e.target.value))}
                                  className="w-24 text-center font-bold text-lg"
                                />
                                <Slider
                                  value={[targetBodyComp.ffmi]}
                                  onValueChange={([v]) => setTargetFromFFMI(v)}
                                  min={gender === 'Male' ? 16 : 13}
                                  max={gender === 'Male' ? 28 : 22}
                                  step={0.1}
                                  className="flex-1"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                FFMI = Lean Mass / Height². Higher FFMI = more muscle. Current: {bodyComp.ffmi.toFixed(1)} ({bodyComp.ffmiCategory})
                              </p>
                            </div>
                            {/* FFMI Reference */}
                            <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                              <p className="font-medium">FFMI Categories ({gender}):</p>
                              {(gender === 'Male' ? FFMI_CATEGORIES.Male : FFMI_CATEGORIES.Female).map(cat => (
                                <span key={cat.label} className={`inline-block px-2 py-0.5 rounded mr-1 ${cat.color}`}>
                                  ≤{cat.max === Infinity ? '+' : cat.max}: {cat.label}
                                </span>
                              ))}
                              {gender === 'Male' && (
                                <p className="text-muted-foreground mt-1">Note: FFMI &gt;25 is rare naturally</p>
                              )}
                            </div>
                          </div>
                        )}

                        {targetApproach === 'fat_mass' && (
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm">Target Fat Mass (lbs)</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={targetFatMassLbs}
                                  onChange={(e) => setTargetFatMassLbs(Number(e.target.value))}
                                  className="w-24 text-center font-bold text-lg"
                                />
                                <span className="text-lg">lbs</span>
                                <Slider
                                  value={[targetFatMassLbs]}
                                  onValueChange={([v]) => setTargetFatMassLbs(v)}
                                  min={10}
                                  max={Math.max(bodyComp.fatMassLbs * 1.5, 80)}
                                  step={0.5}
                                  className="flex-1"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Current fat mass: {bodyComp.fatMassLbs.toFixed(1)} lbs. Change: {(targetFatMassLbs - bodyComp.fatMassLbs).toFixed(1)} lbs
                              </p>
                            </div>
                          </div>
                        )}

                        {targetApproach === 'ffm' && (
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm">Target Lean Mass (lbs)</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={targetFFMLbs}
                                  onChange={(e) => setTargetFFMLbs(Number(e.target.value))}
                                  className="w-24 text-center font-bold text-lg"
                                />
                                <span className="text-lg">lbs</span>
                                <Slider
                                  value={[targetFFMLbs]}
                                  onValueChange={([v]) => setTargetFFMLbs(v)}
                                  min={bodyComp.ffmLbs * 0.85}
                                  max={bodyComp.ffmLbs * 1.3}
                                  step={0.5}
                                  className="flex-1"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Current lean mass: {bodyComp.ffmLbs.toFixed(1)} lbs. Change: {(targetFFMLbs - bodyComp.ffmLbs) >= 0 ? '+' : ''}{(targetFFMLbs - bodyComp.ffmLbs).toFixed(1)} lbs
                              </p>
                            </div>
                          </div>
                        )}

                        {targetApproach === 'custom' && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm">Target Fat Mass (lbs)</Label>
                              <Input
                                type="number"
                                step="0.5"
                                value={targetFatMassLbs}
                                onChange={(e) => setTargetFatMassLbs(Number(e.target.value))}
                                className="mt-1 text-center font-bold"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Current: {bodyComp.fatMassLbs.toFixed(1)} lbs
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm">Target Lean Mass (lbs)</Label>
                              <Input
                                type="number"
                                step="0.5"
                                value={targetFFMLbs}
                                onChange={(e) => setTargetFFMLbs(Number(e.target.value))}
                                className="mt-1 text-center font-bold"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Current: {bodyComp.ffmLbs.toFixed(1)} lbs
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Calculated Target Summary */}
                      <div className="p-4 border-2 border-[#c19962] rounded-lg bg-[#c19962]/5">
                        <h4 className="font-semibold text-sm mb-3 text-[#c19962]">Target Composition Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Weight</span>
                            <p className="font-bold text-lg">{targetWeightLbs.toFixed(1)} lbs</p>
                            <p className={`text-xs ${targetWeightLbs < weightLbs ? 'text-orange-600' : targetWeightLbs > weightLbs ? 'text-blue-600' : 'text-muted-foreground'}`}>
                              {targetWeightLbs < weightLbs ? '' : '+'}{(targetWeightLbs - weightLbs).toFixed(1)} lbs
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Body Fat</span>
                            <p className="font-bold text-lg">{targetBodyFatPercent.toFixed(1)}%</p>
                            <p className={`text-xs ${targetBodyFatPercent < bodyFatPercent ? 'text-green-600' : targetBodyFatPercent > bodyFatPercent ? 'text-orange-600' : 'text-muted-foreground'}`}>
                              {targetBodyFatPercent < bodyFatPercent ? '' : '+'}{(targetBodyFatPercent - bodyFatPercent).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fat Mass</span>
                            <p className="font-bold text-lg">{targetFatMassLbs.toFixed(1)} lbs</p>
                            <p className={`text-xs ${targetFatMassLbs < bodyComp.fatMassLbs ? 'text-green-600' : targetFatMassLbs > bodyComp.fatMassLbs ? 'text-orange-600' : 'text-muted-foreground'}`}>
                              {targetFatMassLbs < bodyComp.fatMassLbs ? '' : '+'}{(targetFatMassLbs - bodyComp.fatMassLbs).toFixed(1)} lbs
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Lean Mass</span>
                            <p className="font-bold text-lg">{targetFFMLbs.toFixed(1)} lbs</p>
                            <p className={`text-xs ${targetFFMLbs > bodyComp.ffmLbs ? 'text-blue-600' : targetFFMLbs < bodyComp.ffmLbs ? 'text-orange-600' : 'text-muted-foreground'}`}>
                              {targetFFMLbs > bodyComp.ffmLbs ? '+' : ''}{(targetFFMLbs - bodyComp.ffmLbs).toFixed(1)} lbs
                            </p>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">FMI:</span>
                            <Badge className={targetBodyComp.fmiColor}>{targetBodyComp.fmi.toFixed(1)}</Badge>
                            <span className="text-xs">{targetBodyComp.fmiCategory}</span>
                            {targetBodyComp.fmi < bodyComp.fmi && <span className="text-xs text-green-600">↓ Improved</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">FFMI:</span>
                            <Badge className={targetBodyComp.ffmiColor}>{targetBodyComp.ffmi.toFixed(1)}</Badge>
                            <span className="text-xs">{targetBodyComp.ffmiCategory}</span>
                            {targetBodyComp.ffmi > bodyComp.ffmi && <span className="text-xs text-blue-600">↑ Improved</span>}
                          </div>
                        </div>
                      </div>

                      {/* Expected Composition Efficiency */}
                      {goalType === 'lose_fat' && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-green-800">Expected Fat Loss Efficiency</span>
                            <Badge className="bg-green-600">{Math.round(fatLossEfficiency * 100)}%</Badge>
                          </div>
                          <p className="text-green-700 text-xs">
                            Based on your settings, approximately <strong>{Math.round(fatLossEfficiency * 100)}%</strong> of weight loss 
                            is expected to come from fat, with <strong>{Math.round((1 - fatLossEfficiency) * 100)}%</strong> from lean mass.
                            This assumes adherence to adequate protein intake ({'>'}1.6g/kg) and resistance training.
                          </p>
                          <div className="mt-2 text-xs text-green-600">
                            Factors: {musclePreservation === 'preserve_all' ? '✓ Muscle preservation priority' : '◦ Some muscle loss acceptable'} 
                            {' • '}
                            {lifestyleCommitment === 'fully_committed' ? '✓ Full commitment' : lifestyleCommitment === 'moderately_committed' ? '◦ Moderate commitment' : '◦ Limited commitment'}
                            {' • '}
                            {rateOfChange <= 0.5 ? '✓ Moderate rate' : '⚠ Aggressive rate'}
                          </div>
                        </div>
                      )}

                      {goalType === 'gain_muscle' && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-blue-800">
                              {fatGainTolerance === 'maximize_muscle' ? 'Traditional Bulk' : 'Lean Bulk'} Efficiency
                            </span>
                            <Badge className="bg-blue-600">{Math.round(muscleGainEfficiency * 100)}% muscle</Badge>
                          </div>
                          
                          {fatGainTolerance === 'maximize_muscle' ? (
                            <p className="text-blue-700 text-xs">
                              <strong>Maximize Muscle Approach:</strong> Larger caloric surplus for maximum muscle growth potential.
                              Approximately <strong>{Math.round(muscleGainEfficiency * 100)}%</strong> of weight gain will be muscle, 
                              <strong>{Math.round((1 - muscleGainEfficiency) * 100)}%</strong> as fat.
                              Total muscle gained will likely be higher than a lean bulk, but requires a cut afterward.
                            </p>
                          ) : (
                            <p className="text-blue-700 text-xs">
                              <strong>Lean Bulk Approach:</strong> Controlled surplus to minimize fat gain while building muscle.
                              Approximately <strong>{Math.round(muscleGainEfficiency * 100)}%</strong> of weight gain will be muscle, 
                              only <strong>{Math.round((1 - muscleGainEfficiency) * 100)}%</strong> as fat.
                              Slower but cleaner gains - minimal cutting needed afterward.
                            </p>
                          )}
                          
                          <div className="mt-2 text-xs text-blue-600">
                            Factors: {fatGainTolerance === 'minimize_fat_gain' ? '✓ Lean bulk strategy' : '◦ Traditional bulk'} 
                            {' • '}
                            {performancePriority === 'performance_priority' ? '✓ Performance focus' : '◦ Body composition focus'} 
                            {' • '}
                            {lifestyleCommitment === 'fully_committed' ? '✓ Full commitment' : lifestyleCommitment === 'moderately_committed' ? '◦ Moderate commitment' : '◦ Limited commitment'}
                            {' • '}
                            {rateOfChange <= 0.25 ? '✓ Moderate rate' : '⚠ Faster rate'}
                          </div>
                        </div>
                      )}

                      {(goalType === 'maintain' || goalType === 'performance') && (
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-purple-800">
                              {rateOfChange === 0 
                                ? 'Recomposition Potential' 
                                : rateOfChange < 0 
                                  ? 'Slight Deficit Strategy' 
                                  : 'Slight Surplus Strategy'
                              }
                            </span>
                            <Badge className="bg-purple-600">{Math.round(recompPotential * 100)}%</Badge>
                          </div>
                          
                          {rateOfChange === 0 && (
                            <p className="text-purple-700 text-xs">
                              <strong>Body Recomposition:</strong> At maintenance calories with proper training, 
                              you can simultaneously lose fat and gain muscle. Expected rate: 
                              ~<strong>{(recompPotential * 0.15).toFixed(1)} lbs/week</strong> composition shift.
                            </p>
                          )}
                          
                          {rateOfChange < 0 && (
                            <p className="text-purple-700 text-xs">
                              <strong>Slight Deficit:</strong> Gentle caloric deficit prioritizing fat loss while 
                              maintaining (or even gaining) muscle. Expected: 
                              ~<strong>{Math.abs(maintenanceCompositionChange.weeklyFatChange).toFixed(1)} lbs fat loss</strong> and 
                              ~<strong>{maintenanceCompositionChange.weeklyMuscleChange.toFixed(1)} lbs muscle</strong> per week.
                            </p>
                          )}
                          
                          {rateOfChange > 0 && (
                            <p className="text-purple-700 text-xs">
                              <strong>Slight Surplus:</strong> Small caloric surplus for muscle building with minimal fat gain. 
                              Expected: ~<strong>{maintenanceCompositionChange.weeklyMuscleChange.toFixed(1)} lbs muscle gain</strong> and 
                              ~<strong>{maintenanceCompositionChange.weeklyFatChange.toFixed(1)} lbs fat</strong> per week.
                            </p>
                          )}
                          
                          <div className="mt-2 text-xs text-purple-600">
                            Recomp Factors: 
                            {bodyFatPercent >= 20 ? ' ✓ Good fat reserves' : ' ◦ Lower body fat'} 
                            {' • '}
                            {lifestyleCommitment === 'fully_committed' ? '✓ Full commitment' : lifestyleCommitment === 'moderately_committed' ? '◦ Moderate' : '◦ Limited'}
                            {' • '}
                            {trackingCommitment === 'committed_tracking' ? '✓ Precise tracking' : '◦ Flexible tracking'}
                            {' • '}
                            {performancePriority === 'performance_priority' ? '✓ Performance focus' : '◦ Composition focus'}
                          </div>
                          
                          <div className="mt-2 pt-2 border-t border-purple-200 text-xs text-purple-600">
                            <strong>Note:</strong> {goalType === 'performance' 
                              ? 'Performance goal focuses on athletic output. Body composition changes are secondary to training adaptations.'
                              : 'Recomposition is slower than dedicated cutting/bulking but can improve body composition without weight fluctuation.'
                            }
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                {/* Rate of Change & Timeline */}
                <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-[#c19962]" />
                        Rate & Timeline
                      </CardTitle>
                      <CardDescription>
                        Select your rate of progress and see the projected timeline
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Rate Selection */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Rate of Change</Label>
                        <RadioGroup
                          value={String(rateOfChange)}
                          onValueChange={(v) => setRateOfChange(Number(v))}
                          className="grid grid-cols-2 md:grid-cols-4 gap-2"
                        >
                          {rateOptions.map((rate) => (
                            <div key={rate.value} className="relative">
                              <RadioGroupItem value={String(rate.value)} id={`rate-${rate.value}`} className="peer sr-only" />
                              <Label
                                htmlFor={`rate-${rate.value}`}
                                className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#c19962] peer-data-[state=checked]:bg-[#c19962]/5 cursor-pointer text-center"
                              >
                                <span className="font-semibold text-sm">{rate.label}</span>
                                <span className="text-xs text-muted-foreground mt-1">{rate.description}</span>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      {/* Start Date */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Start Date</Label>
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Projected End Date</Label>
                          <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                            <span className="font-medium">
                              {timelineCalc.weeks > 0 
                                ? new Date(timelineCalc.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                : 'N/A'
                              }
                            </span>
                            {timelineCalc.weeks > 0 && (
                              <Badge variant="outline" className="border-[#c19962] text-[#c19962]">
                                {timelineCalc.weeks} weeks
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Projection Table */}
                      {projectionData.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Projected Progress</Label>
                          <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium">Week</th>
                                    <th className="px-3 py-2 text-left font-medium">Date</th>
                                    <th className="px-3 py-2 text-right font-medium">Weight</th>
                                    <th className="px-3 py-2 text-right font-medium">BF%</th>
                                    <th className="px-3 py-2 text-right font-medium">Fat Mass</th>
                                    <th className="px-3 py-2 text-right font-medium">Lean Mass</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {projectionData.map((row, idx) => (
                                    <tr 
                                      key={row.week} 
                                      className={`border-t ${idx === 0 ? 'bg-blue-50/50' : idx === projectionData.length - 1 ? 'bg-green-50/50 font-medium' : ''}`}
                                    >
                                      <td className="px-3 py-2">
                                        {row.week === 0 ? 'Start' : row.week === timelineCalc.weeks ? 'Goal' : row.week}
                                      </td>
                                      <td className="px-3 py-2">{row.date}</td>
                                      <td className="px-3 py-2 text-right">{row.weight} lbs</td>
                                      <td className="px-3 py-2 text-right">{row.bf}%</td>
                                      <td className="px-3 py-2 text-right">{row.fatMass} lbs</td>
                                      <td className="px-3 py-2 text-right">{row.ffm} lbs</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {timelineCalc.weeks > 12 && (
                              <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground text-center border-t">
                                Showing first 12 weeks + final goal. Full plan spans {timelineCalc.weeks} weeks.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Warnings/Tips */}
                      {goalType === 'lose_fat' && rateOfChange >= 0.75 && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                          <strong>Note:</strong> Aggressive rates (0.75%+ per week) may increase muscle loss risk. 
                          Consider moderate rates for better muscle preservation.
                        </div>
                      )}
                      {goalType === 'gain_muscle' && rateOfChange >= 0.5 && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                          <strong>Note:</strong> Aggressive muscle gain rates may result in more fat gain. 
                          Most natural lifters optimize with gradual-moderate rates.
                        </div>
                      )}
                      {goalType === 'maintain' && rateOfChange === 0 && recompPotential < 0.4 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                          <strong>Tip:</strong> Your recomposition potential is relatively low (already lean or limited training capacity). 
                          Consider whether a slight deficit or surplus might better serve your goals.
                        </div>
                      )}
                      {goalType === 'performance' && (
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
                          <strong>Performance Focus:</strong> Nutrition will be optimized for training performance and recovery. 
                          Body composition changes will follow naturally from training adaptations.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                {/* Save & Continue */}
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveAndContinue} 
                    size="lg"
                    className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                  >
                    Save & Continue to Schedule
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-20">
                  <ProgressSummary currentStep={1} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
