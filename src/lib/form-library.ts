import type { FormBlockId, ReusableCustomField } from '@/types';

export interface BlockFieldMeta {
  key: string;
  label: string;
  dataKeys: string[];
}

export interface BlockMeta {
  id: FormBlockId;
  label: string;
  description: string;
  fields: BlockFieldMeta[];
}

export const ALL_BLOCK_IDS: BlockMeta[] = [
  { id: 'personal_info', label: 'Personal Info', description: 'Name, gender, age/DOB, height, weight',
    fields: [
      { key: 'name', label: 'Full Name', dataKeys: ['name'] },
      { key: 'gender', label: 'Gender', dataKeys: ['gender'] },
      { key: 'age', label: 'Age / Date of Birth', dataKeys: ['age', 'dateOfBirth', 'useDOB'] },
      { key: 'height', label: 'Height', dataKeys: ['heightFt', 'heightIn'] },
      { key: 'weight', label: 'Weight', dataKeys: ['weightLbs'] },
    ] },
  { id: 'body_composition', label: 'Body Composition', description: 'Body fat source, body fat %',
    fields: [
      { key: 'bodyFatSource', label: 'Body Fat Source (estimate/measured)', dataKeys: ['bodyFatSource'] },
      { key: 'bodyFatPercent', label: 'Body Fat Percentage', dataKeys: ['bodyFatPercent'] },
    ] },
  { id: 'lifestyle', label: 'Lifestyle', description: 'Wake/sleep, work type/schedule, activity level',
    fields: [
      { key: 'wakeTime', label: 'Wake Time', dataKeys: ['wakeTime'] },
      { key: 'bedTime', label: 'Bed Time', dataKeys: ['bedTime'] },
      { key: 'workType', label: 'Work Type / Schedule', dataKeys: ['workType', 'workStartTime', 'workEndTime'] },
      { key: 'activityLevel', label: 'Daily Activity Level', dataKeys: ['activityLevel'] },
    ] },
  { id: 'training', label: 'Training', description: 'Workouts/week, type, duration, intensity, time',
    fields: [
      { key: 'workoutsPerWeek', label: 'Workouts Per Week', dataKeys: ['workoutsPerWeek'] },
      { key: 'workoutType', label: 'Default Workout Type', dataKeys: ['defaultWorkoutType'] },
      { key: 'duration', label: 'Default Duration', dataKeys: ['defaultDuration'] },
      { key: 'intensity', label: 'Default Intensity', dataKeys: ['defaultIntensity'] },
      { key: 'timeSlot', label: 'Default Time Slot', dataKeys: ['defaultTimeSlot'] },
    ] },
  { id: 'meals', label: 'Meal Structure', description: 'Meals/day, snacks, fasting, peri-workout prefs',
    fields: [
      { key: 'mealsPerDay', label: 'Meals Per Day', dataKeys: ['mealsPerDay'] },
      { key: 'snacksPerDay', label: 'Snacks Per Day', dataKeys: ['snacksPerDay'] },
      { key: 'fasting', label: 'Fasting Protocol / Feeding Window', dataKeys: ['fastingProtocol', 'feedingWindowStart', 'feedingWindowEnd'] },
      { key: 'energyDistribution', label: 'Energy Distribution', dataKeys: ['energyDistribution'] },
      { key: 'periWorkout', label: 'Pre/Post Workout Nutrition', dataKeys: ['includePreWorkoutSnack', 'preWorkoutPreference', 'includePostWorkoutMeal', 'postWorkoutPreference'] },
    ] },
  { id: 'supplements', label: 'Supplements', description: 'Supplement list',
    fields: [
      { key: 'supplements', label: 'Supplement Checklist', dataKeys: ['supplements'] },
      { key: 'customSupplement', label: 'Custom Supplement Entry', dataKeys: ['customSupplement'] },
    ] },
  { id: 'diet_preferences', label: 'Diet Preferences', description: 'Restrictions, allergies, protein/carb/fat prefs',
    fields: [
      { key: 'restrictions', label: 'Dietary Restrictions', dataKeys: ['dietaryRestrictions'] },
      { key: 'allergies', label: 'Allergies', dataKeys: ['allergies'] },
      { key: 'proteinPrefs', label: 'Preferred Proteins', dataKeys: ['preferredProteins'] },
      { key: 'carbPrefs', label: 'Preferred Carbs', dataKeys: ['preferredCarbs'] },
      { key: 'fatPrefs', label: 'Preferred Fats', dataKeys: ['preferredFats'] },
    ] },
  { id: 'cuisine_foods', label: 'Cuisine & Foods', description: 'Cuisine styles, foods to emphasize/avoid',
    fields: [
      { key: 'cuisines', label: 'Cuisine Preferences', dataKeys: ['cuisinePreferences'] },
      { key: 'foodsToEmphasize', label: 'Foods to Emphasize', dataKeys: ['foodsToEmphasize'] },
      { key: 'foodsToAvoid', label: 'Foods to Avoid', dataKeys: ['foodsToAvoid'] },
    ] },
  { id: 'practical_flavor', label: 'Practical & Flavor', description: 'Variety, cooking time, budget, spice, flavors',
    fields: [
      { key: 'variety', label: 'Variety Level', dataKeys: ['varietyLevel'] },
      { key: 'cookingTime', label: 'Cooking Time', dataKeys: ['cookingTime'] },
      { key: 'budget', label: 'Budget', dataKeys: ['budgetPreference'] },
      { key: 'spice', label: 'Spice Tolerance', dataKeys: ['spiceLevel'] },
      { key: 'flavors', label: 'Flavor Profiles', dataKeys: ['flavorProfiles'] },
    ] },
  { id: 'goals_notes', label: 'Goals & Notes', description: 'Health goals, performance goals, notes',
    fields: [
      { key: 'healthGoals', label: 'Health Goals', dataKeys: ['healthGoals'] },
      { key: 'performanceGoals', label: 'Performance Goals', dataKeys: ['performanceGoals'] },
      { key: 'notes', label: 'Additional Notes', dataKeys: ['additionalNotes'] },
    ] },
  { id: 'team_personal', label: 'Team: Personal', description: 'First/Middle/Last name, email, phone, age/DOB',
    fields: [
      { key: 'firstName', label: 'First Name', dataKeys: ['firstName'] },
      { key: 'middleName', label: 'Middle Name', dataKeys: ['middleName'] },
      { key: 'lastName', label: 'Last Name', dataKeys: ['lastName'] },
      { key: 'email', label: 'Email', dataKeys: ['email'] },
      { key: 'phone', label: 'Phone', dataKeys: ['phone'] },
      { key: 'ageDOB', label: 'Age / Date of Birth', dataKeys: ['age', 'dateOfBirth', 'useDOB'] },
    ] },
  { id: 'team_units', label: 'Team: Units', description: 'Imperial or metric unit preference',
    fields: [
      { key: 'unitSystem', label: 'Unit System Toggle', dataKeys: ['unitSystem'] },
    ] },
  { id: 'team_body_comp', label: 'Team: Body Comp', description: 'Height, weight, BF%, derived FM/FFM',
    fields: [
      { key: 'height', label: 'Height', dataKeys: ['heightFt', 'heightIn', 'heightCm'] },
      { key: 'weight', label: 'Weight', dataKeys: ['weightLbs', 'weightKg'] },
      { key: 'bodyFat', label: 'Body Fat %', dataKeys: ['bodyFatPercent'] },
      { key: 'fatMass', label: 'Fat Mass (derived)', dataKeys: [] },
      { key: 'fatFreeMass', label: 'Fat-Free Mass (derived)', dataKeys: [] },
    ] },
  { id: 'team_goals', label: 'Team: Goals', description: 'Goal type, projected 12-week targets, and optional custom body comp targets',
    fields: [
      { key: 'goalType', label: 'Goal Type', dataKeys: ['goalType', 'goalRate', 'recompBias'] },
      { key: 'goalWeight', label: 'Goal Weight', dataKeys: ['goalWeight'] },
      { key: 'goalBF', label: 'Goal Body Fat %', dataKeys: ['goalBodyFatPercent'] },
      { key: 'goalFM', label: 'Goal Fat Mass', dataKeys: ['goalFatMass'] },
      { key: 'goalFFM', label: 'Goal Fat-Free Mass', dataKeys: ['goalFFM'] },
    ] },
  { id: 'team_rmr', label: 'Team: RMR', description: 'Resting metabolic rate (estimated or measured)',
    fields: [
      { key: 'rmrToggle', label: 'Estimated vs. Measured Toggle', dataKeys: ['useMeasuredRMR'] },
      { key: 'measuredRMR', label: 'Measured RMR Input', dataKeys: ['measuredRMR'] },
    ] },
  { id: 'team_activity', label: 'Team: Activity Grid', description: 'Sun-Sat weekly activity with up to 3 bouts/day',
    fields: [
      { key: 'activityGrid', label: 'Weekly Activity Grid', dataKeys: ['weeklyActivity'] },
    ] },
  { id: 'custom_questions', label: 'Custom Questions', description: 'Add your own questions (text, select, number, etc.)', fields: [] },
];

export function getBlockMeta(id: FormBlockId) {
  return ALL_BLOCK_IDS.find(block => block.id === id);
}

export function getBuiltInFieldId(blockId: FormBlockId, fieldKey: string) {
  return `builtin_${blockId}_${fieldKey}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
}

export function getBuiltInFieldRegistry() {
  return ALL_BLOCK_IDS.flatMap(block => block.fields.map(field => ({
    id: getBuiltInFieldId(block.id, field.key),
    name: `${block.id}_${field.key}`,
    label: field.label,
    type: 'text' as const,
    required: false,
    helpText: undefined,
    placeholder: undefined,
    options: [],
    isActive: true,
    fieldKind: 'built_in' as const,
    builtInKey: field.key,
    supportedBlockIds: [block.id],
    dataKeys: field.dataKeys,
    createdAt: '',
    updatedAt: '',
  } satisfies ReusableCustomField)));
}

export function getCompatibleLibraryFields(fields: ReusableCustomField[], blockId: FormBlockId) {
  return fields.filter(field => {
    const supported = field.supportedBlockIds || [];
    return supported.length === 0 || supported.includes(blockId);
  });
}
