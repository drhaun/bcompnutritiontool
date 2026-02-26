// ============ CLIENT PROFILE SYSTEM ============
// For Nutrition Planning OS - Staff/Coach focused

// Phase status for planning
export type PhaseStatus = 'planned' | 'active' | 'completed';

// Goal type for phases
export type GoalType = 'fat_loss' | 'muscle_gain' | 'recomposition' | 'performance' | 'health' | 'other';

// Timeline event types (lab tests, competitions, travel, etc.)
export type TimelineEventType = 'lab_test' | 'competition' | 'travel' | 'vacation' | 'milestone' | 'other';

export interface TimelineEvent {
  id: string;
  name: string;
  date: string;
  type: TimelineEventType;
  notes?: string;
  color?: string;
}

// Individual micronutrient target with customization
export interface MicronutrientTarget {
  value: number;           // Target amount
  unit: string;            // 'mg', 'mcg', 'g', 'IU'
  isCustom: boolean;       // Whether user has customized this
  minSafe?: number;        // Minimum safe intake
  maxSafe?: number;        // Upper tolerable limit (UL)
  rdaReference?: number;   // Standard RDA for reference
}

// Complete micronutrient targets for a phase
export interface MicronutrientTargets {
  // Vitamins
  vitaminA?: MicronutrientTarget;      // mcg RAE
  vitaminC?: MicronutrientTarget;      // mg
  vitaminD?: MicronutrientTarget;      // mcg (or IU)
  vitaminE?: MicronutrientTarget;      // mg
  vitaminK?: MicronutrientTarget;      // mcg
  thiamin?: MicronutrientTarget;       // mg (B1)
  riboflavin?: MicronutrientTarget;    // mg (B2)
  niacin?: MicronutrientTarget;        // mg (B3)
  pantothenicAcid?: MicronutrientTarget; // mg (B5)
  vitaminB6?: MicronutrientTarget;     // mg
  biotin?: MicronutrientTarget;        // mcg (B7)
  folate?: MicronutrientTarget;        // mcg DFE (B9)
  vitaminB12?: MicronutrientTarget;    // mcg
  
  // Major Minerals
  calcium?: MicronutrientTarget;       // mg
  phosphorus?: MicronutrientTarget;    // mg
  magnesium?: MicronutrientTarget;     // mg
  sodium?: MicronutrientTarget;        // mg
  potassium?: MicronutrientTarget;     // mg
  chloride?: MicronutrientTarget;      // mg
  
  // Trace Minerals
  iron?: MicronutrientTarget;          // mg
  zinc?: MicronutrientTarget;          // mg
  copper?: MicronutrientTarget;        // mg
  manganese?: MicronutrientTarget;     // mg
  selenium?: MicronutrientTarget;      // mcg
  iodine?: MicronutrientTarget;        // mcg
  chromium?: MicronutrientTarget;      // mcg
  molybdenum?: MicronutrientTarget;    // mcg
  
  // Other Important Nutrients
  fiber?: MicronutrientTarget;         // g
  omega3?: MicronutrientTarget;        // g (EPA + DHA)
  choline?: MicronutrientTarget;       // mg
  
  // Custom/Additional targets
  custom?: Record<string, MicronutrientTarget>;
}

// Macro coefficient calculation basis
export type MacroBasis = 'total_weight' | 'fat_free_mass';

// Macro settings for a phase (stored with phase)
export interface MacroSettings {
  basis: MacroBasis;                    // Calculate per total weight or FFM
  proteinPerKg: number;                 // g/kg (of basis)
  fatPerKg: number;                     // g/kg (of basis)
  // Carbs are calculated from remaining calories
}

// Custom metric for tracking non-body-comp goals
export interface PhaseCustomMetric {
  id: string;
  name: string;
  startValue: string;
  targetValue: string;
  unit: string;
}

// Check-in data for tracking actual progress
export interface PhaseCheckIn {
  id: string;
  date: string;              // ISO date string
  weekNumber: number;        // Week number in the phase (0 = start)
  
  // Body composition measurements
  weight?: number;           // lbs
  bodyFat?: number;          // percentage
  
  // Calculated from above
  fatMass?: number;          // lbs
  leanMass?: number;         // lbs
  
  // Optional additional measurements
  waist?: number;            // inches
  hips?: number;             // inches
  chest?: number;            // inches
  
