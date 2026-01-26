'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  Droplets, 
  Thermometer, 
  Wind,
  Mountain,
  Activity,
  Clock,
  Zap,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Info,
  Beaker,
  Timer,
  Target,
  Lightbulb,
  Download,
  Loader2,
  FlaskConical,
  UtensilsCrossed,
  GlassWater,
  Sparkles
} from 'lucide-react';

// ============ TYPES ============

type MeasurementSystem = 'metric' | 'imperial';
type ExerciseType = 'general' | 'running' | 'cycling' | 'swimming' | 'strength' | 'hiit' | 'team_sports' | 'endurance';
type ExerciseIntensity = 'light' | 'moderate' | 'vigorous' | 'very_vigorous';
type ClothingType = 'minimal' | 'light' | 'moderate' | 'heavy';
type AcclimatizationStatus = 'not_acclimatized' | 'partially_acclimatized' | 'acclimatized';

interface ElectrolyteLoss {
  name: string;
  symbol: string;
  amount: number;
  rangeMin: number;
  rangeMax: number;
  unit: string;
  icon: string;
  color: string;
}

interface HydrationResults {
  sweatRate: number;
  totalFluidLoss: number;
  sodiumLoss: number;
  during15min: number;
  during20min: number;
  postMinimum: number;
  postOptimal: number;
  electrolytes: ElectrolyteLoss[];
  dailyBaseNeeds: number;
  temperatureImpact: 'None' | 'Low' | 'Moderate' | 'High' | 'Very High';
  humidityImpact: 'None' | 'Low' | 'Moderate' | 'High' | 'Very High';
  altitudeImpact: 'None' | 'Low' | 'Moderate' | 'High';
  calculationMethod: 'comprehensive' | 'weight_based' | 'known_rate';
}

// ============ CONSTANTS ============

const EXERCISE_TYPES: { value: ExerciseType; label: string; sweatMultiplier: number }[] = [
  { value: 'general', label: 'General Exercise', sweatMultiplier: 1.0 },
  { value: 'running', label: 'Running', sweatMultiplier: 1.3 },
  { value: 'cycling', label: 'Cycling', sweatMultiplier: 1.1 },
  { value: 'swimming', label: 'Swimming', sweatMultiplier: 0.7 },
  { value: 'strength', label: 'Strength Training', sweatMultiplier: 0.8 },
  { value: 'hiit', label: 'HIIT', sweatMultiplier: 1.4 },
  { value: 'team_sports', label: 'Team Sports', sweatMultiplier: 1.2 },
  { value: 'endurance', label: 'Endurance Sports', sweatMultiplier: 1.35 },
];

const INTENSITIES: { value: ExerciseIntensity; label: string; multiplier: number }[] = [
  { value: 'light', label: 'Light', multiplier: 0.6 },
  { value: 'moderate', label: 'Moderate', multiplier: 1.0 },
  { value: 'vigorous', label: 'Vigorous', multiplier: 1.4 },
  { value: 'very_vigorous', label: 'Very Vigorous', multiplier: 1.8 },
];

const CLOTHING_TYPES: { value: ClothingType; label: string; multiplier: number }[] = [
  { value: 'minimal', label: 'Minimal (shorts only)', multiplier: 0.9 },
  { value: 'light', label: 'Light (shorts + t-shirt)', multiplier: 1.0 },
  { value: 'moderate', label: 'Moderate (long sleeves)', multiplier: 1.1 },
  { value: 'heavy', label: 'Heavy (sweatsuit/layers)', multiplier: 1.3 },
];

const ACCLIMATIZATION: { value: AcclimatizationStatus; label: string; multiplier: number }[] = [
  { value: 'not_acclimatized', label: 'Not Acclimatized', multiplier: 1.3 },
  { value: 'partially_acclimatized', label: 'Partially Acclimatized', multiplier: 1.15 },
  { value: 'acclimatized', label: 'Fully Acclimatized', multiplier: 1.0 },
];

// ============ CALCULATION FUNCTIONS ============

