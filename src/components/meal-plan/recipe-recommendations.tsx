'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, 
  ChefHat, 
  Star, 
  Clock, 
  Dumbbell, 
  Check,
  Info,
  Minus,
  Plus,
  ExternalLink,
  Zap,
  Utensils,
  Filter,
  X,
  ArrowUpDown,
  Lightbulb,
  Target,
  Salad,
  Flame
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { MealSlot, Meal, Macros, DietPreferences } from '@/types';

// Filter & Sort types
type SortOption = 'match' | 'calories_asc' | 'calories_desc' | 'protein_desc' | 'prep_time';
type FilterFlags = {
  highProtein: boolean;
  quickPrep: boolean;
  mealPrepFriendly: boolean;
  lowCarb: boolean;
};

interface ScaledRecipe {
  id: string;
  slug: string;
  name: string;
  cronometer_name: string | null;
  category: string;
  tags: string[];
  original: {
    serving_size_g: number | null;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  scaled: {
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  variance: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    caloriesPct: number;
    proteinPct: number;
  };
  ingredients: { item: string; amount: string }[];
  directions: string[];
  image_url: string | null;
  matchScore: number;
  matchReasons: string[];
  is_high_protein: boolean;
  is_low_carb: boolean;
  is_meal_prep_friendly: boolean;
  is_quick_prep: boolean;
}

interface RecipeRecommendationsProps {
  isOpen: boolean;
  onClose: () => void;
  slot: MealSlot;
  dietPreferences?: DietPreferences;
  excludeRecipes?: string[];
  onSelectRecipe: (meal: Meal) => void;
}

export function RecipeRecommendations({
  isOpen,
  onClose,
  slot,
  dietPreferences,
  excludeRecipes = [],
  onSelectRecipe,
}: RecipeRecommendationsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [recipes, setRecipes] = useState<ScaledRecipe[]>([]);
  const [allRecipes, setAllRecipes] = useState<ScaledRecipe[]>([]); // Full library
  const [selectedRecipe, setSelectedRecipe] = useState<ScaledRecipe | null>(null);
  const [customServings, setCustomServings] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAllRecipes, setShowAllRecipes] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('match');
  const [filters, setFilters] = useState<FilterFlags>({
    highProtein: false,
    quickPrep: false,
    mealPrepFriendly: false,
    lowCarb: false,
  });
  
  const hasActiveFilters = Object.values(filters).some(Boolean) || searchQuery.length > 0;