  // Performance metrics (for performance goals)
  customMetricValues?: Record<string, string>;  // metric id -> actual value
  
  // Notes
  notes?: string;
  createdAt: string;
}

// Phase - A time-bound goal period with targets and meal plan
export interface Phase {
  id: string;
  name: string;  // e.g., "Cut Phase Q1", "Maintenance Summer"
  customGoalName?: string; // For 'other' or 'health' goal types
  goalType: GoalType;
  status: PhaseStatus;
  startDate: string;
  endDate: string;
  
  // Starting body composition (snapshot at phase creation)
  startingWeightLbs?: number;
  startingBodyFat?: number;
  
  // Target body composition
  targetWeightLbs: number;
  targetBodyFat: number;
  targetFatMassLbs: number;
  targetFFMLbs: number;
  rateOfChange: number;  // % body weight per week
  
  // Custom metrics for performance/health goals
  customMetrics?: PhaseCustomMetric[];
  
  // Context for this phase
  performancePriority: PerformancePriority;
  musclePreservation: MusclePreservation;
  fatGainTolerance: FatGainTolerance;
  lifestyleCommitment: LifestyleCommitment;
  trackingCommitment: TrackingCommitment;
  
  // Optional schedule overrides (null = use profile defaults)
  scheduleOverrides: Partial<WeeklySchedule> | null;
  
  // Macro coefficient settings
  macroSettings?: MacroSettings;
  
  // Micronutrient targets (evidence-based defaults with customization)
  micronutrientTargets?: MicronutrientTargets;
  
  // Calculated targets + meal plan
  nutritionTargets: DayNutritionTargets[];
  mealPlan: WeeklyMealPlan | null;
  
  // Progress tracking - actual check-ins vs projected
  checkIns?: PhaseCheckIn[];
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  coachId?: string; // Staff member who created/manages this client
  status: 'active' | 'inactive' | 'archived';
  // Cronometer integration
  cronometerClientId?: number; // Linked Cronometer Pro client ID
  cronometerClientName?: string; // For display purposes
  
  // All client-specific data stored per profile
  userProfile: Partial<UserProfile>;
  bodyCompGoals: Partial<BodyCompGoals>;  // Profile-level defaults for goal preferences
  dietPreferences: Partial<DietPreferences>;
  weeklySchedule: Partial<WeeklySchedule>;  // Profile-level schedule defaults
  
  // Phase-based planning
  phases: Phase[];
  activePhaseId?: string;
  
  // Timeline events (labs, competitions, travel, etc.)
  timelineEvents?: TimelineEvent[];
  
  // Favorite recipes saved by coach/client
  favoriteRecipes?: FavoriteRecipe[];
  
  // Coach-shared resources (files, links, guides)
  resources?: ClientResource[];
  
  // Legacy fields (for backward compatibility, will migrate to phases)
  nutritionTargets: DayNutritionTargets[];
  mealPlan: WeeklyMealPlan | null;
  currentStep: number;
  
  // History tracking
  planHistory?: {
    id: string;
    createdAt: string;
    plan: WeeklyMealPlan;
    notes?: string;
  }[];
}

// Staff member who uses the system
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coach' | 'nutritionist';
}

// Metabolic Assessment Types
export type RMREquation = 'mifflin' | 'harris' | 'cunningham';

export interface MetabolicAssessment {
  // RMR (Resting Metabolic Rate)
  useMeasuredRMR: boolean;
  measuredRMR?: number; // kcal/day
  selectedRMREquations: RMREquation[];
  useAverageRMR: boolean;
  calculatedRMR: number; // Final RMR value used
  
  // Body Fat
  useMeasuredBF: boolean;
  measuredBFPercent?: number;
  estimatedBFPercent?: number;
  
  // Active Metabolic Rate (Zone-based calorie data from testing)
  hasZoneData: boolean;
  zoneCaloriesPerMin?: {
    zone1: number; // Recovery/Easy (< 60% HRmax)
    zone2: number; // Aerobic/Base (60-70% HRmax)
    zone3: number; // Tempo (70-80% HRmax)
    zone4: number; // Threshold (80-90% HRmax)
    zone5: number; // VO2max (90%+ HRmax)
  };
}

// User Profile Types
// Client Address for location-based features
export interface ClientAddress {
  label: string; // "Home", "Work", "Travel", etc.
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isDefault?: boolean;
}

