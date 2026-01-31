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
import { Progress } from '@/components/ui/progress';
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
  ChevronRight,
  Minus,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Constants
const RATE_PRESETS = {
  conservative: { label: 'Conservative', rate: 0.5, description: '~0.5% BW/week - Maximum muscle retention' },
  moderate: { label: 'Moderate', rate: 0.75, description: '~0.75% BW/week - Balanced approach' },
  aggressive: { label: 'Aggressive', rate: 1.0, description: '~1% BW/week - Faster but harder' },
  veryAggressive: { label: 'Very Aggressive', rate: 1.25, description: '~1.25% BW/week - Contest prep' },
};

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

export default function BodyCompositionPage() {
  // Current stats
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<number>(30);
  const [heightFt, setHeightFt] = useState<number>(5);
  const [heightIn, setHeightIn] = useState<number>(10);
  const [currentWeight, setCurrentWeight] = useState<number>(180);
  const [currentBodyFat, setCurrentBodyFat] = useState<number>(20);
  
  // Metabolism data
  const [rmr, setRmr] = useState<number>(1800);
  const [rmrSource, setRmrSource] = useState<'estimated' | 'measured'>('estimated');
  const [neat, setNeat] = useState<number>(400);
  const [neatLevel, setNeatLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>('light');
  const [tef, setTef] = useState<number>(10); // percentage
  const [eee, setEee] = useState<number>(300);
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState<number>(4);
  
  // Goal settings
  const [goalType, setGoalType] = useState<'body_fat' | 'weight' | 'ffmi' | 'fmi'>('body_fat');
  const [targetBodyFat, setTargetBodyFat] = useState<number>(12);
  const [targetWeight, setTargetWeight] = useState<number>(170);
  const [targetFFMI, setTargetFFMI] = useState<number>(22);
  const [targetFMI, setTargetFMI] = useState<number>(5);
  const [ratePreset, setRatePreset] = useState<string>('moderate');
  const [customRate, setCustomRate] = useState<number>(0.75);
  
  // Calculations
  const heightCm = useMemo(() => (heightFt * 12 + heightIn) * 2.54, [heightFt, heightIn]);
  const heightM = heightCm / 100;
  
  const currentMetrics = useMemo(() => {
    const weightKg = currentWeight * 0.453592;
    const fatMassLbs = currentWeight * (currentBodyFat / 100);
    const ffmLbs = currentWeight - fatMassLbs;
    const fatMassKg = fatMassLbs * 0.453592;
    const ffmKg = ffmLbs * 0.453592;
    const fmi = fatMassKg / (heightM * heightM);
    const ffmi = ffmKg / (heightM * heightM);
    const ffmiNormalized = ffmi + 6.1 * (1.8 - heightM); // Height-adjusted FFMI
    
    return {
      weightKg,
      fatMassLbs: Math.round(fatMassLbs * 10) / 10,
      ffmLbs: Math.round(ffmLbs * 10) / 10,
      fatMassKg: Math.round(fatMassKg * 10) / 10,
      ffmKg: Math.round(ffmKg * 10) / 10,
      fmi: Math.round(fmi * 10) / 10,
      ffmi: Math.round(ffmi * 10) / 10,
      ffmiNormalized: Math.round(ffmiNormalized * 10) / 10,
    };
  }, [currentWeight, currentBodyFat, heightM]);
  
  // Estimate RMR using Mifflin-St Jeor
  const estimatedRmr = useMemo(() => {
    const weightKg = currentWeight * 0.453592;
    if (gender === 'male') {
      return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
    } else {
      return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
    }
  }, [currentWeight, heightCm, age, gender]);
  
  // Update RMR when estimated
  const effectiveRmr = rmrSource === 'estimated' ? estimatedRmr : rmr;
  
  // NEAT estimates based on activity level
  const neatEstimates = useMemo(() => ({
    sedentary: Math.round(effectiveRmr * 0.15),
    light: Math.round(effectiveRmr * 0.25),
    moderate: Math.round(effectiveRmr * 0.35),
    active: Math.round(effectiveRmr * 0.45),
    very_active: Math.round(effectiveRmr * 0.55),
  }), [effectiveRmr]);
  
  const effectiveNeat = neatEstimates[neatLevel];
  
  // Calculate TDEE
  const tdee = useMemo(() => {
    const tefCals = effectiveRmr * (tef / 100);
    const dailyEee = (eee * workoutsPerWeek) / 7;
    return Math.round(effectiveRmr + effectiveNeat + tefCals + dailyEee);
  }, [effectiveRmr, effectiveNeat, tef, eee, workoutsPerWeek]);
  
  // Target calculations based on goal type
  const targetMetrics = useMemo(() => {
    let targetWeightLbs: number;
    let targetBfPct: number;
    let targetFatMassLbs: number;
    let targetFfmLbs: number;
    
    const currentFfmLbs = currentMetrics.ffmLbs;
    const currentFatMassLbs = currentMetrics.fatMassLbs;
    
    switch (goalType) {
      case 'body_fat':
        // Assume FFM stays the same, calculate new weight
        targetBfPct = targetBodyFat;
        targetFfmLbs = currentFfmLbs; // Preserve muscle
        targetFatMassLbs = (targetBfPct / (100 - targetBfPct)) * targetFfmLbs;
        targetWeightLbs = targetFfmLbs + targetFatMassLbs;
        break;
        
      case 'weight':
        // Target weight with same BF% or calculated
        targetWeightLbs = targetWeight;
        if (targetWeight < currentWeight) {
          // Losing weight - assume some muscle loss (90% from fat, 10% from muscle)
          const weightLoss = currentWeight - targetWeight;
          const fatLoss = weightLoss * 0.9;
          const muscleLoss = weightLoss * 0.1;
          targetFatMassLbs = currentFatMassLbs - fatLoss;
          targetFfmLbs = currentFfmLbs - muscleLoss;
        } else {
          // Gaining weight - assume 70% muscle, 30% fat
          const weightGain = targetWeight - currentWeight;
          const muscleGain = weightGain * 0.7;
          const fatGain = weightGain * 0.3;
          targetFatMassLbs = currentFatMassLbs + fatGain;
          targetFfmLbs = currentFfmLbs + muscleGain;
        }
        targetBfPct = (targetFatMassLbs / targetWeightLbs) * 100;
        break;
        
      case 'ffmi':
        // Calculate FFM needed for target FFMI
        const targetFfmKg = targetFFMI * (heightM * heightM);
        targetFfmLbs = targetFfmKg / 0.453592;
        // Assume body fat stays same percentage
        targetBfPct = currentBodyFat;
        targetFatMassLbs = (targetBfPct / (100 - targetBfPct)) * targetFfmLbs;
        targetWeightLbs = targetFfmLbs + targetFatMassLbs;
        break;
        
      case 'fmi':
        // Calculate fat mass needed for target FMI
        const targetFatMassKg = targetFMI * (heightM * heightM);
        targetFatMassLbs = targetFatMassKg / 0.453592;
        targetFfmLbs = currentFfmLbs; // Preserve muscle
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
  }, [goalType, targetBodyFat, targetWeight, targetFFMI, targetFMI, currentMetrics, heightM, currentWeight, currentBodyFat]);
  
  // Calculate timeline and calorie targets
  const planProjection = useMemo(() => {
    const weightChange = targetMetrics.weightLbs - currentWeight;
    const isLosing = weightChange < 0;
    const rate = ratePreset === 'custom' ? customRate : RATE_PRESETS[ratePreset as keyof typeof RATE_PRESETS]?.rate || 0.75;
    
    // Weekly weight change based on rate (% of body weight)
    const weeklyChange = currentWeight * (rate / 100);
    const weeksNeeded = Math.abs(weightChange) / weeklyChange;
    
    // Calorie adjustment (3500 cal per lb)
    const weeklyDeficitSurplus = weeklyChange * 3500;
    const dailyDeficitSurplus = weeklyDeficitSurplus / 7;
    
    // Target calories
    const targetCalories = isLosing 
      ? Math.round(tdee - dailyDeficitSurplus)
      : Math.round(tdee + dailyDeficitSurplus);
    
    // Macro targets (high protein for body comp)
    const proteinGPerLb = isLosing ? 1.2 : 1.0; // Higher protein in deficit
    const proteinG = Math.round(currentWeight * proteinGPerLb);
    const proteinCal = proteinG * 4;
    
    const fatPct = isLosing ? 0.25 : 0.30; // 25-30% from fat
    const fatCal = targetCalories * fatPct;
    const fatG = Math.round(fatCal / 9);
    
    const carbCal = targetCalories - proteinCal - fatCal;
    const carbG = Math.round(carbCal / 4);
    
    return {
      weightChange: Math.round(weightChange * 10) / 10,
      isLosing,
      weeklyChange: Math.round(weeklyChange * 100) / 100,
      weeksNeeded: Math.round(weeksNeeded),
      monthsNeeded: Math.round(weeksNeeded / 4.33 * 10) / 10,
      dailyDeficitSurplus: Math.round(dailyDeficitSurplus),
      targetCalories,
      macros: {
        protein: proteinG,
        carbs: carbG,
        fat: fatG,
        proteinPct: Math.round((proteinCal / targetCalories) * 100),
        carbsPct: Math.round((carbCal / targetCalories) * 100),
        fatPct: Math.round((fatCal / targetCalories) * 100),
      },
    };
  }, [targetMetrics, currentWeight, tdee, ratePreset, customRate]);
  
  // Get benchmark label
  const getFFMIBenchmark = (ffmi: number) => {
    return FFMI_BENCHMARKS.find(b => ffmi >= b.range[0] && ffmi < b.range[1]) || FFMI_BENCHMARKS[0];
  };
  
  const getFMIBenchmark = (fmi: number) => {
    const benchmarks = gender === 'male' ? FMI_BENCHMARKS_MALE : FMI_BENCHMARKS_FEMALE;
    return benchmarks.find(b => fmi >= b.range[0] && fmi < b.range[1]) || benchmarks[benchmarks.length - 1];
  };
  
  const currentFFMIBenchmark = getFFMIBenchmark(currentMetrics.ffmi);
  const targetFFMIBenchmark = getFFMIBenchmark(targetMetrics.ffmi);
  const currentFMIBenchmark = getFMIBenchmark(currentMetrics.fmi);
  const targetFMIBenchmark = getFMIBenchmark(targetMetrics.fmi);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#00263d] mb-2">
              Body Composition Calculator
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Visualize your transformation journey. Enter your current stats, set your goals, 
              and see exactly what it takes to achieve your ideal body composition.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Input */}
            <div className="lg:col-span-1 space-y-6">
              {/* Current Stats */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Scale className="h-5 w-5 text-[#c19962]" />
                    Current Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Gender</Label>
                      <Select value={gender} onValueChange={(v: 'male' | 'female') => setGender(v)}>
                        <SelectTrigger className="h-9">
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
                      <Input 
                        type="number" 
                        value={age} 
                        onChange={(e) => setAge(Number(e.target.value))}
                        className="h-9"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Height</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input 
                          type="number" 
                          value={heightFt} 
                          onChange={(e) => setHeightFt(Number(e.target.value))}
                          className="h-9"
                        />
                        <span className="text-xs text-muted-foreground">ft</span>
                      </div>
                      <div className="flex-1">
                        <Input 
                          type="number" 
                          value={heightIn} 
                          onChange={(e) => setHeightIn(Number(e.target.value))}
                          className="h-9"
                        />
                        <span className="text-xs text-muted-foreground">in</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Weight (lbs)</Label>
                      <Input 
                        type="number" 
                        value={currentWeight} 
                        onChange={(e) => setCurrentWeight(Number(e.target.value))}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Body Fat %</Label>
                      <Input 
                        type="number" 
                        value={currentBodyFat}
                        step="0.1"
                        onChange={(e) => setCurrentBodyFat(Number(e.target.value))}
                        className="h-9"
                      />
                    </div>
                  </div>
                  
                  {/* Current Composition Display */}
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fat Mass</span>
                      <span className="font-medium">{currentMetrics.fatMassLbs} lbs</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fat-Free Mass</span>
                      <span className="font-medium">{currentMetrics.ffmLbs} lbs</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">FMI</span>
                      <span className={`font-medium ${currentFMIBenchmark.color}`}>
                        {currentMetrics.fmi} ({currentFMIBenchmark.label})
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">FFMI</span>
                      <span className={`font-medium ${currentFFMIBenchmark.color}`}>
                        {currentMetrics.ffmi} ({currentFFMIBenchmark.label})
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metabolism */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Flame className="h-5 w-5 text-orange-500" />
                    Metabolism
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">RMR (Resting Metabolic Rate)</Label>
                      <Select value={rmrSource} onValueChange={(v: 'estimated' | 'measured') => setRmrSource(v)}>
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="estimated">Estimated</SelectItem>
                          <SelectItem value="measured">Measured</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {rmrSource === 'measured' ? (
                      <Input 
                        type="number" 
                        value={rmr} 
                        onChange={(e) => setRmr(Number(e.target.value))}
                        className="h-9"
                        placeholder="Enter measured RMR"
                      />
                    ) : (
                      <div className="h-9 px-3 py-2 bg-slate-100 rounded-md text-sm font-medium">
                        {estimatedRmr} kcal/day (Mifflin-St Jeor)
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-xs">NEAT (Non-Exercise Activity)</Label>
                    <Select value={neatLevel} onValueChange={(v: any) => setNeatLevel(v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentary (~{neatEstimates.sedentary} kcal)</SelectItem>
                        <SelectItem value="light">Light Activity (~{neatEstimates.light} kcal)</SelectItem>
                        <SelectItem value="moderate">Moderate Activity (~{neatEstimates.moderate} kcal)</SelectItem>
                        <SelectItem value="active">Active (~{neatEstimates.active} kcal)</SelectItem>
                        <SelectItem value="very_active">Very Active (~{neatEstimates.very_active} kcal)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">TEF %</Label>
                      <Input 
                        type="number" 
                        value={tef} 
                        onChange={(e) => setTef(Number(e.target.value))}
                        className="h-9"
                        min={5}
                        max={15}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">EEE/Session</Label>
                      <Input 
                        type="number" 
                        value={eee} 
                        onChange={(e) => setEee(Number(e.target.value))}
                        className="h-9"
                        placeholder="kcal"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Workouts/Week</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[workoutsPerWeek]}
                        onValueChange={([v]) => setWorkoutsPerWeek(v)}
                        min={0}
                        max={7}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-8">{workoutsPerWeek}</span>
                    </div>
                  </div>
                  
                  {/* TDEE Summary */}
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-orange-800">Total Daily Energy Expenditure</span>
                      <span className="text-xl font-bold text-orange-600">{tdee} kcal</span>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1 text-xs text-orange-700">
                      <div className="text-center">
                        <div className="font-medium">{effectiveRmr}</div>
                        <div>RMR</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{effectiveNeat}</div>
                        <div>NEAT</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{Math.round(effectiveRmr * (tef / 100))}</div>
                        <div>TEF</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{Math.round((eee * workoutsPerWeek) / 7)}</div>
                        <div>EEE</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Goals */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-[#00263d]" />
                    Goal Setting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs mb-2 block">Goal Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'body_fat', label: 'Body Fat %', icon: Activity },
                        { value: 'weight', label: 'Target Weight', icon: Scale },
                        { value: 'ffmi', label: 'Target FFMI', icon: Dumbbell },
                        { value: 'fmi', label: 'Target FMI', icon: Heart },
                      ].map((type) => (
                        <Button
                          key={type.value}
                          variant={goalType === type.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setGoalType(type.value as any)}
                          className={goalType === type.value ? 'bg-[#00263d]' : ''}
                        >
                          <type.icon className="h-3 w-3 mr-1" />
                          {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Goal Input */}
                  {goalType === 'body_fat' && (
                    <div>
                      <Label className="text-xs">Target Body Fat %</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <Slider
                          value={[targetBodyFat]}
                          onValueChange={([v]) => setTargetBodyFat(v)}
                          min={gender === 'male' ? 5 : 12}
                          max={35}
                          step={0.5}
                          className="flex-1"
                        />
                        <Input 
                          type="number" 
                          value={targetBodyFat}
                          step="0.5"
                          onChange={(e) => setTargetBodyFat(Number(e.target.value))}
                          className="h-9 w-20"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Essential</span>
                        <span>Athletic</span>
                        <span>Fitness</span>
                        <span>Average</span>
                      </div>
                    </div>
                  )}
                  
                  {goalType === 'weight' && (
                    <div>
                      <Label className="text-xs">Target Weight (lbs)</Label>
                      <Input 
                        type="number" 
                        value={targetWeight}
                        onChange={(e) => setTargetWeight(Number(e.target.value))}
                        className="h-9 mt-1"
                      />
                    </div>
                  )}
                  
                  {goalType === 'ffmi' && (
                    <div>
                      <Label className="text-xs">Target FFMI</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <Slider
                          value={[targetFFMI]}
                          onValueChange={([v]) => setTargetFFMI(v)}
                          min={16}
                          max={28}
                          step={0.5}
                          className="flex-1"
                        />
                        <Input 
                          type="number" 
                          value={targetFFMI}
                          step="0.5"
                          onChange={(e) => setTargetFFMI(Number(e.target.value))}
                          className="h-9 w-20"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Average</span>
                        <span>Above Avg</span>
                        <span>Excellent</span>
                        <span>Elite</span>
                      </div>
                    </div>
                  )}
                  
                  {goalType === 'fmi' && (
                    <div>
                      <Label className="text-xs">Target FMI</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <Slider
                          value={[targetFMI]}
                          onValueChange={([v]) => setTargetFMI(v)}
                          min={2}
                          max={15}
                          step={0.5}
                          className="flex-1"
                        />
                        <Input 
                          type="number" 
                          value={targetFMI}
                          step="0.5"
                          onChange={(e) => setTargetFMI(Number(e.target.value))}
                          className="h-9 w-20"
                        />
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Rate of Change */}
                  <div>
                    <Label className="text-xs mb-2 block">Rate of Change</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(RATE_PRESETS).map(([key, preset]) => (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={ratePreset === key ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setRatePreset(key)}
                              className={`text-xs ${ratePreset === key ? 'bg-[#c19962] hover:bg-[#a88347]' : ''}`}
                            >
                              {preset.label}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{preset.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={ratePreset === 'custom' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setRatePreset('custom')}
                          className={`text-xs ${ratePreset === 'custom' ? 'bg-[#c19962] hover:bg-[#a88347]' : ''}`}
                        >
                          Custom
                        </Button>
                        {ratePreset === 'custom' && (
                          <div className="flex items-center gap-1">
                            <Input 
                              type="number" 
                              value={customRate}
                              step="0.05"
                              onChange={(e) => setCustomRate(Number(e.target.value))}
                              className="h-8 w-20"
                            />
                            <span className="text-xs text-muted-foreground">% BW/wk</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Target Composition */}
              <Card className="border-[#c19962] border-2">
                <CardHeader className="pb-3 bg-[#c19962]/10">
                  <CardTitle className="flex items-center gap-2 text-lg text-[#00263d]">
                    <Target className="h-5 w-5 text-[#c19962]" />
                    Target Composition
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-[#00263d]">{targetMetrics.weightLbs}</div>
                      <div className="text-xs text-muted-foreground">Target Weight (lbs)</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-[#00263d]">{targetMetrics.bodyFat}%</div>
                      <div className="text-xs text-muted-foreground">Target Body Fat</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fat Mass</span>
                      <span className="font-medium">
                        {targetMetrics.fatMassLbs} lbs
                        <span className={`ml-2 text-xs ${targetMetrics.fatMassLbs < currentMetrics.fatMassLbs ? 'text-green-600' : 'text-red-600'}`}>
                          ({targetMetrics.fatMassLbs < currentMetrics.fatMassLbs ? '' : '+'}
                          {(targetMetrics.fatMassLbs - currentMetrics.fatMassLbs).toFixed(1)})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fat-Free Mass</span>
                      <span className="font-medium">
                        {targetMetrics.ffmLbs} lbs
                        <span className={`ml-2 text-xs ${targetMetrics.ffmLbs > currentMetrics.ffmLbs ? 'text-green-600' : targetMetrics.ffmLbs < currentMetrics.ffmLbs ? 'text-red-600' : 'text-muted-foreground'}`}>
                          ({targetMetrics.ffmLbs > currentMetrics.ffmLbs ? '+' : ''}
                          {(targetMetrics.ffmLbs - currentMetrics.ffmLbs).toFixed(1)})
                        </span>
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">FMI</span>
                      <Badge className={targetFMIBenchmark.bgColor + ' ' + targetFMIBenchmark.color}>
                        {targetMetrics.fmi} - {targetFMIBenchmark.label}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">FFMI</span>
                      <Badge className={targetFFMIBenchmark.bgColor + ' ' + targetFFMIBenchmark.color}>
                        {targetMetrics.ffmi} - {targetFFMIBenchmark.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Results */}
            <div className="lg:col-span-1 space-y-6">
              {/* Timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Timeline Projection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <div className="text-sm text-blue-700">Estimated Duration</div>
                      <div className="text-3xl font-bold text-blue-600">
                        {planProjection.weeksNeeded} weeks
                      </div>
                      <div className="text-sm text-blue-600">
                        (~{planProjection.monthsNeeded} months)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-blue-700">Total Change</div>
                      <div className={`text-2xl font-bold ${planProjection.isLosing ? 'text-green-600' : 'text-blue-600'}`}>
                        {planProjection.isLosing ? '' : '+'}{planProjection.weightChange} lbs
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {planProjection.weeklyChange} lbs/week
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Visualization */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Body Fat Progress</span>
                        <span>{currentBodyFat}% → {targetMetrics.bodyFat}%</span>
                      </div>
                      <div className="relative h-6 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all"
                          style={{ width: `${Math.max(5, targetMetrics.bodyFat / 35 * 100)}%` }}
                        />
                        <div 
                          className="absolute top-0 h-full w-1 bg-[#00263d] transition-all"
                          style={{ left: `${Math.max(2, currentBodyFat / 35 * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Essential</span>
                        <span>Target</span>
                        <span>Current</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>FFMI Progress</span>
                        <span>{currentMetrics.ffmi} → {targetMetrics.ffmi}</span>
                      </div>
                      <div className="relative h-6 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (targetMetrics.ffmi - 16) / 12 * 100)}%` }}
                        />
                        <div 
                          className="absolute top-0 h-full w-1 bg-[#00263d] transition-all"
                          style={{ left: `${Math.min(98, (currentMetrics.ffmi - 16) / 12 * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Nutrition Targets */}
              <Card className="border-green-300 border-2">
                <CardHeader className="pb-3 bg-green-50">
                  <CardTitle className="flex items-center gap-2 text-lg text-green-800">
                    <Zap className="h-5 w-5 text-green-600" />
                    Daily Nutrition Targets
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="text-center p-4 bg-green-100 rounded-lg">
                    <div className="text-sm text-green-700">Target Calories</div>
                    <div className="text-4xl font-bold text-green-600">
                      {planProjection.targetCalories}
                    </div>
                    <div className="text-sm text-green-600">
                      {planProjection.isLosing ? (
                        <span className="flex items-center justify-center gap-1">
                          <TrendingDown className="h-4 w-4" />
                          {planProjection.dailyDeficitSurplus} cal deficit from TDEE
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          {planProjection.dailyDeficitSurplus} cal surplus from TDEE
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Macros */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <div className="text-xs text-red-600">Protein</div>
                        <div className="text-xl font-bold text-red-700">{planProjection.macros.protein}g</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-red-600">{planProjection.macros.proteinPct}%</div>
                        <div className="text-xs text-muted-foreground">
                          {(planProjection.macros.protein / currentWeight).toFixed(2)} g/lb
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <div className="text-xs text-blue-600">Carbohydrates</div>
                        <div className="text-xl font-bold text-blue-700">{planProjection.macros.carbs}g</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-blue-600">{planProjection.macros.carbsPct}%</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <div className="text-xs text-yellow-600">Fat</div>
                        <div className="text-xl font-bold text-yellow-700">{planProjection.macros.fat}g</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-yellow-600">{planProjection.macros.fatPct}%</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Macro Distribution Visual */}
                  <div className="h-4 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-red-500 transition-all"
                      style={{ width: `${planProjection.macros.proteinPct}%` }}
                    />
                    <div 
                      className="bg-blue-500 transition-all"
                      style={{ width: `${planProjection.macros.carbsPct}%` }}
                    />
                    <div 
                      className="bg-yellow-500 transition-all"
                      style={{ width: `${planProjection.macros.fatPct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Warnings/Notes */}
              {(targetMetrics.ffmi > 25 || targetMetrics.bodyFat < (gender === 'male' ? 6 : 14)) && (
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
                            <li>• Very low body fat may impact hormones and performance</li>
                          )}
                          {planProjection.weeksNeeded > 52 && (
                            <li>• Long timeline - consider intermediate milestones</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
