"""
Enhanced AI Meal Planning with Intelligent Macro Optimization
Integrates advanced optimization algorithms for ±1% macro accuracy
"""
import streamlit as st
import pandas as pd
import json
import copy
from typing import Dict, List, Tuple, Optional
import numpy as np

# Import optimization engine
from intelligent_macro_optimizer import MacroOptimizer

class EnhancedMealPlanner:
    def __init__(self):
        self.optimizer = MacroOptimizer()
        
    def optimize_meal_for_targets(self, 
                                 meal_data: Dict, 
                                 target_macros: Dict,
                                 user_preferences: Dict = None,
                                 tolerance: float = 0.01) -> Tuple[Dict, Dict, str]:
        """
        Optimize a meal to hit precise macro targets
        Returns: (optimized_meal, achieved_macros, optimization_report)
        """
        
        # Extract ingredients from meal data
        ingredients = meal_data.get('recipe', {}).get('ingredients', [])
        if not ingredients:
            return meal_data, {}, "No ingredients to optimize"
        
        # Get current macros
        current_macros = self.optimizer.calculate_current_macros(ingredients)
        
        # Check if optimization is needed
        if self._within_acceptable_range(current_macros, target_macros, tolerance * 5):  # Use 5x tolerance for pre-check
            return meal_data, current_macros, "Already within acceptable range"
        
        # Run intelligent optimization
        try:
            optimized_ingredients, achieved_macros = self.optimizer.optimize_meal_macros(
                ingredients, target_macros, user_preferences, tolerance
            )
            
            # Update meal data with optimized ingredients
            optimized_meal = copy.deepcopy(meal_data)
            optimized_meal['recipe']['ingredients'] = optimized_ingredients
            optimized_meal['recipe']['macros'] = achieved_macros
            
            # Generate optimization report
            report = self._generate_optimization_report(
                current_macros, achieved_macros, target_macros, 
                len(ingredients), len(optimized_ingredients)
            )
            
            return optimized_meal, achieved_macros, report
            
        except Exception as e:
            return meal_data, current_macros, f"Optimization failed: {str(e)}"
    
    def optimize_full_day_plan(self, 
                              daily_meals: List[Dict], 
                              daily_targets: Dict,
                              user_preferences: Dict = None) -> Tuple[List[Dict], Dict, str]:
        """
        Optimize all meals in a day to collectively hit daily macro targets
        """
        
        if not daily_meals:
            return daily_meals, {}, "No meals to optimize"
        
        # Calculate targets per meal (distributed approach)
        meal_count = len(daily_meals)
        protein_per_meal = daily_targets.get('protein', 120) / meal_count
        carbs_per_meal = daily_targets.get('carbs', 150) / meal_count
        fat_per_meal = daily_targets.get('fat', 60) / meal_count
        calories_per_meal = daily_targets.get('calories', 1800) / meal_count
        
        # Adjust based on meal type
        optimized_meals = []
        total_achieved = {"protein": 0, "carbs": 0, "fat": 0, "calories": 0}
        optimization_reports = []
        
        for i, meal in enumerate(daily_meals):
            meal_type = meal.get('meal_type', 'Meal').lower()
            
            # Adjust targets based on meal type
            if 'breakfast' in meal_type:
                # Higher protein for breakfast
                meal_targets = {
                    "protein": protein_per_meal * 1.2,
                    "carbs": carbs_per_meal * 1.1,
                    "fat": fat_per_meal * 0.9,
                    "calories": calories_per_meal
                }
            elif 'lunch' in meal_type:
                # Balanced lunch
                meal_targets = {
                    "protein": protein_per_meal,
                    "carbs": carbs_per_meal,
                    "fat": fat_per_meal,
                    "calories": calories_per_meal
                }
            elif 'dinner' in meal_type:
                # Higher protein, moderate carbs for dinner
                meal_targets = {
                    "protein": protein_per_meal * 1.3,
                    "carbs": carbs_per_meal * 0.8,
                    "fat": fat_per_meal * 1.1,
                    "calories": calories_per_meal
                }
            elif 'snack' in meal_type:
                # Light snack
                meal_targets = {
                    "protein": protein_per_meal * 0.6,
                    "carbs": carbs_per_meal * 0.7,
                    "fat": fat_per_meal * 0.8,
                    "calories": calories_per_meal * 0.6
                }
            else:
                # Default balanced
                meal_targets = {
                    "protein": protein_per_meal,
                    "carbs": carbs_per_meal,
                    "fat": fat_per_meal,
                    "calories": calories_per_meal
                }
            
            # Optimize this meal
            optimized_meal, achieved_macros, report = self.optimize_meal_for_targets(
                meal, meal_targets, user_preferences
            )
            
            optimized_meals.append(optimized_meal)
            optimization_reports.append(f"{meal_type.title()}: {report}")
            
            # Add to daily totals
            for macro in ["protein", "carbs", "fat", "calories"]:
                total_achieved[macro] += achieved_macros.get(macro, 0)
        
        # Generate comprehensive report
        daily_report = self._generate_daily_optimization_report(
            total_achieved, daily_targets, optimization_reports
        )
        
        return optimized_meals, total_achieved, daily_report
    
    def auto_adjust_meal_precise(self, meal_data: Dict, target_macros: Dict) -> Dict:
        """
        Auto-adjust meal with maximum precision - main interface for UI
        """
        user_preferences = st.session_state.get('diet_preferences', {})
        
        optimized_meal, achieved_macros, report = self.optimize_meal_for_targets(
            meal_data, target_macros, user_preferences
        )
        
        # Display optimization results in UI
        if report and "Already within" not in report:
            st.success(f"**Meal Optimized for Precision**")
            
            # Show before/after comparison
            original_macros = self.optimizer.calculate_current_macros(
                meal_data.get('recipe', {}).get('ingredients', [])
            )
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.markdown("**Original**")
                for macro in ["protein", "carbs", "fat", "calories"]:
                    st.write(f"{macro.title()}: {original_macros.get(macro, 0):.1f}")
            
            with col2:
                st.markdown("**Target**")
                for macro in ["protein", "carbs", "fat", "calories"]:
                    st.write(f"{macro.title()}: {target_macros.get(macro, 0):.1f}")
            
            with col3:
                st.markdown("**Achieved**")
                for macro in ["protein", "carbs", "fat", "calories"]:
                    value = achieved_macros.get(macro, 0)
                    target = target_macros.get(macro, 1)
                    error = abs(value - target) / target * 100
                    
                    if error <= 1:
                        color = "green"
                        status = "✅"
                    elif error <= 3:
                        color = "blue"
                        status = "🔵"
                    else:
                        color = "orange"
                        status = "⚠️"
                    
                    st.markdown(f":{color}[{macro.title()}: {value:.1f} {status}]")
            
            # Show optimization summary
            max_error = max(abs(achieved_macros.get(macro, 0) - target_macros.get(macro, 1)) / 
                           target_macros.get(macro, 1) * 100 
                           for macro in ["protein", "carbs", "fat", "calories"])
            
            if max_error <= 1:
                st.success(f"🎯 **EXCELLENT**: ±{max_error:.1f}% precision achieved!")
            elif max_error <= 3:
                st.info(f"🎯 **GOOD**: ±{max_error:.1f}% precision (target: ±1%)")
            else:
                st.warning(f"🎯 **ACCEPTABLE**: ±{max_error:.1f}% precision")
            
            # Show ingredient changes
            original_ingredients = [ing['name'] for ing in meal_data.get('recipe', {}).get('ingredients', [])]
            optimized_ingredients = [ing['name'] for ing in optimized_meal.get('recipe', {}).get('ingredients', [])]
            
            added_ingredients = [ing for ing in optimized_ingredients if ing not in original_ingredients]
            if added_ingredients:
                st.info(f"**Added ingredients**: {', '.join(added_ingredients)}")
        
        return optimized_meal
    
    def _within_acceptable_range(self, current: Dict, target: Dict, tolerance: float) -> bool:
        """Check if current macros are within acceptable range"""
        for macro in ["protein", "carbs", "fat", "calories"]:
            target_val = target.get(macro, 0)
            current_val = current.get(macro, 0)
            
            if target_val > 0:
                error = abs(current_val - target_val) / target_val
                if error > tolerance:
                    return False
        return True
    
    def _generate_optimization_report(self, original: Dict, achieved: Dict, target: Dict, 
                                    original_ingredients: int, final_ingredients: int) -> str:
        """Generate detailed optimization report"""
        
        improvements = []
        for macro in ["protein", "carbs", "fat", "calories"]:
            orig_error = abs(original.get(macro, 0) - target.get(macro, 1)) / target.get(macro, 1) * 100
            final_error = abs(achieved.get(macro, 0) - target.get(macro, 1)) / target.get(macro, 1) * 100
            
            if final_error < orig_error:
                improvements.append(f"{macro}: {orig_error:.1f}% → {final_error:.1f}%")
        
        added_ingredients = final_ingredients - original_ingredients
        
        report = f"Optimized with {added_ingredients} additional ingredients. "
        if improvements:
            report += f"Improved: {', '.join(improvements[:2])}"
        
        max_final_error = max(abs(achieved.get(macro, 0) - target.get(macro, 1)) / 
                             target.get(macro, 1) * 100 
                             for macro in ["protein", "carbs", "fat", "calories"])
        
        if max_final_error <= 1:
            report += " - EXCELLENT precision achieved!"
        elif max_final_error <= 3:
            report += " - GOOD precision achieved!"
        
        return report
    
    def _generate_daily_optimization_report(self, achieved: Dict, target: Dict, 
                                          meal_reports: List[str]) -> str:
        """Generate comprehensive daily optimization report"""
        
        daily_accuracy = {}
        for macro in ["protein", "carbs", "fat", "calories"]:
            target_val = target.get(macro, 1)
            achieved_val = achieved.get(macro, 0)
            error_pct = abs(achieved_val - target_val) / target_val * 100
            daily_accuracy[macro] = error_pct
        
        max_error = max(daily_accuracy.values())
        
        report = f"Daily Optimization Complete\n"
        report += f"Maximum error: {max_error:.1f}%\n"
        
        if max_error <= 1:
            report += "Status: EXCELLENT - ±1% precision achieved!\n"
        elif max_error <= 3:
            report += "Status: GOOD - Within ±3% tolerance\n"
        else:
            report += "Status: ACCEPTABLE - Further optimization possible\n"
        
        report += f"\nMeal-by-meal results:\n"
        for meal_report in meal_reports[:3]:  # Limit to first 3 meals
            report += f"• {meal_report}\n"
        
        return report

def create_enhanced_meal_planner():
    """Factory function to create enhanced meal planner"""
    return EnhancedMealPlanner()