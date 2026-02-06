'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Save, 
  X, 
  Search,
  Loader2,
  Scale,
  Target,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Meal, Ingredient, Macros, MealSlot } from '@/types';

interface ManualMealFormProps {
  slot: MealSlot;
  existingMeal?: Meal | null;
  dietPreferences?: Partial<import('@/types').DietPreferences>;
  onSave: (meal: Meal) => void;
  onCancel: () => void;
}

// Quick-add suggestions based on what macro is needed
interface QuickAddSuggestion {
  name: string;
  category: string;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  suggestedGrams: number;
}

const QUICK_ADD_PROTEIN: QuickAddSuggestion[] = [
  { name: 'Chicken Breast', category: 'protein', per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 }, suggestedGrams: 100 },
  { name: 'Greek Yogurt (0%)', category: 'dairy', per100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 }, suggestedGrams: 150 },
  { name: 'Egg Whites', category: 'protein', per100g: { calories: 52, protein: 11, carbs: 0.7, fat: 0.2 }, suggestedGrams: 100 },
  { name: 'Whey Protein Scoop', category: 'protein', per100g: { calories: 120, protein: 24, carbs: 3, fat: 1 }, suggestedGrams: 30 },
  { name: 'Cottage Cheese (1%)', category: 'dairy', per100g: { calories: 72, protein: 12, carbs: 2.7, fat: 1 }, suggestedGrams: 150 },
];

const QUICK_ADD_CARBS: QuickAddSuggestion[] = [
  { name: 'Oats (dry)', category: 'grain', per100g: { calories: 389, protein: 17, carbs: 66, fat: 7 }, suggestedGrams: 50 },
  { name: 'Rice (cooked)', category: 'grain', per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 }, suggestedGrams: 150 },
  { name: 'Banana', category: 'fruit', per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 }, suggestedGrams: 120 },
  { name: 'Sweet Potato (cooked)', category: 'vegetables', per100g: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 }, suggestedGrams: 150 },
  { name: 'Whole Wheat Bread', category: 'grain', per100g: { calories: 247, protein: 13, carbs: 41, fat: 3.4 }, suggestedGrams: 60 },
];

const QUICK_ADD_FAT: QuickAddSuggestion[] = [
  { name: 'Olive Oil', category: 'fats', per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 }, suggestedGrams: 10 },
  { name: 'Almonds', category: 'fats', per100g: { calories: 579, protein: 21, carbs: 22, fat: 50 }, suggestedGrams: 25 },
  { name: 'Avocado', category: 'fats', per100g: { calories: 160, protein: 2, carbs: 9, fat: 15 }, suggestedGrams: 75 },
  { name: 'Peanut Butter', category: 'fats', per100g: { calories: 588, protein: 25, carbs: 20, fat: 50 }, suggestedGrams: 20 },
  { name: 'Chia Seeds', category: 'fats', per100g: { calories: 486, protein: 17, carbs: 42, fat: 31 }, suggestedGrams: 15 },
];

const COMMON_SUPPLEMENTS: QuickAddSuggestion[] = [
  { name: 'Whey Protein (1 scoop)', category: 'supplement', per100g: { calories: 120, protein: 24, carbs: 3, fat: 1 }, suggestedGrams: 30 },
  { name: 'Casein Protein (1 scoop)', category: 'supplement', per100g: { calories: 120, protein: 24, carbs: 3, fat: 1 }, suggestedGrams: 35 },
  { name: 'Creatine (5g)', category: 'supplement', per100g: { calories: 0, protein: 0, carbs: 0, fat: 0 }, suggestedGrams: 5 },
  { name: 'BCAAs (1 scoop)', category: 'supplement', per100g: { calories: 0, protein: 0, carbs: 0, fat: 0 }, suggestedGrams: 10 },
  { name: 'EAAs (1 scoop)', category: 'supplement', per100g: { calories: 40, protein: 10, carbs: 0, fat: 0 }, suggestedGrams: 15 },
  { name: 'Collagen Peptides', category: 'supplement', per100g: { calories: 36, protein: 9, carbs: 0, fat: 0 }, suggestedGrams: 20 },
];

// Vegetable options for the guided builder
const QUICK_ADD_VEGETABLES: QuickAddSuggestion[] = [
  { name: 'Broccoli', category: 'vegetables', per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 }, suggestedGrams: 100 },
  { name: 'Spinach', category: 'vegetables', per100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 }, suggestedGrams: 75 },
  { name: 'Asparagus', category: 'vegetables', per100g: { calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1 }, suggestedGrams: 100 },
  { name: 'Bell Peppers', category: 'vegetables', per100g: { calories: 31, protein: 1, carbs: 6, fat: 0.3 }, suggestedGrams: 100 },
  { name: 'Zucchini', category: 'vegetables', per100g: { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 }, suggestedGrams: 100 },
  { name: 'Green Beans', category: 'vegetables', per100g: { calories: 31, protein: 1.8, carbs: 7, fat: 0.2 }, suggestedGrams: 100 },
  { name: 'Mixed Greens', category: 'vegetables', per100g: { calories: 20, protein: 2, carbs: 3, fat: 0.3 }, suggestedGrams: 75 },
];

// ============ FLAVOR ENHANCERS ============
// Low-calorie additions that make meals taste amazing
interface FlavorEnhancer {
  name: string;
  amount: string;
  cuisines: string[];
  calories: number; // Total calories for the suggested amount
}

