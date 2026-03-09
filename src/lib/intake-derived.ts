import {
  calculateMacrosAdvanced,
  calculateTargetCalories,
  calculateTDEE,
  estimateWorkoutCaloriesMET,
  heightToCm,
  lbsToKg,
} from '@/lib/nutrition-calc';
import type { BodyCompGoals, DayNutritionTargets, GoalType, WeeklySchedule, WorkoutConfig } from '@/types';

const DAYS: Array<keyof WeeklySchedule> = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type MacroGoalType = 'lose_fat' | 'gain_muscle' | 'maintain';

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asGender(value: unknown): 'Male' | 'Female' | undefined {
  return value === 'Male' || value === 'Female' ? value : undefined;
}

function normalizeGoalType(value: unknown): GoalType | undefined {
  if (
    value === 'fat_loss' ||
    value === 'muscle_gain' ||
    value === 'recomposition' ||
    value === 'performance' ||
    value === 'health' ||
    value === 'other'
  ) {
    return value;
  }
  return undefined;
}

function toMacroGoalType(goalType: GoalType | undefined): MacroGoalType {
  if (goalType === 'fat_loss') return 'lose_fat';
  if (goalType === 'muscle_gain') return 'gain_muscle';
  return 'maintain';
}

function getTimelineWeeks(goalType: GoalType | undefined): number {
  return goalType === 'muscle_gain' ? 16 : 12;
}

function getRateOfChangePercent(userProfile: Record<string, unknown>, goalType: GoalType | undefined): number {
  const explicit = asNumber(userProfile.rateOfChange);
  if (explicit !== undefined && explicit > 0) return explicit;
  if (goalType === 'fat_loss') return 0.5;
  if (goalType === 'muscle_gain') return 0.25;
  if (goalType === 'recomposition') return 0.15;
  return 0;
}

function getWeightLbs(userProfile: Record<string, unknown>): number | undefined {
  const lbs = asNumber(userProfile.weightLbs);
  if (lbs && lbs > 0) return lbs;

  const kg = asNumber(userProfile.weightKg);
  if (kg && kg > 0) return kg * 2.205;

  return undefined;
}

function getHeightFtIn(userProfile: Record<string, unknown>): { heightFt: number; heightIn: number } | null {
  const heightFt = asNumber(userProfile.heightFt);
  const heightIn = asNumber(userProfile.heightIn) ?? 0;
  if (heightFt && heightFt > 0) return { heightFt, heightIn };

  const heightCm = asNumber(userProfile.heightCm);
  if (heightCm && heightCm > 0) {
    const totalInches = heightCm / 2.54;
    return {
      heightFt: Math.floor(totalInches / 12),
      heightIn: Math.round(totalInches % 12),
    };
  }

  return null;
}

function getWeeklyChangeKg(weightKg: number, userProfile: Record<string, unknown>, goalType: GoalType | undefined): number {
  const ratePct = getRateOfChangePercent(userProfile, goalType);
  return ratePct > 0 ? weightKg * (ratePct / 100) : 0;
}

function getWorkoutCalories(workouts: WorkoutConfig[] | undefined, weightKg: number): number {
  if (!Array.isArray(workouts) || workouts.length === 0) return 0;

  return Math.round(
    workouts.reduce((total, workout) => {
      if (!workout?.enabled) return total;
      if (typeof workout.estimatedCalories === 'number' && Number.isFinite(workout.estimatedCalories)) {
        return total + workout.estimatedCalories;
      }
      return total + estimateWorkoutCaloriesMET(
        workout.type || 'Resistance Training',
        workout.intensity || 'Medium',
        workout.duration || 60,
        weightKg,
      );
    }, 0)
  );
}

export function buildBodyCompGoalsFromIntake(userProfile: Record<string, unknown>): Partial<BodyCompGoals> {
  const goalType = normalizeGoalType(userProfile.goalType);
  const weightLbs = getWeightLbs(userProfile);
  const bodyFat = asNumber(userProfile.bodyFatPercentage);

  if (!goalType || !weightLbs || !bodyFat) {
    return {};
  }

  const targetWeightLbs = asNumber(userProfile.goalWeight) ?? weightLbs;
  const targetBodyFat = asNumber(userProfile.goalBodyFatPercent) ?? bodyFat;
  const targetFatMassLbs = asNumber(userProfile.goalFatMass) ?? (targetWeightLbs * (targetBodyFat / 100));
  const targetFFMLbs = asNumber(userProfile.goalFFM) ?? (targetWeightLbs - targetFatMassLbs);
  const rateOfChange = getRateOfChangePercent(userProfile, goalType);
  const weeklyWeightChange = rateOfChange > 0 ? (weightLbs * rateOfChange) / 100 : undefined;

  return {
    goalType,
    targetWeightLbs,
    targetBodyFat,
    timelineWeeks: getTimelineWeeks(goalType),
    weeklyWeightChange,
    weeklyWeightChangePct: rateOfChange > 0 ? rateOfChange / 100 : undefined,
    startDate: new Date().toISOString().split('T')[0],
    targetFatMassLbs,
    targetFFMLbs,
    performancePriority: 'body_comp_priority',
    musclePreservation: 'preserve_all',
    fatGainTolerance: 'minimize_fat_gain',
    lifestyleCommitment: 'fully_committed',
    trackingCommitment: 'committed_tracking',
  };
}

export function buildDraftNutritionTargetsFromIntake(
  userProfile: Record<string, unknown>,
  weeklySchedule: Partial<WeeklySchedule> | Record<string, unknown> | null | undefined,
): DayNutritionTargets[] {
  const gender = asGender(userProfile.gender);
  const age = asNumber(userProfile.age);
  const weightLbs = getWeightLbs(userProfile);
  const height = getHeightFtIn(userProfile);
  const goalType = normalizeGoalType(userProfile.goalType);

  if (!gender || !age || !weightLbs || !height) {
    return [];
  }

  const weightKg = lbsToKg(weightLbs);
  const heightCm = heightToCm(height.heightFt, height.heightIn);
  const macroGoalType = toMacroGoalType(goalType);
  const baseTdee = calculateTDEE(
    gender,
    weightKg,
    heightCm,
    age,
    (typeof userProfile.activityLevel === 'string' ? userProfile.activityLevel : 'Active (10-15k steps/day)') as never,
    0,
    0,
  );
  const weeklyChangeKg = getWeeklyChangeKg(weightKg, userProfile, goalType);
  const profileBodyFat = asNumber(userProfile.bodyFatPercentage);
  const schedule = (weeklySchedule || {}) as Partial<WeeklySchedule>;

  return DAYS.map((day) => {
    const daySchedule = schedule[day];
    const workouts = (daySchedule?.workouts || []).filter(Boolean) as WorkoutConfig[];
    const enabledWorkouts = workouts.filter(workout => workout.enabled);
    const workoutCalories = getWorkoutCalories(enabledWorkouts, weightKg);
    const adjustedTdee = Math.round(baseTdee + workoutCalories);
    const targetCalories = calculateTargetCalories(adjustedTdee, macroGoalType, weeklyChangeKg);
    const macros = calculateMacrosAdvanced(
      targetCalories,
      weightKg,
      macroGoalType,
      'moderate',
      'moderate',
      undefined,
      undefined,
      profileBodyFat,
      gender,
    );

    return {
      day,
      isWorkoutDay: enabledWorkouts.length > 0,
      tdee: adjustedTdee,
      targetCalories: Math.round(targetCalories),
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    };
  });
}