export interface UserProfile {
  name: string;
  gender: 'Male' | 'Female';
  age: number;
  dateOfBirth?: string;
  heightFt: number;
  heightIn: number;
  heightCm: number;
  weightLbs: number;
  weightKg: number;
  bodyFatPercentage: number;
  
  // Metabolic
  metabolicAssessment?: MetabolicAssessment;
  rmr?: number; // Final RMR value
  
  // Legacy fields (still used in schedule)
  activityLevel?: ActivityLevel;
  workoutsPerWeek?: number;
  
  // Workout defaults (saved from profile setup)
  workoutDefaults?: WorkoutDefaults;
  
  // Section notes (captured during profile setup conversation)
  scheduleNotes?: string;    // Notes under sleep/work schedule
  workoutNotes?: string;     // Notes under workout defaults / activity level
  
  // Supplement tracking
  supplements?: SupplementEntry[];
  
  // Additional context
  healthGoals?: string;
  performanceGoals?: string;
  additionalNotes?: string;
  
  // Addresses for location-based features (meal delivery, travel planning)
  addresses?: ClientAddress[];

  // Intake form goal data (populated by client form submission)
  goalType?: GoalType;
  goalRate?: 'conservative' | 'moderate' | 'aggressive';
  recompBias?: 'maintenance' | 'deficit' | 'surplus';
  rateOfChange?: number;
  goalWeight?: number;
  goalBodyFatPercent?: number;
  goalFatMass?: number;
  goalFFM?: number;

  // Intake form extras
  weeklyActivity?: unknown[];
}

// Supplement entry for client profile
export type SupplementTiming = 'morning' | 'pre_workout' | 'intra_workout' | 'post_workout' | 'with_meals' | 'before_bed' | 'as_needed';

export interface SupplementEntry {
  name: string;
  dosage?: string;        // e.g., "5g", "2 capsules"
  timing: SupplementTiming[];
  notes?: string;         // Brand, purpose, link, etc.
  detectedFromCronometer?: boolean; // Was this auto-detected from Cronometer logs?
}

export type ActivityLevel = 
  | 'Sedentary (0-5k steps/day)'
  | 'Light Active (5-10k steps/day)'
  | 'Active (10-15k steps/day)'
  | 'Labor Intensive (>15k steps/day)';

// Goal Preferences - these affect nutrition plan aggressiveness and protein targets
export type PerformancePriority = 
  | 'body_comp_priority'    // OK with reduced performance for body comp goals
  | 'performance_priority'; // Maximize performance over body comp

export type MusclePreservation = 
  | 'preserve_all'          // Don't want to lose any muscle
  | 'accept_some_loss';     // OK with losing a little muscle

export type FatGainTolerance = 
  | 'maximize_muscle'       // OK with gaining some fat to maximize muscle growth
  | 'minimize_fat_gain';    // Don't want to gain any fat while building muscle

export type LifestyleCommitment = 
  | 'fully_committed'       // 4+ workouts, sleep, nutrition all dialed
  | 'moderately_committed'  // Few workouts, try to prioritize sleep/nutrition  
  | 'limited_commitment';   // Can't commit to 3+ workouts or adequate sleep

export type TrackingCommitment = 
  | 'committed_tracking'    // Will track regularly
  | 'casual_tracking';      // Not committed to regular tracking

// Body Composition Goals
export interface BodyCompGoals {
  goalType: GoalType;
  targetWeightLbs: number;
  targetBodyFat: number;
  timelineWeeks: number;
  weeklyWeightChange?: number; // lbs per week
  weeklyWeightChangePct?: number; // % of body weight per week
  startDate?: string;
  targetFatMassLbs?: number;
  targetFFMLbs?: number;
  targetFMI?: number;
  targetFFMI?: number;
  performancePriority: PerformancePriority;
  musclePreservation: MusclePreservation;
  fatGainTolerance?: FatGainTolerance; // For muscle gain goals
  lifestyleCommitment: LifestyleCommitment;
  trackingCommitment: TrackingCommitment;
  // Phase-specific properties (used when exporting from a phase)
  phaseName?: string;
  phaseStartDate?: string;
  phaseEndDate?: string;
}

// Supplement status
export type SupplementStatus = 'taking' | 'not_interested' | 'interested';

export interface SupplementPreference {
  name: string;
  status: SupplementStatus;
  notes?: string; // Free text for purpose, amount, frequency, brand, etc.
}

