#!/usr/bin/env python3
"""
Enhanced AI Meal Planning with FDC Verification and User Adjustments
"""

import streamlit as st
import pandas as pd
import json
import os
import re
from datetime import datetime
from typing import Dict, List
from openai import OpenAI
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fdc_api import search_foods

st.set_page_config(page_title="Enhanced AI Meal Plan", page_icon="🧠", layout="wide")

# Custom CSS for styling
st.markdown("""
<style>
.accuracy-card {
    padding: 1rem;
    border-radius: 0.5rem;
    margin: 0.5rem 0;
    border-left: 4px solid;
}
.accuracy-perfect { border-left-color: #22c55e; background-color: #dcfce7; }
.accuracy-close { border-left-color: #f59e0b; background-color: #fef3c7; }
.accuracy-needs-fix { border-left-color: #ef4444; background-color: #fee2e2; }

.ingredient-card {
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    margin: 0.25rem 0;
    background-color: #f9fafb;
}

.fdc-verified {
    color: #22c55e;
    font-weight: bold;
}

.meal-header {
    background: linear-gradient(90deg, #1f2937 0%, #374151 100%);
    color: white;
    padding: 1rem;
    border-radius: 0.5rem;
    margin: 1rem 0;
}
</style>
""", unsafe_allow_html=True)