function calculateSweatRate(
  weightKg: number,
  exerciseType: ExerciseType,
  intensity: ExerciseIntensity,
  tempC: number,
  humidity: number,
  clothing: ClothingType,
  acclimatization: AcclimatizationStatus,
  altitude: number
): number {
  // Base sweat rate: ~0.5-2.0 L/hr for most people
  // Starting with 0.8 L/hr as baseline for moderate exercise
  const baseSweatRate = 0.8;

  // Weight factor (heavier individuals sweat more)
  const weightFactor = weightKg / 70; // Normalized to 70kg

  // Exercise type multiplier
  const exerciseMultiplier = EXERCISE_TYPES.find(e => e.value === exerciseType)?.sweatMultiplier || 1.0;

  // Intensity multiplier
  const intensityMultiplier = INTENSITIES.find(i => i.value === intensity)?.multiplier || 1.0;

  // Temperature factor (increases significantly above 20°C)
  let tempFactor = 1.0;
  if (tempC > 35) tempFactor = 1.8;
  else if (tempC > 30) tempFactor = 1.5;
  else if (tempC > 25) tempFactor = 1.3;
  else if (tempC > 20) tempFactor = 1.1;
  else if (tempC < 10) tempFactor = 0.8;

  // Humidity factor
  let humidityFactor = 1.0;
  if (humidity > 80) humidityFactor = 1.3;
  else if (humidity > 60) humidityFactor = 1.15;
  else if (humidity < 30) humidityFactor = 0.9;

  // Clothing multiplier
  const clothingMultiplier = CLOTHING_TYPES.find(c => c.value === clothing)?.multiplier || 1.0;

  // Acclimatization multiplier
  const acclimatizationMultiplier = ACCLIMATIZATION.find(a => a.value === acclimatization)?.multiplier || 1.0;

  // Altitude factor (increases above 1500m)
  let altitudeFactor = 1.0;
  if (altitude > 3000) altitudeFactor = 1.25;
  else if (altitude > 2000) altitudeFactor = 1.15;
  else if (altitude > 1500) altitudeFactor = 1.1;

  const sweatRate = baseSweatRate *
    weightFactor *
    exerciseMultiplier *
    intensityMultiplier *
    tempFactor *
    humidityFactor *
    clothingMultiplier *
    acclimatizationMultiplier *
    altitudeFactor;

  return Math.round(sweatRate * 100) / 100;
}

function calculateFromWeightChange(
  preWeight: number,
  postWeight: number,
  fluidConsumed: number,
  durationMinutes: number
): number {
  // Sweat loss = weight loss + fluid intake
  const weightLossKg = preWeight - postWeight;
  const totalFluidLossL = weightLossKg + fluidConsumed;
  const durationHours = durationMinutes / 60;
  return totalFluidLossL / durationHours;
}

function calculateElectrolyteLosses(totalFluidLossL: number): ElectrolyteLoss[] {
  // Sweat electrolyte concentrations (per liter of sweat)
  // Values based on sports science research
  const electrolytes: ElectrolyteLoss[] = [
    {
      name: 'Sodium',
      symbol: 'Na+',
      amount: Math.round(totalFluidLossL * 600 * 10) / 10, // ~600 mg/L average
      rangeMin: Math.round(totalFluidLossL * 400 * 10) / 10,
      rangeMax: Math.round(totalFluidLossL * 800 * 10) / 10,
      unit: 'mg',
      icon: '🧂',
      color: 'bg-orange-100 text-orange-800',
    },
    {
      name: 'Chloride',
      symbol: 'Cl-',
      amount: Math.round(totalFluidLossL * 900 * 10) / 10, // ~900 mg/L
      rangeMin: Math.round(totalFluidLossL * 600 * 10) / 10,
      rangeMax: Math.round(totalFluidLossL * 1200 * 10) / 10,
      unit: 'mg',
      icon: '💧',
      color: 'bg-blue-100 text-blue-800',
    },
    {
      name: 'Potassium',
      symbol: 'K+',
      amount: Math.round(totalFluidLossL * 150 * 10) / 10, // ~150 mg/L
      rangeMin: Math.round(totalFluidLossL * 100 * 10) / 10,
      rangeMax: Math.round(totalFluidLossL * 200 * 10) / 10,
      unit: 'mg',
      icon: '🍌',
      color: 'bg-yellow-100 text-yellow-800',
    },
    {
      name: 'Calcium',
      symbol: 'Ca2+',
      amount: Math.round(totalFluidLossL * 55 * 10) / 10, // ~55 mg/L
      rangeMin: Math.round(totalFluidLossL * 30 * 10) / 10,
      rangeMax: Math.round(totalFluidLossL * 80 * 10) / 10,
      unit: 'mg',
      icon: '🦴',
      color: 'bg-gray-100 text-gray-800',
    },
    {
      name: 'Magnesium',
      symbol: 'Mg2+',
      amount: Math.round(totalFluidLossL * 9.5 * 10) / 10, // ~9.5 mg/L
      rangeMin: Math.round(totalFluidLossL * 4 * 10) / 10,
      rangeMax: Math.round(totalFluidLossL * 15 * 10) / 10,
      unit: 'mg',
      icon: '🥬',
      color: 'bg-green-100 text-green-800',
    },
    {
      name: 'Phosphorus',
      symbol: 'P',
      amount: Math.round(totalFluidLossL * 7 * 10) / 10, // ~7 mg/L
      rangeMin: Math.round(totalFluidLossL * 4 * 10) / 10,
      rangeMax: Math.round(totalFluidLossL * 10 * 10) / 10,
      unit: 'mg',
      icon: '💊',
      color: 'bg-purple-100 text-purple-800',
    },
  ];

  return electrolytes;
}

