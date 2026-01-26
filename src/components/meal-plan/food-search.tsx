'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Loader2, Database, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ingredient } from '@/types';

interface FoodResult {
  fdcId: number;
  name: string;
  category: string;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  servingInfo?: string;
}

interface FoodSearchProps {
  onSelect: (food: FoodResult, grams: number, ingredient: Ingredient) => void;
  targetMacro?: 'protein' | 'carbs' | 'fat' | 'calories';
  targetValue?: number;
  placeholder?: string;
  className?: string;
}

export function FoodSearch({
  onSelect,
  targetMacro = 'protein',
  targetValue,
  placeholder = 'Search foods (e.g., chicken breast)',
  className,
}: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGrams, setSelectedGrams] = useState(100);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/search-foods?q=${encodeURIComponent(query)}&limit=15`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.foods?.map((f: Record<string, unknown>) => ({
            fdcId: f.fdcId,
            name: f.description,
            category: f.category,
            per100g: f.nutrients,
            servingInfo: f.householdServing,
          })) || []);
        }
      } catch (error) {
        console.error('Food search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Calculate serving size and macros
  const calculateServing = useCallback((food: FoodResult, grams: number): Ingredient => {
    const scale = grams / 100;
    return {
      item: food.name,
      amount: `${grams}g`,
      calories: Math.round(food.per100g.calories * scale),
      protein: Math.round(food.per100g.protein * scale),
      carbs: Math.round(food.per100g.carbs * scale),
      fat: Math.round(food.per100g.fat * scale),
      category: food.category === 'grain' ? 'carbs' :
                food.category === 'dairy' ? 'protein' :
                food.category === 'fruit' ? 'carbs' :
                food.category as Ingredient['category'],
    };
  }, []);

  // Calculate optimal grams to hit target
  const getOptimalGrams = useCallback((food: FoodResult): number => {
    if (!targetValue || targetValue <= 0) return 100;
    
    const per100g = food.per100g[targetMacro];
    if (!per100g || per100g <= 0) return 100;
    
    const grams = (targetValue / per100g) * 100;
    return Math.round(Math.max(10, Math.min(500, grams)));
  }, [targetMacro, targetValue]);

  const handleSelect = (food: FoodResult) => {
    const grams = getOptimalGrams(food);
    const ingredient = calculateServing(food, grams);
    onSelect(food, grams, ingredient);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative', className)}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-9 pr-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Database className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4",
            isLoading ? "hidden" : "text-green-500"
          )} />
        </div>
      </PopoverTrigger>
      
      {results.length > 0 && (
        <PopoverContent className="w-[400px] p-0" align="start">
          <ScrollArea className="h-[300px]">
            <div className="p-2">
              <p className="text-xs text-muted-foreground px-2 pb-2">
                {targetValue && targetMacro ? (
                  <>Portions auto-calculated to hit ~{targetValue}g {targetMacro}</>
                ) : (
                  <>Select a food (macros per 100g)</>
                )}
              </p>
              {results.map((food) => {
                const optimalGrams = getOptimalGrams(food);
                const calculated = calculateServing(food, optimalGrams);
                
                return (
                  <button
                    key={food.fdcId}
                    className="w-full text-left px-2 py-2 hover:bg-muted rounded-md transition-colors"
                    onClick={() => handleSelect(food)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{food.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {food.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            per 100g: {food.per100g.protein}P • {food.per100g.carbs}C • {food.per100g.fat}F
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-[#c19962]">
                          {optimalGrams}g
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {calculated.calories}cal • {calculated.protein}P
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <div className="border-t p-2 bg-muted/50">
            <p className="text-[10px] text-center text-muted-foreground">
              Data from USDA FoodData Central
            </p>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

export default FoodSearch;
