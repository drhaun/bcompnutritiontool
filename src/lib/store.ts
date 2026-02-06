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
  StaffMember,
  Phase,
  GoalType,
  TimelineEvent
} from '@/types';
import { 
  calculateTDEE, 
  calculateTargetCalories, 
  calculateMacros,
  heightToCm,
  lbsToKg
} from './nutrition-calc';
import {
  fetchClientsFromDb,
  syncClientsToDb,
  createClientInDb,
  updateClientInDb,
  deleteClientFromDb,
} from './client-sync';

// Generate UUID v4 (compatible with Supabase)
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Generate unique ID (now uses UUID format for database compatibility)
const generateId = () => generateUUID();
const generatePhaseId = () => generateUUID();

// Debounce mechanism for auto-saving
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 500; // Increased from 100ms to 500ms for reliability

const debouncedSave = (saveFunc: () => void) => {
  // Clear any pending save
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  // Schedule new save
  saveTimeout = setTimeout(() => {
    saveFunc();
    saveTimeout = null;
  }, SAVE_DEBOUNCE_MS);
};

// Force immediate save (call before navigation)
export const flushPendingSaves = async (store: ReturnType<typeof useFitomicsStore.getState>) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  await store.saveActiveClientState();
};

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
  deselectClient: () => void; // Clear active client without deleting
  updateClient: (clientId: string, updates: Partial<ClientProfile>) => void;
  deleteClient: (clientId: string) => void;
  archiveClient: (clientId: string) => void;
  duplicateClient: (clientId: string, newName: string) => string;
  saveActiveClientState: () => void;
  getClient: (clientId: string) => ClientProfile | undefined;
  getActiveClient: () => ClientProfile | undefined;
  
  // ============ PHASE MANAGEMENT ACTIONS ============
  phases: Phase[];
  activePhaseId: string | null;
  createPhase: (phase: Partial<Phase>) => string;
  updatePhase: (phaseId: string, updates: Partial<Phase>) => void;
  deletePhase: (phaseId: string) => void;
  setActivePhase: (phaseId: string | null) => void;
  duplicatePhase: (phaseId: string, newName: string) => string;
  getPhase: (phaseId: string) => Phase | undefined;
  getActivePhase: () => Phase | undefined;
  
  // ============ TIMELINE EVENTS ACTIONS ============
  timelineEvents: TimelineEvent[];
  addTimelineEvent: (event: Omit<TimelineEvent, 'id'>) => string;
  updateTimelineEvent: (eventId: string, updates: Partial<TimelineEvent>) => void;
  deleteTimelineEvent: (eventId: string) => void;
  
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
  
  // ============ SYNC STATE & ACTIONS ============
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  isAuthenticated: boolean;
  
  // Sync with Supabase
  loadClientsFromDatabase: () => Promise<void>;
  syncToDatabase: () => Promise<void>;
  setAuthenticated: (isAuthenticated: boolean) => void;
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
  phases: [] as Phase[],
  activePhaseId: null as string | null,
  timelineEvents: [] as TimelineEvent[],
};

