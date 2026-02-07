'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Sparkles, 
  PenLine, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Utensils,
  MessageSquare,
  Loader2,
  Edit,
  ArrowRightLeft,
  Dumbbell,
  ChefHat,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Target,
  Plus,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MealSlot, Meal, Macros, DietPreferences } from '@/types';

// Quick adjustment suggestions with macro impact
const QUICK_ADJUSTMENTS = {
  protein: {
    add: [
      { item: 'Protein powder (1 scoop)', protein: 25, carbs: 2, fat: 1, calories: 120 },
      { item: 'Greek yogurt (100g)', protein: 10, carbs: 4, fat: 0.5, calories: 59 },
      { item: 'Chicken breast (50g)', protein: 15, carbs: 0, fat: 1.5, calories: 75 },
      { item: 'Egg whites (3 large)', protein: 11, carbs: 1, fat: 0, calories: 51 },
      { item: 'Cottage cheese (100g)', protein: 11, carbs: 3, fat: 4, calories: 98 },
      { item: 'Deli turkey (50g)', protein: 9, carbs: 1, fat: 1, calories: 50 },
    ],
    reduce: [
      { item: 'Reduce protein portion by 25%', factor: 0.75, macro: 'protein' },
      { item: 'Reduce protein portion by 50%', factor: 0.5, macro: 'protein' },
    ]
  },
  carbs: {
    add: [
      { item: 'Rice (50g cooked)', protein: 1, carbs: 14, fat: 0.2, calories: 65 },
      { item: 'Banana (medium)', protein: 1, carbs: 27, fat: 0.4, calories: 105 },
      { item: 'Oats (30g)', protein: 3, carbs: 18, fat: 2, calories: 114 },
      { item: 'Sweet potato (100g)', protein: 2, carbs: 20, fat: 0.1, calories: 86 },
      { item: 'Berries (100g)', protein: 1, carbs: 12, fat: 0.3, calories: 57 },
      { item: 'Whole grain bread (1 slice)', protein: 4, carbs: 12, fat: 1, calories: 80 },
    ],
    reduce: [
      { item: 'Reduce carb portion by 25%', factor: 0.75, macro: 'carbs' },
      { item: 'Reduce carb portion by 50%', factor: 0.5, macro: 'carbs' },
    ]
  },
  fat: {
    add: [
      { item: 'Olive oil (1 tbsp)', protein: 0, carbs: 0, fat: 14, calories: 119 },
      { item: 'Avocado (50g)', protein: 1, carbs: 4, fat: 7, calories: 80 },
      { item: 'Almonds (15g)', protein: 3, carbs: 2, fat: 8, calories: 87 },
      { item: 'Peanut butter (1 tbsp)', protein: 4, carbs: 3, fat: 8, calories: 94 },
      { item: 'Cheese (20g)', protein: 5, carbs: 0.5, fat: 6, calories: 80 },
      { item: 'Chia seeds (10g)', protein: 2, carbs: 1, fat: 3, calories: 49 },
    ],
    reduce: [
      { item: 'Reduce fat/oil by 1 tbsp', protein: 0, carbs: 0, fat: -14, calories: -119 },
      { item: 'Use cooking spray instead of oil', protein: 0, carbs: 0, fat: -10, calories: -90 },
    ]
  }
};

// Analyze macro variances and generate recommendations
interface MacroAnalysis {
  macro: 'calories' | 'protein' | 'carbs' | 'fat';
  actual: number;
  target: number;
  diff: number;
  percentOff: number;
  status: 'on-target' | 'slightly-off' | 'off' | 'way-off';
  direction: 'over' | 'under' | 'on-target';
}

interface Recommendation {
  type: 'add' | 'reduce' | 'swap';
  priority: number;
  message: string;
  details: string;
  impact: { protein: number; carbs: number; fat: number; calories: number };
}

