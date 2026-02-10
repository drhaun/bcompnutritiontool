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
  Minus,
  Pill,
  X,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useFitomicsStore } from '@/lib/store';
import { toast } from 'sonner';
import type { MealSlot, Meal, Macros, DietPreferences, MealSupplement } from '@/types';

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
  onUpdateSupplements?: (slotIndex: number, supplements: MealSupplement[]) => void;
  isGenerating: boolean;
  isGeneratingNote: boolean;
  // Cronometer adaptive mode
  currentPattern?: {
    mealGroup: string;
    commonFoods: { name: string; serving: string; frequency: number }[];
    avgMacros: Macros;
    daysSampled: number;
  };
  adaptiveTips?: { tips: string[]; summary: string; macroGap: Macros } | null;
  onGetTips?: (slotIndex: number) => Promise<void>;
  onGenerateImproved?: (slotIndex: number) => Promise<void>;
  isGeneratingTips?: boolean;
  isGeneratingImproved?: boolean;
  // Per-meal editable targets
  onUpdateSlotTargets?: (slotIndex: number, targets: Macros) => void;
  // Rolling budget: remaining macros AFTER this slot
  rollingBudgetAfter?: Macros;
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
  onUpdateSupplements,
  isGenerating,
  isGeneratingNote,
  // Cronometer adaptive
  currentPattern,
  adaptiveTips,
  onGetTips,
  onGenerateImproved,
  isGeneratingTips,
  isGeneratingImproved,
  onUpdateSlotTargets,
  rollingBudgetAfter,
}: MealSlotCardProps) {
  const { addFavoriteRecipe, removeFavoriteRecipe, favoriteRecipes } = useFitomicsStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showPattern, setShowPattern] = useState(true);
  const [noteValue, setNoteValue] = useState(slot.meal?.staffNote || '');
  const [editingTargets, setEditingTargets] = useState(false);
  const [localTargets, setLocalTargets] = useState<Macros>({ ...slot.targetMacros });

  // Smart macro edit: when P/C/F change, auto-recalculate calories
  const handleSlotMacroEdit = (key: keyof Macros, raw: string) => {
    const value = Number(raw) || 0;
    setLocalTargets(prev => {
      const updated = { ...prev, [key]: value };
      if (key !== 'calories') {
        updated.calories = (updated.protein * 4) + (updated.carbs * 4) + (updated.fat * 9);
      }
      return updated;
    });
  };

  // Original targets (from the planned/computed values) for delta comparison
  const origTargets = slot.targetMacros;
  const [showSuppInput, setShowSuppInput] = useState(false);
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppDosage, setNewSuppDosage] = useState('');
  
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
          {/* Target macros - editable with intelligent guidance */}
          <div className="text-xs text-muted-foreground mb-4">
            {editingTargets && onUpdateSlotTargets ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'calories' as const, label: 'Cal', color: 'border-gray-300', deltaColor: '' },
                    { key: 'protein' as const, label: 'P (g)', color: 'border-blue-300', deltaColor: 'text-blue-600' },
                    { key: 'carbs' as const, label: 'C (g)', color: 'border-amber-300', deltaColor: 'text-amber-600' },
                    { key: 'fat' as const, label: 'F (g)', color: 'border-purple-300', deltaColor: 'text-purple-600' },
                  ].map(({ key, label, color }) => {
                    const delta = localTargets[key] - origTargets[key];
                    const macroDerivedCal = (localTargets.protein * 4) + (localTargets.carbs * 4) + (localTargets.fat * 9);
                    const calMismatch = key === 'calories' && Math.abs(localTargets.calories - macroDerivedCal) > 3;
                    return (
                      <div key={key} className="space-y-0.5">
                        <label className="text-[10px] font-medium">{label}</label>
                        <Input
                          type="number"
                          className={cn(`h-7 text-xs font-mono`, color, calMismatch && 'border-amber-400')}
                          value={localTargets[key]}
                          onChange={(e) => handleSlotMacroEdit(key, e.target.value)}
                        />
                        {delta !== 0 && (
                          <p className={cn("text-[9px] font-medium", delta > 0 ? 'text-green-600' : 'text-red-500')}>
                            {delta > 0 ? '+' : ''}{Math.round(delta)}{key !== 'calories' ? 'g' : ''}
                          </p>
                        )}
                        {calMismatch && (
                          <p className="text-[8px] text-amber-500">={macroDerivedCal}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  <Button 
                    size="sm" 
                    className="h-6 text-[10px]"
                    onClick={() => { onUpdateSlotTargets(slot.slotIndex, localTargets); setEditingTargets(false); }}
                  >
                    Save
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[10px]"
                    onClick={() => { setLocalTargets({ ...slot.targetMacros }); setEditingTargets(false); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Target:</span>{' '}
                  {slot.targetMacros.calories} cal | {slot.targetMacros.protein}g P | {slot.targetMacros.carbs}g C | {slot.targetMacros.fat}g F
                </div>
                {onUpdateSlotTargets && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => { setLocalTargets({ ...slot.targetMacros }); setEditingTargets(true); }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            {/* Rolling budget after this slot */}
            {rollingBudgetAfter && !editingTargets && (
              <div className="mt-1 pt-1 border-t border-dashed text-[10px] flex items-center gap-2">
                <span className="text-muted-foreground">After this:</span>
                <span className={rollingBudgetAfter.calories < 0 ? 'text-red-500 font-medium' : ''}>{rollingBudgetAfter.calories} cal</span>
                <span className={rollingBudgetAfter.protein < 0 ? 'text-red-500 font-medium' : 'text-blue-500'}>{rollingBudgetAfter.protein}g P</span>
                <span className={rollingBudgetAfter.carbs < 0 ? 'text-red-500 font-medium' : 'text-amber-500'}>{rollingBudgetAfter.carbs}g C</span>
                <span className={rollingBudgetAfter.fat < 0 ? 'text-red-500 font-medium' : 'text-purple-500'}>{rollingBudgetAfter.fat}g F</span>
                <span className="text-muted-foreground">remaining</span>
              </div>
            )}
          </div>
          
          {slot.workoutRelation !== 'none' && (
            <Badge variant="outline" className="mb-3 text-xs">
              <Dumbbell className="h-3 w-3 mr-1" />
              {slot.workoutRelation === 'pre-workout' ? 'Pre-Workout' : 'Post-Workout'}
            </Badge>
          )}
          
          {/* Cronometer Current Pattern (empty slot) */}
          {currentPattern && currentPattern.commonFoods.length > 0 && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5">
              <button
                type="button"
                className="flex items-center justify-between w-full text-left"
                onClick={() => setShowPattern(!showPattern)}
              >
                <span className="text-xs font-medium text-amber-800 flex items-center gap-1">
                  <Utensils className="h-3 w-3" />
                  Current Pattern ({currentPattern.daysSampled} days)
                </span>
                {showPattern ? <ChevronUp className="h-3 w-3 text-amber-600" /> : <ChevronDown className="h-3 w-3 text-amber-600" />}
              </button>
              {showPattern && (
                <div className="mt-2 space-y-1.5">
                  <div className="text-[10px] text-amber-700 space-y-0.5">
                    {currentPattern.commonFoods.slice(0, 5).map((f, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="truncate mr-2">{f.name}</span>
                        <span className="shrink-0 text-amber-500">{f.frequency}/{currentPattern.daysSampled}d</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-amber-700 pt-1 border-t border-amber-200">
                    Avg: {currentPattern.avgMacros.calories} cal | {currentPattern.avgMacros.protein}g P | {currentPattern.avgMacros.carbs}g C | {currentPattern.avgMacros.fat}g F
                  </div>
                  {/* Macro gap vs target */}
                  <div className="text-[10px] font-medium text-amber-800">
                    Gap: {(() => {
                      const gaps = [];
                      const cd = currentPattern.avgMacros.calories - slot.targetMacros.calories;
                      const pd = currentPattern.avgMacros.protein - slot.targetMacros.protein;
                      if (Math.abs(cd) > 30) gaps.push(`${cd > 0 ? '+' : ''}${Math.round(cd)} cal`);
                      if (Math.abs(pd) > 3) gaps.push(`${pd > 0 ? '+' : ''}${Math.round(pd)}g P`);
                      return gaps.length ? gaps.join(', ') : 'Close to target';
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Adaptive Tips Display (empty slot) */}
          {adaptiveTips && (
            <div className="mb-3 rounded-lg border border-green-200 bg-green-50/60 p-2.5">
              <p className="text-xs font-medium text-green-800 mb-1.5">
                <Lightbulb className="h-3 w-3 inline mr-1" />
                Coaching Tips
              </p>
              <p className="text-[10px] text-green-700 mb-1.5 italic">{adaptiveTips.summary}</p>
              <ol className="text-[10px] text-green-800 space-y-1 list-decimal list-inside">
                {adaptiveTips.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ol>
            </div>
          )}

          {isGenerating || isGeneratingImproved ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-[#c19962]" />
              <span className="ml-2 text-sm text-muted-foreground">
                {isGeneratingImproved ? 'Generating improved meal...' : 'Generating meal...'}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Cronometer adaptive actions */}
              {currentPattern && currentPattern.commonFoods.length > 0 && (
                <div className="flex gap-2">
                  {onGetTips && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => onGetTips(slot.slotIndex)}
                      disabled={isGeneratingTips}
                    >
                      {isGeneratingTips ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5 mr-1" />}
                      Get Tips
                    </Button>
                  )}
                  {onGenerateImproved && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => onGenerateImproved(slot.slotIndex)}
                      disabled={isGeneratingImproved}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Improve Current
                    </Button>
                  )}
                </div>
              )}
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
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={() => setShowSuppInput(true)}
              >
                <Pill className="h-4 w-4 mr-1" />
                Add Supplement
              </Button>

              {/* Supplements added to empty slot */}
              {slot.meal?.supplements && slot.meal.supplements.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {slot.meal.supplements.map((supp, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 border border-purple-200 rounded text-[10px] text-purple-700"
                    >
                      <Pill className="h-2.5 w-2.5" />
                      {supp.name}{supp.dosage ? ` (${supp.dosage})` : ''}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = slot.meal!.supplements!.filter((_, i) => i !== idx);
                          onUpdateSupplements?.(slot.slotIndex, updated);
                        }}
                        className="ml-0.5 hover:text-red-500"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Supplement input form for empty slot */}
              {showSuppInput && (
                <div className="flex gap-1.5 items-end">
                  <div className="flex-1 space-y-1">
                    <Input
                      value={newSuppName}
                      onChange={(e) => setNewSuppName(e.target.value)}
                      placeholder="Supplement name..."
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSuppName.trim()) {
                          e.preventDefault();
                          const existing = slot.meal?.supplements || [];
                          onUpdateSupplements?.(slot.slotIndex, [
                            ...existing,
                            { name: newSuppName.trim(), dosage: newSuppDosage.trim() || undefined },
                          ]);
                          setNewSuppName('');
                          setNewSuppDosage('');
                          setShowSuppInput(false);
                        }
                      }}
                    />
                  </div>
                  <Input
                    value={newSuppDosage}
                    onChange={(e) => setNewSuppDosage(e.target.value)}
                    placeholder="Dosage"
                    className="h-7 text-xs w-20"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => {
                      if (newSuppName.trim()) {
                        const existing = slot.meal?.supplements || [];
                        onUpdateSupplements?.(slot.slotIndex, [
                          ...existing,
                          { name: newSuppName.trim(), dosage: newSuppDosage.trim() || undefined },
                        ]);
                        setNewSuppName('');
                        setNewSuppDosage('');
                      }
                      setShowSuppInput(false);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-1.5"
                    onClick={() => { setShowSuppInput(false); setNewSuppName(''); setNewSuppDosage(''); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
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
        {/* Meal Name & Prep Time */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="font-semibold text-[#00263d] truncate min-w-0">{filledMeal.name}</p>
          {filledMeal.prepTime && (
            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">~{filledMeal.prepTime} prep</span>
          )}
        </div>

        {/* Adaptive Context - shows what changed from current pattern */}
        {filledMeal.adaptiveContext && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 text-xs">
            <p className="font-medium text-amber-800 mb-1">
              <Lightbulb className="h-3 w-3 inline mr-1" />
              Adapted from current pattern ({filledMeal.adaptiveContext.basedOnDays} days)
            </p>
            <p className="text-amber-700 text-[11px] mb-1.5">{filledMeal.adaptiveContext.whatChanged}</p>
            {filledMeal.adaptiveContext.keptFoods.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {filledMeal.adaptiveContext.keptFoods.map((f, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] h-4 bg-green-50 border-green-200 text-green-700">
                    {f}
                  </Badge>
                ))}
              </div>
            )}
            {filledMeal.adaptiveContext.swappedFoods.length > 0 && (
              <div className="text-[10px] text-amber-600 space-y-0.5">
                {filledMeal.adaptiveContext.swappedFoods.map((s, i) => (
                  <div key={i}>{s.from} → {s.to}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cronometer Pattern context (filled slot) */}
        {currentPattern && currentPattern.commonFoods.length > 0 && !filledMeal.adaptiveContext && (
          <div className="mb-2 rounded border border-amber-200/60 bg-amber-50/30 px-2 py-1.5">
            <button
              type="button"
              className="flex items-center justify-between w-full text-left"
              onClick={() => setShowPattern(!showPattern)}
            >
              <span className="text-[10px] text-amber-700 flex items-center gap-1">
                <Utensils className="h-2.5 w-2.5" />
                Current pattern: {currentPattern.avgMacros.calories} cal | {currentPattern.avgMacros.protein}g P
              </span>
              {showPattern ? <ChevronUp className="h-2.5 w-2.5 text-amber-500" /> : <ChevronDown className="h-2.5 w-2.5 text-amber-500" />}
            </button>
            {showPattern && (
              <div className="mt-1 text-[10px] text-amber-600 space-y-0.5">
                {currentPattern.commonFoods.slice(0, 4).map((f, i) => (
                  <div key={i} className="truncate">{f.name} ({f.serving})</div>
                ))}
              </div>
            )}
          </div>
        )}
        
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
            <div className="grid grid-cols-4 gap-1 text-center text-[9px] text-muted-foreground px-2 pb-1 bg-muted/30 -mt-1">
              <span className="flex items-center justify-center gap-0.5">
                / {slot.targetMacros.calories}
                {onUpdateSlotTargets && (
                  <button 
                    onClick={() => { setLocalTargets({ ...slot.targetMacros }); setEditingTargets(true); }}
                    className="hover:text-foreground transition-colors"
                  >
                    <Edit className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
              <span>/ {slot.targetMacros.protein}g</span>
              <span>/ {slot.targetMacros.carbs}g</span>
              <span>/ {slot.targetMacros.fat}g</span>
            </div>

            {/* Edit target inline form - with intelligent guidance */}
            {editingTargets && onUpdateSlotTargets && (
              <div className="px-2 py-2 bg-blue-50 border border-blue-200 rounded-md mt-1 space-y-1.5">
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { key: 'calories' as const, label: 'Cal' },
                    { key: 'protein' as const, label: 'P' },
                    { key: 'carbs' as const, label: 'C' },
                    { key: 'fat' as const, label: 'F' },
                  ].map(({ key, label }) => {
                    const delta = localTargets[key] - origTargets[key];
                    const macroDerivedCal = (localTargets.protein * 4) + (localTargets.carbs * 4) + (localTargets.fat * 9);
                    const calMismatch = key === 'calories' && Math.abs(localTargets.calories - macroDerivedCal) > 3;
                    return (
                      <div key={key} className="space-y-0.5">
                        <label className="text-[9px] font-medium text-blue-600">{label}</label>
                        <Input
                          type="number"
                          className={cn("h-6 text-xs font-mono px-1", calMismatch && 'border-amber-400')}
                          value={localTargets[key]}
                          onChange={(e) => handleSlotMacroEdit(key, e.target.value)}
                        />
                        {delta !== 0 && (
                          <p className={cn("text-[8px] font-medium", delta > 0 ? 'text-green-600' : 'text-red-500')}>
                            {delta > 0 ? '+' : ''}{Math.round(delta)}
                          </p>
                        )}
                        {calMismatch && (
                          <p className="text-[7px] text-amber-500">={macroDerivedCal}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" className="h-5 text-[9px] px-2" onClick={() => { onUpdateSlotTargets(slot.slotIndex, localTargets); setEditingTargets(false); }}>
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" className="h-5 text-[9px] px-2" onClick={() => { setLocalTargets({ ...slot.targetMacros }); setEditingTargets(false); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Rolling budget after this meal */}
            {rollingBudgetAfter && !editingTargets && (
              <div className="px-2 py-1 text-[9px] flex items-center gap-2 bg-muted/20 rounded-b-lg">
                <span className="text-muted-foreground">After:</span>
                <span className={cn('font-medium', rollingBudgetAfter.calories < 0 ? 'text-red-500' : 'text-muted-foreground')}>{rollingBudgetAfter.calories} cal</span>
                <span className={cn('font-medium', rollingBudgetAfter.protein < 0 ? 'text-red-500' : 'text-blue-500')}>{rollingBudgetAfter.protein}g P</span>
                <span className={cn('font-medium', rollingBudgetAfter.carbs < 0 ? 'text-red-500' : 'text-amber-500')}>{rollingBudgetAfter.carbs}g C</span>
                <span className={cn('font-medium', rollingBudgetAfter.fat < 0 ? 'text-red-500' : 'text-purple-500')}>{rollingBudgetAfter.fat}g F</span>
                <span className="text-muted-foreground">left</span>
              </div>
            )}
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

        {/* Meal Supplements */}
        {filledMeal.supplements && filledMeal.supplements.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {filledMeal.supplements.map((supp, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 border border-purple-200 rounded text-[10px] text-purple-700"
                >
                  <Pill className="h-2.5 w-2.5" />
                  {supp.name}{supp.dosage ? ` (${supp.dosage})` : ''}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = filledMeal.supplements!.filter((_, i) => i !== idx);
                      onUpdateSupplements?.(slot.slotIndex, updated);
                    }}
                    className="ml-0.5 hover:text-red-500"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add Supplement Input */}
        {showSuppInput && (
          <div className="mb-3 flex gap-1.5 items-end">
            <div className="flex-1 space-y-1">
              <Input
                value={newSuppName}
                onChange={(e) => setNewSuppName(e.target.value)}
                placeholder="Supplement name..."
                className="h-7 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSuppName.trim()) {
                    e.preventDefault();
                    const existing = filledMeal.supplements || [];
                    onUpdateSupplements?.(slot.slotIndex, [
                      ...existing,
                      { name: newSuppName.trim(), dosage: newSuppDosage.trim() || undefined },
                    ]);
                    setNewSuppName('');
                    setNewSuppDosage('');
                    setShowSuppInput(false);
                  }
                }}
              />
            </div>
            <Input
              value={newSuppDosage}
              onChange={(e) => setNewSuppDosage(e.target.value)}
              placeholder="Dosage"
              className="h-7 text-xs w-20"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => {
                if (newSuppName.trim()) {
                  const existing = filledMeal.supplements || [];
                  onUpdateSupplements?.(slot.slotIndex, [
                    ...existing,
                    { name: newSuppName.trim(), dosage: newSuppDosage.trim() || undefined },
                  ]);
                  setNewSuppName('');
                  setNewSuppDosage('');
                }
                setShowSuppInput(false);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-1.5"
              onClick={() => { setShowSuppInput(false); setNewSuppName(''); setNewSuppDosage(''); }}
            >
              <X className="h-3 w-3" />
            </Button>
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
            className="text-xs h-7 border-purple-300 text-purple-700 hover:bg-purple-50"
            onClick={() => setShowSuppInput(true)}
          >
            <Pill className="h-3 w-3 mr-1" />
            Add Supplement
          </Button>
          {filledMeal && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "text-xs h-7",
                favoriteRecipes.some(f => f.name === filledMeal.name)
                  ? "border-red-300 text-red-600 hover:bg-red-50"
                  : "border-pink-300 text-pink-700 hover:bg-pink-50"
              )}
              onClick={() => {
                const existing = favoriteRecipes.find(f => f.name === filledMeal.name);
                if (existing) {
                  removeFavoriteRecipe(existing.id);
                  toast.success('Removed from favorites');
                } else {
                  addFavoriteRecipe({
                    slug: filledMeal.name.toLowerCase().replace(/\s+/g, '-'),
                    name: filledMeal.name,
                    category: filledMeal.type || 'meal',
                    calories: filledMeal.totalMacros?.calories || 0,
                    protein: filledMeal.totalMacros?.protein || 0,
                    carbs: filledMeal.totalMacros?.carbs || 0,
                    fat: filledMeal.totalMacros?.fat || 0,
                    source: filledMeal.source || 'manual',
                    mealData: filledMeal,
                  });
                  toast.success('Saved to favorites');
                }
              }}
            >
              <Heart className={cn(
                "h-3 w-3 mr-1",
                favoriteRecipes.some(f => f.name === filledMeal.name) && "fill-red-500"
              )} />
              {favoriteRecipes.some(f => f.name === filledMeal.name) ? 'Favorited' : 'Favorite'}
            </Button>
          )}
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
