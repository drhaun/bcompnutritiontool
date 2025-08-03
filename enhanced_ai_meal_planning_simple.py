"""
Enhanced AI Meal Planning with Simple Intelligent Macro Optimization
Works directly with existing Fitomics codebase
"""
import streamlit as st
import copy
from typing import Dict, List, Tuple
from simple_effective_optimizer import create_simple_effective_optimizer

class EnhancedMealPlannerSimple:
    def __init__(self):
        self.optimizer = create_simple_effective_optimizer()
        
    def auto_adjust_meal_precise(self, meal_data: Dict, target_macros: Dict) -> Dict:
        """
        Auto-adjust meal with intelligent precision - main interface for UI
        """
        # Extract ingredients from meal data
        ingredients = meal_data.get('recipe', {}).get('ingredients', [])
        if not ingredients:
            st.warning("No ingredients found to optimize")
            return meal_data
        
        # Get current macros
        current_macros = self.optimizer._calculate_macros(ingredients)
        
        # Get user preferences
        user_preferences = st.session_state.get('diet_preferences', {})
        
        # Run optimization
        try:
            optimized_ingredients, achieved_macros = self.optimizer.optimize_meal_smart(
                ingredients, target_macros
            )
            
            # Update meal data
            optimized_meal = copy.deepcopy(meal_data)
            optimized_meal['recipe']['ingredients'] = optimized_ingredients
            optimized_meal['recipe']['macros'] = achieved_macros
            
            # Display optimization results
            self._display_optimization_results(current_macros, achieved_macros, target_macros, ingredients, optimized_ingredients)
            
            return optimized_meal
            
        except Exception as e:
            st.error(f"Optimization failed: {str(e)}")
            return meal_data
    
    def optimize_full_day_plan(self, 
                              daily_meals: List[Dict], 
                              daily_targets: Dict,
                              user_preferences: Dict = None) -> Tuple[List[Dict], Dict, str]:
        """
        Optimize all meals in a day to collectively hit daily macro targets
        """
        
        if not daily_meals:
            return daily_meals, {}, "No meals to optimize"
        
        # Calculate targets per meal
        meal_count = len(daily_meals)
        meal_targets = {
            "protein": daily_targets.get('protein', 120) / meal_count,
            "carbs": daily_targets.get('carbs', 150) / meal_count,
            "fat": daily_targets.get('fat', 60) / meal_count,
            "calories": daily_targets.get('calories', 1800) / meal_count
        }
        
        optimized_meals = []
        total_achieved = {"protein": 0, "carbs": 0, "fat": 0, "calories": 0}
        
        for i, meal in enumerate(daily_meals):
            meal_type = meal.get('meal_type', f'Meal {i+1}').lower()
            
            # Adjust targets based on meal type
            if 'breakfast' in meal_type:
                adjusted_targets = {k: v * 1.1 for k, v in meal_targets.items()}
                adjusted_targets['protein'] *= 1.2  # Higher protein for breakfast
            elif 'dinner' in meal_type:
                adjusted_targets = {k: v * 1.1 for k, v in meal_targets.items()}
                adjusted_targets['carbs'] *= 0.8   # Lower carbs for dinner
            elif 'snack' in meal_type:
                adjusted_targets = {k: v * 0.6 for k, v in meal_targets.items()}
            else:
                adjusted_targets = meal_targets
            
            # Extract ingredients
            ingredients = meal.get('recipe', {}).get('ingredients', [])
            if ingredients:
                try:
                    optimized_ingredients, achieved_macros = self.optimizer.optimize_meal_smart(
                        ingredients, adjusted_targets
                    )
                    
                    # Update meal
                    optimized_meal = copy.deepcopy(meal)
                    optimized_meal['recipe']['ingredients'] = optimized_ingredients
                    optimized_meal['recipe']['macros'] = achieved_macros
                    
                    optimized_meals.append(optimized_meal)
                    
                    # Add to totals
                    for macro in ["protein", "carbs", "fat", "calories"]:
                        total_achieved[macro] += achieved_macros.get(macro, 0)
                        
                except Exception as e:
                    st.warning(f"Failed to optimize {meal_type}: {str(e)}")
                    optimized_meals.append(meal)
            else:
                optimized_meals.append(meal)
        
        # Generate report
        max_error = 0
        for macro in ["protein", "carbs", "fat", "calories"]:
            target_val = daily_targets.get(macro, 1)
            achieved_val = total_achieved.get(macro, 0)
            if target_val > 0:
                error = abs(achieved_val - target_val) / target_val * 100
                max_error = max(max_error, error)
        
        if max_error <= 1:
            status = "EXCELLENT - ±1% precision achieved!"
        elif max_error <= 3:
            status = "GOOD - Within ±3% tolerance"
        else:
            status = f"IMPROVED - ±{max_error:.1f}% precision"
        
        report = f"Day optimization complete. {status}"
        
        return optimized_meals, total_achieved, report
    
    def _display_optimization_results(self, original_macros: Dict, achieved_macros: Dict, 
                                    target_macros: Dict, original_ingredients: List, 
                                    optimized_ingredients: List):
        """Display optimization results in Streamlit UI"""
        
        st.success("🤖 **Meal Optimized with AI Precision**")
        
        # Show before/after comparison
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown("**Original**")
            for macro in ["protein", "carbs", "fat", "calories"]:
                value = original_macros.get(macro, 0)
                unit = "g" if macro != "calories" else ""
                st.write(f"{macro.title()}: {value:.1f}{unit}")
        
        with col2:
            st.markdown("**Target**")
            for macro in ["protein", "carbs", "fat", "calories"]:
                value = target_macros.get(macro, 0)
                unit = "g" if macro != "calories" else ""
                st.write(f"{macro.title()}: {value:.1f}{unit}")
        
        with col3:
            st.markdown("**Achieved**")
            for macro in ["protein", "carbs", "fat", "calories"]:
                target_val = target_macros.get(macro, 1)
                achieved_val = achieved_macros.get(macro, 0)
                error = abs(achieved_val - target_val) / target_val * 100 if target_val > 0 else 0
                
                if error <= 1:
                    color = "green"
                    status = "✅"
                elif error <= 3:
                    color = "blue"
                    status = "🔵"
                else:
                    color = "orange"
                    status = "⚠️"
                
                unit = "g" if macro != "calories" else ""
                st.markdown(f":{color}[{macro.title()}: {achieved_val:.1f}{unit} {status}]")
        
        # Show precision summary
        max_error = max(abs(achieved_macros.get(macro, 0) - target_macros.get(macro, 1)) / 
                       target_macros.get(macro, 1) * 100 
                       for macro in ["protein", "carbs", "fat", "calories"]
                       if target_macros.get(macro, 1) > 0)
        
        if max_error <= 1:
            st.success(f"🎯 **EXCELLENT**: ±{max_error:.1f}% precision achieved!")
        elif max_error <= 3:
            st.info(f"🎯 **GOOD**: ±{max_error:.1f}% precision (target: ±1%)")
        else:
            st.warning(f"🎯 **IMPROVED**: ±{max_error:.1f}% precision")
        
        # Show ingredient changes
        original_names = [ing.get('name', '') for ing in original_ingredients]
        optimized_names = [ing.get('name', '') for ing in optimized_ingredients]
        
        added_ingredients = [name for name in optimized_names if name not in original_names]
        if added_ingredients:
            st.info(f"**Added ingredients**: {', '.join(added_ingredients)}")
        
        # Show portion adjustments
        portion_changes = []
        for opt_ing in optimized_ingredients:
            opt_name = opt_ing.get('name', '')
            opt_amount = opt_ing.get('amount', '')
            
            # Find original amount
            orig_amount = None
            for orig_ing in original_ingredients:
                if orig_ing.get('name', '') == opt_name:
                    orig_amount = orig_ing.get('amount', '')
                    break
            
            if orig_amount and orig_amount != opt_amount:
                portion_changes.append(f"{opt_name}: {orig_amount} → {opt_amount}")
        
        if portion_changes:
            with st.expander("📏 Portion Adjustments", expanded=False):
                for change in portion_changes[:3]:  # Show first 3
                    st.write(f"• {change}")

def create_enhanced_meal_planner_simple():
    """Factory function to create enhanced meal planner"""
    return EnhancedMealPlannerSimple()