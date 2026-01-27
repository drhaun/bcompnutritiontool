import type { ActivityLevel, Macros, PerformancePriority, MusclePreservation, LifestyleCommitment, RMREquation } from '@/types';

// ============ EVIDENCE-BASED MACRO COEFFICIENTS ============

/**
 * Evidence-based protein recommendations (g per kg body weight)
 * 
 * CITATIONS:
 * - Helms et al. (2014): "A systematic review of dietary protein during caloric restriction"
 *   → Recommends 2.3-3.1 g/kg for lean individuals in deficit with resistance training
 * - Morton et al. (2018): "A systematic review of protein supplementation"
 *   → Found 1.6 g/kg sufficient for muscle growth, with diminishing returns above 2.2 g/kg
 * - Phillips & Van Loon (2011): "Dietary protein for athletes"
 *   → Recommends 1.3-1.8 g/kg for endurance athletes, 1.6-2.2 g/kg for strength athletes
 * - Jäger et al. (2017): ISSN Position Stand on protein and exercise
 *   → Recommends 1.4-2.0 g/kg for exercising individuals
 */
export const PROTEIN_COEFFICIENTS = {
  // Fat Loss coefficients (higher protein preserves muscle during deficit)
  fatLoss: {
    conservative: { value: 1.8, label: 'Conservative', description: 'Adequate for most, allows more diet flexibility' },
    moderate: { value: 2.2, label: 'Moderate (Recommended)', description: 'Optimal muscle preservation during deficit' },
    aggressive: { value: 2.6, label: 'High', description: 'Maximum muscle preservation, leaner individuals' },
    extreme: { value: 3.0, label: 'Very High', description: 'Contest prep, very lean (<12% BF)' },
  },
  // Muscle Gain coefficients
  muscleGain: {
    conservative: { value: 1.6, label: 'Conservative', description: 'Sufficient for most muscle growth' },
    moderate: { value: 2.0, label: 'Moderate (Recommended)', description: 'Optimal for hypertrophy' },
    aggressive: { value: 2.4, label: 'High', description: 'Heavy training volume, faster recovery needs' },
  },
  // Maintenance coefficients
  maintain: {
    conservative: { value: 1.4, label: 'Conservative', description: 'Minimum for active individuals' },
    moderate: { value: 1.8, label: 'Moderate (Recommended)', description: 'Optimal for body recomposition' },
    aggressive: { value: 2.2, label: 'High', description: 'Performance-focused maintenance' },
  },
  // Special populations
  elderly: { value: 1.2, label: 'Elderly (>65)', description: 'Higher needs due to anabolic resistance' },
  endurance: { value: 1.6, label: 'Endurance Athlete', description: 'For high-volume cardio training' },
} as const;

/**
 * Evidence-based fat recommendations (g per kg body weight)
 * 
 * CITATIONS:
 * - Helms et al. (2014): Minimum 0.5 g/kg to support hormone function
 * - Trexler et al. (2014): "Metabolic adaptation to weight loss"
 *   → Recommends maintaining 15-25% calories from fat during dieting
 * - Kerksick et al. (2018): ISSN Position Stand on diets and body composition
 *   → Minimum 20% calories from fat recommended for health
 * - Volek & Phinney (2012): For hormone optimization, 0.8-1.2 g/kg typical
 */
export const FAT_COEFFICIENTS = {
  fatLoss: {
    minimum: { value: 0.5, label: 'Minimum', description: 'Bare minimum for hormone health (not recommended long-term)' },
    conservative: { value: 0.7, label: 'Conservative', description: 'Lower fat, more room for carbs/protein' },
    moderate: { value: 0.9, label: 'Moderate (Recommended)', description: 'Balanced for hormone health and satiety' },
    higher: { value: 1.1, label: 'Higher', description: 'Better satiety, good for lower carb tolerance' },
  },
  muscleGain: {
    conservative: { value: 0.8, label: 'Conservative', description: 'More room for carbs' },
    moderate: { value: 1.0, label: 'Moderate (Recommended)', description: 'Balanced for hormone optimization' },
    higher: { value: 1.2, label: 'Higher', description: 'Supports hormone production during surplus' },
  },
  maintain: {
    conservative: { value: 0.8, label: 'Conservative', description: 'Lower fat preference' },
    moderate: { value: 1.0, label: 'Moderate (Recommended)', description: 'Balanced macros' },
    higher: { value: 1.2, label: 'Higher', description: 'Higher fat preference/tolerance' },
  },
} as const;

/**
 * Carbohydrate recommendations based on training and goals
 * 
 * CITATIONS:
 * - Burke et al. (2011): "Carbohydrates for training and competition"
 *   → 3-5 g/kg for low intensity, 5-7 g/kg moderate, 6-10 g/kg high intensity
 * - Kerksick et al. (2018): ISSN Position Stand
 *   → Minimum ~130g/day for brain function
 * - Thomas et al. (2016): "Position of the Academy of Nutrition and Dietetics"
 *   → Athletes should consume adequate carbs to support training
 */
export const CARB_GUIDELINES = {
  minimum: { value: 50, unit: 'g', description: 'Absolute minimum (ketogenic threshold)' },
  brainFunction: { value: 130, unit: 'g', description: 'Minimum for optimal brain function' },
  lowActivity: { value: 3, unit: 'g/kg', description: 'Light training / rest days' },
  moderateActivity: { value: 5, unit: 'g/kg', description: 'Moderate training (45-60 min)' },
  highActivity: { value: 7, unit: 'g/kg', description: 'High volume training (1-2 hrs)' },
  veryHighActivity: { value: 10, unit: 'g/kg', description: 'Extreme training (3+ hrs)' },
} as const;

export type ProteinLevel = 'conservative' | 'moderate' | 'aggressive' | 'extreme';
export type FatLevel = 'minimum' | 'conservative' | 'moderate' | 'higher';

/**
 * Get protein coefficient based on goal and preference level
 */
export function getProteinCoefficient(
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain',
  level: ProteinLevel = 'moderate'
): number {
  const goalMap = {
    lose_fat: PROTEIN_COEFFICIENTS.fatLoss,
    gain_muscle: PROTEIN_COEFFICIENTS.muscleGain,
    maintain: PROTEIN_COEFFICIENTS.maintain,
  };
  
  const coefficients = goalMap[goalType];
  if (level === 'extreme' && goalType !== 'lose_fat') {
    level = 'aggressive';
  }
  
  return (coefficients as Record<string, { value: number }>)[level]?.value ?? coefficients.moderate.value;
}

/**
 * Get fat coefficient based on goal and preference level
 */
export function getFatCoefficient(
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain',
  level: FatLevel = 'moderate'
): number {
  const goalMap = {
    lose_fat: FAT_COEFFICIENTS.fatLoss,
    gain_muscle: FAT_COEFFICIENTS.muscleGain,
    maintain: FAT_COEFFICIENTS.maintain,
  };
  
  const coefficients = goalMap[goalType];
  return (coefficients as Record<string, { value: number }>)[level]?.value ?? coefficients.moderate.value;
}

/**
 * Get coefficient info with description for UI display
 */