const FLAVOR_ENHANCERS: Record<string, FlavorEnhancer[]> = {
  universal: [
    { name: 'Garlic (minced)', amount: '2 cloves', cuisines: ['all'], calories: 8 },
    { name: 'Fresh Lemon Juice', amount: '2 tbsp', cuisines: ['all'], calories: 7 },
    { name: 'Sea Salt & Black Pepper', amount: 'to taste', cuisines: ['all'], calories: 0 },
    { name: 'Fresh Herbs (parsley/cilantro)', amount: '2 tbsp', cuisines: ['all'], calories: 2 },
    { name: 'Dijon Mustard', amount: '1 tsp', cuisines: ['all'], calories: 5 },
  ],
  mediterranean: [
    { name: 'Lemon Zest', amount: '1 tsp', cuisines: ['mediterranean'], calories: 1 },
    { name: 'Fresh Oregano', amount: '1 tsp', cuisines: ['mediterranean', 'greek'], calories: 1 },
    { name: 'Kalamata Olives', amount: '4 olives', cuisines: ['mediterranean', 'greek'], calories: 35 },
    { name: 'Feta Cheese Crumbles', amount: '2 tbsp', cuisines: ['mediterranean', 'greek'], calories: 50 },
    { name: 'Fresh Dill', amount: '1 tbsp', cuisines: ['mediterranean', 'greek'], calories: 0 },
    { name: 'Red Wine Vinegar', amount: '1 tbsp', cuisines: ['mediterranean'], calories: 3 },
  ],
  asian: [
    { name: 'Low-Sodium Soy Sauce', amount: '1 tbsp', cuisines: ['asian', 'chinese', 'japanese'], calories: 10 },
    { name: 'Fresh Ginger (minced)', amount: '1 tsp', cuisines: ['asian'], calories: 2 },
    { name: 'Sesame Oil', amount: '½ tsp', cuisines: ['asian'], calories: 20 },
    { name: 'Rice Vinegar', amount: '1 tbsp', cuisines: ['asian'], calories: 0 },
    { name: 'Sriracha', amount: '1 tsp', cuisines: ['asian', 'thai'], calories: 5 },
    { name: 'Green Onions', amount: '2 stalks', cuisines: ['asian'], calories: 4 },
    { name: 'Sesame Seeds', amount: '1 tsp', cuisines: ['asian'], calories: 17 },
  ],
  mexican: [
    { name: 'Fresh Lime Juice', amount: '2 tbsp', cuisines: ['mexican'], calories: 6 },
    { name: 'Fresh Cilantro', amount: '2 tbsp', cuisines: ['mexican'], calories: 0 },
    { name: 'Ground Cumin', amount: '½ tsp', cuisines: ['mexican'], calories: 4 },
    { name: 'Jalapeño (sliced)', amount: '1 pepper', cuisines: ['mexican'], calories: 4 },
    { name: 'Salsa (fresh)', amount: '2 tbsp', cuisines: ['mexican'], calories: 10 },
    { name: 'Cotija Cheese', amount: '1 tbsp', cuisines: ['mexican'], calories: 30 },
    { name: 'Pickled Red Onion', amount: '2 tbsp', cuisines: ['mexican'], calories: 8 },
  ],
  indian: [
    { name: 'Garam Masala', amount: '½ tsp', cuisines: ['indian'], calories: 3 },
    { name: 'Turmeric', amount: '¼ tsp', cuisines: ['indian'], calories: 2 },
    { name: 'Fresh Ginger (minced)', amount: '1 tsp', cuisines: ['indian'], calories: 2 },
    { name: 'Ground Coriander', amount: '½ tsp', cuisines: ['indian'], calories: 3 },
    { name: 'Fresh Mint', amount: '1 tbsp', cuisines: ['indian'], calories: 1 },
    { name: 'Plain Yogurt Drizzle', amount: '2 tbsp', cuisines: ['indian'], calories: 20 },
    { name: 'Red Chili Flakes', amount: '¼ tsp', cuisines: ['indian'], calories: 2 },
  ],
  italian: [
    { name: 'Fresh Basil', amount: '4 leaves', cuisines: ['italian'], calories: 1 },
    { name: 'Balsamic Vinegar Glaze', amount: '1 tbsp', cuisines: ['italian'], calories: 20 },
    { name: 'Parmesan Shavings', amount: '1 tbsp', cuisines: ['italian'], calories: 22 },
    { name: 'Sun-Dried Tomatoes', amount: '2 pieces', cuisines: ['italian'], calories: 10 },
    { name: 'Red Pepper Flakes', amount: '¼ tsp', cuisines: ['italian'], calories: 1 },
    { name: 'Fresh Rosemary', amount: '1 sprig', cuisines: ['italian'], calories: 0 },
  ],
};

// Quick meal templates for one-click building
interface MealTemplate {
  name: string;
  description: string;
  components: { type: 'protein' | 'carb' | 'fat' | 'vegetable'; suggestion: QuickAddSuggestion; grams: number }[];
  cuisineStyle: string;
}

const MEAL_TEMPLATES: MealTemplate[] = [
  {
    name: 'Simple Protein Bowl',
    description: 'Lean protein + grain + veggies',
    components: [
      { type: 'protein', suggestion: QUICK_ADD_PROTEIN[0], grams: 150 },
      { type: 'carb', suggestion: QUICK_ADD_CARBS[1], grams: 150 },
      { type: 'vegetable', suggestion: QUICK_ADD_VEGETABLES[0], grams: 100 },
    ],
    cuisineStyle: 'universal',
  },
  {
    name: 'Stir-Fry Base',
    description: 'Protein + veggies + optional rice',
    components: [
      { type: 'protein', suggestion: QUICK_ADD_PROTEIN[0], grams: 150 },
      { type: 'vegetable', suggestion: QUICK_ADD_VEGETABLES[3], grams: 150 },
      { type: 'carb', suggestion: QUICK_ADD_CARBS[1], grams: 100 },
    ],
    cuisineStyle: 'asian',
  },
  {
    name: 'Breakfast Power Plate',
    description: 'Eggs + carbs + healthy fat',
    components: [
      { type: 'protein', suggestion: { name: 'Whole Eggs', category: 'protein', per100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 }, suggestedGrams: 100 }, grams: 100 },
      { type: 'carb', suggestion: QUICK_ADD_CARBS[0], grams: 50 },
      { type: 'fat', suggestion: QUICK_ADD_FAT[2], grams: 50 },
    ],
    cuisineStyle: 'universal',
  },
];

// Builder step type
type BuilderStep = 'protein' | 'carbs' | 'fats' | 'vegetables' | 'flavor' | 'review';

interface FoodSearchResult {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: number;
  serving_unit: string;
  category: string;
}

interface SelectedFood extends FoodSearchResult {
  servings: number; // multiplier for serving_size
  customGrams?: number; // optional custom gram amount
}

