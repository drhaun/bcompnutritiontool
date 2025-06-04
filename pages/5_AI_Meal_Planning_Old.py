import streamlit as st
import pandas as pd
import json
import sys
import os
import random
import math
from datetime import datetime, date

# Import utilities
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/../'))
import utils

st.set_page_config(page_title="AI Meal Planner", page_icon="🤖", layout="wide")

# Load Fitomics recipes
@st.cache_data
def load_fitomics_recipes():
    try:
        with open('data/fitomics_recipes.json', 'r') as f:
            recipes = json.load(f)
            return recipes
    except Exception as e:
        st.error(f"Error loading recipes: {str(e)}")
        return []

def calculate_recipe_macros(recipe, serving_multiplier=1.0):
    """Calculate macros for a recipe with serving adjustment"""
    try:
        base_calories = recipe.get('estimated_macros', {}).get('calories', 0)
        base_protein = recipe.get('estimated_macros', {}).get('protein', 0)
        base_carbs = recipe.get('estimated_macros', {}).get('carbs', 0)
        base_fat = recipe.get('estimated_macros', {}).get('fat', 0)
        
        return {
            'calories': int(base_calories * serving_multiplier),
            'protein': int(base_protein * serving_multiplier),
            'carbs': int(base_carbs * serving_multiplier),
            'fat': int(base_fat * serving_multiplier)
        }
    except:
        return {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}

def get_macro_additions():
    """Get common macro addition options"""
    return {
        'protein': [
            {'name': 'Protein Powder (1 scoop)', 'calories': 120, 'protein': 25, 'carbs': 2, 'fat': 1},
            {'name': 'Greek Yogurt (100g)', 'calories': 100, 'protein': 10, 'carbs': 4, 'fat': 0},
            {'name': 'Chicken Breast (100g)', 'calories': 165, 'protein': 31, 'carbs': 0, 'fat': 4},
            {'name': 'Egg (1 large)', 'calories': 70, 'protein': 6, 'carbs': 1, 'fat': 5}
        ],
        'carbs': [
            {'name': 'White Rice (50g dry)', 'calories': 180, 'protein': 4, 'carbs': 38, 'fat': 1},
            {'name': 'Banana (1 medium)', 'calories': 105, 'protein': 1, 'carbs': 27, 'fat': 0},
            {'name': 'Oats (40g dry)', 'calories': 150, 'protein': 5, 'carbs': 27, 'fat': 3},
            {'name': 'Sweet Potato (100g)', 'calories': 86, 'protein': 2, 'carbs': 20, 'fat': 0}
        ],
        'fat': [
            {'name': 'Olive Oil (1 tbsp)', 'calories': 120, 'protein': 0, 'carbs': 0, 'fat': 14},
            {'name': 'Almonds (28g)', 'calories': 164, 'protein': 6, 'carbs': 6, 'fat': 14},
            {'name': 'Avocado (50g)', 'calories': 80, 'protein': 1, 'carbs': 4, 'fat': 7},
            {'name': 'Peanut Butter (1 tbsp)', 'calories': 95, 'protein': 4, 'carbs': 3, 'fat': 8}
        ]
    }

