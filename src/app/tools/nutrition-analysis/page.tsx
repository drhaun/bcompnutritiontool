'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Upload,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Zap,
  Apple,
  RefreshCw,
  Info,
  Target,
  Beaker,
  Lightbulb,
  ArrowRightLeft,
  ChevronRight,
  X,
  Download,
  Loader2,
  Sparkles,
  UtensilsCrossed,
  Link2,
  Calendar,
  CloudDownload,
  User
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { format, subDays } from 'date-fns';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useFitomicsStore } from '@/lib/store';

// ============ TYPES ============

interface NutrientData {
  name: string;
  value: number;
  unit: string;
  target: number;
  percentage: number;
}

interface DailyNutrients {
  date: string;
  nutrients: Record<string, number>;
  foods: FoodEntry[];
}

interface FoodEntry {
  name: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal: string;
  category: string;
}

interface NutrientIssue {
  nutrient: string;
  status: 'deficient' | 'low' | 'optimal' | 'high' | 'excess';
  percentage: number;
  target: number;
  actual: number;
  unit: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

interface RatioAnalysis {
  name: string;
  ratio: number;
  optimal: { min: number; max: number };
  status: 'optimal' | 'suboptimal' | 'poor';
  message: string;
}

interface FoodRecommendation {
  type: 'add' | 'increase' | 'reduce' | 'swap';
  food: string;
  reason: string;
  nutrients: string[];
  swapFor?: string;
}

interface AnalysisResult {
  summary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalFiber: number;
    daysAnalyzed: number;
    overallScore: number;
  };
  dailyAverages: NutrientData[];
  deficiencies: NutrientIssue[];
  excesses: NutrientIssue[];
  ratios: RatioAnalysis[];
  recommendations: FoodRecommendation[];
  topFoods: { name: string; count: number; totalCalories: number }[];
  dailyBreakdown: DailyNutrients[];
}

// ============ HELPERS ============

// Helper to get nutrient status with consistent logic
function getNutrientStatus(actual: number, target: number, isMaxLimit = false): { 
  status: 'low' | 'optimal' | 'high'; 
  percent: number; 
  diff: number;
  color: string;
} {
  const percent = target > 0 ? Math.round((actual / target) * 100) : 0;
  const diff = actual - target;
  
  if (isMaxLimit) {
    // For things like sodium where exceeding is bad
    if (percent <= 100) return { status: 'optimal', percent, diff, color: 'text-green-600' };
    if (percent <= 130) return { status: 'high', percent, diff, color: 'text-yellow-600' };
    return { status: 'high', percent, diff, color: 'text-red-600' };
  }
  
  // For normal nutrients where meeting minimum is good
  // Order matters: check ranges from low to high
  if (percent < 70) return { status: 'low', percent, diff, color: 'text-red-600' };
  if (percent < 90) return { status: 'low', percent, diff, color: 'text-yellow-600' };
  if (percent <= 130) return { status: 'optimal', percent, diff, color: 'text-green-600' };
  // Above 130% is high (excess)
  if (percent <= 200) return { status: 'high', percent, diff, color: 'text-yellow-600' };
  return { status: 'high', percent, diff, color: 'text-red-600' }; // Very high (>200%)
}

// Round to specified decimals
function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ============ CONSTANTS ============

// Column indices for Cronometer CSV (0-indexed)
const CSV_COLUMNS = {
  Day: 0,
  Time: 1,
  Group: 2,
  FoodName: 3,
  Amount: 4,
  Energy: 5,
  Alcohol: 6,
  Caffeine: 7,
  Water: 8,
  B1: 9,
  B2: 10,
  B3: 11,
  B5: 12,
  B6: 13,
  B12: 14,
  Folate: 15,
  VitaminA: 16,
  VitaminC: 17,
  VitaminD: 18,
  VitaminE: 19,
  VitaminK: 20,
  Calcium: 21,
  Copper: 22,
  Iron: 23,
  Magnesium: 24,
  Manganese: 25,
  Phosphorus: 26,
  Potassium: 27,
  Selenium: 28,
  Sodium: 29,
  Zinc: 30,
  Carbs: 31,
  Fiber: 32,
  Starch: 33,
  Sugars: 34,
  AddedSugars: 35,
  NetCarbs: 36,
  Fat: 37,
  Cholesterol: 38,
  Monounsaturated: 39,
  Polyunsaturated: 40,
  Saturated: 41,
  TransFats: 42,
  Omega3: 43,
  Omega6: 44,
  Protein: 52,
  Category: 57,
};

// Nutrient targets with RDA values
const NUTRIENT_TARGETS: Record<string, { target: number; unit: string; minOptimal: number; maxOptimal: number; category: string }> = {
  'Energy': { target: 2000, unit: 'kcal', minOptimal: 90, maxOptimal: 110, category: 'macro' },
  'Protein': { target: 150, unit: 'g', minOptimal: 90, maxOptimal: 200, category: 'macro' },
  'Carbs': { target: 200, unit: 'g', minOptimal: 70, maxOptimal: 130, category: 'macro' },
  'Fat': { target: 75, unit: 'g', minOptimal: 80, maxOptimal: 130, category: 'macro' },
  'Fiber': { target: 30, unit: 'g', minOptimal: 80, maxOptimal: 200, category: 'macro' },
  'B1 (Thiamine)': { target: 1.2, unit: 'mg', minOptimal: 90, maxOptimal: 500, category: 'vitamin' },
  'B2 (Riboflavin)': { target: 1.3, unit: 'mg', minOptimal: 90, maxOptimal: 500, category: 'vitamin' },
  'B3 (Niacin)': { target: 16, unit: 'mg', minOptimal: 90, maxOptimal: 250, category: 'vitamin' },
  'B5 (Pantothenic Acid)': { target: 5, unit: 'mg', minOptimal: 90, maxOptimal: 500, category: 'vitamin' },
  'B6 (Pyridoxine)': { target: 1.7, unit: 'mg', minOptimal: 90, maxOptimal: 300, category: 'vitamin' },
  'B12 (Cobalamin)': { target: 2.4, unit: 'µg', minOptimal: 90, maxOptimal: 1000, category: 'vitamin' },
  'Folate': { target: 400, unit: 'µg', minOptimal: 90, maxOptimal: 250, category: 'vitamin' },
  'Vitamin A': { target: 900, unit: 'µg', minOptimal: 80, maxOptimal: 300, category: 'vitamin' },
  'Vitamin C': { target: 90, unit: 'mg', minOptimal: 90, maxOptimal: 2500, category: 'vitamin' },
  'Vitamin D': { target: 600, unit: 'IU', minOptimal: 90, maxOptimal: 1500, category: 'vitamin' },
  'Vitamin E': { target: 15, unit: 'mg', minOptimal: 90, maxOptimal: 300, category: 'vitamin' },
  'Vitamin K': { target: 120, unit: 'µg', minOptimal: 90, maxOptimal: 500, category: 'vitamin' },
  'Calcium': { target: 1000, unit: 'mg', minOptimal: 90, maxOptimal: 200, category: 'mineral' },
  'Copper': { target: 0.9, unit: 'mg', minOptimal: 90, maxOptimal: 300, category: 'mineral' },
  'Iron': { target: 18, unit: 'mg', minOptimal: 90, maxOptimal: 200, category: 'mineral' },
  'Magnesium': { target: 400, unit: 'mg', minOptimal: 90, maxOptimal: 200, category: 'mineral' },
  'Manganese': { target: 2.3, unit: 'mg', minOptimal: 90, maxOptimal: 300, category: 'mineral' },
  'Phosphorus': { target: 700, unit: 'mg', minOptimal: 90, maxOptimal: 250, category: 'mineral' },
  'Potassium': { target: 2600, unit: 'mg', minOptimal: 90, maxOptimal: 180, category: 'mineral' },
  'Selenium': { target: 55, unit: 'µg', minOptimal: 90, maxOptimal: 700, category: 'mineral' },
  'Sodium': { target: 1500, unit: 'mg', minOptimal: 50, maxOptimal: 150, category: 'mineral' },
  'Zinc': { target: 11, unit: 'mg', minOptimal: 90, maxOptimal: 300, category: 'mineral' },
  'Omega-3': { target: 1.6, unit: 'g', minOptimal: 90, maxOptimal: 800, category: 'fatty_acid' },
  'Omega-6': { target: 12, unit: 'g', minOptimal: 70, maxOptimal: 150, category: 'fatty_acid' },
  'Saturated': { target: 20, unit: 'g', minOptimal: 0, maxOptimal: 100, category: 'fatty_acid' },
  'Cholesterol': { target: 300, unit: 'mg', minOptimal: 0, maxOptimal: 100, category: 'other' },
};

const FOOD_NUTRIENT_SOURCES: Record<string, string[]> = {
  'Iron': ['Red meat', 'Spinach', 'Lentils', 'Fortified cereals', 'Pumpkin seeds', 'Liver'],
  'Magnesium': ['Dark chocolate', 'Avocado', 'Nuts', 'Legumes', 'Whole grains', 'Spinach'],
  'Vitamin E': ['Almonds', 'Sunflower seeds', 'Spinach', 'Avocado', 'Olive oil', 'Wheat germ'],
  'Vitamin K': ['Leafy greens', 'Broccoli', 'Brussels sprouts', 'Fermented foods', 'Green beans'],
  'Fiber': ['Beans', 'Berries', 'Whole grains', 'Broccoli', 'Avocado', 'Chia seeds'],
  'Potassium': ['Bananas', 'Potatoes', 'Spinach', 'Beans', 'Avocado', 'Salmon'],
  'Calcium': ['Dairy', 'Fortified plant milk', 'Sardines', 'Leafy greens', 'Tofu'],
  'Zinc': ['Oysters', 'Beef', 'Pumpkin seeds', 'Chickpeas', 'Cashews'],
  'Omega-3': ['Fatty fish', 'Chia seeds', 'Flaxseeds', 'Walnuts', 'Fish oil'],
  'Vitamin D': ['Fatty fish', 'Egg yolks', 'Fortified foods', 'Mushrooms', 'Supplements'],
  'Folate': ['Leafy greens', 'Legumes', 'Asparagus', 'Eggs', 'Beets'],
  'Vitamin A': ['Sweet potatoes', 'Carrots', 'Spinach', 'Liver', 'Eggs'],
  'B12 (Cobalamin)': ['Meat', 'Fish', 'Eggs', 'Dairy', 'Fortified foods'],
};

// ============ FUNCTIONAL NUTRIENT GROUPINGS ============

interface NutrientGroupAssessment {
  name: string;
  description: string;
  nutrients: string[];
  avgAdequacy: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
}

const FUNCTIONAL_GROUPS: { name: string; description: string; nutrients: string[] }[] = [
  { name: 'Bone Health', description: 'Calcium, Vitamin D, Vitamin K, Magnesium, Phosphorus', nutrients: ['Calcium', 'Vitamin D', 'Vitamin K', 'Magnesium', 'Phosphorus'] },
  { name: 'Antioxidant Defense', description: 'Vitamin C, Vitamin E, Selenium, Zinc', nutrients: ['Vitamin C', 'Vitamin E', 'Selenium', 'Zinc'] },
  { name: 'Energy Metabolism', description: 'B1, B2, B3, B5, B6, Iron, Magnesium', nutrients: ['B1 (Thiamine)', 'B2 (Riboflavin)', 'B3 (Niacin)', 'B5 (Pantothenic Acid)', 'B6 (Pyridoxine)', 'Iron', 'Magnesium'] },
  { name: 'Cardiovascular', description: 'Omega-3, Potassium, Magnesium, Fiber', nutrients: ['Omega-3', 'Potassium', 'Magnesium', 'Fiber'] },
  { name: 'Immune Function', description: 'Vitamin C, Vitamin D, Zinc, Selenium, Vitamin A', nutrients: ['Vitamin C', 'Vitamin D', 'Zinc', 'Selenium', 'Vitamin A'] },
  { name: 'Blood & Oxygen', description: 'Iron, B12, Folate, Copper', nutrients: ['Iron', 'B12 (Cobalamin)', 'Folate', 'Copper'] },
  { name: 'Muscle & Recovery', description: 'Protein, Magnesium, Potassium, Calcium', nutrients: ['Protein', 'Magnesium', 'Potassium', 'Calcium'] },
];

