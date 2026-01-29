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
  Activity,
  Settings2,
  Utensils
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
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [selectedPhaseForTargets, setSelectedPhaseForTargets] = useState<Phase | null>(null);
  
  // Left sidebar navigation
  type SidebarSection = 'calendar' | 'phases' | 'targets' | 'events';
  const [activeSection, setActiveSection] = useState<SidebarSection>('calendar');
  
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

  // Open phase targets modal
  const handleOpenTargetsModal = (phase: Phase) => {
    setSelectedPhaseForTargets(phase);
    setShowTargetsModal(true);
  };

  return (
    <TooltipProvider delayDuration={100} skipDelayDuration={0}>
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="max-w-7xl mx-auto">
          <ProgressSteps currentStep={2} />
          
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Planning</h1>
            <p className="text-sm text-muted-foreground">
              {isHydrated && activeClient 
                ? `Plan training phases for ${activeClient.name}` 
                : 'Create and manage training phases'}
            </p>
          </div>
          
          {/* Main Layout with Sidebar */}
          <div className="flex gap-6">
            {/* Left Sidebar Navigation */}
            <div className="w-56 shrink-0">
              <div className="sticky top-8 space-y-2">
                {/* Navigation Items */}
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveSection('calendar')}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                      activeSection === 'calendar' 
                        ? "bg-[#c19962]/10 text-[#c19962] border border-[#c19962]/30" 
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <CalendarDays className="h-4 w-4" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">Calendar</span>
                      <p className="text-[10px] text-muted-foreground">Annual timeline</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveSection('phases')}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                      activeSection === 'phases' 
                        ? "bg-[#c19962]/10 text-[#c19962] border border-[#c19962]/30" 
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Target className="h-4 w-4" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">Phases</span>
                      <p className="text-[10px] text-muted-foreground">{phases.length} phase{phases.length !== 1 ? 's' : ''}</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (activePhase) {
                        setActiveSection('targets');
                      } else {
                        toast.error('Select or create a phase first');
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                      activeSection === 'targets' 
                        ? "bg-[#c19962]/10 text-[#c19962] border border-[#c19962]/30" 
                        : activePhase
                          ? "hover:bg-muted text-muted-foreground hover:text-foreground"
                          : "opacity-50 cursor-not-allowed text-muted-foreground"
                    )}
                  >
                    <Settings2 className="h-4 w-4" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">Nutrition Targets</span>
                      <p className="text-[10px] text-muted-foreground">
                        {activePhase 
                          ? (activePhase.nutritionTargets?.length 
                              ? `${activePhase.nutritionTargets.length} days configured` 
                              : 'Configure targets')
                          : 'Select a phase first'}
                      </p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveSection('events')}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                      activeSection === 'events' 
                        ? "bg-[#c19962]/10 text-[#c19962] border border-[#c19962]/30" 
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Flag className="h-4 w-4" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">Events</span>
                      <p className="text-[10px] text-muted-foreground">{timelineEvents.length} scheduled</p>
                    </div>
                  </button>
                </nav>
                
                <Separator className="my-4" />
                
                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-3">Quick Actions</p>
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="w-full justify-start bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Phase
                  </Button>
                  <Button
                    onClick={() => setShowEventDialog(true)}
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </div>
                
                <Separator className="my-4" />
                
                {/* Active Phase Quick Info */}
                {activePhase && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-[#c19962]/10 to-[#c19962]/5 border border-[#c19962]/30">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-[#c19962] text-[#00263d] text-[9px]">Active Phase</Badge>
                      <Badge variant="outline" className="text-[9px]">
                        {activePhase.nutritionTargets?.length || 0} days
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("p-1.5 rounded", GOAL_COLORS[activePhase.goalType].bg)}>
                        {GOAL_ICONS[activePhase.goalType]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{activePhase.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(activePhase.startDate)} - {formatDate(activePhase.endDate)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-1.5 rounded bg-background">
                        <p className="text-sm font-bold">{activePhase.targetWeightLbs}</p>
                        <p className="text-[9px] text-muted-foreground">Target lbs</p>
                      </div>
                      <div className="p-1.5 rounded bg-background">
                        <p className="text-sm font-bold">{activePhase.targetBodyFat}%</p>
                        <p className="text-[9px] text-muted-foreground">Target BF</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                        onClick={() => setActiveSection('targets')}
                      >
                        <Settings2 className="h-3.5 w-3.5 mr-1" />
                        Edit Nutrition Targets
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs"
                        onClick={() => handleProceedToMealPlan(activePhase.id)}
                      >
                        <Utensils className="h-3.5 w-3.5 mr-1" />
                        Build Meal Plan
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Navigation Links */}
                <div className="pt-4 space-y-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                    onClick={() => router.push('/setup')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Profile
                  </Button>
                  {activePhaseId && (
                    <Button 
                      size="sm"
                      className="w-full justify-start bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                      onClick={() => router.push('/meal-plan')}
                    >
                      Meal Plan
                      <ArrowRight className="h-4 w-4 ml-auto" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
            
            {/* Event Dialog */}
            <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Timeline Event</DialogTitle>
                  <DialogDescription>
                    Add important dates like lab tests, competitions, travel, or milestones.
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
            
                
                {/* Create Phase Dialog */}
                <Dialog open={showCreateDialog} onOpenChange={handleDialogClose}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Phase</DialogTitle>
                    <DialogDescription>
                      Step {wizardStep} of 4: {
                        wizardStep === 1 ? 'Select your goal' :
                        wizardStep === 2 ? (
                          newPhaseGoal === 'performance' ? 'Set performance targets & body composition' :
                          newPhaseGoal === 'health' ? 'Set health targets & body composition' :
                          newPhaseGoal === 'other' ? 'Set custom targets & body composition' :
                          'Set body composition targets'
                        ) :
                        wizardStep === 3 ? (
                          newPhaseGoal === 'performance' ? 'Configure training block' :
                          newPhaseGoal === 'health' ? 'Configure health intervention timeline' :
                          newPhaseGoal === 'other' ? 'Configure phase timeline' :
                          'Configure timeline & rate of change'
                        ) :
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
                      
                      {/* PERFORMANCE METRICS - Shows FIRST for Performance Goals */}
                      {newPhaseGoal === 'performance' && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-green-100">
                                <Zap className="h-5 w-5 text-green-700" />
                              </div>
                              <div>
                                <Label className="text-sm font-semibold">Performance Metrics</Label>
                                <p className="text-xs text-muted-foreground">
                                  Define your primary performance goals for this phase
                                </p>
                              </div>
                            </div>
                            
                            {/* Existing Performance Metrics */}
                            {customMetrics.length > 0 && (
                              <div className="space-y-2">
                                {customMetrics.map((metric) => (
                                  <div key={metric.id} className="flex items-center gap-3 p-3 border rounded-lg bg-green-50/50 border-green-200">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm">{metric.name}</span>
                                        <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-300">
                                          {metric.unit}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-4 text-xs">
                                        <span className="text-muted-foreground">
                                          Start: <strong className="text-foreground">{metric.startValue || '—'}</strong>
                                        </span>
                                        <ArrowRight className="h-3 w-3 text-green-600" />
                                        <span className="text-green-700">
                                          Target: <strong>{metric.targetValue || '—'}</strong>
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                                      onClick={() => handleRemoveCustomMetric(metric.id)}
                                    >
                                      <XIcon className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Add New Performance Metric */}
                            <div className="p-4 border-2 border-dashed border-green-200 rounded-lg bg-green-50/30 space-y-3">
                              <p className="text-xs font-medium text-green-700">Add Performance Metric</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Metric Name</Label>
                                  <Input
                                    placeholder="e.g., Squat 1RM, Mile Time"
                                    value={newMetricName}
                                    onChange={(e) => setNewMetricName(e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Unit</Label>
                                  <Input
                                    placeholder="e.g., lbs, min, watts"
                                    value={newMetricUnit}
                                    onChange={(e) => setNewMetricUnit(e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Current Value</Label>
                                  <Input
                                    placeholder="Starting point"
                                    value={newMetricStart}
                                    onChange={(e) => setNewMetricStart(e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Target Value</Label>
                                  <Input
                                    placeholder="Goal to achieve"
                                    value={newMetricTarget}
                                    onChange={(e) => setNewMetricTarget(e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                              </div>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={handleAddCustomMetric}
                                className="w-full h-9 bg-green-600 hover:bg-green-700"
                                disabled={!newMetricName.trim()}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Performance Metric
                              </Button>
                            </div>
                            
                            {/* Preset Performance Metrics by Category */}
                            <div className="space-y-3">
                              <p className="text-xs font-medium text-muted-foreground">Quick Add Presets:</p>
                              
                              {/* Strength */}
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Strength</span>
                                <div className="flex flex-wrap gap-1">
                                  {[
                                    { name: 'Squat 1RM', unit: 'lbs' },
                                    { name: 'Bench Press 1RM', unit: 'lbs' },
                                    { name: 'Deadlift 1RM', unit: 'lbs' },
                                    { name: 'Overhead Press 1RM', unit: 'lbs' },
                                    { name: 'Pull-ups', unit: 'reps' },
                                    { name: 'Total (SBD)', unit: 'lbs' },
                                  ].map((preset) => (
                                    <button
                                      key={preset.name}
                                      type="button"
                                      onClick={() => {
                                        setNewMetricName(preset.name);
                                        setNewMetricUnit(preset.unit);
                                      }}
                                      className={cn(
                                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                                        newMetricName === preset.name
                                          ? "bg-green-100 border-green-400 text-green-700"
                                          : "hover:bg-green-50 hover:border-green-300"
                                      )}
                                    >
                                      {preset.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Endurance */}
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Endurance</span>
                                <div className="flex flex-wrap gap-1">
                                  {[
                                    { name: 'VO2 Max', unit: 'ml/kg/min' },
                                    { name: 'Mile Time', unit: 'min:sec' },
                                    { name: '5K Time', unit: 'min' },
                                    { name: '10K Time', unit: 'min' },
                                    { name: 'Half Marathon', unit: 'h:min' },
                                    { name: 'Marathon', unit: 'h:min' },
                                    { name: 'FTP (Cycling)', unit: 'watts' },
                                    { name: '2K Row', unit: 'min:sec' },
                                  ].map((preset) => (
                                    <button
                                      key={preset.name}
                                      type="button"
                                      onClick={() => {
                                        setNewMetricName(preset.name);
                                        setNewMetricUnit(preset.unit);
                                      }}
                                      className={cn(
                                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                                        newMetricName === preset.name
                                          ? "bg-green-100 border-green-400 text-green-700"
                                          : "hover:bg-green-50 hover:border-green-300"
                                      )}
                                    >
                                      {preset.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Power & Speed */}
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Power & Speed</span>
                                <div className="flex flex-wrap gap-1">
                                  {[
                                    { name: 'Vertical Jump', unit: 'inches' },
                                    { name: 'Broad Jump', unit: 'inches' },
                                    { name: '40 Yard Dash', unit: 'sec' },
                                    { name: 'Sprint (100m)', unit: 'sec' },
                                    { name: 'Power Clean 1RM', unit: 'lbs' },
                                    { name: 'Snatch 1RM', unit: 'lbs' },
                                    { name: 'Peak Power', unit: 'watts' },
                                  ].map((preset) => (
                                    <button
                                      key={preset.name}
                                      type="button"
                                      onClick={() => {
                                        setNewMetricName(preset.name);
                                        setNewMetricUnit(preset.unit);
                                      }}
                                      className={cn(
                                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                                        newMetricName === preset.name
                                          ? "bg-green-100 border-green-400 text-green-700"
                                          : "hover:bg-green-50 hover:border-green-300"
                                      )}
                                    >
                                      {preset.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Conditioning & Recovery */}
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Conditioning & Recovery</span>
                                <div className="flex flex-wrap gap-1">
                                  {[
                                    { name: 'RHR', unit: 'bpm' },
                                    { name: 'HRV', unit: 'ms' },
                                    { name: 'RMR', unit: 'kcal' },
                                    { name: 'Work Capacity', unit: 'kJ' },
                                    { name: 'Recovery Score', unit: 'score' },
                                  ].map((preset) => (
                                    <button
                                      key={preset.name}
                                      type="button"
                                      onClick={() => {
                                        setNewMetricName(preset.name);
                                        setNewMetricUnit(preset.unit);
                                      }}
                                      className={cn(
                                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                                        newMetricName === preset.name
                                          ? "bg-green-100 border-green-400 text-green-700"
                                          : "hover:bg-green-50 hover:border-green-300"
                                      )}
                                    >
                                      {preset.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Sport-Specific */}
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Sport-Specific</span>
                                <div className="flex flex-wrap gap-1">
                                  {[
                                    { name: 'Swim 100m', unit: 'sec' },
                                    { name: 'Golf Handicap', unit: 'strokes' },
                                    { name: 'Tennis Rating', unit: 'NTRP' },
                                    { name: 'Climbing Grade', unit: 'V-scale' },
                                    { name: 'CrossFit Total', unit: 'lbs' },
                                  ].map((preset) => (
                                    <button
                                      key={preset.name}
                                      type="button"
                                      onClick={() => {
                                        setNewMetricName(preset.name);
                                        setNewMetricUnit(preset.unit);
                                      }}
                                      className={cn(
                                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                                        newMetricName === preset.name
                                          ? "bg-green-100 border-green-400 text-green-700"
                                          : "hover:bg-green-50 hover:border-green-300"
                                      )}
                                    >
                                      {preset.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            {customMetrics.length === 0 && (
                              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                                <strong>Tip:</strong> Add at least one performance metric to track your progress. Body composition targets below are optional for performance-focused phases.
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      
                      <Separator />
                      
                      {/* Target Section - With optional label for performance goals */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold flex items-center gap-2 text-[#c19962]">
                            <Target className="h-4 w-4" />
                            {newPhaseGoal === 'performance' ? 'Body Composition (Optional)' : 'Target Body Composition'}
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
                      
                      {/* Custom Metrics Section - For Health/Other Goals (shown after body comp) */}
                      {(newPhaseGoal === 'health' || newPhaseGoal === 'other') && (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Custom Metrics
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Track specific goals like blood markers, health metrics, or any custom measurements.
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
                            
                            {/* Preset Suggestions for Health */}
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs text-muted-foreground mr-2">Quick add:</span>
                              {[
                                { name: 'A1C', unit: '%' },
                                { name: 'Fasting Glucose', unit: 'mg/dL' },
                                { name: 'LDL Cholesterol', unit: 'mg/dL' },
                                { name: 'HDL Cholesterol', unit: 'mg/dL' },
                                { name: 'Triglycerides', unit: 'mg/dL' },
                                { name: 'Blood Pressure', unit: 'mmHg' },
                                { name: 'RHR', unit: 'bpm' },
                                { name: 'Sleep Quality', unit: 'score' },
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
                  
                  {/* Step 3: Timeline - Tailored by Goal Type */}
                  {wizardStep === 3 && (
                    <div className="space-y-6 py-4">
                      
                      {/* BODY COMPOSITION GOALS: Rate of Change */}
                      {(newPhaseGoal === 'fat_loss' || newPhaseGoal === 'muscle_gain' || newPhaseGoal === 'recomposition') && (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <Label className="text-sm font-semibold">Rate of Change</Label>
                              <Badge variant="outline" className="text-sm px-3 py-1">
                                {rateOfChange.toFixed(2)}% BW/week
                              </Badge>
                            </div>
                            
                            {/* Fat Loss Rate Cards */}
                            {newPhaseGoal === 'fat_loss' && (
                              <>
                                <div className="grid grid-cols-5 gap-2">
                                  {[
                                    { rate: 0.3, label: 'Conservative', desc: 'Max muscle retention', color: 'green', recommended: false },
                                    { rate: 0.5, label: 'Moderate', desc: 'Optimal balance', color: 'blue', recommended: true },
                                    { rate: 0.75, label: 'Aggressive', desc: 'Faster results', color: 'orange', recommended: false },
                                    { rate: 1.0, label: 'Very Aggressive', desc: 'Short-term only', color: 'red', recommended: false },
                                  ].map((preset) => (
                                    <button
                                      key={preset.rate}
                                      type="button"
                                      onClick={() => setRateOfChange(preset.rate)}
                                      className={cn(
                                        "p-3 rounded-lg border-2 text-center transition-all relative",
                                        rateOfChange === preset.rate
                                          ? preset.color === 'green' ? "border-green-500 bg-green-50 ring-2 ring-green-200" :
                                            preset.color === 'blue' ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" :
                                            preset.color === 'orange' ? "border-orange-500 bg-orange-50 ring-2 ring-orange-200" :
                                            "border-red-500 bg-red-50 ring-2 ring-red-200"
                                          : "hover:border-muted-foreground/50"
                                      )}
                                    >
                                      {preset.recommended && (
                                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                                          Recommended
                                        </span>
                                      )}
                                      <p className={cn(
                                        "font-bold text-lg",
                                        preset.color === 'green' ? "text-green-700" :
                                        preset.color === 'blue' ? "text-blue-700" :
                                        preset.color === 'orange' ? "text-orange-700" :
                                        "text-red-700"
                                      )}>
                                        {preset.rate}%
                                      </p>
                                      <p className="text-xs font-medium">{preset.label}</p>
                                      <p className="text-[10px] text-muted-foreground">{preset.desc}</p>
                                    </button>
                                  ))}
                                  
                                  {/* Custom Rate Option */}
                                  <div className={cn(
                                    "p-3 rounded-lg border-2 text-center transition-all relative flex flex-col justify-center",
                                    ![0.3, 0.5, 0.75, 1.0].includes(rateOfChange)
                                      ? "border-[#c19962] bg-[#c19962]/10 ring-2 ring-[#c19962]/30"
                                      : "hover:border-muted-foreground/50"
                                  )}>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Custom</p>
                                    <div className="flex items-center justify-center gap-1">
                                      <Input
                                        type="number"
                                        value={rateOfChange}
                                        onChange={(e) => setRateOfChange(Number(e.target.value))}
                                        step="0.05"
                                        min="0.1"
                                        max="1.5"
                                        className="h-8 w-16 text-center font-bold text-sm p-1"
                                      />
                                      <span className="text-sm font-medium">%</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">BW/week</p>
                                  </div>
                                </div>
                              </>
                            )}
                            
                            {/* Muscle Gain Rate Cards */}
                            {newPhaseGoal === 'muscle_gain' && (
                              <>
                                <div className="grid grid-cols-5 gap-2">
                                  {[
                                    { rate: 0.15, label: 'Conservative', desc: 'Minimal fat gain', color: 'green', recommended: false },
                                    { rate: 0.25, label: 'Moderate', desc: 'Lean bulk', color: 'blue', recommended: true },
                                    { rate: 0.35, label: 'Aggressive', desc: 'Standard bulk', color: 'purple', recommended: false },
                                    { rate: 0.5, label: 'Very Aggressive', desc: 'Max muscle focus', color: 'orange', recommended: false },
                                  ].map((preset) => (
                                    <button
                                      key={preset.rate}
                                      type="button"
                                      onClick={() => setRateOfChange(preset.rate)}
                                      className={cn(
                                        "p-3 rounded-lg border-2 text-center transition-all relative",
                                        rateOfChange === preset.rate
                                          ? preset.color === 'green' ? "border-green-500 bg-green-50 ring-2 ring-green-200" :
                                            preset.color === 'blue' ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" :
                                            preset.color === 'purple' ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200" :
                                            "border-orange-500 bg-orange-50 ring-2 ring-orange-200"
                                          : "hover:border-muted-foreground/50"
                                      )}
                                    >
                                      {preset.recommended && (
                                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                                          Recommended
                                        </span>
                                      )}
                                      <p className={cn(
                                        "font-bold text-lg",
                                        preset.color === 'green' ? "text-green-700" :
                                        preset.color === 'blue' ? "text-blue-700" :
                                        preset.color === 'purple' ? "text-purple-700" :
                                        "text-orange-700"
                                      )}>
                                        {preset.rate}%
                                      </p>
                                      <p className="text-xs font-medium">{preset.label}</p>
                                      <p className="text-[10px] text-muted-foreground">{preset.desc}</p>
                                    </button>
                                  ))}
                                  
                                  {/* Custom Rate Option */}
                                  <div className={cn(
                                    "p-3 rounded-lg border-2 text-center transition-all relative flex flex-col justify-center",
                                    ![0.15, 0.25, 0.35, 0.5].includes(rateOfChange)
                                      ? "border-[#c19962] bg-[#c19962]/10 ring-2 ring-[#c19962]/30"
                                      : "hover:border-muted-foreground/50"
                                  )}>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Custom</p>
                                    <div className="flex items-center justify-center gap-1">
                                      <Input
                                        type="number"
                                        value={rateOfChange}
                                        onChange={(e) => setRateOfChange(Number(e.target.value))}
                                        step="0.05"
                                        min="0.1"
                                        max="0.75"
                                        className="h-8 w-16 text-center font-bold text-sm p-1"
                                      />
                                      <span className="text-sm font-medium">%</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">BW/week</p>
                                  </div>
                                </div>
                              </>
                            )}
                            
                            {/* Recomposition Rate Cards */}
                            {newPhaseGoal === 'recomposition' && (
                              <>
                                <div className="grid grid-cols-4 gap-2">
                                  {[
                                    { rate: 0, label: 'Maintenance', desc: 'Steady recomp', color: 'green', recommended: true },
                                    { rate: 0.15, label: 'Slight Deficit', desc: 'Fat loss focus', color: 'blue', recommended: false },
                                    { rate: -0.15, label: 'Slight Surplus', desc: 'Muscle focus', color: 'purple', recommended: false },
                                  ].map((preset) => (
                                    <button
                                      key={preset.rate}
                                      type="button"
                                      onClick={() => setRateOfChange(Math.abs(preset.rate))}
                                      className={cn(
                                        "p-3 rounded-lg border-2 text-center transition-all relative",
                                        rateOfChange === Math.abs(preset.rate)
                                          ? preset.color === 'green' ? "border-green-500 bg-green-50 ring-2 ring-green-200" :
                                            preset.color === 'blue' ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" :
                                            "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                                          : "hover:border-muted-foreground/50"
                                      )}
                                    >
                                      {preset.recommended && (
                                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">
                                          Recommended
                                        </span>
                                      )}
                                      <p className={cn(
                                        "font-bold text-lg",
                                        preset.color === 'green' ? "text-green-700" :
                                        preset.color === 'blue' ? "text-blue-700" :
                                        "text-purple-700"
                                      )}>
                                        {preset.rate === 0 ? '0%' : `${preset.rate > 0 ? '-' : '+'}${Math.abs(preset.rate)}%`}
                                      </p>
                                      <p className="text-xs font-medium">{preset.label}</p>
                                      <p className="text-[10px] text-muted-foreground">{preset.desc}</p>
                                    </button>
                                  ))}
                                  
                                  {/* Custom Rate Option */}
                                  <div className={cn(
                                    "p-3 rounded-lg border-2 text-center transition-all relative flex flex-col justify-center",
                                    ![0, 0.15].includes(rateOfChange)
                                      ? "border-[#c19962] bg-[#c19962]/10 ring-2 ring-[#c19962]/30"
                                      : "hover:border-muted-foreground/50"
                                  )}>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Custom</p>
                                    <div className="flex items-center justify-center gap-1">
                                      <Input
                                        type="number"
                                        value={rateOfChange}
                                        onChange={(e) => setRateOfChange(Number(e.target.value))}
                                        step="0.05"
                                        min="0"
                                        max="0.25"
                                        className="h-8 w-16 text-center font-bold text-sm p-1"
                                      />
                                      <span className="text-sm font-medium">%</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">BW/week</p>
                                  </div>
                                </div>
                              </>
                            )}
                            
                            {/* Weekly Impact Preview */}
                            <div className="p-3 rounded-lg bg-muted/50 border">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Weekly change at {editCurrentWeight} lbs:</span>
                                <span className="font-semibold">
                                  {newPhaseGoal === 'fat_loss' ? '−' : newPhaseGoal === 'muscle_gain' ? '+' : '±'}
                                  {((rateOfChange / 100) * editCurrentWeight).toFixed(2)} lbs/week
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Research-based recommendation for body comp */}
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                            <Info className="h-4 w-4 mt-0.5 text-blue-600" />
                            <div className="text-xs">
                              <p className="font-medium text-blue-800 dark:text-blue-200">Research-Based Guidance</p>
                              <p className="text-blue-700 dark:text-blue-300">
                                {newPhaseGoal === 'fat_loss' ? (
                                  <>
                                    <strong>Conservative (0.3%):</strong> Best for lean individuals or muscle preservation priority.{' '}
                                    <strong>Moderate (0.5%):</strong> Optimal for most clients.{' '}
                                    <strong>Aggressive (0.75-1%):</strong> Higher muscle loss risk, use for shorter phases.
                                  </>
                                ) : newPhaseGoal === 'muscle_gain' ? (
                                  <>
                                    <strong>Conservative (0.15%):</strong> Minimal fat gain, slower progress.{' '}
                                    <strong>Moderate (0.25%):</strong> Optimal for lean gains.{' '}
                                    <strong>Aggressive (0.35-0.5%):</strong> Faster muscle gain but more fat accumulation.
                                  </>
                                ) : (
                                  <>
                                    <strong>Maintenance:</strong> Ideal for recomposition - simultaneous fat loss and muscle gain.{' '}
                                    <strong>Slight deficit:</strong> Emphasize fat loss while preserving muscle.{' '}
                                    <strong>Slight surplus:</strong> Emphasize muscle gain with minimal fat.
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* PERFORMANCE GOALS: Training Block Duration */}
                      {newPhaseGoal === 'performance' && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-green-100">
                              <Zap className="h-4 w-4 text-green-700" />
                            </div>
                            <div>
                              <Label className="text-sm font-semibold">Training Block Duration</Label>
                              <p className="text-xs text-muted-foreground">Select phase duration based on training periodization</p>
                            </div>
                          </div>
                          
                          {/* Quick Duration Presets */}
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { weeks: 4, label: 'Microcycle', desc: 'Peaking/Deload' },
                              { weeks: 8, label: 'Mesocycle', desc: 'Standard block' },
                              { weeks: 12, label: 'Training Block', desc: 'Full progression' },
                              { weeks: 16, label: 'Macrocycle', desc: 'Competition prep' },
                            ].map((preset) => (
                              <button
                                key={preset.weeks}
                                type="button"
                                onClick={() => {
                                  const start = new Date(newPhaseStart);
                                  const end = new Date(start);
                                  end.setDate(end.getDate() + (preset.weeks * 7));
                                  setNewPhaseEnd(end.toISOString().split('T')[0]);
                                }}
                                className={cn(
                                  "p-3 rounded-lg border text-center transition-all",
                                  calculatedTimeline.weeks === preset.weeks
                                    ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                                    : "hover:border-green-300 hover:bg-green-50/50"
                                )}
                              >
                                <p className="font-bold text-lg text-green-700">{preset.weeks}</p>
                                <p className="text-xs font-medium">{preset.label}</p>
                                <p className="text-[10px] text-muted-foreground">{preset.desc}</p>
                              </button>
                            ))}
                          </div>
                          
                          {/* Performance Metrics Summary */}
                          {customMetrics.length > 0 && (
                            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                              <p className="text-xs font-medium text-green-800 mb-2">Performance Targets for this Phase:</p>
                              <div className="space-y-1">
                                {customMetrics.map((m) => (
                                  <div key={m.id} className="flex justify-between text-xs">
                                    <span className="text-green-700">{m.name}</span>
                                    <span className="font-medium text-green-800">{m.startValue} → {m.targetValue} {m.unit}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Research-based recommendation for performance */}
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50/50 border border-green-200">
                            <Info className="h-4 w-4 mt-0.5 text-green-600" />
                            <div className="text-xs">
                              <p className="font-medium text-green-800">Training Periodization Guidance</p>
                              <p className="text-green-700">
                                4-week blocks for peaking/tapering. 8-12 weeks for strength/hypertrophy blocks. 
                                12-16 weeks for competition prep. Include deload weeks every 4-6 weeks of hard training.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* HEALTH GOALS: Intervention Timeline */}
                      {newPhaseGoal === 'health' && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-rose-100">
                              <Heart className="h-4 w-4 text-rose-700" />
                            </div>
                            <div>
                              <Label className="text-sm font-semibold">Health Intervention Duration</Label>
                              <p className="text-xs text-muted-foreground">Set timeline based on health goals and marker reassessment</p>
                            </div>
                          </div>
                          
                          {/* Quick Duration Presets for Health */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { weeks: 6, label: '6 Weeks', desc: 'Initial intervention' },
                              { weeks: 12, label: '12 Weeks', desc: 'Lab recheck timing' },
                              { weeks: 24, label: '24 Weeks', desc: 'Long-term change' },
                            ].map((preset) => (
                              <button
                                key={preset.weeks}
                                type="button"
                                onClick={() => {
                                  const start = new Date(newPhaseStart);
                                  const end = new Date(start);
                                  end.setDate(end.getDate() + (preset.weeks * 7));
                                  setNewPhaseEnd(end.toISOString().split('T')[0]);
                                }}
                                className={cn(
                                  "p-3 rounded-lg border text-center transition-all",
                                  calculatedTimeline.weeks === preset.weeks
                                    ? "border-rose-500 bg-rose-50 ring-2 ring-rose-200"
                                    : "hover:border-rose-300 hover:bg-rose-50/50"
                                )}
                              >
                                <p className="font-bold text-lg text-rose-700">{preset.weeks}</p>
                                <p className="text-xs font-medium">{preset.label}</p>
                                <p className="text-[10px] text-muted-foreground">{preset.desc}</p>
                              </button>
                            ))}
                          </div>
                          
                          {/* Health Metrics Summary */}
                          {customMetrics.length > 0 && (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                              <p className="text-xs font-medium text-rose-800 mb-2">Health Targets for this Phase:</p>
                              <div className="space-y-1">
                                {customMetrics.map((m) => (
                                  <div key={m.id} className="flex justify-between text-xs">
                                    <span className="text-rose-700">{m.name}</span>
                                    <span className="font-medium text-rose-800">{m.startValue} → {m.targetValue} {m.unit}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Research-based recommendation for health */}
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50/50 border border-rose-200">
                            <Info className="h-4 w-4 mt-0.5 text-rose-600" />
                            <div className="text-xs">
                              <p className="font-medium text-rose-800">Health Marker Timeline</p>
                              <p className="text-rose-700">
                                Most blood markers (lipids, glucose, A1C) show meaningful changes in 8-12 weeks. 
                                Plan lab work 1-2 weeks before phase end to assess progress.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* OTHER GOALS: Custom Timeline */}
                      {newPhaseGoal === 'other' && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-slate-100">
                              <Target className="h-4 w-4 text-slate-700" />
                            </div>
                            <div>
                              <Label className="text-sm font-semibold">Phase Duration</Label>
                              <p className="text-xs text-muted-foreground">Set custom timeline for your specific goals</p>
                            </div>
                          </div>
                          
                          {/* Quick Duration Presets for Other */}
                          <div className="grid grid-cols-4 gap-2">
                            {[4, 8, 12, 16].map((weeks) => (
                              <button
                                key={weeks}
                                type="button"
                                onClick={() => {
                                  const start = new Date(newPhaseStart);
                                  const end = new Date(start);
                                  end.setDate(end.getDate() + (weeks * 7));
                                  setNewPhaseEnd(end.toISOString().split('T')[0]);
                                }}
                                className={cn(
                                  "p-3 rounded-lg border text-center transition-all",
                                  calculatedTimeline.weeks === weeks
                                    ? "border-slate-500 bg-slate-100 ring-2 ring-slate-200"
                                    : "hover:border-slate-300 hover:bg-slate-50"
                                )}
                              >
                                <p className="font-bold text-lg">{weeks}</p>
                                <p className="text-xs text-muted-foreground">weeks</p>
                              </button>
                            ))}
                          </div>
                          
                          {/* Custom Metrics Summary */}
                          {customMetrics.length > 0 && (
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <p className="text-xs font-medium text-slate-800 mb-2">Custom Targets for this Phase:</p>
                              <div className="space-y-1">
                                {customMetrics.map((m) => (
                                  <div key={m.id} className="flex justify-between text-xs">
                                    <span className="text-slate-700">{m.name}</span>
                                    <span className="font-medium text-slate-800">{m.startValue} → {m.targetValue} {m.unit}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                        
                      {/* Date Selection - Universal */}
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#c19962]" />
                          Phase Timeline
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
                              <Label className="text-xs text-muted-foreground">End Date</Label>
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
                          
                          {/* Only show body comp change for body comp goals */}
                          {(newPhaseGoal === 'fat_loss' || newPhaseGoal === 'muscle_gain' || newPhaseGoal === 'recomposition') && 
                           calculatedTimeline.weeklyChangeLbs && (
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
                                {newPhaseGoal === 'performance' 
                                  ? 'Consider adding deload weeks every 4-6 weeks for recovery and adaptation.'
                                  : newPhaseGoal === 'health'
                                    ? 'Plan for interim check-ins to assess progress and adjust as needed.'
                                    : 'Phases longer than 16 weeks may benefit from periodic assessments or breaks.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Step 4: Name & Review - Tailored by Goal Type */}
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
                      
                      {/* Summary Card - Goal Type Aware */}
                      <Card className={cn(
                        "border-2",
                        newPhaseGoal === 'performance' && "border-green-300",
                        newPhaseGoal === 'health' && "border-rose-300",
                        newPhaseGoal === 'other' && "border-slate-300",
                        (newPhaseGoal === 'fat_loss' || newPhaseGoal === 'muscle_gain' || newPhaseGoal === 'recomposition') && "border-[#c19962]/50"
                      )}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            {newPhaseGoal === 'performance' && <Zap className="h-4 w-4 text-green-600" />}
                            {newPhaseGoal === 'health' && <Heart className="h-4 w-4 text-rose-600" />}
                            {newPhaseGoal === 'other' && <Target className="h-4 w-4 text-slate-600" />}
                            {(newPhaseGoal === 'fat_loss' || newPhaseGoal === 'muscle_gain' || newPhaseGoal === 'recomposition') && (
                              <CheckCircle2 className="h-4 w-4 text-[#c19962]" />
                            )}
                            Phase Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          {/* Common Info */}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Goal Type</span>
                            <div className="flex items-center gap-2">
                              {GOAL_ICONS[newPhaseGoal]}
                              <span className="font-medium">
                                {newPhaseGoal === 'health' && customGoalName ? customGoalName : 
                                 newPhaseGoal === 'other' && customGoalName ? customGoalName :
                                 GOAL_LABELS[newPhaseGoal]}
                              </span>
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
                          
                          {/* BODY COMPOSITION GOALS: Show targets */}
                          {(newPhaseGoal === 'fat_loss' || newPhaseGoal === 'muscle_gain' || newPhaseGoal === 'recomposition') && (
                            <>
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
                              <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                                <strong>Projected change:</strong> {Math.abs(currentWeightLbs - targetWeightLbs).toFixed(1)} lbs over {calculatedTimeline.weeks} weeks
                              </div>
                            </>
                          )}
                          
                          {/* PERFORMANCE GOALS: Show metrics */}
                          {newPhaseGoal === 'performance' && (
                            <>
                              <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Performance Targets</p>
                              {customMetrics.length > 0 ? (
                                <div className="space-y-2">
                                  {customMetrics.map((m) => (
                                    <div key={m.id} className="flex justify-between items-center p-2 rounded bg-green-50 border border-green-200">
                                      <span className="text-sm font-medium">{m.name}</span>
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="text-muted-foreground">{m.startValue}</span>
                                        <ArrowRight className="h-3 w-3 text-green-600" />
                                        <span className="font-bold text-green-700">{m.targetValue} {m.unit}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">No specific metrics defined. Body composition will be tracked as secondary.</p>
                              )}
                              <div className="flex justify-between text-xs pt-2">
                                <span className="text-muted-foreground">Body comp (secondary)</span>
                                <span className="text-muted-foreground">Maintain ~{editCurrentWeight} lbs</span>
                              </div>
                            </>
                          )}
                          
                          {/* HEALTH GOALS: Show health markers */}
                          {newPhaseGoal === 'health' && (
                            <>
                              <p className="text-xs font-medium text-rose-700 uppercase tracking-wide">Health Targets</p>
                              {customMetrics.length > 0 ? (
                                <div className="space-y-2">
                                  {customMetrics.map((m) => (
                                    <div key={m.id} className="flex justify-between items-center p-2 rounded bg-rose-50 border border-rose-200">
                                      <span className="text-sm font-medium">{m.name}</span>
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="text-muted-foreground">{m.startValue}</span>
                                        <ArrowRight className="h-3 w-3 text-rose-600" />
                                        <span className="font-bold text-rose-700">{m.targetValue} {m.unit}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">No specific health markers defined.</p>
                              )}
                              <div className="flex justify-between text-xs pt-2">
                                <span className="text-muted-foreground">Body comp approach</span>
                                <span className="text-muted-foreground">Support health goals</span>
                              </div>
                            </>
                          )}
                          
                          {/* OTHER GOALS: Show custom metrics */}
                          {newPhaseGoal === 'other' && (
                            <>
                              <p className="text-xs font-medium text-slate-700 uppercase tracking-wide">Custom Targets</p>
                              {customMetrics.length > 0 ? (
                                <div className="space-y-2">
                                  {customMetrics.map((m) => (
                                    <div key={m.id} className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
                                      <span className="text-sm font-medium">{m.name}</span>
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="text-muted-foreground">{m.startValue}</span>
                                        <ArrowRight className="h-3 w-3 text-slate-600" />
                                        <span className="font-bold text-slate-700">{m.targetValue} {m.unit}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">No specific metrics defined.</p>
                              )}
                            </>
                          )}
                          
                          {/* Commitment Levels */}
                          <Separator />
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Lifestyle</span>
                              <Badge variant="outline" className="text-[10px]">
                                {lifestyleCommitment === 'fully_committed' ? 'High' : 
                                 lifestyleCommitment === 'moderately_committed' ? 'Moderate' : 'Limited'}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tracking</span>
                              <Badge variant="outline" className="text-[10px]">
                                {trackingCommitment === 'committed_tracking' ? 'Committed' : 'Casual'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Conflict Warning - Body Comp Phases Cannot Overlap */}
                      {(() => {
                        const bodyCompGoals = ['fat_loss', 'muscle_gain', 'recomposition'];
                        const isBodyCompPhase = bodyCompGoals.includes(newPhaseGoal);
                        const newStart = new Date(newPhaseStart);
                        const newEnd = new Date(newPhaseEnd);
                        
                        // Check for any overlapping body comp phase (can't have two body comp phases at once)
                        const overlappingBodyCompPhase = isBodyCompPhase 
                          ? phases.find(p => {
                              if (bodyCompGoals.includes(p.goalType)) {
                                const existingStart = new Date(p.startDate);
                                const existingEnd = new Date(p.endDate);
                                return (newStart <= existingEnd && newEnd >= existingStart);
                              }
                              return false;
                            })
                          : null;
                        
                        // Check if there's a body comp phase to anchor to (for non-body-comp goals)
                        const hasAnchorBodyCompPhase = !isBodyCompPhase 
                          ? phases.some(p => {
                              if (bodyCompGoals.includes(p.goalType)) {
                                const existingStart = new Date(p.startDate);
                                const existingEnd = new Date(p.endDate);
                                return (newStart <= existingEnd && newEnd >= existingStart);
                              }
                              return false;
                            })
                          : true;
                        
                        // Check for same goal type overlap
                        const sameTypeOverlap = phases.find(p => {
                          if (p.goalType === newPhaseGoal) {
                            const existingStart = new Date(p.startDate);
                            const existingEnd = new Date(p.endDate);
                            return (newStart <= existingEnd && newEnd >= existingStart);
                          }
                          return false;
                        });
                        
                        return (
                          <>
                            {/* Critical: Conflicting body comp phases */}
                            {overlappingBodyCompPhase && (
                              <div className="p-3 rounded-lg bg-red-50 border-2 border-red-300">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-semibold text-red-800">Body Composition Conflict</p>
                                    <p className="text-xs text-red-700 mt-1">
                                      Cannot have two body composition phases at the same time. 
                                      &quot;{overlappingBodyCompPhase.name}&quot; ({GOAL_LABELS[overlappingBodyCompPhase.goalType]}) already exists during this period.
                                    </p>
                                    <p className="text-xs text-red-600 mt-2 font-medium">
                                      Adjust dates to not overlap, or modify the existing phase instead.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Warning: No body comp anchor for performance/health phases */}
                            {!isBodyCompPhase && !hasAnchorBodyCompPhase && (
                              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-amber-800">No Body Composition Anchor</p>
                                    <p className="text-xs text-amber-700 mt-1">
                                      This {GOAL_LABELS[newPhaseGoal].toLowerCase()} phase has no overlapping body composition phase. 
                                      Nutrition targets will default to maintenance calories based on your profile.
                                    </p>
                                    <p className="text-xs text-amber-600 mt-2">
                                      <strong>Recommendation:</strong> Create a body composition phase first (e.g., fat loss, muscle gain, or recomposition) to anchor your meal plan targets.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Info: Performance/Health phase will use body comp anchor */}
                            {!isBodyCompPhase && hasAnchorBodyCompPhase && (
                              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <div className="flex items-start gap-2">
                                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-blue-800">Nutrition Targets</p>
                                    <p className="text-xs text-blue-700 mt-1">
                                      This {GOAL_LABELS[newPhaseGoal].toLowerCase()} phase will use nutrition targets from the overlapping body composition phase. 
                                      Your meal plan will support both goals simultaneously.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Warning: Same type overlap */}
                            {sameTypeOverlap && !overlappingBodyCompPhase && (
                              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-amber-800">Overlapping Phase</p>
                                    <p className="text-xs text-amber-700 mt-1">
                                      Another {GOAL_LABELS[newPhaseGoal].toLowerCase()} phase (&quot;{sameTypeOverlap.name}&quot;) exists during this time period.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
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
                <DialogContent className="max-w-2xl">
                  <DialogHeader className="pb-4">
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <Edit className="h-5 w-5 text-[#c19962]" />
                      Edit Phase
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      Update phase settings and body composition targets.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-2">
                    {/* Phase Name */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Phase Name</Label>
                      <Input
                        value={newPhaseName}
                        onChange={(e) => setNewPhaseName(e.target.value)}
                        placeholder="e.g., Summer Cut, Strength Block"
                        className="h-11"
                      />
                    </div>
                    
                    {/* Timeline */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Timeline</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Start Date</Label>
                          <Input
                            type="date"
                            value={newPhaseStart}
                            onChange={(e) => setNewPhaseStart(e.target.value)}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">End Date</Label>
                          <Input
                            type="date"
                            value={newPhaseEnd}
                            onChange={(e) => setNewPhaseEnd(e.target.value)}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Body Composition Targets */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Body Composition Targets</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Target Weight (lbs)</Label>
                          <Input
                            type="number"
                            value={targetWeightLbs}
                            onChange={(e) => setTargetWeightLbs(Number(e.target.value))}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Target Body Fat %</Label>
                          <Input
                            type="number"
                            value={targetBodyFat}
                            onChange={(e) => setTargetBodyFat(Number(e.target.value))}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Rate of Change */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Weekly Rate of Change</Label>
                        <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                          {rateOfChange.toFixed(1)}% BW/week
                        </Badge>
                      </div>
                      <Slider
                        value={[rateOfChange]}
                        onValueChange={([v]) => setRateOfChange(v)}
                        min={0.1}
                        max={1.5}
                        step={0.05}
                        className="py-2"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Conservative (0.1%)</span>
                        <span>Moderate (0.5%)</span>
                        <span>Aggressive (1.5%)</span>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter className="pt-4 gap-2 sm:gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowEditDialog(false);
                        setEditingPhase(null);
                      }}
                      className="h-10"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveEditedPhase}
                      className="h-10 bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            
          {/* ========== MAIN CONTENT SECTIONS ========== */}
          
          {/* Calendar Section */}
          {activeSection === 'calendar' && (
            <div className="space-y-4">
              {/* Calendar Card - Prominent */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5 text-[#c19962]" />
                      Annual Timeline
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowEventDialog(true)}
                      >
                        <Flag className="h-4 w-4 mr-1" />
                        Add Event
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                        onClick={() => setShowCreateDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Phase
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p>Click a phase to select it. Click again to edit nutrition targets.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <PhaseCalendar
                    phases={sortedPhases}
                    activePhaseId={activePhaseId}
                    year={new Date().getFullYear()}
                    onPhaseClick={(phase) => {
                      // First click selects, second click opens targets modal
                      if (phase.id === activePhaseId) {
                        handleOpenTargetsModal(phase);
                      } else {
                        setActivePhase(phase.id);
                        toast.success(`Selected: ${phase.name}`);
                      }
                    }}
                    timelineEvents={timelineEvents}
                    onEventDelete={handleDeleteEvent}
                  />
                  {sortedPhases.length === 0 && (
                    <div className="text-center py-12 border-t mt-4">
                      <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-muted-foreground mb-4 text-sm">
                        No phases scheduled yet
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
              
              {/* Quick Phase Actions - Below Calendar */}
              {sortedPhases.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sortedPhases.slice(0, 3).map((phase) => {
                    const isActive = phase.id === activePhaseId;
                    const colors = GOAL_COLORS[phase.goalType];
                    return (
                      <button
                        key={phase.id}
                        onClick={() => {
                          setActivePhase(phase.id);
                          handleOpenTargetsModal(phase);
                        }}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-all hover:shadow-md",
                          isActive 
                            ? "border-[#c19962] bg-[#c19962]/5" 
                            : "border-muted hover:border-[#c19962]/50"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("p-1.5 rounded", colors.bg)}>
                            {GOAL_ICONS[phase.goalType]}
                          </div>
                          <span className="font-medium text-sm truncate">{phase.name}</span>
                          {isActive && (
                            <Badge className="bg-[#c19962] text-[#00263d] text-[9px] ml-auto">Active</Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDate(phase.startDate)}</span>
                          <span>{getPhaseDuration(phase)} weeks</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Phases Section */}
          {activeSection === 'phases' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">All Phases</h2>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Phase
                </Button>
              </div>
              
              {sortedPhases.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <h3 className="font-semibold mb-2">No Phases Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first training phase to start planning.
                    </p>
                    <Button 
                      onClick={() => setShowCreateDialog(true)}
                      className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Phase
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {sortedPhases.map((phase) => {
                    const isActive = phase.id === activePhaseId;
                    const colors = GOAL_COLORS[phase.goalType];
                    const duration = getPhaseDuration(phase);
                    
                    return (
                      <Card 
                        key={phase.id}
                        className={cn(
                          "border-0 shadow-sm transition-all cursor-pointer hover:shadow-md",
                          isActive && "ring-2 ring-[#c19962]",
                          phase.status === 'completed' && "opacity-60"
                        )}
                        onClick={() => {
                          setActivePhase(phase.id);
                          handleOpenTargetsModal(phase);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg", colors.bg)}>
                                {GOAL_ICONS[phase.goalType]}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{phase.name}</span>
                                  {isActive && (
                                    <Badge className="bg-[#c19962] text-[#00263d] text-[10px]">Active</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                  <span>{formatDate(phase.startDate)} - {formatDate(phase.endDate)}</span>
                                  <span>•</span>
                                  <span>{duration} weeks</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-semibold">{phase.targetWeightLbs} lbs</div>
                                <div className="text-xs text-muted-foreground">{phase.targetBodyFat}% BF</div>
                              </div>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleOpenEditDialog(phase)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleDuplicatePhase(phase.id, phase.name)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Duplicate</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDeletePhase(phase.id, phase.name)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Nutrition Targets Section - Full Editor Inline */}
          {activeSection === 'targets' && activePhase && isHydrated && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", GOAL_COLORS[activePhase.goalType].bg)}>
                    {GOAL_ICONS[activePhase.goalType]}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{activePhase.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(activePhase.startDate)} - {formatDate(activePhase.endDate)} • {getPhaseDuration(activePhase)} weeks
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditDialog(activePhase)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Phase
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                    onClick={() => handleProceedToMealPlan(activePhase.id)}
                  >
                    <Utensils className="h-4 w-4 mr-1" />
                    Build Meal Plan
                  </Button>
                </div>
              </div>
              
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
          
          {/* Nutrition Targets - No Phase Selected */}
          {activeSection === 'targets' && !activePhase && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Settings2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <h3 className="font-semibold mb-2">No Phase Selected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select or create a phase to configure nutrition targets.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => setActiveSection('phases')}
                  >
                    <Target className="mr-2 h-4 w-4" />
                    View Phases
                  </Button>
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Phase
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Events Section */}
          {activeSection === 'events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Timeline Events</h2>
                <Button
                  onClick={() => setShowEventDialog(true)}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Event
                </Button>
              </div>
              
              {timelineEvents.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <Flag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <h3 className="font-semibold mb-2">No Events Scheduled</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add important dates like competitions, lab tests, or milestones.
                    </p>
                    <Button 
                      onClick={() => setShowEventDialog(true)}
                      variant="outline"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Event
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {timelineEvents
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((event) => {
                      const eventType = EVENT_TYPES.find(t => t.value === event.type);
                      return (
                        <Card key={event.id} className="border-0 shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-2xl">{eventType?.icon || '📌'}</div>
                                <div>
                                  <div className="font-medium">{event.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(event.date)}
                                    {event.notes && ` • ${event.notes}`}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          )}
          
          </div>
          </div>
          
          {/* Phase Targets Modal - Full Screen on Desktop */}
          <Dialog open={showTargetsModal} onOpenChange={setShowTargetsModal}>
            <DialogContent className="w-[98vw] max-w-[1800px] h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
              <DialogHeader className="px-8 py-5 border-b bg-background/95 backdrop-blur sticky top-0 z-10 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-[#c19962]/10">
                      <Settings2 className="h-6 w-6 text-[#c19962]" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold">
                        {selectedPhaseForTargets ? `Nutrition Targets: ${selectedPhaseForTargets.name}` : 'Nutrition Targets'}
                      </DialogTitle>
                      {selectedPhaseForTargets && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(selectedPhaseForTargets.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(selectedPhaseForTargets.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-3"
                    onClick={() => setShowTargetsModal(false)}
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 min-h-0">
                {selectedPhaseForTargets && isHydrated && (
                  <div className="max-w-[1600px] mx-auto">
                    <PhaseTargetsEditor
                      phase={selectedPhaseForTargets}
                      userProfile={userProfile}
                      weeklySchedule={weeklySchedule}
                      onSaveTargets={(targets) => {
                        handleSavePhaseTargets(selectedPhaseForTargets.id, targets);
                      }}
                      onNavigateToMealPlan={() => {
                        setShowTargetsModal(false);
                        handleProceedToMealPlan(selectedPhaseForTargets.id);
                      }}
                      onEditPhase={() => {
                        setShowTargetsModal(false);
                        handleOpenEditDialog(selectedPhaseForTargets);
                      }}
                    />
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
