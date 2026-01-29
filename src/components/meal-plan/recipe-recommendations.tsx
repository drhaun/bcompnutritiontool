'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/tooltip';
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
  Utensils
} from 'lucide-react';
import { toast } from 'sonner';
import type { MealSlot, Meal, Macros, DietPreferences } from '@/types';

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
  const [selectedRecipe, setSelectedRecipe] = useState<ScaledRecipe | null>(null);
  const [customServings, setCustomServings] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch recommendations when dialog opens
  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    
    try {
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
          limit: 10,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch recommendations');

      const data = await response.json();
      setRecipes(data.recipes || []);
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
      staffNote: '',
      aiRationale: selectedRecipe.matchReasons.join('. '),
      source: 'recipe',
      isLocked: false,
      lastModified: new Date().toISOString(),
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

  // Filter recipes by search
  const filteredRecipes = searchQuery 
    ? recipes.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags.some(t => t.includes(searchQuery.toLowerCase()))
      )
    : recipes;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-[#c19962]" />
            Recipe Recommendations for {slot.label}
          </DialogTitle>
          <DialogDescription>
            Curated recipes from Nutrition Insiders, automatically scaled to your targets
          </DialogDescription>
          
          {/* Active Filters Display */}
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

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Recipe List */}
          <div className="w-1/2 flex flex-col">
            {/* Search */}
            <Input
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-3"
            />
            
            {/* Target Info */}
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <span>Target:</span>
              <Badge variant="outline">{slot.targetMacros.calories} cal</Badge>
              <Badge variant="outline">{slot.targetMacros.protein}g P</Badge>
              {slot.workoutRelation !== 'none' && (
                <Badge className="bg-[#c19962] text-[#00263d]">
                  {slot.workoutRelation}
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1">
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
          <div className="w-1/2 border-l pl-4">
            {selectedRecipe ? (
              <ScrollArea className="h-full">
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
        <div className="flex justify-end gap-2 pt-4 border-t">
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
