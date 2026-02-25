'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ProgressSteps } from '@/components/layout/progress-steps';
import { ProgressSummary } from '@/components/layout/progress-summary';
import { useFitomicsStore } from '@/lib/store';
import { useSaveOnLeave } from '@/hooks/use-save-on-leave';
import { toast } from 'sonner';
import { 
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
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
  Loader2,
  Shield,
  TrendingUp,
  TrendingDown,
  Flame,
  Clock,
  ClipboardList,
  Compass,
  Calendar,
  LineChart,
  AlertCircle,
  Sparkles,
  FileText,
  Trophy,
  Stethoscope,
  Utensils,
  Coffee,
  Settings2,
  Leaf,
  Moon,
  Sun,
  Briefcase,
  ChefHat,
  Package,
  Truck,
  X as XIcon,
  MapPin,
  Plus,
  Link2,
  Unlink,
  ArrowDownToLine,
  ExternalLink,
  Pill,
  Trash2,
  MessageSquare,
  StickyNote,
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import type { 
  PerformancePriority, 
  MusclePreservation, 
  FatGainTolerance, 
  LifestyleCommitment, 
  TrackingCommitment,
  WorkType,
  WorkoutType,
  WorkoutTimeSlot,
  MealPrepMethod,
  MealLocation,
  DayOfWeek,
  MealContext,
  PeriWorkoutPreference,
  SupplementEntry,
  SupplementTiming,
} from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getDefaultZoneCalories, getActivityMultiplier } from '@/lib/nutrition-calc';
import type { ActivityLevel } from '@/types';

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
    { max: 7, label: 'Slightly Elevated', color: 'bg-yellow-100 text-yellow-800' },
    { max: 9, label: 'Elevated', color: 'bg-orange-100 text-orange-800' },
    { max: Infinity, label: 'High', color: 'bg-red-100 text-red-800' },
  ],
  Female: [
    { max: 5, label: 'Extremely Lean', color: 'bg-blue-100 text-blue-800' },
    { max: 6, label: 'Lean', color: 'bg-green-100 text-green-800' },
    { max: 9, label: 'Considered Healthy', color: 'bg-emerald-100 text-emerald-800' },
    { max: 10, label: 'Slightly Elevated', color: 'bg-yellow-100 text-yellow-800' },
    { max: 13, label: 'Elevated', color: 'bg-orange-100 text-orange-800' },
    { max: Infinity, label: 'High', color: 'bg-red-100 text-red-800' },
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

// ============ SCHEDULE CONSTANTS ============

const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'office', label: 'Office/On-site' },
  { value: 'remote', label: 'Remote Work' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'shift', label: 'Shift Work' },
  { value: 'none', label: 'Not Working' },
];

const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: 'Resistance Training', label: 'Resistance Training' },
  { value: 'Cardio', label: 'Cardio' },
  { value: 'HIIT', label: 'HIIT' },
  { value: 'Yoga/Mobility', label: 'Yoga/Mobility' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Mixed', label: 'Mixed Training' },
];

const WORKOUT_TIME_SLOTS: { value: WorkoutTimeSlot; label: string }[] = [
  { value: 'early_morning', label: 'Early Morning (5-7 AM)' },
  { value: 'morning', label: 'Morning (7-10 AM)' },
  { value: 'midday', label: 'Midday (10 AM-2 PM)' },
  { value: 'afternoon', label: 'Afternoon (2-5 PM)' },
  { value: 'evening', label: 'Evening (5-8 PM)' },
  { value: 'night', label: 'Night (8-11 PM)' },
];

const MEAL_PREP_METHODS: { value: MealPrepMethod; label: string }[] = [
  { value: 'cook', label: 'Cook from scratch' },
  { value: 'leftovers', label: 'Leftovers/Pre-prepped' },
  { value: 'pickup', label: 'Pickup or takeout' },
  { value: 'delivery', label: 'Meal delivery' },
  { value: 'skip', label: 'Skip this meal' },
];

const MEAL_LOCATIONS: { value: MealLocation; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'office', label: 'Office/Work' },
  { value: 'on_the_go', label: 'On the Go' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'gym', label: 'Gym' },
];

const PREP_TIMES = ['<5 min', '5-15 min', '15-30 min', '30-60 min', '60+ min'];

const MEAL_TIME_RANGES = [
  'Early Morning (5-7 AM)',
  'Morning (7-10 AM)',
  'Late Morning (10 AM-12 PM)',
  'Midday (12-2 PM)',
  'Afternoon (2-5 PM)',
  'Evening (5-8 PM)',
  'Night (8-10 PM)',
];

// ============ PREFERENCE CONSTANTS ============

const DIETARY_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-Free', 'Dairy-Free',
  'Keto', 'Paleo', 'Low-FODMAP', 'Low-Sodium', 'Diabetic-Friendly'
];

const COMMON_ALLERGIES = [
  'Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Eggs', 
  'Milk/Dairy', 'Wheat', 'Soy', 'Sesame', 'Mustard'
];

const PROTEINS = [
  // Poultry
  'Chicken Breast', 'Chicken Thighs', 'Turkey Breast', 'Ground Turkey',
  // Seafood
  'Salmon', 'Tuna', 'Shrimp', 'Cod', 'Tilapia', 'Sardines', 'Mackerel',
  // Red Meat
  'Beef (Lean)', 'Ground Beef (90/10)', 'Bison', 'Lamb', 'Pork Tenderloin',
  // Eggs & Dairy
  'Eggs', 'Egg Whites', 'Greek Yogurt', 'Cottage Cheese', 'Skyr',
  // Plant-Based
  'Tofu', 'Tempeh', 'Seitan', 'Edamame', 'Lentils', 'Black Beans', 'Chickpeas',
  // Supplements
  'Whey Protein', 'Casein Protein', 'Plant Protein Powder'
];

const CARBS = [
  // Grains
  'White Rice', 'Brown Rice', 'Jasmine Rice', 'Quinoa', 'Oats', 'Steel Cut Oats',
  'Pasta', 'Whole Wheat Pasta', 'Couscous', 'Barley', 'Farro', 'Bulgur',
  // Bread & Wraps
  'Whole Wheat Bread', 'Sourdough', 'Ezekiel Bread', 'Tortillas', 'Pita',
  // Potatoes & Roots
  'White Potatoes', 'Sweet Potatoes', 'Yams', 'Butternut Squash',
  // Legumes
  'Black Beans', 'Kidney Beans', 'Chickpeas', 'Lentils',
  // Fruits
  'Bananas', 'Berries', 'Apples', 'Oranges', 'Dates', 'Dried Fruit'
];

const FATS = [
  // Oils
  'Olive Oil', 'Coconut Oil', 'Avocado Oil', 'MCT Oil',
  // Whole Foods
  'Avocado', 'Olives', 'Dark Chocolate',
  // Nuts
  'Almonds', 'Walnuts', 'Cashews', 'Macadamia Nuts', 'Pecans', 'Pistachios',
  // Seeds
  'Chia Seeds', 'Flax Seeds', 'Hemp Seeds', 'Pumpkin Seeds', 'Sunflower Seeds',
  // Nut/Seed Butters
  'Peanut Butter', 'Almond Butter', 'Cashew Butter', 'Tahini',
  // Dairy
  'Cheese', 'Full-Fat Yogurt', 'Butter', 'Ghee',
  // Other
  'Fatty Fish (Salmon, Mackerel)', 'Egg Yolks'
];

const CUISINES = [
  'American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Vietnamese',
  'Indian', 'Mediterranean', 'Greek', 'Middle Eastern', 'Korean', 'French',
  'Spanish', 'Brazilian', 'Caribbean', 'African', 'Fusion'
];

const FLAVOR_PROFILES = [
  'Savory/Umami', 'Sweet', 'Spicy/Hot', 'Tangy/Citrus', 'Smoky', 'Herbal/Fresh',
  'Garlicky', 'Earthy', 'Creamy', 'Bright/Acidic', 'Rich/Buttery'
];

const MICRONUTRIENTS = [
  'Iron', 'Zinc', 'Magnesium', 'Calcium', 'Potassium', 'Sodium',
  'Vitamin D', 'Vitamin B12', 'Vitamin C', 'Vitamin A', 'Folate',
  'Omega-3', 'Fiber', 'Probiotics', 'Antioxidants'
];

// Time-restricted eating presets
const FASTING_PROTOCOLS = [
  { value: 'none', label: 'No Restriction', description: 'Eat any time during the day' },
  { value: '14_10', label: '14:10', description: '14h fast, 10h eating window (beginner-friendly)' },
  { value: '16_8', label: '16:8', description: '16h fast, 8h eating window (most popular)' },
  { value: '18_6', label: '18:6', description: '18h fast, 6h eating window (intermediate)' },
  { value: '20_4', label: '20:4', description: '20h fast, 4h eating window (advanced)' },
  { value: 'custom', label: 'Custom', description: 'Set your own fasting/feeding windows' },
];

// Common supplements grouped by category
const COMMON_SUPPLEMENTS: { category: string; items: string[] }[] = [
  { category: 'Protein & Amino Acids', items: ['Whey Protein', 'Casein Protein', 'Plant Protein', 'EAA (Essential Amino Acids)', 'BCAA', 'Collagen Peptides'] },
  { category: 'Performance', items: ['Creatine Monohydrate', 'Beta-Alanine', 'Caffeine', 'Citrulline Malate', 'Pre-Workout Blend', 'Carb Powder (Cluster Dextrin/Cyclic Dextrin)'] },
  { category: 'Health & Recovery', items: ['Fish Oil / Omega-3', 'Vitamin D3', 'Magnesium', 'Zinc', 'Multivitamin', 'Probiotic', 'Ashwagandha', 'Turmeric / Curcumin'] },
  { category: 'Electrolytes & Hydration', items: ['Electrolyte Mix', 'Sodium / Salt Tabs', 'Potassium'] },
  { category: 'Digestive', items: ['Digestive Enzymes', 'Fiber Supplement', 'Glutamine'] },
  { category: 'Sleep & Stress', items: ['Melatonin', 'Magnesium Glycinate', 'Theanine', 'GABA'] },
];

const SUPPLEMENT_TIMING_OPTIONS: { value: SupplementTiming; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'pre_workout', label: 'Pre-Workout' },
  { value: 'intra_workout', label: 'Intra-Workout' },
  { value: 'post_workout', label: 'Post-Workout' },
  { value: 'with_meals', label: 'With Meals' },
  { value: 'before_bed', label: 'Before Bed' },
  { value: 'as_needed', label: 'As Needed' },
];

const PERI_WORKOUT_OPTIONS: { value: PeriWorkoutPreference; label: string; description: string }[] = [
  { value: 'full_meal', label: 'Full Meal', description: 'Solid meal 1-2h before/after' },
  { value: 'light_snack', label: 'Light Snack/Shake', description: 'Quick snack or shake 30-60 min' },
  { value: 'supplement_only', label: 'Supplement Only', description: 'EAA, protein, or carb supplement' },
  { value: 'fasted', label: 'Fasted / Delayed', description: 'No food near training window' },
  { value: 'flexible', label: 'Flexible', description: 'No strong preference' },
];

