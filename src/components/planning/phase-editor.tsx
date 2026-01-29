'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { 
  Target, 
  TrendingDown, 
  TrendingUp, 
  Scale, 
  Calendar,
  LineChart,
  AlertCircle
} from 'lucide-react';
import type { Phase, GoalType, PerformancePriority, MusclePreservation, FatGainTolerance } from '@/types';

// Rate options
const FAT_LOSS_RATES = [
  { value: 0.25, label: 'Gradual', lbsPerWeek: '~0.5' },
  { value: 0.5, label: 'Moderate', lbsPerWeek: '~1' },
  { value: 0.75, label: 'Aggressive', lbsPerWeek: '~1.5' },
  { value: 1.0, label: 'Very Aggressive', lbsPerWeek: '~2' },
];

const MUSCLE_GAIN_RATES = [
  { value: 0.12, label: 'Gradual', lbsPerWeek: '~0.25' },
  { value: 0.25, label: 'Moderate', lbsPerWeek: '~0.5' },
  { value: 0.5, label: 'Aggressive', lbsPerWeek: '~1' },
];

interface PhaseEditorProps {
  phase?: Phase;
  currentWeight: number;
  currentBodyFat: number;
  onSave: (phaseData: Partial<Phase>) => void;
  onCancel: () => void;
}