// Interest level for meal sourcing
export type InterestLevel = 'low' | 'medium' | 'high';

// Diet Preferences
export interface DietPreferences {
  // Dietary Restrictions & Allergies
  dietaryRestrictions: string[];
  allergies: string[];
  customAllergies: string[];
  
  // Food Preferences
  preferredProteins: string[];
  preferredCarbs: string[];
  preferredFats: string[];
  preferredVegetables: string[];
  cuisinePreferences: string[];
  foodsToAvoid: string[];
  foodsToEmphasize: string[]; // Foods to prioritize in meal plans
  
  // Supplements
  supplements: SupplementPreference[];
  otherSupplements: string[];
  
  // Meal Sourcing
  mealDeliveryInterest: InterestLevel;
  homeCookingInterest: InterestLevel;
  groceryShoppingInterest: InterestLevel;
  cookingTimePreference: string;
  budgetPreference: string;
  
  // Seasoning & Flavor
  spiceLevel: number; // 0-4 scale
  flavorProfiles: string[];
  preferredSeasonings: string[];
  cookingEnhancers: string[];
  
  // Meal Variety
  varietyLevel: number; // 1-5 scale
  repetitionPreference: string;
  weeklyMealStructure: string;
  cookingVariety: string;
  
  // Micronutrient & Seasonal
  micronutrientFocus: string[];
  seasonalPreference: string;
  ingredientSubstitutions: boolean;
  mealPrepCoordination: string;
  preferredProduceSeasons: string[];
  
  // Fasting & Meal Timing (from intake form)
  fastingProtocol?: string;
  feedingWindowStart?: string;
  feedingWindowEnd?: string;
  energyDistribution?: string;
  includePreWorkoutSnack?: boolean;
  preWorkoutPreference?: string;
  includePostWorkoutMeal?: boolean;
  postWorkoutPreference?: string;

  // Location-Based (future)
  homeZipCode: string;
  workZipCode: string;
  favoriteRestaurants: string[];
  favoriteGroceryStores: string[];
}

// Work type options
export type WorkType = 'office' | 'remote' | 'hybrid' | 'shift' | 'none';

// Workout types
export type WorkoutType = 'Resistance Training' | 'Cardio' | 'HIIT' | 'Yoga/Mobility' | 'Sports' | 'Mixed';

// Workout time slots
export type WorkoutTimeSlot = 
  | 'early_morning' // 5:00-7:00 AM
  | 'morning'       // 7:00-10:00 AM  
  | 'midday'        // 10:00 AM-2:00 PM
  | 'afternoon'     // 2:00-5:00 PM
  | 'evening'       // 5:00-8:00 PM
  | 'night';        // 8:00-11:00 PM

// Meal preparation methods
export type MealPrepMethod = 'cook' | 'leftovers' | 'pickup' | 'delivery' | 'skip';

// Meal location options
export type MealLocation = 'home' | 'office' | 'on_the_go' | 'restaurant' | 'gym';

// General schedule settings
export interface GeneralScheduleSettings {
  wakeTime: string;
  bedTime: string;
  workType: WorkType;
  workStartTime: string;
  workEndTime: string;
}

// Workout configuration for a specific day
export type TrainingZone = 1 | 2 | 3 | 4 | 5;

export interface WorkoutConfig {
  enabled: boolean;
  type: WorkoutType;
  timeSlot: WorkoutTimeSlot;
  duration: number; // minutes
  intensity: 'Low' | 'Medium' | 'High';
  averageZone?: TrainingZone; // Average training zone (1-5) if metabolic data available
  estimatedCalories?: number;
}

// Meal context for a specific meal/snack
export interface MealContext {
  id: string;
  type: 'meal' | 'snack';
  label: string; // "Breakfast", "Lunch", etc.
  prepMethod: MealPrepMethod;
  prepTime: string; // '<5min', '5-15min', '15-30min', '30+min'
  location: MealLocation;
  timeRange: string;
  isRoutine: boolean;
  clientNotes?: string; // Free-text: what the client normally does for this meal
}

// Peri-workout nutrition preferences
export type PeriWorkoutPreference =
  | 'full_meal'         // Full meal 1-2h before/after
  | 'light_snack'       // Light snack/shake 30-60 min before/after
  | 'supplement_only'   // EAA/protein/carb supplement only
  | 'fasted'            // Prefers training fasted (pre) or delayed eating (post)
  | 'flexible';         // No strong preference

