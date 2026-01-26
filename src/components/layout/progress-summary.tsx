'use client';

import { useFitomicsStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Circle, 
  User, 
  Target, 
  Utensils, 
  Calendar, 
  Calculator,
  ChevronRight
} from 'lucide-react';
import { calculateBodyComposition, lbsToKg, heightToCm } from '@/lib/nutrition-calc';

interface ProgressSummaryProps {
  currentStep?: number;
  showCompact?: boolean;
}

const STEPS = [
  { id: 1, name: 'Profile', icon: User },
  { id: 2, name: 'Schedule', icon: Calendar },
  { id: 3, name: 'Preferences', icon: Utensils },
  { id: 4, name: 'Targets', icon: Calculator },
  { id: 5, name: 'Meal Plan', icon: Target },
];

export function ProgressSummary({ currentStep = 1, showCompact = false }: ProgressSummaryProps) {
  const { userProfile, bodyCompGoals, dietPreferences, weeklySchedule, nutritionTargets } = useFitomicsStore();

  // Calculate completion status
  const hasProfile = !!(userProfile.name && userProfile.gender && userProfile.weightLbs && userProfile.heightFt);
  const hasGoals = !!(bodyCompGoals.goalType && bodyCompGoals.targetWeightLbs);
  const hasPreferences = !!(dietPreferences.preferredProteins?.length || dietPreferences.dietaryRestrictions?.length);
  const hasSchedule = Object.keys(weeklySchedule).length > 0;
  const hasTargets = nutritionTargets.length > 0;

  const completedSteps = [hasProfile && hasGoals, hasPreferences, hasSchedule, hasTargets, false].filter(Boolean).length;

  // Calculate body composition if profile exists
  const bodyComp = hasProfile && userProfile.weightLbs && userProfile.heightFt && userProfile.bodyFatPercentage
    ? calculateBodyComposition(
        lbsToKg(userProfile.weightLbs),
        heightToCm(userProfile.heightFt, userProfile.heightIn || 0),
        userProfile.bodyFatPercentage,
        userProfile.gender!
      )
    : null;

  // Format goal type
  const formatGoalType = (goalType?: string) => {
    switch (goalType) {
      case 'lose_fat': return 'Fat Loss';
      case 'gain_muscle': return 'Muscle Gain';
      case 'maintain': return 'Maintenance';
      default: return 'Not set';
    }
  };

  // Format activity level (shorter)
  const formatActivityLevel = (level?: string) => {
    if (!level) return 'Not set';
    if (level.includes('Sedentary')) return 'Sedentary';
    if (level.includes('Light')) return 'Light Active';
    if (level.includes('Active') && !level.includes('Light')) return 'Active';
    if (level.includes('Labor')) return 'Very Active';
    return level;
  };

  // Get workout days count
  const workoutDaysCount = Object.values(weeklySchedule).filter(
    (day) => day?.workouts && day.workouts.length > 0
  ).length;

  if (showCompact) {
    return (
      <Card className="border-[#c19962]/30">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Progress:</span>
              {STEPS.map((step, index) => {
                const isComplete = index < completedSteps;
                const isCurrent = step.id === currentStep;
                return (
                  <div key={step.id} className="flex items-center">
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : isCurrent ? (
                      <Circle className="h-4 w-4 text-[#c19962] fill-[#c19962]/20" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/30" />
                    )}
                    {index < STEPS.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground/30 mx-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
            <Badge variant="outline" className="text-xs">
              Step {currentStep}/5
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#c19962]/30 bg-gradient-to-br from-background to-[#c19962]/5">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-4 w-4 text-[#c19962]" />
          <CardTitle className="text-base">Planning Progress</CardTitle>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Summary of selections</p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#c19962] border-[#c19962]">
            {completedSteps}/5 complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pt-2 pb-4">
        {/* Step Progress Indicator - Vertical list */}
        <div className="space-y-1.5">
          {STEPS.map((step, index) => {
            const isComplete = index < completedSteps;
            const isCurrent = step.id === currentStep;
            const StepIcon = step.icon;
            return (
              <div 
                key={step.id} 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isComplete 
                    ? 'bg-green-500/10' 
                    : isCurrent 
                      ? 'bg-[#c19962]/10 border border-[#c19962]/30' 
                      : 'bg-muted/30'
                }`}
              >
                <div className={`p-1.5 rounded-full shrink-0 ${
                  isComplete 
                    ? 'bg-green-500/20 text-green-600' 
                    : isCurrent 
                      ? 'bg-[#c19962]/20 text-[#c19962]' 
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
                <span className={`text-sm ${
                  isComplete ? 'text-green-700 font-medium' : isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.id}. {step.name}
                </span>
                {isCurrent && (
                  <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 border-[#c19962] text-[#c19962]">
                    Current
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Personal Information Summary */}
        {hasProfile && (
          <>
            <Separator />
            <div className="space-y-2 overflow-hidden">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#c19962] shrink-0" />
                <span className="font-medium text-sm">Personal Information</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />
              </div>
              <div className="pl-6 space-y-1.5 text-sm overflow-hidden">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{userProfile.name}</span>
                  {' • '}{userProfile.gender}
                  {' • '}{userProfile.age} years old
                </p>
                <p className="text-muted-foreground">
                  Height: {userProfile.heightFt}'{userProfile.heightIn}"
                  {' '}Weight: {userProfile.weightLbs} lbs
                </p>
                {userProfile.bodyFatPercentage && (
                  <p className="text-muted-foreground">
                    Body Fat: {Number(userProfile.bodyFatPercentage).toFixed(1)}%
                  </p>
                )}
                <p className="text-muted-foreground">
                  Activity: {formatActivityLevel(userProfile.activityLevel)}
                </p>
                {bodyComp && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 whitespace-nowrap">
                      FMI: {bodyComp.fmi.toFixed(1)} ({bodyComp.fmiCategory})
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 whitespace-nowrap">
                      FFMI: {bodyComp.ffmi.toFixed(1)} ({bodyComp.ffmiCategory})
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Body Composition Goals Summary */}
        {hasGoals && (
          <>
            <Separator />
            <div className="space-y-2 overflow-hidden">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[#c19962] shrink-0" />
                <span className="font-medium text-sm">Body Composition Goals</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />
              </div>
              <div className="pl-6 space-y-1.5 text-sm overflow-hidden">
                <p className="text-muted-foreground">
                  Goal: <span className="font-medium text-foreground">{formatGoalType(bodyCompGoals.goalType)}</span>
                </p>
                <p className="text-muted-foreground">
                  Target: {Math.round(bodyCompGoals.targetWeightLbs || 0)} lbs
                  {bodyCompGoals.targetBodyFat && (
                    <> • {Number(bodyCompGoals.targetBodyFat).toFixed(1)}% BF</>
                  )}
                </p>
                {bodyCompGoals.timelineWeeks && (
                  <p className="text-muted-foreground">
                    Timeline: {bodyCompGoals.timelineWeeks} weeks
                  </p>
                )}
                {/* Preference badges */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {bodyCompGoals.performancePriority && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      {bodyCompGoals.performancePriority === 'performance_priority' 
                        ? 'Performance' 
                        : 'Body Comp'}
                    </Badge>
                  )}
                  {bodyCompGoals.musclePreservation && bodyCompGoals.goalType === 'lose_fat' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      {bodyCompGoals.musclePreservation === 'preserve_all' 
                        ? 'Preserve' 
                        : 'Some Loss OK'}
                    </Badge>
                  )}
                  {bodyCompGoals.lifestyleCommitment && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      {bodyCompGoals.lifestyleCommitment === 'fully_committed' 
                        ? 'Committed'
                        : bodyCompGoals.lifestyleCommitment === 'moderately_committed'
                          ? 'Moderate'
                          : 'Limited'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Diet Preferences Summary */}
        {hasPreferences && (
          <>
            <Separator />
            <div className="space-y-2 overflow-hidden">
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-[#c19962] shrink-0" />
                <span className="font-medium text-sm">Diet Preferences</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />
              </div>
              <div className="pl-6 space-y-1 text-sm text-muted-foreground">
                {dietPreferences.dietaryRestrictions && dietPreferences.dietaryRestrictions.length > 0 && (
                  <p className="truncate">
                    Restrictions: <span className="text-foreground">{dietPreferences.dietaryRestrictions.slice(0, 3).join(', ')}{dietPreferences.dietaryRestrictions.length > 3 ? '...' : ''}</span>
                  </p>
                )}
                <p>
                  {dietPreferences.preferredProteins && dietPreferences.preferredProteins.length > 0 && (
                    <span>Proteins: {dietPreferences.preferredProteins.length}</span>
                  )}
                  {dietPreferences.preferredCarbs && dietPreferences.preferredCarbs.length > 0 && (
                    <span> • Carbs: {dietPreferences.preferredCarbs.length}</span>
                  )}
                </p>
                <p>
                  {dietPreferences.preferredFats && dietPreferences.preferredFats.length > 0 && (
                    <span>Fats: {dietPreferences.preferredFats.length}</span>
                  )}
                  {dietPreferences.preferredVegetables && dietPreferences.preferredVegetables.length > 0 && (
                    <span> • Veggies: {dietPreferences.preferredVegetables.length}</span>
                  )}
                </p>
                {dietPreferences.varietyLevel !== undefined && (
                  <p>
                    Variety: <span className="text-foreground">
                      {dietPreferences.varietyLevel <= 2 ? 'Low' : dietPreferences.varietyLevel >= 4 ? 'High' : 'Medium'}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Schedule Summary */}
        {hasSchedule && (
          <>
            <Separator />
            <div className="space-y-2 overflow-hidden">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#c19962] shrink-0" />
                <span className="font-medium text-sm">Weekly Schedule</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />
              </div>
              <div className="pl-6 text-sm text-muted-foreground">
                <p>{workoutDaysCount} workout day{workoutDaysCount !== 1 ? 's' : ''} configured</p>
              </div>
            </div>
          </>
        )}

        {/* Nutrition Targets Summary */}
        {hasTargets && (
          <>
            <Separator />
            <div className="space-y-2 overflow-hidden">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-[#c19962] shrink-0" />
                <span className="font-medium text-sm">Nutrition Targets</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />
              </div>
              <div className="pl-6 text-sm text-muted-foreground space-y-0.5">
                <p>
                  Avg: {Math.round(nutritionTargets.reduce((sum, t) => sum + t.targetCalories, 0) / nutritionTargets.length)} cal
                  {' • '}{Math.round(nutritionTargets.reduce((sum, t) => sum + t.protein, 0) / nutritionTargets.length)}g protein
                </p>
                <p>
                  {Math.round(nutritionTargets.reduce((sum, t) => sum + t.carbs, 0) / nutritionTargets.length)}g carbs
                  {' • '}{Math.round(nutritionTargets.reduce((sum, t) => sum + t.fat, 0) / nutritionTargets.length)}g fat
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