const CATEGORIES = [
  { value: 'protein', label: 'Protein', color: 'bg-red-100 text-red-700' },
  { value: 'carbs', label: 'Carbs', color: 'bg-amber-100 text-amber-700' },
  { value: 'fats', label: 'Fats', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'vegetables', label: 'Vegetables', color: 'bg-green-100 text-green-700' },
  { value: 'fruit', label: 'Fruit', color: 'bg-purple-100 text-purple-700' },
  { value: 'dairy', label: 'Dairy', color: 'bg-blue-100 text-blue-700' },
  { value: 'grain', label: 'Grains', color: 'bg-orange-100 text-orange-700' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700' },
] as const;

export function ManualMealForm({ slot, existingMeal, dietPreferences, onSave, onCancel }: ManualMealFormProps) {
  // Form state
  const [name, setName] = useState(existingMeal?.name || '');
  const [time, setTime] = useState(existingMeal?.time || slot.timeSlot);
  const [prepTime, setPrepTime] = useState(existingMeal?.prepTime || '15 minutes');
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [instructions, setInstructions] = useState(existingMeal?.instructions?.join('\n') || '');
  const [staffNote, setStaffNote] = useState(existingMeal?.staffNote || '');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCategory, setSearchCategory] = useState<string>('all');
  
  // AI suggestion state
  const [isGettingAiSuggestion, setIsGettingAiSuggestion] = useState(false);
  
  // Guided builder state
  const [builderMode, setBuilderMode] = useState<'freeform' | 'guided'>(existingMeal ? 'freeform' : 'guided');
  const [builderStep, setBuilderStep] = useState<BuilderStep>('protein');
  const [selectedFlavorEnhancers, setSelectedFlavorEnhancers] = useState<string[]>([]);
  
  // AI flavor tips state
  const [isGettingFlavorTips, setIsGettingFlavorTips] = useState(false);
  const [aiFlavorTips, setAiFlavorTips] = useState<string | null>(null);
  
  // Initialize from existing meal
  useEffect(() => {
    if (existingMeal?.ingredients) {
      // Convert existing ingredients to selected foods format
      const foods: SelectedFood[] = existingMeal.ingredients.map((ing, idx) => ({
        id: `existing-${idx}`,
        name: ing.item,
        description: ing.item,
        calories: ing.calories,
        protein: ing.protein,
        carbs: ing.carbs,
        fat: ing.fat,
        serving_size: 100,
        serving_unit: 'g',
        category: ing.category || 'other',
        servings: 1,
      }));
      setSelectedFoods(foods);
    }
  }, [existingMeal]);
  
  // Calculate macros for a food based on servings
  const calculateFoodMacros = useCallback((food: SelectedFood) => {
    const multiplier = food.customGrams 
      ? food.customGrams / food.serving_size 
      : food.servings;
    return {
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier * 10) / 10,
      carbs: Math.round(food.carbs * multiplier * 10) / 10,
      fat: Math.round(food.fat * multiplier * 10) / 10,
    };
  }, []);
  
  // Calculate totals
  const totalMacros = useMemo((): Macros => {
    const totals = selectedFoods.reduce(
      (acc, food) => {
        const macros = calculateFoodMacros(food);
        return {
          calories: acc.calories + macros.calories,
          protein: acc.protein + macros.protein,
          carbs: acc.carbs + macros.carbs,
          fat: acc.fat + macros.fat,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    // Round all values to whole numbers
    return {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
    };
  }, [selectedFoods, calculateFoodMacros]);
  
  // Check variance from target
  const macroVariance = useMemo(() => {
    const target = slot.targetMacros;
    return {
      calories: totalMacros.calories - target.calories,
      caloriesPct: target.calories > 0 ? Math.abs(totalMacros.calories - target.calories) / target.calories * 100 : 0,
      protein: totalMacros.protein - target.protein,
      proteinPct: target.protein > 0 ? Math.abs(totalMacros.protein - target.protein) / target.protein * 100 : 0,
      carbs: totalMacros.carbs - target.carbs,
      carbsPct: target.carbs > 0 ? Math.abs(totalMacros.carbs - target.carbs) / target.carbs * 100 : 0,
      fat: totalMacros.fat - target.fat,
      fatPct: target.fat > 0 ? Math.abs(totalMacros.fat - target.fat) / target.fat * 100 : 0,
    };
  }, [totalMacros, slot.targetMacros]);
  
  const isWithinTarget = macroVariance.caloriesPct <= 10 && macroVariance.proteinPct <= 15;
  
  // Determine what's needed to hit targets
  const macroNeeds = useMemo(() => {
    const target = slot.targetMacros;
    const proteinGap = target.protein - totalMacros.protein;
    const carbsGap = target.carbs - totalMacros.carbs;
    const fatGap = target.fat - totalMacros.fat;
    const calorieGap = target.calories - totalMacros.calories;
    
    return {
      needsProtein: proteinGap > 5,
      needsCarbs: carbsGap > 10,
      needsFat: fatGap > 3,
      proteinGap: Math.max(0, proteinGap),
      carbsGap: Math.max(0, carbsGap),
      fatGap: Math.max(0, fatGap),
      calorieGap,
      // What's the biggest need?
      primaryNeed: proteinGap > 5 && proteinGap / target.protein > carbsGap / target.carbs && proteinGap / target.protein > fatGap / target.fat
        ? 'protein'
        : carbsGap > 10 && carbsGap / target.carbs > fatGap / target.fat
          ? 'carbs'
          : fatGap > 3
            ? 'fat'
            : 'none',
    };
  }, [totalMacros, slot.targetMacros]);
  
  // Get user's current supplements that could be added to meals
  const userSupplements = useMemo(() => {
    const taking = dietPreferences?.supplements?.filter(s => s.status === 'taking') || [];
    return taking.map(s => s.name);
  }, [dietPreferences?.supplements]);
  
  // Quick-add a suggestion
  const addQuickSuggestion = (suggestion: QuickAddSuggestion, customGrams?: number) => {
    const grams = customGrams || suggestion.suggestedGrams;
    const multiplier = grams / 100;
    const newFood: SelectedFood = {
      id: `quick-${Date.now()}`,
      name: suggestion.name,
      description: suggestion.name,
      calories: Math.round(suggestion.per100g.calories * multiplier),
      protein: Math.round(suggestion.per100g.protein * multiplier * 10) / 10,
      carbs: Math.round(suggestion.per100g.carbs * multiplier * 10) / 10,
      fat: Math.round(suggestion.per100g.fat * multiplier * 10) / 10,
      serving_size: grams,
      serving_unit: 'g',
      category: suggestion.category,
      servings: 1,
      customGrams: grams,
    };
    setSelectedFoods([...selectedFoods, newFood]);
    toast.success(`Added ${grams}g ${suggestion.name}`);
  };
  
  // Calculate optimal amount to add
  const calculateOptimalAmount = (suggestion: QuickAddSuggestion, targetMacro: 'protein' | 'carbs' | 'fat', gap: number): number => {
    const macroPerGram = suggestion.per100g[targetMacro] / 100;
    if (macroPerGram <= 0) return suggestion.suggestedGrams;
    const optimalGrams = Math.round(gap / macroPerGram);
    return Math.max(5, Math.min(optimalGrams, suggestion.suggestedGrams * 3)); // Clamp to reasonable range
  };
  
  // Search foods from API (uses Supabase)
  const searchFoods = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const params = new URLSearchParams({ q: query });
      if (searchCategory !== 'all') {
        params.set('category', searchCategory);
      }
      
      const response = await fetch(`/api/search-foods?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.foods || []);
      }
    } catch (error) {
      console.error('Food search error:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchFoods(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchCategory]);
  
  // Add food to selection
  const addFood = (food: FoodSearchResult) => {
    const newFood: SelectedFood = {
      ...food,
      servings: 1,
    };
    setSelectedFoods([...selectedFoods, newFood]);
    setSearchQuery('');
    setSearchResults([]);
  };
  
  // Remove food
  const removeFood = (index: number) => {
    setSelectedFoods(selectedFoods.filter((_, i) => i !== index));
  };
  
  // Update food servings
  const updateServings = (index: number, servings: number) => {
    const updated = [...selectedFoods];
    updated[index] = { ...updated[index], servings, customGrams: undefined };
    setSelectedFoods(updated);
  };
  
  // Update food grams directly
  const updateGrams = (index: number, grams: number) => {
    const updated = [...selectedFoods];
    updated[index] = { ...updated[index], customGrams: grams };
    setSelectedFoods(updated);
  };
  
  // Get AI suggestion for this slot
  const getAiSuggestion = async () => {
    setIsGettingAiSuggestion(true);
    try {
      const response = await fetch('/api/generate-single-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile: {},
          bodyCompGoals: {},
          dietPreferences: {},
          mealRequest: {
            day: slot.day,
            slotIndex: slot.slotIndex,
            slotLabel: slot.label,
            targetMacros: slot.targetMacros,
            previousMeals: [],
            timeSlot: slot.timeSlot,
            workoutRelation: slot.workoutRelation,
            isWorkoutDay: false,
          },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.meal) {
          setName(data.meal.name);
          // Convert AI ingredients to selected foods
          const foods: SelectedFood[] = data.meal.ingredients.map((ing: Ingredient, idx: number) => ({
            id: `ai-${idx}`,
            name: ing.item,
            description: ing.item,
            calories: ing.calories,
            protein: ing.protein,
            carbs: ing.carbs,
            fat: ing.fat,
            serving_size: 100,
            serving_unit: 'g',
            category: ing.category || 'other',
            servings: 1,
          }));
          setSelectedFoods(foods);
          if (data.meal.instructions) {
            setInstructions(data.meal.instructions.join('\n'));
          }
          toast.success('AI suggestion loaded! Adjust as needed.');
        }
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast.error('Failed to get AI suggestion');
    } finally {
      setIsGettingAiSuggestion(false);
    }
  };
  
  // Get AI flavor and prep tips
  const getAiFlavorTips = async () => {
    if (selectedFoods.length === 0) {
      toast.error('Add some ingredients first');
      return;
    }
    
    setIsGettingFlavorTips(true);
    try {
      const ingredients = selectedFoods.map(food => ({
        name: food.name,
        grams: food.customGrams || Math.round(food.serving_size * food.servings),
        category: food.category,
      }));
      
      const response = await fetch('/api/generate-flavor-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients,
          cuisinePreferences: dietPreferences?.cuisinePreferences,
          allergies: dietPreferences?.allergies,
          mealContext: slot.label,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiFlavorTips(data.rawText || data.tips?.fullText);
        
        // Optionally add tips to instructions
        if (data.rawText && !instructions.includes('AI Flavor Tips')) {
          setInstructions(prev => {
            const existing = prev.trim();
            return existing 
              ? `${existing}\n\n--- AI Flavor & Prep Tips ---\n${data.rawText}`
              : `--- AI Flavor & Prep Tips ---\n${data.rawText}`;
          });
        }
        
        toast.success('AI flavor tips generated and added to instructions!');
      } else {
        throw new Error('Failed to get tips');
      }
    } catch (error) {
      console.error('Flavor tips error:', error);
      toast.error('Failed to get AI flavor tips');
    } finally {
      setIsGettingFlavorTips(false);
    }
  };
  
  // Auto-scale to hit targets
  const autoScaleToTarget = () => {
    if (selectedFoods.length === 0) return;
    
    const currentCals = totalMacros.calories;
    const targetCals = slot.targetMacros.calories;
    if (currentCals === 0) return;
    
    const scale = targetCals / currentCals;
    const scaledFoods = selectedFoods.map(food => ({
      ...food,
      servings: Math.round(food.servings * scale * 10) / 10,
      customGrams: undefined,
    }));
    setSelectedFoods(scaledFoods);
    toast.success('Portions scaled to match calorie target');
  };
  
  // Apply a meal template
  const applyTemplate = (template: MealTemplate) => {
    const foods: SelectedFood[] = template.components.map((component, idx) => {
      const multiplier = component.grams / 100;
      return {
        id: `template-${idx}-${Date.now()}`,
        name: component.suggestion.name,
        description: component.suggestion.name,
        calories: Math.round(component.suggestion.per100g.calories * multiplier),
        protein: Math.round(component.suggestion.per100g.protein * multiplier * 10) / 10,
        carbs: Math.round(component.suggestion.per100g.carbs * multiplier * 10) / 10,
        fat: Math.round(component.suggestion.per100g.fat * multiplier * 10) / 10,
        serving_size: component.grams,
        serving_unit: 'g',
        category: component.suggestion.category,
        servings: 1,
        customGrams: component.grams,
      };
    });
    setSelectedFoods(foods);
    setName(template.name);
    setBuilderStep('review');
    toast.success(`Applied "${template.name}" template. Adjust portions as needed!`);
  };
  
  // Get flavor enhancers based on user preferences
  const suggestedFlavorEnhancers = useMemo(() => {
    const cuisines = dietPreferences?.cuisinePreferences || [];
    const enhancers: FlavorEnhancer[] = [...FLAVOR_ENHANCERS.universal];
    
    // Add cuisine-specific enhancers based on preferences
    if (cuisines.some(c => c.toLowerCase().includes('mediterranean') || c.toLowerCase().includes('greek'))) {
      enhancers.push(...FLAVOR_ENHANCERS.mediterranean);
    }
    if (cuisines.some(c => c.toLowerCase().includes('asian') || c.toLowerCase().includes('chinese') || c.toLowerCase().includes('japanese') || c.toLowerCase().includes('thai'))) {
      enhancers.push(...FLAVOR_ENHANCERS.asian);
    }
    if (cuisines.some(c => c.toLowerCase().includes('mexican') || c.toLowerCase().includes('latin'))) {
      enhancers.push(...FLAVOR_ENHANCERS.mexican);
    }
    if (cuisines.some(c => c.toLowerCase().includes('indian'))) {
      enhancers.push(...FLAVOR_ENHANCERS.indian);
    }
    if (cuisines.some(c => c.toLowerCase().includes('italian'))) {
      enhancers.push(...FLAVOR_ENHANCERS.italian);
    }
    
    // If no cuisine preferences, add some variety
    if (cuisines.length === 0) {
      enhancers.push(...FLAVOR_ENHANCERS.mediterranean.slice(0, 3));
      enhancers.push(...FLAVOR_ENHANCERS.asian.slice(0, 3));
    }
    
    return enhancers;
  }, [dietPreferences?.cuisinePreferences]);
  
  // Add flavor enhancer to instructions
  const addFlavorEnhancer = (enhancer: FlavorEnhancer) => {
    if (selectedFlavorEnhancers.includes(enhancer.name)) {
      setSelectedFlavorEnhancers(selectedFlavorEnhancers.filter(e => e !== enhancer.name));
      return;
    }
    setSelectedFlavorEnhancers([...selectedFlavorEnhancers, enhancer.name]);
    // Add to instructions if not already there
    const currentInstructions = instructions.trim();
    if (!currentInstructions.toLowerCase().includes(enhancer.name.toLowerCase())) {
      const seasoning = `Add ${enhancer.amount} ${enhancer.name}`;
      setInstructions(currentInstructions ? `${currentInstructions}\n${seasoning}` : seasoning);
    }
  };
  
  // Get suggestions for current builder step
  const getStepSuggestions = (): QuickAddSuggestion[] => {
    switch (builderStep) {
      case 'protein': return QUICK_ADD_PROTEIN;
      case 'carbs': return QUICK_ADD_CARBS;
      case 'fats': return QUICK_ADD_FAT;
      case 'vegetables': return QUICK_ADD_VEGETABLES;
      default: return [];
    }
  };
  
  // Navigate builder steps
  const nextBuilderStep = () => {
    const steps: BuilderStep[] = ['protein', 'carbs', 'fats', 'vegetables', 'flavor', 'review'];
    const currentIndex = steps.indexOf(builderStep);
    if (currentIndex < steps.length - 1) {
      setBuilderStep(steps[currentIndex + 1]);
    }
  };
  
  const prevBuilderStep = () => {
    const steps: BuilderStep[] = ['protein', 'carbs', 'fats', 'vegetables', 'flavor', 'review'];
    const currentIndex = steps.indexOf(builderStep);
    if (currentIndex > 0) {
      setBuilderStep(steps[currentIndex - 1]);
    }
  };
  
  // Check if a category has been added
  const hasCategory = (category: string): boolean => {
    return selectedFoods.some(f => 
      f.category === category || 
      (category === 'carbs' && (f.category === 'grain' || f.category === 'fruit'))
    );
  };
  
  // Save meal
  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a meal name');
      return;
    }
    if (selectedFoods.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }
    
    const ingredients: Ingredient[] = selectedFoods.map(food => {
      const macros = calculateFoodMacros(food);
      const grams = food.customGrams || Math.round(food.serving_size * food.servings);
      return {
        item: food.name,
        amount: `${grams}g`,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        category: food.category as Ingredient['category'],
      };
    });
    
    const meal: Meal = {
      name: name.trim(),
      time,
      context: `${slot.label} - Custom meal`,
      prepTime,
      type: slot.type,
      ingredients,
      instructions: instructions.split('\n').filter(s => s.trim()),
      totalMacros,
      targetMacros: slot.targetMacros,
      workoutRelation: slot.workoutRelation,
      staffNote: staffNote.trim() || undefined,
      source: 'manual',
      lastModified: new Date().toISOString(),
      isLocked: false,
    };
    
    onSave(meal);
  };
  
  const getCategoryBadge = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat ? <Badge className={cn('text-xs', cat.color)}>{cat.label}</Badge> : null;
  };
  
  return (
    <Card className="border-2 border-[#c19962]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {existingMeal ? 'Edit Meal' : 'Design Custom Meal'}
              <Badge variant="outline" className="text-xs">Intelligent Designer</Badge>
            </CardTitle>
            <CardDescription>{slot.label} • {slot.timeSlot}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={getAiSuggestion}
              disabled={isGettingAiSuggestion}
            >
              {isGettingAiSuggestion ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              AI Suggest
            </Button>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Mode Switcher */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex gap-2">
            <Button
              variant={builderMode === 'guided' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBuilderMode('guided')}
              className={cn(
                builderMode === 'guided' && 'bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]'
              )}
            >
              <Target className="h-4 w-4 mr-1" />
              Guided Builder
            </Button>
            <Button
              variant={builderMode === 'freeform' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBuilderMode('freeform')}
              className={cn(
                builderMode === 'freeform' && 'bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]'
              )}
            >
              <Search className="h-4 w-4 mr-1" />
              Freeform Search
            </Button>
          </div>
          {builderMode === 'guided' && !existingMeal && selectedFoods.length === 0 && (
            <Select onValueChange={(val) => applyTemplate(MEAL_TEMPLATES[parseInt(val)])}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Quick Templates..." />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TEMPLATES.map((template, idx) => (
                  <SelectItem key={template.name} value={idx.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-muted-foreground">{template.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Guided Builder Progress */}
        {builderMode === 'guided' && (
          <div className="flex items-center justify-between gap-2 px-2">
            {(['protein', 'carbs', 'fats', 'vegetables', 'flavor', 'review'] as BuilderStep[]).map((step, idx) => (
              <div 
                key={step}
                className={cn(
                  'flex-1 text-center py-2 px-1 rounded cursor-pointer transition-all',
                  builderStep === step && 'bg-[#c19962] text-[#00263d] font-medium',
                  builderStep !== step && hasCategory(step === 'fats' ? 'fats' : step) && 'bg-green-100 text-green-700',
                  builderStep !== step && !hasCategory(step === 'fats' ? 'fats' : step) && 'bg-muted text-muted-foreground'
                )}
                onClick={() => setBuilderStep(step)}
              >
                <div className="text-xs capitalize">
                  {idx + 1}. {step === 'fats' ? 'Fats' : step}
                </div>
                {hasCategory(step === 'fats' ? 'fats' : step) && builderStep !== step && (
                  <CheckCircle className="h-3 w-3 mx-auto mt-1 text-green-600" />
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Live Macro Dashboard */}
        <div className="grid grid-cols-5 gap-3 p-4 bg-gradient-to-r from-[#00263d] to-[#003b59] rounded-lg text-white">
          <div className="text-center">
            <p className="text-xs opacity-70 mb-1">Target</p>
            <p className="text-lg font-bold">{slot.targetMacros.calories}</p>
            <p className="text-xs opacity-70">cal</p>
          </div>
          <div className="text-center border-l border-white/20">
            <p className="text-xs opacity-70 mb-1">Current</p>
            <p className={cn(
              'text-lg font-bold',
              isWithinTarget ? 'text-green-400' : Math.abs(macroVariance.caloriesPct) > 15 ? 'text-red-400' : 'text-yellow-400'
            )}>
              {Math.round(totalMacros.calories)}
            </p>
            <p className="text-xs opacity-70">cal</p>
          </div>
          <div className="text-center border-l border-white/20">
            <p className="text-xs opacity-70 mb-1">Protein</p>
            <p className={cn(
              'text-lg font-bold',
              macroVariance.proteinPct <= 15 ? 'text-green-400' : 'text-yellow-400'
            )}>
              {Math.round(totalMacros.protein)}g
            </p>
            <p className="text-xs opacity-70">/ {slot.targetMacros.protein}g</p>
          </div>
          <div className="text-center border-l border-white/20">
            <p className="text-xs opacity-70 mb-1">Carbs</p>
            <p className="text-lg font-bold">{Math.round(totalMacros.carbs)}g</p>
            <p className="text-xs opacity-70">/ {slot.targetMacros.carbs}g</p>
          </div>
          <div className="text-center border-l border-white/20">
            <p className="text-xs opacity-70 mb-1">Fat</p>
            <p className="text-lg font-bold">{Math.round(totalMacros.fat)}g</p>
            <p className="text-xs opacity-70">/ {slot.targetMacros.fat}g</p>
          </div>
        </div>
        
        {/* Variance Indicator */}
        {selectedFoods.length > 0 && (
          <div className={cn(
            'flex items-center justify-between p-3 rounded-lg text-sm',
            isWithinTarget ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
          )}>
            <div className="flex items-center gap-2">
              {isWithinTarget ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
              <span className={isWithinTarget ? 'text-green-800' : 'text-orange-800'}>
                {isWithinTarget 
                  ? 'Macros within target range!' 
                  : `${macroVariance.calories > 0 ? '+' : ''}${Math.round(macroVariance.calories)} cal from target`
                }
              </span>
            </div>
            {!isWithinTarget && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={autoScaleToTarget}
                className="text-xs"
              >
                <Scale className="h-3 w-3 mr-1" />
                Auto-Scale
              </Button>
            )}
          </div>
        )}
        
        {/* Basic Info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Label htmlFor="meal-name">Meal Name</Label>
            <Input
              id="meal-name"
              placeholder="e.g., Grilled Chicken Power Bowl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="prep-time">Prep Time</Label>
            <Select value={prepTime} onValueChange={setPrepTime}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5 minutes">5 min</SelectItem>
                <SelectItem value="10 minutes">10 min</SelectItem>
                <SelectItem value="15 minutes">15 min</SelectItem>
                <SelectItem value="20 minutes">20 min</SelectItem>
                <SelectItem value="30 minutes">30 min</SelectItem>
                <SelectItem value="45 minutes">45 min</SelectItem>
                <SelectItem value="60+ minutes">60+ min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Separator />
        
        {/* Smart Suggestions - What to Add */}
        {!isWithinTarget && selectedFoods.length > 0 && (
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[#c19962]" />
              Smart Suggestions to Hit Targets
            </Label>
            
            {/* Protein suggestions */}
            {macroNeeds.needsProtein && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xs font-medium text-red-700 mb-2">
                  Need +{Math.round(macroNeeds.proteinGap)}g protein
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ADD_PROTEIN.slice(0, 4).map((item) => {
                    const optimalGrams = calculateOptimalAmount(item, 'protein', macroNeeds.proteinGap);
                    const addedProtein = Math.round(item.per100g.protein * optimalGrams / 100);
                    return (
                      <Button
                        key={item.name}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-red-200 hover:bg-red-100"
                        onClick={() => addQuickSuggestion(item, optimalGrams)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {optimalGrams}g {item.name} (+{addedProtein}g P)
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Carb suggestions */}
            {macroNeeds.needsCarbs && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-2">
                  Need +{Math.round(macroNeeds.carbsGap)}g carbs
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ADD_CARBS.slice(0, 4).map((item) => {
                    const optimalGrams = calculateOptimalAmount(item, 'carbs', macroNeeds.carbsGap);
                    const addedCarbs = Math.round(item.per100g.carbs * optimalGrams / 100);
                    return (
                      <Button
                        key={item.name}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-amber-200 hover:bg-amber-100"
                        onClick={() => addQuickSuggestion(item, optimalGrams)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {optimalGrams}g {item.name} (+{addedCarbs}g C)
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Fat suggestions */}
            {macroNeeds.needsFat && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="text-xs font-medium text-yellow-700 mb-2">
                  Need +{Math.round(macroNeeds.fatGap)}g fat
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ADD_FAT.slice(0, 4).map((item) => {
                    const optimalGrams = calculateOptimalAmount(item, 'fat', macroNeeds.fatGap);
                    const addedFat = Math.round(item.per100g.fat * optimalGrams / 100);
                    return (
                      <Button
                        key={item.name}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-yellow-200 hover:bg-yellow-100"
                        onClick={() => addQuickSuggestion(item, optimalGrams)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {optimalGrams}g {item.name} (+{addedFat}g F)
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* User's Supplements */}
        {userSupplements.length > 0 && (
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
            <p className="text-xs font-medium text-purple-700 mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Client&apos;s Supplements (click to add)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SUPPLEMENTS.filter(s => 
                userSupplements.some(us => 
                  s.name.toLowerCase().includes(us.toLowerCase()) || 
                  us.toLowerCase().includes(s.name.split(' ')[0].toLowerCase())
                )
              ).map((item) => (
                <Button
                  key={item.name}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-purple-200 hover:bg-purple-100"
                  onClick={() => addQuickSuggestion(item)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {item.name}
                </Button>
              ))}
              {/* Always show protein option if they need protein */}
              {macroNeeds.needsProtein && !userSupplements.some(s => s.toLowerCase().includes('protein')) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-purple-200 hover:bg-purple-100"
                  onClick={() => addQuickSuggestion(COMMON_SUPPLEMENTS[0])}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Whey Protein (1 scoop)
                </Button>
              )}
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Guided Builder Steps */}
        {builderMode === 'guided' && builderStep !== 'review' && (
          <div className="space-y-4">
            {/* Step-specific content */}
            {builderStep === 'flavor' ? (
              <div className="space-y-4">
                {/* AI Flavor Tips - Primary CTA */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-purple-900 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        AI Flavor & Prep Recommendations
                      </h4>
                      <p className="text-xs text-purple-700 mt-1">
                        Get personalized cooking tips, seasoning recommendations, and preparation instructions specifically for your selected ingredients.
                      </p>
                    </div>
                    <Button
                      onClick={getAiFlavorTips}
                      disabled={isGettingFlavorTips || selectedFoods.length === 0}
                      className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                    >
                      {isGettingFlavorTips ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Get AI Tips
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {selectedFoods.length === 0 && (
                    <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Add ingredients in previous steps first
                    </p>
                  )}
                </div>
                
                {/* AI Tips Display */}
                {aiFlavorTips && (
                  <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                    <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Your Personalized Flavor Tips
                    </h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {aiFlavorTips}
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      ✓ Tips added to preparation instructions below
                    </p>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#c19962]" />
                    Quick-Add Flavor Enhancers (Low Calorie)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Or manually select seasonings and additions that make your meal taste amazing.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Universal Enhancers */}
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-xs font-medium text-gray-700 mb-2">🌍 Universal</p>
                    <div className="flex flex-wrap gap-1.5">
                      {FLAVOR_ENHANCERS.universal.map((enhancer) => (
                        <Button
                          key={enhancer.name}
                          variant={selectedFlavorEnhancers.includes(enhancer.name) ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            'h-7 text-xs',
                            selectedFlavorEnhancers.includes(enhancer.name) && 'bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]'
                          )}
                          onClick={() => addFlavorEnhancer(enhancer)}
                        >
                          {selectedFlavorEnhancers.includes(enhancer.name) && <CheckCircle className="h-3 w-3 mr-1" />}
                          {enhancer.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Cuisine-specific Enhancers */}
                  {Object.entries(FLAVOR_ENHANCERS).filter(([key]) => key !== 'universal').map(([cuisine, enhancers]) => (
                    <div key={cuisine} className="p-3 bg-gray-50 rounded-lg border">
                      <p className="text-xs font-medium text-gray-700 mb-2 capitalize">
                        {cuisine === 'asian' ? '🥢' : cuisine === 'mexican' ? '🌮' : cuisine === 'indian' ? '🍛' : cuisine === 'italian' ? '🍝' : '🫒'} {cuisine}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {enhancers.slice(0, 4).map((enhancer) => (
                          <Button
                            key={enhancer.name}
                            variant={selectedFlavorEnhancers.includes(enhancer.name) ? 'default' : 'outline'}
                            size="sm"
                            className={cn(
                              'h-7 text-xs',
                              selectedFlavorEnhancers.includes(enhancer.name) && 'bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]'
                            )}
                            onClick={() => addFlavorEnhancer(enhancer)}
                          >
                            {selectedFlavorEnhancers.includes(enhancer.name) && <CheckCircle className="h-3 w-3 mr-1" />}
                            {enhancer.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedFlavorEnhancers.length > 0 && (
                  <div className="p-2 bg-[#c19962]/10 rounded text-sm">
                    <p className="font-medium text-[#00263d]">Selected: {selectedFlavorEnhancers.join(', ')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{selectedFlavorEnhancers.reduce((sum, name) => {
                        const enhancer = suggestedFlavorEnhancers.find(e => e.name === name);
                        return sum + (enhancer?.calories || 0);
                      }, 0)} additional calories
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#c19962]" />
                    Step {(['protein', 'carbs', 'fats', 'vegetables'].indexOf(builderStep) + 1)}: Select{' '}
                    <span className="capitalize font-bold">{builderStep === 'fats' ? 'Fat Source' : builderStep}</span>
                  </Label>
                  {hasCategory(builderStep === 'fats' ? 'fats' : builderStep) && (
                    <Badge className="bg-green-100 text-green-700">Added ✓</Badge>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {builderStep === 'protein' && 'Choose your primary protein source. This should provide most of your protein target.'}
                  {builderStep === 'carbs' && 'Select your carbohydrate source for energy. Consider your remaining calorie budget.'}
                  {builderStep === 'fats' && 'Add healthy fats for satiety and nutrient absorption.'}
                  {builderStep === 'vegetables' && 'Add vegetables for fiber, vitamins, and volume.'}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {getStepSuggestions().map((item) => {
                    const optimalGrams = builderStep === 'protein' 
                      ? calculateOptimalAmount(item, 'protein', slot.targetMacros.protein - totalMacros.protein)
                      : builderStep === 'carbs'
                        ? calculateOptimalAmount(item, 'carbs', slot.targetMacros.carbs - totalMacros.carbs)
                        : builderStep === 'fats'
                          ? calculateOptimalAmount(item, 'fat', slot.targetMacros.fat - totalMacros.fat)
                          : item.suggestedGrams;
                    const clampedGrams = Math.max(item.suggestedGrams / 2, Math.min(item.suggestedGrams * 2, optimalGrams));
                    const macros = {
                      calories: Math.round(item.per100g.calories * clampedGrams / 100),
                      protein: Math.round(item.per100g.protein * clampedGrams / 100),
                      carbs: Math.round(item.per100g.carbs * clampedGrams / 100),
                      fat: Math.round(item.per100g.fat * clampedGrams / 100),
                    };
                    
                    return (
                      <Card 
                        key={item.name}
                        className={cn(
                          'cursor-pointer hover:border-[#c19962] transition-colors',
                          selectedFoods.some(f => f.name === item.name) && 'border-green-500 bg-green-50'
                        )}
                        onClick={() => addQuickSuggestion(item, clampedGrams)}
                      >
                        <CardContent className="p-3">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{clampedGrams}g</p>
                          <div className="flex gap-2 mt-2 text-xs">
                            <span className="text-[#00263d]">{macros.calories}cal</span>
                            <span className="text-red-600">{macros.protein}P</span>
                            <span className="text-amber-600">{macros.carbs}C</span>
                            <span className="text-yellow-600">{macros.fat}F</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={prevBuilderStep}
                disabled={builderStep === 'protein'}
              >
                ← Previous
              </Button>
              
              <div className="flex items-center gap-2">
                {/* Show Save button on flavor step if ingredients are selected */}
                {builderStep === 'flavor' && selectedFoods.length > 0 && name.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save Now
                  </Button>
                )}
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={nextBuilderStep}
                  className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                >
                  {builderStep === 'flavor' ? 'Review & Save →' : 'Next Step →'}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Review Step Header & Actions */}
        {builderMode === 'guided' && builderStep === 'review' && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5" />
                Step 6: Review & Save Your Meal
              </h3>
              <p className="text-sm text-green-700 mb-4">
                Review your selected ingredients below. Adjust serving sizes if needed, then save your meal.
              </p>
              
              {/* Meal Name - Inline Edit */}
              {!name.trim() && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <Label className="text-sm font-medium text-orange-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Enter a meal name to save
                  </Label>
                  <Input
                    placeholder="e.g., Grilled Chicken Power Bowl"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white"
                    autoFocus
                  />
                </div>
              )}
              
              {/* Save Actions */}
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBuilderStep('flavor')}
                >
                  ← Back to Flavor
                </Button>
                
                <div className="flex items-center gap-3">
                  {name.trim() && selectedFoods.length > 0 ? (
                    <>
                      <span className="text-xs text-green-600 font-medium">✓ Ready to save!</span>
                      <Button 
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Meal
                      </Button>
                    </>
                  ) : (
                    <Button 
                      disabled
                      className="opacity-50"
                      size="lg"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {!name.trim() ? 'Enter Name to Save' : 'Add Ingredients to Save'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Food Search - only show in freeform mode or review step */}
        {(builderMode === 'freeform' || builderStep === 'review') && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Add Ingredients</Label>
            <Select value={searchCategory} onValueChange={setSearchCategory}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search foods (e.g., chicken breast, brown rice, olive oil)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <ScrollArea className="h-48 mt-2 border rounded-lg">
              <div className="p-2 space-y-1">
                {searchResults.map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => addFood(food)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {food.serving_size}{food.serving_unit} • {food.calories}cal | {food.protein}P | {food.carbs}C | {food.fat}F
                      </p>
                    </div>
                    {getCategoryBadge(food.category)}
                    <Plus className="h-4 w-4 ml-2 text-[#c19962]" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        )}
        
        {/* Selected Foods */}
        {selectedFoods.length > 0 && (
          <div className="space-y-3">
            <Label>Selected Ingredients ({selectedFoods.length})</Label>
            {selectedFoods.map((food, idx) => {
              const macros = calculateFoodMacros(food);
              const grams = food.customGrams || Math.round(food.serving_size * food.servings);
              
              return (
                <div key={`${food.id}-${idx}`} className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{food.name}</span>
                      {getCategoryBadge(food.category)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeFood(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Serving Size Slider */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Amount</span>
                        <span className="font-medium text-foreground">{grams}g</span>
                      </div>
                      <Slider
                        value={[food.customGrams || food.serving_size * food.servings]}
                        min={10}
                        max={Math.max(500, food.serving_size * 5)}
                        step={5}
                        onValueChange={([val]) => updateGrams(idx, val)}
                        className="w-full"
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={grams}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+$/.test(val)) {
                            updateGrams(idx, val === '' ? 0 : parseInt(val, 10));
                          }
                        }}
                        className="h-8 text-xs text-center"
                      />
                    </div>
                  </div>
                  
                  {/* Live Macro Display */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs bg-white rounded p-2">
                    <div>
                      <p className="font-bold text-[#00263d]">{macros.calories}</p>
                      <p className="text-muted-foreground">cal</p>
                    </div>
                    <div>
                      <p className="font-bold text-red-600">{macros.protein}g</p>
                      <p className="text-muted-foreground">protein</p>
                    </div>
                    <div>
                      <p className="font-bold text-amber-600">{macros.carbs}g</p>
                      <p className="text-muted-foreground">carbs</p>
                    </div>
                    <div>
                      <p className="font-bold text-yellow-600">{macros.fat}g</p>
                      <p className="text-muted-foreground">fat</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {selectedFoods.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Search and add ingredients to build your meal</p>
            <p className="text-xs mt-1">Or click "AI Suggest" for a recommendation</p>
          </div>
        )}
        
        <Separator />
        
        {/* Instructions */}
        <div>
          <Label htmlFor="instructions">Preparation Instructions (Optional)</Label>
          <Textarea
            id="instructions"
            placeholder="Enter each step on a new line..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="mt-1 min-h-[80px]"
          />
        </div>
        
        {/* Staff Note */}
        <div>
          <Label htmlFor="staff-note">Coach Note (Optional)</Label>
          <Textarea
            id="staff-note"
            placeholder="Add a note for the client about this meal..."
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
            className="mt-1"
          />
        </div>
        
        {/* Actions - Always visible at bottom */}
        <div className={cn(
          "flex justify-between items-center gap-3 pt-4 border-t",
          builderMode === 'guided' && builderStep === 'review' && "sticky bottom-0 bg-white py-4 -mx-6 px-6 shadow-lg border-t-2"
        )}>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {builderMode === 'guided' && builderStep !== 'review' && (
              <Button
                variant="outline"
                onClick={() => setBuilderStep('review')}
                disabled={selectedFoods.length === 0}
              >
                Skip to Review →
              </Button>
            )}
            <Button 
              onClick={handleSave}
              disabled={!name.trim() || selectedFoods.length === 0}
              className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
            >
              <Save className="h-4 w-4 mr-2" />
              {existingMeal ? 'Update Meal' : 'Save Meal'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ManualMealForm;