function assessFunctionalGroups(allNutrients: NutrientData[]): NutrientGroupAssessment[] {
  const nutrientMap = new Map(allNutrients.map(n => [n.name, n]));
  return FUNCTIONAL_GROUPS.map(group => {
    const pcts: number[] = [];
    for (const name of group.nutrients) {
      const n = nutrientMap.get(name);
      if (n && n.target > 0) pcts.push(Math.min((n.value / n.target) * 100, 100));
    }
    const avg = pcts.length > 0 ? pcts.reduce((s, p) => s + p, 0) / pcts.length : 0;
    const status: NutrientGroupAssessment['status'] =
      avg >= 90 ? 'excellent' : avg >= 70 ? 'good' : avg >= 50 ? 'fair' : 'poor';
    const low = group.nutrients.filter(name => {
      const n = nutrientMap.get(name);
      return n && n.target > 0 && (n.value / n.target) * 100 < 70;
    });
    const message = low.length === 0
      ? 'All nutrients in this group are well covered.'
      : `Low in: ${low.join(', ')}. Consider targeted foods or supplementation.`;
    return { name: group.name, description: group.description, nutrients: group.nutrients, avgAdequacy: Math.round(avg), status, message };
  });
}

// Synergy-aware recommendation data
const NUTRIENT_SYNERGIES: Record<string, { boosts: string[]; tip: string }> = {
  'Iron': { boosts: ['Vitamin C'], tip: 'Pair iron-rich foods with vitamin C (e.g., spinach + bell pepper) for 2-3x better absorption.' },
  'Calcium': { boosts: ['Vitamin D'], tip: 'Vitamin D enhances calcium absorption. Get 15 min sunlight or supplement.' },
  'Vitamin D': { boosts: ['Calcium', 'Vitamin K'], tip: 'Vitamin D works with K2 and calcium for bone mineralization.' },
  'Zinc': { boosts: ['Vitamin C'], tip: 'Vitamin C aids zinc absorption. Citrus + shellfish/beans is synergistic.' },
  'Omega-3': { boosts: ['Vitamin E'], tip: 'Vitamin E protects omega-3 fats from oxidation. Include nuts/seeds.' },
};

// ============ SCORING ============

// Nutrients that are harmful when excessive (penalize excesses)
const HARMFUL_EXCESS_NUTRIENTS = new Set(['Sodium', 'Saturated', 'Cholesterol', 'Added Sugars']);

// Critical nutrients weighted more heavily in adequacy scoring
const CRITICAL_NUTRIENT_WEIGHTS: Record<string, number> = {
  'Energy': 1.5, 'Protein': 1.5, 'Fiber': 1.2,
  'Iron': 1.3, 'Calcium': 1.3, 'Vitamin D': 1.3, 'Vitamin B12': 1.2,
  'Magnesium': 1.1, 'Potassium': 1.1, 'Omega-3': 1.2, 'Zinc': 1.1,
};

function calculateOverallScore(
  deficiencies: NutrientIssue[],
  excesses: NutrientIssue[],
  allNutrients: NutrientData[],
  ratios: RatioAnalysis[],
): number {
  // 1. Nutrient Adequacy Score (0-100): weighted average of how well nutrients are met
  //    Nutrients at/above target → 100. Below target → proportional. Cap at 100 per nutrient.
  let weightedSum = 0;
  let weightTotal = 0;
  const categoryHits: Record<string, number[]> = {};

  for (const n of allNutrients) {
    const pct = n.target > 0 ? Math.min((n.value / n.target) * 100, 100) : 100;
    const w = CRITICAL_NUTRIENT_WEIGHTS[n.name] || 1;
    weightedSum += pct * w;
    weightTotal += 100 * w;
    // Track per-category for balance scoring
    const cat = NUTRIENT_TARGETS[n.name]?.category || 'other';
    if (!categoryHits[cat]) categoryHits[cat] = [];
    categoryHits[cat].push(Math.min(pct, 100));
  }
  const nutrientAdequacy = weightTotal > 0 ? (weightedSum / weightTotal) * 100 : 50;

  // 2. Excess Control Score (0-100): only penalize genuinely harmful excesses
  let excessPenalty = 0;
  let harmfulCount = 0;
  for (const e of excesses) {
    if (HARMFUL_EXCESS_NUTRIENTS.has(e.nutrient)) {
      // Penalty scales with how far over the max optimal limit
      const overPct = Math.max(0, e.percentage - 100);
      excessPenalty += Math.min(overPct * 0.3, 40); // cap per-nutrient penalty at 40
      harmfulCount++;
    }
    // Non-harmful excesses (vitamins/minerals above target but below UL) are not penalized
  }
  const excessControl = Math.max(0, 100 - excessPenalty);

  // 3. Ratio Quality Score (0-100): partial credit for suboptimal (not just binary)
  let ratioPoints = 0;
  for (const r of ratios) {
    if (r.status === 'optimal') ratioPoints += 100;
    else if (r.status === 'suboptimal') ratioPoints += 55;
    else ratioPoints += 15; // poor still gets some credit
  }
  const ratioQuality = ratios.length > 0 ? ratioPoints / ratios.length : 70; // default decent if no ratios

  // 4. Balance Score (0-100): reward coverage across nutrient categories
  let balancePoints = 0;
  let balanceTotal = 0;
  for (const [, pcts] of Object.entries(categoryHits)) {
    if (pcts.length === 0) continue;
    const avgPct = pcts.reduce((s, p) => s + p, 0) / pcts.length;
    balancePoints += Math.min(avgPct, 100);
    balanceTotal += 100;
  }
  const balanceScore = balanceTotal > 0 ? (balancePoints / balanceTotal) * 100 : 50;

  // Final weighted score with floor of 20 for any real diet
  const raw = (nutrientAdequacy * 0.45) + (excessControl * 0.25) + (ratioQuality * 0.15) + (balanceScore * 0.15);
  return Math.round(Math.max(20, Math.min(100, raw)));
}

// ============ PARSING FUNCTIONS ============

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCronometerCSV(csvText: string): DailyNutrients[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Skip header row
  const dailyMap = new Map<string, DailyNutrients>();

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 10) continue;

    const date = values[CSV_COLUMNS.Day];
    if (!date || date === 'Day') continue; // Skip if header row or empty

    const meal = values[CSV_COLUMNS.Group] || 'Other';
    const foodName = values[CSV_COLUMNS.FoodName] || '';
    const amount = values[CSV_COLUMNS.Amount] || '';
    const category = values[CSV_COLUMNS.Category]?.replace(/"/g, '') || 'Other';

    // Parse numeric values safely
    const parseNum = (idx: number): number => {
      const val = values[idx];
      if (!val || val === '') return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };

    // Initialize day if not exists
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        nutrients: {
          Energy: 0, Protein: 0, Carbs: 0, Fat: 0, Fiber: 0,
          'B1 (Thiamine)': 0, 'B2 (Riboflavin)': 0, 'B3 (Niacin)': 0,
          'B5 (Pantothenic Acid)': 0, 'B6 (Pyridoxine)': 0, 'B12 (Cobalamin)': 0,
          Folate: 0, 'Vitamin A': 0, 'Vitamin C': 0, 'Vitamin D': 0,
          'Vitamin E': 0, 'Vitamin K': 0, Calcium: 0, Copper: 0, Iron: 0,
          Magnesium: 0, Manganese: 0, Phosphorus: 0, Potassium: 0,
          Selenium: 0, Sodium: 0, Zinc: 0, 'Omega-3': 0, 'Omega-6': 0,
          Saturated: 0, Cholesterol: 0,
        },
        foods: [],
      });
    }

    const day = dailyMap.get(date)!;

    // Add food entry
    const calories = parseNum(CSV_COLUMNS.Energy);
    if (foodName) {
      day.foods.push({
        name: foodName,
        amount,
        calories,
        protein: parseNum(CSV_COLUMNS.Protein),
        carbs: parseNum(CSV_COLUMNS.Carbs),
        fat: parseNum(CSV_COLUMNS.Fat),
        meal,
        category,
      });
    }

    // Aggregate nutrients
    day.nutrients['Energy'] += calories;
    day.nutrients['Protein'] += parseNum(CSV_COLUMNS.Protein);
    day.nutrients['Carbs'] += parseNum(CSV_COLUMNS.Carbs);
    day.nutrients['Fat'] += parseNum(CSV_COLUMNS.Fat);
    day.nutrients['Fiber'] += parseNum(CSV_COLUMNS.Fiber);
    day.nutrients['B1 (Thiamine)'] += parseNum(CSV_COLUMNS.B1);
    day.nutrients['B2 (Riboflavin)'] += parseNum(CSV_COLUMNS.B2);
    day.nutrients['B3 (Niacin)'] += parseNum(CSV_COLUMNS.B3);
    day.nutrients['B5 (Pantothenic Acid)'] += parseNum(CSV_COLUMNS.B5);
    day.nutrients['B6 (Pyridoxine)'] += parseNum(CSV_COLUMNS.B6);
    day.nutrients['B12 (Cobalamin)'] += parseNum(CSV_COLUMNS.B12);
    day.nutrients['Folate'] += parseNum(CSV_COLUMNS.Folate);
    day.nutrients['Vitamin A'] += parseNum(CSV_COLUMNS.VitaminA);
    day.nutrients['Vitamin C'] += parseNum(CSV_COLUMNS.VitaminC);
    day.nutrients['Vitamin D'] += parseNum(CSV_COLUMNS.VitaminD);
    day.nutrients['Vitamin E'] += parseNum(CSV_COLUMNS.VitaminE);
    day.nutrients['Vitamin K'] += parseNum(CSV_COLUMNS.VitaminK);
    day.nutrients['Calcium'] += parseNum(CSV_COLUMNS.Calcium);
    day.nutrients['Copper'] += parseNum(CSV_COLUMNS.Copper);
    day.nutrients['Iron'] += parseNum(CSV_COLUMNS.Iron);
    day.nutrients['Magnesium'] += parseNum(CSV_COLUMNS.Magnesium);
    day.nutrients['Manganese'] += parseNum(CSV_COLUMNS.Manganese);
    day.nutrients['Phosphorus'] += parseNum(CSV_COLUMNS.Phosphorus);
    day.nutrients['Potassium'] += parseNum(CSV_COLUMNS.Potassium);
    day.nutrients['Selenium'] += parseNum(CSV_COLUMNS.Selenium);
    day.nutrients['Sodium'] += parseNum(CSV_COLUMNS.Sodium);
    day.nutrients['Zinc'] += parseNum(CSV_COLUMNS.Zinc);
    day.nutrients['Omega-3'] += parseNum(CSV_COLUMNS.Omega3);
    day.nutrients['Omega-6'] += parseNum(CSV_COLUMNS.Omega6);
    day.nutrients['Saturated'] += parseNum(CSV_COLUMNS.Saturated);
    day.nutrients['Cholesterol'] += parseNum(CSV_COLUMNS.Cholesterol);
  }

  return Array.from(dailyMap.values());
}