// Quick setup templates for meals
const MEAL_TEMPLATES = [
  {
    id: 'standard',
    name: 'Standard Healthy',
    description: '3 meals, 2 snacks, balanced timing',
    settings: { meals: 3, snacks: 2, distribution: 'steady', preWorkout: false, postWorkout: false, fasting: 'none' }
  },
  {
    id: 'athlete',
    name: 'Performance Athlete',
    description: '4+ meals, workout-focused timing, nutrient periodization',
    settings: { meals: 4, snacks: 2, distribution: 'workout_focused', preWorkout: true, postWorkout: true, fasting: 'none' }
  },
  {
    id: 'busy_pro',
    name: 'Busy Professional',
    description: '2-3 meals, minimal prep, flexible timing',
    settings: { meals: 2, snacks: 1, distribution: 'back_loaded', preWorkout: false, postWorkout: false, fasting: 'none' }
  },
  {
    id: 'intermittent',
    name: 'Intermittent Fasting',
    description: '16:8 protocol, 2-3 meals in eating window',
    settings: { meals: 2, snacks: 1, distribution: 'steady', preWorkout: false, postWorkout: true, fasting: '16_8' }
  },
  {
    id: 'bodybuilder',
    name: 'Bodybuilder',
    description: '5-6 meals, high frequency, protein distributed',
    settings: { meals: 5, snacks: 1, distribution: 'steady', preWorkout: true, postWorkout: true, fasting: 'none' }
  },
  {
    id: 'family',
    name: 'Family-Friendly',
    description: '3 main meals with family, flexible snacks',
    settings: { meals: 3, snacks: 2, distribution: 'steady', preWorkout: false, postWorkout: false, fasting: 'none' }
  },
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
    weeklySchedule,
    dietPreferences, 
    setUserProfile, 
    setBodyCompGoals,
    setWeeklySchedule,
    setDietPreferences,
    activeClientId,
    getActiveClient,
    saveActiveClientState
  } = useFitomicsStore();
  
  // Ensure pending saves are flushed when navigating away or closing the page
  useSaveOnLeave();
  
  // Handle hydration mismatch - wait for client-side store to be ready
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<'basics' | 'lifestyle' | 'meals' | 'preferences' | 'advanced'>('basics');
  
  // Tab navigation helpers
  const tabs = ['basics', 'lifestyle', 'meals', 'preferences', 'advanced'] as const;
  const tabLabels = {
    basics: 'Basics',
    lifestyle: 'Lifestyle',
    meals: 'Meals',
    preferences: 'Preferences',
    advanced: 'Advanced',
  };
  const currentTabIndex = tabs.indexOf(activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabs.length - 1;
  
  const goToNextTab = () => {
    if (!isLastTab) {
      setActiveTab(tabs[currentTabIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const goToPrevTab = () => {
    if (!isFirstTab) {
      setActiveTab(tabs[currentTabIndex - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
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

  // String display states for numeric inputs — allows free typing without
  // the value snapping back to a parsed number on every keystroke.
  const [ageStr, setAgeStr] = useState('30');
  const [heightFtStr, setHeightFtStr] = useState('5');
  const [heightInStr, setHeightInStr] = useState('10');
  const [weightStr, setWeightStr] = useState('180');
  const [bfStr, setBfStr] = useState('20');

  // ============ CRONOMETER INTEGRATION STATE ============
  const [cronometerConnected, setCronometerConnected] = useState(false);
  const [cronometerClients, setCronometerClients] = useState<Array<{
    client_id: number;
    name: string;
    email?: string;
    status: string;
  }>>([]);
  const [cronometerLinkOpen, setCronometerLinkOpen] = useState(false);
  const [cronometerLinkSearch, setCronometerLinkSearch] = useState('');
  const [nameInputFocused, setNameInputFocused] = useState(false);
  const [cronometerBiometrics, setCronometerBiometrics] = useState<{
    latestWeight: { value: number; unit: string; date: string } | null;
    latestBodyFat: { value: number; date: string } | null;
    latestCalories: { value: number; date: string } | null;
  } | null>(null);
  const [isFetchingBiometrics, setIsFetchingBiometrics] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Track if we've initialized local state from store (only do this ONCE)
  const hasInitializedFromStore = useRef(false);
  
  // Sync state with store after hydration - ONLY ONCE on initial load
  // This prevents store updates (from syncs) from overwriting user's edits
  useEffect(() => {
    if (isHydrated && !hasInitializedFromStore.current) {
      hasInitializedFromStore.current = true;
      console.log('[Setup] Initializing local state from store (one-time)');
      
      // User profile
      setName(userProfile.name || activeClient?.name || '');
      setGender(userProfile.gender || 'Male');
      setAge(userProfile.age || 30);
      setHeightFt(userProfile.heightFt || 5);
      setHeightIn(userProfile.heightIn ?? 10);
      setWeightLbs(userProfile.weightLbs || 180);
      setAgeStr(String(userProfile.age || 30));
      setHeightFtStr(String(userProfile.heightFt || 5));
      setHeightInStr(String(userProfile.heightIn ?? 10));
      setWeightStr(String(userProfile.weightLbs || 180));
      setBfStr(String(userProfile.bodyFatPercentage || 20));
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
      
      // Addresses - map from ClientAddress format
      if (userProfile.addresses && userProfile.addresses.length > 0) {
        setAddresses(userProfile.addresses.map(a => ({
          label: a.label || '',
          street: a.address || '',
          city: a.city || '',
          state: a.state || '',
          zipCode: a.zipCode || '',
          isDefault: a.isDefault,
        })));
      }
      
      // Metabolic assessment - RMR, body fat, zone data and activity level
      if (userProfile.metabolicAssessment) {
        const metAssess = userProfile.metabolicAssessment;
        
        // RMR settings
        if (metAssess.useMeasuredRMR !== undefined) {
          setUseMeasuredRMR(metAssess.useMeasuredRMR);
        }
        if (metAssess.measuredRMR !== undefined) {
          setMeasuredRMR(metAssess.measuredRMR);
        }
        if (metAssess.selectedRMREquations?.length) {
          setSelectedEquations(metAssess.selectedRMREquations);
        }
        if (metAssess.useAverageRMR !== undefined) {
          setUseAverageRMR(metAssess.useAverageRMR);
        }
        
        // Body fat settings
        if (metAssess.useMeasuredBF !== undefined) {
          setUseMeasuredBF(metAssess.useMeasuredBF);
        }
        if (metAssess.measuredBFPercent !== undefined) {
          setMeasuredBFPercent(metAssess.measuredBFPercent);
        }
        if (metAssess.estimatedBFPercent !== undefined) {
          setEstimatedBFPercent(metAssess.estimatedBFPercent);
        }
        
        // Zone data
        if (metAssess.hasZoneData) {
          setHasZoneData(true);
          if (metAssess.zoneCaloriesPerMin) {
            setZoneCalories(metAssess.zoneCaloriesPerMin);
          }
        }
      }
      if (userProfile.activityLevel) {
        setActivityLevel(userProfile.activityLevel);
      }
      
      // Workout settings
      if (userProfile.workoutsPerWeek !== undefined) {
        setWorkoutsPerWeek(userProfile.workoutsPerWeek);
      }
      if (userProfile.workoutDefaults) {
        const wd = userProfile.workoutDefaults;
        if (wd.type) setDefaultWorkoutType(wd.type);
        if (wd.timeSlot) setDefaultTimeSlot(wd.timeSlot);
        if (wd.duration) setDefaultDuration(wd.duration);
        if (wd.intensity) setDefaultIntensity(wd.intensity);
      }
      
      // Section notes
      if (userProfile.scheduleNotes) setScheduleNotes(userProfile.scheduleNotes);
      if (userProfile.workoutNotes) setWorkoutNotes(userProfile.workoutNotes);
      
      // Supplements
      if (userProfile.supplements?.length) setSupplements(userProfile.supplements);
      
      // Diet preferences
      if (dietPreferences.dietaryRestrictions?.length) {
        setSelectedRestrictions(dietPreferences.dietaryRestrictions);
      }
      if (dietPreferences.allergies?.length) {
        setSelectedAllergies(dietPreferences.allergies);
      }
      if (dietPreferences.preferredProteins?.length) {
        // Filter out custom proteins (those not in PROTEINS constant)
        setSelectedProteins(dietPreferences.preferredProteins.filter(p => PROTEINS.includes(p)));
        const customs = dietPreferences.preferredProteins.filter(p => !PROTEINS.includes(p));
        if (customs.length) setCustomProteins(customs.join(', '));
      }
      if (dietPreferences.preferredCarbs?.length) {
        setSelectedCarbs(dietPreferences.preferredCarbs.filter(c => CARBS.includes(c)));
        const customs = dietPreferences.preferredCarbs.filter(c => !CARBS.includes(c));
        if (customs.length) setCustomCarbs(customs.join(', '));
      }
      if (dietPreferences.preferredFats?.length) {
        setSelectedFats(dietPreferences.preferredFats.filter(f => FATS.includes(f)));
        const customs = dietPreferences.preferredFats.filter(f => !FATS.includes(f));
        if (customs.length) setCustomFats(customs.join(', '));
      }
      if (dietPreferences.cuisinePreferences?.length) {
        setSelectedCuisines(dietPreferences.cuisinePreferences);
      }
      if (dietPreferences.foodsToAvoid?.length) {
        setFoodsToAvoid(dietPreferences.foodsToAvoid.join('\n'));
      }
      if (dietPreferences.foodsToEmphasize?.length) {
        setFoodsToEmphasize(dietPreferences.foodsToEmphasize.join('\n'));
      }
      if (dietPreferences.spiceLevel !== undefined) {
        setSpiceLevel(dietPreferences.spiceLevel);
      }
      if (dietPreferences.flavorProfiles?.length) {
        setSelectedFlavors(dietPreferences.flavorProfiles);
      }
      if (dietPreferences.varietyLevel !== undefined) {
        setVarietyLevel(dietPreferences.varietyLevel);
      }
      if (dietPreferences.micronutrientFocus?.length) {
        setSelectedMicronutrients(dietPreferences.micronutrientFocus);
      }
      if (dietPreferences.budgetPreference) {
        setBudgetPreference(dietPreferences.budgetPreference as 'budget' | 'moderate' | 'flexible');
      }
      if (dietPreferences.cookingTimePreference) {
        setCookingTime(dietPreferences.cookingTimePreference as typeof cookingTime);
      }
      
      // Restore weekly schedule / lifestyle data
      // Use Monday's schedule as the default (all days should have same defaults)
      const mondaySchedule = weeklySchedule?.Monday || weeklySchedule?.monday;
      if (mondaySchedule) {
        if (mondaySchedule.wakeTime) {
          setWakeTime(mondaySchedule.wakeTime);
        }
        if (mondaySchedule.sleepTime) {
          setBedTime(mondaySchedule.sleepTime);
        }
        if (mondaySchedule.workStartTime) {
          setWorkStartTime(mondaySchedule.workStartTime);
          setWorkType('office'); // Has work times, so assume not "none"
        }
        if (mondaySchedule.workEndTime) {
          setWorkEndTime(mondaySchedule.workEndTime);
        }
        if (mondaySchedule.mealCount !== undefined) {
          setMealsPerDay(mondaySchedule.mealCount);
        }
        if (mondaySchedule.snackCount !== undefined) {
          setSnacksPerDay(mondaySchedule.snackCount);
        }
        if (mondaySchedule.mealContexts?.length) {
          setMealContexts(mondaySchedule.mealContexts);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]); // Only depend on isHydrated - run once when hydration completes

  // ============ CRONOMETER INTEGRATION ============
  // Fetch biometrics for a linked Cronometer client
  const fetchCronometerBiometrics = useCallback(async (clientId: number) => {
    setIsFetchingBiometrics(true);
    try {
      const res = await fetch(`/api/cronometer/client-biometrics?client_id=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setCronometerBiometrics({
          latestWeight: data.latestWeight || null,
          latestBodyFat: data.latestBodyFat || null,
          latestCalories: data.latestCalories || null,
        });
      }
    } catch (err) {
      console.error('[Setup] Failed to fetch Cronometer biometrics:', err);
    } finally {
      setIsFetchingBiometrics(false);
    }
  }, []);

  // On mount: check Cronometer connection & fetch client list
  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;

    const initCronometer = async () => {
      try {
        // Check connection status
        const statusRes = await fetch('/api/cronometer/status');
        if (!statusRes.ok || cancelled) return;
        const statusData = await statusRes.json();

        if (!statusData.connected) {
          setCronometerConnected(false);
          return;
        }

        setCronometerConnected(true);

        // Fetch client list for name matching
        const clientsRes = await fetch('/api/cronometer/clients');
        if (clientsRes.ok && !cancelled) {
          const clientsData = await clientsRes.json();
          setCronometerClients(clientsData.clients || []);
        }

        // If current client is already linked, fetch their biometrics
        const linked = activeClient?.cronometerClientId;
        if (linked && !cancelled) {
          fetchCronometerBiometrics(linked);
        }
      } catch (err) {
        console.error('[Setup] Cronometer init failed (non-fatal):', err);
      }
    };

    initCronometer();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]); // Run once after hydration

  // Smart name matching: filter Cronometer clients by typed name
  const cronometerNameMatches = useMemo(() => {
    if (!cronometerConnected || !name || name.length < 2) return [];
    const query = name.toLowerCase().trim();
    return cronometerClients.filter(c => {
      const cName = (c.name || '').toLowerCase();
      const cEmail = (c.email || '').toLowerCase();
      return cName.includes(query) || cEmail.includes(query);
    }).slice(0, 8); // Limit to 8 suggestions
  }, [cronometerConnected, name, cronometerClients]);

  // Helper: check if a Cronometer client is linked to ANY Fitomics profile
  const getLinkedFitomicsClientName = useCallback((cronometerClientId: number): string | null => {
    const { clients: allClients } = useFitomicsStore.getState();
    const linked = allClients.find(
      c => c.cronometerClientId === cronometerClientId && c.id !== activeClientId
    );
    return linked ? linked.name : null;
  }, [activeClientId]);

  // Link a Cronometer client to the current Fitomics profile
  const linkCronometerClient = useCallback((client: { client_id: number; name: string }) => {
    if (!activeClientId) return;
    const { updateClient } = useFitomicsStore.getState();
    updateClient(activeClientId, {
      cronometerClientId: client.client_id,
      cronometerClientName: client.name,
    });
    setCronometerLinkOpen(false);
    fetchCronometerBiometrics(client.client_id);
    toast.success(`Linked to Cronometer: ${client.name}`);
  }, [activeClientId, fetchCronometerBiometrics]);

  // Unlink Cronometer client from the current profile
  const unlinkCronometerClient = useCallback(() => {
    if (!activeClientId) return;
    const { updateClient } = useFitomicsStore.getState();
    updateClient(activeClientId, {
      cronometerClientId: undefined,
      cronometerClientName: undefined,
    });
    setCronometerBiometrics(null);
    toast.success('Unlinked from Cronometer');
  }, [activeClientId]);

  // Convert Cronometer weight to lbs if needed
  const cronometerWeightLbs = useMemo(() => {
    const w = cronometerBiometrics?.latestWeight;
    if (!w) return null;
    const unit = (w.unit || '').toLowerCase();
    if (unit === 'kg' || unit === 'kilograms') {
      return { value: Math.round(w.value * 2.20462 * 10) / 10, unit: 'lbs', date: w.date, originalUnit: w.unit, originalValue: w.value };
    }
    return { value: w.value, unit: 'lbs', date: w.date, originalUnit: w.unit, originalValue: w.value };
  }, [cronometerBiometrics]);

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

  // ============ LIFESTYLE & SCHEDULE STATE ============
  const [wakeTime, setWakeTime] = useState('07:00');
  const [bedTime, setBedTime] = useState('22:30');
  const [workType, setWorkType] = useState<WorkType>('remote');
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  
  // Workout defaults
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(4);
  const [defaultWorkoutType, setDefaultWorkoutType] = useState<WorkoutType>('Resistance Training');
  const [defaultTimeSlot, setDefaultTimeSlot] = useState<WorkoutTimeSlot>('evening');
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [defaultIntensity, setDefaultIntensity] = useState<'Low' | 'Medium' | 'High'>('High');
  
  // Zone-based calorie data (from Active Metabolic Rate testing)
  const [hasZoneData, setHasZoneData] = useState(false);
  const [zoneCalories, setZoneCalories] = useState({
    zone1: 4.0,  // Recovery/Easy
    zone2: 7.0,  // Aerobic/Base
    zone3: 10.0, // Tempo
    zone4: 13.0, // Threshold
    zone5: 16.0, // VO2max
  });
  
  // Activity level for NEAT calculation
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('Light Active (5-10k steps/day)');

  // ============ MEAL DEFAULTS STATE ============
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [snacksPerDay, setSnacksPerDay] = useState(2);
  const [defaultMealPrepMethod, setDefaultMealPrepMethod] = useState<MealPrepMethod>('cook');
  const [defaultMealLocation, setDefaultMealLocation] = useState<MealLocation>('home');
  const [defaultSnackPrepMethod, setDefaultSnackPrepMethod] = useState<MealPrepMethod>('leftovers');
  const [defaultSnackLocation, setDefaultSnackLocation] = useState<MealLocation>('home');
  const [mealContexts, setMealContexts] = useState<MealContext[]>([]);
  
  // Nutrient timing
  const [includePreWorkoutSnack, setIncludePreWorkoutSnack] = useState(true);
  const [includePostWorkoutMeal, setIncludePostWorkoutMeal] = useState(true);
  const [energyDistribution, setEnergyDistribution] = useState<'front_loaded' | 'steady' | 'back_loaded' | 'workout_focused'>('steady');
  const [preWorkoutPreference, setPreWorkoutPreference] = useState<PeriWorkoutPreference>('light_snack');
  const [postWorkoutPreference, setPostWorkoutPreference] = useState<PeriWorkoutPreference>('full_meal');
  const [periWorkoutNotes, setPeriWorkoutNotes] = useState('');
  
  // Section notes
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  
  // Supplements
  const [supplements, setSupplements] = useState<SupplementEntry[]>([]);
  const [newSupplementName, setNewSupplementName] = useState('');

  // ============ DIET PREFERENCES STATE ============
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedProteins, setSelectedProteins] = useState<string[]>([]);
  const [selectedCarbs, setSelectedCarbs] = useState<string[]>([]);
  const [selectedFats, setSelectedFats] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [foodsToAvoid, setFoodsToAvoid] = useState('');
  const [foodsToEmphasize, setFoodsToEmphasize] = useState('');
  const [customProteins, setCustomProteins] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFats, setCustomFats] = useState('');
  
  // Time-restricted eating
  const [fastingProtocol, setFastingProtocol] = useState<string>('none');
  const [feedingWindowStart, setFeedingWindowStart] = useState('12:00');
  const [feedingWindowEnd, setFeedingWindowEnd] = useState('20:00');
  const [flexibleOnWeekends, setFlexibleOnWeekends] = useState(false);
  
  // Addresses for location-based features
  const [addresses, setAddresses] = useState<Array<{ 
    label: string; 
    street: string; 
    city: string;
    state: string;
    zipCode: string;
    isDefault?: boolean;
  }>>([]);
  
  // Advanced preferences
  const [spiceLevel, setSpiceLevel] = useState(2);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [varietyLevel, setVarietyLevel] = useState(3);
  const [selectedMicronutrients, setSelectedMicronutrients] = useState<string[]>([]);
  const [budgetPreference, setBudgetPreference] = useState<'budget' | 'moderate' | 'flexible'>('moderate');
  const [cookingTime, setCookingTime] = useState<'quick' | 'short' | 'medium' | 'any'>('medium');
  
  // Helper to calculate sleep hours
  const calculateSleepHours = () => {
    const [wH, wM] = wakeTime.split(':').map(Number);
    const [bH, bM] = bedTime.split(':').map(Number);
    let wakeMinutes = wH * 60 + wM;
    const bedMinutes = bH * 60 + bM;
    if (wakeMinutes <= bedMinutes) wakeMinutes += 24 * 60;
    return ((wakeMinutes - bedMinutes) / 60).toFixed(1);
  };
  
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

  // NEAT estimate based on activity level
  // NEAT = RMR × (Activity Multiplier - 1)
  // This provides a more accurate estimate than a flat percentage
  const estimatedNEAT = useMemo(() => {
    const multiplier = getActivityMultiplier(activityLevel);
    // NEAT is the difference between total non-exercise activity and RMR
    // For a 1.25 multiplier: NEAT = RMR × 0.25 = 25% of RMR
    // This is conservative compared to traditional estimates
    return Math.round(finalRMR * (multiplier - 1));
  }, [finalRMR, activityLevel]);

  // Calculate age from DOB
  useEffect(() => {
    if (useDOB && dob) {
      const calculatedAge = calculateAge(new Date(dob));
      if (calculatedAge > 0 && calculatedAge < 120) {
        setAge(calculatedAge);
        setAgeStr(String(calculatedAge));
      }
    }
  }, [useDOB, dob]);

  // Initialize meal contexts when meal/snack count changes
  useEffect(() => {
    const contexts: MealContext[] = [];
    
    // Add meals
    for (let i = 0; i < mealsPerDay; i++) {
      const mealLabels = ['Breakfast', 'Lunch', 'Dinner', 'Meal 4', 'Meal 5', 'Meal 6'];
      const timeRanges = ['Morning (7-10 AM)', 'Midday (12-2 PM)', 'Evening (5-8 PM)', 'Night (8-10 PM)', 'Late Morning (10 AM-12 PM)', 'Afternoon (2-5 PM)'];
      contexts.push({
        id: `meal-${i + 1}`,
        label: mealLabels[i] || `Meal ${i + 1}`,
        type: 'meal',
        prepMethod: defaultMealPrepMethod,
        prepTime: '15-30 min',
        location: defaultMealLocation,
        timeRange: timeRanges[i] || 'Midday (12-2 PM)',
        isPrimary: i < 3,
      });
    }
    
    // Add snacks
    for (let i = 0; i < snacksPerDay; i++) {
      const snackTimes = ['Late Morning (10 AM-12 PM)', 'Afternoon (2-5 PM)', 'Evening (5-8 PM)', 'Night (8-10 PM)'];
      contexts.push({
        id: `snack-${i + 1}`,
        label: `Snack ${i + 1}`,
        type: 'snack',
        prepMethod: defaultSnackPrepMethod,
        prepTime: '<5 min',
        location: defaultSnackLocation,
        timeRange: snackTimes[i] || 'Afternoon (2-5 PM)',
        isPrimary: false,
      });
    }
    
    setMealContexts(contexts);
  }, [mealsPerDay, snacksPerDay, defaultMealPrepMethod, defaultMealLocation, defaultSnackPrepMethod, defaultSnackLocation]);

  // Update individual meal context
  const updateMealContext = (id: string, field: keyof MealContext, value: string | boolean) => {
    setMealContexts(prev => prev.map(ctx => 
      ctx.id === id ? { ...ctx, [field]: value } : ctx
    ));
  };

  // Get recommended goal based on body composition
  const recommendedGoal = useMemo(() => {
    const fmiCat = bodyComp.fmiCategory;
    const ffmiCat = bodyComp.ffmiCategory;
    
    if (['Elevated', 'High', 'Slightly Elevated'].includes(fmiCat)) {
      return { goal: 'lose_fat' as const, reason: `FMI is considered ${fmiCat.toLowerCase()}. Optimizing body composition recommended.` };
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
    } else if (musclePreservation === 'accept_some_loss') {
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
    
    // Save user profile with metabolic assessment and workout defaults
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
      workoutsPerWeek,
      activityLevel,
      rmr: finalRMR,
      workoutDefaults: {
        type: defaultWorkoutType,
        timeSlot: defaultTimeSlot,
        duration: defaultDuration,
        intensity: defaultIntensity,
      },
      scheduleNotes: scheduleNotes || undefined,
      workoutNotes: workoutNotes || undefined,
      supplements: supplements.length > 0 ? supplements : undefined,
      metabolicAssessment: {
        useMeasuredRMR,
        measuredRMR: useMeasuredRMR ? measuredRMR : undefined,
        selectedRMREquations: selectedEquations,
        useAverageRMR,
        calculatedRMR: finalRMR,
        useMeasuredBF,
        measuredBFPercent: useMeasuredBF ? measuredBFPercent : undefined,
        estimatedBFPercent: !useMeasuredBF ? estimatedBFPercent : undefined,
        hasZoneData,
        zoneCaloriesPerMin: hasZoneData ? zoneCalories : undefined,
      },
      addresses: addresses
        .filter(a => a.street.trim() || a.city.trim() || a.zipCode.trim())
        .map(a => ({
          label: a.label,
          address: a.street,
          city: a.city,
          state: a.state,
          zipCode: a.zipCode,
          isDefault: a.isDefault,
        })),
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
    
    // Build and save weekly schedule with defaults
    const defaultDaySchedule = {
      wakeTime,
      sleepTime: bedTime,
      workStartTime: workType !== 'none' ? workStartTime : undefined,
      workEndTime: workType !== 'none' ? workEndTime : undefined,
      workouts: [],
      mealCount: mealsPerDay,
      snackCount: snacksPerDay,
      mealContexts: mealContexts,
    };
    
    // Create schedule for each day
    const scheduleData: Record<string, typeof defaultDaySchedule> = {};
    DAYS_OF_WEEK.forEach(day => {
      scheduleData[day] = { ...defaultDaySchedule };
    });
    
    setWeeklySchedule(scheduleData);
    
    // Combine selected and custom foods
    const allProteins = [
      ...selectedProteins,
      ...customProteins.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    ];
    const allCarbs = [
      ...selectedCarbs,
      ...customCarbs.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    ];
    const allFats = [
      ...selectedFats,
      ...customFats.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    ];
    
    // Save diet preferences
    setDietPreferences({
      dietaryRestrictions: selectedRestrictions,
      allergies: selectedAllergies,
      preferredProteins: allProteins,
      preferredCarbs: allCarbs,
      preferredFats: allFats,
      cuisinePreferences: selectedCuisines,
      foodsToAvoid: foodsToAvoid.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
      foodsToEmphasize: foodsToEmphasize.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
      spiceLevel,
      flavorProfiles: selectedFlavors,
      varietyLevel,
      micronutrientFocus: selectedMicronutrients,
      budgetPreference,
      cookingTimePreference: cookingTime,
    });
    
    // CRITICAL: Persist the changes to the client object before navigating
    // Use setTimeout to ensure state updates complete first
    setTimeout(() => {
      saveActiveClientState();
      toast.success('Profile saved!');
      router.push('/planning');
    }, 100);
  };

  // Save progress without validation - allows saving incomplete profiles
  const handleSaveProgress = async () => {
    setIsSavingProgress(true);
    
    try {
      // Save whatever data is available, even without a name
      setUserProfile({
        name: name.trim() || 'Unnamed Client',
        gender,
        age,
        heightFt,
        heightIn,
        heightCm,
        weightLbs,
        weightKg,
        bodyFatPercentage: bodyFatPercent,
        workoutsPerWeek,
        activityLevel,
        rmr: finalRMR,
        workoutDefaults: {
          type: defaultWorkoutType,
          timeSlot: defaultTimeSlot,
          duration: defaultDuration,
          intensity: defaultIntensity,
        },
        scheduleNotes: scheduleNotes || undefined,
        workoutNotes: workoutNotes || undefined,
        supplements: supplements.length > 0 ? supplements : undefined,
        metabolicAssessment: {
          useMeasuredRMR,
          measuredRMR: useMeasuredRMR ? measuredRMR : undefined,
          selectedRMREquations: selectedEquations,
          useAverageRMR,
          calculatedRMR: finalRMR,
          useMeasuredBF,
          measuredBFPercent: useMeasuredBF ? measuredBFPercent : undefined,
          estimatedBFPercent: !useMeasuredBF ? estimatedBFPercent : undefined,
          hasZoneData,
          zoneCaloriesPerMin: hasZoneData ? zoneCalories : undefined,
        },
        addresses: addresses
          .filter(a => a.street.trim() || a.city.trim() || a.zipCode.trim())
          .map(a => ({
            label: a.label,
            address: a.street,
            city: a.city,
            state: a.state,
            zipCode: a.zipCode,
            isDefault: a.isDefault,
          })),
      });
      
      // Save body comp goals if any goal type is selected
      if (goalType) {
        setBodyCompGoals({
          goalType: goalType === 'performance' ? 'maintain' : goalType,
          targetWeightLbs: Math.round(targetWeightLbs * 10) / 10,
          targetBodyFat: Math.round(targetBodyFatPercent * 10) / 10,
          weeklyWeightChange: Math.round((timelineCalc.weeklyChangeLbs || 0) * 100) / 100,
          timelineWeeks: timelineCalc.weeks,
          performancePriority,
          musclePreservation,
          fatGainTolerance,
          lifestyleCommitment,
          trackingCommitment,
        });
      }
      
      // Save diet preferences
      const allProteins = [
        ...selectedProteins,
        ...customProteins.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
      ];
      const allCarbs = [
        ...selectedCarbs,
        ...customCarbs.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
      ];
      const allFats = [
        ...selectedFats,
        ...customFats.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
      ];
      
      setDietPreferences({
        dietaryRestrictions: selectedRestrictions,
        allergies: selectedAllergies,
        preferredProteins: allProteins,
        preferredCarbs: allCarbs,
        preferredFats: allFats,
        cuisinePreferences: selectedCuisines,
        foodsToAvoid: foodsToAvoid.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
        foodsToEmphasize: foodsToEmphasize.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
        spiceLevel,
        flavorProfiles: selectedFlavors,
        varietyLevel,
        micronutrientFocus: selectedMicronutrients,
        budgetPreference,
        cookingTimePreference: cookingTime,
      });
      
      // Build and save weekly schedule with defaults (lifestyle data)
      const defaultDaySchedule = {
        wakeTime,
        sleepTime: bedTime,
        workStartTime: workType !== 'none' ? workStartTime : undefined,
        workEndTime: workType !== 'none' ? workEndTime : undefined,
        workouts: [],
        mealCount: mealsPerDay,
        snackCount: snacksPerDay,
        mealContexts: mealContexts,
      };
      
      // Create schedule for each day
      const scheduleData: Record<string, typeof defaultDaySchedule> = {};
      DAYS_OF_WEEK.forEach(day => {
        scheduleData[day] = { ...defaultDaySchedule };
      });
      
      setWeeklySchedule(scheduleData);
      
      // Small delay to ensure store updates complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // CRITICAL: Persist the changes to the client object
      saveActiveClientState();
      
      // Another small delay for persistence
      await new Promise(resolve => setTimeout(resolve, 200));
      
      toast.success('Progress saved! You can continue editing anytime.');
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress. Please try again.');
    } finally {
      setIsSavingProgress(false);
    }
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
    <TooltipProvider delayDuration={100} skipDelayDuration={0}>
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="max-w-5xl mx-auto">
            <ProgressSteps currentStep={1} />
            
            {/* Collapsible Progress Summary */}
            <div className="mb-6">
              <ProgressSummary currentStep={1} collapsible defaultExpanded={false} />
            </div>
            
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold mb-2">Client Profile</h1>
              <p className="text-muted-foreground">
                {isHydrated && activeClient ? `Editing: ${activeClient.name}` : 'Enter client information and assessment'}
              </p>
            </div>

            {/* Main Content - Full Width */}
            <div className="space-y-6">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
                  <TabsList className="grid w-full grid-cols-5 mb-8 h-12 p-1">
                    <TabsTrigger value="basics" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-[#c19962] data-[state=active]:text-[#00263d]">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Basics</span>
                    </TabsTrigger>
                    <TabsTrigger value="lifestyle" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-[#c19962] data-[state=active]:text-[#00263d]">
                      <Activity className="h-4 w-4" />
                      <span className="hidden sm:inline">Lifestyle</span>
                    </TabsTrigger>
                    <TabsTrigger value="meals" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-[#c19962] data-[state=active]:text-[#00263d]">
                      <Utensils className="h-4 w-4" />
                      <span className="hidden sm:inline">Meals</span>
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-[#c19962] data-[state=active]:text-[#00263d]">
                      <Heart className="h-4 w-4" />
                      <span className="hidden sm:inline">Preferences</span>
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-[#c19962] data-[state=active]:text-[#00263d]">
                      <Settings2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Advanced</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Basics */}
                  <TabsContent value="basics" className="space-y-8">
                
                {/* Section 1: Basic Information */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5 text-[#c19962]" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Cronometer Link Banner */}
                    {cronometerConnected && (
                      <div className={cn(
                        "flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm",
                        activeClient?.cronometerClientId
                          ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                          : "bg-muted/50 border-dashed"
                      )}>
                        {activeClient?.cronometerClientId ? (
                          <>
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                              <Link2 className="h-4 w-4" />
                              <span>Linked to Cronometer: <strong>{activeClient.cronometerClientName || `Client #${activeClient.cronometerClientId}`}</strong></span>
                              {isFetchingBiometrics && <Loader2 className="h-3 w-3 animate-spin" />}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-destructive"
                              onClick={unlinkCronometerClient}
                            >
                              <Unlink className="h-3 w-3 mr-1" />
                              Unlink
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Link2 className="h-4 w-4" />
                              <span>Link this client to a Cronometer profile for weight & body fat reference data</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setCronometerLinkOpen(!cronometerLinkOpen);
                                if (cronometerLinkOpen) setCronometerLinkSearch('');
                              }}
                            >
                              {cronometerLinkOpen ? 'Cancel' : 'Link to Cronometer'}
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Cronometer Link Picker (when banner "Link" is clicked) */}
                    {cronometerConnected && cronometerLinkOpen && !activeClient?.cronometerClientId && (
                      <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-2">Select a Cronometer client to link:</p>
                        <Input
                          placeholder="Search clients..."
                          value={cronometerLinkSearch}
                          onChange={(e) => setCronometerLinkSearch(e.target.value)}
                          className="h-9 text-sm mb-2"
                          autoFocus
                        />
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {(() => {
                            const query = cronometerLinkSearch.toLowerCase().trim();
                            const filtered = cronometerClients
                              .filter(c => {
                                if (!query) return true;
                                return (c.name || '').toLowerCase().includes(query)
                                  || (c.email || '').toLowerCase().includes(query);
                              })
                              .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                            if (filtered.length === 0) {
                              return (
                                <p className="text-xs text-muted-foreground py-2 text-center">
                                  {cronometerClients.length === 0 ? 'No Cronometer clients found' : 'No matches'}
                                </p>
                              );
                            }

                            return filtered.map(c => {
                              const linkedTo = getLinkedFitomicsClientName(c.client_id);
                              return (
                                <button
                                  key={c.client_id}
                                  onClick={() => {
                                    linkCronometerClient(c);
                                    setCronometerLinkSearch('');
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-sm transition-colors",
                                    linkedTo
                                      ? "opacity-60 hover:bg-muted/50"
                                      : "hover:bg-[#c19962]/10"
                                  )}
                                >
                                  <div>
                                    <span className="font-medium">{c.name}</span>
                                    {c.email && <span className="text-xs text-muted-foreground ml-2">{c.email}</span>}
                                  </div>
                                  {linkedTo && (
                                    <Badge variant="outline" className="text-xs">Linked to {linkedTo}</Badge>
                                  )}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Name & Gender Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 relative">
                        <Label htmlFor="name" className="text-sm font-medium">Client Name</Label>
                        <Input
                          id="name"
                          ref={nameInputRef}
                          placeholder="Full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onFocus={() => {
                            setNameInputFocused(true);
                            if (cronometerConnected && !activeClient?.cronometerClientId) {
                              setCronometerLinkOpen(false); // Close manual picker if open
                            }
                          }}
                          onBlur={() => {
                            // Small delay so click events on dropdown items fire first
                            setTimeout(() => setNameInputFocused(false), 200);
                          }}
                          className="h-11"
                        />
                        {/* Smart Cronometer name match dropdown */}
                        {cronometerConnected && !activeClient?.cronometerClientId && cronometerNameMatches.length > 0 && name.length >= 2 && nameInputFocused && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
                            <div className="px-3 py-1.5 bg-muted/50 border-b">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                Matching Cronometer clients
                              </p>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {cronometerNameMatches.map(c => {
                                const linkedTo = getLinkedFitomicsClientName(c.client_id);
                                return (
                                  <button
                                    key={c.client_id}
                                    onMouseDown={(e) => {
                                      e.preventDefault(); // Prevent blur before click fires
                                      linkCronometerClient(c);
                                      setName(c.name);
                                    }}
                                    className={cn(
                                      "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                                      linkedTo
                                        ? "opacity-60 hover:bg-muted/50"
                                        : "hover:bg-[#c19962]/10"
                                    )}
                                  >
                                    <div>
                                      <span className="font-medium">{c.name}</span>
                                      {c.email && <span className="text-xs text-muted-foreground ml-2">{c.email}</span>}
                                    </div>
                                    {linkedTo ? (
                                      <Badge variant="outline" className="text-xs">Linked to {linkedTo}</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">Link</Badge>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Gender */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Gender</Label>
                        <RadioGroup
                          value={gender}
                          onValueChange={(v) => setGender(v as 'Male' | 'Female')}
                          className="flex gap-4 pt-2"
                        >
                          <div className={cn(
                            "flex items-center space-x-2 px-4 py-2 border rounded-lg cursor-pointer transition-all",
                            gender === 'Male' ? "border-[#c19962] bg-[#c19962]/10" : "hover:bg-muted/50"
                          )}>
                            <RadioGroupItem value="Male" id="male" />
                            <Label htmlFor="male" className="cursor-pointer">Male</Label>
                          </div>
                          <div className={cn(
                            "flex items-center space-x-2 px-4 py-2 border rounded-lg cursor-pointer transition-all",
                            gender === 'Female' ? "border-[#c19962] bg-[#c19962]/10" : "hover:bg-muted/50"
                          )}>
                            <RadioGroupItem value="Female" id="female" />
                            <Label htmlFor="female" className="cursor-pointer">Female</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    {/* Age, Height, Weight Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Age */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Age</Label>
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={useDOB}
                              onCheckedChange={setUseDOB}
                              id="use-dob"
                              className="scale-75"
                            />
                            <Label htmlFor="use-dob" className="text-xs text-muted-foreground cursor-pointer">
                              Use date of birth
                            </Label>
                          </div>
                        </div>
                        {useDOB ? (
                          <div className="space-y-1">
                            <Input
                              type="date"
                              value={dob}
                              onChange={(e) => setDob(e.target.value)}
                              max={new Date().toISOString().split('T')[0]}
                              className="h-11"
                            />
                            <p className="text-xs text-muted-foreground">= {age} years</p>
                          </div>
                        ) : (
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={ageStr}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setAgeStr(val);
                            }}
                            onBlur={() => {
                              const num = parseInt(ageStr);
                              if (isNaN(num) || num < 18) { setAge(18); setAgeStr('18'); }
                              else if (num > 100) { setAge(100); setAgeStr('100'); }
                              else { setAge(num); setAgeStr(String(num)); }
                            }}
                            placeholder="Age"
                            className="h-11"
                          />
                        )}
                      </div>

                      {/* Height */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Height</Label>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={heightFtStr}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setHeightFtStr(val);
                              }}
                              onBlur={() => {
                                const num = parseInt(heightFtStr);
                                if (isNaN(num) || num < 4) { setHeightFt(4); setHeightFtStr('4'); }
                                else if (num > 7) { setHeightFt(7); setHeightFtStr('7'); }
                                else { setHeightFt(num); setHeightFtStr(String(num)); }
                              }}
                              placeholder="Ft"
                              className="h-11"
                            />
                            <span className="text-xs text-muted-foreground">feet</span>
                          </div>
                          <div className="flex-1">
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={heightInStr}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setHeightInStr(val);
                              }}
                              onBlur={() => {
                                const num = parseInt(heightInStr);
                                if (isNaN(num) || heightInStr === '') { setHeightIn(0); setHeightInStr('0'); }
                                else if (num > 11) { setHeightIn(11); setHeightInStr('11'); }
                                else { setHeightIn(num); setHeightInStr(String(num)); }
                              }}
                              placeholder="In"
                              className="h-11"
                            />
                            <span className="text-xs text-muted-foreground">inches</span>
                          </div>
                          <span className="text-xs text-muted-foreground pb-1">= {heightCm.toFixed(1)} cm</span>
                        </div>
                      </div>

                      {/* Weight */}
                      <div className="space-y-2">
                        <Label htmlFor="weight" className="text-sm font-medium">Current Weight</Label>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Input
                              id="weight"
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*\.?[0-9]*"
                              value={weightStr}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                setWeightStr(val);
                              }}
                              onBlur={() => {
                                const num = parseFloat(weightStr);
                                if (isNaN(num) || num < 50) { setWeightLbs(50); setWeightStr('50'); }
                                else if (num > 500) { setWeightLbs(500); setWeightStr('500'); }
                                else { setWeightLbs(num); setWeightStr(String(num)); }
                              }}
                              placeholder="Weight"
                              className="h-11"
                            />
                            <span className="text-xs text-muted-foreground">lbs</span>
                          </div>
                          <span className="text-xs text-muted-foreground pb-1">= {weightKg.toFixed(1)} kg</span>
                        </div>
                        {/* Cronometer weight reference */}
                        {cronometerWeightLbs && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-xs text-muted-foreground">
                              Cronometer: <strong className="text-foreground">{cronometerWeightLbs.value} lbs</strong>
                              <span className="ml-1">
                                ({new Date(cronometerWeightLbs.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                              </span>
                            </p>
                            {Math.abs(cronometerWeightLbs.value - weightLbs) > 0.1 && (
                              <button
                                type="button"
                                onClick={() => { setWeightLbs(cronometerWeightLbs.value); setWeightStr(String(cronometerWeightLbs.value)); }}
                                className="inline-flex items-center gap-1 text-xs text-[#c19962] hover:text-[#a88652] font-medium"
                                title="Apply Cronometer weight"
                              >
                                <ArrowDownToLine className="h-3 w-3" />
                                Apply
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 2: Current Body Composition */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Scale className="h-5 w-5 text-[#c19962]" />
                        Body Composition
                      </CardTitle>
                      {userProfile.bodyFatPercentage && (
                        <Badge variant="outline" className="text-xs">
                          Last: {userProfile.bodyFatPercentage}% BF
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Body Fat % Toggle */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Label className="font-medium">Body Fat %</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Measured values from DEXA, BodPod, or hydrostatic weighing are more accurate. Estimates can be used for planning.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2 bg-background rounded-lg p-1">
                        <button
                          onClick={() => setUseMeasuredBF(false)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-md transition-all",
                            !useMeasuredBF ? "bg-[#c19962] text-[#00263d] font-medium" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Estimate
                        </button>
                        <button
                          onClick={() => setUseMeasuredBF(true)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-md transition-all",
                            useMeasuredBF ? "bg-[#c19962] text-[#00263d] font-medium" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Measured
                        </button>
                      </div>
                    </div>

                    {useMeasuredBF ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Measured Body Fat %</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            value={bfStr}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              setBfStr(val);
                            }}
                            onBlur={() => {
                              const num = parseFloat(bfStr);
                              if (isNaN(num) || num < 3) { setMeasuredBFPercent(3); setBfStr('3'); }
                              else if (num > 60) { setMeasuredBFPercent(60); setBfStr('60'); }
                              else { setMeasuredBFPercent(num); setBfStr(String(num)); }
                            }}
                            className="w-24 h-11"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Estimated Body Fat %</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={3}
                            max={60}
                            step={0.1}
                            value={estimatedBFPercent}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) setEstimatedBFPercent(val);
                            }}
                            onBlur={(e) => {
                              const num = parseFloat(e.target.value);
                              if (isNaN(num) || num < 3) setEstimatedBFPercent(3);
                              else if (num > 60) setEstimatedBFPercent(60);
                            }}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Visual estimate or mirror/photo-based assessment
                        </p>
                      </div>
                    )}

                    {/* Cronometer body fat reference */}
                    {cronometerBiometrics?.latestBodyFat && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          Cronometer: <strong className="text-foreground">{cronometerBiometrics.latestBodyFat.value}%</strong>
                          <span className="ml-1">
                            ({new Date(cronometerBiometrics.latestBodyFat.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                          </span>
                        </p>
                        {(() => {
                          const cronBF = cronometerBiometrics.latestBodyFat!.value;
                          const currentBF = useMeasuredBF ? measuredBFPercent : estimatedBFPercent;
                          const setter = useMeasuredBF ? setMeasuredBFPercent : setEstimatedBFPercent;
                          if (Math.abs(cronBF - currentBF) > 0.1) {
                            return (
                              <button
                                type="button"
                                onClick={() => setter(cronBF)}
                                className="inline-flex items-center gap-1 text-xs text-[#c19962] hover:text-[#a88652] font-medium"
                                title="Apply Cronometer body fat %"
                              >
                                <ArrowDownToLine className="h-3 w-3" />
                                Apply
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    <Separator />

                    {/* Body Composition Analysis */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Current Calculated Metrics
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

                {/* Section 3: Current Metabolic Assessment */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="h-5 w-5 text-[#c19962]" />
                        Metabolic Assessment
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>RMR (Resting Metabolic Rate) is the foundation for all energy expenditure calculations. Measured values are most accurate.</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                      {userProfile.rmr && (
                        <Badge variant="outline" className="text-xs">
                          Last: {userProfile.rmr} kcal
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* RMR Toggle */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Label className="font-medium">RMR Source</Label>
                      </div>
                      <div className="flex items-center gap-2 bg-background rounded-lg p-1">
                        <button
                          onClick={() => setUseMeasuredRMR(false)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-md transition-all",
                            !useMeasuredRMR ? "bg-[#c19962] text-[#00263d] font-medium" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Calculate
                        </button>
                        <button
                          onClick={() => setUseMeasuredRMR(true)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-md transition-all",
                            useMeasuredRMR ? "bg-[#c19962] text-[#00263d] font-medium" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Measured
                        </button>
                      </div>
                    </div>

                    {useMeasuredRMR ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Measured RMR</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={measuredRMR}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                setMeasuredRMR(0);
                              } else {
                                const num = parseInt(val);
                                if (!isNaN(num) && num >= 0 && num <= 5000) {
                                  setMeasuredRMR(num);
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const num = parseInt(e.target.value);
                              if (isNaN(num) || num < 800) setMeasuredRMR(800);
                              else if (num > 4000) setMeasuredRMR(4000);
                            }}
                            className="w-32 h-11"
                          />
                          <span className="text-sm text-muted-foreground">kcal/day</span>
                        </div>
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
                                      <TooltipTrigger asChild>
                                        <button type="button" className="inline-flex items-center justify-center">
                                          <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                                        </button>
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
                              <TooltipTrigger asChild>
                                <button type="button" className="inline-flex items-center justify-center">
                                  <HelpCircle className="h-4 w-4 hover:text-foreground transition-colors" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Non-Exercise Activity Thermogenesis. Based on activity level selection in Lifestyle tab.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span>~{estimatedNEAT} kcal <span className="text-xs">({activityLevel.split(' ')[0]})</span></span>
                        </div>
                        
                        <div className="flex items-center justify-between text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>TEF</span>
                            <span className="text-sm">(Thermic Effect of Food)</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="inline-flex items-center justify-center">
                                  <HelpCircle className="h-4 w-4 hover:text-foreground transition-colors" />
                                </button>
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
                              <TooltipTrigger asChild>
                                <button type="button" className="inline-flex items-center justify-center">
                                  <HelpCircle className="h-4 w-4 hover:text-foreground transition-colors" />
                                </button>
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

                {/* Section 4: Client Notes & Context */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5 text-[#c19962]" />
                      Client Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Health Markers */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-[#c19962]" />
                          <Label htmlFor="health-goals" className="text-sm font-medium">Health Considerations</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Blood pressure, cholesterol, A1C, energy, sleep, digestion, injuries, conditions</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Textarea
                          id="health-goals"
                          placeholder="Medical conditions, medications, health markers..."
                          value={healthGoals}
                          onChange={(e) => setHealthGoals(e.target.value)}
                          rows={2}
                          className="text-sm resize-none"
                        />
                      </div>

                      {/* Performance Goals */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-[#c19962]" />
                          <Label htmlFor="performance-goals" className="text-sm font-medium">Long-term Goals</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Strength PRs, competition dates, sport targets, lifestyle aspirations</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Textarea
                          id="performance-goals"
                          placeholder="Competitions, strength goals, endurance targets..."
                          value={performanceGoals}
                          onChange={(e) => setPerformanceGoals(e.target.value)}
                          rows={2}
                          className="text-sm resize-none"
                        />
                      </div>
                    </div>

                    {/* Coach Notes - Full Width */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-[#c19962]" />
                        <Label htmlFor="notes" className="text-sm font-medium">Coach Notes</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Diet history, training response, psychology, travel, stress, what works/doesn&apos;t work</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Textarea
                        id="notes"
                        placeholder="Diet history, preferences, what has worked before..."
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>

                    {/* Addresses */}
                    <div className="pt-3 border-t">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#c19962]" />
                            <Label className="text-sm font-medium">Addresses</Label>
                          </div>
                          <Badge variant="outline" className="text-xs">For delivery & travel</Badge>
                        </div>
                        
                        {addresses.map((addr, index) => (
                          <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Label (e.g., Home, Work)"
                                  value={addr.label}
                                  onChange={(e) => {
                                    const newAddresses = [...addresses];
                                    newAddresses[index].label = e.target.value;
                                    setAddresses(newAddresses);
                                  }}
                                  className="w-32 h-7 text-xs"
                                />
                                {addr.isDefault && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                                onClick={() => {
                                  setAddresses(addresses.filter((_, i) => i !== index));
                                }}
                              >
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Street Address */}
                            <Input
                              placeholder="Street address"
                              value={addr.street}
                              onChange={(e) => {
                                const newAddresses = [...addresses];
                                newAddresses[index].street = e.target.value;
                                setAddresses(newAddresses);
                              }}
                              className="text-sm h-8"
                            />
                            
                            {/* City, State, Zip Row */}
                            <div className="grid grid-cols-6 gap-2">
                              <Input
                                placeholder="City"
                                value={addr.city}
                                onChange={(e) => {
                                  const newAddresses = [...addresses];
                                  newAddresses[index].city = e.target.value;
                                  setAddresses(newAddresses);
                                }}
                                className="col-span-3 text-sm h-8"
                              />
                              <Input
                                placeholder="State"
                                value={addr.state}
                                onChange={(e) => {
                                  const newAddresses = [...addresses];
                                  newAddresses[index].state = e.target.value;
                                  setAddresses(newAddresses);
                                }}
                                className="col-span-1 text-sm h-8"
                              />
                              <Input
                                placeholder="Zip"
                                value={addr.zipCode}
                                onChange={(e) => {
                                  const newAddresses = [...addresses];
                                  newAddresses[index].zipCode = e.target.value;
                                  setAddresses(newAddresses);
                                }}
                                className="col-span-2 text-sm h-8"
                              />
                            </div>
                          </div>
                        ))}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAddresses([...addresses, { 
                              label: addresses.length === 0 ? 'Home' : '', 
                              street: '',
                              city: '',
                              state: '',
                              zipCode: '',
                              isDefault: addresses.length === 0 
                            }]);
                          }}
                          className="w-full h-8"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Address
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  </TabsContent>

                  {/* Tab 2: Lifestyle */}
                  <TabsContent value="lifestyle" className="space-y-8">
                    {/* Sleep & Work Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sleep Schedule */}
                      <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Moon className="h-5 w-5 text-[#c19962]" />
                            Sleep Schedule
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-sm font-medium">
                                <Sun className="h-4 w-4" />
                                Wake
                              </Label>
                              <Input
                                type="time"
                                value={wakeTime}
                                onChange={(e) => setWakeTime(e.target.value)}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-sm font-medium">
                                <Moon className="h-4 w-4" />
                                Bed
                              </Label>
                              <Input
                                type="time"
                                value={bedTime}
                                onChange={(e) => setBedTime(e.target.value)}
                                className="h-11"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm text-muted-foreground">Sleep Duration</span>
                            <span className="font-semibold">{calculateSleepHours()} hours</span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Work Schedule */}
                      <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Briefcase className="h-5 w-5 text-[#c19962]" />
                            Work Schedule
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Work Type</Label>
                          <Select value={workType} onValueChange={(v) => setWorkType(v as WorkType)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={4} align="start">
                              {WORK_TYPES.map(wt => (
                                <SelectItem key={wt.value} value={wt.value}>{wt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {workType !== 'none' && (
                            <div className="grid grid-cols-2 gap-4 pt-3">
                              <div className="space-y-2">
                                <Label className="text-sm">Start</Label>
                                <Input
                                  type="time"
                                  value={workStartTime}
                                  onChange={(e) => setWorkStartTime(e.target.value)}
                                  className="h-11"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">End</Label>
                                <Input
                                  type="time"
                                  value={workEndTime}
                                  onChange={(e) => setWorkEndTime(e.target.value)}
                                  className="h-11"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    </div>

                    {/* Schedule Notes */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <StickyNote className="h-3.5 w-3.5" />
                        Schedule Notes
                        <Badge variant="outline" className="text-[10px]">Optional</Badge>
                      </Label>
                      <Textarea
                        value={scheduleNotes}
                        onChange={(e) => setScheduleNotes(e.target.value)}
                        placeholder="Any relevant notes about their sleep/work routine, shift patterns, travel schedule, etc."
                        className="min-h-[60px] resize-none text-sm"
                        rows={2}
                      />
                    </div>

                    {/* Workout Defaults */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Dumbbell className="h-5 w-5 text-[#c19962]" />
                          Workout Defaults
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                          <Label className="font-medium">Workouts Per Week</Label>
                          <div className="flex items-center gap-4">
                            <Slider
                              value={[workoutsPerWeek]}
                              onValueChange={([v]) => setWorkoutsPerWeek(v)}
                              min={0}
                              max={7}
                              step={1}
                              className="w-40"
                            />
                            <Badge variant="secondary" className="min-w-[3rem] justify-center text-base font-semibold">
                              {workoutsPerWeek}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Type</Label>
                            <Select value={defaultWorkoutType} onValueChange={(v) => setDefaultWorkoutType(v as WorkoutType)}>
                              <SelectTrigger className="h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={4} align="start">
                                {WORKOUT_TYPES.map(wt => (
                                  <SelectItem key={wt.value} value={wt.value}>{wt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Time</Label>
                            <Select value={defaultTimeSlot} onValueChange={(v) => setDefaultTimeSlot(v as WorkoutTimeSlot)}>
                              <SelectTrigger className="h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={4} align="start">
                                {WORKOUT_TIME_SLOTS.map(ts => (
                                  <SelectItem key={ts.value} value={ts.value}>{ts.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Duration</Label>
                            <div className="flex items-center gap-2">
                              <Slider
                                value={[defaultDuration]}
                                onValueChange={([v]) => setDefaultDuration(v)}
                                min={15}
                                max={180}
                                step={15}
                                className="flex-1"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{defaultDuration}m</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Intensity</Label>
                            <Select value={defaultIntensity} onValueChange={(v) => setDefaultIntensity(v as 'Low' | 'Medium' | 'High')}>
                              <SelectTrigger className="h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={4} align="start">
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Daily Activity Level (for NEAT) */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Activity className="h-5 w-5 text-[#c19962]" />
                          Daily Activity Level
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>NEAT (Non-Exercise Activity Thermogenesis) is based on daily movement patterns outside of formal workouts. Conservative estimates based on Pontzer et al. (2016).</p>
                            </TooltipContent>
                          </Tooltip>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <RadioGroup
                          value={activityLevel}
                          onValueChange={(v) => setActivityLevel(v as ActivityLevel)}
                          className="grid grid-cols-2 md:grid-cols-4 gap-3"
                        >
                          <label className={cn(
                            "flex flex-col p-4 border rounded-lg cursor-pointer transition-all text-center",
                            activityLevel === 'Sedentary (0-5k steps/day)' ? 'border-[#c19962] bg-[#c19962]/5 ring-2 ring-[#c19962]' : 'hover:border-[#c19962]/50'
                          )}>
                            <RadioGroupItem value="Sedentary (0-5k steps/day)" className="sr-only" />
                            <p className="font-semibold">Sedentary</p>
                            <p className="text-xs text-muted-foreground">0-5k steps</p>
                            <p className="text-sm font-bold text-[#c19962] mt-2">~{Math.round(finalRMR * 0.08)} kcal</p>
                          </label>
                          <label className={cn(
                            "flex flex-col p-4 border rounded-lg cursor-pointer transition-all text-center",
                            activityLevel === 'Light Active (5-10k steps/day)' ? 'border-[#c19962] bg-[#c19962]/5 ring-2 ring-[#c19962]' : 'hover:border-[#c19962]/50'
                          )}>
                            <RadioGroupItem value="Light Active (5-10k steps/day)" className="sr-only" />
                            <p className="font-semibold">Light</p>
                            <p className="text-xs text-muted-foreground">5-10k steps</p>
                            <p className="text-sm font-bold text-[#c19962] mt-2">~{Math.round(finalRMR * 0.15)} kcal</p>
                          </label>
                          <label className={cn(
                            "flex flex-col p-4 border rounded-lg cursor-pointer transition-all text-center",
                            activityLevel === 'Active (10-15k steps/day)' ? 'border-[#c19962] bg-[#c19962]/5 ring-2 ring-[#c19962]' : 'hover:border-[#c19962]/50'
                          )}>
                            <RadioGroupItem value="Active (10-15k steps/day)" className="sr-only" />
                            <p className="font-semibold">Active</p>
                            <p className="text-xs text-muted-foreground">10-15k steps</p>
                            <p className="text-sm font-bold text-[#c19962] mt-2">~{Math.round(finalRMR * 0.25)} kcal</p>
                          </label>
                          <label className={cn(
                            "flex flex-col p-4 border rounded-lg cursor-pointer transition-all text-center",
                            activityLevel === 'Labor Intensive (>15k steps/day)' ? 'border-[#c19962] bg-[#c19962]/5 ring-2 ring-[#c19962]' : 'hover:border-[#c19962]/50'
                          )}>
                            <RadioGroupItem value="Labor Intensive (>15k steps/day)" className="sr-only" />
                            <p className="font-semibold">Labor</p>
                            <p className="text-xs text-muted-foreground">{'>'}15k steps</p>
                            <p className="text-sm font-bold text-[#c19962] mt-2">~{Math.round(finalRMR * 0.35)} kcal</p>
                          </label>
                        </RadioGroup>
                      </CardContent>
                    </Card>

                    {/* Workout & Activity Notes */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <StickyNote className="h-3.5 w-3.5" />
                        Workout & Activity Notes
                        <Badge variant="outline" className="text-[10px]">Optional</Badge>
                      </Label>
                      <Textarea
                        value={workoutNotes}
                        onChange={(e) => setWorkoutNotes(e.target.value)}
                        placeholder="Any relevant context about their training history, injury considerations, movement limitations, daily activity patterns, commute (walks/bikes), hobbies, etc."
                        className="min-h-[60px] resize-none text-sm"
                        rows={2}
                      />
                    </div>

                    {/* Zone-Based Calorie Data */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="h-5 w-5 text-[#c19962]" />
                          Active Metabolic Rate Testing
                          <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
                        </CardTitle>
                        <CardDescription>
                          If the client has had metabolic testing (VO2max, metabolic cart, etc.), enter the cal/min values by heart rate zone for more accurate exercise calorie calculations.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <Label className="font-medium">Has Zone-Based Calorie Data?</Label>
                            <p className="text-sm text-muted-foreground">
                              {hasZoneData ? 'Using measured values from metabolic testing' : 'Using estimated values based on body weight'}
                            </p>
                          </div>
                          <Switch
                            checked={hasZoneData}
                            onCheckedChange={(checked) => {
                              setHasZoneData(checked);
                              if (!checked) {
                                // Reset to defaults based on body weight
                                const defaults = getDefaultZoneCalories(weightKg);
                                setZoneCalories(defaults);
                              }
                            }}
                          />
                        </div>
                        
                        {hasZoneData && (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Enter the cal/min values from the metabolic test results for each heart rate zone:
                            </p>
                            
                            <div className="grid grid-cols-5 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs text-center block">
                                  Zone 1
                                  <span className="block text-muted-foreground font-normal">{'<'}60% HR</span>
                                </Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="1"
                                  max="30"
                                  value={zoneCalories.zone1}
                                  onChange={(e) => setZoneCalories({
                                    ...zoneCalories,
                                    zone1: parseFloat(e.target.value) || 4
                                  })}
                                  className="text-center"
                                />
                                <p className="text-[10px] text-muted-foreground text-center">cal/min</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-center block">
                                  Zone 2
                                  <span className="block text-muted-foreground font-normal">60-70% HR</span>
                                </Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="1"
                                  max="30"
                                  value={zoneCalories.zone2}
                                  onChange={(e) => setZoneCalories({
                                    ...zoneCalories,
                                    zone2: parseFloat(e.target.value) || 7
                                  })}
                                  className="text-center"
                                />
                                <p className="text-[10px] text-muted-foreground text-center">cal/min</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-center block">
                                  Zone 3
                                  <span className="block text-muted-foreground font-normal">70-80% HR</span>
                                </Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="1"
                                  max="30"
                                  value={zoneCalories.zone3}
                                  onChange={(e) => setZoneCalories({
                                    ...zoneCalories,
                                    zone3: parseFloat(e.target.value) || 10
                                  })}
                                  className="text-center"
                                />
                                <p className="text-[10px] text-muted-foreground text-center">cal/min</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-center block">
                                  Zone 4
                                  <span className="block text-muted-foreground font-normal">80-90% HR</span>
                                </Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="1"
                                  max="30"
                                  value={zoneCalories.zone4}
                                  onChange={(e) => setZoneCalories({
                                    ...zoneCalories,
                                    zone4: parseFloat(e.target.value) || 13
                                  })}
                                  className="text-center"
                                />
                                <p className="text-[10px] text-muted-foreground text-center">cal/min</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-center block">
                                  Zone 5
                                  <span className="block text-muted-foreground font-normal">90%+ HR</span>
                                </Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="1"
                                  max="30"
                                  value={zoneCalories.zone5}
                                  onChange={(e) => setZoneCalories({
                                    ...zoneCalories,
                                    zone5: parseFloat(e.target.value) || 16
                                  })}
                                  className="text-center"
                                />
                                <p className="text-[10px] text-muted-foreground text-center">cal/min</p>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-xs text-green-800">
                                <strong>Tip:</strong> These values can be found on metabolic test reports (VO2max testing, metabolic cart analysis). 
                                Zone-based data significantly improves the accuracy of Exercise Energy Expenditure (EEE) calculations.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {!hasZoneData && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground">
                              <strong>Default Estimates (based on {Math.round(weightKg)} kg body weight):</strong>
                              <br />
                              Zone 1: {getDefaultZoneCalories(weightKg).zone1} cal/min • 
                              Zone 2: {getDefaultZoneCalories(weightKg).zone2} cal/min • 
                              Zone 3: {getDefaultZoneCalories(weightKg).zone3} cal/min • 
                              Zone 4: {getDefaultZoneCalories(weightKg).zone4} cal/min • 
                              Zone 5: {getDefaultZoneCalories(weightKg).zone5} cal/min
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                  </TabsContent>

                  {/* Tab 3: Meals */}
                  <TabsContent value="meals" className="space-y-8">
                    {/* Quick Setup Presets */}
                    <Card className="border-0 shadow-sm bg-gradient-to-r from-[#c19962]/5 to-transparent">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-[#c19962]" />
                          Quick Setup
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {MEAL_TEMPLATES.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => {
                                setMealsPerDay(template.settings.meals);
                                setSnacksPerDay(template.settings.snacks);
                                setEnergyDistribution(template.settings.distribution as typeof energyDistribution);
                                setIncludePreWorkoutSnack(template.settings.preWorkout);
                                setIncludePostWorkoutMeal(template.settings.postWorkout);
                                setFastingProtocol(template.settings.fasting);
                                if (template.settings.fasting === '16_8') {
                                  setFeedingWindowStart('12:00');
                                  setFeedingWindowEnd('20:00');
                                }
                              }}
                              className="p-3 text-left border rounded-lg hover:border-[#c19962] hover:bg-[#c19962]/5 transition-all"
                            >
                              <p className="font-medium text-sm">{template.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Meal Structure */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Utensils className="h-5 w-5 text-[#c19962]" />
                          Daily Meal Structure
                        </CardTitle>
                        <CardDescription>
                          Affects how macros are distributed and meal complexity. More meals = smaller portions, better for muscle gain. Fewer meals = larger portions, often easier for fat loss.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Meals Per Day</Label>
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[mealsPerDay]}
                                onValueChange={([v]) => setMealsPerDay(v)}
                                min={2}
                                max={6}
                                step={1}
                                className="flex-1"
                              />
                              <Badge variant="secondary" className="min-w-[3rem] justify-center text-lg">
                                {mealsPerDay}
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Snacks Per Day</Label>
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[snacksPerDay]}
                                onValueChange={([v]) => setSnacksPerDay(v)}
                                min={0}
                                max={4}
                                step={1}
                                className="flex-1"
                              />
                              <Badge variant="secondary" className="min-w-[3rem] justify-center text-lg">
                                {snacksPerDay}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-sm flex items-center justify-between">
                          <div>
                            <span className="text-muted-foreground">Total eating occasions: </span>
                            <span className="font-semibold">{mealsPerDay + snacksPerDay} per day</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            ~{Math.round(100 / (mealsPerDay + snacksPerDay))}% calories each
                          </Badge>
                        </div>

                        <Separator />

                        {/* Individual Meal Settings - moved here for natural conversation flow */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Individual Meal Settings</Label>
                            <Badge variant="outline" className="text-xs">Optional</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Expand each meal to customize settings and add notes about what the client typically does for that meal.
                          </p>
                          
                          <Accordion type="multiple" className="w-full">
                            {mealContexts.map((meal) => (
                              <AccordionItem key={meal.id} value={meal.id} className="border rounded-lg mb-2 px-3">
                                <AccordionTrigger className="hover:no-underline py-3">
                                  <div className="flex items-center gap-3 text-left">
                                    <div className={cn(
                                      "p-1.5 rounded",
                                      meal.type === 'meal' ? "bg-[#c19962]/20" : "bg-muted"
                                    )}>
                                      {meal.type === 'meal' ? (
                                        <Utensils className="h-3.5 w-3.5 text-[#c19962]" />
                                      ) : (
                                        <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div>
                                      <span className="font-medium text-sm">{meal.label}</span>
                                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <span>{MEAL_PREP_METHODS.find(m => m.value === meal.prepMethod)?.label}</span>
                                        <span>•</span>
                                        <span>{meal.timeRange}</span>
                                        <span>•</span>
                                        <span>{MEAL_LOCATIONS.find(l => l.value === meal.location)?.label}</span>
                                        {meal.clientNotes && (
                                          <>
                                            <span>•</span>
                                            <MessageSquare className="h-2.5 w-2.5" />
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-4 pt-2 space-y-3">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="space-y-1.5">
                                      <Label className="text-xs text-muted-foreground">Prep Method</Label>
                                      <Select 
                                        value={meal.prepMethod}
                                        onValueChange={(v) => updateMealContext(meal.id, 'prepMethod', v)}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={4} align="start">
                                          {MEAL_PREP_METHODS.map((method) => (
                                            <SelectItem key={method.value} value={method.value} className="text-xs">
                                              {method.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs text-muted-foreground">Prep Time</Label>
                                      <Select 
                                        value={meal.prepTime}
                                        onValueChange={(v) => updateMealContext(meal.id, 'prepTime', v)}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={4} align="start">
                                          {PREP_TIMES.map((time) => (
                                            <SelectItem key={time} value={time} className="text-xs">{time}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs text-muted-foreground">Location</Label>
                                      <Select 
                                        value={meal.location}
                                        onValueChange={(v) => updateMealContext(meal.id, 'location', v)}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={4} align="start">
                                          {MEAL_LOCATIONS.map((loc) => (
                                            <SelectItem key={loc.value} value={loc.value} className="text-xs">
                                              {loc.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs text-muted-foreground">Time Window</Label>
                                      <Select 
                                        value={meal.timeRange}
                                        onValueChange={(v) => updateMealContext(meal.id, 'timeRange', v)}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={4} align="start">
                                          {MEAL_TIME_RANGES.map((range) => (
                                            <SelectItem key={range} value={range} className="text-xs">{range}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  {/* Client notes for this meal */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                      <MessageSquare className="h-3 w-3" />
                                      What does the client normally do for this {meal.type}?
                                    </Label>
                                    <Textarea
                                      value={meal.clientNotes || ''}
                                      onChange={(e) => updateMealContext(meal.id, 'clientNotes', e.target.value)}
                                      placeholder={meal.type === 'meal'
                                        ? `e.g., "Usually grabs a burrito bowl from Chipotle" or "Skips this meal most days" or "Makes overnight oats the night before"`
                                        : `e.g., "Usually has a protein bar from the vending machine" or "Trail mix from home"`}
                                      className="min-h-[50px] resize-none text-xs"
                                      rows={2}
                                    />
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Nutrient Timing Preferences */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-[#c19962]" />
                          Nutrient Timing Preferences
                        </CardTitle>
                        <CardDescription>
                          How calories are distributed through the day. Evidence shows timing matters most for athletes and during aggressive diets.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label>Energy Distribution Pattern</Label>
                          <RadioGroup
                            value={energyDistribution}
                            onValueChange={(v) => setEnergyDistribution(v as typeof energyDistribution)}
                            className="grid grid-cols-2 gap-2"
                          >
                            <div className={cn(
                              "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all",
                              energyDistribution === 'steady' ? "border-[#c19962] bg-[#c19962]/10" : "hover:bg-muted/50"
                            )}>
                              <RadioGroupItem value="steady" id="steady" />
                              <Label htmlFor="steady" className="cursor-pointer flex-1">
                                <span className="font-medium">Balanced</span>
                                <p className="text-xs text-muted-foreground">Even distribution — good default</p>
                              </Label>
                            </div>
                            <div className={cn(
                              "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all",
                              energyDistribution === 'workout_focused' ? "border-[#c19962] bg-[#c19962]/10" : "hover:bg-muted/50"
                            )}>
                              <RadioGroupItem value="workout_focused" id="workout" />
                              <Label htmlFor="workout" className="cursor-pointer flex-1">
                                <span className="font-medium">Workout-Centered</span>
                                <p className="text-xs text-muted-foreground">More around training — best for athletes</p>
                              </Label>
                            </div>
                            <div className={cn(
                              "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all",
                              energyDistribution === 'front_loaded' ? "border-[#c19962] bg-[#c19962]/10" : "hover:bg-muted/50"
                            )}>
                              <RadioGroupItem value="front_loaded" id="front" />
                              <Label htmlFor="front" className="cursor-pointer flex-1">
                                <span className="font-medium">Front-Loaded</span>
                                <p className="text-xs text-muted-foreground">Bigger breakfast — may improve satiety</p>
                              </Label>
                            </div>
                            <div className={cn(
                              "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all",
                              energyDistribution === 'back_loaded' ? "border-[#c19962] bg-[#c19962]/10" : "hover:bg-muted/50"
                            )}>
                              <RadioGroupItem value="back_loaded" id="back" />
                              <Label htmlFor="back" className="cursor-pointer flex-1">
                                <span className="font-medium">Back-Loaded</span>
                                <p className="text-xs text-muted-foreground">Bigger dinner — social flexibility</p>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <Separator />

                        {/* Peri-Workout Nutrition Preferences */}
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Peri-Workout Nutrition Preferences</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Positioning carbohydrate and protein around training windows is generally recommended to support performance and recovery. These preferences help us design plans that respect the client&apos;s comfort while optimizing nutrient timing.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Pre-Workout */}
                            <div className="space-y-2 p-3 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Pre-Workout</Label>
                                <Switch
                                  checked={includePreWorkoutSnack}
                                  onCheckedChange={setIncludePreWorkoutSnack}
                                />
                              </div>
                              {includePreWorkoutSnack && (
                                <Select value={preWorkoutPreference} onValueChange={(v) => setPreWorkoutPreference(v as PeriWorkoutPreference)}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent position="popper" sideOffset={4} align="start">
                                    {PERI_WORKOUT_OPTIONS.filter(o => o.value !== 'fasted').map(opt => (
                                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                        <span className="font-medium">{opt.label}</span>
                                        <span className="text-muted-foreground ml-1">— {opt.description}</span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {!includePreWorkoutSnack && (
                                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                                  Client prefers fasted training. We&apos;ll recommend hydration + EAA/creatine supplement and ensure adequate nutrition in surrounding meals.
                                </p>
                              )}
                            </div>

                            {/* Post-Workout */}
                            <div className="space-y-2 p-3 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Post-Workout</Label>
                                <Switch
                                  checked={includePostWorkoutMeal}
                                  onCheckedChange={setIncludePostWorkoutMeal}
                                />
                              </div>
                              {includePostWorkoutMeal && (
                                <Select value={postWorkoutPreference} onValueChange={(v) => setPostWorkoutPreference(v as PeriWorkoutPreference)}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent position="popper" sideOffset={4} align="start">
                                    {PERI_WORKOUT_OPTIONS.filter(o => o.value !== 'fasted').map(opt => (
                                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                        <span className="font-medium">{opt.label}</span>
                                        <span className="text-muted-foreground ml-1">— {opt.description}</span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {!includePostWorkoutMeal && (
                                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                                  Client prefers delayed post-workout eating. We&apos;ll emphasize protein and carb intake in the next scheduled meal.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-800">
                              <strong>Guidance:</strong> Even when fasted training is preferred, we generally recommend the client stays hydrated and considers EAAs, creatine, and/or a light carb source that is easy on digestion to support performance and minimize muscle protein breakdown. Post-training, prioritizing protein (25-40g) and carbohydrate is ideal within 1-2 hours.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Peri-Workout Notes</Label>
                            <Textarea
                              value={periWorkoutNotes}
                              onChange={(e) => setPeriWorkoutNotes(e.target.value)}
                              placeholder="e.g., 'Gets nauseous eating within 1h of training', 'Prefers liquid calories post-workout', 'Currently uses Kion Aminos pre-training'"
                              className="min-h-[50px] resize-none text-xs"
                              rows={2}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Time-Restricted Eating */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-[#c19962]" />
                          Time-Restricted Eating
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="ml-1">
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">Time-restricted eating (TRE) consolidates food intake into a specific window. Research suggests benefits for metabolic health, body composition, and circadian rhythm alignment. Most studied protocol is 16:8.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </CardTitle>
                        <CardDescription>
                          Optional fasting/feeding window preferences. Meals will be scheduled within the eating window.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <Label>Eating Schedule</Label>
                          <Select value={fastingProtocol} onValueChange={setFastingProtocol}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={4} align="start">
                              {FASTING_PROTOCOLS.map(protocol => (
                                <SelectItem key={protocol.value} value={protocol.value}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{protocol.label}</span>
                                    <span className="text-xs text-muted-foreground">{protocol.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {fastingProtocol !== 'none' && (
                          <>
                            <Separator />
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Eating Window</Label>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">First Meal (Window Opens)</Label>
                                  <Input
                                    type="time"
                                    value={feedingWindowStart}
                                    onChange={(e) => setFeedingWindowStart(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Last Meal (Window Closes)</Label>
                                  <Input
                                    type="time"
                                    value={feedingWindowEnd}
                                    onChange={(e) => setFeedingWindowEnd(e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <Label className="text-sm">Flexible on Weekends</Label>
                                  <p className="text-xs text-muted-foreground">Allow a longer eating window on Sat/Sun</p>
                                </div>
                                <Switch
                                  checked={flexibleOnWeekends}
                                  onCheckedChange={setFlexibleOnWeekends}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Meal Prep Defaults */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <ChefHat className="h-5 w-5 text-[#c19962]" />
                          Meal Preparation Defaults
                        </CardTitle>
                        <CardDescription>
                          Applies to all meals by default. Individual meals can be customized in the Daily Meal Structure section above.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Meal Prep Method</Label>
                            <Select value={defaultMealPrepMethod} onValueChange={(v) => setDefaultMealPrepMethod(v as MealPrepMethod)}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={4} align="start">
                                {MEAL_PREP_METHODS.map(pm => (
                                  <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Meal Location</Label>
                            <Select value={defaultMealLocation} onValueChange={(v) => setDefaultMealLocation(v as MealLocation)}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={4} align="start">
                                {MEAL_LOCATIONS.map(loc => (
                                  <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Snack Prep</Label>
                            <Select value={defaultSnackPrepMethod} onValueChange={(v) => setDefaultSnackPrepMethod(v as MealPrepMethod)}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={4} align="start">
                                {MEAL_PREP_METHODS.map(pm => (
                                  <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Snack Location</Label>
                            <Select value={defaultSnackLocation} onValueChange={(v) => setDefaultSnackLocation(v as MealLocation)}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={4} align="start">
                                {MEAL_LOCATIONS.map(loc => (
                                  <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Supplements */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Pill className="h-5 w-5 text-[#c19962]" />
                          Supplements
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </CardTitle>
                        <CardDescription>
                          Track current supplements and timing preferences. This informs meal plan generation and nutrient timing. Supplements detected in Cronometer will be noted for reference.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Quick-add from common supplements */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Add from Common Supplements</Label>
                          <div className="space-y-3">
                            {COMMON_SUPPLEMENTS.map((category) => (
                              <div key={category.category}>
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">{category.category}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {category.items.map((item) => {
                                    const isAdded = supplements.some(s => s.name === item);
                                    return (
                                      <button
                                        key={item}
                                        type="button"
                                        onClick={() => {
                                          if (isAdded) {
                                            setSupplements(prev => prev.filter(s => s.name !== item));
                                          } else {
                                            setSupplements(prev => [...prev, { name: item, timing: ['as_needed'] }]);
                                          }
                                        }}
                                        className={cn(
                                          "px-2 py-1 text-xs rounded-full border transition-all",
                                          isAdded
                                            ? "bg-[#c19962] text-white border-[#c19962]"
                                            : "hover:border-[#c19962]/50 hover:bg-[#c19962]/5"
                                        )}
                                      >
                                        {isAdded ? '✓ ' : ''}{item}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Custom supplement entry */}
                        <div className="flex gap-2">
                          <Input
                            value={newSupplementName}
                            onChange={(e) => setNewSupplementName(e.target.value)}
                            placeholder="Add custom supplement..."
                            className="flex-1 h-9 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newSupplementName.trim()) {
                                e.preventDefault();
                                if (!supplements.some(s => s.name.toLowerCase() === newSupplementName.trim().toLowerCase())) {
                                  setSupplements(prev => [...prev, { name: newSupplementName.trim(), timing: ['as_needed'] }]);
                                }
                                setNewSupplementName('');
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9"
                            onClick={() => {
                              if (newSupplementName.trim() && !supplements.some(s => s.name.toLowerCase() === newSupplementName.trim().toLowerCase())) {
                                setSupplements(prev => [...prev, { name: newSupplementName.trim(), timing: ['as_needed'] }]);
                                setNewSupplementName('');
                              }
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Active supplements list with timing */}
                        {supplements.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Active Supplements ({supplements.length})</Label>
                              <div className="space-y-2">
                                {supplements.map((supp, idx) => (
                                  <div key={supp.name} className="p-3 border rounded-lg space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Pill className="h-3.5 w-3.5 text-[#c19962]" />
                                        <span className="font-medium text-sm">{supp.name}</span>
                                        {supp.detectedFromCronometer && (
                                          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">Cronometer</Badge>
                                        )}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                        onClick={() => setSupplements(prev => prev.filter((_, i) => i !== idx))}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Dosage</Label>
                                        <Input
                                          value={supp.dosage || ''}
                                          onChange={(e) => {
                                            const updated = [...supplements];
                                            updated[idx] = { ...updated[idx], dosage: e.target.value };
                                            setSupplements(updated);
                                          }}
                                          placeholder="e.g., 5g, 2 caps"
                                          className="h-7 text-xs"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">Notes</Label>
                                        <Input
                                          value={supp.notes || ''}
                                          onChange={(e) => {
                                            const updated = [...supplements];
                                            updated[idx] = { ...updated[idx], notes: e.target.value };
                                            setSupplements(updated);
                                          }}
                                          placeholder="Brand, purpose, link..."
                                          className="h-7 text-xs"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">Timing</Label>
                                      <div className="flex flex-wrap gap-1">
                                        {SUPPLEMENT_TIMING_OPTIONS.map((opt) => {
                                          const isSelected = supp.timing.includes(opt.value);
                                          return (
                                            <button
                                              key={opt.value}
                                              type="button"
                                              onClick={() => {
                                                const updated = [...supplements];
                                                const currentTimings = updated[idx].timing;
                                                updated[idx] = {
                                                  ...updated[idx],
                                                  timing: isSelected
                                                    ? currentTimings.filter(t => t !== opt.value)
                                                    : [...currentTimings, opt.value],
                                                };
                                                setSupplements(updated);
                                              }}
                                              className={cn(
                                                "px-2 py-0.5 text-[10px] rounded-full border transition-all",
                                                isSelected
                                                  ? "bg-[#c19962]/20 border-[#c19962] text-[#c19962] font-medium"
                                                  : "hover:border-[#c19962]/30"
                                              )}
                                            >
                                              {opt.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">
                            <strong>Tip:</strong> We commonly recommend supplements via our FullScript, Amazon affiliate, and Kion affiliate accounts. Include any relevant links in the notes field for easy reference.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 4: Preferences */}
                  <TabsContent value="preferences" className="space-y-8">
                    {/* Critical: Restrictions & Allergies */}
                    <Card className="border-0 shadow-sm border-l-4 border-l-red-400">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Shield className="h-5 w-5 text-red-500" />
                          Restrictions & Allergies
                          <Badge variant="outline" className="text-xs text-red-600 border-red-300">Critical</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Dietary Restrictions</Label>
                            {selectedRestrictions.length > 0 && (
                              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedRestrictions([])}>
                                Clear all
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {DIETARY_RESTRICTIONS.map(restriction => (
                              <Badge
                                key={restriction}
                                variant={selectedRestrictions.includes(restriction) ? "default" : "outline"}
                                className={cn(
                                  "cursor-pointer transition-all",
                                  selectedRestrictions.includes(restriction) && "bg-[#c19962] hover:bg-[#e4ac61]"
                                )}
                                onClick={() => {
                                  if (selectedRestrictions.includes(restriction)) {
                                    setSelectedRestrictions(selectedRestrictions.filter(r => r !== restriction));
                                  } else {
                                    setSelectedRestrictions([...selectedRestrictions, restriction]);
                                  }
                                }}
                              >
                                {restriction}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-red-700">Food Allergies</Label>
                            {selectedAllergies.length > 0 && (
                              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedAllergies([])}>
                                Clear all
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {COMMON_ALLERGIES.map(allergy => (
                              <Badge
                                key={allergy}
                                variant={selectedAllergies.includes(allergy) ? "destructive" : "outline"}
                                className="cursor-pointer transition-all"
                                onClick={() => {
                                  if (selectedAllergies.includes(allergy)) {
                                    setSelectedAllergies(selectedAllergies.filter(a => a !== allergy));
                                  } else {
                                    setSelectedAllergies([...selectedAllergies, allergy]);
                                  }
                                }}
                              >
                                {allergy}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Food Preferences - Proteins */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Utensils className="h-5 w-5 text-[#c19962]" />
                          Protein Preferences
                        </CardTitle>
                        <CardDescription>
                          Select preferred protein sources. These will be prioritized in meal generation.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Common Proteins</Label>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedProteins(PROTEINS)}>
                                All
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedProteins([])}>
                                None
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-lg bg-muted/20">
                            {PROTEINS.map(protein => (
                              <Badge
                                key={protein}
                                variant={selectedProteins.includes(protein) ? "default" : "outline"}
                                className={cn(
                                  "cursor-pointer text-xs",
                                  selectedProteins.includes(protein) && "bg-[#c19962] hover:bg-[#e4ac61]"
                                )}
                                onClick={() => {
                                  if (selectedProteins.includes(protein)) {
                                    setSelectedProteins(selectedProteins.filter(p => p !== protein));
                                  } else {
                                    setSelectedProteins([...selectedProteins, protein]);
                                  }
                                }}
                              >
                                {protein}
                              </Badge>
                            ))}
                          </div>
                          {selectedProteins.length > 0 && (
                            <p className="text-xs text-[#c19962]">{selectedProteins.length} proteins selected</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Add Custom Proteins</Label>
                          <Input
                            placeholder="e.g., Bison, Venison, Elk (comma-separated)"
                            value={customProteins}
                            onChange={(e) => setCustomProteins(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Food Preferences - Carbs */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Utensils className="h-5 w-5 text-[#c19962]" />
                          Carbohydrate Preferences
                        </CardTitle>
                        <CardDescription>
                          Select preferred carb sources for energy and fiber.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Common Carbs</Label>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedCarbs(CARBS)}>
                                All
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedCarbs([])}>
                                None
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-lg bg-muted/20">
                            {CARBS.map(carb => (
                              <Badge
                                key={carb}
                                variant={selectedCarbs.includes(carb) ? "default" : "outline"}
                                className={cn(
                                  "cursor-pointer text-xs",
                                  selectedCarbs.includes(carb) && "bg-[#c19962] hover:bg-[#e4ac61]"
                                )}
                                onClick={() => {
                                  if (selectedCarbs.includes(carb)) {
                                    setSelectedCarbs(selectedCarbs.filter(c => c !== carb));
                                  } else {
                                    setSelectedCarbs([...selectedCarbs, carb]);
                                  }
                                }}
                              >
                                {carb}
                              </Badge>
                            ))}
                          </div>
                          {selectedCarbs.length > 0 && (
                            <p className="text-xs text-[#c19962]">{selectedCarbs.length} carbs selected</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Add Custom Carbs</Label>
                          <Input
                            placeholder="e.g., Taro, Plantains, Millet (comma-separated)"
                            value={customCarbs}
                            onChange={(e) => setCustomCarbs(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Food Preferences - Fats */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Utensils className="h-5 w-5 text-[#c19962]" />
                          Fat Preferences
                        </CardTitle>
                        <CardDescription>
                          Select preferred fat sources. Quality fats are essential for hormones, brain function, and nutrient absorption.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Common Fats</Label>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedFats(FATS)}>
                                All
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedFats([])}>
                                None
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-lg bg-muted/20">
                            {FATS.map(fat => (
                              <Badge
                                key={fat}
                                variant={selectedFats.includes(fat) ? "default" : "outline"}
                                className={cn(
                                  "cursor-pointer text-xs",
                                  selectedFats.includes(fat) && "bg-[#c19962] hover:bg-[#e4ac61]"
                                )}
                                onClick={() => {
                                  if (selectedFats.includes(fat)) {
                                    setSelectedFats(selectedFats.filter(f => f !== fat));
                                  } else {
                                    setSelectedFats([...selectedFats, fat]);
                                  }
                                }}
                              >
                                {fat}
                              </Badge>
                            ))}
                          </div>
                          {selectedFats.length > 0 && (
                            <p className="text-xs text-[#c19962]">{selectedFats.length} fats selected</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Add Custom Fats</Label>
                          <Input
                            placeholder="e.g., Brazil nuts, Macadamia oil (comma-separated)"
                            value={customFats}
                            onChange={(e) => setCustomFats(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Cuisines & Specific Foods */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ChefHat className="h-5 w-5 text-[#c19962]" />
                          Cuisines & Specific Foods
                        </CardTitle>
                        <CardDescription>
                          Cuisine styles and specific foods to emphasize or avoid.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Cuisines */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Cuisine Styles</Label>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedCuisines(CUISINES)}>
                                All
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedCuisines([])}>
                                None
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {CUISINES.map(cuisine => (
                              <Badge
                                key={cuisine}
                                variant={selectedCuisines.includes(cuisine) ? "default" : "outline"}
                                className={cn(
                                  "cursor-pointer text-xs",
                                  selectedCuisines.includes(cuisine) && "bg-[#c19962] hover:bg-[#e4ac61]"
                                )}
                                onClick={() => {
                                  if (selectedCuisines.includes(cuisine)) {
                                    setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
                                  } else {
                                    setSelectedCuisines([...selectedCuisines, cuisine]);
                                  }
                                }}
                              >
                                {cuisine}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        {/* Foods to Emphasize */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            Foods to Emphasize
                          </Label>
                          <Textarea
                            placeholder="e.g., leafy greens, fermented foods, bone broth, organ meats (one per line or comma-separated)"
                            value={foodsToEmphasize}
                            onChange={(e) => setFoodsToEmphasize(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <p className="text-xs text-muted-foreground">Specific foods to prioritize in meal plans — great for therapeutic or preference-based emphasis</p>
                        </div>

                        <Separator />

                        {/* Foods to Avoid */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <XIcon className="h-4 w-4 text-red-500" />
                            Foods to Avoid
                          </Label>
                          <Textarea
                            placeholder="e.g., mushrooms, bell peppers, cilantro, artificial sweeteners (one per line or comma-separated)"
                            value={foodsToAvoid}
                            onChange={(e) => setFoodsToAvoid(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <p className="text-xs text-muted-foreground">Personal dislikes beyond allergies/restrictions — these will be excluded from suggestions</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 5: Advanced */}
                  <TabsContent value="advanced" className="space-y-8">
                    {/* Practical Constraints */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Settings2 className="h-5 w-5 text-[#c19962]" />
                          Practical Constraints
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label>Meal Variety Level</Label>
                            <div className="space-y-2">
                              <div className="flex items-center gap-4">
                                <Slider
                                  value={[varietyLevel]}
                                  onValueChange={([v]) => setVarietyLevel(v)}
                                  min={1}
                                  max={5}
                                  step={1}
                                  className="flex-1"
                                />
                                <Badge variant="outline" className="min-w-[5rem] justify-center">
                                  {['', 'Minimal', 'Low', 'Moderate', 'High', 'Max'][varietyLevel]}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {varietyLevel <= 2 ? 'Same meals repeated — simpler prep, easier shopping' : 
                                 varietyLevel === 3 ? 'Balanced — some repetition with variety' :
                                 'New meals daily — more interesting but more planning'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label>Cooking Time Per Meal</Label>
                            <Select value={cookingTime} onValueChange={(v) => setCookingTime(v as typeof cookingTime)}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={4} align="start" className="z-50 w-[280px]">
                                <SelectItem value="quick">Quick (&lt;15 min)</SelectItem>
                                <SelectItem value="short">Short (15-30 min)</SelectItem>
                                <SelectItem value="medium">Medium (30-60 min)</SelectItem>
                                <SelectItem value="any">Any Duration</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              {cookingTime === 'quick' && 'Simple assembly, minimal cooking'}
                              {cookingTime === 'short' && 'Basic cooking, one-pan meals'}
                              {cookingTime === 'medium' && 'Full recipes, multiple components'}
                              {cookingTime === 'any' && 'Complex recipes welcome'}
                            </p>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <Label>Budget Preference</Label>
                          <RadioGroup
                            value={budgetPreference}
                            onValueChange={(v) => setBudgetPreference(v as typeof budgetPreference)}
                            className="grid grid-cols-3 gap-2"
                          >
                            <div className={cn(
                              "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all",
                              budgetPreference === 'budget' ? "border-[#c19962] bg-[#c19962]/10" : "hover:bg-muted/50"
                            )}>
                              <RadioGroupItem value="budget" id="budget" />
                              <Label htmlFor="budget" className="cursor-pointer">
                                <span className="font-medium">Budget</span>
                                <p className="text-xs text-muted-foreground">Basic ingredients, bulk staples</p>
                              </Label>
                            </div>
                            <div className={cn(
                              "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all",
                              budgetPreference === 'moderate' ? "border-[#c19962] bg-[#c19962]/10" : "hover:bg-muted/50"
                            )}>
                              <RadioGroupItem value="moderate" id="moderate" />
                              <Label htmlFor="moderate" className="cursor-pointer">
                                <span className="font-medium">Moderate</span>
                                <p className="text-xs text-muted-foreground">Quality staples, some premium</p>
                              </Label>
                            </div>
                            <div className={cn(
                              "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all",
                              budgetPreference === 'flexible' ? "border-[#c19962] bg-[#c19962]/10" : "hover:bg-muted/50"
                            )}>
                              <RadioGroupItem value="flexible" id="flexible" />
                              <Label htmlFor="flexible" className="cursor-pointer">
                                <span className="font-medium">Flexible</span>
                                <p className="text-xs text-muted-foreground">Premium, specialty items OK</p>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Flavor Preferences */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Flame className="h-5 w-5 text-[#c19962]" />
                          Flavor Preferences
                        </CardTitle>
                        <CardDescription>
                          Affects seasoning suggestions and recipe styles
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <Label>Spice Tolerance</Label>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground w-12">Mild</span>
                            <Slider
                              value={[spiceLevel]}
                              onValueChange={([v]) => setSpiceLevel(v)}
                              min={0}
                              max={4}
                              step={1}
                              className="flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-12 text-right">Hot</span>
                            <Badge variant="outline" className="min-w-[5rem] justify-center">
                              {['None', 'Mild', 'Medium', 'Spicy', 'Very Hot'][spiceLevel]}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Flavor Profiles (select favorites)</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {FLAVOR_PROFILES.map(flavor => (
                              <Badge
                                key={flavor}
                                variant={selectedFlavors.includes(flavor) ? "default" : "outline"}
                                className={cn(
                                  "cursor-pointer text-xs",
                                  selectedFlavors.includes(flavor) && "bg-[#c19962] hover:bg-[#e4ac61]"
                                )}
                                onClick={() => {
                                  if (selectedFlavors.includes(flavor)) {
                                    setSelectedFlavors(selectedFlavors.filter(f => f !== flavor));
                                  } else {
                                    setSelectedFlavors([...selectedFlavors, flavor]);
                                  }
                                }}
                              >
                                {flavor}
                              </Badge>
                            ))}
                          </div>
                          {selectedFlavors.length === 0 && (
                            <p className="text-xs text-muted-foreground">No preference — all flavor profiles allowed</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Micronutrient Focus */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Leaf className="h-5 w-5 text-[#c19962]" />
                          Micronutrient Focus
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </CardTitle>
                        <CardDescription>
                          If the client has specific nutritional needs (e.g., low iron, recovering from deficiency), select those to prioritize foods rich in these nutrients
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {MICRONUTRIENTS.map(nutrient => (
                            <Badge
                              key={nutrient}
                              variant={selectedMicronutrients.includes(nutrient) ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer",
                                selectedMicronutrients.includes(nutrient) && "bg-[#c19962] hover:bg-[#e4ac61]"
                              )}
                              onClick={() => {
                                if (selectedMicronutrients.includes(nutrient)) {
                                  setSelectedMicronutrients(selectedMicronutrients.filter(n => n !== nutrient));
                                } else {
                                  setSelectedMicronutrients([...selectedMicronutrients, nutrient]);
                                }
                              }}
                            >
                              {nutrient}
                            </Badge>
                          ))}
                        </div>
                        {selectedMicronutrients.length === 0 ? (
                          <p className="mt-3 text-xs text-muted-foreground">
                            No specific focus — balanced micronutrient distribution
                          </p>
                        ) : (
                          <p className="mt-3 text-xs text-[#c19962]">
                            Foods rich in {selectedMicronutrients.join(', ')} will be prioritized
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* REMOVED: Target Body Composition - Now in Planning/Phases */}
                {/* REMOVED: Rate of Change & Timeline - Now in Planning/Phases */}

                {/* TARGET BODY COMP SECTION TO BE REMOVED BELOW - Keeping for now but hidden */}
                <div className="hidden">
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
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*\.?[0-9]*"
                                  value={targetBodyFatPercent.toFixed(1)}
                                  onChange={(e) => {
                                    const num = parseFloat(e.target.value);
                                    if (!isNaN(num) && num >= 0 && num <= 60) {
                                      setTargetFromBodyFatPercent(num, true);
                                    }
                                  }}
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
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*\.?[0-9]*"
                                  value={targetBodyComp.fmi.toFixed(1)}
                                  onChange={(e) => {
                                    const num = parseFloat(e.target.value);
                                    if (!isNaN(num) && num >= 0 && num <= 20) {
                                      setTargetFromFMI(num);
                                    }
                                  }}
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
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*\.?[0-9]*"
                                  value={targetBodyComp.ffmi.toFixed(1)}
                                  onChange={(e) => {
                                    const num = parseFloat(e.target.value);
                                    if (!isNaN(num) && num >= 0 && num <= 35) {
                                      setTargetFromFFMI(num);
                                    }
                                  }}
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
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*\.?[0-9]*"
                                  value={targetFatMassLbs}
                                  onChange={(e) => {
                                    const num = parseFloat(e.target.value);
                                    if (!isNaN(num) && num >= 0 && num <= 300) {
                                      setTargetFatMassLbs(num);
                                    }
                                  }}
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
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*\.?[0-9]*"
                                  value={targetFFMLbs}
                                  onChange={(e) => {
                                    const num = parseFloat(e.target.value);
                                    if (!isNaN(num) && num >= 0 && num <= 400) {
                                      setTargetFFMLbs(num);
                                    }
                                  }}
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
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9]*\.?[0-9]*"
                                value={targetFatMassLbs}
                                onChange={(e) => {
                                  const num = parseFloat(e.target.value);
                                  if (!isNaN(num) && num >= 0 && num <= 300) {
                                    setTargetFatMassLbs(num);
                                  }
                                }}
                                className="mt-1 text-center font-bold"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Current: {bodyComp.fatMassLbs.toFixed(1)} lbs
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm">Target Lean Mass (lbs)</Label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9]*\.?[0-9]*"
                                value={targetFFMLbs}
                                onChange={(e) => {
                                  const num = parseFloat(e.target.value);
                                  if (!isNaN(num) && num >= 0 && num <= 400) {
                                    setTargetFFMLbs(num);
                                  }
                                }}
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
                        <LineChart className="h-5 w-5 text-[#c19962]" />
                        Timeline & Progress
                      </CardTitle>
                      <CardDescription>
                        Set your pace and visualize the journey to your goal
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Rate Selection - Cleaner */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Weekly Rate</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex">
                                <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">Rate as % of body weight per week. Research supports 0.5-1% for fat loss with minimal muscle loss, and 0.25-0.5% for lean muscle gain.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {rateOptions.map((rate) => (
                            <button
                              key={rate.value}
                              type="button"
                              onClick={() => setRateOfChange(rate.value)}
                              className={cn(
                                "p-3 rounded-lg border-2 text-center transition-all",
                                rateOfChange === rate.value
                                  ? "border-[#c19962] bg-[#c19962]/10"
                                  : "border-muted hover:border-muted-foreground/50"
                              )}
                            >
                              <p className="font-semibold text-sm">{rate.label}</p>
                              <p className="text-xs text-muted-foreground">{rate.lbsPerWeek} lb/wk</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Visual Progress Tracker */}
                      {projectionData.length > 0 && (
                        <div className="space-y-4">
                          {/* Journey Overview */}
                          <div className="p-4 bg-gradient-to-r from-[#c19962]/10 to-transparent rounded-xl border">
                            <div className="flex items-center justify-between mb-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold">{weightLbs}</p>
                                <p className="text-xs text-muted-foreground uppercase">Current</p>
                              </div>
                              <div className="flex-1 mx-4">
                                <div className="relative">
                                  <div className="h-2 bg-muted rounded-full">
                                    <div 
                                      className="h-2 bg-gradient-to-r from-[#c19962] to-[#d4af7a] rounded-full transition-all"
                                      style={{ width: '0%' }}
                                    />
                                  </div>
                                  <div className="flex justify-between mt-1">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground font-medium">{timelineCalc.weeks} weeks</span>
                                    <Target className="h-3 w-3 text-[#c19962]" />
                                  </div>
                                </div>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-[#c19962]">{Math.round(targetWeightLbs)}</p>
                                <p className="text-xs text-muted-foreground uppercase">Target</p>
                              </div>
                            </div>
                            
                            {/* Key Metrics */}
                            <div className="grid grid-cols-4 gap-2 text-center">
                              <div className="p-2 bg-background rounded-lg">
                                <p className="text-sm font-bold">{Math.abs(weightChangeNeeded.lbs).toFixed(1)}</p>
                                <p className="text-[10px] text-muted-foreground">lbs to {weightChangeNeeded.direction}</p>
                              </div>
                              <div className="p-2 bg-background rounded-lg">
                                <p className="text-sm font-bold">{(timelineCalc.weeklyChangeLbs || 0).toFixed(2)}</p>
                                <p className="text-[10px] text-muted-foreground">lbs/week</p>
                              </div>
                              <div className="p-2 bg-background rounded-lg">
                                <p className="text-sm font-bold">{bodyFatPercent.toFixed(1)}%</p>
                                <p className="text-[10px] text-muted-foreground">current BF</p>
                              </div>
                              <div className="p-2 bg-background rounded-lg">
                                <p className="text-sm font-bold text-[#c19962]">{targetBodyFatPercent.toFixed(1)}%</p>
                                <p className="text-[10px] text-muted-foreground">target BF</p>
                              </div>
                            </div>
                          </div>

                          {/* Dates */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Start Date</Label>
                              <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Target Date</Label>
                              <div className="h-9 px-3 bg-muted/50 rounded-md flex items-center justify-between text-sm">
                                <span className="font-medium">
                                  {timelineCalc.weeks > 0 
                                    ? new Date(timelineCalc.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                    : '—'
                                  }
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Compact Projection Table */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground uppercase">Milestones</Label>
                              <span className="text-xs text-muted-foreground">
                                {goalType === 'lose_fat' ? `~${Math.round(fatLossEfficiency * 100)}% fat loss efficiency` : 
                                 goalType === 'gain_muscle' ? `~${Math.round(muscleGainEfficiency * 100)}% muscle gain efficiency` :
                                 `${Math.round(recompPotential * 100)}% recomp potential`}
                              </span>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead className="bg-muted/50">
                                    <tr>
                                      <th className="px-2 py-1.5 text-left font-medium">Week</th>
                                      <th className="px-2 py-1.5 text-right font-medium">Weight</th>
                                      <th className="px-2 py-1.5 text-right font-medium">BF%</th>
                                      <th className="px-2 py-1.5 text-right font-medium">Fat</th>
                                      <th className="px-2 py-1.5 text-right font-medium">Lean</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {projectionData.map((row, idx) => (
                                      <tr 
                                        key={row.week} 
                                        className={cn(
                                          "border-t",
                                          idx === 0 && "bg-blue-50/50",
                                          idx === projectionData.length - 1 && "bg-green-50/50 font-medium"
                                        )}
                                      >
                                        <td className="px-2 py-1.5">
                                          {row.week === 0 ? (
                                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Now</span>
                                          ) : row.week === timelineCalc.weeks ? (
                                            <span className="flex items-center gap-1 text-[#c19962]"><Target className="h-3 w-3" /> Goal</span>
                                          ) : (
                                            <span>Wk {row.week}</span>
                                          )}
                                        </td>
                                        <td className="px-2 py-1.5 text-right">{row.weight}</td>
                                        <td className="px-2 py-1.5 text-right">{row.bf}%</td>
                                        <td className="px-2 py-1.5 text-right">{row.fatMass}</td>
                                        <td className="px-2 py-1.5 text-right">{row.ffm}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {timelineCalc.weeks > 12 && (
                                <div className="px-2 py-1.5 bg-muted/30 text-[10px] text-muted-foreground text-center border-t">
                                  Showing key milestones. Full plan: {timelineCalc.weeks} weeks.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Contextual Tips */}
                      {goalType === 'lose_fat' && rateOfChange >= 0.75 && (
                        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <strong>Aggressive Rate:</strong> 0.75%+ weekly may increase muscle loss. Consider moderate rates (0.5%) for better preservation.
                          </div>
                        </div>
                      )}
                      {goalType === 'gain_muscle' && rateOfChange >= 0.5 && (
                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <strong>Faster Bulk:</strong> May result in more fat gain. Natural lifters often optimize at 0.25% weekly.
                          </div>
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
                </div>
                {/* End hidden section for legacy Target Body Composition and Timeline */}

                {/* Navigation & Save */}
                <div className="border-t border-slate-200 pt-6 mt-8">
                  {/* Tab Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <Button 
                      onClick={goToPrevTab}
                      variant="outline"
                      disabled={isFirstTab}
                      className="gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {!isFirstTab && tabLabels[tabs[currentTabIndex - 1]]}
                      {isFirstTab && 'Previous'}
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      {tabs.map((tab, index) => (
                        <button
                          key={tab}
                          onClick={() => {
                            setActiveTab(tab);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={cn(
                            "w-2.5 h-2.5 rounded-full transition-all",
                            activeTab === tab 
                              ? "bg-[#c19962] scale-125" 
                              : "bg-slate-300 hover:bg-slate-400"
                          )}
                          title={tabLabels[tab]}
                        />
                      ))}
                    </div>
                    
                    <Button 
                      onClick={goToNextTab}
                      variant="outline"
                      disabled={isLastTab}
                      className="gap-2"
                    >
                      {!isLastTab && tabLabels[tabs[currentTabIndex + 1]]}
                      {isLastTab && 'Next'}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Save Buttons */}
                  <div className="flex justify-end gap-3">
                    <Button 
                      onClick={handleSaveProgress} 
                      size="lg"
                      variant="outline"
                      disabled={isSavingProgress}
                      className="border-[#c19962] text-[#c19962] hover:bg-[#c19962]/10"
                    >
                      {isSavingProgress ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                          Save Progress
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleSaveAndContinue} 
                      size="lg"
                      className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                    >
                      Save & Continue to Planning
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
