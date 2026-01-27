'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  ChefHat
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MealSlot, Meal, Macros, DietPreferences } from '@/types';

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
  const [noteValue, setNoteValue] = useState(slot.meal?.staffNote || '');
  
  const hasMeal = slot.meal !== null;
  // Note: meal is accessed after early return when !hasMeal, so it's safe to assert non-null
  const meal = slot.meal as Meal | null;
  
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

  // Source badge
  const getSourceBadge = () => {
    if (!slot.meal?.source) return null;
    const config = {
      ai: { label: 'AI Generated', className: 'bg-purple-100 text-purple-700' },
      manual: { label: 'Custom', className: 'bg-blue-100 text-blue-700' },
      swapped: { label: 'Swapped', className: 'bg-orange-100 text-orange-700' },
    };
    const source = config[slot.meal.source];
    return <Badge className={cn('text-xs', source.className)}>{source.label}</Badge>;
  };
  
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
            {getSourceBadge()}
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
        
        {/* Macros Summary */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3 p-2 bg-muted/50 rounded-lg">
          <div>
            <p className={cn('font-bold', getMacroVarianceClass(filledMeal.totalMacros.calories, slot.targetMacros.calories))}>
              {Math.round(filledMeal.totalMacros.calories)}
            </p>
            <p className="text-muted-foreground">cal</p>
          </div>
          <div>
            <p className={cn('font-bold', getMacroVarianceClass(filledMeal.totalMacros.protein, slot.targetMacros.protein))}>
              {Math.round(filledMeal.totalMacros.protein)}g
            </p>
            <p className="text-muted-foreground">protein</p>
          </div>
          <div>
            <p className={cn('font-bold', getMacroVarianceClass(filledMeal.totalMacros.carbs, slot.targetMacros.carbs))}>
              {Math.round(filledMeal.totalMacros.carbs)}g
            </p>
            <p className="text-muted-foreground">carbs</p>
          </div>
          <div>
            <p className={cn('font-bold', getMacroVarianceClass(filledMeal.totalMacros.fat, slot.targetMacros.fat))}>
              {Math.round(filledMeal.totalMacros.fat)}g
            </p>
            <p className="text-muted-foreground">fat</p>
          </div>
        </div>
        
        {/* AI Rationale (if present) */}
        {filledMeal.aiRationale && (
          <div className="text-xs bg-green-50 border border-green-200 rounded p-2 mb-3">
            <p className="text-green-800 italic">💡 {filledMeal.aiRationale}</p>
          </div>
        )}
        
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
          {!filledMeal.aiRationale && (
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
          )}
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