function parseCronometerPDF(pdfText: string): DailyNutrients[] {
  // Extract key data from PDF text format
  const dailyData: DailyNutrients[] = [];
  
  // Look for "Daily Average" section
  const avgMatch = pdfText.match(/Daily Average.*?Energy\s+([\d,.]+).*?Protein\s+([\d,.]+).*?Carbs\s+([\d,.]+).*?Fat\s+([\d,.]+)/is);
  
  // Parse nutrient values from PDF format like "Energy 2195.6 kcal 113%"
  const extractNutrient = (pattern: RegExp): number => {
    const match = pdfText.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(',', '')) || 0;
    }
    return 0;
  };

  // Create a summary day from PDF data
  const nutrients: Record<string, number> = {
    'Energy': extractNutrient(/Energy\s+([\d,.]+)\s*kcal/i),
    'Protein': extractNutrient(/Protein\s+([\d,.]+)\s*g/i),
    'Carbs': extractNutrient(/Carbs\s+([\d,.]+)\s*g/i),
    'Fat': extractNutrient(/Fat\s+([\d,.]+)\s*g/i),
    'Fiber': extractNutrient(/Fiber\s+([\d,.]+)\s*g/i),
    'B1 (Thiamine)': extractNutrient(/B1.*?Thiamine.*?([\d,.]+)\s*mg/i),
    'B2 (Riboflavin)': extractNutrient(/B2.*?Riboflavin.*?([\d,.]+)\s*mg/i),
    'B3 (Niacin)': extractNutrient(/B3.*?Niacin.*?([\d,.]+)\s*mg/i),
    'B5 (Pantothenic Acid)': extractNutrient(/B5.*?Pantothenic.*?([\d,.]+)\s*mg/i),
    'B6 (Pyridoxine)': extractNutrient(/B6.*?Pyridoxine.*?([\d,.]+)\s*mg/i),
    'B12 (Cobalamin)': extractNutrient(/B12.*?Cobalamin.*?([\d,.]+)\s*[µu]g/i),
    'Folate': extractNutrient(/Folate\s+([\d,.]+)\s*[µu]g/i),
    'Vitamin A': extractNutrient(/Vitamin\s*A\s+([\d,.]+)\s*[µu]g/i),
    'Vitamin C': extractNutrient(/Vitamin\s*C\s+([\d,.]+)\s*mg/i),
    'Vitamin D': extractNutrient(/Vitamin\s*D\s+([\d,.]+)\s*IU/i),
    'Vitamin E': extractNutrient(/Vitamin\s*E\s+([\d,.]+)\s*mg/i),
    'Vitamin K': extractNutrient(/Vitamin\s*K\s+([\d,.]+)\s*[µu]g/i),
    'Calcium': extractNutrient(/Calcium\s+([\d,.]+)\s*mg/i),
    'Copper': extractNutrient(/Copper\s+([\d,.]+)\s*mg/i),
    'Iron': extractNutrient(/Iron\s+([\d,.]+)\s*mg/i),
    'Magnesium': extractNutrient(/Magnesium\s+([\d,.]+)\s*mg/i),
    'Manganese': extractNutrient(/Manganese\s+([\d,.]+)\s*mg/i),
    'Phosphorus': extractNutrient(/Phosphorus\s+([\d,.]+)\s*mg/i),
    'Potassium': extractNutrient(/Potassium\s+([\d,.]+)\s*mg/i),
    'Selenium': extractNutrient(/Selenium\s+([\d,.]+)\s*[µu]g/i),
    'Sodium': extractNutrient(/Sodium\s+([\d,.]+)\s*mg/i),
    'Zinc': extractNutrient(/Zinc\s+([\d,.]+)\s*mg/i),
    'Omega-3': extractNutrient(/Omega-?3\s+([\d,.]+)\s*g/i),
    'Omega-6': extractNutrient(/Omega-?6\s+([\d,.]+)\s*g/i),
    'Saturated': extractNutrient(/Saturated\s+([\d,.]+)\s*g/i),
    'Cholesterol': extractNutrient(/Cholesterol\s+([\d,.]+)\s*mg/i),
  };

  // Extract date range
  const dateMatch = pdfText.match(/(\w+\s+\d+,\s+\d{4})\s+to\s+(\w+\s+\d+,\s+\d{4})/i);
  const dateRange = dateMatch ? `${dateMatch[1]} to ${dateMatch[2]}` : 'PDF Report';

  // Only add if we found actual data
  if (nutrients['Energy'] > 0 || nutrients['Protein'] > 0) {
    dailyData.push({
      date: dateRange,
      nutrients,
      foods: [], // PDF doesn't have detailed food list in easy format
    });
  }

  return dailyData;
}

// ============ ANALYSIS FUNCTIONS ============

function calculateAverages(dailyData: DailyNutrients[]): Map<string, number> {
  const averages = new Map<string, number>();
  
  if (dailyData.length === 0) return averages;

  // Initialize totals
  const totals: Record<string, number> = {};
  
  for (const day of dailyData) {
    for (const [nutrient, value] of Object.entries(day.nutrients)) {
      totals[nutrient] = (totals[nutrient] || 0) + value;
    }
  }

  // Calculate averages
  for (const [nutrient, total] of Object.entries(totals)) {
    averages.set(nutrient, total / dailyData.length);
  }

  return averages;
}

function analyzeNutrients(
  averages: Map<string, number>,
  targets: Record<string, { target: number; unit: string; minOptimal: number; maxOptimal: number; category: string }>
): { deficiencies: NutrientIssue[]; excesses: NutrientIssue[]; allNutrients: NutrientData[] } {
  const deficiencies: NutrientIssue[] = [];
  const excesses: NutrientIssue[] = [];
  const allNutrients: NutrientData[] = [];

  for (const [nutrient, config] of Object.entries(targets)) {
    const actual = averages.get(nutrient) || 0;
    const percentage = config.target > 0 ? (actual / config.target) * 100 : 0;

    allNutrients.push({
      name: nutrient,
      value: Math.round(actual * 10) / 10,
      unit: config.unit,
      target: config.target,
      percentage: Math.round(percentage),
    });

    if (percentage < config.minOptimal && percentage > 0) {
      const severity = percentage < 50 ? 'critical' : percentage < 70 ? 'warning' : 'info';
      deficiencies.push({
        nutrient,
        status: percentage < 50 ? 'deficient' : 'low',
        percentage: Math.round(percentage),
        target: config.target,
        actual: Math.round(actual * 10) / 10,
        unit: config.unit,
        severity,
        message: getDeficiencyMessage(nutrient, percentage),
      });
    } else if (percentage > config.maxOptimal) {
      const severity = percentage > 400 ? 'critical' : percentage > 250 ? 'warning' : 'info';
      excesses.push({
        nutrient,
        status: percentage > 400 ? 'excess' : 'high',
        percentage: Math.round(percentage),
        target: config.target,
        actual: Math.round(actual * 10) / 10,
        unit: config.unit,
        severity,
        message: getExcessMessage(nutrient, percentage),
      });
    }
  }

  return { deficiencies, excesses, allNutrients };
}

function analyzeRatios(averages: Map<string, number>): RatioAnalysis[] {
  const ratios: RatioAnalysis[] = [];

  // Omega-6:Omega-3 ratio (optimal 2:1 to 4:1)
  const omega6 = averages.get('Omega-6') || 0;
  const omega3 = averages.get('Omega-3') || 0;
  if (omega3 > 0) {
    const ratio = omega6 / omega3;
    ratios.push({
      name: 'Omega-6 : Omega-3',
      ratio: Math.round(ratio * 10) / 10,
      optimal: { min: 2, max: 4 },
      status: ratio >= 2 && ratio <= 4 ? 'optimal' : ratio <= 6 ? 'suboptimal' : 'poor',
      message: ratio > 4 
        ? `High ratio (${ratio.toFixed(1)}:1). Increase omega-3 rich foods like fatty fish, chia seeds, flaxseeds.`
        : ratio < 2
          ? `Low ratio (${ratio.toFixed(1)}:1). This is generally fine.`
          : `Good ratio (${ratio.toFixed(1)}:1). Well balanced.`,
    });
  }

  // Potassium:Sodium ratio (optimal >1:1)
  const potassium = averages.get('Potassium') || 0;
  const sodium = averages.get('Sodium') || 0;
  if (sodium > 0) {
    const ratio = potassium / sodium;
    ratios.push({
      name: 'Potassium : Sodium',
      ratio: Math.round(ratio * 100) / 100,
      optimal: { min: 1, max: 3 },
      status: ratio >= 1 ? 'optimal' : ratio >= 0.5 ? 'suboptimal' : 'poor',
      message: ratio < 1
        ? `Low ratio (${ratio.toFixed(1)}:1). Reduce sodium and increase potassium-rich foods.`
        : `Good ratio (${ratio.toFixed(1)}:1). Healthy electrolyte balance.`,
    });
  }

  // Calcium:Magnesium ratio (optimal 2:1)
  const calcium = averages.get('Calcium') || 0;
  const magnesium = averages.get('Magnesium') || 0;
  if (magnesium > 0) {
    const ratio = calcium / magnesium;
    ratios.push({
      name: 'Calcium : Magnesium',
      ratio: Math.round(ratio * 10) / 10,
      optimal: { min: 1.5, max: 2.5 },
      status: ratio >= 1.5 && ratio <= 2.5 ? 'optimal' : ratio >= 1 && ratio <= 3 ? 'suboptimal' : 'poor',
      message: ratio > 2.5
        ? `High ratio (${ratio.toFixed(1)}:1). May need more magnesium for optimal absorption.`
        : ratio < 1.5
          ? `Low ratio (${ratio.toFixed(1)}:1). Consider calcium intake.`
          : `Good ratio (${ratio.toFixed(1)}:1). Well balanced for absorption.`,
    });
  }

  // Zinc:Copper ratio (optimal 8:1 to 12:1)
  const zinc = averages.get('Zinc') || 0;
  const copper = averages.get('Copper') || 0;
  if (copper > 0) {
    const ratio = zinc / copper;
    ratios.push({
      name: 'Zinc : Copper',
      ratio: Math.round(ratio * 10) / 10,
      optimal: { min: 8, max: 15 },
      status: ratio >= 8 && ratio <= 15 ? 'optimal' : ratio >= 5 && ratio <= 20 ? 'suboptimal' : 'poor',
      message: ratio > 15
        ? `High ratio (${ratio.toFixed(1)}:1). May need more copper.`
        : ratio < 8
          ? `Low ratio (${ratio.toFixed(1)}:1). Ensure adequate zinc intake.`
          : `Good ratio (${ratio.toFixed(1)}:1). Well balanced.`,
    });
  }

  return ratios;
}

function generateRecommendations(
  deficiencies: NutrientIssue[],
  excesses: NutrientIssue[],
  topFoods: { name: string; count: number; totalCalories: number }[]
): FoodRecommendation[] {
  const recommendations: FoodRecommendation[] = [];
  const topFoodNames = new Set(topFoods.map(f => f.name.toLowerCase()));

  // Helper: check if client already eats a food
  const alreadyEats = (keyword: string) => {
    const kw = keyword.toLowerCase();
    for (const name of topFoodNames) {
      if (name.includes(kw) || kw.includes(name)) return true;
    }
    return false;
  };

  // Smart food suggestions for deficiencies — consider existing diet
  for (const def of deficiencies.slice(0, 8)) {
    const sources = FOOD_NUTRIENT_SOURCES[def.nutrient];
    if (!sources) continue;

    // Find a food they don't already eat frequently
    const newFood = sources.find(s => !alreadyEats(s.split(' ')[0]));
    const existingFood = sources.find(s => alreadyEats(s.split(' ')[0]));

    if (existingFood && newFood) {
      recommendations.push({
        type: 'increase',
        food: existingFood,
        reason: `You already eat ${existingFood.toLowerCase()} — increase portions or frequency. ${def.nutrient} is at ${def.percentage}% of target.`,
        nutrients: [def.nutrient],
      });
    } else if (newFood) {
      recommendations.push({
        type: 'add',
        food: newFood,
        reason: `${def.nutrient} is at ${def.percentage}% of target. ${newFood} is an excellent source not currently in your diet.`,
        nutrients: [def.nutrient],
      });
    } else {
      recommendations.push({
        type: 'add',
        food: sources.slice(0, 2).join(' or '),
        reason: `${def.nutrient} is at ${def.percentage}% of target. These are excellent sources.`,
        nutrients: [def.nutrient],
      });
    }

    // Add synergy tips where applicable
    const synergy = NUTRIENT_SYNERGIES[def.nutrient];
    if (synergy) {
      recommendations.push({
        type: 'add',
        food: synergy.tip,
        reason: `Synergy: ${def.nutrient} absorption is enhanced by ${synergy.boosts.join(', ')}.`,
        nutrients: [def.nutrient, ...synergy.boosts],
      });
    }
  }

  // Harmful excess reductions
  const sodiumExcess = excesses.find(e => e.nutrient === 'Sodium');
  if (sodiumExcess) {
    recommendations.push({
      type: 'reduce',
      food: 'Processed foods, cured meats, canned soups',
      reason: `Sodium is ${sodiumExcess.percentage}% of target (${sodiumExcess.actual}mg). Aim for <2300mg/day.`,
      nutrients: ['Sodium'],
    });
  }

  // Saturated fat swaps
  const saturatedExcess = excesses.find(e => e.nutrient === 'Saturated');
  if (saturatedExcess) {
    if (alreadyEats('beef') || alreadyEats('sausage') || alreadyEats('bacon')) {
      recommendations.push({
        type: 'swap',
        food: 'Higher-fat meats (beef, sausage, bacon)',
        swapFor: '93%+ lean ground turkey/beef, chicken breast, or fish',
        reason: `Saturated fat is at ${saturatedExcess.percentage}% of target. Leaner protein swaps make a big impact.`,
        nutrients: ['Saturated'],
      });
    } else {
      recommendations.push({
        type: 'reduce',
        food: 'Full-fat dairy, fried foods, baked goods',
        reason: `Saturated fat at ${saturatedExcess.percentage}%. Choose lower-fat dairy or reduce frying.`,
        nutrients: ['Saturated'],
      });
    }
  }

  // Fiber
  const fiberDef = deficiencies.find(d => d.nutrient === 'Fiber');
  if (fiberDef) {
    recommendations.push({
      type: 'add',
      food: 'Beans, lentils, chia seeds, or berries',
      reason: `Fiber at ${fiberDef.percentage}% of target. Add 1 serving of legumes or berries daily for 5-8g extra fiber.`,
      nutrients: ['Fiber'],
    });
  }

  // Vitamin D supplements note
  const vitDExcess = excesses.find(e => e.nutrient === 'Vitamin D' && e.percentage > 500);
  if (vitDExcess) {
    recommendations.push({
      type: 'reduce',
      food: 'Vitamin D supplements',
      reason: `Very high Vitamin D (${vitDExcess.percentage}%). Consider reducing supplement dose.`,
      nutrients: ['Vitamin D'],
    });
  }

  // Cholesterol
  const cholesterolExcess = excesses.find(e => e.nutrient === 'Cholesterol');
  if (cholesterolExcess && cholesterolExcess.percentage > 130) {
    recommendations.push({
      type: 'swap',
      food: 'Whole eggs (3+ per day)',
      swapFor: 'Egg whites + 1 whole egg, or limit to 2 whole eggs/day',
      reason: `Cholesterol at ${cholesterolExcess.percentage}% of limit. Reducing yolks is the easiest win.`,
      nutrients: ['Cholesterol'],
    });
  }

  return recommendations;
}

