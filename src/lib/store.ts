import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  UserProfile, 
  BodyCompGoals, 
  DietPreferences, 
  WeeklySchedule,
  DayNutritionTargets,
  WeeklyMealPlan,
  DayMealPlan,
  Meal,
  DayOfWeek,
  ClientProfile,
  StaffMember
} from '@/types';
import { 
  calculateTDEE, 
  calculateTargetCalories, 
  calculateMacros,
  heightToCm,
  lbsToKg
} from './nutrition-calc';

// Generate unique ID
const generateId = () => `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Session note type for the floating notes panel
export interface SessionNote {
  id: string;
  clientId: string | null; // Associated client (null = general note)
  content: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
}

interface NutritionPlanningOSState {
  // ============ CLIENT MANAGEMENT ============
  clients: ClientProfile[];
  activeClientId: string | null;
  
  // Staff member (for future auth integration)
  currentStaff: StaffMember | null;
  
  // ============ SESSION NOTES (floating notes panel) ============
  sessionNotes: SessionNote[];
  activeNoteContent: string; // Current note being edited
  isNotePanelOpen: boolean;
  
  // ============ ACTIVE CLIENT DATA (derived from activeClientId) ============
  // Current step in the workflow (1-5)
  currentStep: number;
  
  // User data for active client
  userProfile: Partial<UserProfile>;
  bodyCompGoals: Partial<BodyCompGoals>;
  dietPreferences: Partial<DietPreferences>;
  weeklySchedule: Partial<WeeklySchedule>;
  nutritionTargets: DayNutritionTargets[];
  
  // Generated meal plan
  mealPlan: WeeklyMealPlan | null;
  
  // ============ UI STATE ============
  isGenerating: boolean;
  generationProgress: number;
  currentGeneratingDay: DayOfWeek | null;
  error: string | null;
  
  // ============ CLIENT MANAGEMENT ACTIONS ============
  createClient: (name: string, email?: string, notes?: string) => string;
  selectClient: (clientId: string) => void;
  updateClient: (clientId: string, updates: Partial<ClientProfile>) => void;
  deleteClient: (clientId: string) => void;
  archiveClient: (clientId: string) => void;
  duplicateClient: (clientId: string, newName: string) => string;
  saveActiveClientState: () => void;
  getClient: (clientId: string) => ClientProfile | undefined;
  getActiveClient: () => ClientProfile | undefined;
  
  // ============ SESSION NOTES ACTIONS ============
  setNotePanelOpen: (isOpen: boolean) => void;
  setActiveNoteContent: (content: string) => void;
  saveNote: () => void;
  deleteNote: (noteId: string) => void;
  pinNote: (noteId: string) => void;
  getClientNotes: (clientId: string) => SessionNote[];
  
  // ============ DATA ACTIONS ============
  setCurrentStep: (step: number) => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  setBodyCompGoals: (goals: Partial<BodyCompGoals>) => void;
  setDietPreferences: (prefs: Partial<DietPreferences>) => void;
  setWeeklySchedule: (schedule: Partial<WeeklySchedule>) => void;
  calculateNutritionTargets: () => void;
  setNutritionTargets: (targets: DayNutritionTargets[]) => void;
  setMealPlan: (plan: WeeklyMealPlan | null) => void;
  
  // ============ MEAL BUILDER ACTIONS ============
  updateMeal: (day: DayOfWeek, slotIndex: number, meal: Meal) => void;
  updateMealNote: (day: DayOfWeek, slotIndex: number, note: string) => void;
  updateMealRationale: (day: DayOfWeek, slotIndex: number, rationale: string) => void;
  setMealLocked: (day: DayOfWeek, slotIndex: number, locked: boolean) => void;
  deleteMeal: (day: DayOfWeek, slotIndex: number) => void;
  initializeDayPlan: (day: DayOfWeek, mealsCount: number, snacksCount: number, targets: DayNutritionTargets) => void;
  clearDayMeals: (day: DayOfWeek) => void;
  clearAllMeals: () => void;
  
  // ============ UNDO/REDO ============
  mealPlanHistory: WeeklyMealPlan[];
  mealPlanHistoryIndex: number;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undoMealPlan: () => void;
  redoMealPlan: () => void;
  saveMealPlanSnapshot: () => void;
  
  // ============ UI STATE ACTIONS ============
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: number, day?: DayOfWeek | null) => void;
  setError: (error: string | null) => void;
  resetActiveClientState: () => void;
  resetAllState: () => void;
}

const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyClientData = {
  currentStep: 1,
  userProfile: {},
  bodyCompGoals: {},
  dietPreferences: {},
  weeklySchedule: {},
  nutritionTargets: [],
  mealPlan: null,
  mealPlanHistory: [] as WeeklyMealPlan[],
  mealPlanHistoryIndex: -1,
};

const initialState = {
  // Client management
  clients: [],
  activeClientId: null,
  currentStaff: null,
  
  // Session notes
  sessionNotes: [],
  activeNoteContent: '',
  isNotePanelOpen: false,
  
  // Active client data
  ...emptyClientData,
  
  // UI state
  isGenerating: false,
  generationProgress: 0,
  currentGeneratingDay: null,
  error: null,
};

export const useFitomicsStore = create<NutritionPlanningOSState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // ============ CLIENT MANAGEMENT ACTIONS ============
      
      createClient: (name, email, notes) => {
        const id = generateId();
        const now = new Date().toISOString();
        
        const newClient: ClientProfile = {
          id,
          name,
          email,
          notes,
          createdAt: now,
          updatedAt: now,
          status: 'active',
          userProfile: { name },
          bodyCompGoals: {},
          dietPreferences: {},
          weeklySchedule: {},
          nutritionTargets: [],
          mealPlan: null,
          currentStep: 1,
          planHistory: [],
        };
        
        set((state) => ({
          clients: [...state.clients, newClient],
          activeClientId: id,
          currentStep: 1,
          userProfile: { name },
          bodyCompGoals: {},
          dietPreferences: {},
          weeklySchedule: {},
          nutritionTargets: [],
          mealPlan: null,
          error: null,
        }));
        
        return id;
      },
      
      selectClient: (clientId) => {
        const state = get();
        
        // First, save current client state if there's an active client
        if (state.activeClientId) {
          state.saveActiveClientState();
        }
        
        // Find and load the selected client
        const client = state.clients.find(c => c.id === clientId);
        if (client) {
          set({
            activeClientId: clientId,
            currentStep: client.currentStep,
            userProfile: client.userProfile,
            bodyCompGoals: client.bodyCompGoals,
            dietPreferences: client.dietPreferences,
            weeklySchedule: client.weeklySchedule,
            nutritionTargets: client.nutritionTargets,
            mealPlan: client.mealPlan,
            error: null,
          });
        }
      },
      
      updateClient: (clientId, updates) => {
        set((state) => ({
          clients: state.clients.map(c => 
            c.id === clientId 
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c
          ),
        }));
      },
      
      deleteClient: (clientId) => {
        const state = get();
        set({
          clients: state.clients.filter(c => c.id !== clientId),
          ...(state.activeClientId === clientId ? {
            activeClientId: null,
            ...emptyClientData,
          } : {}),
        });
      },
      
      archiveClient: (clientId) => {
        get().updateClient(clientId, { status: 'archived' });
        
        const state = get();
        if (state.activeClientId === clientId) {
          set({
            activeClientId: null,
            ...emptyClientData,
          });
        }
      },
      
      duplicateClient: (clientId, newName) => {
        const state = get();
        const client = state.clients.find(c => c.id === clientId);
        if (!client) return '';
        
        const newId = generateId();
        const now = new Date().toISOString();
        
        const newClient: ClientProfile = {
          ...client,
          id: newId,
          name: newName,
          createdAt: now,
          updatedAt: now,
          userProfile: { ...client.userProfile, name: newName },
          planHistory: [],
        };
        
        set((state) => ({
          clients: [...state.clients, newClient],
        }));
        
        return newId;
      },
      
      saveActiveClientState: () => {
        const state = get();
        if (!state.activeClientId) return;
        
        set((state) => ({
          clients: state.clients.map(c => 
            c.id === state.activeClientId
              ? {
                  ...c,
                  updatedAt: new Date().toISOString(),
                  currentStep: state.currentStep,
                  userProfile: state.userProfile,
                  bodyCompGoals: state.bodyCompGoals,
                  dietPreferences: state.dietPreferences,
                  weeklySchedule: state.weeklySchedule,
                  nutritionTargets: state.nutritionTargets,
                  mealPlan: state.mealPlan,
                }
              : c
          ),
        }));
      },
      
      getClient: (clientId) => {
        return get().clients.find(c => c.id === clientId);
      },
      
      getActiveClient: () => {
        const state = get();
        if (!state.activeClientId) return undefined;
        return state.clients.find(c => c.id === state.activeClientId);
      },
      
      // ============ SESSION NOTES ACTIONS ============
      setNotePanelOpen: (isOpen) => set({ isNotePanelOpen: isOpen }),
      
      setActiveNoteContent: (content) => set({ activeNoteContent: content }),
      
      saveNote: () => {
        const state = get();
        const content = state.activeNoteContent.trim();
        if (!content) return;
        
        const now = new Date().toISOString();
        const newNote: SessionNote = {
          id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          clientId: state.activeClientId,
          content,
          createdAt: now,
          updatedAt: now,
          isPinned: false,
        };
        
        set((state) => ({
          sessionNotes: [newNote, ...state.sessionNotes],
          activeNoteContent: '',
        }));
      },
      
      deleteNote: (noteId) => {
        set((state) => ({
          sessionNotes: state.sessionNotes.filter(n => n.id !== noteId),
        }));
      },
      
      pinNote: (noteId) => {
        set((state) => ({
          sessionNotes: state.sessionNotes.map(n => 
            n.id === noteId ? { ...n, isPinned: !n.isPinned } : n
          ),
        }));
      },
      
      getClientNotes: (clientId) => {
        return get().sessionNotes.filter(n => n.clientId === clientId || n.clientId === null);
      },
      
      // ============ DATA ACTIONS ============
      
      setCurrentStep: (step) => {
        set({ currentStep: step });
        get().saveActiveClientState();
      },
      
      setUserProfile: (profile) => {
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        }));
        // Auto-save after a brief delay to batch updates
        setTimeout(() => get().saveActiveClientState(), 100);
      },
      
      setBodyCompGoals: (goals) => {
        set((state) => ({
          bodyCompGoals: { ...state.bodyCompGoals, ...goals },
        }));
        setTimeout(() => get().saveActiveClientState(), 100);
      },
      
      setDietPreferences: (prefs) => {
        set((state) => ({
          dietPreferences: { ...state.dietPreferences, ...prefs },
        }));
        setTimeout(() => get().saveActiveClientState(), 100);
      },
      
      setWeeklySchedule: (schedule) => {
        set((state) => ({
          weeklySchedule: { ...state.weeklySchedule, ...schedule },
        }));
        setTimeout(() => get().saveActiveClientState(), 100);
      },

      setNutritionTargets: (targets) => {
        set({ nutritionTargets: targets });
        get().saveActiveClientState();
      },
      
      calculateNutritionTargets: () => {
        const { userProfile, bodyCompGoals, weeklySchedule } = get();
        
        if (!userProfile.gender || !userProfile.weightLbs || !userProfile.heightFt || !userProfile.age) {
          return;
        }
        
        const weightKg = lbsToKg(userProfile.weightLbs);
        const heightCm = heightToCm(userProfile.heightFt, userProfile.heightIn || 0);
        
        const baseTdee = calculateTDEE(
          userProfile.gender,
          weightKg,
          heightCm,
          userProfile.age,
          userProfile.activityLevel || 'Active (10-15k steps/day)',
          userProfile.workoutsPerWeek || 0
        );
        
        const goalType = bodyCompGoals.goalType || 'maintain';
        const weeklyChangeKg = bodyCompGoals.weeklyWeightChangePct 
          ? weightKg * bodyCompGoals.weeklyWeightChangePct
          : goalType === 'lose_fat' ? 0.5 : goalType === 'gain_muscle' ? 0.25 : 0;
        
        const targets: DayNutritionTargets[] = DAYS_OF_WEEK.map(day => {
          const daySchedule = weeklySchedule[day];
          const hasWorkouts = daySchedule?.workouts && daySchedule.workouts.length > 0;
          const isWorkoutDay = hasWorkouts && daySchedule.workouts.some(w => w.enabled);
          
          // Calculate workout calories for the day
          let workoutCalories = 0;
          if (isWorkoutDay && daySchedule?.workouts) {
            daySchedule.workouts.forEach(workout => {
              if (workout.enabled && workout.estimatedCalories) {
                workoutCalories += workout.estimatedCalories;
              } else if (workout.enabled) {
                // Estimate based on duration and intensity
                const intensityMultiplier = workout.intensity === 'High' ? 10 : workout.intensity === 'Medium' ? 7 : 5;
                workoutCalories += workout.duration * intensityMultiplier;
              }
            });
          }
          
          // Adjust TDEE for workout days
          const adjustedTdee = baseTdee + workoutCalories;
          
          const targetCalories = calculateTargetCalories(adjustedTdee, goalType, weeklyChangeKg);
          const macros = calculateMacros(targetCalories, weightKg, goalType);
          
          return {
            day,
            isWorkoutDay,
            tdee: adjustedTdee,
            targetCalories,
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
          };
        });
        
        set({ nutritionTargets: targets });
        get().saveActiveClientState();
      },
      
      setMealPlan: (plan) => {
        set({ mealPlan: plan });
        
        // Also save to plan history if there's an active client
        const state = get();
        if (plan && state.activeClientId) {
          const client = state.clients.find(c => c.id === state.activeClientId);
          if (client) {
            const historyEntry = {
              id: `plan_${Date.now()}`,
              createdAt: new Date().toISOString(),
              plan,
            };
            
            state.updateClient(state.activeClientId, {
              mealPlan: plan,
              planHistory: [...(client.planHistory || []), historyEntry],
            });
          }
        }
        
        get().saveActiveClientState();
      },
      
      // ============ MEAL BUILDER ACTIONS ============
      
      updateMeal: (day, slotIndex, meal) => {
        const state = get();
        
        // Save snapshot before making changes (for undo)
        if (state.mealPlan) {
          get().saveMealPlanSnapshot();
        }
        
        const currentPlan = state.mealPlan || {};
        let dayPlan = currentPlan[day];
        
        // Auto-create day plan if it doesn't exist
        if (!dayPlan) {
          const schedule = state.weeklySchedule[day];
          const mealCount = schedule?.mealCount || 3;
          const snackCount = schedule?.snackCount || 2;
          const totalSlots = mealCount + snackCount;
          
          dayPlan = {
            day,
            meals: Array(totalSlots).fill(null),
            dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            isComplete: false,
          };
        }
        
        const updatedMeals = [...dayPlan.meals];
        // Ensure the array is large enough for the slot index
        while (updatedMeals.length <= slotIndex) {
          updatedMeals.push(null);
        }
        updatedMeals[slotIndex] = { ...meal, lastModified: new Date().toISOString() };
        
        // Recalculate daily totals
        const dailyTotals = updatedMeals.reduce(
          (acc, m) => ({
            calories: acc.calories + (m?.totalMacros?.calories || 0),
            protein: acc.protein + (m?.totalMacros?.protein || 0),
            carbs: acc.carbs + (m?.totalMacros?.carbs || 0),
            fat: acc.fat + (m?.totalMacros?.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        
        const updatedPlan: WeeklyMealPlan = {
          ...currentPlan,
          [day]: {
            ...dayPlan,
            meals: updatedMeals,
            dailyTotals,
          },
        };
        
        set({ mealPlan: updatedPlan });
        get().saveActiveClientState();
      },
      
      updateMealNote: (day, slotIndex, note) => {
        const state = get();
        const currentPlan = state.mealPlan;
        if (!currentPlan?.[day]?.meals?.[slotIndex]) return;
        
        const updatedMeals = [...currentPlan[day].meals];
        updatedMeals[slotIndex] = { 
          ...updatedMeals[slotIndex], 
          staffNote: note,
          lastModified: new Date().toISOString(),
        };
        
        set({
          mealPlan: {
            ...currentPlan,
            [day]: {
              ...currentPlan[day],
              meals: updatedMeals,
            },
          },
        });
        get().saveActiveClientState();
      },
      
      updateMealRationale: (day, slotIndex, rationale) => {
        const state = get();
        const currentPlan = state.mealPlan;
        if (!currentPlan?.[day]?.meals?.[slotIndex]) return;
        
        const updatedMeals = [...currentPlan[day].meals];
        updatedMeals[slotIndex] = { 
          ...updatedMeals[slotIndex], 
          aiRationale: rationale,
          lastModified: new Date().toISOString(),
        };
        
        set({
          mealPlan: {
            ...currentPlan,
            [day]: {
              ...currentPlan[day],
              meals: updatedMeals,
            },
          },
        });
        get().saveActiveClientState();
      },
      
      setMealLocked: (day, slotIndex, locked) => {
        const state = get();
        const currentPlan = state.mealPlan;
        if (!currentPlan?.[day]?.meals?.[slotIndex]) return;
        
        const updatedMeals = [...currentPlan[day].meals];
        updatedMeals[slotIndex] = { 
          ...updatedMeals[slotIndex], 
          isLocked: locked,
        };
        
        set({
          mealPlan: {
            ...currentPlan,
            [day]: {
              ...currentPlan[day],
              meals: updatedMeals,
            },
          },
        });
        get().saveActiveClientState();
      },
      
      deleteMeal: (day, slotIndex) => {
        const state = get();
        const currentPlan = state.mealPlan;
        if (!currentPlan?.[day]) return;
        
        const updatedMeals = [...currentPlan[day].meals];
        // Replace with an empty placeholder to maintain slot positions
        updatedMeals[slotIndex] = null as unknown as Meal;
        
        // Recalculate daily totals
        const dailyTotals = updatedMeals.reduce(
          (acc, m) => ({
            calories: acc.calories + (m?.totalMacros?.calories || 0),
            protein: acc.protein + (m?.totalMacros?.protein || 0),
            carbs: acc.carbs + (m?.totalMacros?.carbs || 0),
            fat: acc.fat + (m?.totalMacros?.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        
        set({
          mealPlan: {
            ...currentPlan,
            [day]: {
              ...currentPlan[day],
              meals: updatedMeals,
              dailyTotals,
            },
          },
        });
        get().saveActiveClientState();
      },
      
      initializeDayPlan: (day, mealsCount, snacksCount, targets) => {
        const state = get();
        const currentPlan = state.mealPlan || {};
        
        // Create empty meal slots (null represents empty slot)
        const totalSlots = mealsCount + snacksCount;
        const emptyMeals: (Meal | null)[] = Array(totalSlots).fill(null);
        
        const dayPlan: DayMealPlan = {
          day,
          meals: emptyMeals as Meal[],
          dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          dailyTargets: {
            calories: targets.targetCalories,
            protein: targets.protein,
            carbs: targets.carbs,
            fat: targets.fat,
          },
          accuracyValidated: false,
          mealStructureRationale: '',
        };
        
        set({
          mealPlan: {
            ...currentPlan,
            [day]: dayPlan,
          },
        });
        get().saveActiveClientState();
      },
      
      clearDayMeals: (day) => {
        const state = get();
        const currentPlan = state.mealPlan;
        if (!currentPlan?.[day]) return;
        
        // Save snapshot before clearing
        get().saveMealPlanSnapshot();
        
        const slotCount = currentPlan[day].meals.length;
        set({
          mealPlan: {
            ...currentPlan,
            [day]: {
              ...currentPlan[day],
              meals: Array(slotCount).fill(null) as Meal[],
              dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            },
          },
        });
        get().saveActiveClientState();
      },
      
      clearAllMeals: () => {
        const state = get();
        const currentPlan = state.mealPlan;
        if (!currentPlan) return;
        
        // Save snapshot before clearing
        get().saveMealPlanSnapshot();
        
        const clearedPlan: WeeklyMealPlan = {};
        DAYS_OF_WEEK.forEach(day => {
          if (currentPlan[day]) {
            const slotCount = currentPlan[day].meals.length;
            clearedPlan[day] = {
              ...currentPlan[day],
              meals: Array(slotCount).fill(null) as Meal[],
              dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            };
          }
        });
        
        set({ mealPlan: clearedPlan });
        get().saveActiveClientState();
      },
      
      // ============ UNDO/REDO ============
      mealPlanHistory: [],
      mealPlanHistoryIndex: -1,
      
      canUndo: () => {
        const state = get();
        return state.mealPlanHistoryIndex > 0;
      },
      
      canRedo: () => {
        const state = get();
        return state.mealPlanHistoryIndex < state.mealPlanHistory.length - 1;
      },
      
      saveMealPlanSnapshot: () => {
        const state = get();
        if (!state.mealPlan) return;
        
        // Create a deep copy of the current meal plan
        const snapshot = JSON.parse(JSON.stringify(state.mealPlan)) as WeeklyMealPlan;
        
        // Remove any history after current index (if we made changes after undoing)
        const newHistory = state.mealPlanHistory.slice(0, state.mealPlanHistoryIndex + 1);
        newHistory.push(snapshot);
        
        // Keep only last 20 snapshots to avoid memory issues
        if (newHistory.length > 20) {
          newHistory.shift();
        }
        
        set({
          mealPlanHistory: newHistory,
          mealPlanHistoryIndex: newHistory.length - 1,
        });
      },
      
      undoMealPlan: () => {
        const state = get();
        if (!state.canUndo()) return;
        
        const newIndex = state.mealPlanHistoryIndex - 1;
        const previousPlan = state.mealPlanHistory[newIndex];
        
        set({
          mealPlan: JSON.parse(JSON.stringify(previousPlan)),
          mealPlanHistoryIndex: newIndex,
        });
        get().saveActiveClientState();
      },
      
      redoMealPlan: () => {
        const state = get();
        if (!state.canRedo()) return;
        
        const newIndex = state.mealPlanHistoryIndex + 1;
        const nextPlan = state.mealPlanHistory[newIndex];
        
        set({
          mealPlan: JSON.parse(JSON.stringify(nextPlan)),
          mealPlanHistoryIndex: newIndex,
        });
        get().saveActiveClientState();
      },
      
      // ============ UI STATE ACTIONS ============
      
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      
      setGenerationProgress: (progress, day = null) => set({ 
        generationProgress: progress,
        currentGeneratingDay: day,
      }),
      
      setError: (error) => set({ error }),
      
      resetActiveClientState: () => {
        set({
          ...emptyClientData,
          isGenerating: false,
          generationProgress: 0,
          currentGeneratingDay: null,
          error: null,
        });
      },
      
      resetAllState: () => set(initialState),
    }),
    {
      name: 'nutrition-planning-os-storage',
      partialize: (state) => ({
        // Persist client management
        clients: state.clients,
        activeClientId: state.activeClientId,
        currentStaff: state.currentStaff,
        // Persist active client data
        userProfile: state.userProfile,
        bodyCompGoals: state.bodyCompGoals,
        dietPreferences: state.dietPreferences,
        weeklySchedule: state.weeklySchedule,
        nutritionTargets: state.nutritionTargets,
        mealPlan: state.mealPlan,
        currentStep: state.currentStep,
      }),
    }
  )
);

// Legacy export for backward compatibility
export { useFitomicsStore as useStore };
