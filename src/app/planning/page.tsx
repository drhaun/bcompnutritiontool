'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProgressSteps } from '@/components/layout/progress-steps';
// ProgressSummary now integrated into collapsible stats bar
import { useFitomicsStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowRight, 
  ArrowLeft, 
  Plus,
  Calendar,
  Target,
  TrendingDown,
  TrendingUp,
  Scale,
  Edit,
  Trash2,
  Copy,
  Play,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  CalendarDays,
  Zap,
  AlertCircle,
  Info,
  Heart,
  Flag,
  X as XIcon,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';
import type { Phase, GoalType, PerformancePriority, MusclePreservation, FatGainTolerance, LifestyleCommitment, TrackingCommitment, TimelineEvent, TimelineEventType, DayNutritionTargets } from '@/types';
import { PhaseCalendar } from '@/components/planning/phase-calendar';
import { PhaseTargetsEditor } from '@/components/planning/phase-targets-editor';

// ============ CONSTANTS ============

const GOAL_COLORS: Record<GoalType, { bg: string; text: string; border: string }> = {
  fat_loss: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  muscle_gain: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  recomposition: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  performance: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  health: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
  other: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
};

const GOAL_LABELS: Record<GoalType, string> = {
  fat_loss: 'Fat Loss',
  muscle_gain: 'Muscle Gain',
  recomposition: 'Recomposition',
  performance: 'Performance',
  health: 'Health Focus',
  other: 'Custom',
};

const GOAL_ICONS: Record<GoalType, React.ReactNode> = {
  fat_loss: <TrendingDown className="h-4 w-4" />,
  muscle_gain: <TrendingUp className="h-4 w-4" />,
  recomposition: <Scale className="h-4 w-4" />,
  performance: <Zap className="h-4 w-4" />,
  health: <Heart className="h-4 w-4" />,
  other: <Target className="h-4 w-4" />,
};

const EVENT_TYPES = [
  { value: 'lab_test', label: 'Lab Test / Assessment', icon: '🔬' },
  { value: 'competition', label: 'Competition / Event', icon: '🏆' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'vacation', label: 'Vacation / Break', icon: '🏖️' },
  { value: 'milestone', label: 'Milestone / Goal', icon: '🎯' },
  { value: 'other', label: 'Other', icon: '📌' },
];

// ============ COMPONENT ============

export default function PlanningPage() {
  const router = useRouter();
  const { 
    userProfile,
    setUserProfile,
    weeklySchedule,
    phases,
    activePhaseId,
    createPhase,
    updatePhase,
    deletePhase,
    setActivePhase,
    duplicatePhase,
    getActiveClient,
    timelineEvents,
    addTimelineEvent,
    deleteTimelineEvent,
    getActivePhase
  } = useFitomicsStore();
  
  // Handle hydration
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const activeClient = isHydrated ? getActiveClient() : null;
  
  // UI State - Default to calendar view to help visualize phase planning
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('calendar');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPlanningStats, setShowPlanningStats] = useState(false);
  
  // Get active phase for targets editor
  const activePhase = useMemo(() => {
    if (!isHydrated) return null;
    return getActivePhase();
  }, [isHydrated, getActivePhase, phases, activePhaseId]);
  
  // Phase creation wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [newPhaseGoal, setNewPhaseGoal] = useState<GoalType>('fat_loss');
  const [newPhaseName, setNewPhaseName] = useState('');
  const [customGoalName, setCustomGoalName] = useState('');
  const [newPhaseStart, setNewPhaseStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [newPhaseEnd, setNewPhaseEnd] = useState('');
  
  // Timeline events dialog state (events stored in zustand)
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventType, setNewEventType] = useState<TimelineEventType>('milestone');
  const [newEventNotes, setNewEventNotes] = useState('');
  
  // Body composition targets for phase
  const [targetWeightLbs, setTargetWeightLbs] = useState(0);
  const [targetBodyFat, setTargetBodyFat] = useState(0);
  const [targetFatMassLbs, setTargetFatMassLbs] = useState(0);
  const [targetFFMLbs, setTargetFFMLbs] = useState(0);
  const [rateOfChange, setRateOfChange] = useState(0.5); // % body weight per week
  
  // Editable current stats (for use in wizard, can optionally save back to profile)
  const [editCurrentWeight, setEditCurrentWeight] = useState(0);
  const [editCurrentBodyFat, setEditCurrentBodyFat] = useState(0);
  const [editCurrentHeightFt, setEditCurrentHeightFt] = useState(5);
  const [editCurrentHeightIn, setEditCurrentHeightIn] = useState(10);
  const [saveCurrentToProfile, setSaveCurrentToProfile] = useState(false);
  
  // Target input mode: 'bf' (body fat %), 'fm' (fat mass), 'ffm' (lean mass), 'weight', 'fmi', 'ffmi'
  const [targetMode, setTargetMode] = useState<'bf' | 'fm' | 'ffm' | 'weight' | 'fmi' | 'ffmi'>('bf');
  
  // Custom metrics for performance/health goals
  interface CustomMetric {
    id: string;
    name: string;
    startValue: string;
    targetValue: string;
    unit: string;
  }
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricStart, setNewMetricStart] = useState('');
  const [newMetricTarget, setNewMetricTarget] = useState('');
  const [newMetricUnit, setNewMetricUnit] = useState('');
  
  // Phase context preferences
  const [performancePriority, setPerformancePriority] = useState<PerformancePriority>('body_comp_priority');
  const [musclePreservation, setMusclePreservation] = useState<MusclePreservation>('preserve_all');
  const [fatGainTolerance, setFatGainTolerance] = useState<FatGainTolerance>('minimize_fat_gain');
  const [lifestyleCommitment, setLifestyleCommitment] = useState<LifestyleCommitment>('fully_committed');
  const [trackingCommitment, setTrackingCommitment] = useState<TrackingCommitment>('committed_tracking');
  
  // Base profile values
  const profileWeightLbs = userProfile.weightLbs || 180;
  const profileBodyFat = userProfile.bodyFatPercentage || 20;
  const profileHeightFt = userProfile.heightFt || 5;
  const profileHeightIn = userProfile.heightIn || 10;
  
  // Use editable values when dialog is open, otherwise use profile values
  const currentWeightLbs = showCreateDialog ? editCurrentWeight : profileWeightLbs;
  const currentBodyFat = showCreateDialog ? editCurrentBodyFat : profileBodyFat;
  const currentFatMassLbs = currentWeightLbs * (currentBodyFat / 100);
  const currentFFMLbs = currentWeightLbs - currentFatMassLbs;
  const heightInches = showCreateDialog 
    ? editCurrentHeightFt * 12 + editCurrentHeightIn 
    : profileHeightFt * 12 + profileHeightIn;
  const heightMeters = heightInches * 0.0254;
  
  // Calculate current metrics
  const currentFFMI = heightMeters > 0 ? (currentFFMLbs * 0.453592) / (heightMeters * heightMeters) : 0;
  const currentFMI = heightMeters > 0 ? (currentFatMassLbs * 0.453592) / (heightMeters * heightMeters) : 0;
  
  // Initialize editable current stats when dialog opens
  useEffect(() => {
    if (showCreateDialog) {
      setEditCurrentWeight(profileWeightLbs);
      setEditCurrentBodyFat(profileBodyFat);
      setEditCurrentHeightFt(profileHeightFt);
      setEditCurrentHeightIn(profileHeightIn);
      setSaveCurrentToProfile(false);
      setCustomMetrics([]);
    }
  }, [showCreateDialog, profileWeightLbs, profileBodyFat, profileHeightFt, profileHeightIn]);
  
  // Initialize targets when goal changes or current stats change
  useEffect(() => {
    if (showCreateDialog) {
      const weight = editCurrentWeight || 180;
      const bf = editCurrentBodyFat || 20;
      const fm = weight * (bf / 100);
      const ffm = weight - fm;
      
      // Set reasonable defaults based on goal
      if (newPhaseGoal === 'fat_loss') {
        const targetBF = Math.max(8, bf - 5); // Lose ~5% BF
        const targetFM = ffm * (targetBF / (100 - targetBF));
        setTargetBodyFat(targetBF);
        setTargetFatMassLbs(Math.round(targetFM * 10) / 10);
        setTargetFFMLbs(ffm); // Preserve muscle
        setTargetWeightLbs(Math.round((ffm + targetFM) * 10) / 10);
        setRateOfChange(0.5); // 0.5% BW/week for fat loss
        setMusclePreservation('preserve_all');
      } else if (newPhaseGoal === 'muscle_gain') {
        const targetFFM = ffm + 5; // Gain ~5 lbs muscle
        const targetFM = fm + 2; // Accept ~2 lbs fat
        setTargetFFMLbs(Math.round(targetFFM * 10) / 10);
        setTargetFatMassLbs(Math.round(targetFM * 10) / 10);
        setTargetWeightLbs(Math.round((targetFFM + targetFM) * 10) / 10);
        setTargetBodyFat(Math.round((targetFM / (targetFFM + targetFM)) * 1000) / 10);
        setRateOfChange(0.25); // 0.25% BW/week for muscle gain
        setFatGainTolerance('minimize_fat_gain');
      } else if (newPhaseGoal === 'recomposition') {
        // Recomp: maintain weight, shift composition
        setTargetWeightLbs(weight);
        setTargetBodyFat(Math.max(8, bf - 3)); // Modest BF reduction
        const targetFM = weight * ((bf - 3) / 100);
        setTargetFatMassLbs(Math.round(targetFM * 10) / 10);
        setTargetFFMLbs(Math.round((weight - targetFM) * 10) / 10);
        setRateOfChange(0.25); // Slower, focusing on composition shift
      } else {
        // Performance, Health, Other
        setTargetWeightLbs(weight);
        setTargetBodyFat(bf);
        setTargetFatMassLbs(fm);
        setTargetFFMLbs(ffm);
        setRateOfChange(0);
      }
    }
  }, [showCreateDialog, newPhaseGoal, editCurrentWeight, editCurrentBodyFat]);
  
  // Add custom metric
  const handleAddCustomMetric = () => {
    if (!newMetricName.trim()) {
      toast.error('Please enter a metric name');
      return;
    }
    setCustomMetrics([...customMetrics, {
      id: `metric-${Date.now()}`,
      name: newMetricName.trim(),
      startValue: newMetricStart,
      targetValue: newMetricTarget,
      unit: newMetricUnit
    }]);
    setNewMetricName('');
    setNewMetricStart('');
    setNewMetricTarget('');
    setNewMetricUnit('');
  };
  
  // Remove custom metric
  const handleRemoveCustomMetric = (id: string) => {
    setCustomMetrics(customMetrics.filter(m => m.id !== id));
  };
  
  // Calculate target metrics from different input modes
  const updateTargetsFromBF = (bf: number) => {
    setTargetBodyFat(bf);
    const newFM = currentFFMLbs * (bf / (100 - bf));
    setTargetFatMassLbs(Math.round(newFM * 10) / 10);
    setTargetWeightLbs(Math.round((currentFFMLbs + newFM) * 10) / 10);
  };
  
  const updateTargetsFromFM = (fm: number) => {
    setTargetFatMassLbs(fm);
    const newWeight = targetFFMLbs + fm;
    setTargetWeightLbs(Math.round(newWeight * 10) / 10);
    setTargetBodyFat(Math.round((fm / newWeight) * 1000) / 10);
  };
  
  const updateTargetsFromFFM = (ffm: number) => {
    setTargetFFMLbs(ffm);
    const newWeight = ffm + targetFatMassLbs;
    setTargetWeightLbs(Math.round(newWeight * 10) / 10);
    setTargetBodyFat(Math.round((targetFatMassLbs / newWeight) * 1000) / 10);
  };
  
  const updateTargetsFromWeight = (weight: number) => {
    setTargetWeightLbs(weight);
    // Keep same BF%, recalculate FM and FFM
    const newFM = weight * (targetBodyFat / 100);
    const newFFM = weight - newFM;
    setTargetFatMassLbs(Math.round(newFM * 10) / 10);
    setTargetFFMLbs(Math.round(newFFM * 10) / 10);
  };
  
  const updateTargetsFromFFMI = (ffmi: number) => {
    // FFMI = FFM(kg) / height(m)^2 -> FFM = FFMI * height^2 (in kg)
    const newFFMKg = ffmi * (heightMeters * heightMeters);
    const newFFMLbs = newFFMKg / 0.453592;
    setTargetFFMLbs(Math.round(newFFMLbs * 10) / 10);
    const newWeight = newFFMLbs + targetFatMassLbs;
    setTargetWeightLbs(Math.round(newWeight * 10) / 10);
    setTargetBodyFat(Math.round((targetFatMassLbs / newWeight) * 1000) / 10);
  };
  
  const updateTargetsFromFMI = (fmi: number) => {
    // FMI = FM(kg) / height(m)^2 -> FM = FMI * height^2 (in kg)
    const newFMKg = fmi * (heightMeters * heightMeters);
    const newFMLbs = newFMKg / 0.453592;
    setTargetFatMassLbs(Math.round(newFMLbs * 10) / 10);
    const newWeight = targetFFMLbs + newFMLbs;
    setTargetWeightLbs(Math.round(newWeight * 10) / 10);
    setTargetBodyFat(Math.round((newFMLbs / newWeight) * 1000) / 10);
  };
  
  // Calculate target indices
  const targetFFMI = heightMeters > 0 ? (targetFFMLbs * 0.453592) / (heightMeters * heightMeters) : 0;
  const targetFMI = heightMeters > 0 ? (targetFatMassLbs * 0.453592) / (heightMeters * heightMeters) : 0;
  
  // Calculate timeline based on targets and rate
  const calculatedTimeline = useMemo(() => {
    const weightChange = Math.abs(targetWeightLbs - currentWeightLbs);
    const weeklyChangeLbs = (rateOfChange / 100) * currentWeightLbs;
    
    if (weeklyChangeLbs === 0 || ['performance', 'health', 'other'].includes(newPhaseGoal)) {
      return { weeks: 12, endDate: '' }; // Default 12 weeks for non-body-comp focused phases
    }
    
    const weeks = Math.ceil(weightChange / weeklyChangeLbs);
    const endDate = new Date(newPhaseStart);
    endDate.setDate(endDate.getDate() + weeks * 7);
    
    return {
      weeks: Math.max(4, Math.min(52, weeks)), // Clamp to 4-52 weeks
      endDate: endDate.toISOString().split('T')[0],
      weeklyChangeLbs: Math.round(weeklyChangeLbs * 100) / 100,
      totalChange: Math.round(weightChange * 10) / 10,
    };
  }, [targetWeightLbs, currentWeightLbs, rateOfChange, newPhaseStart, newPhaseGoal]);
  
  // Update end date when timeline is calculated
  useEffect(() => {
    if (calculatedTimeline.endDate) {
      setNewPhaseEnd(calculatedTimeline.endDate);
    }
  }, [calculatedTimeline.endDate]);
  
  // Generate suggested phase name
  const suggestedPhaseName = useMemo(() => {
    if (newPhaseGoal === 'other' && customGoalName) {
      return customGoalName;
    }
    const goalNames: Record<GoalType, string> = {
      fat_loss: 'Cut',
      muscle_gain: 'Bulk',
      recomposition: 'Recomp',
      performance: 'Performance',
      health: 'Health Focus',
      other: 'Custom Phase',
    };
    const startDate = new Date(newPhaseStart);
    const quarter = Math.ceil((startDate.getMonth() + 1) / 3);
    const year = startDate.getFullYear();
    return `Q${quarter} ${year} ${goalNames[newPhaseGoal]}`;
  }, [newPhaseGoal, newPhaseStart, customGoalName]);
  
  // Add timeline event
  const handleAddEvent = () => {
    if (!newEventName.trim() || !newEventDate) {
      toast.error('Please enter event name and date');
      return;
    }
    
    addTimelineEvent({
      name: newEventName.trim(),
      date: newEventDate,
      type: newEventType,
      notes: newEventNotes,
    });
    
    setShowEventDialog(false);
    setNewEventName('');
    setNewEventDate('');
    setNewEventNotes('');
    toast.success('Event added to timeline');
  };
  
  // Delete timeline event
  const handleDeleteEvent = (eventId: string) => {
    deleteTimelineEvent(eventId);
    toast.success('Event removed');
  };
  
  // Reset wizard when dialog closes
  const handleDialogClose = (open: boolean) => {
    setShowCreateDialog(open);
    if (!open) {
      setWizardStep(1);
      setNewPhaseName('');
      setNewPhaseGoal('fat_loss');
      setCustomGoalName('');
      setTargetMode('bf');
      setCustomMetrics([]);
      setSaveCurrentToProfile(false);
    }
  };
  
  // Sort phases by start date
  const sortedPhases = useMemo(() => {
    return [...phases].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [phases]);
  
  // Get phase duration in weeks
  const getPhaseDuration = (phase: Phase) => {
    const start = new Date(phase.startDate);
    const end = new Date(phase.endDate);
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  };
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Handle create phase
  const handleCreatePhase = () => {
    // Optionally save current stats back to profile
    if (saveCurrentToProfile) {
      setUserProfile({
        weightLbs: editCurrentWeight,
        bodyFatPercentage: editCurrentBodyFat,
        heightFt: editCurrentHeightFt,
        heightIn: editCurrentHeightIn,
      });
      toast.success('Profile updated with current stats');
    }
    
    const phaseName = newPhaseName.trim() || suggestedPhaseName;
    
    const phaseId = createPhase({
      name: phaseName,
      goalType: newPhaseGoal,
      customGoalName: (newPhaseGoal === 'other' || newPhaseGoal === 'health') ? customGoalName : undefined,
      startDate: newPhaseStart,
      endDate: newPhaseEnd,
      status: 'planned',
      targetWeightLbs,
      targetBodyFat,
      targetFatMassLbs,
      targetFFMLbs,
      rateOfChange,
      performancePriority,
      musclePreservation,
      fatGainTolerance,
      lifestyleCommitment,
      trackingCommitment,
      // Store starting body comp for reference
      startingWeightLbs: editCurrentWeight,
      startingBodyFat: editCurrentBodyFat,
      // Store custom metrics
      customMetrics: customMetrics.length > 0 ? customMetrics : undefined,
    });
    
    toast.success(`Phase "${phaseName}" created!`);
    handleDialogClose(false);
    
    // Auto-select if it's the first phase
    if (phases.length === 0) {
      setActivePhase(phaseId);
    }
  };
  
  // Handle delete phase
  const handleDeletePhase = (phaseId: string, phaseName: string) => {
    if (confirm(`Are you sure you want to delete "${phaseName}"?`)) {
      deletePhase(phaseId);
      toast.success('Phase deleted');
    }
  };
  
  // Handle duplicate phase
  const handleDuplicatePhase = (phaseId: string, phaseName: string) => {
    duplicatePhase(phaseId, `${phaseName} (Copy)`);
    toast.success('Phase duplicated');
  };
  
  // Handle activate phase
  const handleActivatePhase = (phaseId: string) => {
    // Mark current active as completed if exists
    if (activePhaseId) {
      updatePhase(activePhaseId, { status: 'completed' });
    }
    
    // Activate new phase
    setActivePhase(phaseId);
    updatePhase(phaseId, { status: 'active' });
    toast.success('Phase activated!');
  };
  
  // Handle proceed to meal plan
  const handleProceedToMealPlan = (phaseId: string) => {
    setActivePhase(phaseId);
    router.push('/meal-plan');
  };
  
  // Handle saving nutrition targets to phase
  const handleSavePhaseTargets = (phaseId: string, targets: DayNutritionTargets[]) => {
    updatePhase(phaseId, { 
      nutritionTargets: targets,
      updatedAt: new Date().toISOString()
    });
    toast.success('Nutrition targets saved to phase');
  };
  
  // Handle opening edit dialog for a phase
  const handleOpenEditDialog = (phase: Phase) => {
    setEditingPhase(phase);
    setShowEditDialog(true);
    
    // Populate wizard with phase data
    setWizardStep(1);
    setNewPhaseGoal(phase.goalType);
    setCustomGoalName(phase.customGoalName || '');
    setNewPhaseName(phase.name);
    setNewPhaseStart(phase.startDate);
    setNewPhaseEnd(phase.endDate);
    setTargetWeightLbs(phase.targetWeightLbs);
    setTargetBodyFat(phase.targetBodyFat);
    setTargetFatMassLbs(phase.targetFatMassLbs);
    setTargetFFMLbs(phase.targetFFMLbs);
    setRateOfChange(phase.rateOfChange);
    setPerformancePriority(phase.performancePriority);
    setMusclePreservation(phase.musclePreservation);
    setFatGainTolerance(phase.fatGainTolerance);
    setLifestyleCommitment(phase.lifestyleCommitment);
    setTrackingCommitment(phase.trackingCommitment);
    
    // Set current stats from phase starting values if available
    if (phase.startingWeightLbs) setEditCurrentWeight(phase.startingWeightLbs);
    if (phase.startingBodyFat) setEditCurrentBodyFat(phase.startingBodyFat);
    
    // Set custom metrics
    setCustomMetrics(phase.customMetrics || []);
  };
  
  // Handle save edited phase
  const handleSaveEditedPhase = () => {
    if (!editingPhase) return;
    
    updatePhase(editingPhase.id, {
      name: newPhaseName || `${GOAL_LABELS[newPhaseGoal]} Phase`,
      customGoalName: customGoalName || undefined,
      goalType: newPhaseGoal,
      startDate: newPhaseStart,
      endDate: newPhaseEnd,
      targetWeightLbs,
      targetBodyFat,
      targetFatMassLbs,
      targetFFMLbs,
      rateOfChange,
      performancePriority,
      musclePreservation,
      fatGainTolerance,
      lifestyleCommitment,
      trackingCommitment,
      customMetrics: customMetrics.length > 0 ? customMetrics : undefined,
      updatedAt: new Date().toISOString(),
    });
    
    setShowEditDialog(false);
    setEditingPhase(null);
    toast.success('Phase updated successfully');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">
          <ProgressSteps currentStep={2} />
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Planning</h1>
                <p className="text-muted-foreground">
                  {isHydrated && activeClient 
                    ? `Plan training phases for ${activeClient.name}` 
                    : 'Create and manage training phases'}
                </p>
              </div>
              
              <div className="flex gap-2">
                {/* Add Timeline Event Button */}
                <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Flag className="mr-2 h-4 w-4" />
                      Add Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Timeline Event</DialogTitle>
                      <DialogDescription>
                        Add important dates like lab tests, competitions, travel, or milestones to your planning timeline.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Event Name</Label>
                        <Input
                          placeholder="e.g., RMR Test, Marathon, Family Vacation"
                          value={newEventName}
                          onChange={(e) => setNewEventName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={newEventDate}
                            onChange={(e) => setNewEventDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Event Type</Label>
                          <Select value={newEventType} onValueChange={(v) => setNewEventType(v as TimelineEventType)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EVENT_TYPES.map(et => (
                                <SelectItem key={et.value} value={et.value}>
                                  <span className="flex items-center gap-2">
                                    <span>{et.icon}</span>
                                    {et.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes (optional)</Label>
                        <Input
                          placeholder="Additional details..."
                          value={newEventNotes}
                          onChange={(e) => setNewEventNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddEvent} className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]">
                        Add Event
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                {/* Create Phase Button */}
                <Dialog open={showCreateDialog} onOpenChange={handleDialogClose}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Phase
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Phase</DialogTitle>
                    <DialogDescription>
                      Step {wizardStep} of 4: {
                        wizardStep === 1 ? 'Select your goal' :
                        wizardStep === 2 ? 'Set body composition targets' :
                        wizardStep === 3 ? 'Configure timeline' :
                        'Review and name your phase'
                      }
                    </DialogDescription>
                    {/* Progress indicator */}
                    <div className="flex gap-1 pt-2">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={cn(
                            "h-1.5 flex-1 rounded-full transition-all",
                            step <= wizardStep ? "bg-[#c19962]" : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                  </DialogHeader>
                  
                  {/* Step 1: Goal Selection */}
                  {wizardStep === 1 && (
                    <div className="space-y-4 py-4">
                      <Label className="text-base font-semibold">What is the primary emphasis for this phase?</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setNewPhaseGoal('fat_loss')}
                          className={cn(
                            "p-3 border rounded-xl text-left transition-all hover:border-[#c19962]",
                            newPhaseGoal === 'fat_loss' && "border-[#c19962] bg-[#c19962]/10 ring-2 ring-[#c19962]/20"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-lg bg-orange-100">
                              <TrendingDown className="h-4 w-4 text-orange-600" />
                            </div>
                            <span className="font-semibold text-sm">Fat Loss</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Reduce body fat while preserving muscle. Caloric deficit with high protein.
                          </p>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setNewPhaseGoal('muscle_gain')}
                          className={cn(
                            "p-3 border rounded-xl text-left transition-all hover:border-[#c19962]",
                            newPhaseGoal === 'muscle_gain' && "border-[#c19962] bg-[#c19962]/10 ring-2 ring-[#c19962]/20"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-lg bg-blue-100">
                              <TrendingUp className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-semibold text-sm">Muscle Gain</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Build lean mass with controlled surplus. Optimize training and recovery.
                          </p>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setNewPhaseGoal('recomposition')}
                          className={cn(
                            "p-3 border rounded-xl text-left transition-all hover:border-[#c19962]",
                            newPhaseGoal === 'recomposition' && "border-[#c19962] bg-[#c19962]/10 ring-2 ring-[#c19962]/20"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-lg bg-purple-100">
                              <Scale className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="font-semibold text-sm">Recomposition</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Lose fat and build muscle simultaneously. Maintain weight, shift composition.
                          </p>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setNewPhaseGoal('performance')}
                          className={cn(
                            "p-3 border rounded-xl text-left transition-all hover:border-[#c19962]",
                            newPhaseGoal === 'performance' && "border-[#c19962] bg-[#c19962]/10 ring-2 ring-[#c19962]/20"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-lg bg-green-100">
                              <Zap className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="font-semibold text-sm">Performance</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Optimize for athletic performance. Sports nutrition approach.
                          </p>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setNewPhaseGoal('health')}
                          className={cn(
                            "p-3 border rounded-xl text-left transition-all hover:border-[#c19962]",
                            newPhaseGoal === 'health' && "border-[#c19962] bg-[#c19962]/10 ring-2 ring-[#c19962]/20"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-lg bg-pink-100">
                              <Heart className="h-4 w-4 text-pink-600" />
                            </div>
                            <span className="font-semibold text-sm">Health Focus</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Address specific health markers or conditions. Therapeutic approach.
                          </p>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setNewPhaseGoal('other')}
                          className={cn(
                            "p-3 border rounded-xl text-left transition-all hover:border-[#c19962]",
                            newPhaseGoal === 'other' && "border-[#c19962] bg-[#c19962]/10 ring-2 ring-[#c19962]/20"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-lg bg-gray-100">
                              <Target className="h-4 w-4 text-gray-600" />
                            </div>
                            <span className="font-semibold text-sm">Other</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Custom goal type. Define your own emphasis and approach.
                          </p>
                        </button>
                      </div>
                      
                      {/* Custom goal name for health or other */}
                      {(newPhaseGoal === 'health' || newPhaseGoal === 'other') && (
                        <div className="space-y-2 pt-2">
                          <Label className="text-sm">
                            {newPhaseGoal === 'health' ? 'Health Focus Area' : 'Custom Goal Name'}
                          </Label>
                          <Input
                            placeholder={newPhaseGoal === 'health' ? 'e.g., Blood sugar management, Gut health, Inflammation reduction' : 'e.g., Competition prep, Travel phase, Recovery'}
                            value={customGoalName}
                            onChange={(e) => setCustomGoalName(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Step 2: Body Composition Targets */}
                  {wizardStep === 2 && (
                    <div className="space-y-6 py-4">
                      {/* Current Stats - Editable */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Scale className="h-4 w-4" />
                            Current Body Composition
                          </Label>
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              id="save-to-profile" 
                              checked={saveCurrentToProfile}
                              onCheckedChange={(checked) => setSaveCurrentToProfile(checked === true)}
                            />
                            <Label htmlFor="save-to-profile" className="text-xs text-muted-foreground cursor-pointer">
                              Update profile
                            </Label>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Weight (lbs)</Label>
                            <Input
                              type="number"
                              value={editCurrentWeight}
                              onChange={(e) => setEditCurrentWeight(Number(e.target.value))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Body Fat %</Label>
                            <Input
                              type="number"
                              value={editCurrentBodyFat}
                              onChange={(e) => setEditCurrentBodyFat(Number(e.target.value))}
                              className="h-8 text-sm"
                              step="0.1"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Height (ft)</Label>
                            <Input
                              type="number"
                              value={editCurrentHeightFt}
                              onChange={(e) => setEditCurrentHeightFt(Number(e.target.value))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Height (in)</Label>
                            <Input
                              type="number"
                              value={editCurrentHeightIn}
                              onChange={(e) => setEditCurrentHeightIn(Number(e.target.value))}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        
                        {/* Calculated Current Metrics */}
                        <div className="grid grid-cols-5 gap-2 p-2 bg-muted/30 rounded-lg text-xs">
                          <div className="text-center">
                            <div className="text-muted-foreground">Fat Mass</div>
                            <div className="font-medium">{currentFatMassLbs.toFixed(1)} lbs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">Lean Mass</div>
                            <div className="font-medium">{currentFFMLbs.toFixed(1)} lbs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">FMI</div>
                            <div className="font-medium">{currentFMI.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">FFMI</div>
                            <div className="font-medium">{currentFFMI.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">Height</div>
                            <div className="font-medium">{editCurrentHeightFt}&apos;{editCurrentHeightIn}&quot;</div>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Phase Commitment & Approach - BEFORE targets */}
                      <TooltipProvider delayDuration={100}>
                        <div className="space-y-4">
                          <Label className="text-sm font-semibold">Phase Approach</Label>
                          <p className="text-xs text-muted-foreground -mt-2">
                            Set commitment levels first — these influence how aggressive targets should be.
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Lifestyle Commitment */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Lifestyle Commitment</Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="text-muted-foreground hover:text-foreground">
                                      <HelpCircle className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs">
                                    <p className="font-semibold mb-1">How much can this client dedicate to their nutrition goals?</p>
                                    <ul className="space-y-1">
                                      <li><strong>High:</strong> Can meal prep, prioritize sleep, manage stress, and structure life around goals. Supports aggressive targets.</li>
                                      <li><strong>Moderate:</strong> Some flexibility but has work/family demands. Moderate deficit/surplus recommended.</li>
                                      <li><strong>Limited:</strong> Busy schedule, frequent travel, social obligations. Conservative approach for sustainability.</li>
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setLifestyleCommitment('fully_committed')}
                                  className={cn(
                                    "flex-1 py-2 px-2 rounded-lg border text-center transition-all text-xs",
                                    lifestyleCommitment === 'fully_committed'
                                      ? "border-[#c19962] bg-[#c19962]/10 font-medium"
                                      : "border-muted hover:border-muted-foreground/50"
                                  )}
                                >
                                  High
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLifestyleCommitment('moderately_committed')}
                                  className={cn(
                                    "flex-1 py-2 px-2 rounded-lg border text-center transition-all text-xs",
                                    lifestyleCommitment === 'moderately_committed'
                                      ? "border-[#c19962] bg-[#c19962]/10 font-medium"
                                      : "border-muted hover:border-muted-foreground/50"
                                  )}
                                >
                                  Moderate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLifestyleCommitment('limited_commitment')}
                                  className={cn(
                                    "flex-1 py-2 px-2 rounded-lg border text-center transition-all text-xs",
                                    lifestyleCommitment === 'limited_commitment'
                                      ? "border-[#c19962] bg-[#c19962]/10 font-medium"
                                      : "border-muted hover:border-muted-foreground/50"
                                  )}
                                >
                                  Limited
                                </button>
                              </div>
                            </div>
                            
                            {/* Tracking Commitment */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tracking Style</Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="text-muted-foreground hover:text-foreground">
                                      <HelpCircle className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs">
                                    <p className="font-semibold mb-1">How will this client track their nutrition?</p>
                                    <ul className="space-y-1">
                                      <li><strong>Detailed:</strong> Weighs/logs all food, tracks macros precisely. Enables tighter calorie targets and faster adjustments.</li>
                                      <li><strong>Intuitive:</strong> Follows portion guidelines, hand-sized servings, habit-based approach. Wider calorie ranges, focus on food quality over precision.</li>
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setTrackingCommitment('committed_tracking')}
                                  className={cn(
                                    "flex-1 py-2 px-2 rounded-lg border text-center transition-all text-xs",
                                    trackingCommitment === 'committed_tracking'
                                      ? "border-[#c19962] bg-[#c19962]/10 font-medium"
                                      : "border-muted hover:border-muted-foreground/50"
                                  )}
                                >
                                  Detailed
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTrackingCommitment('casual_tracking')}
                                  className={cn(
                                    "flex-1 py-2 px-2 rounded-lg border text-center transition-all text-xs",
                                    trackingCommitment === 'casual_tracking'
                                      ? "border-[#c19962] bg-[#c19962]/10 font-medium"
                                      : "border-muted hover:border-muted-foreground/50"
                                  )}
                                >
                                  Intuitive
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Goal-Specific Preferences - Before setting targets */}
                          {newPhaseGoal === 'fat_loss' && (
                            <div className="space-y-2 pt-2">
                              <div className="flex items-center gap-1">
                                <Label className="text-sm">Muscle Preservation Priority</Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="text-muted-foreground hover:text-foreground">
                                      <HelpCircle className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs">
                                    <p className="font-semibold mb-1">How important is maintaining muscle during fat loss?</p>
                                    <p>Research shows faster weight loss (&gt;1% BW/week) increases muscle loss risk. Higher protein (1g/lb) and resistance training help preserve lean mass.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <RadioGroup
                                value={musclePreservation}
                                onValueChange={(v) => setMusclePreservation(v as MusclePreservation)}
                                className="grid grid-cols-2 gap-2"
                              >
                                <div className={cn(
                                  "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer",
                                  musclePreservation === 'preserve_all' && "border-[#c19962] bg-[#c19962]/5"
                                )}>
                                  <RadioGroupItem value="preserve_all" id="preserve_all_top" />
                                  <Label htmlFor="preserve_all_top" className="cursor-pointer text-xs">
                                    <span className="font-medium">Preserve All</span>
                                    <p className="text-muted-foreground">Slower deficit, max muscle retention</p>
                                  </Label>
                                </div>
                                <div className={cn(
                                  "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer",
                                  musclePreservation === 'accept_some_loss' && "border-[#c19962] bg-[#c19962]/5"
                                )}>
                                  <RadioGroupItem value="accept_some_loss" id="accept_some_loss_top" />
                                  <Label htmlFor="accept_some_loss_top" className="cursor-pointer text-xs">
                                    <span className="font-medium">Accept Some Loss</span>
                                    <p className="text-muted-foreground">Faster progress, minor loss OK</p>
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>
                          )}
                          
                          {newPhaseGoal === 'muscle_gain' && (
                            <div className="space-y-2 pt-2">
                              <div className="flex items-center gap-1">
                                <Label className="text-sm">Fat Gain Tolerance</Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="text-muted-foreground hover:text-foreground">
                                      <HelpCircle className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs">
                                    <p className="font-semibold mb-1">How much fat gain is acceptable while building muscle?</p>
                                    <p>Larger surpluses build muscle faster but add more fat. A 200-300 kcal surplus typically yields 0.5-1 lb muscle/month for intermediates with minimal fat gain.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <RadioGroup
                                value={fatGainTolerance}
                                onValueChange={(v) => setFatGainTolerance(v as FatGainTolerance)}
                                className="grid grid-cols-2 gap-2"
                              >
                                <div className={cn(
                                  "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer",
                                  fatGainTolerance === 'minimize_fat_gain' && "border-[#c19962] bg-[#c19962]/5"
                                )}>
                                  <RadioGroupItem value="minimize_fat_gain" id="minimize_fat_top" />
                                  <Label htmlFor="minimize_fat_top" className="cursor-pointer text-xs">
                                    <span className="font-medium">Lean Gain</span>
                                    <p className="text-muted-foreground">Slower gains, minimal fat</p>
                                  </Label>
                                </div>
                                <div className={cn(
                                  "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer",
                                  fatGainTolerance === 'maximize_muscle' && "border-[#c19962] bg-[#c19962]/5"
                                )}>
                                  <RadioGroupItem value="maximize_muscle" id="maximize_muscle_top" />
                                  <Label htmlFor="maximize_muscle_top" className="cursor-pointer text-xs">
                                    <span className="font-medium">Max Muscle</span>
                                    <p className="text-muted-foreground">Faster gains, accept some fat</p>
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>
                          )}
                        </div>
                      </TooltipProvider>
                      
                      <Separator />
                      
                      {/* Target Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold flex items-center gap-2 text-[#c19962]">
                            <Target className="h-4 w-4" />
                            Target Body Composition
                          </Label>
                          <Select value={targetMode} onValueChange={(v) => setTargetMode(v as typeof targetMode)}>
                            <SelectTrigger className="w-36 h-7 text-xs">
                              <SelectValue placeholder="Set by..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bf">Body Fat %</SelectItem>
                              <SelectItem value="fm">Fat Mass (lbs)</SelectItem>
                              <SelectItem value="ffm">Lean Mass (lbs)</SelectItem>
                              <SelectItem value="weight">Total Weight</SelectItem>
                              <SelectItem value="fmi">FMI</SelectItem>
                              <SelectItem value="ffmi">FFMI</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Primary Target Input Based on Mode */}
                        <div className="p-3 border border-[#c19962]/50 rounded-lg bg-[#c19962]/5">
                          {targetMode === 'bf' && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <Label>Target Body Fat %</Label>
                                <span className="font-medium text-[#c19962]">{targetBodyFat.toFixed(1)}%</span>
                              </div>
                              <Slider
                                value={[targetBodyFat]}
                                onValueChange={([v]) => updateTargetsFromBF(v)}
                                min={Math.max(5, currentBodyFat - 20)}
                                max={Math.min(45, currentBodyFat + 10)}
                                step={0.5}
                              />
                              <p className="text-xs text-muted-foreground">
                                Current: {currentBodyFat.toFixed(1)}% → Change: {(targetBodyFat - currentBodyFat).toFixed(1)}%
                              </p>
                            </div>
                          )}
                          
                          {targetMode === 'fm' && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <Label>Target Fat Mass (lbs)</Label>
                                <span className="font-medium text-[#c19962]">{targetFatMassLbs.toFixed(1)} lbs</span>
                              </div>
                              <Slider
                                value={[targetFatMassLbs]}
                                onValueChange={([v]) => updateTargetsFromFM(v)}
                                min={Math.max(5, currentFatMassLbs - 50)}
                                max={currentFatMassLbs + 30}
                                step={0.5}
                              />
                              <p className="text-xs text-muted-foreground">
                                Current: {currentFatMassLbs.toFixed(1)} lbs → Change: {(targetFatMassLbs - currentFatMassLbs).toFixed(1)} lbs
                              </p>
                            </div>
                          )}
                          
                          {targetMode === 'ffm' && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <Label>Target Lean Mass (lbs)</Label>
                                <span className="font-medium text-[#c19962]">{targetFFMLbs.toFixed(1)} lbs</span>
                              </div>
                              <Slider
                                value={[targetFFMLbs]}
                                onValueChange={([v]) => updateTargetsFromFFM(v)}
                                min={currentFFMLbs - 10}
                                max={currentFFMLbs + 20}
                                step={0.5}
                              />
                              <p className="text-xs text-muted-foreground">
                                Current: {currentFFMLbs.toFixed(1)} lbs → Change: {(targetFFMLbs - currentFFMLbs).toFixed(1)} lbs
                              </p>
                            </div>
                          )}
                          
                          {targetMode === 'weight' && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <Label>Target Weight (lbs)</Label>
                                <span className="font-medium text-[#c19962]">{targetWeightLbs.toFixed(1)} lbs</span>
                              </div>
                              <Slider
                                value={[targetWeightLbs]}
                                onValueChange={([v]) => updateTargetsFromWeight(v)}
                                min={currentWeightLbs - 50}
                                max={currentWeightLbs + 30}
                                step={0.5}
                              />
                              <p className="text-xs text-muted-foreground">
                                Current: {currentWeightLbs.toFixed(1)} lbs → Change: {(targetWeightLbs - currentWeightLbs).toFixed(1)} lbs
                              </p>
                            </div>
                          )}
                          
                          {targetMode === 'fmi' && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <Label>Target FMI</Label>
                                <span className="font-medium text-[#c19962]">{targetFMI.toFixed(1)}</span>
                              </div>
                              <Slider
                                value={[targetFMI]}
                                onValueChange={([v]) => updateTargetsFromFMI(v)}
                                min={Math.max(1, currentFMI - 5)}
                                max={currentFMI + 3}
                                step={0.1}
                              />
                              <p className="text-xs text-muted-foreground">
                                Current: {currentFMI.toFixed(1)} → Change: {(targetFMI - currentFMI).toFixed(1)} | Healthy: 3-6 (men), 5-9 (women)
                              </p>
                            </div>
                          )}
                          
                          {targetMode === 'ffmi' && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <Label>Target FFMI</Label>
                                <span className="font-medium text-[#c19962]">{targetFFMI.toFixed(1)}</span>
                              </div>
                              <Slider
                                value={[targetFFMI]}
                                onValueChange={([v]) => updateTargetsFromFFMI(v)}
                                min={currentFFMI - 2}
                                max={Math.min(28, currentFFMI + 4)}
                                step={0.1}
                              />
                              <p className="text-xs text-muted-foreground">
                                Current: {currentFFMI.toFixed(1)} → Change: {(targetFFMI - currentFFMI).toFixed(1)} | Natural max ~25
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* All Target Metrics Summary */}
                        <div className="grid grid-cols-6 gap-2 p-2 bg-[#c19962]/10 rounded-lg text-xs border border-[#c19962]/30">
                          <div className="text-center">
                            <div className="text-muted-foreground">Weight</div>
                            <div className="font-medium text-[#c19962]">{targetWeightLbs.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">BF%</div>
                            <div className="font-medium text-[#c19962]">{targetBodyFat.toFixed(1)}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">Fat Mass</div>
                            <div className="font-medium text-[#c19962]">{targetFatMassLbs.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">Lean Mass</div>
                            <div className="font-medium text-[#c19962]">{targetFFMLbs.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">FMI</div>
                            <div className="font-medium text-[#c19962]">{targetFMI.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">FFMI</div>
                            <div className="font-medium text-[#c19962]">{targetFFMI.toFixed(1)}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Change Summary */}
                      <div className="p-3 rounded-lg bg-muted/50 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          {newPhaseGoal === 'fat_loss' ? (
                            <TrendingDown className="h-4 w-4 text-orange-500" />
                          ) : newPhaseGoal === 'muscle_gain' ? (
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Scale className="h-4 w-4 text-green-500" />
                          )}
                          <span className="font-medium">Phase Change Summary</span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {newPhaseGoal === 'fat_loss' ? (
                            <>Lose <strong>{Math.abs(currentWeightLbs - targetWeightLbs).toFixed(1)} lbs</strong> total ({Math.abs(currentFatMassLbs - targetFatMassLbs).toFixed(1)} lbs fat, {Math.abs(currentFFMLbs - targetFFMLbs).toFixed(1)} lbs lean)</>
                          ) : newPhaseGoal === 'muscle_gain' ? (
                            <>Gain <strong>{Math.abs(targetWeightLbs - currentWeightLbs).toFixed(1)} lbs</strong> total ({Math.abs(targetFFMLbs - currentFFMLbs).toFixed(1)} lbs muscle, {Math.abs(targetFatMassLbs - currentFatMassLbs).toFixed(1)} lbs fat)</>
                          ) : newPhaseGoal === 'recomposition' ? (
                            <>Recomposition: {Math.abs(currentFatMassLbs - targetFatMassLbs).toFixed(1)} lbs fat → {Math.abs(targetFFMLbs - currentFFMLbs).toFixed(1)} lbs muscle</>
                          ) : (
                            <>Body composition targets set for this phase</>
                          )}
                        </p>
                      </div>
                      
                      {/* Custom Metrics Section - For Performance/Health/Other Goals */}
                      {(newPhaseGoal === 'performance' || newPhaseGoal === 'health' || newPhaseGoal === 'other') && (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Custom Metrics
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Track specific goals like VO2 max, strength PRs, blood markers, or any other metric.
                            </p>
                            
                            {/* Existing Custom Metrics */}
                            {customMetrics.length > 0 && (
                              <div className="space-y-2">
                                {customMetrics.map((metric) => (
                                  <div key={metric.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                                    <div className="flex-1 grid grid-cols-4 gap-2 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">Metric:</span>
                                        <p className="font-medium">{metric.name}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Start:</span>
                                        <p className="font-medium">{metric.startValue || '—'} {metric.unit}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Target:</span>
                                        <p className="font-medium text-[#c19962]">{metric.targetValue || '—'} {metric.unit}</p>
                                      </div>
                                      <div className="flex items-center justify-end">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                          onClick={() => handleRemoveCustomMetric(metric.id)}
                                        >
                                          <XIcon className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Add New Metric */}
                            <div className="p-3 border border-dashed rounded-lg space-y-2">
                              <div className="grid grid-cols-4 gap-2">
                                <Input
                                  placeholder="Metric name"
                                  value={newMetricName}
                                  onChange={(e) => setNewMetricName(e.target.value)}
                                  className="h-8 text-xs"
                                />
                                <Input
                                  placeholder="Start value"
                                  value={newMetricStart}
                                  onChange={(e) => setNewMetricStart(e.target.value)}
                                  className="h-8 text-xs"
                                />
                                <Input
                                  placeholder="Target value"
                                  value={newMetricTarget}
                                  onChange={(e) => setNewMetricTarget(e.target.value)}
                                  className="h-8 text-xs"
                                />
                                <Input
                                  placeholder="Unit"
                                  value={newMetricUnit}
                                  onChange={(e) => setNewMetricUnit(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddCustomMetric}
                                className="w-full h-7 text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Metric
                              </Button>
                            </div>
                            
                            {/* Preset Suggestions */}
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs text-muted-foreground mr-2">Quick add:</span>
                              {[
                                { name: 'VO2 Max', unit: 'ml/kg/min' },
                                { name: 'Bench Press 1RM', unit: 'lbs' },
                                { name: 'Squat 1RM', unit: 'lbs' },
                                { name: 'Deadlift 1RM', unit: 'lbs' },
                                { name: 'Mile Time', unit: 'min' },
                                { name: 'RMR', unit: 'kcal' },
                                { name: 'A1C', unit: '%' },
                                { name: 'LDL Cholesterol', unit: 'mg/dL' },
                                { name: 'Blood Pressure', unit: 'mmHg' },
                              ].map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => {
                                    setNewMetricName(preset.name);
                                    setNewMetricUnit(preset.unit);
                                  }}
                                  className="text-xs px-2 py-0.5 rounded-full border hover:bg-muted transition-colors"
                                >
                                  {preset.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Step 3: Timeline */}
                  {wizardStep === 3 && (
                    <div className="space-y-6 py-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label>Rate of Change</Label>
                            <Badge variant="outline">{rateOfChange.toFixed(2)}% BW/week</Badge>
                          </div>
                          <Slider
                            value={[rateOfChange]}
                            onValueChange={([v]) => setRateOfChange(v)}
                            min={newPhaseGoal === 'muscle_gain' ? 0.1 : 0.25}
                            max={newPhaseGoal === 'muscle_gain' ? 0.5 : 1.0}
                            step={0.05}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{newPhaseGoal === 'muscle_gain' ? 'Conservative' : 'Slow & Steady'}</span>
                            <span>{newPhaseGoal === 'muscle_gain' ? 'Aggressive' : 'Fast (harder to sustain)'}</span>
                          </div>
                        </div>
                        
                        {/* Research-based recommendation */}
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                          <Info className="h-4 w-4 mt-0.5 text-blue-600" />
                          <div className="text-xs">
                            <p className="font-medium text-blue-800 dark:text-blue-200">Research-Based Recommendation</p>
                            <p className="text-blue-700 dark:text-blue-300">
                              {newPhaseGoal === 'fat_loss' ? (
                                <>0.5-0.7% body weight/week optimizes fat loss while preserving muscle. Higher rates increase muscle loss risk.</>
                              ) : newPhaseGoal === 'muscle_gain' ? (
                                <>0.25-0.5% body weight/week allows quality muscle gain with minimal fat. Faster rates primarily increase fat gain.</>
                              ) : (
                                <>Adjust rate based on specific goals and timeline. Slower rates are generally more sustainable.</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                        
                      {/* Calculated Timeline */}
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#c19962]" />
                          Calculated Timeline
                        </h4>
                        
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Start Date</Label>
                              <Input
                                type="date"
                                value={newPhaseStart}
                                onChange={(e) => setNewPhaseStart(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">End Date (Calculated)</Label>
                              <Input
                                type="date"
                                value={newPhaseEnd}
                                onChange={(e) => setNewPhaseEnd(e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm font-medium">Phase Duration</span>
                            <Badge className="bg-[#c19962]">
                              {calculatedTimeline.weeks} weeks
                            </Badge>
                          </div>
                          
                          {calculatedTimeline.weeklyChangeLbs && (
                            <div className="text-xs text-muted-foreground">
                              Weekly change: ~{calculatedTimeline.weeklyChangeLbs} lbs/week
                              {calculatedTimeline.totalChange && (
                                <> • Total: {calculatedTimeline.totalChange} lbs</>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Timeline warnings */}
                      {calculatedTimeline.weeks > 16 && (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-800">Long Phase Duration</p>
                              <p className="text-amber-700 text-xs mt-1">
                                Phases longer than 16 weeks may benefit from a diet break or deload week in the middle. Consider breaking this into smaller phases.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Step 4: Name & Review */}
                  {wizardStep === 4 && (
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label>Phase Name</Label>
                        <Input
                          placeholder={suggestedPhaseName}
                          value={newPhaseName}
                          onChange={(e) => setNewPhaseName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave blank to use: &quot;{suggestedPhaseName}&quot;
                        </p>
                      </div>
                      
                      {/* Summary Card */}
                      <Card className="border-[#c19962]/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#c19962]" />
                            Phase Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Goal</span>
                            <div className="flex items-center gap-2">
                              {GOAL_ICONS[newPhaseGoal]}
                              <span className="font-medium">{GOAL_LABELS[newPhaseGoal]}</span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration</span>
                            <span className="font-medium">{calculatedTimeline.weeks} weeks</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dates</span>
                            <span className="font-medium">{formatDate(newPhaseStart)} → {formatDate(newPhaseEnd)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Target Weight</span>
                            <span className="font-medium">{targetWeightLbs.toFixed(1)} lbs</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Target Body Fat</span>
                            <span className="font-medium">{targetBodyFat.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rate of Change</span>
                            <span className="font-medium">{rateOfChange.toFixed(2)}% BW/week</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  
                  <DialogFooter className="flex justify-between sm:justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => wizardStep === 1 ? handleDialogClose(false) : setWizardStep(wizardStep - 1)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      {wizardStep === 1 ? 'Cancel' : 'Back'}
                    </Button>
                    
                    {wizardStep < 4 ? (
                      <Button 
                        onClick={() => setWizardStep(wizardStep + 1)} 
                        className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                      >
                        Next
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleCreatePhase} 
                        className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Create Phase
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* Edit Phase Dialog */}
              <Dialog open={showEditDialog} onOpenChange={(open) => {
                if (!open) {
                  setShowEditDialog(false);
                  setEditingPhase(null);
                }
              }}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Edit Phase</DialogTitle>
                    <DialogDescription>
                      Update phase settings. Changes to targets should be made in the targets editor below.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Phase Name</Label>
                      <Input
                        value={newPhaseName}
                        onChange={(e) => setNewPhaseName(e.target.value)}
                        placeholder="e.g., Summer Cut"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={newPhaseStart}
                          onChange={(e) => setNewPhaseStart(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={newPhaseEnd}
                          onChange={(e) => setNewPhaseEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Target Weight (lbs)</Label>
                        <Input
                          type="number"
                          value={targetWeightLbs}
                          onChange={(e) => setTargetWeightLbs(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Target Body Fat %</Label>
                        <Input
                          type="number"
                          value={targetBodyFat}
                          onChange={(e) => setTargetBodyFat(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Weekly Rate of Change (%)</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[rateOfChange]}
                          onValueChange={([v]) => setRateOfChange(v)}
                          min={0.1}
                          max={1.5}
                          step={0.1}
                          className="flex-1"
                        />
                        <Badge variant="outline" className="font-mono min-w-[4rem] justify-center">
                          {rateOfChange.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => {
                      setShowEditDialog(false);
                      setEditingPhase(null);
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveEditedPhase}
                      className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            </div>
            
            {/* View Mode Toggle - Calendar first */}
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <CalendarDays className="h-4 w-4 mr-1" />
                Calendar
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Grid
              </Button>
            </div>
          </div>

          {/* Collapsible Planning Stats Bar - Below Progress Steps */}
          <div className="mb-6 rounded-xl border border-[#c19962]/20 bg-gradient-to-r from-[#c19962]/5 via-background to-[#c19962]/5 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowPlanningStats(!showPlanningStats)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4 text-sm">
                <div className="p-1.5 rounded-lg bg-[#c19962]/20">
                  <Activity className="h-4 w-4 text-[#c19962]" />
                </div>
                <span className="font-semibold text-foreground">Planning Overview</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-mono">{phases.length} phases</Badge>
                  {phases.find(p => p.id === activePhaseId) && (
                    <Badge className="text-xs bg-[#c19962]/20 text-[#c19962] border border-[#c19962]/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {phases.find(p => p.id === activePhaseId)?.name}
                    </Badge>
                  )}
                  {timelineEvents.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Flag className="h-3 w-3 mr-1" />
                      {timelineEvents.length} events
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{showPlanningStats ? 'Hide details' : 'Show details'}</span>
                {showPlanningStats ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </button>
            
            {showPlanningStats && (
              <div className="border-t border-[#c19962]/10 bg-muted/20 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5">
                  {/* Planning Stats */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" />
                      Statistics
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
                        <span className="text-sm text-muted-foreground">Total Phases</span>
                        <span className="font-bold text-lg font-mono">{phases.length}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
                        <span className="text-sm text-muted-foreground">Active Phase</span>
                        <span className="font-medium text-[#c19962]">{phases.find(p => p.id === activePhaseId)?.name || 'None'}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-background/50">
                        <span className="text-sm text-muted-foreground">With Meal Plans</span>
                        <span className="font-bold font-mono">{phases.filter(p => p.mealPlan).length}/{phases.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Timeline Events */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5" />
                      Upcoming Events
                    </h4>
                    {timelineEvents.length === 0 ? (
                      <div className="p-4 rounded-lg bg-background/50 text-center">
                        <p className="text-sm text-muted-foreground">No events scheduled</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 text-xs text-[#c19962]"
                          onClick={() => setShowEventDialog(true)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Event
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                        {timelineEvents.slice(0, 4).map(event => {
                          const eventType = EVENT_TYPES.find(et => et.value === event.type);
                          return (
                            <div key={event.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/50 group hover:bg-background transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm">{eventType?.icon}</span>
                                <span className="truncate text-sm font-medium">{event.name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                                {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          );
                        })}
                        {timelineEvents.length > 4 && (
                          <p className="text-xs text-center text-muted-foreground pt-1">+{timelineEvents.length - 4} more events</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5" />
                      Quick Actions
                    </h4>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-sm justify-start"
                        onClick={() => setShowCreateDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Phase
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-sm justify-start"
                        onClick={() => setShowEventDialog(true)}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Add Timeline Event
                      </Button>
                      {phases.find(p => p.id === activePhaseId) && (
                        <Button
                          size="sm"
                          className="h-9 text-sm justify-start bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                          onClick={() => router.push('/meal-plan')}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Go to Meal Plan
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content - Full Width */}
          <div>
            {/* Calendar View */}
            {viewMode === 'calendar' && (
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#c19962]" />
                    Annual Timeline
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Visualize training phases across the year. Navigate years with arrows. Click a phase to edit.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PhaseCalendar
                    phases={sortedPhases}
                    activePhaseId={activePhaseId}
                    year={new Date().getFullYear()}
                    onPhaseClick={(phase) => {
                      // First click selects/activates, second click edits
                      if (phase.id === activePhaseId) {
                        handleOpenEditDialog(phase);
                      } else {
                        setActivePhase(phase.id);
                        toast.success(`Selected: ${phase.name}`);
                      }
                    }}
                    timelineEvents={timelineEvents}
                    onEventDelete={handleDeleteEvent}
                  />
                  {sortedPhases.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4 text-sm">
                        No phases scheduled yet. Create your first phase to see it on the timeline.
                      </p>
                      <Button 
                        onClick={() => setShowCreateDialog(true)}
                        className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Phase
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Phase Targets Editor - Shown when a phase is active */}
            {viewMode === 'calendar' && activePhase && isHydrated && (
              <div className="mt-6">
                <PhaseTargetsEditor
                  phase={activePhase}
                  userProfile={userProfile}
                  weeklySchedule={weeklySchedule}
                  onSaveTargets={(targets) => handleSavePhaseTargets(activePhase.id, targets)}
                  onNavigateToMealPlan={() => handleProceedToMealPlan(activePhase.id)}
                  onEditPhase={() => handleOpenEditDialog(activePhase)}
                />
              </div>
            )}

              {sortedPhases.length === 0 && viewMode !== 'calendar' ? (
                // Empty state for non-calendar views
                <Card>
                  <CardContent className="py-16 text-center">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-xl font-semibold mb-2">No Phases Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Create your first training phase to start planning. Each phase represents a 
                      focused period with specific goals like fat loss, muscle gain, or maintenance.
                    </p>
                    <Button 
                      onClick={() => setShowCreateDialog(true)}
                      className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Phase
                    </Button>
                  </CardContent>
                </Card>
              ) : sortedPhases.length > 0 ? (
                // Phase list/grid (shown below calendar or as main view)
                <div className={cn(
                  viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'
                )}>
                  {sortedPhases.map((phase) => {
                    const isActive = phase.id === activePhaseId;
                    const colors = GOAL_COLORS[phase.goalType];
                    const duration = getPhaseDuration(phase);
                    
                    return (
                      <Card 
                        key={phase.id}
                        className={cn(
                          "transition-all",
                          isActive && "ring-2 ring-[#c19962] shadow-lg",
                          phase.status === 'completed' && "opacity-75"
                        )}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-lg",
                                colors.bg
                              )}>
                                {GOAL_ICONS[phase.goalType]}
                              </div>
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {phase.name}
                                  {isActive && (
                                    <Badge className="bg-[#c19962] text-[#00263d]">Active</Badge>
                                  )}
                                  {phase.status === 'completed' && (
                                    <Badge variant="secondary">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Completed
                                    </Badge>
                                  )}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className={cn(colors.text, colors.border)}>
                                    {GOAL_LABELS[phase.goalType]}
                                  </Badge>
                                  <span className="text-xs">
                                    {formatDate(phase.startDate)} - {formatDate(phase.endDate)}
                                  </span>
                                </CardDescription>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenEditDialog(phase)}
                                title="Edit phase"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDuplicatePhase(phase.id, phase.name)}
                                title="Duplicate phase"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeletePhase(phase.id, phase.name)}
                                title="Delete phase"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          {/* Phase Stats */}
                          <div className="grid grid-cols-3 gap-4 text-center py-3 border-y my-3">
                            <div>
                              <p className="text-2xl font-bold">{duration}</p>
                              <p className="text-xs text-muted-foreground">Weeks</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{phase.targetWeightLbs}</p>
                              <p className="text-xs text-muted-foreground">Target lbs</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{phase.targetBodyFat}%</p>
                              <p className="text-xs text-muted-foreground">Target BF</p>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2">
                            {!isActive && phase.status !== 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActivatePhase(phase.id)}
                                className="flex-1"
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Activate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleProceedToMealPlan(phase.id)}
                              className={cn(
                                "flex-1",
                                isActive 
                                  ? "bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                                  : ""
                              )}
                            >
                              {phase.mealPlan ? 'View Meal Plan' : 'Create Meal Plan'}
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : null}
              
              {/* Navigation */}
              <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={() => router.push('/setup')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Profile
                </Button>
                
                {activePhaseId && (
                  <Button 
                    onClick={() => router.push('/meal-plan')}
                    className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                  >
                    Continue to Meal Plan
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