function getDeficiencyMessage(nutrient: string, percentage: number): string {
  const messages: Record<string, string> = {
    'Iron': 'Low iron can cause fatigue. Pair iron-rich foods with vitamin C for better absorption.',
    'Magnesium': 'Magnesium supports muscle function, sleep, and over 300 enzymatic reactions.',
    'Vitamin E': 'Vitamin E is an important antioxidant. Include nuts, seeds, and healthy oils.',
    'Fiber': 'Low fiber affects gut health, satiety, and blood sugar control.',
    'Potassium': 'Potassium is crucial for heart rhythm and muscle function.',
    'Calcium': 'Calcium is essential for bone health and muscle contraction.',
    'Zinc': 'Zinc supports immune function, wound healing, and protein synthesis.',
    'Vitamin K': 'Vitamin K is essential for blood clotting and bone metabolism.',
    'Omega-3': 'Omega-3s are anti-inflammatory and support brain and heart health.',
    'Vitamin D': 'Vitamin D is crucial for immune function, bones, and mood.',
    'Folate': 'Folate is essential for cell division and DNA synthesis.',
    'Vitamin A': 'Vitamin A supports vision, immune function, and skin health.',
    'B12 (Cobalamin)': 'B12 is essential for nerve function and red blood cell formation.',
  };
  return messages[nutrient] || `${nutrient} is at ${percentage.toFixed(0)}% of target. Consider increasing intake.`;
}

function getExcessMessage(nutrient: string, percentage: number): string {
  const messages: Record<string, string> = {
    'Sodium': 'High sodium may increase blood pressure. Reduce processed foods and added salt.',
    'Fat': 'Consider portion sizes and choosing leaner protein sources.',
    'Vitamin D': 'Very high from supplementation. Excess vitamin D can be stored in fat tissue.',
    'Vitamin C': 'High vitamin C from supplements. Generally safe but excess is excreted.',
    'Selenium': 'High selenium. Avoid Brazil nuts if consuming them regularly.',
    'Saturated': 'High saturated fat may affect cardiovascular health. Choose leaner options.',
    'Cholesterol': 'Dietary cholesterol impact varies by individual. Monitor with blood tests.',
  };
  return messages[nutrient] || `${nutrient} is at ${percentage.toFixed(0)}% of target. Consider moderating intake.`;
}

// ============ COMPONENT ============