export function getProteinCoefficientInfo(
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain'
): Array<{ level: ProteinLevel; value: number; label: string; description: string }> {
  const goalMap = {
    lose_fat: PROTEIN_COEFFICIENTS.fatLoss,
    gain_muscle: PROTEIN_COEFFICIENTS.muscleGain,
    maintain: PROTEIN_COEFFICIENTS.maintain,
  };
  
  const coefficients = goalMap[goalType];
  return Object.entries(coefficients).map(([level, data]) => ({
    level: level as ProteinLevel,
    value: data.value,
    label: data.label,
    description: data.description,
  }));
}

/**
 * Get fat coefficient info with description for UI display
 */
export function getFatCoefficientInfo(
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain'
): Array<{ level: FatLevel; value: number; label: string; description: string }> {
  const goalMap = {
    lose_fat: FAT_COEFFICIENTS.fatLoss,
    gain_muscle: FAT_COEFFICIENTS.muscleGain,
    maintain: FAT_COEFFICIENTS.maintain,
  };
  
  const coefficients = goalMap[goalType];
  return Object.entries(coefficients).map(([level, data]) => ({
    level: level as FatLevel,
    value: data.value,
    label: data.label,
    description: data.description,
  }));
}

// ============ RMR EQUATIONS ============

/**
 * Calculate RMR using Mifflin-St Jeor Equation (1990)
 * Most validated for modern populations. Recommended default.
 * Men: RMR = 10×weight(kg) + 6.25×height(cm) − 5×age + 5
 * Women: RMR = 10×weight(kg) + 6.25×height(cm) − 5×age − 161
 */