export function PhaseEditor({
  phase,
  currentWeight,
  currentBodyFat,
  onSave,
  onCancel,
}: PhaseEditorProps) {
  // Basic info
  const [name, setName] = useState(phase?.name || '');
  const [goalType, setGoalType] = useState<GoalType>(phase?.goalType || 'lose_fat');
  const [startDate, setStartDate] = useState(phase?.startDate || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(phase?.notes || '');
  
  // Target body comp
  const [targetWeight, setTargetWeight] = useState(phase?.targetWeightLbs || currentWeight);
  const [targetBodyFat, setTargetBodyFat] = useState(phase?.targetBodyFat || currentBodyFat);
  
  // Rate of change
  const [rateOfChange, setRateOfChange] = useState(phase?.rateOfChange || 0.5);
  
  // Context preferences
  const [performancePriority, setPerformancePriority] = useState<PerformancePriority>(
    phase?.performancePriority || 'body_comp_priority'
  );
  const [musclePreservation, setMusclePreservation] = useState<MusclePreservation>(
    phase?.musclePreservation || 'preserve_all'
  );
  const [fatGainTolerance, setFatGainTolerance] = useState<FatGainTolerance>(
    phase?.fatGainTolerance || 'minimize_fat_gain'
  );
  
  // Rate options based on goal
  const rateOptions = goalType === 'lose_fat' ? FAT_LOSS_RATES : MUSCLE_GAIN_RATES;
  
  // Calculate timeline
  const timeline = useMemo(() => {
    const weightChange = Math.abs(targetWeight - currentWeight);
    const weeklyChangeLbs = (rateOfChange / 100) * currentWeight;
    const weeks = weeklyChangeLbs > 0 ? Math.ceil(weightChange / weeklyChangeLbs) : 12;
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + weeks * 7);
    
    return {
      weeks: Math.min(weeks, 52),
      endDate: endDate.toISOString().split('T')[0],
      weeklyChange: weeklyChangeLbs.toFixed(2),
    };
  }, [targetWeight, currentWeight, rateOfChange, startDate]);
  
  // Calculate fat mass and lean mass
  const currentFatMass = currentWeight * (currentBodyFat / 100);
  const currentLeanMass = currentWeight - currentFatMass;
  const targetFatMass = targetWeight * (targetBodyFat / 100);
  const targetLeanMass = targetWeight - targetFatMass;
  
  // Handle save
  const handleSave = () => {
    if (!name.trim()) {
      return;
    }
    
    onSave({
      name: name.trim(),
      goalType,
      startDate,
      endDate: timeline.endDate,
      targetWeightLbs: targetWeight,
      targetBodyFat,
      targetFatMassLbs: targetFatMass,
      targetFFMLbs: targetLeanMass,
      rateOfChange,
      performancePriority,
      musclePreservation,
      fatGainTolerance,
      notes,
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-[#c19962]" />
            Phase Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Phase Name</Label>
            <Input
              placeholder="e.g., Q1 Cut, Summer Bulk, Competition Prep"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <Select value={goalType} onValueChange={(v) => setGoalType(v as GoalType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose_fat">Fat Loss</SelectItem>
                  <SelectItem value="gain_muscle">Muscle Gain</SelectItem>
                  <SelectItem value="maintain">Maintenance</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Target Body Composition */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-[#c19962]" />
            Target Body Composition
          </CardTitle>
          <CardDescription>
            Current: {currentWeight} lbs at {currentBodyFat}% body fat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Weight (lbs)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[targetWeight]}
                  onValueChange={([v]) => setTargetWeight(v)}
                  min={Math.max(80, currentWeight - 60)}
                  max={currentWeight + 60}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target Body Fat (%)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[targetBodyFat]}
                  onValueChange={([v]) => setTargetBodyFat(v)}
                  min={5}
                  max={40}
                  step={0.5}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={targetBodyFat}
                  onChange={(e) => setTargetBodyFat(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>
          </div>
          
          {/* Composition Preview */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current Composition</p>
              <p className="text-sm">Fat: <span className="font-bold">{currentFatMass.toFixed(1)} lbs</span></p>
              <p className="text-sm">Lean: <span className="font-bold">{currentLeanMass.toFixed(1)} lbs</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Target Composition</p>
              <p className="text-sm">Fat: <span className="font-bold text-[#c19962]">{targetFatMass.toFixed(1)} lbs</span></p>
              <p className="text-sm">Lean: <span className="font-bold text-[#c19962]">{targetLeanMass.toFixed(1)} lbs</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Rate & Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LineChart className="h-4 w-4 text-[#c19962]" />
            Rate & Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Weekly Rate</Label>
            <div className="grid grid-cols-4 gap-2">
              {rateOptions.map((rate) => (
                <button
                  key={rate.value}
                  type="button"
                  onClick={() => setRateOfChange(rate.value)}
                  className={cn(
                    "p-3 rounded-lg border text-center transition-all text-sm",
                    rateOfChange === rate.value
                      ? "border-[#c19962] bg-[#c19962]/10 font-medium"
                      : "border-muted hover:border-muted-foreground/50"
                  )}
                >
                  <p className="font-semibold">{rate.label}</p>
                  <p className="text-xs text-muted-foreground">{rate.lbsPerWeek} lb/wk</p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Timeline Preview */}
          <div className="p-4 bg-gradient-to-r from-[#c19962]/10 to-transparent rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-2xl font-bold">{currentWeight}</p>
                <p className="text-xs text-muted-foreground">Start</p>
              </div>
              <div className="flex-1 mx-4 text-center">
                <Badge variant="outline" className="border-[#c19962] text-[#c19962]">
                  {timeline.weeks} weeks
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{timeline.weeklyChange} lbs/week
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#c19962]">{targetWeight}</p>
                <p className="text-xs text-muted-foreground">Target</p>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Estimated end date: {new Date(timeline.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Phase Context */}
      {(goalType === 'lose_fat' || goalType === 'gain_muscle') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Phase Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalType === 'lose_fat' && (
              <div className="space-y-2">
                <Label className="text-sm">Muscle Preservation</Label>
                <RadioGroup
                  value={musclePreservation}
                  onValueChange={(v) => setMusclePreservation(v as MusclePreservation)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="preserve_all" id="preserve" />
                    <Label htmlFor="preserve" className="text-sm cursor-pointer">Maximize retention</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="accept_some_loss" id="accept" />
                    <Label htmlFor="accept" className="text-sm cursor-pointer">Speed priority</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
            
            {goalType === 'gain_muscle' && (
              <div className="space-y-2">
                <Label className="text-sm">Fat Gain Tolerance</Label>
                <RadioGroup
                  value={fatGainTolerance}
                  onValueChange={(v) => setFatGainTolerance(v as FatGainTolerance)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="minimize_fat_gain" id="lean" />
                    <Label htmlFor="lean" className="text-sm cursor-pointer">Lean bulk</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="maximize_muscle" id="max" />
                    <Label htmlFor="max" className="text-sm cursor-pointer">Max gains</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any specific notes for this phase..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>
      
      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!name.trim()}
          className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
        >
          {phase ? 'Update Phase' : 'Create Phase'}
        </Button>
      </div>
    </div>
  );
}