// Nutrient timing preferences
export interface NutrientTimingPrefs {
  includePreWorkoutMeal: boolean;
  includePreWorkoutSnack: boolean;
  includePostWorkoutMeal: boolean;
  energyDistribution: 'front_loaded' | 'steady' | 'back_loaded' | 'workout_focused';
  liquidCaloriesPreference: 'minimize' | 'moderate' | 'include_shakes';
  // Enhanced peri-workout preferences
  preWorkoutPreference?: PeriWorkoutPreference;
  postWorkoutPreference?: PeriWorkoutPreference;
  periWorkoutNotes?: string; // Free-text for specifics (e.g., "gets nauseous if eating within 1h of training")
}

// Workout defaults
export interface WorkoutDefaults {
  type: WorkoutType;
  timeSlot: WorkoutTimeSlot;
  duration: number;
  intensity: 'Low' | 'Medium' | 'High';
}

// Schedule preferences
// Time-restricted eating protocols
export type FastingProtocol = 
  | 'none'           // No time restriction
  | '16_8'           // 16h fast, 8h eating window (most common)
  | '14_10'          // 14h fast, 10h eating window (moderate)
  | '18_6'           // 18h fast, 6h eating window (advanced)
  | '20_4'           // 20h fast, 4h eating window (warrior diet)
  | 'custom';        // Custom fasting/feeding windows

export interface TimeRestrictedEating {
  enabled: boolean;
  protocol: FastingProtocol;
  feedingWindowStart: string;  // e.g., "12:00" (noon)
  feedingWindowEnd: string;    // e.g., "20:00" (8pm)
  flexibleOnWeekends: boolean; // Allow longer window on weekends
  weekendWindowStart?: string;
  weekendWindowEnd?: string;
}

export interface SchedulePreferences {
  allowMultipleWorkoutsPerDay: boolean;
  avoidWorkoutsNearBedtime: boolean;
  allowFastedWorkouts: boolean;
  workoutDefaults: WorkoutDefaults;
  timeRestrictedEating?: TimeRestrictedEating;
}

// Day schedule
export interface DaySchedule {
  wakeTime: string;
  sleepTime: string;
  workStartTime?: string;
  workEndTime?: string;
  workouts: WorkoutConfig[];
  mealCount: number;
  snackCount: number;
  mealContexts: MealContext[];
  estimatedTDEE?: number;
}

export type WeeklySchedule = {
  [key in DayOfWeek]: DaySchedule;
};

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

// Legacy compatibility
export interface WorkoutSchedule {
  time: string;
  type: string;
  duration: number;
  intensity: 'Low' | 'Medium' | 'High';
}

