'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// Fitomics Logo URL for PDF
// Must be a full URL for @react-pdf/renderer to access it
const FITOMICS_LOGO_URL = typeof window !== 'undefined' 
  ? `${window.location.origin}/images/fitomics_horizontal_gold.png` 
  : undefined;
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ProgressSteps } from '@/components/layout/progress-steps';
import { ProgressSummary } from '@/components/layout/progress-summary';
import { MealSlotCard, ManualMealForm, MealSwapDialog, RecipeRecommendations } from '@/components/meal-plan';
import { useFitomicsStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { 
  ArrowLeft, 
  Download, 
  Dumbbell, 
  Utensils,
  Sparkles,
  Moon,
  Sun,
  Target,
  CheckCircle,
  Loader2,
  Trash2,
  FileText,
  X,
  Copy,
  ShoppingCart,
  Eye,
  EyeOff,
  ChefHat,
  Calendar,
  Zap,
  Coffee,
  Undo2,
  Redo2,
  Info,
  ChevronRight,
  FileDown,
  ListChecks,
  Book,
  RefreshCw,
  User,
  LayoutList,
  Pill,
  Plus,
  ClipboardCopy,
  Pencil,
  Bookmark,
  PanelLeftClose,
  Globe,
  TrendingUp,
  Heart,
  Clock,
  Scale,
  ArrowDownToLine,
  ArrowUpFromLine,
  Edit2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { DayOfWeek, DayNutritionTargets, MealSlot, Meal, Macros, DietPreferences, SupplementEntry, MealSupplement, CoachLink, FavoriteRecipe, ClientResource } from '@/types';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ============ DEFAULT DISPENSARY & AFFILIATE LINKS ============
const DEFAULT_COACH_LINKS: CoachLink[] = [
  { id: 'fullscript', label: 'Fullscript', url: 'https://us.fullscript.com/welcome/fitomics', color: 'text-emerald-700', bg: 'bg-emerald-50', isDefault: true },
  { id: 'thorne', label: 'Thorne', url: 'https://www.thorne.com/u/fitomics', color: 'text-blue-700', bg: 'bg-blue-50', isDefault: true },
  { id: 'kion', label: 'Kion', url: 'https://glnk.io/j6vy/drcodyhaun', color: 'text-orange-700', bg: 'bg-orange-50', isDefault: true },
  { id: 'amazon', label: 'Amazon', url: 'https://www.amazon.com/shop/drcodyhaun?ref_=cm_sw_r_cp_ud_aipsfshop_TR9BE41CEZHSP4D9XM23', color: 'text-amber-700', bg: 'bg-amber-50', isDefault: true },
  { id: 'elemental', label: 'Elemental Formulations', url: 'https://eformulations.co/?ref=fitomics', color: 'text-purple-700', bg: 'bg-purple-50', isDefault: true },
];

const COACH_LINKS_STORAGE_KEY = 'fitomics_coach_links';

// ============ UTILITY FUNCTIONS ============

// Generate meal slot labels - chronological order
const MEAL_NAMES = ['Breakfast', 'Lunch', 'Dinner', 'Meal 4', 'Meal 5', 'Meal 6'];

const getMealSlotLabels = (mealsCount: number, snacksCount: number) => {
  const labels: { type: 'meal' | 'snack'; label: string }[] = [];
  let mealIdx = 0;
  let snackIdx = 0;
  const totalSlots = mealsCount + snacksCount;

  // Interleave meals and snacks: meal, snack, meal, snack, meal, [remaining snacks]
  // This mirrors the planning step's computeMealSlotTargets logic exactly
  for (let i = 0; i < totalSlots; i++) {
    if (mealIdx < mealsCount && (snackIdx >= snacksCount || i % 2 === 0 || mealIdx <= snackIdx)) {
      labels.push({ type: 'meal', label: MEAL_NAMES[mealIdx] || `Meal ${mealIdx + 1}` });
      mealIdx++;
    } else if (snackIdx < snacksCount) {
      labels.push({ type: 'snack', label: `Snack ${snackIdx + 1}` });
      snackIdx++;
    }
  }
  
  return labels;
};

const parseTimeToMinutes = (t: string): number => {
  const [time, period] = t.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

const getTimeSlots = (wakeTime: string, sleepTime: string, slotCount: number) => {
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };
  
  const wake = parseTimeToMinutes(wakeTime || '7:00 AM');
  const sleep = parseTimeToMinutes(sleepTime || '10:00 PM');
  const awakeMinutes = sleep > wake ? sleep - wake : (24 * 60 - wake) + sleep;
  const interval = Math.floor(awakeMinutes / (slotCount + 1));
  
  return Array(slotCount).fill(0).map((_, i) => formatTime(wake + interval * (i + 1)));
};

const calculateSlotTargets = (
  dayTargets: { targetCalories: number; protein: number; carbs: number; fat: number },
  slotLabels: { type: 'meal' | 'snack'; label: string }[]
): Macros[] => {
  const mealCount = slotLabels.filter(s => s.type === 'meal').length;
  const snackCount = slotLabels.filter(s => s.type === 'snack').length;
  
  const mealPct = mealCount > 0 ? (0.9 - snackCount * 0.1) / mealCount : 0;
  const snackPct = 0.1;
  
  return slotLabels.map(slot => {
    const pct = slot.type === 'meal' ? mealPct : snackPct;
    return {
      calories: Math.round(dayTargets.targetCalories * pct),
      protein: Math.round(dayTargets.protein * pct),
      carbs: Math.round(dayTargets.carbs * pct),
      fat: Math.round(dayTargets.fat * pct),
    };
  });
};

// ============ DAY TYPE GROUPING ============

interface DayType {
  id: string;
  label: string;
  description: string;
  icon: 'workout' | 'rest' | 'active';
  days: DayOfWeek[];
  isWorkoutDay: boolean;
  workoutType?: string;
  mealsCount: number;
  snacksCount: number;
  avgCalories: number;
  avgProtein: number;
}

// ============ CRONOMETER ADAPTIVE TYPES ============

interface CronometerFoodLogEntry {
  date: string;
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: {
    name: string; // "Breakfast", "Lunch", "Dinner", "Snacks"
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    foods: { name: string; serving: string }[];
  }[];
}

interface MealPattern {
  mealGroup: string;
  commonFoods: { name: string; serving: string; frequency: number }[];
  avgMacros: Macros;
  daysSampled: number;
}

export default function MealPlanPage() {
  const router = useRouter();
  const {
    userProfile,
    bodyCompGoals,
    dietPreferences,
    weeklySchedule,
    nutritionTargets: storeNutritionTargets,
    mealPlan: storeMealPlan,
    updateMeal,
    updateMealNote,
    updateMealRationale,
    setMealLocked,
    deleteMeal,
    clearDayMeals,
    clearAllMeals,
    canUndo,
    canRedo,
    undoMealPlan,
    redoMealPlan,
    // Phase-related
    phases,
    activePhaseId,
    getActivePhase,
    updatePhase,
    setNutritionTargets,
    // Client management
    getActiveClient,
    activeClientId,
    // Favorites & Resources
    favoriteRecipes,
    addFavoriteRecipe,
    removeFavoriteRecipe,
    clientResources,
    addClientResource,
    removeClientResource,
  } = useFitomicsStore();
  
  // Get active phase data (if any)
  const activePhase = getActivePhase();
  
  // Use phase data if active, otherwise fall back to store data
  const nutritionTargets = activePhase?.nutritionTargets?.length 
    ? activePhase.nutritionTargets 
    : storeNutritionTargets;
  const mealPlan = activePhase?.mealPlan ?? storeMealPlan;
  
  // State
  const [isHydrated, setIsHydrated] = useState(false);
  const [viewMode, setViewMode] = useState<'day-types' | 'weekly'>('day-types');
  const [selectedDayType, setSelectedDayType] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [generatingSlots, setGeneratingSlots] = useState<Record<number, boolean>>({});
  const [generatingNotes, setGeneratingNotes] = useState<Record<number, boolean>>({});
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [swappingSlot, setSwappingSlot] = useState<number | null>(null);
  const [browsingRecipesSlot, setBrowsingRecipesSlot] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSingleDay, setIsGeneratingSingleDay] = useState(false);
  const [editingDayTargets, setEditingDayTargets] = useState(false);
  const [localDayTargets, setLocalDayTargets] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);
  const [slotTargetOverrides, setSlotTargetOverrides] = useState<Record<string, Macros>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeGroceryList: true,
    includeRecipes: true,
    includeCoverPage: true,
    includeClientProfile: true,
    includeSchedule: true,
    includeNutritionTargets: true,
    includeDietPreferences: true,
    includeMealContext: true,
    exportType: 'full' as 'full' | 'single' | 'custom',
    selectedDay: 'Monday' as DayOfWeek,
    selectedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as DayOfWeek[],
  });
  const cancelGenerationRef = useRef(false);

  // ============ CRONOMETER ADAPTIVE MODE STATE ============
  const activeClient = getActiveClient();
  const cronometerClientId = activeClient?.cronometerClientId;
  const cronometerClientName = activeClient?.cronometerClientName;
  const hasCronometerLink = !!cronometerClientId;
  const [cronometerMode, setCronometerMode] = useState(false);
  const [isFetchingCronometer, setIsFetchingCronometer] = useState(false);
  const [cronometerFoodLog, setCronometerFoodLog] = useState<CronometerFoodLogEntry[] | null>(null);
  const [cronometerDateRange, setCronometerDateRange] = useState<{ start: string; end: string } | null>(null);
  const [adaptiveTips, setAdaptiveTips] = useState<Record<string, { tips: string[]; summary: string; macroGap: Macros } | null>>({});
  const [generatingTips, setGeneratingTips] = useState<Record<number, boolean>>({});
  const [generatingImproved, setGeneratingImproved] = useState<Record<number, boolean>>({});
  // Stable ref to prevent re-fetch on every render
  const cronometerFetchedRef = useRef<number | null>(null);

  // ============ CRONOMETER MODAL STATE (mirrors Planning page) ============
  type CronometerModalType = 'trends' | 'foodlog' | 'biometrics' | 'fasting' | 'targets' | null;
  const [activeCronometerModal, setActiveCronometerModal] = useState<CronometerModalType>(null);
  const [cmDateRange, setCmDateRange] = useState({ from: subDays(new Date(), 21), to: new Date() });
  const [isFetchingCM, setIsFetchingCM] = useState(false);
  const [cmData, setCmData] = useState<{
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
  const [cmTargets, setCmTargets] = useState<{
    kcal: number | null; protein: number | null; total_carbs: number | null; fat: number | null;
  } | null>(null);

  const CHART_COLORS = { gold: '#c19962', red: '#ef4444', blue: '#3b82f6', yellow: '#eab308', green: '#22c55e', purple: '#a855f7' };

  const fetchCMDashboard = useCallback(async () => {
    if (!cronometerClientId) return;
    setIsFetchingCM(true);
    try {
      const params = new URLSearchParams({
        start: format(cmDateRange.from, 'yyyy-MM-dd'),
        end: format(cmDateRange.to, 'yyyy-MM-dd'),
        client_id: String(cronometerClientId),
      });
      const res = await fetch(`/api/cronometer/dashboard?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCmData(data);
      }
    } catch (err) {
      console.error('[MealPlan] Cronometer fetch failed:', err);
    } finally {
      setIsFetchingCM(false);
    }
  }, [cronometerClientId, cmDateRange]);

  const fetchCMTargets = useCallback(async () => {
    if (!cronometerClientId) return;
    try {
      const params = new URLSearchParams({ client_id: String(cronometerClientId) });
      const res = await fetch(`/api/cronometer/targets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCmTargets(data.targets || null);
      }
    } catch (err) {
      console.error('[MealPlan] Cronometer targets fetch failed:', err);
    }
  }, [cronometerClientId]);

  const openCronometerModal = useCallback((modal: CronometerModalType) => {
    setActiveCronometerModal(modal);
    if (!cmData && modal !== 'targets') {
      fetchCMDashboard();
    }
    if (modal === 'targets' && !cmTargets) {
      fetchCMTargets();
      if (!cmData) fetchCMDashboard();
    }
  }, [cmData, cmTargets, fetchCMDashboard, fetchCMTargets]);

  // ============ COACH LINKS (Left Sidebar) ============
  const [coachLinks, setCoachLinks] = useState<CoachLink[]>(DEFAULT_COACH_LINKS);
  const [linksExpanded, setLinksExpanded] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState({ label: '', url: '' });

  // ============ FAVORITES & RESOURCES STATE ============
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [resourcesExpanded, setResourcesExpanded] = useState(true);
  const [addingResourceType, setAddingResourceType] = useState<'link' | 'file' | null>(null);
  const [resourceForm, setResourceForm] = useState({ title: '', url: '', description: '' });
  const [isUploadingResource, setIsUploadingResource] = useState(false);
  const resourceFileInputRef = useRef<HTMLInputElement>(null);

  const handleAddResourceLink = useCallback(() => {
    if (!resourceForm.title.trim() || !resourceForm.url.trim()) {
      toast.error('Please enter a title and URL');
      return;
    }
    addClientResource({
      title: resourceForm.title.trim(),
      url: resourceForm.url.trim(),
      description: resourceForm.description.trim() || undefined,
      type: 'link',
    });
    setAddingResourceType(null);
    setResourceForm({ title: '', url: '', description: '' });
    toast.success('Link added');
  }, [resourceForm, addClientResource]);

  const handleResourceFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeClientId) return;

    setIsUploadingResource(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', activeClientId);

      const response = await fetch('/api/resources/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await response.json();
      
      addClientResource({
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for display name
        url: data.url,
        type: 'file',
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      });
      
      toast.success('File uploaded');
    } catch (error: any) {
      console.error('Resource upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setIsUploadingResource(false);
      // Reset input
      if (resourceFileInputRef.current) resourceFileInputRef.current.value = '';
    }
  }, [activeClientId, addClientResource]);

  // Load coach links from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COACH_LINKS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CoachLink[];
        // Merge: keep defaults, add any custom links
        const defaultIds = new Set(DEFAULT_COACH_LINKS.map(l => l.id));
        const customLinks = parsed.filter(l => !defaultIds.has(l.id));
        // Also keep any edits to default links (url changes)
        const mergedDefaults = DEFAULT_COACH_LINKS.map(d => {
          const edited = parsed.find(p => p.id === d.id);
          return edited ? { ...d, url: edited.url, label: edited.label } : d;
        });
        setCoachLinks([...mergedDefaults, ...customLinks]);
      }
    } catch {
      // Use defaults
    }
  }, []);

  // Persist coach links to localStorage
  const saveCoachLinks = useCallback((links: CoachLink[]) => {
    setCoachLinks(links);
    try {
      localStorage.setItem(COACH_LINKS_STORAGE_KEY, JSON.stringify(links));
    } catch {
      // Silent fail
    }
  }, []);

  const handleAddLink = useCallback(() => {
    if (!linkForm.label.trim() || !linkForm.url.trim()) return;
    let url = linkForm.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const newLink: CoachLink = {
      id: `custom_${Date.now()}`,
      label: linkForm.label.trim(),
      url,
      color: 'text-slate-700',
      bg: 'bg-slate-50',
      isDefault: false,
    };
    saveCoachLinks([...coachLinks, newLink]);
    setLinkForm({ label: '', url: '' });
    setAddingLink(false);
  }, [linkForm, coachLinks, saveCoachLinks]);

  const handleUpdateLink = useCallback((id: string) => {
    if (!linkForm.label.trim() || !linkForm.url.trim()) return;
    let url = linkForm.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const updated = coachLinks.map(l =>
      l.id === id ? { ...l, label: linkForm.label.trim(), url } : l
    );
    saveCoachLinks(updated);
    setEditingLinkId(null);
    setLinkForm({ label: '', url: '' });
  }, [linkForm, coachLinks, saveCoachLinks]);

  const handleDeleteLink = useCallback((id: string) => {
    saveCoachLinks(coachLinks.filter(l => l.id !== id));
  }, [coachLinks, saveCoachLinks]);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // ============ CRONOMETER DATA FETCHING ============

  // Fetch once when toggle is turned on, keyed by clientId to avoid duplicate calls
  useEffect(() => {
    if (!cronometerMode || !cronometerClientId || isFetchingCronometer) return;
    // Already fetched for this client -- skip
    if (cronometerFetchedRef.current === cronometerClientId && cronometerFoodLog !== null) return;

    const fetchData = async () => {
      setIsFetchingCronometer(true);
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 14);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        const res = await fetch(`/api/cronometer/dashboard?start=${startStr}&end=${endStr}&client_id=${cronometerClientId}`);
        if (!res.ok) throw new Error('Failed to fetch Cronometer data');
        const data = await res.json();
        setCronometerFoodLog(data.foodLog || []);
        setCronometerDateRange({ start: startStr, end: endStr });
        cronometerFetchedRef.current = cronometerClientId;
      } catch (err) {
        console.error('Failed to fetch Cronometer food log:', err);
        setCronometerFoodLog(null);
        setCronometerMode(false);
      } finally {
        setIsFetchingCronometer(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cronometerMode, cronometerClientId]);

  // Aggregate food log into meal patterns
  const mealPatterns = useMemo((): Record<string, MealPattern> => {
    if (!cronometerFoodLog || cronometerFoodLog.length === 0) return {};

    const groups: Record<string, {
      macros: { calories: number; protein: number; carbs: number; fat: number }[];
      foods: Record<string, { serving: string; count: number }>;
      daysWithData: number;
    }> = {};

    for (const day of cronometerFoodLog) {
      if (!day.meals) continue;
      for (const meal of day.meals) {
        const group = meal.name; // "Breakfast", "Lunch", "Dinner", "Snacks"
        if (!groups[group]) {
          groups[group] = { macros: [], foods: {}, daysWithData: 0 };
        }
        groups[group].daysWithData++;
        groups[group].macros.push({
          calories: meal.calories || 0,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fat: meal.fat || 0,
        });
        for (const food of (meal.foods || [])) {
          const key = food.name;
          if (!groups[group].foods[key]) {
            groups[group].foods[key] = { serving: food.serving, count: 0 };
          }
          groups[group].foods[key].count++;
        }
      }
    }

    const patterns: Record<string, MealPattern> = {};
    for (const [groupName, data] of Object.entries(groups)) {
      const count = data.macros.length || 1;
      const avgMacros: Macros = {
        calories: Math.round(data.macros.reduce((s, m) => s + m.calories, 0) / count),
        protein: Math.round(data.macros.reduce((s, m) => s + m.protein, 0) / count),
        carbs: Math.round(data.macros.reduce((s, m) => s + m.carbs, 0) / count),
        fat: Math.round(data.macros.reduce((s, m) => s + m.fat, 0) / count),
      };

      const commonFoods = Object.entries(data.foods)
        .map(([name, info]) => ({ name, serving: info.serving, frequency: info.count }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 8);

      patterns[groupName] = {
        mealGroup: groupName,
        commonFoods,
        avgMacros,
        daysSampled: data.daysWithData,
      };
    }

    return patterns;
  }, [cronometerFoodLog]);

  // Map Cronometer meal groups to slot labels
  const getPatternForSlot = useCallback((slotLabel: string, slotType: 'meal' | 'snack'): MealPattern | undefined => {
    if (!cronometerMode || Object.keys(mealPatterns).length === 0) return undefined;

    // Direct mapping by slot label
    const label = slotLabel.toLowerCase();
    if (label.includes('meal 1') || label.includes('breakfast')) return mealPatterns['Breakfast'];
    if (label.includes('meal 2') || label.includes('lunch')) return mealPatterns['Lunch'];
    if (label.includes('meal 3') || label.includes('dinner')) return mealPatterns['Dinner'];
    if (slotType === 'snack') return mealPatterns['Snacks'];
    // Fallback: if there are more meals, map sequentially
    if (label.includes('meal 4')) return mealPatterns['Dinner']; // late meal ~ dinner pattern
    return undefined;
  }, [cronometerMode, mealPatterns]);

  // ============ COMPUTE DAY TYPES ============
  
  const dayTypes = useMemo((): DayType[] => {
    const types: Map<string, DayType> = new Map();
    
    DAYS.forEach(day => {
      const schedule = weeklySchedule[day];
      const targets = nutritionTargets.find(t => t.day === day);
      
      // PRIORITY: Use isWorkoutDay from phase nutrition targets, fall back to weeklySchedule
      const scheduleWorkouts = schedule?.workouts?.filter(w => w.enabled) || [];
      const isWorkoutDay = targets?.isWorkoutDay ?? scheduleWorkouts.length > 0;
      const workoutType = scheduleWorkouts.length > 0 ? scheduleWorkouts[0]?.type : undefined;
      const mealsCount = schedule?.mealCount || 3;
      const snacksCount = schedule?.snackCount || 2;
      
      // Create a key based on workout status and meal structure
      const typeKey = `${isWorkoutDay ? `workout-${workoutType || 'general'}` : 'rest'}-${mealsCount}m-${snacksCount}s`;
      
      if (types.has(typeKey)) {
        const existing = types.get(typeKey)!;
        existing.days.push(day);
        // Update averages
        existing.avgCalories = Math.round((existing.avgCalories * (existing.days.length - 1) + (targets?.targetCalories || 0)) / existing.days.length);
        existing.avgProtein = Math.round((existing.avgProtein * (existing.days.length - 1) + (targets?.protein || 0)) / existing.days.length);
      } else {
        types.set(typeKey, {
          id: typeKey,
          label: isWorkoutDay 
            ? `${workoutType || 'Workout'} Day` 
            : 'Rest Day',
          description: `${mealsCount} meals, ${snacksCount} snacks`,
          icon: isWorkoutDay ? 'workout' : 'rest',
          days: [day],
          isWorkoutDay,
          workoutType,
          mealsCount,
          snacksCount,
          avgCalories: targets?.targetCalories || 0,
          avgProtein: targets?.protein || 0,
        });
      }
    });
    
    return Array.from(types.values());
  }, [weeklySchedule, nutritionTargets]);

  // Auto-select first day type
  useEffect(() => {
    if (dayTypes.length > 0 && !selectedDayType) {
      setSelectedDayType(dayTypes[0].id);
    }
  }, [dayTypes, selectedDayType]);

  // Get current context
  const currentDayType = useMemo(() => 
    dayTypes.find(dt => dt.id === selectedDayType) || dayTypes[0],
    [dayTypes, selectedDayType]
  );
  
  const currentDay = useMemo(() => 
    viewMode === 'day-types' ? currentDayType?.days[0] || 'Monday' : selectedDay,
    [viewMode, currentDayType, selectedDay]
  );

  const daySchedule = weeklySchedule[currentDay];
  const dayTargets = nutritionTargets.find(t => t.day === currentDay);
  const dayPlan = mealPlan?.[currentDay];
  
  const mealsCount = daySchedule?.mealCount || 3;
  const snacksCount = daySchedule?.snackCount || 2;
  // Use saved mealSlotTargets labels when available; fall back to generic generation
  const slotLabels = useMemo(() => {
    const savedSlotTargets = (dayTargets as any)?.mealSlotTargets as
      | { label: string; type: 'meal' | 'snack' }[]
      | undefined;
    if (savedSlotTargets && savedSlotTargets.length > 0) {
      return savedSlotTargets.map((st) => ({
        type: st.type || 'meal',
        label: st.label || 'Meal',
      }));
    }
    return getMealSlotLabels(mealsCount, snacksCount);
  }, [dayTargets, mealsCount, snacksCount]);

  const timeSlots = useMemo(() => 
    getTimeSlots(daySchedule?.wakeTime || '7:00 AM', daySchedule?.sleepTime || '10:00 PM', slotLabels.length),
    [daySchedule?.wakeTime, daySchedule?.sleepTime, slotLabels.length]
  );
  const slotTargets = useMemo(() => {
    if (!dayTargets) return [];
    // Use saved per-meal slot targets from the phase if available
    const savedSlotTargets = (dayTargets as any)?.mealSlotTargets as
      | { calories: number; protein: number; carbs: number; fat: number }[]
      | undefined;
    if (savedSlotTargets && savedSlotTargets.length === slotLabels.length) {
      return savedSlotTargets.map((st) => ({
        calories: st.calories || 0,
        protein: st.protein || 0,
        carbs: st.carbs || 0,
        fat: st.fat || 0,
      }));
    }
    return calculateSlotTargets(dayTargets, slotLabels);
  }, [dayTargets, slotLabels]);

  // Build meal slots
  const mealSlots: MealSlot[] = useMemo(() => {
    const workouts = daySchedule?.workouts?.filter(w => w.enabled) || [];
    const workoutTimeStr = workouts.length > 0 ? workouts[0]?.timeSlot || '5:00 PM' : null;
    const workoutMinutes = workoutTimeStr ? parseTimeToMinutes(workoutTimeStr) : null;
    
    let preWorkoutIdx = -1;
    let postWorkoutIdx = -1;
    
    if (workoutMinutes !== null) {
      for (let i = 0; i < timeSlots.length; i++) {
        const slotMinutes = parseTimeToMinutes(timeSlots[i]);
        if (slotMinutes < workoutMinutes) {
          preWorkoutIdx = i;
        } else if (postWorkoutIdx === -1) {
          postWorkoutIdx = i;
        }
      }
    }
    
    return slotLabels.map((slot, idx) => {
      const existingMeal = dayPlan?.meals?.[idx] || null;
      
      let workoutRelation: 'pre-workout' | 'post-workout' | 'none' = 'none';
      if (idx === preWorkoutIdx) workoutRelation = 'pre-workout';
      if (idx === postWorkoutIdx) workoutRelation = 'post-workout';
      
      return {
        id: `${currentDay}-${idx}`,
        day: currentDay,
        slotIndex: idx,
        type: slot.type,
        label: slot.label,
        targetMacros: slotTargetOverrides[`${currentDay}-${idx}`] || slotTargets[idx] || { calories: 0, protein: 0, carbs: 0, fat: 0 },
        meal: existingMeal,
        isLocked: existingMeal?.isLocked || false,
        timeSlot: timeSlots[idx],
        workoutRelation,
      };
    });
  }, [currentDay, slotLabels, timeSlots, slotTargets, dayPlan, daySchedule, slotTargetOverrides]);

  // Progress calculations
  const dayProgress = useMemo(() => {
    if (!dayTargets) return { filled: 0, total: slotLabels.length, calories: 0, targetCalories: 0, protein: 0, carbs: 0, fat: 0 };
    const filled = mealSlots.filter(s => s.meal !== null).length;
    const calories = Math.round(mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.calories || 0), 0));
    return {
      filled,
      total: slotLabels.length,
      calories,
      targetCalories: Math.round(dayTargets.targetCalories),
      protein: Math.round(mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.protein || 0), 0)),
      carbs: Math.round(mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.carbs || 0), 0)),
      fat: Math.round(mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.fat || 0), 0)),
    };
  }, [mealSlots, dayTargets, slotLabels.length]);

  const overallProgress = useMemo(() => {
    let totalSlots = 0;
    let filledSlots = 0;
    
    DAYS.forEach(day => {
      const schedule = weeklySchedule[day];
      const daySlots = (schedule?.mealCount || 3) + (schedule?.snackCount || 2);
      totalSlots += daySlots;
      filledSlots += mealPlan?.[day]?.meals?.filter(m => m !== null).length || 0;
    });
    
    return { filledSlots, totalSlots, percent: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0 };
  }, [mealPlan, weeklySchedule]);

  // Compute remaining macro budget for current day
  const macroBudget = useMemo(() => {
    if (!dayTargets) return null;
    const targetCal = dayTargets.targetCalories || 0;
    const targetP = dayTargets.protein || 0;
    const targetC = dayTargets.carbs || 0;
    const targetF = dayTargets.fat || 0;
    const usedCal = mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.calories || 0), 0);
    const usedP = mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.protein || 0), 0);
    const usedC = mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.carbs || 0), 0);
    const usedF = mealSlots.reduce((sum, s) => sum + (s.meal?.totalMacros?.fat || 0), 0);
    return {
      calories: { target: Math.round(targetCal), used: Math.round(usedCal), remaining: Math.round(targetCal - usedCal) },
      protein: { target: Math.round(targetP), used: Math.round(usedP), remaining: Math.round(targetP - usedP) },
      carbs: { target: Math.round(targetC), used: Math.round(usedC), remaining: Math.round(targetC - usedC) },
      fat: { target: Math.round(targetF), used: Math.round(usedF), remaining: Math.round(targetF - usedF) },
    };
  }, [dayTargets, mealSlots]);

  // Save updated day targets to the store/phase
  const handleSaveDayTargets = useCallback((updates: { calories?: number; protein?: number; carbs?: number; fat?: number }) => {
    if (!dayTargets) return;
    const updatedTargets = nutritionTargets.map(t => {
      if (t.day !== currentDay) return t;
      return {
        ...t,
        targetCalories: updates.calories ?? t.targetCalories,
        calories: updates.calories ?? (t as unknown as Record<string, unknown>).calories as number ?? t.targetCalories,
        protein: updates.protein ?? t.protein,
        carbs: updates.carbs ?? t.carbs,
        fat: updates.fat ?? t.fat,
      };
    });
    
    if (activePhaseId) {
      updatePhase(activePhaseId, { nutritionTargets: updatedTargets });
    }
    setNutritionTargets(updatedTargets);
    setEditingDayTargets(false);
    setLocalDayTargets(null);
  }, [dayTargets, nutritionTargets, currentDay, activePhaseId, updatePhase, setNutritionTargets]);

  // Handle updating per-meal slot targets
  const handleUpdateSlotTargets = useCallback((slotIndex: number, targets: Macros) => {
    const key = `${currentDay}-${slotIndex}`;
    setSlotTargetOverrides(prev => ({ ...prev, [key]: targets }));
  }, [currentDay]);

  // Compute effective slot targets (with overrides applied)
  const effectiveSlotTargets = useMemo((): Macros[] => {
    return slotTargets.map((target: Macros, idx: number) => {
      const key = `${currentDay}-${idx}`;
      return slotTargetOverrides[key] || target;
    });
  }, [slotTargets, slotTargetOverrides, currentDay]);

  // Compute rolling budget for each slot
  const rollingBudgets = useMemo(() => {
    if (!dayTargets) return [];
    let remainingCal = dayTargets.targetCalories || 0;
    let remainingP = dayTargets.protein || 0;
    let remainingC = dayTargets.carbs || 0;
    let remainingF = dayTargets.fat || 0;

    return mealSlots.map((slot, idx) => {
      // Subtract either the actual meal macros (if planned) or the slot target
      const mealCal = slot.meal?.totalMacros?.calories || effectiveSlotTargets[idx]?.calories || 0;
      const mealP = slot.meal?.totalMacros?.protein || effectiveSlotTargets[idx]?.protein || 0;
      const mealC = slot.meal?.totalMacros?.carbs || effectiveSlotTargets[idx]?.carbs || 0;
      const mealF = slot.meal?.totalMacros?.fat || effectiveSlotTargets[idx]?.fat || 0;

      remainingCal -= mealCal;
      remainingP -= mealP;
      remainingC -= mealC;
      remainingF -= mealF;

      return {
        calories: Math.round(remainingCal),
        protein: Math.round(remainingP),
        carbs: Math.round(remainingC),
        fat: Math.round(remainingF),
      };
    });
  }, [dayTargets, mealSlots, effectiveSlotTargets]);

  // Get all meal names for variety
  const allMealNames = useMemo(() => {
    const names: string[] = [];
    if (mealPlan) {
      DAYS.forEach(day => {
        mealPlan[day]?.meals?.forEach(m => {
          if (m?.name) names.push(m.name);
        });
      });
    }
    return names;
  }, [mealPlan]);

  // Consolidated grocery list with smart quantity parsing
  const groceryList = useMemo(() => {
    // Normalize units for proper combining
    const normalizeUnit = (unit: string): string => {
      const u = unit.toLowerCase().trim();
      // Weight units -> g
      if (u === 'g' || u === 'gram' || u === 'grams') return 'g';
      if (u === 'kg' || u === 'kilogram' || u === 'kilograms') return 'kg';
      if (u === 'oz' || u === 'ounce' || u === 'ounces') return 'oz';
      if (u === 'lb' || u === 'lbs' || u === 'pound' || u === 'pounds') return 'lb';
      // Volume units
      if (u === 'ml' || u === 'milliliter' || u === 'milliliters') return 'ml';
      if (u === 'l' || u === 'liter' || u === 'liters') return 'L';
      if (u === 'cup' || u === 'cups') return 'cup';
      if (u === 'tbsp' || u === 'tablespoon' || u === 'tablespoons') return 'tbsp';
      if (u === 'tsp' || u === 'teaspoon' || u === 'teaspoons') return 'tsp';
      // Count units
      if (u === '' || u === 'serving' || u === 'servings') return 'serving';
      if (u === 'piece' || u === 'pieces' || u === 'pcs') return 'piece';
      if (u === 'scoop' || u === 'scoops') return 'scoop';
      if (u === 'slice' || u === 'slices') return 'slice';
      return u;
    };
    
    // Check if two units are compatible for combining
    const unitsCompatible = (u1: string, u2: string): boolean => {
      if (u1 === u2) return true;
      // Weight units can combine with each other
      const weightUnits = ['g', 'kg', 'oz', 'lb'];
      if (weightUnits.includes(u1) && weightUnits.includes(u2)) return true;
      // Volume units can combine
      const volumeUnits = ['ml', 'L', 'cup', 'tbsp', 'tsp'];
      if (volumeUnits.includes(u1) && volumeUnits.includes(u2)) return true;
      return false;
    };
    
    // Convert to base unit for combining
    const convertToBaseUnit = (qty: number, unit: string): { qty: number; unit: string } => {
      // Convert everything to grams for weight
      if (unit === 'kg') return { qty: qty * 1000, unit: 'g' };
      if (unit === 'oz') return { qty: qty * 28.35, unit: 'g' };
      if (unit === 'lb') return { qty: qty * 453.6, unit: 'g' };
      // Convert to ml for volume
      if (unit === 'L') return { qty: qty * 1000, unit: 'ml' };
      if (unit === 'cup') return { qty: qty * 240, unit: 'ml' };
      if (unit === 'tbsp') return { qty: qty * 15, unit: 'ml' };
      if (unit === 'tsp') return { qty: qty * 5, unit: 'ml' };
      return { qty, unit };
    };
    
    // Use a key that includes the unit type to avoid bad combinations
    const ingredientMap: Map<string, { 
      qty: number; 
      unit: string; 
      category: string;
      usedIn: number;
    }> = new Map();
    
    if (mealPlan) {
      DAYS.forEach(day => {
        mealPlan[day]?.meals?.forEach(meal => {
          if (!meal?.ingredients) return;
          
          meal.ingredients.forEach(ingredient => {
            if (!ingredient?.item) return;
            
            const name = ingredient.item.toLowerCase().trim();
            
            // Parse amount - handle various formats like "100g", "2 cups", "1/2 tbsp"
            const amountStr = ingredient.amount || '1 serving';
            const amountMatch = amountStr.match(/^([\d.\/]+)\s*(.*)$/);
            let value = 1;
            let rawUnit = 'serving';
            
            if (amountMatch) {
              // Handle fractions like 1/2
              if (amountMatch[1].includes('/')) {
                const parts = amountMatch[1].split('/');
                value = parseFloat(parts[0]) / parseFloat(parts[1]);
              } else {
                value = parseFloat(amountMatch[1]) || 1;
              }
              rawUnit = amountMatch[2]?.trim() || 'serving';
            }
            
            const unit = normalizeUnit(rawUnit);
            const converted = convertToBaseUnit(value, unit);
            
            // Create a key that includes the base unit to prevent bad combinations
            const unitCategory = ['g', 'kg', 'oz', 'lb'].includes(unit) ? 'weight' 
              : ['ml', 'L', 'cup', 'tbsp', 'tsp'].includes(unit) ? 'volume' 
              : 'count';
            const mapKey = `${name}|${unitCategory}`;
            
            const existing = ingredientMap.get(mapKey);
            
            if (existing && unitsCompatible(existing.unit, converted.unit)) {
              // Same base unit - add quantities
              existing.qty += converted.qty;
              existing.usedIn += 1;
            } else if (existing) {
              // Different unit types - store separately
              const altKey = `${mapKey}|alt`;
              const altExisting = ingredientMap.get(altKey);
              if (altExisting) {
                altExisting.qty += converted.qty;
                altExisting.usedIn += 1;
              } else {
                ingredientMap.set(altKey, { 
                  qty: converted.qty, 
                  unit: converted.unit,
                  category: ingredient.category || 'other',
                  usedIn: 1
                });
              }
            } else {
              ingredientMap.set(mapKey, { 
                qty: converted.qty, 
                unit: converted.unit,
                category: ingredient.category || 'other',
                usedIn: 1
              });
            }
          });
        });
      });
    }
    
    // Format quantities for grocery-store-friendly purchase amounts
    const formatQuantity = (qty: number, unit: string): { qty: number; unit: string; displayStr?: string } => {
      // Convert grams to purchasable amounts
      if (unit === 'g') {
        if (qty >= 1000) {
          // Round to nearest 0.5 kg for easy purchasing
          const kg = Math.ceil(qty / 500) * 0.5;
          return { qty: kg, unit: 'kg' };
        }
        // Convert to oz for amounts under 1kg (more grocery-friendly in US)
        const oz = qty / 28.35;
        if (oz >= 16) {
          const lbs = Math.ceil(oz / 16 * 2) / 2; // Round up to nearest 0.5 lb
          return { qty: lbs, unit: 'lb' };
        }
        if (oz >= 1) {
          return { qty: Math.ceil(oz), unit: 'oz' };
        }
        return { qty: Math.round(qty), unit: 'g' };
      }
      
      // Convert ml to purchasable amounts
      if (unit === 'ml') {
        if (qty >= 1000) {
          return { qty: Math.ceil(qty / 1000 * 2) / 2, unit: 'L' };
        }
        // Convert to cups for moderate amounts
        const cups = qty / 240;
        if (cups >= 0.5) {
          if (cups >= 3.5) return { qty: Math.ceil(cups / 4) * 4, unit: 'cups' };
          return { qty: Math.ceil(cups * 2) / 2, unit: cups >= 1.5 ? 'cups' : 'cup' };
        }
        // Small amounts stay as tbsp
        const tbsp = qty / 15;
        if (tbsp >= 1) return { qty: Math.ceil(tbsp), unit: 'tbsp' };
        return { qty: Math.ceil(qty / 5), unit: 'tsp' };
      }
      
      // Count units — round up to whole numbers for purchasing
      if (['serving', 'piece', 'slice', 'scoop'].includes(unit)) {
        return { qty: Math.ceil(qty), unit };
      }
      
      // Round appropriately
      if (qty >= 100) return { qty: Math.round(qty), unit };
      if (qty >= 10) return { qty: Math.round(qty * 10) / 10, unit };
      if (qty >= 1) return { qty: Math.round(qty * 4) / 4, unit }; // Round to nearest 1/4
      return { qty: Math.round(qty * 100) / 100, unit };
    };
    
    return Array.from(ingredientMap.entries())
      .map(([key, data]) => {
        const name = key.split('|')[0];
        const formatted = formatQuantity(data.qty, data.unit);
        return { 
          name: name.charAt(0).toUpperCase() + name.slice(1), 
          qty: formatted.qty,
          unit: formatted.unit,
          category: data.category,
          usedIn: data.usedIn
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mealPlan]);

  // ============ CRONOMETER ADAPTIVE HANDLERS ============

  const handleGetTips = useCallback(async (slotIndex: number) => {
    const slotData = mealSlots.find(s => s.slotIndex === slotIndex);
    if (!slotData) return;
    
    const pattern = getPatternForSlot(slotData.label, slotData.type);
    if (!pattern) return;

    const key = `${currentDay}-${slotIndex}`;
    setGeneratingTips(prev => ({ ...prev, [slotIndex]: true }));
    try {
      const goalType = activePhase?.goalType || bodyCompGoals.goalType || '';
      const res = await fetch('/api/generate-adaptive-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'tips',
          slot: {
            label: slotData.label,
            type: slotData.type,
            targetMacros: slotData.targetMacros,
            timeSlot: slotData.timeSlot,
            workoutRelation: slotData.workoutRelation,
          },
          currentPattern: pattern,
          dailyTargets: dayTargets ? {
            calories: dayTargets.targetCalories,
            protein: dayTargets.protein,
            carbs: dayTargets.carbs,
            fat: dayTargets.fat,
          } : { calories: 2000, protein: 150, carbs: 200, fat: 70 },
          clientContext: {
            name: userProfile.name,
            goalType,
            phaseName: activePhase?.name,
            dietaryRestrictions: dietPreferences.dietaryRestrictions,
            preferredProteins: dietPreferences.preferredProteins,
            foodsToAvoid: dietPreferences.foodsToAvoid,
            foodsToEmphasize: dietPreferences.foodsToEmphasize,
            allergies: dietPreferences.allergies,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to get tips');
      const data = await res.json();
      setAdaptiveTips(prev => ({
        ...prev,
        [key]: {
          tips: data.tips || [],
          summary: data.summary || '',
          macroGap: data.macroGap || { calories: 0, protein: 0, carbs: 0, fat: 0 },
        },
      }));
      toast.success('Coaching tips generated');
    } catch (err) {
      console.error('Failed to get adaptive tips:', err);
      toast.error('Failed to generate tips');
    } finally {
      setGeneratingTips(prev => ({ ...prev, [slotIndex]: false }));
    }
  }, [mealSlots, currentDay, dayTargets, getPatternForSlot, userProfile, bodyCompGoals, dietPreferences, activePhase]);

  const handleGenerateImproved = useCallback(async (slotIndex: number) => {
    const slotData = mealSlots.find(s => s.slotIndex === slotIndex);
    if (!slotData) return;
    
    const pattern = getPatternForSlot(slotData.label, slotData.type);
    if (!pattern) return;

    setGeneratingImproved(prev => ({ ...prev, [slotIndex]: true }));
    try {
      const goalType = activePhase?.goalType || bodyCompGoals.goalType || '';
      const res = await fetch('/api/generate-adaptive-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'improve',
          slot: {
            label: slotData.label,
            type: slotData.type,
            targetMacros: slotData.targetMacros,
            timeSlot: slotData.timeSlot,
            workoutRelation: slotData.workoutRelation,
          },
          currentPattern: pattern,
          dailyTargets: dayTargets ? {
            calories: dayTargets.targetCalories,
            protein: dayTargets.protein,
            carbs: dayTargets.carbs,
            fat: dayTargets.fat,
          } : { calories: 2000, protein: 150, carbs: 200, fat: 70 },
          clientContext: {
            name: userProfile.name,
            goalType,
            phaseName: activePhase?.name,
            dietaryRestrictions: dietPreferences.dietaryRestrictions,
            preferredProteins: dietPreferences.preferredProteins,
            foodsToAvoid: dietPreferences.foodsToAvoid,
            foodsToEmphasize: dietPreferences.foodsToEmphasize,
            allergies: dietPreferences.allergies,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to generate improved meal');
      const data = await res.json();
      if (data.meal) {
        updateMeal(currentDay, slotIndex, data.meal);
        toast.success('Improved meal generated from Cronometer patterns');
      }
    } catch (err) {
      console.error('Failed to generate improved meal:', err);
      toast.error('Failed to generate improved meal');
    } finally {
      setGeneratingImproved(prev => ({ ...prev, [slotIndex]: false }));
    }
  }, [mealSlots, currentDay, dayTargets, getPatternForSlot, updateMeal, userProfile, bodyCompGoals, dietPreferences, activePhase]);

  // ============ HANDLERS ============
  
  const handleGenerateMeal = async (slotIndex: number) => {
    if (!dayTargets) return;
    
    setGeneratingSlots(prev => ({ ...prev, [slotIndex]: true }));
    
    try {
      const slot = mealSlots[slotIndex];
      
      const response = await fetch('/api/generate-single-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          bodyCompGoals,
          dietPreferences,
          mealRequest: {
            day: currentDay,
            slotIndex,
            slotLabel: slot.label,
            targetMacros: slot.targetMacros,
            previousMeals: allMealNames,
            timeSlot: slot.timeSlot,
            workoutRelation: slot.workoutRelation,
            isWorkoutDay: dayTargets.isWorkoutDay,
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate meal');
      }
      
      const data = await response.json();
      updateMeal(currentDay, slotIndex, data.meal);
      toast.success(`${slot.label} generated!`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate meal');
    } finally {
      setGeneratingSlots(prev => ({ ...prev, [slotIndex]: false }));
    }
  };

  // Update supplements on a specific meal
  const handleUpdateMealSupplements = (day: DayOfWeek, slotIndex: number, supplements: MealSupplement[]) => {
    const slot = mealSlots[slotIndex];
    if (!slot.meal) return;
    updateMeal(day, slotIndex, { ...slot.meal, supplements });
  };

  const handleGenerateNote = async (slotIndex: number) => {
    const slot = mealSlots[slotIndex];
    if (!slot.meal) return;
    
    setGeneratingNotes(prev => ({ ...prev, [slotIndex]: true }));
    
    try {
      const response = await fetch('/api/generate-meal-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          bodyCompGoals,
          noteRequest: {
            meal: slot.meal,
            day: currentDay,
            clientGoal: bodyCompGoals?.goalType,
            isWorkoutDay: dayTargets?.isWorkoutDay || false,
            slotLabel: slot.label,
          },
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate note');
      
      const data = await response.json();
      updateMealRationale(currentDay, slotIndex, data.rationale);
      toast.success('AI rationale added!');
    } catch (error) {
      toast.error('Failed to generate note');
    } finally {
      setGeneratingNotes(prev => ({ ...prev, [slotIndex]: false }));
    }
  };

  const handleSaveMeal = (slotIndex: number, meal: Meal) => {
    updateMeal(currentDay, slotIndex, meal);
    setEditingSlot(null);
    toast.success('Meal saved!');
  };

  const handleSwapSelect = (meal: Meal) => {
    if (swappingSlot !== null) {
      updateMeal(currentDay, swappingSlot, meal);
      setSwappingSlot(null);
      toast.success('Meal swapped!');
    }
  };

  const handleGenerateDayType = async () => {
    if (!currentDayType) return;
    
    setIsGenerating(true);
    cancelGenerationRef.current = false;
    
    try {
      // Generate meals for the first day of this type
      const firstDay = currentDayType.days[0];
      
      for (let idx = 0; idx < mealSlots.length; idx++) {
        if (cancelGenerationRef.current) break;
        if (mealSlots[idx].meal?.isLocked) continue;
        
        await handleGenerateMeal(idx);
      }
      
      toast.success(`${currentDayType.label} template created!`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToSimilarDays = () => {
    if (!currentDayType || !dayPlan?.meals) return;
    
    // Copy meals from first day to all other days of same type
    currentDayType.days.slice(1).forEach(targetDay => {
      dayPlan.meals.forEach((meal, idx) => {
        if (meal) {
          updateMeal(targetDay, idx, { ...meal, lastModified: new Date().toISOString() });
        }
      });
    });
    
    toast.success(`Copied to ${currentDayType.days.length - 1} other days!`);
  };

  const handleDownloadPDF = async () => {
    if (!mealPlan) return;
    
    try {
      setIsDownloading(true);
      
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          bodyCompGoals,
          dietPreferences,
          weeklySchedule,
          nutritionTargets,
          mealPlan,
          logoUrl: FITOMICS_LOGO_URL,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const clientName = userProfile.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'client';
      link.download = `${clientName}_nutrition_strategy_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded!');
    } catch (error) {
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Generate all meals for a single day
  const handleGenerateSingleDay = async (day: DayOfWeek) => {
    const schedule = weeklySchedule[day];
    const dayTargetsForDay = nutritionTargets.find(t => t.day === day);
    
    if (!dayTargetsForDay) {
      toast.error('No nutrition targets found for this day');
      return;
    }
    
    setIsGeneratingSingleDay(true);
    
    try {
      const mealsCount = schedule?.mealCount || 3;
      const snacksCount = schedule?.snackCount || 2;
      // Prefer saved slot labels from planning step; fall back to generated
      const savedTargets = (dayTargetsForDay as any)?.mealSlotTargets as
        | { label: string; type: 'meal' | 'snack' }[]
        | undefined;
      const labels = (savedTargets && savedTargets.length > 0)
        ? savedTargets.map(st => ({ type: st.type || ('meal' as const), label: st.label || 'Meal' }))
        : getMealSlotLabels(mealsCount, snacksCount);
      const times = getTimeSlots(
        schedule?.wakeTime || '7:00 AM',
        schedule?.sleepTime || '10:00 PM',
        labels.length
      );
      
      // Use isWorkoutDay from nutrition targets (phase config)
      const isWorkoutDay = dayTargetsForDay.isWorkoutDay;
      const workouts = schedule?.workouts?.filter(w => w.enabled) || [];
      const workout = workouts.length > 0 ? workouts[0] : null;
      
      // Format request for the API
      const response = await fetch('/api/generate-day-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: userProfile.name || 'Client',
          targets: {
            calories: dayTargetsForDay.targetCalories,
            protein: dayTargetsForDay.protein,
            carbs: dayTargetsForDay.carbs,
            fat: dayTargetsForDay.fat,
          },
          dietaryRestriction: dietPreferences?.dietaryRestrictions?.join(', ') || 'none',
          allergies: dietPreferences?.allergies || [],
          preferredProteins: dietPreferences?.preferredProteins || [],
          preferredCarbs: dietPreferences?.preferredCarbs || [],
          foodsToAvoid: dietPreferences?.foodsToAvoid || [],
          dayContext: {
            dayType: isWorkoutDay ? 'workout' : 'rest',
            workoutTiming: workout?.timeSlot || 'none',
            workoutType: workout?.type || null,
            wakeTime: schedule?.wakeTime || '7:00 AM',
            sleepTime: schedule?.sleepTime || '10:00 PM',
            specialNotes: '',
          },
          mealSlots: labels.map((label, idx) => ({
            id: `slot-${idx}`,
            type: label.type,
            time: times[idx],
            name: label.label,
            location: schedule?.mealContexts?.[idx]?.location || 'home',
            prepMethod: schedule?.mealContexts?.[idx]?.prepMethod || 'cook',
          })),
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate day plan');
      }
      
      const data = await response.json();
      
      // API returns { dayPlan: { meals: [{ slot, meal: {...} }], ... } }
      const dayPlanMeals = data.dayPlan?.meals || data.meals;
      
      if (dayPlanMeals && Array.isArray(dayPlanMeals)) {
        dayPlanMeals.forEach((entry: { slot?: unknown; meal?: { name: string; description: string; calories: number; protein: number; carbs: number; fat: number; ingredients: string[]; instructions: string[]; prepTime: number }; name?: string; description?: string; calories?: number; protein?: number; carbs?: number; fat?: number; ingredients?: string[]; instructions?: string[]; prepTime?: number }, idx: number) => {
          // Handle both { slot, meal: {...} } and flat { name, calories, ... } formats
          const mealData = entry.meal || entry;
          if (mealData && mealData.name) {
            const ingredients = (mealData.ingredients || []).map((ing: string | { item?: string; amount?: string }) =>
              typeof ing === 'string'
                ? { item: ing, amount: '', calories: 0, protein: 0, carbs: 0, fat: 0, category: 'other' as const }
                : { item: (ing as { item?: string }).item || '', amount: (ing as { amount?: string }).amount || '', calories: 0, protein: 0, carbs: 0, fat: 0, category: 'other' as const }
            );
            const slot = mealSlots[idx];
            const totalMacros = {
              calories: mealData.calories || 0,
              protein: mealData.protein || 0,
              carbs: mealData.carbs || 0,
              fat: mealData.fat || 0,
            };
            const meal: Meal = {
              name: mealData.name,
              time: slot?.timeSlot || '',
              context: '',
              type: slot?.type || 'meal',
              aiRationale: mealData.description || '',
              ingredients,
              instructions: mealData.instructions || [],
              totalMacros,
              targetMacros: slot?.targetMacros || totalMacros,
              workoutRelation: slot?.workoutRelation || 'none',
              prepTime: String(mealData.prepTime || '15'),
              source: 'ai',
              isLocked: false,
            };
            updateMeal(day, idx, meal);
          }
        });
        toast.success(`${day} meal plan generated!`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate day plan');
    } finally {
      setIsGeneratingSingleDay(false);
    }
  };

  // Export with options
  const handleExportWithOptions = async () => {
    try {
      setIsDownloading(true);
      
      // Determine which days to include
      const daysToInclude: DayOfWeek[] = exportOptions.exportType === 'full'
        ? DAYS
        : exportOptions.exportType === 'single'
          ? [exportOptions.selectedDay]
          : exportOptions.selectedDays;
      
      // Filter meal plan to only include selected days
      const exportMealPlan: Record<string, unknown> = {};
      daysToInclude.forEach(day => {
        if (mealPlan?.[day]) {
          exportMealPlan[day] = mealPlan[day];
        }
      });
      
      // Build phase-aware body comp goals for the PDF
      const pdfBodyCompGoals = activePhase ? {
        goalType: activePhase.goalType === 'fat_loss' ? 'lose_fat' : 
                  activePhase.goalType === 'muscle_gain' ? 'gain_muscle' : 
                  activePhase.goalType,
        targetWeightLbs: activePhase.targetWeightLbs,
        targetBodyFat: activePhase.targetBodyFat,
        timelineWeeks: Math.round(
          (new Date(activePhase.endDate).getTime() - new Date(activePhase.startDate).getTime()) / 
          (7 * 24 * 60 * 60 * 1000)
        ),
        weeklyWeightChange: activePhase.rateOfChange ? 
          (userProfile.weightLbs || 180) * (activePhase.rateOfChange / 100) * 
          (activePhase.goalType === 'fat_loss' ? -1 : 1) : 0,
        phaseName: activePhase.name,
        phaseStartDate: activePhase.startDate,
        phaseEndDate: activePhase.endDate,
        performancePriority: activePhase.performancePriority,
        lifestyleCommitment: activePhase.lifestyleCommitment,
        trackingCommitment: activePhase.trackingCommitment,
      } : bodyCompGoals;
      
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          bodyCompGoals: pdfBodyCompGoals,
          dietPreferences,
          weeklySchedule,
          nutritionTargets: nutritionTargets.filter(t => daysToInclude.includes(t.day)),
          mealPlan: exportMealPlan,
          logoUrl: FITOMICS_LOGO_URL,
          options: {
            includeGroceryList: exportOptions.includeGroceryList,
            includeRecipes: exportOptions.includeRecipes,
            includeCoverPage: exportOptions.includeCoverPage,
            includeClientProfile: exportOptions.includeClientProfile,
            includeSchedule: exportOptions.includeSchedule,
            includeNutritionTargets: exportOptions.includeNutritionTargets,
            includeDietPreferences: exportOptions.includeDietPreferences,
            includeMealContext: exportOptions.includeMealContext,
            selectedDays: daysToInclude,
          },
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const clientName = userProfile.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'client';
      const dayLabel = daysToInclude.length === 1 ? daysToInclude[0] 
        : daysToInclude.length < 7 ? `${daysToInclude.length}_days`
        : 'weekly';
      const fileName = `${clientName}_${dayLabel}_meal_plan_${new Date().toISOString().split('T')[0]}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF exported successfully!');
      setShowExportDialog(false);
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // ============ SUPPLEMENTS & QUICK LINKS RENDER ============
  const clientSupplements = activeClient?.userProfile?.supplements || [];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} link copied`);
  };

  const renderSupplementsCard = (day: DayOfWeek) => {
    // Get supplements relevant to this day's context
    const daySchedule = weeklySchedule[day];
    const isWorkoutDay = nutritionTargets.find(t => t.day === day)?.isWorkoutDay ?? daySchedule?.workouts?.some(w => w.enabled);

    // Filter client supplements by timing relevance
    const morningSupps = clientSupplements.filter(s => s.timing.includes('morning'));
    const preWorkoutSupps = clientSupplements.filter(s => s.timing.includes('pre_workout'));
    const intraWorkoutSupps = clientSupplements.filter(s => s.timing.includes('intra_workout'));
    const postWorkoutSupps = clientSupplements.filter(s => s.timing.includes('post_workout'));
    const withMealsSupps = clientSupplements.filter(s => s.timing.includes('with_meals'));
    const beforeBedSupps = clientSupplements.filter(s => s.timing.includes('before_bed'));
    const asNeededSupps = clientSupplements.filter(s => s.timing.includes('as_needed'));

    const timingGroups = [
      { label: 'Morning', icon: Sun, supps: morningSupps, show: true },
      { label: 'Pre-Workout', icon: Zap, supps: preWorkoutSupps, show: !!isWorkoutDay },
      { label: 'Intra-Workout', icon: Dumbbell, supps: intraWorkoutSupps, show: !!isWorkoutDay },
      { label: 'Post-Workout', icon: Target, supps: postWorkoutSupps, show: !!isWorkoutDay },
      { label: 'With Meals', icon: Utensils, supps: withMealsSupps, show: true },
      { label: 'Before Bed', icon: Moon, supps: beforeBedSupps, show: true },
      { label: 'As Needed', icon: Pill, supps: asNeededSupps, show: true },
    ].filter(g => g.show && g.supps.length > 0);

    return (
      <div className="space-y-4 mt-6">
        {/* Client Supplements */}
        {clientSupplements.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="h-4 w-4 text-[#c19962]" />
                Supplement Schedule
                <Badge variant="outline" className="text-[10px] ml-1">
                  {clientSupplements.length} active
                </Badge>
                {isWorkoutDay && (
                  <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300">
                    <Dumbbell className="h-2.5 w-2.5 mr-0.5" /> Workout Day
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timingGroups.map(({ label, icon: Icon, supps }) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 ml-5">
                    {supps.map((s) => (
                      <div
                        key={s.name}
                        className="flex items-center gap-1 px-2 py-1 bg-muted/60 rounded-md text-xs"
                      >
                        <span className="font-medium">{s.name}</span>
                        {s.dosage && (
                          <span className="text-muted-foreground">({s.dosage})</span>
                        )}
                        {s.notes && (
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                {s.notes}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {clientSupplements.length > 0 && timingGroups.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Supplements are configured but none have timing set for the current view. Edit supplement timing in the client profile.
                </p>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    );
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c19962]" />
      </div>
    );
  }

  // Check if we have nutrition targets set
  const hasTargets = nutritionTargets && nutritionTargets.length > 0;
  
  if (!hasTargets) {
    return (
      <div className="min-h-screen bg-background">
        <ProgressSteps currentStep={3} />
        <div className="container max-w-2xl mx-auto py-12 px-4">
          <Card className="border-2 border-[#c19962]/30">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-[#c19962]/20 flex items-center justify-center">
                <Target className="h-8 w-8 text-[#c19962]" />
              </div>
              <CardTitle className="text-xl">Nutrition Targets Required</CardTitle>
              <CardDescription className="text-base">
                Before generating a meal plan, you need to set and confirm nutrition targets for your phase.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Go to the Planning step, select or create a phase, customize your daily targets, and confirm them.
                Once confirmed, you can return here to generate your personalized meal plan.
              </p>
              <Button 
                onClick={() => router.push('/planning')}
                className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Planning
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProgressSteps currentStep={3} />
      
      <div className="container max-w-[1600px] mx-auto py-6 px-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/planning')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Planning
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#00263d]">
                Meal Plan Builder
                {activePhase && (
                  <Badge className={`ml-2 ${
                    activePhase.goalType === 'fat_loss' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                    activePhase.goalType === 'muscle_gain' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                    activePhase.goalType === 'recomposition' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                    activePhase.goalType === 'performance' ? 'bg-green-100 text-green-700 border-green-300' :
                    activePhase.goalType === 'health' ? 'bg-rose-100 text-rose-700 border-rose-300' :
                    'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {activePhase.name}
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {userProfile.name ? `${userProfile.name}'s` : ''} personalized nutrition plan
                {activePhase && (
                  <>
                    {' • '}
                    {activePhase.goalType === 'fat_loss' ? 'Fat loss targets (deficit)' : 
                     activePhase.goalType === 'muscle_gain' ? 'Muscle gain targets (surplus)' : 
                     activePhase.goalType === 'recomposition' ? 'Recomposition targets' :
                     activePhase.goalType === 'performance' ? 'Performance (maintenance calories)' :
                     activePhase.goalType === 'health' ? 'Health focus (maintenance calories)' :
                     'Maintenance targets'}
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <div className="flex border rounded-md">
              <Button variant="ghost" size="icon" onClick={undoMealPlan} disabled={!canUndo()} className="h-8 w-8">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={redoMealPlan} disabled={!canRedo()} className="h-8 w-8 border-l">
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Cronometer Context Toggle */}
            {hasCronometerLink && (
              <TooltipProvider delayDuration={200}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${cronometerMode ? 'border-amber-400 bg-amber-50' : 'border-transparent'}`}>
                <Switch
                  id="cronometer-mode"
                  checked={cronometerMode}
                  onCheckedChange={(checked) => {
                    setCronometerMode(checked);
                    if (!checked) {
                      setAdaptiveTips({});
                    }
                  }}
                  className="data-[state=checked]:bg-amber-500"
                />
                <Label htmlFor="cronometer-mode" className="text-xs font-medium cursor-pointer whitespace-nowrap">
                  {isFetchingCronometer ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Cronometer Context'
                  )}
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
                    <p className="font-semibold mb-1">Cronometer Adaptive Mode</p>
                    <p className="mb-1">
                      Pulls the last <strong>14 days</strong> of food log data from Cronometer
                      for <strong>{cronometerClientName || `Client #${cronometerClientId}`}</strong> and
                      aggregates their eating patterns by meal.
                    </p>
                    <p className="mb-1">
                      Each meal slot shows what they typically eat, average macros, and the gap vs. targets.
                      Use &quot;Get Tips&quot; for coaching advice or &quot;Generate Improved&quot; to create
                      a meal that keeps familiar foods while closing macro gaps.
                    </p>
                    {cronometerDateRange && (
                      <p className="text-muted-foreground mt-1">
                        Data range: {cronometerDateRange.start} to {cronometerDateRange.end}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      API call is made once per toggle — no repeated requests.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              </TooltipProvider>
            )}

            {/* Preview Toggle */}
            <Button
              variant={showPreview ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className={showPreview ? 'bg-[#00263d]' : ''}
            >
              {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              Preview
            </Button>
            
            {/* Grocery List */}
            <Button
              variant={showGroceryList ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowGroceryList(!showGroceryList)}
              className={showGroceryList ? 'bg-[#00263d]' : ''}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Grocery
            </Button>
            
            {/* Generate Current Day */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateSingleDay(currentDay)}
              disabled={isGeneratingSingleDay}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              {isGeneratingSingleDay ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Generate {currentDay}
            </Button>
            
            {/* Export */}
            <Button
              onClick={() => setShowExportDialog(true)}
              disabled={isDownloading || overallProgress.filledSlots === 0}
              className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
            >
              <FileDown className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Overall Progress */}
        <Card className="mb-4 border-[#c19962]/30">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-[#c19962]/20 flex items-center justify-center">
                    <ChefHat className="h-5 w-5 text-[#c19962]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{overallProgress.filledSlots} of {overallProgress.totalSlots} meals planned</p>
                    <p className="text-xs text-muted-foreground">{overallProgress.percent}% complete</p>
                  </div>
                </div>
                <Progress value={overallProgress.percent} className="w-48 h-2" />
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'day-types' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day-types')}
                  className={viewMode === 'day-types' ? 'bg-[#00263d]' : ''}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  By Day Type
                </Button>
                <Button
                  variant={viewMode === 'weekly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('weekly')}
                  className={viewMode === 'weekly' ? 'bg-[#00263d]' : ''}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Weekly View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          {/* Left Sidebar - Coach Quick Links */}
          <div className={`hidden lg:block transition-all shrink-0 ${linksExpanded ? 'w-[220px]' : 'w-12'}`}>
            <div className="sticky top-20">
              <Card className="border-[#c19962]/30 overflow-hidden">
                {/* Toggle Header */}
                <button
                  type="button"
                  onClick={() => setLinksExpanded(!linksExpanded)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-2 hover:bg-muted/50 transition-colors border-b"
                >
                  {linksExpanded ? (
                    <>
                      <PanelLeftClose className="h-4 w-4 text-[#c19962] shrink-0" />
                      <span className="text-xs font-semibold text-[#00263d] truncate">Quick Links</span>
                    </>
                  ) : (
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Bookmark className="h-4 w-4 text-[#c19962]" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">Quick Links</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </button>

                {/* Collapsed: Icon-only link buttons */}
                {!linksExpanded && (
                  <div className="flex flex-col items-center gap-1 py-2 px-1">
                    {coachLinks.map((link) => (
                      <TooltipProvider key={link.id} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-colors hover:ring-2 hover:ring-[#c19962]/40 ${link.bg || 'bg-slate-50'} ${link.color || 'text-slate-700'}`}
                            >
                              {link.label.substring(0, 2).toUpperCase()}
                            </a>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            <p className="font-medium">{link.label}</p>
                            <p className="text-muted-foreground truncate max-w-[200px]">{link.url}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => { setLinksExpanded(true); setAddingLink(true); }}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors border border-dashed"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">Add custom link</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {/* Expanded: Full link list with actions */}
                {linksExpanded && (
                  <div className="p-2 space-y-1.5">
                    {coachLinks.map((link) => (
                      <div key={link.id}>
                        {editingLinkId === link.id ? (
                          <div className="space-y-1.5 p-2 rounded-lg bg-muted/40">
                            <Input
                              value={linkForm.label}
                              onChange={(e) => setLinkForm(f => ({ ...f, label: e.target.value }))}
                              placeholder="Label"
                              className="h-7 text-xs"
                              autoFocus
                            />
                            <Input
                              value={linkForm.url}
                              onChange={(e) => setLinkForm(f => ({ ...f, url: e.target.value }))}
                              placeholder="https://..."
                              className="h-7 text-xs"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateLink(link.id); }}
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-[10px] flex-1 bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]" onClick={() => handleUpdateLink(link.id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => { setEditingLinkId(null); setLinkForm({ label: '', url: '' }); }}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors hover:bg-muted/40 ${link.bg || 'bg-slate-50/50'}`}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex-1 min-w-0 flex items-center gap-1.5 ${link.color || 'text-slate-700'}`}
                            >
                              <Globe className="h-3 w-3 shrink-0 opacity-60" />
                              <span className="text-xs font-medium truncate">{link.label}</span>
                            </a>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(link.url, link.label)}
                                className="p-1 rounded hover:bg-black/5"
                                title="Copy link"
                              >
                                <ClipboardCopy className="h-3 w-3 text-muted-foreground" />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingLinkId(link.id); setLinkForm({ label: link.label, url: link.url }); }}
                                className="p-1 rounded hover:bg-black/5"
                                title="Edit link"
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </button>
                              {!link.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLink(link.id)}
                                  className="p-1 rounded hover:bg-red-50"
                                  title="Remove link"
                                >
                                  <Trash2 className="h-3 w-3 text-red-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Link Form */}
                    {addingLink ? (
                      <div className="space-y-1.5 p-2 rounded-lg border border-dashed border-[#c19962]/40 bg-[#c19962]/5">
                        <Input
                          value={linkForm.label}
                          onChange={(e) => setLinkForm(f => ({ ...f, label: e.target.value }))}
                          placeholder="Link name (e.g. My Dispensary)"
                          className="h-7 text-xs"
                          autoFocus
                        />
                        <Input
                          value={linkForm.url}
                          onChange={(e) => setLinkForm(f => ({ ...f, url: e.target.value }))}
                          placeholder="https://..."
                          className="h-7 text-xs"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddLink(); }}
                        />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-[10px] flex-1 bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]" onClick={handleAddLink}>
                            <Plus className="h-3 w-3 mr-0.5" /> Add
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => { setAddingLink(false); setLinkForm({ label: '', url: '' }); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setAddingLink(true); setLinkForm({ label: '', url: '' }); }}
                        className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Add Link
                      </button>
                    )}
                  </div>
                )}
              </Card>

              {/* Cronometer Data Panel */}
              {hasCronometerLink && (
                <Card className="border-amber-300/50 overflow-hidden mt-2">
                  {/* Toggle Header */}
                  <button
                    type="button"
                    onClick={() => {
                      // If collapsed, just expand sidebar so icons are visible
                      if (!linksExpanded) setLinksExpanded(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-2 hover:bg-amber-50/50 transition-colors border-b bg-amber-50/30"
                  >
                    {linksExpanded ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-semibold text-[#00263d] truncate">Cronometer</span>
                      </>
                    ) : (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <TrendingUp className="h-4 w-4 text-amber-600" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">Cronometer Data</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </button>

                  {/* Collapsed: Icon-only buttons */}
                  {!linksExpanded && (
                    <div className="flex flex-col items-center gap-1 py-2 px-1">
                      {([
                        { id: 'trends' as const, icon: TrendingUp, label: 'Trends' },
                        { id: 'foodlog' as const, icon: Utensils, label: 'Food Log' },
                        { id: 'biometrics' as const, icon: Heart, label: 'Biometrics' },
                        { id: 'fasting' as const, icon: Clock, label: 'Fasting' },
                        { id: 'targets' as const, icon: Target, label: 'Targets' },
                      ]).map(({ id, icon: Icon, label }) => (
                        <TooltipProvider key={id} delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => openCronometerModal(id)}
                                className={cn(
                                  "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                                  activeCronometerModal === id
                                    ? "bg-amber-500 text-white"
                                    : "text-muted-foreground hover:bg-amber-50 hover:text-amber-700"
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                      {isFetchingCM && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500 mt-1" />
                      )}
                    </div>
                  )}

                  {/* Expanded: Full labels */}
                  {linksExpanded && (
                    <div className="p-2 space-y-1">
                      {([
                        { id: 'trends' as const, icon: TrendingUp, label: 'Trends' },
                        { id: 'foodlog' as const, icon: Utensils, label: 'Food Log' },
                        { id: 'biometrics' as const, icon: Heart, label: 'Biometrics' },
                        { id: 'fasting' as const, icon: Clock, label: 'Fasting' },
                        { id: 'targets' as const, icon: Target, label: 'Targets' },
                      ]).map(({ id, icon: Icon, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => openCronometerModal(id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            activeCronometerModal === id
                              ? "bg-amber-100 text-amber-800"
                              : "text-muted-foreground hover:bg-amber-50 hover:text-amber-700"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{label}</span>
                        </button>
                      ))}
                      {isFetchingCM && (
                        <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-amber-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading...
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground text-center pt-1 truncate">
                        {cronometerClientName || `Client #${cronometerClientId}`}
                      </p>
                    </div>
                  )}
                </Card>
              )}

              {/* ============ FAVORITE RECIPES SECTION ============ */}
              {activeClientId && (
                <Card className="border-pink-300/50 overflow-hidden mt-2">
                  <button
                    type="button"
                    onClick={() => { if (!linksExpanded) setLinksExpanded(true); setFavoritesExpanded(!favoritesExpanded); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-2 hover:bg-pink-50/50 transition-colors border-b bg-pink-50/30"
                  >
                    {linksExpanded ? (
                      <>
                        <Heart className="h-4 w-4 text-pink-500 shrink-0" />
                        <span className="text-xs font-semibold text-[#00263d] truncate">
                          Favorites {favoriteRecipes.length > 0 && `(${favoriteRecipes.length})`}
                        </span>
                      </>
                    ) : (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative">
                              <Heart className="h-4 w-4 text-pink-500" />
                              {favoriteRecipes.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[8px] rounded-full w-3 h-3 flex items-center justify-center">
                                  {favoriteRecipes.length}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            Favorite Recipes ({favoriteRecipes.length})
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </button>

                  {linksExpanded && favoritesExpanded && (
                    <div className="p-2 space-y-1.5 max-h-[300px] overflow-y-auto">
                      {favoriteRecipes.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-3">
                          No favorites yet. Click the heart icon on any recipe or meal to save it here.
                        </p>
                      ) : (
                        favoriteRecipes.map(fav => (
                          <div
                            key={fav.id}
                            className="group flex items-start gap-2 p-1.5 rounded-lg hover:bg-pink-50/60 transition-colors"
                          >
                            {fav.image_url ? (
                              <img src={fav.image_url} alt={fav.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-pink-100 flex items-center justify-center flex-shrink-0">
                                <ChefHat className="h-3.5 w-3.5 text-pink-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium truncate">{fav.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {fav.calories}cal · {fav.protein}P · {fav.carbs}C · {fav.fat}F
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                removeFavoriteRecipe(fav.id);
                                toast.success('Removed from favorites');
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-pink-100 transition-all"
                            >
                              <X className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* ============ CLIENT RESOURCES SECTION ============ */}
              {activeClientId && (
                <Card className="border-blue-300/50 overflow-hidden mt-2">
                  <button
                    type="button"
                    onClick={() => { if (!linksExpanded) setLinksExpanded(true); setResourcesExpanded(!resourcesExpanded); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-2 hover:bg-blue-50/50 transition-colors border-b bg-blue-50/30"
                  >
                    {linksExpanded ? (
                      <>
                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="text-xs font-semibold text-[#00263d] truncate">
                          Resources {clientResources.length > 0 && `(${clientResources.length})`}
                        </span>
                      </>
                    ) : (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative">
                              <FileText className="h-4 w-4 text-blue-500" />
                              {clientResources.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] rounded-full w-3 h-3 flex items-center justify-center">
                                  {clientResources.length}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            Client Resources ({clientResources.length})
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </button>

                  {linksExpanded && resourcesExpanded && (
                    <div className="p-2 space-y-1.5">
                      {/* Add Resource Buttons */}
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-6 flex-1 border-dashed"
                          onClick={() => setAddingResourceType('link')}
                        >
                          <Globe className="h-3 w-3 mr-0.5" /> Add Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-6 flex-1 border-dashed"
                          onClick={() => resourceFileInputRef.current?.click()}
                        >
                          <ArrowUpFromLine className="h-3 w-3 mr-0.5" /> Upload File
                        </Button>
                        <input
                          ref={resourceFileInputRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp"
                          onChange={handleResourceFileUpload}
                        />
                      </div>

                      {/* Add Link Form */}
                      {addingResourceType === 'link' && (
                        <div className="space-y-1.5 p-2 rounded-lg bg-blue-50/40 border border-blue-200/50">
                          <Input
                            placeholder="Title (e.g., Meal Prep Guide)"
                            value={resourceForm.title}
                            onChange={(e) => setResourceForm(prev => ({ ...prev, title: e.target.value }))}
                            className="h-7 text-xs"
                          />
                          <Input
                            placeholder="URL (https://...)"
                            value={resourceForm.url}
                            onChange={(e) => setResourceForm(prev => ({ ...prev, url: e.target.value }))}
                            className="h-7 text-xs"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddResourceLink(); }}
                          />
                          <div className="flex gap-1">
                            <Button size="sm" className="h-6 text-[10px] flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddResourceLink}>
                              <Plus className="h-3 w-3 mr-0.5" /> Add
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => { setAddingResourceType(null); setResourceForm({ title: '', url: '', description: '' }); }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Uploading indicator */}
                      {isUploadingResource && (
                        <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-blue-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading...
                        </div>
                      )}

                      {/* Resource List */}
                      <div className="max-h-[250px] overflow-y-auto space-y-1">
                        {clientResources.length === 0 && !addingResourceType ? (
                          <p className="text-[11px] text-muted-foreground text-center py-3">
                            No resources yet. Share guides, files, and links with this client.
                          </p>
                        ) : (
                          clientResources.map(res => (
                            <div
                              key={res.id}
                              className="group flex items-start gap-2 p-1.5 rounded-lg hover:bg-blue-50/60 transition-colors"
                            >
                              <div className="w-7 h-7 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                                {res.type === 'link' ? (
                                  <Globe className="h-3.5 w-3.5 text-blue-500" />
                                ) : (
                                  <FileDown className="h-3.5 w-3.5 text-blue-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-medium text-blue-700 hover:underline truncate block"
                                >
                                  {res.title}
                                </a>
                                {res.description && (
                                  <p className="text-[10px] text-muted-foreground truncate">{res.description}</p>
                                )}
                                <p className="text-[9px] text-muted-foreground">
                                  {res.type === 'file' && res.fileSize
                                    ? `${(res.fileSize / 1024).toFixed(0)}KB · `
                                    : ''}
                                  {new Date(res.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  removeClientResource(res.id);
                                  toast.success('Resource removed');
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-blue-100 transition-all"
                              >
                                <X className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className={`flex-1 transition-all ${showPreview || showGroceryList ? 'max-w-[60%]' : ''}`}>
            {viewMode === 'day-types' ? (
              // ============ DAY TYPES VIEW ============
              <div className="space-y-4">
                {/* Day Type Selector */}
                <div className="flex gap-2 flex-wrap">
                  {dayTypes.map(dt => {
                    const filledForType = dt.days.reduce((sum, day) => {
                      return sum + (mealPlan?.[day]?.meals?.filter(m => m !== null).length || 0);
                    }, 0);
                    const totalForType = dt.days.length * (dt.mealsCount + dt.snacksCount);
                    const isComplete = filledForType === totalForType;
                    
                    return (
                      <Button
                        key={dt.id}
                        variant={selectedDayType === dt.id ? 'default' : 'outline'}
                        className={`flex-col h-auto py-3 px-4 min-w-[140px] ${
                          selectedDayType === dt.id ? 'bg-[#00263d] hover:bg-[#003b59]' : ''
                        }`}
                        onClick={() => setSelectedDayType(dt.id)}
                      >
                        <div className="flex items-center gap-2">
                          {dt.isWorkoutDay ? (
                            <Dumbbell className="h-4 w-4" />
                          ) : (
                            <Coffee className="h-4 w-4" />
                          )}
                          <span className="font-medium">{dt.label}</span>
                          {isComplete && <CheckCircle className="h-3 w-3 text-green-400" />}
                        </div>
                        <span className="text-xs opacity-70 mt-1">
                          {dt.days.map(d => d.substring(0, 3)).join(', ')}
                        </span>
                        <span className="text-xs opacity-50 mt-0.5">
                          {dt.description} • ~{dt.avgCalories} cal
                        </span>
                      </Button>
                    );
                  })}
                </div>

                {currentDayType && (
                  <>
                    {/* Day Type Context - Editable Targets */}
                    <Card className="bg-gradient-to-r from-[#00263d] to-[#003b59] text-white">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                              {currentDayType.isWorkoutDay ? (
                                <Dumbbell className="h-5 w-5 text-[#c19962]" />
                              ) : (
                                <Coffee className="h-5 w-5 text-[#c19962]" />
                              )}
                              {currentDayType.label} Template
                            </h2>
                            <p className="text-sm opacity-80 mt-1">
                              Applies to: <span className="font-medium">{currentDayType.days.join(', ')}</span>
                            </p>
                          </div>
                          {!editingDayTargets ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[#c19962] hover:text-white hover:bg-white/10 h-7 text-xs"
                              onClick={() => {
                                setEditingDayTargets(true);
                                setLocalDayTargets({
                                  calories: Math.round(dayTargets?.targetCalories || 0),
                                  protein: Math.round(dayTargets?.protein || 0),
                                  carbs: Math.round(dayTargets?.carbs || 0),
                                  fat: Math.round(dayTargets?.fat || 0),
                                });
                              }}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit Targets
                            </Button>
                          ) : (
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                className="bg-[#c19962] text-[#00263d] hover:bg-[#e4ac61] h-7 text-xs"
                                onClick={() => localDayTargets && handleSaveDayTargets(localDayTargets)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-white/70 hover:text-white hover:bg-white/10 h-7 text-xs"
                                onClick={() => { setEditingDayTargets(false); setLocalDayTargets(null); }}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {/* Editable Target Fields with intelligent guidance */}
                        {(() => {
                          // Original designed targets (from planning step) for delta comparison
                          const orig = {
                            calories: Math.round(dayTargets?.targetCalories || 0),
                            protein: Math.round(dayTargets?.protein || 0),
                            carbs: Math.round(dayTargets?.carbs || 0),
                            fat: Math.round(dayTargets?.fat || 0),
                          };
                          // When editing, compute what calories SHOULD be from current macros
                          const macroDerivedCal = localDayTargets
                            ? (localDayTargets.protein * 4) + (localDayTargets.carbs * 4) + (localDayTargets.fat * 9)
                            : 0;
                          const calMismatch = localDayTargets
                            ? Math.abs(localDayTargets.calories - macroDerivedCal) > 5
                            : false;

                          // Smart onChange: when a macro changes, auto-recalculate calories
                          const handleMacroEdit = (key: 'calories' | 'protein' | 'carbs' | 'fat', raw: string) => {
                            const value = Number(raw) || 0;
                            setLocalDayTargets(prev => {
                              if (!prev) return null;
                              const updated = { ...prev, [key]: value };
                              // If a macro changed (not calories directly), auto-recalculate calories
                              if (key !== 'calories') {
                                updated.calories = (updated.protein * 4) + (updated.carbs * 4) + (updated.fat * 9);
                              }
                              return updated;
                            });
                          };

                          return (
                            <div className="grid grid-cols-4 gap-3">
                              {[
                                { key: 'calories' as const, label: 'Calories', unit: 'kcal', color: 'text-[#c19962]', bgColor: 'bg-[#c19962]/20' },
                                { key: 'protein' as const, label: 'Protein', unit: 'g', color: 'text-blue-300', bgColor: 'bg-blue-500/20' },
                                { key: 'carbs' as const, label: 'Carbs', unit: 'g', color: 'text-amber-300', bgColor: 'bg-amber-500/20' },
                                { key: 'fat' as const, label: 'Fat', unit: 'g', color: 'text-purple-300', bgColor: 'bg-purple-500/20' },
                              ].map(({ key, label, unit, color, bgColor }) => {
                                const delta = localDayTargets ? localDayTargets[key] - orig[key] : 0;
                                return (
                                  <div key={key} className={`rounded-lg p-2.5 ${bgColor}`}>
                                    <p className={`text-[10px] font-medium ${color} uppercase tracking-wider mb-1`}>{label}</p>
                                    {editingDayTargets && localDayTargets ? (
                                      <>
                                        <input
                                          type="number"
                                          className={cn(
                                            "w-full bg-white/10 border rounded px-2 py-1 text-lg font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#c19962] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                            key === 'calories' && calMismatch ? 'border-amber-400/60' : 'border-white/20'
                                          )}
                                          value={localDayTargets[key]}
                                          onChange={(e) => handleMacroEdit(key, e.target.value)}
                                        />
                                        {/* Delta from designed target */}
                                        {delta !== 0 && (
                                          <p className={cn(
                                            "text-[10px] mt-1 font-medium",
                                            delta > 0 ? 'text-green-300' : 'text-red-300'
                                          )}>
                                            {delta > 0 ? '+' : ''}{delta}{key === 'calories' ? '' : 'g'} vs plan
                                          </p>
                                        )}
                                        {key === 'calories' && calMismatch && (
                                          <p className="text-[9px] mt-0.5 text-amber-300/80">
                                            Macros = {macroDerivedCal} cal
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      <p className="text-xl font-bold">
                                        {orig[key]}
                                        <span className="text-xs font-normal opacity-60 ml-1">{unit}</span>
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Rolling Macro Budget */}
                        {macroBudget && dayProgress.filled > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1.5">Remaining Budget</p>
                            <div className="grid grid-cols-4 gap-3 text-center">
                              {[
                                { label: 'Cal', val: macroBudget.calories, color: macroBudget.calories.remaining < 0 ? 'text-red-300' : 'text-[#c19962]' },
                                { label: 'Protein', val: macroBudget.protein, color: macroBudget.protein.remaining < 0 ? 'text-red-300' : 'text-blue-300' },
                                { label: 'Carbs', val: macroBudget.carbs, color: macroBudget.carbs.remaining < 0 ? 'text-red-300' : 'text-amber-300' },
                                { label: 'Fat', val: macroBudget.fat, color: macroBudget.fat.remaining < 0 ? 'text-red-300' : 'text-purple-300' },
                              ].map(({ label, val, color }) => (
                                <div key={label}>
                                  <p className={`text-sm font-bold ${color}`}>
                                    {val.remaining > 0 ? val.remaining : val.remaining}
                                    {label !== 'Cal' && 'g'}
                                  </p>
                                  <p className="text-[9px] text-white/40">{val.used} / {val.target} used</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Diet Preferences Panel - ALWAYS VISIBLE */}
                    <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Info className="h-4 w-4 text-amber-600" />
                          Client Diet Preferences
                          <span className="text-xs font-normal text-muted-foreground ml-auto">
                            AI & recipes will respect these
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-0 pb-3 space-y-2">
                        {/* Restrictions & Allergies Row */}
                        {((dietPreferences?.allergies?.length || 0) > 0 || 
                          (dietPreferences?.customAllergies?.length || 0) > 0 ||
                          (dietPreferences?.dietaryRestrictions?.length || 0) > 0) && (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-xs font-medium text-red-700">⛔ Avoid:</span>
                            {dietPreferences?.dietaryRestrictions?.map(r => (
                              <Badge key={r} className="bg-orange-100 text-orange-800 text-xs">{r}</Badge>
                            ))}
                            {[...(dietPreferences?.allergies || []), ...(dietPreferences?.customAllergies || [])].map(a => (
                              <Badge key={a} className="bg-red-100 text-red-800 text-xs">🚨 {a}</Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Foods to Avoid Row */}
                        {(dietPreferences?.foodsToAvoid?.length || 0) > 0 && (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-xs font-medium text-orange-700">❌ Foods to Avoid:</span>
                            {dietPreferences?.foodsToAvoid?.map(f => (
                              <Badge key={f} variant="outline" className="text-xs border-orange-300 text-orange-700">{f}</Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Foods to Emphasize Row */}
                        {(dietPreferences?.foodsToEmphasize?.length || 0) > 0 && (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-xs font-medium text-green-700">✅ Emphasize:</span>
                            {dietPreferences?.foodsToEmphasize?.map(f => (
                              <Badge key={f} className="bg-green-100 text-green-800 text-xs">⭐ {f}</Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Preferred Foods Row */}
                        {((dietPreferences?.preferredProteins?.length || 0) > 0 || 
                          (dietPreferences?.preferredCarbs?.length || 0) > 0 ||
                          (dietPreferences?.preferredVegetables?.length || 0) > 0) && (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-xs font-medium text-blue-700">💙 Prefers:</span>
                            {dietPreferences?.preferredProteins?.slice(0, 3).map(p => (
                              <Badge key={p} variant="outline" className="text-xs border-blue-300 text-blue-700">{p}</Badge>
                            ))}
                            {dietPreferences?.preferredCarbs?.slice(0, 2).map(c => (
                              <Badge key={c} variant="outline" className="text-xs border-blue-300 text-blue-700">{c}</Badge>
                            ))}
                            {dietPreferences?.preferredVegetables?.slice(0, 2).map(v => (
                              <Badge key={v} variant="outline" className="text-xs border-blue-300 text-blue-700">{v}</Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* No preferences set */}
                        {!(dietPreferences?.allergies?.length || dietPreferences?.customAllergies?.length ||
                           dietPreferences?.dietaryRestrictions?.length ||
                           dietPreferences?.foodsToAvoid?.length || dietPreferences?.foodsToEmphasize?.length ||
                           dietPreferences?.preferredProteins?.length || dietPreferences?.preferredCarbs?.length ||
                           dietPreferences?.preferredVegetables?.length) && (
                          <p className="text-xs text-muted-foreground">
                            No dietary preferences set. <Button variant="link" className="h-auto p-0 text-xs" onClick={() => router.push('/preferences')}>Add preferences →</Button>
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleGenerateDayType}
                        disabled={isGenerating}
                        className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Generate {currentDayType.label}
                      </Button>
                      
                      {currentDayType.days.length > 1 && dayProgress.filled > 0 && (
                        <Button
                          variant="outline"
                          onClick={handleCopyToSimilarDays}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy to {currentDayType.days.length - 1} Similar Days
                        </Button>
                      )}
                      
                      {dayProgress.filled > 0 && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            clearDayMeals(currentDay);
                            toast.success('Template cleared');
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      )}
                      
                      <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{dayProgress.filled}/{dayProgress.total} meals</span>
                        <span className="font-mono">{dayProgress.calories}/{dayProgress.targetCalories} cal</span>
                        {macroBudget && dayProgress.filled > 0 && (
                          <span className="text-xs">
                            <span className={macroBudget.protein.remaining < 0 ? 'text-red-500' : 'text-blue-600'}>{macroBudget.protein.remaining}g P</span>
                            {' • '}
                            <span className={macroBudget.carbs.remaining < 0 ? 'text-red-500' : 'text-amber-600'}>{macroBudget.carbs.remaining}g C</span>
                            {' • '}
                            <span className={macroBudget.fat.remaining < 0 ? 'text-red-500' : 'text-purple-600'}>{macroBudget.fat.remaining}g F</span>
                            <span className="text-muted-foreground ml-1">left</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meal Slots */}
                    {editingSlot !== null ? (
                      <ManualMealForm
                        slot={mealSlots[editingSlot]}
                        existingMeal={mealSlots[editingSlot]?.meal}
                        dietPreferences={dietPreferences}
                        onSave={(meal) => handleSaveMeal(editingSlot, meal)}
                        onCancel={() => setEditingSlot(null)}
                      />
                    ) : (
                      <div className="space-y-3">
                        {mealSlots.map((slot, idx) => (
                          <MealSlotCard
                            key={slot.id}
                            slot={slot}
                            onGenerateMeal={handleGenerateMeal}
                            onManualEntry={(i) => setEditingSlot(i)}
                            onEditMeal={(i) => setEditingSlot(i)}
                            onSwapMeal={(i) => setSwappingSlot(i)}
                            onBrowseRecipes={(i) => setBrowsingRecipesSlot(i)}
                            onUpdateSupplements={(i, supps) => handleUpdateMealSupplements(currentDay, i, supps)}
                            onDeleteMeal={(i) => {
                              deleteMeal(currentDay, i);
                              toast.success('Meal removed');
                            }}
                            onToggleLock={(i) => setMealLocked(currentDay, i, !slot.isLocked)}
                            onUpdateNote={(i, note) => updateMealNote(currentDay, i, note)}
                            onGenerateNote={handleGenerateNote}
                            isGenerating={generatingSlots[idx] || false}
                            isGeneratingNote={generatingNotes[idx] || false}
                            currentPattern={cronometerMode ? getPatternForSlot(slot.label, slot.type) : undefined}
                            adaptiveTips={cronometerMode ? adaptiveTips[`${currentDay}-${slot.slotIndex}`] : undefined}
                            onGetTips={cronometerMode ? handleGetTips : undefined}
                            onGenerateImproved={cronometerMode ? handleGenerateImproved : undefined}
                            isGeneratingTips={generatingTips[slot.slotIndex] || false}
                            isGeneratingImproved={generatingImproved[slot.slotIndex] || false}
                            onUpdateSlotTargets={handleUpdateSlotTargets}
                            rollingBudgetAfter={rollingBudgets[idx]}
                          />
                        ))}
                      </div>
                    )}

                    {/* Supplements & Quick Links */}
                    {renderSupplementsCard(currentDay)}
                  </>
                )}
              </div>
            ) : (
              // ============ WEEKLY VIEW ============
              <Tabs value={selectedDay} onValueChange={(v) => setSelectedDay(v as DayOfWeek)}>
                <TabsList className="grid grid-cols-7 mb-4">
                  {DAYS.map(day => {
                    const schedule = weeklySchedule[day];
                    const dayTargetsForDay = nutritionTargets.find(t => t.day === day);
                    // Use phase nutrition targets for workout status, fallback to schedule
                    const hasWorkout = dayTargetsForDay?.isWorkoutDay ?? schedule?.workouts?.some(w => w.enabled);
                    const filled = mealPlan?.[day]?.meals?.filter(m => m !== null).length || 0;
                    const total = (schedule?.mealCount || 3) + (schedule?.snackCount || 2);
                    
                    return (
                      <TabsTrigger 
                        key={day} 
                        value={day}
                        className="data-[state=active]:bg-[#c19962] data-[state=active]:text-[#00263d]"
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-xs">{day.substring(0, 3)}</span>
                          <div className="flex items-center gap-0.5 text-[10px]">
                            {hasWorkout && <Dumbbell className="h-3 w-3" />}
                            {filled === total ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <span>{filled}/{total}</span>
                            )}
                          </div>
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                
                {DAYS.map(day => (
                  <TabsContent key={day} value={day} className="space-y-3">
                    {/* Day Header - Editable Targets */}
                    <Card className="bg-gradient-to-r from-[#00263d] to-[#003b59] text-white">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold">{day}</h2>
                            {dayTargets?.isWorkoutDay && (
                              <Badge className="bg-[#c19962] text-[#00263d]">
                                <Dumbbell className="h-3 w-3 mr-1" />
                                Workout
                              </Badge>
                            )}
                          </div>
                          {!editingDayTargets ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[#c19962] hover:text-white hover:bg-white/10 h-7 text-xs"
                              onClick={() => {
                                setEditingDayTargets(true);
                                setLocalDayTargets({
                                  calories: Math.round(dayTargets?.targetCalories || 0),
                                  protein: Math.round(dayTargets?.protein || 0),
                                  carbs: Math.round(dayTargets?.carbs || 0),
                                  fat: Math.round(dayTargets?.fat || 0),
                                });
                              }}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          ) : (
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                className="bg-[#c19962] text-[#00263d] hover:bg-[#e4ac61] h-7 text-xs"
                                onClick={() => localDayTargets && handleSaveDayTargets(localDayTargets)}
                              >
                                Save
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-white/70 hover:text-white hover:bg-white/10 h-7 text-xs"
                                onClick={() => { setEditingDayTargets(false); setLocalDayTargets(null); }}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                        {(() => {
                          const origW = {
                            calories: Math.round(dayTargets?.targetCalories || 0),
                            protein: Math.round(dayTargets?.protein || 0),
                            carbs: Math.round(dayTargets?.carbs || 0),
                            fat: Math.round(dayTargets?.fat || 0),
                          };
                          const macroDerivedCalW = localDayTargets
                            ? (localDayTargets.protein * 4) + (localDayTargets.carbs * 4) + (localDayTargets.fat * 9)
                            : 0;
                          const handleMacroEditW = (key: 'calories' | 'protein' | 'carbs' | 'fat', raw: string) => {
                            const value = Number(raw) || 0;
                            setLocalDayTargets(prev => {
                              if (!prev) return null;
                              const updated = { ...prev, [key]: value };
                              if (key !== 'calories') {
                                updated.calories = (updated.protein * 4) + (updated.carbs * 4) + (updated.fat * 9);
                              }
                              return updated;
                            });
                          };
                          return (
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { key: 'calories' as const, label: 'Cal', color: 'text-[#c19962]', bgColor: 'bg-[#c19962]/20' },
                                { key: 'protein' as const, label: 'P', color: 'text-blue-300', bgColor: 'bg-blue-500/20' },
                                { key: 'carbs' as const, label: 'C', color: 'text-amber-300', bgColor: 'bg-amber-500/20' },
                                { key: 'fat' as const, label: 'F', color: 'text-purple-300', bgColor: 'bg-purple-500/20' },
                              ].map(({ key, label, color, bgColor }) => {
                                const deltaW = localDayTargets ? localDayTargets[key] - origW[key] : 0;
                                return (
                                  <div key={key} className={`rounded-md p-1.5 ${bgColor} text-center`}>
                                    <p className={`text-[9px] ${color} uppercase`}>{label}</p>
                                    {editingDayTargets && localDayTargets ? (
                                      <>
                                        <input
                                          type="number"
                                          className={cn(
                                            "w-full bg-white/10 border rounded px-1 py-0.5 text-sm font-bold text-white text-center focus:outline-none focus:ring-1 focus:ring-[#c19962] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                            key === 'calories' && Math.abs(localDayTargets.calories - macroDerivedCalW) > 5 ? 'border-amber-400/60' : 'border-white/20'
                                          )}
                                          value={localDayTargets[key]}
                                          onChange={(e) => handleMacroEditW(key, e.target.value)}
                                        />
                                        {deltaW !== 0 && (
                                          <p className={cn("text-[9px] mt-0.5 font-medium", deltaW > 0 ? 'text-green-300' : 'text-red-300')}>
                                            {deltaW > 0 ? '+' : ''}{deltaW}
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      <p className="text-lg font-bold">
                                        {origW[key]}
                                        {key !== 'calories' && <span className="text-[9px] font-normal opacity-50">g</span>}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                        {/* Remaining budget in weekly view */}
                        {macroBudget && dayProgress.filled > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-3 text-[10px] text-white/50">
                            <span>Remaining:</span>
                            <span className={macroBudget.calories.remaining < 0 ? 'text-red-300' : ''}>{macroBudget.calories.remaining} cal</span>
                            <span className={macroBudget.protein.remaining < 0 ? 'text-red-300' : 'text-blue-300'}>{macroBudget.protein.remaining}g P</span>
                            <span className={macroBudget.carbs.remaining < 0 ? 'text-red-300' : 'text-amber-300'}>{macroBudget.carbs.remaining}g C</span>
                            <span className={macroBudget.fat.remaining < 0 ? 'text-red-300' : 'text-purple-300'}>{macroBudget.fat.remaining}g F</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Meal Slots for Weekly View */}
                    {editingSlot !== null ? (
                      <ManualMealForm
                        slot={mealSlots[editingSlot]}
                        existingMeal={mealSlots[editingSlot]?.meal}
                        dietPreferences={dietPreferences}
                        onSave={(meal) => handleSaveMeal(editingSlot, meal)}
                        onCancel={() => setEditingSlot(null)}
                      />
                    ) : (
                      <div className="space-y-3">
                        {mealSlots.map((slot, idx) => (
                          <MealSlotCard
                            key={slot.id}
                            slot={slot}
                            onGenerateMeal={handleGenerateMeal}
                            onManualEntry={(i) => setEditingSlot(i)}
                            onEditMeal={(i) => setEditingSlot(i)}
                            onSwapMeal={(i) => setSwappingSlot(i)}
                            onBrowseRecipes={(i) => setBrowsingRecipesSlot(i)}
                            onUpdateSupplements={(i, supps) => handleUpdateMealSupplements(selectedDay, i, supps)}
                            onDeleteMeal={(i) => {
                              deleteMeal(selectedDay, i);
                              toast.success('Meal removed');
                            }}
                            onToggleLock={(i) => setMealLocked(selectedDay, i, !slot.isLocked)}
                            onUpdateNote={(i, note) => updateMealNote(selectedDay, i, note)}
                            onGenerateNote={handleGenerateNote}
                            isGenerating={generatingSlots[idx] || false}
                            isGeneratingNote={generatingNotes[idx] || false}
                            currentPattern={cronometerMode ? getPatternForSlot(slot.label, slot.type) : undefined}
                            adaptiveTips={cronometerMode ? adaptiveTips[`${selectedDay}-${slot.slotIndex}`] : undefined}
                            onGetTips={cronometerMode ? handleGetTips : undefined}
                            onGenerateImproved={cronometerMode ? handleGenerateImproved : undefined}
                            isGeneratingTips={generatingTips[slot.slotIndex] || false}
                            isGeneratingImproved={generatingImproved[slot.slotIndex] || false}
                            onUpdateSlotTargets={handleUpdateSlotTargets}
                            rollingBudgetAfter={rollingBudgets[idx]}
                          />
                        ))}
                      </div>
                    )}

                    {/* Supplements & Quick Links */}
                    {renderSupplementsCard(selectedDay)}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>

          {/* Side Panel - Progress Summary (default), PDF Preview, or Grocery List */}
          {!(showPreview || showGroceryList) && (
            <div className="w-[320px] hidden xl:block">
              <div className="sticky top-20">
                <ProgressSummary currentStep={5} />
              </div>
            </div>
          )}
          
          {(showPreview || showGroceryList) && (
            <div className="w-[40%] max-w-[500px]">
              <Card className="sticky top-20 h-[calc(100vh-140px)] flex flex-col">
                <CardHeader className="py-3 border-b flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {showGroceryList ? (
                        <>
                          <ShoppingCart className="h-4 w-4 text-[#c19962]" />
                          Grocery List
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 text-[#c19962]" />
                          PDF Preview
                        </>
                      )}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setShowPreview(false);
                        setShowGroceryList(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <ScrollArea className="flex-1">
                  <CardContent className="py-4">
                    {showGroceryList ? (
                      // Grocery List
                      <div className="space-y-4">
                        {groceryList.length === 0 ? (
                          <div className="text-center py-8">
                            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">
                              Add meals to see your grocery list
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                {groceryList.length} items from {overallProgress.filledSlots} meals
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  const text = groceryList.map(i => `${i.qty} ${i.unit} ${i.name}`).join('\n');
                                  navigator.clipboard.writeText(text);
                                  toast.success('Grocery list copied to clipboard!');
                                }}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                            
                            {/* Categorized grocery list */}
                            {['protein', 'carbs', 'vegetables', 'fats', 'seasonings', 'other'].map(category => {
                              const items = groceryList.filter(i => i.category === category);
                              if (items.length === 0) return null;
                              
                              const categoryLabels: Record<string, { label: string; color: string }> = {
                                protein: { label: 'Proteins', color: 'bg-blue-100 text-blue-700' },
                                carbs: { label: 'Carbs & Grains', color: 'bg-amber-100 text-amber-700' },
                                vegetables: { label: 'Vegetables', color: 'bg-green-100 text-green-700' },
                                fats: { label: 'Fats & Oils', color: 'bg-purple-100 text-purple-700' },
                                seasonings: { label: 'Seasonings', color: 'bg-orange-100 text-orange-700' },
                                other: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
                              };
                              const catInfo = categoryLabels[category] || categoryLabels.other;
                              
                              return (
                                <div key={category} className="space-y-1">
                                  <Badge variant="outline" className={`text-[10px] ${catInfo.color}`}>
                                    {catInfo.label} ({items.length})
                                  </Badge>
                                  <div className="space-y-0.5 ml-1">
                                    {items.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between py-1 border-b border-dashed last:border-0">
                                        <span className="text-sm">{item.name}</span>
                                        <span className="text-xs text-muted-foreground font-mono">
                                          {item.qty} {item.unit}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    ) : (
                      // PDF Preview
                      <div className="space-y-4">
                        {/* Client Info */}
                        <div className="p-3 bg-[#00263d] text-white rounded-lg">
                          <div className="flex items-center gap-2">
                            <img 
                              src="/fitomics-logo.svg" 
                              alt="Fitomics" 
                              className="h-6 w-6 invert"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span className="font-bold text-sm">Personalized Nutrition Strategy</span>
                          </div>
                          <p className="text-xs opacity-70 mt-1">Prepared for {userProfile.name || 'Client'}</p>
                        </div>

                        {/* Summary */}
                        <div className="p-3 border rounded-lg space-y-2">
                          <h4 className="font-medium text-sm">Goal: {bodyCompGoals?.goalType?.replace('_', ' ') || 'Maintain'}</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Avg Calories:</span>
                              <span className="ml-1 font-medium">
                                {Math.round(nutritionTargets.reduce((s, t) => s + t.targetCalories, 0) / 7)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Avg Protein:</span>
                              <span className="ml-1 font-medium">
                                {Math.round(nutritionTargets.reduce((s, t) => s + t.protein, 0) / 7)}g
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Day Types Preview */}
                        <Accordion type="multiple" className="w-full">
                          {dayTypes.map(dt => {
                            const firstDayPlan = mealPlan?.[dt.days[0]];
                            const meals = firstDayPlan?.meals?.filter(m => m !== null) || [];
                            
                            return (
                              <AccordionItem key={dt.id} value={dt.id}>
                                <AccordionTrigger className="text-sm py-2">
                                  <div className="flex items-center gap-2">
                                    {dt.isWorkoutDay ? (
                                      <Dumbbell className="h-3 w-3 text-[#c19962]" />
                                    ) : (
                                      <Coffee className="h-3 w-3 text-[#c19962]" />
                                    )}
                                    {dt.label}
                                    <Badge variant="outline" className="text-[10px] ml-2">
                                      {dt.days.map(d => d.substring(0, 3)).join(', ')}
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  {meals.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2">No meals planned yet</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {meals.map((meal, idx) => (
                                        <div key={idx} className="p-2 bg-muted/50 rounded text-xs">
                                          <div className="font-medium">{meal?.name}</div>
                                          <div className="text-muted-foreground">
                                            {meal?.totalMacros?.calories} cal • {meal?.totalMacros?.protein}g P
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>

                        {overallProgress.filledSlots > 0 && (
                          <Button
                            onClick={() => setShowExportDialog(true)}
                            disabled={isDownloading}
                            className="w-full bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
                          >
                            <FileDown className="h-4 w-4 mr-2" />
                            Export Options
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </ScrollArea>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Swap Dialog */}
      {swappingSlot !== null && mealSlots[swappingSlot]?.meal && (
        <MealSwapDialog
          isOpen={swappingSlot !== null}
          onClose={() => setSwappingSlot(null)}
          slot={mealSlots[swappingSlot]}
          currentMeal={mealSlots[swappingSlot].meal!}
          excludeMeals={allMealNames}
          userProfile={userProfile}
          bodyCompGoals={bodyCompGoals}
          dietPreferences={dietPreferences}
          onSelectAlternative={handleSwapSelect}
        />
      )}

      {/* Recipe Recommendations Dialog */}
      {browsingRecipesSlot !== null && (
        <RecipeRecommendations
          isOpen={browsingRecipesSlot !== null}
          onClose={() => setBrowsingRecipesSlot(null)}
          slot={mealSlots[browsingRecipesSlot]}
          dietPreferences={dietPreferences as DietPreferences | undefined}
          excludeRecipes={allMealNames.map(n => n.toLowerCase().replace(/\s+/g, '-'))}
          onSelectRecipe={(meal) => {
            updateMeal(currentDay, browsingRecipesSlot, meal);
            setBrowsingRecipesSlot(null);
          }}
        />
      )}

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-[#c19962]" />
              Export Client Plan
            </DialogTitle>
            <DialogDescription>
              Customize what to include, then preview below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Days to Include */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Days to Include</Label>
              <RadioGroup
                value={exportOptions.exportType}
                onValueChange={(v) => {
                  const newType = v as 'full' | 'single' | 'custom';
                  setExportOptions(prev => ({
                    ...prev,
                    exportType: newType,
                    ...(newType === 'single' && viewMode === 'day-types' && currentDayType ? { selectedDay: currentDayType.days[0] } : {}),
                    ...(newType === 'custom' && viewMode === 'day-types' && currentDayType ? { selectedDays: currentDayType.days } : {}),
                    ...(newType === 'single' ? { includeCoverPage: false, includeSchedule: false, includeGroceryList: false } : {}),
                    ...(newType === 'full' ? { includeCoverPage: true, includeClientProfile: true, includeSchedule: true, includeNutritionTargets: true, includeDietPreferences: true, includeMealContext: true, includeGroceryList: true, selectedDays: DAYS } : {}),
                  }));
                }}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { value: 'full', label: 'Full Week', desc: 'All 7 days' },
                  { value: 'single', label: 'Single Day', desc: 'One day' },
                  { value: 'custom', label: 'Custom', desc: 'Pick days' },
                ].map(opt => (
                  <div key={opt.value} className={`flex items-center space-x-2 p-2.5 border rounded-lg cursor-pointer transition-all ${exportOptions.exportType === opt.value ? 'border-[#c19962] bg-[#c19962]/5' : ''}`}>
                    <RadioGroupItem value={opt.value} id={`export-${opt.value}`} />
                    <Label htmlFor={`export-${opt.value}`} className="cursor-pointer">
                      <span className="font-medium text-sm">{opt.label}</span>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              
              {exportOptions.exportType === 'single' && (
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map(day => {
                    const hasMeals = (mealPlan?.[day]?.meals?.filter(m => m !== null).length || 0) > 0;
                    return (
                      <Button key={day} variant={exportOptions.selectedDay === day ? 'default' : 'outline'} size="sm"
                        className={`text-xs h-9 relative ${exportOptions.selectedDay === day ? 'bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]' : ''} ${!hasMeals ? 'opacity-50' : ''}`}
                        onClick={() => setExportOptions(prev => ({ ...prev, selectedDay: day }))}
                      >
                        {day.substring(0, 3)}
                        {hasMeals && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
                      </Button>
                    );
                  })}
                </div>
              )}
              
              {exportOptions.exportType === 'custom' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS.map(day => {
                      const isSelected = exportOptions.selectedDays.includes(day);
                      const hasMeals = (mealPlan?.[day]?.meals?.filter(m => m !== null).length || 0) > 0;
                      return (
                        <Button key={day} variant={isSelected ? 'default' : 'outline'} size="sm"
                          className={`text-xs h-9 relative ${isSelected ? 'bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]' : ''} ${!hasMeals ? 'opacity-50' : ''}`}
                          onClick={() => setExportOptions(prev => ({
                            ...prev,
                            selectedDays: isSelected ? prev.selectedDays.filter(d => d !== day) : [...prev.selectedDays, day],
                          }))}
                        >
                          {day.substring(0, 3)}
                          {hasMeals && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                      onClick={() => setExportOptions(prev => ({ ...prev, selectedDays: [...DAYS] }))}
                    >All</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                      onClick={() => setExportOptions(prev => ({ ...prev, selectedDays: [] }))}
                    >None</Button>
                    {dayTypes.map(dt => (
                      <Button key={dt.id} variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                        onClick={() => setExportOptions(prev => ({ ...prev, selectedDays: dt.days }))}
                      >
                        {dt.isWorkoutDay ? <Dumbbell className="h-3 w-3 mr-0.5" /> : <Coffee className="h-3 w-3 mr-0.5" />}
                        {dt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* PDF Sections */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">PDF Sections</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'includeCoverPage' as const, label: 'Cover Page', icon: FileText },
                  { key: 'includeClientProfile' as const, label: 'Client Profile', icon: User },
                  { key: 'includeSchedule' as const, label: 'Schedule', icon: Calendar },
                  { key: 'includeDietPreferences' as const, label: 'Diet Prefs', icon: Utensils },
                  { key: 'includeNutritionTargets' as const, label: 'Targets Table', icon: Target },
                  { key: 'includeRecipes' as const, label: 'Recipes', icon: Book },
                  { key: 'includeMealContext' as const, label: 'Meal Context', icon: Info },
                  { key: 'includeGroceryList' as const, label: 'Grocery List', icon: ListChecks },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key}
                    className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all ${exportOptions[key] ? 'border-[#c19962]/50 bg-[#c19962]/5' : 'opacity-50'}`}
                    onClick={() => setExportOptions(prev => ({ ...prev, [key]: !prev[key] }))}
                  >
                    <Checkbox checked={exportOptions[key]}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, [key]: checked === true }))}
                      className="pointer-events-none h-3.5 w-3.5"
                    />
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Live Page Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs font-medium">Page Preview</Label>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {(() => {
                    const days = exportOptions.exportType === 'full' ? DAYS : exportOptions.exportType === 'single' ? [exportOptions.selectedDay] : exportOptions.selectedDays;
                    const daysWithData = days.filter(d => (mealPlan?.[d]?.meals?.filter(m => m !== null).length || 0) > 0);
                    let p = 0;
                    if (exportOptions.includeCoverPage) p++;
                    if (exportOptions.includeClientProfile) p++;
                    if (exportOptions.includeSchedule) p++;
                    if (exportOptions.includeNutritionTargets) p++;
                    p += daysWithData.length;
                    if (exportOptions.includeGroceryList) p++;
                    return `${p} page${p !== 1 ? 's' : ''}`;
                  })()}
                </span>
              </div>
              <div className="bg-muted/50 rounded-lg border p-3">
                <div className="flex flex-wrap gap-2 justify-center">
                  {(() => {
                    const previewDays = exportOptions.exportType === 'full' ? DAYS : exportOptions.exportType === 'single' ? [exportOptions.selectedDay] : exportOptions.selectedDays;
                    const avgCal = nutritionTargets.length > 0 ? Math.round(nutritionTargets.reduce((s, t) => s + t.targetCalories, 0) / nutritionTargets.length) : 0;
                    
                    const hasAnyPages = exportOptions.includeCoverPage || exportOptions.includeClientProfile || exportOptions.includeSchedule || exportOptions.includeNutritionTargets || exportOptions.includeGroceryList || previewDays.some(d => (mealPlan?.[d]?.meals?.filter(m => m !== null).length || 0) > 0);

                    if (!hasAnyPages) {
                      return (
                        <div className="w-full py-4 text-center text-muted-foreground">
                          <FileText className="h-5 w-5 mx-auto mb-1 opacity-30" />
                          <p className="text-[10px]">No pages to preview</p>
                        </div>
                      );
                    }

                    // Compact page thumbnail (fits ~6 across in 440px)
                    const Pg = ({ label, accent, children }: { label: string; accent?: boolean; children: React.ReactNode }) => (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className={`w-[60px] h-[84px] bg-white rounded-[3px] border flex flex-col overflow-hidden transition-all ${accent ? 'shadow-sm ring-1 ring-[#c19962]/30' : 'shadow-sm border-gray-200'}`}>
                          <div className="h-[2px] bg-gradient-to-r from-[#c19962] to-[#e4ac61] shrink-0" />
                          <div className="flex-1 p-1 overflow-hidden">{children}</div>
                          <div className="h-[8px] border-t border-gray-100 flex items-center justify-center">
                            <span className="text-[3px] text-gray-300">FITOMICS</span>
                          </div>
                        </div>
                        <span className="text-[8px] text-muted-foreground leading-none">{label}</span>
                      </div>
                    );

                    return (
                      <>
                        {exportOptions.includeCoverPage && (
                          <Pg label="Cover" accent>
                            <div className="flex flex-col items-center justify-center h-full text-center">
                              <div className="w-5 h-[1px] bg-[#c19962]/30 mb-0.5" />
                              <p className="text-[4px] font-bold text-[#00263d] leading-none">NUTRITION</p>
                              <p className="text-[4px] font-bold text-[#00263d] leading-none">STRATEGY</p>
                              <div className="w-5 h-[1px] bg-[#c19962]/30 my-0.5" />
                              <p className="text-[3.5px] font-bold text-[#00263d] truncate w-full">{userProfile.name || 'Client'}</p>
                              <div className="bg-[#00263d] rounded-sm px-1 py-[1px] mt-0.5">
                                <p className="text-[3px] text-white">{avgCal} kcal</p>
                              </div>
                            </div>
                          </Pg>
                        )}

                        {exportOptions.includeClientProfile && (
                          <Pg label="Profile">
                            <p className="text-[3.5px] font-bold text-[#00263d] mb-0.5">PROFILE</p>
                            <div className="space-y-[1px]">
                              <div className="h-[3px] bg-gray-100 rounded w-full" />
                              <div className="h-[3px] bg-gray-100 rounded w-3/4" />
                              <div className="h-[3px] bg-gray-100 rounded w-full" />
                              <div className="h-[3px] bg-gray-100 rounded w-2/3" />
                            </div>
                            <div className="border-l border-[#c19962] pl-0.5 mt-1">
                              <div className="h-[3px] bg-[#c19962]/20 rounded w-3/4" />
                            </div>
                          </Pg>
                        )}

                        {exportOptions.includeSchedule && (
                          <Pg label="Schedule">
                            <p className="text-[3.5px] font-bold text-[#00263d] mb-0.5">SCHEDULE</p>
                            <div className="space-y-[2px]">
                              {DAYS.slice(0, 5).map(d => {
                                const hasWk = weeklySchedule[d]?.workouts?.some(w => w.enabled);
                                return <div key={d} className={`h-[3px] rounded-sm ${hasWk ? 'bg-[#c19962]/30' : 'bg-gray-100'}`} />;
                              })}
                            </div>
                          </Pg>
                        )}

                        {exportOptions.includeNutritionTargets && (
                          <Pg label="Targets">
                            <p className="text-[3.5px] font-bold text-[#00263d] mb-0.5">TARGETS</p>
                            <div className="grid grid-cols-2 gap-[1px] mb-1">
                              {['Cal', 'Pro', 'Carb', 'Fat'].map(m => (
                                <div key={m} className="bg-gray-50 rounded-[1px] py-[1px] text-center">
                                  <p className="text-[3px] font-bold text-[#00263d]">{m}</p>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-[2px]">
                              {[70, 85, 60, 90].map((w, i) => (
                                <div key={i} className="h-[3px] bg-gray-100 rounded-sm relative overflow-hidden">
                                  <div className="absolute inset-y-0 left-0 bg-[#c19962]/30 rounded-sm" style={{ width: `${w}%` }} />
                                </div>
                              ))}
                            </div>
                          </Pg>
                        )}

                        {previewDays.map(day => {
                          const dp = mealPlan?.[day];
                          const dt = nutritionTargets.find(t => t.day === day);
                          const meals = dp?.meals?.filter(m => m !== null) || [];
                          if (meals.length === 0) return null;
                          return (
                            <Pg key={day} label={day.substring(0, 3)}>
                              <div className="flex items-center justify-between mb-0.5">
                                <p className="text-[3.5px] font-bold text-[#00263d]">{day.substring(0, 3).toUpperCase()}</p>
                                {dt?.isWorkoutDay && <div className="w-1 h-1 rounded-full bg-[#c19962]" />}
                              </div>
                              <div className="bg-[#00263d] rounded-[1px] py-[1px] px-0.5 mb-0.5">
                                <p className="text-[3px] text-white text-center">{Math.round(dp?.dailyTotals?.calories || 0)} cal</p>
                              </div>
                              {meals.slice(0, 3).map((meal, mi) => (
                                <div key={mi} className="border-l border-[#c19962]/30 pl-0.5 mb-[1px]">
                                  <p className="text-[3px] text-[#00263d] truncate leading-tight">{meal.name}</p>
                                  {exportOptions.includeRecipes && <div className="h-[2px] bg-gray-100 rounded w-3/4 mt-[1px]" />}
                                </div>
                              ))}
                              {meals.length > 3 && <p className="text-[2.5px] text-gray-300">+{meals.length - 3}</p>}
                            </Pg>
                          );
                        })}

                        {exportOptions.includeGroceryList && (
                          <Pg label="Grocery">
                            <p className="text-[3.5px] font-bold text-[#00263d] mb-0.5">GROCERY</p>
                            <div className="space-y-[2px]">
                              {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="flex items-center gap-[2px]">
                                  <div className="w-[3px] h-[3px] border border-gray-200 rounded-[1px] shrink-0" />
                                  <div className="h-[2px] bg-gray-100 rounded flex-1" style={{ width: `${30 + (i * 10) % 50}%` }} />
                                </div>
                              ))}
                            </div>
                          </Pg>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button>
            <Button
              onClick={handleExportWithOptions}
              disabled={isDownloading || (exportOptions.exportType === 'custom' && exportOptions.selectedDays.length === 0)}
              className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
            >
              {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export PDF
            </Button>
          </DialogFooter>
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
              {cronometerClientName || 'Client'} &mdash; {format(cmDateRange.from, 'MMM d')} to {format(cmDateRange.to, 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            {[7, 14, 21, 30, 60].map(n => (
              <Button key={n} variant="ghost" size="sm"
                className={cn("h-7 text-xs", Math.round((cmDateRange.to.getTime() - cmDateRange.from.getTime()) / 86400000) === n && "bg-[#c19962]/10 text-[#c19962]")}
                onClick={() => { setCmDateRange({ from: subDays(new Date(), n), to: new Date() }); setTimeout(fetchCMDashboard, 50); }}
              >{n}d</Button>
            ))}
            <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={fetchCMDashboard} disabled={isFetchingCM}>
              {isFetchingCM ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </div>
          {!cmData ? (
            <div className="py-12 text-center text-muted-foreground">
              {isFetchingCM ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'No data loaded'}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: 'Calories', value: cmData.averages.calories, unit: 'kcal' },
                  { label: 'Protein', value: cmData.averages.protein, unit: 'g' },
                  { label: 'Carbs', value: cmData.averages.carbs, unit: 'g' },
                  { label: 'Fat', value: cmData.averages.fat, unit: 'g' },
                  { label: 'Fiber', value: cmData.averages.fiber, unit: 'g' },
                ].map(m => (
                  <div key={m.label} className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-lg font-bold">{Math.round(m.value)}</p>
                    <p className="text-xs text-muted-foreground">{m.unit}/day avg</p>
                  </div>
                ))}
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Calorie Trend</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cmData.trendData}>
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
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Macronutrient Trends</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cmData.trendData}>
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
              {cmData.macroDistribution.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Average Macro Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={cmData.macroDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} ${value}%`}>
                            {cmData.macroDistribution.map((entry, i) => (
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
                className={cn("h-7 text-xs", Math.round((cmDateRange.to.getTime() - cmDateRange.from.getTime()) / 86400000) === n && "bg-[#c19962]/10 text-[#c19962]")}
                onClick={() => { setCmDateRange({ from: subDays(new Date(), n), to: new Date() }); setTimeout(fetchCMDashboard, 50); }}
              >{n}d</Button>
            ))}
            <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={fetchCMDashboard} disabled={isFetchingCM}>
              {isFetchingCM ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </div>
          {!cmData ? (
            <div className="py-12 text-center text-muted-foreground">
              {isFetchingCM ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'No data loaded'}
            </div>
          ) : (
            <div className="space-y-3">
              {cmData.foodLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No food log entries for this period</p>
              ) : (
                cmData.foodLog.map(day => (
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
                className={cn("h-7 text-xs", Math.round((cmDateRange.to.getTime() - cmDateRange.from.getTime()) / 86400000) === n && "bg-[#c19962]/10 text-[#c19962]")}
                onClick={() => { setCmDateRange({ from: subDays(new Date(), n), to: new Date() }); setTimeout(fetchCMDashboard, 50); }}
              >{n}d</Button>
            ))}
            <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={fetchCMDashboard} disabled={isFetchingCM}>
              {isFetchingCM ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </div>
          {!cmData ? (
            <div className="py-12 text-center text-muted-foreground">
              {isFetchingCM ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'No data loaded'}
            </div>
          ) : cmData.biometrics.length === 0 ? (
            <div className="text-center py-12">
              <Scale className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No biometric data found for this date range</p>
              <p className="text-xs text-muted-foreground mt-1">Try expanding the date range</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                cmData.biometrics.reduce((acc, bio) => {
                  if (!acc[bio.type]) acc[bio.type] = [];
                  acc[bio.type].push(bio);
                  return acc;
                }, {} as Record<string, typeof cmData.biometrics>)
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
          {!cmData ? (
            <div className="py-12 text-center text-muted-foreground">
              {isFetchingCM ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'No data loaded'}
            </div>
          ) : cmData.fasts.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No fasting records found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cmData.fasts.map((fast, i) => (
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
              {cmTargets ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Calories', value: cmTargets.kcal, unit: 'kcal' },
                      { label: 'Protein', value: cmTargets.protein, unit: 'g' },
                      { label: 'Carbs', value: cmTargets.total_carbs, unit: 'g' },
                      { label: 'Fat', value: cmTargets.fat, unit: 'g' },
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
                        if (!activePhase || !cmTargets) return;
                        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
                        const cal = Math.round(cmTargets.kcal || 0);
                        const newTargets: DayNutritionTargets[] = days.map(day => ({
                          day,
                          isWorkoutDay: false,
                          tdee: cal,
                          targetCalories: cal,
                          protein: Math.round(cmTargets.protein || 0),
                          carbs: Math.round(cmTargets.total_carbs || 0),
                          fat: Math.round(cmTargets.fat || 0),
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
                  <Button variant="ghost" size="sm" className="w-full" onClick={fetchCMTargets}>
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Refresh
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Button variant="outline" size="sm" onClick={fetchCMTargets}>
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
                          const t = activePhase.nutritionTargets[0];
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
                          if (!cronometerClientId || !activePhase?.nutritionTargets?.[0]) return;
                          const t = activePhase.nutritionTargets[0];
                          try {
                            const res = await fetch('/api/cronometer/targets', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                client_id: String(cronometerClientId),
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
                      No nutrition targets set for this phase yet. Set targets in the Planning step first.
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
            {cmData && cmTargets && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Intake vs Targets</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Calories', avg: cmData.averages.calories, target: cmTargets.kcal, unit: 'kcal' },
                      { label: 'Protein', avg: cmData.averages.protein, target: cmTargets.protein, unit: 'g' },
                      { label: 'Carbs', avg: cmData.averages.carbs, target: cmTargets.total_carbs, unit: 'g' },
                      { label: 'Fat', avg: cmData.averages.fat, target: cmTargets.fat, unit: 'g' },
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
  );
}