class EnhancedMealPlanner:
    """Enhanced meal planner with FDC verification"""
    
    def __init__(self):
        self.openai_client = self._get_openai_client()
        self.precision_tolerance = 3.0  # ±3% accuracy target
    
    def _get_openai_client(self):
        """Initialize OpenAI client"""
        try:
            api_key = os.environ.get('OPENAI_API_KEY')
            org_id = os.environ.get('OPENAI_ORGANIZATION_ID')
            project_id = os.environ.get('OPENAI_PROJECT_ID')
            
            if api_key:
                return OpenAI(
                    api_key=api_key,
                    organization=org_id,
                    project=project_id
                )
        except Exception as e:
            st.error(f"OpenAI client initialization failed: {e}")
        return None
    
    def get_fdc_nutrition(self, ingredient_name: str, amount_grams: float) -> Dict:
        """Get nutrition data with FDC verification"""
        try:
            # Search FDC database
            search_results = search_foods(ingredient_name, page_size=5)
            
            if search_results and len(search_results) > 0:
                # Use the first result (most relevant)
                food_item = search_results[0]
                nutrition = self._extract_nutrition_from_fdc(food_item, amount_grams)
                nutrition['fdc_verified'] = True
                nutrition['fdc_description'] = food_item.get('description', ingredient_name)
                return nutrition
            
        except Exception as e:
            st.warning(f"FDC lookup failed for {ingredient_name}: {e}")
        
        # Fallback to estimated nutrition
        return self._get_fallback_nutrition(ingredient_name, amount_grams)
    
    def _extract_nutrition_from_fdc(self, food_item: Dict, amount_grams: float) -> Dict:
        """Extract nutrition from FDC food item"""
        nutrition = {
            'name': food_item.get('description', 'Unknown'),
            'amount': f"{amount_grams}g",
            'calories': 0,
            'protein': 0,
            'carbs': 0,
            'fat': 0
        }
        
        # Extract from foodNutrients if available
        nutrients = food_item.get('foodNutrients', [])
        
        nutrient_mapping = {
            1008: 'calories',  # Energy
            1003: 'protein',   # Protein  
            1005: 'carbs',     # Carbohydrates
            1004: 'fat'        # Total lipid (fat)
        }
        
        for nutrient in nutrients:
            nutrient_id = nutrient.get('nutrientId')
            if nutrient_id in nutrient_mapping:
                value = nutrient.get('value', 0)
                # Scale from per 100g to requested amount
                scaled_value = (value * amount_grams) / 100
                nutrition[nutrient_mapping[nutrient_id]] = round(scaled_value, 1)
        
        return nutrition
    
    def _get_fallback_nutrition(self, ingredient_name: str, amount_grams: float) -> Dict:
        """Fallback nutrition estimates"""
        
        # Enhanced fallback database with common foods
        fallback_db = {
            'chicken breast': {'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 3.6},
            'ground turkey': {'calories': 189, 'protein': 27, 'carbs': 0, 'fat': 8},
            'salmon': {'calories': 206, 'protein': 22, 'carbs': 0, 'fat': 12},
            'eggs': {'calories': 155, 'protein': 13, 'carbs': 1, 'fat': 11},
            'greek yogurt': {'calories': 97, 'protein': 10, 'carbs': 4, 'fat': 5},
            'brown rice': {'calories': 123, 'protein': 2.6, 'carbs': 23, 'fat': 0.9},
            'quinoa': {'calories': 120, 'protein': 4.4, 'carbs': 22, 'fat': 1.9},
            'oats': {'calories': 68, 'protein': 2.4, 'carbs': 12, 'fat': 1.4},
            'sweet potato': {'calories': 86, 'protein': 1.6, 'carbs': 20, 'fat': 0.1},
            'broccoli': {'calories': 34, 'protein': 2.8, 'carbs': 7, 'fat': 0.4},
            'spinach': {'calories': 23, 'protein': 2.9, 'carbs': 3.6, 'fat': 0.4},
            'avocado': {'calories': 160, 'protein': 2, 'carbs': 9, 'fat': 15},
            'almonds': {'calories': 576, 'protein': 21, 'carbs': 22, 'fat': 49},
            'olive oil': {'calories': 884, 'protein': 0, 'carbs': 0, 'fat': 100},
            'banana': {'calories': 89, 'protein': 1.1, 'carbs': 23, 'fat': 0.3}
        }
        
        # Find best match
        ingredient_lower = ingredient_name.lower()
        base_nutrition = None
        
        for food_key, nutrition in fallback_db.items():
            if food_key in ingredient_lower or ingredient_lower in food_key:
                base_nutrition = nutrition
                break
        
        if not base_nutrition:
            # Generic fallback
            base_nutrition = {'calories': 100, 'protein': 5, 'carbs': 15, 'fat': 3}
        
        # Scale to requested amount
        scaling_factor = amount_grams / 100
        
        return {
            'name': ingredient_name,
            'amount': f"{amount_grams}g",
            'calories': round(base_nutrition['calories'] * scaling_factor, 1),
            'protein': round(base_nutrition['protein'] * scaling_factor, 1),
            'carbs': round(base_nutrition['carbs'] * scaling_factor, 1),
            'fat': round(base_nutrition['fat'] * scaling_factor, 1),
            'fdc_verified': False
        }
    
    def parse_amount_to_grams(self, amount_str: str) -> float:
        """Parse amount string to grams"""
        # Extract numbers
        numbers = re.findall(r'\d+(?:\.\d+)?', amount_str)
        if not numbers:
            return 100.0
        
        amount = float(numbers[0])
        amount_lower = amount_str.lower()
        
        # Convert to grams
        if 'cup' in amount_lower:
            return amount * 240  # 1 cup ≈ 240g
        elif 'tbsp' in amount_lower or 'tablespoon' in amount_lower:
            return amount * 15
        elif 'tsp' in amount_lower or 'teaspoon' in amount_lower:
            return amount * 5
        elif 'oz' in amount_lower:
            return amount * 28.35
        elif 'lb' in amount_lower or 'pound' in amount_lower:
            return amount * 453.6
        else:
            return amount  # Assume grams
    
    def generate_meal_with_fdc(self, meal_context: Dict, target_macros: Dict) -> Dict:
        """Generate meal with FDC verification"""
        
        if not self.openai_client:
            st.error("OpenAI client not available")
            return {}
        
        # Generate initial meal concept
        prompt = f"""
        Create a single meal for this context:
        
        Meal Type: {meal_context.get('meal_type', 'Main meal')}
        Timing: {meal_context.get('timing', 'Anytime')}
        Context: {meal_context.get('context', 'Regular meal')}
        
        Target Macros:
        - Calories: {target_macros['calories']}
        - Protein: {target_macros['protein']}g
        - Carbs: {target_macros['carbs']}g
        - Fat: {target_macros['fat']}g
        
        Return ONLY JSON:
        {{
            "meal_name": "Descriptive name",
            "ingredients": [
                {{"name": "chicken breast", "amount": "150g"}},
                {{"name": "brown rice", "amount": "100g"}}
            ],
            "instructions": "1. Step one 2. Step two"
        }}
        
        Use common, whole food ingredients. Be specific with amounts.
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a nutrition expert. Return only valid JSON without markdown."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=600,
                temperature=0.1
            )
            
            result = response.choices[0].message.content
            if result:
                result = result.strip()
                result = result.replace('```json', '').replace('```', '').strip()
            else:
                result = '{"meal_name": "Error", "ingredients": [], "instructions": ""}'
            
            meal_concept = json.loads(result)
            
            # Get FDC-verified nutrition for each ingredient
            verified_ingredients = []
            for ingredient in meal_concept['ingredients']:
                amount_grams = self.parse_amount_to_grams(ingredient['amount'])
                nutrition = self.get_fdc_nutrition(ingredient['name'], amount_grams)
                verified_ingredients.append(nutrition)
            
            # Calculate totals
            totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
            for ingredient in verified_ingredients:
                for macro in totals:
                    totals[macro] += ingredient.get(macro, 0)
            
            return {
                'meal_name': meal_concept['meal_name'],
                'ingredients': verified_ingredients,
                'instructions': meal_concept['instructions'],
                'nutrition_totals': totals,
                'fdc_verified_count': sum(1 for ing in verified_ingredients if ing.get('fdc_verified', False))
            }
            
        except Exception as e:
            st.error(f"Error generating meal: {e}")
            return {}

def display_meal_adjuster(meal_data: Dict, target_macros: Dict, meal_key: str) -> Dict:
    """Display interactive meal adjustment interface"""
    
    if not meal_data:
        return {}
    
    st.markdown(f'<div class="meal-header"><h3>🎯 {meal_data["meal_name"]}</h3></div>', unsafe_allow_html=True)
    
    # Initialize adjustments in session state
    if f"{meal_key}_adjustments" not in st.session_state:
        st.session_state[f"{meal_key}_adjustments"] = {
            ing['name']: 1.0 for ing in meal_data['ingredients']
        }
    
    col1, col2 = st.columns([3, 2])
    
    with col1:
        st.markdown("**🔧 Adjust Ingredient Portions:**")
        
        # Ingredient adjustment sliders
        adjusted_ingredients = []
        for ingredient in meal_data['ingredients']:
            ing_name = ingredient['name']
            current_factor = st.session_state[f"{meal_key}_adjustments"].get(ing_name, 1.0)
            
            # FDC verification indicator
            verified_icon = "✅" if ingredient.get('fdc_verified', False) else "📊"
            
            # Create unique key to prevent duplicates
            unique_key = f"{meal_key}_{ing_name.replace(' ', '_').replace('(', '').replace(')', '')}_slider_{hash(str(ingredient))}"
            
            new_factor = st.slider(
                f"{verified_icon} {ing_name} ({ingredient['amount']})",
                min_value=0.1,
                max_value=3.0,
                value=current_factor,
                step=0.05,
                key=unique_key,
                help=f"{'FDC verified nutrition' if ingredient.get('fdc_verified') else 'Estimated nutrition'}"
            )
            
            st.session_state[f"{meal_key}_adjustments"][ing_name] = new_factor
            
            # Calculate adjusted nutrition
            adjusted_ingredient = adjust_ingredient_nutrition(ingredient, new_factor)
            adjusted_ingredients.append(adjusted_ingredient)
    
    with col2:
        # Calculate updated totals
        updated_totals = calculate_meal_totals(adjusted_ingredients)
        
        # Display accuracy
        display_accuracy_comparison(target_macros, updated_totals)
        
        # Quick adjustment buttons
        if st.button(f"🎯 Auto-Adjust", key=f"{meal_key}_auto"):
            auto_adjust_portions(meal_key, target_macros, updated_totals)
            st.rerun()
        
        if st.button(f"🔄 Reset", key=f"{meal_key}_reset"):
            for ing_name in st.session_state[f"{meal_key}_adjustments"]:
                st.session_state[f"{meal_key}_adjustments"][ing_name] = 1.0
            st.rerun()
    
    # Display ingredient details
    st.markdown("**📋 Ingredient Breakdown:**")
    display_ingredient_table(adjusted_ingredients)
    
    return {
        'meal_name': meal_data['meal_name'],
        'ingredients': adjusted_ingredients,
        'instructions': meal_data['instructions'],
        'nutrition_totals': updated_totals,
        'fdc_verified_count': sum(1 for ing in adjusted_ingredients if ing.get('fdc_verified', False))
    }

def adjust_ingredient_nutrition(ingredient: Dict, factor: float) -> Dict:
    """Adjust ingredient nutrition by factor"""
    adjusted = ingredient.copy()
    
    # Parse and adjust amount
    original_amount = float(ingredient['amount'].replace('g', ''))
    new_amount = original_amount * factor
    adjusted['amount'] = f"{new_amount:.0f}g"
    
    # Adjust nutrition values
    for nutrient in ['calories', 'protein', 'carbs', 'fat']:
        if nutrient in adjusted:
            adjusted[nutrient] = round(adjusted[nutrient] * factor, 1)
    
    return adjusted

def calculate_meal_totals(ingredients: List[Dict]) -> Dict:
    """Calculate total nutrition from ingredients"""
    totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
    
    for ingredient in ingredients:
        for nutrient in totals:
            totals[nutrient] += ingredient.get(nutrient, 0)
    
    return {k: round(v, 1) for k, v in totals.items()}

def display_accuracy_comparison(targets: Dict, actuals: Dict):
    """Display accuracy comparison with styling"""
    st.markdown("**📊 Macro Accuracy:**")
    
    for macro in ['calories', 'protein', 'carbs', 'fat']:
        target = targets.get(macro, 0)
        actual = actuals.get(macro, 0)
        
        if target > 0:
            deviation = ((actual - target) / target) * 100
            if abs(deviation) <= 3:
                status_class = "accuracy-perfect"
                status_text = "Perfect"
            elif abs(deviation) <= 8:
                status_class = "accuracy-close"
                status_text = "Close"
            else:
                status_class = "accuracy-needs-fix"
                status_text = "Needs Fix"
        else:
            deviation = 0
            status_class = "accuracy-perfect"
            status_text = "Perfect"
        
        unit = "" if macro == "calories" else "g"
        
        st.markdown(f'''
        <div class="accuracy-card {status_class}">
            <strong>{macro.title()}:</strong> {actual}{unit} / {target}{unit} 
            ({deviation:+.1f}%) - {status_text}
        </div>
        ''', unsafe_allow_html=True)

def display_ingredient_table(ingredients: List[Dict]):
    """Display detailed ingredient table"""
    data = []
    for ing in ingredients:
        verified_status = "✅ FDC" if ing.get('fdc_verified', False) else "📊 Est"
        data.append({
            'Ingredient': ing['name'],
            'Amount': ing['amount'],
            'Calories': ing.get('calories', 0),
            'Protein (g)': ing.get('protein', 0),
            'Carbs (g)': ing.get('carbs', 0),
            'Fat (g)': ing.get('fat', 0),
            'Source': verified_status
        })
    
    df = pd.DataFrame(data)
    st.dataframe(df, use_container_width=True, hide_index=True)

def auto_adjust_portions(meal_key: str, targets: Dict, actuals: Dict):
    """Auto-adjust ingredient portions to hit targets"""
    # Calculate scaling factors
    scaling_factors = []
    for macro in ['calories', 'protein', 'carbs', 'fat']:
        if actuals.get(macro, 0) > 0 and targets.get(macro, 0) > 0:
            factor = targets[macro] / actuals[macro]
            scaling_factors.append(factor)
    
    if scaling_factors:
        avg_scaling = sum(scaling_factors) / len(scaling_factors)
        
        # Apply to all ingredients
        for ing_name in st.session_state[f"{meal_key}_adjustments"]:
            current = st.session_state[f"{meal_key}_adjustments"][ing_name]
            st.session_state[f"{meal_key}_adjustments"][ing_name] = current * avg_scaling

# Main App
def main():
    st.title("🎯 Enhanced AI Meal Planning")
    st.markdown("**FDC-verified nutrition with interactive adjustments for perfect macro accuracy**")
    
    # Initialize planner
    planner = EnhancedMealPlanner()
    
    if not planner.openai_client:
        st.error("OpenAI API not configured. Please check your API keys.")
        st.stop()
    
    # Add demo meal for immediate testing
    if st.button("🚀 Load Demo Meal for Testing", type="secondary"):
        demo_meal = {
            'meal_name': 'Grilled Chicken & Rice Bowl',
            'ingredients': [
                {'name': 'chicken breast', 'amount': '150g', 'calories': 247, 'protein': 46, 'carbs': 0, 'fat': 5, 'fdc_verified': True},
                {'name': 'brown rice', 'amount': '100g', 'calories': 123, 'protein': 3, 'carbs': 23, 'fat': 1, 'fdc_verified': True},
                {'name': 'broccoli', 'amount': '80g', 'calories': 27, 'protein': 2, 'carbs': 6, 'fat': 0, 'fdc_verified': True},
                {'name': 'olive oil', 'amount': '10g', 'calories': 88, 'protein': 0, 'carbs': 0, 'fat': 10, 'fdc_verified': True}
            ],
            'instructions': 'Grill chicken, steam rice, sauté broccoli with olive oil.',
            'fdc_verified_count': 4
        }
        
        demo_targets = {
            'calories': 600,
            'protein': 45,
            'carbs': 60,
            'fat': 15
        }
        
        st.session_state['generated_meal'] = demo_meal
        st.session_state['target_macros'] = demo_targets
        st.success("Demo meal loaded! Scroll down to see adjustment controls.")
        st.rerun()
    
    # Sample meal generation
    with st.expander("🎯 Generate Sample Meal", expanded=True):
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**Meal Context:**")
            meal_type = st.selectbox("Meal Type", ["Breakfast", "Lunch", "Dinner", "Snack", "Post-workout"])
            timing = st.selectbox("Timing", ["Pre-workout", "Post-workout", "Regular", "Late night"])
            
        with col2:
            st.markdown("**Target Macros:**")
            target_calories = st.number_input("Calories", value=600, min_value=100, max_value=2000)
            target_protein = st.number_input("Protein (g)", value=35, min_value=5, max_value=150)
            target_carbs = st.number_input("Carbs (g)", value=60, min_value=5, max_value=300)
            target_fat = st.number_input("Fat (g)", value=20, min_value=5, max_value=150)
        
        if st.button("🚀 Generate Enhanced Meal", type="primary"):
            meal_context = {
                'meal_type': meal_type,
                'timing': timing,
                'context': f"{timing} {meal_type.lower()}"
            }
            
            target_macros = {
                'calories': target_calories,
                'protein': target_protein,
                'carbs': target_carbs,
                'fat': target_fat
            }
            
            with st.spinner("Generating meal with FDC verification..."):
                meal_data = planner.generate_meal_with_fdc(meal_context, target_macros)
            
            if meal_data:
                st.session_state['generated_meal'] = meal_data
                st.session_state['target_macros'] = target_macros
                st.success(f"✅ Generated {meal_data['meal_name']} with {meal_data['fdc_verified_count']}/{len(meal_data['ingredients'])} FDC-verified ingredients")
    
    # Always display adjustment interface if meal exists
    if 'generated_meal' in st.session_state and 'target_macros' in st.session_state:
        st.markdown("---")
        st.markdown("## 🎯 Interactive Meal Adjustment")
        st.info("Use the sliders below to adjust ingredient portions and hit your exact macro targets!")
        
        adjusted_meal = display_meal_adjuster(
            st.session_state['generated_meal'], 
            st.session_state['target_macros'], 
            'sample_meal'
        )
        
        # Export options
        if adjusted_meal:
            st.markdown("---")
            col1, col2, col3 = st.columns(3)
            
            with col1:
                if st.button("📄 Export Recipe"):
                    recipe_text = f"""
# {adjusted_meal['meal_name']}

## Ingredients:
"""
                    for ing in adjusted_meal['ingredients']:
                        source = "✅ FDC verified" if ing.get('fdc_verified') else "📊 Estimated"
                        recipe_text += f"- {ing['amount']} {ing['name']} ({source})\n"
                    
                    recipe_text += f"\n## Instructions:\n{adjusted_meal['instructions']}\n"
                    recipe_text += f"\n## Nutrition:\n"
                    recipe_text += f"- Calories: {adjusted_meal['nutrition_totals']['calories']}\n"
                    recipe_text += f"- Protein: {adjusted_meal['nutrition_totals']['protein']}g\n"
                    recipe_text += f"- Carbs: {adjusted_meal['nutrition_totals']['carbs']}g\n"
                    recipe_text += f"- Fat: {adjusted_meal['nutrition_totals']['fat']}g\n"
                    
                    st.download_button(
                        "Download Recipe",
                        recipe_text,
                        f"{adjusted_meal['meal_name'].replace(' ', '_')}_recipe.txt",
                        "text/plain"
                    )
            
            with col2:
                st.metric("FDC Verified", f"{adjusted_meal['fdc_verified_count']}/{len(adjusted_meal['ingredients'])}")
            
            with col3:
                accuracy_score = calculate_overall_accuracy(st.session_state['target_macros'], adjusted_meal['nutrition_totals'])
                st.metric("Accuracy Score", f"{accuracy_score:.1f}%")

def calculate_overall_accuracy(targets: Dict, actuals: Dict) -> float:
    """Calculate overall accuracy score"""
    deviations = []
    for macro in ['calories', 'protein', 'carbs', 'fat']:
        if targets.get(macro, 0) > 0:
            deviation = abs((actuals.get(macro, 0) - targets[macro]) / targets[macro]) * 100
            deviations.append(min(deviation, 100))  # Cap at 100%
    
    if deviations:
        avg_deviation = sum(deviations) / len(deviations)
        return max(0, 100 - avg_deviation)
    return 100

if __name__ == "__main__":
    main()