interface MealSlotCardProps {
  slot: MealSlot;
  onGenerateMeal: (slotIndex: number) => Promise<void>;
  onManualEntry: (slotIndex: number) => void;
  onEditMeal: (slotIndex: number) => void;
  onSwapMeal: (slotIndex: number) => void;
  onDeleteMeal: (slotIndex: number) => void;
  onToggleLock: (slotIndex: number) => void;
  onUpdateNote: (slotIndex: number, note: string) => void;
  onGenerateNote: (slotIndex: number) => Promise<void>;
  onBrowseRecipes?: (slotIndex: number) => void;
  isGenerating: boolean;
  isGeneratingNote: boolean;
}

export function MealSlotCard({
  slot,
  onGenerateMeal,
  onManualEntry,
  onEditMeal,
  onSwapMeal,
  onDeleteMeal,
  onToggleLock,
  onUpdateNote,
  onGenerateNote,
  onBrowseRecipes,
  isGenerating,
  isGeneratingNote,
}: MealSlotCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [noteValue, setNoteValue] = useState(slot.meal?.staffNote || '');
  
  const hasMeal = slot.meal !== null;
  // Note: meal is accessed after early return when !hasMeal, so it's safe to assert non-null
  const meal = slot.meal as Meal | null;
  
  // Analyze macros and generate recommendations
  const macroAnalysis = useMemo((): MacroAnalysis[] => {
    if (!hasMeal || !meal) return [];
    
    const analyze = (macro: 'calories' | 'protein' | 'carbs' | 'fat'): MacroAnalysis => {
      const actual = meal.totalMacros[macro];
      const target = slot.targetMacros[macro];
      const diff = actual - target;
      const percentOff = target > 0 ? Math.abs(diff / target) * 100 : 0;
      
      let status: MacroAnalysis['status'] = 'on-target';
      if (percentOff > 20) status = 'way-off';
      else if (percentOff > 10) status = 'off';
      else if (percentOff > 5) status = 'slightly-off';
      
      return {
        macro,
        actual: Math.round(actual),
        target: Math.round(target),
        diff: Math.round(diff),
        percentOff: Math.round(percentOff),
        status,
        direction: diff > 2 ? 'over' : diff < -2 ? 'under' : 'on-target'
      };
    };
    
    return [
      analyze('calories'),
      analyze('protein'),
      analyze('carbs'),
      analyze('fat')
    ];
  }, [hasMeal, meal, slot.targetMacros]);
  
  // Generate smart recommendations
  const recommendations = useMemo((): Recommendation[] => {
    if (!hasMeal || !meal || macroAnalysis.length === 0) return [];
    
    const recs: Recommendation[] = [];
    const proteinAnalysis = macroAnalysis.find(m => m.macro === 'protein')!;
    const carbsAnalysis = macroAnalysis.find(m => m.macro === 'carbs')!;
    const fatAnalysis = macroAnalysis.find(m => m.macro === 'fat')!;
    const caloriesAnalysis = macroAnalysis.find(m => m.macro === 'calories')!;
    
    // Protein adjustments
    if (proteinAnalysis.direction === 'under' && proteinAnalysis.percentOff > 10) {
      const deficit = Math.abs(proteinAnalysis.diff);
      const bestFit = QUICK_ADJUSTMENTS.protein.add.find(a => 
        a.protein >= deficit * 0.6 && a.protein <= deficit * 1.4
      ) || QUICK_ADJUSTMENTS.protein.add[0];
      
      recs.push({
        type: 'add',
        priority: proteinAnalysis.percentOff,
        message: `Add ~${deficit}g protein`,
        details: `Try: ${bestFit.item} (+${bestFit.protein}g P)`,
        impact: { protein: bestFit.protein, carbs: bestFit.carbs, fat: bestFit.fat, calories: bestFit.calories }
      });
    } else if (proteinAnalysis.direction === 'over' && proteinAnalysis.percentOff > 15) {
      const excess = Math.abs(proteinAnalysis.diff);
      recs.push({
        type: 'reduce',
        priority: proteinAnalysis.percentOff * 0.8,
        message: `Reduce protein by ~${excess}g`,
        details: 'Decrease protein portion or swap to leaner cut',
        impact: { protein: -excess, carbs: 0, fat: 0, calories: -excess * 4 }
      });
    }
    
    // Carb adjustments
    if (carbsAnalysis.direction === 'under' && carbsAnalysis.percentOff > 10) {
      const deficit = Math.abs(carbsAnalysis.diff);
      const bestFit = QUICK_ADJUSTMENTS.carbs.add.find(a => 
        a.carbs >= deficit * 0.5 && a.carbs <= deficit * 1.5
      ) || QUICK_ADJUSTMENTS.carbs.add[0];
      
      recs.push({
        type: 'add',
        priority: carbsAnalysis.percentOff * 0.9,
        message: `Add ~${deficit}g carbs`,
        details: `Try: ${bestFit.item} (+${bestFit.carbs}g C)`,
        impact: { protein: bestFit.protein, carbs: bestFit.carbs, fat: bestFit.fat, calories: bestFit.calories }
      });
    } else if (carbsAnalysis.direction === 'over' && carbsAnalysis.percentOff > 15) {
      const excess = Math.abs(carbsAnalysis.diff);
      recs.push({
        type: 'reduce',
        priority: carbsAnalysis.percentOff * 0.7,
        message: `Reduce carbs by ~${excess}g`,
        details: 'Decrease starch/grain portion or remove side',
        impact: { protein: 0, carbs: -excess, fat: 0, calories: -excess * 4 }
      });
    }
    
    // Fat adjustments
    if (fatAnalysis.direction === 'under' && fatAnalysis.percentOff > 15) {
      const deficit = Math.abs(fatAnalysis.diff);
      const bestFit = QUICK_ADJUSTMENTS.fat.add.find(a => 
        a.fat >= deficit * 0.5 && a.fat <= deficit * 1.5
      ) || QUICK_ADJUSTMENTS.fat.add[0];
      
      recs.push({
        type: 'add',
        priority: fatAnalysis.percentOff * 0.7,
        message: `Add ~${deficit}g fat`,
        details: `Try: ${bestFit.item} (+${bestFit.fat}g F)`,
        impact: { protein: bestFit.protein, carbs: bestFit.carbs, fat: bestFit.fat, calories: bestFit.calories }
      });
    } else if (fatAnalysis.direction === 'over' && fatAnalysis.percentOff > 20) {
      const excess = Math.abs(fatAnalysis.diff);
      recs.push({
        type: 'reduce',
        priority: fatAnalysis.percentOff * 0.6,
        message: `Reduce fat by ~${excess}g`,
        details: 'Use less oil, remove nuts/cheese, or swap cooking method',
        impact: { protein: 0, carbs: 0, fat: -excess, calories: -excess * 9 }
      });
    }
    
    // Overall calorie balance check (if macros are mostly ok but calories still off)
    if (caloriesAnalysis.percentOff > 15 && recs.length === 0) {
      if (caloriesAnalysis.direction === 'under') {
        recs.push({
          type: 'add',
          priority: 50,
          message: `Add ~${Math.abs(caloriesAnalysis.diff)} kcal`,
          details: 'Increase portion sizes slightly or add a small side',
          impact: { protein: 0, carbs: 0, fat: 0, calories: Math.abs(caloriesAnalysis.diff) }
        });
      } else {
        recs.push({
          type: 'reduce',
          priority: 50,
          message: `Reduce by ~${Math.abs(caloriesAnalysis.diff)} kcal`,
          details: 'Decrease portion sizes or remove calorie-dense items',
          impact: { protein: 0, carbs: 0, fat: 0, calories: -Math.abs(caloriesAnalysis.diff) }
        });
      }
    }
    
    // Sort by priority (highest first)
    return recs.sort((a, b) => b.priority - a.priority);
  }, [hasMeal, meal, macroAnalysis]);
  
  // Overall meal status
  const mealStatus = useMemo(() => {
    if (macroAnalysis.length === 0) return 'empty';
    const offCount = macroAnalysis.filter(m => m.status === 'off' || m.status === 'way-off').length;
    if (offCount === 0) return 'on-target';
    if (offCount === 1) return 'close';
    return 'needs-adjustment';
  }, [macroAnalysis]);
  
  // Calculate macro percentage of target
  const getMacroPercentage = (actual: number, target: number) => {
    if (target === 0) return 100;
    return Math.round((actual / target) * 100);
  };
  
  const getMacroVarianceClass = (actual: number, target: number) => {
    const variance = Math.abs(actual - target) / target;
    if (variance <= 0.05) return 'text-green-600';
    if (variance <= 0.1) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getStatusIcon = (analysis: MacroAnalysis) => {
    if (analysis.status === 'on-target') return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (analysis.direction === 'over') return <TrendingUp className="h-3 w-3 text-orange-500" />;
    return <TrendingDown className="h-3 w-3 text-blue-500" />;
  };

  // Source badge removed - was causing overlap in meal title area
  
  const handleSaveNote = () => {
    onUpdateNote(slot.slotIndex, noteValue);
    setShowNoteInput(false);
  };

  // ============ EMPTY STATE ============
  if (!hasMeal) {
    return (
      <Card className={cn(
        'border-dashed border-2 transition-all',
        isGenerating ? 'border-[#c19962] bg-[#c19962]/5' : 'border-muted hover:border-[#c19962]/50'
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {slot.type === 'meal' ? <Utensils className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {slot.label}
            </CardTitle>
            <span className="text-xs text-muted-foreground">{slot.timeSlot}</span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Target macros */}
          <div className="text-xs text-muted-foreground mb-4">
            <span className="font-medium">Target:</span>{' '}
            {slot.targetMacros.calories} cal | {slot.targetMacros.protein}g P | {slot.targetMacros.carbs}g C | {slot.targetMacros.fat}g F
          </div>
          
          {slot.workoutRelation !== 'none' && (
            <Badge variant="outline" className="mb-3 text-xs">
              <Dumbbell className="h-3 w-3 mr-1" />
              {slot.workoutRelation === 'pre-workout' ? 'Pre-Workout' : 'Post-Workout'}
            </Badge>
          )}
          
          {isGenerating ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-[#c19962]" />
              <span className="ml-2 text-sm text-muted-foreground">Generating meal...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Primary: Browse Curated Recipes */}
              {onBrowseRecipes && (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full bg-[#00263d] hover:bg-[#003b59]"
                  onClick={() => onBrowseRecipes(slot.slotIndex)}
                >
                  <ChefHat className="h-4 w-4 mr-1" />
                  Browse Recipes
                </Button>
              )}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onGenerateMeal(slot.slotIndex)}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  AI Generate
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onManualEntry(slot.slotIndex)}
                >
                  <PenLine className="h-4 w-4 mr-1" />
                  Manual
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ============ FILLED STATE ============
  // TypeScript narrowing: after early return, meal is guaranteed non-null
  const filledMeal = meal!;
  
  return (
    <Card className={cn(
      'border-l-4 transition-all',
      slot.isLocked ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-[#c19962]'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">{slot.label}</CardTitle>
            {slot.isLocked && (
              <Badge variant="secondary" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => onToggleLock(slot.slotIndex)}
              title={slot.isLocked ? 'Unlock' : 'Lock'}
            >
              {slot.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Meal Name & Time */}
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-[#00263d]">{filledMeal.name}</p>
          <span className="text-xs text-muted-foreground">{filledMeal.time} • {filledMeal.prepTime}</span>
        </div>
        
        {/* Enhanced Macros Summary with Variance */}
        <TooltipProvider delayDuration={100}>
          <div className="mb-3">
            {/* Status Bar */}
            <div className={cn(
              "flex items-center justify-between px-2 py-1 rounded-t-lg text-xs",
              mealStatus === 'on-target' && "bg-green-100 text-green-700",
              mealStatus === 'close' && "bg-yellow-100 text-yellow-700",
              mealStatus === 'needs-adjustment' && "bg-orange-100 text-orange-700"
            )}>
              <div className="flex items-center gap-1.5">
                {mealStatus === 'on-target' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="font-medium">On Target</span>
                  </>
                ) : mealStatus === 'close' ? (
                  <>
                    <Target className="h-3.5 w-3.5" />
                    <span className="font-medium">Close to Target</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="font-medium">Needs Adjustment</span>
                  </>
                )}
              </div>
              {recommendations.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 text-[10px]"
                  onClick={() => setShowRecommendations(!showRecommendations)}
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  {showRecommendations ? 'Hide Tips' : `${recommendations.length} Tip${recommendations.length > 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
            
            {/* Macro Grid */}
            <div className="grid grid-cols-4 gap-1 text-center text-xs p-2 bg-muted/50 rounded-b-lg">
              {macroAnalysis.map((analysis) => (
                <Tooltip key={analysis.macro}>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "p-1.5 rounded cursor-help transition-colors",
                      analysis.status === 'on-target' && "hover:bg-green-100",
                      analysis.status === 'slightly-off' && "hover:bg-yellow-100",
                      (analysis.status === 'off' || analysis.status === 'way-off') && "hover:bg-orange-100"
                    )}>
                      <div className="flex items-center justify-center gap-0.5 mb-0.5">
                        {getStatusIcon(analysis)}
                        <span className={cn(
                          'font-bold',
                          analysis.status === 'on-target' && 'text-green-600',
                          analysis.status === 'slightly-off' && 'text-yellow-600',
                          (analysis.status === 'off' || analysis.status === 'way-off') && 'text-orange-600'
                        )}>
                          {analysis.actual}{analysis.macro !== 'calories' && 'g'}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[10px]">
                        {analysis.macro === 'calories' ? 'cal' : analysis.macro}
                      </p>
                      {analysis.direction !== 'on-target' && (
                        <p className={cn(
                          "text-[9px] font-medium mt-0.5",
                          analysis.direction === 'over' ? 'text-orange-500' : 'text-blue-500'
                        )}>
                          {analysis.direction === 'over' ? '+' : ''}{analysis.diff}{analysis.macro !== 'calories' && 'g'}
                        </p>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {analysis.macro.charAt(0).toUpperCase() + analysis.macro.slice(1)}
                      </p>
                      <p>Actual: {analysis.actual}{analysis.macro !== 'calories' ? 'g' : ' kcal'}</p>
                      <p>Target: {analysis.target}{analysis.macro !== 'calories' ? 'g' : ' kcal'}</p>
                      <p className={cn(
                        analysis.direction === 'on-target' ? 'text-green-600' :
                        analysis.direction === 'over' ? 'text-orange-600' : 'text-blue-600'
                      )}>
                        {analysis.direction === 'on-target' 
                          ? '✓ On target!' 
                          : `${analysis.direction === 'over' ? '+' : ''}${analysis.diff}${analysis.macro !== 'calories' ? 'g' : ' kcal'} (${analysis.percentOff}% off)`
                        }
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            
            {/* Target Reference Row */}
            <div className="grid grid-cols-4 gap-1 text-center text-[9px] text-muted-foreground px-2 pb-1 bg-muted/30 rounded-b-lg -mt-1">
              <span>/ {slot.targetMacros.calories}</span>
              <span>/ {slot.targetMacros.protein}g</span>
              <span>/ {slot.targetMacros.carbs}g</span>
              <span>/ {slot.targetMacros.fat}g</span>
            </div>
          </div>
        </TooltipProvider>
        
        {/* Smart Recommendations */}
        {showRecommendations && recommendations.length > 0 && (
          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">Quick Adjustments</span>
            </div>
            <div className="space-y-2">
              {recommendations.slice(0, 3).map((rec, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex items-start gap-2 p-2 rounded text-xs",
                    rec.type === 'add' ? 'bg-green-50 border border-green-200' :
                    rec.type === 'reduce' ? 'bg-orange-50 border border-orange-200' :
                    'bg-blue-50 border border-blue-200'
                  )}
                >
                  <div className={cn(
                    "mt-0.5 p-0.5 rounded",
                    rec.type === 'add' ? 'bg-green-200' : 
                    rec.type === 'reduce' ? 'bg-orange-200' : 'bg-blue-200'
                  )}>
                    {rec.type === 'add' ? <Plus className="h-3 w-3 text-green-700" /> :
                     rec.type === 'reduce' ? <Minus className="h-3 w-3 text-orange-700" /> :
                     <ArrowRightLeft className="h-3 w-3 text-blue-700" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{rec.message}</p>
                    <p className="text-muted-foreground">{rec.details}</p>
                    <div className="flex gap-2 mt-1 text-[10px]">
                      {rec.impact.protein !== 0 && (
                        <span className={rec.impact.protein > 0 ? 'text-green-600' : 'text-orange-600'}>
                          {rec.impact.protein > 0 ? '+' : ''}{rec.impact.protein}g P
                        </span>
                      )}
                      {rec.impact.carbs !== 0 && (
                        <span className={rec.impact.carbs > 0 ? 'text-green-600' : 'text-orange-600'}>
                          {rec.impact.carbs > 0 ? '+' : ''}{rec.impact.carbs}g C
                        </span>
                      )}
                      {rec.impact.fat !== 0 && (
                        <span className={rec.impact.fat > 0 ? 'text-green-600' : 'text-orange-600'}>
                          {rec.impact.fat > 0 ? '+' : ''}{rec.impact.fat}g F
                        </span>
                      )}
                      {rec.impact.calories !== 0 && (
                        <span className={rec.impact.calories > 0 ? 'text-green-600' : 'text-orange-600'}>
                          {rec.impact.calories > 0 ? '+' : ''}{rec.impact.calories} cal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Quick Add Buttons for Common Items */}
            {recommendations.some(r => r.type === 'add' && r.message.includes('protein')) && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <p className="text-[10px] text-amber-700 mb-1.5">Quick protein additions:</p>
                <div className="flex flex-wrap gap-1">
                  {QUICK_ADJUSTMENTS.protein.add.slice(0, 4).map((item, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="text-[9px] cursor-pointer hover:bg-green-100 transition-colors"
                      title={`+${item.protein}g P, +${item.calories} cal`}
                    >
                      {item.item.split(' (')[0]} (+{item.protein}g)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* AI Rationale removed - was showing auto-generated disclaimer text */}
        
        {/* Staff Note */}
        {filledMeal.staffNote && !showNoteInput && (
          <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 mb-3">
            <p className="font-medium text-blue-800 mb-1">Coach Note:</p>
            <p className="text-blue-700">{filledMeal.staffNote}</p>
          </div>
        )}
        
        {/* Note Input */}
        {showNoteInput && (
          <div className="mb-3">
            <Textarea
              placeholder="Add a note about this meal..."
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              className="text-xs min-h-[60px] mb-2"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowNoteInput(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveNote}>
                Save Note
              </Button>
            </div>
          </div>
        )}
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t">
            {/* Ingredients */}
            <p className="text-xs font-medium mb-2">Ingredients:</p>
            <ul className="text-xs text-muted-foreground space-y-1 mb-3">
              {filledMeal.ingredients.map((ing, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{ing.amount} {ing.item}</span>
                  <span className="text-muted-foreground/70">
                    {ing.calories}cal | {ing.protein}P | {ing.carbs}C | {ing.fat}F
                  </span>
                </li>
              ))}
            </ul>
            
            {/* Instructions */}
            {filledMeal.instructions && filledMeal.instructions.length > 0 && (
              <>
                <p className="text-xs font-medium mb-2">Instructions:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside mb-3">
                  {filledMeal.instructions.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </>
            )}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-7"
            onClick={() => onEditMeal(slot.slotIndex)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-7"
            onClick={() => onSwapMeal(slot.slotIndex)}
          >
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Swap
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-7"
            onClick={() => setShowNoteInput(true)}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            {filledMeal.staffNote ? 'Edit Note' : 'Add Note'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-7"
            onClick={() => onGenerateNote(slot.slotIndex)}
            disabled={isGeneratingNote}
          >
            {isGeneratingNote ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1" />
            )}
            AI Note
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7 text-destructive hover:text-destructive"
            onClick={() => onDeleteMeal(slot.slotIndex)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MealSlotCard;
