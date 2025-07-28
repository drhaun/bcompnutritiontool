#!/usr/bin/env python3
"""
Interactive Meal Adjustment System for Precise Macro Targeting
"""

import streamlit as st
import pandas as pd
from typing import Dict, List
import json

class MealAdjuster:
    """Interactive system for adjusting meal portions to hit exact macro targets"""
    
    def __init__(self):
        self.precision_tolerance = 2.0  # ±2% accuracy target
    
    def display_meal_with_adjustments(self, meal_data: Dict, target_macros: Dict, meal_key: str):
        """Display meal with interactive adjustment controls"""
        
        st.subheader(f"🎯 {meal_data['meal_name']} - Macro Adjustment")
        
        # Initialize session state for adjustments
        if f"{meal_key}_adjustments" not in st.session_state:
            st.session_state[f"{meal_key}_adjustments"] = {
                ing['name']: 1.0 for ing in meal_data['ingredients']
            }
        
        # Create columns for layout
        col1, col2 = st.columns([3, 2])
        
        with col1:
            st.markdown("**Adjust Ingredient Portions:**")
            
            # Display ingredients with adjustment sliders
            adjusted_ingredients = []
            for ingredient in meal_data['ingredients']:
                ing_name = ingredient['name']
                
                # Get current adjustment factor
                current_factor = st.session_state[f"{meal_key}_adjustments"].get(ing_name, 1.0)
                
                # Create slider for adjustment
                new_factor = st.slider(
                    f"{ing_name} ({ingredient['amount']})",
                    min_value=0.1,
                    max_value=3.0,
                    value=current_factor,
                    step=0.1,
                    key=f"{meal_key}_{ing_name}_slider",
                    help=f"Adjust portion size (1.0 = original amount)"
                )
                
                # Update session state
                st.session_state[f"{meal_key}_adjustments"][ing_name] = new_factor
                
                # Calculate adjusted nutrition
                adjusted_ingredient = self._adjust_ingredient_nutrition(ingredient, new_factor)
                adjusted_ingredients.append(adjusted_ingredient)
        
        with col2:
            # Calculate and display updated totals
            updated_totals = self._calculate_meal_totals(adjusted_ingredients)
            
            # Display accuracy comparison
            self._display_accuracy_table(target_macros, updated_totals)
            
            # Quick adjustment buttons
            self._display_quick_adjustments(meal_key, target_macros, updated_totals)
        
        # Display detailed ingredient table
        st.markdown("---")
        st.markdown("**Adjusted Ingredient Breakdown:**")
        self._display_ingredient_table(adjusted_ingredients)
        
        return {
            'meal_name': meal_data['meal_name'],
            'ingredients': adjusted_ingredients,
            'instructions': meal_data['instructions'],
            'nutrition_totals': updated_totals,
            'adjustments_applied': st.session_state[f"{meal_key}_adjustments"]
        }
    
    def _adjust_ingredient_nutrition(self, ingredient: Dict, factor: float) -> Dict:
        """Adjust ingredient nutrition based on portion factor"""
        adjusted = ingredient.copy()
        
        # Parse original amount
        original_amount = float(ingredient['amount'].replace('g', ''))
        new_amount = original_amount * factor
        adjusted['amount'] = f"{new_amount:.0f}g"
        
        # Adjust all nutrition values
        for nutrient in ['calories', 'protein', 'carbs', 'fat']:
            if nutrient in adjusted:
                adjusted[nutrient] = round(adjusted[nutrient] * factor, 1)
        
        return adjusted
    
    def _calculate_meal_totals(self, ingredients: List[Dict]) -> Dict:
        """Calculate total nutrition from adjusted ingredients"""
        totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
        
        for ingredient in ingredients:
            for nutrient in totals:
                if nutrient in ingredient:
                    totals[nutrient] += ingredient[nutrient]
        
        return {k: round(v, 1) for k, v in totals.items()}
    
    def _display_accuracy_table(self, targets: Dict, actuals: Dict):
        """Display accuracy comparison table"""
        st.markdown("**📊 Macro Accuracy:**")
        
        accuracy_data = []
        for macro in ['calories', 'protein', 'carbs', 'fat']:
            target = targets.get(macro, 0)
            actual = actuals.get(macro, 0)
            
            if target > 0:
                deviation = ((actual - target) / target) * 100
                status = "✅ Perfect" if abs(deviation) <= self.precision_tolerance else (
                    "⚠️ Close" if abs(deviation) <= 5 else "❌ Needs Fix"
                )
            else:
                deviation = 0
                status = "✅ Perfect"
            
            accuracy_data.append({
                'Macro': macro.title(),
                'Target': f"{target}{'' if macro == 'calories' else 'g'}",
                'Actual': f"{actual}{'' if macro == 'calories' else 'g'}",
                'Deviation': f"{deviation:+.1f}%",
                'Status': status
            })
        
        df = pd.DataFrame(accuracy_data)
        st.dataframe(df, use_container_width=True, hide_index=True)
    
    def _display_quick_adjustments(self, meal_key: str, targets: Dict, actuals: Dict):
        """Display quick adjustment buttons"""
        st.markdown("**⚡ Quick Adjustments:**")
        
        # Auto-adjust button
        if st.button(f"🎯 Auto-Adjust to Targets", key=f"{meal_key}_auto_adjust"):
            self._auto_adjust_to_targets(meal_key, targets, actuals)
            st.rerun()
        
        # Reset button
        if st.button(f"🔄 Reset All Portions", key=f"{meal_key}_reset"):
            for ing_name in st.session_state[f"{meal_key}_adjustments"]:
                st.session_state[f"{meal_key}_adjustments"][ing_name] = 1.0
            st.rerun()
        
        # Precision info
        st.info(f"🎯 Target: ±{self.precision_tolerance}% accuracy")
    
    def _auto_adjust_to_targets(self, meal_key: str, targets: Dict, actuals: Dict):
        """Automatically adjust portions to hit targets"""
        # Calculate average scaling factor needed
        scaling_factors = []
        for macro in ['calories', 'protein', 'carbs', 'fat']:
            if actuals.get(macro, 0) > 0 and targets.get(macro, 0) > 0:
                factor = targets[macro] / actuals[macro]
                scaling_factors.append(factor)
        
        if scaling_factors:
            avg_scaling = sum(scaling_factors) / len(scaling_factors)
            
            # Apply scaling to all ingredients
            for ing_name in st.session_state[f"{meal_key}_adjustments"]:
                current_factor = st.session_state[f"{meal_key}_adjustments"][ing_name]
                st.session_state[f"{meal_key}_adjustments"][ing_name] = current_factor * avg_scaling
    
    def _display_ingredient_table(self, ingredients: List[Dict]):
        """Display detailed ingredient breakdown table"""
        ingredient_data = []
        for ing in ingredients:
            ingredient_data.append({
                'Ingredient': ing['name'],
                'Amount': ing['amount'],
                'Calories': ing.get('calories', 0),
                'Protein (g)': ing.get('protein', 0),
                'Carbs (g)': ing.get('carbs', 0),
                'Fat (g)': ing.get('fat', 0),
                'Verified': "✓" if ing.get('fdc_verified', False) else "○"
            })
        
        df = pd.DataFrame(ingredient_data)
        st.dataframe(df, use_container_width=True, hide_index=True)

