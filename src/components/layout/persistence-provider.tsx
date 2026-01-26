'use client';

import { useEffect, useRef } from 'react';
import { useFitomicsStore } from '@/lib/store';
import { loadAllData, saveAllData } from '@/lib/persistence';

export function PersistenceProvider() {
  const initialized = useRef(false);
  const {
    userProfile,
    bodyCompGoals,
    dietPreferences,
    weeklySchedule,
    nutritionTargets,
    mealPlan,
    setUserProfile,
    setBodyCompGoals,
    setDietPreferences,
    setWeeklySchedule,
    setNutritionTargets,
    setMealPlan,
  } = useFitomicsStore();
  
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    loadAllData()
      .then((data) => {
        if (!data) return;
        if (data.userProfile) setUserProfile(data.userProfile);
        if (data.bodyCompGoals) setBodyCompGoals(data.bodyCompGoals);
        if (data.dietPreferences) setDietPreferences(data.dietPreferences);
        if (data.weeklySchedule) setWeeklySchedule(data.weeklySchedule);
        if (data.nutritionTargets) setNutritionTargets(data.nutritionTargets);
        if (data.mealPlan) setMealPlan(data.mealPlan);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('Failed to load saved data:', err);
      });
  }, [setUserProfile, setBodyCompGoals, setDietPreferences, setWeeklySchedule, setNutritionTargets, setMealPlan]);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveAllData({
        userProfile,
        bodyCompGoals,
        dietPreferences,
        weeklySchedule,
        nutritionTargets,
        mealPlan,
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('Failed to save data:', err);
      });
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [userProfile, bodyCompGoals, dietPreferences, weeklySchedule, nutritionTargets, mealPlan]);
  
  return null;
}