// Nutrition Targets
export interface NutritionTargets {
  tdee: number;
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DayNutritionTargets extends NutritionTargets {
  day: DayOfWeek;
  isWorkoutDay: boolean;
  dayLabel?: string; // Custom label: "Refeed Day", "Deload Day", etc.
}

// Macros
export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Meal Plan Types
export interface Ingredient {
  item: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: 'protein' | 'carbs' | 'fats' | 'vegetables' | 'seasonings' | 'other';
}

// Source of how a meal was created
export type MealSource = 'ai' | 'manual' | 'swapped' | 'recipe';

export interface MealSupplement {
  name: string;
  dosage?: string;
  notes?: string;             // e.g., brand, link, purpose
}

export interface Meal {
  name: string;
  time: string;
  context: string;
  prepTime: string;
  type: 'meal' | 'snack';
  ingredients: Ingredient[];
  instructions: string[];
  totalMacros: Macros;
  targetMacros: Macros;
  workoutRelation: 'pre-workout' | 'post-workout' | 'none';
  // New fields for modular meal builder
  staffNote?: string;        // Manual note from staff/coach
  aiRationale?: string;      // AI-generated explanation for this meal
  source?: MealSource;       // How the meal was created
  lastModified?: string;     // ISO timestamp of last modification
  isLocked?: boolean;        // Whether meal is locked from regeneration
  // Supplements attached to this meal
  supplements?: MealSupplement[];
  // Cronometer-informed adaptive meal planning
  adaptiveContext?: {
    whatChanged: string;
    keptFoods: string[];
    swappedFoods: { from: string; to: string }[];
    basedOnDays: number;
  };
}

// Meal slot for the modular builder
export interface MealSlot {
  id: string;
  day: DayOfWeek;
  slotIndex: number;
  type: 'meal' | 'snack';
  label: string;             // "Breakfast", "Lunch", "Snack 1", etc.
  targetMacros: Macros;      // Target macros for this slot
  meal: Meal | null;         // Filled meal or null if empty
  isLocked: boolean;         // Prevent regeneration
  timeSlot: string;          // Suggested time for this meal
  workoutRelation: 'pre-workout' | 'post-workout' | 'none';
}

// Request for generating a single meal
export interface SingleMealRequest {
  day: DayOfWeek;
  slotIndex: number;
  slotLabel: string;
  targetMacros: Macros;
  previousMeals: string[];   // For variety - names of meals already planned
  timeSlot: string;          // Time of day
  workoutRelation: 'pre-workout' | 'post-workout' | 'none';
  isWorkoutDay: boolean;
}

// Request for generating meal rationale/note
export interface MealNoteRequest {
  meal: Meal;
  day: DayOfWeek;
  clientGoal: string;
  isWorkoutDay: boolean;
  slotLabel: string;
}

// Request for meal swap suggestions
export interface MealSwapRequest {
  currentMeal: Meal;
  targetMacros: Macros;
  day: DayOfWeek;
  slotLabel: string;
  excludeMeals: string[];    // Meal names to exclude from suggestions
}

export interface DayMealPlan {
  day: DayOfWeek;
  meals: Meal[];
  dailyTotals: Macros;
  dailyTargets: Macros;
  accuracyValidated: boolean;
  mealStructureRationale: string;
}

export interface WeeklyMealPlan {
  [key: string]: DayMealPlan;
}

// Grocery List
export interface GroceryItem {
  name: string;
  totalAmount: string;
  category: Ingredient['category'];
  meals: string[];
}

export interface GroceryList {
  protein: GroceryItem[];
  carbs: GroceryItem[];
  fats: GroceryItem[];
  vegetables: GroceryItem[];
  seasonings: GroceryItem[];
  other: GroceryItem[];
}

// App State
export interface AppState {
  currentStep: number;
  userProfile: Partial<UserProfile>;
  bodyCompGoals: Partial<BodyCompGoals>;
  dietPreferences: Partial<DietPreferences>;
  weeklySchedule: Partial<WeeklySchedule>;
  nutritionTargets: DayNutritionTargets[];
  mealPlan: WeeklyMealPlan | null;
  isLoading: boolean;
  error: string | null;
}

// Coach Quick Links (persisted per coach in localStorage)
export interface CoachLink {
  id: string;
  label: string;
  url: string;
  color?: string; // tailwind text color class
  bg?: string;    // tailwind bg color class
  isDefault?: boolean; // true for built-in links
}

// ============ FAVORITE RECIPES ============
export interface FavoriteRecipe {
  id: string;             // Unique favorite ID
  slug: string;           // Recipe slug from ni_recipes table
  name: string;
  category: string;
  calories: number;       // Per serving
  protein: number;
  carbs: number;
  fat: number;
  image_url?: string | null;
  tags?: string[];
  savedAt: string;        // ISO timestamp
  notes?: string;         // Coach/client notes
  source: 'recipe' | 'ai' | 'manual'; // Where this recipe came from
  // For AI/manual meals, store the full meal data
  mealData?: Meal;
}

// ============ CLIENT RESOURCES ============
export type ClientResourceType = 'file' | 'link';

export interface ClientResource {
  id: string;
  title: string;
  description?: string;
  type: ClientResourceType;
  url: string;            // File URL (Supabase Storage) or external link
  fileName?: string;      // Original file name (for files)
  fileSize?: number;      // File size in bytes
  mimeType?: string;      // MIME type for files
  category?: string;      // e.g. 'guide', 'protocol', 'reference', 'handout'
  createdAt: string;      // ISO timestamp
  createdBy?: string;     // Coach who added it
}

// API Response Types
export interface MealPlanGenerationResponse {
  success: boolean;
  mealPlan?: WeeklyMealPlan;
  error?: string;
}

export interface PDFGenerationResponse {
  success: boolean;
  pdfUrl?: string;
  pdfBuffer?: ArrayBuffer;
  error?: string;
}