const initialState = {
  // Client management
  clients: [] as ClientProfile[],
  activeClientId: null as string | null,
  currentStaff: null as StaffMember | null,
  
  // Session notes
  sessionNotes: [] as SessionNote[],
  activeNoteContent: '',
  isNotePanelOpen: false,
  
  // Active client data
  ...emptyClientData,
  
  // UI state
  isGenerating: false,
  generationProgress: 0,
  currentGeneratingDay: null as DayOfWeek | null,
  error: null as string | null,
  
  // Sync state
  isSyncing: false,
  lastSyncedAt: null as string | null,
  syncError: null as string | null,
  isAuthenticated: false,
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
          phases: [],
          activePhaseId: undefined,
          nutritionTargets: [],
          mealPlan: null,
          currentStep: 1,
          planHistory: [],
        };
        
        console.log('[Store] Creating new client:', name, 'with ID:', id);
        
        set((state) => {
          const updatedClients = [...state.clients, newClient];
          console.log('[Store] Clients after creation:', updatedClients.length, updatedClients.map(c => c.name));
          return {
            clients: updatedClients,
            activeClientId: id,
            currentStep: 1,
            userProfile: { name },
            bodyCompGoals: {},
            dietPreferences: {},
            weeklySchedule: {},
            phases: [],
            activePhaseId: null,
            nutritionTargets: [],
            mealPlan: null,
            error: null,
          };
        });
        
        // Sync to database if authenticated
        const state = get();
        if (state.isAuthenticated) {
          createClientInDb(newClient).catch(err => {
            console.error('[Store] Failed to sync new client:', err);
          });
        }
        
        return id;
      },
      
      selectClient: (clientId) => {
        const state = get();
        
        // First, flush any pending saves and save current client state
        if (saveTimeout) {
          clearTimeout(saveTimeout);
          saveTimeout = null;
        }
        if (state.activeClientId) {
          state.saveActiveClientState();
        }
        
        // Find and load the selected client
        const client = state.clients.find(c => c.id === clientId);
        if (client) {
          // Migrate legacy data to phase-based structure if needed
          let phases = client.phases || [];
          let activePhaseId = client.activePhaseId || null;
          
          // Migration: If client has targets/meal plan but no phases, create a legacy phase
          if (
            phases.length === 0 && 
            client.bodyCompGoals?.goalType &&
            (client.nutritionTargets?.length > 0 || client.mealPlan)
          ) {
            const now = new Date().toISOString();
            const legacyPhase: Phase = {
              id: `phase_legacy_${Date.now()}`,
              name: 'Current Plan',
              goalType: client.bodyCompGoals.goalType as GoalType,
              status: 'active',
              startDate: client.bodyCompGoals.startDate || now.split('T')[0],
              endDate: (() => {
                const weeks = client.bodyCompGoals.timelineWeeks || 12;
                const end = new Date();
                end.setDate(end.getDate() + weeks * 7);
                return end.toISOString().split('T')[0];
              })(),
              targetWeightLbs: client.bodyCompGoals.targetWeightLbs || client.userProfile.weightLbs || 150,
              targetBodyFat: client.bodyCompGoals.targetBodyFat || 20,
              targetFatMassLbs: client.bodyCompGoals.targetFatMassLbs || 30,
              targetFFMLbs: client.bodyCompGoals.targetFFMLbs || 120,
              rateOfChange: client.bodyCompGoals.weeklyWeightChangePct || 0.5,
              performancePriority: client.bodyCompGoals.performancePriority || 'body_comp_priority',
              musclePreservation: client.bodyCompGoals.musclePreservation || 'preserve_all',
              fatGainTolerance: client.bodyCompGoals.fatGainTolerance || 'minimize_fat_gain',
              lifestyleCommitment: client.bodyCompGoals.lifestyleCommitment || 'fully_committed',
              trackingCommitment: client.bodyCompGoals.trackingCommitment || 'committed_tracking',
              scheduleOverrides: null,
              nutritionTargets: client.nutritionTargets || [],
              mealPlan: client.mealPlan,
              notes: 'Migrated from legacy data',
              createdAt: now,
              updatedAt: now,
            };
            
            phases = [legacyPhase];
            activePhaseId = legacyPhase.id;
            
            console.log('[Store] Migrated legacy data to phase:', legacyPhase.name);
          }
          
          set({
            activeClientId: clientId,
            currentStep: client.currentStep,
            userProfile: client.userProfile,
            bodyCompGoals: client.bodyCompGoals,
            dietPreferences: client.dietPreferences,
            weeklySchedule: client.weeklySchedule,
            phases,
            activePhaseId,
            timelineEvents: client.timelineEvents || [],
            nutritionTargets: client.nutritionTargets,
            mealPlan: client.mealPlan,
            error: null,
          });
          
          // If we migrated, save the updated client state
          if (phases.length > 0 && !client.phases?.length) {
            debouncedSave(() => get().saveActiveClientState());
          }
        }
      },
      
      deselectClient: () => {
        const state = get();
        
        // Flush any pending saves before deselecting
        if (saveTimeout) {
          clearTimeout(saveTimeout);
          saveTimeout = null;
        }
        
        // Save current client state before deselecting
        if (state.activeClientId) {
          state.saveActiveClientState();
        }
        
        // Clear active client and reset to empty state
        set({
          activeClientId: null,
          ...emptyClientData,
          error: null,
        });
      },
      
      updateClient: (clientId, updates) => {
        set((state) => ({
          clients: state.clients.map(c => 
            c.id === clientId 
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c
          ),
        }));
        
        // Sync to database if authenticated (debounced)
        const state = get();
        if (state.isAuthenticated) {
          // Use a simple debounce by scheduling the update
          updateClientInDb(clientId, updates).catch(err => {
            console.error('[Store] Failed to sync client update:', err);
          });
        }
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
        
        // Sync to database if authenticated
        if (state.isAuthenticated) {
          deleteClientFromDb(clientId).catch(err => {
            console.error('[Store] Failed to sync client deletion:', err);
          });
        }
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
        if (!state.activeClientId) {
          console.log('[Store] saveActiveClientState: No active client ID, skipping');
          return;
        }
        
        const updates = {
          currentStep: state.currentStep,
          userProfile: state.userProfile,
          bodyCompGoals: state.bodyCompGoals,
          dietPreferences: state.dietPreferences,
          weeklySchedule: state.weeklySchedule,
          phases: state.phases,
          activePhaseId: state.activePhaseId || undefined,
          timelineEvents: state.timelineEvents,
          nutritionTargets: state.nutritionTargets,
          mealPlan: state.mealPlan,
        };
        
        console.log('[Store] Saving active client state for ID:', state.activeClientId);
        console.log('[Store] Saving profile:', updates.userProfile?.name, '| Step:', updates.currentStep);
        
        set((state) => {
          const updatedClients = state.clients.map(c => 
            c.id === state.activeClientId
              ? {
                  ...c,
                  updatedAt: new Date().toISOString(),
                  ...updates,
                }
              : c
          );
          console.log('[Store] Clients after save:', updatedClients.length, updatedClients.map(c => c.name));
          return { clients: updatedClients };
        });
        
        // Sync to database if authenticated
        if (state.isAuthenticated && state.activeClientId) {
          updateClientInDb(state.activeClientId, updates).catch(err => {
            console.error('[Store] Failed to sync active client state:', err);
          });
        }
      },
      
      getClient: (clientId) => {
        return get().clients.find(c => c.id === clientId);
      },
      
      getActiveClient: () => {
        const state = get();
        if (!state.activeClientId) return undefined;
        return state.clients.find(c => c.id === state.activeClientId);
      },
      
      // ============ PHASE MANAGEMENT ACTIONS ============
      phases: [],
      activePhaseId: null,
      
      createPhase: (phaseData) => {
        const state = get();
        if (!state.activeClientId) return '';
        
        const id = generatePhaseId();
        const now = new Date().toISOString();
        
        const newPhase: Phase = {
          id,
          name: phaseData.name || 'New Phase',
          goalType: phaseData.goalType || 'maintain',
          status: phaseData.status || 'planned',
          startDate: phaseData.startDate || now.split('T')[0],
          endDate: phaseData.endDate || new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 weeks default
          targetWeightLbs: phaseData.targetWeightLbs || state.userProfile.weightLbs || 150,
          targetBodyFat: phaseData.targetBodyFat || state.userProfile.bodyFatPercentage || 20,
          targetFatMassLbs: phaseData.targetFatMassLbs || 30,
          targetFFMLbs: phaseData.targetFFMLbs || 120,
          rateOfChange: phaseData.rateOfChange || 0.5,
          performancePriority: phaseData.performancePriority || state.bodyCompGoals.performancePriority || 'body_comp_priority',
          musclePreservation: phaseData.musclePreservation || state.bodyCompGoals.musclePreservation || 'preserve_all',
          fatGainTolerance: phaseData.fatGainTolerance || state.bodyCompGoals.fatGainTolerance || 'minimize_fat_gain',
          lifestyleCommitment: phaseData.lifestyleCommitment || state.bodyCompGoals.lifestyleCommitment || 'fully_committed',
          trackingCommitment: phaseData.trackingCommitment || state.bodyCompGoals.trackingCommitment || 'committed_tracking',
          scheduleOverrides: phaseData.scheduleOverrides || null,
          nutritionTargets: phaseData.nutritionTargets || [],
          mealPlan: phaseData.mealPlan || null,
          notes: phaseData.notes,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          phases: [...state.phases, newPhase],
        }));
        
        // Auto-save to client
        debouncedSave(() => get().saveActiveClientState());
        
        return id;
      },
      
      updatePhase: (phaseId, updates) => {
        set((state) => ({
          phases: state.phases.map(p => 
            p.id === phaseId
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        
        // Auto-save to client
        debouncedSave(() => get().saveActiveClientState());
      },
      
      deletePhase: (phaseId) => {
        const state = get();
        set({
          phases: state.phases.filter(p => p.id !== phaseId),
          ...(state.activePhaseId === phaseId ? { activePhaseId: null } : {}),
        });
        
        // Auto-save to client
        debouncedSave(() => get().saveActiveClientState());
      },
      
      setActivePhase: (phaseId) => {
        set({ activePhaseId: phaseId });
        
        // If setting active phase, load its meal plan and targets into current state
        if (phaseId) {
          const state = get();
          const phase = state.phases.find(p => p.id === phaseId);
          if (phase) {
            set({
              nutritionTargets: phase.nutritionTargets,
              mealPlan: phase.mealPlan,
            });
          }
        }
        
        // Auto-save to client
        debouncedSave(() => get().saveActiveClientState());
      },
      
      duplicatePhase: (phaseId, newName) => {
        const state = get();
        const phase = state.phases.find(p => p.id === phaseId);
        if (!phase) return '';
        
        const newId = generatePhaseId();
        const now = new Date().toISOString();
        
        const newPhase: Phase = {
          ...phase,
          id: newId,
          name: newName,
          status: 'planned',
          mealPlan: null, // Don't copy meal plan
          nutritionTargets: [], // Reset targets
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          phases: [...state.phases, newPhase],
        }));
        
        // Auto-save to client
        debouncedSave(() => get().saveActiveClientState());
        
        return newId;
      },
      
      getPhase: (phaseId) => {
        return get().phases.find(p => p.id === phaseId);
      },
      
      getActivePhase: () => {
        const state = get();
        if (!state.activePhaseId) return undefined;
        return state.phases.find(p => p.id === state.activePhaseId);
      },
      
      // ============ TIMELINE EVENTS ACTIONS ============
      addTimelineEvent: (eventData) => {
        const state = get();
        if (!state.activeClientId) return '';
        
        const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const event: TimelineEvent = {
          id,
          ...eventData,
        };
        
        const newEvents = [...state.timelineEvents, event].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        set({ timelineEvents: newEvents });
        
        // Auto-save to client
        debouncedSave(() => get().saveActiveClientState());
        
        return id;
      },
      
      updateTimelineEvent: (eventId, updates) => {
        set((state) => ({
          timelineEvents: state.timelineEvents.map(e =>
            e.id === eventId ? { ...e, ...updates } : e
          ),
        }));
        
        // Auto-save to client
        debouncedSave(() => get().saveActiveClientState());
      },
      
      deleteTimelineEvent: (eventId) => {
        set((state) => ({
          timelineEvents: state.timelineEvents.filter(e => e.id !== eventId),
        }));
        
        // Auto-save to client
        debouncedSave(() => get().saveActiveClientState());
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
        // Auto-save with debounce to batch rapid updates
        debouncedSave(() => get().saveActiveClientState());
      },
      
      setBodyCompGoals: (goals) => {
        set((state) => ({
          bodyCompGoals: { ...state.bodyCompGoals, ...goals },
        }));
        debouncedSave(() => get().saveActiveClientState());
      },
      
      setDietPreferences: (prefs) => {
        set((state) => ({
          dietPreferences: { ...state.dietPreferences, ...prefs },
        }));
        debouncedSave(() => get().saveActiveClientState());
      },
      
      setWeeklySchedule: (schedule) => {
        set((state) => ({
          weeklySchedule: { ...state.weeklySchedule, ...schedule },
        }));
        debouncedSave(() => get().saveActiveClientState());
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
            tdee: Math.round(adjustedTdee),
            targetCalories: Math.round(targetCalories),
            protein: Math.round(macros.protein),
            carbs: Math.round(macros.carbs),
            fat: Math.round(macros.fat),
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
        const rawTotals = updatedMeals.reduce(
          (acc, m) => ({
            calories: acc.calories + (m?.totalMacros?.calories || 0),
            protein: acc.protein + (m?.totalMacros?.protein || 0),
            carbs: acc.carbs + (m?.totalMacros?.carbs || 0),
            fat: acc.fat + (m?.totalMacros?.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        const dailyTotals = {
          calories: Math.round(rawTotals.calories),
          protein: Math.round(rawTotals.protein),
          carbs: Math.round(rawTotals.carbs),
          fat: Math.round(rawTotals.fat),
        };
        
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
        const rawTotals = updatedMeals.reduce(
          (acc, m) => ({
            calories: acc.calories + (m?.totalMacros?.calories || 0),
            protein: acc.protein + (m?.totalMacros?.protein || 0),
            carbs: acc.carbs + (m?.totalMacros?.carbs || 0),
            fat: acc.fat + (m?.totalMacros?.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        const dailyTotals = {
          calories: Math.round(rawTotals.calories),
          protein: Math.round(rawTotals.protein),
          carbs: Math.round(rawTotals.carbs),
          fat: Math.round(rawTotals.fat),
        };
        
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
      
      // ============ SYNC STATE & ACTIONS ============
      isSyncing: false,
      lastSyncedAt: null,
      syncError: null,
      isAuthenticated: false,
      
      setAuthenticated: (isAuthenticated) => {
        set({ isAuthenticated });
        if (isAuthenticated) {
          // Wait for hydration to complete before syncing
          // This ensures local clients from localStorage are loaded first
          let retryCount = 0;
          const maxRetries = 25; // Max 5 seconds of waiting (25 * 200ms)
          
          const waitForHydration = () => {
            retryCount++;
            // Check if store has been hydrated from localStorage
            if (useFitomicsStore.persist.hasHydrated()) {
              console.log('[Store] Hydration complete, starting sync...');
              get().loadClientsFromDatabase();
            } else if (retryCount < maxRetries) {
              console.log('[Store] Waiting for hydration before sync... (attempt', retryCount, ')');
              // Try again in 200ms
              setTimeout(waitForHydration, 200);
            } else {
              // Give up waiting - sync anyway with whatever state we have
              console.warn('[Store] Hydration timeout, syncing with current state');
              get().loadClientsFromDatabase();
            }
          };
          
          // Start checking after 500ms to allow auth cookies to propagate
          setTimeout(waitForHydration, 500);
        }
      },
      
      loadClientsFromDatabase: async () => {
        const state = get();
        if (state.isSyncing) return;
        
        set({ isSyncing: true, syncError: null });
        
        try {
          // CRITICAL: Preserve local clients - NEVER lose them
          const localClients = state.clients;
          console.log('[Store] Local clients before sync:', localClients.length, localClients.map(c => c.name));
          
          if (localClients.length > 0) {
            console.log('[Store] Syncing local clients to database...');
            const syncResult = await syncClientsToDb(localClients);
            
            if (syncResult.success) {
              // IMPORTANT: Merge rather than replace - keep any local clients not in DB
              const mergedClients = syncResult.clients;
              
              // Double-check we haven't lost any clients
              if (mergedClients.length < localClients.length) {
                console.warn('[Store] WARNING: Sync returned fewer clients than local!');
                console.log('[Store] Local IDs:', localClients.map(c => c.id));
                console.log('[Store] Synced IDs:', mergedClients.map(c => c.id));
                
                // Preserve any local clients that weren't in the sync result
                const syncedIds = new Set(mergedClients.map(c => c.id));
                const missingClients = localClients.filter(c => !syncedIds.has(c.id));
                if (missingClients.length > 0) {
                  console.log('[Store] Restoring missing clients:', missingClients.map(c => c.name));
                  mergedClients.push(...missingClients);
                }
              }
              
              set({
                clients: mergedClients,
                lastSyncedAt: new Date().toISOString(),
              });
              console.log('[Store] Sync complete, total clients:', mergedClients.length);
            } else if (syncResult.error === 'Not authenticated') {
              console.log('[Store] Not authenticated - KEEPING local clients');
              // CRITICAL: Do NOT modify clients - they should remain as-is from localStorage
            } else {
              console.log('[Store] Sync failed:', syncResult.error, '- KEEPING local clients');
              // Don't lose local clients on sync failure
            }
          } else {
            // No local clients, try fetching from database
            console.log('[Store] No local clients, fetching from database...');
            const dbClients = await fetchClientsFromDb();
            
            if (dbClients.length > 0) {
              set({
                clients: dbClients,
                lastSyncedAt: new Date().toISOString(),
              });
              console.log('[Store] Loaded', dbClients.length, 'clients from database');
            } else {
              console.log('[Store] No clients in database (or not authenticated)');
            }
          }
        } catch (error) {
          console.error('[Store] Sync error:', error);
          set({ syncError: error instanceof Error ? error.message : 'Sync failed' });
          // CRITICAL: Don't clear clients on error
        } finally {
          set({ isSyncing: false });
        }
      },
      
      syncToDatabase: async () => {
        const state = get();
        if (state.isSyncing || !state.isAuthenticated) return;
        
        set({ isSyncing: true, syncError: null });
        
        try {
          const result = await syncClientsToDb(state.clients);
          
          if (result.success) {
            set({
              clients: result.clients,
              lastSyncedAt: new Date().toISOString(),
            });
          } else {
            set({ syncError: result.error || 'Sync failed' });
          }
        } catch (error) {
          console.error('[Store] Sync error:', error);
          set({ syncError: error instanceof Error ? error.message : 'Sync failed' });
        } finally {
          set({ isSyncing: false });
        }
      },
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
        phases: state.phases,
        activePhaseId: state.activePhaseId,
        timelineEvents: state.timelineEvents,
        nutritionTargets: state.nutritionTargets,
        mealPlan: state.mealPlan,
        currentStep: state.currentStep,
        // Persist sync state
        lastSyncedAt: state.lastSyncedAt,
      }),
      onRehydrateStorage: () => {
        console.log('[Store] Starting rehydration from localStorage...');
        return (state, error) => {
          if (error) {
            console.error('[Store] Rehydration error:', error);
          } else if (state) {
            console.log('[Store] Rehydration complete');
            console.log('[Store] Restored clients:', state.clients?.length || 0, state.clients?.map(c => c.name) || []);
            console.log('[Store] Active client ID:', state.activeClientId);
          }
        };
      },
    }
  )
);

// Legacy export for backward compatibility
export { useFitomicsStore as useStore };