function getEnvironmentalImpact(value: number, type: 'temp' | 'humidity' | 'altitude'): 'None' | 'Low' | 'Moderate' | 'High' | 'Very High' {
  if (type === 'temp') {
    if (value < 15) return 'None';
    if (value < 22) return 'Low';
    if (value < 28) return 'Moderate';
    if (value < 35) return 'High';
    return 'Very High';
  }
  if (type === 'humidity') {
    if (value < 40) return 'Low';
    if (value < 60) return 'Moderate';
    if (value < 80) return 'High';
    return 'Very High';
  }
  if (type === 'altitude') {
    if (value < 1000) return 'None';
    if (value < 1500) return 'Low';
    if (value < 2500) return 'Moderate';
    return 'High';
  }
  return 'None';
}

// ============ COMPONENT ============

export default function HydrationCalculatorPage() {
  const router = useRouter();

  // Settings
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>('metric');
  const [advancedMode, setAdvancedMode] = useState(false);

  // Basic inputs
  const [weightKg, setWeightKg] = useState(70);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [exerciseType, setExerciseType] = useState<ExerciseType>('general');
  const [intensity, setIntensity] = useState<ExerciseIntensity>('moderate');
  const [fluidConsumedL, setFluidConsumedL] = useState(0);
  const [tempC, setTempC] = useState(20);
  const [humidity, setHumidity] = useState(50);

  // Advanced inputs
  const [altitude, setAltitude] = useState(0);
  const [clothing, setClothing] = useState<ClothingType>('light');
  const [acclimatization, setAcclimatization] = useState<AcclimatizationStatus>('acclimatized');

  // Optional precise inputs
  const [knownSweatRate, setKnownSweatRate] = useState(0);
  const [preExerciseWeight, setPreExerciseWeight] = useState(0);
  const [postExerciseWeight, setPostExerciseWeight] = useState(0);

  // Results state
  const [hasCalculated, setHasCalculated] = useState(false);
  const [results, setResults] = useState<HydrationResults | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Unit conversions
  const kgToLbs = (kg: number) => kg * 2.20462;
  const lbsToKg = (lbs: number) => lbs / 2.20462;
  const cToF = (c: number) => (c * 9/5) + 32;
  const fToC = (f: number) => (f - 32) * 5/9;
  const mToFt = (m: number) => m * 3.28084;
  const ftToM = (ft: number) => ft / 3.28084;
  const lToOz = (l: number) => l * 33.814;
  const mlToOz = (ml: number) => ml * 0.033814;

  // Calculate results function
  const calculateHydration = useCallback(() => {
    // Validation
    if (weightKg <= 0) {
      toast.error('Please enter a valid body weight');
      return;
    }
    if (durationMinutes <= 0) {
      toast.error('Please enter a valid exercise duration');
      return;
    }

    let sweatRate: number;
    let calculationMethod: 'comprehensive' | 'weight_based' | 'known_rate';

    // Priority: known sweat rate > weight-based calculation > comprehensive estimation
    if (knownSweatRate > 0) {
      sweatRate = knownSweatRate;
      calculationMethod = 'known_rate';
    } else if (preExerciseWeight > 0 && postExerciseWeight > 0 && preExerciseWeight !== postExerciseWeight) {
      sweatRate = calculateFromWeightChange(preExerciseWeight, postExerciseWeight, fluidConsumedL, durationMinutes);
      calculationMethod = 'weight_based';
    } else {
      sweatRate = calculateSweatRate(
        weightKg,
        exerciseType,
        intensity,
        tempC,
        humidity,
        clothing,
        acclimatization,
        altitude
      );
      calculationMethod = 'comprehensive';
    }

    const durationHours = durationMinutes / 60;
    const totalFluidLoss = sweatRate * durationHours;
    const sodiumLoss = Math.round(totalFluidLoss * 600); // ~600mg sodium per liter

    // During exercise hydration (mL)
    const during15min = Math.round((sweatRate * 1000) / 4); // L/hr to mL per 15 min
    const during20min = Math.round((sweatRate * 1000) / 3); // L/hr to mL per 20 min

    // Post-exercise rehydration (replace 125-150% of fluid lost)
    const postMinimum = Math.round(totalFluidLoss * 1250); // 125%
    const postOptimal = Math.round(totalFluidLoss * 1500); // 150%

    // Electrolyte losses
    const electrolytes = calculateElectrolyteLosses(totalFluidLoss);

    // Daily base fluid needs (35 mL per kg body weight)
    const dailyBaseNeeds = Math.round(weightKg * 35);

    // Environmental impacts
    const temperatureImpact = getEnvironmentalImpact(tempC, 'temp');
    const humidityImpact = getEnvironmentalImpact(humidity, 'humidity');
    const altitudeImpact = getEnvironmentalImpact(altitude, 'altitude') as 'None' | 'Low' | 'Moderate' | 'High';

    const calculatedResults: HydrationResults = {
      sweatRate: Math.round(sweatRate * 100) / 100,
      totalFluidLoss: Math.round(totalFluidLoss * 100) / 100,
      sodiumLoss,
      during15min,
      during20min,
      postMinimum,
      postOptimal,
      electrolytes,
      dailyBaseNeeds,
      temperatureImpact,
      humidityImpact,
      altitudeImpact,
      calculationMethod,
    };

    setResults(calculatedResults);
    setHasCalculated(true);
    toast.success('Hydration needs calculated!');
  }, [
    weightKg, durationMinutes, exerciseType, intensity, fluidConsumedL,
    tempC, humidity, altitude, clothing, acclimatization,
    knownSweatRate, preExerciseWeight, postExerciseWeight
  ]);

  // Download PDF
  const downloadPDF = async () => {
    if (!results) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch('/api/generate-hydration-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          inputs: {
            weightKg,
            durationMinutes,
            exerciseType: EXERCISE_TYPES.find(e => e.value === exerciseType)?.label || exerciseType,
            intensity: INTENSITIES.find(i => i.value === intensity)?.label || intensity,
            tempC,
            humidity,
            altitude,
            clothing: CLOTHING_TYPES.find(c => c.value === clothing)?.label || clothing,
            acclimatization: ACCLIMATIZATION.find(a => a.value === acclimatization)?.label || acclimatization,
          },
          measurementSystem,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hydration-plan.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'None': return 'bg-gray-100 text-gray-700';
      case 'Low': return 'bg-green-100 text-green-700';
      case 'Moderate': return 'bg-yellow-100 text-yellow-700';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Very High': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Droplets className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold">Enhanced Hydration Calculator</h1>
          </div>
          <p className="text-muted-foreground">
            Science-backed hydration calculations for optimal performance and recovery
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Measurement System</Label>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm", measurementSystem === 'metric' && 'font-medium')}>Metric</span>
                    <Switch
                      checked={measurementSystem === 'imperial'}
                      onCheckedChange={(checked) => setMeasurementSystem(checked ? 'imperial' : 'metric')}
                    />
                    <span className={cn("text-sm", measurementSystem === 'imperial' && 'font-medium')}>Imperial</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Advanced Mode</Label>
                    <p className="text-xs text-muted-foreground">Show detailed environmental factors</p>
                  </div>
                  <Switch
                    checked={advancedMode}
                    onCheckedChange={setAdvancedMode}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Basic Inputs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#c19962]" />
                  Personal & Exercise Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Body Weight ({measurementSystem === 'metric' ? 'kg' : 'lbs'})</Label>
                    <Input
                      type="number"
                      value={measurementSystem === 'metric' ? weightKg : Math.round(kgToLbs(weightKg))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setWeightKg(measurementSystem === 'metric' ? val : lbsToKg(val));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Exercise Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exercise Type</Label>
                    <Select value={exerciseType} onValueChange={(v) => setExerciseType(v as ExerciseType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXERCISE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Exercise Intensity</Label>
                    <Select value={intensity} onValueChange={(v) => setIntensity(v as ExerciseIntensity)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTENSITIES.map((int) => (
                          <SelectItem key={int.value} value={int.value}>
                            {int.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fluids Consumed During Exercise ({measurementSystem === 'metric' ? 'L' : 'fl oz'})</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={measurementSystem === 'metric' ? fluidConsumedL : Math.round(lToOz(fluidConsumedL))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setFluidConsumedL(measurementSystem === 'metric' ? val : val / 33.814);
                    }}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Temperature ({measurementSystem === 'metric' ? '°C' : '°F'})</Label>
                    <Input
                      type="number"
                      value={measurementSystem === 'metric' ? tempC : Math.round(cToF(tempC))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setTempC(measurementSystem === 'metric' ? val : fToC(val));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Humidity: {humidity}%</Label>
                    <Slider
                      min={10}
                      max={100}
                      step={5}
                      value={[humidity]}
                      onValueChange={(v) => setHumidity(v[0])}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Environmental Factors */}
            {advancedMode && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mountain className="h-5 w-5 text-[#c19962]" />
                    Advanced Environmental Factors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Altitude ({measurementSystem === 'metric' ? 'meters' : 'feet'})</Label>
                    <Input
                      type="number"
                      value={measurementSystem === 'metric' ? altitude : Math.round(mToFt(altitude))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setAltitude(measurementSystem === 'metric' ? val : ftToM(val));
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Clothing Type</Label>
                      <Select value={clothing} onValueChange={(v) => setClothing(v as ClothingType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLOTHING_TYPES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Heat Acclimatization</Label>
                      <Select value={acclimatization} onValueChange={(v) => setAcclimatization(v as AcclimatizationStatus)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCLIMATIZATION.map((a) => (
                            <SelectItem key={a.value} value={a.value}>
                              {a.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Optional Precise Measurements */}
            {advancedMode && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Beaker className="h-5 w-5 text-[#c19962]" />
                    Precise Sweat Rate (Optional)
                  </CardTitle>
                  <CardDescription>For most accurate results</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Known Sweat Rate ({measurementSystem === 'metric' ? 'L/hr' : 'fl oz/hr'}) - Optional</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={measurementSystem === 'metric' ? knownSweatRate : Math.round(lToOz(knownSweatRate))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setKnownSweatRate(measurementSystem === 'metric' ? val : val / 33.814);
                      }}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">Pre/Post Exercise Weight (Optional)</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For the most accurate sweat rate calculation - weigh yourself naked before and after exercise
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pre-Exercise Weight ({measurementSystem === 'metric' ? 'kg' : 'lbs'})</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={measurementSystem === 'metric' ? preExerciseWeight : Math.round(kgToLbs(preExerciseWeight) * 10) / 10}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setPreExerciseWeight(measurementSystem === 'metric' ? val : lbsToKg(val));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Post-Exercise Weight ({measurementSystem === 'metric' ? 'kg' : 'lbs'})</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={measurementSystem === 'metric' ? postExerciseWeight : Math.round(kgToLbs(postExerciseWeight) * 10) / 10}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setPostExerciseWeight(measurementSystem === 'metric' ? val : lbsToKg(val));
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Calculate Button */}
            <Card className="border-blue-300 bg-gradient-to-r from-blue-50 to-transparent">
              <CardContent className="pt-6">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                  onClick={calculateHydration}
                >
                  <Droplets className="mr-2 h-5 w-5" />
                  Calculate Hydration Needs
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Main Results */}
            {!hasCalculated || !results ? (
              <Card className="h-[400px] flex items-center justify-center border-dashed border-2">
                <CardContent className="text-center">
                  <Droplets className="h-16 w-16 text-blue-200 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Calculation Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Enter your information on the left, then click "Calculate Hydration Needs" to see your personalized results.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-transparent">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Droplets className="h-5 w-5 text-blue-500" />
                      Comprehensive Hydration Results
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadPDF}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
                      <p className="text-sm text-muted-foreground mb-1">Estimated Sweat Rate</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {measurementSystem === 'metric' 
                          ? `${results.sweatRate} L/hr`
                          : `${Math.round(lToOz(results.sweatRate))} fl oz/hr`}
                      </p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {results.calculationMethod === 'comprehensive' ? 'Comprehensive' : 
                            results.calculationMethod === 'weight_based' ? 'Weight-Based' : 'Known Rate'}
                      </Badge>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
                      <p className="text-sm text-muted-foreground mb-1">Total Fluid Loss</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {measurementSystem === 'metric'
                          ? `${results.totalFluidLoss} L`
                          : `${Math.round(lToOz(results.totalFluidLoss))} fl oz`}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border shadow-sm">
                      <p className="text-sm text-muted-foreground mb-1">Sodium Loss</p>
                      <p className="text-2xl font-bold text-orange-600">{results.sodiumLoss} mg</p>
                    </div>
                  </div>

                  <Separator />

                  {/* During Exercise */}
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Timer className="h-4 w-4 text-[#c19962]" />
                      During Exercise Hydration Strategy
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs text-muted-foreground">Every 15 minutes</p>
                        <p className="text-xl font-bold text-blue-700">
                          {measurementSystem === 'metric'
                            ? `${results.during15min} mL`
                            : `${Math.round(mlToOz(results.during15min))} fl oz`}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs text-muted-foreground">Every 20 minutes</p>
                        <p className="text-xl font-bold text-blue-700">
                          {measurementSystem === 'metric'
                            ? `${results.during20min} mL`
                            : `${Math.round(mlToOz(results.during20min))} fl oz`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Post Exercise */}
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-[#c19962]" />
                      Post-Exercise Rehydration Targets
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-xs text-muted-foreground">Minimum Target (125%)</p>
                        <p className="text-xl font-bold text-green-700">
                          {measurementSystem === 'metric'
                            ? `${results.postMinimum} mL`
                            : `${Math.round(mlToOz(results.postMinimum))} fl oz`}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-xs text-muted-foreground">Optimal Target (150%)</p>
                        <p className="text-xl font-bold text-green-700">
                          {measurementSystem === 'metric'
                            ? `${results.postOptimal} mL`
                            : `${Math.round(mlToOz(results.postOptimal))} fl oz`}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Electrolyte Analysis */}
            {advancedMode && hasCalculated && results && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Comprehensive Electrolyte Loss Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {results.electrolytes.map((electrolyte) => (
                      <div key={electrolyte.symbol} className={cn("p-3 rounded-lg", electrolyte.color)}>
                        <div className="flex items-center gap-2 mb-1">
                          <span>{electrolyte.icon}</span>
                          <span className="font-medium text-sm">{electrolyte.name} ({electrolyte.symbol})</span>
                        </div>
                        <p className="text-xl font-bold">{electrolyte.amount} {electrolyte.unit}</p>
                        <p className="text-xs opacity-75">
                          Range: {electrolyte.rangeMin} - {electrolyte.rangeMax} {electrolyte.unit}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Electrolyte Replacement Recommendations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  🥤 Electrolyte Replacement Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <h5 className="font-medium flex items-center gap-2 mb-2">🧂 Sodium Replacement</h5>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• <strong>During Exercise:</strong> 200-400 mg sodium per hour</li>
                      <li>• <strong>Sports Drinks:</strong> Most contain 100-200 mg/8oz</li>
                      <li>• <strong>Electrolyte Tablets:</strong> Usually 300-500 mg sodium</li>
                      <li>• <strong>Natural Options:</strong> Sea salt (1/4 tsp = ~600mg)</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <h5 className="font-medium flex items-center gap-2 mb-2">🍌 Potassium & Other Electrolytes</h5>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• <strong>Potassium:</strong> 150-300 mg/hour from food/drinks</li>
                      <li>• <strong>Magnesium:</strong> Often overlooked but important for muscle function</li>
                      <li>• <strong>Calcium:</strong> Usually adequate from normal diet</li>
                      <li>• <strong>Natural Sources:</strong> Coconut water, bananas, dates</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DIY Electrolyte Formulations */}
            {hasCalculated && results && (
              <Card className="border-[#c19962]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-[#c19962]" />
                    DIY Electrolyte Formulations
                  </CardTitle>
                  <CardDescription>Science-backed homemade alternatives to commercial sports drinks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Electrolyte Water */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <GlassWater className="h-5 w-5 text-blue-600" />
                      <h5 className="font-semibold text-blue-800">Basic Electrolyte Water</h5>
                      <Badge variant="secondary" className="text-xs">Quick & Simple</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Perfect for workouts under 60 minutes</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-blue-700 mb-1">Ingredients:</p>
                        <ul className="text-sm space-y-1">
                          <li>• 1 liter water</li>
                          <li>• 1/4 tsp sea salt (~600mg sodium)</li>
                          <li>• 1/4 tsp lite salt (~350mg potassium)</li>
                          <li>• Squeeze of lemon (optional)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-700 mb-1">Nutrition per liter:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Sodium: ~600mg</li>
                          <li>• Potassium: ~350mg</li>
                          <li>• Calories: ~0</li>
                          <li>• Cost: ~$0.05</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Performance Sports Drink */}
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-orange-600" />
                      <h5 className="font-semibold text-orange-800">Performance Sports Drink</h5>
                      <Badge variant="secondary" className="text-xs">60+ min workouts</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Includes carbs for sustained energy during longer sessions</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-orange-700 mb-1">Ingredients:</p>
                        <ul className="text-sm space-y-1">
                          <li>• 1 liter water</li>
                          <li>• 3 tbsp honey or maple syrup</li>
                          <li>• 1/4 tsp sea salt</li>
                          <li>• 1/4 tsp lite salt</li>
                          <li>• 2 tbsp fresh lemon/lime juice</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-orange-700 mb-1">Nutrition per liter:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Sodium: ~600mg</li>
                          <li>• Potassium: ~400mg</li>
                          <li>• Carbs: ~45g (6% solution)</li>
                          <li>• Calories: ~180</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Natural Coconut Recovery */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <UtensilsCrossed className="h-5 w-5 text-green-600" />
                      <h5 className="font-semibold text-green-800">Natural Coconut Recovery</h5>
                      <Badge variant="secondary" className="text-xs">Post-Workout</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Whole food approach for recovery hydration</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Ingredients:</p>
                        <ul className="text-sm space-y-1">
                          <li>• 500ml coconut water</li>
                          <li>• 500ml water</li>
                          <li>• 1/8 tsp sea salt</li>
                          <li>• 1 tbsp honey</li>
                          <li>• Pinch of magnesium powder (optional)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Nutrition per liter:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Sodium: ~400mg</li>
                          <li>• Potassium: ~600mg</li>
                          <li>• Carbs: ~30g</li>
                          <li>• Calories: ~140</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Heavy Sweater Formula */}
                  <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="h-5 w-5 text-red-600" />
                      <h5 className="font-semibold text-red-800">Heavy Sweater Formula</h5>
                      <Badge variant="secondary" className="text-xs">High Sodium</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">For those who lose significant sodium through sweat</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-1">Ingredients:</p>
                        <ul className="text-sm space-y-1">
                          <li>• 1 liter water</li>
                          <li>• 1/2 tsp sea salt (~1200mg sodium)</li>
                          <li>• 1/4 tsp lite salt</li>
                          <li>• 2 tbsp honey</li>
                          <li>• 1 tbsp apple cider vinegar</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-1">Nutrition per liter:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Sodium: ~1200mg</li>
                          <li>• Potassium: ~350mg</li>
                          <li>• Carbs: ~35g</li>
                          <li>• Calories: ~140</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span><strong>Pro Tip:</strong> Make batches ahead and store in the fridge for up to 5 days. Shake well before use. Adjust sweetness and salt to taste preference.</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Practical Hydration Strategies */}
            {hasCalculated && results && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-[#c19962]" />
                    Practical Strategies for Your {durationMinutes}-Minute {EXERCISE_TYPES.find(e => e.value === exerciseType)?.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pre-workout strategy */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <h5 className="font-medium mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      Pre-Workout (2 hours before)
                    </h5>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Drink {measurementSystem === 'metric' ? '400-600 mL' : '14-20 fl oz'} of water</li>
                      <li>• Have a small salty snack (pretzels, crackers with cheese)</li>
                      <li>• Check urine color - aim for pale yellow</li>
                    </ul>
                  </div>

                  {/* During workout strategy */}
                  <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                    <h5 className="font-medium mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      During Your Workout
                    </h5>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Set {Math.ceil(durationMinutes / 15)} timer reminders every 15 minutes</li>
                      <li>• Target {measurementSystem === 'metric' ? `${results.during15min} mL` : `${Math.round(mlToOz(results.during15min))} fl oz`} per interval</li>
                      {durationMinutes > 60 && (
                        <li>• Use an electrolyte drink (see formulations above)</li>
                      )}
                      <li>• Keep fluid at {measurementSystem === 'metric' ? '15-22°C' : '59-72°F'} for optimal absorption</li>
                    </ul>
                  </div>

                  {/* Post-workout strategy */}
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <h5 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-orange-600" />
                      Post-Workout Recovery (within 2 hours)
                    </h5>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Drink {measurementSystem === 'metric' ? `${results.postOptimal} mL` : `${Math.round(mlToOz(results.postOptimal))} fl oz`} over the next 2-4 hours</li>
                      <li>• Include sodium-rich foods (soup, salted nuts, cheese)</li>
                      <li>• Pair with carbs and protein for optimal recovery</li>
                      <li>• Monitor urine color until it returns to pale yellow</li>
                    </ul>
                  </div>

                  {/* Quick recovery foods */}
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <h5 className="font-medium mb-2 flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4 text-purple-600" />
                      Quick Recovery Food Pairings
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-medium text-purple-700">Sodium-Rich:</p>
                        <ul className="text-muted-foreground">
                          <li>• Chicken broth</li>
                          <li>• Salted nuts</li>
                          <li>• Cheese & crackers</li>
                          <li>• Pickles</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-purple-700">Potassium-Rich:</p>
                        <ul className="text-muted-foreground">
                          <li>• Banana</li>
                          <li>• Sweet potato</li>
                          <li>• Yogurt</li>
                          <li>• Avocado</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hydration Protocol */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  🎯 Personalized Hydration Protocol
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="pre-2-3">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Pre-Exercise (2-3 hours before)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-sm space-y-1 text-muted-foreground pl-6">
                        <li>• Drink 400-600 mL (14-20 fl oz)</li>
                        <li>• Include some sodium if sweating heavily</li>
                        <li>• Monitor urine color (pale yellow ideal)</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="pre-15-30">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Pre-Exercise (15-30 minutes before)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-sm space-y-1 text-muted-foreground pl-6">
                        <li>• Drink 200-300 mL (7-10 fl oz)</li>
                        <li>• Avoid overhydration before start</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="during">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        During Exercise
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-sm space-y-1 text-muted-foreground pl-6">
                        <li>• Follow calculated intervals above</li>
                        <li>• Cool fluids (15-22°C) are absorbed faster</li>
                        <li>• Include electrolytes for sessions &gt;60 minutes</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="post">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Post-Exercise
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-sm space-y-1 text-muted-foreground pl-6">
                        <li>• Replace 125-150% of fluid lost</li>
                        <li>• Include sodium to retain fluids</li>
                        <li>• Spread intake over 2-6 hours</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Advanced Analysis */}
            {advancedMode && hasCalculated && results && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    🔬 Advanced Analysis & Calculations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Daily Base Needs */}
                  <div className="p-3 bg-muted rounded-lg">
                    <h5 className="font-medium mb-1">📊 Daily Base Fluid Needs</h5>
                    <p className="text-2xl font-bold">
                      {measurementSystem === 'metric'
                        ? `${results.dailyBaseNeeds} mL/day (${(results.dailyBaseNeeds / 1000).toFixed(1)} L/day)`
                        : `${Math.round(mlToOz(results.dailyBaseNeeds))} fl oz/day`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on 35 mL/kg body weight (excludes exercise needs)
                    </p>
                  </div>

                  {/* Environmental Impact */}
                  <div className="space-y-2">
                    <h5 className="font-medium">🌍 Environmental Impact Factors</h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Temperature</p>
                        <Badge className={cn("mt-1", getImpactColor(results.temperatureImpact))}>
                          {results.temperatureImpact}
                        </Badge>
                        <p className="text-xs mt-1">{tempC}°C</p>
                      </div>
                      <div className="p-2 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Humidity</p>
                        <Badge className={cn("mt-1", getImpactColor(results.humidityImpact))}>
                          {results.humidityImpact}
                        </Badge>
                        <p className="text-xs mt-1">{humidity}%</p>
                      </div>
                      <div className="p-2 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Altitude</p>
                        <Badge className={cn("mt-1", getImpactColor(results.altitudeImpact))}>
                          {results.altitudeImpact}
                        </Badge>
                        <p className="text-xs mt-1">{altitude}m</p>
                      </div>
                    </div>
                  </div>

                  {/* Calculation Details */}
                  <div className="space-y-2">
                    <h5 className="font-medium">🧮 Calculation Details</h5>
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                      <p><strong>Method:</strong> {results.calculationMethod === 'comprehensive' ? 'Comprehensive Estimation' : results.calculationMethod === 'weight_based' ? 'Weight-Based Calculation' : 'Known Sweat Rate'}</p>
                      <p><strong>Exercise type:</strong> {EXERCISE_TYPES.find(e => e.value === exerciseType)?.label}</p>
                      <p><strong>Intensity:</strong> {INTENSITIES.find(i => i.value === intensity)?.label}</p>
                      <p><strong>Body weight factor:</strong> {(weightKg / 70).toFixed(1)}</p>
                      <p><strong>Estimated sweat rate:</strong> {results.sweatRate} L/hr</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pro Tips */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Pro Tips for Optimal Hydration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="monitoring">
                    <AccordionTrigger className="text-sm">🎯 Monitoring Hydration Status</AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• <strong>Urine color:</strong> Pale yellow is optimal</li>
                        <li>• <strong>Body weight:</strong> &lt;2% loss during exercise</li>
                        <li>• <strong>Thirst:</strong> Don't rely on it alone during exercise</li>
                        <li>• <strong>Performance:</strong> Sudden fatigue may indicate dehydration</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="testing">
                    <AccordionTrigger className="text-sm">🧪 Sweat Testing at Home</AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Weigh yourself naked before/after exercise</li>
                        <li>• Record fluid intake during session</li>
                        <li>• Calculate: (Weight loss + fluid intake) ÷ exercise hours</li>
                        <li>• Test in different conditions for accuracy</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="selection">
                    <AccordionTrigger className="text-sm">🥤 Fluid Selection Guidelines</AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• <strong>Water:</strong> Fine for &lt;60 minutes exercise</li>
                        <li>• <strong>Sports drinks:</strong> 6-8% carbs for &gt;60 minutes</li>
                        <li>• <strong>Electrolyte tablets:</strong> Good for heavy sweaters</li>
                        <li>• <strong>Natural options:</strong> Coconut water, diluted fruit juice</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="warning">
                    <AccordionTrigger className="text-sm">⚠️ Warning Signs</AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Dizziness or lightheadedness</li>
                        <li>• Rapid heartbeat</li>
                        <li>• Nausea or vomiting</li>
                        <li>• Confusion or irritability</li>
                        <li>• Muscle cramps</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  For personalized hydration strategies or medical concerns, consult with a sports medicine professional or registered dietitian. These calculations are estimates and individual needs may vary.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