def find_best_recipes_for_meal(recipes, meal_type, target_macros, diet_prefs):
    """Find the best matching recipes for a specific meal and macro target"""
    suitable_recipes = []
    
    for recipe in recipes:
        # Filter by meal type
        recipe_category = recipe.get('category', '').lower()
        
        # Map meal types to recipe categories
        if meal_type.lower() == 'breakfast' and 'breakfast' not in recipe_category:
            continue
        elif meal_type.lower() == 'lunch' and recipe_category not in ['dinner', 'main']:
            continue
        elif meal_type.lower() == 'dinner' and recipe_category not in ['dinner', 'main']:
            continue
        elif meal_type.lower() == 'snack' and recipe_category not in ['snack', 'dessert']:
            continue
            
        # Check diet preferences
        recipe_title = recipe.get('title', '').lower()
        recipe_ingredients = recipe.get('ingredients', [])
        ingredients_text = ' '.join(recipe_ingredients).lower() if recipe_ingredients else ''
        
        # Skip if doesn't match dietary restrictions
        if diet_prefs.get('vegetarian') and any(meat in recipe_title + ingredients_text for meat in ['chicken', 'beef', 'pork', 'fish', 'salmon']):
            continue
        if diet_prefs.get('vegan') and any(dairy in recipe_title + ingredients_text for dairy in ['cheese', 'milk', 'butter', 'egg']):
            continue
        if diet_prefs.get('gluten_free') and any(gluten in recipe_title + ingredients_text for gluten in ['wheat', 'flour', 'bread']):
            continue
            
        # Calculate how well it matches target macros
        recipe_macros = recipe.get('estimated_macros', {})
        if recipe_macros:
            # Calculate match score based on how close the macros are to target
            calorie_diff = abs(recipe_macros.get('calories', 0) - target_macros['calories'])
            protein_diff = abs(recipe_macros.get('protein', 0) - target_macros['protein'])
            
            # Prefer recipes that are closer to target calories and protein
            match_score = 1000 - (calorie_diff * 0.5 + protein_diff * 2)
            
            suitable_recipes.append({
                'recipe': recipe,
                'match_score': match_score,
                'macros': recipe_macros
            })
    
    # Sort by match score and return top 3
    suitable_recipes.sort(key=lambda x: x['match_score'], reverse=True)
    return suitable_recipes[:3]

# Header
st.title("🤖 AI Meal Planner")
st.markdown("*Intelligent meal planning using authentic Fitomics recipes*")

# Check for required data
if 'user_info' not in st.session_state or not st.session_state.user_info.get('gender'):
    st.warning("Please complete your setup in Initial Setup first.")
    st.stop()

if 'diet_preferences' not in st.session_state:
    st.warning("Please complete your diet preferences first.")
    st.stop()

# Check if day-specific nutrition targets exist
if 'day_specific_nutrition' not in st.session_state or not st.session_state.day_specific_nutrition:
    st.warning("Please set up your day-specific nutrition targets in Weekly Schedule and Nutrition first.")
    
    # Add button to sync nutrition targets
    if st.button("Sync Nutrition Targets", type="primary"):
        st.info("Please go to Weekly Schedule and Nutrition to set up your daily nutrition targets first.")
    st.stop()

# Load recipes
recipes = load_fitomics_recipes()
if not recipes:
    st.error("Unable to load recipe database. Please refresh the page.")
    st.stop()

# Get user preferences
diet_prefs = st.session_state.diet_preferences

# Day-based meal planning interface
st.subheader("📅 Weekly Meal Plan")

# Day selector
days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
selected_day = st.selectbox("Select day to plan meals:", days_of_week)

# Get nutrition targets for selected day
day_nutrition = st.session_state.day_specific_nutrition.get(selected_day, {})
if not day_nutrition:
    st.warning(f"No nutrition targets set for {selected_day}. Please set up your nutrition targets first.")
    st.stop()

# Display day's nutrition targets
st.markdown(f"### Nutrition Targets for {selected_day}")
target_cols = st.columns(4)

with target_cols[0]:
    st.metric("Calories", f"{day_nutrition.get('target_calories', 0)}")
with target_cols[1]:
    st.metric("Protein", f"{day_nutrition.get('protein', 0)}g")
with target_cols[2]:
    st.metric("Carbs", f"{day_nutrition.get('carbs', 0)}g")
with target_cols[3]:
    st.metric("Fat", f"{day_nutrition.get('fat', 0)}g")

# Initialize meal plan storage
if 'meal_plans' not in st.session_state:
    st.session_state.meal_plans = {}

if selected_day not in st.session_state.meal_plans:
    st.session_state.meal_plans[selected_day] = {
        'breakfast': {'recipes': [], 'additions': []},
        'lunch': {'recipes': [], 'additions': []},
        'dinner': {'recipes': [], 'additions': []},
        'snack': {'recipes': [], 'additions': []}
    }

