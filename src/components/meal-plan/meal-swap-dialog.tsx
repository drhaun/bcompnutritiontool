'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Loader2, Check, ArrowRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Meal, MealSlot, Macros, UserProfile, BodyCompGoals, DietPreferences } from '@/types';

interface MealAlternative extends Meal {
  briefDescription?: string;
  macroVariance?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface MealSwapDialogProps {
  isOpen: boolean;
  onClose: () => void;
  slot: MealSlot;
  currentMeal: Meal;
  excludeMeals: string[];
  userProfile: Partial<UserProfile>;
  bodyCompGoals: Partial<BodyCompGoals>;
  dietPreferences: Partial<DietPreferences>;
  onSelectAlternative: (meal: Meal) => void;
}

export function MealSwapDialog({
  isOpen,
  onClose,
  slot,
  currentMeal,
  excludeMeals,
  userProfile,
  bodyCompGoals,
  dietPreferences,
  onSelectAlternative,
}: MealSwapDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [alternatives, setAlternatives] = useState<MealAlternative[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  const fetchAlternatives = async () => {
    setIsLoading(true);
    setError(null);
    setAlternatives([]);
    setSelectedIndex(null);
    
    try {
      const response = await fetch('/api/suggest-meal-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          bodyCompGoals,
          dietPreferences,
          swapRequest: {
            currentMeal,
            targetMacros: slot.targetMacros,
            day: slot.day,
            slotLabel: slot.label,
            excludeMeals,
          },
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to get alternatives');
      }
      
      const data = await response.json();
      setAlternatives(data.alternatives || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get alternatives');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmSwap = () => {
    if (selectedIndex !== null && alternatives[selectedIndex]) {
      const selectedMeal = alternatives[selectedIndex];
      // Clean up the alternative meal
      const { briefDescription, macroVariance, ...mealData } = selectedMeal;
      onSelectAlternative({
        ...mealData,
        source: 'swapped',
        lastModified: new Date().toISOString(),
        isLocked: false,
        aiRationale: briefDescription || undefined,
      });
      onClose();
    }
  };
  
  const getVarianceClass = (value: number) => {
    const abs = Math.abs(value);
    if (abs <= 5) return 'text-green-600';
    if (abs <= 15) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const formatVariance = (value: number) => {
    if (value > 0) return `+${value}`;
    return String(value);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Swap Meal</DialogTitle>
          <DialogDescription>
            Get AI-suggested alternatives for &quot;{currentMeal.name}&quot;
          </DialogDescription>
        </DialogHeader>
        
        {/* Current Meal Summary */}
        <div className="p-3 bg-muted/50 rounded-lg text-sm">
          <p className="font-medium mb-1">Current: {currentMeal.name}</p>
          <p className="text-muted-foreground">
            {currentMeal.totalMacros.calories} cal | {currentMeal.totalMacros.protein}g P | {currentMeal.totalMacros.carbs}g C | {currentMeal.totalMacros.fat}g F
          </p>
        </div>
        
        {/* Target Macros */}
        <div className="p-3 border rounded-lg text-sm">
          <p className="font-medium mb-1">Target for {slot.label}</p>
          <p className="text-[#c19962]">
            {slot.targetMacros.calories} cal | {slot.targetMacros.protein}g P | {slot.targetMacros.carbs}g C | {slot.targetMacros.fat}g F
          </p>
        </div>
        
        <Separator />
        
        {/* Alternatives Section */}
        {alternatives.length === 0 && !isLoading && !error && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Click below to get AI-generated alternatives that match your target macros
            </p>
            <Button 
              onClick={fetchAlternatives}
              className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Get AI Suggestions
            </Button>
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#c19962]" />
            <span className="ml-2 text-muted-foreground">Finding alternatives...</span>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-red-700">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={fetchAlternatives}>
              Retry
            </Button>
          </div>
        )}
        
        {alternatives.length > 0 && (
          <>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {alternatives.map((alt, idx) => (
                  <Card 
                    key={idx}
                    className={cn(
                      'cursor-pointer transition-all',
                      selectedIndex === idx 
                        ? 'border-2 border-[#c19962] bg-[#c19962]/5' 
                        : 'hover:border-[#c19962]/50'
                    )}
                    onClick={() => setSelectedIndex(idx)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{alt.name}</p>
                            {selectedIndex === idx && (
                              <Badge className="bg-[#c19962] text-[#00263d]">
                                <Check className="h-3 w-3 mr-1" />
                                Selected
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{alt.prepTime}</p>
                          
                          {/* Macros */}
                          <div className="flex gap-4 text-sm mb-2">
                            <span>
                              {alt.totalMacros.calories} cal
                              {alt.macroVariance && (
                                <span className={cn('ml-1 text-xs', getVarianceClass(alt.macroVariance.calories))}>
                                  ({formatVariance(alt.macroVariance.calories)})
                                </span>
                              )}
                            </span>
                            <span>
                              {alt.totalMacros.protein}g P
                              {alt.macroVariance && (
                                <span className={cn('ml-1 text-xs', getVarianceClass(alt.macroVariance.protein))}>
                                  ({formatVariance(alt.macroVariance.protein)})
                                </span>
                              )}
                            </span>
                            <span>
                              {alt.totalMacros.carbs}g C
                              {alt.macroVariance && (
                                <span className={cn('ml-1 text-xs', getVarianceClass(alt.macroVariance.carbs))}>
                                  ({formatVariance(alt.macroVariance.carbs)})
                                </span>
                              )}
                            </span>
                            <span>
                              {alt.totalMacros.fat}g F
                              {alt.macroVariance && (
                                <span className={cn('ml-1 text-xs', getVarianceClass(alt.macroVariance.fat))}>
                                  ({formatVariance(alt.macroVariance.fat)})
                                </span>
                              )}
                            </span>
                          </div>
                          
                          {/* Description */}
                          {alt.briefDescription && (
                            <p className="text-xs text-muted-foreground italic">
                              {alt.briefDescription}
                            </p>
                          )}
                          
                          {/* Key ingredients */}
                          <p className="text-xs text-muted-foreground mt-2">
                            Key ingredients: {alt.ingredients.slice(0, 3).map(i => i.item).join(', ')}
                            {alt.ingredients.length > 3 && ` +${alt.ingredients.length - 3} more`}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            
            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" onClick={fetchAlternatives}>
                <Sparkles className="h-4 w-4 mr-2" />
                Get New Suggestions
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmSwap}
                  disabled={selectedIndex === null}
                  className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                >
                  Swap Meal
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default MealSwapDialog;