export function calculateMifflinRMR(
  gender: 'Male' | 'Female',
  weightKg: number,
  heightCm: number,
  age: number
): number {
  if (gender === 'Male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

/**
 * Calculate RMR using Harris-Benedict Equation (Revised 1984)
 * Classic equation, may overestimate slightly.
 * Men: RMR = 88.362 + 13.397×weight(kg) + 4.799×height(cm) − 5.677×age
 * Women: RMR = 447.593 + 9.247×weight(kg) + 3.098×height(cm) − 4.330×age
 */
export function calculateHarrisBenedictRMR(
  gender: 'Male' | 'Female',
  weightKg: number,
  heightCm: number,
  age: number
): number {
  if (gender === 'Male') {
    return 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
  }
  return 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.330 * age;
}

/**
 * Calculate RMR using Cunningham Equation (1980)
 * Based on lean body mass. Best for athletic populations.
 * RMR = 500 + 22 × Lean Body Mass (kg)
 */
export function calculateCunninghamRMR(leanMassKg: number): number {
  return 500 + 22 * leanMassKg;
}

/**
 * Calculate RMR using specified equation(s)
 */
export function calculateRMR(
  equation: RMREquation,
  gender: 'Male' | 'Female',
  weightKg: number,
  heightCm: number,
  age: number,
  leanMassKg?: number
): number {
  switch (equation) {
    case 'mifflin':
      return calculateMifflinRMR(gender, weightKg, heightCm, age);
    case 'harris':
      return calculateHarrisBenedictRMR(gender, weightKg, heightCm, age);
    case 'cunningham':
      if (!leanMassKg) {
        // Estimate lean mass if not provided (assume 25% body fat)
        leanMassKg = weightKg * 0.75;
      }
      return calculateCunninghamRMR(leanMassKg);
    default:
      return calculateMifflinRMR(gender, weightKg, heightCm, age);
  }
}

/**
 * Calculate average RMR from multiple equations
 */
export function calculateAverageRMR(
  equations: RMREquation[],
  gender: 'Male' | 'Female',
  weightKg: number,
  heightCm: number,
  age: number,
  leanMassKg?: number
): number {
  if (equations.length === 0) return 0;
  
  const values = equations.map(eq => 
    calculateRMR(eq, gender, weightKg, heightCm, age, leanMassKg)
  );
  
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

// Legacy alias for backward compatibility
/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation
 * @deprecated Use calculateMifflinRMR instead
 */
export function calculateBMR(
  gender: 'Male' | 'Female',
  weightKg: number,
  heightCm: number,
  age: number
): number {
  return calculateMifflinRMR(gender, weightKg, heightCm, age);
}

/**
 * Get activity multiplier based on activity level
 * 
 * These are MORE CONSERVATIVE than traditional Harris-Benedict multipliers.
 * Research shows traditional multipliers tend to overestimate NEAT.
 * 
 * Conservative multipliers based on:
 * - Westerterp (2013): "Physical activity and physical activity induced energy expenditure"
 * - Pontzer et al (2016): Constrained total energy expenditure model
 * - Typical step-based energy expenditure estimates
 * 
 * Traditional vs Conservative:
 * - Sedentary: 1.2 → 1.1 (desk job, minimal movement)
 * - Light Active: 1.375 → 1.25 (some walking, light daily activity)
 * - Active: 1.55 → 1.4 (regular movement, active job or lifestyle)
 * - Labor Intensive: 1.725 → 1.55 (physically demanding job)
 */
export function getActivityMultiplier(activityLevel: ActivityLevel): number {
  const multipliers: Record<ActivityLevel, number> = {
    'Sedentary (0-5k steps/day)': 1.1,
    'Light Active (5-10k steps/day)': 1.25,
    'Active (10-15k steps/day)': 1.4,
    'Labor Intensive (>15k steps/day)': 1.55,
  };
  return multipliers[activityLevel] ?? 1.1;
}

/**
 * Estimate workout calories using MET values (validated approach)
 * MET = Metabolic Equivalent of Task (1 MET = ~1 kcal/kg/hr)
 * 
 * MET values from Compendium of Physical Activities (Ainsworth et al.)
 */
export function estimateWorkoutCaloriesMET(
  workoutType: string,
  intensity: 'Low' | 'Medium' | 'High',
  durationMinutes: number,
  bodyWeightKg: number
): number {
  // MET values by workout type and intensity
  const metValues: Record<string, Record<'Low' | 'Medium' | 'High', number>> = {
    'Resistance Training': { Low: 3.5, Medium: 5.0, High: 6.0 },
    'Cardio': { Low: 4.0, Medium: 7.0, High: 10.0 },
    'HIIT': { Low: 6.0, Medium: 8.0, High: 12.0 },
    'Yoga/Mobility': { Low: 2.0, Medium: 3.0, High: 4.0 },
    'Sports': { Low: 4.0, Medium: 6.0, High: 8.0 },
    'Mixed': { Low: 4.0, Medium: 6.0, High: 8.0 },
  };

  const met = metValues[workoutType]?.[intensity] ?? 5.0;
  const durationHours = durationMinutes / 60;
  
  // Calories = MET × weight(kg) × duration(hours)
  return Math.round(met * bodyWeightKg * durationHours);
}

/**
 * Calculate workout calories using zone-based metabolic data
 * Uses actual measured cal/min from metabolic testing
 */
export function calculateZoneBasedCalories(
  zone: 1 | 2 | 3 | 4 | 5,
  durationMinutes: number,
  zoneCaloriesPerMin: {
    zone1: number;
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  }
): number {
  const calPerMin = {
    1: zoneCaloriesPerMin.zone1,
    2: zoneCaloriesPerMin.zone2,
    3: zoneCaloriesPerMin.zone3,
    4: zoneCaloriesPerMin.zone4,
    5: zoneCaloriesPerMin.zone5,
  };
  
  return Math.round(calPerMin[zone] * durationMinutes);
}

/**
 * Get default zone cal/min estimates based on body weight
 * Used as fallback when no measured data is available
 * Based on typical metabolic responses (conservative estimates)
 */
export function getDefaultZoneCalories(bodyWeightKg: number): {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
} {
  // Approximate cal/min per kg of body weight for each zone
  const calPerKgPerMin = {
    zone1: 0.06,  // ~4-5 cal/min for 70kg
    zone2: 0.10,  // ~7-8 cal/min for 70kg
    zone3: 0.14,  // ~10 cal/min for 70kg
    zone4: 0.18,  // ~12-13 cal/min for 70kg
    zone5: 0.22,  // ~15-16 cal/min for 70kg
  };
  
  return {
    zone1: Math.round(calPerKgPerMin.zone1 * bodyWeightKg * 10) / 10,
    zone2: Math.round(calPerKgPerMin.zone2 * bodyWeightKg * 10) / 10,
    zone3: Math.round(calPerKgPerMin.zone3 * bodyWeightKg * 10) / 10,
    zone4: Math.round(calPerKgPerMin.zone4 * bodyWeightKg * 10) / 10,
    zone5: Math.round(calPerKgPerMin.zone5 * bodyWeightKg * 10) / 10,
  };
}

/**
 * Map workout type and intensity to typical training zone
 * Used when zone data is available but user hasn't specified zone for workout
 */
export function getTypicalZoneForWorkout(
  workoutType: string,
  intensity: 'Low' | 'Medium' | 'High'
): 1 | 2 | 3 | 4 | 5 {
  const zoneMap: Record<string, Record<'Low' | 'Medium' | 'High', 1 | 2 | 3 | 4 | 5>> = {
    'Resistance Training': { Low: 2, Medium: 3, High: 3 },
    'Cardio': { Low: 2, Medium: 3, High: 4 },
    'HIIT': { Low: 3, Medium: 4, High: 5 },
    'Yoga/Mobility': { Low: 1, Medium: 2, High: 2 },
    'Sports': { Low: 2, Medium: 3, High: 4 },
    'Mixed': { Low: 2, Medium: 3, High: 4 },
  };
  
  return zoneMap[workoutType]?.[intensity] ?? 3;
}

/**
 * Calculate Total Daily Energy Expenditure
 */
export function calculateTDEE(
  gender: 'Male' | 'Female',
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: ActivityLevel,
  workoutsPerWeek: number = 0,
  workoutCalories: number = 0
): number {
  const bmr = calculateBMR(gender, weightKg, heightCm, age);
  const activityMultiplier = getActivityMultiplier(activityLevel);
  
  let baseTdee = bmr * activityMultiplier;
  
  // Add workout calories if provided
  if (workoutsPerWeek && workoutCalories) {
    const dailyWorkoutCalories = (workoutsPerWeek * workoutCalories) / 7;
    baseTdee += dailyWorkoutCalories;
  }
  
  return Math.round(baseTdee);
}

/**
 * Calculate target calories based on goal
 */
export function calculateTargetCalories(
  tdee: number,
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain',
  weeklyChangeKg: number = 0.5
): number {
  // 1 kg of body weight is approximately 7700 kcal
  const dailyCalorieAdjustment = (weeklyChangeKg * 7700) / 7;
  
  switch (goalType) {
    case 'lose_fat':
      return Math.round(tdee - dailyCalorieAdjustment);
    case 'gain_muscle':
      return Math.round(tdee + dailyCalorieAdjustment);
    case 'maintain':
    default:
      return Math.round(tdee);
  }
}

/**
 * Calculate macronutrient targets based on goal and body weight
 * Uses default moderate coefficients
 */
export function calculateMacros(
  targetCalories: number,
  bodyWeightKg: number,
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain'
): Macros {
  return calculateMacrosAdvanced(targetCalories, bodyWeightKg, goalType, 'moderate', 'moderate');
}

/**
 * Advanced macro calculation with customizable coefficients
 * 
 * @param targetCalories - Target daily calories
 * @param bodyWeightKg - Body weight in kilograms
 * @param goalType - Goal type (lose_fat, gain_muscle, maintain)
 * @param proteinLevel - Protein coefficient level
 * @param fatLevel - Fat coefficient level
 * @param customProteinPerKg - Optional custom protein g/kg (overrides level)
 * @param customFatPerKg - Optional custom fat g/kg (overrides level)
 */
export function calculateMacrosAdvanced(
  targetCalories: number,
  bodyWeightKg: number,
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain',
  proteinLevel: ProteinLevel = 'moderate',
  fatLevel: FatLevel = 'moderate',
  customProteinPerKg?: number,
  customFatPerKg?: number
): Macros {
  // Ensure minimum calories
  const calories = Math.max(1200, targetCalories);
  
  // Get coefficients (use custom if provided, otherwise use level-based)
  const proteinPerKg = customProteinPerKg ?? getProteinCoefficient(goalType, proteinLevel);
  const fatPerKg = customFatPerKg ?? getFatCoefficient(goalType, fatLevel);
  
  let proteinG = proteinPerKg * bodyWeightKg;
  let fatG = fatPerKg * bodyWeightKg;
  
  // Calculate calories from protein and fat
  const proteinCalories = proteinG * 4;
  const fatCalories = fatG * 9;
  
  // Calculate remaining calories for carbs
  let carbCalories = calories - proteinCalories - fatCalories;
  
  // Handle negative carb calories (reduce fat first, then protein if needed)
  if (carbCalories <= 0) {
    // First try reducing fat to minimum (0.5 g/kg)
    const minFat = 0.5 * bodyWeightKg;
    fatG = Math.max(minFat, fatG * 0.7); // Reduce fat by 30% but keep above minimum
    
    const newFatCalories = fatG * 9;
    carbCalories = calories - proteinCalories - newFatCalories;
    
    // If still negative, reduce protein to minimum (1.6 g/kg)
    if (carbCalories <= 0) {
      const minProtein = 1.6 * bodyWeightKg;
      proteinG = Math.max(minProtein, proteinG * 0.8);
      const newProteinCalories = proteinG * 4;
      carbCalories = calories - newProteinCalories - newFatCalories;
    }
  }
  
  // Calculate carbs with minimums
  const carbG = carbCalories > 0 ? carbCalories / 4 : 50;
  const minCarbs = Math.max(50, 130); // Minimum 130g for brain function
  
  return {
    calories: Math.round(calories),
    protein: Math.round(Math.max(proteinG, 50)),
    carbs: Math.round(Math.max(carbG, minCarbs)),
    fat: Math.round(Math.max(fatG, 30)),
  };
}

/**
 * Get detailed macro breakdown with rationale
 */
export function calculateMacrosWithRationale(
  targetCalories: number,
  bodyWeightKg: number,
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain',
  proteinLevel: ProteinLevel = 'moderate',
  fatLevel: FatLevel = 'moderate'
): {
  macros: Macros;
  proteinPerKg: number;
  fatPerKg: number;
  carbsPerKg: number;
  percentages: { protein: number; carbs: number; fat: number };
  rationale: {
    protein: string;
    carbs: string;
    fat: string;
  };
} {
  const proteinPerKg = getProteinCoefficient(goalType, proteinLevel);
  const fatPerKg = getFatCoefficient(goalType, fatLevel);
  
  const macros = calculateMacrosAdvanced(
    targetCalories,
    bodyWeightKg,
    goalType,
    proteinLevel,
    fatLevel
  );
  
  const carbsPerKg = macros.carbs / bodyWeightKg;
  
  // Calculate percentages
  const totalCals = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
  const percentages = {
    protein: Math.round((macros.protein * 4 / totalCals) * 100),
    carbs: Math.round((macros.carbs * 4 / totalCals) * 100),
    fat: Math.round((macros.fat * 9 / totalCals) * 100),
  };
  
  // Generate rationale based on settings
  const goalDescriptions = {
    lose_fat: 'fat loss',
    gain_muscle: 'muscle gain',
    maintain: 'maintenance',
  };
  
  const proteinRationale = getProteinRationale(goalType, proteinLevel, proteinPerKg);
  const fatRationale = getFatRationale(goalType, fatLevel, fatPerKg);
  const carbsRationale = getCarbsRationale(carbsPerKg, goalType, percentages.carbs);
  
  return {
    macros,
    proteinPerKg,
    fatPerKg,
    carbsPerKg,
    percentages,
    rationale: {
      protein: proteinRationale,
      carbs: carbsRationale,
      fat: fatRationale,
    },
  };
}

function getProteinRationale(
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain',
  level: ProteinLevel,
  perKg: number
): string {
  const perLb = (perKg / 2.20462).toFixed(2);
  
  if (goalType === 'lose_fat') {
    if (level === 'aggressive' || level === 'extreme') {
      return `${perKg} g/kg (${perLb} g/lb) - Higher protein for maximum muscle preservation during caloric deficit. Based on Helms et al. (2014) recommendations for lean individuals.`;
    }
    return `${perKg} g/kg (${perLb} g/lb) - Elevated protein to preserve lean mass during deficit. Research shows 1.8-2.4 g/kg optimal for most during fat loss (Morton et al., 2018).`;
  }
  
  if (goalType === 'gain_muscle') {
    return `${perKg} g/kg (${perLb} g/lb) - Sufficient for muscle protein synthesis. Meta-analyses show diminishing returns above 1.6-2.2 g/kg (Morton et al., 2018).`;
  }
  
  return `${perKg} g/kg (${perLb} g/lb) - Adequate for maintaining muscle mass and supporting recovery. ISSN recommends 1.4-2.0 g/kg for active individuals (Jäger et al., 2017).`;
}

function getFatRationale(
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain',
  level: FatLevel,
  perKg: number
): string {
  const asPercent = Math.round((perKg * 9 / ((perKg * 9) + 8)) * 100); // Rough estimate
  
  if (level === 'minimum') {
    return `${perKg} g/kg - Minimum threshold for hormone production. Not recommended long-term. Consider increasing if experiencing fatigue or hormonal symptoms.`;
  }
  
  if (goalType === 'lose_fat') {
    return `${perKg} g/kg - Supports hormone health while allowing room for adequate protein and carbs. Minimum 0.5 g/kg recommended (Helms et al., 2014).`;
  }
  
  return `${perKg} g/kg - Optimal for hormone production, cell membrane health, and fat-soluble vitamin absorption. ISSN recommends 20-35% of calories from fat.`;
}

function getCarbsRationale(
  perKg: number,
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain',
  percentOfCalories: number
): string {
  if (perKg < 2) {
    return `${perKg.toFixed(1)} g/kg (${percentOfCalories}% of calories) - Lower carb approach. Ensure adequate intake on training days for performance.`;
  }
  
  if (goalType === 'lose_fat') {
    return `${perKg.toFixed(1)} g/kg (${percentOfCalories}% of calories) - Moderate carbs to fuel workouts while maintaining deficit. Prioritize around training for performance.`;
  }
  
  if (goalType === 'gain_muscle') {
    return `${perKg.toFixed(1)} g/kg (${percentOfCalories}% of calories) - Adequate carbs to fuel muscle-building workouts and support recovery. Burke et al. (2011) recommends 5-7 g/kg for moderate training.`;
  }
  
  return `${perKg.toFixed(1)} g/kg (${percentOfCalories}% of calories) - Balanced carb intake to support activity levels and brain function (minimum 130g/day recommended).`;
}

/**
 * Convert height from feet/inches to centimeters
 */
export function heightToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

/**
 * Convert weight from pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

/**
 * Convert weight from kilograms to pounds
 */
export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

/**
 * Calculate Body Mass Index
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * Calculate Fat Mass Index
 */
export function calculateFMI(weightKg: number, heightCm: number, bodyFatPct: number): number {
  const heightM = heightCm / 100;
  const fatMassKg = weightKg * (bodyFatPct / 100);
  return fatMassKg / (heightM * heightM);
}

/**
 * Calculate Fat-Free Mass Index
 */
export function calculateFFMI(weightKg: number, heightCm: number, bodyFatPct: number): number {
  const heightM = heightCm / 100;
  const ffmKg = weightKg * (1 - bodyFatPct / 100);
  return ffmKg / (heightM * heightM);
}

/**
 * Get FMI category based on gender
 */
export function getFMICategory(fmi: number, gender: 'Male' | 'Female'): string {
  if (gender === 'Male') {
    if (fmi < 3) return 'Extremely Lean';
    if (fmi < 4) return 'Lean';
    if (fmi < 6) return 'Considered Healthy';
    if (fmi < 7) return 'Slightly Overfat';
    if (fmi < 9) return 'Overfat';
    return 'Significantly Overfat';
  } else {
    if (fmi < 5) return 'Extremely Lean';
    if (fmi < 6) return 'Lean';
    if (fmi < 9) return 'Considered Healthy';
    if (fmi < 10) return 'Slightly Overfat';
    if (fmi < 13) return 'Overfat';
    return 'Significantly Overfat';
  }
}

/**
 * Get FFMI category based on gender
 */
export function getFFMICategory(ffmi: number, gender: 'Male' | 'Female'): string {
  if (gender === 'Male') {
    if (ffmi < 17) return 'Undermuscled';
    if (ffmi < 18) return 'Moderately Undermuscled';
    if (ffmi < 20) return 'Considered Healthy';
    if (ffmi < 22) return 'Muscular';
    return 'High';
  } else {
    if (ffmi < 14) return 'Undermuscled';
    if (ffmi < 15) return 'Moderately Undermuscled';
    if (ffmi < 17) return 'Considered Healthy';
    if (ffmi < 18) return 'Muscular';
    return 'High';
  }
}

/**
 * Get target FMI ranges for a given category and gender
 */
export function getFMITargetRange(category: string, gender: 'Male' | 'Female'): { min: number; max: number } {
  const ranges: Record<string, Record<'Male' | 'Female', { min: number; max: number }>> = {
    'Extremely Lean': { Male: { min: 2, max: 3 }, Female: { min: 4, max: 5 } },
    'Lean': { Male: { min: 3, max: 4 }, Female: { min: 5, max: 6 } },
    'Considered Healthy': { Male: { min: 4, max: 6 }, Female: { min: 6, max: 9 } },
    'Slightly Overfat': { Male: { min: 6, max: 7 }, Female: { min: 9, max: 10 } },
    'Overfat': { Male: { min: 7, max: 9 }, Female: { min: 10, max: 13 } },
  };
  return ranges[category]?.[gender] || { min: 4, max: 6 };
}

/**
 * Get target FFMI ranges for a given category and gender
 */
export function getFFMITargetRange(category: string, gender: 'Male' | 'Female'): { min: number; max: number } {
  const ranges: Record<string, Record<'Male' | 'Female', { min: number; max: number }>> = {
    'Undermuscled': { Male: { min: 15, max: 17 }, Female: { min: 12, max: 14 } },
    'Moderately Undermuscled': { Male: { min: 17, max: 18 }, Female: { min: 14, max: 15 } },
    'Considered Healthy': { Male: { min: 18, max: 20 }, Female: { min: 15, max: 17 } },
    'Muscular': { Male: { min: 20, max: 22 }, Female: { min: 17, max: 18 } },
    'High': { Male: { min: 22, max: 25 }, Female: { min: 18, max: 21 } },
  };
  return ranges[category]?.[gender] || { min: 18, max: 20 };
}

/**
 * Calculate body composition details
 */
export function calculateBodyComposition(
  weightKg: number,
  heightCm: number,
  bodyFatPct: number,
  gender: 'Male' | 'Female'
): {
  fatMassKg: number;
  fatMassLbs: number;
  ffmKg: number;
  ffmLbs: number;
  fmi: number;
  ffmi: number;
  fmiCategory: string;
  ffmiCategory: string;
  bmi: number;
} {
  const fatMassKg = weightKg * (bodyFatPct / 100);
  const ffmKg = weightKg - fatMassKg;
  const fmi = calculateFMI(weightKg, heightCm, bodyFatPct);
  const ffmi = calculateFFMI(weightKg, heightCm, bodyFatPct);
  const bmi = calculateBMI(weightKg, heightCm);

  return {
    fatMassKg,
    fatMassLbs: kgToLbs(fatMassKg),
    ffmKg,
    ffmLbs: kgToLbs(ffmKg),
    fmi,
    ffmi,
    fmiCategory: getFMICategory(fmi, gender),
    ffmiCategory: getFFMICategory(ffmi, gender),
    bmi,
  };
}

/**
 * Get recommended goal based on body composition
 */
export function getRecommendedGoal(
  fmiCategory: string,
  ffmiCategory: string
): { recommendation: 'lose_fat' | 'gain_muscle' | 'maintain'; reason: string } {
  // Prioritize fat loss if overfat
  if (['Overfat', 'Significantly Overfat', 'Slightly Overfat'].includes(fmiCategory)) {
    return {
      recommendation: 'lose_fat',
      reason: `Your FMI indicates ${fmiCategory.toLowerCase()}. Reducing body fat will improve health markers and body composition.`,
    };
  }

  // Prioritize muscle gain if undermuscled
  if (['Undermuscled', 'Moderately Undermuscled'].includes(ffmiCategory)) {
    return {
      recommendation: 'gain_muscle',
      reason: `Your FFMI indicates ${ffmiCategory.toLowerCase()}. Building lean mass will improve metabolism and strength.`,
    };
  }

  // If lean and healthy muscle, can go either way or maintain
  if (['Extremely Lean', 'Lean'].includes(fmiCategory)) {
    return {
      recommendation: 'gain_muscle',
      reason: 'You are already lean. Focus on building muscle for better body composition.',
    };
  }

  return {
    recommendation: 'maintain',
    reason: 'Your body composition is in a healthy range. You can maintain or fine-tune as desired.',
  };
}

/**
 * Get recommended weekly rate based on goal and body composition
 */
export function getRecommendedRate(
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain',
  fmiCategory: string,
  ffmiCategory: string
): { weeklyPct: number; weeklyKgPerKg: number; description: string } {
  if (goalType === 'maintain') {
    return { weeklyPct: 0, weeklyKgPerKg: 0, description: 'Maintenance - no weight change' };
  }

  if (goalType === 'lose_fat') {
    // More aggressive for higher body fat, conservative for lean
    if (['Significantly Overfat', 'Overfat'].includes(fmiCategory)) {
      return { weeklyPct: 1.0, weeklyKgPerKg: 0.01, description: '1% of body weight/week (aggressive)' };
    }
    if (fmiCategory === 'Slightly Overfat') {
      return { weeklyPct: 0.75, weeklyKgPerKg: 0.0075, description: '0.75% of body weight/week (moderate)' };
    }
    // Already lean - be conservative
    return { weeklyPct: 0.5, weeklyKgPerKg: 0.005, description: '0.5% of body weight/week (conservative)' };
  }

  // Muscle gain
  if (['Undermuscled', 'Moderately Undermuscled'].includes(ffmiCategory)) {
    return { weeklyPct: 0.5, weeklyKgPerKg: 0.005, description: '0.5% of body weight/week (beginner gains)' };
  }
  if (ffmiCategory === 'Considered Healthy') {
    return { weeklyPct: 0.35, weeklyKgPerKg: 0.0035, description: '0.35% of body weight/week (intermediate)' };
  }
  // Already muscular - slower gains expected
  return { weeklyPct: 0.25, weeklyKgPerKg: 0.0025, description: '0.25% of body weight/week (advanced)' };
}

/**
 * Calculate target weight from desired body fat percentage
 */
export function calculateTargetWeightFromBF(
  currentWeightKg: number,
  currentBfPct: number,
  targetBfPct: number,
  preserveFFM: boolean = true
): number {
  const currentFfmKg = currentWeightKg * (1 - currentBfPct / 100);

  if (preserveFFM) {
    // Target weight = FFM / (1 - target BF%)
    return currentFfmKg / (1 - targetBfPct / 100);
  }

  // If not preserving FFM, simple linear interpolation
  const currentFatKg = currentWeightKg * (currentBfPct / 100);
  const targetFatKg = currentFatKg * (targetBfPct / currentBfPct);
  return currentFfmKg + targetFatKg;
}

/**
 * Calculate target body fat from desired FMI
 */
export function calculateTargetBFFromFMI(
  weightKg: number,
  heightCm: number,
  targetFMI: number
): number {
  const heightM = heightCm / 100;
  const targetFatMassKg = targetFMI * (heightM * heightM);
  return (targetFatMassKg / weightKg) * 100;
}

/**
 * Calculate target weight from desired FFMI (gaining muscle)
 */
export function calculateTargetWeightFromFFMI(
  heightCm: number,
  currentBfPct: number,
  targetFFMI: number
): number {
  const heightM = heightCm / 100;
  const targetFfmKg = targetFFMI * (heightM * heightM);
  // Target weight = FFM / (1 - BF%)
  return targetFfmKg / (1 - currentBfPct / 100);
}

/**
 * Estimate timeline to reach goal
 */
export function estimateTimeline(
  currentWeightKg: number,
  targetWeightKg: number,
  weeklyRatePct: number,
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain'
): { weeks: number; months: number; feasible: boolean; message: string } {
  if (goalType === 'maintain' || weeklyRatePct === 0) {
    return { weeks: 0, months: 0, feasible: true, message: 'No timeline needed for maintenance' };
  }

  const weightChange = Math.abs(targetWeightKg - currentWeightKg);
  const weeklyChangeKg = currentWeightKg * (weeklyRatePct / 100);
  const weeks = Math.ceil(weightChange / weeklyChangeKg);
  const months = weeks / 4.33;

  // Check feasibility
  if (weeks > 104) {
    return {
      weeks,
      months,
      feasible: false,
      message: 'This goal may take over 2 years. Consider adjusting your target.',
    };
  }

  if (weeks < 4) {
    return {
      weeks: Math.max(4, weeks),
      months: 1,
      feasible: true,
      message: 'Minimum 4 weeks recommended for sustainable results.',
    };
  }

  return {
    weeks,
    months,
    feasible: true,
    message: `Estimated ${weeks} weeks (~${months.toFixed(1)} months) at the recommended rate.`,
  };
}

/**
 * Adjust rate based on user preferences
 */
export function adjustRateForPreferences(
  baseRate: { weeklyPct: number; weeklyKgPerKg: number; description: string },
  performancePriority: PerformancePriority,
  musclePreservation: MusclePreservation,
  lifestyleCommitment: LifestyleCommitment,
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain'
): { weeklyPct: number; weeklyKgPerKg: number; description: string; adjustmentReason: string } {
  let adjustedPct = baseRate.weeklyPct;
  const reasons: string[] = [];

  if (goalType === 'maintain') {
    return { ...baseRate, adjustmentReason: '' };
  }

  // Performance priority reduces aggressiveness
  if (performancePriority === 'performance_priority') {
    adjustedPct *= 0.75;
    reasons.push('prioritizing performance');
  }

  // Muscle preservation reduces deficit aggressiveness for fat loss
  if (goalType === 'lose_fat' && musclePreservation === 'preserve_all') {
    adjustedPct *= 0.85;
    reasons.push('maximizing muscle preservation');
  }

  // Limited commitment means more conservative approach
  if (lifestyleCommitment === 'limited_commitment') {
    adjustedPct *= 0.7;
    reasons.push('limited lifestyle commitment');
  } else if (lifestyleCommitment === 'moderately_committed') {
    adjustedPct *= 0.85;
    reasons.push('moderate lifestyle commitment');
  }

  const adjustmentReason = reasons.length > 0 
    ? `Rate adjusted for: ${reasons.join(', ')}`
    : '';

  return {
    weeklyPct: adjustedPct,
    weeklyKgPerKg: adjustedPct / 100,
    description: `${adjustedPct.toFixed(1)}% of body weight/week`,
    adjustmentReason,
  };
}

/**
 * Calculate adjusted protein target based on preferences
 */
export function calculateAdjustedProtein(
  baseProteinG: number,
  bodyWeightKg: number,
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain',
  musclePreservation: MusclePreservation,
  performancePriority: PerformancePriority
): { proteinG: number; proteinPerKg: number; reason: string } {
  let proteinPerKg = baseProteinG / bodyWeightKg;
  let reason = 'Standard protein target';

  // Increase protein for muscle preservation during fat loss
  if (goalType === 'lose_fat' && musclePreservation === 'preserve_all') {
    proteinPerKg = Math.max(proteinPerKg, 2.4); // 2.4g/kg = ~1.1g/lb
    reason = 'Higher protein for muscle preservation';
  }

  // Increase protein for performance priority (supports recovery)
  if (performancePriority === 'performance_priority') {
    proteinPerKg = Math.max(proteinPerKg, 2.2);
    reason = 'Higher protein for performance & recovery';
  }

  // Slightly lower for those OK with some muscle loss (still adequate)
  if (goalType === 'lose_fat' && musclePreservation === 'accept_some_loss') {
    proteinPerKg = Math.min(proteinPerKg, 2.0);
    reason = 'Adequate protein with faster fat loss';
  }

  return {
    proteinG: Math.round(proteinPerKg * bodyWeightKg),
    proteinPerKg,
    reason,
  };
}

/**
 * Get commitment impact description
 */
export function getCommitmentImpact(
  lifestyleCommitment: LifestyleCommitment
): { expectedProgress: string; recommendation: string } {
  switch (lifestyleCommitment) {
    case 'fully_committed':
      return {
        expectedProgress: '100% of projected progress',
        recommendation: 'You\'re set up for optimal results. Stay consistent!',
      };
    case 'moderately_committed':
      return {
        expectedProgress: '60-80% of projected progress',
        recommendation: 'Focus on hitting protein targets and getting quality sleep when possible.',
      };
    case 'limited_commitment':
      return {
        expectedProgress: '30-50% of projected progress',
        recommendation: 'Progress will be slower. Consider focusing on maintenance or smaller goals.',
      };
    default:
      return {
        expectedProgress: 'Variable',
        recommendation: '',
      };
  }
}

/**
 * Calculate predicted weeks to reach goal
 */
export function calculatePredictedWeeks(
  currentWeightKg: number,
  targetWeightKg: number,
  currentBfPct: number,
  targetBfPct: number,
  weeklyWeightPct: number,
  weeklyFatPct: number,
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain'
): number {
  const currentBf = currentBfPct / 100;
  const targetBf = targetBfPct / 100;
  
  const currentFatMass = currentWeightKg * currentBf;
  const currentFfm = currentWeightKg * (1 - currentBf);
  
  const targetFfm = targetWeightKg * (1 - targetBf);
  
  if (goalType === 'lose_fat') {
    try {
      const predictedWeeks = Math.log(currentWeightKg / targetWeightKg) / -Math.log(1 - weeklyWeightPct);
      return Math.max(1, Math.round(predictedWeeks));
    } catch {
      if (weeklyWeightPct > 0) {
        const weightToLose = currentWeightKg - targetWeightKg;
        const weeklyLossKg = currentWeightKg * weeklyWeightPct;
        return Math.max(1, Math.round(weightToLose / weeklyLossKg));
      }
      return 52;
    }
  } else if (goalType === 'gain_muscle') {
    try {
      const ffmToGain = targetFfm - currentFfm;
      const weeklyFfmGain = currentWeightKg * weeklyWeightPct * (1 - weeklyFatPct);
      return weeklyFfmGain > 0 ? Math.max(1, Math.round(ffmToGain / weeklyFfmGain)) : 52;
    } catch {
      return 52;
    }
  }
  
  return 0; // maintain
}

/**
 * Validate macro accuracy within tolerance
 */
export function validateMacroAccuracy(
  actual: Macros,
  target: Macros,
  tolerance: number = 0.05
): { isValid: boolean; deviations: Record<string, number> } {
  const deviations: Record<string, number> = {};
  let isValid = true;
  
  for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) {
    const targetVal = target[key];
    const actualVal = actual[key];
    
    if (targetVal > 0) {
      const deviation = Math.abs(actualVal - targetVal) / targetVal;
      deviations[key] = deviation * 100;
      
      if (deviation > tolerance) {
        isValid = false;
      }
    }
  }
  
  return { isValid, deviations };
}

/**
 * Distribute daily macros across meals (simple even distribution)
 */
export function distributeMacrosAcrossMeals(
  dailyTargets: Macros,
  mealCount: number,
  snackCount: number
): { mealTargets: Macros[]; snackTargets: Macros[] } {
  // Meals get 75% of daily calories/macros
  // Snacks get 25% of daily calories/macros
  const mealPortion = 0.75 / mealCount;
  const snackPortion = snackCount > 0 ? 0.25 / snackCount : 0;
  
  const mealTargets: Macros[] = [];
  const snackTargets: Macros[] = [];
  
  for (let i = 0; i < mealCount; i++) {
    mealTargets.push({
      calories: Math.round(dailyTargets.calories * mealPortion),
      protein: Math.round(dailyTargets.protein * mealPortion),
      carbs: Math.round(dailyTargets.carbs * mealPortion),
      fat: Math.round(dailyTargets.fat * mealPortion),
    });
  }
  
  for (let i = 0; i < snackCount; i++) {
    snackTargets.push({
      calories: Math.round(dailyTargets.calories * snackPortion),
      protein: Math.round(dailyTargets.protein * snackPortion),
      carbs: Math.round(dailyTargets.carbs * snackPortion),
      fat: Math.round(dailyTargets.fat * snackPortion),
    });
  }
  
  return { mealTargets, snackTargets };
}

// ============ NUTRIENT TIMING ============

/**
 * Evidence-based nutrient timing guidelines
 * 
 * CITATIONS:
 * - Kerksick et al. (2017): ISSN Position Stand on Nutrient Timing
 *   → Pre-workout: 1-4 hours before, 0.4-0.5 g/kg protein, 1-4 g/kg carbs
 *   → Post-workout: Within 2 hours, 0.4-0.5 g/kg protein, 1.0-1.5 g/kg carbs
 * - Aragon & Schoenfeld (2013): "Nutrient timing revisited"
 *   → Total daily intake more important than timing for most
 *   → Timing matters more for multiple daily sessions or fasted training
 * - Schoenfeld et al. (2017): Pre-exercise protein intake equally important as post
 */
export const NUTRIENT_TIMING = {
  preWorkout: {
    timing: '1-3 hours before',
    protein: { min: 0.3, max: 0.5, unit: 'g/kg', description: '25-40g for most people' },
    carbs: { min: 0.5, max: 1.5, unit: 'g/kg', description: 'Higher for longer/intense sessions' },
    fat: { max: 0.3, unit: 'g/kg', description: 'Low fat for faster digestion' },
    guidelines: [
      'Easily digestible protein (whey, eggs, chicken)',
      'Low-glycemic carbs for sustained energy',
      'Avoid high fat/fiber to prevent GI distress',
    ],
  },
  postWorkout: {
    timing: 'Within 2 hours after',
    protein: { min: 0.3, max: 0.5, unit: 'g/kg', description: '25-50g for muscle protein synthesis' },
    carbs: { min: 0.8, max: 1.5, unit: 'g/kg', description: 'Replenish glycogen stores' },
    fat: { min: 0.2, max: 0.4, unit: 'g/kg', description: 'Does not impair protein synthesis' },
    guidelines: [
      'Fast-digesting protein (whey) optimal but not required',
      'Higher glycemic carbs acceptable for glycogen replenishment',
      'Complete meal within 2 hours supports recovery',
    ],
  },
  intraWorkout: {
    timing: 'During workout (>90 min)',
    carbs: { min: 30, max: 60, unit: 'g/hour', description: 'For sessions >90 minutes' },
    guidelines: [
      'Only necessary for endurance sessions >90 minutes',
      'Sports drinks or easily digestible carbs',
      'Not needed for typical resistance training',
    ],
  },
} as const;

export interface MealSlot {
  id: string;
  time: string;
  type: 'meal' | 'snack';
  label: string;
  workoutRelation: 'pre-workout' | 'post-workout' | 'none';
  hoursFromWorkout?: number;
}

export interface NutrientTimingMeal extends MealSlot {
  targets: Macros;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Calculate time difference in hours between two time strings (HH:MM format)
 */
function getHoursDifference(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  const mins1 = h1 * 60 + m1;
  const mins2 = h2 * 60 + m2;
  return (mins2 - mins1) / 60;
}

/**
 * Distribute macros with intelligent nutrient timing based on workout schedule
 * 
 * @param dailyTargets - Total daily macro targets
 * @param mealSlots - Array of meal/snack slots with times
 * @param workoutTime - Time of workout (HH:MM format), null if rest day
 * @param workoutType - Type of workout (affects carb timing)
 * @param bodyWeightKg - Body weight for calculating per-kg targets
 * @param goalType - Goal affects macro prioritization
 */
export function distributeWithNutrientTiming(
  dailyTargets: Macros,
  mealSlots: MealSlot[],
  workoutTime: string | null,
  workoutType: string | null,
  bodyWeightKg: number,
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain'
): NutrientTimingMeal[] {
  // If no workout, use simple distribution with protein spread evenly
  if (!workoutTime) {
    return distributeRestDay(dailyTargets, mealSlots);
  }
  
  // Sort meals by time
  const sortedSlots = [...mealSlots].sort((a, b) => a.time.localeCompare(b.time));
  
  // Find pre-workout and post-workout meals
  let preWorkoutMeal: MealSlot | null = null;
  let postWorkoutMeal: MealSlot | null = null;
  let preWorkoutIndex = -1;
  let postWorkoutIndex = -1;
  
  sortedSlots.forEach((slot, index) => {
    const hoursDiff = getHoursDifference(slot.time, workoutTime);
    
    // Pre-workout: meal 1-4 hours before workout
    if (hoursDiff >= -4 && hoursDiff <= -0.5) {
      if (!preWorkoutMeal || Math.abs(hoursDiff + 2) < Math.abs(getHoursDifference(preWorkoutMeal.time, workoutTime) + 2)) {
        preWorkoutMeal = slot;
        preWorkoutIndex = index;
      }
    }
    
    // Post-workout: first meal/snack within 2 hours after workout
    if (hoursDiff >= 0.5 && hoursDiff <= 3) {
      if (!postWorkoutMeal) {
        postWorkoutMeal = slot;
        postWorkoutIndex = index;
      }
    }
  });
  
  // Calculate workout-optimized distribution
  const result: NutrientTimingMeal[] = [];
  let remainingMacros = { ...dailyTargets };
  
  // Determine carb priority based on workout type
  const isHighCarbWorkout = ['Resistance Training', 'HIIT', 'Sports', 'Cardio'].includes(workoutType || '');
  const carbPriorityMultiplier = isHighCarbWorkout ? 1.3 : 1.0;
  
  // First pass: allocate to pre and post workout meals
  sortedSlots.forEach((slot, index) => {
    let targets: Macros;
    let rationale: string;
    let priority: 'high' | 'medium' | 'low';
    let workoutRelation: 'pre-workout' | 'post-workout' | 'none' = 'none';
    
    if (index === preWorkoutIndex) {
      // Pre-workout meal: moderate protein, higher carbs, low fat
      workoutRelation = 'pre-workout';
      priority = 'high';
      
      const preProtein = Math.round(Math.min(0.4 * bodyWeightKg, dailyTargets.protein * 0.25));
      const preCarbs = Math.round(Math.min(1.0 * bodyWeightKg * carbPriorityMultiplier, dailyTargets.carbs * 0.3));
      const preFat = Math.round(Math.min(0.2 * bodyWeightKg, dailyTargets.fat * 0.15));
      const preCalories = preProtein * 4 + preCarbs * 4 + preFat * 9;
      
      targets = {
        calories: preCalories,
        protein: preProtein,
        carbs: preCarbs,
        fat: preFat,
      };
      
      rationale = `Pre-workout (${Math.abs(getHoursDifference(slot.time, workoutTime)).toFixed(1)}h before): Prioritized carbs for energy, moderate protein, low fat for digestion.`;
      
    } else if (index === postWorkoutIndex) {
      // Post-workout meal: high protein, high carbs, moderate fat
      workoutRelation = 'post-workout';
      priority = 'high';
      
      const postProtein = Math.round(Math.min(0.5 * bodyWeightKg, dailyTargets.protein * 0.3));
      const postCarbs = Math.round(Math.min(1.2 * bodyWeightKg * carbPriorityMultiplier, dailyTargets.carbs * 0.35));
      const postFat = Math.round(Math.min(0.3 * bodyWeightKg, dailyTargets.fat * 0.2));
      const postCalories = postProtein * 4 + postCarbs * 4 + postFat * 9;
      
      targets = {
        calories: postCalories,
        protein: postProtein,
        carbs: postCarbs,
        fat: postFat,
      };
      
      rationale = `Post-workout (${getHoursDifference(slot.time, workoutTime).toFixed(1)}h after): High protein for MPS, carbs for glycogen replenishment.`;
      
    } else {
      // Other meals: will be calculated after workout meals
      targets = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      rationale = '';
      priority = slot.type === 'meal' ? 'medium' : 'low';
    }
    
    result.push({
      ...slot,
      workoutRelation,
      targets,
      rationale,
      priority,
    });
    
    // Subtract from remaining
    if (targets.calories > 0) {
      remainingMacros.calories -= targets.calories;
      remainingMacros.protein -= targets.protein;
      remainingMacros.carbs -= targets.carbs;
      remainingMacros.fat -= targets.fat;
    }
  });
  
  // Second pass: distribute remaining macros to non-workout meals
  const nonWorkoutMeals = result.filter(m => m.targets.calories === 0);
  const meals = nonWorkoutMeals.filter(m => m.type === 'meal');
  const snacks = nonWorkoutMeals.filter(m => m.type === 'snack');
  
  // Meals get 70% of remaining, snacks get 30%
  const mealPortion = meals.length > 0 ? (0.7 / meals.length) : 0;
  const snackPortion = snacks.length > 0 ? (0.3 / snacks.length) : 0;
  
  result.forEach(meal => {
    if (meal.targets.calories === 0) {
      const portion = meal.type === 'meal' ? mealPortion : snackPortion;
      
      meal.targets = {
        calories: Math.round(remainingMacros.calories * portion),
        protein: Math.round(remainingMacros.protein * portion),
        carbs: Math.round(remainingMacros.carbs * portion),
        fat: Math.round(remainingMacros.fat * portion),
      };
      
      meal.rationale = meal.type === 'meal' 
        ? 'Standard meal: balanced macros for sustained energy and satiety.'
        : 'Snack: supports daily protein distribution and energy between meals.';
    }
  });
  
  // Verify totals and adjust if needed
  const totalCalories = result.reduce((sum, m) => sum + m.targets.calories, 0);
  const calorieDiff = dailyTargets.calories - totalCalories;
  
  if (Math.abs(calorieDiff) > 50 && result.length > 0) {
    // Distribute difference to largest meal
    const largestMeal = result.reduce((max, m) => 
      m.targets.calories > max.targets.calories ? m : max
    );
    largestMeal.targets.calories += calorieDiff;
    // Adjust carbs to account for calorie difference
    largestMeal.targets.carbs += Math.round(calorieDiff / 4);
  }
  
  return result;
}

/**
 * Simple distribution for rest days - focus on even protein distribution
 */
function distributeRestDay(
  dailyTargets: Macros,
  mealSlots: MealSlot[]
): NutrientTimingMeal[] {
  const meals = mealSlots.filter(m => m.type === 'meal');
  const snacks = mealSlots.filter(m => m.type === 'snack');
  
  // Even protein distribution is key for MPS on rest days
  // Schoenfeld et al. recommend 0.4-0.55 g/kg per meal, 3-4 meals
  const proteinPerMeal = Math.round(dailyTargets.protein * 0.75 / meals.length);
  const proteinPerSnack = snacks.length > 0 ? Math.round(dailyTargets.protein * 0.25 / snacks.length) : 0;
  
  const mealPortion = 0.75 / meals.length;
  const snackPortion = snacks.length > 0 ? 0.25 / snacks.length : 0;
  
  return mealSlots.map(slot => {
    const isMeal = slot.type === 'meal';
    const portion = isMeal ? mealPortion : snackPortion;
    
    return {
      ...slot,
      workoutRelation: 'none' as const,
      targets: {
        calories: Math.round(dailyTargets.calories * portion),
        protein: isMeal ? proteinPerMeal : proteinPerSnack,
        carbs: Math.round(dailyTargets.carbs * portion),
        fat: Math.round(dailyTargets.fat * portion),
      },
      rationale: isMeal 
        ? 'Rest day meal: even protein distribution (~0.4-0.5 g/kg per meal) optimizes muscle protein synthesis.'
        : 'Rest day snack: supports protein distribution and energy balance.',
      priority: isMeal ? 'medium' as const : 'low' as const,
    };
  });
}

/**
 * Get nutrient timing recommendations for a specific workout context
 */
export function getNutrientTimingRecommendations(
  workoutType: string,
  workoutDuration: number,
  workoutIntensity: 'Low' | 'Medium' | 'High',
  bodyWeightKg: number
): {
  preWorkout: { protein: number; carbs: number; fat: number; timing: string };
  postWorkout: { protein: number; carbs: number; fat: number; timing: string };
  intraWorkout: { carbs: number; needed: boolean } | null;
  rationale: string;
} {
  // Adjust carb needs based on workout type and intensity
  const carbMultiplier = {
    'Resistance Training': workoutIntensity === 'High' ? 1.2 : 1.0,
    'HIIT': 1.3,
    'Cardio': workoutDuration > 60 ? 1.4 : 1.1,
    'Sports': 1.2,
    'Yoga/Mobility': 0.6,
    'Mixed': 1.1,
  }[workoutType] || 1.0;
  
  const preWorkout = {
    protein: Math.round(0.4 * bodyWeightKg),
    carbs: Math.round(0.8 * bodyWeightKg * carbMultiplier),
    fat: Math.round(0.15 * bodyWeightKg),
    timing: '1-3 hours before',
  };
  
  const postWorkout = {
    protein: Math.round(0.4 * bodyWeightKg),
    carbs: Math.round(1.0 * bodyWeightKg * carbMultiplier),
    fat: Math.round(0.25 * bodyWeightKg),
    timing: 'Within 2 hours after',
  };
  
  // Intra-workout only for long endurance
  const needsIntra = workoutType === 'Cardio' && workoutDuration > 90;
  const intraWorkout = needsIntra ? {
    carbs: Math.round(workoutDuration / 60 * 45), // ~45g per hour
    needed: true,
  } : null;
  
  const rationale = `For ${workoutType} (${workoutDuration}min, ${workoutIntensity} intensity): ` +
    `Pre-workout carbs fuel performance, post-workout protein (0.4 g/kg) supports muscle protein synthesis. ` +
    (needsIntra ? `Intra-workout carbs recommended for sessions >90 minutes.` : '');
  
  return { preWorkout, postWorkout, intraWorkout, rationale };
}
