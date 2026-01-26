import type { ActivityLevel, Macros, PerformancePriority, MusclePreservation, LifestyleCommitment, RMREquation } from '@/types';

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
 */
export function getActivityMultiplier(activityLevel: ActivityLevel): number {
  const multipliers: Record<ActivityLevel, number> = {
    'Sedentary (0-5k steps/day)': 1.2,
    'Light Active (5-10k steps/day)': 1.375,
    'Active (10-15k steps/day)': 1.55,
    'Labor Intensive (>15k steps/day)': 1.725,
  };
  return multipliers[activityLevel] ?? 1.2;
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
 */
export function calculateMacros(
  targetCalories: number,
  bodyWeightKg: number,
  goalType: 'lose_fat' | 'gain_muscle' | 'maintain'
): Macros {
  // Ensure minimum calories
  const calories = Math.max(1200, targetCalories);
  
  let proteinG: number;
  let fatG: number;
  
  switch (goalType) {
    case 'lose_fat':
      // Higher protein for fat loss
      proteinG = 2.2 * bodyWeightKg; // 2.2g per kg (1.0g per lb)
      fatG = 0.8 * bodyWeightKg; // 0.8g per kg
      break;
    case 'gain_muscle':
      // High protein and carbs for muscle gain
      proteinG = 2.0 * bodyWeightKg; // 2.0g per kg
      fatG = 0.8 * bodyWeightKg;
      break;
    case 'maintain':
    default:
      // Balanced for maintenance
      proteinG = 1.8 * bodyWeightKg;
      fatG = 1.0 * bodyWeightKg;
      break;
  }
  
  // Calculate calories from protein and fat
  const proteinCalories = proteinG * 4;
  const fatCalories = fatG * 9;
  
  // Calculate remaining calories for carbs
  let carbCalories = calories - proteinCalories - fatCalories;
  
  // Handle negative carb calories
  if (carbCalories <= 0) {
    const minFat = 0.5 * bodyWeightKg;
    fatG = Math.max(minFat, fatG);
    
    const newFatCalories = fatG * 9;
    carbCalories = calories - proteinCalories - newFatCalories;
    
    if (carbCalories <= 0) {
      const minProtein = 1.6 * bodyWeightKg;
      proteinG = Math.max(minProtein, proteinG);
      const newProteinCalories = proteinG * 4;
      carbCalories = calories - newProteinCalories - newFatCalories;
    }
  }
  
  const carbG = carbCalories > 0 ? carbCalories / 4 : 50;
  const bodyWeightLbs = bodyWeightKg * 2.20462;
  const minCarbs = Math.max(50, 0.25 * bodyWeightLbs);
  
  return {
    calories: Math.round(calories),
    protein: Math.round(Math.max(proteinG, 50)),
    carbs: Math.round(Math.max(carbG, minCarbs)),
    fat: Math.round(Math.max(fatG, 30)),
  };
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
 * Distribute daily macros across meals
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
