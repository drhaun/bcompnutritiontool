# Body Composition Planner — Feature & Technical Specification

> **Purpose:** This document fully describes the Body Composition Planner tool so that it can be recreated in another application without access to the original codebase. It covers data models, workflows, calculations, AI integration, and UI behavior.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Data Models](#3-data-models)
4. [Workflow & Page Flow](#4-workflow--page-flow)
5. [Step 1 — Client Profile Setup](#5-step-1--client-profile-setup)
6. [Step 2 — Planning & Phase Management](#6-step-2--planning--phase-management)
7. [Step 3 — Nutrition Target Calculation](#7-step-3--nutrition-target-calculation)
8. [Step 4 — Meal Plan Generation](#8-step-4--meal-plan-generation)
9. [Step 5 — Grocery List & Export](#9-step-5--grocery-list--export)
10. [AI Integration](#10-ai-integration)
11. [Formulas & Calculations Reference](#11-formulas--calculations-reference)
12. [External Integrations](#12-external-integrations)
13. [State Management](#13-state-management)

---

## 1. Overview

The Body Composition Planner is a coach-facing tool for sports dietitians and nutrition coaches. It enables practitioners to:

- **Assess** a client's current body composition (weight, body fat %, FMI, FFMI)
- **Plan** sequential goal phases (fat loss, muscle gain, recomposition, performance, health)
- **Calculate** evidence-based daily nutrition targets per day of the week (workout vs. rest)
- **Generate** AI-powered meal plans that hit precise macro targets
- **Produce** grocery lists and exportable PDF meal plans
- **Track** progress via check-ins with projected vs. actual outcomes
- **Integrate** with Kroger (grocery ordering) and Cronometer (biometric data)

The tool follows a **5-step linear workflow**: Profile → Planning → Targets → Meal Plan → Export.

---

## 2. Architecture & Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js (App Router, React Server Components + Client Components) |
| **Language** | TypeScript |
| **State Management** | Zustand with `persist` middleware (localStorage + Supabase sync) |
| **Database** | Supabase (PostgreSQL) |
| **AI Providers** | Anthropic (Claude Opus 4.6) primary; OpenAI (GPT-4o / GPT-4o-mini) fallback |
| **PDF Generation** | React-PDF (`@react-pdf/renderer`) |
| **UI Components** | shadcn/ui (Radix primitives + Tailwind CSS) |
| **Grocery API** | Kroger Product & Cart API |
| **Biometrics API** | Cronometer (OAuth 2.0) |
| **Payments** | Stripe (for grocery order markup) |
| **Hosting** | Vercel |

---

## 3. Data Models

### 3.1 User Profile

```typescript
interface UserProfile {
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
  rmr?: number; // Resting Metabolic Rate (kcal/day)

  // Activity
  activityLevel?: ActivityLevel;
  workoutsPerWeek?: number;
  workoutDefaults?: WorkoutDefaults;
  weeklyActivity?: ActivityBout[][]; // Per-day activity from intake form

  // Goals (from intake form)
  goalType?: GoalType;
  goalRate?: 'conservative' | 'moderate' | 'aggressive';
  recompBias?: 'maintenance' | 'deficit' | 'surplus';
  rateOfChange?: number;
  goalWeight?: number;
  goalBodyFatPercent?: number;
}
```

`ActivityLevel` options: `'Sedentary (<5k steps/day)'`, `'Light (5-7.5k steps/day)'`, `'Active (10-15k steps/day)'`, `'Very Active (15k+ steps/day)'`

### 3.2 Body Composition Goals

```typescript
type GoalType = 'fat_loss' | 'muscle_gain' | 'recomposition' | 'performance' | 'health' | 'other';

type PerformancePriority = 'body_comp_priority' | 'performance_priority';
type MusclePreservation = 'preserve_all' | 'accept_some_loss';
type FatGainTolerance = 'maximize_muscle' | 'minimize_fat_gain';
type LifestyleCommitment = 'fully_committed' | 'moderately_committed' | 'limited_commitment';
type TrackingCommitment = 'committed_tracking' | 'casual_tracking';

interface BodyCompGoals {
  goalType: GoalType;
  targetWeightLbs: number;
  targetBodyFat: number;
  timelineWeeks: number;
  weeklyWeightChange?: number;       // lbs per week
  weeklyWeightChangePct?: number;    // % of body weight per week
  startDate?: string;
  targetFatMassLbs?: number;
  targetFFMLbs?: number;
  targetFMI?: number;
  targetFFMI?: number;
  performancePriority: PerformancePriority;
  musclePreservation: MusclePreservation;
  fatGainTolerance?: FatGainTolerance;
  lifestyleCommitment: LifestyleCommitment;
  trackingCommitment: TrackingCommitment;
}
```

### 3.3 Phase

A Phase is a time-bound goal period with targets, approach preferences, and a meal plan.

```typescript
type PhaseStatus = 'planned' | 'active' | 'completed';

interface Phase {
  id: string;
  name: string;
  customGoalName?: string;
  goalType: GoalType;
  status: PhaseStatus;
  startDate: string;       // ISO date
  endDate: string;         // ISO date

  // Starting snapshot
  startingWeightLbs?: number;
  startingBodyFat?: number;

  // Target body composition
  targetWeightLbs: number;
  targetBodyFat: number;
  targetFatMassLbs: number;
  targetFFMLbs: number;
  rateOfChange: number;    // % body weight per week

  // Custom metrics (for performance/health goals)
  customMetrics?: { id: string; name: string; startValue: string; targetValue: string; unit: string }[];

  // Approach context
  performancePriority: PerformancePriority;
  musclePreservation: MusclePreservation;
  fatGainTolerance: FatGainTolerance;
  lifestyleCommitment: LifestyleCommitment;
  trackingCommitment: TrackingCommitment;

  // Macro coefficient settings
  macroSettings?: MacroSettings;

  // Schedule overrides (null = use profile defaults)
  scheduleOverrides: Partial<WeeklySchedule> | null;

  // Calculated targets + meal plan
  nutritionTargets: DayNutritionTargets[];
  mealPlan: WeeklyMealPlan | null;

  // Progress tracking
  checkIns?: PhaseCheckIn[];

  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.4 Nutrition Targets

```typescript
interface NutritionTargets {
  tdee: number;
  targetCalories: number;
  protein: number;          // grams
  carbs: number;            // grams
  fat: number;              // grams
}

type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

interface DayNutritionTargets extends NutritionTargets {
  day: DayOfWeek;
  isWorkoutDay: boolean;
  dayLabel?: string;        // "Refeed Day", "Deload Day", etc.

  // Extended fields (stored when saving from the targets editor)
  meals?: number;
  snacks?: number;
  workoutCalories?: number;
  energyAvailability?: number;
  wakeTime?: string;
  sleepTime?: string;
  preWorkoutMeal?: boolean;
  postWorkoutMeal?: boolean;
  workouts?: WorkoutConfig[];
  mealContexts?: MealContext[];
  mealSlotTargets?: MealSlotTarget[];
}
```

### 3.5 Macro Settings

```typescript
type MacroBasis = 'total_weight' | 'fat_free_mass';

interface MacroSettings {
  basis: MacroBasis;
  proteinPerKg: number;    // g/kg of basis weight
  fatPerKg: number;        // g/kg of basis weight
  // Carbs = remaining calories after protein and fat
}
```

### 3.6 Workout Configuration

```typescript
type WorkoutType = 'Resistance Training' | 'Cardio' | 'HIIT' | 'Sport' | 'Yoga/Pilates' | 'Swimming' | 'Other';
type WorkoutTimeSlot = 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
type TrainingZone = 1 | 2 | 3 | 4 | 5;

interface WorkoutConfig {
  enabled: boolean;
  type: WorkoutType;
  timeSlot: WorkoutTimeSlot;
  duration: number;                 // minutes
  intensity: 'Low' | 'Medium' | 'High';
  averageZone?: TrainingZone;       // Heart rate zone 1-5
  estimatedCalories?: number;
}
```

### 3.7 Meal Context

```typescript
type MealPrepMethod = 'cook' | 'leftovers' | 'pickup' | 'delivery' | 'skip' | 'packaged';
type MealLocation = 'home' | 'work' | 'restaurant' | 'on_the_go' | 'gym' | 'travel';

interface MealContext {
  id: string;
  type: 'meal' | 'snack';
  label: string;                // "Breakfast", "Lunch", "Snack 1", etc.
  prepMethod: MealPrepMethod;
  prepTime: string;             // '<5min', '5-15min', '15-30min', '30+min'
  location: MealLocation;
  timeRange: string;
  isRoutine: boolean;
  clientNotes?: string;
  bulkPrepDays?: number;        // Prep once, eat for N days
}
```

### 3.8 Weekly Schedule

```typescript
interface DaySchedule {
  wakeTime: string;
  sleepTime: string;
  workStartTime?: string;
  workEndTime?: string;
  workouts: WorkoutConfig[];
  mealCount: number;
  snackCount: number;
  mealContexts: MealContext[];
}

type WeeklySchedule = {
  [key in DayOfWeek]: DaySchedule;
};
```

### 3.9 Timeline Events

```typescript
type TimelineEventType = 'lab_test' | 'competition' | 'travel' | 'vacation' | 'milestone' | 'other';

interface TimelineEvent {
  id: string;
  name: string;
  date: string;              // ISO date
  type: TimelineEventType;
  notes?: string;
  color?: string;
}
```

### 3.10 Phase Check-In

```typescript
interface PhaseCheckIn {
  id: string;
  date: string;
  weekNumber: number;          // Week number in the phase (0 = start)
  weight?: number;             // lbs
  bodyFat?: number;            // percentage
  fatMass?: number;            // lbs (calculated)
  leanMass?: number;           // lbs (calculated)
  waist?: number;              // inches
  hips?: number;
  chest?: number;
  customMetricValues?: Record<string, string>;
  notes?: string;
  createdAt: string;
}
```

### 3.11 Diet Preferences

```typescript
interface DietPreferences {
  // Restrictions
  dietaryRestrictions: string[];
  allergies: string[];
  customAllergies: string[];

  // Food preferences
  preferredProteins: string[];
  preferredCarbs: string[];
  preferredFats: string[];
  preferredVegetables: string[];
  cuisinePreferences: string[];
  foodsToAvoid: string[];
  foodsToEmphasize: string[];

  // Supplements
  supplements: { name: string; status: 'taking' | 'not_interested' | 'interested'; notes?: string }[];

  // Sourcing & Budget
  cookingTimePreference: string;
  budgetPreference: string;        // 'budget' | 'moderate' | 'flexible'
  groceryBudgetCap?: number;       // Dollar amount
  groceryBudgetPeriod?: 'daily' | 'weekly';

  // Flavor
  spiceLevel: number;              // 0-4
  flavorProfiles: string[];
  preferredSeasonings: string[];

  // Variety
  varietyLevel: number;            // 1-5
  repetitionPreference: string;

  // Constraints
  maxIngredientsPerMeal?: number;
  availableFoods?: string[];       // Pantry items

  // Fasting & Timing
  fastingProtocol?: string;
  feedingWindowStart?: string;
  feedingWindowEnd?: string;
  includePreWorkoutSnack?: boolean;
  includePostWorkoutMeal?: boolean;
}
```

### 3.12 Meal Plan

```typescript
interface Meal {
  name: string;
  description: string;
  totalMacros: { calories: number; protein: number; carbs: number; fat: number };
  ingredients: MealIngredient[];
  instructions: string[];
  prepTime?: number;
  source?: 'ai' | 'manual' | 'recipe';
  lastModified?: string;
}

interface MealIngredient {
  item: string;
  amount: string;
  unit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DayPlan {
  meals: (Meal | null)[];
  dailyTotals: { calories: number; protein: number; carbs: number; fat: number };
}

type WeeklyMealPlan = {
  [key in DayOfWeek]?: DayPlan;
};
```

### 3.13 Single Meal Request

```typescript
interface SingleMealRequest {
  day: DayOfWeek;
  slotIndex: number;
  slotLabel: string;
  targetMacros: { calories: number; protein: number; carbs: number; fat: number };
  previousMeals: string[];
  timeSlot: string;
  workoutRelation: 'pre-workout' | 'post-workout' | 'none';
  isWorkoutDay: boolean;
  prepMethod?: MealPrepMethod;
  location?: MealLocation;
  maxIngredients?: number;
  availableFoods?: string[];
}
```

---

## 4. Workflow & Page Flow

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. Profile  │───▶│  2. Planning  │───▶│  3. Meal Plan │───▶│  4. Export   │
│  /setup      │    │  /planning    │    │  /meal-plan   │    │  (PDF/Kroger)│
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
      │                   │                    │
      ▼                   ▼                    ▼
  Client info       Create phases         Generate meals
  Body comp         Set targets           Browse recipes
  Diet prefs        Timeline events       Grocery list
  Schedule          Check-ins             Copy/edit meals
  Weekly activity   Phase calendar        Per-meal overrides
```

Each step persists data to the Zustand store (with localStorage persistence and optional Supabase sync). Navigation is via `ProgressSteps` component showing current step.

---

## 5. Step 1 — Client Profile Setup (`/setup`)

### 5.1 Data Collected

| Section | Fields |
|---------|--------|
| **Demographics** | Name, gender, age/DOB, height (ft/in), weight (lbs) |
| **Body Composition** | Body fat % (measured or estimated), method used |
| **Metabolic** | RMR (measured, calculated via Mifflin/Harris/Cunningham, or custom) |
| **Daily Schedule** | Wake time, bed time, work type, work hours |
| **Weekly Training** | Per-day workout entries: type, time slot, duration, intensity, zone (Z1-Z5) |
| **Goal Setting** | Goal type, rate of change, target weight/body fat/FMI/FFMI |
| **Dietary Restrictions** | Restrictions, allergies, foods to avoid/emphasize |
| **Food Preferences** | Preferred proteins/carbs/fats/vegetables, cuisines |
| **Meal Structure** | Meals per day, snacks per day, per-meal prep method/location/time |
| **Budget** | Budget preference (budget/moderate/flexible), grocery budget cap ($/day or $/week) |
| **Flavor** | Spice level, flavor profiles, preferred seasonings |
| **Constraints** | Max ingredients per meal, available pantry foods |
| **Supplements** | Current supplements with status and notes |

### 5.2 Body Composition Assessment

**Calculated metrics:**
- **Fat Mass (lbs)** = weight × (bodyFat% / 100)
- **Fat-Free Mass (lbs)** = weight − fatMass
- **BMI** = weightKg / (heightM²)
- **FMI** (Fat Mass Index) = fatMassKg / (heightM²)
- **FFMI** (Fat-Free Mass Index) = ffmKg / (heightM²)

**FMI categories (male/female differ):**

| Male FMI | Female FMI | Category |
|----------|-----------|----------|
| < 3 | < 5 | Extremely Lean |
| 3-4 | 5-7 | Lean |
| 4-6 | 7-9 | Average |
| 6-9 | 9-13 | Slightly Elevated |
| 9-13 | 13-18 | Elevated |
| > 13 | > 18 | High |

**FFMI categories (male/female differ):**

| Male FFMI | Female FFMI | Category |
|-----------|------------|----------|
| < 17 | < 14 | Undermuscled |
| 17-19 | 14-16 | Moderately Undermuscled |
| 19-21 | 16-17.5 | Average |
| 21-23 | 17.5-19 | Above Average |
| 23-25 | 19-21 | Muscular |
| > 25 | > 21 | Highly Muscular |

**Recommended goal derivation:**
- If FMI is "Elevated" or "High" → recommend **fat loss**
- If FFMI is "Undermuscled" → recommend **muscle gain**
- If FMI is "Lean" or "Extremely Lean" → recommend **muscle gain**
- Otherwise → recommend **maintenance**

### 5.3 RMR Equations

**Mifflin-St Jeor (default):**
- Male: `10 × weightKg + 6.25 × heightCm − 5 × age + 5`
- Female: `10 × weightKg + 6.25 × heightCm − 5 × age − 161`

**Harris-Benedict:**
- Male: `88.362 + 13.397 × weightKg + 4.799 × heightCm − 5.677 × age`
- Female: `447.593 + 9.247 × weightKg + 3.098 × heightCm − 4.330 × age`

**Cunningham (requires lean mass):**
- `500 + 22 × leanMassKg`

### 5.4 Rate of Change Presets

| Goal | Label | % BW/week | lbs/week |
|------|-------|-----------|----------|
| Fat Loss | Gradual | 0.25% | ~0.5 |
| Fat Loss | Moderate | 0.50% | ~1.0 |
| Fat Loss | Aggressive | 0.75% | ~1.5 |
| Fat Loss | Very Aggressive | 1.00% | ~2.0 |
| Muscle Gain | Gradual | 0.12% | ~0.25 |
| Muscle Gain | Moderate | 0.25% | ~0.5 |
| Maintenance | Pure | 0% | 0 |
| Maintenance | Slight Deficit | −0.1% | ~−0.2 |
| Maintenance | Slight Surplus | +0.1% | ~+0.2 |

---

## 6. Step 2 — Planning & Phase Management (`/planning`)

### 6.1 Page Layout

```
┌──────────┬──────────────────────────────────┬────────────┐
│ Sidebar  │ Main Content Area                 │ Cronometer │
│ (w-56)   │                                   │ Toolbar    │
│          │ Content switches based on          │ (optional) │
│ Sections:│ activeSection:                     │            │
│ • Calendar│  - calendar: PhaseCalendar        │            │
│ • Phases │  - phases: Phase list + CRUD       │            │
│ • Targets│  - targets: PhaseTargetsEditor     │            │
│ • Events │  - events: Timeline events         │            │
│          │                                   │            │
│ Quick    │                                   │            │
│ Actions  │                                   │            │
└──────────┴──────────────────────────────────┴────────────┘
```

### 6.2 Phase Creation Wizard

**Steps for body composition goals (fat_loss, muscle_gain, recomposition):**

1. **Goal Selection** — Choose from: Fat Loss, Muscle Gain, Recomposition, Performance, Health, Other
2. **Body Composition Targets** — Set targets via multiple input modes:
   - `independent`: Set fat loss amount + muscle gain amount separately
   - `bf`: Target body fat percentage
   - `fm`: Target fat mass (lbs)
   - `ffm`: Target lean mass (lbs)
   - `weight`: Target total weight
   - `fmi`: Target FMI
   - `ffmi`: Target FFMI
3. **Timeline & Rate** — Start/end dates, rate of change (auto-calculates end date from rate)
4. **Review** — Name the phase, confirm all settings

**Steps for non-body-comp goals (performance, health, other):**

1. **Goal Selection + Configuration** — Goal type, custom name, dates, custom metrics, approach preferences
2. **Review** — Name and confirm

**Approach preferences collected for all phases:**
- Performance priority (body comp vs performance)
- Muscle preservation (preserve all vs accept some loss)
- Fat gain tolerance (maximize muscle vs minimize fat)
- Lifestyle commitment (fully / moderately / limited)
- Tracking commitment (committed / casual)

### 6.3 Phase Calendar

A horizontal timeline visualization showing:
- **Rows** grouped by category: Body Composition, Performance, Health, Other
- **Bars** for each phase, positioned by date range
- **Color coding** by goal type (orange = fat loss, blue = muscle gain, green = recomposition, etc.)
- **View levels**: Year, Quarter, Month (drill-down on click)
- **Today marker**: Vertical dashed line
- **Event markers**: Colored dots with tooltips for timeline events
- **Interactions**: Click phase to select, click again to open targets modal

### 6.4 Phase Management

| Action | Behavior |
|--------|----------|
| **Create** | Opens multi-step wizard |
| **Edit** | Opens edit dialog pre-filled with phase data; same fields as creation |
| **Delete** | Removes phase (with confirmation) |
| **Duplicate** | Creates copy with new name, resets status to "planned", clears meal plan |
| **Set Active** | Loads phase's nutritionTargets and mealPlan into current state |
| **Status Change** | Planned → Active → Completed |

### 6.5 Timeline Events

| Event Type | Icon | Purpose |
|-----------|------|---------|
| Lab Test / Assessment | 🔬 | RMR tests, DEXA scans, blood work |
| Competition / Event | 🏆 | Races, matches, meets |
| Travel | ✈️ | Business trips, relocation |
| Vacation / Break | 🏖️ | Time off from strict nutrition |
| Milestone / Goal | 🎯 | Target dates, progress checkpoints |
| Other | 📌 | Anything else |

Events support full CRUD (create, read, update, delete). They appear as vertical markers on the phase calendar.

### 6.6 Check-In / Progress Tracking

**Check-in data:** date, weight, body fat %, notes

**Derived values:**
- `weekNumber` = floor((checkInDate − phase.startDate) / 7 days)
- `fatMass` = weight × (bodyFat / 100)
- `leanMass` = weight − fatMass

**Projected end state:**
- Uses the latest check-in to extrapolate remaining weeks toward targets
- `weeklyWeightChange` = (targetWeight − latestWeight) / remainingWeeks
- `projectedWeight` = latestWeight + weeklyWeightChange × remainingWeeks

---

## 7. Step 3 — Nutrition Target Calculation

This is the core calculation engine, implemented in `PhaseTargetsEditor` and `nutrition-calc.ts`.

### 7.1 Per-Day Configuration

Each day of the week has independent configuration:

| Setting | Description |
|---------|-------------|
| **Workouts** | 0-3 workouts per day, each with type, time slot, duration, intensity, zone |
| **Meal count** | Number of main meals (1-6) |
| **Snack count** | Number of snacks (0-4) |
| **Wake/Sleep time** | Determines meal spacing |
| **Pre/Post workout meal** | Toggle nutrient timing around workouts |
| **Meal contexts** | Per-meal prep method, location, prep time, bulk prep preference |

### 7.2 TDEE Calculation Pipeline

```
RMR (measured or calculated)
  + NEAT (Non-Exercise Activity Thermogenesis) = RMR × (activityMultiplier − 1)
  + TEF (Thermic Effect of Food) = RMR × 0.10
  = Rest Day TDEE

Rest Day TDEE
  + Workout Calories (zone-based or estimated)
  = Workout Day TDEE
```

**Activity multipliers:**

| Activity Level | Multiplier |
|---------------|------------|
| Sedentary (<5k steps/day) | 1.2 |
| Light (5-7.5k steps/day) | 1.375 |
| Active (10-15k steps/day) | 1.55 |
| Very Active (15k+ steps/day) | 1.725 |

### 7.3 Workout Calorie Estimation

**Zone-based (preferred when zone data available):**

Each training zone has a calories-per-minute rate based on body weight. If the client has metabolic testing data, measured zone calories are used. Otherwise, defaults are estimated from body weight:

```
workoutCalories = zoneCaloriesPerMin[zone] × duration
```

**Fallback (no zone data):**
- Maps workout type + intensity to a typical zone
- Uses default zone calorie rates

**Zone mapping from workout type/intensity:**

| Workout Type | Low Intensity | Medium | High |
|-------------|--------------|--------|------|
| Resistance Training | Z2 | Z3 | Z4 |
| Cardio | Z2 | Z3 | Z4 |
| HIIT | Z3 | Z4 | Z5 |
| Sport | Z3 | Z4 | Z5 |
| Yoga/Pilates | Z1 | Z2 | Z2 |

### 7.4 Target Calories

```
dailyCalorieAdjustment = (weeklyChangeKg × 7700) / 7

Fat Loss:    targetCalories = TDEE − dailyCalorieAdjustment
Muscle Gain: targetCalories = TDEE + dailyCalorieAdjustment
Maintain:    targetCalories = TDEE
Recomposition: targetCalories = TDEE (macro distribution differs)
```

The constant **7,700 kcal/kg** represents the approximate caloric equivalent of 1 kg of body weight change.

### 7.5 Macro Distribution

**Base macros (from coefficient sliders):**
```
proteinG = proteinPerKg × basisWeight
fatG     = fatPerKg × basisWeight
carbsG   = (targetCalories − proteinG×4 − fatG×9) / 4
```

`basisWeight` is either total body weight or fat-free mass (based on `macroSettings.basis`).

**Default coefficients by goal:**

| Goal | Protein (g/kg) | Fat (g/kg) |
|------|---------------|-----------|
| Fat Loss | 1.8-3.0 | 0.5-1.1 |
| Muscle Gain | 1.6-2.4 | 0.8-1.2 |
| Maintenance | 1.4-2.2 | 0.7-1.0 |

**Workout day bonus distribution:**
Extra calories from workouts are distributed as:
- 25% protein
- 65% carbs
- 10% fat

**Safety caps:**
- Protein capped at 300g
- Fat capped at 180g
- Protein + fat capped at 75% of total calories (carbs get at least 25%)

### 7.6 Energy Availability

For monitoring athlete health:
```
energyAvailability = (targetCalories − workoutCalories) / ffmKg
```

Thresholds:
- ≥ 45 kcal/kg FFM: Optimal
- 30-45: Moderate (caution)
- < 30: Low (RED-S risk)

### 7.7 Per-Meal Slot Targets (Nutrient Timing)

When pre/post workout meals are enabled:

| Slot | Protein Boost | Carb Boost | Fat Adjustment |
|------|--------------|-----------|----------------|
| Pre-workout | +5% | +25% | −10% |
| Post-workout | +40% | +35% | −15% |
| Regular meal | Baseline | Baseline | Baseline |
| Snack | Baseline | Baseline | Baseline |

Slot targets are normalized so they sum to 100% of daily targets.

**Slot target distribution:**
- Each main meal gets an equal share of remaining calories (after snacks)
- Each snack gets 10% of daily calories
- `mealPct = (1.0 − snackCount × 0.10) / mealCount`

---

## 8. Step 4 — Meal Plan Generation (`/meal-plan`)

### 8.1 Generation Modes

| Mode | Trigger | API | Description |
|------|---------|-----|-------------|
| **Single Meal** | Click "Generate" on a meal slot | `/api/generate-single-meal` | Generates one meal using precision generator (DB-backed + AI concept) |
| **Full Day** | Click "Generate Day" | `/api/generate-day-plan` | Generates all meals for a day using AI |
| **Browse Recipe** | Click "Browse" on a meal slot | `/api/recipes/recommend` | Searches recipe database, scores and scales matches |
| **Adaptive** | Click "Improve" on a meal | `/api/generate-adaptive-plan` | AI suggests improvements to an existing meal |
| **Swap** | Click "Swap" on a meal | `/api/suggest-meal-swap` | AI suggests an alternative meal |

### 8.2 Precision Meal Generator (Single Meal)

The most sophisticated generation path, combining AI creativity with database accuracy:

```
1. adjustForNutrientTiming()     → Adjust targets for pre/post workout
2. getMealConcept()              → AI generates a creative meal concept with food items and roles
3. buildMealFromConcept()        → Search food database, find matches, calculate initial portions
4. calculateTotalMacros()        → Sum ingredient-level macros
5. refineMacros()                → Iterative scaling to hit targets (up to 2 passes)
6. Calorie consistency check     → Ensure P×4 + C×4 + F×9 = calories
7. convertToMeal()               → Format final output; reconcile totals from ingredient sums
```

**AI prompt context includes:**
- Client taste preferences (cuisines, flavors, spice level, seasonings)
- Dietary restrictions and allergies (NEVER violate)
- Foods to avoid and emphasize
- Preferred protein/carb/fat/vegetable sources
- Macro targets with exact gram amounts
- Meal context (prep method, location, time of day)
- Previous meals for variety
- Grocery budget constraints (when set)
- Max ingredient limits
- Available pantry foods
- Bulk prep preferences
- Supplement integration (e.g., protein powder usage)

**Portion limits:**

| Food Role | Min | Max |
|-----------|-----|-----|
| Main protein (meal) | 100g | 350g |
| Main protein (snack) | 30g | 150g |
| Carb source (meal) | 75g (cooked) | 400g |
| Carb source (snack) | 30g | 150g |
| Vegetables (meal) | 50g | 300g |
| Fat source (meal) | 5g | 60g |

### 8.3 Full Day Plan Generation

AI generates all meals for a day in a single call:
- Per-slot calorie and macro targets are included in the prompt
- Post-generation reconciliation: if daily calorie total drifts >3% from target, all meals are proportionally scaled
- Prep method and location context per slot

### 8.4 Recipe Recommendation

- Queries Supabase `ni_recipes` table
- Filters by dietary restrictions, allergies, foods to avoid
- **Scoring:** Weighted macro variance (calories 40%, protein 30%, carbs 15%, fat 15%)
- **Scaling:** `calculateOptimalServings()` uses weighted least-squares to find the serving count that minimizes macro deviation
- **Substitutions:** Checks for allergen-friendly swaps (gluten, dairy, soy, egg)

### 8.5 Meal Copying

- **Copy to similar days:** Copies all meals from the current day to all other days of the same type (workout/rest)
- **Copy individual meal:** Copy a single meal to a specific slot on another day

### 8.6 Per-Meal Generation Options

Each meal slot has optional overrides:
- **Max ingredients:** No limit, 3 (very simple), 4, 5, 6, 8
- **Available foods:** Comma-separated pantry items to constrain ingredient selection

---

## 9. Step 5 — Grocery List & Export

### 9.1 Grocery List Generation

Aggregates all ingredients from the weekly meal plan:

1. Parse ingredient amounts (handles fractions like "1/2", "1 1/4")
2. Normalize units (oz → ounces, tbsp → tablespoon, etc.)
3. Group by ingredient name + unit category
4. Sum quantities across all days
5. Apply serving multiplier (for cooking for a family)
6. Skip "to taste" / "as needed" items
7. Format for display: convert grams → kg/lbs, ml → cups/liters

### 9.2 PDF Export

React-PDF generates a downloadable document with configurable sections:
- Cover page with client name and date range
- Daily meal plans with ingredient lists and macros
- Grocery list (de-duplicated and summed)
- Recipe instructions
- Nutrition targets summary

### 9.3 Kroger Integration

Admin "master account" model for grocery ordering:
1. Admin connects Kroger account (OAuth 2.0 with PKCE)
2. Matched grocery items displayed in a review dialog
3. Quantities calculated with unit conversion logic
4. Manual quantity overrides (+/−) available
5. Items added to admin's Kroger cart via API
6. Admin completes checkout on kroger.com
7. Actual cost entered → Stripe payment link generated for client (with configurable markup)

---

## 10. AI Integration

### 10.1 Provider Configuration

```
Primary:   Anthropic Claude Opus 4.6 (ANTHROPIC_API_KEY)
Fallback:  OpenAI GPT-4o / GPT-4o-mini (OPENAI_API_KEY)
```

### 10.2 AI Client (`aiChatJSON`)

All AI calls that expect structured responses go through `aiChatJSON`:

1. Call AI provider with `jsonMode: true`
2. Extract JSON from markdown fences if present
3. Find first `{...}` object via regex
4. **Repair pass:** Fix trailing commas, strip comments, fix unescaped newlines
5. **Truncation recovery:** Auto-close unbalanced braces/brackets
6. **Retry:** Up to 2 attempts on parse failure
7. Return typed result

### 10.3 Token Limits

| Endpoint | Max Tokens | Purpose |
|----------|-----------|---------|
| Single meal concept | 2,000 | One meal with ingredients and instructions |
| Full day plan | 4,000 | Multiple meals with full detail |
| Meal swap suggestion | 3,000 | Alternative meal with reasoning |
| Recipe recommendation | N/A | Database query, no AI |
| Adaptive improvement | 2,000 | Meal modification suggestions |

---

## 11. Formulas & Calculations Reference

### Body Composition

```
fatMassLbs  = weightLbs × (bodyFat% / 100)
ffmLbs      = weightLbs − fatMassLbs
bmi         = weightKg / (heightM)²
fmi         = fatMassKg / (heightM)²
ffmi        = ffmKg / (heightM)²
```

### Metabolic Rate

```
Mifflin-St Jeor:
  Male:   10 × weightKg + 6.25 × heightCm − 5 × age + 5
  Female: 10 × weightKg + 6.25 × heightCm − 5 × age − 161

Harris-Benedict:
  Male:   88.362 + 13.397 × weightKg + 4.799 × heightCm − 5.677 × age
  Female: 447.593 + 9.247 × weightKg + 3.098 × heightCm − 4.330 × age

Cunningham:
  500 + 22 × leanMassKg
```

### Energy Balance

```
NEAT = RMR × (activityMultiplier − 1)
TEF  = RMR × 0.10
restTDEE = RMR + NEAT + TEF
workoutTDEE = restTDEE + workoutCalories

dailyDeficit = (weeklyChangeKg × 7700) / 7
targetCalories = TDEE ± dailyDeficit
```

### Macros

```
proteinG = proteinPerKg × basisWeightKg
fatG     = fatPerKg × basisWeightKg
carbsG   = max(0, (targetCalories − proteinG×4 − fatG×9) / 4)
```

### Nutrient Timing (Workout Day Extra Calories)

```
extraCalories = workoutDayCalories − restDayCalories
proteinBonus  = (extraCalories × 0.25) / 4  (grams)
fatBonus      = (extraCalories × 0.10) / 9  (grams)
carbBonus     = remainder (fills via carb calculation)
```

### Meal Slot Distribution

```
snackPct = 0.10 per snack (if any snacks)
mealPct  = (1.0 − snackCount × snackPct) / mealCount

slotCalories = dailyCalories × slotPct
slotProtein  = dailyProtein × slotPct
slotCarbs    = dailyCarbs × slotPct
slotFat      = dailyFat × slotPct
```

### Check-In Projections

```
weekNumber = floor((checkInDate − phaseStartDate) / 7)
remainingWeeks = totalWeeks − weekNumber
weeklyChange = (targetWeight − currentWeight) / remainingWeeks
projectedEndWeight = currentWeight + weeklyChange × remainingWeeks
```

---

## 12. External Integrations

### 12.1 Cronometer (Biometric Data)

- OAuth 2.0 connection per client
- Fetches: daily weight, body fat % (from Cronometer biometric entries)
- Does NOT fetch: gender, age, height (these come from profile/intake form)
- Data used to auto-update weight tracking

### 12.2 Kroger (Grocery Ordering)

- OAuth 2.0 with PKCE (admin master account)
- Product search with fuzzy matching, alias resolution, and size-fit scoring
- Cart management (add items with calculated quantities)
- Quantity calculation with unit conversion (weight, volume, count)
- Manual quantity overrides in review step

### 12.3 Stripe (Payments)

- Payment links for grocery orders
- Configurable markup (percentage or flat fee)
- Created via Stripe Checkout Sessions API

---

## 13. State Management

### 13.1 Store Structure (Zustand)

All client data is managed in a single Zustand store with `persist` middleware:

```
NutritionPlanningOSState
├── clients: ClientProfile[]
├── activeClientId: string | null
├── currentStep: number (1-5)
│
├── userProfile: Partial<UserProfile>
├── bodyCompGoals: Partial<BodyCompGoals>
├── dietPreferences: Partial<DietPreferences>
├── weeklySchedule: Partial<WeeklySchedule>
│
├── phases: Phase[]
├── activePhaseId: string | null
├── timelineEvents: TimelineEvent[]
│
├── nutritionTargets: DayNutritionTargets[]
├── mealPlan: WeeklyMealPlan | null
│
└── [UI state: isGenerating, error, etc.]
```

### 13.2 Persistence

- **Local:** Zustand `persist` with `localStorage` (partializes key fields)
- **Remote:** Supabase `clients` table, synced via `saveActiveClientState()` which calls `updateClientInDb()`
- **Debounced saves:** All mutations trigger a debounced save to prevent excessive writes

### 13.3 Client Selection Flow

1. `selectClient(clientId)` loads all client data into top-level state
2. `setActivePhase(phaseId)` loads phase's `nutritionTargets` and `mealPlan` into top-level state
3. All edits operate on top-level state
4. `saveActiveClientState()` writes top-level state back into the client object in the `clients` array
5. Supabase sync happens asynchronously after local save

### 13.4 Phase Data Flow

```
Phase created (wizard) → phases[] updated
Phase selected → nutritionTargets + mealPlan loaded into top-level state
Targets edited (PhaseTargetsEditor) → saved to phase.nutritionTargets + top-level nutritionTargets
Meal generated → saved to phase.mealPlan + top-level mealPlan
Navigate to meal plan → reads from top-level nutritionTargets/mealPlan
```

---

## Appendix: Key File Locations (Original Codebase Reference)

| File | Purpose |
|------|---------|
| `src/types/index.ts` | All TypeScript interfaces and types |
| `src/lib/store.ts` | Zustand store with all state and actions |
| `src/lib/nutrition-calc.ts` | BMR, TDEE, macro calculations, nutrient timing |
| `src/app/setup/page.tsx` | Profile setup page |
| `src/app/planning/page.tsx` | Planning page with phase management |
| `src/components/planning/phase-targets-editor.tsx` | Nutrition target editor component |
| `src/components/planning/phase-calendar.tsx` | Phase calendar visualization |
| `src/app/meal-plan/page.tsx` | Meal plan generation page |
| `src/lib/precision-meal-generator.ts` | Database-backed precision meal generator |
| `src/lib/ai-meal-planning.ts` | AI-only meal planning logic |
| `src/lib/ai-client.ts` | Unified AI provider client |
| `src/app/api/generate-single-meal/route.ts` | Single meal API |
| `src/app/api/generate-day-plan/route.ts` | Full day plan API |
| `src/app/api/recipes/recommend/route.ts` | Recipe recommendation API |
| `src/lib/pdf-generator.tsx` | React-PDF meal plan document |
| `src/lib/kroger-client.ts` | Kroger API client |
| `src/components/intake/intake-form.tsx` | Client intake form |
