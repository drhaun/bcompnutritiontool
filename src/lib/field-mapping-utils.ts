import { ALL_BLOCK_IDS } from '@/lib/form-library';
import type { FieldMapping, FormBlockId } from '@/types';

// Maps a field key to the paths within form_data where its values live.
// form_data = { userProfile: {...}, dietPreferences: {...}, weeklySchedule: {...}, name, email }
export const FIELD_PAYLOAD_PATHS: Record<string, Record<string, string[]>> = {
  personal_info: {
    name: ['userProfile.name'],
    gender: ['userProfile.gender'],
    age: ['userProfile.age', 'userProfile.dateOfBirth'],
    height: ['userProfile.heightFt', 'userProfile.heightIn'],
    weight: ['userProfile.weightLbs'],
  },
  body_composition: {
    bodyFatSource: ['userProfile.bodyFatSource'],
    bodyFatPercent: ['userProfile.bodyFatPercentage'],
  },
  lifestyle: {
    wakeTime: ['weeklySchedule'],
    bedTime: ['weeklySchedule'],
    workType: ['weeklySchedule'],
    activityLevel: ['userProfile.activityLevel'],
  },
  training: {
    workoutsPerWeek: ['userProfile.workoutsPerWeek'],
    workoutType: ['userProfile.workoutDefaults.type'],
    duration: ['userProfile.workoutDefaults.duration'],
    intensity: ['userProfile.workoutDefaults.intensity'],
    timeSlot: ['userProfile.workoutDefaults.timeSlot'],
  },
  meals: {
    mealsPerDay: ['weeklySchedule'],
    snacksPerDay: ['weeklySchedule'],
    fasting: ['dietPreferences.fastingProtocol', 'dietPreferences.feedingWindowStart', 'dietPreferences.feedingWindowEnd'],
    energyDistribution: ['dietPreferences.energyDistribution'],
    periWorkout: ['dietPreferences.includePreWorkoutSnack', 'dietPreferences.preWorkoutPreference', 'dietPreferences.includePostWorkoutMeal', 'dietPreferences.postWorkoutPreference'],
  },
  supplements: {
    supplements: ['userProfile.supplements'],
    customSupplement: [],
  },
  diet_preferences: {
    restrictions: ['dietPreferences.dietaryRestrictions'],
    allergies: ['dietPreferences.allergies'],
    proteinPrefs: ['dietPreferences.preferredProteins'],
    carbPrefs: ['dietPreferences.preferredCarbs'],
    fatPrefs: ['dietPreferences.preferredFats'],
  },
  cuisine_foods: {
    cuisines: ['dietPreferences.cuisinePreferences'],
    foodsToEmphasize: ['dietPreferences.foodsToEmphasize'],
    foodsToAvoid: ['dietPreferences.foodsToAvoid'],
  },
  practical_flavor: {
    variety: ['dietPreferences.varietyLevel'],
    cookingTime: ['dietPreferences.cookingTimePreference'],
    budget: ['dietPreferences.budgetPreference'],
    spice: ['dietPreferences.spiceLevel'],
    flavors: ['dietPreferences.flavorProfiles'],
  },
  goals_notes: {
    healthGoals: ['userProfile.healthGoals'],
    performanceGoals: ['userProfile.performanceGoals'],
    notes: ['userProfile.additionalNotes'],
  },
  team_personal: {
    firstName: ['userProfile.firstName'],
    middleName: ['userProfile.middleName'],
    lastName: ['userProfile.lastName'],
    email: ['email'],
    phone: ['userProfile.phone'],
    ageDOB: ['userProfile.age', 'userProfile.dateOfBirth'],
  },
  team_units: {
    unitSystem: ['userProfile.unitSystem'],
  },
  team_body_comp: {
    height: ['userProfile.heightFt', 'userProfile.heightIn', 'userProfile.heightCm'],
    weight: ['userProfile.weightLbs', 'userProfile.weightKg'],
    bodyFat: ['userProfile.bodyFatPercentage'],
    fatMass: [],
    fatFreeMass: [],
  },
  team_goals: {
    goalType: ['userProfile.goalType', 'userProfile.goalRate', 'userProfile.recompBias'],
    goalWeight: ['userProfile.goalWeight'],
    goalBF: ['userProfile.goalBodyFatPercent'],
    goalFM: ['userProfile.goalFatMass'],
    goalFFM: ['userProfile.goalFFM'],
  },
  team_rmr: {
    rmrToggle: ['userProfile.metabolicAssessment'],
    measuredRMR: ['userProfile.metabolicAssessment'],
  },
  team_activity: {
    activityGrid: ['userProfile.weeklyActivity'],
  },
};