export default function NutritionAnalysisPage() {
  const router = useRouter();

  const [csvData, setCsvData] = useState<string>('');
  const [pdfData, setPdfData] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [parseLog, setParseLog] = useState<string[]>([]);
  
  // New features
  const [coachComments, setCoachComments] = useState<string>('');
  const [aiRecommendations, setAiRecommendations] = useState<string>('');
  const [sampleDayPlan, setSampleDayPlan] = useState<any>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [correctivePlan, setCorrectivePlan] = useState<string>('');
  const [isGeneratingCorrective, setIsGeneratingCorrective] = useState(false);
  const [nutrientGroups, setNutrientGroups] = useState<NutrientGroupAssessment[]>([]);
  
  // Cronometer integration
  const [cronometerStatus, setCronometerStatus] = useState<{
    configured: boolean;
    connected: boolean;
    userId: string | null;
  } | null>(null);
  const [cronometerClients, setCronometerClients] = useState<Array<{
    client_id: number;
    name: string;
    email?: string;
    status: string;
  }>>([]);
  const [selectedCronometerClient, setSelectedCronometerClient] = useState<string>('self');
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [cronometerDateRange, setCronometerDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [isImportingCronometer, setIsImportingCronometer] = useState(false);
  const [cronometerLoading, setCronometerLoading] = useState(true);

  // Custom targets
  const [customTargets, setCustomTargets] = useState({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 75,
  });

  // Get active Fitomics client for auto-linking
  const { getActiveClient } = useFitomicsStore();
  const activeClient = getActiveClient();

  // Compute functional nutrient groups when analysis is available
  useEffect(() => {
    if (analysisResult?.dailyAverages) {
      setNutrientGroups(assessFunctionalGroups(analysisResult.dailyAverages));
    }
  }, [analysisResult]);

  // Check Cronometer status on mount
  useEffect(() => {
    const checkCronometerStatus = async () => {
      try {
        const response = await fetch('/api/cronometer/status');
        const data = await response.json();
        setCronometerStatus(data);
        
        if (data.connected) {
          const clientsResponse = await fetch('/api/cronometer/clients');
          if (clientsResponse.ok) {
            const clientsData = await clientsResponse.json();
            setCronometerClients(clientsData.clients || []);
            
            // Auto-select linked Cronometer client if active Fitomics client has one
            if (activeClient?.cronometerClientId) {
              const linkedClient = clientsData.clients?.find(
                (c: { client_id: number }) => c.client_id === activeClient.cronometerClientId
              );
              if (linkedClient) {
                setSelectedCronometerClient(linkedClient.client_id.toString());
                console.log(`[Cronometer] Auto-selected linked client: ${linkedClient.name}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to check Cronometer status:', error);
      } finally {
        setCronometerLoading(false);
      }
    };
    
    checkCronometerStatus();
  }, [activeClient?.cronometerClientId]);

  // Import from Cronometer
  const handleCronometerImport = useCallback(async () => {
    if (!cronometerStatus?.connected) {
      toast.error('Please connect to Cronometer first');
      return;
    }
    
    setIsImportingCronometer(true);
    setParseLog([]);
    
    try {
      const params = new URLSearchParams({
        start: format(cronometerDateRange.from, 'yyyy-MM-dd'),
        end: format(cronometerDateRange.to, 'yyyy-MM-dd'),
      });
      
      if (selectedCronometerClient && selectedCronometerClient !== 'self') {
        params.append('client_id', selectedCronometerClient);
      }
      
      const response = await fetch(`/api/cronometer/import?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import from Cronometer');
      }
      
      const result = await response.json();
      console.log('[Cronometer Import] Full API response:', result);
      
      const logs: string[] = [];
      
      // Check if we got actual data
      if (result.daysImported === 0 || !result.data?.summary?.totalCalories) {
        logs.push('No nutrition data found for selected date range');
        if (result.message) {
          logs.push(result.message);
        }
        if (result.daysWithEntries) {
          logs.push(`Days with entries in Cronometer: ${result.daysWithEntries.length}`);
        }
        setParseLog(logs);
        toast.warning(result.message || 'No diary data found. Make sure the client has logged food in Cronometer.');
        return;
      }
      
      // Build detailed logs
      logs.push(`✓ Imported ${result.daysImported} days from Cronometer`);
      if (result.daysWithEntries?.length) {
        logs.push(`✓ Days with food entries: ${result.daysWithEntries.join(', ')}`);
      }
      logs.push(`✓ Daily avg: ${result.data.summary.totalCalories} kcal`);
      logs.push(`✓ Macros: ${result.data.summary.totalProtein}g P / ${result.data.summary.totalCarbs}g C / ${result.data.summary.totalFat}g F`);
      logs.push(`✓ Nutrients tracked: ${result.data.dailyAverages?.length || 0}`);
      logs.push(`✓ Foods logged: ${result.data.topFoods?.length || 0} unique items`);
      
      // Automatically apply client's Cronometer targets if available
      if (result.targets && Object.keys(result.targets).length > 0) {
        const getTargetValue = (keys: string[]): number | null => {
          for (const key of keys) {
            const t = result.targets[key];
            if (t && (t.min || t.max)) {
              return t.min || t.max;
            }
          }
          return null;
        };
        
        const newTargets = {
          calories: Math.round(getTargetValue(['Energy', 'Calories', 'kcal']) || customTargets.calories),
          protein: Math.round(getTargetValue(['Protein']) || customTargets.protein),
          carbs: Math.round(getTargetValue(['Carbohydrates', 'Carbs', 'Total Carbs']) || customTargets.carbs),
          fat: Math.round(getTargetValue(['Fat', 'Total Fat']) || customTargets.fat),
        };
        
        setCustomTargets(newTargets);
        logs.push(`✓ Applied client targets: ${newTargets.calories} kcal / ${newTargets.protein}g P / ${newTargets.carbs}g C / ${newTargets.fat}g F`);
      }
      
      setParseLog(logs);
      
      // Use targets for analysis (either from Cronometer or custom)
      const analysisTargets = { ...NUTRIENT_TARGETS };
      if (result.targets) {
        // Apply Cronometer targets to analysis
        const getTargetValue = (keys: string[]): number | null => {
          for (const key of keys) {
            const t = result.targets[key];
            if (t && (t.min || t.max)) {
              return t.min || t.max;
            }
          }
          return null;
        };
        
        const energyTarget = getTargetValue(['Energy', 'Calories', 'kcal']);
        const proteinTarget = getTargetValue(['Protein']);
        const carbsTarget = getTargetValue(['Carbohydrates', 'Carbs', 'Total Carbs']);
        const fatTarget = getTargetValue(['Fat', 'Total Fat']);
        
        if (energyTarget) analysisTargets['Energy'].target = energyTarget;
        if (proteinTarget) analysisTargets['Protein'].target = proteinTarget;
        if (carbsTarget) analysisTargets['Carbs'].target = carbsTarget;
        if (fatTarget) analysisTargets['Fat'].target = fatTarget;
      }
      
      // Convert to analysis format using client's targets
      const { deficiencies, excesses, allNutrients } = analyzeNutrients(
        new Map(result.data.dailyAverages.map((n: NutrientData) => [n.name, n.value])),
        analysisTargets
      );
      
      // Build the averages map for ratio analysis
      const averagesMap = new Map<string, number>();
      for (const nutrient of result.data.dailyAverages) {
        averagesMap.set(nutrient.name, nutrient.value);
      }
      const ratios = analyzeRatios(averagesMap);
      const recommendations = generateRecommendations(deficiencies, excesses, result.data.topFoods);
      
      // Calculate score using weighted adequacy-based system
      const overallScore = calculateOverallScore(deficiencies, excesses, allNutrients, ratios);
      
      console.log('[Cronometer Import] Setting analysis result with score:', overallScore);
      console.log('[Cronometer Import] Deficiencies:', deficiencies.length, 'Excesses:', excesses.length);
      console.log('[Cronometer Import] Top foods:', result.data.topFoods?.length || 0);
      
      setAnalysisResult({
        summary: {
          ...result.data.summary,
          overallScore, // Include the calculated score
        },
        dailyAverages: allNutrients,
        deficiencies,
        excesses,
        ratios,
        recommendations,
        topFoods: result.data.topFoods || [],
        dailyBreakdown: result.data.dailyBreakdown || [],
      });
      
      toast.success(`Imported ${result.daysImported} days from Cronometer (${result.data.dailyAverages?.length || 0} nutrients tracked)`);
    } catch (error) {
      console.error('Cronometer import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import from Cronometer');
    } finally {
      setIsImportingCronometer(false);
    }
  }, [cronometerStatus, cronometerDateRange, selectedCronometerClient, customTargets]);

  // CSV file upload handler
  const handleCSVUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setCsvFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvData(content);
      
      // Quick parse check
      const lines = content.split('\n').filter(l => l.trim());
      setParseLog(prev => [...prev, `CSV loaded: ${lines.length} lines found`]);
      toast.success(`CSV "${file.name}" loaded - ${lines.length} rows`);
    };

    reader.onerror = () => {
      toast.error('Error reading CSV file');
    };

    reader.readAsText(file);
  }, []);

  // PDF file upload handler
  const handlePDFUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    setPdfFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPdfData(content);
      setParseLog(prev => [...prev, `PDF loaded: ${file.name}`]);
      toast.success(`PDF "${file.name}" loaded`);
    };

    reader.onerror = () => {
      toast.error('Error reading PDF file');
    };

    reader.readAsText(file);
  }, []);

  const clearFile = (type: 'csv' | 'pdf') => {
    if (type === 'csv') {
      setCsvData('');
      setCsvFileName('');
    } else {
      setPdfData('');
      setPdfFileName('');
    }
  };

  // Analyze data
  const handleAnalyze = useCallback(() => {
    if (!csvData && !pdfData) {
      toast.error('Please upload a CSV or PDF file');
      return;
    }

    setIsAnalyzing(true);
    setParseLog([]);

    try {
      let dailyData: DailyNutrients[] = [];
      const logs: string[] = [];

      // Parse CSV data (preferred)
      if (csvData) {
        logs.push('Parsing CSV data...');
        dailyData = parseCronometerCSV(csvData);
        logs.push(`Found ${dailyData.length} days in CSV`);
        
        if (dailyData.length > 0) {
          const firstDay = dailyData[0];
          logs.push(`First day: ${firstDay.date}`);
          logs.push(`Foods logged: ${firstDay.foods.length}`);
          logs.push(`Calories: ${Math.round(firstDay.nutrients['Energy'])} kcal`);
        }
      }

      // Parse PDF data as fallback or supplement
      if (pdfData && dailyData.length === 0) {
        logs.push('Parsing PDF data...');
        dailyData = parseCronometerPDF(pdfData);
        logs.push(`Extracted ${dailyData.length} summary records from PDF`);
      }

      setParseLog(logs);

      if (dailyData.length === 0) {
        toast.error('No nutritional data found. Check file format.');
        setIsAnalyzing(false);
        return;
      }

      // Calculate averages
      const averages = calculateAverages(dailyData);

      // Update targets with custom values
      const targets = { ...NUTRIENT_TARGETS };
      targets['Energy'].target = customTargets.calories;
      targets['Protein'].target = customTargets.protein;
      targets['Carbs'].target = customTargets.carbs;
      targets['Fat'].target = customTargets.fat;

      // Analyze
      const { deficiencies, excesses, allNutrients } = analyzeNutrients(averages, targets);
      const ratios = analyzeRatios(averages);

      // Get top foods
      const foodCounts = new Map<string, { count: number; calories: number }>();
      for (const day of dailyData) {
        for (const food of day.foods) {
          const key = food.name;
          const current = foodCounts.get(key) || { count: 0, calories: 0 };
          foodCounts.set(key, {
            count: current.count + 1,
            calories: current.calories + food.calories,
          });
        }
      }
      const topFoods = Array.from(foodCounts.entries())
        .map(([name, data]) => ({ name, count: data.count, totalCalories: Math.round(data.calories) }))
        .filter(f => f.name && f.name.trim() !== '')
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      // Generate recommendations
      const recommendations = generateRecommendations(deficiencies, excesses, topFoods);

      // Calculate overall score using weighted adequacy-based system
      const overallScore = calculateOverallScore(deficiencies, excesses, allNutrients, ratios);

      setAnalysisResult({
        summary: {
          totalCalories: Math.round(averages.get('Energy') || 0),
          totalProtein: Math.round(averages.get('Protein') || 0),
          totalCarbs: Math.round(averages.get('Carbs') || 0),
          totalFat: Math.round(averages.get('Fat') || 0),
          totalFiber: Math.round(averages.get('Fiber') || 0),
          daysAnalyzed: dailyData.length,
          overallScore: Math.min(100, Math.max(0, overallScore)),
        },
        dailyAverages: allNutrients,
        deficiencies: deficiencies.sort((a, b) => a.percentage - b.percentage),
        excesses: excesses.sort((a, b) => b.percentage - a.percentage),
        ratios,
        recommendations,
        topFoods,
        dailyBreakdown: dailyData,
      });

      toast.success(`Analysis complete! ${dailyData.length} days analyzed.`);
    } catch (error) {
      console.error(error);
      toast.error('Error analyzing data. Check console for details.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [csvData, pdfData, customTargets]);

  // Generate AI recommendations and sample day
  const generateAIRecommendations = useCallback(async () => {
    if (!analysisResult) return;
    
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/generate-nutrition-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: {
            summary: analysisResult.summary,
            deficiencies: analysisResult.deficiencies,
            excesses: analysisResult.excesses,
            ratios: analysisResult.ratios,
            topFoods: analysisResult.topFoods,
          },
          targets: customTargets,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate recommendations');
      }

      const data = await response.json();
      setAiRecommendations(data.recommendations);
      setSampleDayPlan(data.sampleDay);
      toast.success('AI recommendations generated!');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate AI recommendations');
    } finally {
      setIsGeneratingAI(false);
    }
  }, [analysisResult, customTargets]);

  // Generate corrective meal plan
  const generateCorrectivePlan = useCallback(async () => {
    if (!analysisResult) return;

    setIsGeneratingCorrective(true);
    try {
      const response = await fetch('/api/generate-nutrition-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: {
            summary: analysisResult.summary,
            deficiencies: analysisResult.deficiencies,
            excesses: analysisResult.excesses,
            ratios: analysisResult.ratios,
            topFoods: analysisResult.topFoods,
          },
          targets: customTargets,
          mode: 'corrective_meal_plan',
          nutrientGroups: nutrientGroups.filter(g => g.status === 'poor' || g.status === 'fair'),
        }),
      });

      if (!response.ok) throw new Error('Failed to generate corrective plan');

      const data = await response.json();
      setCorrectivePlan(data.recommendations || data.correctivePlan || '');
      toast.success('Corrective meal plan generated!');
    } catch (error) {
      console.error('Corrective plan error:', error);
      toast.error('Failed to generate corrective meal plan');
    } finally {
      setIsGeneratingCorrective(false);
    }
  }, [analysisResult, customTargets, nutrientGroups]);

  // Download PDF report
  const downloadPDF = async () => {
    if (!analysisResult) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch('/api/generate-nutrition-analysis-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: analysisResult,
          targets: customTargets,
          coachComments,
          aiRecommendations,
          sampleDayPlan,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nutrition-analysis-report.pdf';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deficient':
      case 'excess':
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'low':
      case 'high':
      case 'suboptimal':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'optimal':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPercentageColor = (pct: number) => {
    if (pct < 50) return 'text-red-600';
    if (pct < 80) return 'text-yellow-600';
    if (pct <= 150) return 'text-green-600';
    if (pct <= 250) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Beaker className="h-8 w-8 text-[#c19962]" />
            <h1 className="text-3xl font-bold">Nutrition Analysis Tool</h1>
          </div>
          <p className="text-muted-foreground">
            Upload Cronometer exports to identify nutrient gaps, imbalances, and get personalized recommendations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Data Source & Settings */}
          <div className="space-y-6">
            {/* Step 1: Data Source */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-[#00263d] text-white border-none">1</Badge>
                <h3 className="font-semibold">Choose Data Source</h3>
              </div>
              
              {/* Cronometer Direct Import - PRIMARY */}
              <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CloudDownload className="h-5 w-5 text-orange-500" />
                      Import from Cronometer
                    </CardTitle>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-300">Recommended</Badge>
                  </div>
                  <CardDescription>Direct API import - fastest and most accurate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cronometerLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !cronometerStatus?.connected ? (
                    <div className="text-center py-4">
                      <Link2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">
                        Connect your Cronometer account to import data directly
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href="/settings">
                          <Link2 className="h-4 w-4 mr-2" />
                          Connect Cronometer
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Client Selector - Searchable */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Select Client</Label>
                        <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={clientSearchOpen}
                              className="w-full justify-between"
                            >
                              <span className="truncate">
                                {selectedCronometerClient === 'self' 
                                  ? 'My own data'
                                  : cronometerClients.find(c => c.client_id.toString() === selectedCronometerClient)?.name || 'Select client...'}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search clients..." />
                              <CommandList>
                                <CommandEmpty>No clients found.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="self"
                                    onSelect={() => {
                                      setSelectedCronometerClient('self');
                                      setClientSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCronometerClient === 'self' ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <User className="mr-2 h-4 w-4" />
                                    My own data
                                  </CommandItem>
                                  {cronometerClients.map((client) => (
                                    <CommandItem
                                      key={client.client_id}
                                      value={`${client.name} ${client.email || ''}`}
                                      onSelect={() => {
                                        setSelectedCronometerClient(client.client_id.toString());
                                        setClientSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedCronometerClient === client.client_id.toString() ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <User className="mr-2 h-4 w-4" />
                                      <div className="flex flex-col">
                                        <span>{client.name}</span>
                                        {client.email && (
                                          <span className="text-xs text-muted-foreground">{client.email}</span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      {/* Date Range */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Date Range</Label>
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="flex-1 justify-start">
                                <Calendar className="h-4 w-4 mr-2" />
                                {format(cronometerDateRange.from, 'MMM d')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={cronometerDateRange.from}
                                onSelect={(date) => date && setCronometerDateRange(prev => ({ ...prev, from: date }))}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <span className="self-center text-muted-foreground">to</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="flex-1 justify-start">
                                <Calendar className="h-4 w-4 mr-2" />
                                {format(cronometerDateRange.to, 'MMM d')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={cronometerDateRange.to}
                                onSelect={(date) => date && setCronometerDateRange(prev => ({ ...prev, to: date }))}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setCronometerDateRange({
                              from: subDays(new Date(), 7),
                              to: new Date(),
                            })}
                          >
                            7 days
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setCronometerDateRange({
                              from: subDays(new Date(), 14),
                              to: new Date(),
                            })}
                          >
                            14 days
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setCronometerDateRange({
                              from: subDays(new Date(), 30),
                              to: new Date(),
                            })}
                          >
                            30 days
                          </Button>
                        </div>
                      </div>
                      
                      {/* Import Button */}
                      <Button
                        onClick={handleCronometerImport}
                        disabled={isImportingCronometer}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                        size="lg"
                      >
                        {isImportingCronometer ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing & Analyzing...
                          </>
                        ) : (
                          <>
                            <CloudDownload className="h-4 w-4 mr-2" />
                            Import & Analyze
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or upload files</span>
                </div>
              </div>

              {/* File Upload Options */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="uploads" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2 text-sm">
                      <Upload className="h-4 w-4" />
                      Manual File Upload
                      {(csvFileName || pdfFileName) && (
                        <Badge variant="secondary" className="ml-2">
                          {csvFileName ? 'CSV' : ''}{csvFileName && pdfFileName ? ' + ' : ''}{pdfFileName ? 'PDF' : ''}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    {/* CSV Upload */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        CSV File (Recommended)
                      </Label>
                      <div className={cn(
                        "border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer",
                        csvFileName ? "border-green-400 bg-green-50" : "hover:border-[#c19962]"
                      )}>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCSVUpload}
                          className="hidden"
                          id="csv-upload"
                        />
                        <label htmlFor="csv-upload" className="cursor-pointer">
                          {csvFileName ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700">{csvFileName}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={(e) => { e.preventDefault(); clearFile('csv'); }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Click to upload CSV</p>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* PDF Upload */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-600" />
                        PDF Report (Backup)
                      </Label>
                      <div className={cn(
                        "border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer",
                        pdfFileName ? "border-purple-400 bg-purple-50" : "hover:border-[#c19962]"
                      )}>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handlePDFUpload}
                          className="hidden"
                          id="pdf-upload"
                        />
                        <label htmlFor="pdf-upload" className="cursor-pointer">
                          {pdfFileName ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-purple-700">{pdfFileName}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={(e) => { e.preventDefault(); clearFile('pdf'); }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Click to upload PDF</p>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Analyze Uploaded Files Button */}
                    {(csvData || pdfData) && (
                      <Button
                        className="w-full bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Beaker className="mr-2 h-4 w-4" />
                            Analyze Uploaded File{csvData && pdfData ? 's' : ''}
                          </>
                        )}
                      </Button>
                    )}

                    {/* Export Instructions */}
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        How to export from Cronometer:
                      </p>
                      <ol className="text-xs space-y-0.5 text-muted-foreground">
                        <li>1. Go to cronometer.com → Settings → Account</li>
                        <li>2. Click "Export Data" → Select "Servings"</li>
                        <li>3. Choose date range and download CSV</li>
                      </ol>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Step 2: Targets */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-[#00263d] text-white border-none">2</Badge>
                <h3 className="font-semibold">Set Targets</h3>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-5 w-5 text-[#c19962]" />
                      Macro Targets
                    </CardTitle>
                    {cronometerStatus?.connected && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={async () => {
                          try {
                            const params = new URLSearchParams();
                            if (selectedCronometerClient && selectedCronometerClient !== 'self') {
                              params.append('client_id', selectedCronometerClient);
                            }
                            const response = await fetch(`/api/cronometer/targets?${params.toString()}`);
                            if (response.ok) {
                              const data = await response.json();
                              if (data.targets) {
                                setCustomTargets({
                                  calories: Math.round(data.targets.kcal || 2000),
                                  protein: Math.round(data.targets.protein || 150),
                                  carbs: Math.round(data.targets.total_carbs || 200),
                                  fat: Math.round(data.targets.fat || 75),
                                });
                                toast.success('Targets loaded from Cronometer');
                              }
                            }
                          } catch (error) {
                            toast.error('Failed to fetch Cronometer targets');
                          }
                        }}
                      >
                        <CloudDownload className="h-3 w-3 mr-1" />
                        Get from Cronometer
                      </Button>
                    )}
                  </div>
                  <CardDescription>Used to calculate % of target in analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Calories</Label>
                      <Input
                        type="number"
                        value={customTargets.calories}
                        onChange={(e) => setCustomTargets({ ...customTargets, calories: parseInt(e.target.value) || 2000 })}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Protein (g)</Label>
                      <Input
                        type="number"
                        value={customTargets.protein}
                        onChange={(e) => setCustomTargets({ ...customTargets, protein: parseInt(e.target.value) || 150 })}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Carbs (g)</Label>
                      <Input
                        type="number"
                        value={customTargets.carbs}
                        onChange={(e) => setCustomTargets({ ...customTargets, carbs: parseInt(e.target.value) || 200 })}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fat (g)</Label>
                      <Input
                        type="number"
                        value={customTargets.fat}
                        onChange={(e) => setCustomTargets({ ...customTargets, fat: parseInt(e.target.value) || 75 })}
                        className="h-8"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Parse Log */}
            {parseLog.length > 0 && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Import Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs space-y-1 font-mono">
                    {parseLog.map((log, i) => (
                      <p key={i} className={cn(
                        "flex items-start gap-1",
                        log.startsWith('✓') ? "text-green-600" : "text-muted-foreground"
                      )}>
                        {log}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {analysisResult ? (
              <>
                {/* Summary Card */}
                <Card className="border-[#c19962] bg-gradient-to-br from-[#c19962]/5 to-transparent">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Analysis Summary</CardTitle>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-lg px-3 py-1",
                          analysisResult.summary.overallScore >= 80 && "border-green-500 text-green-600",
                          analysisResult.summary.overallScore >= 60 && analysisResult.summary.overallScore < 80 && "border-yellow-500 text-yellow-600",
                          analysisResult.summary.overallScore < 60 && "border-red-500 text-red-600"
                        )}
                      >
                        Score: {analysisResult.summary.overallScore}/100
                      </Badge>
                    </div>
                    <CardDescription>{analysisResult.summary.daysAnalyzed} day(s) analyzed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Calculate status for each macro using client's targets
                      const calStatus = getNutrientStatus(analysisResult.summary.totalCalories, customTargets.calories);
                      const proteinStatus = getNutrientStatus(analysisResult.summary.totalProtein, customTargets.protein);
                      const carbsStatus = getNutrientStatus(analysisResult.summary.totalCarbs, customTargets.carbs);
                      const fatStatus = getNutrientStatus(analysisResult.summary.totalFat, customTargets.fat);
                      const fiberStatus = getNutrientStatus(analysisResult.summary.totalFiber, 30);
                      
                      return (
                        <div className="grid grid-cols-5 gap-3 mb-4">
                          <div className="text-center p-3 bg-background rounded-lg border">
                            <p className={cn("text-xl font-bold", calStatus.color)}>{analysisResult.summary.totalCalories}</p>
                            <p className="text-xs text-muted-foreground">Calories</p>
                            <p className={cn("text-xs font-medium mt-1", calStatus.color)}>
                              {calStatus.percent}% of {customTargets.calories}
                            </p>
                          </div>
                          <div className="text-center p-3 bg-background rounded-lg border">
                            <p className={cn("text-xl font-bold", proteinStatus.color)}>{round(analysisResult.summary.totalProtein, 1)}g</p>
                            <p className="text-xs text-muted-foreground">Protein</p>
                            <p className={cn("text-xs font-medium mt-1", proteinStatus.color)}>
                              {proteinStatus.percent}% of {customTargets.protein}g
                            </p>
                          </div>
                          <div className="text-center p-3 bg-background rounded-lg border">
                            <p className={cn("text-xl font-bold", carbsStatus.color)}>{round(analysisResult.summary.totalCarbs, 1)}g</p>
                            <p className="text-xs text-muted-foreground">Carbs</p>
                            <p className={cn("text-xs font-medium mt-1", carbsStatus.color)}>
                              {carbsStatus.percent}% of {customTargets.carbs}g
                            </p>
                          </div>
                          <div className="text-center p-3 bg-background rounded-lg border">
                            <p className={cn("text-xl font-bold", fatStatus.color)}>{round(analysisResult.summary.totalFat, 1)}g</p>
                            <p className="text-xs text-muted-foreground">Fat</p>
                            <p className={cn("text-xs font-medium mt-1", fatStatus.color)}>
                              {fatStatus.percent}% of {customTargets.fat}g
                            </p>
                          </div>
                          <div className="text-center p-3 bg-background rounded-lg border">
                            <p className={cn("text-xl font-bold", fiberStatus.color)}>{round(analysisResult.summary.totalFiber, 1)}g</p>
                            <p className="text-xs text-muted-foreground">Fiber</p>
                            <p className={cn("text-xs font-medium mt-1", fiberStatus.color)}>
                              {fiberStatus.percent}% of 30g
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span>{analysisResult.deficiencies.length} Low</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-yellow-500" />
                          <span>{analysisResult.excesses.length} High</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                          <span>{analysisResult.ratios.filter(r => r.status !== 'optimal').length} Ratio Issues</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateAIRecommendations}
                          disabled={isGeneratingAI}
                        >
                          {isGeneratingAI ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-1" />
                          )}
                          AI Insights
                        </Button>
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
                    </div>
                  </CardContent>
                </Card>

                {/* AI Recommendations & Sample Day */}
                {(aiRecommendations || sampleDayPlan) && (
                  <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-transparent">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        AI-Powered Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {aiRecommendations && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Personalized Recommendations</h4>
                          <div className="p-3 bg-white rounded-lg border text-sm whitespace-pre-wrap">
                            {aiRecommendations}
                          </div>
                        </div>
                      )}
                      
                      {sampleDayPlan && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <UtensilsCrossed className="h-4 w-4" />
                            Optimized Sample Day
                          </h4>
                          <div className="grid gap-2">
                            {sampleDayPlan.meals?.map((meal: any, i: number) => (
                              <div key={i} className="p-3 bg-white rounded-lg border">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">{meal.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {meal.calories} cal | {meal.protein}g P | {meal.carbs}g C | {meal.fat}g F
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{meal.description}</p>
                                {meal.foods && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {meal.foods.map((food: string, j: number) => (
                                      <Badge key={j} variant="secondary" className="text-xs">{food}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {sampleDayPlan.totals && (
                            <div className="p-2 bg-purple-100 rounded-lg text-center">
                              <span className="text-sm font-medium text-purple-800">
                                Day Total: {sampleDayPlan.totals.calories} cal | {sampleDayPlan.totals.protein}g P | {sampleDayPlan.totals.carbs}g C | {sampleDayPlan.totals.fat}g F
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Corrective Meal Plan */}
                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-transparent">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UtensilsCrossed className="h-5 w-5 text-emerald-600" />
                        Corrective Meal Plan
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateCorrectivePlan}
                        disabled={isGeneratingCorrective}
                      >
                        {isGeneratingCorrective ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-1" />
                        )}
                        Generate Plan
                      </Button>
                    </div>
                    <CardDescription>
                      AI-generated full day plan specifically designed to address your top deficiencies and excesses, with ingredient-level detail and explanations.
                    </CardDescription>
                  </CardHeader>
                  {correctivePlan && (
                    <CardContent>
                      <div className="p-4 bg-white rounded-lg border text-sm whitespace-pre-wrap leading-relaxed">
                        {correctivePlan}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Coach Comments */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#c19962]" />
                      Coach Notes & Comments
                    </CardTitle>
                    <CardDescription>Add personalized notes (will be included in PDF export)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Add your personalized recommendations, observations, or guidance for the client here. These notes will appear in the exported PDF report..."
                      value={coachComments}
                      onChange={(e) => setCoachComments(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="nutrients">All Nutrients</TabsTrigger>
                    <TabsTrigger value="issues">Issues</TabsTrigger>
                    <TabsTrigger value="foods">Foods</TabsTrigger>
                    <TabsTrigger value="recommendations">Actions</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    {/* Critical Alert */}
                    {analysisResult.deficiencies.filter(d => d.severity === 'critical').length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Critical Deficiencies</AlertTitle>
                        <AlertDescription>
                          {analysisResult.deficiencies.filter(d => d.severity === 'critical').map(d => d.nutrient).join(', ')}
                          {' '}are significantly below targets.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Ratios */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Nutrient Ratios</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {analysisResult.ratios.map((ratio) => (
                            <div key={ratio.name} className={cn("p-3 rounded-lg border", getStatusColor(ratio.status))}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{ratio.name}</span>
                                <span className="font-bold">{ratio.ratio}:1</span>
                              </div>
                              <p className="text-xs opacity-80">{ratio.message}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Functional Nutrient Groupings */}
                    {nutrientGroups.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Functional Health Categories</CardTitle>
                          <CardDescription>How well your diet supports key health functions</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {nutrientGroups.map((group) => (
                              <div key={group.name} className={cn(
                                "p-3 rounded-lg border",
                                group.status === 'excellent' && "bg-emerald-50 border-emerald-200",
                                group.status === 'good' && "bg-blue-50 border-blue-200",
                                group.status === 'fair' && "bg-amber-50 border-amber-200",
                                group.status === 'poor' && "bg-red-50 border-red-200",
                              )}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-semibold">{group.name}</span>
                                  <Badge variant="outline" className={cn(
                                    "text-[10px] uppercase tracking-wider",
                                    group.status === 'excellent' && "border-emerald-400 text-emerald-700",
                                    group.status === 'good' && "border-blue-400 text-blue-700",
                                    group.status === 'fair' && "border-amber-400 text-amber-700",
                                    group.status === 'poor' && "border-red-400 text-red-700",
                                  )}>{group.status}</Badge>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1.5">
                                  <div
                                    className={cn(
                                      "h-1.5 rounded-full transition-all",
                                      group.avgAdequacy >= 90 ? "bg-emerald-500" :
                                      group.avgAdequacy >= 70 ? "bg-blue-500" :
                                      group.avgAdequacy >= 50 ? "bg-amber-500" : "bg-red-500"
                                    )}
                                    style={{ width: `${Math.min(group.avgAdequacy, 100)}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-muted-foreground">{group.description}</p>
                                <p className="text-xs mt-1">{group.message}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Quick Issues List */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-red-600 flex items-center gap-2">
                            <TrendingDown className="h-4 w-4" />
                            Below Target
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {analysisResult.deficiencies.length === 0 ? (
                            <p className="text-sm text-muted-foreground">None!</p>
                          ) : (
                            <div className="space-y-1">
                              {analysisResult.deficiencies.slice(0, 6).map((d) => (
                                <div key={d.nutrient} className="flex justify-between text-sm">
                                  <span>{d.nutrient}</span>
                                  <span className={getPercentageColor(d.percentage)}>{d.percentage}%</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-yellow-600 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Above Target
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {analysisResult.excesses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">None!</p>
                          ) : (
                            <div className="space-y-1">
                              {analysisResult.excesses.slice(0, 6).map((e) => (
                                <div key={e.nutrient} className="flex justify-between text-sm">
                                  <span>{e.nutrient}</span>
                                  <span className={getPercentageColor(e.percentage)}>{e.percentage}%</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* All Nutrients Tab */}
                  <TabsContent value="nutrients" className="mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Complete Nutrient Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[500px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nutrient</TableHead>
                                <TableHead className="text-right">Avg/Day</TableHead>
                                <TableHead className="text-right">Target</TableHead>
                                <TableHead className="text-right">%</TableHead>
                                <TableHead className="w-[120px]">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {analysisResult.dailyAverages.map((n) => (
                                <TableRow key={n.name}>
                                  <TableCell className="font-medium">{n.name}</TableCell>
                                  <TableCell className="text-right">{n.value} {n.unit}</TableCell>
                                  <TableCell className="text-right">{n.target} {n.unit}</TableCell>
                                  <TableCell className={cn("text-right font-medium", getPercentageColor(n.percentage))}>
                                    {n.percentage}%
                                  </TableCell>
                                  <TableCell>
                                    <Progress 
                                      value={Math.min(n.percentage, 200)} 
                                      className="h-2"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Issues Tab */}
                  <TabsContent value="issues" className="space-y-4 mt-4">
                    {/* Deficiencies */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-red-600 flex items-center gap-2">
                          <TrendingDown className="h-5 w-5" />
                          Deficiencies & Low Nutrients ({analysisResult.deficiencies.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analysisResult.deficiencies.length === 0 ? (
                          <div className="text-center py-6">
                            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                            <p className="text-muted-foreground">No significant deficiencies detected!</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {analysisResult.deficiencies.map((issue) => (
                              <div key={issue.nutrient} className={cn("p-3 rounded-lg border", getStatusColor(issue.status))}>
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-2">
                                    {getSeverityIcon(issue.severity)}
                                    <div>
                                      <p className="font-medium">{issue.nutrient}</p>
                                      <p className="text-sm opacity-80">
                                        {issue.actual} {issue.unit} / {issue.target} {issue.unit} target
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-red-600 border-red-300">
                                    {issue.percentage}%
                                  </Badge>
                                </div>
                                <p className="text-sm mt-2 opacity-80">{issue.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Excesses */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-yellow-600 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          High / Excess Nutrients ({analysisResult.excesses.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analysisResult.excesses.length === 0 ? (
                          <div className="text-center py-6">
                            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                            <p className="text-muted-foreground">No excessive intakes detected!</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {analysisResult.excesses.map((issue) => (
                              <div key={issue.nutrient} className={cn("p-3 rounded-lg border", getStatusColor(issue.status))}>
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-2">
                                    {getSeverityIcon(issue.severity)}
                                    <div>
                                      <p className="font-medium">{issue.nutrient}</p>
                                      <p className="text-sm opacity-80">
                                        {issue.actual} {issue.unit} / {issue.target} {issue.unit} target
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                    {issue.percentage}%
                                  </Badge>
                                </div>
                                <p className="text-sm mt-2 opacity-80">{issue.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Foods Tab */}
                  <TabsContent value="foods" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Apple className="h-5 w-5 text-green-600" />
                          Most Consumed Foods
                        </CardTitle>
                        <CardDescription>Foods appearing most frequently in your logs</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {analysisResult.topFoods.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">
                            No food data available (CSV required for food breakdown)
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Food</TableHead>
                                <TableHead className="text-right">Times Logged</TableHead>
                                {/* Only show calories column if we have actual data (from CSV, not API) */}
                                {analysisResult.topFoods.some(f => f.totalCalories > 0) && (
                                  <TableHead className="text-right">Total Calories</TableHead>
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {analysisResult.topFoods.map((food, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">{food.name}</TableCell>
                                  <TableCell className="text-right">{food.count}</TableCell>
                                  {analysisResult.topFoods.some(f => f.totalCalories > 0) && (
                                    <TableCell className="text-right">{food.totalCalories} kcal</TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>

                    {/* Daily Breakdown */}
                    {analysisResult.dailyBreakdown.length >= 1 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Daily Breakdown</CardTitle>
                          <CardDescription>
                            {analysisResult.dailyBreakdown.length} day{analysisResult.dailyBreakdown.length > 1 ? 's' : ''} analyzed
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[400px]">
                            <Accordion type="multiple" className="w-full">
                              {analysisResult.dailyBreakdown.map((day, i) => (
                                <AccordionItem key={i} value={`day-${i}`}>
                                  <AccordionTrigger className="hover:no-underline py-2">
                                    <div className="flex items-center justify-between w-full pr-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{day.date}</span>
                                        {(day as any).completed && (
                                          <Badge variant="secondary" className="text-xs">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Complete
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex gap-4 text-sm text-muted-foreground">
                                        <span>{Math.round(day.nutrients['Energy'] || 0)} cal</span>
                                        <span>{Math.round(day.nutrients['Protein'] || 0)}g P</span>
                                        <span>{Math.round(day.nutrients['Carbs'] || 0)}g C</span>
                                        <span>{Math.round(day.nutrients['Fat'] || 0)}g F</span>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pt-2">
                                    {/* Meal Summary if available */}
                                    {(day as any).mealSummary && (day as any).mealSummary.length > 0 && (
                                      <div className="mb-3 space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Meals</p>
                                        <div className="grid gap-2">
                                          {(day as any).mealSummary.map((meal: any, j: number) => (
                                            <div key={j} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                                              <span className="font-medium">{meal.name}</span>
                                              <div className="flex gap-3 text-xs text-muted-foreground">
                                                <span>{Math.round(meal.calories)} cal</span>
                                                <span>{(meal.protein || 0).toFixed(1)}g P</span>
                                                <span>{(meal.carbs || 0).toFixed(1)}g C</span>
                                                <span>{(meal.fat || 0).toFixed(1)}g F</span>
                                                <Badge variant="outline" className="text-xs">{meal.foodCount} items</Badge>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {/* Food List */}
                                    {day.foods && day.foods.length > 0 && (
                                      <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Foods ({day.foods.length})</p>
                                        <div className="grid gap-1 max-h-[200px] overflow-auto">
                                          {day.foods.slice(0, 20).map((food, k) => (
                                            <div key={k} className="flex items-center justify-between py-1 px-2 text-sm border-b last:border-0">
                                              <div className="flex-1 min-w-0">
                                                <p className="truncate font-medium">{food.name}</p>
                                                <p className="text-xs text-muted-foreground">{food.amount} • {food.meal}</p>
                                              </div>
                                              {food.calories > 0 && (
                                                <span className="text-xs text-muted-foreground ml-2">~{food.calories} cal</span>
                                              )}
                                            </div>
                                          ))}
                                          {day.foods.length > 20 && (
                                            <p className="text-xs text-muted-foreground text-center py-2">
                                              + {day.foods.length - 20} more foods
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {(!day.foods || day.foods.length === 0) && !(day as any).mealSummary && (
                                      <p className="text-sm text-muted-foreground text-center py-2">
                                        No food details available
                                      </p>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Recommendations Tab */}
                  <TabsContent value="recommendations" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-yellow-500" />
                          Actionable Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analysisResult.recommendations.length === 0 ? (
                          <div className="text-center py-6">
                            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                            <p className="text-muted-foreground">Your nutrition looks great! No major changes needed.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {analysisResult.recommendations.map((rec, i) => (
                              <div key={i} className="flex gap-4 p-4 rounded-lg border">
                                <div className={cn(
                                  "flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0",
                                  rec.type === 'add' && "bg-green-100 text-green-700",
                                  rec.type === 'increase' && "bg-blue-100 text-blue-700",
                                  rec.type === 'reduce' && "bg-red-100 text-red-700",
                                  rec.type === 'swap' && "bg-purple-100 text-purple-700"
                                )}>
                                  {rec.type === 'add' && '+'}
                                  {rec.type === 'increase' && '↑'}
                                  {rec.type === 'reduce' && '↓'}
                                  {rec.type === 'swap' && '⇄'}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {rec.type}
                                    </Badge>
                                    {rec.nutrients.map((n) => (
                                      <Badge key={n} variant="secondary" className="text-xs">
                                        {n}
                                      </Badge>
                                    ))}
                                  </div>
                                  <p className="font-medium">
                                    {rec.type === 'swap' ? (
                                      <>
                                        <span className="text-red-600">{rec.food}</span>
                                        <ChevronRight className="inline h-4 w-4 mx-1" />
                                        <span className="text-green-600">{rec.swapFor}</span>
                                      </>
                                    ) : (
                                      rec.food
                                    )}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">{rec.reason}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* ===== CHARTS & VISUALIZATIONS SECTION ===== */}
                <Separator className="my-6" />
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#c19962]" />
                  Charts & Visualizations
                </h2>

                {/* Nutrient Adequacy Chart — horizontal bars */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Nutrient Adequacy</CardTitle>
                    <CardDescription>Percentage of daily target met for each nutrient</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const nutrients = [...analysisResult.dailyAverages]
                        .filter(n => n.target > 0 && n.name !== 'Energy')
                        .sort((a, b) => a.percentage - b.percentage);
                      const barH = 18;
                      const gap = 4;
                      const labelW = 110;
                      const chartW = 500;
                      const totalH = nutrients.length * (barH + gap);
                      return (
                        <ScrollArea className="max-h-[500px]">
                          <svg width="100%" viewBox={`0 0 ${labelW + chartW + 60} ${totalH + 10}`} className="font-mono text-[11px]">
                            {nutrients.map((n, i) => {
                              const y = i * (barH + gap);
                              const pct = Math.min(n.percentage, 200);
                              const barW = (pct / 200) * chartW;
                              const color = n.percentage >= 80 ? '#22c55e' : n.percentage >= 50 ? '#f59e0b' : '#ef4444';
                              return (
                                <g key={n.name}>
                                  <text x={labelW - 4} y={y + barH / 2 + 4} textAnchor="end" fill="currentColor" className="text-[10px]">{n.name}</text>
                                  <rect x={labelW} y={y} width={chartW} height={barH} fill="#f1f5f9" rx={3} />
                                  {/* 100% line */}
                                  <line x1={labelW + chartW / 2} y1={y} x2={labelW + chartW / 2} y2={y + barH} stroke="#94a3b8" strokeWidth={1} strokeDasharray="2,2" />
                                  <rect x={labelW} y={y} width={Math.max(barW, 2)} height={barH} fill={color} rx={3} opacity={0.85} />
                                  <text x={labelW + Math.max(barW, 2) + 4} y={y + barH / 2 + 4} fill="currentColor" className="text-[10px]">{n.percentage}%</text>
                                </g>
                              );
                            })}
                          </svg>
                        </ScrollArea>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Macro Distribution Donut + Daily Calorie Trends */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Macro Donut */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Macro Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                      {(() => {
                        const p = analysisResult.summary.totalProtein;
                        const c = analysisResult.summary.totalCarbs;
                        const f = analysisResult.summary.totalFat;
                        const total = p * 4 + c * 4 + f * 9;
                        if (total === 0) return <p className="text-sm text-muted-foreground">No macro data</p>;
                        const slices = [
                          { label: 'Protein', value: p * 4, color: '#ef4444', grams: p },
                          { label: 'Carbs', value: c * 4, color: '#f59e0b', grams: c },
                          { label: 'Fat', value: f * 9, color: '#3b82f6', grams: f },
                        ];
                        const cx = 100, cy = 100, r = 70, ir = 42;
                        let cumAngle = -Math.PI / 2;
                        const arcs = slices.map(s => {
                          const angle = (s.value / total) * 2 * Math.PI;
                          const startAngle = cumAngle;
                          cumAngle += angle;
                          const endAngle = cumAngle;
                          const x1 = cx + r * Math.cos(startAngle);
                          const y1 = cy + r * Math.sin(startAngle);
                          const x2 = cx + r * Math.cos(endAngle);
                          const y2 = cy + r * Math.sin(endAngle);
                          const ix1 = cx + ir * Math.cos(endAngle);
                          const iy1 = cy + ir * Math.sin(endAngle);
                          const ix2 = cx + ir * Math.cos(startAngle);
                          const iy2 = cy + ir * Math.sin(startAngle);
                          const largeArc = angle > Math.PI ? 1 : 0;
                          const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
                          return { ...s, d, pct: Math.round((s.value / total) * 100) };
                        });
                        return (
                          <div className="text-center">
                            <svg width={200} height={200} viewBox="0 0 200 200">
                              {arcs.map(a => (
                                <path key={a.label} d={a.d} fill={a.color} opacity={0.85} />
                              ))}
                              <text x={cx} y={cy - 6} textAnchor="middle" className="text-lg font-bold" fill="currentColor">{total}</text>
                              <text x={cx} y={cy + 12} textAnchor="middle" className="text-[10px]" fill="#64748b">kcal</text>
                            </svg>
                            <div className="flex justify-center gap-4 mt-2">
                              {arcs.map(a => (
                                <div key={a.label} className="flex items-center gap-1.5 text-xs">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                                  <span>{a.label} {a.pct}% ({a.grams}g)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Daily Calorie Trends */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Daily Calorie Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const days = analysisResult.dailyBreakdown;
                        if (days.length < 2) return <p className="text-sm text-muted-foreground">Need 2+ days for trends</p>;
                        const cals = days.map(d => d.nutrients['Energy'] || 0);
                        const maxCal = Math.max(...cals, 1);
                        const minCal = Math.min(...cals);
                        const w = 400, h = 180, pad = 30;
                        const xStep = (w - pad * 2) / Math.max(cals.length - 1, 1);
                        const yScale = (v: number) => pad + (h - pad * 2) * (1 - (v - minCal * 0.9) / (maxCal * 1.1 - minCal * 0.9));
                        const points = cals.map((v, i) => `${pad + i * xStep},${yScale(v)}`).join(' ');
                        const target = analysisResult.summary.totalCalories;
                        return (
                          <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="font-mono text-[10px]">
                            {/* Grid */}
                            {[0, 0.25, 0.5, 0.75, 1].map(f => {
                              const v = minCal * 0.9 + (maxCal * 1.1 - minCal * 0.9) * (1 - f);
                              const y = pad + (h - pad * 2) * f;
                              return (
                                <g key={f}>
                                  <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#e2e8f0" strokeWidth={0.5} />
                                  <text x={pad - 4} y={y + 3} textAnchor="end" fill="#94a3b8">{Math.round(v)}</text>
                                </g>
                              );
                            })}
                            {/* Target line */}
                            {target > 0 && (
                              <>
                                <line x1={pad} y1={yScale(target)} x2={w - pad} y2={yScale(target)} stroke="#c19962" strokeWidth={1} strokeDasharray="4,3" />
                                <text x={w - pad + 2} y={yScale(target) + 3} fill="#c19962" className="text-[9px]">Target</text>
                              </>
                            )}
                            {/* Line */}
                            <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth={2} />
                            {/* Dots */}
                            {cals.map((v, i) => (
                              <circle key={i} cx={pad + i * xStep} cy={yScale(v)} r={3} fill="#3b82f6" />
                            ))}
                            {/* X labels */}
                            {days.map((d, i) => (
                              <text key={i} x={pad + i * xStep} y={h - 4} textAnchor="middle" fill="#94a3b8" className="text-[8px]">
                                {d.date.split('-').slice(1).join('/')}
                              </text>
                            ))}
                          </svg>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {/* Protein Trend Sparkline */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Key Nutrient Daily Trends</CardTitle>
                    <CardDescription>Protein, Carbs, Fat (g) across analyzed days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const days = analysisResult.dailyBreakdown;
                      if (days.length < 2) return <p className="text-sm text-muted-foreground">Need 2+ days for trends</p>;
                      const series = [
                        { name: 'Protein', key: 'Protein', color: '#ef4444' },
                        { name: 'Carbs', key: 'Carbs', color: '#f59e0b' },
                        { name: 'Fat', key: 'Fat', color: '#3b82f6' },
                      ];
                      const allVals = series.flatMap(s => days.map(d => d.nutrients[s.key] || 0));
                      const maxV = Math.max(...allVals, 1);
                      const w = 500, h = 160, pad = 35;
                      const xStep = (w - pad * 2) / Math.max(days.length - 1, 1);
                      const yScale = (v: number) => pad + (h - pad * 2) * (1 - v / (maxV * 1.1));
                      return (
                        <div>
                          <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="font-mono text-[10px]">
                            {[0, 0.5, 1].map(f => {
                              const v = maxV * 1.1 * (1 - f);
                              const y = pad + (h - pad * 2) * f;
                              return (
                                <g key={f}>
                                  <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#e2e8f0" strokeWidth={0.5} />
                                  <text x={pad - 4} y={y + 3} textAnchor="end" fill="#94a3b8">{Math.round(v)}g</text>
                                </g>
                              );
                            })}
                            {series.map(s => {
                              const pts = days.map((d, i) => `${pad + i * xStep},${yScale(d.nutrients[s.key] || 0)}`).join(' ');
                              return <polyline key={s.name} points={pts} fill="none" stroke={s.color} strokeWidth={1.5} opacity={0.8} />;
                            })}
                            {days.map((d, i) => (
                              <text key={i} x={pad + i * xStep} y={h - 4} textAnchor="middle" fill="#94a3b8" className="text-[8px]">
                                {d.date.split('-').slice(1).join('/')}
                              </text>
                            ))}
                          </svg>
                          <div className="flex justify-center gap-4 mt-1">
                            {series.map(s => (
                              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                <span>{s.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Food Log Viewer */}
                {analysisResult.dailyBreakdown.length > 0 && analysisResult.dailyBreakdown.some(d => (d.foods && d.foods.length > 0) || (d as any).mealSummary?.length > 0) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Apple className="h-5 w-5 text-green-600" />
                        Food Log
                      </CardTitle>
                      <CardDescription>Daily food entries grouped by meal</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-[500px]">
                        <Accordion type="single" collapsible className="w-full">
                          {analysisResult.dailyBreakdown.map((day, dayIdx) => {
                            const mealSummary = (day as any).mealSummary as { name: string; calories: number; protein: number; carbs: number; fat: number; foodCount: number }[] | undefined;
                            const hasFoods = day.foods && day.foods.length > 0;
                            const hasMealSummary = mealSummary && mealSummary.length > 0;
                            if (!hasFoods && !hasMealSummary) return null;

                            // Check if per-food macros are available (CSV import) or zero (Cronometer API)
                            const hasPerFoodMacros = hasFoods && day.foods.some(f => f.calories > 0);

                            // Group foods by meal
                            const mealGroups: Record<string, typeof day.foods> = {};
                            if (hasFoods) {
                              for (const food of day.foods) {
                                const meal = food.meal || 'Other';
                                if (!mealGroups[meal]) mealGroups[meal] = [];
                                mealGroups[meal].push(food);
                              }
                            }

                            // Day-level calories: prefer nutrients data, fall back to food sums
                            const dayCal = day.nutrients?.['Energy'] || day.nutrients?.['Calories']
                              || (hasPerFoodMacros ? day.foods.reduce((s, f) => s + f.calories, 0) : 0)
                              || (hasMealSummary ? mealSummary!.reduce((s, m) => s + m.calories, 0) : 0);

                            return (
                              <AccordionItem key={dayIdx} value={`log-${dayIdx}`}>
                                <AccordionTrigger className="hover:no-underline py-2">
                                  <div className="flex items-center gap-3 text-left">
                                    <Badge variant="outline" className="font-mono text-xs">{day.date}</Badge>
                                    <span className="text-sm">
                                      {hasFoods ? `${day.foods.length} items` : hasMealSummary ? `${mealSummary!.length} meals` : ''}
                                    </span>
                                    {dayCal > 0 && <span className="text-xs text-muted-foreground">{Math.round(dayCal)} kcal</span>}
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-3 pt-1">
                                    {/* If we have meal summaries (Cronometer API), show meal-level macros */}
                                    {hasMealSummary && mealSummary!.map((ms, mi) => {
                                      const mealFoods = mealGroups[ms.name] || [];
                                      return (
                                        <div key={mi}>
                                          <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{ms.name}</p>
                                            <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                                              <span className="font-medium text-foreground">{ms.calories} cal</span>
                                              <span>{ms.protein}P</span>
                                              <span>{ms.carbs}C</span>
                                              <span>{ms.fat}F</span>
                                            </div>
                                          </div>
                                          {mealFoods.length > 0 && (
                                            <div className="space-y-0.5 pl-2 border-l-2 border-muted ml-1">
                                              {mealFoods.map((f, fi) => (
                                                <div key={fi} className="flex items-center justify-between text-xs py-0.5 px-2 rounded hover:bg-muted/50">
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <span className="truncate">{f.name}</span>
                                                    {f.amount && <span className="text-muted-foreground shrink-0">({f.amount})</span>}
                                                  </div>
                                                  {hasPerFoodMacros && f.calories > 0 && (
                                                    <div className="flex items-center gap-3 font-mono text-muted-foreground shrink-0 ml-2">
                                                      <span>{Math.round(f.calories)} cal</span>
                                                      <span>{Math.round(f.protein)}P</span>
                                                      <span>{Math.round(f.carbs)}C</span>
                                                      <span>{Math.round(f.fat)}F</span>
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {/* Fallback: if no meal summary (CSV import), show grouped foods with per-food macros */}
                                    {!hasMealSummary && Object.entries(mealGroups).map(([meal, foods]) => (
                                      <div key={meal}>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{meal}</p>
                                        <div className="space-y-0.5">
                                          {foods.map((f, fi) => (
                                            <div key={fi} className="flex items-center justify-between text-xs py-0.5 px-2 rounded hover:bg-muted/50">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <span className="truncate">{f.name}</span>
                                                {f.amount && <span className="text-muted-foreground shrink-0">({f.amount})</span>}
                                              </div>
                                              {f.calories > 0 && (
                                                <div className="flex items-center gap-3 font-mono text-muted-foreground shrink-0 ml-2">
                                                  <span>{Math.round(f.calories)} cal</span>
                                                  <span>{Math.round(f.protein)}P</span>
                                                  <span>{Math.round(f.carbs)}C</span>
                                                  <span>{Math.round(f.fat)}F</span>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-dashed bg-gradient-to-br from-muted/30 to-background">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <div className="relative mb-6">
                    <Beaker className="h-20 w-20 text-muted-foreground/50" />
                    <div className="absolute -bottom-1 -right-1 bg-orange-100 rounded-full p-2">
                      <CloudDownload className="h-6 w-6 text-orange-500" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-center">Ready to Analyze</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    Import nutrition data from Cronometer or upload an exported file to get comprehensive 
                    analysis, identify gaps, and receive personalized recommendations.
                  </p>
                  <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Macro & micronutrient analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Deficiency & excess detection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Nutrient ratio analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>AI-powered recommendations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Branded PDF export</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}