# Meal planning interface
st.markdown("---")
st.markdown("### Plan Your Meals")

# Calculate target macros per meal (rough distribution)
total_calories = day_nutrition.get('target_calories', 2000)
total_protein = day_nutrition.get('protein', 150)
total_carbs = day_nutrition.get('carbs', 200)
total_fat = day_nutrition.get('fat', 70)

# Typical meal distribution
meal_distributions = {
    'breakfast': 0.25,
    'lunch': 0.35,
    'dinner': 0.35,
    'snack': 0.05
}

# Meal tabs
meal_tabs = st.tabs(["🍳 Breakfast", "🥗 Lunch", "🍽️ Dinner", "🍎 Snack"])

for i, (meal_type, tab) in enumerate(zip(['breakfast', 'lunch', 'dinner', 'snack'], meal_tabs)):
    with tab:
        # Calculate target macros for this meal
        meal_target = {
            'calories': int(total_calories * meal_distributions[meal_type]),
            'protein': int(total_protein * meal_distributions[meal_type]),
            'carbs': int(total_carbs * meal_distributions[meal_type]),
            'fat': int(total_fat * meal_distributions[meal_type])
        }
        
        st.markdown(f"**Target for {meal_type.title()}:** {meal_target['calories']} cal | {meal_target['protein']}g protein | {meal_target['carbs']}g carbs | {meal_target['fat']}g fat")
        
        # Find recommended recipes
        recommended_recipes = find_best_recipes_for_meal(recipes, meal_type, meal_target, diet_prefs)
        
        if recommended_recipes:
            st.markdown("#### Recommended Recipes")
            
            # Display recipe options
            for j, rec_data in enumerate(recommended_recipes):
                recipe = rec_data['recipe']
                recipe_macros = rec_data['macros']
                
                with st.expander(f"Option {j+1}: {recipe.get('title', 'Untitled Recipe')}", expanded=(j==0)):
                    col1, col2 = st.columns([2, 1])
                    
                    with col1:
                        # Recipe details
                        st.write(f"**Category:** {recipe.get('category', 'N/A')}")
                        if recipe.get('ingredients'):
                            st.write("**Key Ingredients:**")
                            ingredients = recipe['ingredients'][:5] if len(recipe['ingredients']) > 5 else recipe['ingredients']
                            for ingredient in ingredients:
                                st.write(f"• {ingredient}")
                        
                        # Serving adjustment
                        st.markdown("**Adjust Serving Size:**")
                        serving_multiplier = st.slider(
                            "Serving multiplier",
                            min_value=0.25,
                            max_value=3.0,
                            value=1.0,
                            step=0.25,
                            key=f"serving_{selected_day}_{meal_type}_{j}"
                        )
                        
                        # Calculate adjusted macros
                        adjusted_macros = calculate_recipe_macros(recipe, serving_multiplier)
                        
                        st.write(f"**Adjusted Nutrition:** {adjusted_macros['calories']} cal | {adjusted_macros['protein']}g protein | {adjusted_macros['carbs']}g carbs | {adjusted_macros['fat']}g fat")
                        
                        # Macro gap analysis
                        cal_gap = meal_target['calories'] - adjusted_macros['calories']
                        protein_gap = meal_target['protein'] - adjusted_macros['protein']
                        carb_gap = meal_target['carbs'] - adjusted_macros['carbs']
                        fat_gap = meal_target['fat'] - adjusted_macros['fat']
                        
                        if abs(cal_gap) > 50 or abs(protein_gap) > 5:
                            st.markdown("**Macro Gap Analysis:**")
                            if cal_gap > 50:
                                st.write(f"🔴 Need {cal_gap} more calories")
                            elif cal_gap < -50:
                                st.write(f"🟡 {abs(cal_gap)} calories over target")
                            
                            if protein_gap > 5:
                                st.write(f"🔴 Need {protein_gap}g more protein")
                            elif protein_gap < -5:
                                st.write(f"🟡 {abs(protein_gap)}g protein over target")
                            
                            # Suggest additions
                            st.markdown("**Suggested Additions:**")
                            macro_additions = get_macro_additions()
                            
                            if protein_gap > 5:
                                for addition in macro_additions['protein'][:2]:
                                    if addition['protein'] >= protein_gap * 0.5:
                                        st.write(f"• {addition['name']} (+{addition['calories']} cal, +{addition['protein']}g protein)")
                            
                            if carb_gap > 10:
                                for addition in macro_additions['carbs'][:2]:
                                    if addition['carbs'] >= carb_gap * 0.5:
                                        st.write(f"• {addition['name']} (+{addition['calories']} cal, +{addition['carbs']}g carbs)")
                            
                            if fat_gap > 5:
                                for addition in macro_additions['fat'][:2]:
                                    if addition['fat'] >= fat_gap * 0.5:
                                        st.write(f"• {addition['name']} (+{addition['calories']} cal, +{addition['fat']}g fat)")
                    
                    with col2:
                        # Add to meal plan button
                        if st.button(f"Add to {meal_type.title()}", key=f"add_{selected_day}_{meal_type}_{j}"):
                            # Store the selected recipe and serving size
                            meal_plan_entry = {
                                'recipe': recipe,
                                'serving_multiplier': serving_multiplier,
                                'adjusted_macros': adjusted_macros
                            }
                            
                            st.session_state.meal_plans[selected_day][meal_type]['recipes'].append(meal_plan_entry)
                            st.success(f"Added {recipe.get('title')} to {meal_type}!")
                            st.rerun()
        else:
            st.info(f"No suitable {meal_type} recipes found. Try adjusting your dietary preferences or check back as we add more recipes.")
        
        # Display current meal plan for this meal
        current_meal_recipes = st.session_state.meal_plans[selected_day][meal_type]['recipes']
        if current_meal_recipes:
            st.markdown("#### Current Meal Plan")
            total_meal_macros = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
            
            for k, meal_entry in enumerate(current_meal_recipes):
                recipe = meal_entry['recipe']
                macros = meal_entry['adjusted_macros']
                
                # Add to total
                for macro in total_meal_macros:
                    total_meal_macros[macro] += macros[macro]
                
                col1, col2 = st.columns([3, 1])
                with col1:
                    st.write(f"**{recipe.get('title')}** (x{meal_entry['serving_multiplier']})")
                    st.write(f"{macros['calories']} cal | {macros['protein']}g protein | {macros['carbs']}g carbs | {macros['fat']}g fat")
                
                with col2:
                    if st.button("Remove", key=f"remove_{selected_day}_{meal_type}_{k}"):
                        st.session_state.meal_plans[selected_day][meal_type]['recipes'].pop(k)
                        st.rerun()
            
            # Show meal totals vs targets
            st.markdown("**Meal Totals vs Targets:**")
            macro_comparison_cols = st.columns(4)
            
            with macro_comparison_cols[0]:
                cal_diff = total_meal_macros['calories'] - meal_target['calories']
                color = "🟢" if abs(cal_diff) <= 50 else "🟡" if abs(cal_diff) <= 100 else "🔴"
                st.write(f"{color} {total_meal_macros['calories']}/{meal_target['calories']} cal ({cal_diff:+d})")
            
            with macro_comparison_cols[1]:
                protein_diff = total_meal_macros['protein'] - meal_target['protein']
                color = "🟢" if abs(protein_diff) <= 5 else "🟡" if abs(protein_diff) <= 10 else "🔴"
                st.write(f"{color} {total_meal_macros['protein']}/{meal_target['protein']}g protein ({protein_diff:+d}g)")
            
            with macro_comparison_cols[2]:
                carb_diff = total_meal_macros['carbs'] - meal_target['carbs']
                color = "🟢" if abs(carb_diff) <= 10 else "🟡" if abs(carb_diff) <= 20 else "🔴"
                st.write(f"{color} {total_meal_macros['carbs']}/{meal_target['carbs']}g carbs ({carb_diff:+d}g)")
            
            with macro_comparison_cols[3]:
                fat_diff = total_meal_macros['fat'] - meal_target['fat']
                color = "🟢" if abs(fat_diff) <= 5 else "🟡" if abs(fat_diff) <= 10 else "🔴"
                st.write(f"{color} {total_meal_macros['fat']}/{meal_target['fat']}g fat ({fat_diff:+d}g)")

