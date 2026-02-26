'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
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
import { useFitomicsStore, flushPendingSaves } from '@/lib/store';
import { useSaveOnLeave } from '@/hooks/use-save-on-leave';
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
  Utensils,
  Link2,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Flame,
  Dumbbell
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Legend
} from 'recharts';
import type { Phase, GoalType, PerformancePriority, MusclePreservation, FatGainTolerance, LifestyleCommitment, TrackingCommitment, TimelineEvent, TimelineEventType, DayNutritionTargets, PhaseCheckIn, MacroSettings } from '@/types';
import { PhaseCalendar, type PhaseCategory } from '@/components/planning/phase-calendar';
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

// Phase categories for grouped display
const PHASE_CATEGORY_ROWS: { id: PhaseCategory; label: string; goals: GoalType[]; icon: React.ReactNode; description: string }[] = [
  { id: 'body_comp', label: 'Body Composition', goals: ['fat_loss', 'muscle_gain', 'recomposition'], icon: <Scale className="h-4 w-4" />, description: 'Fat loss, muscle gain, and recomposition phases' },
  { id: 'performance', label: 'Performance', goals: ['performance'], icon: <Zap className="h-4 w-4" />, description: 'Athletic and performance-focused training blocks' },
  { id: 'health', label: 'Health Focus', goals: ['health'], icon: <Heart className="h-4 w-4" />, description: 'Health markers, labs, and wellness goals' },
  { id: 'other', label: 'Other', goals: ['other'], icon: <Target className="h-4 w-4" />, description: 'Custom goals and miscellaneous phases' },
];

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
    getActivePhase,
    setNutritionTargets,
    saveActiveClientState,
  } = useFitomicsStore();
  
  // Ensure pending saves are flushed when navigating away or closing the page
  useSaveOnLeave();
  
  // Handle hydration
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const activeClient = isHydrated ? getActiveClient() : null;
  
  // UI State - Default to calendar view to help visualize phase planning
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('calendar');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createPhaseCategory, setCreatePhaseCategory] = useState<PhaseCategory | null>(null);
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
  const createDialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => {
      if (createDialogRef.current) {
        createDialogRef.current.scrollTop = 0;
      }
    });
  }, [wizardStep]);
  const [newPhaseGoal, setNewPhaseGoal] = useState<GoalType>('fat_loss');
  const [newPhaseName, setNewPhaseName] = useState('');
  const [customGoalName, setCustomGoalName] = useState('');
  const [newPhaseStart, setNewPhaseStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [newPhaseEnd, setNewPhaseEnd] = useState('');
  const [manualDurationWeeks, setManualDurationWeeks] = useState<number | null>(null); // User-selected duration
  const [recompBias, setRecompBias] = useState<'maintenance' | 'deficit' | 'surplus'>('maintenance'); // For recomp: direction of slight calorie adjustment
  
  // Timeline events dialog state (events stored in zustand)
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventType, setNewEventType] = useState<TimelineEventType>('milestone');
  const [newEventNotes, setNewEventNotes] = useState('');
  
  // Check-in / Progress tracking state
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [checkInPhaseId, setCheckInPhaseId] = useState<string | null>(null);
  const [checkInDate, setCheckInDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [checkInWeight, setCheckInWeight] = useState<number | ''>('');
  const [checkInBodyFat, setCheckInBodyFat] = useState<number | ''>('');
  const [checkInNotes, setCheckInNotes] = useState('');
  
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
  
  // Previous phase context — when phases exist, the wizard can build on the latest one
  const [predecessorPhase, setPredecessorPhase] = useState<Phase | null>(null);
  
  // Target input mode: 'bf' (body fat %), 'fm' (fat mass), 'ffm' (lean mass), 'weight', 'fmi', 'ffmi', 'independent' (set fat loss & muscle gain separately)
  const [targetMode, setTargetMode] = useState<'bf' | 'fm' | 'ffm' | 'weight' | 'fmi' | 'ffmi' | 'independent'>('bf');
  const [fatToLose, setFatToLose] = useState(0);
  const [muscleToGain, setMuscleToGain] = useState(0);
  
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
  
  // Include nutrition targets toggle for non-body-comp phases
  const [includeNutritionTargets, setIncludeNutritionTargets] = useState(false);
  
  // Phase context preferences
  const [performancePriority, setPerformancePriority] = useState<PerformancePriority>('body_comp_priority');
  const [musclePreservation, setMusclePreservation] = useState<MusclePreservation>('preserve_all');
  const [fatGainTolerance, setFatGainTolerance] = useState<FatGainTolerance>('minimize_fat_gain');
  const [lifestyleCommitment, setLifestyleCommitment] = useState<LifestyleCommitment>('fully_committed');
  const [trackingCommitment, setTrackingCommitment] = useState<TrackingCommitment>('committed_tracking');
  
  // ============ CRONOMETER DATA PANEL STATE ============
  type CronometerModalType = 'trends' | 'foodlog' | 'biometrics' | 'fasting' | 'targets' | null;
  const [activeCronometerModal, setActiveCronometerModal] = useState<CronometerModalType>(null);
  const [cronometerDateRange, setCronometerDateRange] = useState({
    from: subDays(new Date(), 21),
    to: new Date(),
  });
  const [isFetchingCronometer, setIsFetchingCronometer] = useState(false);
  const [cronometerData, setCronometerData] = useState<{
    success: boolean;
    daysAnalyzed: number;
    dateRange: { start: string; end: string };
    trendData: Array<{ date: string; calories: number; protein: number; carbs: number; fat: number; fiber: number }>;
    macroDistribution: Array<{ name: string; value: number; grams: number; color: string }>;
    averages: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
    foodLog: Array<{
      date: string; completed: boolean; totalCalories: number; protein: number; carbs: number; fat: number; fiber: number;
      meals: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number; foods: Array<{ name: string; serving: string }> }>;
    }>;
    fasts: Array<{ name: string; start: string; finish: string | null; comments: string; duration: string | null; ongoing: boolean }>;
    biometrics: Array<{ date: string; type: string; value: number; unit: string }>;
    micronutrientAverages: Array<{ name: string; value: number }>;
    targets: Record<string, { min?: number; max?: number; unit: string }>;
  } | null>(null);
  // Cronometer targets (separate lightweight fetch)
  const [cronometerTargets, setCronometerTargets] = useState<{
    kcal: number | null; protein: number | null; total_carbs: number | null; fat: number | null;
  } | null>(null);

  const hasCronometerLink = !!(activeClient?.cronometerClientId);

  const fetchCronometerDashboard = useCallback(async () => {
    if (!activeClient?.cronometerClientId) return;
    setIsFetchingCronometer(true);
    try {
      const params = new URLSearchParams({
        start: format(cronometerDateRange.from, 'yyyy-MM-dd'),
        end: format(cronometerDateRange.to, 'yyyy-MM-dd'),
        client_id: String(activeClient.cronometerClientId),
      });
      const res = await fetch(`/api/cronometer/dashboard?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCronometerData(data);
      }
    } catch (err) {
      console.error('[Planning] Cronometer fetch failed:', err);
    } finally {
      setIsFetchingCronometer(false);
    }
  }, [activeClient?.cronometerClientId, cronometerDateRange]);

  const fetchCronometerTargets = useCallback(async () => {
    if (!activeClient?.cronometerClientId) return;
    try {
      const params = new URLSearchParams({ client_id: String(activeClient.cronometerClientId) });
      const res = await fetch(`/api/cronometer/targets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCronometerTargets(data.targets || null);
      }
    } catch (err) {
      console.error('[Planning] Cronometer targets fetch failed:', err);
    }
  }, [activeClient?.cronometerClientId]);

  const openCronometerModal = useCallback((modal: CronometerModalType) => {
    setActiveCronometerModal(modal);
    // Fetch data lazily on first open
    if (!cronometerData && modal !== 'targets') {
      fetchCronometerDashboard();
    }
    if (modal === 'targets' && !cronometerTargets) {
      fetchCronometerTargets();
      if (!cronometerData) fetchCronometerDashboard();
    }
  }, [cronometerData, cronometerTargets, fetchCronometerDashboard, fetchCronometerTargets]);

  const CHART_COLORS = { gold: '#c19962', red: '#ef4444', blue: '#3b82f6', yellow: '#eab308', green: '#22c55e', purple: '#a855f7' };

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
  // If there are existing phases, detect the latest one and pre-populate with its projected end-state
  useEffect(() => {
    if (showCreateDialog) {
      // Find the latest phase by end date to use as predecessor
      const latestPhase = phases.length > 0
        ? [...phases].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0]
        : null;
      
      if (latestPhase) {
        const projected = getPhaseProjectedEndState(latestPhase);
        setPredecessorPhase(latestPhase);
        
        // Pre-populate "current" stats from projected end-state of predecessor
        setEditCurrentWeight(projected.weight);
        setEditCurrentBodyFat(projected.bodyFat);
        
        // Start date = predecessor's end date
        setNewPhaseStart(latestPhase.endDate);
        
        // Carry forward custom metrics as starting values for non-body-comp goals
        if (projected.customMetrics?.length) {
          setCustomMetrics(projected.customMetrics.map(m => ({
            ...m,
            id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            startValue: m.targetValue, // Previous target becomes new start
            targetValue: '', // Let user set new target
          })));
        }
      } else {
        setPredecessorPhase(null);
        setEditCurrentWeight(profileWeightLbs);
        setEditCurrentBodyFat(profileBodyFat);

        // If client submitted intake goals, pre-set goal type
        const intakeGoalType = userProfile.goalType as GoalType | undefined;
        if (intakeGoalType && ['fat_loss', 'muscle_gain', 'recomposition'].includes(intakeGoalType)) {
          setNewPhaseGoal(intakeGoalType);
        }
      }
      
      setEditCurrentHeightFt(profileHeightFt);
      setEditCurrentHeightIn(profileHeightIn);
      setSaveCurrentToProfile(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateDialog]);
  
  // Initialize targets when goal changes or current stats change
  // If the client submitted intake goals, use those as the starting point
  useEffect(() => {
    if (showCreateDialog) {
      const weight = editCurrentWeight || 180;
      const bf = editCurrentBodyFat || 20;
      const fm = weight * (bf / 100);
      const ffm = weight - fm;

      // Check for intake-submitted goal data in userProfile
      const intakeGoalType = userProfile.goalType as GoalType | undefined;
      const hasIntakeTargets = phases.length === 0 && intakeGoalType === newPhaseGoal &&
        (userProfile.goalWeight || userProfile.goalFatMass || userProfile.goalFFM);

      if (hasIntakeTargets) {
        // Pre-populate from client's submitted intake goals
        const gw = (userProfile.goalWeight as number) || weight;
        const gbf = (userProfile.goalBodyFatPercent as number) || bf;
        const gfm = (userProfile.goalFatMass as number) || gw * (gbf / 100);
        const gffm = (userProfile.goalFFM as number) || gw - gfm;
        const rate = (userProfile.rateOfChange as number) ||
          (newPhaseGoal === 'fat_loss' ? 0.5 : newPhaseGoal === 'muscle_gain' ? 0.25 : 0.25);

        setTargetWeightLbs(Math.round(gw * 10) / 10);
        setTargetBodyFat(Math.round(gbf * 10) / 10);
        setTargetFatMassLbs(Math.round(gfm * 10) / 10);
        setTargetFFMLbs(Math.round(gffm * 10) / 10);
        setRateOfChange(rate);
        if (newPhaseGoal === 'fat_loss') setMusclePreservation('preserve_all');
        if (newPhaseGoal === 'muscle_gain') setFatGainTolerance('minimize_fat_gain');
      } else if (newPhaseGoal === 'fat_loss') {
        const targetBF = Math.max(8, bf - 5);
        const targetFM = ffm * (targetBF / (100 - targetBF));
        setTargetBodyFat(targetBF);
        setTargetFatMassLbs(Math.round(targetFM * 10) / 10);
        setTargetFFMLbs(ffm);
        setTargetWeightLbs(Math.round((ffm + targetFM) * 10) / 10);
        setRateOfChange(0.5);
        setMusclePreservation('preserve_all');
      } else if (newPhaseGoal === 'muscle_gain') {
        const targetFFM = ffm + 5;
        const targetFM = fm + 2;
        setTargetFFMLbs(Math.round(targetFFM * 10) / 10);
        setTargetFatMassLbs(Math.round(targetFM * 10) / 10);
        setTargetWeightLbs(Math.round((targetFFM + targetFM) * 10) / 10);
        setTargetBodyFat(Math.round((targetFM / (targetFFM + targetFM)) * 1000) / 10);
        setRateOfChange(0.25);
        setFatGainTolerance('minimize_fat_gain');
      } else if (newPhaseGoal === 'recomposition') {
        setTargetWeightLbs(weight);
        setTargetBodyFat(Math.max(8, bf - 3));
        const targetFM = weight * ((bf - 3) / 100);
        setTargetFatMassLbs(Math.round(targetFM * 10) / 10);
        setTargetFFMLbs(Math.round((weight - targetFM) * 10) / 10);
        setRateOfChange(0.25);
      } else {
        setTargetWeightLbs(weight);
        setTargetBodyFat(bf);
        setTargetFatMassLbs(fm);
        setTargetFFMLbs(ffm);
        setRateOfChange(0);
      }
    }
  }, [showCreateDialog, newPhaseGoal, editCurrentWeight, editCurrentBodyFat, userProfile, phases.length]);
  
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

  const updateTargetsFromIndependent = (fatLoss: number, muscleGain: number) => {
    const newFM = Math.max(0, currentFatMassLbs - fatLoss);
    const newFFM = currentFFMLbs + muscleGain;
    const newWeight = newFM + newFFM;
    setTargetFatMassLbs(Math.round(newFM * 10) / 10);
    setTargetFFMLbs(Math.round(newFFM * 10) / 10);
    setTargetWeightLbs(Math.round(newWeight * 10) / 10);
    setTargetBodyFat(newWeight > 0 ? Math.round((newFM / newWeight) * 1000) / 10 : 0);
  };
  
  // Calculate target indices
  const targetFFMI = heightMeters > 0 ? (targetFFMLbs * 0.453592) / (heightMeters * heightMeters) : 0;
  const targetFMI = heightMeters > 0 ? (targetFatMassLbs * 0.453592) / (heightMeters * heightMeters) : 0;
  
  // Calculate timeline based on targets and rate OR manual selection
  const calculatedTimeline = useMemo(() => {
    const weightChange = Math.abs(targetWeightLbs - currentWeightLbs);
    const weeklyChangeLbs = (rateOfChange / 100) * currentWeightLbs;
    
    // If user manually selected a duration, use that
    if (manualDurationWeeks !== null) {
      const endDate = new Date(newPhaseStart);
      endDate.setDate(endDate.getDate() + manualDurationWeeks * 7);
      return {
        weeks: manualDurationWeeks,
        endDate: endDate.toISOString().split('T')[0],
        weeklyChangeLbs: weeklyChangeLbs !== 0 ? Math.round(weeklyChangeLbs * 100) / 100 : undefined,
        totalChange: weeklyChangeLbs !== 0 ? Math.round(weightChange * 10) / 10 : undefined,
      };
    }
    
    if (weeklyChangeLbs === 0 || ['performance', 'health', 'other'].includes(newPhaseGoal)) {
      const defaultWeeks = 12; // Default 12 weeks for non-body-comp focused phases
      const endDate = new Date(newPhaseStart);
      endDate.setDate(endDate.getDate() + defaultWeeks * 7);
      return { weeks: defaultWeeks, endDate: endDate.toISOString().split('T')[0] };
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
  }, [targetWeightLbs, currentWeightLbs, rateOfChange, newPhaseStart, newPhaseGoal, manualDurationWeeks]);
  
  // Update end date when timeline is calculated (only if not manually set)
  useEffect(() => {
    if (calculatedTimeline.endDate && manualDurationWeeks === null) {
      setNewPhaseEnd(calculatedTimeline.endDate);
    }
  }, [calculatedTimeline.endDate, manualDurationWeeks]);
  
  // Helper: is the current wizard goal a body composition goal?
  const isBodyCompGoal = newPhaseGoal === 'fat_loss' || newPhaseGoal === 'muscle_gain' || newPhaseGoal === 'recomposition';
  const totalWizardSteps = isBodyCompGoal ? 4 : 2;
  
  // Generate suggested phase name — smarter when building on a predecessor
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
    
    // If building on predecessor of same goal type, add a sequence hint
    if (predecessorPhase && predecessorPhase.goalType === newPhaseGoal) {
      // Count how many phases of this type already exist
      const sameTypeCount = phases.filter(p => p.goalType === newPhaseGoal).length;
      return `Q${quarter} ${year} ${goalNames[newPhaseGoal]} ${sameTypeCount + 1}`;
    }
    
    return `Q${quarter} ${year} ${goalNames[newPhaseGoal]}`;
  }, [newPhaseGoal, newPhaseStart, customGoalName, predecessorPhase, phases]);
  
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
  
  // Open check-in dialog for a phase
  const handleOpenCheckIn = (phaseId: string) => {
    setCheckInPhaseId(phaseId);
    setCheckInDate(new Date().toISOString().split('T')[0]);
    setCheckInWeight('');
    setCheckInBodyFat('');
    setCheckInNotes('');
    setShowCheckInDialog(true);
  };
  
  // Add check-in to phase
  const handleAddCheckIn = () => {
    if (!checkInPhaseId) return;
    
    const phase = phases.find(p => p.id === checkInPhaseId);
    if (!phase) {
      toast.error('Phase not found');
      return;
    }
    
    if (!checkInWeight && !checkInBodyFat) {
      toast.error('Please enter at least weight or body fat');
      return;
    }
    
    // Calculate week number
    const startDate = new Date(phase.startDate);
    const checkDate = new Date(checkInDate);
    const weekNumber = Math.floor((checkDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    // Calculate body comp values
    const weight = typeof checkInWeight === 'number' ? checkInWeight : undefined;
    const bf = typeof checkInBodyFat === 'number' ? checkInBodyFat : undefined;
    const fatMass = weight && bf ? weight * (bf / 100) : undefined;
    const leanMass = weight && bf ? weight - fatMass! : undefined;
    
    const newCheckIn: PhaseCheckIn = {
      id: `checkin-${Date.now()}`,
      date: checkInDate,
      weekNumber,
      weight,
      bodyFat: bf,
      fatMass,
      leanMass,
      notes: checkInNotes || undefined,
      createdAt: new Date().toISOString(),
    };
    
    const existingCheckIns = phase.checkIns || [];
    updatePhase(checkInPhaseId, {
      checkIns: [...existingCheckIns, newCheckIn],
      updatedAt: new Date().toISOString(),
    });
    
    setShowCheckInDialog(false);
    toast.success('Check-in recorded!');
  };
  
  // Delete a check-in
  const handleDeleteCheckIn = (phaseId: string, checkInId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;
    
    const updatedCheckIns = (phase.checkIns || []).filter(c => c.id !== checkInId);
    updatePhase(phaseId, {
      checkIns: updatedCheckIns,
      updatedAt: new Date().toISOString(),
    });
    toast.success('Check-in removed');
  };
  
  // Calculate projected weight for a given week
  const getProjectedWeight = (phase: Phase, weekNumber: number): number => {
    const startWeight = phase.startingWeightLbs || editCurrentWeight;
    const weeklyChange = (phase.rateOfChange / 100) * startWeight;
    const change = phase.goalType === 'fat_loss' ? -weeklyChange : weeklyChange;
    return startWeight + (change * weekNumber);
  };
  
  /**
   * Calculate the projected end-state of a phase.
   * If check-ins exist, extrapolates from the latest one for accuracy.
   * Otherwise, uses the phase's designed targets.
   */
  const getPhaseProjectedEndState = useCallback((phase: Phase) => {
    const startWeight = phase.startingWeightLbs || profileWeightLbs;
    const startBF = phase.startingBodyFat || profileBodyFat;
    const durationWeeks = (() => {
      const s = new Date(phase.startDate);
      const e = new Date(phase.endDate);
      return Math.round((e.getTime() - s.getTime()) / (7 * 24 * 60 * 60 * 1000));
    })();
    
    // If there are check-ins, use the latest one and extrapolate remaining weeks
    if (phase.checkIns?.length) {
      const sorted = [...phase.checkIns].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latest = sorted[0];
      if (latest.weight && latest.bodyFat !== undefined) {
        const remainingWeeks = Math.max(0, durationWeeks - latest.weekNumber);
        if (remainingWeeks === 0) {
          // Phase is done or at check-in point — use actual values
          const fm = latest.weight * (latest.bodyFat / 100);
          return {
            weight: latest.weight,
            bodyFat: latest.bodyFat,
            fatMass: Math.round(fm * 10) / 10,
            ffm: Math.round((latest.weight - fm) * 10) / 10,
            source: 'check-in' as const,
            checkInDate: latest.date,
            customMetrics: phase.customMetrics,
          };
        }
        // Extrapolate from check-in towards target
        const weeklyWeightChange = (phase.targetWeightLbs - latest.weight) / remainingWeeks;
        const projWeight = latest.weight + weeklyWeightChange * remainingWeeks;
        // Extrapolate BF proportionally
        const weeklyBFChange = (phase.targetBodyFat - latest.bodyFat) / remainingWeeks;
        const projBF = latest.bodyFat + weeklyBFChange * remainingWeeks;
        const projFM = projWeight * (projBF / 100);
        return {
          weight: Math.round(projWeight * 10) / 10,
          bodyFat: Math.round(projBF * 10) / 10,
          fatMass: Math.round(projFM * 10) / 10,
          ffm: Math.round((projWeight - projFM) * 10) / 10,
          source: 'extrapolated' as const,
          checkInDate: latest.date,
          customMetrics: phase.customMetrics,
        };
      }
    }
    
    // For body comp goals, projected end = the designed targets
    if (['fat_loss', 'muscle_gain', 'recomposition'].includes(phase.goalType)) {
      return {
        weight: phase.targetWeightLbs,
        bodyFat: phase.targetBodyFat,
        fatMass: phase.targetFatMassLbs,
        ffm: phase.targetFFMLbs,
        source: 'targets' as const,
        customMetrics: phase.customMetrics,
      };
    }
    
    // For non-body-comp goals (performance, health, other), body comp stays ~same
    const fm = startWeight * (startBF / 100);
    return {
      weight: startWeight,
      bodyFat: startBF,
      fatMass: Math.round(fm * 10) / 10,
      ffm: Math.round((startWeight - fm) * 10) / 10,
      source: 'maintained' as const,
      customMetrics: phase.customMetrics,
    };
  }, [profileWeightLbs, profileBodyFat]);
  
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
      setManualDurationWeeks(null);
      setRecompBias('maintenance');
      setPredecessorPhase(null);
      setCreatePhaseCategory(null);
      setIncludeNutritionTargets(false);
    }
  };
  
  // Open create dialog pre-set to a specific category row
  const handleCreatePhaseForCategory = (category: PhaseCategory) => {
    setCreatePhaseCategory(category);
    
    // Map category to default goal type
    const categoryGoalMap: Record<PhaseCategory, GoalType> = {
      body_comp: 'fat_loss',
      performance: 'performance',
      health: 'health',
      other: 'other',
    };
    setNewPhaseGoal(categoryGoalMap[category]);
    
    // For non-body-comp, default nutrition targets off
    const isBodyComp = category === 'body_comp';
    setIncludeNutritionTargets(isBodyComp);
    
    // Skip step 1 (goal selection) since category is already chosen
    setWizardStep(2);
    setShowCreateDialog(true);
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
    
    // For non-body-comp goals without nutrition targets, zero out body comp fields
    const hasBodyComp = isBodyCompGoal || includeNutritionTargets;
    
    const phaseId = createPhase({
      name: phaseName,
      goalType: newPhaseGoal,
      customGoalName: (newPhaseGoal === 'other' || newPhaseGoal === 'health') ? customGoalName : undefined,
      startDate: newPhaseStart,
      endDate: newPhaseEnd,
      status: 'planned',
      targetWeightLbs: hasBodyComp ? targetWeightLbs : 0,
      targetBodyFat: hasBodyComp ? targetBodyFat : 0,
      targetFatMassLbs: hasBodyComp ? targetFatMassLbs : 0,
      targetFFMLbs: hasBodyComp ? targetFFMLbs : 0,
      rateOfChange: hasBodyComp ? rateOfChange : 0,
      performancePriority,
      musclePreservation,
      fatGainTolerance,
      lifestyleCommitment,
      trackingCommitment,
      // Store starting body comp for reference
      startingWeightLbs: hasBodyComp ? editCurrentWeight : 0,
      startingBodyFat: hasBodyComp ? editCurrentBodyFat : 0,
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
    // Flush any pending debounced saves to ensure all state
    // (including updated nutrition targets) is persisted to the client record
    flushPendingSaves(useFitomicsStore.getState());
    setActivePhase(phaseId);
    router.push('/meal-plan');
  };
  
  // Handle saving nutrition targets to phase
  const handleSavePhaseTargets = (phaseId: string, targets: DayNutritionTargets[], macroSettings?: MacroSettings) => {
    updatePhase(phaseId, { 
      nutritionTargets: targets,
      ...(macroSettings ? { macroSettings } : {}),
      updatedAt: new Date().toISOString()
    });
    
    // Also explicitly set top-level nutrition targets if this is the active phase,
    // ensuring they are immediately available for the meal plan step
    if (phaseId === activePhaseId) {
      setNutritionTargets(targets);
    }
    
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
    
    // Calculate and set manual duration from existing phase dates
    const startDate = new Date(phase.startDate);
    const endDate = new Date(phase.endDate);
    const weeksDiff = Math.round((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    setManualDurationWeeks(weeksDiff);
    
    // Reset recomp bias for editing
    setRecompBias('maintenance');
    
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
            
            {/* Check-In Dialog */}
            <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-[#c19962]" />
                    Record Check-In
                  </DialogTitle>
                  <DialogDescription>
                    Log your actual measurements to track progress against projections.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Check-In Date</Label>
                    <Input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Weight (lbs)</Label>
                      <NumericInput
                        placeholder="Enter weight"
                        value={checkInWeight}
                        onChange={(v) => setCheckInWeight(v ?? '')}
                        step={0.1}
                        min={50}
                        max={600}
                        allowEmpty
                        suffix="lbs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Body Fat %</Label>
                      <NumericInput
                        placeholder="Optional"
                        value={checkInBodyFat}
                        onChange={(v) => setCheckInBodyFat(v ?? '')}
                        step={0.1}
                        min={2}
                        max={60}
                        allowEmpty
                        suffix="%"
                      />
                    </div>
                  </div>
                  
                  {/* Show calculated values if both entered */}
                  {typeof checkInWeight === 'number' && typeof checkInBodyFat === 'number' && (
                    <div className="p-3 rounded-lg bg-muted/50 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Fat Mass</p>
                        <p className="font-medium">{(checkInWeight * (checkInBodyFat / 100)).toFixed(1)} lbs</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lean Mass</p>
                        <p className="font-medium">{(checkInWeight * (1 - checkInBodyFat / 100)).toFixed(1)} lbs</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Input
                      placeholder="How are you feeling? Any notable changes?"
                      value={checkInNotes}
                      onChange={(e) => setCheckInNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCheckInDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCheckIn} className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]">
                    Save Check-In
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
                
                {/* Create Phase Dialog */}
                <Dialog open={showCreateDialog} onOpenChange={handleDialogClose}>
                <DialogContent ref={createDialogRef} className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {createPhaseCategory 
                        ? `New ${PHASE_CATEGORY_ROWS.find(c => c.id === createPhaseCategory)?.label || ''} Phase`
                        : 'Create New Phase'
                      }
                    </DialogTitle>
                    <DialogDescription>
                      Step {wizardStep} of {totalWizardSteps}: {
                        wizardStep === 1 ? 'Select your goal' :
                        isBodyCompGoal ? (
                          wizardStep === 2 ? 'Body composition targets' :
                          wizardStep === 3 ? 'Timeline & rate of change' :
                          'Review and name your phase'
                        ) : 'Configure your phase'
                      }
                    </DialogDescription>
                    {/* Progress indicator - clickable */}
                    <div className="flex gap-1 pt-2">
                      {Array.from({ length: totalWizardSteps }, (_, i) => i + 1).map((step) => (
                        <button
                          type="button"
                          key={step}
                          onClick={() => {
                            if (createPhaseCategory && step === 1) return;
                            if (step <= wizardStep) setWizardStep(step);
                          }}
                          className={cn(
                            "h-1.5 flex-1 rounded-full transition-all",
                            step <= wizardStep ? "bg-[#c19962]" : "bg-muted",
                            step < wizardStep ? "cursor-pointer hover:opacity-80" : "cursor-default"
                          )}
                          title={step <= wizardStep ? `Go to step ${step}` : undefined}
                        />
                      ))}
                    </div>
                  </DialogHeader>
                  
                  {/* Predecessor Phase Context Banner */}
                  {predecessorPhase && (
                    <div className="mx-0 -mt-1 mb-2 p-3 rounded-lg border border-[#c19962]/30 bg-[#c19962]/5">
                      <div className="flex items-start gap-2">
                        <Flag className="h-4 w-4 text-[#c19962] mt-0.5 shrink-0" />
                        <div className="text-sm space-y-1 flex-1">
                          <p className="font-medium text-[#00263d]">
                            Building on: <span className="text-[#c19962]">{predecessorPhase.name}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {GOAL_LABELS[predecessorPhase.goalType]} &middot; {formatDate(predecessorPhase.startDate)} &ndash; {formatDate(predecessorPhase.endDate)}
                          </p>
                          {(() => {
                            const proj = getPhaseProjectedEndState(predecessorPhase);
                            return (
                              <div className="grid grid-cols-4 gap-2 mt-2 p-2 bg-background/80 rounded text-xs">
                                <div>
                                  <div className="text-muted-foreground">Proj. Weight</div>
                                  <div className="font-semibold">{proj.weight} lbs</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Proj. Body Fat</div>
                                  <div className="font-semibold">{proj.bodyFat}%</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Proj. Lean Mass</div>
                                  <div className="font-semibold">{proj.ffm} lbs</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Proj. Fat Mass</div>
                                  <div className="font-semibold">{proj.fatMass} lbs</div>
                                </div>
                                {proj.source === 'check-in' && proj.checkInDate && (
                                  <div className="col-span-4 text-muted-foreground pt-1 border-t">
                                    Based on latest check-in ({formatDate(proj.checkInDate)})
                                  </div>
                                )}
                                {proj.source === 'extrapolated' && proj.checkInDate && (
                                  <div className="col-span-4 text-muted-foreground pt-1 border-t">
                                    Extrapolated from check-in ({formatDate(proj.checkInDate)})
                                  </div>
                                )}
                                {proj.source === 'targets' && (
                                  <div className="col-span-4 text-muted-foreground pt-1 border-t">
                                    Based on designed phase targets
                                  </div>
                                )}
                                {proj.source === 'maintained' && (
                                  <div className="col-span-4 text-muted-foreground pt-1 border-t">
                                    Body comp maintained (non-body-comp phase)
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          {predecessorPhase.customMetrics?.length ? (
                            <div className="mt-2 p-2 bg-background/80 rounded text-xs">
                              <div className="text-muted-foreground mb-1">Custom Metrics (end of phase)</div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {predecessorPhase.customMetrics.map(m => (
                                  <div key={m.id} className="flex justify-between">
                                    <span>{m.name}</span>
                                    <span className="font-semibold">{m.targetValue} {m.unit}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setPredecessorPhase(null);
                              setEditCurrentWeight(profileWeightLbs);
                              setEditCurrentBodyFat(profileBodyFat);
                              setNewPhaseStart(new Date().toISOString().split('T')[0]);
                              setCustomMetrics([]);
                            }}
                            className="text-xs text-muted-foreground hover:text-destructive underline mt-1"
                          >
                            Start fresh instead
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
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
                  
                  {/* Step 2: NON-BODY-COMP — Consolidated single-page form */}
                  {wizardStep === 2 && !isBodyCompGoal && (
                    <div className="space-y-5 py-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Phase Name</Label>
                        <Input placeholder={suggestedPhaseName} value={newPhaseName} onChange={(e) => setNewPhaseName(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Leave blank to use: &quot;{suggestedPhaseName}&quot;</p>
                      </div>
                      {(newPhaseGoal === 'health' || newPhaseGoal === 'other') && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">{newPhaseGoal === 'health' ? 'Health Focus Area' : 'Custom Goal Name'}</Label>
                          <Input placeholder={newPhaseGoal === 'health' ? 'e.g., Blood sugar management, Gut health' : 'e.g., Competition prep, Travel phase'} value={customGoalName} onChange={(e) => setCustomGoalName(e.target.value)} />
                        </div>
                      )}
                      <Separator />
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-[#c19962]" /> Phase Timeline</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Start Date</Label><Input type="date" value={newPhaseStart} onChange={(e) => setNewPhaseStart(e.target.value)} className="h-9" /></div>
                          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">End Date</Label><Input type="date" value={newPhaseEnd} onChange={(e) => setNewPhaseEnd(e.target.value)} className="h-9" /></div>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <span className="font-medium">Duration</span>
                          <Badge className="bg-[#c19962]">{calculatedTimeline.weeks} weeks</Badge>
                        </div>
                      </div>
                      <Separator />
                      {newPhaseGoal === 'performance' && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-green-100"><Zap className="h-5 w-5 text-green-700" /></div>
                            <div><Label className="text-sm font-semibold">Performance Metrics</Label><p className="text-xs text-muted-foreground">Define your primary performance goals</p></div>
                          </div>
                          {customMetrics.length > 0 && (
                            <div className="space-y-2">
                              {customMetrics.map((metric) => (
                                <div key={metric.id} className="flex items-center gap-3 p-3 border rounded-lg bg-green-50/50 border-green-200">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1"><span className="font-semibold text-sm">{metric.name}</span><Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-300">{metric.unit}</Badge></div>
                                    <div className="flex items-center gap-4 text-xs"><span className="text-muted-foreground">Start: <strong className="text-foreground">{metric.startValue || '—'}</strong></span><ArrowRight className="h-3 w-3 text-green-600" /><span className="text-green-700">Target: <strong>{metric.targetValue || '—'}</strong></span></div>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => handleRemoveCustomMetric(metric.id)}><XIcon className="h-4 w-4" /></Button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="p-4 border-2 border-dashed border-green-200 rounded-lg bg-green-50/30 space-y-3">
                            <p className="text-xs font-medium text-green-700">Add Performance Metric</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Metric Name</Label><Input placeholder="e.g., Squat 1RM" value={newMetricName} onChange={(e) => setNewMetricName(e.target.value)} className="h-9" /></div>
                              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Unit</Label><Input placeholder="e.g., lbs, min" value={newMetricUnit} onChange={(e) => setNewMetricUnit(e.target.value)} className="h-9" /></div>
                              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Current Value</Label><Input placeholder="Starting point" value={newMetricStart} onChange={(e) => setNewMetricStart(e.target.value)} className="h-9" /></div>
                              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Target Value</Label><Input placeholder="Goal to achieve" value={newMetricTarget} onChange={(e) => setNewMetricTarget(e.target.value)} className="h-9" /></div>
                            </div>
                            <Button variant="default" size="sm" onClick={handleAddCustomMetric} className="w-full h-9 bg-green-600 hover:bg-green-700" disabled={!newMetricName.trim()}><Plus className="h-4 w-4 mr-2" /> Add Metric</Button>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Quick Add:</p>
                            <div className="flex flex-wrap gap-1">
                              {[{ name: 'Squat 1RM', unit: 'lbs' }, { name: 'Bench 1RM', unit: 'lbs' }, { name: 'Deadlift 1RM', unit: 'lbs' }, { name: 'Total (SBD)', unit: 'lbs' }, { name: 'VO2 Max', unit: 'ml/kg/min' }, { name: 'Mile Time', unit: 'min:sec' }, { name: 'Vertical Jump', unit: 'in' }, { name: '40 Yard Dash', unit: 'sec' }, { name: 'FTP', unit: 'watts' }, { name: 'RHR', unit: 'bpm' }, { name: 'HRV', unit: 'ms' }].map((p) => (
                                <button key={p.name} type="button" onClick={() => { setNewMetricName(p.name); setNewMetricUnit(p.unit); }} className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors", newMetricName === p.name ? "bg-green-100 border-green-400 text-green-700" : "hover:bg-green-50 hover:border-green-300")}>{p.name}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {(newPhaseGoal === 'health' || newPhaseGoal === 'other') && (
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold flex items-center gap-2">{newPhaseGoal === 'health' ? <Heart className="h-4 w-4 text-rose-600" /> : <Target className="h-4 w-4" />} {newPhaseGoal === 'health' ? 'Health Markers' : 'Custom Metrics'}</Label>
                          {customMetrics.length > 0 && (
                            <div className="space-y-2">
                              {customMetrics.map((metric) => (
                                <div key={metric.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                                  <div className="flex-1 grid grid-cols-4 gap-2 text-xs">
                                    <div><span className="text-muted-foreground">Metric:</span><p className="font-medium">{metric.name}</p></div>
                                    <div><span className="text-muted-foreground">Start:</span><p className="font-medium">{metric.startValue || '—'} {metric.unit}</p></div>
                                    <div><span className="text-muted-foreground">Target:</span><p className="font-medium text-[#c19962]">{metric.targetValue || '—'} {metric.unit}</p></div>
                                    <div className="flex items-center justify-end"><Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500" onClick={() => handleRemoveCustomMetric(metric.id)}><XIcon className="h-4 w-4" /></Button></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="p-3 border border-dashed rounded-lg space-y-2">
                            <div className="grid grid-cols-4 gap-2">
                              <Input placeholder="Metric name" value={newMetricName} onChange={(e) => setNewMetricName(e.target.value)} className="h-8 text-xs" />
                              <Input placeholder="Start value" value={newMetricStart} onChange={(e) => setNewMetricStart(e.target.value)} className="h-8 text-xs" />
                              <Input placeholder="Target" value={newMetricTarget} onChange={(e) => setNewMetricTarget(e.target.value)} className="h-8 text-xs" />
                              <Input placeholder="Unit" value={newMetricUnit} onChange={(e) => setNewMetricUnit(e.target.value)} className="h-8 text-xs" />
                            </div>
                            <Button variant="outline" size="sm" onClick={handleAddCustomMetric} className="w-full h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Add Metric</Button>
                          </div>
                          {newPhaseGoal === 'health' && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs text-muted-foreground mr-2">Quick add:</span>
                              {[{ name: 'A1C', unit: '%' }, { name: 'Fasting Glucose', unit: 'mg/dL' }, { name: 'LDL', unit: 'mg/dL' }, { name: 'HDL', unit: 'mg/dL' }, { name: 'Triglycerides', unit: 'mg/dL' }, { name: 'Blood Pressure', unit: 'mmHg' }, { name: 'RHR', unit: 'bpm' }, { name: 'Sleep Quality', unit: 'score' }].map((p) => (
                                <button key={p.name} type="button" onClick={() => { setNewMetricName(p.name); setNewMetricUnit(p.unit); }} className="text-xs px-2 py-0.5 rounded-full border hover:bg-muted transition-colors">{p.name}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <Separator />
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <div><Label className="text-sm font-medium">Include Nutrition Targets</Label><p className="text-xs text-muted-foreground">Optionally set body composition goals for this phase</p></div>
                        </div>
                        <button type="button" role="switch" aria-checked={includeNutritionTargets} onClick={() => setIncludeNutritionTargets(!includeNutritionTargets)}
                          className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors", includeNutritionTargets ? "bg-[#c19962]" : "bg-muted")}>
                          <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform", includeNutritionTargets ? "translate-x-5" : "translate-x-0")} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: BODY COMP — Goal-specific Targets (4-step wizard) */}
                  {wizardStep === 2 && isBodyCompGoal && (
                    <div className="space-y-6 py-4">
                      {/* BODY COMP SECTIONS */}
                      {isBodyCompGoal && (
                        <>
                      {/* Compact body comp sub-selector when entering from category row */}
                      {createPhaseCategory === 'body_comp' && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Goal Type</Label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setNewPhaseGoal('fat_loss')}
                              className={cn(
                                "flex-1 flex items-center gap-2 p-2.5 border rounded-lg text-xs font-medium transition-all",
                                newPhaseGoal === 'fat_loss' && "border-orange-400 bg-orange-50 text-orange-700"
                              )}
                            >
                              <TrendingDown className="h-3.5 w-3.5" />
                              Fat Loss
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewPhaseGoal('muscle_gain')}
                              className={cn(
                                "flex-1 flex items-center gap-2 p-2.5 border rounded-lg text-xs font-medium transition-all",
                                newPhaseGoal === 'muscle_gain' && "border-blue-400 bg-blue-50 text-blue-700"
                              )}
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                              Muscle Gain
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewPhaseGoal('recomposition')}
                              className={cn(
                                "flex-1 flex items-center gap-2 p-2.5 border rounded-lg text-xs font-medium transition-all",
                                newPhaseGoal === 'recomposition' && "border-purple-400 bg-purple-50 text-purple-700"
                              )}
                            >
                              <Scale className="h-3.5 w-3.5" />
                              Recomp
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Current Stats - Editable */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Scale className="h-4 w-4" />
                            {predecessorPhase 
                              ? `Starting Body Composition (projected from ${predecessorPhase.name})`
                              : 'Current Body Composition'
                            }
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
                            <NumericInput
                              value={editCurrentWeight}
                              onChange={(v) => setEditCurrentWeight(v ?? 0)}
                              min={50}
                              max={600}
                              step={0.1}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Body Fat %</Label>
                            <NumericInput
                              value={editCurrentBodyFat}
                              onChange={(v) => setEditCurrentBodyFat(v ?? 0)}
                              min={2}
                              max={60}
                              step={0.1}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Height (ft)</Label>
                            <NumericInput
                              value={editCurrentHeightFt}
                              onChange={(v) => setEditCurrentHeightFt(v ?? 0)}
                              min={3}
                              max={8}
                              step={1}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Height (in)</Label>
                            <NumericInput
                              value={editCurrentHeightIn}
                              onChange={(v) => setEditCurrentHeightIn(v ?? 0)}
                              min={0}
                              max={11}
                              step={1}
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
                        </>
                      )}
                      
                      {/* Target Body Composition - Only when body comp is enabled */}
                      {(isBodyCompGoal || includeNutritionTargets) && (
                        <>
                      <Separator />
                      
                      {/* Target Section - With optional label for performance goals */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold flex items-center gap-2 text-[#c19962]">
                            <Target className="h-4 w-4" />
                            {'Target Body Composition'}
                          </Label>
                          <Select value={targetMode} onValueChange={(v) => setTargetMode(v as typeof targetMode)}>
                            <SelectTrigger className="w-36 h-7 text-xs">
                              <SelectValue placeholder="Set by..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="independent">Fat Loss / Muscle Gain</SelectItem>
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

                          {targetMode === 'independent' && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <Label className="flex items-center gap-1.5">
                                    <Flame className="h-3.5 w-3.5 text-orange-500" />
                                    Fat to Lose (lbs)
                                  </Label>
                                  <span className="font-medium text-orange-500">{fatToLose.toFixed(1)} lbs</span>
                                </div>
                                <NumericInput
                                  value={fatToLose}
                                  onChange={(v) => {
                                    const val = v ?? 0;
                                    setFatToLose(val);
                                    updateTargetsFromIndependent(val, muscleToGain);
                                  }}
                                  min={0}
                                  max={currentFatMassLbs}
                                  step={0.5}
                                  suffix="lbs"
                                  className="h-9"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Current FM: {currentFatMassLbs.toFixed(1)} lbs → Goal: {Math.max(0, currentFatMassLbs - fatToLose).toFixed(1)} lbs
                                </p>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <Label className="flex items-center gap-1.5">
                                    <Dumbbell className="h-3.5 w-3.5 text-blue-500" />
                                    Muscle to Gain (lbs)
                                  </Label>
                                  <span className="font-medium text-blue-500">{muscleToGain.toFixed(1)} lbs</span>
                                </div>
                                <NumericInput
                                  value={muscleToGain}
                                  onChange={(v) => {
                                    const val = v ?? 0;
                                    setMuscleToGain(val);
                                    updateTargetsFromIndependent(fatToLose, val);
                                  }}
                                  min={0}
                                  max={20}
                                  step={0.5}
                                  suffix="lbs"
                                  className="h-9"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Current FFM: {currentFFMLbs.toFixed(1)} lbs → Goal: {(currentFFMLbs + muscleToGain).toFixed(1)} lbs
                                </p>
                              </div>
                              <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                Net weight change: {(muscleToGain - fatToLose) >= 0 ? '+' : ''}{(muscleToGain - fatToLose).toFixed(1)} lbs
                                ({currentWeightLbs.toFixed(0)} → {(currentWeightLbs - fatToLose + muscleToGain).toFixed(1)} lbs)
                              </div>
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
                        </>
                      )}
                      
                    </div>
                  )}
                  
                  {/* Step 3: Timeline */}
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
                                      <NumericInput
                                        value={rateOfChange}
                                        onChange={(v) => setRateOfChange(v ?? 0.5)}
                                        step={0.05}
                                        min={0.1}
                                        max={1.5}
                                        className="h-8 w-16 text-center font-bold text-sm p-1"
                                        suffix="%"
                                      />
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
                                      <NumericInput
                                        value={rateOfChange}
                                        onChange={(v) => setRateOfChange(v ?? 0.25)}
                                        step={0.05}
                                        min={0.1}
                                        max={0.75}
                                        className="h-8 w-16 text-center font-bold text-sm p-1"
                                        suffix="%"
                                      />
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
                                    { bias: 'maintenance' as const, rate: 0, label: 'Maintenance', desc: 'Steady recomp', color: 'green', recommended: true },
                                    { bias: 'deficit' as const, rate: 0.15, label: 'Slight Deficit', desc: 'Fat loss focus', color: 'blue', recommended: false },
                                    { bias: 'surplus' as const, rate: 0.15, label: 'Slight Surplus', desc: 'Muscle focus', color: 'purple', recommended: false },
                                  ].map((preset) => (
                                    <button
                                      key={preset.bias}
                                      type="button"
                                      onClick={() => {
                                        setRecompBias(preset.bias);
                                        setRateOfChange(preset.rate);
                                      }}
                                      className={cn(
                                        "p-3 rounded-lg border-2 text-center transition-all relative",
                                        recompBias === preset.bias
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
                                        {preset.bias === 'maintenance' ? '0%' : preset.bias === 'deficit' ? `-${preset.rate}%` : `+${preset.rate}%`}
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
                                      <NumericInput
                                        value={rateOfChange}
                                        onChange={(v) => setRateOfChange(v ?? 0)}
                                        step={0.05}
                                        min={0}
                                        max={0.25}
                                        className="h-8 w-16 text-center font-bold text-sm p-1"
                                        suffix="%"
                                      />
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
                          
                          {/* Phase Duration Selector for Body Comp Goals */}
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-[#c19962]/20">
                                <Clock className="h-4 w-4 text-[#c19962]" />
                              </div>
                              <div>
                                <Label className="text-sm font-semibold">Phase Duration</Label>
                                <p className="text-xs text-muted-foreground">Select duration or let it calculate from rate</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { weeks: 4, label: 'Mini Cut/Bulk', desc: 'Short intensive' },
                                { weeks: 8, label: 'Standard', desc: 'Recommended' },
                                { weeks: 12, label: 'Extended', desc: 'Full transformation' },
                              ].map((preset) => (
                                <button
                                  key={preset.weeks}
                                  type="button"
                                  onClick={() => {
                                    setManualDurationWeeks(preset.weeks);
                                    const start = new Date(newPhaseStart);
                                    const end = new Date(start);
                                    end.setDate(end.getDate() + (preset.weeks * 7));
                                    setNewPhaseEnd(end.toISOString().split('T')[0]);
                                  }}
                                  className={cn(
                                    "p-3 rounded-lg border-2 text-center transition-all relative",
                                    calculatedTimeline.weeks === preset.weeks
                                      ? "border-[#c19962] bg-[#c19962]/10 ring-2 ring-[#c19962]/30"
                                      : "hover:border-[#c19962]/50 hover:bg-[#c19962]/5"
                                  )}
                                >
                                  {preset.weeks === 8 && (
                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-[#c19962] text-white px-2 py-0.5 rounded-full font-medium">
                                      Recommended
                                    </span>
                                  )}
                                  <p className="font-bold text-lg text-[#00263d]">{preset.weeks}</p>
                                  <p className="text-xs font-medium">{preset.label}</p>
                                  <p className="text-[10px] text-muted-foreground">{preset.desc}</p>
                                </button>
                              ))}
                              
                              {/* Custom Weeks Input */}
                              <div className={cn(
                                "p-3 rounded-lg border-2 text-center transition-all relative flex flex-col justify-center",
                                manualDurationWeeks !== null && ![4, 8, 12].includes(manualDurationWeeks)
                                  ? "border-[#c19962] bg-[#c19962]/10 ring-2 ring-[#c19962]/30"
                                  : "hover:border-[#c19962]/50"
                              )}>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Custom</p>
                                <div className="flex items-center justify-center gap-1">
                                  <NumericInput
                                    value={manualDurationWeeks ?? calculatedTimeline.weeks}
                                    onChange={(v) => {
                                      const weeks = Math.max(1, Math.min(52, v ?? 1));
                                      setManualDurationWeeks(weeks);
                                      const start = new Date(newPhaseStart);
                                      const end = new Date(start);
                                      end.setDate(end.getDate() + (weeks * 7));
                                      setNewPhaseEnd(end.toISOString().split('T')[0]);
                                    }}
                                    min={1}
                                    max={52}
                                    className="h-8 w-14 text-center font-bold text-sm p-1"
                                  />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">weeks</p>
                              </div>
                            </div>
                            
                            {/* Projected Change Preview */}
                            {calculatedTimeline.weeklyChangeLbs && (
                              <div className="p-3 rounded-lg bg-gradient-to-r from-[#c19962]/10 to-[#00263d]/5 border border-[#c19962]/30">
                                <div className="flex items-center justify-between text-sm mb-2">
                                  <span className="font-medium text-[#00263d]">Projected Outcome</span>
                                  <Badge className="bg-[#c19962] text-white">{calculatedTimeline.weeks} weeks</Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                  <div>
                                    <p className="text-lg font-bold text-[#00263d]">{editCurrentWeight.toFixed(0)}</p>
                                    <p className="text-[10px] text-muted-foreground">Start (lbs)</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-[#c19962]">
                                      {newPhaseGoal === 'fat_loss' ? '→' : newPhaseGoal === 'muscle_gain' ? '→' : '↔'}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {(calculatedTimeline.totalChange ?? 0) > 0 ? '+' : ''}{calculatedTimeline.totalChange ?? 0} lbs
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-[#00263d]">{targetWeightLbs.toFixed(0)}</p>
                                    <p className="text-[10px] text-muted-foreground">Target (lbs)</p>
                                  </div>
                                </div>
                                
                                {/* Projection Chart */}
                                <div className="mt-4 pt-3 border-t border-[#c19962]/20">
                                  <p className="text-xs font-medium text-[#00263d] mb-2">Weight Projection</p>
                                  <div className="relative h-24 bg-white rounded-lg border overflow-hidden">
                                    <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
                                      {/* Grid lines */}
                                      {[0, 25, 50, 75, 100].map((pct) => (
                                        <line key={pct} x1={pct * 3} y1="0" x2={pct * 3} y2="80" stroke="#e5e7eb" strokeWidth="1" />
                                      ))}
                                      {[0, 40, 80].map((y) => (
                                        <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#e5e7eb" strokeWidth="1" />
                                      ))}
                                      
                                      {/* Projection line */}
                                      {(() => {
                                        const startWeight = editCurrentWeight;
                                        const endWeight = targetWeightLbs;
                                        const minW = Math.min(startWeight, endWeight) - 5;
                                        const maxW = Math.max(startWeight, endWeight) + 5;
                                        const range = maxW - minW;
                                        const startY = 75 - ((startWeight - minW) / range) * 70;
                                        const endY = 75 - ((endWeight - minW) / range) * 70;
                                        
                                        return (
                                          <>
                                            {/* Area under curve */}
                                            <path
                                              d={`M 0 ${startY} L 300 ${endY} L 300 80 L 0 80 Z`}
                                              fill={newPhaseGoal === 'fat_loss' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)'}
                                            />
                                            {/* Projection line */}
                                            <line
                                              x1="0"
                                              y1={startY}
                                              x2="300"
                                              y2={endY}
                                              stroke={newPhaseGoal === 'fat_loss' ? '#22c55e' : '#3b82f6'}
                                              strokeWidth="3"
                                              strokeLinecap="round"
                                            />
                                            {/* Start point */}
                                            <circle cx="0" cy={startY} r="5" fill="#00263d" />
                                            {/* End point */}
                                            <circle cx="300" cy={endY} r="5" fill="#c19962" />
                                          </>
                                        );
                                      })()}
                                    </svg>
                                    
                                    {/* Labels */}
                                    <div className="absolute top-1 left-2 text-[9px] font-medium text-slate-500">
                                      {editCurrentWeight.toFixed(0)} lbs
                                    </div>
                                    <div className="absolute bottom-1 left-2 text-[9px] text-slate-400">
                                      Week 0
                                    </div>
                                    <div className="absolute top-1 right-2 text-[9px] font-medium text-[#c19962]">
                                      {targetWeightLbs.toFixed(0)} lbs
                                    </div>
                                    <div className="absolute bottom-1 right-2 text-[9px] text-slate-400">
                                      Week {calculatedTimeline.weeks}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
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
                          {predecessorPhase && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Follows</span>
                              <span className="font-medium text-[#c19962]">{predecessorPhase.name}</span>
                            </div>
                          )}
                          
                          {/* Starting vs Target comparison when building on predecessor */}
                          {predecessorPhase && (newPhaseGoal === 'fat_loss' || newPhaseGoal === 'muscle_gain' || newPhaseGoal === 'recomposition') && (
                            <div className="p-2 rounded bg-[#c19962]/5 border border-[#c19962]/20 text-xs space-y-1">
                              <div className="font-medium text-[#00263d]">Starting → Target</div>
                              <div className="grid grid-cols-2 gap-x-4">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Weight</span>
                                  <span>{editCurrentWeight} → <strong>{targetWeightLbs.toFixed(1)}</strong> lbs</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Body Fat</span>
                                  <span>{editCurrentBodyFat}% → <strong>{targetBodyFat.toFixed(1)}%</strong></span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <Separator />
                          
                          {/* BODY COMPOSITION GOALS: Show targets */}
                          {(isBodyCompGoal || includeNutritionTargets) && (
                            <>
                              {!isBodyCompGoal && (
                                <p className="text-xs font-medium text-[#c19962] uppercase tracking-wide">Nutrition Targets (included)</p>
                              )}
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Target Weight</span>
                                <span className="font-medium">{targetWeightLbs.toFixed(1)} lbs</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Target Body Fat</span>
                                <span className="font-medium">{targetBodyFat.toFixed(1)}%</span>
                              </div>
                              {isBodyCompGoal && (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Rate of Change</span>
                                    <span className="font-medium">{rateOfChange.toFixed(2)}% BW/week</span>
                                  </div>
                                  <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                                    <strong>Projected change:</strong> {Math.abs(currentWeightLbs - targetWeightLbs).toFixed(1)} lbs over {calculatedTimeline.weeks} weeks
                                  </div>
                                </>
                              )}
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
                              {!includeNutritionTargets && (
                                <div className="flex justify-between text-xs pt-2">
                                  <span className="text-muted-foreground">Nutrition targets</span>
                                  <span className="text-muted-foreground italic">Not included</span>
                                </div>
                              )}
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
                      type="button"
                      variant="outline" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (wizardStep === 1 || (wizardStep === 2 && createPhaseCategory)) {
                          handleDialogClose(false);
                        } else {
                          setWizardStep(Math.max(1, wizardStep - 1));
                        }
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      {wizardStep === 1 || (wizardStep === 2 && createPhaseCategory) ? 'Cancel' : 'Back'}
                    </Button>
                    
                    {wizardStep < totalWizardSteps ? (
                      <Button 
                        type="button"
                        onClick={() => setWizardStep(wizardStep + 1)} 
                        className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                      >
                        Next
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button 
                        type="button"
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
                          <NumericInput
                            value={targetWeightLbs}
                            onChange={(v) => updateTargetsFromWeight(v ?? currentWeightLbs)}
                            min={80}
                            max={500}
                            step={0.5}
                            className="h-10"
                            suffix="lbs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Target Body Fat %</Label>
                          <NumericInput
                            value={targetBodyFat}
                            onChange={(v) => updateTargetsFromBF(v ?? currentBodyFat)}
                            min={3}
                            max={50}
                            step={0.5}
                            className="h-10"
                            suffix="%"
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
                    onCreatePhase={handleCreatePhaseForCategory}
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
          
          {/* Phases Section - Grouped by Category */}
          {activeSection === 'phases' && (
            <div className="space-y-6">
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
              
              {PHASE_CATEGORY_ROWS.map(catRow => {
                const categoryPhases = sortedPhases.filter(p => catRow.goals.includes(p.goalType));
                
                return (
                  <div key={catRow.id} className="space-y-2">
                    {/* Category Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{catRow.icon}</span>
                        <span className="text-sm font-semibold">{catRow.label}</span>
                        {categoryPhases.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">{categoryPhases.length}</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-[#c19962]"
                        onClick={() => handleCreatePhaseForCategory(catRow.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    
                    {categoryPhases.length === 0 ? (
                      <button
                        className="w-full py-4 rounded-lg border-2 border-dashed border-border/40 text-sm text-muted-foreground/50 hover:border-[#c19962]/40 hover:text-[#c19962]/60 transition-colors cursor-pointer"
                        onClick={() => handleCreatePhaseForCategory(catRow.id)}
                      >
                        + Add {catRow.label} Phase
                      </button>
                    ) : (
                      <div className="space-y-2">
                        {categoryPhases.map((phase) => {
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
                                    {(phase.targetWeightLbs > 0 || phase.targetBodyFat > 0) && (
                                      <div className="text-right">
                                        {phase.targetWeightLbs > 0 && <div className="text-sm font-semibold">{phase.targetWeightLbs} lbs</div>}
                                        {phase.targetBodyFat > 0 && <div className="text-xs text-muted-foreground">{phase.targetBodyFat}% BF</div>}
                                      </div>
                                    )}
                                    {phase.customMetrics && phase.customMetrics.length > 0 && !phase.targetWeightLbs && (
                                      <div className="text-right">
                                        <div className="text-xs text-muted-foreground">{phase.customMetrics.length} metric{phase.customMetrics.length !== 1 ? 's' : ''}</div>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-[#c19962] hover:text-[#c19962] hover:bg-[#c19962]/10"
                                            onClick={() => handleOpenCheckIn(phase.id)}
                                          >
                                            <Scale className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Record Check-In</TooltipContent>
                                      </Tooltip>
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
                          
                          {/* Progress Tracking Chart - Show if check-ins exist */}
                          {(phase.checkIns && phase.checkIns.length > 0) && (
                            <div className="mt-4 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <Activity className="h-3.5 w-3.5" />
                                  Progress Tracking
                                </p>
                                <Badge variant="outline" className="text-[10px]">
                                  {phase.checkIns.length} check-in{phase.checkIns.length > 1 ? 's' : ''}
                                </Badge>
                              </div>
                              
                              {/* Progress Chart */}
                              <div className="relative h-20 bg-muted/30 rounded-lg overflow-hidden">
                                <svg className="w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
                                  {/* Calculate chart data */}
                                  {(() => {
                                    const startWeight = phase.startingWeightLbs || editCurrentWeight;
                                    const targetWeight = phase.targetWeightLbs;
                                    const checkIns = phase.checkIns || [];
                                    const totalWeeks = duration;
                                    
                                    // Calculate min/max for Y axis
                                    const allWeights = [startWeight, targetWeight, ...checkIns.map(c => c.weight).filter(Boolean) as number[]];
                                    const minW = Math.min(...allWeights) - 2;
                                    const maxW = Math.max(...allWeights) + 2;
                                    const range = maxW - minW || 1;
                                    
                                    const getY = (weight: number) => 55 - ((weight - minW) / range) * 50;
                                    const getX = (week: number) => (week / totalWeeks) * 290 + 5;
                                    
                                    // Projected line points
                                    const projectedStartY = getY(startWeight);
                                    const projectedEndY = getY(targetWeight);
                                    
                                    // Check-in points
                                    const checkInPoints = checkIns
                                      .filter(c => c.weight)
                                      .map(c => ({
                                        x: getX(c.weekNumber),
                                        y: getY(c.weight!),
                                        weight: c.weight!,
                                        week: c.weekNumber,
                                      }));
                                    
                                    return (
                                      <>
                                        {/* Projected line (dashed) */}
                                        <line
                                          x1="5"
                                          y1={projectedStartY}
                                          x2="295"
                                          y2={projectedEndY}
                                          stroke="#94a3b8"
                                          strokeWidth="2"
                                          strokeDasharray="4 4"
                                        />
                                        
                                        {/* Actual progress line (if 2+ check-ins) */}
                                        {checkInPoints.length >= 2 && (
                                          <polyline
                                            points={[{ x: 5, y: projectedStartY }, ...checkInPoints].map(p => `${p.x},${p.y}`).join(' ')}
                                            fill="none"
                                            stroke="#c19962"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        )}
                                        
                                        {/* Check-in points */}
                                        {checkInPoints.map((point, i) => (
                                          <g key={i}>
                                            <circle cx={point.x} cy={point.y} r="4" fill="#c19962" />
                                            <circle cx={point.x} cy={point.y} r="2" fill="white" />
                                          </g>
                                        ))}
                                        
                                        {/* Start point */}
                                        <circle cx="5" cy={projectedStartY} r="3" fill="#64748b" />
                                        
                                        {/* Target point */}
                                        <circle cx="295" cy={projectedEndY} r="3" fill="#22c55e" stroke="#22c55e" strokeWidth="1" />
                                      </>
                                    );
                                  })()}
                                </svg>
                                
                                {/* Legend */}
                                <div className="absolute bottom-1 left-2 flex items-center gap-3 text-[9px]">
                                  <span className="flex items-center gap-1">
                                    <span className="w-3 h-0.5 bg-slate-400" style={{ borderStyle: 'dashed' }}></span>
                                    Projected
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="w-3 h-0.5 bg-[#c19962]"></span>
                                    Actual
                                  </span>
                                </div>
                              </div>
                              
                              {/* Latest Check-In Summary */}
                              {phase.checkIns && phase.checkIns.length > 0 && (() => {
                                const latestCheckIn = phase.checkIns[phase.checkIns.length - 1];
                                const projectedAtWeek = getProjectedWeight(phase, latestCheckIn.weekNumber);
                                const diff = latestCheckIn.weight ? latestCheckIn.weight - projectedAtWeek : 0;
                                const isOnTrack = Math.abs(diff) < 1;
                                const isAhead = phase.goalType === 'fat_loss' ? diff < -1 : diff > 1;
                                
                                return (
                                  <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">
                                        Week {latestCheckIn.weekNumber}: {latestCheckIn.weight?.toFixed(1)} lbs
                                      </span>
                                      <span className={cn(
                                        "font-medium",
                                        isOnTrack ? "text-green-600" : isAhead ? "text-blue-600" : "text-amber-600"
                                      )}>
                                        {isOnTrack ? 'On Track' : isAhead ? 'Ahead of Plan' : 'Behind Plan'}
                                        {!isOnTrack && latestCheckIn.weight && (
                                          <span className="ml-1 text-muted-foreground">
                                            ({diff > 0 ? '+' : ''}{diff.toFixed(1)} lbs)
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                      </div>
                    )}
                  </div>
                );
              })}
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
                onSaveTargets={(targets, macroSettings) => handleSavePhaseTargets(activePhase.id, targets, macroSettings)}
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

          {/* Right Toolbar - Cronometer Data Panel */}
          {hasCronometerLink && (
            <div className="w-12 shrink-0">
              <div className="sticky top-8 flex flex-col items-center gap-1 pt-2">
                <p className="text-[10px] font-medium text-muted-foreground tracking-wider [writing-mode:vertical-lr] rotate-180 mb-3 select-none">
                  CRONOMETER
                </p>
                {([
                  { id: 'trends' as const, icon: TrendingUp, label: 'Trends' },
                  { id: 'foodlog' as const, icon: Utensils, label: 'Food Log' },
                  { id: 'biometrics' as const, icon: Heart, label: 'Biometrics' },
                  { id: 'fasting' as const, icon: Clock, label: 'Fasting' },
                  { id: 'targets' as const, icon: Target, label: 'Targets' },
                ]).map(({ id, icon: Icon, label }) => (
                  <Tooltip key={id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => openCronometerModal(id)}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                          activeCronometerModal === id
                            ? "bg-[#c19962] text-[#00263d]"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">{label}</TooltipContent>
                  </Tooltip>
                ))}
                {isFetchingCronometer && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mt-2" />
                )}
              </div>
            </div>
          )}

          </div>
          
          {/* Phase Targets Modal - Full Screen on Desktop */}
          <Dialog open={showTargetsModal} onOpenChange={setShowTargetsModal}>
            <DialogContent className="w-[99vw] max-w-[1900px] sm:max-w-[1900px] h-[96vh] flex flex-col p-0 gap-0 overflow-hidden" showCloseButton={false}>
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
              <div className="flex-1 overflow-y-auto overflow-x-auto p-6 min-h-0">
                {selectedPhaseForTargets && isHydrated && (
                  <div className="max-w-[1600px] mx-auto">
                    <PhaseTargetsEditor
                      phase={selectedPhaseForTargets}
                      userProfile={userProfile}
                      weeklySchedule={weeklySchedule}
                      onSaveTargets={(targets, macroSettings) => {
                        handleSavePhaseTargets(selectedPhaseForTargets.id, targets, macroSettings);
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

          {/* ============ CRONOMETER DATA MODALS ============ */}

          {/* Trends Modal */}
          <Dialog open={activeCronometerModal === 'trends'} onOpenChange={(open) => !open && setActiveCronometerModal(null)}>
            <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#c19962]" />
                  Nutrition Trends
                </DialogTitle>
                <DialogDescription>
                  {activeClient?.cronometerClientName || 'Client'} &mdash; {format(cronometerDateRange.from, 'MMM d')} to {format(cronometerDateRange.to, 'MMM d, yyyy')}
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 mb-4">
                {[7, 14, 21, 30, 60].map(n => (
                  <Button key={n} variant="ghost" size="sm"
                    className={cn("h-7 text-xs", Math.round((cronometerDateRange.to.getTime() - cronometerDateRange.from.getTime()) / 86400000) === n && "bg-[#c19962]/10 text-[#c19962]")}
                    onClick={() => { setCronometerDateRange({ from: subDays(new Date(), n), to: new Date() }); setTimeout(fetchCronometerDashboard, 50); }}
                  >{n}d</Button>
                ))}
                <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={fetchCronometerDashboard} disabled={isFetchingCronometer}>
                  {isFetchingCronometer ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                </Button>
              </div>
              {!cronometerData ? (
                <div className="py-12 text-center text-muted-foreground">
                  {isFetchingCronometer ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'No data loaded'}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Averages Summary */}
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { label: 'Calories', value: cronometerData.averages.calories, unit: 'kcal' },
                      { label: 'Protein', value: cronometerData.averages.protein, unit: 'g' },
                      { label: 'Carbs', value: cronometerData.averages.carbs, unit: 'g' },
                      { label: 'Fat', value: cronometerData.averages.fat, unit: 'g' },
                      { label: 'Fiber', value: cronometerData.averages.fiber, unit: 'g' },
                    ].map(m => (
                      <div key={m.label} className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                        <p className="text-lg font-bold">{Math.round(m.value)}</p>
                        <p className="text-xs text-muted-foreground">{m.unit}/day avg</p>
                      </div>
                    ))}
                  </div>
                  {/* Calorie Trend */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Calorie Trend</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={cronometerData.trendData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="date" tickFormatter={v => { try { return format(new Date(v), 'M/d'); } catch { return v; } }} fontSize={10} />
                            <YAxis fontSize={10} />
                            <RechartsTooltip />
                            <Area type="monotone" dataKey="calories" stroke={CHART_COLORS.gold} fill={CHART_COLORS.gold} fillOpacity={0.2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Macro Trends */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Macronutrient Trends</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={cronometerData.trendData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="date" tickFormatter={v => { try { return format(new Date(v), 'M/d'); } catch { return v; } }} fontSize={10} />
                            <YAxis fontSize={10} />
                            <RechartsTooltip />
                            <Legend />
                            <Line type="monotone" dataKey="protein" stroke={CHART_COLORS.red} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="carbs" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="fat" stroke={CHART_COLORS.yellow} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Macro Distribution Pie */}
                  {cronometerData.macroDistribution.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Average Macro Distribution</CardTitle></CardHeader>
                      <CardContent>
                        <div className="h-[180px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={cronometerData.macroDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} ${value}%`}>
                                {cronometerData.macroDistribution.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Food Log Modal */}
          <Dialog open={activeCronometerModal === 'foodlog'} onOpenChange={(open) => !open && setActiveCronometerModal(null)}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-[#c19962]" />
                  Food Log
                </DialogTitle>
                <DialogDescription>
                  Recent daily food entries from Cronometer
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 mb-4">
                {[7, 14, 21, 30].map(n => (
                  <Button key={n} variant="ghost" size="sm"
                    className={cn("h-7 text-xs", Math.round((cronometerDateRange.to.getTime() - cronometerDateRange.from.getTime()) / 86400000) === n && "bg-[#c19962]/10 text-[#c19962]")}
                    onClick={() => { setCronometerDateRange({ from: subDays(new Date(), n), to: new Date() }); setTimeout(fetchCronometerDashboard, 50); }}
                  >{n}d</Button>
                ))}
                <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={fetchCronometerDashboard} disabled={isFetchingCronometer}>
                  {isFetchingCronometer ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                </Button>
              </div>
              {!cronometerData ? (
                <div className="py-12 text-center text-muted-foreground">
                  {isFetchingCronometer ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'No data loaded'}
                </div>
              ) : (
                <div className="space-y-3">
                  {cronometerData.foodLog.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No food log entries for this period</p>
                  ) : (
                    cronometerData.foodLog.map(day => (
                      <Card key={day.date}>
                        <CardHeader className="pb-2 pt-3 px-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">
                              {(() => { try { return format(new Date(day.date), 'EEE, MMM d'); } catch { return day.date; } })()}
                            </CardTitle>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span><strong className="text-foreground">{day.totalCalories}</strong> kcal</span>
                              <span>P: {day.protein}g</span>
                              <span>C: {day.carbs}g</span>
                              <span>F: {day.fat}g</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          <div className="space-y-2">
                            {day.meals.map((meal, mi) => (
                              <div key={mi} className="text-xs">
                                <div className="flex items-center justify-between font-medium text-muted-foreground mb-0.5">
                                  <span>{meal.name}</span>
                                  <span>{meal.calories} kcal</span>
                                </div>
                                <div className="pl-3 space-y-0.5">
                                  {meal.foods.slice(0, 5).map((f, fi) => (
                                    <p key={fi} className="text-muted-foreground">{f.name} <span className="opacity-60">({f.serving})</span></p>
                                  ))}
                                  {meal.foods.length > 5 && (
                                    <p className="text-muted-foreground opacity-60">+{meal.foods.length - 5} more items</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Biometrics Modal */}
          <Dialog open={activeCronometerModal === 'biometrics'} onOpenChange={(open) => !open && setActiveCronometerModal(null)}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Biometrics
                </DialogTitle>
                <DialogDescription>
                  Weight, body fat, and other tracked metrics from Cronometer
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 mb-4">
                {[30, 60, 90].map(n => (
                  <Button key={n} variant="ghost" size="sm"
                    className={cn("h-7 text-xs", Math.round((cronometerDateRange.to.getTime() - cronometerDateRange.from.getTime()) / 86400000) === n && "bg-[#c19962]/10 text-[#c19962]")}
                    onClick={() => { setCronometerDateRange({ from: subDays(new Date(), n), to: new Date() }); setTimeout(fetchCronometerDashboard, 50); }}
                  >{n}d</Button>
                ))}
                <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={fetchCronometerDashboard} disabled={isFetchingCronometer}>
                  {isFetchingCronometer ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                </Button>
              </div>
              {!cronometerData ? (
                <div className="py-12 text-center text-muted-foreground">
                  {isFetchingCronometer ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'No data loaded'}
                </div>
              ) : cronometerData.biometrics.length === 0 ? (
                <div className="text-center py-12">
                  <Scale className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No biometric data found for this date range</p>
                  <p className="text-xs text-muted-foreground mt-1">Try expanding the date range</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(
                    cronometerData.biometrics.reduce((acc, bio) => {
                      if (!acc[bio.type]) acc[bio.type] = [];
                      acc[bio.type].push(bio);
                      return acc;
                    }, {} as Record<string, typeof cronometerData.biometrics>)
                  ).map(([type, data]) => {
                    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
                    const latest = sorted[sorted.length - 1];
                    const first = sorted[0];
                    const unit = latest?.unit || '';
                    const change = sorted.length >= 2 ? Math.round((latest.value - first.value) * 100) / 100 : null;
                    return (
                      <Card key={type}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{type}</CardTitle>
                            <div className="flex items-center gap-2">
                              {change !== null && (
                                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                                  change > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : change < 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-gray-100 text-gray-600"
                                )}>{change > 0 ? '+' : ''}{change} {unit}</span>
                              )}
                              <span className="text-lg font-bold text-[#c19962]">{latest.value} {unit}</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[120px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={sorted}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="date" tickFormatter={v => { try { return format(new Date(v), 'M/d'); } catch { return v; } }} fontSize={10} />
                                <YAxis fontSize={10} domain={['auto', 'auto']} />
                                <RechartsTooltip />
                                <Line type="monotone" dataKey="value" stroke={CHART_COLORS.gold} strokeWidth={2} dot={{ fill: CHART_COLORS.gold, r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Fasting Modal */}
          <Dialog open={activeCronometerModal === 'fasting'} onOpenChange={(open) => !open && setActiveCronometerModal(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#c19962]" />
                  Fasting History
                </DialogTitle>
                <DialogDescription>
                  Fasting records from Cronometer
                </DialogDescription>
              </DialogHeader>
              {!cronometerData ? (
                <div className="py-12 text-center text-muted-foreground">
                  {isFetchingCronometer ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'No data loaded'}
                </div>
              ) : cronometerData.fasts.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No fasting records found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cronometerData.fasts.map((fast, i) => (
                    <Card key={i}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{fast.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {fast.start} {fast.finish ? `\u2192 ${fast.finish}` : ''}
                            </p>
                            {fast.comments && (
                              <p className="text-xs text-muted-foreground mt-1 italic">{fast.comments}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {fast.ongoing ? (
                              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">Ongoing</Badge>
                            ) : fast.duration ? (
                              <Badge variant="secondary" className="text-xs">{fast.duration}</Badge>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Targets Sync Modal */}
          <Dialog open={activeCronometerModal === 'targets'} onOpenChange={(open) => !open && setActiveCronometerModal(null)}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#c19962]" />
                  Cronometer Targets
                </DialogTitle>
                <DialogDescription>
                  Sync nutrition targets between Fitomics and Cronometer
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Current Cronometer Targets */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <ArrowDownToLine className="h-4 w-4 text-[#c19962]" />
                    Current Cronometer Targets
                  </h4>
                  {cronometerTargets ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: 'Calories', value: cronometerTargets.kcal, unit: 'kcal' },
                          { label: 'Protein', value: cronometerTargets.protein, unit: 'g' },
                          { label: 'Carbs', value: cronometerTargets.total_carbs, unit: 'g' },
                          { label: 'Fat', value: cronometerTargets.fat, unit: 'g' },
                        ].map(t => (
                          <div key={t.label} className="text-center p-3 bg-muted/50 rounded-lg border">
                            <p className="text-xs text-muted-foreground">{t.label}</p>
                            <p className="text-lg font-bold">{t.value != null ? Math.round(t.value) : '—'}</p>
                            <p className="text-xs text-muted-foreground">{t.unit}</p>
                          </div>
                        ))}
                      </div>
                      {activePhase && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            if (!activePhase || !cronometerTargets) return;
                            // Build nutrition targets from Cronometer's values
                            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
                            const cal = Math.round(cronometerTargets.kcal || 0);
                            const newTargets: DayNutritionTargets[] = days.map(day => ({
                              day,
                              isWorkoutDay: false,
                              tdee: cal,
                              targetCalories: cal,
                              protein: Math.round(cronometerTargets.protein || 0),
                              carbs: Math.round(cronometerTargets.total_carbs || 0),
                              fat: Math.round(cronometerTargets.fat || 0),
                            }));
                            updatePhase(activePhase.id, {
                              nutritionTargets: newTargets,
                              updatedAt: new Date().toISOString(),
                            });
                            toast.success('Cronometer targets applied to active phase');
                          }}
                        >
                          <ArrowDownToLine className="h-4 w-4 mr-2" />
                          Apply to Active Phase ({activePhase.name})
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="w-full" onClick={fetchCronometerTargets}>
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Button variant="outline" size="sm" onClick={fetchCronometerTargets}>
                        Load Cronometer Targets
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Push Phase Targets to Cronometer */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <ArrowUpFromLine className="h-4 w-4 text-[#c19962]" />
                    Push Phase Targets to Cronometer
                  </h4>
                  {activePhase ? (
                    <div className="space-y-3">
                      {activePhase.nutritionTargets && activePhase.nutritionTargets.length > 0 ? (
                        <>
                          <div className="grid grid-cols-4 gap-3">
                            {(() => {
                              const t = activePhase.nutritionTargets[0]; // Use first day as representative
                              return [
                                { label: 'Calories', value: t.targetCalories, unit: 'kcal' },
                                { label: 'Protein', value: t.protein, unit: 'g' },
                                { label: 'Carbs', value: t.carbs, unit: 'g' },
                                { label: 'Fat', value: t.fat, unit: 'g' },
                              ].map(m => (
                                <div key={m.label} className="text-center p-3 bg-muted/50 rounded-lg border">
                                  <p className="text-xs text-muted-foreground">{m.label}</p>
                                  <p className="text-lg font-bold">{Math.round(m.value)}</p>
                                  <p className="text-xs text-muted-foreground">{m.unit}</p>
                                </div>
                              ));
                            })()}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={async () => {
                              if (!activeClient?.cronometerClientId || !activePhase?.nutritionTargets?.[0]) return;
                              const t = activePhase.nutritionTargets[0];
                              try {
                                const res = await fetch('/api/cronometer/targets', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    client_id: String(activeClient.cronometerClientId),
                                    calories: t.targetCalories,
                                    protein: t.protein,
                                    carbs: t.carbs,
                                    fat: t.fat,
                                  }),
                                });
                                const data = await res.json();
                                if (data.success) {
                                  toast.success('Targets pushed to Cronometer');
                                } else {
                                  toast.error(data.error || 'Cronometer API does not support setting targets remotely. Please update targets manually in the Cronometer app.');
                                }
                              } catch {
                                toast.error('Failed to push targets. Please update them manually in Cronometer.');
                              }
                            }}
                          >
                            <ArrowUpFromLine className="h-4 w-4 mr-2" />
                            Push to Cronometer
                          </Button>
                          <p className="text-xs text-muted-foreground text-center">
                            Note: Cronometer&apos;s API may not support remote target updates. If this fails, update targets manually in the Cronometer app.
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No nutrition targets set for this phase yet. Set targets in the Nutrition Targets section first.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No active phase selected. Create or select a phase first.
                    </p>
                  )}
                </div>

                {/* Recent Intake vs Targets comparison */}
                {cronometerData && cronometerTargets && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-3">Recent Intake vs Targets</h4>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: 'Calories', avg: cronometerData.averages.calories, target: cronometerTargets.kcal, unit: 'kcal' },
                          { label: 'Protein', avg: cronometerData.averages.protein, target: cronometerTargets.protein, unit: 'g' },
                          { label: 'Carbs', avg: cronometerData.averages.carbs, target: cronometerTargets.total_carbs, unit: 'g' },
                          { label: 'Fat', avg: cronometerData.averages.fat, target: cronometerTargets.fat, unit: 'g' },
                        ].map(c => {
                          const diff = c.target ? Math.round(c.avg - c.target) : null;
                          return (
                            <div key={c.label} className="text-center p-3 rounded-lg border">
                              <p className="text-xs text-muted-foreground">{c.label}</p>
                              <p className="text-sm font-bold">{Math.round(c.avg)}</p>
                              <p className="text-xs text-muted-foreground">of {c.target != null ? Math.round(c.target) : '—'}</p>
                              {diff !== null && (
                                <p className={cn("text-xs font-medium", diff > 0 ? "text-red-500" : diff < 0 ? "text-green-500" : "text-gray-500")}>
                                  {diff > 0 ? '+' : ''}{diff} {c.unit}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
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