  // Fetch recommendations when dialog opens
  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Fetch targeted recommendations
      const response = await fetch('/api/recipes/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMacros: slot.targetMacros,
          mealContext: {
            slotType: slot.type,
            slotLabel: slot.label,
            workoutRelation: slot.workoutRelation,
            isWorkoutDay: slot.workoutRelation !== 'none',
            timeOfDay: getTimeOfDay(slot.timeSlot),
          },
          dietPreferences,
          excludeRecipes,
          limit: 50, // Get more recipes for browsing
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch recommendations');

      const data = await response.json();
      setRecipes(data.recipes || []);
      setAllRecipes(data.recipes || []); // Store full set
    } catch (error) {
      console.error('Recipe recommendation error:', error);
      toast.error('Failed to load recipe recommendations');
    } finally {
      setIsLoading(false);
    }
  }, [slot, dietPreferences, excludeRecipes]);

  useEffect(() => {
    if (isOpen) {
      fetchRecommendations();
      // Reset filters when opening
      setFilters({ highProtein: false, quickPrep: false, mealPrepFriendly: false, lowCarb: false });
      setSearchQuery('');
      setSortBy('match');
      setShowAllRecipes(false);
      setSelectedRecipe(null);
    }
  }, [isOpen, fetchRecommendations]);

  // Reset when recipe is selected
  useEffect(() => {
    if (selectedRecipe) {
      setCustomServings(selectedRecipe.scaled.servings);
    }
  }, [selectedRecipe]);

  // Calculate custom scaled macros
  const customScaledMacros = selectedRecipe ? {
    calories: Math.round(selectedRecipe.original.calories * customServings),
    protein: Math.round(selectedRecipe.original.protein * customServings),
    carbs: Math.round(selectedRecipe.original.carbs * customServings),
    fat: Math.round(selectedRecipe.original.fat * customServings),
    fiber: Math.round(selectedRecipe.original.fiber * customServings),
  } : null;

  const handleSelectRecipe = () => {
    if (!selectedRecipe || !customScaledMacros) return;

    // Scale ingredient amounts based on servings
    const scaledIngredients = selectedRecipe.ingredients.map(ing => ({
      item: ing.item,
      amount: scaleAmount(ing.amount, customServings),
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      category: categorizeIngredient(ing.item),
    }));

    // Get adjustment tips for the PDF
    const adjustmentTips = getAdjustmentTips(selectedRecipe, customServings);
    const implementationNotes = adjustmentTips.filter(t => !t.startsWith('✓')).join('\n');

    // Convert recipe to Meal format
    const meal: Meal = {
      name: selectedRecipe.name,
      time: slot.timeSlot || '',
      context: slot.label,
      prepTime: selectedRecipe.is_quick_prep ? '<15min' : '15-30min',
      type: slot.type,
      ingredients: scaledIngredients,
      instructions: selectedRecipe.directions,
      totalMacros: customScaledMacros,
      targetMacros: slot.targetMacros,
      workoutRelation: slot.workoutRelation || 'none',
      staffNote: implementationNotes || '',
      aiRationale: selectedRecipe.matchReasons.join('. '),
      source: 'recipe',
      isLocked: false,
      lastModified: new Date().toISOString(),
      // Additional metadata for PDF
      servings: customServings,
      originalRecipeName: selectedRecipe.cronometer_name || selectedRecipe.name,
    };

    onSelectRecipe(meal);
    onClose();
    toast.success(`Added ${selectedRecipe.name}`);
  };

  // Helper to categorize ingredients
  const categorizeIngredient = (item: string): 'protein' | 'carbs' | 'fats' | 'vegetables' | 'seasonings' | 'other' => {
    const lower = item.toLowerCase();
    const proteins = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'egg', 'tofu', 'tempeh', 'protein', 'whey', 'greek yogurt', 'cottage cheese'];
    const carbs = ['rice', 'pasta', 'bread', 'oat', 'potato', 'quinoa', 'tortilla', 'noodle', 'flour', 'sugar', 'honey', 'maple'];
    const fats = ['oil', 'butter', 'avocado', 'nut', 'almond', 'peanut', 'coconut', 'cheese', 'cream'];
    const vegetables = ['spinach', 'broccoli', 'pepper', 'onion', 'garlic', 'tomato', 'lettuce', 'carrot', 'cucumber', 'zucchini', 'mushroom', 'celery', 'kale'];
    const seasonings = ['salt', 'pepper', 'spice', 'herb', 'sauce', 'vinegar', 'mustard', 'seasoning', 'cumin', 'paprika', 'oregano', 'basil', 'thyme'];
    
    if (proteins.some(p => lower.includes(p))) return 'protein';
    if (carbs.some(c => lower.includes(c))) return 'carbs';
    if (fats.some(f => lower.includes(f))) return 'fats';
    if (vegetables.some(v => lower.includes(v))) return 'vegetables';
    if (seasonings.some(s => lower.includes(s))) return 'seasonings';
    return 'other';
  };

  // Filter and sort recipes
  const filteredRecipes = useMemo(() => {
    let result = [...(showAllRecipes ? allRecipes : recipes)];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.tags.some(t => t.toLowerCase().includes(query)) ||
        r.category.toLowerCase().includes(query) ||
        r.ingredients.some(i => i.item.toLowerCase().includes(query))
      );
    }
    
    // Apply attribute filters
    if (filters.highProtein) {
      result = result.filter(r => r.is_high_protein);
    }
    if (filters.quickPrep) {
      result = result.filter(r => r.is_quick_prep);
    }
    if (filters.mealPrepFriendly) {
      result = result.filter(r => r.is_meal_prep_friendly);
    }
    if (filters.lowCarb) {
      result = result.filter(r => r.is_low_carb);
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'match':
        result.sort((a, b) => b.matchScore - a.matchScore);
        break;
      case 'calories_asc':
        result.sort((a, b) => a.scaled.calories - b.scaled.calories);
        break;
      case 'calories_desc':
        result.sort((a, b) => b.scaled.calories - a.scaled.calories);
        break;
      case 'protein_desc':
        result.sort((a, b) => b.scaled.protein - a.scaled.protein);
        break;
      case 'prep_time':
        // Quick prep recipes first
        result.sort((a, b) => (b.is_quick_prep ? 1 : 0) - (a.is_quick_prep ? 1 : 0));
        break;
    }
    
    return result;
  }, [recipes, allRecipes, showAllRecipes, searchQuery, filters, sortBy]);
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({ highProtein: false, quickPrep: false, mealPrepFriendly: false, lowCarb: false });
    setSearchQuery('');
    setSortBy('match');
    setShowAllRecipes(false);
  };
  
  // Generate adjustment tips based on variance
  const getAdjustmentTips = (recipe: ScaledRecipe, servings: number): string[] => {
    const tips: string[] = [];
    const scaled = {
      calories: Math.round(recipe.original.calories * servings),
      protein: Math.round(recipe.original.protein * servings),
      carbs: Math.round(recipe.original.carbs * servings),
      fat: Math.round(recipe.original.fat * servings),
    };
    
    const proteinDiff = slot.targetMacros.protein - scaled.protein;
    const carbsDiff = slot.targetMacros.carbs - scaled.carbs;
    const fatDiff = slot.targetMacros.fat - scaled.fat;
    const calorieDiff = slot.targetMacros.calories - scaled.calories;
    
    // Protein tips
    if (proteinDiff > 10) {
      tips.push(`+${proteinDiff}g protein needed: Add ${Math.round(proteinDiff / 7)}oz chicken/fish, or ${Math.round(proteinDiff / 6)}oz Greek yogurt, or 1 scoop protein powder`);
    } else if (proteinDiff < -10) {
      tips.push(`${Math.abs(proteinDiff)}g protein over target: Reduce portion size slightly or choose a leaner protein source`);
    }
    
    // Carb tips
    if (carbsDiff > 15) {
      tips.push(`+${carbsDiff}g carbs needed: Add ${Math.round(carbsDiff / 30)}cup rice/oats, or 1 medium fruit, or ${Math.round(carbsDiff / 15)}oz bread`);
    } else if (carbsDiff < -15) {
      tips.push(`${Math.abs(carbsDiff)}g carbs over target: Reduce starchy ingredients or swap for vegetables`);
    }
    
    // Fat tips
    if (fatDiff > 8) {
      tips.push(`+${fatDiff}g fat needed: Add ${Math.round(fatDiff / 14)}tbsp olive oil/nut butter, or ¼ avocado`);
    } else if (fatDiff < -8) {
      tips.push(`${Math.abs(fatDiff)}g fat over target: Use cooking spray instead of oil, or choose leaner cuts`);
    }
    
    // Calorie balance tip
    if (Math.abs(calorieDiff) <= 30 && tips.length === 0) {
      tips.push('✓ Great fit! This recipe is well-balanced for your targets');
    }
    
    return tips;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b bg-background sticky top-0 z-10">
          {/* Title Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <ChefHat className="h-5 w-5 text-[#c19962] flex-shrink-0" />
                <span className="truncate">Recipe Library for {slot.label}</span>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {filteredRecipes.length} of {allRecipes.length} recipes • scaled to your targets
              </DialogDescription>
            </div>
            
            {/* Sort & Filter Controls - Compact */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <ArrowUpDown className="h-3 w-3 mr-1 flex-shrink-0" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">Best Match</SelectItem>
                  <SelectItem value="protein_desc">High Protein</SelectItem>
                  <SelectItem value="calories_asc">Low Calories</SelectItem>
                  <SelectItem value="calories_desc">High Calories</SelectItem>
                  <SelectItem value="prep_time">Quick Prep</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn("h-8 px-2", showFilters && "bg-[#c19962] hover:bg-[#e4ac61]")}
              >
                <Filter className="h-3 w-3" />
                {hasActiveFilters && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>
              
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Expanded Filter Panel - More compact grid layout */}
          {showFilters && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox 
                    checked={filters.highProtein}
                    onCheckedChange={(c) => setFilters(f => ({ ...f, highProtein: !!c }))}
                  />
                  <Dumbbell className="h-3 w-3 text-purple-600" />
                  <span className="truncate">High Protein</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox 
                    checked={filters.quickPrep}
                    onCheckedChange={(c) => setFilters(f => ({ ...f, quickPrep: !!c }))}
                  />
                  <Clock className="h-3 w-3 text-blue-600" />
                  <span className="truncate">Quick Prep</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox 
                    checked={filters.mealPrepFriendly}
                    onCheckedChange={(c) => setFilters(f => ({ ...f, mealPrepFriendly: !!c }))}
                  />
                  <Utensils className="h-3 w-3 text-green-600" />
                  <span className="truncate">Meal Prep</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox 
                    checked={filters.lowCarb}
                    onCheckedChange={(c) => setFilters(f => ({ ...f, lowCarb: !!c }))}
                  />
                  <Salad className="h-3 w-3 text-orange-600" />
                  <span className="truncate">Low Carb</span>
                </label>
                <div className="hidden md:block" /> {/* Spacer */}
                <label className="flex items-center gap-1.5 text-xs cursor-pointer col-span-2 md:col-span-1">
                  <Checkbox 
                    checked={showAllRecipes}
                    onCheckedChange={(c) => setShowAllRecipes(!!c)}
                  />
                  <span className="truncate">Show All</span>
                </label>
              </div>
            </div>
          )}
          
          {/* Active Diet Preferences Display */}
          {dietPreferences && (
            (dietPreferences.allergies?.length || 0) > 0 ||
            (dietPreferences.foodsToAvoid?.length || 0) > 0 ||
            (dietPreferences.foodsToEmphasize?.length || 0) > 0
          ) && (
            <div className="mt-2 p-2 bg-muted/50 rounded-lg text-xs space-y-1">
              {((dietPreferences?.allergies?.length || 0) > 0 || (dietPreferences?.foodsToAvoid?.length || 0) > 0) && (
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-red-600 font-medium">Excluding:</span>
                  {dietPreferences?.allergies?.map(a => (
                    <Badge key={a} className="bg-red-100 text-red-700 text-[10px]">🚨 {a}</Badge>
                  ))}
                  {dietPreferences?.foodsToAvoid?.map(f => (
                    <Badge key={f} variant="outline" className="text-[10px] border-red-300 text-red-600">{f}</Badge>
                  ))}
                </div>
              )}
              {(dietPreferences?.foodsToEmphasize?.length || 0) > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-green-600 font-medium">Prioritizing:</span>
                  {dietPreferences?.foodsToEmphasize?.map(f => (
                    <Badge key={f} className="bg-green-100 text-green-700 text-[10px]">⭐ {f}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden px-6">
          {/* Recipe List */}
          <div className="w-1/2 flex flex-col min-w-0 py-4">
            {/* Search & Target Row */}
            <div className="flex items-center gap-2 mb-3">
              <Input
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            
            {/* Target Info - Compact */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3 text-xs">
              <span className="text-muted-foreground">Target:</span>
              <Badge variant="outline" className="h-5 text-[10px]">{slot.targetMacros.calories} cal</Badge>
              <Badge variant="outline" className="h-5 text-[10px]">{slot.targetMacros.protein}g P</Badge>
              <Badge variant="outline" className="h-5 text-[10px]">{slot.targetMacros.carbs}g C</Badge>
              <Badge variant="outline" className="h-5 text-[10px]">{slot.targetMacros.fat}g F</Badge>
              {slot.workoutRelation !== 'none' && (
                <Badge className="bg-[#c19962] text-[#00263d] h-5 text-[10px]">
                  {slot.workoutRelation}
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 -mr-4 pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#c19962]" />
                </div>
              ) : filteredRecipes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No matching recipes found</p>
                  <p className="text-sm">Try adjusting your search or dietary preferences</p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredRecipes.map((recipe) => (
                    <Card
                      key={recipe.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedRecipe?.id === recipe.id 
                          ? 'ring-2 ring-[#c19962] bg-[#c19962]/5' 
                          : ''
                      }`}
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          {/* Recipe Image */}
                          {recipe.image_url ? (
                            <img 
                              src={recipe.image_url} 
                              alt={recipe.name}
                              className="w-16 h-16 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <Utensils className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">{recipe.name}</h4>
                              {recipe.matchScore >= 80 && (
                                <Star className="h-3 w-3 text-[#c19962] flex-shrink-0" />
                              )}
                            </div>
                            
                            {/* Scaled Macros */}
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              <span className="font-medium">{recipe.scaled.calories} cal</span>
                              <span className="text-muted-foreground">•</span>
                              <span>{recipe.scaled.protein}g P</span>
                              <span className="text-muted-foreground">•</span>
                              <span>{recipe.scaled.carbs}g C</span>
                              <span className="text-muted-foreground">•</span>
                              <span>{recipe.scaled.fat}g F</span>
                            </div>
                            
                            {/* Match Reasons */}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {recipe.is_high_protein && (
                                <Badge variant="secondary" className="text-[10px] h-4">High Protein</Badge>
                              )}
                              {recipe.is_meal_prep_friendly && (
                                <Badge variant="secondary" className="text-[10px] h-4">Meal Prep</Badge>
                              )}
                              {recipe.is_quick_prep && (
                                <Badge variant="secondary" className="text-[10px] h-4">Quick</Badge>
                              )}
                            </div>
                            
                            {/* Variance indicator */}
                            <div className="flex items-center gap-1 mt-1">
                              <div className={`text-[10px] ${
                                recipe.variance.caloriesPct <= 5 ? 'text-green-600' :
                                recipe.variance.caloriesPct <= 15 ? 'text-yellow-600' :
                                'text-orange-600'
                              }`}>
                                {recipe.variance.calories >= 0 ? '+' : ''}{recipe.variance.calories} cal
                              </div>
                              <span className="text-[10px] text-muted-foreground">•</span>
                              <span className="text-[10px] text-muted-foreground">
                                {recipe.scaled.servings} serving{recipe.scaled.servings !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          
                          {/* Match Score */}
                          <div className={`text-lg font-bold flex-shrink-0 ${
                            recipe.matchScore >= 80 ? 'text-green-600' :
                            recipe.matchScore >= 60 ? 'text-yellow-600' :
                            'text-muted-foreground'
                          }`}>
                            {recipe.matchScore}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Recipe Detail */}
          <div className="w-1/2 border-l pl-4 min-w-0 py-4">
            {selectedRecipe ? (
              <ScrollArea className="h-full -mr-4 pr-4">
                <div className="space-y-4 pr-2">
                  {/* Recipe Header */}
                  <div>
                    {selectedRecipe.image_url && (
                      <img 
                        src={selectedRecipe.image_url} 
                        alt={selectedRecipe.name}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}
                    <h3 className="text-lg font-bold">{selectedRecipe.name}</h3>
                    {selectedRecipe.cronometer_name && (
                      <p className="text-xs text-muted-foreground">
                        Cronometer: {selectedRecipe.cronometer_name}
                      </p>
                    )}
                  </div>

                  {/* Serving Adjuster */}
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <Label className="text-sm font-medium">Adjust Servings</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCustomServings(Math.max(0.5, customServings - 0.5))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="flex-1">
                          <Slider
                            value={[customServings]}
                            onValueChange={([v]) => setCustomServings(v)}
                            min={0.5}
                            max={3}
                            step={0.25}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCustomServings(Math.min(3, customServings + 0.5))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{customServings}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Adjusted Nutrition */}
                  {customScaledMacros && (
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">Calories</p>
                        <p className="text-lg font-bold">{customScaledMacros.calories}</p>
                        <p className={`text-[10px] ${
                          Math.abs(customScaledMacros.calories - slot.targetMacros.calories) / slot.targetMacros.calories <= 0.05
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }`}>
                          Target: {slot.targetMacros.calories}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">Protein</p>
                        <p className="text-lg font-bold">{customScaledMacros.protein}g</p>
                        <p className="text-[10px] text-muted-foreground">
                          Target: {slot.targetMacros.protein}g
                        </p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">Carbs</p>
                        <p className="text-lg font-bold">{customScaledMacros.carbs}g</p>
                        <p className="text-[10px] text-muted-foreground">
                          Target: {slot.targetMacros.carbs}g
                        </p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">Fat</p>
                        <p className="text-lg font-bold">{customScaledMacros.fat}g</p>
                        <p className="text-[10px] text-muted-foreground">
                          Target: {slot.targetMacros.fat}g
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Ingredients */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Ingredients ({customServings} serving{customServings !== 1 ? 's' : ''})</h4>
                    <ul className="space-y-1 text-sm">
                      {selectedRecipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-muted-foreground">{scaleAmount(ing.amount, customServings)}</span>
                          <span>{ing.item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  {/* Directions */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Directions</h4>
                    <ol className="space-y-2 text-sm list-decimal list-inside">
                      {selectedRecipe.directions.map((step, idx) => (
                        <li key={idx} className="text-muted-foreground">{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Match Info */}
                  {selectedRecipe.matchReasons.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-sm text-green-800 mb-1">Why this recipe?</h4>
                      <ul className="text-xs text-green-700 space-y-0.5">
                        {selectedRecipe.matchReasons.map((reason, idx) => (
                          <li key={idx} className="flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Adjustment Tips - How to dial in the macros */}
                  {(() => {
                    const tips = getAdjustmentTips(selectedRecipe, customServings);
                    if (tips.length === 0) return null;
                    
                    const isGoodFit = tips[0]?.startsWith('✓');
                    
                    return (
                      <div className={cn(
                        "p-3 rounded-lg border",
                        isGoodFit 
                          ? "bg-emerald-50 border-emerald-200" 
                          : "bg-amber-50 border-amber-200"
                      )}>
                        <h4 className={cn(
                          "font-medium text-sm mb-2 flex items-center gap-2",
                          isGoodFit ? "text-emerald-800" : "text-amber-800"
                        )}>
                          <Lightbulb className="h-4 w-4" />
                          {isGoodFit ? 'Macro Match' : 'Tips to Hit Your Targets'}
                        </h4>
                        <ul className={cn(
                          "text-xs space-y-1.5",
                          isGoodFit ? "text-emerald-700" : "text-amber-700"
                        )}>
                          {tips.map((tip, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              {isGoodFit ? (
                                <Check className="h-3 w-3 mt-0.5 shrink-0" />
                              ) : (
                                <Target className="h-3 w-3 mt-0.5 shrink-0" />
                              )}
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                        {!isGoodFit && (
                          <p className="text-[10px] text-amber-600 mt-2 italic">
                            These adjustments will be noted in your PDF for easy implementation
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Utensils className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select a recipe to see details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelectRecipe}
            disabled={!selectedRecipe}
            className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
          >
            <Check className="h-4 w-4 mr-2" />
            Use This Recipe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper to determine time of day from time slot
function getTimeOfDay(timeSlot: string): 'morning' | 'afternoon' | 'evening' {
  const hour = parseInt(timeSlot.split(':')[0]);
  const isPM = timeSlot.includes('PM');
  const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
  
  if (hour24 < 12) return 'morning';
  if (hour24 < 17) return 'afternoon';
  return 'evening';
}

// Helper to scale ingredient amounts
function scaleAmount(amount: string, multiplier: number): string {
  if (multiplier === 1) return amount;
  
  // Try to parse and scale numeric amounts
  const numMatch = amount.match(/^([\d\/\.]+)\s*(.*)$/);
  if (numMatch) {
    let num = parseFloat(eval(numMatch[1].replace('/', ' / '))); // Handle fractions
    num *= multiplier;
    
    // Format nicely
    if (num === Math.floor(num)) {
      return `${num} ${numMatch[2]}`;
    }
    return `${num.toFixed(1)} ${numMatch[2]}`;
  }
  
  return `${multiplier}x ${amount}`;
}

export default RecipeRecommendations;
