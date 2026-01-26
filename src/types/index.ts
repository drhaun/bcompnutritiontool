// ============ CLIENT PROFILE SYSTEM ============
// For Nutrition Planning OS - Staff/Coach focused

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
  // All client-specific data stored per profile
  userProfile: Partial<UserProfile>;
  bodyCompGoals: Partial<BodyCompGoals>;
  dietPreferences: Partial<DietPreferences>;
  weeklySchedule: Partial<WeeklySchedule>;
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
}

// User Profile Types
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
  
  // Additional context
  healthGoals?: string;
  performanceGoals?: string;
  additionalNotes?: string;
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
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain';
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
export interface WorkoutConfig {
  enabled: boolean;
  type: WorkoutType;
  timeSlot: WorkoutTimeSlot;
  duration: number; // minutes
  intensity: 'Low' | 'Medium' | 'High';
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
}

// Nutrient timing preferences
export interface NutrientTimingPrefs {
  includePreWorkoutMeal: boolean;
  includePreWorkoutSnack: boolean;
  includePostWorkoutMeal: boolean;
  energyDistribution: 'front_loaded' | 'steady' | 'back_loaded' | 'workout_focused';
  liquidCaloriesPreference: 'minimize' | 'moderate' | 'include_shakes';
}

// Workout defaults
export interface WorkoutDefaults {
  type: WorkoutType;
  timeSlot: WorkoutTimeSlot;
  duration: number;
  intensity: 'Low' | 'Medium' | 'High';
}

// Schedule preferences
export interface SchedulePreferences {
  allowMultipleWorkoutsPerDay: boolean;
  avoidWorkoutsNearBedtime: boolean;
  allowFastedWorkouts: boolean;
  workoutDefaults: WorkoutDefaults;
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
export type MealSource = 'ai' | 'manual' | 'swapped';

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