def test_meal_adjuster():
    """Test the meal adjuster with sample data"""
    
    # Sample meal data
    sample_meal = {
        'meal_name': 'Grilled Chicken with Rice and Vegetables',
        'ingredients': [
            {'name': 'chicken breast', 'amount': '150g', 'calories': 247, 'protein': 46, 'carbs': 0, 'fat': 5, 'fdc_verified': True},
            {'name': 'brown rice', 'amount': '100g', 'calories': 123, 'protein': 3, 'carbs': 23, 'fat': 1, 'fdc_verified': True},
            {'name': 'broccoli', 'amount': '80g', 'calories': 27, 'protein': 2, 'carbs': 6, 'fat': 0, 'fdc_verified': True},
            {'name': 'olive oil', 'amount': '10g', 'calories': 88, 'protein': 0, 'carbs': 0, 'fat': 10, 'fdc_verified': True}
        ],
        'instructions': 'Grill chicken, steam rice, sauté vegetables with olive oil.'
    }
    
    target_macros = {
        'calories': 600,
        'protein': 45,
        'carbs': 60,
        'fat': 15
    }
    
    st.title("🍽️ Meal Adjuster Test")
    
    adjuster = MealAdjuster()
    adjusted_meal = adjuster.display_meal_with_adjustments(sample_meal, target_macros, "test_meal")
    
    st.markdown("---")
    st.markdown("**Final Adjusted Meal:**")
    st.json(adjusted_meal)

if __name__ == "__main__":
    test_meal_adjuster()