# Daily summary
st.markdown("---")
st.markdown("### Daily Summary")

# Calculate total daily macros from meal plan
daily_totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
day_meal_plan = st.session_state.meal_plans.get(selected_day, {})

for meal_type in ['breakfast', 'lunch', 'dinner', 'snack']:
    meal_recipes = day_meal_plan.get(meal_type, {}).get('recipes', [])
    for meal_entry in meal_recipes:
        macros = meal_entry['adjusted_macros']
        for macro in daily_totals:
            daily_totals[macro] += macros[macro]

# Display daily totals vs targets
summary_cols = st.columns(4)

with summary_cols[0]:
    cal_diff = daily_totals['calories'] - total_calories
    color = "🟢" if abs(cal_diff) <= 100 else "🟡" if abs(cal_diff) <= 200 else "🔴"
    st.metric("Daily Calories", f"{daily_totals['calories']}/{total_calories}", f"{cal_diff:+d}")

with summary_cols[1]:
    protein_diff = daily_totals['protein'] - total_protein
    color = "🟢" if abs(protein_diff) <= 10 else "🟡" if abs(protein_diff) <= 20 else "🔴"
    st.metric("Daily Protein", f"{daily_totals['protein']}/{total_protein}g", f"{protein_diff:+d}g")

with summary_cols[2]:
    carb_diff = daily_totals['carbs'] - total_carbs
    color = "🟢" if abs(carb_diff) <= 20 else "🟡" if abs(carb_diff) <= 40 else "🔴"
    st.metric("Daily Carbs", f"{daily_totals['carbs']}/{total_carbs}g", f"{carb_diff:+d}g")