export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function getBlockPayloadPaths(blockId: FormBlockId, fieldKey: string): string[] {
  return FIELD_PAYLOAD_PATHS[blockId]?.[fieldKey] || [];
}

/**
 * Collect all FormState keys that should be locked based on field mappings.
 */
export function getLockedFormStateKeys(mappings: FieldMapping[]): Set<string> {
  const locked = new Set<string>();
  for (const m of mappings) {
    if (!m.isLocked) continue;
    const block = ALL_BLOCK_IDS.find(b => b.id === m.targetBlockId);
    if (!block) continue;
    const fieldsToLock = m.fields
      ? block.fields.filter(f => m.fields!.includes(f.key))
      : block.fields;
    for (const f of fieldsToLock) {
      for (const dk of f.dataKeys) {
        locked.add(dk);
      }
    }
  }
  return locked;
}

/**
 * Extract pre-populated values from a source submission's form_data,
 * guided by field mappings. Returns a partial FormState-shaped object.
 */
export function extractPrePopulatedFields(
  sourceFormData: Record<string, unknown>,
  mappings: FieldMapping[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const up = (sourceFormData.userProfile || {}) as Record<string, unknown>;
  const dp = (sourceFormData.dietPreferences || {}) as Record<string, unknown>;

  for (const m of mappings) {
    const block = ALL_BLOCK_IDS.find(b => b.id === m.sourceBlockId);
    if (!block) continue;
    const fieldsToMap = m.fields
      ? block.fields.filter(f => m.fields!.includes(f.key))
      : block.fields;

    for (const field of fieldsToMap) {
      const payloadPaths = FIELD_PAYLOAD_PATHS[m.sourceBlockId]?.[field.key] || [];
      for (const ppath of payloadPaths) {
        const value = getNestedValue(sourceFormData, ppath);
        if (value === undefined) continue;

        // Map payload path back to FormState keys
        for (const dk of field.dataKeys) {
          if (dk === 'weeklyActivity' && ppath === 'userProfile.weeklyActivity') {
            result.weeklyActivity = value;
          } else if (dk === 'bodyFatPercent' && ppath.endsWith('bodyFatPercentage')) {
            result.bodyFatPercent = String(value);
          } else if (dk === 'name' && ppath === 'userProfile.name') {
            result.name = value;
          } else if (dk === 'email' && ppath === 'email') {
            result.email = value;
          } else if (dk === 'supplements' && ppath === 'userProfile.supplements') {
            result.supplements = Array.isArray(value)
              ? value.map((s: unknown) => typeof s === 'string' ? s : (s as Record<string, unknown>)?.name || '')
              : [];
          } else if (ppath.startsWith('userProfile.workoutDefaults.')) {
            const subKey = ppath.split('.').pop()!;
            const dkMap: Record<string, string> = {
              type: 'defaultWorkoutType',
              duration: 'defaultDuration',
              intensity: 'defaultIntensity',
              timeSlot: 'defaultTimeSlot',
            };
            if (dkMap[subKey]) result[dkMap[subKey]] = value;
          } else if (ppath.startsWith('userProfile.metabolicAssessment')) {
            const ma = value as Record<string, unknown> | undefined;
            if (ma) {
              if (dk === 'useMeasuredRMR') result.useMeasuredRMR = !!ma.useMeasuredRMR;
              if (dk === 'measuredRMR') result.measuredRMR = String(ma.measuredRMR || '');
            }
          } else if (ppath.startsWith('userProfile.')) {
            const leaf = ppath.replace('userProfile.', '');
            if (leaf === dk || field.dataKeys.includes(dk)) {
              const val = up[leaf];
              if (val !== undefined) result[dk] = typeof val === 'number' ? String(val) : val;
            }
          } else if (ppath.startsWith('dietPreferences.')) {
            const leaf = ppath.replace('dietPreferences.', '');
            const val = dp[leaf];
            if (val !== undefined) result[dk] = val;
          }
        }
      }
    }
  }
  return result;
}

/**
 * Given a list of field mappings, return the set of all FormState keys
 * that should be pre-populated (regardless of lock status).
 */
export function getMappedFormStateKeys(mappings: FieldMapping[]): Set<string> {
  const keys = new Set<string>();
  for (const m of mappings) {
    const block = ALL_BLOCK_IDS.find(b => b.id === m.sourceBlockId);
    if (!block) continue;
    const fields = m.fields
      ? block.fields.filter(f => m.fields!.includes(f.key))
      : block.fields;
    for (const f of fields) {
      for (const dk of f.dataKeys) keys.add(dk);
    }
  }
  return keys;
}

export function getBlockMeta(blockId: FormBlockId) {
  return ALL_BLOCK_IDS.find(b => b.id === blockId);
}
