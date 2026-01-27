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
        
        {/* Food Search */}
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
                        type="number"
                        value={grams}
                        onChange={(e) => updateGrams(idx, parseInt(e.target.value) || 0)}
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
        
        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!name.trim() || selectedFoods.length === 0}
            className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
          >
            <Save className="h-4 w-4 mr-2" />
            {existingMeal ? 'Update Meal' : 'Save Meal'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ManualMealForm;