with summary_cols[3]:
    fat_diff = daily_totals['fat'] - total_fat
    color = "🟢" if abs(fat_diff) <= 10 else "🟡" if abs(fat_diff) <= 20 else "🔴"
    st.metric("Daily Fat", f"{daily_totals['fat']}/{total_fat}g", f"{fat_diff:+d}g")

# Export options
if any(st.session_state.meal_plans.get(day, {}).get(meal, {}).get('recipes', []) for day in days_of_week for meal in ['breakfast', 'lunch', 'dinner', 'snack']):
    st.markdown("---")
    st.markdown("### Export Options")
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("📋 Generate Grocery List", type="secondary"):
            st.info("Grocery list generation coming soon!")
    
    with col2:
        if st.button("📄 Export PDF Meal Plan", type="primary"):
            st.info("PDF export with branded meal plan coming soon!")



# Display meal plan
if date_key in st.session_state.ai_meal_plans and st.session_state.ai_meal_plans[date_key]:
    st.subheader(f"🍽️ Your Fitomics Meal Plan for {selected_date.strftime('%B %d, %Y')}")
    
    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0
    grocery_list = []
    
    for meal_name, meal_data in st.session_state.ai_meal_plans[date_key].items():
        recipe = meal_data.get('recipe')
        portion_multiplier = meal_data.get('portion_multiplier', 1.0)
        target_cal = meal_data.get('target_calories', 0)
        
        with st.expander(f"🍴 {meal_name} - Target: {target_cal} calories", expanded=True):
            if recipe and recipe.get('nutrition'):
                st.markdown(f"**{recipe['title']}**")
                st.markdown(f"*Portion: {portion_multiplier:.1f}x serving*")
                
                # Calculate actual nutrition
                nutrition = recipe['nutrition']
                actual_calories = int(nutrition['calories'] * portion_multiplier)
                actual_protein = int(nutrition['protein'] * portion_multiplier)
                actual_carbs = int(nutrition['carbs'] * portion_multiplier)
                actual_fat = int(nutrition['fat'] * portion_multiplier)
                
                # Display nutrition
                nutrition_cols = st.columns(4)
                with nutrition_cols[0]:
                    st.metric("Calories", f"{actual_calories}")
                with nutrition_cols[1]:
                    st.metric("Protein", f"{actual_protein}g")
                with nutrition_cols[2]:
                    st.metric("Carbs", f"{actual_carbs}g")
                with nutrition_cols[3]:
                    st.metric("Fat", f"{actual_fat}g")
                
                # Add to totals
                total_calories += actual_calories
                total_protein += actual_protein
                total_carbs += actual_carbs
                total_fat += actual_fat
                
                # Show ingredients for grocery list
                if recipe.get('ingredients'):
                    st.markdown("**Ingredients needed:**")
                    for ingredient in recipe['ingredients'][:5]:  # Show first 5
                        st.markdown(f"• {ingredient}")
                        grocery_list.append(f"{ingredient} (for {recipe['title']})")
                    
                    if len(recipe['ingredients']) > 5:
                        st.markdown(f"*... and {len(recipe['ingredients']) - 5} more ingredients*")
                
                # Show recipe details
                if recipe.get('directions'):
                    with st.expander(f"📖 {recipe['title']} Recipe"):
                        st.markdown("**Directions:**")
                        for i, direction in enumerate(recipe['directions'], 1):
                            st.markdown(f"{i}. {direction}")
                        
                        st.markdown(f"**Servings:** {recipe.get('servings', 1)}")
            else:
                st.warning("No recipe selected for this meal. Please adjust your selections and regenerate.")
    
    # Daily summary
    st.markdown("---")
    st.subheader("📈 Daily Summary")
    summary_cols = st.columns(4)
    
    with summary_cols[0]:
        diff_cal = total_calories - target_calories
        st.metric("Total Calories", f"{total_calories}", f"{diff_cal:+d}")
    with summary_cols[1]:
        diff_protein = total_protein - target_protein
        st.metric("Total Protein", f"{total_protein}g", f"{diff_protein:+d}g")
    with summary_cols[2]:
        diff_carbs = total_carbs - target_carbs
        st.metric("Total Carbs", f"{total_carbs}g", f"{diff_carbs:+d}g")
    with summary_cols[3]:
        diff_fat = total_fat - target_fat
        st.metric("Total Fat", f"{total_fat}g", f"{diff_fat:+d}g")
    
    # Grocery list
    if grocery_list:
        st.markdown("---")
        st.subheader("🛒 Grocery List")
        
        # Create downloadable grocery list
        grocery_text = f"Fitomics Grocery List for {selected_date.strftime('%B %d, %Y')}\n\n"
        for item in grocery_list:
            grocery_text += f"• {item}\n"
        
        col1, col2 = st.columns([3, 1])
        with col1:
            for item in grocery_list:
                st.markdown(f"• {item}")
        
        with col2:
            st.download_button(
                label="📋 Download List",
                data=grocery_text,
                file_name=f"fitomics_grocery_list_{date_key}.txt",
                mime="text/plain"
            )

else:
    st.info("Select your preferred Fitomics recipes above and click 'Generate Fitomics Meal Plan' to create your personalized nutrition plan.")

# Recipe library info
with st.expander("ℹ️ Your Recipe Library"):
    st.markdown(f"""
    **Available Fitomics Recipes:**
    - Breakfast: {len(breakfast_recipes)} recipes
    - Dinner: {len(dinner_recipes)} recipes (also available for lunch)
    - Snacks: {len(snack_recipes)} recipes
    - Desserts: {len(dessert_recipes)} recipes
    
    **Your Settings:**
    - Meal frequency: {meal_frequency} meals per day
    - Daily targets: {target_calories} cal, {target_protein}g protein, {target_carbs}g carbs, {target_fat}g fat
    - Dietary restrictions: {", ".join(dietary_restrictions) if dietary_restrictions else "None"}
    
    **Total recipes available:** {len(recipes)}
    """)